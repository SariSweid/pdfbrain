import { useEffect, useState } from "react";

import {
  fetchInitialDocuments,
  fetchInitialMessages,
  sendChatMessage,
} from "../services/api";
import {
  getChatMessages,
  saveChatMessage,
} from "../services/firestoreService";

function useChat() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInitialChatData() {
      setLoading(true);

      try {
        const loadedDocuments = await fetchInitialDocuments();
        setDocuments(loadedDocuments);

        const storedMessages = await getChatMessages();
        const loadedMessages =
          storedMessages.length > 0
            ? storedMessages
            : await fetchInitialMessages();

        setMessages(loadedMessages);
      } catch (error) {
        console.error("Failed to load chat data:", error);

        try {
          const fallbackDocuments = await fetchInitialDocuments();
          const fallbackMessages = await fetchInitialMessages();

          setDocuments(fallbackDocuments);
          setMessages(fallbackMessages);
        } catch (fallbackError) {
          console.error("Failed to load fallback chat data:", fallbackError);
        }
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
      try {
        await saveChatMessage(userMessage);
      } catch (firestoreError) {
        console.error("Failed to save user message:", firestoreError);
      }

      const botMessage = await sendChatMessage(trimmedMessage);
      setMessages((prevMessages) => [...prevMessages, botMessage]);

      try {
        await saveChatMessage(botMessage);
      } catch (firestoreError) {
        console.error("Failed to save bot message:", firestoreError);
      }
    } catch (error) {
      console.error("Failed to send chat message:", error);
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
