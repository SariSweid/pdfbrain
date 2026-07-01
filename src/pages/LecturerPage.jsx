import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getLecturerClasses, createClass, isClassCodeAvailable,
  getClassStudents, getClassMissions, addMissionToClass, deleteMission,

  getAllMissionSubmissions, getStudentMissionMessages, getStudentMissionGrades,
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
// ── Student in class view (missions + grades + chat) ────────────────────────
function StudentInClassView({ student, cls, onBack }) {
  const [missions,  setMissions]  = useState(null);
  const [expanded,  setExpanded]  = useState(null);
  const [msnData,   setMsnData]   = useState({});
  const [loading,   setLoading]   = useState({});

  useEffect(() => {
    getClassMissions(cls.id).then(setMissions).catch(() => setMissions([]));
  }, [cls.id]);

  const toggle = async (mId) => {
    if (expanded === mId) { setExpanded(null); return; }
    setExpanded(mId);
    if (!msnData[mId]) {
      setLoading(p => ({ ...p, [mId]: true }));
      const [grades, messages] = await Promise.all([
        getStudentMissionGrades(cls.id, mId, student.uid).catch(() => []),
        getStudentMissionMessages(cls.id, mId, student.uid).catch(() => []),
      ]);
      setMsnData(p => ({ ...p, [mId]: { grades, messages } }));
      setLoading(p => ({ ...p, [mId]: false }));
    }
  };

  const scoreColor = s => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
  const allScores  = Object.values(msnData).flatMap(d => d.grades?.map(g => g.score) ?? []).filter(s => typeof s === "number");
  const avg        = allScores.length ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
        <button onClick={onBack} style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"6px 14px", color:"var(--text-secondary)", cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>← חזרה לסטודנטים</button>
        <div style={{ flex:1 }}>
          <h3 style={{ margin:0, fontSize:"16px", fontWeight:700, color:"var(--text-primary)" }}>
            👨‍🎓 {student.displayName || student.email}
          </h3>
          {student.email && <p style={{ margin:"2px 0 0", fontSize:"12px", color:"var(--text-muted)" }}>{student.email}</p>}
        </div>
        {avg !== null && <Score score={avg} size={44}/>}
      </div>

      {/* Mission list */}
      {missions === null && <div style={{ display:"flex", gap:"8px", color:"var(--text-muted)", fontSize:"13px", alignItems:"center" }}><Spin/>טוען משימות...</div>}
      {missions?.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:"13px" }}>אין משימות בכיתה זו</p>}

      {missions?.map(m => {
        const data    = msnData[m.id];
        const isOpen  = expanded === m.id;
        const topGrade = data?.grades?.[0]?.score ?? null;
        const msgs     = data?.messages ?? [];
        return (
          <div key={m.id} style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden" }}>

            {/* Mission row */}
            <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 16px", cursor:"pointer" }} onClick={() => toggle(m.id)}>
              <span style={{ fontSize:"18px" }}>📋</span>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontWeight:600, fontSize:"13px", color:"var(--text-primary)" }}>{m.title}</p>
                {data && data.grades?.length === 0 && data.messages?.length === 0 && (
                  <p style={{ margin:"2px 0 0", fontSize:"11px", color:"var(--text-muted)" }}>לא הגיש עדיין</p>
                )}
                {data && (data.grades?.length > 0 || data.messages?.length > 0) && (
                  <p style={{ margin:"2px 0 0", fontSize:"11px", color:"var(--text-muted)" }}>
                    {msgs.length} הודעות · {data.grades?.length ?? 0} ציונים
                  </p>
                )}
              </div>
              {topGrade !== null && (
                <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:scoreColor(topGrade), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:800, flexShrink:0 }}>
                  {topGrade}
                </div>
              )}
              <span style={{ color:"var(--text-muted)", fontSize:"12px" }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* Expanded: grades + chat */}
            {isOpen && (
              <div style={{ borderTop:"1px solid var(--border)", padding:"12px 16px" }}>
                {loading[m.id] && <div style={{ display:"flex", gap:"8px", color:"var(--text-muted)", fontSize:"13px", alignItems:"center" }}><Spin/>טוען...</div>}

                {/* Grade history */}
                {!loading[m.id] && data?.grades?.length > 0 && (
                  <div style={{ marginBottom:"14px" }}>
                    <p style={{ margin:"0 0 8px", fontSize:"11px", fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".05em" }}>ציונים ({data.grades.length} ניסיונות)</p>
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      {data.grades.map((g, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"7px 12px" }}>
                          <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:scoreColor(g.score), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:800 }}>{g.score}</div>
                          <div>
                            <p style={{ margin:0, fontSize:"12px", fontWeight:600, color:"var(--text-primary)" }}>ניסיון {data.grades.length - i}</p>
                            <p style={{ margin:0, fontSize:"11px", color:"var(--text-muted)" }}>{new Date(g.gradedAt).toLocaleDateString("he-IL")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat messages */}
                {!loading[m.id] && msgs.length > 0 && (
                  <div>
                    <p style={{ margin:"0 0 8px", fontSize:"11px", fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".05em" }}>שיחה ({msgs.length} הודעות)</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:"8px", maxHeight:"320px", overflowY:"auto" }}>
                      {msgs.map(msg => {
                        const isBot = msg.sender === "bot";
                        return (
                          <div key={msg.id} style={{ display:"flex", gap:"7px", flexDirection:isBot?"row":"row-reverse" }}>
                            <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:isBot?"#6366f1":"#9ca3af", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", flexShrink:0 }}>
                              {isBot?"🧠":"👤"}
                            </div>
                            <div style={{ maxWidth:"80%", padding:"7px 11px", borderRadius:isBot?"12px 12px 12px 4px":"12px 12px 4px 12px", background:isBot?"var(--msg-bot-bg)":"var(--msg-user-bg)", border:isBot?"1px solid var(--border)":"none", direction:"rtl", textAlign:"right" }}>
                              <span style={{ fontSize:"12px", lineHeight:1.6 }}>{msg.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!loading[m.id] && !data?.grades?.length && !msgs.length && (
                  <p style={{ color:"var(--text-muted)", fontSize:"13px", margin:0 }}>לא הגיש עדיין על משימה זו</p>
                )}
              </div>
            )}
          </div>
        );
      })}
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
    const [msgs, grds] = await Promise.all([
      getStudentMissionMessages(cls.id, mission.id, sub.uid).catch(() => []),
      getStudentMissionGrades(cls.id, mission.id, sub.uid).catch(() => []),
    ]);
    setViewing({ submission: sub, messages: msgs, grades: grds });
    setLoadingMsgs(false);
  };

  if (viewing) {
    const { submission: sub, messages } = viewing;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
          <button onClick={() => setViewing(null)} style={{ background:"transparent",
            border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
            padding:"5px 12px", color:"var(--text-secondary)", cursor:"pointer",
            fontFamily:"inherit", fontSize:"13px" }}>← חזרה להגשות</button>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:"14px", color:"var(--text-primary)" }}>
              👨‍🎓 {sub.displayName || sub.email || sub.uid}
            </p>
            {sub.pdfTitle && (
              <p style={{ margin:"2px 0 0", fontSize:"12px", color:"var(--text-muted)" }}>📄 {sub.pdfTitle}</p>
            )}
          </div>
          {/* Grade history badges */}
          {viewing.grades?.length > 0 && (
            <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
              {viewing.grades.map((g, i) => (
                <div key={i} title={`ניסיון ${viewing.grades.length-i}: ${g.feedback}`}
                  style={{ width:"36px", height:"36px", borderRadius:"50%",
                    background: g.score>=80?"#22c55e":g.score>=60?"#f59e0b":"#ef4444",
                    color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"12px", fontWeight:800, cursor:"help" }}>
                  {g.score}
                </div>
              ))}
              <span style={{ fontSize:"11px", color:"var(--text-muted)" }}>
                {viewing.grades.length} ניסיון{viewing.grades.length>1?"ות":""}
              </span>
            </div>
          )}
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
    return <StudentInClassView student={selectedStudent} cls={cls} onBack={()=>setSelectedStudent(null)}/>;
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
