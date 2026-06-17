function ChatInput({ inputValue, setInputValue, onSendMessage, loading, disabled }) {
  const isDisabled = loading || disabled;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
      <form onSubmit={onSendMessage} className="max-w-4xl mx-auto flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isDisabled}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          placeholder={disabled ? "בחר או העלה מאמר כדי לשאול עליו..." : "שאל שאלה על המאמר..."}
        />

        <button
          type="submit"
          disabled={isDisabled}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "חושב..." : "שלח 🚀"}
        </button>
      </form>
    </div>
  );
}

export default ChatInput;
