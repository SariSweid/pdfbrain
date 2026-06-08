import { useEffect, useState } from "react";

import {
  fetchInitialDocuments,
  fetchInitialMessages,
  sendChatMessage,
} from "../services/api";

function useChat() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInitialChatData() {
      setLoading(true);

      try {
        const [loadedDocuments, loadedMessages] = await Promise.all([
          fetchInitialDocuments(),
          fetchInitialMessages(),
        ]);

        setDocuments(loadedDocuments);
        setMessages(loadedMessages);
      } finally {
        setLoading(false);
      }
    }

    loadInitialChatData();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: trimmedMessage,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const botMessage = await sendChatMessage(trimmedMessage);
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  return {
    documents,
    messages,
    inputValue,
    setInputValue,
    handleSendMessage,
    loading,
  };
}

export default useChat;
