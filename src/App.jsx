import { useState } from "react";

import LoginPage from "./pages/LoginPage";
import MainLayout from "./layouts/MainLayout";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="bg-slate-50 min-h-screen font-sans" dir="rtl">
      {!isLoggedIn ? (
        <LoginPage onLogin={() => setIsLoggedIn(true)} />
      ) : (
        <MainLayout onLogout={() => setIsLoggedIn(false)} />
      )}
    </div>
  );
}

export default App;