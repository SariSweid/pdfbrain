import { useState } from "react";
import ChatPage     from "../pages/ChatPage";
import ComparePage  from "../pages/ComparePage";
import HistoryPage  from "../pages/HistoryPage";
import LecturerPage from "../pages/LecturerPage";
import ThemeToggle  from "../components/ThemeToggle";
import { useTheme } from "../hooks/useTheme";

const ROLE_META = {
  student:  { emoji:"👨‍🎓", label:"סטודנט",  color:"#6366f1" },
  lecturer: { emoji:"👨‍🏫", label:"מרצה",    color:"#8b5cf6" },
};

// Tabs available to each role
const STUDENT_TABS  = [
  { id:"chat",    emoji:"💬", label:"Chat" },
  { id:"compare", emoji:"⚖️", label:"השוואה" },
  { id:"history", emoji:"🕘", label:"היסטוריה" },
];

function MainLayout({ role = "student", onRoleChange, onLogout, classCode }) {
  const [activePage, setActivePage] = useState(role === "lecturer" ? "lecturer" : "chat");
  const { theme, toggle }           = useTheme();
  const isLecturer  = role === "lecturer";
  const roleMeta    = ROLE_META[role] ?? ROLE_META.student;
  const studentCode = !isLecturer ? (localStorage.getItem("pdfbrain:my_lecturer_code") ?? null) : null;
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", background:"var(--bg-page)" }}>

      {/* ── Header ── */}
      <header style={{ flexShrink:0, height:"60px", background:"var(--bg-card)", borderBottom:"1px solid var(--border)", padding:"0 24px", display:"flex", alignItems:"center", gap:"4px", boxShadow:"var(--shadow-sm)" }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginLeft:"20px" }}>
          <span style={{ fontSize:"22px" }}>🧠</span>
          <span style={{ fontWeight:800, fontSize:"18px", color:"var(--brand)", letterSpacing:"-0.5px" }}>PDFBrain</span>
        </div>
        <div style={{ width:"1px", height:"22px", background:"var(--border)", marginLeft:"16px", marginRight:"4px", flexShrink:0 }} />

        {/* Nav tabs — students only */}
        {!isLecturer && (
          <nav style={{ display:"flex", gap:"2px", alignItems:"center" }}>
            {STUDENT_TABS.map((tab) => {
              const active = activePage === tab.id;
              return (
                <button key={tab.id} onClick={() => setActivePage(tab.id)}
                  style={{ background: active ? "var(--brand-light)" : "transparent", color: active ? "var(--brand)" : "var(--text-secondary)", border:"none", borderRadius:"var(--radius-sm)", padding:"7px 16px", fontWeight: active ? 700 : 500, fontSize:"14px", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:"6px", transition:"background .15s, color .15s" }}>
                  <span style={{ fontSize:"14px" }}>{tab.emoji}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Lecturer label */}
        {isLecturer && (
          <span style={{ fontSize:"14px", fontWeight:600, color:"var(--text-secondary)" }}>לוח מרצה</span>
        )}

        <div style={{ flex:1 }} />

        {/* Lecturer class code */}
        {isLecturer && classCode && (
          <div style={{ display:"flex", alignItems:"center", gap:"7px", marginLeft:"8px" }}>
            <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>קוד מרצה:</span>
            <code style={{ fontSize:"12px", background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"6px", padding:"4px 12px", color:"var(--brand)", fontWeight:700, letterSpacing:"0.1em" }}>
              {classCode}
            </code>
          </div>
        )}

        {/* Student class code */}
        {!isLecturer && studentCode && (
          <div style={{ display:"flex", alignItems:"center", gap:"7px", marginLeft:"8px" }}>
            <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>קוד מרצה:</span>
            <code style={{ fontSize:"12px", background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"6px", padding:"4px 12px", color:"var(--brand)", fontWeight:700, letterSpacing:"0.1em" }}>
              {studentCode}
            </code>
          </div>
        )}

        {/* Role badge */}
        <div style={{ display:"flex", alignItems:"center", gap:"7px", background:"var(--brand-light)", border:"1px solid", borderColor: roleMeta.color + "44", borderRadius:"20px", padding:"5px 14px", marginLeft:"6px" }}>
          <span style={{ fontSize:"15px" }}>{roleMeta.emoji}</span>
          <span style={{ fontSize:"13px", fontWeight:700, color:"var(--brand)" }}>{roleMeta.label}</span>
        </div>

        <ThemeToggle theme={theme} onToggle={toggle} />

        {onLogout && (
          <button onClick={onLogout}
            style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-secondary)", cursor:"pointer", padding:"7px 14px", fontSize:"13px", fontFamily:"inherit", marginRight:"4px" }}>
            יציאה
          </button>
        )}
      </header>

      {/* ── Page content ── */}
      <main style={{ flex:1, overflow:"hidden", display:"flex", minHeight:0 }}>
        {/* Lecturer sees only their dashboard */}
        {isLecturer && (
          <div style={{ flex:1, overflow:"hidden", minHeight:0, display:"flex" }}>
            <LecturerPage />
          </div>
        )}

        {/* Student tabs — kept mounted for state preservation */}
        {!isLecturer && (
          <>
            <div style={{ display: activePage==="chat"    ? "flex" : "none", flex:1, overflow:"hidden", minHeight:0 }}><ChatPage /></div>
            <div style={{ display: activePage==="compare" ? "flex" : "none", flex:1, overflow:"hidden", minHeight:0 }}><ComparePage /></div>
            {activePage === "history" && <div style={{ flex:1, overflow:"hidden", minHeight:0, display:"flex" }}><HistoryPage /></div>}
          </>
        )}
      </main>
    </div>
  );
}

export default MainLayout;
