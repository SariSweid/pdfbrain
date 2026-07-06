import { useEffect, useState } from "react";
import {
  fetchInitialDocuments,
  uploadDocument,
  fetchMessagesForDocument,
  sendChatMessage,
} from "./chatService";
import { deleteDocument, addHistoryEvent, updateDocument, archiveAndClearMessages } from "../../lib/localStore";

export function useChat() {
  const [documents, setDocuments]               = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [messages, setMessages]                 = useState([]);
  const [inputValue, setInputValue]             = useState("");
  const [loading, setLoading]                   = useState(false);
  const [uploadError, setUploadError]           = useState("");

  const selectedDocument =
    documents.find((doc) => doc.id === selectedDocumentId) ?? null;

  // ── Load documents on mount ───────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const docs = await fetchInitialDocuments();
        setDocuments(docs);
        if (docs.length > 0) setSelectedDocumentId(docs[0].id);
      } catch (err) {
        console.error("Failed to load documents:", err);
      }
    }
    load();
  }, []);

  // ── Load messages when selected document changes ──────────────────────────
  useEffect(() => {
    async function loadMessages() {
      if (!selectedDocumentId) { setMessages([]); return; }
      try {
        const msgs = await fetchMessagesForDocument(selectedDocumentId);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to load messages:", err);
        setMessages([]);
      }
    }
    loadMessages();
  }, [selectedDocumentId]);

  // ── Send message ──────────────────────────────────────────────────────────
  // overrideText lets ChatPage inject an automated opening prompt
  const handleSendMessage = async (e, systemPrompt, overrideText) => {
    e?.preventDefault();

    const text = overrideText ?? inputValue.trim();
    if (!text || loading) return;

    // Only add a user bubble when the user actually typed (not auto-trigger)
    if (!overrideText) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), sender: "user", text, createdAt: Date.now() },
      ]);
      setInputValue("");
    }

    setLoading(true);

    try {
      const doc = selectedDocument;
      if (!doc) return;

      const botMessage = await sendChatMessage({
        document:    doc,
        question:    text,
        chatHistory: overrideText ? [] : messages,
        systemPrompt,
      });
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), sender: "bot", text: `אירעה שגיאה: ${error.message}`, createdAt: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUploadDocument = async (file) => {
    setUploadError("");
    try {
      const newDoc = await uploadDocument(file);
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDocumentId(newDoc.id);
      setMessages([]);

      return newDoc;
    } catch (error) {
      setUploadError(error.message);
      throw error;
    }
  };

  // ── Select ────────────────────────────────────────────────────────────────
  const handleSelectDocument = (documentId) => {
    setSelectedDocumentId(documentId);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteDocument = (documentId) => {
    deleteDocument(documentId).catch(() => {});
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    if (selectedDocumentId === documentId) {
      const remaining = documents.filter((d) => d.id !== documentId);
      setSelectedDocumentId(remaining[0]?.id ?? null);
    }
  };

  // ── Export chat as text ───────────────────────────────────────────────────
  const handleExport = () => {
    if (!selectedDocument || messages.length === 0) return;
    const text = messages
      .map((m) => `${m.sender === "user" ? "משתמש" : "בוט"}: ${m.text}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${selectedDocument.title}_chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Clear all messages for the current document (redo) ─────────────────────
  const handleRestartSession = async () => {
    if (!selectedDocumentId) return;
    try {
      await archiveAndClearMessages(selectedDocumentId); // preserves history for lecturer
    } catch (err) {
      console.error("clearMessages failed:", err);
    }
    setMessages([]);
  };

  // ── Update a document's fields (e.g. save analysis) ────────────────────────
  const handleUpdateDocument = async (documentId, patch) => {
    try {
      await updateDocument(documentId, patch);
      setDocuments((prev) =>
        prev.map((d) => (d.id === documentId ? { ...d, ...patch } : d))
      );
    } catch (err) {
      console.error("Failed to update document:", err);
    }
  };

  return {
    documents,
    selectedDocumentId,
    selectedDocument,
    messages,
    inputValue,
    setInputValue,
    loading,
    uploadError,
    handleSendMessage,
    handleUploadDocument,
    handleSelectDocument,
    handleDeleteDocument,
    handleExport,
    handleUpdateDocument,
    handleRestartSession,
  };
}