import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import ThemeToggle  from "../../components/ThemeToggle";

export default function RegisterPage({ onRegister, authLoading, authError, onSwitchToLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("student");
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const bg   = isDark
    ? "linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)"
    : "linear-gradient(135deg,#eef2ff,#e0e7ff,#c7d2fe)";
  const card = isDark
    ? { background:"rgba(255,255,255,.08)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,.15)" }
    : { background:"rgba(255,255,255,.9)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(99,102,241,.2)" };
  const textMain  = isDark ? "#fff"                : "#1e1b4b";
  const textSub   = isDark ? "rgba(255,255,255,.55)" : "#6366f1";
  const textLabel = isDark ? "rgba(255,255,255,.7)"  : "#4338ca";
  const textLink  = isDark ? "#a5b4fc"               : "#4338ca";
  const inputBg   = isDark ? "rgba(255,255,255,.1)"  : "rgba(0,0,0,.04)";
  const inputBdr  = isDark ? "rgba(255,255,255,.2)"  : "rgba(99,102,241,.3)";
  const inputClr  = isDark ? "#fff"                  : "#1e1b4b";
  const textMuted = isDark ? "rgba(255,255,255,.5)"  : "#6b7280";
  const roleBdr   = isDark ? "rgba(255,255,255,.15)" : "rgba(99,102,241,.25)";
  const roleSelBg = isDark ? "rgba(99,102,241,.35)"  : "rgba(99,102,241,.12)";
  const roleSelBdr= isDark ? "rgba(165,180,252,.7)"  : "#6366f1";

  const iStyle = {
    width:"100%", padding:"12px 14px", boxSizing:"border-box",
    background:inputBg, border:`1px solid ${inputBdr}`,
    borderRadius:"10px", color:inputClr, fontSize:"14px",
    outline:"none", fontFamily:"inherit",
  };
  const onFocus = e => { e.target.style.borderColor="#6366f1"; e.target.style.boxShadow="0 0 0 3px rgba(99,102,241,.2)"; };
  const onBlur  = e => { e.target.style.borderColor=inputBdr; e.target.style.boxShadow="none"; };

  return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:bg, direction:"rtl" }}>
      {/* Theme toggle */}
      <div style={{ position:"fixed", top:"16px", left:"16px", zIndex:10 }}>
        <ThemeToggle theme={theme} onToggle={toggle}/>
      </div>

      <div style={{ ...card, borderRadius:"24px", padding:"40px 36px", width:"420px",
        maxWidth:"92vw", boxShadow:"0 25px 60px rgba(0,0,0,.2)", boxSizing:"border-box" }}>

        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ fontSize:"44px", marginBottom:"8px" }}>🧠</div>
          <h1 style={{ color:textMain, fontSize:"22px", fontWeight:800, margin:0 }}>הצטרף ל-PDFBrain</h1>
          <p style={{ color:textSub, fontSize:"13px", margin:"6px 0 0" }}>יצירת חשבון חדש</p>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom:"20px" }}>
          <p style={{ color:textLabel, fontSize:"12px", margin:"0 0 8px",
            textTransform:"uppercase", letterSpacing:".05em" }}>אני נרשם/ת כ...</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            {[{id:"student",emoji:"👨‍🎓",label:"סטודנט"},{id:"lecturer",emoji:"👨‍🏫",label:"מרצה"}].map(({id,emoji,label}) => (
              <button key={id} type="button" onClick={()=>setRole(id)} style={{
                background: role===id ? roleSelBg : "transparent",
                border: `1.5px solid ${role===id ? roleSelBdr : roleBdr}`,
                borderRadius:"10px", padding:"11px 0", color: role===id ? (isDark?"#fff":"#4338ca") : (isDark?"rgba(255,255,255,.7)":"#6b7280"),
                cursor:"pointer", fontSize:"14px", fontWeight:role===id?700:400,
                fontFamily:"inherit" }}>
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={e=>{ e.preventDefault(); onRegister(email,password,role); }}
          style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <div>
            <label style={{ color:textLabel, fontSize:"13px", display:"block", marginBottom:"5px" }}>אימייל</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="your@email.com" required style={iStyle}
              onFocus={onFocus} onBlur={onBlur}/>
          </div>
          <div>
            <label style={{ color:textLabel, fontSize:"13px", display:"block", marginBottom:"5px" }}>
              סיסמה <span style={{ color:textMuted, fontWeight:400 }}>(לפחות 6 תווים)</span>
            </label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" minLength={6} required style={iStyle}
              onFocus={onFocus} onBlur={onBlur}/>
          </div>

          {authError && <p style={{ color:"#f87171", fontSize:"13px", margin:0 }}>{authError}</p>}

          <button type="submit" disabled={authLoading} style={{
            marginTop:"6px", padding:"13px",
            background: authLoading ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border:"none", borderRadius:"10px", color:"#fff", fontWeight:700,
            fontSize:"15px", cursor:authLoading?"not-allowed":"pointer", fontFamily:"inherit" }}>
            {authLoading ? "נרשם..." : "צור חשבון →"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:"18px" }}>
          <span style={{ color:textMuted, fontSize:"13px" }}>יש לי כבר חשבון? </span>
          <button type="button" onClick={onSwitchToLogin} style={{
            background:"none", border:"none", color:textLink, fontSize:"13px",
            cursor:"pointer", fontWeight:600, padding:0, fontFamily:"inherit" }}>
            כניסה
          </button>
        </div>
      </div>
    </div>
  );
}
