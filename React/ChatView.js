import React, { useState } from 'react';
import Sidebar from '../components/Sidebar'; // הנה הייבוא של הקומפוננטה החדשה!

const initialDocs = [
  { id: 1, title: "אלגוריתמים בבינה מלאכותית", date: "12.05.2026" },
  { id: 2, title: "מבני נתונים מתקדמים", date: "10.05.2026" }
];

function ChatView() {
  const [messages, setMessages] = useState([
    { id: 1, sender: "bot", text: "שלום! אני סוקרטס. העלה מאמר ושאל אותי שאלות." }
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMsg = { id: Date.now(), sender: "user", text: inputValue };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");

    setTimeout(() => {
      const botResponse = { id: Date.now() + 1, sender: "bot", text: "זוהי תשובה פיקטיבית מהבוט להדגמה." };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <div className="flex h-full">
      
      {/* כאן אנחנו קוראים לקומפוננטה הקטנה ומעבירים לה את הנתונים! */}
      <Sidebar documents={initialDocs} />

      {/* אזור הצ'אט נשאר כפי שהיה */}
      <section className="w-3/4 flex flex-col bg-slate-50 relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-4 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="שאל שאלה על המאמר..."
            />
            <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
              שלח 🚀
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default ChatView;