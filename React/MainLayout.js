import React, { useState } from 'react';
import ChatView from './ChatView';

function MainLayout({ onLogout }) {
  // ניהול המצב הפנימי: באיזה טאב אנחנו נמצאים עכשיו
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="flex flex-col h-screen">
      {/* תפריט ניווט עליון */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-extrabold text-indigo-700">PDFBrain</h1>
          <nav className="hidden md:flex gap-6 text-gray-600 font-medium">
            <button 
              onClick={() => setActiveTab('chat')} 
              className={activeTab === 'chat' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-indigo-600"}
            >
              צ'אט
            </button>
            <button 
              onClick={() => setActiveTab('compare')} 
              className={activeTab === 'compare' ? "text-indigo-600 border-b-2 border-indigo-600" : "hover:text-indigo-600"}
            >
              השוואת מאמרים
            </button>
          </nav>
        </div>
        
        <button onClick={onLogout} className="text-gray-500 hover:text-indigo-600 flex items-center gap-2">
          <span>👤 התנתק</span>
        </button>
      </header>

      {/* האזור המרכזי שמשתנה בהתאם לטאב שנבחר */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'compare' && (
          <div className="p-8 text-center text-gray-500 text-xl font-bold">מסך השוואת מאמרים בבנייה...</div>
        )}
      </main>
    </div>
  );
}

export default MainLayout;