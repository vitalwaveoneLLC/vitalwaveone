import { useState, useEffect } from "react";

const PLANS = [
  {
    id: "starter", name: "Starter", price: 199, color: "#2563eb",
    trucks: "1 Truck", customers: "50 Customers",
    features: ["Driver management & loads","Basic invoicing","Customer portal","WhatsApp OTP login","Walk-in sales","Cash & check payments","Email invoices","Offline driver app"],
    locked: ["Bulk payments","Analytics","Tax reports","PDF downloads"],
  },
  {
    id: "standard", name: "Standard", price: 499, color: "#7c3aed", popular: true,
    trucks: "5 Trucks", customers: "500 Customers",
    features: ["Everything in Starter","WhatsApp invoices","PDF downloads","Bulk payments","Custom pricing","Promotions","Purchase orders","Bank reconciliation"],
    locked: ["Analytics & P&L","IRS reports","Settlement reports","Audit log"],
  },
  {
    id: "premium", name: "Premium", price: 899, color: "#059669",
    trucks: "Unlimited", customers: "Unlimited",
    features: ["Everything in Standard","Analytics & P&L","Tax compliance engine","IRS tax reports","Settlement reports","Credit memos","Returned check tracking","Audit log","White-label branding","Priority support"],
    locked: [],
  },
];

const FAQS = [
  {q:"Is there a free trial?",a:"Yes — 14 days free, no credit card required. Full Premium access during trial so you can explore every feature before committing."},
  {q:"Can I upgrade or downgrade anytime?",a:"Yes. Upgrades take effect immediately. Downgrades take effect at the next billing cycle with no penalty."},
  {q:"Do drivers need to pay separately?",a:"No. One flat monthly price covers all users — admins, drivers, walk-in staff — with no per-seat fees."},
  {q:"Is WhatsApp messaging free?",a:"Meta WhatsApp Cloud API is free for the first 1,000 conversations per month. VitalWaveOne uses it for invoice delivery and secure OTP login."},
  {q:"What about my existing data?",a:"We provide a full data migration service. Your existing invoices, customers, and inventory can be imported via CSV in minutes."},
  {q:"Is this specific to a particular industry?",a:"VitalWaveOne works for any route-based wholesale distribution business — tobacco, beverages, snacks, health products, and more. The tax engine, IRS reporting, and product categories are fully configurable per your business."},
];

