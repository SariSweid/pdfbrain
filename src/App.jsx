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

// ── Role selector ─────────────────────────────────────────────────────────────
function RoleSelector({ onSelect }) {
  return (
    <GradientBg>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"28px" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"52px", marginBottom:"10px" }}>🧠</div>
          <h1 style={{ color:"#fff", fontSize:"26px", fontWeight:800, margin:0 }}>PDFBrain</h1>
          <p style={{ color:"rgba(255,255,255,.6)", fontSize:"14px", margin:"8px 0 0" }}>מי אתה?</p>
        </div>
        <div style={{ display:"flex", gap:"16px" }}>
          {[
            { id:"student",  emoji:"👨‍🎓", label:"סטודנט",  desc:"לומד, מתרגל ומקבל ציון" },
            { id:"lecturer", emoji:"👨‍🏫", label:"מרצה",    desc:"מנהל כיתות ועוקב אחר סטודנטים" },
          ].map(({ id, emoji, label, desc }) => (
            <button key={id} onClick={() => onSelect(id)}
              style={{ background:"rgba(255,255,255,.1)", border:"1.5px solid rgba(255,255,255,.25)",
                borderRadius:"16px", padding:"28px 32px", color:"#fff", cursor:"pointer",
                textAlign:"center", fontFamily:"inherit" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.2)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.1)"}
            >
              <div style={{ fontSize:"36px", marginBottom:"10px" }}>{emoji}</div>
              <div style={{ fontSize:"17px", fontWeight:700 }}>{label}</div>
              <div style={{ fontSize:"12px", color:"rgba(255,255,255,.6)", marginTop:"4px" }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
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
    const localRole = localStorage.getItem("pdfbrain:role");
    if (!localRole) {
      return <RoleSelector onSelect={(r) => {
        localStorage.setItem("pdfbrain:role", r);
        window.location.reload();
      }} />;
    }
    return (
      <div dir="rtl" style={{ height:"100vh", overflow:"hidden" }}>
        <MainLayout role={localRole} onLogout={null} />
      </div>
    );
  }

  // ── Firebase mode ─────────────────────────────────────────────────────────
  if (authLoading || profileLoading) return <AppLoader />;

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

  // No role yet → show selector
  if (!userProfile?.role) {
    return (
      <RoleSelector onSelect={async (r) => {
        await saveUserRole(r);
        setUserProfile({ role: r });
      }} />
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
