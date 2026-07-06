import { useState, useEffect } from "react";
import useCompare from "../features/compare/useCompare";
import { exportComparisonToWord, exportComparisonToPdf } from "../lib/exportUtils";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { getComparisons } from "../lib/localStore";

function ComparePage() {
  const {
    documents, firstDocumentId, secondDocumentId,
    setFirstDocumentId, setSecondDocumentId,
    comparison, loading, error, runComparison,
  } = useCompare();

  const [exportingWord,   setExportingWord]   = useState(false);
  const [exportingPdf,    setExportingPdf]    = useState(false);
  const [pastComparisons, setPastComparisons] = useState([]);
  const [selected,        setSelected]        = useState(null);
  const { isMobile, isCompact } = useResponsiveLayout();

  useEffect(() => {
    getComparisons().then(list => setPastComparisons((list ?? []).slice(0, 10))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!comparison) return;
    setPastComparisons(prev => [comparison, ...prev.filter(c => c.id !== comparison.id)].slice(0, 10));
    setSelected(null);
  }, [comparison]);

  const displayed     = selected ?? comparison;
  const hasEnoughDocs = documents.length >= 2;
  const canRun        = hasEnoughDocs && firstDocumentId && secondDocumentId &&
                        firstDocumentId !== secondDocumentId && !loading;

  const exportBtnStyle = {
    background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)",
    color:"var(--text-secondary)", cursor:"pointer", padding:"7px 14px",
    fontSize:"12px", fontWeight:600, fontFamily:"inherit",
  };

  const trim = (s, n = 28) => s?.length > n ? s.slice(0, n) + "…" : (s ?? "");

  // ── Right sidebar: recent comparisons ──────────────────────────────────────
  const Sidebar = () => (
    <aside style={{
      width: "230px", flexShrink:0,
      display:"flex", flexDirection:"column", gap:"0",
      borderLeft: "1px solid var(--border)",
      background: "var(--bg-card)",
      height: "100%", overflowY: "auto",
    }}>
      <div style={{ padding:"14px 14px 10px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <p style={{ margin:0, fontSize:"12px", fontWeight:700, color:"var(--text-muted)",
          textTransform:"uppercase", letterSpacing:".05em" }}>השוואות אחרונות</p>
      </div>

      {pastComparisons.length === 0 && (
        <div style={{ padding:"24px 14px", textAlign:"center" }}>
          <p style={{ margin:0, fontSize:"28px" }}>⚖️</p>
          <p style={{ margin:"8px 0 0", fontSize:"12px", color:"var(--text-muted)", lineHeight:1.5 }}>
            לא בוצעו השוואות עדיין
          </p>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:"0", flex:1 }}>
        {pastComparisons.map((c, idx) => {
          const isActive = selected?.id === c.id || (!selected && comparison?.id === c.id);
          return (
            <button key={c.id} onClick={() => setSelected(c.id === selected?.id ? null : c)}
              style={{
                display:"flex", flexDirection:"column", gap:"0",
                padding:"0", cursor:"pointer", fontFamily:"inherit", textAlign:"right",
                background: isActive ? "var(--brand-light)" : "transparent",
                border:"none",
                borderBottom:"1px solid var(--border)",
                borderLeft: isActive ? "3px solid var(--brand)" : "3px solid transparent",
                transition:"background .12s, border-color .12s", width:"100%",
              }}
              onMouseEnter={e => { if(!isActive) e.currentTarget.style.background="var(--bg-page)"; }}
              onMouseLeave={e => { if(!isActive) e.currentTarget.style.background="transparent"; }}>

              {/* Paper 1 */}
              <div style={{ padding:"10px 12px 5px", width:"100%", boxSizing:"border-box" }}>
                <p style={{ margin:0, fontSize:"10px", fontWeight:700, color: isActive ? "var(--brand)" : "var(--text-muted)",
                  textTransform:"uppercase", letterSpacing:".04em" }}>מאמר א</p>
                <p style={{ margin:"2px 0 0", fontSize:"12px", fontWeight:600,
                  color: isActive ? "var(--brand)" : "var(--text-primary)",
                  lineHeight:1.35, direction:"rtl", textAlign:"right" }}>
                  {trim(c.firstPaperTitle, 24)}
                </p>
              </div>

              {/* VS divider */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                padding:"3px 0", background: isActive ? "var(--brand)" + "22" : "var(--bg-page)",
                borderTop:"1px dashed var(--border)", borderBottom:"1px dashed var(--border)" }}>
                <span style={{ fontSize:"9px", fontWeight:800, letterSpacing:".12em",
                  color: isActive ? "var(--brand)" : "var(--text-muted)" }}>VS</span>
              </div>

              {/* Paper 2 */}
              <div style={{ padding:"5px 12px 8px", width:"100%", boxSizing:"border-box" }}>
                <p style={{ margin:0, fontSize:"10px", fontWeight:700, color: isActive ? "var(--brand)" : "var(--text-muted)",
                  textTransform:"uppercase", letterSpacing:".04em" }}>מאמר ב</p>
                <p style={{ margin:"2px 0 0", fontSize:"12px", fontWeight:600,
                  color: isActive ? "var(--brand)" : "var(--text-primary)",
                  lineHeight:1.35, direction:"rtl", textAlign:"right" }}>
                  {trim(c.secondPaperTitle, 24)}
                </p>
              </div>

              {/* Date */}
              <div style={{ padding:"4px 12px 8px" }}>
                <span style={{ fontSize:"10px", color:"var(--text-muted)" }}>📅 {c.date}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );

  // ── Main comparison area ───────────────────────────────────────────────────
  const Main = () => (
    <div style={{ flex:1, overflowY:"auto", background:"var(--bg-page)",
      padding: isMobile ? "18px 12px" : "32px 28px",
      boxSizing:"border-box", direction:"rtl" }}>
      <div style={{ maxWidth:"720px", margin:"0 auto", display:"flex",
        flexDirection:"column", gap: isMobile ? "18px" : "24px" }}>

        {/* Header */}
        <div>
          <h1 style={{ margin:"0 0 6px", fontSize: isMobile ? "20px" : "22px",
            fontWeight:700, color:"var(--text-primary)" }}>⚖️ השוואת מאמרים</h1>
          <p style={{ margin:0, fontSize:"14px", color:"var(--text-muted)" }}>
            בחר שני מאמרים שהועלו כדי לקבל טבלת השוואה מפורטת.
          </p>
        </div>

        {/* Viewing past — back button */}
        {selected && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px",
            background:"var(--brand-light)", border:"1px solid var(--border)",
            borderRadius:"var(--radius-md)", padding:"12px 16px" }}>
            <span style={{ fontSize:"16px" }}>📋</span>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontWeight:700, fontSize:"14px", color:"var(--brand)" }}>
                {trim(selected.firstPaperTitle, 30)} vs {trim(selected.secondPaperTitle, 30)}
              </p>
              <p style={{ margin:"2px 0 0", fontSize:"12px", color:"var(--text-muted)" }}>📅 {selected.date}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background:"var(--brand)",
              border:"none", borderRadius:"var(--radius-sm)", color:"#fff",
              padding:"6px 14px", fontSize:"12px", fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
              + השוואה חדשה
            </button>
          </div>
        )}

        {/* Run new comparison */}
        {!selected && (
          <>
            {!hasEnoughDocs && (
              <div style={{ background:"#fefce8", border:"1px solid #fde047",
                borderRadius:"var(--radius-md)", padding:"14px 18px",
                fontSize:"14px", color:"#854d0e", display:"flex", gap:"10px" }}>
                <span style={{ fontSize:"18px", flexShrink:0 }}>⚠️</span>
                <span>יש להעלות לפחות שני מאמרים בעמוד הצ׳אט לפני שניתן להשוות.
                  {documents.length === 1 && " (מאמר אחד הועלה עד כה)"}
                  {documents.length === 0 && " (טרם הועלו מאמרים)"}
                </span>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap:"16px" }}>
              {[
                { label:"מאמר ראשון", value:firstDocumentId, set:setFirstDocumentId, other:secondDocumentId, color:"#6366f1" },
                { label:"מאמר שני",  value:secondDocumentId, set:setSecondDocumentId, other:firstDocumentId, color:"#8b5cf6" },
              ].map(({ label, value, set, other, color }) => (
                <div key={label} style={{ background:"var(--bg-card)",
                  border:`1px solid ${value ? color+"55" : "var(--border)"}`,
                  borderRadius:"var(--radius-md)", padding:"16px 18px" }}>
                  <p style={{ margin:"0 0 10px", fontSize:"12px", fontWeight:700,
                    color, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
                  <select value={value} onChange={e => set(e.target.value)}
                    disabled={!hasEnoughDocs || loading}
                    style={{ width:"100%", border:"1px solid var(--border)",
                      borderRadius:"var(--radius-sm)", padding:"10px 12px",
                      background:"var(--bg-input)", color:"var(--text-primary)",
                      fontSize:"14px", cursor:!hasEnoughDocs||loading?"not-allowed":"pointer",
                      outline:"none", fontFamily:"inherit" }}>
                    <option value="">— בחר מאמר —</option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id} disabled={doc.id === other}>
                        {doc.title}{doc.id === other ? " (נבחר כבר)" : ""}
                      </option>
                    ))}
                  </select>
                  {value && (
                    <p style={{ margin:"8px 0 0", fontSize:"11px", color:"var(--text-muted)" }}>
                      {documents.find(d => d.id === value)?.date ?? ""}
                      {documents.find(d => d.id === value)?.pageCount
                        ? ` · ${documents.find(d => d.id === value).pageCount} עמ׳` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {error && <p style={{ margin:0, fontSize:"13px", color:"#ef4444" }}>❌ {error}</p>}

            <button onClick={runComparison} disabled={!canRun} style={{
              alignSelf:"center",
              background: canRun ? "linear-gradient(135deg,var(--brand),#8b5cf6)" : "var(--text-muted)",
              color:"#fff", border:"none", borderRadius:"var(--radius-md)",
              padding:"12px 32px", fontWeight:700, fontSize:"15px",
              cursor: canRun ? "pointer" : "not-allowed", fontFamily:"inherit",
              display:"flex", gap:"10px", alignItems:"center",
              boxShadow: canRun ? "var(--shadow-sm)" : "none" }}>
              {loading ? (
                <>
                  <span style={{ width:"15px", height:"15px", border:"2px solid rgba(255,255,255,0.3)",
                    borderTopColor:"#fff", borderRadius:"50%", display:"inline-block",
                    animation:"cpspin 0.7s linear infinite", flexShrink:0 }} />
                  משווה בין המאמרים...
                </>
              ) : "⚖️ בצע השוואה"}
            </button>
          </>
        )}

        {/* Results table */}
        {displayed && (
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <div style={{ display:"flex", alignItems:"center",
              justifyContent: isMobile ? "flex-start" : "space-between",
              flexWrap:"wrap", gap:"10px" }}>
              <p style={{ margin:0, fontSize:"13px", color:"var(--text-muted)" }}>
                {displayed.rows?.length ?? 0} קריטריוני השוואה
              </p>
              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={async () => { setExportingWord(true); try { await exportComparisonToWord(displayed); } catch(e) { alert(e.message); } setExportingWord(false); }} style={exportBtnStyle}>
                  {exportingWord ? "..." : "📄 ייצוא ל-Word"}
                </button>
                <button onClick={async () => { setExportingPdf(true); try { await exportComparisonToPdf(displayed); } catch(e) { alert(e.message); } setExportingPdf(false); }} style={exportBtnStyle}>
                  {exportingPdf ? "..." : "📄 ייצוא ל-PDF"}
                </button>
              </div>
            </div>

            <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
              borderRadius:"var(--radius-md)", overflowX:"auto", boxShadow:"var(--shadow-sm)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr",
                minWidth:"520px", background:"var(--brand)" }}>
                {["קריטריון", displayed.firstPaperTitle, displayed.secondPaperTitle].map((h, i) => (
                  <div key={i} style={{ padding:"13px 16px", fontSize:"13px", fontWeight:700,
                    color:"#fff", direction:"rtl", textAlign:"right",
                    borderLeft: i < 2 ? "1px solid rgba(255,255,255,0.18)" : "none",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {h}
                  </div>
                ))}
              </div>
              {(displayed.rows ?? []).map((row, idx) => (
                <div key={idx} style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr",
                  minWidth:"520px",
                  background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-page)",
                  borderTop:"1px solid var(--border)" }}>
                  <div style={{ padding:"14px 16px", fontWeight:700, fontSize:"13px",
                    color:"var(--brand)", direction:"rtl", textAlign:"right",
                    borderLeft:"1px solid var(--border)" }}>{row.topic}</div>
                  <div style={{ padding:"14px 16px", fontSize:"13px", color:"var(--text-secondary)",
                    direction:"rtl", textAlign:"right", lineHeight:1.65,
                    borderLeft:"1px solid var(--border)" }}>{row.firstPaper}</div>
                  <div style={{ padding:"14px 16px", fontSize:"13px", color:"var(--text-secondary)",
                    direction:"rtl", textAlign:"right", lineHeight:1.65 }}>{row.secondPaper}</div>
                </div>
              ))}
            </div>
            <div style={{ height:"24px" }}/>
          </div>
        )}
      </div>
      <style>{`@keyframes cpspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Layout: sidebar right + main left ─────────────────────────────────────
  if (isMobile) {
    // On mobile: stack vertically, recent at top (compact)
    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {pastComparisons.length > 0 && (
          <div style={{ flexShrink:0, borderBottom:"1px solid var(--border)",
            background:"var(--bg-card)", padding:"10px 12px" }}>
            <p style={{ margin:"0 0 8px", fontSize:"11px", fontWeight:700, color:"var(--text-muted)",
              textTransform:"uppercase", letterSpacing:".05em" }}>השוואות אחרונות</p>
            <div style={{ display:"flex", gap:"8px", overflowX:"auto", scrollbarWidth:"none", paddingBottom:"2px" }}>
              {pastComparisons.map(c => {
                const isActive = selected?.id === c.id || (!selected && comparison?.id === c.id);
                return (
                  <button key={c.id} onClick={() => setSelected(c.id === selected?.id ? null : c)}
                    style={{ flexShrink:0, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit",
                      background: isActive ? "var(--brand-light)" : "var(--bg-page)",
                      border:`1.5px solid ${isActive ? "var(--brand)" : "var(--border)"}`,
                      borderRadius:"var(--radius-sm)", fontSize:"12px", fontWeight:600,
                      color: isActive ? "var(--brand)" : "var(--text-primary)" }}>
                    {trim(c.firstPaperTitle, 14)} vs {trim(c.secondPaperTitle, 14)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ flex:1, overflow:"hidden" }}><Main/></div>
      </div>
    );
  }

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"row", overflow:"hidden" }}>
      <Sidebar/>
      <Main/>
    </div>
  );
}

export default ComparePage;
