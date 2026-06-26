import { useState } from "react";

function LoginPage({ onLogin, authLoading, authError, onSwitchToRegister }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  const inputStyle = {
    width:"100%", padding:"12px 14px", boxSizing:"border-box",
    background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)",
    borderRadius:"10px", color:"#fff", fontSize:"14px", outline:"none", fontFamily:"inherit",
  };

  const onFocus = (e) => { e.target.style.borderColor="rgba(165,180,252,.7)"; e.target.style.boxShadow="0 0 0 3px rgba(99,102,241,.2)"; };
  const onBlur  = (e) => { e.target.style.borderColor="rgba(255,255,255,.2)"; e.target.style.boxShadow="none"; };

  return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", direction:"rtl" }}>
      <div style={{ background:"rgba(255,255,255,.08)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,.15)", borderRadius:"24px", padding:"44px 40px", width:"420px", maxWidth:"92vw", boxShadow:"0 25px 60px rgba(0,0,0,.35)", boxSizing:"border-box" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"36px" }}>
          <div style={{ fontSize:"48px", marginBottom:"8px" }}>🧠</div>
          <h1 style={{ color:"#fff", fontSize:"24px", fontWeight:800, margin:0, letterSpacing:"-0.5px" }}>PDFBrain</h1>
          <p style={{ color:"rgba(255,255,255,.55)", fontSize:"13px", margin:"6px 0 0" }}>פלטפורמת למידה חכמה ממאמרים אקדמיים</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }}
          style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)", fontSize:"13px", display:"block", marginBottom:"6px" }}>אימייל</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="your@email.com" required style={inputStyle}
              onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)", fontSize:"13px", display:"block", marginBottom:"6px" }}>סיסמה</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" required style={inputStyle}
              onFocus={onFocus} onBlur={onBlur} />
          </div>

          {authError && <p style={{ color:"#f87171", fontSize:"13px", margin:0 }}>{authError}</p>}

          <button type="submit" disabled={authLoading}
            style={{ marginTop:"6px", padding:"13px", background: authLoading ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:"10px", color:"#fff", fontWeight:700, fontSize:"15px", cursor: authLoading ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
            {authLoading ? "מתחבר..." : "כניסה →"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:"20px" }}>
          <span style={{ color:"rgba(255,255,255,.5)", fontSize:"13px" }}>אין לי חשבון? </span>
          <button type="button" onClick={onSwitchToRegister}
            style={{ background:"none", border:"none", color:"#a5b4fc", fontSize:"13px", cursor:"pointer", fontWeight:600, padding:0, fontFamily:"inherit" }}>
            הרשמה
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
