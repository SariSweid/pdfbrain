import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getLecturerClasses, createClass, isClassCodeAvailable,
  getClassStudents, getClassMissions, addMissionToClass, deleteMission,
  getStudentDocuments, getStudentHistory, getStudentMessages,
  getStudentDocumentSessions,
  getAllMissionSubmissions, getStudentMissionMessages,
} from "../lib/localStore";
import { isFirebaseConfigured } from "../lib/firebase";

// ── Helpers ───────────────────────────────────────────────────────────────────
const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
function scoreColor(s) {
  return s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spin() {
  return <div style={{ width:"16px", height:"16px", border:"2px solid var(--border)",
    borderTopColor:"var(--brand)", borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }}/>;
}

// ── Mini Markdown ─────────────────────────────────────────────────────────────
function MD({ text }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    p: ({c}) => <p style={{margin:"3px 0",fontSize:"13px",lineHeight:1.6,color:"var(--text-secondary)"}}>{c}</p>,
    strong: ({c}) => <strong style={{fontWeight:700,color:"var(--text-primary)"}}>{c}</strong>,
  }}>{text}</ReactMarkdown>;
}

// ── Score badge ───────────────────────────────────────────────────────────────
function Score({ score, size = 36 }) {
  const c = scoreColor(score);
  return <div style={{ width:size, height:size, borderRadius:"50%", background:c,
    color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
    fontSize: size > 40 ? "16px" : "12px", fontWeight:800, flexShrink:0 }}>{score}</div>;
}

