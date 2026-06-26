import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getMyStudents,
  getStudentDocuments,
  getStudentHistory,
  getStudentMessages,
  getStudentDocumentSessions,
} from "../lib/localStore";
import { isFirebaseConfigured } from "../lib/firebase";

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const diff  = Math.floor((today - d) / 86400000);
  if (diff === 0) return "היום";
  if (diff === 1) return "אתמול";
  if (diff < 7)  return `לפני ${diff} ימים`;
  return d.toLocaleDateString("he-IL");
}

function scoreColor(s) {
  if (s == null) return "#9ca3af";
  return s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
}

// ── Mini markdown for chat messages ───────────────────────────────────────
function MD({ text }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      p:      ({children}) => <p  style={{margin:"3px 0",fontSize:"13px",lineHeight:1.65,color:"var(--text-secondary)"}}>{children}</p>,
      strong: ({children}) => <strong style={{fontWeight:700,color:"var(--text-primary)"}}>{children}</strong>,
      h2:     ({children}) => <h2 style={{fontSize:"14px",fontWeight:700,margin:"8px 0 3px",color:"var(--text-primary)"}}>{children}</h2>,
      h3:     ({children}) => <h3 style={{fontSize:"13px",fontWeight:700,margin:"6px 0 2px",color:"var(--text-primary)"}}>{children}</h3>,
      ul:     ({children}) => <ul style={{margin:"3px 0",paddingRight:"16px"}}>{children}</ul>,
      li:     ({children}) => <li style={{fontSize:"13px",color:"var(--text-secondary)"}}>{children}</li>,
      hr:     ()           => <hr style={{border:"none",borderTop:"1px solid var(--border)",margin:"8px 0"}}/>,
    }}>
      {text}
    </ReactMarkdown>
  );
}

// ── Score circle ───────────────────────────────────────────────────────────
function ScoreCircle({ score, size = 40 }) {
  const c = scoreColor(score);
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:c, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize: size >= 52 ? "20px" : "13px", fontWeight:800, flexShrink:0 }}>
      {score ?? "—"}
    </div>
  );
}

