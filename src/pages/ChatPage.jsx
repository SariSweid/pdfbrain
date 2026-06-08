import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import useChat from "../hooks/useChat";

function ChatPage() {
  const {
    documents,
    messages,
    inputValue,
    setInputValue,
    handleSendMessage,
    loading,
  } = useChat();

  return (
    <div className="flex h-full">
      <Sidebar documents={documents} />

      <section className="w-3/4 flex flex-col bg-slate-50 relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {loading && (
            <p className="text-sm text-gray-500">PDFBrain is thinking...</p>
          )}
        </div>

        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSendMessage={handleSendMessage}
          loading={loading}
        />
      </section>
    </div>
  );
}

export default ChatPage;
