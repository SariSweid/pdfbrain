import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getStudentClasses, joinClassByCode, getClassMissions,
  saveMissionSubmission, getMyMissionSubmission,
  appendMissionMessage, getMissionMessages,
} from "../lib/localStore";
import { callClaudeMultiturn } from "../lib/anthropicClient";
import { isFirebaseConfigured } from "../lib/firebase";

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MD({ text }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      p:      ({children}) => <p style={{margin:"4px 0",fontSize:"13px",lineHeight:1.75,color:"var(--msg-bot-text)"}}>{children}</p>,
      strong: ({children}) => <strong style={{fontWeight:700,color:"var(--text-primary)"}}>{children}</strong>,
      h2:     ({children}) => <h2 style={{fontSize:"15px",fontWeight:700,margin:"10px 0 4px",color:"var(--text-primary)",borderBottom:"1px solid var(--border)",paddingBottom:"2px"}}>{children}</h2>,
      h3:     ({children}) => <h3 style={{fontSize:"13px",fontWeight:700,margin:"8px 0 3px",color:"var(--text-primary)"}}>{children}</h3>,
      ul:     ({children}) => <ul style={{margin:"4px 0",paddingRight:"18px",listStyleType:"disc"}}>{children}</ul>,
      ol:     ({children}) => <ol style={{margin:"4px 0",paddingRight:"18px"}}>{children}</ol>,
      li:     ({children}) => <li style={{fontSize:"13px",margin:"3px 0",lineHeight:1.6}}>{children}</li>,
      table:  ({children}) => <table style={{width:"100%",borderCollapse:"collapse",margin:"8px 0",fontSize:"12px"}}>{children}</table>,
      th:     ({children}) => <th style={{background:"var(--brand)",color:"#fff",padding:"6px 10px",textAlign:"right",fontWeight:700,border:"1px solid var(--border)"}}>{children}</th>,
      td:     ({children}) => <td style={{padding:"6px 10px",textAlign:"right",border:"1px solid var(--border)",color:"var(--text-secondary)"}}>{children}</td>,
    }}>{text}</ReactMarkdown>
  );
}

// ── Extract PDF text ──────────────────────────────────────────────────────────
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

// ── Score color ───────────────────────────────────────────────────────────────
const scoreColor = s => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";

