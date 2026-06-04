import { useState } from "react";

import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";

import { initialDocuments, initialMessages } from "../data/mockData";

function ChatPage() {
  const [documents] = useState(initialDocuments);
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: inputValue,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        sender: "bot",
        text: "קיבלתי את השאלה שלך. אני מנתח את המסמך כרגע...",
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    }, 800);
  };

  return (
    <div className="flex h-full">
      <Sidebar documents={documents} />

      <section className="w-3/4 flex flex-col bg-slate-50 relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>

        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSendMessage={handleSendMessage}
        />
      </section>
    </div>
  );
}

export default ChatPage;