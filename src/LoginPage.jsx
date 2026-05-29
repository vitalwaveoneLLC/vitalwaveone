// LoginPage.jsx — WhatsApp OTP login for admin
// Same flow as driver/customer login — uses Meta WhatsApp API
import { useState } from "react";

const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const inp = {
  width:"100%", border:"1px solid #e5e5e5", borderRadius:8,
  padding:"11px 14px", fontSize:15, fontFamily:"inherit",
  outline:"none", color:"#111", background:"#fff",
  transition:"border-color .15s",
};

export default function LoginPage({ onBack }) {
  const [phone, setPhone]     = useState("");
  const [code, setCode]       = useState("");
  const [stage, setStage]     = useState("phone"); // phone | code
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sentTo, setSentTo]   = useState("");

  const focus = e => e.target.style.borderColor="#111";
  const blur  = e => e.target.style.borderColor="#e5e5e5";

  // Send OTP via WhatsApp
  const sendOtp = async e => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const clean = phone.replace(/\D/g,"");
      if (clean.length < 10) throw new Error("Enter a valid phone number");
      const to = clean.length===10 ? "+1"+clean : "+"+clean;
      const otp = genOtp();
      const expiresAt = new Date(Date.now() + 10*60*1000).toISOString();

      const res = await fetch("/api/functions/send-otp",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ to, code:otp, expires_at:expiresAt, context:"Admin Login" }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok===false) throw new Error(data.err||"Failed to send WhatsApp code. Check your Meta settings.");

      // If API returns code (fallback/testing), display it
      if (data.code) {
        setCode(data.code);
        setError(`⚠️ WhatsApp failed. Use test code: ${data.code}`);
      }

      setSentTo(to);
      setStage("code");
    } catch(e){ setError(e.message); }
    setLoading(false);
  };

  // Verify OTP and sign in
  const verifyOtp = async e => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (code.length < 6) throw new Error("Enter the 6-digit code");

      const res = await fetch("/api/functions/send-otp",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"verify", to:sentTo, code }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.ok) throw new Error(data.err||"Invalid or expired code. Request a new one.");

      // Verify this phone belongs to an admin profile
      const profileRes = await fetch(`/api/auth/verify-admin`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ phone: sentTo }),
      });
      const profileData = await profileRes.json().catch(()=>({}));

      if (!profileRes.ok || !profileData.ok) {
        throw new Error(profileData.error || "This phone number is not registered as an admin.");
      }

      // Store session in localStorage
      localStorage.setItem("vitalwaveone_admin", JSON.stringify({
        phone: sentTo,
        tenant_id: profileData.tenant_id,
        role: profileData.role,
        name: profileData.name,
        expires: Date.now() + 8*60*60*1000, // 8 hours
      }));

      window.location.href = "/app";
    } catch(e){ setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#fafafa",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        .sbtn{width:100%;padding:13px;background:#111;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;transition:opacity .15s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .sbtn:hover{opacity:.85;}
        .sbtn:disabled{opacity:.45;cursor:not-allowed;}
        .gbtn{width:100%;padding:11px;background:transparent;color:#666;border:none;font-size:13px;cursor:pointer;font-family:inherit;margin-top:6px;}
        .gbtn:hover{color:#111;}
      `}</style>

      {/* Logo */}
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:8,marginBottom:28,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",color:"#111",padding:0}}>
        <div style={{width:28,height:28,background:"#111",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:12}}>R</div>
        <span style={{fontWeight:600,fontSize:15,letterSpacing:"-.02em"}}>VitalWaveOne</span>
      </button>

      <div style={{width:"100%",maxWidth:400,background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,padding:"28px"}}>

        {/* PHONE STEP */}
        {stage==="phone"&&<>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{fontSize:32,marginBottom:10}}>💬</div>
            <h2 style={{fontSize:20,fontWeight:600,letterSpacing:"-.02em",marginBottom:6}}>Sign in with WhatsApp</h2>
            <p style={{fontSize:13,color:"#999",lineHeight:1.6}}>
              Enter your phone number and we'll send you a verification code via WhatsApp
            </p>
          </div>

          <form onSubmit={sendOtp}>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:"#888",marginBottom:5,letterSpacing:".05em",textTransform:"uppercase"}}>Phone number</label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000" required style={inp}
                onFocus={focus} onBlur={blur} autoFocus/>
            </div>

            {error&&<div style={{padding:"10px 14px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:13,color:"#dc2626",marginBottom:14}}>{error}</div>}

            <button type="submit" className="sbtn" disabled={loading}>
              {loading ? "Sending…" : <><span>Send WhatsApp code</span><span>→</span></>}
            </button>
          </form>

          <p style={{marginTop:18,textAlign:"center",fontSize:13,color:"#999"}}>
            Don't have an account?{" "}
            <a href="/signup" style={{color:"#111",fontWeight:500,textDecoration:"none"}}>Start free trial</a>
          </p>
        </>}

        {/* CODE STEP */}
        {stage==="code"&&<>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{width:52,height:52,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:24}}>✓</div>
            <h2 style={{fontSize:20,fontWeight:600,letterSpacing:"-.02em",marginBottom:6}}>Check WhatsApp</h2>
            <p style={{fontSize:13,color:"#666",lineHeight:1.6}}>
              We sent a 6-digit code to<br/>
              <strong style={{color:"#111"}}>+{sentTo}</strong>
            </p>
          </div>

          <form onSubmit={verifyOtp}>
            <div style={{marginBottom:18}}>
              <label style={{display:"block",fontSize:11,fontWeight:500,color:"#888",marginBottom:5,letterSpacing:".05em",textTransform:"uppercase"}}>6-digit code</label>
              <input type="text" inputMode="numeric" maxLength={6} value={code}
                onChange={e=>setCode(e.target.value.replace(/\D/g,""))}
                placeholder="000000" autoFocus required
                style={{...inp,textAlign:"center",fontSize:26,fontWeight:600,letterSpacing:"0.35em"}}
                onFocus={focus} onBlur={blur}/>
              <p style={{fontSize:11,color:"#999",marginTop:6,textAlign:"center"}}>Code expires in 10 minutes</p>
            </div>

            {error&&<div style={{padding:"10px 14px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:13,color:"#dc2626",marginBottom:14}}>{error}</div>}

            <button type="submit" className="sbtn" disabled={loading||code.length<6}>
              {loading?"Verifying…":"Verify & sign in →"}
            </button>
          </form>

          <button className="gbtn" onClick={()=>{setStage("phone");setCode("");setError("");}}>
            ← Use a different number
          </button>
          <button className="gbtn" onClick={sendOtp} disabled={loading}>
            Resend code
          </button>
        </>}

      </div>

      {/* Trust badges */}
      <div style={{marginTop:20,display:"flex",gap:20,fontSize:12,color:"#bbb"}}>
        <span>🔒 Secure OTP</span>
        <span>💬 Via WhatsApp</span>
        <span>⏱ 10 min expiry</span>
      </div>
    </div>
  );
}
