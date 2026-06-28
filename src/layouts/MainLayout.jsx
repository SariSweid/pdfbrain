import { useState } from "react";
import ChatPage     from "../pages/ChatPage";
import ComparePage  from "../pages/ComparePage";
import HistoryPage  from "../pages/HistoryPage";
import LecturerPage from "../pages/LecturerPage";
import ThemeToggle  from "../components/ThemeToggle";
import { useTheme }             from "../hooks/useTheme";
import { useResponsiveLayout }  from "../hooks/useResponsiveLayout";

const ROLE_META = {
  student:  { emoji:"👨‍🎓", label:"סטודנט", color:"#6366f1" },
  lecturer: { emoji:"👨‍🏫", label:"מרצה",   color:"#8b5cf6" },
};

const STUDENT_TABS = [
  { id:"chat",    emoji:"💬", label:"צ׳אט" },
  { id:"compare", emoji:"⚖️", label:"השוואה" },
  { id:"history", emoji:"🕘", label:"היסטוריה" },
];

export default function MainLayout({ role = "student", onLogout, classCode }) {
  const [activePage, setActivePage] = useState(role === "lecturer" ? "lecturer" : "chat");
  const { theme, toggle }           = useTheme();
  const { isMobile, isCompact }     = useResponsiveLayout();
  const isLecturer  = role === "lecturer";
  const roleMeta    = ROLE_META[role] ?? ROLE_META.student;
  const studentCode = !isLecturer ? (localStorage.getItem("pdfbrain:my_lecturer_code") ?? null) : null;

  // Bottom nav height — reserve space so content isn't hidden
  const BOTTOM_NAV_H = 60;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", background:"var(--bg-page)" }}>

      {/* ── Header ── */}
      <header style={{
        flexShrink: 0,
        height: isMobile ? "52px" : "60px",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        padding: isMobile ? "0 14px" : "0 24px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "var(--shadow-sm)",
      }}>
        {/* Logo */}
        <span style={{ fontSize: isMobile ? "20px" : "22px" }}>🧠</span>
        <span style={{ fontWeight:800, fontSize: isMobile ? "16px" : "18px", color:"var(--brand)", letterSpacing:"-0.5px" }}>
          PDFBrain
        </span>

        {/* Divider + desktop nav tabs (hidden on mobile — tabs are in bottom nav) */}
        {!isMobile && !isLecturer && (
          <>
            <div style={{ width:"1px", height:"22px", background:"var(--border)", margin:"0 12px", flexShrink:0 }} />
            <nav style={{ display:"flex", gap:"2px" }}>
              {STUDENT_TABS.map(tab => {
                const active = activePage === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActivePage(tab.id)} style={{
                    background: active ? "var(--brand-light)" : "transparent",
                    color: active ? "var(--brand)" : "var(--text-secondary)",
                    border: "none", borderRadius: "var(--radius-sm)",
                    padding: "7px 16px", fontWeight: active ? 700 : 500, fontSize:"14px",
                    cursor:"pointer", fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:"6px",
                  }}>
                    <span>{tab.emoji}</span>{tab.label}
                  </button>
                );
              })}
            </nav>
          </>
        )}

        {!isMobile && isLecturer && (
          <>
            <div style={{ width:"1px", height:"22px", background:"var(--border)", margin:"0 12px", flexShrink:0 }} />
            <span style={{ fontSize:"14px", fontWeight:600, color:"var(--text-secondary)" }}>לוח מרצה</span>
          </>
        )}

        <div style={{ flex:1 }} />

        {/* Class code — desktop only */}
        {!isMobile && isLecturer && classCode && (
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginLeft:"4px" }}>
            <span style={{ fontSize:"11px", color:"var(--text-muted)" }}>קוד כיתה:</span>
            <code style={{ fontSize:"12px", background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"6px", padding:"3px 10px", color:"var(--brand)", fontWeight:700, letterSpacing:"0.1em" }}>
              {classCode}
            </code>
          </div>
        )}
        {!isMobile && !isLecturer && studentCode && (
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginLeft:"4px" }}>
            <span style={{ fontSize:"11px", color:"var(--text-muted)" }}>קוד כיתה:</span>
            <code style={{ fontSize:"12px", background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"6px", padding:"3px 10px", color:"var(--brand)", fontWeight:700, letterSpacing:"0.1em" }}>
              {studentCode}
            </code>
          </div>
        )}

        {/* Role badge — show emoji only on mobile */}
        <div style={{
          display:"flex", alignItems:"center", gap:"5px",
          background:"var(--brand-light)", border:"1px solid", borderColor: roleMeta.color + "44",
          borderRadius:"20px", padding: isMobile ? "5px 8px" : "5px 14px",
          marginLeft:"4px", flexShrink:0,
        }}>
          <span style={{ fontSize: isMobile ? "16px" : "15px" }}>{roleMeta.emoji}</span>
          {!isMobile && <span style={{ fontSize:"13px", fontWeight:700, color:"var(--brand)" }}>{roleMeta.label}</span>}
        </div>

        <ThemeToggle theme={theme} onToggle={toggle} />

        {onLogout && (
          <button onClick={onLogout} style={{
            background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
            color:"var(--text-secondary)", cursor:"pointer",
            padding: isMobile ? "7px 10px" : "7px 14px",
            fontSize:"13px", fontFamily:"inherit",
          }}>
            {isMobile ? "↩" : "יציאה"}
          </button>
        )}
      </header>

      {/* ── Page content ── */}
      <main style={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        minHeight: 0,
        // Make room for bottom nav on mobile
        paddingBottom: isMobile && !isLecturer ? `${BOTTOM_NAV_H}px` : 0,
      }}>
        {isLecturer && (
          <div style={{ flex:1, overflow:"hidden", minHeight:0, display:"flex" }}>
            <LecturerPage />
          </div>
        )}
        {!isLecturer && (
          <>
            <div style={{ display: activePage==="chat"    ? "flex" : "none", flex:"1 1 auto", width:"100%", minWidth:0, overflow:"hidden", minHeight:0 }}><ChatPage /></div>
            <div style={{ display: activePage==="compare" ? "flex" : "none", flex:"1 1 auto", width:"100%", minWidth:0, overflow:"hidden", minHeight:0 }}><ComparePage /></div>
            {activePage === "history" && <div style={{ flex:1, overflow:"hidden", minHeight:0, display:"flex" }}><HistoryPage /></div>}
          </>
        )}
      </main>

      {/* ── Bottom nav (mobile students only) ── */}
      {isMobile && !isLecturer && (
        <nav style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          height: `${BOTTOM_NAV_H}px`,
          background: "var(--bg-card)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          zIndex: 200,
          boxShadow: "0 -2px 16px rgba(0,0,0,0.08)",
        }}>
          {STUDENT_TABS.map(tab => {
            const active = activePage === tab.id;
            return (
              <button key={tab.id} onClick={() => setActivePage(tab.id)} style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "3px",
                background: "transparent", border: "none",
                borderTop: active ? "2px solid var(--brand)" : "2px solid transparent",
                color: active ? "var(--brand)" : "var(--text-muted)",
                cursor: "pointer", fontFamily: "inherit",
                padding: "6px 0",
                transition: "color .15s, border-color .15s",
              }}>
                <span style={{ fontSize:"22px", lineHeight:1 }}>{tab.emoji}</span>
                <span style={{ fontSize:"10px", fontWeight: active ? 700 : 400, letterSpacing:"0.01em" }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
