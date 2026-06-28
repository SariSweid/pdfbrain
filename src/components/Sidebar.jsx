function Sidebar({ documents, selectedDocumentId, onSelectDocument, onUpload, uploadError, uploading, compact = false, mobile = false }) {
  return (
    <aside
      style={{
        width: compact ? "100%" : "260px",
        height: compact ? "auto" : "100%",
        maxHeight: compact ? (mobile ? "178px" : "210px") : "none",
        flexShrink: 0,
        background: "var(--bg-sidebar)",
        borderLeft: compact ? "none" : "1px solid var(--border)",
        borderBottom: compact ? "1px solid var(--border)" : "none",
        display: "flex",
        flexDirection: compact ? "row" : "column",
        overflow: "hidden",
      }}
    >
      {/* Upload button */}
      <div style={{ padding: compact ? "10px" : "16px", borderBottom: compact ? "none" : "1px solid var(--border)", borderLeft: compact ? "1px solid var(--border)" : "none", width: compact ? (mobile ? "142px" : "180px") : "auto", flexShrink:0 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            width: "100%",
            padding: "10px",
            background: uploading ? "var(--text-muted)" : "var(--brand)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            fontWeight: 600,
            fontSize: mobile ? "12px" : "14px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            boxShadow: "var(--shadow-sm)",
            opacity: uploading ? 0.75 : 1,
            transition: "background 0.2s, opacity 0.2s",
          }}
        >
          {uploading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "14px",
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  flexShrink: 0,
                }}
              />
              מעבד...
            </>
          ) : (
            "+ העלאת PDF חדש"
          )}
          <input
            type="file"
            accept=".pdf"
            disabled={uploading}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && !uploading) onUpload?.(file);
              e.target.value = "";
            }}
          />
        </label>

        {uploadError && (
          <p
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#ef4444",
              textAlign: "center",
            }}
          >
            {uploadError}
          </p>
        )}
      </div>

      {/* Document list */}
      <div style={{ flex: 1, overflowY: compact ? "hidden" : "auto", overflowX: compact ? "auto" : "hidden", display: compact ? "flex" : "block", minWidth:0 }}>
        {documents.length === 0 ? (
          <p
            style={{
              padding: compact ? "18px 14px" : "24px 16px",
              color: "var(--text-muted)",
              fontSize: "13px",
              textAlign: "center",
              minWidth: compact ? "180px" : "auto",
            }}
          >
            אין מסמכים עדיין.
            <br />
            העלה PDF כדי להתחיל.
          </p>
        ) : (
          documents.map((doc) => {
            const isSelected = doc.id === selectedDocumentId;
            return (
              <div
                key={doc.id}
                onClick={() => !uploading && onSelectDocument?.(doc.id)}
                style={{
                  padding: compact ? "10px 12px" : "12px 16px",
                  borderBottom: compact ? "none" : "1px solid var(--border)",
                  borderLeft: compact ? "1px solid var(--border)" : "none",
                  cursor: uploading ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: isSelected ? "var(--brand-light)" : "transparent",
                  borderRight: compact ? "none" : isSelected ? "3px solid var(--brand)" : "3px solid transparent",
                  borderTop: compact ? isSelected ? "3px solid var(--brand)" : "3px solid transparent" : "none",
                  opacity: uploading ? 0.5 : 1,
                  transition: "opacity 0.2s",
                  minWidth: compact ? (mobile ? "180px" : "220px") : "auto",
                  maxWidth: compact ? (mobile ? "180px" : "260px") : "none",
                }}
              >
                <span style={{ fontSize: "20px" }}>📄</span>
                <div style={{ overflow: "hidden", minWidth:0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "13px",
                      color: isSelected ? "var(--brand)" : "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {doc.title}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
                    {doc.date}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