// ── Analysis card (same as ChatPage) ─────────────────────────────────────────
function AnalysisCard({ analysis, onStartLearning, chatStarted }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden", flexShrink:0, margin:"10px 14px 0" }}>
      <div style={{ display:"flex", alignItems:"center", padding:"10px 14px", borderBottom: collapsed?"none":"1px solid var(--border)", gap:"8px" }}>
        <span style={{ fontWeight:700, fontSize:"14px", color:"var(--text-primary)", flex:1 }}>📊 ניתוח המסמך</span>
        <button onClick={() => setCollapsed(c=>!c)} style={{ background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-secondary)", cursor:"pointer", padding:"3px 10px", fontSize:"11px", fontFamily:"inherit" }}>
          {collapsed ? "▼ הצג" : "▲ כווץ"}
        </button>
      </div>
      {!collapsed && (
        <div style={{ padding:"12px 14px" }}>
          <div style={{ maxHeight: chatStarted ? "160px" : "280px", overflowY:"auto", direction:"rtl", textAlign:"right" }}>
            <MD text={analysis}/>
          </div>
          {!chatStarted && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"12px", paddingTop:"10px", borderTop:"1px solid var(--border)" }}>
              <span style={{ fontSize:"13px", color:"var(--text-muted)" }}>מוכן להתחיל את השיחה החינוכית?</span>
              <button onClick={onStartLearning} style={{ background:"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", padding:"8px 20px", fontWeight:700, fontSize:"13px", cursor:"pointer", fontFamily:"inherit" }}>
                🎓 התחל ללמוד
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grade modal ───────────────────────────────────────────────────────────────
function GradeModal({ grade, onClose }) {
  if (!grade) return null;
  const color = grade.score == null ? "#9ca3af" : scoreColor(grade.score);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, direction:"rtl" }}>
      <div style={{ background:"var(--bg-card)", borderRadius:"var(--radius-lg)", padding:"36px 28px", maxWidth:"440px", width:"90%", boxShadow:"0 20px 50px rgba(0,0,0,.3)", textAlign:"center" }}>
        <div style={{ fontSize:"44px", marginBottom:"10px" }}>🎓</div>
        <h2 style={{ margin:"0 0 8px", fontSize:"20px", color:"var(--text-primary)" }}>סיכום השיחה</h2>
        {grade.score != null
          ? <div style={{ width:"90px", height:"90px", borderRadius:"50%", background:color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", fontWeight:800, margin:"16px auto" }}>{grade.score}</div>
          : <div style={{ fontSize:"36px", margin:"16px 0" }}>⚠️</div>
        }
        <p style={{ color:"var(--text-secondary)", margin:"0 0 14px", lineHeight:1.6, fontSize:"14px" }}>{grade.feedback}</p>
        {grade.breakdown?.length > 0 && (
          <div style={{ background:"var(--bg-page)", borderRadius:"var(--radius-sm)", padding:"12px 16px", marginBottom:"16px", textAlign:"right" }}>
            {grade.breakdown.map((item, i) => (
              <div key={i} style={{ marginBottom:"6px", fontSize:"13px", color:"var(--text-secondary)" }}>
                <strong style={{ color:"var(--text-primary)" }}>{item.category}:</strong> {item.comment}
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ background:"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", padding:"10px 28px", fontWeight:600, fontSize:"14px", cursor:"pointer", fontFamily:"inherit" }}>סגור</button>
      </div>
    </div>
  );
}

// ── Full mission chat (mirrors ChatPage) ─────────────────────────────────────
function MissionChat({ cls, mission, onBack }) {
  const [messages,    setMessages]    = useState(null);
  const [submission,  setSubmission]  = useState(null);
  const [inputValue,  setInputValue]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadFailed,setUploadFailed]= useState(null);
  const [grading,     setGrading]     = useState(false);
  const [grade,       setGrade]       = useState(null);
  const [confirmRedo, setConfirmRedo] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getMissionMessages(cls.id, mission.id),
      getMyMissionSubmission(cls.id, mission.id),
    ]).then(([msgs, sub]) => { setMessages(msgs); setSubmission(sub); });
  }, [cls.id, mission.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const pdfText    = submission?.pdfText  ?? "";
  const pdfTitle   = submission?.pdfTitle ?? "";
  const analysis   = submission?.analysis ?? null;
  const chatStarted = (messages?.length ?? 0) > 0;

  const systemPrompt = `אתה מורה חינוכי שעוזר לסטודנט עם המשימה: "${mission.title}" בקורס "${cls.title}".
${mission.description ? `תיאור המשימה: ${mission.description}` : ""}
${pdfText ? `הסטודנט העלה מסמך: "${pdfTitle}". תוכן המסמך:\n${pdfText.slice(0, 6000)}` : ""}
תפקידך: שאל שאלות הבנה אחת בכל פעם, תן משוב מפורט, ציין מאיפה במסמך מגיע המידע. היה מעודד אך דורשן.`;

  // ── Send message ──────────────────────────────────────────────────────────
  const send = async (text, isAuto = false) => {
    if ((!text?.trim() && !isAuto) || loading) return;
    const msgText = (text ?? "").trim();
    const userMsg = { id: crypto.randomUUID(), sender:"user", text:msgText, createdAt:Date.now() };

    if (!isAuto) {
      setMessages(prev => [...(prev ?? []), userMsg]);
      setInputValue("");
      appendMissionMessage(cls.id, mission.id, userMsg).catch(()=>{});
      saveMissionSubmission(cls.id, mission.id, { pdfTitle, lastMessageAt:Date.now() }).catch(()=>{});
    }

    setLoading(true);
    try {
      const current = messages ?? [];
      const all     = isAuto ? current : [...current, userMsg];

      let apiMsgs = all.map(m => ({ role: m.sender==="user"?"user":"assistant", content:m.text }));
      while (apiMsgs.length > 0 && apiMsgs[0].role !== "user") apiMsgs = apiMsgs.slice(1);
      if (isAuto) apiMsgs.push({ role:"user", content:msgText });
      if (apiMsgs.length === 0) apiMsgs = [{ role:"user", content:msgText }];

      const botText = await callClaudeMultiturn({ system:systemPrompt, messages:apiMsgs, maxTokens:800 });
      const botMsg  = { id:crypto.randomUUID(), sender:"bot", text:botText, createdAt:Date.now()+1 };
      setMessages(prev => [...(prev??[]), botMsg]);
      appendMissionMessage(cls.id, mission.id, botMsg).catch(()=>{});
    } catch (err) {
      setMessages(prev => [...(prev??[]), { id:crypto.randomUUID(), sender:"bot", text:`⚠️ ${err.message}`, createdAt:Date.now() }]);
    } finally { setLoading(false); }
  };

  // Auto-start when no messages yet
  useEffect(() => {
    if (messages !== null && messages.length === 0) {
      void send("התחל שיחה חינוכית — הצג את עצמך בקצרה ושאל שאלה ראשונה על המשימה.", true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Start learning after analysis ─────────────────────────────────────────
  const handleStartLearning = () => {
    void send("התחל שיחה חינוכית — הצג את עצמך בקצרה ושאל שאלה ראשונה על תוכן המסמך.", true);
  };

  // ── Upload PDF → extract → analyze → save ────────────────────────────────
  const handleUpload = async (file) => {
    setUploading(true); setUploadFailed(null);
    try {
      const rawText   = await extractPDF(file);
      const meaningful = rawText.replace(/\s+/g," ").trim();
      if (meaningful.length < 150) {
        setUploadFailed("הקובץ לא הכיל טקסט שניתן לחלץ. נסה PDF אחר.");
        return;
      }
      // Generate analysis
      const analysisText = await callClaudeMultiturn({
        system: "אתה מנתח מאמרים אקדמיים. ספק ניתוח מפורט ומובנה בעברית, השתמש ב-Markdown.",
        messages: [{ role:"user", content:`נתח את המסמך הבא וספק:\n1. **תקציר** (3-4 משפטים)\n2. **שאלת המחקר הראשית**\n3. **מתודולוגיה**\n4. **ממצאים עיקריים**\n5. **מסקנות**\n\nהמסמך:\n${meaningful.slice(0,8000)}` }],
        maxTokens: 1200,
      }).catch(() => null);

      const sub = {
        pdfTitle:  file.name.replace(".pdf",""),
        pdfText:   meaningful.slice(0, 50000),
        analysis:  analysisText,
        submittedAt: Date.now(),
      };
      await saveMissionSubmission(cls.id, mission.id, sub);
      setSubmission(prev => ({ ...(prev??{}), ...sub }));

      if (chatStarted) {
        const notif = { id:crypto.randomUUID(), sender:"user", text:`העלאתי מסמך: "${sub.pdfTitle}"`, createdAt:Date.now() };
        setMessages(prev => [...(prev??[]), notif]);
        appendMissionMessage(cls.id, mission.id, notif).catch(()=>{});
        void send(`העלאתי את המסמך "${sub.pdfTitle}". אנא התאם את השאלות לתוכן שלו.`, true);
      }
    } catch (err) {
      setUploadFailed(err.message);
    } finally { setUploading(false); }
  };

  // ── Grade ─────────────────────────────────────────────────────────────────
  const handleGrade = async () => {
    const studentMsgs = (messages??[]).filter(m=>m.sender==="user");
    if (studentMsgs.length === 0) {
      setGrade({ score:0, feedback:"לא ניתן לחשב ציון — לא ענית על אף שאלה.", breakdown:[] });
      return;
    }
    setGrading(true);
    try {
      const conversation = (messages??[]).map(m=>`${m.sender==="user"?"סטודנט":"מורה"}: ${m.text}`).join("\n");
      const rawText = await callClaudeMultiturn({
        system: `You are an academic grader. Output ONLY valid JSON:\n{"score":<0-100>,"feedback":"<Hebrew>","breakdown":[{"category":"הבנת תוכן","comment":"<Hebrew>"},{"category":"איכות תשובות","comment":"<Hebrew>"},{"category":"מעורבות","comment":"<Hebrew>"}]}`,
        messages: [{ role:"user", content:`Grade this conversation:\n\n${conversation}` }],
        maxTokens: 800,
      });
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("לא התקבל JSON תקין");
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.score !== "number") throw new Error("ציון חסר");
      setGrade(parsed);
      saveMissionSubmission(cls.id, mission.id, { grade: parsed.score, gradedAt: Date.now() }).catch(()=>{});
    } catch (err) {
      setGrade({ score:null, feedback:`שגיאה: ${err.message}`, breakdown:[] });
    } finally { setGrading(false); }
  };

  // ── Redo ──────────────────────────────────────────────────────────────────
  const handleRedo = async () => {
    setConfirmRedo(false);
    setMessages([]);
    await saveMissionSubmission(cls.id, mission.id, { lastRedoAt: Date.now() });
    // Auto-start new session
    void send("התחל שיחה חינוכית חדשה. אל תתייחס לשיחות קודמות. שאל שאלה ראשונה.", true);
  };

  const awaitingStart = analysis && !chatStarted && !uploadFailed;
  const isInputDisabled = loading || uploading || awaitingStart;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* ── Top bar ── */}
      <div style={{ flexShrink:0, padding:"10px 14px", background:"var(--bg-card)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"10px" }}>
        <button onClick={onBack} style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"5px 12px", color:"var(--text-secondary)", cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>← חזרה</button>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:"14px", color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📋 {mission.title}</p>
          <p style={{ margin:0, fontSize:"11px", color:"var(--text-muted)" }}>{cls.title}</p>
        </div>

        {/* PDF upload */}
        <label style={{ display:"flex", alignItems:"center", gap:"5px", background: pdfTitle?"var(--brand-light)":"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"6px 12px", fontSize:"12px", fontWeight:600, color: pdfTitle?"var(--brand)":"var(--text-secondary)", cursor: uploading?"not-allowed":"pointer", flexShrink:0 }}>
          {uploading ? "⏳" : "📄"} {uploading ? "מנתח..." : pdfTitle ? pdfTitle.slice(0,18)+(pdfTitle.length>18?"…":"") : "העלה PDF"}
          <input type="file" accept=".pdf" disabled={uploading} style={{ display:"none" }}
            onChange={e => { const f=e.target.files?.[0]; if(f) handleUpload(f); e.target.value=""; }}/>
        </label>

        {/* Redo + Grade buttons */}
        {chatStarted && !confirmRedo && (
          <>
            <button onClick={()=>setConfirmRedo(true)} title="שיחה חדשה" style={{ ...gBtn }}>🔄</button>
            <button onClick={handleGrade} disabled={grading} style={{ ...gBtn, background:"var(--brand-light)", color:"var(--brand)", border:"1px solid var(--brand)", fontWeight:700 }}>
              {grading ? "⏳" : "🏁 קבל ציון"}
            </button>
          </>
        )}
        {chatStarted && confirmRedo && (
          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>למחוק?</span>
            <button onClick={handleRedo} style={{ ...gBtn, color:"#ef4444", borderColor:"#fca5a5" }}>✓</button>
            <button onClick={()=>setConfirmRedo(false)} style={gBtn}>✕</button>
          </div>
        )}
      </div>

      {/* Upload fail */}
      {uploadFailed && (
        <div style={{ flexShrink:0, padding:"8px 14px", background:"#fef2f2", borderBottom:"1px solid #fca5a5", fontSize:"13px", color:"#ef4444", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          ⚠️ {uploadFailed}
          <button onClick={()=>setUploadFailed(null)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:"16px" }}>✕</button>
        </div>
      )}

      {/* Visibility note */}
      <div style={{ flexShrink:0, padding:"6px 14px", background:"var(--brand-light)", borderBottom:"1px solid var(--border)", fontSize:"11px", color:"var(--brand)", textAlign:"center" }}>
        💬 שיחה זו גלויה למרצה · הצ׳אט האישי שלך בלשונית Chat נשאר פרטי
      </div>

      {/* Analysis card */}
      {!uploading && !uploadFailed && analysis && (
        <AnalysisCard analysis={analysis} onStartLearning={handleStartLearning} chatStarted={chatStarted}/>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:"12px", minHeight:0 }}>

        {messages === null && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px", color:"var(--text-muted)", fontSize:"13px" }}>
            <Spin/> טוען שיחה...
          </div>
        )}

        {uploading && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:"12px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:"32px" }}>⏳</div>
            <p style={{ margin:0, fontSize:"14px", color:"var(--text-secondary)", fontWeight:500 }}>קורא ומנתח את המסמך...</p>
          </div>
        )}

        {!uploading && messages?.map(msg => {
          const isBot = msg.sender === "bot";
          return (
            <div key={msg.id} style={{ display:"flex", gap:"8px", flexDirection:isBot?"row":"row-reverse" }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:isBot?"#6366f1":"#9ca3af", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0 }}>
                {isBot?"🧠":"👤"}
              </div>
              <div style={{ maxWidth:"82%", padding:"10px 14px", borderRadius:isBot?"16px 16px 16px 4px":"16px 16px 4px 16px", background:isBot?"var(--msg-bot-bg)":"var(--msg-user-bg)", border:isBot?"1px solid var(--border)":"none", direction:"rtl", textAlign:"right" }}>
                {isBot ? <MD text={msg.text}/> : <span style={{ fontSize:"13px", lineHeight:1.65, color:"var(--msg-user-text)" }}>{msg.text}</span>}
              </div>
            </div>
          );
        })}

        {loading && !uploading && (
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px" }}>🧠</div>
            <div style={{ background:"var(--msg-bot-bg)", border:"1px solid var(--border)", borderRadius:"16px 16px 16px 4px", padding:"12px 16px", display:"flex", gap:"5px" }}>
              {[0,1,2].map(i=><span key={i} style={{ width:"6px", height:"6px", borderRadius:"50%", background:"var(--brand)", display:"inline-block", animation:`bounce 1.2s ease-in-out ${i*.2}s infinite` }}/>)}
            </div>
          </div>
        )}

        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{ flexShrink:0, padding:"12px 14px", background:"var(--bg-card)", borderTop:"1px solid var(--border)" }}>
        <form onSubmit={e=>{ e.preventDefault(); send(inputValue); }} style={{ display:"flex", gap:"8px" }}>
          <input value={inputValue} onChange={e=>setInputValue(e.target.value)} disabled={isInputDisabled}
            placeholder={ uploading?"ממתין לניתוח..." : awaitingStart?"לחץ 'התחל ללמוד'..." : "ענה על שאלת המורה..."}
            dir="rtl"
            style={{ flex:1, border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"12px 14px", fontSize:"14px", background:isInputDisabled?"var(--bg-page)":"var(--bg-input)", color:"var(--text-primary)", outline:"none", fontFamily:"inherit", opacity:isInputDisabled?.6:1 }}/>
          <button type="submit" disabled={isInputDisabled || !inputValue.trim()} style={{ background:(!inputValue.trim()||isInputDisabled)?"var(--text-muted)":"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-md)", padding:"12px 20px", fontWeight:700, fontSize:"14px", cursor:(!inputValue.trim()||isInputDisabled)?"not-allowed":"pointer", fontFamily:"inherit", flexShrink:0 }}>
            {loading?"…":"שלח 🚀"}
          </button>
        </form>
      </div>

      <GradeModal grade={grade} onClose={()=>setGrade(null)}/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spin() {
  return <div style={{ width:"14px", height:"14px", border:"2px solid var(--border)", borderTopColor:"var(--brand)", borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }}/>;
}

const gBtn = { background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-secondary)", cursor:"pointer", padding:"6px 10px", fontSize:"13px", fontFamily:"inherit", flexShrink:0 };

// ── Mission card in class view ────────────────────────────────────────────────
function MissionCard({ mission, cls, onOpen }) {
  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"14px 16px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
        <span style={{ fontSize:"20px", flexShrink:0 }}>📋</span>
        <div style={{ flex:1 }}>
          <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:"14px", color:"var(--text-primary)" }}>{mission.title}</p>
          {mission.description && <p style={{ margin:"0 0 6px", fontSize:"12px", color:"var(--text-secondary)", lineHeight:1.6 }}>{mission.description}</p>}
          <p style={{ margin:0, fontSize:"11px", color:"var(--text-muted)" }}>📅 {new Date(mission.createdAt).toLocaleDateString("he-IL")}</p>
        </div>
        <button onClick={onOpen} style={{ background:"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", padding:"8px 16px", fontWeight:700, fontSize:"13px", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
          💬 פתח שיחה
        </button>
      </div>
    </div>
  );
}

// ── Class view ────────────────────────────────────────────────────────────────
function ClassView({ enrollment, onBack }) {
  const [missions,      setMissions]      = useState(null);
  const [activeMission, setActiveMission] = useState(null);

  useEffect(() => {
    getClassMissions(enrollment.classId).then(setMissions).catch(()=>setMissions([]));
  }, [enrollment.classId]);

  const cls = { id:enrollment.classId, title:enrollment.classTitle };

  if (activeMission) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
        <MissionChat cls={cls} mission={activeMission} onBack={()=>setActiveMission(null)}/>
      </div>
    );
  }

  return (
    <div style={{ height:"100%", overflowY:"auto", background:"var(--bg-page)", padding:"20px 16px", boxSizing:"border-box", direction:"rtl" }}>
      <div style={{ maxWidth:"680px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button onClick={onBack} style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"6px 14px", color:"var(--text-secondary)", cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>← כל הכיתות</button>
          <div style={{ flex:1 }}>
            <h2 style={{ margin:0, fontSize:"18px", fontWeight:700, color:"var(--text-primary)" }}>{enrollment.classTitle}</h2>
            <code style={{ fontSize:"12px", background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"6px", padding:"2px 10px", color:"var(--brand)", fontWeight:700, letterSpacing:"0.1em" }}>{enrollment.classCode}</code>
          </div>
        </div>

        {missions === null && <div style={{ display:"flex", gap:"8px", color:"var(--text-muted)", fontSize:"13px", alignItems:"center" }}><Spin/>טוען משימות...</div>}
        {missions?.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:"40px", marginBottom:"10px" }}>📋</div>
            <p style={{ margin:0, fontSize:"14px", color:"var(--text-secondary)" }}>אין משימות עדיין</p>
            <p style={{ margin:"4px 0 0", fontSize:"12px" }}>המרצה יפרסם משימות בקרוב</p>
          </div>
        )}
        {missions?.map(m => <MissionCard key={m.id} mission={m} cls={cls} onOpen={()=>setActiveMission(m)}/>)}
        <div style={{ height:"16px" }}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Join panel ────────────────────────────────────────────────────────────────
function JoinPanel({ onJoined }) {
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const handleJoin = async () => {
    if (code.trim().length < 4 || loading) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const cls = await joinClassByCode(code);
      setSuccess(`הצטרפת בהצלחה לכיתה "${cls.title}" 🎉`);
      setCode("");
      setTimeout(() => { setSuccess(""); onJoined(); }, 1800);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"14px 18px", display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
      <span style={{ fontSize:"16px" }}>🔑</span>
      <input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))}
        onKeyDown={e=>e.key==="Enter"&&handleJoin()}
        placeholder="הזן קוד כיתה (ABC123)"
        style={{ flex:1, minWidth:"140px", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"9px 14px", fontSize:"14px", letterSpacing:"0.1em", fontFamily:"monospace", background:"var(--bg-input)", color:"var(--text-primary)", outline:"none", direction:"ltr", textAlign:"center" }}/>
      <button onClick={handleJoin} disabled={code.length<4||loading} style={{ background:code.length<4?"var(--text-muted)":"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", padding:"9px 20px", fontWeight:700, fontSize:"14px", cursor:code.length<4?"not-allowed":"pointer", fontFamily:"inherit", flexShrink:0 }}>
        {loading?"מצטרף...":"הצטרף"}
      </button>
      {error   && <span style={{ fontSize:"12px", color:"#ef4444", width:"100%" }}>{error}</span>}
      {success && <span style={{ fontSize:"12px", color:"#22c55e", width:"100%" }}>{success}</span>}
    </div>
  );
}

// ── Main ClassesPage ──────────────────────────────────────────────────────────
export default function ClassesPage() {
  const [classes,      setClasses]      = useState(null);
  const [activeEnroll, setActiveEnroll] = useState(null);

  const load = () => { getStudentClasses().then(setClasses).catch(()=>setClasses([])); };
  useEffect(load, []);

  if (!isFirebaseConfigured) {
    return <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", fontSize:"14px", direction:"rtl" }}>תכונת הכיתות דורשת חיבור לפיירבייס</div>;
  }

  if (activeEnroll) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
        <ClassView enrollment={activeEnroll} onBack={()=>setActiveEnroll(null)}/>
      </div>
    );
  }

  return (
    <div style={{ height:"100%", overflowY:"auto", background:"var(--bg-page)", padding:"24px 20px", boxSizing:"border-box", direction:"rtl" }}>
      <div style={{ maxWidth:"720px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"16px" }}>
        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:700, color:"var(--text-primary)" }}>🏫 הכיתות שלי</h1>
          <p style={{ margin:0, fontSize:"14px", color:"var(--text-muted)" }}>הצטרף לכיתה עם קוד, ראה משימות וצ׳ט עם המורה</p>
        </div>

        <JoinPanel onJoined={load}/>

        {classes === null && <div style={{ display:"flex", alignItems:"center", gap:"10px", color:"var(--text-muted)", fontSize:"14px" }}><Spin/>טוען כיתות...</div>}

        {classes?.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>🏫</div>
            <p style={{ margin:0, fontSize:"15px", color:"var(--text-secondary)" }}>לא הצטרפת לאף כיתה עדיין</p>
            <p style={{ margin:"6px 0 0", fontSize:"13px" }}>הזן קוד מהמרצה שלך למעלה</p>
          </div>
        )}

        {classes?.map(enrollment => (
          <div key={enrollment.classId} onClick={()=>setActiveEnroll(enrollment)}
            style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"16px 18px", cursor:"pointer", transition:"border-color .15s, box-shadow .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--brand)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.08)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.boxShadow="none";}}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              <div style={{ width:"44px", height:"44px", borderRadius:"10px", background:"var(--brand-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>🏫</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:"15px", color:"var(--text-primary)" }}>{enrollment.classTitle}</p>
                <code style={{ fontSize:"12px", background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"6px", padding:"2px 10px", color:"var(--brand)", fontWeight:700, letterSpacing:"0.1em" }}>{enrollment.classCode}</code>
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
