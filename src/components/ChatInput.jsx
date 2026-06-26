function ChatInput({ inputValue, setInputValue, onSendMessage, loading, disabled }) {
  const isDisabled = loading || disabled;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px",
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
      }}
    >
      <form
        onSubmit={onSendMessage}
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          gap: "10px",
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isDisabled}
          placeholder={
            disabled
              ? "בחר או העלה מאמר כדי לשאול עליו..."
              : "שאל שאלה על המאמר..."
          }
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            fontSize: "14px",
            background: isDisabled ? "var(--bg-page)" : "var(--bg-input)",
            color: "var(--text-primary)",
            outline: "none",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--border-focus)";
            e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
          }}
        />

        <button
          type="submit"
          disabled={isDisabled}
          style={{
            background: isDisabled ? "var(--text-muted)" : "var(--brand)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "12px 22px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
          onMouseOver={(e) => {
            if (!isDisabled) e.target.style.background = "var(--brand-hover)";
          }}
          onMouseOut={(e) => {
            if (!isDisabled) e.target.style.background = "var(--brand)";
          }}
        >
          {loading ? "חושב..." : "שלח 🚀"}
        </button>
      </form>
    </div>
  );
}

export default ChatInput;
