import Sidebar from "./Sidebar";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { useChat } from "./useChat";

function ChatPage() {
  const {
    documents,
    selectedDocument,
    selectedDocumentId,
    handleSelectDocument,
    handleDeleteDocument,
    messages,
    inputValue,
    setInputValue,
    handleSendMessage,
    handleUploadDocument,
    loading,
    uploadError,
    analysisLoading,
    scoringLoading,
    handleScoreConversation,
    handleExport,
  } = useChat();

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <Sidebar
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={handleSelectDocument}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={handleDeleteDocument}
        uploadError={uploadError}
        analysisLoading={analysisLoading}
      />

      {/* ── Main chat area — fills all remaining width ── */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-page)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── Chat header (doc title + score button) ── */}
        {selectedDocument && (
          <div
            style={{
              padding: "12px 24px",
              background: "var(--bg-card)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
                📄 {selectedDocument.title}
              </span>
              {selectedDocument.pageCount > 0 && (
                <span
                  style={{
                    marginRight: "10px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    background: "var(--bg-page)",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                  }}
                >
                  {selectedDocument.pageCount} עמודים
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {/* Export button */}
              {messages.length > 0 && (
                <button
                  onClick={handleExport}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                    padding: "6px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  ייצוא 📥
                </button>
              )}

              {/* Score button */}
              {messages.length > 1 && (
                <button
                  onClick={handleScoreConversation}
                  disabled={scoringLoading}
                  style={{
                    background: scoringLoading ? "var(--text-muted)" : "var(--brand)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: "#fff",
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: scoringLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {scoringLoading ? "מחשב ציון..." : "קבל ציון 🎯"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Messages area ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 32px",
            paddingBottom: "90px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {/* Empty state — no document selected */}
          {!selectedDocument && !analysisLoading && (
            <div
              style={{
                margin: "auto",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "15px",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📄</div>
              העלה מאמר PDF מהסרגל כדי להתחיל
            </div>
          )}

          {/* Loading spinner while analysing uploaded PDF */}
          {analysisLoading && (
            <div
              style={{
                margin: "auto",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "14px",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>⏳</div>
              קורא ומנתח את המאמר...
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                🧠
              </div>
              <span style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
                PDFBrain חושב...
              </span>
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSendMessage={handleSendMessage}
          loading={loading || analysisLoading}
          disabled={!selectedDocument || analysisLoading}
        />
      </section>
    </div>
  );
}

export default ChatPage;
