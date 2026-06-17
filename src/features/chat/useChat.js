import { useEffect, useState } from "react";

import { fetchInitialDocuments, uploadDocument } from "./documentService";
import { fetchMessagesForDocument, sendChatMessage, generateSummary } from "./chatService";
import { deleteDocument } from "../../lib/localStore";

function useChat() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const selectedDocument =
    documents.find((doc) => doc.id === selectedDocumentId) ?? null;

  // Load documents once on mount.
  useEffect(() => {
    async function loadDocuments() {
      const loadedDocuments = await fetchInitialDocuments();
      setDocuments(loadedDocuments);

      if (loadedDocuments.length > 0) {
        setSelectedDocumentId(loadedDocuments[0].id);
      }
    }

    loadDocuments();
  }, []);

  // Load messages whenever the selected document changes.
  useEffect(() => {
    async function loadMessages() {
      if (!selectedDocumentId) {
        setMessages([]);
        return;
      }

      const loadedMessages = await fetchMessagesForDocument(selectedDocumentId);
      setMessages(loadedMessages);
    }

    loadMessages();
  }, [selectedDocumentId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || loading || !selectedDocument) return;

    const optimisticUserMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: trimmedMessage,
    };

    setMessages((prevMessages) => [...prevMessages, optimisticUserMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const botMessage = await sendChatMessage({
        document: selectedDocument,
        question: trimmedMessage,
        chatHistory: messages,
      });
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: crypto.randomUUID(),
          sender: "bot",
          text: `אירעה שגיאה: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (file) => {
    setUploadError("");

    try {
      const newDocument = await uploadDocument(file);
      setDocuments((prevDocuments) => [newDocument, ...prevDocuments]);
      setSelectedDocumentId(newDocument.id);
      return newDocument;
    } catch (error) {
      setUploadError(error.message);
      throw error;
    }
  };

  const handleSelectDocument = (documentId) => {
    setSelectedDocumentId(documentId);
  };

  const handleDeleteDocument = (documentId) => {
    deleteDocument(documentId);

    setDocuments((prevDocuments) => {
      const next = prevDocuments.filter((doc) => doc.id !== documentId);

      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(next.length > 0 ? next[0].id : null);
      }

      return next;
    });
  };

  const handleGenerateSummary = async () => {
    if (!selectedDocument) return;

    setSummaryLoading(true);

    try {
      const summary = await generateSummary(selectedDocument);
      setDocuments((prevDocuments) =>
        prevDocuments.map((doc) =>
          doc.id === selectedDocument.id ? { ...doc, summary } : doc
        )
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  return {
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
    handleGenerateSummary,
    summaryLoading,
    loading,
    uploadError,
  };
}

export default useChat;
