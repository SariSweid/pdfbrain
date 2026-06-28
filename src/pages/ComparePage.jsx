import { useState } from "react";
import useCompare from "../features/compare/useCompare";
import { exportComparisonToWord, exportComparisonToPdf } from "../lib/exportUtils";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

// ─────────────────────────────────────────────────────────────────────────────
// ComparePage — lets the user pick two uploaded PDFs and compare them via AI
// ─────────────────────────────────────────────────────────────────────────────
function ComparePage() {
  const {
    documents,
    firstDocumentId,
    secondDocumentId,
    setFirstDocumentId,
    setSecondDocumentId,
    comparison,
    loading,
    error,
    runComparison,
  } = useCompare();

  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { isMobile, isCompact } = useResponsiveLayout();

  const hasEnoughDocs = documents.length >= 2;
  const bothSelected =
    firstDocumentId && secondDocumentId && firstDocumentId !== secondDocumentId;
  const canRun = hasEnoughDocs && bothSelected && !loading;

  return (
    // Full-height scrollable container — parent (main) has overflow:hidden
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background: "var(--bg-page)",
        padding: isMobile ? "18px 12px" : isCompact ? "24px 18px" : "32px 28px",
        boxSizing: "border-box",
        direction: "rtl",
      }}
    >
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "18px" : "24px",
        }}
      >
        {/* ── Header ── */}
        <div>
          <h1
            style={{
              margin: "0 0 6px",
              fontSize: isMobile ? "20px" : "22px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            ⚖️ השוואת מאמרים
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
            בחר שני מאמרים שהועלו כדי לקבל טבלת השוואה מפורטת על תחום המחקר,
            שיטת המחקר, הממצאים והמגבלות.
          </p>
        </div>

        {/* ── Not enough docs warning ── */}
        {!hasEnoughDocs && (
          <div
            style={{
              background: "#fefce8",
              border: "1px solid #fde047",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
              fontSize: "14px",
              color: "#854d0e",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
            <span>
              יש להעלות לפחות שני מאמרים בעמוד הצ׳אט לפני שניתן להשוות.
              {documents.length === 1 && " (מאמר אחד הועלה עד כה)"}
              {documents.length === 0 && " (טרם הועלו מאמרים)"}
            </span>
          </div>
        )}

        {/* ── Document selectors ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: "16px",
          }}
        >
          {[
            {
              label: "מאמר ראשון",
              value: firstDocumentId,
              set: setFirstDocumentId,
              other: secondDocumentId,
              color: "#6366f1",
            },
            {
              label: "מאמר שני",
              value: secondDocumentId,
              set: setSecondDocumentId,
              other: firstDocumentId,
              color: "#8b5cf6",
            },
          ].map(({ label, value, set, other, color }) => (
            <div
              key={label}
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${value ? color + "55" : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
                padding: "16px 18px",
                transition: "border-color 0.2s",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </p>
              <select
                value={value}
                onChange={(e) => {
                  set(e.target.value);
                }}
                disabled={!hasEnoughDocs || loading}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  fontSize: "14px",
                  background: "var(--bg-input)",
                  color: value ? "var(--text-primary)" : "var(--text-muted)",
                  cursor:
                    !hasEnoughDocs || loading ? "not-allowed" : "pointer",
                  direction: "rtl",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              >
                <option value="">— בחר מאמר —</option>
                {documents.map((doc) => (
                  <option
                    key={doc.id}
                    value={doc.id}
                    disabled={doc.id === other}
                  >
                    {doc.title}
                    {doc.id === other ? " (נבחר כבר)" : ""}
                  </option>
                ))}
              </select>

              {/* Show selected doc date */}
              {value && (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                  }}
                >
                  {documents.find((d) => d.id === value)?.date ?? ""}
                  {documents.find((d) => d.id === value)?.pageCount
                    ? ` · ${documents.find((d) => d.id === value).pageCount} עמ׳`
                    : ""}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── Validation hints ── */}
        {hasEnoughDocs && firstDocumentId && secondDocumentId && firstDocumentId === secondDocumentId && (
          <p style={{ margin: 0, fontSize: "13px", color: "#ef4444" }}>
            ⚠️ יש לבחור שני מאמרים שונים.
          </p>
        )}
        {error && (
          <p style={{ margin: 0, fontSize: "13px", color: "#ef4444" }}>
            ❌ {error}
          </p>
        )}

        {/* ── Compare button ── */}
        <div>
          <button
            onClick={runComparison}
            disabled={!canRun}
            style={{
              background: canRun ? "var(--brand)" : "var(--text-muted)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "12px 28px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: canRun ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: canRun ? "var(--shadow-sm)" : "none",
              transition: "background 0.15s, box-shadow 0.15s",
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: "15px",
                    height: "15px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "cpspin 0.7s linear infinite",
                    flexShrink: 0,
                  }}
                />
                משווה בין המאמרים...
              </>
            ) : (
              "⚖️ בצע השוואה"
            )}
          </button>
        </div>

        {/* ── Results ── */}
        {comparison && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Export row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isMobile ? "flex-start" : "space-between",
                flexDirection: isMobile ? "column" : "row",
                gap: "10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                {comparison.rows?.length ?? 0} קריטריוני השוואה
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap:"wrap" }}>
                <button
                  onClick={async () => {
                    setExportingWord(true);
                    try {
                      await exportComparisonToWord(comparison);
                    } catch (e) {
                      alert(`ייצוא נכשל: ${e.message}`);
                    }
                    setExportingWord(false);
                  }}
                  style={exportBtnStyle}
                >
                  {exportingWord ? "..." : "📄 ייצוא ל-Word"}
                </button>
                <button
                  onClick={async () => {
                    setExportingPdf(true);
                    try {
                      await exportComparisonToPdf(comparison);
                    } catch (e) {
                      alert(`ייצוא נכשל: ${e.message}`);
                    }
                    setExportingPdf(false);
                  }}
                  style={exportBtnStyle}
                >
                  {exportingPdf ? "..." : "📄 ייצוא ל-PDF"}
                </button>
              </div>
            </div>

            {/* Table */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                overflowX: "auto",
                overflowY: "hidden",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "130px minmax(220px,1fr) minmax(220px,1fr)" : "170px 1fr 1fr",
                  minWidth: isCompact ? "570px" : "auto",
                  background: "var(--brand)",
                }}
              >
                {[
                  "קריטריון",
                  comparison.firstPaperTitle,
                  comparison.secondPaperTitle,
                ].map((h, i) => (
                  <div
                    key={i}
                    title={h}
                    style={{
                      padding: "13px 16px",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#fff",
                      direction: "rtl",
                      textAlign: "right",
                      borderLeft:
                        i < 2 ? "1px solid rgba(255,255,255,0.18)" : "none",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {(comparison.rows ?? []).map((row, idx) => (
                <div
                  key={row.topic + idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "130px minmax(220px,1fr) minmax(220px,1fr)" : "170px 1fr 1fr",
                    minWidth: isCompact ? "570px" : "auto",
                    borderTop: "1px solid var(--border)",
                    background:
                      idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-page)",
                  }}
                >
                  {/* Topic */}
                  <div
                    style={{
                      padding: "14px 16px",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "var(--brand)",
                      direction: "rtl",
                      textAlign: "right",
                      borderLeft: "1px solid var(--border)",
                    }}
                  >
                    {row.topic}
                  </div>

                  {/* First paper */}
                  <div
                    style={{
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      direction: "rtl",
                      textAlign: "right",
                      lineHeight: 1.65,
                      borderLeft: "1px solid var(--border)",
                    }}
                  >
                    {row.firstPaper}
                  </div>

                  {/* Second paper */}
                  <div
                    style={{
                      padding: "14px 16px",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      direction: "rtl",
                      textAlign: "right",
                      lineHeight: 1.65,
                    }}
                  >
                    {row.secondPaper}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding so last row isn't flush against viewport edge */}
        <div style={{ height: "32px" }} />
      </div>

      <style>{`
        @keyframes cpspin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const exportBtnStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  padding: "7px 14px",
  fontSize: "13px",
  fontWeight: 600,
  fontFamily: "inherit",
};

export default ComparePage;
