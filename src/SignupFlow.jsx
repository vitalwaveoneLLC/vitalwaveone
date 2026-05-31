import { useState } from "react";

const PLANS = [
  { id:"starter",  name:"Starter",  price:199, trucks:"1 Truck",   desc:"Small operations" },
  { id:"standard", name:"Standard", price:499, trucks:"5 Trucks",  desc:"Growing business", popular:true },
  { id:"premium",  name:"Premium",  price:899, trucks:"Unlimited", desc:"Full enterprise" },
];

const S = {
  page: {minHeight:"100vh",background:"#fafafa",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"'Inter',system-ui,sans-serif"},
  card: {width:"100%",maxWidth:460,background:"#fff",border:"1px solid #e5e5e5",borderRadius:14,padding:"28px"},
  label: {display:"block",fontSize:11,fontWeight:500,color:"#888",marginBottom:5,letterSpacing:".05em",textTransform:"uppercase"},
  input: {width:"100%",border:"1px solid #e5e5e5",borderRadius:8,padding:"10px 14px",fontSize:14,fontFamily:"inherit",outline:"none",color:"#111",background:"#fff",transition:"border-color .15s"},
  btn: {width:"100%",padding:"12px",background:"#111",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"opacity .15s"},
  btnGhost: {width:"100%",padding:"11px",background:"transparent",color:"#666",border:"1px solid #e5e5e5",borderRadius:8,fontSize:14,cursor:"pointer",fontFamily:"inherit"},
  err: {padding:"10px 14px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:13,color:"#dc2626",marginBottom:14},
};

export default function SignupFlow({ onComplete, onBack }) {
  const [step, setStep]       = useState(1);
  const [plan, setPlan]       = useState("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ company_name:"", owner_name:"", email:"", phone:"", agree:false });

  const sel = PLANS.find(p => p.id === plan);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  const Field = ({label,k,type="text",placeholder=""}) => (
    <div style={{marginBottom:14}}>
      <label style={S.label}>{label}</label>
      <input type={type} placeholder={placeholder} value={form[k]}
        onChange={e=>upd(k,e.target.value)} style={S.input}
        onFocus={e=>e.target.style.borderColor="#111"}
        onBlur={e=>e.target.style.borderColor="#e5e5e5"}/>
    </div>
  );

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      if (!form.company_name.trim()) throw new Error("Company name is required");
      if (!form.phone.trim()) throw new Error("Phone number is required — it's your login identifier");
      if (!form.agree) throw new Error("Please agree to the Terms of Service");

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      setStep(4);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        input[type=checkbox]{width:15px;height:15px;accent-color:#111;cursor:pointer;flex-shrink:0;}
        .step-btn:hover{opacity:.85;}
        .plan-opt:hover{border-color:#bbb!important;}
      `}</style>

      {/* Logo */}
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:8,marginBottom:28,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",color:"#111"}}>
        <div style={{width:28,height:28,background:"#111",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:12}}>R</div>
        <span style={{fontWeight:600,fontSize:15,letterSpacing:"-.02em"}}>VitalWaveOne</span>
      </button>

      {/* Progress bar */}
      {step < 4 && <>
        <div style={{display:"flex",gap:5,marginBottom:6}}>
          {[1,2,3].map(s=>(
            <div key={s} style={{width:36,height:3,borderRadius:99,background:step>=s?"#111":"#e5e5e5",transition:"background .3s"}}/>
          ))}
        </div>
        <p style={{fontSize:12,color:"#999",marginBottom:22,textAlign:"center"}}>
          Step {step} of 3 — {["","Choose plan","Your company","Confirm details"][step]}
        </p>
      </>}

      <div style={S.card}>

        {/* ── STEP 1: Plan ──────────────────────────────── */}
        {step===1&&<>
          <h2 style={{fontSize:20,fontWeight:600,letterSpacing:"-.02em",marginBottom:4}}>Choose your plan</h2>
          <p style={{fontSize:13,color:"#999",marginBottom:18}}>14-day free trial · No credit card · Cancel anytime</p>

          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:20}}>
            {PLANS.map(p=>(
              <div key={p.id} onClick={()=>setPlan(p.id)} className="plan-opt" style={{
                border:`1.5px solid ${plan===p.id?"#111":"#e5e5e5"}`,
                borderRadius:10,padding:"13px 15px",cursor:"pointer",
                background:plan===p.id?"#fafafa":"#fff",
                position:"relative",display:"flex",justifyContent:"space-between",
                alignItems:"center",transition:"all .15s",
              }}>
                {p.popular&&<div style={{position:"absolute",top:-9,right:14,background:"#111",color:"#fff",fontSize:9,fontWeight:600,padding:"2px 9px",borderRadius:99,letterSpacing:".06em"}}>POPULAR</div>}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:16,height:16,borderRadius:99,border:`2px solid ${plan===p.id?"#111":"#ccc"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {plan===p.id&&<div style={{width:8,height:8,borderRadius:99,background:"#111"}}/>}
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{p.name}</div>
                    <div style={{fontSize:11,color:"#999"}}>{p.trucks} · {p.desc}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:600,fontSize:18,letterSpacing:"-.02em"}}>${p.price}</div>
                  <div style={{fontSize:11,color:"#999"}}>/mo</div>
                </div>
              </div>
            ))}
          </div>

          <button className="step-btn" onClick={()=>setStep(2)} style={S.btn}>Continue with {sel.name} →</button>
          <button onClick={onBack} style={{...S.btnGhost,marginTop:8,border:"none",color:"#999"}}>← Back to home</button>
        </>}

        {/* ── STEP 2: Company ───────────────────────────── */}
        {step===2&&<>
          <h2 style={{fontSize:20,fontWeight:600,letterSpacing:"-.02em",marginBottom:4}}>Your company</h2>
          <p style={{fontSize:13,color:"#999",marginBottom:18}}>Shown to your drivers and customers.</p>
          <Field label="Company name" k="company_name" placeholder="e.g. VitalWaveOne LLC"/>
          <Field label="Your name" k="owner_name" placeholder="e.g. John Smith"/>
          <Field label="Phone number (WhatsApp)" k="phone" type="tel" placeholder="e.g. (713) 555-0100"/>
          <p style={{fontSize:11,color:"#999",marginTop:-8,marginBottom:14}}>This is your login identifier — you'll receive OTP codes here via WhatsApp.</p>
          {error&&<div style={S.err}>{error}</div>}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>{setError("");setStep(1);}} style={{...S.btnGhost,flex:1}}>← Back</button>
            <button className="step-btn" onClick={()=>{
              if(!form.company_name.trim()||!form.owner_name.trim()) return setError("Company name and your name are required");
              if(!form.phone.trim()) return setError("Phone number is required");
              setError("");setStep(3);
            }} style={{...S.btn,flex:2}}>Continue →</button>
          </div>
        </>}

        {/* ── STEP 3: Confirm details ───────────────────── */}
        {step===3&&<>
          <h2 style={{fontSize:20,fontWeight:600,letterSpacing:"-.02em",marginBottom:4}}>Confirm details</h2>
          <p style={{fontSize:13,color:"#999",marginBottom:18}}>Optional email address for invoice delivery.</p>
          <Field label="Email address (optional)" k="email" type="email" placeholder="you@company.com"/>

          {/* Summary box */}
          <div style={{background:"#fafafa",border:"1px solid #e5e5e5",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontSize:11,color:"#888",fontWeight:500,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>Account summary</div>
            {[
              ["Company", form.company_name],
              ["Owner",   form.owner_name],
              ["Phone",   form.phone],
              ["Plan",    `${sel.name} · $${sel.price}/mo after trial`],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                <span style={{color:"#888"}}>{l}</span>
                <span style={{color:"#111",fontWeight:500}}>{v||<span style={{color:"#ccc"}}>—</span>}</span>
              </div>
            ))}
          </div>

          <label style={{display:"flex",alignItems:"flex-start",gap:9,cursor:"pointer",marginBottom:16}}>
            <input type="checkbox" checked={form.agree} onChange={e=>upd("agree",e.target.checked)} style={{marginTop:2}}/>
            <span style={{fontSize:13,color:"#666",lineHeight:1.6}}>
              I agree to the <a href="#" style={{color:"#111",fontWeight:500,textDecoration:"none"}}>Terms of Service</a> and <a href="#" style={{color:"#111",fontWeight:500,textDecoration:"none"}}>Privacy Policy</a>.
              My 14-day free trial starts today.
            </span>
          </label>
          {error&&<div style={S.err}>{error}</div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setError("");setStep(2);}} style={{...S.btnGhost,flex:1}}>← Back</button>
            <button className="step-btn" onClick={submit} disabled={loading} style={{...S.btn,flex:2,opacity:loading?.6:1,cursor:loading?"not-allowed":"pointer"}}>
              {loading?"Creating account…":"Start free trial →"}
            </button>
          </div>
        </>}

        {/* ── STEP 4: Account created ────────────────────── */}
        {step===4&&<div style={{textAlign:"center",padding:"8px 0"}}>
          {/* Icon */}
          <div style={{width:56,height:56,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:26}}>
            💬
          </div>

          <h2 style={{fontSize:20,fontWeight:600,letterSpacing:"-.02em",marginBottom:8}}>Account created!</h2>
          <p style={{fontSize:13,color:"#666",marginBottom:6}}>Your admin account is ready. Log in using</p>
          <div style={{display:"inline-block",padding:"5px 12px",background:"#f5f5f5",borderRadius:7,fontSize:13,fontWeight:500,color:"#111",border:"1px solid #e5e5e5",marginBottom:22}}>
            {form.phone}
          </div>

          {/* Steps */}
          <div style={{textAlign:"left",background:"#fafafa",border:"1px solid #e5e5e5",borderRadius:10,padding:"16px",marginBottom:18}}>
            {[
              ["Go to the login page","Click the button below to open the sign-in screen"],
              ["Enter your phone number","Use the number you registered: " + form.phone],
              ["Receive your WhatsApp code","A one-time code will be sent to you via WhatsApp"],
            ].map(([t,d],i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:i===2?0:12}}>
                <div style={{width:22,height:22,background:"#111",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:600,flexShrink:0,marginTop:1}}>
                  {i+1}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:"#111",marginBottom:1}}>{t}</div>
                  <div style={{fontSize:12,color:"#999"}}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          <a href="/login" style={{display:"block",padding:"12px",background:"#111",color:"#fff",borderRadius:8,fontSize:14,fontWeight:500,textDecoration:"none",marginBottom:10}}>
            Go to sign in →
          </a>

          <div style={{marginTop:16,padding:"10px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,fontSize:12,color:"#166534",fontWeight:500}}>
            ✓ Account created &nbsp;·&nbsp; ✓ Trial started &nbsp;·&nbsp; ✓ No credit card needed
          </div>
        </div>}

      </div>
    </div>
  );
}
