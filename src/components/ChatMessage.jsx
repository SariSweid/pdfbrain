function ChatMessage({ message }) {
  const isBot = message.sender === "bot";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isBot ? "flex-start" : "flex-end",
        marginBottom: "12px",
        padding: "0 8px",
      }}
    >
      {/* Bot avatar */}
      {isBot && (
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
            marginRight: "10px",
            flexShrink: 0,
            alignSelf: "flex-end",
          }}
        >
          🧠
        </div>
      )}

      <div
        style={{
          maxWidth: "70%",
          padding: "12px 16px",
          borderRadius: isBot
            ? "var(--radius-md) var(--radius-md) var(--radius-md) 4px"
            : "var(--radius-md) var(--radius-md) 4px var(--radius-md)",
          background: isBot ? "var(--msg-bot-bg)" : "var(--msg-user-bg)",
          color: isBot ? "var(--msg-bot-text)" : "var(--msg-user-text)",
          fontSize: "14px",
          lineHeight: "1.6",
          boxShadow: "var(--shadow-sm)",
          border: isBot ? "1px solid var(--border)" : "none",
          direction: "rtl",
          textAlign: "right",
        }}
      >
        {message.text}
      </div>

      {/* User avatar */}
      {!isBot && (
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            marginLeft: "10px",
            flexShrink: 0,
            alignSelf: "flex-end",
          }}
        >
          👤
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
