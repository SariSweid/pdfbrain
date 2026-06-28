import { useState } from "react";

function RegisterPage({ onRegister, authLoading, authError, onSwitchToLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("student");

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
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <div style={{ fontSize:"48px", marginBottom:"8px" }}>🧠</div>
          <h1 style={{ color:"#fff", fontSize:"24px", fontWeight:800, margin:0, letterSpacing:"-0.5px" }}>הצטרף ל-PDFBrain</h1>
          <p style={{ color:"rgba(255,255,255,.55)", fontSize:"13px", margin:"6px 0 0" }}>יצירת חשבון חדש</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onRegister(email, password, role); }}
          style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)", fontSize:"13px", display:"block", marginBottom:"6px" }}>אימייל</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="your@email.com" required style={inputStyle}
              onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)", fontSize:"13px", display:"block", marginBottom:"6px" }}>
              סיסמה <span style={{ color:"rgba(255,255,255,.4)", fontWeight:400 }}>(לפחות 6 תווים)</span>
            </label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" minLength={6} required style={inputStyle}
              onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label style={{ color:"rgba(255,255,255,.7)", fontSize:"13px", display:"block", marginBottom:"8px" }}>
              בחר תפקיד
            </label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {[
                { id:"student", emoji:"👨‍🎓", label:"סטודנט" },
                { id:"lecturer", emoji:"👨‍🏫", label:"מרצה" },
              ].map((option) => {
                const selected = role === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRole(option.id)}
                    aria-pressed={selected}
                    style={{
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      gap:"8px",
                      padding:"12px 10px",
                      borderRadius:"12px",
                      border:selected ? "1.5px solid #a5b4fc" : "1px solid rgba(255,255,255,.2)",
                      background:selected ? "rgba(99,102,241,.32)" : "rgba(255,255,255,.08)",
                      color:"#fff",
                      cursor:"pointer",
                      fontWeight:selected ? 800 : 600,
                      fontSize:"14px",
                      fontFamily:"inherit",
                    }}
                  >
                    <span style={{ fontSize:"18px", lineHeight:1 }}>{option.emoji}</span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {authError && <p style={{ color:"#f87171", fontSize:"13px", margin:0 }}>{authError}</p>}

          <button type="submit" disabled={authLoading}
            style={{ marginTop:"6px", padding:"13px", background: authLoading ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:"10px", color:"#fff", fontWeight:700, fontSize:"15px", cursor: authLoading ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
            {authLoading ? "נרשם..." : "יצירת חשבון →"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:"20px" }}>
          <span style={{ color:"rgba(255,255,255,.5)", fontSize:"13px" }}>יש לי כבר חשבון? </span>
          <button type="button" onClick={onSwitchToLogin}
            style={{ background:"none", border:"none", color:"#a5b4fc", fontSize:"13px", cursor:"pointer", fontWeight:600, padding:0, fontFamily:"inherit" }}>
            כניסה
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
