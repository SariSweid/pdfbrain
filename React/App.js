import React, { useState } from 'react';
import LoginView from './view/LoginView';
import MainLayout from './view/MainLayout';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="bg-slate-50 min-h-screen font-sans" dir="rtl">
      {!isLoggedIn ? (
        <LoginView onLogin={() => setIsLoggedIn(true)} />
      ) : (
        <MainLayout onLogout={() => setIsLoggedIn(false)} />
      )}
    </div>
  );
}

export default App;