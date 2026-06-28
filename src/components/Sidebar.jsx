function Sidebar({ documents, selectedDocumentId, onSelectDocument, onUpload, uploadError, uploading, compact = false, mobile = false }) {
  return (
    <aside style={{
      width:      compact ? "100%" : "260px",
      height:     compact ? "auto" : "100%",
      maxHeight:  compact ? (mobile ? "170px" : "200px") : "none",
      flexShrink: 0,
      background: "var(--bg-sidebar)",
      borderLeft:   compact ? "none"                  : "1px solid var(--border)",
      borderBottom: compact ? "1px solid var(--border)" : "none",
      display:      "flex",
      flexDirection: compact ? "row" : "column",
      overflow:     "hidden",
    }}>

      {/* ── Upload button ── */}
      <div style={{
        padding:    compact ? (mobile ? "8px" : "10px") : "16px",
        borderBottom: compact ? "none" : "1px solid var(--border)",
        borderLeft:   compact ? "1px solid var(--border)" : "none",
        width:      compact ? (mobile ? "130px" : "170px") : "auto",
        flexShrink: 0,
        display:    "flex",
        flexDirection: "column",
        gap:        "6px",
        justifyContent: "center",
      }}>
        <label style={{
          display:  "flex", alignItems:"center", justifyContent:"center", gap:"5px",
          width:    "100%",
          padding:  mobile ? "12px 8px" : "10px",
          background: uploading ? "var(--text-muted)" : "var(--brand)",
          color:    "#fff",
          borderRadius: "var(--radius-sm)",
          fontWeight: 700,
          fontSize: mobile ? "13px" : "14px",
          textAlign: "center",
          cursor:   uploading ? "not-allowed" : "pointer",
          opacity:  uploading ? 0.75 : 1,
          userSelect: "none",
          minHeight: mobile ? "44px" : "auto",  /* touch target */
        }}>
          {uploading ? (
            <>
              <span style={{ display:"inline-block", width:"13px", height:"13px", border:"2px solid rgba(255,255,255,.35)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }} />
              {!mobile && " מעבד..."}
              {mobile && "⏳"}
            </>
          ) : (
            mobile ? "＋ PDF" : "+ העלאת PDF"
          )}
          <input type="file" accept=".pdf" disabled={uploading} style={{ display:"none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f && !uploading) onUpload?.(f); e.target.value=""; }} />
        </label>

        {uploadError && (
          <p style={{ margin:0, fontSize:"11px", color:"#ef4444", textAlign:"center", lineHeight:1.3 }}>
            {uploadError}
          </p>
        )}
      </div>

      {/* ── Document list ── */}
      <div style={{
        flex:       1,
        overflowY:  compact ? "hidden" : "auto",
        overflowX:  compact ? "auto"   : "hidden",
        display:    compact ? "flex"   : "block",
        minWidth:   0,
        // Hide scrollbar on mobile for cleaner look, but still scrollable
        scrollbarWidth: mobile ? "none" : "auto",
      }}>
        {documents.length === 0 ? (
          <p style={{
            padding: compact ? (mobile ? "12px 10px" : "16px 14px") : "24px 16px",
            color: "var(--text-muted)", fontSize:"12px", textAlign:"center",
            minWidth: compact ? "140px" : "auto",
          }}>
            {mobile ? "אין PDF" : "אין מסמכים עדיין.\nהעלה PDF כדי להתחיל."}
          </p>
        ) : (
          documents.map(doc => {
            const isSelected = doc.id === selectedDocumentId;
            return (
              <div key={doc.id} onClick={() => !uploading && onSelectDocument?.(doc.id)} style={{
                padding:    compact ? (mobile ? "8px 10px" : "10px 12px") : "12px 16px",
                borderBottom: compact ? "none" : "1px solid var(--border)",
                borderLeft:   compact ? "1px solid var(--border)" : "none",
                borderTop:    compact ? (isSelected ? "2px solid var(--brand)" : "2px solid transparent") : "none",
                borderRight:  compact ? "none" : (isSelected ? "3px solid var(--brand)" : "3px solid transparent"),
                cursor:       uploading ? "default" : "pointer",
                display:      "flex", alignItems:"center", gap:"8px",
                background:   isSelected ? "var(--brand-light)" : "transparent",
                opacity:      uploading ? 0.5 : 1,
                minWidth:     compact ? (mobile ? "120px" : "180px") : "auto",
                maxWidth:     compact ? (mobile ? "150px" : "220px") : "none",
                transition:   "background .15s",
                userSelect:   "none",
                minHeight:    mobile ? "52px" : "auto",  /* touch target */
              }}>
                <span style={{ fontSize: mobile ? "18px" : "20px", flexShrink:0 }}>📄</span>
                <div style={{ overflow:"hidden", minWidth:0 }}>
                  <p style={{
                    margin:0, fontWeight:600,
                    fontSize: mobile ? "12px" : "13px",
                    color: isSelected ? "var(--brand)" : "var(--text-primary)",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>
                    {doc.title}
                  </p>
                  {!mobile && (
                    <p style={{ margin:0, fontSize:"11px", color:"var(--text-muted)" }}>{doc.date}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </aside>
  );
}

export default Sidebar;
