import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getStudentClasses, joinClassByCode, getClassMissions,
  saveMissionSubmission, getMyMissionSubmission,
  appendMissionMessage, getMissionMessages,
} from "../lib/localStore";
import { isFirebaseConfigured } from "../lib/firebase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MD({ text }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      p:      ({children}) => <p style={{margin:"3px 0",fontSize:"13px",lineHeight:1.7,color:"var(--msg-bot-text)"}}>{children}</p>,
      strong: ({children}) => <strong style={{fontWeight:700}}>{children}</strong>,
      h2:     ({children}) => <h2 style={{fontSize:"14px",fontWeight:700,margin:"8px 0 3px"}}>{children}</h2>,
      ul:     ({children}) => <ul style={{margin:"4px 0",paddingRight:"16px"}}>{children}</ul>,
      li:     ({children}) => <li style={{fontSize:"13px",margin:"2px 0"}}>{children}</li>,
    }}>{text}</ReactMarkdown>
  );
}

// ── Extract PDF text via pdfjs ────────────────────────────────────────────────
async function extractPDF(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url
  ).toString();
  const buffer = await file.arrayBuffer();
  const pdf    = await pdfjs.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(" ") + "\n";
  }
  return text.trim();
}

// ── Mission chat view ─────────────────────────────────────────────────────────
function MissionChat({ cls, mission, onBack }) {
  const [messages,    setMessages]    = useState(null);
  const [submission,  setSubmission]  = useState(null);
  const [inputValue,  setInputValue]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const endRef = useRef(null);

  // Load existing data
  useEffect(() => {
    Promise.all([
      getMissionMessages(cls.id, mission.id),
      getMyMissionSubmission(cls.id, mission.id),
    ]).then(([msgs, sub]) => {
      setMessages(msgs);
      setSubmission(sub);
    });
  }, [cls.id, mission.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const pdfText  = submission?.pdfText  ?? "";
  const pdfTitle = submission?.pdfTitle ?? "";

  const systemPrompt = `אתה מורה חינוכי שעוזר לסטודנט עם המשימה: "${mission.title}" בקורס "${cls.title}".
${mission.description ? `תיאור המשימה: ${mission.description}` : ""}
${pdfText ? `הסטודנט העלה את המסמך: "${pdfTitle}". תוכן: ${pdfText.slice(0, 6000)}` : ""}
תפקידך: שאל שאלות הבנה, תן משוב מפורט, הנחה את הסטודנט להבין לעומק. שאל שאלה אחת בכל פעם.`;

  // Send a message
  const send = async (text, isAuto = false) => {
    if ((!text.trim() && !isAuto) || loading) return;
    const userMsg = { id: crypto.randomUUID(), sender: "user", text: text.trim(), createdAt: Date.now() };

    if (!isAuto) {
      setMessages(prev => [...(prev ?? []), userMsg]);
      setInputValue("");
      await appendMissionMessage(cls.id, mission.id, userMsg);
      // Ensure submission record exists
      await saveMissionSubmission(cls.id, mission.id, {
        displayName: "", pdfTitle, lastMessageAt: Date.now(),
      });
    }

    setLoading(true);
    try {
      const history = [...(messages ?? []), ...(isAuto ? [] : [userMsg])];
      const res = await fetch(`${BACKEND_URL}/api/claude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: systemPrompt,
          messages: history.map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }))
            .concat(isAuto ? [{ role: "user", content: text }] : []),
        }),
      });
      const data    = await res.json();
      const botText = data.content?.[0]?.text ?? "לא קיבלתי תשובה";
      const botMsg  = { id: crypto.randomUUID(), sender: "bot", text: botText, createdAt: Date.now() + 1 };
      setMessages(prev => [...(prev ?? []), botMsg]);
      await appendMissionMessage(cls.id, mission.id, botMsg);
    } catch (err) {
      const errMsg = { id: crypto.randomUUID(), sender: "bot", text: `שגיאה: ${err.message}`, createdAt: Date.now() };
      setMessages(prev => [...(prev ?? []), errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-start if no messages yet
  useEffect(() => {
    if (messages !== null && messages.length === 0) {
      send("התחל שיחה חינוכית — הצג את עצמך בקצרה ושאל את השאלה הראשונה על המשימה.", true);
    }
  }, [messages]);

  // Upload PDF
  const handleUpload = async (file) => {
    setUploading(true); setUploadError("");
    try {
      const text = await extractPDF(file);
      const meaningful = text.replace(/\s+/g, " ").trim();
      if (meaningful.length < 100) {
        setUploadError("הקובץ לא הכיל טקסט שניתן לחלץ");
        return;
      }
      const sub = { pdfTitle: file.name.replace(".pdf", ""), pdfText: meaningful.slice(0, 50000), submittedAt: Date.now() };
      await saveMissionSubmission(cls.id, mission.id, sub);
      setSubmission(sub);

      // Notify the bot about the new PDF
      const notif = { id: crypto.randomUUID(), sender: "user",
        text: `העלאתי מסמך: "${sub.pdfTitle}"`, createdAt: Date.now() };
      setMessages(prev => [...(prev ?? []), notif]);
      await appendMissionMessage(cls.id, mission.id, notif);
      await send(`העלאתי את המסמך "${sub.pdfTitle}". אנא התאם את השאלות לתוכן שלו.`, true);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const chatStarted = (messages?.length ?? 0) > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ flexShrink:0, padding:"10px 16px", background:"var(--bg-card)",
        borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"10px" }}>
        <button onClick={onBack} style={{ background:"transparent", border:"1px solid var(--border)",
          borderRadius:"var(--radius-sm)", padding:"5px 12px", color:"var(--text-secondary)",
          cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>← חזרה</button>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:"14px", color:"var(--text-primary)" }}>
            📋 {mission.title}
          </p>
          <p style={{ margin:0, fontSize:"12px", color:"var(--text-muted)" }}>{cls.title}</p>
        </div>

        {/* PDF upload button */}
        <label style={{ display:"flex", alignItems:"center", gap:"6px",
          background: pdfTitle ? "var(--brand-light)" : "var(--bg-page)",
          border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
          padding:"6px 14px", fontSize:"13px", fontWeight:600,
          color: pdfTitle ? "var(--brand)" : "var(--text-secondary)",
          cursor: uploading ? "not-allowed" : "pointer", flexShrink:0 }}>
          {uploading ? "⏳" : "📄"} {pdfTitle ? pdfTitle.slice(0, 20) + (pdfTitle.length > 20 ? "…" : "") : "העלה PDF"}
          <input type="file" accept=".pdf" disabled={uploading} style={{ display:"none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        </label>
      </div>

      {uploadError && (
        <div style={{ flexShrink:0, padding:"8px 16px", background:"#fef2f2",
          fontSize:"13px", color:"#ef4444", borderBottom:"1px solid #fca5a5" }}>
          ⚠️ {uploadError}
        </div>
      )}

      {/* Mission description */}
      {mission.description && !chatStarted && (
        <div style={{ flexShrink:0, margin:"12px 16px 0",
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:"var(--radius-md)", padding:"12px 16px" }}>
          <p style={{ margin:"0 0 4px", fontSize:"12px", fontWeight:700,
            color:"var(--text-muted)", textTransform:"uppercase" }}>תיאור המשימה</p>
          <p style={{ margin:0, fontSize:"13px", color:"var(--text-secondary)", lineHeight:1.7 }}>
            {mission.description}
          </p>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px",
        display:"flex", flexDirection:"column", gap:"12px" }}>

        {messages === null && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px",
            color:"var(--text-muted)", fontSize:"13px" }}>
            <div style={{ width:"14px", height:"14px", border:"2px solid var(--border)",
              borderTopColor:"var(--brand)", borderRadius:"50%",
              animation:"spin .7s linear infinite" }}/>
            טוען שיחה...
          </div>
        )}

        {messages?.map(msg => {
          const isBot = msg.sender === "bot";
          return (
            <div key={msg.id} style={{ display:"flex", gap:"8px",
              flexDirection: isBot ? "row" : "row-reverse" }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"50%",
                background: isBot ? "#6366f1" : "#9ca3af",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"14px", flexShrink:0 }}>
                {isBot ? "🧠" : "👤"}
              </div>
              <div style={{ maxWidth:"82%", padding:"10px 14px",
                borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                background: isBot ? "var(--msg-bot-bg)" : "var(--msg-user-bg)",
                border: isBot ? "1px solid var(--border)" : "none",
                direction:"rtl", textAlign:"right" }}>
                {isBot
                  ? <MD text={msg.text} />
                  : <span style={{ fontSize:"13px", lineHeight:1.65,
                      color:"var(--msg-user-text)" }}>{msg.text}</span>}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <div style={{ width:"30px", height:"30px", borderRadius:"50%",
              background:"#6366f1", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:"14px" }}>🧠</div>
            <div style={{ background:"var(--msg-bot-bg)", border:"1px solid var(--border)",
              borderRadius:"16px 16px 16px 4px", padding:"12px 16px",
              display:"flex", gap:"5px" }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width:"6px", height:"6px", borderRadius:"50%",
                  background:"var(--brand)", display:"inline-block",
                  animation:`bounce 1.2s ease-in-out ${i*.2}s infinite` }}/>
              ))}
            </div>
          </div>
        )}

        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{ flexShrink:0, padding:"12px 16px", background:"var(--bg-card)",
        borderTop:"1px solid var(--border)" }}>
        <form onSubmit={e => { e.preventDefault(); send(inputValue); }}
          style={{ display:"flex", gap:"8px" }}>
          <input value={inputValue} onChange={e => setInputValue(e.target.value)}
            disabled={loading || messages === null}
            placeholder="ענה על שאלת המורה..."
            dir="rtl"
            style={{ flex:1, border:"1px solid var(--border)",
              borderRadius:"var(--radius-md)", padding:"12px 14px",
              fontSize:"14px", background:"var(--bg-input)",
              color:"var(--text-primary)", outline:"none", fontFamily:"inherit",
              opacity: loading ? .6 : 1 }}
          />
          <button type="submit" disabled={loading || !inputValue.trim()}
            style={{ background: (!inputValue.trim() || loading) ? "var(--text-muted)" : "var(--brand)",
              color:"#fff", border:"none", borderRadius:"var(--radius-md)",
              padding:"12px 20px", fontWeight:700, fontSize:"14px",
              cursor: (!inputValue.trim() || loading) ? "not-allowed" : "pointer",
              fontFamily:"inherit", flexShrink:0 }}>
            {loading ? "…" : "שלח 🚀"}
          </button>
        </form>
        <p style={{ margin:"6px 0 0", fontSize:"11px", color:"var(--text-muted)",
          textAlign:"center" }}>
          💡 שיחה זו גלויה למרצה | הצ׳אט האישי שלך בלשונית Chat נשאר פרטי
        </p>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
}

// ── Mission card (with "enter chat" button) ────────────────────────────────────
function MissionCard({ mission, cls, onOpen }) {
  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
      borderRadius:"var(--radius-md)", padding:"14px 16px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
        <span style={{ fontSize:"20px", flexShrink:0 }}>📋</span>
        <div style={{ flex:1 }}>
          <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:"14px",
            color:"var(--text-primary)" }}>{mission.title}</p>
          {mission.description && (
            <p style={{ margin:"0 0 8px", fontSize:"12px", color:"var(--text-secondary)",
              lineHeight:1.6 }}>{mission.description}</p>
          )}
          <p style={{ margin:0, fontSize:"11px", color:"var(--text-muted)" }}>
            📅 {new Date(mission.createdAt).toLocaleDateString("he-IL")}
          </p>
        </div>
        <button onClick={onOpen} style={{
          background:"var(--brand)", color:"#fff", border:"none",
          borderRadius:"var(--radius-sm)", padding:"8px 16px",
          fontWeight:700, fontSize:"13px", cursor:"pointer",
          fontFamily:"inherit", flexShrink:0 }}>
          💬 פתח שיחה
        </button>
      </div>
    </div>
  );
}

// ── Class view: missions list ──────────────────────────────────────────────────
function ClassView({ enrollment, onBack }) {
  const [missions,       setMissions]       = useState(null);
  const [activeMission,  setActiveMission]  = useState(null);

  useEffect(() => {
    getClassMissions(enrollment.classId).then(setMissions).catch(() => setMissions([]));
  }, [enrollment.classId]);

  const cls = { id: enrollment.classId, title: enrollment.classTitle };

  if (activeMission) {
    return <MissionChat cls={cls} mission={activeMission} onBack={() => setActiveMission(null)} />;
  }

  return (
    <div style={{ height:"100%", overflowY:"auto", background:"var(--bg-page)",
      padding:"20px 16px", boxSizing:"border-box", direction:"rtl" }}>
      <div style={{ maxWidth:"680px", margin:"0 auto", display:"flex",
        flexDirection:"column", gap:"14px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button onClick={onBack} style={{ background:"transparent",
            border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
            padding:"6px 14px", color:"var(--text-secondary)", cursor:"pointer",
            fontFamily:"inherit", fontSize:"13px" }}>← כל הכיתות</button>
          <div style={{ flex:1 }}>
            <h2 style={{ margin:0, fontSize:"18px", fontWeight:700,
              color:"var(--text-primary)" }}>{enrollment.classTitle}</h2>
            <code style={{ fontSize:"12px", background:"var(--bg-page)",
              border:"1px solid var(--border)", borderRadius:"6px",
              padding:"2px 10px", color:"var(--brand)", fontWeight:700,
              letterSpacing:"0.1em" }}>{enrollment.classCode}</code>
          </div>
        </div>

        {/* Info box */}
        <div style={{ background:"var(--brand-light)", border:"1px solid",
          borderColor:"var(--brand)" + "44", borderRadius:"var(--radius-md)",
          padding:"12px 16px", fontSize:"13px", color:"var(--brand)", lineHeight:1.6 }}>
          💬 <strong>שיחות המשימות גלויות למרצה.</strong> הצ׳אט האישי שלך בלשונית Chat נשאר פרטי לחלוטין.
        </div>

        {/* Missions */}
        {missions === null && (
          <div style={{ display:"flex", gap:"8px", color:"var(--text-muted)", fontSize:"13px", alignItems:"center" }}>
            <div style={{ width:"14px", height:"14px", border:"2px solid var(--border)",
              borderTopColor:"var(--brand)", borderRadius:"50%",
              animation:"spin .7s linear infinite" }}/>
            טוען משימות...
          </div>
        )}

        {missions?.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:"40px", marginBottom:"10px" }}>📋</div>
            <p style={{ margin:0, fontSize:"14px", color:"var(--text-secondary)" }}>
              אין משימות עדיין בכיתה זו
            </p>
            <p style={{ margin:"4px 0 0", fontSize:"12px" }}>המרצה יפרסם משימות בקרוב</p>
          </div>
        )}

        {missions?.map(m => (
          <MissionCard key={m.id} mission={m} cls={cls} onOpen={() => setActiveMission(m)} />
        ))}

        <div style={{ height:"16px" }}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Join panel ─────────────────────────────────────────────────────────────────
function JoinPanel({ onJoined }) {
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const handleJoin = async () => {
    if (code.trim().length < 4 || loading) return;
    const { joinClassByCode: join } = await import("../lib/localStore");
    setLoading(true); setError(""); setSuccess("");
    try {
      const cls = await join(code);
      setSuccess(`הצטרפת בהצלחה לכיתה "${cls.title}" 🎉`);
      setCode("");
      setTimeout(() => { setSuccess(""); onJoined(); }, 1800);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
      borderRadius:"var(--radius-md)", padding:"14px 18px",
      display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
      <span style={{ fontSize:"16px" }}>🔑</span>
      <input value={code}
        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))}
        onKeyDown={e => e.key === "Enter" && handleJoin()}
        placeholder="הזן קוד כיתה (ABC123)"
        style={{ flex:1, minWidth:"140px", border:"1px solid var(--border)",
          borderRadius:"var(--radius-sm)", padding:"9px 14px", fontSize:"14px",
          letterSpacing:"0.1em", fontFamily:"monospace", background:"var(--bg-input)",
          color:"var(--text-primary)", outline:"none", direction:"ltr", textAlign:"center" }}/>
      <button onClick={handleJoin} disabled={code.length < 4 || loading} style={{
        background: code.length < 4 ? "var(--text-muted)" : "var(--brand)",
        color:"#fff", border:"none", borderRadius:"var(--radius-sm)",
        padding:"9px 20px", fontWeight:700, fontSize:"14px",
        cursor: code.length < 4 ? "not-allowed" : "pointer",
        fontFamily:"inherit", flexShrink:0 }}>
        {loading ? "מצטרף..." : "הצטרף"}
      </button>
      {error   && <span style={{ fontSize:"12px", color:"#ef4444", width:"100%" }}>{error}</span>}
      {success && <span style={{ fontSize:"12px", color:"#22c55e", width:"100%" }}>{success}</span>}
    </div>
  );
}

// ── Main ClassesPage ───────────────────────────────────────────────────────────
export default function ClassesPage() {
  const [classes,       setClasses]       = useState(null);
  const [activeEnroll,  setActiveEnroll]  = useState(null);

  const load = () => getStudentClasses().then(setClasses).catch(() => setClasses([]));
  useEffect(load, []);

  if (!isFirebaseConfigured) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        color:"var(--text-muted)", fontSize:"14px", direction:"rtl" }}>
        תכונת הכיתות דורשת חיבור לפיירבייס
      </div>
    );
  }

  // Show class detail
  if (activeEnroll) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
        <ClassView enrollment={activeEnroll} onBack={() => setActiveEnroll(null)} />
      </div>
    );
  }

  return (
    <div style={{ height:"100%", overflowY:"auto", background:"var(--bg-page)",
      padding:"24px 20px", boxSizing:"border-box", direction:"rtl" }}>
      <div style={{ maxWidth:"720px", margin:"0 auto", display:"flex",
        flexDirection:"column", gap:"16px" }}>

        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:700,
            color:"var(--text-primary)" }}>🏫 הכיתות שלי</h1>
          <p style={{ margin:0, fontSize:"14px", color:"var(--text-muted)" }}>
            הצטרף לכיתה בקוד, ראה משימות וצ׳ט עם המורה לכל משימה
          </p>
        </div>

        <JoinPanel onJoined={load} />

        {classes === null && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px",
            color:"var(--text-muted)", fontSize:"14px" }}>
            <div style={{ width:"16px", height:"16px", border:"2px solid var(--border)",
              borderTopColor:"var(--brand)", borderRadius:"50%",
              animation:"spin .7s linear infinite" }}/>
            טוען כיתות...
          </div>
        )}

        {classes?.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>🏫</div>
            <p style={{ margin:0, fontSize:"15px", color:"var(--text-secondary)" }}>לא הצטרפת לאף כיתה עדיין</p>
            <p style={{ margin:"6px 0 0", fontSize:"13px" }}>הזן קוד מהמרצה שלך למעלה</p>
          </div>
        )}

        {classes?.map(enrollment => (
          <div key={enrollment.classId} onClick={() => setActiveEnroll(enrollment)}
            style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
              borderRadius:"var(--radius-md)", padding:"16px 18px", cursor:"pointer",
              transition:"border-color .15s, box-shadow .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.08)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.boxShadow="none";}}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:"44px", height:"44px", borderRadius:"10px",
                background:"var(--brand-light)", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:"22px", flexShrink:0 }}>🏫</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:"15px",
                  color:"var(--text-primary)" }}>{enrollment.classTitle}</p>
                <code style={{ fontSize:"12px", background:"var(--bg-page)",
                  border:"1px solid var(--border)", borderRadius:"6px",
                  padding:"2px 10px", color:"var(--brand)", fontWeight:700,
                  letterSpacing:"0.1em" }}>{enrollment.classCode}</code>
              </div>
              <span style={{ color:"var(--text-muted)", fontSize:"18px" }}>←</span>
            </div>
          </div>
        ))}

        <div style={{ height:"20px" }}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
