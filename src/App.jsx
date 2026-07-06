import { useState, useEffect } from "react";
import LoginPage    from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import MainLayout   from "./layouts/MainLayout";
import useAuth      from "./features/auth/useAuth";
import { isFirebaseConfigured } from "./lib/firebase";
import { loadUserProfile, saveUserRole } from "./lib/localStore";

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
  const [profileChecked, setProfileChecked] = useState(false);

  // Load role from Firestore after login
  useEffect(() => {
    if (!isLoggedIn) { setUserProfile(null); setProfileChecked(false); return; }
    if (!isFirebaseConfigured) return;
    setProfileLoading(true);
    setProfileChecked(false);
    loadUserProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(null))
      .finally(() => {
        setProfileLoading(false);
        setProfileChecked(true);
      });
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
  // if we are logged in but the profile check hasn't finished yet
  // (prevents the role flash) — but NOT forever: once profileChecked is true
  // we stop spinning even if no profile document was found.
  if (authLoading || profileLoading || (isLoggedIn && !profileChecked)) return <AppLoader />;

  // Logged in, profile check finished, but no profile doc exists for this
  // account (e.g. it was created before a role was ever saved). Don't get
  // stuck on a spinner forever — surface it so the user isn't stranded.
  if (isLoggedIn && !userProfile) {
    return (
      <GradientBg>
        <div style={{ color:"#fff", textAlign:"center", maxWidth:"320px" }}>
          <p style={{ marginBottom:"16px" }}>
            לא נמצא פרופיל משתמש עבור החשבון הזה. נסה להתחבר מחדש, או צור קשר עם התמיכה אם הבעיה נמשכת.
          </p>
          <button
            onClick={logout}
            style={{ background:"#fff", color:"#312e81", border:"none",
              borderRadius:"8px", padding:"8px 16px", cursor:"pointer" }}
          >
            התנתק ונסה שוב
          </button>
        </div>
      </GradientBg>
    );
  }

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
