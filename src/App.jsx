import { useState, useEffect } from "react";
import LoginPage    from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import MainLayout   from "./layouts/MainLayout";
import useAuth      from "./features/auth/useAuth";
import { isFirebaseConfigured } from "./lib/firebase";
import { loadUserProfile } from "./lib/localStore";

// ── Shared wrappers ───────────────────────────────────────────────────────────
function GradientBg({ children }) {
  return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", direction:"rtl" }}>
      {children}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function AppLoader() {
  return (
    <GradientBg>
      <div style={{ width:"34px", height:"34px", border:"3px solid rgba(255,255,255,.2)",
        borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </GradientBg>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
function App() {
  const { isLoggedIn, authLoading, authError, login, register, logout } = useAuth();
  const [authView,       setAuthView]       = useState("login");
  const [userProfile,    setUserProfile]    = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load role from Firestore after login
  useEffect(() => {
    if (!isLoggedIn) { setUserProfile(null); return; }
    if (!isFirebaseConfigured) return;
    setProfileLoading(true);
    loadUserProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(null))
      .finally(() => setProfileLoading(false));
  }, [isLoggedIn]);

  // ── No-Firebase mode ──────────────────────────────────────────────────────
  if (!isFirebaseConfigured) {
    const localRole = localStorage.getItem("pdfbrain:role") || "student";
    return (
      <div dir="rtl" style={{ height:"100vh", overflow:"hidden" }}>
        <MainLayout role={localRole} onLogout={null} />
      </div>
    );
  }

  // ── Firebase mode ─────────────────────────────────────────────────────────
  // Show spinner while auth is loading OR while profile is loading OR
  // if we are logged in but profile hasn't arrived yet (prevents the role flash)
  if (authLoading || profileLoading || (isLoggedIn && !userProfile)) return <AppLoader />;

  if (!isLoggedIn) {
    return authView === "login" ? (
      <LoginPage onLogin={login} authLoading={authLoading} authError={authError}
        onSwitchToRegister={() => setAuthView("register")} />
    ) : (
      <RegisterPage
        authLoading={authLoading} authError={authError}
        onSwitchToLogin={() => setAuthView("login")}
        onRegister={async (email, password, role) => {
          const ok = await register(email, password);
          if (!ok) return false;
          await saveUserRole(role);
          setUserProfile({ role });
          return true;
        }}
      />
    );
  }

  // All set — show the app directly, no forced setup screens
  return (
    <div dir="rtl" style={{ height:"100vh", overflow:"hidden" }}>
      <MainLayout role={userProfile.role} onLogout={logout} />
    </div>
  );
}

export default App;
