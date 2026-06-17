import Sidebar from "./Sidebar";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import DocumentAnalysisPanel from "./DocumentAnalysisPanel";
import useChat from "./useChat";

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
  } = useChat();

  return (
    <div className="flex h-full">
      <Sidebar
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={handleSelectDocument}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={handleDeleteDocument}
        uploadError={uploadError}
      />

      <section className="w-3/4 flex flex-col bg-slate-50 relative overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
          <DocumentAnalysisPanel document={selectedDocument} />

          {selectedDocument && messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              שאל שאלה חופשית על "{selectedDocument.title}" כדי להתחיל שיחה.
            </p>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {loading && (
            <p className="text-sm text-gray-500">PDFBrain חושב...</p>
          )}
        </div>

        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSendMessage={handleSendMessage}
          loading={loading}
          disabled={!selectedDocument}
        />
      </section>
    </div>
  );
}

export default ChatPage;
