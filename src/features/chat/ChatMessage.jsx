function ChatMessage({ message }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-lg p-4 rounded-2xl shadow-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-none"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

export default ChatMessage;
