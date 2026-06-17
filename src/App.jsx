import { useState } from "react";

import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import MainLayout from "./layouts/MainLayout";
import useAuth from "./features/auth/useAuth";

function App() {
  const { isLoggedIn, authLoading, authError, login, register, logout } = useAuth();
  const [authView, setAuthView] = useState("login");

  return (
    <div className="bg-slate-50 min-h-screen font-sans" dir="rtl">
      {isLoggedIn ? (
        <MainLayout onLogout={logout} />
      ) : authView === "login" ? (
        <LoginPage
          onLogin={login}
          authLoading={authLoading}
          authError={authError}
          onSwitchToRegister={() => setAuthView("register")}
        />
      ) : (
        <RegisterPage
          onRegister={register}
          authLoading={authLoading}
          authError={authError}
          onSwitchToLogin={() => setAuthView("login")}
        />
      )}
    </div>
  );
}

export default App;