export default function LandingPage({ onSignUp, onLogin }) {
  const [annual, setAnnual] = useState(false);
  const [faq, setFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#fafafa",color:"#111",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Cal+Sans&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        .btn-primary{background:#111;color:#fff;border:none;border-radius:8px;padding:11px 22px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;transition:opacity .15s;display:inline-flex;align-items:center;gap:7px;}
        .btn-primary:hover{opacity:.85;}
        .btn-ghost{background:transparent;color:#555;border:1px solid #e5e5e5;border-radius:8px;padding:11px 22px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s;}
        .btn-ghost:hover{border-color:#bbb;color:#111;}
        .feature-check{color:#059669;font-size:13px;display:flex;align-items:flex-start;gap:8px;line-height:1.5;}
        .feature-lock{color:#bbb;font-size:13px;display:flex;align-items:flex-start;gap:8px;line-height:1.5;text-decoration:line-through;}
        .tag{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:500;border:1px solid;}
        a{color:inherit;text-decoration:none;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .5s ease forwards;}
      `}</style>

      {/* NAV */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 40px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",background:scrolled?"rgba(250,250,250,.95)":"transparent",backdropFilter:scrolled?"blur(8px)":"none",borderBottom:scrolled?"1px solid #e5e5e5":"none",transition:"all .25s"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,background:"#111",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:13}}>R</div>
          <span style={{fontWeight:600,fontSize:16,letterSpacing:"-.02em"}}>VitalWaveOne</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {[["#pricing","Pricing"],["#features","Features"],["#faq","FAQ"]].map(([h,l])=>(
            <a key={h} href={h} style={{color:"#666",fontSize:14,padding:"6px 12px",borderRadius:6,transition:"color .15s"}}>{l}</a>
          ))}
          <button onClick={onLogin} className="btn-ghost" style={{padding:"7px 16px",marginLeft:4}}>Sign in</button>
          <button onClick={onSignUp} className="btn-primary" style={{padding:"7px 16px"}}>Get started →</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{padding:"130px 40px 80px",maxWidth:900,margin:"0 auto",textAlign:"center"}} className="fade">
        <div className="tag" style={{background:"#f0fdf4",borderColor:"#bbf7d0",color:"#166534",marginBottom:20}}>
          <span style={{width:6,height:6,borderRadius:99,background:"#22c55e",display:"inline-block"}}></span>
          Built for wholesale route distributors
        </div>
        <h1 style={{fontSize:"clamp(36px,5.5vw,68px)",fontWeight:600,lineHeight:1.1,letterSpacing:"-.03em",marginBottom:20,fontFamily:"'Cal Sans','Inter',sans-serif"}}>
          The operating system<br/>for your distribution business
        </h1>
        <p style={{fontSize:"clamp(15px,2vw,18px)",color:"#666",maxWidth:540,margin:"0 auto 36px",lineHeight:1.7}}>
          Drivers. Invoices. Customers. WhatsApp. Tax reports. All in one platform — built exclusively for wholesale wholesale distribution.
        </p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onSignUp} className="btn-primary" style={{fontSize:15,padding:"13px 28px"}}>Start free trial →</button>
          <button onClick={onLogin} className="btn-ghost" style={{fontSize:15,padding:"13px 28px"}}>Sign in</button>
        </div>
        <p style={{marginTop:14,fontSize:13,color:"#999"}}>14-day free trial · No credit card · Cancel anytime</p>

        {/* Stats bar */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,marginTop:60,background:"#e5e5e5",borderRadius:12,overflow:"hidden",border:"1px solid #e5e5e5"}}>
          {[["14 days","free trial"],["$0","setup fee"],["98%","WhatsApp open rate"],["24/7","uptime"]].map(([n,l])=>(
            <div key={l} style={{padding:"20px 16px",textAlign:"center",background:"#fff"}}>
              <div style={{fontWeight:600,fontSize:22,letterSpacing:"-.02em",marginBottom:2}}>{n}</div>
              <div style={{fontSize:12,color:"#999",textTransform:"uppercase",letterSpacing:".05em"}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{padding:"60px 40px",maxWidth:1060,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div className="tag" style={{background:"#f5f3ff",borderColor:"#ddd6fe",color:"#5b21b6",marginBottom:14}}>Features</div>
          <h2 style={{fontSize:"clamp(24px,3.5vw,40px)",fontWeight:600,letterSpacing:"-.025em",fontFamily:"'Cal Sans','Inter',sans-serif"}}>Everything your operation needs</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:16}}>
          {[
            {icon:"🚚",t:"Driver route management",d:"Load trucks, track inventory, record sales on the go. Works offline — no internet required in the field."},
            {icon:"📱",t:"WhatsApp OTP login",d:"Drivers and customers log in with a WhatsApp code. No passwords to remember or reset ever again."},
            {icon:"📄",t:"Smart invoicing",d:"Auto-carry previous balances. Product tax calculated automatically per state. PDF download and email included."},
            {icon:"💬",t:"WhatsApp invoice delivery",d:"Send invoices instantly via WhatsApp after every sale. 98% open rate vs 20% for email."},
            {icon:"💰",t:"Bulk payment recording",d:"Pay multiple invoices at once. Cash, check, card, Zelle — all tracked with running balance per customer."},
            {icon:"🧾",t:"Product tax compliance engine",d:"Per-state tax rates, product-specific tax calculation, full IRS reporting. Built-in — no accountant required."},
            {icon:"📊",t:"Settlement & analytics",d:"Daily driver settlement reports, P&L breakdowns, cash hand-in reconciliation for end of day."},
            {icon:"🏪",t:"Customer portal",d:"Customers place orders, view invoices, and pay online from any device — no app download needed."},
            {icon:"🔒",t:"Returned check system",d:"Flag returned checks, auto-apply penalties, upload photos, track history per customer."},
          ].map((f,i)=>(
            <div key={i} style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:22,transition:"border-color .15s"}}>
              <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
              <div style={{fontWeight:600,fontSize:15,marginBottom:6,letterSpacing:"-.01em"}}>{f.t}</div>
              <div style={{fontSize:13,color:"#777",lineHeight:1.6}}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{padding:"60px 40px",maxWidth:1060,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div className="tag" style={{background:"#fff7ed",borderColor:"#fed7aa",color:"#9a3412",marginBottom:14}}>Pricing</div>
          <h2 style={{fontSize:"clamp(24px,3.5vw,40px)",fontWeight:600,letterSpacing:"-.025em",marginBottom:12,fontFamily:"'Cal Sans','Inter',sans-serif"}}>Simple, flat monthly pricing</h2>
          <p style={{color:"#666",fontSize:15,marginBottom:24}}>All plans include a 14-day free trial. No credit card required.</p>
          {/* Toggle */}
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"#f5f5f5",padding:"4px 4px 4px 14px",borderRadius:99,border:"1px solid #e5e5e5"}}>
            <span style={{fontSize:13,color:annual?"#999":"#111",fontWeight:500}}>Monthly</span>
            <button onClick={()=>setAnnual(a=>!a)} style={{width:40,height:22,borderRadius:99,border:"none",background:annual?"#111":"#ddd",cursor:"pointer",position:"relative",transition:"background .2s"}}>
              <span style={{position:"absolute",top:2,left:annual?20:2,width:18,height:18,background:"#fff",borderRadius:99,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
            </button>
            <span style={{fontSize:13,color:annual?"#111":"#999",fontWeight:500}}>Annual</span>
            {annual&&<span style={{background:"#dcfce7",color:"#166534",fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:99,border:"1px solid #bbf7d0"}}>2 months free</span>}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
          {PLANS.map((plan,i)=>(
            <div key={i} style={{background:"#fff",border:`1px solid ${plan.popular?"#111":"#e5e5e5"}`,borderRadius:14,padding:28,position:"relative",boxShadow:plan.popular?"0 0 0 1px #111":""}}>
              {plan.popular&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"#111",color:"#fff",fontSize:11,fontWeight:600,padding:"3px 12px",borderRadius:99,whiteSpace:"nowrap",letterSpacing:".03em"}}>MOST POPULAR</div>}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:99,background:plan.color}}/>
                <div style={{fontWeight:600,fontSize:16,letterSpacing:"-.01em"}}>{plan.name}</div>
              </div>
              <div style={{marginBottom:16}}>
                <span style={{fontWeight:600,fontSize:40,letterSpacing:"-.03em"}}>${annual?Math.round(plan.price*10):plan.price}</span>
                <span style={{color:"#999",fontSize:14}}>{annual?"/year":"/month"}</span>
                {annual&&<div style={{fontSize:12,color:"#059669",marginTop:2}}>Save ${plan.price*2}/year</div>}
              </div>
              <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
                {[plan.trucks,plan.customers].map((l,j)=>(
                  <span key={j} style={{fontSize:12,background:"#f5f5f5",padding:"3px 10px",borderRadius:99,color:"#555"}}>{l}</span>
                ))}
              </div>
              <button onClick={onSignUp} style={{width:"100%",padding:"12px",borderRadius:8,border:"1px solid",borderColor:plan.popular?"#111":"#e5e5e5",background:plan.popular?"#111":"transparent",color:plan.popular?"#fff":"#111",fontWeight:500,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginBottom:20,transition:"all .15s"}}>
                Start free trial →
              </button>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {plan.features.map((f,j)=>(
                  <div key={j} className="feature-check">
                    <span style={{color:"#059669",flexShrink:0}}>✓</span>{f}
                  </div>
                ))}
                {plan.locked.map((f,j)=>(
                  <div key={j} className="feature-lock">
                    <span style={{color:"#ddd",flexShrink:0}}>✕</span>{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{padding:"60px 40px 80px",maxWidth:680,margin:"0 auto"}}>
        <h2 style={{fontSize:"clamp(22px,3vw,36px)",fontWeight:600,textAlign:"center",marginBottom:36,letterSpacing:"-.025em",fontFamily:"'Cal Sans','Inter',sans-serif"}}>Frequently asked questions</h2>
        {FAQS.map((f,i)=>(
          <div key={i} style={{borderBottom:"1px solid #e5e5e5"}}>
            <button onClick={()=>setFaq(faq===i?null:i)} style={{width:"100%",background:"none",border:"none",textAlign:"left",padding:"18px 0",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",fontSize:15,fontWeight:500,color:"#111",gap:16}}>
              {f.q}
              <span style={{fontSize:18,color:"#999",flexShrink:0,transition:"transform .2s",transform:faq===i?"rotate(45deg)":"none",display:"inline-block"}}>+</span>
            </button>
            {faq===i&&<div style={{paddingBottom:18,fontSize:14,color:"#666",lineHeight:1.7}}>{f.a}</div>}
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{padding:"0 40px 80px"}}>
        <div style={{maxWidth:700,margin:"0 auto",background:"#111",borderRadius:16,padding:"52px 40px",textAlign:"center"}}>
          <h2 style={{fontSize:"clamp(22px,3.5vw,40px)",fontWeight:600,color:"#fff",marginBottom:12,letterSpacing:"-.025em",fontFamily:"'Cal Sans','Inter',sans-serif"}}>Ready to modernize your operation?</h2>
          <p style={{color:"rgba(255,255,255,.6)",fontSize:15,marginBottom:28,lineHeight:1.6}}>Start your 14-day free trial today.<br/>No credit card required. Full Premium access from day one.</p>
          <button onClick={onSignUp} style={{background:"#fff",color:"#111",border:"none",borderRadius:8,padding:"14px 32px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Start free trial →</button>
          <p style={{marginTop:14,fontSize:12,color:"rgba(255,255,255,.4)"}}>Starter $199/mo · Standard $499/mo · Premium $899/mo</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:"1px solid #e5e5e5",padding:"24px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,maxWidth:1060,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,background:"#111",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:11}}>R</div>
          <span style={{fontWeight:600,fontSize:14,letterSpacing:"-.01em"}}>VitalWaveOne</span>
        </div>
        <div style={{fontSize:13,color:"#999"}}>© {new Date().getFullYear()} VitalWaveOne. Built for wholesale distributors.</div>
        <div style={{display:"flex",gap:20}}>
          {["Privacy","Terms","Contact"].map(l=>(
            <a key={l} href="#" style={{fontSize:13,color:"#999"}}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
