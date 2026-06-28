import { useState, useEffect } from "react";
import LoginPage    from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import MainLayout   from "./layouts/MainLayout";
import useAuth      from "./features/auth/useAuth";
import { isFirebaseConfigured, auth } from "./lib/firebase";
import {
  loadUserProfile,
  saveUserRole,
  isCodeAvailable,
  createClassCode,
  registerStudentWithCode,
} from "./lib/localStore";

// ── Shared UI wrappers ────────────────────────────────────────────────────────
function GradientBg({ children }) {
  return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", direction:"rtl" }}>
      {children}
    </div>
  );
}
function Card({ children, width = "440px" }) {
  return (
    <div style={{ background:"rgba(255,255,255,.09)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,.16)", borderRadius:"24px", padding:"44px 40px", width, maxWidth:"92vw", boxShadow:"0 25px 60px rgba(0,0,0,.4)", boxSizing:"border-box" }}>
      {children}
    </div>
  );
}
const inputStyle = { width:"100%", padding:"12px 14px", boxSizing:"border-box", background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:"10px", color:"#fff", fontSize:"14px", outline:"none", fontFamily:"inherit" };
const primaryBtn = (disabled) => ({ padding:"13px", background: disabled ? "rgba(99,102,241,.35)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:"10px", color:"#fff", fontWeight:700, fontSize:"15px", cursor: disabled ? "not-allowed" : "pointer", fontFamily:"inherit", width:"100%" });

// ── Spinner ────────────────────────────────────────────────────────────────────
function AppLoader() {
  return (
    <GradientBg>
      <div style={{ width:"34px", height:"34px", border:"3px solid rgba(255,255,255,.2)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </GradientBg>
  );
}

// ── Role selector (first-time only) ───────────────────────────────────────────
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
            { id:"lecturer", emoji:"👨‍🏫", label:"מרצה",    desc:"מנהל קורס ועוקב אחר סטודנטים" },
          ].map(({ id, emoji, label, desc }) => (
            <button key={id} onClick={() => onSelect(id)}
              style={{ background:"rgba(255,255,255,.1)", border:"1.5px solid rgba(255,255,255,.25)", borderRadius:"16px", padding:"28px 32px", color:"#fff", cursor:"pointer", textAlign:"center", fontFamily:"inherit" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.2)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
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

// ── Lecturer: create class code ────────────────────────────────────────────────
function LecturerSetup({ onDone, onLogout }) {
  const genCode  = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const [code,    setCode]    = useState(genCode);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [checking, setChecking] = useState(false);

  const handleChange = async (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(v);
    if (v.length >= 4) {
      setChecking(true);
      const ok = await isCodeAvailable(v).catch(() => true);
      setError(ok ? "" : `הקוד "${v}" תפוס`);
      setChecking(false);
    } else {
      setError("");
    }
  };

  const handleCreate = async () => {
    if (code.length < 4 || error || loading) return;
    setLoading(true); setError("");
    try {
      const created = await createClassCode(code);
      onDone(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const codeOk = code.length >= 4 && !error && !checking;

  return (
    <GradientBg>
      <Card>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ fontSize:"44px", marginBottom:"10px" }}>🎓</div>
          <h2 style={{ color:"#fff", fontSize:"21px", fontWeight:800, margin:0 }}>צור קוד כיתה</h2>
          <p style={{ color:"rgba(255,255,255,.6)", fontSize:"13px", margin:"8px 0 0" }}>
            קוד זה ישמש את הסטודנטים שלך להירשם לקורס
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)", fontSize:"13px", display:"block", marginBottom:"6px" }}>קוד הכיתה (4-6 תווים)</label>
            <div style={{ display:"flex", gap:"8px" }}>
              <input
                value={code}
                onChange={e => handleChange(e.target.value)}
                maxLength={6}
                placeholder="ABC123"
                style={{ ...inputStyle, flex:1, letterSpacing:"0.15em", fontWeight:700, fontSize:"18px", textAlign:"center", direction:"ltr" }}
                onFocus={e=>{ e.target.style.borderColor="rgba(165,180,252,.7)"; }}
                onBlur={e=>{ e.target.style.borderColor="rgba(255,255,255,.2)"; }}
              />
              <button onClick={() => handleChange(genCode())}
                style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:"10px", color:"#fff", cursor:"pointer", padding:"0 14px", fontSize:"18px", flexShrink:0 }}
                title="קוד אקראי חדש">
                🔄
              </button>
            </div>
            {checking && <p style={{ color:"rgba(255,255,255,.5)", fontSize:"12px", margin:"6px 0 0" }}>בודק זמינות...</p>}
            {!checking && code.length >= 4 && !error && <p style={{ color:"#86efac", fontSize:"12px", margin:"6px 0 0" }}>✓ הקוד זמין</p>}
            {error && <p style={{ color:"#f87171", fontSize:"12px", margin:"6px 0 0" }}>{error}</p>}
          </div>

          <p style={{ color:"rgba(255,255,255,.5)", fontSize:"12px", margin:0, lineHeight:1.5 }}>
            💡 בחר קוד קצר וקל לזכור — תוכל לשתף אותו עם הסטודנטים שלך
          </p>

          <button onClick={handleCreate} disabled={!codeOk || loading} style={primaryBtn(!codeOk || loading)}>
            {loading ? "יוצר קוד..." : "✅ צור קוד וכנס למערכת"}
          </button>
          {onLogout && (
            <button onClick={onLogout} style={{ background:"transparent", border:"none", color:"rgba(255,255,255,.4)", fontSize:"13px", cursor:"pointer", fontFamily:"inherit", marginTop:"4px" }}>
              ← התנתק וחזור
            </button>
          )}
        </div>
      </Card>
    </GradientBg>
  );
}

// ── Student: enter class code ──────────────────────────────────────────────────
function StudentSetup({ onDone, onLogout }) {
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleRegister = async () => {
    if (!code.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const result = await registerStudentWithCode(code);
      onDone(result.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBg>
      <Card>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ fontSize:"44px", marginBottom:"10px" }}>📚</div>
          <h2 style={{ color:"#fff", fontSize:"21px", fontWeight:800, margin:0 }}>הרשמה אצל מרצה</h2>
          <p style={{ color:"rgba(255,255,255,.6)", fontSize:"13px", margin:"8px 0 0" }}>
            הזן את קוד הכיתה שקיבלת מהמרצה שלך
          </p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)", fontSize:"13px", display:"block", marginBottom:"6px" }}>קוד הכיתה</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
              maxLength={6}
              placeholder="ABC123"
              style={{ ...inputStyle, letterSpacing:"0.15em", fontWeight:700, fontSize:"18px", textAlign:"center", direction:"ltr" }}
              onFocus={e=>{ e.target.style.borderColor="rgba(165,180,252,.7)"; }}
              onBlur={e=>{ e.target.style.borderColor="rgba(255,255,255,.2)"; }}
            />
          </div>

          {error && <p style={{ color:"#f87171", fontSize:"13px", margin:0 }}>{error}</p>}

          <button onClick={handleRegister} disabled={code.length < 4 || loading} style={primaryBtn(code.length < 4 || loading)}>
            {loading ? "מאמת ומרשם..." : "הירשם אצל המרצה →"}
          </button>
          {onLogout && (
            <button onClick={onLogout} style={{ background:"transparent", border:"none", color:"rgba(255,255,255,.4)", fontSize:"13px", cursor:"pointer", fontFamily:"inherit", marginTop:"4px" }}>
              ← התנתק וחזור
            </button>
          )}
        </div>
      </Card>
    </GradientBg>
  );
}

// ── App root ───────────────────────────────────────────────────────────────────
function App() {
  const { isLoggedIn, authLoading, authError, login, register, logout } = useAuth();
  const [authView,       setAuthView]       = useState("login");
  const [userProfile,    setUserProfile]    = useState(null);  // { role, classCode?, registeredCode? }
  const [profileLoading, setProfileLoading] = useState(false);

  // ── Load profile from Firestore after every login ─────────────────────────
  useEffect(() => {
    if (!isLoggedIn) { setUserProfile(null); return; }
    setProfileLoading(true);
    loadUserProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(null))
      .finally(() => setProfileLoading(false));
  }, [isLoggedIn]);

  // ── No-Firebase: simple localStorage-only flow ────────────────────────────
  if (!isFirebaseConfigured) {
    const localRole = localStorage.getItem("pdfbrain:role");
    if (!localRole) {
      return <RoleSelector onSelect={(r) => { localStorage.setItem("pdfbrain:role", r); window.location.reload(); }} />;
    }
    return (
      <div dir="rtl" style={{ height:"100vh", overflow:"hidden" }}>
        <MainLayout role={localRole} onLogout={null} classCode={null} />
      </div>
    );
  }

  // ── Firebase flow ──────────────────────────────────────────────────────────
  const handleRegister = async (email, password, role) => {
    const registered = await register(email, password);
    if (!registered) return false;

    await saveUserRole(role);
    setUserProfile({ role });
    return true;
  };

  if (authLoading || profileLoading) return <AppLoader />;

  if (!isLoggedIn) {
    return authView === "login" ? (
      <LoginPage
        onLogin={login} authLoading={authLoading} authError={authError}
        onSwitchToRegister={() => setAuthView("register")}
      />
    ) : (
      <RegisterPage
        onRegister={handleRegister} authLoading={authLoading} authError={authError}
        onSwitchToLogin={() => setAuthView("login")}
      />
    );
  }

  // ── Logged in — determine setup state ──────────────────────────────────────

  // No role yet (brand new account)
  if (!userProfile?.role) {
    return (
      <RoleSelector onSelect={async (r) => {
        await saveUserRole(r);
        setUserProfile({ role: r });
      }} />
    );
  }

  // Lecturer: needs to create a class code
  if (userProfile.role === "lecturer" && !userProfile.classCode) {
    return (
      <LecturerSetup onDone={(code) => setUserProfile(prev => ({ ...prev, classCode: code }))} onLogout={logout} />
    );
  }

  // Student: needs to register with a class code
  if (userProfile.role === "student" && !userProfile.registeredCode) {
    return (
      <StudentSetup onDone={(code) => setUserProfile(prev => ({ ...prev, registeredCode: code }))} onLogout={logout} />
    );
  }

  // ── All set — show main app ────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ height:"100vh", overflow:"hidden" }}>
      <MainLayout
        role={userProfile.role}
        classCode={userProfile.classCode ?? null}
        onLogout={logout}
      />
    </div>
  );
}

export default App;