// ── Chat message list ──────────────────────────────────────────────────────
function MessageList({ messages }) {
  if (!messages?.length) return <p style={{color:"var(--text-muted)",fontSize:"13px",padding:"8px 0"}}>אין הודעות</p>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"8px",maxHeight:"340px",overflowY:"auto",padding:"4px 0"}}>
      {messages.map(msg => {
        const isBot = msg.sender === "bot";
        return (
          <div key={msg.id} style={{display:"flex",gap:"8px",flexDirection:isBot?"row":"row-reverse"}}>
            <div style={{width:"26px",height:"26px",borderRadius:"50%",background:isBot?"#6366f1":"#9ca3af",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",flexShrink:0}}>
              {isBot?"🧠":"👤"}
            </div>
            <div style={{maxWidth:"80%",padding:"8px 12px",
              borderRadius:isBot?"12px 12px 12px 4px":"12px 12px 4px 12px",
              background:isBot?"var(--msg-bot-bg)":"var(--msg-user-bg)",
              border:isBot?"1px solid var(--border)":"none",direction:"rtl",textAlign:"right"}}>
              {isBot ? <MD text={msg.text}/> : <span style={{fontSize:"13px",lineHeight:1.65}}>{msg.text}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Session block (one archived conversation) ─────────────────────────────
function SessionBlock({ session, index, studentUid, docId }) {
  const [open, setOpen] = useState(false);
  const msgs = session.messages ?? [];
  const studentMsgs = msgs.filter(m => m.sender === "user");
  return (
    <div style={{border:"1px solid var(--border)",borderRadius:"8px",overflow:"hidden",marginTop:"6px"}}>
      <div onClick={() => setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",
          cursor:"pointer",background:"var(--bg-page)",
          borderBottom: open ? "1px solid var(--border)" : "none"}}>
        <span style={{fontSize:"15px"}}>{open?"▲":"▼"}</span>
        <div style={{flex:1}}>
          <span style={{fontSize:"13px",fontWeight:600,color:"var(--text-primary)"}}>
            שיחה {index + 1}
          </span>
          <span style={{fontSize:"12px",color:"var(--text-muted)",marginRight:"10px"}}>
            {fmt(session.createdAt)} · {msgs.length} הודעות · {studentMsgs.length} תשובות סטודנט
          </span>
        </div>
      </div>
      {open && (
        <div style={{padding:"12px 14px",background:"var(--bg-card)"}}>
          <MessageList messages={msgs}/>
        </div>
      )}
    </div>
  );
}

// ── Document row with sessions ─────────────────────────────────────────────
function DocRow({ doc, studentUid }) {
  const [open,     setOpen]     = useState(false);
  const [sessions, setSessions] = useState(null);
  const [active,   setActive]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && sessions === null) {
      setLoading(true);
      const [sess, msgs] = await Promise.all([
        getStudentDocumentSessions(studentUid, doc.id).catch(()=>[]),
        getStudentMessages(studentUid, doc.id).catch(()=>[]),
      ]);
      setSessions(sess);
      setActive(msgs);
      setLoading(false);
    }
  };

  const allSessions = [
    ...(active?.length ? [{ id:"__active__", messages: active, createdAt: Date.now(), isActive: true }] : []),
    ...(sessions ?? []),
  ];

  return (
    <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-md)",overflow:"hidden"}}>
      {/* Doc header */}
      <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 16px"}}>
        <span style={{fontSize:"18px"}}>📄</span>
        <div style={{flex:1}}>
          <p style={{margin:0,fontWeight:600,fontSize:"13px",color:"var(--text-primary)"}}>{doc.title}</p>
          <p style={{margin:"2px 0 0",fontSize:"11px",color:"var(--text-muted)"}}>
            {doc.date}{doc.pageCount?` · ${doc.pageCount} עמ׳`:""}
          </p>
        </div>
        <button onClick={handleOpen}
          style={{background:open?"var(--brand)":"var(--bg-page)",border:"1px solid var(--border)",
            borderRadius:"var(--radius-sm)",color:open?"#fff":"var(--text-secondary)",
            cursor:"pointer",padding:"5px 12px",fontSize:"12px",fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap"}}>
          {open ? "▲ סגור" : `▼ שיחות${sessions!==null?` (${allSessions.length})`:""}`}
        </button>
      </div>

      {/* Sessions list */}
      {open && (
        <div style={{padding:"0 16px 14px",borderTop:"1px solid var(--border)"}}>
          {loading && <p style={{color:"var(--text-muted)",fontSize:"13px",marginTop:"10px"}}>טוען שיחות...</p>}
          {!loading && allSessions.length === 0 && (
            <p style={{color:"var(--text-muted)",fontSize:"13px",marginTop:"10px"}}>אין שיחות עדיין</p>
          )}
          {!loading && allSessions.map((sess, i) => (
            sess.isActive ? (
              <div key="active" style={{border:"1px solid #6366f1",borderRadius:"8px",overflow:"hidden",marginTop:"8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",
                  background:"var(--brand-light)"}}>
                  <span style={{fontSize:"11px",fontWeight:700,color:"var(--brand)",background:"var(--brand-light)",
                    border:"1px solid var(--brand)",borderRadius:"12px",padding:"2px 8px"}}>
                    שיחה פעילה
                  </span>
                  <span style={{fontSize:"12px",color:"var(--text-muted)"}}>
                    {sess.messages.length} הודעות
                  </span>
                </div>
                <div style={{padding:"12px 14px"}}>
                  <MessageList messages={sess.messages}/>
                </div>
              </div>
            ) : (
              <SessionBlock key={sess.id} session={sess} index={allSessions.filter(s=>!s.isActive).length - i + (active?.length?0:-1)} studentUid={studentUid} docId={doc.id}/>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── Student detail page ────────────────────────────────────────────────────
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

  const loading  = docs === null || history === null;
  const scores   = history?.filter(e=>typeof e.score==="number").map(e=>e.score) ?? [];
  const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;

  const TABS = [
    { id:"docs",    label:"📄 מאמרים",   count: docs?.length },
    { id:"grades",  label:"🏁 ציונים",   count: scores.length },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Back + student header */}
      <div style={{display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap"}}>
        <button onClick={onBack}
          style={{background:"transparent",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",
            padding:"6px 14px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit",fontSize:"13px"}}>
          ← חזרה
        </button>
        <div style={{flex:1}}>
          <h2 style={{margin:0,fontSize:"18px",fontWeight:700,color:"var(--text-primary)"}}>
            👨‍🎓 {student.displayName || student.email}
          </h2>
          {student.email && <p style={{margin:"2px 0 0",fontSize:"12px",color:"var(--text-muted)"}}>{student.email}</p>}
        </div>
        {avgScore !== null && (
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"12px",color:"var(--text-muted)"}}>ציון ממוצע</span>
            <ScoreCircle score={avgScore} size={52}/>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"4px",background:"var(--bg-card)",borderRadius:"var(--radius-sm)",padding:"4px",border:"1px solid var(--border)",alignSelf:"flex-start"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{background:tab===t.id?"var(--brand)":"transparent",
              color:tab===t.id?"#fff":"var(--text-secondary)",
              border:"none",borderRadius:"6px",padding:"6px 16px",fontSize:"13px",
              fontWeight:tab===t.id?700:400,cursor:"pointer",fontFamily:"inherit",
              display:"flex",gap:"6px",alignItems:"center",whiteSpace:"nowrap"}}>
            {t.label}
            {t.count != null && (
              <span style={{fontSize:"11px",background:tab===t.id?"rgba(255,255,255,.25)":"var(--bg-page)",
                borderRadius:"10px",padding:"1px 7px",fontWeight:700}}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <p style={{color:"var(--text-muted)",fontSize:"14px"}}>טוען נתוני סטודנט...</p>}

      {/* Docs tab */}
      {!loading && tab==="docs" && (
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {docs.length===0
            ? <p style={{color:"var(--text-muted)",fontSize:"13px"}}>לא הועלו מאמרים</p>
            : docs.map(doc => <DocRow key={doc.id} doc={doc} studentUid={student.uid}/>)
          }
        </div>
      )}

      {/* Grades tab */}
      {!loading && tab==="grades" && (
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {scores.length===0
            ? <p style={{color:"var(--text-muted)",fontSize:"13px"}}>אין ציונים עדיין</p>
            : history.map(ev => (
              <div key={ev.id} style={{display:"flex",alignItems:"center",gap:"14px",
                background:"var(--bg-card)",border:"1px solid var(--border)",
                borderRadius:"var(--radius-md)",padding:"12px 16px"}}>
                <ScoreCircle score={ev.score} size={44}/>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:"13px",fontWeight:600,color:"var(--text-primary)"}}>{ev.title}</p>
                  <p style={{margin:"3px 0 0",fontSize:"11px",color:"var(--text-muted)"}}>📅 {ev.date}</p>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── Student summary card (loads its own stats) ────────────────────────────
function StudentCard({ student, onClick }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      getStudentDocuments(student.uid).catch(()=>[]),
      getStudentHistory(student.uid).catch(()=>[]),
    ]).then(([docs, hist]) => {
      const scores = hist.filter(e=>typeof e.score==="number").map(e=>e.score);
      const avg    = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
      setStats({ docCount:docs.length, gradeCount:scores.length, avg });
    });
  }, [student.uid]);

  const avg = stats?.avg;

  return (
    <div onClick={onClick}
      style={{background:"var(--bg-card)",border:`2px solid ${avg!=null?scoreColor(avg)+"44":"var(--border)"}`,
        borderRadius:"var(--radius-md)",padding:"18px 20px",cursor:"pointer",
        display:"flex",flexDirection:"column",gap:"14px",
        transition:"box-shadow .15s, border-color .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"; e.currentTarget.style.borderColor=avg!=null?scoreColor(avg)+"88":"var(--brand)";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor=avg!=null?scoreColor(avg)+"44":"var(--border)";}}>

      {/* Top row: avatar + name + score */}
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"44px",height:"44px",borderRadius:"50%",background:"var(--brand-light)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",flexShrink:0}}>
          👨‍🎓
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontWeight:700,fontSize:"14px",color:"var(--text-primary)",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {student.displayName || student.email || "סטודנט"}
          </p>
          {student.email && student.displayName && (
            <p style={{margin:"2px 0 0",fontSize:"11px",color:"var(--text-muted)",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {student.email}
            </p>
          )}
        </div>
        {avg !== null && <ScoreCircle score={avg} size={40}/>}
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:"0",borderTop:"1px solid var(--border)",paddingTop:"12px"}}>
        {[
          { icon:"📄", label:"מאמרים", val: stats?.docCount },
          { icon:"🏁", label:"ציונים", val: stats?.gradeCount },
        ].map(({icon,label,val},i) => (
          <div key={i} style={{flex:1,textAlign:"center",borderLeft:i>0?"1px solid var(--border)":"none",paddingLeft:i>0?"12px":"0"}}>
            <p style={{margin:0,fontSize:"18px"}}>{icon}</p>
            <p style={{margin:"2px 0 0",fontSize:typeof val==="string"?"11px":"16px",fontWeight:700,color:"var(--text-primary)"}}>
              {val ?? (stats===null?"...":"—")}
            </p>
            <p style={{margin:0,fontSize:"11px",color:"var(--text-muted)"}}>{label}</p>
          </div>
        ))}
      </div>

      <p style={{margin:0,textAlign:"center",fontSize:"12px",color:"var(--brand)",fontWeight:600}}>
        לחץ לצפייה בפרטים ←
      </p>
    </div>
  );
}

// ── Main LecturerPage ──────────────────────────────────────────────────────
function LecturerPage() {
  const [students, setStudents]   = useState(null);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) { setStudents([]); return; }
    getMyStudents().then(setStudents).catch(()=>setStudents([]));
  }, []);

  const loading = students === null;

  return (
    <div style={{height:"100%",overflowY:"auto",background:"var(--bg-page)",padding:"28px 24px",boxSizing:"border-box",direction:"rtl"}}>
      <div style={{maxWidth:"860px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"20px"}}>

        {/* Header */}
        {!selected && (
          <div>
            <h1 style={{margin:"0 0 6px",fontSize:"22px",fontWeight:700,color:"var(--text-primary)"}}>
              🎓 לוח מרצה
            </h1>
            <p style={{margin:0,fontSize:"14px",color:"var(--text-muted)"}}>
              צפייה בלבד — מאמרים, שיחות וציונים של הסטודנטים שלך
            </p>
          </div>
        )}

        {/* No Firebase */}
        {!isFirebaseConfigured && (
          <div style={{background:"#fefce8",border:"1px solid #fde047",borderRadius:"var(--radius-md)",padding:"16px 20px",fontSize:"14px",color:"#854d0e"}}>
            ⚠️ תכונת המרצה דורשת חיבור לפיירבייס.
          </div>
        )}

        {/* Loading */}
        {isFirebaseConfigured && loading && (
          <div style={{display:"flex",alignItems:"center",gap:"10px",color:"var(--text-muted)",fontSize:"14px"}}>
            <div style={{width:"16px",height:"16px",border:"2px solid var(--border)",borderTopColor:"var(--brand)",
              borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
            טוען רשימת סטודנטים...
          </div>
        )}

        {/* Student detail */}
        {selected && <StudentDetail student={selected} onBack={()=>setSelected(null)}/>}

        {/* Students grid */}
        {!selected && !loading && isFirebaseConfigured && (
          students.length === 0 ? (
            <div style={{textAlign:"center",padding:"60px 20px",color:"var(--text-muted)"}}>
              <div style={{fontSize:"48px",marginBottom:"12px"}}>👨‍🎓</div>
              <p style={{margin:0,fontSize:"15px",color:"var(--text-secondary)"}}>אין סטודנטים רשומים עדיין</p>
              <p style={{margin:"8px 0 0",fontSize:"13px"}}>שתף את קוד הכיתה שלך עם הסטודנטים</p>
            </div>
          ) : (
            <>
              <p style={{margin:0,fontSize:"13px",color:"var(--text-muted)"}}>
                {students.length} סטודנטים רשומים
              </p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"14px"}}>
                {students.map(s => (
                  <StudentCard key={s.uid} student={s} onClick={()=>setSelected(s)}/>
                ))}
              </div>
            </>
          )
        )}

        <div style={{height:"24px"}}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default LecturerPage;
