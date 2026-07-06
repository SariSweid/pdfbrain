import { useEffect, useState } from "react";
import { getHistory } from "../lib/localStore";

const TYPE_CONFIG = {
  upload:  { icon: "📤", label: "העלאת מאמר",     color: "#6366f1" },
  chat:    { icon: "💬", label: "שיחה חינוכית",    color: "#8b5cf6" },
  grade:   { icon: "🏁", label: "ציון",             color: "#f59e0b" },
  compare: { icon: "⚖️", label: "השוואת מאמרים",  color: "#06b6d4" },
};

function ScoreBadge({ score }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"44px", height:"44px", borderRadius:"50%", background:color, color:"#fff", fontSize:"14px", fontWeight:800, flexShrink:0 }}>
      {score}
    </div>
  );
}

function HistoryPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Load fresh every time this component mounts
  // (MainLayout conditionally renders HistoryPage so it remounts each visit)
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getHistory();
        setItems(data);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ height:"100%", overflowY:"auto", background:"var(--bg-page)", padding:"32px 28px", boxSizing:"border-box", direction:"rtl" }}>
      <div style={{ maxWidth:"760px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"20px" }}>

        {/* Header */}
        <div>
          <h1 style={{ margin:"0 0 6px", fontSize:"22px", fontWeight:700, color:"var(--text-primary)" }}>
            🕘 היסטוריית פעילות
          </h1>
          <p style={{ margin:0, fontSize:"14px", color:"var(--text-muted)" }}>
            כל הפעולות שבוצעו — העלאות, שיחות, השוואות וציונים
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", color:"var(--text-muted)", fontSize:"14px" }}>
            <div style={{ width:"16px", height:"16px", border:"2px solid var(--border)", borderTopColor:"var(--brand)", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
            טוען היסטוריה...
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text-muted)" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>📭</div>
            <p style={{ margin:0, fontSize:"15px", color:"var(--text-secondary)" }}>אין פעילות עדיין</p>
            <p style={{ margin:"6px 0 0", fontSize:"13px" }}>העלה מאמר, נהל שיחה, או בצע השוואה כדי לראות פעולות כאן</p>
          </div>
        )}

        {/* Items list */}
        {!loading && items.map((item) => {
          const cfg = TYPE_CONFIG[item.type] ?? { icon:"📌", label: item.label ?? item.type, color:"#9ca3af" };
          return (
            <div key={item.id}
              style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"16px 18px", display:"flex", alignItems:"center", gap:"14px", boxShadow:"var(--shadow-sm)" }}>

              {/* Score circle for grade items, icon otherwise */}
              {item.type === "grade" && typeof item.score === "number"
                ? <ScoreBadge score={item.score} />
                : (
                  <div style={{ width:"40px", height:"40px", borderRadius:"10px", background: cfg.color + "18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", flexShrink:0 }}>
                    {cfg.icon}
                  </div>
                )
              }

              {/* Main content */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontWeight:600, fontSize:"14px", color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {item.title}
                </p>

                {/* Compare subtitle */}
                {item.type === "compare" && item.subtitle && (
                  <p style={{ margin:"3px 0 0", fontSize:"12px", color:"var(--text-muted)" }}>
                    {item.subtitle.first} <span style={{ color:"var(--brand)" }}>⚖️</span> {item.subtitle.second}
                  </p>
                )}

                <p style={{ margin:"4px 0 0", fontSize:"12px", color:"var(--text-muted)" }}>
                  📅 {item.date}
                </p>
              </div>

              {/* Type badge */}
              <span style={{ flexShrink:0, fontSize:"12px", fontWeight:600, color:cfg.color, background: cfg.color + "18", border:`1px solid ${cfg.color}33`, borderRadius:"20px", padding:"4px 12px", whiteSpace:"nowrap" }}>
                {cfg.label}
              </span>
            </div>
          );
        })}

        <div style={{ height:"16px" }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default HistoryPage;