// ── Chat session viewer ───────────────────────────────────────────────────────
function SessionBlock({ session, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border:"1px solid var(--border)", borderRadius:"8px", overflow:"hidden", marginTop:"6px" }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:"flex", gap:"8px",
        alignItems:"center", padding:"9px 13px", cursor:"pointer",
        background:"var(--bg-page)" }}>
        <span style={{ fontSize:"12px" }}>{open?"▲":"▼"}</span>
        <span style={{ fontSize:"13px", fontWeight:600, color:"var(--text-primary)", flex:1 }}>
          שיחה {idx+1}
        </span>
        <span style={{ fontSize:"11px", color:"var(--text-muted)" }}>
          {new Date(session.createdAt).toLocaleDateString("he-IL")} · {session.messages?.length ?? 0} הודעות
        </span>
      </div>
      {open && (
        <div style={{ padding:"10px 13px", display:"flex", flexDirection:"column", gap:"8px",
          maxHeight:"300px", overflowY:"auto", borderTop:"1px solid var(--border)" }}>
          {session.messages?.map(msg => (
            <div key={msg.id} style={{ display:"flex", gap:"7px",
              flexDirection: msg.sender==="bot" ? "row" : "row-reverse" }}>
              <div style={{ width:"24px", height:"24px", borderRadius:"50%",
                background: msg.sender==="bot" ? "#6366f1" : "#9ca3af",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"12px", flexShrink:0 }}>
                {msg.sender==="bot" ? "🧠" : "👤"}
              </div>
              <div style={{ maxWidth:"80%", padding:"7px 11px",
                borderRadius: msg.sender==="bot" ? "12px 12px 12px 4px" : "12px 12px 4px 12px",
                background: msg.sender==="bot" ? "var(--msg-bot-bg)" : "var(--msg-user-bg)",
                border: msg.sender==="bot" ? "1px solid var(--border)" : "none",
                direction:"rtl", textAlign:"right" }}>
                <span style={{ fontSize:"13px", lineHeight:1.6 }}>{msg.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Student detail inside a class ─────────────────────────────────────────────
function StudentDetail({ student, onBack }) {
  const [tab,     setTab]     = useState("docs");
  const [docs,    setDocs]    = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    Promise.all([
      getStudentDocuments(student.uid).catch(()=>[]),
      getStudentHistory(student.uid).catch(()=>[]),
    ]).then(([d,h]) => { setDocs(d); setHistory(h); });
  }, [student.uid]);

  const scores = history?.filter(e=>typeof e.score==="number").map(e=>e.score) ?? [];
  const avg    = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
        <button onClick={onBack} style={{ background:"transparent",
          border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
          padding:"6px 14px", color:"var(--text-secondary)", cursor:"pointer",
          fontFamily:"inherit", fontSize:"13px" }}>← חזרה</button>
        <div style={{ flex:1 }}>
          <h3 style={{ margin:0, fontSize:"16px", fontWeight:700, color:"var(--text-primary)" }}>
            👨‍🎓 {student.displayName || student.email}
          </h3>
          {student.email && <p style={{ margin:"2px 0 0", fontSize:"12px", color:"var(--text-muted)" }}>{student.email}</p>}
        </div>
        {avg !== null && <Score score={avg} size={44}/>}
      </div>

      <div style={{ display:"flex", gap:"4px", background:"var(--bg-card)",
        borderRadius:"var(--radius-sm)", padding:"3px", border:"1px solid var(--border)",
        alignSelf:"flex-start" }}>
        {[["docs","📄 מאמרים"],["grades","🏁 ציונים"]].map(([id,lbl]) => (
          <button key={id} onClick={()=>setTab(id)} style={{
            background: tab===id?"var(--brand)":"transparent",
            color: tab===id?"#fff":"var(--text-secondary)",
            border:"none", borderRadius:"6px", padding:"6px 14px",
            fontSize:"13px", fontWeight: tab===id?700:400,
            cursor:"pointer", fontFamily:"inherit" }}>{lbl}</button>
        ))}
      </div>

      {docs===null && <div style={{ display:"flex", gap:"8px", color:"var(--text-muted)", fontSize:"13px" }}><Spin/>טוען...</div>}

      {tab==="docs" && docs && (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {docs.length===0
            ? <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>לא הועלו מאמרים</p>
            : docs.map(doc => <DocRow key={doc.id} doc={doc} studentUid={student.uid}/>)}
        </div>
      )}

      {tab==="grades" && history && (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {scores.length===0
            ? <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>אין ציונים עדיין</p>
            : history.filter(e=>typeof e.score==="number").map(ev => (
              <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:"12px",
                background:"var(--bg-card)", border:"1px solid var(--border)",
                borderRadius:"var(--radius-sm)", padding:"10px 14px" }}>
                <Score score={ev.score}/>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:"13px", fontWeight:600, color:"var(--text-primary)" }}>{ev.title}</p>
                  <p style={{ margin:"2px 0 0", fontSize:"11px", color:"var(--text-muted)" }}>📅 {ev.date}</p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── DocRow with sessions ──────────────────────────────────────────────────────
function DocRow({ doc, studentUid }) {
  const [open,     setOpen]     = useState(false);
  const [sessions, setSessions] = useState(null);
  const [active,   setActive]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next && sessions===null) {
      setLoading(true);
      const [s,m] = await Promise.all([
        getStudentDocumentSessions(studentUid, doc.id).catch(()=>[]),
        getStudentMessages(studentUid, doc.id).catch(()=>[]),
      ]);
      setSessions(s); setActive(m); setLoading(false);
    }
  };

  const all = [
    ...(active?.length ? [{ id:"__live__", messages:active, createdAt:Date.now(), live:true }] : []),
    ...(sessions ?? []),
  ];

  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
      borderRadius:"var(--radius-md)", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"11px 14px" }}>
        <span style={{ fontSize:"18px" }}>📄</span>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:600, fontSize:"13px", color:"var(--text-primary)" }}>{doc.title}</p>
          <p style={{ margin:"2px 0 0", fontSize:"11px", color:"var(--text-muted)" }}>
            {doc.date}{doc.pageCount?` · ${doc.pageCount} עמ׳`:""}
          </p>
        </div>
        <button onClick={toggle} style={{ background:open?"var(--brand)":"var(--bg-page)",
          border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
          color:open?"#fff":"var(--text-secondary)", cursor:"pointer",
          padding:"5px 12px", fontSize:"12px", fontWeight:600, fontFamily:"inherit" }}>
          {open ? "▲ סגור" : `▼ שיחות${sessions!==null?` (${all.length})`:""}`}
        </button>
      </div>
      {open && (
        <div style={{ padding:"0 14px 12px", borderTop:"1px solid var(--border)" }}>
          {loading && <div style={{ display:"flex", gap:"8px", padding:"10px 0", color:"var(--text-muted)", fontSize:"13px" }}><Spin/>טוען...</div>}
          {!loading && all.length===0 && <p style={{ color:"var(--text-muted)", fontSize:"13px", marginTop:"10px" }}>אין שיחות</p>}
          {!loading && all.map((sess, i) => (
            sess.live ? (
              <div key="live" style={{ border:"1px solid #6366f1", borderRadius:"8px", overflow:"hidden", marginTop:"8px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"9px 13px", background:"var(--brand-light)" }}>
                  <span style={{ fontSize:"11px", fontWeight:700, color:"var(--brand)",
                    background:"var(--brand-light)", border:"1px solid var(--brand)",
                    borderRadius:"12px", padding:"2px 8px" }}>שיחה פעילה</span>
                  <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>{sess.messages.length} הודעות</span>
                </div>
                <div style={{ padding:"10px 13px", display:"flex", flexDirection:"column", gap:"7px",
                  maxHeight:"260px", overflowY:"auto" }}>
                  {sess.messages.map(msg => (
                    <div key={msg.id} style={{ display:"flex", gap:"7px",
                      flexDirection:msg.sender==="bot"?"row":"row-reverse" }}>
                      <div style={{ width:"22px", height:"22px", borderRadius:"50%",
                        background:msg.sender==="bot"?"#6366f1":"#9ca3af",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", flexShrink:0 }}>
                        {msg.sender==="bot"?"🧠":"👤"}
                      </div>
                      <span style={{ maxWidth:"80%", padding:"6px 10px",
                        borderRadius:"10px", background:msg.sender==="bot"?"var(--msg-bot-bg)":"var(--msg-user-bg)",
                        border:msg.sender==="bot"?"1px solid var(--border)":"none",
                        fontSize:"12px", lineHeight:1.5, direction:"rtl" }}>{msg.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <SessionBlock key={sess.id} session={sess} idx={i}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add mission modal ─────────────────────────────────────────────────────────
function AddMissionModal({ classId, onDone, onClose }) {
  const [title, setTitle]       = useState("");
  const [desc,  setDesc]        = useState("");
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");

  const submit = async () => {
    if (!title.trim() || loading) return;
    setLoading(true); setError("");
    try {
      await addMissionToClass(classId, { title, description: desc });
      onDone();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}>
      <div style={{ background:"var(--bg-card)", borderRadius:"var(--radius-lg)",
        padding:"28px 24px", width:"420px", maxWidth:"94vw",
        boxShadow:"0 20px 50px rgba(0,0,0,.3)", direction:"rtl" }}>
        <h3 style={{ margin:"0 0 16px", fontSize:"16px", fontWeight:700, color:"var(--text-primary)" }}>
          📋 הוסף משימה חדשה
        </h3>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <div>
            <label style={{ fontSize:"12px", fontWeight:600, color:"var(--text-secondary)",
              display:"block", marginBottom:"5px" }}>כותרת המשימה *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="למשל: קריאת פרק 3 וסיכום..."
              style={{ width:"100%", padding:"10px 12px", boxSizing:"border-box",
                border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
                background:"var(--bg-input)", color:"var(--text-primary)",
                fontSize:"14px", outline:"none", fontFamily:"inherit" }}/>
          </div>
          <div>
            <label style={{ fontSize:"12px", fontWeight:600, color:"var(--text-secondary)",
              display:"block", marginBottom:"5px" }}>תיאור / הוראות</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)}
              placeholder="הוסף פירוט, הנחיות, קישורים..."
              rows={4}
              style={{ width:"100%", padding:"10px 12px", boxSizing:"border-box",
                border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
                background:"var(--bg-input)", color:"var(--text-primary)",
                fontSize:"14px", outline:"none", fontFamily:"inherit",
                resize:"vertical" }}/>
          </div>
          {error && <p style={{ color:"#ef4444", fontSize:"13px", margin:0 }}>{error}</p>}
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ background:"transparent",
              border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
              padding:"9px 18px", color:"var(--text-secondary)", cursor:"pointer",
              fontFamily:"inherit", fontSize:"13px" }}>ביטול</button>
            <button onClick={submit} disabled={!title.trim() || loading} style={{
              background: !title.trim() ? "var(--text-muted)" : "var(--brand)",
              border:"none", borderRadius:"var(--radius-sm)", padding:"9px 20px",
              color:"#fff", fontWeight:700, fontSize:"13px",
              cursor: !title.trim() ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
              {loading ? "שומר..." : "הוסף משימה"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Submissions view (all students who worked on a mission) ──────────────────
function SubmissionsView({ cls, mission, onBack }) {
  const [submissions, setSubmissions] = useState(null);
  const [viewing,     setViewing]     = useState(null); // { submission, messages }
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    getAllMissionSubmissions(cls.id, mission.id).then(setSubmissions).catch(() => setSubmissions([]));
  }, [cls.id, mission.id]);

  const openSubmission = async (sub) => {
    setLoadingMsgs(true);
    const msgs = await getStudentMissionMessages(cls.id, mission.id, sub.uid).catch(() => []);
    setViewing({ submission: sub, messages: msgs });
    setLoadingMsgs(false);
  };

  if (viewing) {
    const { submission: sub, messages } = viewing;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <button onClick={() => setViewing(null)} style={{ background:"transparent",
            border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
            padding:"5px 12px", color:"var(--text-secondary)", cursor:"pointer",
            fontFamily:"inherit", fontSize:"13px" }}>← חזרה להגשות</button>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:"14px", color:"var(--text-primary)" }}>
              👨‍🎓 {sub.displayName || sub.email || sub.uid}
            </p>
            {sub.pdfTitle && (
              <p style={{ margin:"2px 0 0", fontSize:"12px", color:"var(--text-muted)" }}>
                📄 {sub.pdfTitle}
              </p>
            )}
          </div>
        </div>
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:"var(--radius-md)", overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", background:"var(--bg-page)",
            borderBottom:"1px solid var(--border)", fontSize:"12px",
            fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase" }}>
            שיחה ({messages.length} הודעות)
          </div>
          <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column",
            gap:"10px", maxHeight:"440px", overflowY:"auto" }}>
            {messages.length === 0 && <p style={{ fontSize:"13px", color:"var(--text-muted)", margin:0 }}>אין הודעות</p>}
            {messages.map(msg => {
              const isBot = msg.sender === "bot";
              return (
                <div key={msg.id} style={{ display:"flex", gap:"8px",
                  flexDirection: isBot ? "row" : "row-reverse" }}>
                  <div style={{ width:"26px", height:"26px", borderRadius:"50%",
                    background: isBot ? "#6366f1" : "#9ca3af",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"12px", flexShrink:0 }}>
                    {isBot ? "🧠" : "👤"}
                  </div>
                  <div style={{ maxWidth:"80%", padding:"8px 12px",
                    borderRadius: isBot ? "12px 12px 12px 4px" : "12px 12px 4px 12px",
                    background: isBot ? "var(--msg-bot-bg)" : "var(--msg-user-bg)",
                    border: isBot ? "1px solid var(--border)" : "none",
                    direction:"rtl", textAlign:"right" }}>
                    <span style={{ fontSize:"13px", lineHeight:1.6 }}>{msg.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <button onClick={onBack} style={{ background:"transparent",
          border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
          padding:"5px 12px", color:"var(--text-secondary)", cursor:"pointer",
          fontFamily:"inherit", fontSize:"13px" }}>← חזרה למשימות</button>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:"14px", color:"var(--text-primary)" }}>
            📋 {mission.title} — הגשות
          </p>
          <p style={{ margin:0, fontSize:"12px", color:"var(--text-muted)" }}>
            {submissions?.length ?? "..."} סטודנטים הגישו
          </p>
        </div>
      </div>

      {submissions === null && <div style={{ display:"flex", gap:"8px", alignItems:"center", color:"var(--text-muted)", fontSize:"13px" }}><Spin/>טוען...</div>}
      {submissions?.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>אין הגשות עדיין למשימה זו</p>}

      {loadingMsgs && <div style={{ display:"flex", gap:"8px", alignItems:"center", color:"var(--text-muted)", fontSize:"13px" }}><Spin/>טוען שיחה...</div>}

      {submissions?.map(sub => (
        <div key={sub.uid} onClick={() => openSubmission(sub)} style={{
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:"var(--radius-md)", padding:"12px 16px",
          cursor:"pointer", display:"flex", alignItems:"center", gap:"12px",
          transition:"border-color .15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor="var(--brand)"}
          onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}>
          <div style={{ width:"36px", height:"36px", borderRadius:"50%",
            background:"var(--brand-light)", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:"18px", flexShrink:0 }}>👨‍🎓</div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:600, fontSize:"13px", color:"var(--text-primary)" }}>
              {sub.displayName || sub.email || sub.uid}
            </p>
            <p style={{ margin:"2px 0 0", fontSize:"11px", color:"var(--text-muted)" }}>
              {sub.pdfTitle ? `📄 ${sub.pdfTitle} · ` : ""}
              עדכון אחרון: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString("he-IL") : "—"}
            </p>
          </div>
          <span style={{ color:"var(--text-muted)", fontSize:"14px" }}>← צפה בשיחה</span>
        </div>
      ))}
    </div>
  );
}

// ── Class detail view (students + missions tabs) ──────────────────────────────
function ClassDetail({ cls, onBack }) {
  const [tab,               setTab]               = useState("students");
  const [students,          setStudents]          = useState(null);
  const [missions,          setMissions]          = useState(null);
  const [selectedStudent,   setSelectedStudent]   = useState(null);
  const [showAddMission,    setShowAddMission]     = useState(false);
  const [viewingSubmissions,setViewingSubmissions] = useState(null); // mission | null

  useEffect(() => {
    getClassStudents(cls.id).then(setStudents).catch(()=>setStudents([]));
    getClassMissions(cls.id).then(setMissions).catch(()=>setMissions([]));
  }, [cls.id]);

  const reloadMissions = () => getClassMissions(cls.id).then(setMissions).catch(()=>{});
  const handleDelete   = async (mId) => {
    await deleteMission(cls.id, mId);
    reloadMissions();
  };

  if (viewingSubmissions) {
    return <SubmissionsView cls={cls} mission={viewingSubmissions} onBack={()=>setViewingSubmissions(null)}/>;
  }

  if (selectedStudent) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
        <StudentDetail student={selectedStudent} onBack={()=>setSelectedStudent(null)}/>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      {/* Back + header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
        <button onClick={onBack} style={{ background:"transparent",
          border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
          padding:"6px 14px", color:"var(--text-secondary)", cursor:"pointer",
          fontFamily:"inherit", fontSize:"13px" }}>← כל הכיתות</button>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:0, fontSize:"18px", fontWeight:700, color:"var(--text-primary)" }}>
            {cls.title}
          </h2>
          <code style={{ fontSize:"12px", background:"var(--bg-page)",
            border:"1px solid var(--border)", borderRadius:"6px", padding:"2px 10px",
            color:"var(--brand)", fontWeight:700, letterSpacing:"0.1em" }}>
            {cls.code}
          </code>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:"4px", background:"var(--bg-card)",
        borderRadius:"var(--radius-sm)", padding:"3px",
        border:"1px solid var(--border)", alignSelf:"flex-start" }}>
        {[["students",`👨‍🎓 סטודנטים (${students?.length ?? "…"})`],
          ["missions",`📋 משימות (${missions?.length ?? "…"})`]].map(([id,lbl]) => (
          <button key={id} onClick={()=>setTab(id)} style={{
            background: tab===id?"var(--brand)":"transparent",
            color: tab===id?"#fff":"var(--text-secondary)",
            border:"none", borderRadius:"6px", padding:"7px 16px",
            fontSize:"13px", fontWeight:tab===id?700:400,
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>{lbl}</button>
        ))}
      </div>

      {/* Students tab */}
      {tab==="students" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {students===null && <div style={{ display:"flex", gap:"8px", color:"var(--text-muted)", fontSize:"13px" }}><Spin/>טוען...</div>}
          {students?.length===0 && <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>אין סטודנטים בכיתה עדיין</p>}
          {students?.map(s => (
            <div key={s.uid} onClick={()=>setSelectedStudent(s)}
              style={{ display:"flex", alignItems:"center", gap:"12px",
                background:"var(--bg-card)", border:"1px solid var(--border)",
                borderRadius:"var(--radius-md)", padding:"12px 16px",
                cursor:"pointer", transition:"border-color .15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--brand)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{ width:"36px", height:"36px", borderRadius:"50%",
                background:"var(--brand-light)", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:"18px", flexShrink:0 }}>👨‍🎓</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontWeight:600, fontSize:"13px", color:"var(--text-primary)" }}>
                  {s.displayName || s.email}
                </p>
                <p style={{ margin:"2px 0 0", fontSize:"11px", color:"var(--text-muted)" }}>
                  הצטרף: {new Date(s.joinedAt).toLocaleDateString("he-IL")}
                </p>
              </div>
              <span style={{ color:"var(--text-muted)", fontSize:"14px" }}>←</span>
            </div>
          ))}
        </div>
      )}

      {/* Missions tab */}
      {tab==="missions" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          <button onClick={()=>setShowAddMission(true)} style={{
            background:"var(--brand)", color:"#fff", border:"none",
            borderRadius:"var(--radius-sm)", padding:"10px 20px",
            fontWeight:700, fontSize:"14px", cursor:"pointer",
            fontFamily:"inherit", alignSelf:"flex-start" }}>
            + הוסף משימה
          </button>
          {missions===null && <div style={{ display:"flex", gap:"8px", color:"var(--text-muted)", fontSize:"13px" }}><Spin/>טוען...</div>}
          {missions?.length===0 && <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>אין משימות עדיין</p>}
          {missions?.map(m => (
            <div key={m.id} style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
              borderRadius:"var(--radius-md)", padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
                <span style={{ fontSize:"20px" }}>📋</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 4px", fontWeight:600, fontSize:"13px", color:"var(--text-primary)" }}>
                    {m.title}
                  </p>
                  {m.description && (
                    <p style={{ margin:"0 0 6px", fontSize:"12px", color:"var(--text-secondary)",
                      lineHeight:1.6 }}>{m.description}</p>
                  )}
                  <p style={{ margin:0, fontSize:"11px", color:"var(--text-muted)" }}>
                    📅 {new Date(m.createdAt).toLocaleDateString("he-IL")}
                  </p>
                </div>
                <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                  <button onClick={()=>setViewingSubmissions(m)} style={{
                    background:"var(--brand-light)", border:"1px solid var(--brand)",
                    borderRadius:"6px", color:"var(--brand)", cursor:"pointer",
                    padding:"6px 12px", fontSize:"12px", fontWeight:700,
                    fontFamily:"inherit" }}>📊 הגשות</button>
                  <button onClick={()=>handleDelete(m.id)} style={{
                    background:"transparent", border:"1px solid #fca5a5",
                    borderRadius:"6px", color:"#ef4444", cursor:"pointer",
                    padding:"6px 10px", fontSize:"12px", fontFamily:"inherit" }}>מחק</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddMission && (
        <AddMissionModal classId={cls.id}
          onDone={() => { setShowAddMission(false); reloadMissions(); }}
          onClose={() => setShowAddMission(false)}/>
      )}
    </div>
  );
}

// ── Create class modal ────────────────────────────────────────────────────────
function CreateClassModal({ onCreated, onClose }) {
  const [title,   setTitle]   = useState("");
  const [code,    setCode]    = useState(genCode);
  const [avail,   setAvail]   = useState(true);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const checkCode = async (c) => {
    if (c.length >= 4) {
      const ok = await isClassCodeAvailable(c).catch(()=>true);
      setAvail(ok);
    }
  };

  const changeCode = (v) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
    setCode(clean); checkCode(clean);
  };

  const submit = async () => {
    if (!title.trim() || code.length < 4 || !avail || loading) return;
    setLoading(true); setError("");
    try {
      const cls = await createClass(title, code);
      onCreated(cls);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}>
      <div style={{ background:"var(--bg-card)", borderRadius:"var(--radius-lg)",
        padding:"28px 24px", width:"400px", maxWidth:"94vw",
        boxShadow:"0 20px 50px rgba(0,0,0,.3)", direction:"rtl" }}>
        <h3 style={{ margin:"0 0 20px", fontSize:"16px", fontWeight:700, color:"var(--text-primary)" }}>
          🏫 צור כיתה חדשה
        </h3>
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div>
            <label style={{ fontSize:"12px", fontWeight:600, color:"var(--text-secondary)",
              display:"block", marginBottom:"5px" }}>שם הקורס *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="למשל: מבוא למדעי המחשב 2025"
              style={{ width:"100%", padding:"10px 12px", boxSizing:"border-box",
                border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
                background:"var(--bg-input)", color:"var(--text-primary)",
                fontSize:"14px", outline:"none", fontFamily:"inherit" }}/>
          </div>
          <div>
            <label style={{ fontSize:"12px", fontWeight:600, color:"var(--text-secondary)",
              display:"block", marginBottom:"5px" }}>קוד כיתה</label>
            <div style={{ display:"flex", gap:"8px" }}>
              <input value={code} onChange={e=>changeCode(e.target.value)}
                maxLength={6} style={{ flex:1, padding:"10px 12px",
                  border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
                  background:"var(--bg-input)", color:"var(--text-primary)",
                  fontSize:"16px", letterSpacing:"0.15em", fontWeight:700,
                  textAlign:"center", fontFamily:"monospace", outline:"none" }}/>
              <button onClick={()=>{ const c=genCode(); setCode(c); checkCode(c); }}
                style={{ background:"var(--bg-page)", border:"1px solid var(--border)",
                  borderRadius:"var(--radius-sm)", padding:"0 12px", fontSize:"18px",
                  cursor:"pointer", flexShrink:0 }}>🔄</button>
            </div>
            {code.length>=4 && (
              <p style={{ fontSize:"12px", margin:"5px 0 0",
                color: avail ? "#22c55e" : "#ef4444" }}>
                {avail ? "✓ הקוד זמין" : "✗ הקוד תפוס"}
              </p>
            )}
          </div>
          {error && <p style={{ color:"#ef4444", fontSize:"13px", margin:0 }}>{error}</p>}
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ background:"transparent",
              border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
              padding:"9px 18px", color:"var(--text-secondary)", cursor:"pointer",
              fontFamily:"inherit", fontSize:"13px" }}>ביטול</button>
            <button onClick={submit} disabled={!title.trim()||code.length<4||!avail||loading}
              style={{ background:(!title.trim()||code.length<4||!avail)?"var(--text-muted)":"var(--brand)",
                border:"none", borderRadius:"var(--radius-sm)", padding:"9px 20px",
                color:"#fff", fontWeight:700, fontSize:"13px",
                cursor:(!title.trim()||code.length<4||!avail)?"not-allowed":"pointer",
                fontFamily:"inherit" }}>
              {loading ? "יוצר..." : "צור כיתה"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Class summary card ────────────────────────────────────────────────────────
function ClassCard({ cls, onClick }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    Promise.all([
      getClassStudents(cls.id).catch(()=>[]),
      getClassMissions(cls.id).catch(()=>[]),
    ]).then(([s,m]) => setStats({ students:s.length, missions:m.length }));
  }, [cls.id]);

  return (
    <div onClick={onClick} style={{ background:"var(--bg-card)",
      border:"1px solid var(--border)", borderRadius:"var(--radius-md)",
      padding:"18px 20px", cursor:"pointer", transition:"box-shadow .15s, border-color .15s" }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.borderColor="var(--brand)";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="var(--border)";}}>
      <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
        <div style={{ width:"48px", height:"48px", borderRadius:"12px",
          background:"var(--brand-light)", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:"24px", flexShrink:0 }}>🏫</div>
        <div style={{ flex:1, minWidth:0 }}>
          <h3 style={{ margin:"0 0 4px", fontSize:"15px", fontWeight:700,
            color:"var(--text-primary)", overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cls.title}</h3>
          <code style={{ fontSize:"12px", background:"var(--bg-page)",
            border:"1px solid var(--border)", borderRadius:"6px",
            padding:"2px 10px", color:"var(--brand)", fontWeight:700,
            letterSpacing:"0.1em" }}>{cls.code}</code>
        </div>
        <div style={{ display:"flex", gap:"16px", flexShrink:0 }}>
          {[["👨‍🎓",stats?.students],["📋",stats?.missions]].map(([icon,val],i) => (
            <div key={i} style={{ textAlign:"center" }}>
              <p style={{ margin:0, fontSize:"16px" }}>{icon}</p>
              <p style={{ margin:"2px 0 0", fontSize:"14px", fontWeight:700,
                color:"var(--text-primary)" }}>{val ?? "…"}</p>
            </div>
          ))}
        </div>
        <span style={{ color:"var(--text-muted)", fontSize:"16px", flexShrink:0 }}>←</span>
      </div>
    </div>
  );
}

// ── Main LecturerPage ─────────────────────────────────────────────────────────
export default function LecturerPage() {
  const [classes,      setClasses]      = useState(null);
  const [activeClass,  setActiveClass]  = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);

  const loadClasses = () => getLecturerClasses().then(setClasses).catch(()=>setClasses([]));
  useEffect(() => { if (isFirebaseConfigured) loadClasses(); else setClasses([]); }, []);

  return (
    <div style={{ height:"100%", overflowY:"auto", background:"var(--bg-page)",
      padding:"24px 20px", boxSizing:"border-box", direction:"rtl" }}>
      <div style={{ maxWidth:"820px", margin:"0 auto", display:"flex",
        flexDirection:"column", gap:"18px" }}>

        {/* No Firebase */}
        {!isFirebaseConfigured && (
          <div style={{ background:"#fefce8", border:"1px solid #fde047",
            borderRadius:"var(--radius-md)", padding:"14px 18px",
            fontSize:"14px", color:"#854d0e" }}>
            ⚠️ לוח המרצה דורש חיבור לפיירבייס
          </div>
        )}

        {/* Class detail view */}
        {activeClass ? (
          <ClassDetail cls={activeClass} onBack={()=>setActiveClass(null)}/>
        ) : (
          <>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
              <div>
                <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:700, color:"var(--text-primary)" }}>
                  🎓 לוח מרצה
                </h1>
                <p style={{ margin:0, fontSize:"14px", color:"var(--text-muted)" }}>
                  ניהול כיתות, משימות וסטודנטים
                </p>
              </div>
              {isFirebaseConfigured && (
                <button onClick={()=>setShowCreate(true)} style={{
                  background:"var(--brand)", color:"#fff", border:"none",
                  borderRadius:"var(--radius-sm)", padding:"10px 20px",
                  fontWeight:700, fontSize:"14px", cursor:"pointer",
                  fontFamily:"inherit" }}>+ כיתה חדשה</button>
              )}
            </div>

            {/* Loading */}
            {classes===null && (
              <div style={{ display:"flex", gap:"10px", color:"var(--text-muted)", fontSize:"14px", alignItems:"center" }}>
                <Spin/>טוען כיתות...
              </div>
            )}

            {/* Empty */}
            {classes?.length===0 && (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-muted)" }}>
                <div style={{ fontSize:"48px", marginBottom:"12px" }}>🏫</div>
                <p style={{ margin:0, fontSize:"15px", color:"var(--text-secondary)" }}>אין כיתות עדיין</p>
                <p style={{ margin:"6px 0 0", fontSize:"13px" }}>לחץ "כיתה חדשה" כדי להתחיל</p>
              </div>
            )}

            {/* Class cards */}
            {classes?.map(cls => (
              <ClassCard key={cls.id} cls={cls} onClick={()=>setActiveClass(cls)}/>
            ))}
          </>
        )}
      </div>

      {showCreate && (
        <CreateClassModal
          onCreated={(cls) => { setShowCreate(false); setClasses(p=>[cls,...(p??[])]); }}
          onClose={()=>setShowCreate(false)}/>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
