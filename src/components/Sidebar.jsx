function Sidebar({ documents, selectedDocumentId, onSelectDocument, onUpload, uploadError, uploading }) {
  return (
    <aside
      style={{
        width: "260px",
        flexShrink: 0,
        background: "var(--bg-sidebar)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Upload button */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
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
            fontSize: "14px",
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
      <div style={{ flex: 1, overflowY: "auto" }}>
        {documents.length === 0 ? (
          <p
            style={{
              padding: "24px 16px",
              color: "var(--text-muted)",
              fontSize: "13px",
              textAlign: "center",
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
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  cursor: uploading ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: isSelected ? "var(--brand-light)" : "transparent",
                  borderRight: isSelected ? "3px solid var(--brand)" : "3px solid transparent",
                  opacity: uploading ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <span style={{ fontSize: "20px" }}>📄</span>
                <div style={{ overflow: "hidden" }}>
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
