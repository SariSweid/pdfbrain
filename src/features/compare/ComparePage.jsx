import { useState } from "react";
import useCompare from "../features/compare/useCompare";
import { exportComparisonToWord, exportComparisonToPdf } from "../lib/exportUtils";

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

  const hasEnoughDocs = documents.length >= 2;
  const canRun =
    hasEnoughDocs &&
    firstDocumentId &&
    secondDocumentId &&
    firstDocumentId !== secondDocumentId &&
    !loading;

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background: "var(--bg-page)",
        padding: "32px 28px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
            ⚖️ השוואת מאמרים
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
            בחר שני מאמרים שהועלו כדי לקבל טבלת השוואה מסודרת על תחום המחקר, שיטת המחקר, הממצאים והמגבלות.
          </p>
        </div>

        {/* Warning */}
        {!hasEnoughDocs && (
          <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: "8px", padding: "12px 16px", fontSize: "14px", color: "#854d0e" }}>
            ⚠️ יש להעלות לפחות שני מאמרים בעמוד הצ׳אט לפני שניתן להשוות.
          </div>
        )}

        {/* Selectors row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {[
            { label: "מאמר ראשון", value: firstDocumentId, set: setFirstDocumentId, other: secondDocumentId },
            { label: "מאמר שני",  value: secondDocumentId, set: setSecondDocumentId, other: firstDocumentId },
          ].map(({ label, value, set, other }) => (
            <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </p>
              <select
                value={value}
                onChange={(e) => set(e.target.value)}
                disabled={!hasEnoughDocs || loading}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "9px 12px",
                  fontSize: "14px",
                  background: "var(--bg-input)",
                  color: value ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: hasEnoughDocs && !loading ? "pointer" : "not-allowed",
                  direction: "rtl",
                  outline: "none",
                }}
              >
                <option value="">— בחר מאמר —</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id} disabled={doc.id === other}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <p style={{ margin: 0, fontSize: "13px", color: "#ef4444" }}>{error}</p>
        )}

        {/* Run button */}
        <div>
          <button
            onClick={runComparison}
            disabled={!canRun}
            style={{
              background: canRun ? "var(--brand)" : "var(--text-muted)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "11px 26px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: canRun ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "background 0.15s",
            }}
          >
            {loading ? (
              <>
                <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "cpspin 0.7s linear infinite" }} />
                משווה...
              </>
            ) : "⚖️ בצע השוואה"}
          </button>
        </div>

        {/* Results */}
        {comparison && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Export */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={async () => { setExportingWord(true); try { await exportComparisonToWord(comparison); } catch (e) { alert(e.message); } setExportingWord(false); }}
                style={exportBtnStyle}
              >
                {exportingWord ? "..." : "📄 Word"}
              </button>
              <button
                onClick={async () => { setExportingPdf(true); try { await exportComparisonToPdf(comparison); } catch (e) { alert(e.message); } setExportingPdf(false); }}
                style={exportBtnStyle}
              >
                {exportingPdf ? "..." : "📄 PDF"}
              </button>
            </div>

            {/* Table */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", background: "var(--brand)" }}>
                {["נושא", comparison.firstPaperTitle, comparison.secondPaperTitle].map((h, i) => (
                  <div
                    key={i}
                    title={h}
                    style={{
                      padding: "13px 14px",
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#fff",
                      direction: "rtl",
                      textAlign: "right",
                      borderLeft: i < 2 ? "1px solid rgba(255,255,255,0.18)" : "none",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {comparison.rows.map((row, idx) => (
                <div
                  key={row.topic + idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 1fr 1fr",
                    borderTop: "1px solid var(--border)",
                    background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-page)",
                  }}
                >
                  <div style={{ padding: "13px 14px", fontWeight: 700, fontSize: "13px", color: "var(--brand)", direction: "rtl", textAlign: "right", borderLeft: "1px solid var(--border)" }}>
                    {row.topic}
                  </div>
                  <div style={{ padding: "13px 14px", fontSize: "13px", color: "var(--text-secondary)", direction: "rtl", textAlign: "right", lineHeight: 1.6, borderLeft: "1px solid var(--border)" }}>
                    {row.firstPaper}
                  </div>
                  <div style={{ padding: "13px 14px", fontSize: "13px", color: "var(--text-secondary)", direction: "rtl", textAlign: "right", lineHeight: 1.6 }}>
                    {row.secondPaper}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes cpspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const exportBtnStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  padding: "7px 14px",
  fontSize: "13px",
  fontWeight: 600,
};

export default ComparePage;