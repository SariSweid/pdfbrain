import { useState } from "react";

import ChatPage from "../features/chat/ChatPage";
import ComparePage from "../features/compare/ComparePage";
import HistoryPage from "../features/history/HistoryPage";

function MainLayout({ onLogout }) {
  const [activeTab, setActiveTab] = useState("chat");

  const renderPage = () => {
    switch (activeTab) {
      case "chat":
        return <ChatPage />;

      case "compare":
        return <ComparePage />;

      case "history":
        return <HistoryPage />;

      default:
        return <ChatPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-extrabold text-indigo-700">
            PDFBrain
          </h1>

          <nav className="hidden md:flex gap-6 text-gray-600 font-medium">
            <button
              onClick={() => setActiveTab("chat")}
              className={
                activeTab === "chat"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "hover:text-indigo-600"
              }
            >
              צ'אט
            </button>

            <button
              onClick={() => setActiveTab("compare")}
              className={
                activeTab === "compare"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "hover:text-indigo-600"
              }
            >
              השוואת מאמרים
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={
                activeTab === "history"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "hover:text-indigo-600"
              }
            >
              היסטוריה
            </button>
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="text-gray-500 hover:text-indigo-600 flex items-center gap-2"
        >
          👤 התנתק
        </button>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}

export default MainLayout;