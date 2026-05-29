// -----------------------------------------------------------------------------
// VitalWaveOne LLC - Customer Order Portal
// * New customers: register (business name, owner, email, phone, address)
// * Existing customers: find store -> order instantly
// * Live inventory from Supabase
// * Proforma invoice PDF on submission
// * Admin sees & approves in VitalWaveOne
// -----------------------------------------------------------------------------

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./db";

// CRITICAL SECURITY FIXES
import { sanitizeRegistrationData, validateWalkInRegistration } from "./utils/registrationSecurity.js";

// -- STYLES --------------------------------------------------------------------
const GS = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#f8f5f0;font-family:'Inter',sans-serif;}
      .portal{min-height:100vh;background:#f8f5f0;}
      input,select,textarea{font-family:'Inter',sans-serif;transition:all .15s;}
      input:focus,select:focus,textarea:focus{outline:none;}
      @keyframes fu{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
      @keyframes pu{0%,100%{opacity:1;}50%{opacity:.4;}}
      .pu{animation:pu 1.5s infinite;}
      .fu{animation:fu .28s ease forwards;}
      @keyframes spin{to{transform:rotate(360deg);}}
      .sp{animation:spin .7s linear infinite;display:inline-block;}
      .btn-primary{background:#0a1628;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-family:'Inter',sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;}
      .btn-primary:hover{background:#162540;transform:translateY(-1px);box-shadow:0 6px 20px #0a162830;}
      .btn-primary:disabled{background:#8a9ab0;cursor:not-allowed;transform:none;}
      .btn-amber{background:#f59e0b;color:#0a0e18;border:none;border-radius:10px;padding:13px 28px;font-family:'Inter',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px;}
      .btn-amber:hover{background:#fbbf24;transform:translateY(-1px);box-shadow:0 6px 20px #f59e0b40;}
      .btn-amber:disabled{background:#c4a050;cursor:not-allowed;transform:none;}
      .btn-ghost{background:transparent;color:#6b7280;border:1.5px solid #d1d5db;border-radius:10px;padding:11px 20px;font-family:'Inter',sans-serif;font-weight:500;font-size:13px;cursor:pointer;transition:all .2s;}
      .btn-ghost:hover{border-color:#0a1628;color:#0a1628;}
      .field{display:flex;flex-direction:column;gap:5px;}
      .field label{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;}
      .field input,.field select,.field textarea{background:#fff;border:1.5px solid #e5e7eb;border-radius:9px;padding:11px 14px;font-size:14px;color:#111;width:100%;}
      .field input:focus,.field select:focus,.field textarea:focus{border-color:#0a1628;box-shadow:0 0 0 3px #0a162814;}
      .field input.error,.field select.error{border-color:#ef4444;}
      .card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 2px 16px #00000008;}
      .step-dot{width:10px;height:10px;border-radius:50%;transition:all .3s;}
      .cat-tag{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.05em;display:inline-block;}
      .qty-btn{width:32px;height:32px;border-radius:50%;border:1.5px solid #e5e7eb;background:#fff;color:#374151;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;transition:all .15s;}
      .qty-btn:hover{background:#0a1628;color:#fff;border-color:#0a1628;}
      .prod-row{border-bottom:1px solid #f3f4f6;transition:background .1s;}
      .prod-row:hover{background:#fafafa;}
      .prod-row:last-child{border-bottom:none;}
      @media(max-width:640px){
        .grid2{grid-template-columns:1fr!important;}
        .hide-sm{display:none!important;}
        .prod-grid{grid-template-columns:50px 1fr 80px 110px!important;}
      }
      @media print{
        .no-print{display:none!important;}
        body{background:#fff!important;}
        .inv{box-shadow:none!important;}
      }
    `}</style>
  </>
);

// -- HELPERS -------------------------------------------------------------------
const fmt = n => `$${Number(n||0).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2,9).toUpperCase();
const nowStr = () => new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
const fmtDate = s => {
  if(s?.created_at){const d=new Date(s.created_at);if(!isNaN(d))return d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});}
  return s?.date||"â€”";
};
const CAT_COLORS = {Beverage:"#0ea5e9",Tobacco:"#8b5cf6",Snack:"#f59e0b",Health:"#10b981",Misc:"#6b7280",Other:"#64748b"};
const catC = c => CAT_COLORS[c]||"#64748b";

// -- TAX HELPER (tobacco/nicotine/vape only) ----------------------------------
const CARD_FEE = 3; // Card surcharge percentage
const TAXABLE_CATS_GLOBAL = ["tobacco","nicotine","cigarette","cigar","vape","hookah","chew","dip","snuff"];
const isTaxableProd=p=>{const c=(p?.cat||"").toLowerCase().trim(),n=(p?.name||"").toLowerCase().trim();return["tobacco","nicotine","cigarette","cigar","vape","hookah","chew","dip","snuff","smoke","eliquid","e-liquid","pod","disposable"].some(t=>c.includes(t)||n.includes(t));};
const calcItemTax = (p, qty, rate) => isTaxableProd(p) ? parseFloat(((p?.price||0)*qty*rate/100).toFixed(2)) : 0;
const calcOrderTax = (items, products, rate) => items.reduce((a,i)=>{
  const p = products.find(x=>x.id===i.pid);
  return a + calcItemTax(p, i.qty, rate);
}, 0);
// Parse custom prices stored in customer notes
const parseCustomPrices=cust=>{try{const m=(cust?.notes||"").match(/CUSTOM_PRICES:({.*?})/);return m?JSON.parse(m[1]):{};}catch{return{};}};
const getEffectivePrice=(cust,p)=>{if(!cust||!p)return p?.price||0;const cp=parseCustomPrices(cust);const custom=cp[p.id];return(custom&&parseFloat(custom)>0)?parseFloat(custom):(p?.price||0);};



// -- PROFORMA INVOICE ----------------------------------------------------------
const Invoice = ({order, products, co, stateTaxes, custState}) => {

  const stData = stateTaxes?.find(s=>s.id===(custState||"TX"));
  const stateRate = stData?.exempt ? 0 : parseFloat(stData?.rate||co?.tax_rate||0);
  const custObj = {notes: order.custNotes||""};
  const sub = order.items.reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return a+getEffectivePrice(custObj,p)*i.qty;}, 0);
  const taxAmt = parseFloat((order.items.reduce((a,i)=>{
    const p=products.find(x=>x.id===i.pid);
    return isTaxableProd(p)?a+getEffectivePrice(custObj,p)*i.qty:a;
  },0)*stateRate/100).toFixed(2));
  const total = sub+taxAmt;
  return (
    <div className="inv" style={{background:"#fff",fontFamily:"'Inter',sans-serif",borderRadius:14,overflow:"hidden",boxShadow:"0 4px 32px #00000012",maxWidth:760,margin:"0 auto"}}>
      {/* Header */}
      <div style={{background:"#0a1628",padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:600,color:"#f59e0b",letterSpacing:".12em",marginBottom:4}}>PROFORMA INVOICE</div>
          <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:28,color:"#fff",lineHeight:1}}>Order #{order.id}</div>
          <div style={{fontSize:11,color:"#4b6080",marginTop:8}}>{order.date}</div>
          <div style={{marginTop:10}}><span style={{background:"#f59e0b22",color:"#f59e0b",padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:".08em"}}>PENDING ADMIN APPROVAL</span></div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:16,color:"#fff"}}>{co?.name||"VitalWaveOne LLC"}</div>
          <div style={{fontSize:11,color:"#4b6080",lineHeight:1.9,marginTop:6}}>{co?.address}<br/>{co?.phone}<br/>{co?.email}</div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:"#f9f8f5",borderBottom:"1px solid #e5e7eb"}}>
        <div style={{padding:"18px 32px",borderRight:"1px solid #e5e7eb"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:".14em",marginBottom:8,textTransform:"uppercase"}}>Bill To</div>
          <div style={{fontWeight:700,fontSize:15,color:"#111"}}>{order.businessName}</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>{order.ownerName}</div>
          {order.address&&<div style={{fontSize:12,color:"#6b7280",marginTop:2,lineHeight:1.6}}>{order.address}</div>}
          {order.phone&&<div style={{fontSize:12,color:"#6b7280"}}>ðŸ“ž {order.phone}</div>}
          {order.email&&<div style={{fontSize:12,color:"#6b7280"}}>âœ‰ï¸ {order.email}</div>}
        </div>
        <div style={{padding:"18px 32px"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#9ca3af",letterSpacing:".14em",marginBottom:8,textTransform:"uppercase"}}>Order Details</div>
          {[["Order #",order.id],["Date",order.date],["Status","Pending Approval"],["Payment","Due on Delivery"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:12,color:"#9ca3af"}}>{l}</span>
              <span style={{fontSize:12,fontWeight:600,color:"#111"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div style={{padding:"20px 32px"}}>
        {order.notes&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#92400e"}}><strong>Note:</strong> {order.notes}</div>}
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#0a1628"}}>
              {["Stock #","SKU","Description","Category","Unit","Qty","Unit Price","Amount"].map(h=>(
                <th key={h} style={{padding:"9px 10px",fontSize:9,fontWeight:700,color:"#6b7280",letterSpacing:".08em",textTransform:"uppercase",textAlign:["Qty","Unit Price","Amount"].includes(h)?"right":"left"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item,i)=>{
              const p=products.find(x=>x.id===item.pid);
              return (
                <tr key={i} style={{borderBottom:"1px solid #f3f4f6",background:i%2?"#fafafa":"#fff"}}>
                  <td style={{padding:"10px 10px",fontSize:11,color:"#9ca3af",fontFamily:"monospace"}}>{p?.id||"â€”"}</td>
                  <td style={{padding:"10px 10px",fontSize:11,fontFamily:"monospace",fontWeight:600,color:"#374151"}}>{p?.sku||"â€”"}</td>
                  <td style={{padding:"10px 10px",fontSize:13,fontWeight:600,color:"#111"}}>{p?.name||item.name}</td>
                  <td style={{padding:"10px 10px"}}><span className="cat-tag" style={{background:catC(p?.cat)+"18",color:catC(p?.cat)}}>{p?.cat||"â€”"}</span></td>
                  <td style={{padding:"10px 10px",fontSize:11,color:"#6b7280"}}>{p?.unit||"â€”"}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontWeight:700,fontSize:14}}>{item.qty}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontSize:12,color:"#6b7280"}}>{fmt(getEffectivePrice(custObj,p))}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontWeight:700,fontSize:14}}>{fmt(item.qty*getEffectivePrice(custObj,p))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <div style={{width:280}}>
            {[["Subtotal",fmt(sub)],...(taxAmt>0?[["Tobacco/Vape Tax",fmt(taxAmt)]]:[])].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                <span style={{fontSize:13,color:"#6b7280"}}>{l}</span><span style={{fontSize:13}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"13px 0",borderTop:"2px solid #0a1628",marginTop:4}}>
              <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:18,color:"#0a1628"}}>Total Due</span>
              <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:24,color:"#f59e0b"}}>{fmt(total)}</span>
            </div>
          </div>
        </div>

        <div style={{marginTop:24,paddingTop:14,borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.7}}>This is a proforma invoice pending admin approval.<br/>A confirmed invoice will be issued upon delivery. Payment due on delivery.</div>
          <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:13,color:"#0a1628",opacity:.3}}>VitalWaveOne LLC</div>
        </div>
      </div>
    </div>
  );
};

// -- MAIN PORTAL ---------------------------------------------------------------
// -- DRIVER INVOICE VIEW -------------------------------------------------------
function DriverInvoiceView({sale, customers, products, co, driver, stateTaxes}){
  const cust = customers.find(c=>c.id===sale.cust_id);

  const stateId = sale.state||cust?.state||"";
  const stData = stateTaxes?.find(s=>s.id===stateId);
  const stateRate = stData?.exempt ? 0 : parseFloat(stData?.rate||co?.tax_rate||0);
  const sub = sale.total;
  const tax = parseFloat(((sale.items||[]).reduce((a,i)=>{
    const p=products.find(x=>x.id===i.pid);
    return isTaxableProd(p)?a+getEffectivePrice(cust,p)*i.qty:a;
  },0)*stateRate/100).toFixed(2));
  const penalty = parseFloat(sale.check_penalty_applied||0);
  const gt = sub+tax+parseFloat(sale.previous_balance||0);
  return(
    <div style={{fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:"#7c3aed",padding:"16px 20px",borderRadius:"8px 8px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{color:"#fff",fontWeight:800,fontSize:18}}>INVOICE <span style={{fontSize:13,fontWeight:400,color:"#ddd6fe"}}>#{sale.id}</span></div>
        <div style={{textAlign:"right",color:"#fff",fontSize:11}}>{co?.name}<br/>{co?.phone}</div>
      </div>
      <div style={{background:"#f9fafb",padding:"12px 20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,borderBottom:"1px solid #e5e7eb"}}>
        <div><div style={{fontSize:9,color:"#9ca3af",fontWeight:700,letterSpacing:".1em",marginBottom:3}}>BILL TO</div><div style={{fontWeight:700}}>{cust?.name}</div>{cust?.address&&<div style={{fontSize:11,color:"#6b7280"}}>{cust.address}</div>}{cust?.phone&&<div style={{fontSize:11,color:"#6b7280"}}>{cust.phone}</div>}</div>
        <div><div style={{fontSize:9,color:"#9ca3af",fontWeight:700,letterSpacing:".1em",marginBottom:3}}>DETAILS</div><div style={{fontWeight:700}}>{fmtDate(sale)}</div><div style={{fontSize:11,color:"#6b7280"}}>Driver: {driver}</div></div>
      </div>
      <div style={{padding:"12px 20px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}>
          <thead><tr>{["Product","Qty","Price","Total"].map(h=><th key={h} style={{textAlign:h==="Product"?"left":"right",padding:"6px 8px",fontSize:10,color:"#6b7280",fontWeight:700,borderBottom:"2px solid #111"}}>{h}</th>)}</tr></thead>
          <tbody>{(sale.items||[]).map((item,i)=>{const p=products.find(x=>x.id===item.pid);const ep=getEffectivePrice(cust,p);return(<tr key={i}>{[p?.name||item.name,item.qty,`$${ep.toFixed(2)}`,`$${(item.qty*ep).toFixed(2)}`].map((v,j)=><td key={j} style={{textAlign:j===0?"left":"right",padding:"8px",borderBottom:"1px solid #f3f4f6",fontSize:13,fontWeight:j===3?700:400}}>{v}</td>)}</tr>);})}</tbody>
        </table>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <div style={{width:220}}>
            {[["Subtotal",`$${sub.toFixed(2)}`],tax>0?["Tobacco/Vape Tax",`$${tax.toFixed(2)}`]:null,parseFloat(sale.previous_balance||0)>0?[penalty>0?`ðŸš¨ Returned Check Penalty`:`âš ï¸ Prev. Balance (${sale.previous_invoice_ids||""})`,`$${parseFloat(sale.previous_balance||0).toFixed(2)}`]:null].filter(Boolean).map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",background:l.includes("Prev")||l.includes("Penalty")?"#fef2f2":"transparent",margin:l.includes("Prev")||l.includes("Penalty")?"0 -4px":0,padding:l.includes("Prev")||l.includes("Penalty")?"5px 4px":"5px 0"}}><span style={{fontSize:12,color:l.includes("Prev")||l.includes("Penalty")?"#dc2626":"#6b7280",fontWeight:l.includes("Prev")||l.includes("Penalty")?700:400}}>{l}</span><span style={{fontSize:12,color:l.includes("Tax")?"#059669":l.includes("Prev")||l.includes("Penalty")?"#dc2626":"#212121",fontWeight:l.includes("Prev")||l.includes("Penalty")?700:400}}>{v}</span></div>)}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid #111"}}><span style={{fontWeight:800,fontSize:14}}>TOTAL DUE</span><span style={{fontWeight:900,fontSize:20,color:"#7c3aed"}}>${gt.toFixed(2)}</span></div>
          </div>
        </div>
        <div style={{marginTop:12,background:"#f9fafb",borderRadius:7,padding:"10px 12px",fontSize:11,color:"#6b7280"}}>
          Payment: Cash Â· Check Â· Money Order Â· Zelle (free) | Credit/Debit Card (+3%)
        </div>
      </div>
    </div>
  );
}

// -- DRIVER LOAD TAB -----------------------------------------------------------
function CustomerAccountView({selCust,supabase,co,setStep,products=[]}){
  const[acctData,setAcctData]=useState(null);
  const[acctLoading,setAcctLoading]=useState(true);
  const[viewInv,setViewInv]=useState(null); // selected invoice to view
  const[invPage,setInvPage]=useState(0);
  const INV_PER_PAGE=15;

  useEffect(()=>{
    db.from("sales").select("*").eq("cust_id",selCust.id).order("created_at",{ascending:false})
      .then(({data:invs})=>{
        db.from("payments").select("*").in("sale_id",(invs||[]).map(s=>s.id))
          .then(({data:pmts})=>{
            setAcctData({invoices:invs||[],payments:pmts||[]});
            setAcctLoading(false);
          });
      });
  },[selCust.id]);

  if(acctLoading)return<div style={{padding:60,textAlign:"center",color:"#9ca3af"}}>Loading your accountâ€¦</div>;

  const{invoices,payments}=acctData;
  const totalDue=invoices.filter(s=>!payments.find(p=>p.sale_id===s.id&&p.status==="paid")).reduce((a,s)=>a+parseFloat(s.total||0),0);
  const totalPaid=invoices.filter(s=>payments.find(p=>p.sale_id===s.id&&p.status==="paid")).reduce((a,s)=>a+parseFloat(s.total||0),0);
  const fmt=n=>`$${parseFloat(n||0).toFixed(2)}`;

  // Invoice detail view
  if(viewInv){
    const paid=payments.find(p=>p.sale_id===viewInv.id&&p.status==="paid");
    const prevBal=parseFloat(viewInv.previous_balance||0);
    const penalty=parseFloat(viewInv.check_penalty_applied||0);
    const itemsTotal=parseFloat(viewInv.total||0);
    const grandTotal=itemsTotal+prevBal;
    return(
      <div className="fu" style={{maxWidth:680,margin:"0 auto"}}>
        <button onClick={()=>setViewInv(null)} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:13,marginBottom:16,display:"flex",alignItems:"center",gap:6,padding:0}}>
          â† Back to My Account
        </button>

        {/* Invoice Header */}
        <div style={{background:"#0a1628",borderRadius:"10px 10px 0 0",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:"#fff"}}>INVOICE</div>
            <div style={{fontSize:12,color:"#4b6080",marginTop:2}}>#{viewInv.id}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{co?.name}</div>
            <div style={{fontSize:11,color:"#4b6080",marginTop:2}}>{co?.phone}</div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div style={{background:"#f9fafb",padding:"14px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,borderBottom:"1px solid #e5e7eb"}}>
          <div>
            <div style={{fontSize:9,color:"#9ca3af",fontWeight:700,letterSpacing:".1em",marginBottom:3}}>BILL TO</div>
            <div style={{fontWeight:700,fontSize:13}}>{selCust.name}</div>
            {selCust.address&&<div style={{fontSize:11,color:"#6b7280"}}>{selCust.address}</div>}
            {selCust.phone&&<div style={{fontSize:11,color:"#6b7280"}}>{selCust.phone}</div>}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:"#9ca3af",fontWeight:700,letterSpacing:".1em",marginBottom:3}}>DATE</div>
            <div style={{fontWeight:700,fontSize:13}}>{fmtDate(viewInv)}</div>
            <div style={{marginTop:8}}>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6,background:paid?"#f0fdf4":"#fef2f2",color:paid?"#065f46":"#dc2626"}}>
                {paid?"âœ“ PAID":"â³ UNPAID"}
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f3f4f6"}}>
              {["Product","Qty","Unit Price","Total"].map(h=>(
                <th key={h} style={{padding:"9px 14px",textAlign:h==="Product"?"left":"right",fontSize:10,fontWeight:700,color:"#6b7280"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(viewInv.items||[]).map((item,i)=>{
                const prod=products.find(p=>p.id===item.pid);
                const unitPrice=prod?.price||item.price||0;
                const lineTotal=item.qty*unitPrice;
                return(
                  <tr key={i} style={{borderBottom:"1px solid #f9fafb"}}>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:"#111"}}>{prod?.name||item.name||item.pid}</td>
                    <td style={{padding:"10px 14px",fontSize:13,textAlign:"right"}}>{item.qty}</td>
                    <td style={{padding:"10px 14px",fontSize:13,textAlign:"right",color:"#6b7280"}}>{fmt(unitPrice)}</td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,textAlign:"right"}}>{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{background:"#fff",padding:"16px 24px",borderRadius:"0 0 10px 10px",border:"1px solid #e5e7eb",borderTop:"none"}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <div style={{width:280}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6"}}>
                <span style={{fontSize:13,color:"#6b7280"}}>Subtotal</span>
                <span style={{fontSize:13,fontWeight:600}}>{fmt(itemsTotal)}</span>
              </div>
              {prevBal>0&&(
                <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6",background:"#fef2f2",margin:"0 -4px",padding:"6px 4px"}}>
                  <span style={{fontSize:13,color:"#dc2626",fontWeight:600}}>{penalty>0?"ðŸš¨ Returned Check Penalty":"âš ï¸ Previous Balance"}</span>
                  <span style={{fontSize:13,color:"#dc2626",fontWeight:700}}>{fmt(prevBal)}</span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid #0a1628",marginTop:4}}>
                <span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>TOTAL DUE</span>
                <span style={{fontWeight:900,fontSize:20,color:paid?"#059669":"#0a1628"}}>{fmt(grandTotal)}</span>
              </div>
              {paid&&<div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:7,padding:"8px 12px",fontSize:12,color:"#065f46",fontWeight:600,textAlign:"center"}}>
                âœ… Payment received â€” Thank you!
              </div>}
              {!paid&&<div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:7,padding:"8px 12px",fontSize:12,color:"#854d0e",fontWeight:600,textAlign:"center"}}>
                â³ Balance due â€” Please pay your driver or contact us
              </div>}
            </div>
          </div>
          <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid #f3f4f6",fontSize:11,color:"#9ca3af",textAlign:"center"}}>
            Questions? Call {co?.phone||"us"} Â· {co?.email||""}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div className="fu" style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:22,color:"#0a1628"}}>{selCust.name}</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{selCust.phone}{selCust.address?` Â· ${selCust.address}`:""}</div>
        </div>
        <button onClick={()=>setStep("custchoice")} style={{background:"none",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#6b7280",cursor:"pointer",fontWeight:600}}>â† Back</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[{l:"Total Invoices",v:invoices.length,c:"#7c3aed"},{l:"Amount Paid",v:fmt(totalPaid),c:"#059669"},{l:"Balance Due",v:fmt(totalDue),c:totalDue>0?"#dc2626":"#059669"}].map(k=>(
          <div key={k.l} style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:"1px solid #e5e7eb",textAlign:"center"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:k.c}}>{k.v}</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Returned Check Warning */}
      {(selCust?.notes||"").includes("RETURNED_CHECK:1")&&(
        <div style={{background:"#1a0000",border:"2px solid #dc2626",borderRadius:10,padding:"14px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:28,flexShrink:0}}>ðŸš¨</span>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#dc2626",marginBottom:4}}>RETURNED CHECK ON FILE</div>
            <div style={{fontSize:13,color:"#f87171",lineHeight:1.6}}>
              Your account has a returned check on file. A <strong style={{color:"#fbbf24"}}>${co?.check_penalty||50} penalty fee</strong> will be added to your next order if paying by check.<br/>
              Please contact us at <strong style={{color:"#fbbf24"}}>{co?.phone||"your driver"}</strong> to resolve this.
            </div>
          </div>
        </div>
      )}

      {invoices.length===0
        ?<div style={{background:"#fff",borderRadius:10,padding:40,textAlign:"center",color:"#9ca3af",border:"1px solid #e5e7eb"}}>
            <div style={{fontSize:32,marginBottom:8}}>ðŸ“‹</div>
            <div style={{fontWeight:600}}>No invoices yet</div>
          </div>
        :<div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e5e7eb"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:12,color:"#6b7280"}}>INVOICE HISTORY â€” tap an invoice to view details</div>
          {(()=>{
            const totalPages=Math.ceil(invoices.length/INV_PER_PAGE);
            const page=Math.min(invPage,Math.max(0,totalPages-1));
            const pageInvs=invoices.slice(page*INV_PER_PAGE,(page+1)*INV_PER_PAGE);
            return(<>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#0a1628",color:"#fff"}}>
                {["Invoice #","Date","Items","Total","Status",""].map(h=>(
                  <th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pageInvs.map(s=>{
                  const paid=payments.find(p=>p.sale_id===s.id&&p.status==="paid");
                  return(
                    <tr key={s.id} onClick={()=>setViewInv(s)} style={{borderBottom:"1px solid #f3f4f6",cursor:"pointer",transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                      onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                      <td style={{padding:"10px 14px",fontWeight:700,color:"#7c3aed",fontSize:12,textDecoration:"underline"}}>{s.id}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#6b7280"}}>{fmtDate(s)}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"#6b7280"}}>{(s.items||[]).length} item{(s.items||[]).length!==1?"s":""}</td>
                      <td style={{padding:"10px 14px",fontWeight:700,color:"#059669",fontSize:13}}>{fmt(parseFloat(s.total||0)+parseFloat(s.previous_balance||0))}</td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6,background:paid?"#f0fdf4":"#fef2f2",color:paid?"#065f46":"#dc2626"}}>
                          {paid?"âœ“ PAID":"UNPAID"}
                        </span>
                      </td>
                      <td style={{padding:"6px 10px"}} onClick={e=>e.stopPropagation()}>
                        <button onClick={async()=>{
                          const {jsPDF}=await import('jspdf');
                          const {default:html2canvas}=await import('html2canvas');
                          const el=document.createElement('div');
                          el.style.cssText='position:fixed;left:-9999px;top:0;width:794px;background:#fff;padding:28px;font-family:Inter,sans-serif;font-size:13px;';
                          const total=(parseFloat(s.total||0)+parseFloat(s.previous_balance||0)).toFixed(2);
                          el.innerHTML=`<div style="background:#0a1628;padding:16px 24px;margin:-28px -28px 20px;display:flex;justify-content:space-between;align-items:center"><div style="color:#fff;font-size:22px;font-weight:900;">INVOICE #${s.id}</div><div style="color:#94a3b8;font-size:11px;">${s.date}</div></div><div style="margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:8px"><div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">BILLED TO</div><div style="font-weight:700;color:#0a1628;">${selCust?.name||""}</div><div style="color:#6b7280;font-size:12px;">${selCust?.address||""}</div></div>${(s.items||[]).map(i=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6"><span>${i.pid}</span><span>Ã—${i.qty}</span></div>`).join("")}<div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #0a1628;margin-top:8px;font-weight:900;font-size:16px"><span>TOTAL DUE</span><span>$${total}</span></div><div style="margin-top:8px;padding:8px 12px;background:${paid?"#f0fdf4":"#fef9c3"};border-radius:6px;font-weight:700;color:${paid?"#065f46":"#854d0e"}">${paid?"âœ“ PAID":"â³ UNPAID â€” Balance Due: $${total}"}</div>`;
                          document.body.appendChild(el);
                          const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
                          document.body.removeChild(el);
                          const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
                          const w=pdf.internal.pageSize.getWidth();
                          pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w,(canvas.height*w)/canvas.width);
                          pdf.save(`Invoice-${s.id}.pdf`);
                        }} style={{background:"#f0fdf4",border:"1px solid #a7f3d0",color:"#065f46",borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>â¬‡ï¸ PDF</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages>1&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderTop:"1px solid #f3f4f6",background:"#fafafa",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:11,color:"#6b7280"}}>Showing {page*INV_PER_PAGE+1}â€“{Math.min((page+1)*INV_PER_PAGE,invoices.length)} of {invoices.length} invoices</div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>setInvPage(p=>p-1)} disabled={page===0} style={{padding:"4px 10px",fontSize:11,border:"1px solid #d1d5db",borderRadius:6,background:"#fff",cursor:page===0?"not-allowed":"pointer",color:page===0?"#9ca3af":"#374151"}}>â† Prev</button>
                {Array.from({length:totalPages},(_,i)=>i).filter(i=>i===0||i===totalPages-1||Math.abs(i-page)<=1).reduce((acc,i,idx,arr)=>{if(idx>0&&i-arr[idx-1]>1)acc.push("â€¦");acc.push(i);return acc;},[]).map((i,k)=>
                  i==="â€¦"?<span key={k} style={{fontSize:11,color:"#9ca3af",padding:"0 3px",lineHeight:"26px"}}>â€¦</span>:
                  <button key={k} onClick={()=>setInvPage(i)} style={{padding:"4px 8px",fontSize:11,minWidth:28,border:i===page?"none":"1px solid #e5e7eb",borderRadius:6,background:i===page?"#0a1628":"#fff",color:i===page?"#fff":"#374151",cursor:"pointer"}}>{i+1}</button>
                )}
                <button onClick={()=>setInvPage(p=>p+1)} disabled={page>=totalPages-1} style={{padding:"4px 10px",fontSize:11,border:"1px solid #d1d5db",borderRadius:6,background:"#fff",cursor:page>=totalPages-1?"not-allowed":"pointer",color:page>=totalPages-1?"#9ca3af":"#374151"}}>Next â†’</button>
              </div>
            </div>}
            </>);
          })()}
        </div>
      }

      {totalDue>0&&<div style={{marginTop:16,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:"#dc2626"}}>Outstanding Balance</div>
          <div style={{fontSize:12,color:"#991b1b",marginTop:2}}>Please contact your driver or call {co?.phone||"us"} to settle your account</div>
        </div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:24,color:"#dc2626"}}>${totalDue.toFixed(2)}</div>
      </div>}

      <button onClick={()=>setStep("custchoice")} style={{display:"block",width:"100%",marginTop:16,background:"#0a1628",color:"#fff",border:"none",borderRadius:9,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
        ðŸ›’ Place an Order
      </button>
    </div>
  );
}

function DriverRouteTab({driverData, setDriverData, setDriverTab, setDriverSaleCust}){
  const today=new Date().toLocaleDateString("en-US",{weekday:"long"}); // e.g. "Monday"
  const sched=useMemo(()=>{try{return JSON.parse(driverData.truck?.schedule||"{}");}catch{return{};}}, [driverData.truck?.schedule]);
  const stops=sched[today]||[];
  const customers=driverData.customers||[];
  const [checked,setChecked]=useState({}); // {cid: true} for visited stops

  const navToAddress=addr=>{
    if(!addr)return;
    const enc=encodeURIComponent(addr);
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
    window.open(isIOS?`maps://maps.apple.com/?q=${enc}`:`https://www.google.com/maps/search/?api=1&query=${enc}`,"_blank");
  };

  const visitedCount=Object.keys(checked).length;
  const totalStops=stops.length;

  if(totalStops===0) return(
    <div style={{padding:"40px 20px",textAlign:"center",color:"#9ca3af"}}>
      <div style={{fontSize:48,marginBottom:12}}>ðŸ“…</div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:6,color:"#374151"}}>No stops scheduled for today</div>
      <div style={{fontSize:13,color:"#9ca3af"}}>Today is {today}. Your admin hasn't assigned any stops for this day yet.</div>
    </div>
  );

  return(
    <div>
      {/* Header */}
      <div style={{background:"#0a1628",borderRadius:12,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,color:"#fff"}}>ðŸ“… Today's Route â€” {today}</div>
          <div style={{fontSize:12,color:"#4b6080",marginTop:2}}>{visitedCount} of {totalStops} stops visited</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:28,color:visitedCount===totalStops?"#10b981":"#f59e0b"}}>{visitedCount}/{totalStops}</div>
          <div style={{fontSize:10,color:"#4b6080"}}>completed</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:6,background:"#e5e7eb",borderRadius:3,overflow:"hidden",marginBottom:16}}>
        <div style={{height:"100%",width:`${totalStops>0?(visitedCount/totalStops)*100:0}%`,background:"#10b981",borderRadius:3,transition:"width .4s"}}/>
      </div>

      {/* Stops list */}
      {stops.map((s,idx)=>{
        const cust=customers.find(c=>c.id===s.cid);
        const isVisited=!!checked[s.cid];
        const isNext=!isVisited&&Object.keys(checked).length===idx;
        return(
          <div key={s.cid} style={{
            background:isVisited?"#f0fdf4":isNext?"#fffbeb":"#fff",
            border:`1.5px solid ${isVisited?"#a7f3d0":isNext?"#fde68a":"#e5e7eb"}`,
            borderRadius:12,padding:"14px 16px",marginBottom:10,
            opacity:isVisited?0.7:1,transition:"all .2s"
          }}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              {/* Stop number / check */}
              <button onClick={()=>setChecked(prev=>isVisited?Object.fromEntries(Object.entries(prev).filter(([k])=>k!==s.cid)):{...prev,[s.cid]:true})}
                style={{width:40,height:40,borderRadius:"50%",border:`2px solid ${isVisited?"#10b981":isNext?"#f59e0b":"#e5e7eb"}`,background:isVisited?"#10b981":isNext?"#fffbeb":"#f9fafb",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:isVisited?18:14,fontWeight:800,color:isVisited?"#fff":isNext?"#92400e":"#9ca3af",fontFamily:"'Barlow Condensed',sans-serif"}}>
                {isVisited?"âœ“":idx+1}
              </button>

              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:isVisited?"#6b7280":"#0a1628",textDecoration:isVisited?"line-through":"none"}}>{cust?.name||s.cid}</div>
                    {cust?.phone&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>ðŸ“ž {cust.phone}</div>}
                    {cust?.address&&<div style={{fontSize:11,color:"#9ca3af"}}>{cust.address}</div>}
                    {s.note&&<div style={{fontSize:11,color:"#f59e0b",marginTop:3,fontStyle:"italic"}}>ðŸ“ {s.note}</div>}
                    {isNext&&<div style={{fontSize:11,color:"#92400e",fontWeight:700,marginTop:4}}>â¬†ï¸ NEXT STOP</div>}
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    {cust?.address&&!isVisited&&(
                      <button onClick={()=>navToAddress(cust.address)}
                        style={{background:"#0a1628",color:"#fff",border:"none",borderRadius:7,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                        ðŸ—º Navigate
                      </button>
                    )}
                    {!isVisited&&(
                      <button onClick={()=>{setDriverSaleCust(s.cid);setDriverTab("sell");}}
                        style={{background:"#059669",color:"#fff",border:"none",borderRadius:7,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                        ðŸ’³ Sell
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {visitedCount===totalStops&&totalStops>0&&(
        <div style={{background:"#f0fdf4",border:"2px solid #10b981",borderRadius:12,padding:"20px",textAlign:"center",marginTop:8}}>
          <div style={{fontSize:36,marginBottom:8}}>ðŸŽ‰</div>
          <div style={{fontWeight:800,fontSize:16,color:"#065f46"}}>All stops completed!</div>
          <div style={{fontSize:13,color:"#047857",marginTop:4}}>Great work today. Don't forget to submit your expenses.</div>
        </div>
      )}
    </div>
  );
}

function DriverStatsTab({driverData, products}){
  const sales=driverData.sales||[];
  const now=new Date();
  const fmt=n=>`$${Number(n||0).toFixed(2)}`;

  const todaySales=sales.filter(s=>new Date(s.created_at).toDateString()===now.toDateString());
  const monthSales=sales.filter(s=>{const d=new Date(s.created_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const paidSales=sales.filter(s=>s._paid);
  const collectionRate=sales.length>0?((paidSales.length/sales.length)*100).toFixed(0):0;

  // Top products sold
  const prodQtys={};
  sales.forEach(s=>(s.items||[]).forEach(it=>{prodQtys[it.pid]=(prodQtys[it.pid]||0)+(it.qty||0);}));
  const topProds=Object.entries(prodQtys).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Top customers by revenue
  const custRevs={};
  sales.forEach(s=>{custRevs[s.cust_id]=(custRevs[s.cust_id]||0)+parseFloat(s.total||0);});
  const topCusts=Object.entries(custRevs).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Daily revenue last 7 days
  const last7=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=d.toDateString();
    return{label:d.toLocaleDateString("en-US",{weekday:"short"}),rev:sales.filter(s=>new Date(s.created_at).toDateString()===ds).reduce((a,s)=>a+parseFloat(s.total||0),0)};
  }).reverse();
  const maxRev=Math.max(...last7.map(d=>d.rev),1);

  return(
    <div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:20,color:"#0a1628",marginBottom:14}}>ðŸ“Š My Performance</div>

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {l:"Today's Sales",v:todaySales.length,sub:fmt(todaySales.reduce((a,s)=>a+parseFloat(s.total||0),0)),c:"#7c3aed"},
          {l:"This Month",v:monthSales.length,sub:fmt(monthSales.reduce((a,s)=>a+parseFloat(s.total||0),0)),c:"#059669"},
          {l:"Collection Rate",v:`${collectionRate}%`,sub:`${paidSales.length} of ${sales.length} paid`,c:collectionRate>=80?"#059669":"#dc2626"},
          {l:"Total Customers",v:driverData.customers?.length||0,sub:"on your route",c:"#0ea5e9"},
        ].map(k=>(
          <div key={k.l} style={{background:"#fff",borderRadius:10,padding:"14px",border:"1px solid #e5e7eb"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:24,color:k.c}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginTop:2}}>{k.l}</div>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue last 7 days bar chart */}
      <div style={{background:"#fff",borderRadius:10,padding:"14px",border:"1px solid #e5e7eb",marginBottom:14}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,color:"#6b7280",marginBottom:12}}>REVENUE â€” LAST 7 DAYS</div>
        <div style={{display:"flex",gap:6,alignItems:"flex-end",height:80}}>
          {last7.map((d,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{fontSize:9,color:"#9ca3af",fontWeight:600}}>{d.rev>0?`$${Math.round(d.rev)}`:""}</div>
              <div style={{width:"100%",background:d.rev>0?"#7c3aed":"#f3f4f6",borderRadius:"4px 4px 0 0",height:`${(d.rev/maxRev)*64}px`,minHeight:d.rev>0?4:0,transition:"height .3s"}}/>
              <div style={{fontSize:9,color:"#9ca3af",fontWeight:600}}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      {topProds.length>0&&(
        <div style={{background:"#fff",borderRadius:10,padding:"14px",border:"1px solid #e5e7eb",marginBottom:14}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,color:"#6b7280",marginBottom:10}}>TOP PRODUCTS SOLD</div>
          {topProds.map(([pid,qty],i)=>{
            const p=products.find(x=>x.id===pid);
            const maxQ=topProds[0][1];
            return p?(
              <div key={pid} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:600,color:"#0a1628"}}>{i+1}. {p.name}</span>
                  <span style={{color:"#7c3aed",fontWeight:700}}>{qty} units</span>
                </div>
                <div style={{height:5,background:"#f3f4f6",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(qty/maxQ)*100}%`,background:"#7c3aed",borderRadius:3}}/>
                </div>
              </div>
            ):null;
          })}
        </div>
      )}

      {/* Top customers */}
      {topCusts.length>0&&(
        <div style={{background:"#fff",borderRadius:10,padding:"14px",border:"1px solid #e5e7eb"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,color:"#6b7280",marginBottom:10}}>TOP CUSTOMERS BY REVENUE</div>
          {topCusts.map(([cid,rev],i)=>{
            const c=driverData.customers?.find(x=>x.id===cid);
            return c?(
              <div key={cid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                <div style={{fontSize:12,fontWeight:600,color:"#0a1628"}}>{i+1}. {c.name}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:14,color:"#059669"}}>{fmt(rev)}</div>
              </div>
            ):null;
          })}
        </div>
      )}
    </div>
  );
}

function DriverLoadTab({driverData, setDriverData, products: productsProp, supabase, co}){
  // Use products stored in driverData (fetched fresh at login) â€” fall back to prop
  const products = (driverData.products && driverData.products.length > 0) ? driverData.products : productsProp;
  const [items, setItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const uid = ()=>Math.random().toString(36).slice(2,8).toUpperCase();
  const isLocked = driverData.truck?.locked;

  const confirmLoad = async () => {
    if(isLocked) return setMsg({t:"error",m:"Your truck is locked by admin. Contact your manager."});
    const loadItems = products.filter(p=>items[p.id]>0).map(p=>({pid:p.id,qty:parseInt(items[p.id])}));
    if(!loadItems.length) return setMsg({t:"error",m:"Add at least one product"});

    // Hard validation - ensure no item exceeds shelf stock
    const overLimit = loadItems.find(i=>{
      const p=products.find(x=>x.id===i.pid);
      return !p || i.qty > p.shelf;
    });
    if(overLimit){
      const p=products.find(x=>x.id===overLimit.pid);
      return setMsg({t:"error",m:`[!]ï¸ Only ${p?.shelf} of "${p?.name}" available on shelf  -  can't load ${overLimit.qty}`});
    }

    setSaving(true);
    try{
      const nl = {id:"LD-"+uid(),truck_id:driverData.truck?.id,date:new Date().toLocaleDateString(),items:loadItems,status:"out",created_at:new Date().toISOString()};
      const {error} = await db.from("loads").insert(nl);
      if(error) throw error;
      await Promise.all(loadItems.map(item=>{
        const p=products.find(x=>x.id===item.pid);
        return p?db.from("products").update({shelf:Math.max(0,p.shelf-item.qty)}).eq("id",p.id):Promise.resolve();
      }));
      setDriverData(prev=>({...prev,activeLoad:nl}));
      setMsg({t:"success",m:`[OK] Loaded ${loadItems.reduce((a,i)=>a+i.qty,0)} units! Ready to sell.`});
      setItems({});
    }catch(e){setMsg({t:"error",m:e.message});}
    setSaving(false);
  };

  if(isLocked) return(
    <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:"24px",textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:10}}>ðŸ”’</div>
      <div style={{fontWeight:700,fontSize:16,color:"#dc2626",marginBottom:8}}>Truck Locked</div>
      <div style={{fontSize:13,color:"#6b7280"}}>Your truck has been locked by admin. Contact your manager to unlock.</div>
    </div>
  );

  return(
    <div>
      <div style={{fontWeight:700,fontSize:14,color:"#0a1628",marginBottom:4}}>ðŸ“¦ Load Your Truck</div>
      <div style={{fontSize:12,color:"#6b7280",marginBottom:14}}>Enter quantities you are loading onto the truck</div>
      {driverData.activeLoad&&<div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#0369a1"}}>
        âœ… Active load exists. You can reload additional products below.
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {products.filter(p=>p.shelf>0).map(p=>(
          <div key={p.id} className="card" style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}>{p.name}</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>In warehouse: <span style={{color:"#059669",fontWeight:700}}>{p.shelf}</span> Â· ${p.price.toFixed(2)} std</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setItems(prev=>({...prev,[p.id]:Math.max(0,(prev[p.id]||0)-1)}))} style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>-</button>
              <input type="number" min="0" max={p.shelf} value={items[p.id]||""} placeholder="0"
                onChange={e=>setItems(prev=>({...prev,[p.id]:Math.min(p.shelf,Math.max(0,parseInt(e.target.value)||0))}))}
                style={{width:54,textAlign:"center",border:`1.5px solid ${items[p.id]>0?"#0ea5e9":"#e5e7eb"}`,borderRadius:7,padding:"5px",fontSize:13,fontWeight:700}}/>
              <button onClick={()=>setItems(prev=>({...prev,[p.id]:Math.min(p.shelf,(prev[p.id]||0)+1)}))} style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
          </div>
        ))}
        {products.filter(p=>p.shelf>0).length===0&&<div style={{textAlign:"center",padding:"20px",color:"#9ca3af",fontSize:13}}>No products in warehouse</div>}
      </div>
      {msg&&<div style={{background:msg.t==="success"?"#f0fdf4":"#fef2f2",border:`1px solid ${msg.t==="success"?"#a7f3d0":"#fecaca"}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:msg.t==="success"?"#065f46":"#dc2626",marginBottom:12}}>{msg.m}</div>}
      <button onClick={confirmLoad} disabled={saving} style={{width:"100%",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
        {saving?"Loading...":"ðŸ“¦ Confirm Load"}
      </button>
    </div>
  );
}


// -- DRIVER SELL TAB -----------------------------------------------------------
function DriverSellTab({driverData, setDriverData, products: productsProp, supabase, co, initCust, setDriverSaleCust, payForm, setPayForm, paymentSaving, setPaymentSaving, collectPayment, createdSale, setCreatedSale, showPayment, setShowPayment}){
  const products = (driverData.products && driverData.products.length > 0) ? driverData.products : productsProp;
  const [selCust, setSelCust] = useState(initCust||"");
  const [items, setItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [sellUnits, setSellUnits] = useState({}); // {pid: true} = sell by unit instead of case
  const [editInv, setEditInv] = useState(null);
  const [freshCustState, setFreshCustState] = useState("");
  const uid = ()=>Math.random().toString(36).slice(2,8).toUpperCase();
  const fmt = v=>`$${parseFloat(v||0).toFixed(2)}`;

  const [custUnpaidBalance, setCustUnpaidBalance] = useState(0);
  const [custUnpaidInvs, setCustUnpaidInvs] = useState([]);
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCust, setNewCust] = useState({name:"",address:"",city:"",zip:"",state:"",phone:"",email:""});
  const [newCustSaving, setNewCustSaving] = useState(false);
  const [newCustMsg, setNewCustMsg] = useState(null);
  const [stripeLink, setStripeLink] = useState("");

  useEffect(()=>{
    // Fetch fresh to ensure we have the latest Stripe payment link
    db.from("company").select("stripe_payment_link").single()
      .then(({data})=>{
        const link = data?.stripe_payment_link || co?.stripe_payment_link || driverData.co?.stripe_payment_link || "";
        if(link) setStripeLink(link);
      });
  },[co?.stripe_payment_link, driverData.co?.stripe_payment_link]);
  const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

  const handleCustSelect = async (custId) => {
    setSelCust(custId);
    setCustUnpaidBalance(0);
    setCustUnpaidInvs([]);
    if(!custId){setFreshCustState("");return;}
    // Fetch fresh state and unpaid balances in parallel
    const [{data:custData}, {data:unpaidPmts}, {data:custSales}] = await Promise.all([
      db.from("customers").select("state").eq("id",custId).single(),
      db.from("payments").select("sale_id,status").eq("status","unpaid"),
      db.from("sales").select("id,total,state,items,date").eq("cust_id",custId),
    ]);
    setFreshCustState(custData?.state||"");
    if(custSales && unpaidPmts){
      const unpaidIds = new Set(unpaidPmts.map(p=>p.sale_id));
      const unpaidSales = custSales.filter(s=>unpaidIds.has(s.id));
      // Also include sales with no payment record at all
      const {data:allPmts} = await db.from("payments").select("sale_id").in("sale_id", custSales.map(s=>s.id));
      const paidSaleIds = new Set((allPmts||[]).filter(p=>p.status!=="unpaid").map(p=>p.sale_id));
      const noPmtSales = custSales.filter(s=>!(allPmts||[]).find(p=>p.sale_id===s.id));
      const allUnpaid = [...unpaidSales, ...noPmtSales].filter((s,i,arr)=>arr.findIndex(x=>x.id===s.id)===i);
      // CORRECT: only sum new charges per invoice (s.total + tax)
      // previous_balance is already embedded in each invoice for display â€” do NOT add it again
      const totalUnpaid = allUnpaid.reduce((a,s)=>{
        const st = driverData?.stateTaxes?.find(x=>x.id===(s.state||""));
        const rate = st?.exempt ? 0 : parseFloat(st?.rate||0);
        const taxable = (s.items||[]).reduce((b,i)=>{
          const p = products.find(x=>x.id===i.pid);
          return isTaxableProd(p) ? b+(p?.price||0)*i.qty : b;
        }, 0);
        const tax = parseFloat((taxable*rate/100).toFixed(2));
        return a + s.total + tax; // NO previous_balance â€” avoids double counting
      }, 0);
      setCustUnpaidBalance(parseFloat(totalUnpaid.toFixed(2)));
      setCustUnpaidInvs(allUnpaid);
    }
  };

  const loadedItems = driverData.activeLoad?.items||[];
  const availableProducts = products.filter(p=>loadedItems.find(i=>i.pid===p.id));

  // Get all load IDs for this truck's active loads
  const allLoadIds = driverData.activeLoad?._allLoadIds || (driverData.activeLoad ? [driverData.activeLoad.id] : []);

  // Calculate sold from ALL active loads
  const soldMap = driverData.sales
    .filter(s=>allLoadIds.includes(s.load_id))
    .reduce((acc,s)=>{
      (s.items||[]).forEach(i=>{ acc[i.pid]=(acc[i.pid]||0)+i.qty; });
      return acc;
    },{});

  // Remaining on truck - never negative
  const getRemainingQty = (pid) => {
    const loaded = loadedItems.find(i=>i.pid===pid)?.qty||0;
    const sold   = soldMap[pid]||0;
    return Math.max(0, loaded - sold);
  };

  // Split into available (remaining > 0) and out-of-stock on truck
  const inStockProducts  = availableProducts.filter(p=>getRemainingQty(p.id)>0);
  const outStockProducts = availableProducts.filter(p=>getRemainingQty(p.id)===0);
  // Use freshly fetched customer state for accurate tax
  const selCustObj = driverData.customers.find(c=>c.id===selCust);
  const custStateId = freshCustState || selCustObj?.state || driverData.truck?.state || "";
  const custStateTax = driverData.stateTaxes?.find(s=>s.id===custStateId);
  const driverTaxRate = custStateTax?.exempt ? 0 : parseFloat(custStateTax?.rate||0);
  const sub = inStockProducts.reduce((a,p)=>{
    const qty=items[p.id]||0;if(!qty)return a;
    const caseQty=parseInt(p.case_qty)||1;
    const sellByUnit=sellUnits[p.id]||false;
    const price=sellByUnit?(getEffectivePrice(selCustObj,p)/caseQty):getEffectivePrice(selCustObj,p);
    return a+price*qty;
  },0);
  const hasTaxableItems = inStockProducts.some(p=>isTaxableProd(p)&&(items[p.id]||0)>0);
  const tax = parseFloat((inStockProducts.reduce((a,p)=>{
    const qty=items[p.id]||0;if(!qty||!isTaxableProd(p))return a;
    const caseQty=parseInt(p.case_qty)||1;
    const sellByUnit=sellUnits[p.id]||false;
    const price=sellByUnit?(getEffectivePrice(selCustObj,p)/caseQty):getEffectivePrice(selCustObj,p);
    return a+price*qty;
  },0)*driverTaxRate/100).toFixed(2));
  const gt = sub+tax;
  const profit = inStockProducts.reduce((a,p)=>{
    const qty=items[p.id]||0;if(!qty)return a;
    const caseQty=parseInt(p.case_qty)||1;
    const sellByUnit=sellUnits[p.id]||false;
    const price=sellByUnit?(getEffectivePrice(selCustObj,p)/caseQty):getEffectivePrice(selCustObj,p);
    const cost=sellByUnit?((p.cost||0)/caseQty):(p.cost||0);
    return a+(price-cost)*qty;
  },0);

  const handleScan = (code) => {
    // Check in-stock truck products first
    const match = inStockProducts.find(p=>p.sku?.toLowerCase()===code.toLowerCase()||p.id?.toLowerCase()===code.toLowerCase());
    if(match){
      const remaining = getRemainingQty(match.id);
      const current = items[match.id]||0;
      if(current >= remaining) return setMsg({t:"error",m:`[!]ï¸ Only ${remaining} of "${match.name}" left on truck`});
      setItems(prev=>({...prev,[match.id]:current+1}));
      setMsg({t:"success",m:`[OK] ${match.name} added`});
    } else {
      // Check if it's out-of-stock on truck but available on shelf
      const outMatch = outStockProducts.find(p=>p.sku?.toLowerCase()===code.toLowerCase()||p.id?.toLowerCase()===code.toLowerCase());
      if(outMatch) setMsg({t:"error",m:`ðŸš« "${outMatch.name}" is sold out on your truck. ${outMatch.shelf>0?`${outMatch.shelf} units available on warehouse shelf.`:"None on shelf either."}`});
      else setMsg({t:"error",m:`No product found: ${code}`});
    }
    setScanInput("");
    setTimeout(()=>setMsg(null),4000);
  };

  const confirmSale = async () => {
    if(!selCust) return setMsg({t:"error",m:"Select a customer"});
    const saleItems = inStockProducts.filter(p=>(items[p.id]||0)>0).map(p=>({pid:p.id,qty:items[p.id]}));
    if(!saleItems.length) return setMsg({t:"error",m:"Add at least one product"});

    // Hard server-side guard - ensure no qty exceeds what's actually on the truck
    const overLimit = saleItems.find(i=>i.qty > getRemainingQty(i.pid));
    if(overLimit){
      const p = products.find(x=>x.id===overLimit.pid);
      return setMsg({t:"error",m:`[!]ï¸ Only ${getRemainingQty(overLimit.pid)} of "${p?.name}" remaining on truck. Adjust quantity.`});
    }

    setSaving(true);
    try{
      const saleTotal = parseFloat(sub.toFixed(2));
      // previous_balance = true running total of all unpaid (new charges only, no double count)
      const prevBal = parseFloat(custUnpaidBalance.toFixed(2));

      const ns = {
        load_id:driverData.activeLoad?.id,
        truck_id:driverData.truck?.id,
        cust_id:selCust,
        state:freshCustState||selCustObj?.state||driverData.truck?.state||"",
        date:nowStr(),
        items:saleItems,
        total:saleTotal,
        profit:parseFloat(profit.toFixed(2)),
        previous_balance:prevBal,
        previous_invoice_ids:prevBal>0?custUnpaidInvs.map(s=>s.id).join(","):"",
        check_penalty_applied: 0,
        created_at:new Date().toISOString()
      };

      if(!navigator.onLine){
        // Save offline draft
        const draftId="DRAFT-"+Math.random().toString(36).slice(2,8).toUpperCase();
        const draft={...ns,id:draftId,_draftId:draftId,_truckId:driverData.truck?.id,_offline:true};
        addDraft(draft);
        setDriverData(prev=>({...prev,sales:[draft,...prev.sales]}));
        const fakeCreatedSale={...draft,id:draftId};
        setCreatedSale(fakeCreatedSale);
        setShowPayment(true);
        setItems({});setSelCust("");setFreshCustState("");
        if(setDriverSaleCust)setDriverSaleCust(null);
        setMsg({t:"success",m:`ðŸ“µ Sale saved offline (${draftId}) â€” will sync when online`});
      } else {
        const {data:seqData} = await db.rpc("next_invoice_number");
        const invId = "INV-" + String(seqData||1).padStart(4,"0");
        // SECURITY FIX: Add company_id for tenant isolation
        const saleRecord={...ns,id:invId,company_id:co?.id};
        await db.from("sales").insert(saleRecord);
        await db.from("payments").insert({sale_id:saleRecord.id,status:"unpaid"});
        setDriverData(prev=>({...prev,sales:[saleRecord,...prev.sales]}));
        setCreatedSale(saleRecord);
        setShowPayment(true);
        setItems({});setSelCust("");setFreshCustState("");
        if(setDriverSaleCust)setDriverSaleCust(null);
        // Auto-WhatsApp invoice if enabled
        if(co?.whatsapp_invoices&&co?.meta_phone_id&&co?.meta_token){
          const cust=(driverData.customers||[]).find(c=>c.id===saleRecord.cust_id);
          const phone=(cust?.phone||"").replace(/\D/g,"");
          if(phone.length>=10){
            const to=phone.length===10?"1"+phone:phone;
            const portalUrl=`${co?.portal_url||window.location.origin}/?invoice=${saleRecord.id}`;
            fetch("/api/functions/send-whatsapp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
              to,phone_number_id:co.meta_phone_id,access_token:co.meta_token,
              template_name:co.meta_template||"invoice_notification",
              params:[cust.name,saleRecord.id,saleRecord.total.toFixed(2),portalUrl],
            })}).catch(()=>{});
          }
        }
      }
    }catch(e){setMsg({t:"error",m:e.message});}
    setSaving(false);
  };

  // Payment Collection Modal
  if(showPayment && createdSale){
    const saleTax = (() => {
      const st = driverData.stateTaxes?.find(s=>s.id===(createdSale.state||""));
      const rate = st?.exempt ? 0 : parseFloat(st?.rate||0);
      if(!rate) return 0;
      const taxable = (createdSale.items||[]).reduce((a,i)=>{
        const p = products.find(x=>x.id===i.pid);
        return isTaxableProd(p) ? a+(p?.price||0)*i.qty : a;
      }, 0);
      return parseFloat((taxable*rate/100).toFixed(2));
    })();
    const gt = parseFloat((createdSale.total+saleTax).toFixed(2));
    const hasRc = (driverData.customers||[]).find(c=>c.id===createdSale.cust_id);
    const driverRcFlag = (hasRc?.notes||"").includes("RETURNED_CHECK:1");
    const DRIVER_RC_FEE = parseFloat(co?.check_penalty||50);
    // Penalty is already saved on the sale â€” read from record, always show on invoice
    const driverCheckPenalty = parseFloat(createdSale.check_penalty_applied||0);
    const cardTotal = parseFloat(((gt+driverCheckPenalty)*(1+CARD_FEE/100)).toFixed(2));
    const methods = [
      {id:"cash",label:"ðŸ’µ Cash",color:"#059669",note:"No surcharge"},
      {id:"check",label:"ðŸ§¾ Check",color:"#0369a1",note:driverRcFlag?`âš ï¸ Returned check on file`:"No surcharge"},
      {id:"money_order",label:"ðŸ“® Money Order",color:"#7c3aed",note:"No surcharge"},
      {id:"zelle",label:"âš¡ Zelle",color:"#6366f1",note:"No surcharge"},
      {id:"card",label:"ðŸ’³ Card",color:"#dc2626",note:`+${CARD_FEE}% surcharge = $${cardTotal.toFixed(2)}`},
    ];
    return(
      <div style={{fontFamily:"'Inter',sans-serif"}}>
        {/* Invoice Summary */}
        <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"#065f46",marginBottom:6}}>âœ… Invoice {createdSale.id} Created!</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280"}}>
            <span>Subtotal</span><span>${createdSale.total.toFixed(2)}</span>
          </div>
          {saleTax>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#059669"}}>
            <span>Tobacco/Vape Tax</span><span>${saleTax.toFixed(2)}</span>
          </div>}
          {parseFloat(createdSale.previous_balance||0)>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#dc2626",borderTop:"1px dashed #fecaca",marginTop:4,paddingTop:4}}>
            <span>{driverCheckPenalty>0?"ðŸš¨ Returned Check Penalty":`âš ï¸ Previous Balance (${createdSale.previous_invoice_ids||""})`}</span>
            <span style={{fontWeight:700}}>${parseFloat(createdSale.previous_balance||0).toFixed(2)}</span>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:800,color:"#0a1628",borderTop:"1px solid #d1fae5",marginTop:6,paddingTop:6}}>
            <span>TOTAL DUE (Cash/Zelle)</span>
            <span>${(gt+parseFloat(createdSale.previous_balance||0)).toFixed(2)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#dc2626",marginTop:3}}>
            <span>TOTAL DUE (Card +{CARD_FEE}%)</span>
            <span>${(parseFloat(((gt+parseFloat(createdSale.previous_balance||0))*(1+CARD_FEE/100)).toFixed(2)))}</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={{fontWeight:700,fontSize:13,color:"#0a1628",marginBottom:10}}>ðŸ’° Collect Payment</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {methods.map(m=>(
            <button key={m.id} onClick={()=>setPayForm(p=>({...p,method:m.id}))}
              style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${payForm.method===m.id?m.color:"#e5e7eb"}`,background:payForm.method===m.id?m.color+"15":"#fff",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Inter',sans-serif"}}>
              <span style={{fontWeight:600,fontSize:13,color:payForm.method===m.id?m.color:"#212121"}}>{m.label}</span>
              <span style={{fontSize:11,color:payForm.method===m.id?m.color:"#9ca3af"}}>{m.note}</span>
            </button>
          ))}
        </div>

        {/* Method-specific fields */}
        {payForm.method==="check"&&<div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>CHECK NUMBER</label>
          <input value={payForm.checkNum} onChange={e=>setPayForm(p=>({...p,checkNum:e.target.value}))}
            placeholder="e.g. 1042" style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,boxSizing:"border-box"}}/>
        </div>}
        {payForm.method==="zelle"&&<div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>ZELLE REFERENCE</label>
          <input value={payForm.zelleRef} onChange={e=>setPayForm(p=>({...p,zelleRef:e.target.value}))}
            placeholder="Transaction ref or phone" style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,boxSizing:"border-box"}}/>
        </div>}
        {payForm.method==="money_order"&&<div style={{marginBottom:12}}>
          <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>MONEY ORDER #</label>
          <input value={payForm.checkNum} onChange={e=>setPayForm(p=>({...p,checkNum:e.target.value}))}
            placeholder="Money order number" style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,boxSizing:"border-box"}}/>
        </div>}
        {payForm.method==="card"&&<div style={{marginBottom:12}}>
          <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"16px",textAlign:"center"}}>
            <div style={{fontWeight:700,fontSize:13,color:"#7c3aed",marginBottom:4}}>ðŸ’³ Card Payment via QR</div>
            <div style={{fontSize:11,color:"#6b7280",marginBottom:12}}>Customer scans QR â†’ pays on their phone</div>
            {stripeLink?(
              <>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(stripeLink)}`}
                  alt="Stripe Payment QR"
                  style={{width:200,height:200,borderRadius:8,border:"3px solid #7c3aed"}}
                />
                <div style={{marginTop:10,background:"#faf5ff",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#7c3aed",fontWeight:700}}>
                  Amount to collect: ${(()=>{
                    const st=driverData.stateTaxes?.find(x=>x.id===(createdSale.state||""));
                    const rate=st?.exempt?0:parseFloat(st?.rate||0);
                    const taxable=(createdSale.items||[]).reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?a+(p?.price||0)*i.qty:a;},0);
                    const tax=parseFloat((taxable*rate/100).toFixed(2));
                    const gt=createdSale.total+tax;
                    return parseFloat((gt*(1+CARD_FEE/100)).toFixed(2)).toFixed(2);
                  })()} (incl. {CARD_FEE}% card fee)
                </div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:6}}>Tell customer to enter exact amount when paying</div>
                <button onClick={()=>collectPayment(createdSale,"card")} disabled={paymentSaving}
                  style={{width:"100%",marginTop:12,padding:"11px",background:"#059669",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                  âœ… Confirm Card Payment Received
                </button>
              </>
            ):(
              <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"12px",fontSize:12,color:"#854d0e"}}>
                â³ Loading payment link...<br/>
                If this persists, ask admin to set <strong>Settings â†’ Stripe Payment Link</strong>
              </div>
            )}
          </div>
        </div>}

        {/* Notes */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>NOTES (optional)</label>
          <input value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))}
            placeholder="Any notes..." style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,boxSizing:"border-box"}}/>
        </div>

        {/* Action Buttons */}
        <div style={{display:"flex",gap:8}}>
          {payForm.method!=="card"&&<button onClick={()=>collectPayment(createdSale,payForm.method)} disabled={paymentSaving}
            style={{flex:1,padding:"13px",background:"#059669",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            {paymentSaving?"Saving...":"âœ… Confirm Payment"}
          </button>}
          <button onClick={()=>{setShowPayment(false);setCreatedSale(null);setMsg({t:"success",m:`Invoice ${createdSale.id} saved  -  collect payment later`});}}
            style={{flex:payForm.method==="card"?1:0,padding:"13px 16px",background:"#f9fafb",color:"#6b7280",border:"1px solid #e5e7eb",borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            ðŸ’¾ Collect Later
          </button>
        </div>
      </div>
    );
  }

  if(!driverData.activeLoad) return(
    <div className="card" style={{padding:24,textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:12}}>ðŸŸ¡</div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Truck Not Loaded</div>
      <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>You need to load your truck before making sales</div>
    </div>
  );

  const createNewCustomer = async () => {
    const required = [
      [newCust.name.trim(), "Shop / Business name is required"],
      [newCust.phone.trim(), "Phone number is required"],
      [newCust.email.trim(), "Email is required"],
      [newCust.address.trim(), "Street address is required"],
      [newCust.city.trim(), "City is required"],
      [newCust.zip.trim(), "ZIP code is required"],
      [newCust.state, "State is required"],
    ];
    for(const [val, msg] of required){
      if(!val) return setNewCustMsg({t:"error",m:msg});
    }
    setNewCustSaving(true);
    try{
      const id = "C"+Math.random().toString(36).slice(2,8).toUpperCase();
      const fullAddress = `${newCust.address.trim()}, ${newCust.city.trim()}, ${newCust.state} ${newCust.zip.trim()}`;
      const rec = {
        id,
        name: newCust.name.trim(),
        address: fullAddress,
        phone: newCust.phone.trim(),
        email: newCust.email.trim(),
        state: newCust.state,
        truck_id: driverData.truck?.id,
        notes: `Created by driver ${driverData.truck?.driver} on ${new Date().toLocaleDateString()}`,
      };
      const {error} = await db.from("customers").insert(rec);
      if(error) throw error;
      setDriverData(prev=>({...prev, customers:[...prev.customers, rec]}));
      await handleCustSelect(id);
      setShowNewCust(false);
      setNewCust({name:"",address:"",city:"",zip:"",state:"",phone:"",email:""});
      setNewCustMsg(null);
    }catch(e){ setNewCustMsg({t:"error",m:e.message}); }
    setNewCustSaving(false);
  };

  return(
    <div>
      <div style={{fontWeight:700,fontSize:14,color:"#0a1628",marginBottom:14}}>ðŸ’³ Record Sale</div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:".08em",display:"block",marginBottom:4}}>CUSTOMER</label>
        <select value={selCust} onChange={e=>handleCustSelect(e.target.value)} style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}>
          <option value="">â€” Select customer â€”</option>
          {driverData.customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* New Customer Button */}
        <button onClick={()=>{setShowNewCust(!showNewCust);setNewCustMsg(null);}}
          style={{marginTop:8,width:"100%",padding:"9px",background:showNewCust?"#f3f4f6":"#0a1628",color:showNewCust?"#6b7280":"#fff",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          {showNewCust?"âœ• Cancel":"âž• New Customer â€” Register New Station"}
        </button>

        {/* New Customer Form */}
        {showNewCust&&<div style={{marginTop:10,background:"#f9fafb",border:"1.5px solid #7c3aed",borderRadius:12,padding:"16px"}}>
          <div style={{fontWeight:700,fontSize:13,color:"#7c3aed",marginBottom:12}}>ðŸª New Customer Registration</div>

          {[
            {label:"Shop / Business Name *",key:"name",placeholder:"e.g. Corner Gas Station",type:"text"},
            {label:"Phone Number *",key:"phone",placeholder:"e.g. 3175096262",type:"tel"},
            {label:"Email *",key:"email",placeholder:"e.g. shop@email.com",type:"email"},
            {label:"Street Address *",key:"address",placeholder:"e.g. 123 Main Street",type:"text"},
            {label:"City *",key:"city",placeholder:"e.g. Indianapolis",type:"text"},
          ].map(f=>(
            <div key={f.key} style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>{f.label}</label>
              <input
                type={f.type}
                value={newCust[f.key]}
                onChange={e=>setNewCust(p=>({...p,[f.key]:e.target.value}))}
                placeholder={f.placeholder}
                style={{width:"100%",border:`1.5px solid ${newCust[f.key]?"#7c3aed":"#e5e7eb"}`,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",boxSizing:"border-box"}}
              />
            </div>
          ))}

          {/* ZIP + State row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>ZIP Code *</label>
              <input
                type="text" maxLength={10}
                value={newCust.zip}
                onChange={e=>setNewCust(p=>({...p,zip:e.target.value.replace(/[^0-9-]/g,"")}))}
                placeholder="e.g. 46201"
                style={{width:"100%",border:`1.5px solid ${newCust.zip?"#7c3aed":"#e5e7eb"}`,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",boxSizing:"border-box"}}
              />
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>State *</label>
              <select value={newCust.state} onChange={e=>setNewCust(p=>({...p,state:e.target.value}))}
                style={{width:"100%",border:`1.5px solid ${newCust.state?"#7c3aed":"#e5e7eb"}`,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                <option value="">â€” State â€”</option>
                {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Tax info for selected state */}
          {newCust.state&&(()=>{
            const st = driverData.stateTaxes?.find(x=>x.id===newCust.state);
            return st ? (
              <div style={{background:st.exempt?"#f0fdf4":"#fef9c3",border:`1px solid ${st.exempt?"#a7f3d0":"#fde68a"}`,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11}}>
                {st.exempt
                  ?<span style={{color:"#065f46"}}>âœ… {newCust.state} â€” Tax Exempt</span>
                  :<span style={{color:"#854d0e"}}>ðŸ› {newCust.state} â€” {st.rate}% tobacco/vape tax applies</span>
                }
              </div>
            ) : (
              <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11,color:"#9ca3af"}}>
                â„¹ï¸ {newCust.state} â€” No tax rate configured yet
              </div>
            );
          })()}

          {newCustMsg&&<div style={{background:newCustMsg.t==="success"?"#f0fdf4":"#fef2f2",border:`1px solid ${newCustMsg.t==="success"?"#a7f3d0":"#fecaca"}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:newCustMsg.t==="success"?"#065f46":"#dc2626",marginBottom:10}}>{newCustMsg.m}</div>}

          <button onClick={createNewCustomer} disabled={newCustSaving}
            style={{width:"100%",padding:"12px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            {newCustSaving?"Creating Account...":"âœ… Create Account & Select"}
          </button>
        </div>}
        {/* Unpaid balance warning */}
        {/* Returned check warning */}
        {selCustObj&&(selCustObj.notes||"").includes("RETURNED_CHECK:1")&&<div style={{marginTop:8,background:"#1a0505",border:"2px solid #dc2626",borderRadius:10,padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24,flexShrink:0}}>ðŸš¨</span>
            <div>
              <div style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:14,color:"#dc2626",marginBottom:3}}>RETURNED CHECK ON FILE</div>
              <div style={{fontSize:12,color:"#f87171",lineHeight:1.6}}>A <strong style={{color:"#fbbf24"}}>${co?.check_penalty||50} penalty fee</strong> will be added if this customer pays by check. Cash, Zelle, or card recommended.</div>
            </div>
          </div>
        </div>}
        {custUnpaidBalance>0&&<div style={{marginTop:8,background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#854d0e",marginBottom:4}}>âš ï¸ Outstanding Balance</div>
          {custUnpaidInvs.map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#92400e",marginBottom:2}}>
              <span>{s.id} Â· {fmtDate(s)}</span>
              <span style={{fontWeight:700}}>${s.total.toFixed(2)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,color:"#854d0e",borderTop:"1px solid #fde68a",marginTop:4,paddingTop:4}}>
            <span>Total Outstanding</span>
            <span>${custUnpaidBalance.toFixed(2)}</span>
          </div>
          <div style={{fontSize:10,color:"#92400e",marginTop:4}}>This balance will be added to the new invoice</div>
        </div>}
        {selCustObj?.credit_limit>0&&(()=>{
          const limit=parseFloat(selCustObj.credit_limit);
          const pct=Math.min(100,(custUnpaidBalance/limit)*100);
          const over=custUnpaidBalance>=limit;
          return(
            <div style={{marginTop:8,background:over?"#1a0505":"#0d1f0d",border:`2px solid ${over?"#dc2626":"#a7f3d0"}`,borderRadius:8,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontWeight:700,fontSize:12,color:over?"#dc2626":"#10b981"}}>{over?"ðŸ”´ CREDIT LIMIT EXCEEDED":"ðŸ’³ Credit Limit"}</span>
                <span style={{fontSize:11,color:over?"#f87171":"#6ee7b7"}}>${custUnpaidBalance.toFixed(2)} / ${limit.toFixed(2)}</span>
              </div>
              <div style={{height:5,background:"#374151",borderRadius:3,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",width:`${pct}%`,background:over?"#dc2626":"#10b981",borderRadius:3,transition:"width .3s"}}/>
              </div>
              {over&&<div style={{fontSize:11,color:"#f87171",fontWeight:600}}>âš ï¸ Contact admin before selling to this customer</div>}
            </div>
          );
        })()}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        <button onClick={()=>setScanning(false)} style={{flex:1,padding:"8px",borderRadius:7,border:`1.5px solid ${!scanning?"#0ea5e9":"#e5e7eb"}`,background:!scanning?"#f0f9ff":"#fff",color:!scanning?"#0ea5e9":"#6b7280",fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:"'Inter',sans-serif"}}>ðŸ“‹ Manual</button>
        <button onClick={()=>{setScanning(true);setScanInput("");}} style={{flex:1,padding:"8px",borderRadius:7,border:`1.5px solid ${scanning?"#0ea5e9":"#e5e7eb"}`,background:scanning?"#f0f9ff":"#fff",color:scanning?"#0ea5e9":"#6b7280",fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:"'Inter',sans-serif"}}>ðŸ“· Scan</button>
      </div>
      {scanning&&<div style={{background:"#f0f9ff",border:"2px solid #0ea5e9",borderRadius:10,padding:"12px",marginBottom:12}}>
        <div id="driver-qr-reader" style={{width:"100%",borderRadius:7,overflow:"hidden",background:"#000",minHeight:160,marginBottom:10}}></div>
        <div style={{display:"flex",gap:8}}>
          <input value={scanInput} onChange={e=>setScanInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleScan(scanInput)} placeholder="Type SKU or scan..." style={{flex:1,border:"1.5px solid #bae6fd",borderRadius:7,padding:"8px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}/>
          <button onClick={()=>handleScan(scanInput)} style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Add</button>
        </div>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
        {/* â”€â”€ IN-STOCK PRODUCTS â”€â”€ */}
        {inStockProducts.map(p=>{
          const remaining = getRemainingQty(p.id);
          const loaded = loadedItems.find(i=>i.pid===p.id)?.qty||0;
          const sold = soldMap[p.id]||0;
          const qty = items[p.id]||0;
          const nearLimit = qty >= remaining && remaining > 0;
          const caseQty = parseInt(p.case_qty)||1;
          const sellByUnit = sellUnits[p.id]||false;
          const unitPrice = caseQty>1?(getEffectivePrice(selCustObj,p)/caseQty):getEffectivePrice(selCustObj,p);
          const effectiveQty = sellByUnit ? qty : qty; // qty is always in display units
          const lineTotal = sellByUnit ? qty*unitPrice : qty*getEffectivePrice(selCustObj,p);
          return(
            <div key={p.id} className="card" style={{padding:"10px 14px",border:`1.5px solid ${qty>0?"#0ea5e9":"#e5e7eb"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{(()=>{const ep=getEffectivePrice(selCustObj,p);const isC=ep!==p.price;return<>{isC?<span style={{color:"#7c3aed",fontWeight:700}}>{fmt(ep)} <span style={{fontSize:9,background:"#ede9fe",borderRadius:3,padding:"1px 4px"}}>CUSTOM</span> <span style={{textDecoration:"line-through",color:"#9ca3af",fontWeight:400}}>{fmt(p.price)}</span></span>:<span>{fmt(p.price)}</span>} Â· {isTaxableProd(p)?<span style={{color:"#7c3aed"}}>taxable</span>:"no tax"}</>;})()}</div>
                  {caseQty>1&&(
                    <div style={{display:"flex",gap:6,marginTop:4}}>
                      <button onClick={()=>setSellUnits(prev=>({...prev,[p.id]:false}))}
                        style={{padding:"2px 8px",borderRadius:5,border:`1px solid ${!sellByUnit?"#0ea5e9":"#e5e7eb"}`,background:!sellByUnit?"#f0f9ff":"#fff",fontSize:10,fontWeight:700,color:!sellByUnit?"#0ea5e9":"#9ca3af",cursor:"pointer"}}>
                        ðŸ“¦ Case ({fmt(getEffectivePrice(selCustObj,p))})
                      </button>
                      <button onClick={()=>setSellUnits(prev=>({...prev,[p.id]:true}))}
                        style={{padding:"2px 8px",borderRadius:5,border:`1px solid ${sellByUnit?"#7c3aed":"#e5e7eb"}`,background:sellByUnit?"#f5f3ff":"#fff",fontSize:10,fontWeight:700,color:sellByUnit?"#7c3aed":"#9ca3af",cursor:"pointer"}}>
                        ðŸ”¢ Unit ({fmt(unitPrice)}/ea)
                      </button>
                    </div>
                  )}
                  <div style={{fontSize:11,marginTop:3,display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span style={{color:remaining<=3?"#f59e0b":"#059669",fontWeight:700}}>ðŸšš {remaining} on truck{remaining<=3?" âš ï¸":""}</span>
                    <span style={{color:"#9ca3af"}}>{loaded} loaded Â· {sold} sold</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <button onClick={()=>setItems(prev=>({...prev,[p.id]:Math.max(0,(prev[p.id]||0)-1)}))}
                    style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>âˆ’</button>
                  <input type="number" min="0" max={sellByUnit?remaining*caseQty:remaining} value={qty||""} placeholder="0"
                    onChange={e=>setItems(prev=>({...prev,[p.id]:Math.min(sellByUnit?remaining*caseQty:remaining,Math.max(0,parseInt(e.target.value)||0))}))}
                    style={{width:48,textAlign:"center",border:`1.5px solid ${qty>0?"#0ea5e9":"#e5e7eb"}`,borderRadius:6,padding:"5px",fontSize:13,fontWeight:700}}/>
                  <button onClick={()=>setItems(prev=>({...prev,[p.id]:Math.min(sellByUnit?remaining*caseQty:remaining,(prev[p.id]||0)+1)}))}
                    disabled={qty>=(sellByUnit?remaining*caseQty:remaining)}
                    style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #e5e7eb",background:qty>=(sellByUnit?remaining*caseQty:remaining)?"#f9fafb":"#fff",cursor:qty>=(sellByUnit?remaining*caseQty:remaining)?"not-allowed":"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",color:qty>=(sellByUnit?remaining*caseQty:remaining)?"#d1d5db":"#212121"}}>+</button>
                </div>
              </div>
              {qty>0&&<div style={{fontSize:11,color:"#0ea5e9",marginTop:4,textAlign:"right",fontWeight:600}}>
                {sellByUnit?`${qty} unit${qty!==1?"s":""} @ ${fmt(unitPrice)}/ea = `:""}
                {fmt(lineTotal)}{isTaxableProd(p)?<span style={{color:"#059669"}}> +tax</span>:""}
                {sellByUnit&&caseQty>1&&<span style={{color:"#9ca3af",fontSize:10}}> ({(qty/caseQty).toFixed(1)} cases)</span>}
              </div>}
              {nearLimit&&qty>0&&!sellByUnit&&<div style={{fontSize:10,color:"#f59e0b",marginTop:2,textAlign:"right",fontWeight:700}}>âš ï¸ At truck limit â€” {remaining} max</div>}
            </div>
          );
        })}

        {/* â”€â”€ OUT-OF-STOCK ON TRUCK â”€â”€ */}
        {outStockProducts.length>0&&(
          <div style={{marginTop:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{height:1,flex:1,background:"#fecaca"}}/>
              <span style={{fontSize:10,fontWeight:700,color:"#dc2626",letterSpacing:".08em",whiteSpace:"nowrap"}}>ðŸš« SOLD OUT ON TRUCK</span>
              <div style={{height:1,flex:1,background:"#fecaca"}}/>
            </div>
            {outStockProducts.map(p=>(
              <div key={p.id} className="card" style={{padding:"10px 14px",border:"1.5px solid #fecaca",background:"#fff5f5",marginBottom:6,opacity:0.85}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:"#374151"}}>{p.name}</div>
                    <div style={{fontSize:11,marginTop:3,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{color:"#dc2626",fontWeight:700}}>ðŸšš 0 on truck</span>
                      {p.shelf>0
                        ?<span style={{background:"#f0fdf4",border:"1px solid #a7f3d0",color:"#065f46",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>ðŸ“¦ {p.shelf} on warehouse shelf</span>
                        :<span style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>ðŸ“¦ None on shelf either</span>
                      }
                    </div>
                  </div>
                  <span style={{fontSize:10,color:"#dc2626",fontWeight:700,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,padding:"3px 8px",whiteSpace:"nowrap"}}>OUT ON TRUCK</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {gt>0&&<div style={{background:"#f9fafb",borderRadius:8,padding:"12px 14px",marginBottom:12}}>
        {[["Subtotal",fmt(sub),""],hasTaxableItems&&tax>0?[`Tobacco/Vape Tax   -   ${custStateId} (${driverTaxRate}%)`,fmt(tax),"#059669"]:null,custUnpaidBalance>0?["âš ï¸ Previous Balance",fmt(custUnpaidBalance),"#dc2626"]:null,["Grand Total",fmt(gt+custUnpaidBalance),"#0ea5e9"],["Your Profit",fmt(profit),"#059669"]].filter(Boolean).map(([l,v,c])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:12,color:"#6b7280"}}>{l}</span>
            <span style={{fontWeight:700,fontSize:l==="Grand Total"?16:13,color:c||"#212121"}}>{v}</span>
          </div>
        ))}
      </div>}
      {msg&&<div style={{background:msg.t==="success"?"#f0fdf4":"#fef2f2",border:`1px solid ${msg.t==="success"?"#a7f3d0":"#fecaca"}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:msg.t==="success"?"#065f46":"#dc2626",marginBottom:12}}>{msg.m}</div>}
      <button onClick={confirmSale} disabled={saving} style={{width:"100%",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
        {saving?"Creating Invoiceâ€¦":"âœ“ Confirm Sale & Create Invoice"}
      </button>
    </div>
  );
}

// -- DRIVER WALK-IN TAB --------------------------------------------------------
function DriverWalkInTab({driverData, setDriverData, products: productsProp, supabase, initCust, setDriverViewInv=()=>{}}){
  const products = (driverData.products && driverData.products.length > 0) ? driverData.products : productsProp;
  const uid2 = ()=>Math.random().toString(36).slice(2,9).toUpperCase();
  const fmt2 = n=>`$${Number(n||0).toFixed(2)}`;
  const stateTaxes = driverData.stateTaxes||[];
  const customers  = driverData.customers||[];

  const [wiView,    setWiView]    = useState("sale"); // "sale" | "history"
  const [wiCust,    setWiCust]    = useState(initCust||"");
  const [wiSearch,  setWiSearch]  = useState("");
  const [wiItems,   setWiItems]   = useState({});
  const [wiSaving,  setWiSaving]  = useState(false);
  const [wiMsg,     setWiMsg]     = useState(null);
  const [wiPay,     setWiPay]     = useState("cash");
  const [wiCheck,   setWiCheck]   = useState("");
  const [wiZelle,   setWiZelle]   = useState("");
  const [wiPrevBal, setWiPrevBal] = useState(0);
  const [wiPrevInvs,setWiPrevInvs]= useState([]);
  const [wiCatFilter,setWiCatFilter]=useState("All");
  const [wiReceiptFile,setWiReceiptFile]=useState(null);
  const [wiReceiptUrl,setWiReceiptUrl]=useState("");

  // History
  const [wiSales,   setWiSales]   = useState([]);
  const [wiPayments,setWiPayments]= useState([]);
  const [wiHistLoading,setWiHistLoading]=useState(false);
  const [wiHistSearch, setWiHistSearch] = useState("");
  const [wiHistPage,   setWiHistPage]   = useState(0);
  const WI_HIST_PER_PAGE = 10;

  // Amendment
  const [amendSale, setAmendSale] = useState(null);   // sale being amended
  const [amendItems,setAmendItems]= useState({});      // {pid: qty}
  const [amendSaving,setAmendSaving]=useState(false);
  const [amendMsg,  setAmendMsg]  = useState(null);

  const wiCustObj = customers.find(c=>c.id===wiCust);
  const wiHasReturnedCheck = wiCustObj&&(wiCustObj.notes||"").includes("RETURNED_CHECK:1");
  const RETURNED_CHECK_FEE = parseFloat(driverData.co?.check_penalty||50);

  // Auto-load balance + history when customer is pre-set
  useEffect(()=>{ if(initCust){ handleWiCust(initCust); loadHistory(initCust); } },[initCust]);

  const loadHistory = async(cid)=>{
    if(!cid) return;
    setWiHistLoading(true);
    const [{data:s},{data:p}] = await Promise.all([
      db.from("sales").select("*").eq("cust_id",cid).order("created_at",{ascending:false}),
      db.from("payments").select("*"),
    ]);
    setWiSales(s||[]);
    setWiPayments(p||[]);
    setWiHistLoading(false);
  };

  // Shelf products only
  const shelfProds = products.filter(p=>p.shelf>0);
  const cats = ["All",...new Set(shelfProds.map(p=>p.cat).filter(Boolean))];
  const filtered = shelfProds.filter(p=>{
    if(wiCatFilter!=="All"&&p.cat!==wiCatFilter) return false;
    if(wiSearch&&!p.name.toLowerCase().includes(wiSearch.toLowerCase())&&!p.sku?.toLowerCase().includes(wiSearch.toLowerCase())) return false;
    return true;
  });
  const grouped = cats.filter(c=>c!=="All").reduce((acc,cat)=>{
    const items = wiCatFilter==="All"
      ? shelfProds.filter(p=>p.cat===cat&&(!wiSearch||(p.name.toLowerCase().includes(wiSearch.toLowerCase())||p.sku?.toLowerCase().includes(wiSearch.toLowerCase()))))
      : filtered;
    if(wiCatFilter==="All"){if(items.length)acc[cat]=items;}
    else acc[wiCatFilter]=filtered;
    return acc;
  },{});

  const getEffP = (cid,pid)=>{
    const c=customers.find(x=>x.id===cid);
    const p=products.find(x=>x.id===pid);
    if(!c||!p)return p?.price||0;
    try{const m=(c.notes||"").match(/CUSTOM_PRICES:({.*?})/);const cp=m?JSON.parse(m[1]):{};const cv=cp[pid];return(cv&&parseFloat(cv)>0)?parseFloat(cv):p.price;}catch{return p?.price||0;}
  };

  const getTaxRate = (custObj)=>{
    if(!custObj) return 0;
    const cs=(custObj.state||"").trim();
    const st=stateTaxes.find(s=>s.id?.toUpperCase()===cs.toUpperCase()||s.name?.toLowerCase()===cs.toLowerCase());
    return st?.exempt?0:parseFloat(st?.rate||0);
  };

  const taxRate2 = getTaxRate(wiCustObj);
  const sub = shelfProds.reduce((a,p)=>a+(getEffP(wiCust,p.id)||0)*(wiItems[p.id]||0),0);
  const taxable = shelfProds.reduce((a,p)=>isTaxableProd(p)?(a+(getEffP(wiCust,p.id)||0)*(wiItems[p.id]||0)):a,0);
  const tax = parseFloat((taxable*taxRate2/100).toFixed(2));
  const gt  = sub+tax;
  const cardFee = 3;
  const cardTotal = parseFloat((gt*(1+cardFee/100)).toFixed(2));
  const totalDue = (wiPay==="card"?cardTotal:gt)+wiPrevBal;

  const handleWiCust = async(cid)=>{
    setWiCust(cid);setWiPrevBal(0);setWiPrevInvs([]);
    if(!cid)return;
    const [{data:cs},{data:pm}]=await Promise.all([
      db.from("sales").select("id,total,date,state,items,previous_balance").eq("cust_id",cid),
      db.from("payments").select("sale_id,status"),
    ]);
    const paidIds=new Set((pm||[]).filter(p=>p.status==="paid").map(p=>p.sale_id));
    const allUnpaid=(cs||[]).filter(s=>!paidIds.has(s.id));
    const bal=parseFloat(allUnpaid.reduce((a,s)=>{
      const custSt=(s.state||"").trim();
      const st=stateTaxes.find(x=>x.id?.toUpperCase()===custSt.toUpperCase()||x.name?.toLowerCase()===custSt.toLowerCase());
      const rate=st?.exempt?0:parseFloat(st?.rate||0);
      const taxableAmt=(s.items||[]).reduce((b,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?b+(p?.price||0)*i.qty:b;},0);
      const stax=parseFloat((taxableAmt*rate/100).toFixed(2));
      return a+s.total+stax;
    },0).toFixed(2));
    setWiPrevBal(bal);setWiPrevInvs(allUnpaid);
  };

  const createWiSale = async()=>{
    if(!wiCust) return setWiMsg({t:"error",m:"Select a customer"});
    const saleItems=shelfProds.filter(p=>wiItems[p.id]>0).map(p=>({pid:p.id,qty:wiItems[p.id]}));
    if(!saleItems.length) return setWiMsg({t:"error",m:"Add at least one product"});

    // Hard validation - ensure qty never exceeds shelf stock
    const overLimit=saleItems.find(i=>{
      const p=products.find(x=>x.id===i.pid);
      return !p||i.qty>p.shelf;
    });
    if(overLimit){
      const p=products.find(x=>x.id===overLimit.pid);
      return setWiMsg({t:"error",m:`[!]ï¸ Only ${p?.shelf} of "${p?.name}" available on shelf  -  adjust quantity`});
    }

    setWiSaving(true);
    try{
      const {data:seq}=await db.rpc("next_invoice_number");
      const invId="INV-"+String(seq||1).padStart(4,"0");
      const profit=saleItems.reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return a+(getEffP(wiCust,i.pid)-(p?.cost||0))*i.qty;},0);
      // SECURITY FIX: Add company_id for tenant isolation
      const ns={id:invId,truck_id:null,cust_id:wiCust,state:wiCustObj?.state||"",date:nowStr(),items:saleItems,total:sub,profit,previous_balance:wiPrevBal||0,previous_invoice_ids:wiPrevInvs.map(s=>s.id).join(","),check_penalty_applied:0,created_at:new Date().toISOString(),company_id:co?.id};
      await db.from("sales").insert(ns);
      await Promise.all(saleItems.map(i=>{const p=products.find(x=>x.id===i.pid);return p?db.from("products").update({shelf:Math.max(0,p.shelf-i.qty)}).eq("id",p.id):Promise.resolve();}));
      let wiRecUrl="";
      if(wiReceiptFile){
        const ext=wiReceiptFile.name.split(".").pop();
        const path=`receipts/WI-${uid2()}.${ext}`;
        const {data:upD,error:upE}=await db.storage.from("receipts").upload(path,wiReceiptFile,{upsert:true});
        if(!upE) wiRecUrl=db.storage.from("receipts").getPublicUrl(path).data.publicUrl;
      }
      await db.from("payments").insert({id:"PMT-"+uid2(),sale_id:invId,status:"paid",method:wiPay,amount:totalDue,check_number:wiCheck||"",zelle_ref:wiZelle||"",note:"Walk-in sale",receipt_url:wiRecUrl,collected_at:new Date().toISOString()});
      setDriverData(prev=>({...prev, sales:[{...ns,_paid:true},...prev.sales]}));
      setWiSales(prev=>[{...ns,_paid:true},...prev]);
      setWiItems({});setWiPrevBal(0);setWiPrevInvs([]);setWiCheck("");setWiZelle("");setWiReceiptFile(null);setWiReceiptUrl("");
      setWiMsg({t:"success",m:`[OK] Invoice ${invId} created! View it in History.`});
      // Auto-WhatsApp invoice if enabled
      const wiCo=driverData?.co;
      if(wiCo?.whatsapp_invoices&&wiCo?.meta_phone_id&&wiCo?.meta_token){
        const wiCustObj2=(driverData?.customers||[]).find(c=>c.id===wiCust);
        const phone=(wiCustObj2?.phone||"").replace(/\D/g,"");
        if(phone.length>=10){
          const to=phone.length===10?"1"+phone:phone;
          const portalUrl=`${wiCo?.portal_url||window.location.origin}/?invoice=${invId}`;
          fetch("/api/functions/send-whatsapp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
            to,phone_number_id:wiCo.meta_phone_id,access_token:wiCo.meta_token,
            template_name:wiCo.meta_template||"invoice_notification",
            params:[wiCustObj2.name,invId,sub.toFixed(2),portalUrl],
          })}).catch(()=>{});
        }
      }
    }catch(e){setWiMsg({t:"error",m:e.message});}
    setWiSaving(false);
  };

  // -- OPEN AMENDMENT ---------------------------------------------------------
  const openAmend = (sale)=>{
    const init={};
    (sale.items||[]).forEach(i=>{ init[i.pid]=i.qty; });
    setAmendItems(init);
    setAmendSale(sale);
    setAmendMsg(null);
  };

  // -- SAVE AMENDMENT ---------------------------------------------------------
  const saveAmend = async()=>{
    if(!amendSale) return;
    setAmendSaving(true); setAmendMsg(null);
    try{
      const custObj = customers.find(c=>c.id===amendSale.cust_id);
      const tRate = getTaxRate(custObj);

      // Build new items - remove any with qty=0
      const newItems = Object.entries(amendItems)
        .filter(([,q])=>parseInt(q)>0)
        .map(([pid,qty])=>({pid,qty:parseInt(qty)}));
      if(!newItems.length) throw new Error("Must keep at least one product");

      // Validate: increases must not exceed available shelf stock
      const oldMap = {};
      (amendSale.items||[]).forEach(i=>{ oldMap[i.pid]=i.qty; });
      const stockErr = newItems.find(i=>{
        const increase = i.qty - (oldMap[i.pid]||0);
        if(increase<=0) return false;
        const prod = products.find(x=>x.id===i.pid);
        return !prod || increase > prod.shelf;
      });
      if(stockErr){
        const prod = products.find(x=>x.id===stockErr.pid);
        const increase = stockErr.qty - (oldMap[stockErr.pid]||0);
        throw new Error(`[!]ï¸ Only ${prod?.shelf||0} of "${prod?.name}" on shelf  -  can't add ${increase} more`);
      }

      // Recalculate totals
      const newSub = newItems.reduce((a,i)=>a+(getEffP(amendSale.cust_id,i.pid)||0)*i.qty, 0);
      const newTaxable = newItems.reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?a+(getEffP(amendSale.cust_id,i.pid)||0)*i.qty:a;},0);
      const newTax = parseFloat((newTaxable*tRate/100).toFixed(2));
      const newProfit = newItems.reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return a+(getEffP(amendSale.cust_id,i.pid)-(p?.cost||0))*i.qty;},0);

      // Adjust shelf stock: batched parallel updates (reuse oldMap from validation above)
      const allPids = [...new Set([...Object.keys(oldMap), ...newItems.map(i=>i.pid)])];
      const shelfUpdates = allPids.map(pid=>{
        const diff = (oldMap[pid]||0) - (amendItems[pid]||0);
        if(diff===0) return null;
        const prod = products.find(p=>p.id===pid); if(!prod) return null;
        return {pid, newShelf:Math.max(0, prod.shelf+diff)};
      }).filter(Boolean);
      await Promise.all(shelfUpdates.map(u=>db.from("products").update({shelf:u.newShelf}).eq("id",u.pid)));

      // Save updated sale
      await db.from("sales").update({
        items: newItems,
        total: newSub,
        profit: newProfit,
        amended_at: new Date().toISOString(),
      }).eq("id",amendSale.id);

      // Update local history
      const updated = {...amendSale, items:newItems, total:newSub, profit:newProfit, amended_at:new Date().toISOString()};
      setWiSales(prev=>prev.map(s=>s.id===amendSale.id?updated:s));
      setAmendMsg({t:"success",m:"âœ… Invoice updated successfully!"});
      setTimeout(()=>setAmendSale(null),1400);
    }catch(e){ setAmendMsg({t:"error",m:e.message}); }
    setAmendSaving(false);
  };

  // -- SALE TAB UI -----------------------------------------------------------
  const SaleTab = ()=>(
    <div>
      <div style={{fontSize:11,color:"#9ca3af",marginBottom:14}}>Sell directly from warehouse shelf â€” deducts shelf stock</div>

      {/* Customer + summary card */}
      <div className="card" style={{padding:"14px 16px",marginBottom:12}}>
        {!initCust&&<>
          <label style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:".08em",display:"block",marginBottom:6}}>CUSTOMER</label>
          <select value={wiCust} onChange={e=>handleWiCust(e.target.value)}
            style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:9,padding:"10px 12px",fontSize:13,background:"#fff",color:"#111",marginBottom:8}}>
            <option value="">â€” Select customer â€”</option>
            {[...customers].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}{c.state?`   -   ${c.state}`:""}</option>)}
          </select>
        </>}
        {wiCustObj&&<div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>
          State: <strong>{wiCustObj.state||"Not set"}</strong> Â· Tax: <strong style={{color:taxRate2>0?"#7c3aed":"#9ca3af"}}>{taxRate2>0?`${taxRate2}% tobacco`:"exempt/none"}</strong>
        </div>}
        {wiHasReturnedCheck&&<div style={{background:"#1a0505",border:"2px solid #dc2626",borderRadius:10,padding:"12px 16px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>ðŸš¨</span>
            <div>
              <div style={{fontWeight:800,fontSize:13,color:"#dc2626"}}>RETURNED CHECK ON FILE</div>
              <div style={{fontSize:11,color:"#f87171",marginTop:2}}>
                A <strong style={{color:"#fbbf24"}}>${RETURNED_CHECK_FEE} penalty</strong> will be added to this invoice. Cash, Zelle, or Card recommended.
              </div>
            </div>
          </div>
        </div>}
        {wiPrevBal>0&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
          <div style={{fontWeight:700,fontSize:11,color:"#dc2626",marginBottom:4}}>âš ï¸ Outstanding Balance</div>
          {wiPrevInvs.slice(0,3).map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#dc2626",marginBottom:2}}><span>{s.id} Â· {fmtDate(s)}</span></div>)}
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:12,color:"#dc2626",borderTop:"1px solid #fecaca",marginTop:4,paddingTop:4}}><span>Total Owed</span><span>{fmt2(wiPrevBal)}</span></div>
        </div>}
      </div>

      {/* Product search + filter */}
      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        <input value={wiSearch} onChange={e=>setWiSearch(e.target.value)} placeholder="ðŸ” Search products..."
          style={{flex:1,minWidth:160,border:"1.5px solid #e5e7eb",borderRadius:9,padding:"9px 12px",fontSize:13,background:"#fff"}}/>
        <button onClick={()=>setWiItems({})} style={{padding:"8px 12px",borderRadius:9,border:"1px solid #e5e7eb",background:"#fff",color:"#6b7280",fontSize:11,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Clear</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setWiCatFilter(c)}
            style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${wiCatFilter===c?"#0a1628":"#e5e7eb"}`,background:wiCatFilter===c?"#0a1628":"#fff",color:wiCatFilter===c?"#fff":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            {c}
          </button>
        ))}
      </div>

      {/* Products */}
      {Object.entries(wiCatFilter==="All"?grouped:{[wiCatFilter]:filtered}).map(([cat,items])=>(
        <div key={cat} style={{marginBottom:16}}>
          <div style={{fontWeight:800,fontSize:10,color:"#9ca3af",letterSpacing:".1em",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
            {cat.toUpperCase()}<div style={{flex:1,height:1,background:"#e5e7eb"}}/>
          </div>
          {items.map(p=>{
            const qty=wiItems[p.id]||0;
            const isSelected=qty>0;
            const ep=getEffP(wiCust,p.id);
            return(
              <div key={p.id} className="prod-row" style={{background:"#fff",border:`1.5px solid ${isSelected?"#0a1628":"#e5e7eb"}`,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:"#0a1628"}}>{p.name}</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>{p.sku&&`${p.sku}   -   `}{p.unit} Â· {p.shelf} in stock{isTaxableProd(p)&&<span style={{marginLeft:5,background:"#fef3c7",color:"#92400e",padding:"1px 5px",borderRadius:3,fontSize:9,fontWeight:700}}>TOBACCO TAX</span>}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:16,color:"#059669"}}>{fmt2(ep)}</div>
                    {isSelected&&<div style={{fontSize:11,color:"#0a1628",fontWeight:600}}>{fmt2(qty*ep)}</div>}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <button className="qty-btn" onClick={()=>setWiItems(prev=>({...prev,[p.id]:Math.max(0,(prev[p.id]||0)-1)}))} style={{width:30,height:30}}>âˆ’</button>
                  <input type="number" min="0" max={p.shelf} value={qty||""} placeholder="0"
                    onChange={e=>setWiItems(prev=>({...prev,[p.id]:Math.min(p.shelf,Math.max(0,parseInt(e.target.value)||0))}))}
                    style={{flex:1,textAlign:"center",border:`1.5px solid ${isSelected?"#0a1628":"#e5e7eb"}`,borderRadius:8,padding:"6px 4px",fontSize:14,fontWeight:700,background:"#fff"}}/>
                  <button className="qty-btn" onClick={()=>setWiItems(prev=>({...prev,[p.id]:Math.min(p.shelf,(prev[p.id]||0)+1)}))} disabled={qty>=p.shelf} style={{width:30,height:30}}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {filtered.length===0&&<div className="card" style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>No products match your search</div>}

      {/* Order summary + payment */}
      {sub>0&&(
        <div className="card" style={{padding:"14px 16px",marginTop:4,marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:12,color:"#0a1628",marginBottom:8}}>ORDER SUMMARY</div>
          {[["Subtotal",fmt2(sub),"#212121"],tax>0?["Tobacco Tax ("+taxRate2+"%)",fmt2(tax),"#7c3aed"]:null,wiPrevBal>0?["Prev. Balance",fmt2(wiPrevBal),"#dc2626"]:null,wiPay==="card"?["Card Fee ("+cardFee+"%)",fmt2(parseFloat((gt*cardFee/100).toFixed(2))),"#f59e0b"]:null,["Total Due",fmt2(totalDue),"#059669"]].filter(Boolean).map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5,paddingBottom:l==="Total Due"?0:5,borderBottom:l==="Total Due"?"none":"1px solid #f3f4f6"}}>
              <span style={{fontSize:11,color:l==="Total Due"?"#212121":"#6b7280",fontWeight:l==="Total Due"?700:400}}>{l}</span>
              <span style={{fontSize:l==="Total Due"?15:12,fontWeight:l==="Total Due"?800:600,color:c}}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Payment method */}
      <div className="card" style={{padding:"14px 16px",marginBottom:12}}>
        <label style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:".08em",display:"block",marginBottom:8}}>PAYMENT METHOD</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[["cash","ðŸ’µ Cash"],["check","ðŸ§¾ Check"],["zelle","âš¡ Zelle"],["money_order","ðŸ“® M.O."],["card","ðŸ’³ Card"]].map(([id,label])=>(
            <button key={id} onClick={()=>setWiPay(id)}
              style={{padding:"9px 8px",borderRadius:9,border:`1.5px solid ${wiPay===id?"#0a1628":"#e5e7eb"}`,background:wiPay===id?"#0a1628":"#fff",color:wiPay===id?"#fff":"#6b7280",fontSize:12,fontWeight:wiPay===id?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
              {label}
            </button>
          ))}
        </div>
        {wiPay==="check"&&<input value={wiCheck} onChange={e=>setWiCheck(e.target.value)} placeholder="Check number"
          style={{width:"100%",marginTop:8,border:"1.5px solid #e5e7eb",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",background:"#fff"}}/>}
        {wiPay==="zelle"&&<input value={wiZelle} onChange={e=>setWiZelle(e.target.value)} placeholder="Zelle reference"
          style={{width:"100%",marginTop:8,border:"1.5px solid #e5e7eb",borderRadius:8,padding:"9px 12px",fontSize:13,boxSizing:"border-box",background:"#fff"}}/>}
      </div>

      {/* Receipt upload */}
      <div className="card" style={{padding:"14px 16px",marginBottom:14}}>
        <label style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:".08em",display:"block",marginBottom:8}}>RECEIPT / PAYMENT PROOF</label>
        <div style={{border:"2px dashed #e5e7eb",borderRadius:9,padding:"14px",textAlign:"center",background:"#fafafa",cursor:"pointer"}}
          onClick={()=>document.getElementById("wiReceiptInputDriver").click()}>
          {wiReceiptUrl
            ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <img src={wiReceiptUrl} alt="receipt" style={{maxHeight:80,maxWidth:"100%",borderRadius:6}}/>
              <span style={{fontSize:10,color:"#059669",fontWeight:600}}>âœ… Attached â€” tap to change</span>
            </div>
            :<div style={{color:"#9ca3af",fontSize:12}}>
              <div style={{fontSize:22,marginBottom:4}}>ðŸ“¸</div>
              <div>Tap to snap or upload receipt</div>
            </div>}
          <input id="wiReceiptInputDriver" type="file" accept="image/*,application/pdf" capture="environment" style={{display:"none"}}
            onChange={e=>{const f=e.target.files[0];if(f){setWiReceiptFile(f);setWiReceiptUrl(URL.createObjectURL(f));}}}/>
        </div>
      </div>

      {wiMsg&&<div style={{background:wiMsg.t==="success"?"#f0fdf4":"#fef2f2",border:`1px solid ${wiMsg.t==="success"?"#a7f3d0":"#fecaca"}`,borderRadius:8,padding:"10px 14px",fontSize:13,color:wiMsg.t==="success"?"#065f46":"#dc2626",marginBottom:10}}>{wiMsg.m}</div>}
      <button onClick={createWiSale} disabled={wiSaving||!wiCust||sub===0} className="btn-primary"
        style={{width:"100%",justifyContent:"center",padding:"13px",marginBottom:24,background:(!wiCust||sub===0)?"#9ca3af":"#0a1628"}}>
        {wiSaving?<><span className="sp">âŸ³</span> Creatingâ€¦</>:"ðŸ§¾ Create Invoice & Record Payment"}
      </button>
    </div>
  );

  // -- HISTORY TAB UI --------------------------------------------------------
  const HistoryTab = ()=>{
    if(wiHistLoading) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>Loading historyâ€¦</div>;
    if(!wiCust&&!initCust) return <div className="card" style={{padding:28,textAlign:"center",color:"#9ca3af"}}>Select a customer first to see their invoice history.</div>;
    if(wiSales.length===0) return <div className="card" style={{padding:32,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:28,marginBottom:6}}>ðŸ“‹</div><div>No invoices yet</div></div>;

    const hq=wiHistSearch.toLowerCase();
    const filtered=hq?wiSales.filter(s=>(s.id||"").toLowerCase().includes(hq)||(s.date||"").toLowerCase().includes(hq)):wiSales;
    const totalPages=Math.ceil(filtered.length/WI_HIST_PER_PAGE);
    const page=Math.min(wiHistPage,Math.max(0,totalPages-1));
    const pageWiSales=filtered.slice(page*WI_HIST_PER_PAGE,(page+1)*WI_HIST_PER_PAGE);

    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:12,color:"#6b7280"}}>{filtered.length} invoice{filtered.length!==1?"s":""}</div>
          <input value={wiHistSearch} onChange={e=>{setWiHistSearch(e.target.value);setWiHistPage(0);}}
            placeholder="ðŸ” Searchâ€¦"
            style={{width:170,padding:"6px 10px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"'Inter',sans-serif"}}/>
        </div>
        {pageWiSales.map(s=>{
          const pmt = wiPayments.find(p=>p.sale_id===s.id);
          const isPaid = pmt?.status==="paid";
          const tRate = getTaxRate(customers.find(c=>c.id===s.cust_id));
          const sTax = parseFloat(((s.items||[]).reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?a+(getEffP(s.cust_id,i.pid)||0)*i.qty:a;},0)*tRate/100).toFixed(2));
          const gt = parseFloat((s.total+sTax+parseFloat(s.previous_balance||0)).toFixed(2));
          return(
            <div key={s.id} className="card" style={{marginBottom:10,borderLeft:`4px solid ${isPaid?"#059669":"#f59e0b"}`}}>
              <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:3}}>
                    <span style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:14,color:"#7c3aed",cursor:"pointer",textDecoration:"underline"}} onClick={()=>setDriverViewInv(s)}>{s.id}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:isPaid?"#dcfce7":"#fef9c3",color:isPaid?"#166534":"#92400e"}}>{isPaid?"PAID":"UNPAID"}</span>
                    {s.amended_at&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:"#ede9fe",color:"#5b21b6"}}>AMENDED</span>}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>``{fmtDate(s)} Â· {(s.items||[]).length} product{(s.items||[]).length!==1?"s":""}</div>
                  <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                    {(s.items||[]).map(i=>{const p=products.find(x=>x.id===i.pid);return<span key={i.pid} style={{fontSize:10,background:"#f3f4f6",borderRadius:5,padding:"2px 7px",color:"#374151"}}>{p?.name||i.pid} Ã—{i.qty}</span>;})}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:18,color:"#0a1628"}}>{fmt2(gt)}</div>
                  {sTax>0&&<div style={{fontSize:10,color:"#7c3aed"}}>incl. ${sTax.toFixed(2)} tax</div>}
                  <button onClick={()=>openAmend(s)}
                    style={{marginTop:6,background:"#7c3aed",color:"#fff",border:"none",borderRadius:7,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",gap:4}}>
                    âœï¸ Amend
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {totalPages>1&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 4px",marginTop:4,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:11,color:"#9ca3af"}}>Showing {page*WI_HIST_PER_PAGE+1}â€“{Math.min((page+1)*WI_HIST_PER_PAGE,filtered.length)} of {filtered.length}</div>
          <div style={{display:"flex",gap:5}}>
            <button onClick={()=>setWiHistPage(p=>p-1)} disabled={page===0}
              style={{padding:"5px 12px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:page===0?"not-allowed":"pointer",color:page===0?"#9ca3af":"#0a1628",fontWeight:600}}>â† Prev</button>
            {Array.from({length:totalPages},(_,i)=>i).filter(i=>i===0||i===totalPages-1||Math.abs(i-page)<=1).reduce((acc,i,idx,arr)=>{if(idx>0&&i-arr[idx-1]>1)acc.push("â€¦");acc.push(i);return acc;},[]).map((i,k)=>
              i==="â€¦"?<span key={k} style={{padding:"5px 4px",fontSize:11,color:"#9ca3af",lineHeight:"28px"}}>â€¦</span>:
              <button key={k} onClick={()=>setWiHistPage(i)}
                style={{padding:"5px 10px",fontSize:12,border:i===page?"none":"1.5px solid #e5e7eb",borderRadius:7,background:i===page?"#0a1628":"#fff",color:i===page?"#fff":"#0a1628",fontWeight:700,cursor:"pointer",minWidth:32}}>
                {i+1}
              </button>
            )}
            <button onClick={()=>setWiHistPage(p=>p+1)} disabled={page>=totalPages-1}
              style={{padding:"5px 12px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:page>=totalPages-1?"not-allowed":"pointer",color:page>=totalPages-1?"#9ca3af":"#0a1628",fontWeight:600}}>Next â†’</button>
          </div>
        </div>}
      </div>
    );
  };

  // -- AMENDMENT MODAL -------------------------------------------------------
  const AmendModal = ()=>{
    if(!amendSale) return null;
    const allPids = new Set([...(amendSale.items||[]).map(i=>i.pid), ...Object.keys(amendItems).filter(pid=>amendItems[pid]>0)]);
    const amendSub = [...allPids].reduce((a,pid)=>{
      const q=parseInt(amendItems[pid]||0);
      return a+(getEffP(amendSale.cust_id,pid)||0)*q;
    },0);
    const custObj = customers.find(c=>c.id===amendSale.cust_id);
    const tRate = getTaxRate(custObj);
    const amendTaxable = [...allPids].reduce((a,pid)=>{
      const p=products.find(x=>x.id===pid);
      const q=parseInt(amendItems[pid]||0);
      return isTaxableProd(p)?a+(getEffP(amendSale.cust_id,pid)||0)*q:a;
    },0);
    const amendTax = parseFloat((amendTaxable*tRate/100).toFixed(2));
    const amendTotal = amendSub+amendTax+parseFloat(amendSale.previous_balance||0);

    return(
      <div style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:16,backdropFilter:"blur(4px)"}}>
        <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:560,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 40px #00000020"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:16,color:"#0a1628"}}>âœï¸ Amend Invoice {amendSale.id}</div>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Adjust product quantities only â€” prices are fixed</div>
            </div>
            <button onClick={()=>setAmendSale(null)} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#6b7280",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>âœ• Close</button>
          </div>

          {/* Product quantity editors */}
          <div style={{marginBottom:16}}>
            {(amendSale.items||[]).map(item=>{
              const p = products.find(x=>x.id===item.pid);
              const qty = parseInt(amendItems[item.pid]||0);
              const ep = getEffP(amendSale.cust_id,item.pid);
              const origQty = item.qty;
              const diff = qty - origQty;
              return(
                <div key={item.pid} style={{border:`1.5px solid ${qty!==origQty?"#7c3aed":"#e5e7eb"}`,borderRadius:10,padding:"12px 14px",marginBottom:8,background:qty!==origQty?"#faf5ff":"#fff"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#0a1628"}}>{p?.name||item.pid}</div>
                      <div style={{fontSize:10,color:"#9ca3af"}}>{p?.sku} Â· {fmt2(ep)} each{isTaxableProd(p)&&<span style={{marginLeft:4,color:"#7c3aed",fontWeight:700}}>+tax</span>}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:800,fontSize:14,color:"#7c3aed"}}>{fmt2(qty*ep)}</div>
                      {diff!==0&&<div style={{fontSize:10,fontWeight:700,color:diff>0?"#dc2626":"#059669"}}>{diff>0?`+${diff}`:`${diff}`} from original ({origQty})</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <button className="qty-btn" onClick={()=>setAmendItems(prev=>({...prev,[item.pid]:Math.max(0,(parseInt(prev[item.pid]||0))-1)}))} style={{width:32,height:32,fontSize:18}}>âˆ’</button>
                    <input type="number" min="0" value={qty||""}  placeholder="0"
                      onChange={e=>setAmendItems(prev=>({...prev,[item.pid]:Math.max(0,parseInt(e.target.value)||0)}))}
                      style={{flex:1,textAlign:"center",border:`1.5px solid ${qty!==origQty?"#7c3aed":"#e5e7eb"}`,borderRadius:8,padding:"7px 4px",fontSize:16,fontWeight:800,background:"#fff"}}/>
                    <button className="qty-btn" onClick={()=>setAmendItems(prev=>({...prev,[item.pid]:(parseInt(prev[item.pid]||0))+1}))} style={{width:32,height:32,fontSize:18}}>+</button>
                    <div style={{minWidth:60,fontSize:11,color:"#9ca3af",textAlign:"center"}}>was {origQty}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Updated totals */}
          <div style={{background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:12,color:"#5b21b6",marginBottom:8}}>UPDATED TOTALS</div>
            {[["Subtotal",fmt2(amendSub),"#212121"],amendTax>0?["Tax ("+tRate+"%)",fmt2(amendTax),"#7c3aed"]:null,parseFloat(amendSale.previous_balance||0)>0?[amendSale.check_penalty_applied>0?"ðŸš¨ Returned Check Penalty":"âš ï¸ Prev. Balance",fmt2(parseFloat(amendSale.previous_balance||0)),"#dc2626"]:null,["New Total",fmt2(amendTotal),"#059669"]].filter(Boolean).map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4,fontWeight:l==="New Total"?800:400}}>
                <span style={{color:"#6b7280"}}>{l}</span><span style={{color:c,fontFamily:"'Inter',sans-serif"}}>{v}</span>
              </div>
            ))}
          </div>

          {amendMsg&&<div style={{background:amendMsg.t==="success"?"#f0fdf4":"#fef2f2",border:`1px solid ${amendMsg.t==="success"?"#a7f3d0":"#fecaca"}`,borderRadius:8,padding:"10px 14px",fontSize:13,color:amendMsg.t==="success"?"#065f46":"#dc2626",marginBottom:10}}>{amendMsg.m}</div>}

          <div style={{display:"flex",gap:10}}>
            <button onClick={saveAmend} disabled={amendSaving} className="btn-primary"
              style={{flex:1,justifyContent:"center",padding:"13px",background:"#7c3aed"}}>
              {amendSaving?<><span className="sp">âŸ³</span> Savingâ€¦</>:"ðŸ’¾ Save Changes"}
            </button>
            <button onClick={()=>setAmendSale(null)} style={{padding:"13px 20px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",color:"#6b7280",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return(
    <div className="fu">
      {/* Tab switcher */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:16}}>
        {[["sale","ðŸ›’ New Sale"],["history","ðŸ“‹ Invoice History"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setWiView(v);if(v==="history"&&(wiCust||initCust))loadHistory(wiCust||initCust);}}
            style={{padding:"11px 8px",borderRadius:10,border:`1.5px solid ${wiView===v?"#7c3aed":"#e5e7eb"}`,background:wiView===v?"#7c3aed":"#fff",color:wiView===v?"#fff":"#6b7280",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .15s"}}>
            {l}
          </button>
        ))}
      </div>

      {wiView==="sale"&&SaleTab()}
      {wiView==="history"&&HistoryTab()}
      {AmendModal()}
    </div>
  );
}

// -- DRIVER EXPENSES TAB -------------------------------------------------------
function DriverExpensesTab({driverData, supabase}){
  const [form, setForm] = useState({category:"gas",amount:"",description:"",receipt_url:""});
  const [expenses, setExpenses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [expPage, setExpPage] = useState(0);
  const EXP_PER_PAGE = 10;
  const uid = ()=>Math.random().toString(36).slice(2,8).toUpperCase();
  const cats = [{k:"gas",e:"â›½",l:"Gas / Fuel"},{k:"maintenance",e:"ðŸ”§",l:"Maintenance"},{k:"food",e:"ðŸ”",l:"Food & Meals"},{k:"accommodation",e:"ðŸ¨",l:"Accommodation"},{k:"other",e:"ðŸ“‹",l:"Other"}];

  useEffect(()=>{
    db.from("expenses").select("*").eq("truck_id",driverData.truck?.id).order("created_at",{ascending:false}).then(({data})=>{if(data)setExpenses(data);});
  },[]);

  const submitExpense = async () => {
    if(!form.amount) return setMsg({t:"error",m:"Amount is required"});
    setSaving(true);
    try{
      const rec = {id:"EXP-"+uid(),truck_id:driverData.truck?.id,driver_name:driverData.truck?.driver,category:form.category,amount:parseFloat(form.amount),description:form.description,receipt_url:form.receipt_url||"",date:new Date().toLocaleDateString(),created_at:new Date().toISOString()};
      await db.from("expenses").insert(rec);
      setExpenses(prev=>[rec,...prev]);
      setMsg({t:"success",m:"Expense recorded!"});
      setForm({category:"gas",amount:"",description:"",receipt_url:""});
    }catch(e){setMsg({t:"error",m:e.message});}
    setSaving(false);
  };

  const todayTotal = expenses.filter(e=>new Date(e.created_at).toDateString()===new Date().toDateString()).reduce((a,e)=>a+e.amount,0);

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div className="card" style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:18,marginBottom:3}}>ðŸ’¸</div><div style={{fontWeight:800,fontSize:18,color:"#dc2626"}}>${todayTotal.toFixed(2)}</div><div style={{fontSize:10,color:"#9ca3af"}}>Today's Expenses</div></div>
        <div className="card" style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:18,marginBottom:3}}>ðŸ“‹</div><div style={{fontWeight:800,fontSize:18,color:"#6b7280"}}>{expenses.length}</div><div style={{fontSize:10,color:"#9ca3af"}}>Total Records</div></div>
      </div>

      <div className="card" style={{padding:"16px",marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>+ Add Expense</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
          {cats.map(c=>(
            <button key={c.k} onClick={()=>setForm(f=>({...f,category:c.k}))}
              style={{padding:"8px 4px",borderRadius:8,border:`1.5px solid ${form.category===c.k?"#dc2626":"#e5e7eb"}`,background:form.category===c.k?"#fef2f2":"#fff",cursor:"pointer",textAlign:"center",fontFamily:"'Inter',sans-serif"}}>
              <div style={{fontSize:18}}>{c.e}</div>
              <div style={{fontSize:10,fontWeight:600,color:form.category===c.k?"#dc2626":"#6b7280",marginTop:2}}>{c.l}</div>
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>AMOUNT ($) *</label><input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:7,padding:"9px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>DESCRIPTION</label><input placeholder="e.g. Shell gas station" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:7,padding:"9px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}/></div>
        </div>
        <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>RECEIPT PHOTO (optional)</label><input type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files[0];if(f){const url=URL.createObjectURL(f);setForm(prev=>({...prev,receipt_url:url}));setMsg({t:"success",m:"Photo attached"});}}}/></div>
        {msg&&<div style={{background:msg.t==="success"?"#f0fdf4":"#fef2f2",border:`1px solid ${msg.t==="success"?"#a7f3d0":"#fecaca"}`,borderRadius:7,padding:"8px 12px",fontSize:12,color:msg.t==="success"?"#065f46":"#dc2626",marginBottom:10}}>{msg.m}</div>}
        <button onClick={submitExpense} disabled={saving} style={{width:"100%",background:"#dc2626",color:"#fff",border:"none",borderRadius:9,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
          {saving?"Savingâ€¦":"ðŸ’¸ Record Expense"}
        </button>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:13}}>Recent Expenses</div>
        {expenses.length>EXP_PER_PAGE&&<div style={{fontSize:11,color:"#9ca3af"}}>{expenses.length} total</div>}
      </div>
      {expenses.length===0
        ?<div className="card" style={{padding:20,textAlign:"center",color:"#9ca3af",fontSize:12}}>No expenses recorded yet</div>
        :(()=>{
          const totalExpPages=Math.ceil(expenses.length/EXP_PER_PAGE);
          const ep=Math.min(expPage,Math.max(0,totalExpPages-1));
          const pageExps=expenses.slice(ep*EXP_PER_PAGE,(ep+1)*EXP_PER_PAGE);
          return(<>
            {pageExps.map(e=>{
              const cat=cats.find(c=>c.k===e.category);
              return(
                <div key={e.id} className="card" style={{padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:24,flexShrink:0}}>{cat?.e||"ðŸ“‹"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{cat?.l||e.category}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>{e.date} {e.description&&`Â· ${e.description}`}</div>
                  </div>
                  <div style={{fontWeight:800,fontSize:16,color:"#dc2626"}}>${e.amount.toFixed(2)}</div>
                </div>
              );
            })}
            {totalExpPages>1&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 4px",marginTop:4,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:11,color:"#9ca3af"}}>Showing {ep*EXP_PER_PAGE+1}â€“{Math.min((ep+1)*EXP_PER_PAGE,expenses.length)} of {expenses.length}</div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>setExpPage(p=>p-1)} disabled={ep===0}
                  style={{padding:"5px 12px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:ep===0?"not-allowed":"pointer",color:ep===0?"#9ca3af":"#0a1628",fontWeight:600}}>â† Prev</button>
                <button onClick={()=>setExpPage(p=>p+1)} disabled={ep>=totalExpPages-1}
                  style={{padding:"5px 12px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:ep>=totalExpPages-1?"not-allowed":"pointer",color:ep>=totalExpPages-1?"#9ca3af":"#0a1628",fontWeight:600}}>Next â†’</button>
              </div>
            </div>}
          </>);
        })()
      }
    </div>
  );
}

export default function OrderPortal() {
  const [products,  setProducts]  = useState([]);
  const [customers, setCustomers] = useState([]);
  const [co,        setCo]        = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Flow: "home" | "register" | "order" | "review" | "confirm"
  const [step,      setStep]      = useState("home");
  const [isNew,     setIsNew]     = useState(false);
  const [isExisting,setIsExisting]= useState(false);
  const [isDriver,  setIsDriver]  = useState(false);
  const [isOnline,  setIsOnline]  = useState(navigator.onLine);
  const [draftQueue,setDraftQueue]= useState(()=>{
    try{return JSON.parse(localStorage.getItem("vw_draft_queue")||"[]");}catch{return[];}
  });
  const saveDrafts=drafts=>{setDraftQueue(drafts);try{localStorage.setItem("vw_draft_queue",JSON.stringify(drafts));}catch{}};
  const addDraft=draft=>{const d=[...draftQueue,draft];saveDrafts(d);return d;};
  const removeDraft=id=>saveDrafts(draftQueue.filter(d=>d._draftId!==id));
  const [isWalkIn,       setIsWalkIn]       = useState(false);
  const [isCustPortal,   setIsCustPortal]   = useState(false);
  const [custPortalUser, setCustPortalUser] = useState(null);
  const [custPortalLoading,setCustPortalLoading]=useState(false);
  const [custPortalError,  setCustPortalError  ]=useState("");
  const [custPortalPhone,  setCustPortalPhone  ]=useState("");
  const [custPortalName,   setCustPortalName   ]=useState("");
  const [custPortalData,   setCustPortalData   ]=useState(null);
  const [walkInVerified, setWalkInVerified] = useState(false);
  const [walkInCust,     setWalkInCust]     = useState(null);
  const [walkInSearch,   setWalkInSearch]   = useState("");
  const [walkInPhone,    setWalkInPhone]    = useState("");
  const [walkInError,    setWalkInError]    = useState("");
  const [walkInLoading,  setWalkInLoading]  = useState(false);
  const [walkInMode,     setWalkInMode]     = useState("customer");
  const [walkInEmail,    setWalkInEmail]    = useState("");
  const [walkInPw,       setWalkInPw]       = useState("");
  const [walkInUser,     setWalkInUser]     = useState(null);
  const [wiReg, setWiReg] = useState({name:"",email:"",phone:"",address:"",role:"staff",note:""});
  const [wiRegSaving, setWiRegSaving] = useState(false);
  const [wiRegMsg, setWiRegMsg] = useState(null);
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPw,    setDriverPw]    = useState("");
  const [driverUser,  setDriverUser]  = useState(null);
  const [driverData,  setDriverData]  = useState(null);
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCustForm, setNewCustForm] = useState({name:"",address:"",phone:"",email:"",state:""});
  const [newCustSaving,setNewCustSaving]=useState(false);
  const [driverError, setDriverError] = useState("");
  const [driverLoading, setDriverLoading] = useState(false);

  // -- WhatsApp OTP states (shared across all user types) ---------------------
  const [otpPhone,    setOtpPhone]    = useState("");
  const [otpCode,     setOtpCode]     = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [otpLoading,  setOtpLoading]  = useState(false);
  const [otpError,    setOtpError]    = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0); // seconds until resend allowed
  // Driver OTP
  const [driverOtpPhone,   setDriverOtpPhone]   = useState("");
  const [driverOtpCode,    setDriverOtpCode]    = useState("");
  const [driverOtpSent,    setDriverOtpSent]    = useState(false);
  const [driverOtpLoading, setDriverOtpLoading] = useState(false);
  const [driverOtpError,   setDriverOtpError]   = useState("");
  const [driverOtpCooldown,setDriverOtpCooldown]= useState(0);
  // Walk-in OTP
  const [wiOtpPhone,    setWiOtpPhone]    = useState("");
  const [wiOtpCode,     setWiOtpCode]     = useState("");
  const [wiOtpSent,     setWiOtpSent]     = useState(false);
  const [wiOtpLoading,  setWiOtpLoading]  = useState(false);
  const [wiOtpError,    setWiOtpError]    = useState("");
  const [wiOtpCooldown, setWiOtpCooldown] = useState(0);
  const [driverTab,   setDriverTab]   = useState("dashboard");
  const [driverSaleCust, setDriverSaleCust] = useState(null);
  const [driverViewInv, setDriverViewInv] = useState(null);
  const [showHistoryPayment, setShowHistoryPayment] = useState(false);
  const [createdSaleForHistory, setCreatedSaleForHistory] = useState(null);
  const [createdSale, setCreatedSale] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({method:"cash",checkNum:"",zelleRef:"",bankName:"",notes:""});
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [histSearch, setHistSearch] = useState("");
  const [histPage, setHistPage] = useState(0);
  const HIST_PER_PAGE = 10;
  // Bulk pay states
  const [bulkPayCust,   setBulkPayCust]   = useState("");
  const [bulkPaySel,    setBulkPaySel]    = useState(new Set());
  const [bulkPayMethod, setBulkPayMethod] = useState("cash");
  const [bulkPayCheck,  setBulkPayCheck]  = useState("");
  const [bulkPayNote,   setBulkPayNote]   = useState("");
  const [bulkPaySaving, setBulkPaySaving] = useState(false);

  // -- INVOICE LINK HANDLER (from WhatsApp) ------------------------------------
  const [invoiceLink, setInvoiceLink] = useState(()=>{
    const p=new URLSearchParams(window.location.search);
    return p.get("invoice")||null;
  });
  const [invoiceLinkData, setInvoiceLinkData] = useState(null); // {sale, customer, payment, co}
  const [invoiceLinkPhone, setInvoiceLinkPhone] = useState("");
  const [invoiceLinkVerified, setInvoiceLinkVerified] = useState(false);
  const [invoiceLinkLoading, setInvoiceLinkLoading] = useState(false);
  const [invoiceLinkError, setInvoiceLinkError] = useState("");

  useEffect(()=>{
    if(!invoiceLink) return;
    // Pre-load invoice data (sale + products for display after phone verify)
    (async()=>{
      const {data:sale}=await db.from("sales").select("*").eq("id",invoiceLink).maybeSingle();
      if(!sale){setInvoiceLinkError("Invoice not found.");return;}
      const {data:cust}=await db.from("customers").select("*").eq("id",sale.cust_id).maybeSingle();
      const {data:pmt}=await db.from("payments").select("*").eq("sale_id",sale.id).maybeSingle();
      const {data:coData}=await db.from("company").select("*").maybeSingle();
      const pids=[...new Set((sale.items||[]).map(i=>i.pid))];
      const {data:prods}=await db.from("products").select("*").in("id",pids);
      setInvoiceLinkData({sale,customer:cust,payment:pmt,co:coData,products:prods||[]});
    })();
  },[invoiceLink]);

  const verifyInvoicePhone=async()=>{
    if(!invoiceLinkData) return;
    setInvoiceLinkLoading(true);setInvoiceLinkError("");
    const phone=invoiceLinkPhone.replace(/\D/g,"");
    const custPhone=(invoiceLinkData.customer?.phone||"").replace(/\D/g,"");
    // Match last 10 digits
    if(phone.length>=10 && custPhone.slice(-10)===phone.slice(-10)){
      setInvoiceLinkVerified(true);
    } else {
      setInvoiceLinkError("Phone number doesn't match. Please enter the phone number on this account.");
    }
    setInvoiceLinkLoading(false);
  };

  // -- WhatsApp OTP helpers ---------------------------------------------------
  const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  const startCooldown = (setter, secs=60) => {
    setter(secs);
    const t = setInterval(()=>setter(p=>{if(p<=1){clearInterval(t);return 0;}return p-1;}),1000);
  };

  const sendOtp = async (phone, context="Login") => {
    const clean = phone.replace(/\D/g,"");
    if(clean.length < 10) return {ok:false, err:"Enter a valid 10-digit phone number"};
    const to = clean.length===10 ? "1"+clean : clean;
    const code = genOtp();
    const expiresAt = new Date(Date.now() + 10*60*1000).toISOString();

    // Call edge function â€” it uses service role to insert OTP + sends WhatsApp
    const res = await fetch("/api/functions/send-otp",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({to, code, expires_at:expiresAt, context})
    });
    if(!res.ok) return {ok:false, err:"Failed to send WhatsApp code. Try again."};
    return {ok:true, to};
  };

  const verifyOtp = async (phone, code) => {
    const clean = phone.replace(/\D/g,"");
    const to = clean.length===10 ? "1"+clean : clean;
    const res = await fetch("/api/functions/send-otp",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({action:"verify", to, code})
    });
    if(!res.ok) return {ok:false, err:"Invalid or expired code. Request a new one."};
    const data = await res.json().catch(()=>({}));
    return data.ok ? {ok:true} : {ok:false, err:data.err||"Invalid or expired code."};
  };

  // Driver: send OTP
  // Uses public /api/auth/find-driver to resolve tenant BEFORE any auth,
  // stores a short-lived driver session so supabase calls include X-Tenant-ID
  const sendDriverOtp = async () => {
    setDriverOtpLoading(true); setDriverOtpError("");
    const clean = driverOtpPhone.replace(/\D/g,"");
    if(clean.length<10){ setDriverOtpError("Enter a valid phone number."); setDriverOtpLoading(false); return; }
    try{
      const r = await fetch("/api/auth/find-driver",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:clean}),
      });
      const d = await r.json();
      if(!r.ok||!d.ok){ setDriverOtpError(d.error||"No driver found with this phone number. Contact admin."); setDriverOtpLoading(false); return; }
      // Bootstrap tenant session â€” supabase calls after this will include X-Tenant-ID
      localStorage.setItem("vitalwaveone_driver", JSON.stringify({
        tenant_id:d.tenant_id, truck_id:d.truck_id,
        expires: Date.now()+30*60*1000, // 30 min, extended to 12h after verify
      }));
      const res = await sendOtp(driverOtpPhone, "Driver Login");
      if(!res.ok){ setDriverOtpError(res.err); setDriverOtpLoading(false); return; }
      setDriverOtpSent(true);
      startCooldown(setDriverOtpCooldown);
    }catch(e){ setDriverOtpError(e.message); }
    setDriverOtpLoading(false);
  };

  // Driver: verify OTP â€” fetches ALL data incl. products, extends session to 12h
  const verifyDriverOtp = async () => {
    setDriverOtpLoading(true); setDriverOtpError("");
    const res = await verifyOtp(driverOtpPhone, driverOtpCode);
    if(!res.ok){ setDriverOtpError(res.err); setDriverOtpLoading(false); return; }

    try {
      // truck_id was stored in short-lived session during sendDriverOtp
      const stored = JSON.parse(localStorage.getItem("vitalwaveone_driver")||"{}");
      const truckId = stored.truck_id;
      const tenantId = stored.tenant_id;
      if(!truckId) throw new Error("Session expired. Please request a new code.");
      if(!tenantId) throw new Error("Tenant ID missing. Contact admin.");

      const [truckR, custsR, loadsR, taxesR, pmtsR, coR, prodsR, salesR] = await Promise.all([
        db.from("trucks").select("*").eq("id",truckId).eq("tenant_id",tenantId).single(),
        db.from("customers").select("id,name,address,phone,email,state,truck_id,notes").eq("truck_id",truckId).eq("tenant_id",tenantId),
        db.from("loads").select("*").eq("truck_id",truckId).eq("tenant_id",tenantId).eq("status","out").order("created_at",{ascending:false}),
        db.from("state_taxes").select("*").eq("tenant_id",tenantId),
        db.from("payments").select("sale_id,status,method,amount").eq("status","paid").eq("tenant_id",tenantId),
        db.from("company").select("*").eq("tenant_id",tenantId).single(),
        db.from("products").select("*").eq("tenant_id",tenantId).order("name"), // fetch fresh products for THIS TENANT ONLY
        db.from("sales").select("*").eq("tenant_id",tenantId).order("created_at",{ascending:false}),
      ]);

      const truck = truckR.data;
      if(!truck) throw new Error("Driver not found. Contact admin.");

      // Use sales data from Promise.all (already tenant-filtered)
      const salesData = salesR.data || [];

      const paidSaleIds=new Set((pmtsR.data||[]).map(p=>p.sale_id));
      const salesWithPaid=salesData.map(s=>({...s,_paid:paidSaleIds.has(s.id)}));

      const allLoads=loadsR.data||[];
      let mergedLoad=null;
      if(allLoads.length>0){
        const itemMap={};
        allLoads.forEach(load=>(load.items||[]).forEach(item=>{itemMap[item.pid]=(itemMap[item.pid]||0)+item.qty;}));
        mergedLoad={...allLoads[0],items:Object.entries(itemMap).map(([pid,qty])=>({pid,qty})),_allLoadIds:allLoads.map(l=>l.id)};
      }

      // Extend to full 12-hour session now that OTP is verified
      localStorage.setItem("vitalwaveone_driver", JSON.stringify({
        tenant_id:stored.tenant_id, truck_id:truckId,
        phone:driverOtpPhone, driver:truck.driver,
        expires: Date.now()+12*60*60*1000,
      }));

      // Refresh main products state so DriverLoadTab, DriverSellTab, customer portal all see fresh data
      if(prodsR.data) setProducts(prodsR.data);

      setDriverUser({phone:driverOtpPhone,driver:truck.driver,truck_id:truckId});
      setDriverData({
        profile:{truck_id:truckId},
        truck,
        customers:custsR.data||[],
        activeLoad:mergedLoad,
        sales:salesWithPaid,
        stateTaxes:taxesR.data||[],
        co:coR.data||null,
        userId:null,
        products:prodsR.data||[], // direct reference â€” used by DriverLoadTab as source of truth
      });
    } catch(e) {
      setDriverOtpError(e.message);
    }
    setDriverOtpLoading(false);
  };

  // Customer: send OTP
  const sendCustOtp = async () => {
    setOtpLoading(true); setOtpError("");
    const clean = otpPhone.replace(/\D/g,"");
    const match = customers.find(c=>{const cp=(c.phone||"").replace(/\D/g,"");return cp.length>=10&&cp.slice(-10)===clean.slice(-10);});
    if(!match) { setOtpError("No account found with this phone number."); setOtpLoading(false); return; }
    const res = await sendOtp(otpPhone, "Customer Login");
    if(!res.ok) { setOtpError(res.err); setOtpLoading(false); return; }
    setOtpSent(true);
    startCooldown(setOtpCooldown);
    setOtpLoading(false);
  };

  // Customer: verify OTP
  const verifyCustOtp = async () => {
    setOtpLoading(true); setOtpError("");
    const res = await verifyOtp(otpPhone, otpCode);
    if(!res.ok) { setOtpError(res.err); setOtpLoading(false); return; }
    const clean = otpPhone.replace(/\D/g,"");
    const match = customers.find(c=>{const cp=(c.phone||"").replace(/\D/g,"");return cp.slice(-10)===clean.slice(-10);});
    setWalkInCust(match); setWalkInVerified(true);
    setOtpLoading(false);
  };

  // Walk-in staff: send OTP
  const sendWiOtp = async () => {
    setWiOtpLoading(true); setWiOtpError("");
    const clean = wiOtpPhone.replace(/\D/g,"");
    // Find in walkin_registrations (approved) or profiles
    const {data:regs} = await db.from("walkin_registrations").select("*").eq("status","approved");
    const match = (regs||[]).find(r=>{const rp=(r.phone||"").replace(/\D/g,"");return rp.slice(-10)===clean.slice(-10);});
    if(!match) { setWiOtpError("No approved account found with this phone. Contact admin."); setWiOtpLoading(false); return; }
    const res = await sendOtp(wiOtpPhone, "Staff Login");
    if(!res.ok) { setWiOtpError(res.err); setWiOtpLoading(false); return; }
    setWiOtpSent(true);
    startCooldown(setWiOtpCooldown);
    setWiOtpLoading(false);
  };

  // Walk-in staff: verify OTP
  const verifyWiOtp = async () => {
    setWiOtpLoading(true); setWiOtpError("");
    const res = await verifyOtp(wiOtpPhone, wiOtpCode);
    if(!res.ok) { setWiOtpError(res.err); setWiOtpLoading(false); return; }
    const clean = wiOtpPhone.replace(/\D/g,"");
    const {data:regs} = await db.from("walkin_registrations").select("*").eq("status","approved");
    const match = (regs||[]).find(r=>{const rp=(r.phone||"").replace(/\D/g,"");return rp.slice(-10)===clean.slice(-10);});
    setWalkInUser({phone:wiOtpPhone, role:match?.role||"staff", displayName:match?.name||"Staff"});
    setWalkInCust(null); setWalkInVerified(true);
    setWiOtpLoading(false);
  };

  const collectPayment = async (sale, method) => {
    setPaymentSaving(true);
    try{
      const st = driverData?.stateTaxes?.find(s=>s.id===(sale.state||""));
      const rate = st?.exempt ? 0 : parseFloat(st?.rate||0);
      const taxable = (sale.items||[]).reduce((a,i)=>{
        const p = products.find(x=>x.id===i.pid);
        return isTaxableProd(p) ? a+(p?.price||0)*i.qty : a;
      }, 0);
      const saleTax = parseFloat((taxable*rate/100).toFixed(2));
      const gt = parseFloat((sale.total+saleTax).toFixed(2));
      const surcharge = method==="card" ? parseFloat((gt*CARD_FEE/100).toFixed(2)) : 0;
      // previous_balance already contains penalty â€” do NOT add check_penalty_applied separately
      const total = parseFloat((gt+surcharge+parseFloat(sale.previous_balance||0)).toFixed(2));
      const {data:existing} = await db.from("payments").select("id,sale_id").eq("sale_id",sale.id).maybeSingle();
      const payData = {
        status:"paid",
        method,
        amount:total,
        check_number:payForm.checkNum||"",
        bank_name:payForm.bankName||"",
        zelle_ref:payForm.zelleRef||"",
        note: payForm.notes||"",
        collected_at:new Date().toISOString(),
      };
      if(existing){
        await db.from("payments").update(payData).eq("sale_id",sale.id);
      } else {
        await db.from("payments").insert({sale_id:sale.id,...payData});
      }
      setDriverData(prev=>({...prev,sales:prev.sales.map(s=>s.id===sale.id?{...s,_paid:true}:s)}));
      setPayForm({method:"cash",checkNum:"",zelleRef:"",bankName:"",notes:""});
    }catch(e){console.error("Payment error:",e.message);}
    setPaymentSaving(false);
  };
  const [payMethod, setPayMethod] = useState("delivery"); // "delivery" | "card"
  const [stripeReady, setStripeReady] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [stripeError, setStripeError] = useState(null);
  const [stripeInst, setStripeInst] = useState(null);

  // Customer state
  const [selCust,   setSelCust]   = useState(null);
  const [portalStateTaxes, setPortalStateTaxes] = useState([]);
  const [custSearch,setCustSearch]= useState("");
  const [custPhone, setCustPhone] = useState("");
  const [verifyError,setVerifyError] = useState("");

  // Registration form
  const [reg, setReg] = useState({
    businessName:"", ownerName:"", email:"", phone:"", address:"", city:"", state:"TX", zip:""
  });
  const [regErrors, setRegErrors] = useState({});

  // Order state
  const [quantities, setQuantities] = useState({});
  const [notes,      setNotes]      = useState("");
  const [catFilter,  setCatFilter]  = useState("All");
  const [search,     setSearch]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [order,      setOrder]      = useState(null);
  const [sigData,    setSigData]    = useState(null); // base64 signature
  const [sigDrawing, setSigDrawing] = useState(false);
  const sigCanvasRef = useRef(null);

  // Load data - FOR UNAUTHENTICATED PORTAL ONLY (customer/walk-in search)
  // Note: This load happens before login. It may fail if RLS policies require auth.
  // In that case, move this to after authentication or fetch per-tenant only.
  useEffect(()=>{
    (async()=>{
      try{
        const [pr, cu, co, ld, sa, rt, stx] = await Promise.all([
          db.from("products").select("*").order("cat").order("name"),
          db.from("customers").select("*").order("name"),
          db.from("company").select("*").single(),
          db.from("loads").select("*").eq("status","out"),
          db.from("sales").select("*"),
          db.from("returns").select("*"),
          db.from("state_taxes").select("*"),
        ]);
        // Handle API errors gracefully for unauthenticated queries
        if(cu.data) setCustomers(cu.data);
        if(stx.data) setPortalStateTaxes(stx.data);
        if(co.data) setCo(co.data);

      if(pr.data){
        const loads = ld.data||[];
        const sales = sa.data||[];
        const returns = rt.data||[];

        // Calculate units on trucks per product
        const onTrucks = {};
        loads.forEach(load=>{
          // Units loaded
          (load.items||[]).forEach(i=>{
            onTrucks[i.pid] = (onTrucks[i.pid]||0) + i.qty;
          });
          // Minus sold from this load
          sales.filter(s=>s.load_id===load.id).forEach(s=>{
            (s.items||[]).forEach(i=>{
              onTrucks[i.pid] = (onTrucks[i.pid]||0) - i.qty;
            });
          });
          // Minus returned from this load
          returns.filter(r=>r.load_id===load.id).forEach(r=>{
            (r.items||[]).forEach(i=>{
              onTrucks[i.pid] = (onTrucks[i.pid]||0) - i.qty;
            });
          });
        });

        // Total available = warehouse shelf + on trucks (remaining)
        const enriched = pr.data.map(p=>({
          ...p,
          onTruck: Math.max(0, onTrucks[p.id]||0),
          totalStock: p.shelf + Math.max(0, onTrucks[p.id]||0),
        }));
        setProducts(enriched.filter(p=>p.totalStock>0));
      }
      setLoading(false);
      }catch(e){ console.error("Portal load error:",e); setLoading(false); }
    })();
  },[]);

  const cats = useMemo(()=>["All",...new Set(products.map(p=>p.cat))],[products]);
  // Tax rate from customer's state - uses the same state_taxes table as all other platforms
  // Online/offline detection + auto-sync on reconnect
  useEffect(()=>{
    const goOnline=async()=>{
      setIsOnline(true);
      // Auto-sync any pending drafts for current driver
      const drafts=JSON.parse(localStorage.getItem("vw_draft_queue")||"[]");
      if(!drafts.length)return;
      let synced=0;
      const remaining=[];
      for(const draft of drafts){
        try{
          const{data:seqData}=await db.rpc("next_invoice_number");
          const invId="INV-"+String(seqData||1).padStart(4,"0");
          // SECURITY FIX: Ensure company_id is set when syncing drafts
          const ns={...draft,id:invId,company_id:co?.id};
          delete ns._draftId;delete ns._truckId;delete ns._offline;
          await db.from("sales").insert(ns);
          await db.from("payments").insert({sale_id:ns.id,status:"unpaid"});
          synced++;
        }catch{remaining.push(draft);}
      }
      localStorage.setItem("vw_draft_queue",JSON.stringify(remaining));
      setDraftQueue(remaining);
      if(synced>0)alert(`âœ… Back online â€” synced ${synced} offline sale${synced!==1?"s":""}`);
    };
    const goOffline=()=>setIsOnline(false);
    window.addEventListener("online",goOnline);
    window.addEventListener("offline",goOffline);
    return()=>{window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline);};
  },[]);

  const taxRate = useMemo(()=>{
    if(!selCust?.state) return 0;
    const st = portalStateTaxes.find(s=>s.id===selCust.state);
    return st?.exempt ? 0 : parseFloat(st?.rate||0);
  },[selCust?.state, portalStateTaxes]);

  const filtered = useMemo(()=>products.filter(p=>{
    if(catFilter!=="All"&&p.cat!==catFilter) return false;
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())&&!p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[products,catFilter,search]);

  const orderItems = useMemo(()=>
    Object.entries(quantities).filter(([,q])=>q>0).map(([pid,qty])=>({pid,qty:parseInt(qty),name:products.find(p=>p.id===pid)?.name||""}))
  ,[quantities,products]);

  const subtotal = useMemo(()=>orderItems.reduce((a,i)=>a+getEffectivePrice(selCust,products.find(p=>p.id===i.pid))*i.qty,0),[orderItems,products,selCust]);
  const tax = parseFloat((orderItems.reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?a+getEffectivePrice(selCust,p)*i.qty:a;},0)*taxRate/100).toFixed(2));
  const total = subtotal+tax;
  const [promoCode,setPromoCode]=useState("");
  const [promoApplied,setPromoApplied]=useState(null); // {code,discount,label}
  const [promoError,setPromoError]=useState("");
  const applyPromo=async()=>{
    if(!promoCode.trim())return;
    setPromoError("");
    try{
      const{data,error}=await db.from("promotions").select("*").eq("code",promoCode.trim().toUpperCase()).eq("active",true).single();
      if(error||!data){setPromoError("Invalid or expired promo code");return;}
      if(data.expiry&&new Date(data.expiry)<new Date()){setPromoError("This promo code has expired");return;}
      if(data.min_order>0&&total<data.min_order){setPromoError(`Minimum order of $${data.min_order.toFixed(2)} required`);return;}
      let discount=0;
      if(data.type==="percent")discount=parseFloat((total*data.value/100).toFixed(2));
      else if(data.type==="fixed")discount=Math.min(data.value,total);
      else if(data.type==="bogo"){
        const maxItem=orderItems.reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);const pr=getEffectivePrice(selCust,p)||0;return pr>a?pr:a;},0);
        discount=maxItem;
      }
      setPromoApplied({code:data.code,discount,label:data.type==="percent"?`${data.value}% off`:data.type==="fixed"?`$${data.value} off`:data.type==="bogo"?"Buy 1 Get 1":"Discount"});
      // Increment uses counter
      db.from("promotions").update({uses:(data.uses||0)+1}).eq("id",data.id).then(()=>{});
    }catch(e){setPromoError("Could not apply promo code");}
  };
  const promoDiscount=promoApplied?.discount||0;
  const custRcFlag=(selCust?.notes||"").includes("RETURNED_CHECK:1");
  const custRcFee=parseFloat(co?.check_penalty||50);
  const cardSurcharge = payMethod==="card" ? parseFloat(((total-promoDiscount)*CARD_FEE/100).toFixed(2)) : 0;
  const grandTotal = parseFloat((total-promoDiscount+cardSurcharge).toFixed(2));

  const setQty=(pid,val,max)=>setQuantities(prev=>({...prev,[pid]:Math.min(max,Math.max(0,parseInt(val)||0))}));

  // -- VALIDATE REGISTRATION --------------------------------------------------
  const validateReg = () => {
    const errs = {};
    if(!reg.businessName.trim()) errs.businessName = "Required";
    if(!reg.ownerName.trim())    errs.ownerName    = "Required";
    if(!reg.email.trim()||!/\S+@\S+\.\S+/.test(reg.email)) errs.email = "Valid email required";
    if(!reg.phone.trim())        errs.phone        = "Required";
    if(!reg.address.trim())      errs.address      = "Required";
    if(!reg.city.trim())         errs.city         = "Required";
    setRegErrors(errs);
    return Object.keys(errs).length===0;
  };

  // -- REGISTER NEW CUSTOMER --------------------------------------------------
  const handleRegister = async () => {
    if(!validateReg()) return;
    setSubmitting(true);
    try {
      const fullAddress = `${reg.address}, ${reg.city}, ${reg.state} ${reg.zip}`.trim();
      // SECURITY FIX #4: Add company_id to ensure tenant isolation
      const newCust = {
        id: "C"+uid(),
        name: reg.businessName,
        address: fullAddress,
        phone: reg.phone,
        email: reg.email,
        state: reg.state||"",
        notes: `Owner: ${reg.ownerName}`,
        truck_id: null,
        company_id: co?.id,  // SECURITY: Add company_id for tenant isolation
        created_at: new Date().toISOString(),
      };

      // SECURITY: Validate registration data
      const validation = validateWalkInRegistration(newCust, co?.id);
      if(!validation.valid) {
        throw new Error(validation.errors[0] || "Invalid registration data");
      }

      const {error} = await db.from("customers").insert(newCust);
      if(error) throw error;
      setCustomers(prev=>[...prev, newCust]);
      setSelCust({...newCust, ownerName: reg.ownerName});
      setStep("order");
    } catch(e) {
      setPortalError("Registration error: "+e.message);
    }
    setSubmitting(false);
  };

  // -- SUBMIT ORDER -----------------------------------------------------------
  const handleSubmit = async () => {
    if(!orderItems.length) return;

    // Validate every item against current totalStock (shelf + on trucks)
    const outOfStock = orderItems.filter(i=>{
      const p = products.find(x=>x.id===i.pid);
      return !p || i.qty > (p.totalStock||0);
    });
    if(outOfStock.length){
      const msgs = outOfStock.map(i=>{
        const p = products.find(x=>x.id===i.pid);
        const avail = p?.totalStock||0;
        return avail===0
          ? `"${p?.name||i.pid}" is out of stock`
          : `"${p?.name||i.pid}"  -  only ${avail} available, you ordered ${i.qty}`;
      });
      setPortalError("âš ï¸ Stock issue: " + msgs.join(" Â· ") + " â€” please adjust quantities.");
      return;
    }

    setSubmitting(true);
    try {
      const id = "ORD-"+uid();
      // If paying by card - confirm Stripe payment first
      if(payMethod==="card" && stripeInst && clientSecret){
        const elements = document.querySelector("#stripe-card-element");
        // Confirm card payment via Stripe
        const result = await stripeInst.confirmCardPayment(clientSecret, {
          payment_method: { card: elements }
        });
        if(result.error) {
          setStripeError(result.error.message);
          setSubmitting(false);
          return;
        }
      }
      const rec = {
        id,
        cust_id: selCust.id,
        customer_name: selCust.name,
        customer_address: selCust.address||"",
        customer_phone: selCust.phone||"",
        custNotes: selCust.notes||"",
        date: nowStr(),
        items: orderItems,
        subtotal,
        tax,
        total: grandTotal,
        notes: notes+(payMethod==="card"?` | Paid by card online (incl. ${CARD_FEE}% surcharge $${cardSurcharge.toFixed(2)})`:" | Payment on delivery"),
        previous_balance: custPrevBalance||0,
        previous_invoice_ids: custPrevInvs.map(s=>s.id).join(",")||"",
        check_penalty_applied: 0,
        status: "approved",
        payment_method: payMethod,
        signature: sigData||null,
        created_at: new Date().toISOString(),
      };
      const {error} = await db.from("orders").insert(rec);
      if(error) throw error;
      setOrder({
        ...rec,
        businessName: selCust.name,
        ownerName: selCust.notes?.replace("Owner: ","")||"",
        address: selCust.address,
        phone: selCust.phone,
        email: selCust.email,
        paidOnline: payMethod==="card",
      });
      setStep("confirm");
    } catch(e) {
      setPortalError("Order error: "+e.message);
    }
    setSubmitting(false);
  };

  const resetAll = () => {
    setStep("home"); setIsNew(false); setIsExisting(false); setIsDriver(false); setIsWalkIn(false); setSelCust(null);
    setCustSearch(""); setCustPhone(""); setVerifyError(""); setQuantities({}); setNotes(""); setOrder(null);
    setPayMethod("delivery"); setClientSecret(null); setStripeError(null); setStripeReady(false);
    localStorage.removeItem("vitalwaveone_driver");
    setDriverUser(null); setDriverData(null); setDriverEmail(""); setDriverPw(""); setDriverError("");
    setWalkInVerified(false); setWalkInCust(null); setWalkInSearch(""); setWalkInPhone(""); setWalkInError("");
    setWalkInMode("customer"); setWalkInEmail(""); setWalkInPw(""); setWalkInUser(null);
    setWiReg({name:"",email:"",phone:"",address:"",role:"staff",note:""}); setWiRegMsg(null);
    setReg({businessName:"",ownerName:"",email:"",phone:"",address:"",city:"",state:"TX",zip:""});
  };

  // handleDriverLogin â€” legacy email/password path removed (app uses WhatsApp OTP via sendDriverOtp/verifyDriverOtp)
  const handleDriverLogin = async () => {
    setDriverError("Please use the WhatsApp OTP login below.");
  };

  // -- DRIVER LOCATION HEARTBEAT ----------------------------------------------
  // Sends GPS coordinates to Supabase every 60s while driver is logged in
  useEffect(()=>{
    if(!driverData?.userId) return;
    const sendLocation = ()=>{
      // Silently attempt location update â€” columns may not exist, errors are ignored
      const updateLastSeen = () => {
        db.from("profiles").update({last_seen:new Date().toISOString()})
          .eq("id",driverData.userId).then(()=>{}).catch(()=>{});
      };
      if(!navigator.geolocation){ updateLastSeen(); return; }
      navigator.geolocation.getCurrentPosition(pos=>{
        db.from("profiles").update({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          last_seen: new Date().toISOString(),
        }).eq("id", driverData.userId).then(()=>{}).catch(()=>{});
      }, ()=>{ updateLastSeen(); });
    };
    sendLocation();
    const interval = setInterval(sendLocation, 60000);
    return ()=>clearInterval(interval);
  },[driverData?.userId]);

  // Verify customer by shop name + phone
  const [custPrevBalance, setCustPrevBalance] = useState(0);
  const [custPrevInvs, setCustPrevInvs] = useState([]);

  const verifyCustomer = async () => {
    setVerifyError("");
    if(!custSearch.trim()) return setVerifyError("Please enter your business name");
    if(!custPhone.trim()) return setVerifyError("Please enter your phone number");

    const normalize = p => p.replace(/[\s\-\(\)\+\.]/g,"");
    const inputPhone = normalize(custPhone);
    const inputName = custSearch.trim().toLowerCase();

    const match = customers.find(c => {
      const nameMatch = c.name.toLowerCase().includes(inputName) || inputName.includes(c.name.toLowerCase());
      const phoneMatch = normalize(c.phone||"") === inputPhone || normalize(c.phone||"").endsWith(inputPhone) || inputPhone.endsWith(normalize(c.phone||"").slice(-7));
      return nameMatch && phoneMatch;
    });

    if(!match){
      setVerifyError("No account found with that name and phone number. Please check your details or register below.");
      return;
    }

    // Check unpaid balance
    const [{data:custSales},{data:pmts}] = await Promise.all([
      db.from("sales").select("id,total,date,state,items,previous_balance,check_penalty_applied").eq("cust_id",match.id),
      db.from("payments").select("sale_id,status").eq("status","unpaid"),
    ]);
    const unpaidIds = new Set((pmts||[]).map(p=>p.sale_id));
    const allUnpaid = (custSales||[]).filter(s=>unpaidIds.has(s.id)||!(pmts||[]).find(p=>p.sale_id===s.id));
    // Fetch state taxes for accurate balance calculation
    const {data:staxes} = await db.from("state_taxes").select("*");
    const bal = parseFloat(allUnpaid.reduce((a,s)=>{
      const st = (staxes||[]).find(x=>x.id===(s.state||""));
      const rate = st?.exempt ? 0 : parseFloat(st?.rate||co?.tax_rate||0);
      const taxable = (s.items||[]).reduce((b,i)=>{
        const p = products.find(x=>x.id===i.pid);
        return isTaxableProd(p) ? b+(p?.price||0)*i.qty : b;
      }, 0);
      const tax = parseFloat((taxable*rate/100).toFixed(2));
      return a + s.total + tax + parseFloat(s.previous_balance||0);
    }, 0).toFixed(2));
    setCustPrevBalance(bal);
    setCustPrevInvs(allUnpaid);

    setSelCust(match);
    setStep("custchoice"); // Show order vs view account choice
  };

  // Walk-in auth - customers by name+phone, drivers/admin/staff by email+password
  const verifyWalkIn = async () => {
    setWalkInError(""); setWalkInLoading(true);
    try {
      if(walkInMode==="customer"){
        if(!walkInSearch.trim()) throw new Error("Please enter your business name");
        if(!walkInPhone.trim())  throw new Error("Please enter your phone number");
        const normalize = p => p.replace(/[\s\-\(\)\+\.]/g,"");
        const inputPhone = normalize(walkInPhone);
        const inputName  = walkInSearch.trim().toLowerCase();
        const match = customers.find(c => {
          const nameMatch  = c.name.toLowerCase().includes(inputName)||inputName.includes(c.name.toLowerCase());
          const phoneMatch = normalize(c.phone||"")===inputPhone||normalize(c.phone||"").endsWith(inputPhone)||inputPhone.endsWith(normalize(c.phone||"").slice(-7));
          return nameMatch && phoneMatch;
        });
        if(!match) throw new Error("No registered customer found. Check your business name and phone number.");
        setWalkInCust(match); setWalkInVerified(true);
      } else {
        // Staff / Driver / Admin â€” WhatsApp OTP login (password auth removed with Clerk).
        // Direct staff to the driver app login page instead.
        throw new Error("Staff and driver login is handled via the VitalWaveOne driver app. Visit /login and enter your phone number to receive a WhatsApp OTP code.");
      }
    } catch(e){ setWalkInError(e.message); }
    setWalkInLoading(false);
  };

  // Staff self-registration for walk-in access (requires admin approval)
  const submitWiRegistration = async () => {
    setWiRegSaving(true); setWiRegMsg(null);
    try {
      if(!wiReg.name.trim()||!wiReg.email.trim()||!wiReg.phone.trim()) throw new Error("Name, email, and phone are required");
      // SECURITY FIX #4: Add company_id for tenant isolation
      const regData = {
        name: wiReg.name.trim(),
        email: wiReg.email.trim(),
        phone: wiReg.phone.trim(),
        address: wiReg.address.trim(),
        role: wiReg.role,
        note: wiReg.note.trim(),
        status:"pending",
        created_at: new Date().toISOString(),
        company_id: co?.id  // SECURITY: Ensure registration belongs to correct tenant
      };
      const {error} = await db.from("walkin_registrations").insert(regData);
      if(error) throw error;
      setWiRegMsg({t:"success", m:"âœ… Request submitted! An admin will review and approve your access."});
      setWiReg({name:"",email:"",phone:"",address:"",role:"staff",note:""});
    } catch(e){ setWiRegMsg({t:"error", m:e.message}); }
    setWiRegSaving(false);
  };

  // Send invoice email
  const sendInvoiceEmail = async (sale, cust) => {
    if(!cust?.email) { alert("Customer has no email address on file"); return; }
    try{
      const stateId = sale.state||cust?.state||"";
      const stData = driverData?.stateTaxes?.find?.(s=>s.id===stateId);
      const stateRate = stData?.exempt ? 0 : parseFloat(stData?.rate||co?.tax_rate||0);
      const items = (sale.items||[]).map(i=>{
        const p = products.find(x=>x.id===i.pid);
        return {name:p?.name||"Product",qty:i.qty,price:p?.price||0,unit:p?.unit||"",cat:p?.cat||""};
      });
      const sub = sale.total;
      const tax = parseFloat((items.reduce((a,i)=>{
        return isTaxableProd({cat:i.cat,name:i.name})?a+i.price*i.qty:a;
      },0)*stateRate/100).toFixed(2));
      const prevBalance = parseFloat(sale.previous_balance||0);
      const gt = sub+tax+prevBalance;

      // Resolve tenant from driver session â€” credentials fetched server-side via X-Tenant-ID
      let tenantId="";
      try{
        const ds=JSON.parse(localStorage.getItem("vitalwaveone_driver")||"{}");
        tenantId=ds.tenant_id||"";
      }catch{}

      const res=await fetch("/api/functions/send-invoice-email",{
        method:"POST",
        headers:{"Content-Type":"application/json","X-Tenant-ID":tenantId},
        body:JSON.stringify({
          to: cust.email,
          subject: `Invoice ${sale.id} from ${co?.name||"Your Supplier"}`,
          html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#212121">
            <div style="background:#0a1628;padding:20px;border-radius:8px 8px 0 0;text-align:center">
              <div style="color:#fff;font-size:22px;font-weight:700">${co?.name||"Your Supplier"}</div>
              <div style="color:#94a3b8;font-size:12px;margin-top:4px">Invoice ${sale.id} Â· ${fmtDate(sale)}</div>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
              <p>Hi <strong>${cust.name}</strong>,</p>
              <p>Please find your invoice details below.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left;font-size:12px">Product</th><th style="padding:8px;text-align:center;font-size:12px">Qty</th><th style="padding:8px;text-align:right;font-size:12px">Amount</th></tr></thead>
                <tbody>${items.map(i=>`<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${i.name}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${i.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">$${(i.price*i.qty).toFixed(2)}</td></tr>`).join("")}</tbody>
              </table>
              ${prevBalance>0?`<p>Previous balance: <strong>$${prevBalance.toFixed(2)}</strong></p>`:""}
              <div style="border-top:2px solid #0a1628;padding-top:12px;display:flex;justify-content:space-between">
                <strong>Total Due</strong><strong style="color:#0a1628;font-size:18px">$${gt.toFixed(2)}</strong>
              </div>
              <p style="margin-top:16px;font-size:12px;color:#6b7280">Contact: ${co?.phone||""} Â· ${co?.email||""}</p>
            </div>
          </body></html>`,
          from_name: co?.name||"VitalWaveOne",
          from_email: co?.from_email||co?.gmail_user||"",
        }),
      });
      if(res.ok){
        await db.from("sales").update({email_sent:true,email_sent_at:new Date().toISOString()}).eq("id",sale.id);
        setDriverData(prev=>({...prev,sales:prev.sales.map(s=>s.id===sale.id?{...s,email_sent:true}:s)}));
        alert(`âœ… Invoice emailed to ${cust.email}`);
      }else{
        const d=await res.json();
        alert("Email failed: "+(d.error||"unknown error"));
      }
    }catch(e){
      alert("Email error: "+e.message);
    }
  };
  const loadStripeIntent = async () => {
    setStripeError(null);
    setStripeReady(false);
    try {
      const res = await fetch("/api/functions/create-payment-intent", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({amount:grandTotal,currency:"usd",metadata:{customer_name:selCust?.name||"",order_portal:"true"}}),
      });
      const data = await res.json();
      if(data?.error) throw new Error(data.error);
      setClientSecret(data.clientSecret);
      // Dynamically load Stripe
      if(!window.Stripe){
        await new Promise((resolve,reject)=>{
          const s=document.createElement("script");
          s.src="https://js.stripe.com/v3/";
          s.onload=resolve; s.onerror=reject;
          document.head.appendChild(s);
        });
      }
      const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      setStripeInst(stripe);
      setStripeReady(true);
    } catch(e) {
      setStripeError(e.message);
    }
  };

  // -- PUBLIC INVOICE VIEW (from WhatsApp link) ---------------------------------
  if(invoiceLink && !loading) return (
    <div className="portal" style={{minHeight:"100vh",background:"#f8f5f0"}}>
      <GS/>
      <div style={{background:"#0a1628",padding:"0 24px",height:62,display:"flex",alignItems:"center",gap:12}}>
        <img src="/logo-sidebar.svg" style={{height:44,width:44,objectFit:"cover",borderRadius:8,background:"#fff",padding:2}}/>
        <div>
          <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:18,color:"#fff",lineHeight:1}}>{invoiceLinkData?.co?.name||"VitalWaveOne"}</div>
          <div style={{fontSize:9,color:"#4b6080",letterSpacing:".1em",marginTop:1}}>INVOICE PORTAL</div>
        </div>
      </div>
      <div style={{maxWidth:560,margin:"0 auto",padding:"32px 16px"}}>
        {invoiceLinkError&&!invoiceLinkVerified&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"14px 18px",marginBottom:16,color:"#dc2626",fontSize:13}}>{invoiceLinkError}</div>}

        {!invoiceLinkVerified?(
          /* Phone verification gate */
          <div style={{background:"#fff",borderRadius:16,padding:32,boxShadow:"0 4px 24px #0a162814",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>ðŸ“„</div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:24,color:"#0a1628",marginBottom:8}}>Invoice {invoiceLink}</div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:28,lineHeight:1.6}}>
              To view your invoice, please enter the phone number on your account to verify your identity.
            </div>
            <input
              type="tel"
              value={invoiceLinkPhone}
              onChange={e=>setInvoiceLinkPhone(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&verifyInvoicePhone()}
              placeholder="Your phone number"
              style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"13px 16px",fontSize:16,marginBottom:12,fontFamily:"'Inter',sans-serif",outline:"none",textAlign:"center"}}
            />
            {invoiceLinkError&&<div style={{color:"#dc2626",fontSize:12,marginBottom:10}}>{invoiceLinkError}</div>}
            <button onClick={verifyInvoicePhone} disabled={invoiceLinkLoading||invoiceLinkPhone.length<7}
              style={{width:"100%",background:"#0a1628",color:"#fff",border:"none",borderRadius:10,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
              {invoiceLinkLoading?"Verifyingâ€¦":"View My Invoice â†’"}
            </button>
          </div>
        ):(()=>{
          /* Verified â€” show invoice */
          const {sale,customer,payment,co:iCo,products:iProds}=invoiceLinkData;
          const isPaid=payment?.status==="paid";
          const sub=parseFloat(sale.total||0);
          const prev=parseFloat(sale.previous_balance||0);
          const grand=sub+prev;
          const stripeLink=iCo?.stripe_payment_link;
          return(
            <div>
              {/* Status banner */}
              <div style={{background:isPaid?"#f0fdf4":"#fef2f2",border:`1px solid ${isPaid?"#a7f3d0":"#fecaca"}`,borderRadius:12,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:28}}>{isPaid?"âœ…":"â³"}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:isPaid?"#065f46":"#dc2626"}}>{isPaid?"PAID â€” Thank you!":"PAYMENT DUE"}</div>
                  <div style={{fontSize:12,color:isPaid?"#065f46":"#991b1b",marginTop:2}}>{isPaid?`Paid on ${payment.collected_at?new Date(payment.collected_at).toLocaleDateString():"record"}`:`Balance: $${grand.toFixed(2)}`}</div>
                </div>
              </div>

              {/* Invoice card */}
              <div id="customer-invoice-doc" style={{background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px #0a162810",marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                  <div>
                    <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:22,color:"#0a1628"}}>{iCo?.name||"VitalWaveOne"}</div>
                    {iCo?.address&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{iCo.address}</div>}
                    {iCo?.phone&&<div style={{fontSize:11,color:"#9ca3af"}}>{iCo.phone}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:18,color:"#0a1628"}}>{sale.id}</div>
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{fmtDate(sale)}</div>
                  </div>
                </div>
                <div style={{background:"#f8f5f0",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
                  <div style={{fontSize:10,color:"#9ca3af",fontWeight:700,marginBottom:4}}>BILLED TO</div>
                  <div style={{fontWeight:700,color:"#0a1628"}}>{customer?.name}</div>
                  {customer?.address&&<div style={{fontSize:12,color:"#6b7280"}}>{customer.address}</div>}
                  {customer?.phone&&<div style={{fontSize:12,color:"#6b7280"}}>{customer.phone}</div>}
                </div>
                {/* Items */}
                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
                  <thead><tr style={{borderBottom:"2px solid #0a1628"}}>
                    {["Product","Qty","Unit Price","Amount"].map(h=><th key={h} style={{textAlign:h==="Product"?"left":"right",padding:"7px 6px",fontSize:10,color:"#6b7280",fontWeight:700}}>{h}</th>)}
                  </tr></thead>
                  <tbody>{(sale.items||[]).map((item,i)=>{
                    const p=iProds.find(x=>x.id===item.pid);
                    const price=sub/(sale.items||[]).reduce((a,it)=>a+it.qty,0)||p?.price||0;
                    // Use stored item amount if available, otherwise calculate
                    const unitP=item.price||(p?.price||0);
                    return(
                      <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                        <td style={{padding:"9px 6px",fontSize:13,color:"#0a1628",fontWeight:500}}>{p?.name||item.pid}</td>
                        <td style={{padding:"9px 6px",fontSize:13,textAlign:"right",color:"#6b7280"}}>{item.qty}</td>
                        <td style={{padding:"9px 6px",fontSize:13,textAlign:"right",color:"#6b7280"}}>${unitP.toFixed(2)}</td>
                        <td style={{padding:"9px 6px",fontSize:13,textAlign:"right",fontWeight:600,color:"#0a1628"}}>${(unitP*item.qty).toFixed(2)}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
                {/* Totals */}
                <div style={{borderTop:"1px solid #e5e7eb",paddingTop:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,color:"#6b7280"}}>Subtotal</span>
                    <span style={{fontSize:13,fontWeight:600}}>${sub.toFixed(2)}</span>
                  </div>
                  {prev>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,color:"#dc2626"}}>{sale.check_penalty_applied>0?"ðŸš¨ Returned Check Penalty":"Previous Balance"}</span>
                    <span style={{fontSize:13,fontWeight:600,color:"#dc2626"}}>+${prev.toFixed(2)}</span>
                  </div>}
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid #0a1628",marginTop:8,paddingTop:8}}>
                    <span style={{fontSize:15,fontWeight:700,color:"#0a1628"}}>TOTAL DUE</span>
                    <span style={{fontSize:18,fontWeight:900,color:"#0a1628",fontFamily:"'Inter',system-ui,sans-serif"}}>${grand.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Pay button */}
              {!isPaid&&stripeLink&&(
                <a href={`${stripeLink}?amount=${Math.round(grand*100)}`} target="_blank" rel="noreferrer"
                  style={{display:"block",background:"#0a1628",color:"#fff",borderRadius:12,padding:"16px",textAlign:"center",textDecoration:"none",fontWeight:700,fontSize:16,fontFamily:"'Inter',sans-serif",marginBottom:12,boxShadow:"0 4px 16px #0a162830"}}>
                  ðŸ’³ Pay Now â€” ${grand.toFixed(2)}
                </a>
              )}
              {!isPaid&&!stripeLink&&(
                <div style={{background:"#fff",borderRadius:12,padding:"16px",textAlign:"center",border:"1px solid #e5e7eb",fontSize:13,color:"#6b7280"}}>
                  ðŸ“ž To pay, please contact us at <strong>{iCo?.phone||"your driver"}</strong>
                </div>
              )}
              {/* PDF Download â€” pure jsPDF text rendering (works on all devices including mobile) */}
              <button onClick={async()=>{
                try{
                  const {jsPDF}=await import('jspdf');
                  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
                  const w=pdf.internal.pageSize.getWidth();
                  const margin=18;
                  let y=margin;

                  // Header bar
                  pdf.setFillColor(10,22,40);
                  pdf.rect(0,0,w,28,'F');
                  pdf.setTextColor(255,255,255);
                  pdf.setFontSize(20);pdf.setFont('helvetica','bold');
                  pdf.text('INVOICE',margin,18);
                  pdf.setFontSize(11);pdf.setFont('helvetica','normal');
                  pdf.text(`#${sale.id}`,margin,24);
                  pdf.setFontSize(10);
                  pdf.text(iCo?.name||'',w-margin,18,{align:'right'});
                  pdf.text(sale.date||'',w-margin,24,{align:'right'});
                  y=38;

                  // Bill To
                  pdf.setTextColor(100,100,100);pdf.setFontSize(8);pdf.setFont('helvetica','bold');
                  pdf.text('BILL TO',margin,y);
                  y+=5;
                  pdf.setTextColor(0,0,0);pdf.setFontSize(12);pdf.setFont('helvetica','bold');
                  pdf.text(customer?.name||'',margin,y);y+=5;
                  pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.setTextColor(100,100,100);
                  if(customer?.address){pdf.text(customer.address,margin,y);y+=4;}
                  if(customer?.phone){pdf.text(customer.phone,margin,y);y+=4;}
                  y+=4;

                  // Status badge
                  pdf.setFillColor(isPaid?220:254,isPaid?252:249,isPaid?231:196);
                  pdf.rect(margin,y-4,40,7,'F');
                  pdf.setTextColor(isPaid?22:133,isPaid?101:77,isPaid?52:30);
                  pdf.setFontSize(9);pdf.setFont('helvetica','bold');
                  pdf.text(isPaid?'âœ“ PAID':'â³ BALANCE DUE',margin+2,y+1);
                  y+=12;

                  // Items table header
                  pdf.setFillColor(249,250,251);
                  pdf.rect(margin,y-4,w-margin*2,7,'F');
                  pdf.setTextColor(100,100,100);pdf.setFontSize(8);pdf.setFont('helvetica','bold');
                  pdf.text('PRODUCT',margin+2,y);
                  pdf.text('QTY',w/2,y,{align:'center'});
                  pdf.text('AMOUNT',w-margin-2,y,{align:'right'});
                  y+=6;

                  // Items
                  pdf.setTextColor(0,0,0);pdf.setFont('helvetica','normal');pdf.setFontSize(10);
                  (sale.items||[]).forEach(item=>{
                    const p=iProds.find(x=>x.id===item.pid);
                    const unitP=item.price||(p?.price||0);
                    pdf.text(p?.name||item.pid,margin+2,y);
                    pdf.text(String(item.qty),w/2,y,{align:'center'});
                    pdf.text(`$${(unitP*item.qty).toFixed(2)}`,w-margin-2,y,{align:'right'});
                    y+=6;
                    pdf.setDrawColor(243,244,246);pdf.line(margin,y-2,w-margin,y-2);
                  });
                  y+=4;

                  // Totals
                  pdf.setDrawColor(10,22,40);pdf.setLineWidth(0.5);pdf.line(margin,y,w-margin,y);y+=5;
                  pdf.setFontSize(10);
                  if(sub!==grand){
                    pdf.setTextColor(100,100,100);pdf.setFont('helvetica','normal');
                    pdf.text('Subtotal',w-margin-40,y);pdf.text(`$${sub.toFixed(2)}`,w-margin-2,y,{align:'right'});y+=6;
                  }
                  if(prev>0){
                    pdf.setTextColor(220,38,38);pdf.setFont('helvetica','bold');
                    pdf.text('Previous Balance',w-margin-40,y);pdf.text(`+$${prev.toFixed(2)}`,w-margin-2,y,{align:'right'});y+=6;
                  }
                  pdf.setFillColor(10,22,40);pdf.rect(w-margin-80,y-4,80,9,'F');
                  pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(12);
                  pdf.text('TOTAL DUE',w-margin-78,y+2);
                  pdf.text(`$${grand.toFixed(2)}`,w-margin-2,y+2,{align:'right'});
                  y+=16;

                  // Footer
                  pdf.setTextColor(150,150,150);pdf.setFontSize(8);pdf.setFont('helvetica','normal');
                  pdf.text(`${iCo?.name||''} Â· ${iCo?.phone||''} Â· ${iCo?.email||''}`,w/2,y,{align:'center'});

                  pdf.save(`Invoice-${sale.id}.pdf`);
                }catch(e){alert('PDF generation failed: '+e.message);}
              }} style={{display:"block",width:"100%",background:"#0a1628",color:"#fff",border:"none",borderRadius:12,padding:"14px",textAlign:"center",fontWeight:700,fontSize:14,fontFamily:"'Inter',sans-serif",marginTop:10,cursor:"pointer"}}>
                â¬‡ï¸ Download Invoice PDF
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );

  // -- LOADING ----------------------------------------------------------------
  if(loading) return (
    <div className="portal" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <GS/>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:32,color:"#0a1628",marginBottom:8}}>VitalWaveOne</div>
        <div style={{fontSize:13,color:"#9ca3af"}}>Loading catalogâ€¦</div>
      </div>
    </div>
  );

  return (
    <div className="portal">
      <GS/>

      {/* â”€â”€ HEADER â”€â”€ */}
      <div className="no-print" style={{background:"#0a1628",padding:"0 24px",height:62,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px #00000040"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src="/logo-sidebar.svg" style={{height:46,width:46,objectFit:"cover",borderRadius:8,background:"#fff",padding:2}}/>
          <div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:18,color:"#fff",lineHeight:1}}>VitalWaveOne</div>
            <div style={{fontSize:9,color:"#4b6080",letterSpacing:".1em",marginTop:1}}>ORDER PORTAL</div>
          </div>
        </div>

        {/* Step indicators â€” only for customer ordering flow */}
        {!isDriver&&!driverUser&&<div style={{display:"flex",alignItems:"center",gap:6}}>
          {[{k:"home",l:"Start"},{k:"order",l:"Order"},{k:"review",l:"Review"},{k:"confirm",l:"Done"}].map((s,i,arr)=>{
            const steps=["home","custchoice","order","review","confirm"];
            const cur=steps.indexOf(step);
            const done=cur>i, active=cur===i;
            return (
              <div key={s.k} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:done?"#f59e0b":active?"#fff":"#1e3050",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:done?"#0a1628":active?"#0a1628":"#4b6080",transition:"all .3s"}}>{done?"âœ“":i+1}</div>
                  <span style={{fontSize:10,color:active?"#fff":done?"#f59e0b":"#4b6080",fontWeight:active||done?600:400}}>{s.l}</span>
                </div>
                {i<arr.length-1&&<div style={{width:16,height:1,background:"#1e3050",margin:"0 2px"}}/>}
              </div>
            );
          })}
        </div>}

        {/* Customer name tag */}
        {selCust&&step!=="home"&&!isDriver&&<div style={{fontSize:11,color:"#4b6080"}}>â›½ <span style={{color:"#fff",fontWeight:600}}>{selCust.name}</span></div>}

        {/* Driver name tag when logged in */}
        {driverUser&&driverData&&<div style={{fontSize:11,color:"#4b6080"}}>ðŸšš <span style={{color:"#fff",fontWeight:600}}>{driverData.truck?.driver}</span></div>}

        {/* Back button â€” only for customer ordering flow, not driver dashboard */}
        {!isDriver&&!driverUser&&step!=="home"&&step!=="confirm"&&(
          <button onClick={()=>{
            if(step==="order"){setStep("home");setQuantities({});}
            else if(step==="review") setStep("order");
          }} style={{background:"#1e3050",border:"1px solid #2e4060",borderRadius:8,padding:"7px 14px",color:"#b0c8e0",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Inter',sans-serif"}}>
            â† Back
          </button>
        )}

        {/* Back to home â€” for non-logged-in selection screens */}
        {!driverUser&&(isNew||isExisting||(isDriver&&!driverUser))&&step==="home"&&(
          <button onClick={()=>{setIsNew(false);setIsExisting(false);setIsDriver(false);setIsWalkIn(false);}} style={{background:"#1e3050",border:"1px solid #2e4060",borderRadius:8,padding:"7px 14px",color:"#b0c8e0",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Inter',sans-serif"}}>
            â† Back
          </button>
        )}
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"28px 16px"}}>

      {/* â•â• HOME â€” New or Existing â•â• */}
      {step==="home"&&<div className="fu">
        {/* Only show welcome + cards if no role selected yet */}
        {!isNew&&!isDriver&&!isExisting&&!isWalkIn&&<>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:42,color:"#0a1628",lineHeight:1.15,marginBottom:10}}>
            Welcome to VitalWaveOne
          </div>
          <div style={{fontSize:15,color:"#6b7280",maxWidth:480,margin:"0 auto"}}>
            Place your wholesale order securely and privately
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,maxWidth:900,margin:"0 auto 40px"}} className="grid2">
          {/* Existing Customer */}
          <div className="card" style={{padding:28,cursor:"pointer",transition:"all .2s",border:"2px solid #e5e7eb"}}
            onClick={()=>{setIsExisting(true);setIsNew(false);setIsDriver(false);setIsWalkIn(false);setIsCustPortal(false);}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#0a1628";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 30px #0a162820";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            <div style={{fontSize:36,marginBottom:12}}>ðŸ’Ž</div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:20,color:"#0a1628",marginBottom:8}}>Existing Customer</div>
            <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6}}>Welcome back! Place an order or view your invoice history.</div>
            <div style={{marginTop:16,color:"#0a1628",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>Access my account â†’</div>
            <div style={{marginTop:10,fontSize:12,color:"#9ca3af"}}>
              New customer?{" "}
              <span style={{color:"#f59e0b",fontWeight:600,cursor:"pointer",textDecoration:"underline"}}
                onClick={e=>{e.stopPropagation();setIsNew(true);setIsExisting(false);setIsDriver(false);setIsWalkIn(false);setIsCustPortal(false);}}>
                Sign up â†’
              </span>
            </div>
          </div>

          {/* Walk-in */}
          <div className="card" style={{padding:28,cursor:"pointer",transition:"all .2s",border:"2px solid #e5e7eb",background:"linear-gradient(135deg,#fff,#f5f3ff)"}}
            onClick={()=>{setIsWalkIn(true);setIsNew(false);setIsDriver(false);setIsExisting(false);setIsCustPortal(false);}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#7c3aed";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 30px #7c3aed20";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            <div style={{fontSize:36,marginBottom:12}}>ðŸª</div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:20,color:"#0a1628",marginBottom:8}}>Walk-in</div>
            <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6}}>Purchase directly from the warehouse. Sell from shelf stock on the spot.</div>
            <div style={{marginTop:16,color:"#7c3aed",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>Walk-in sale â†’</div>
          </div>

          {/* Driver */}
          <div className="card" style={{padding:28,cursor:"pointer",transition:"all .2s",border:"2px solid #e5e7eb",background:"linear-gradient(135deg,#fff,#f0f9ff)"}}
            onClick={()=>{setIsDriver(true);setIsNew(false);setIsWalkIn(false);setIsExisting(false);setIsCustPortal(false);}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#0ea5e9";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 30px #0ea5e920";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            <div style={{fontSize:36,marginBottom:12}}>ðŸšš</div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:20,color:"#0a1628",marginBottom:8}}>I'm a Driver</div>
            <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6}}>VitalWaveOne delivery driver. Access your route and record sales.</div>
            <div style={{marginTop:16,color:"#0ea5e9",fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>Driver login â†’</div>
          </div>
        </div>
        </>}

        {/* â”€â”€ CUSTOMER HISTORY PORTAL â”€â”€ */}
        {/* â”€â”€ DRIVER: login + dashboard â”€â”€ */}
        {isDriver&&<div className="fu">
          {!driverUser?(
            <div style={{maxWidth:420,margin:"0 auto"}}>
              <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:22,color:"#0a1628",marginBottom:6,textAlign:"center"}}>ðŸšš Driver Login</div>
              <div style={{fontSize:13,color:"#6b7280",textAlign:"center",marginBottom:24}}>We'll send a 6-digit code to your WhatsApp</div>
              <div className="card" style={{padding:28}}>
                {driverOtpError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:14}}>âš ï¸ {driverOtpError}</div>}
                {!driverOtpSent?(
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div className="field">
                      <label>Your Phone Number (registered with admin)</label>
                      <input type="tel" placeholder="e.g. 5551234567" value={driverOtpPhone}
                        onChange={e=>setDriverOtpPhone(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&sendDriverOtp()}
                        style={{fontSize:16,letterSpacing:2,textAlign:"center"}}/>
                    </div>
                    <button onClick={sendDriverOtp} disabled={driverOtpLoading||driverOtpPhone.length<10}
                      style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      {driverOtpLoading?<><span className="sp">âŸ³</span>Sendingâ€¦</>:<>ðŸ’¬ Send WhatsApp Code</>}
                    </button>
                    <div style={{textAlign:"center",fontSize:12,color:"#9ca3af"}}>Need help? Contact your admin</div>
                    <div style={{borderTop:"1px solid #e5e7eb",paddingTop:14,marginTop:4}}>
                      <div style={{fontSize:12,color:"#6b7280",textAlign:"center",marginBottom:8}}>New driver joining the team?</div>
                      <button onClick={()=>{setIsDriver(false);setIsWalkIn(true);setWalkInMode("register");setWiReg(r=>({...r,role:"driver"}));}}
                        style={{width:"100%",padding:"11px",background:"none",border:"1.5px solid #0ea5e9",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",color:"#0ea5e9",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        ðŸ“ Sign Up as New Driver â†’
                      </button>
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:8,padding:"12px 14px",fontSize:13,color:"#065f46",textAlign:"center"}}>
                      âœ… Code sent to WhatsApp ending in {driverOtpPhone.slice(-4)}
                    </div>
                    <div className="field">
                      <label>Enter 6-digit code</label>
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="â€¢ â€¢ â€¢ â€¢ â€¢ â€¢"
                        value={driverOtpCode} onChange={e=>setDriverOtpCode(e.target.value.replace(/\D/g,""))}
                        onKeyDown={e=>e.key==="Enter"&&verifyDriverOtp()}
                        style={{fontSize:28,letterSpacing:10,textAlign:"center",fontWeight:700}}/>
                    </div>
                    <button onClick={verifyDriverOtp} disabled={driverOtpLoading||driverOtpCode.length!==6}
                      style={{background:"#0a1628",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      {driverOtpLoading?<><span className="sp">âŸ³</span>Verifyingâ€¦</>:<>âœ… Verify & Sign In</>}
                    </button>
                    <button onClick={()=>{setDriverOtpSent(false);setDriverOtpCode("");setDriverOtpError("");}}
                      style={{background:"none",border:"none",color:"#9ca3af",fontSize:12,cursor:"pointer",textAlign:"center"}}>
                      â† Change phone number
                    </button>
                    {driverOtpCooldown===0
                      ?<button onClick={sendDriverOtp} style={{background:"none",border:"none",color:"#0ea5e9",fontSize:12,cursor:"pointer",textAlign:"center",fontWeight:600}}>Resend code</button>
                      :<div style={{textAlign:"center",fontSize:12,color:"#9ca3af"}}>Resend in {driverOtpCooldown}s</div>
                    }
                  </div>
                )}
              </div>
            </div>
          ):(
            /* â”€â”€ DRIVER DASHBOARD â”€â”€ */
            <div style={{maxWidth:640,margin:"0 auto"}}>
              {/* Driver header */}
              <div style={{background:"#0a1628",borderRadius:14,padding:"18px 22px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:10,color:"#4b6080",letterSpacing:".08em",marginBottom:4}}>WELCOME BACK</div>
                  <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:22,color:"#fff"}}>{driverData.truck?.driver}</div>
                  <div style={{fontSize:12,color:"#4b6080",marginTop:2}}>ðŸšš {driverData.truck?.plate} Â· {driverData.truck?.route||"Route"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"#4b6080",marginBottom:4}}>TODAY'S REVENUE</div>
                  <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:24,color:"#0ea5e9"}}>
                    ${driverData.sales.filter(s=>s._paid&&new Date(s.created_at).toDateString()===new Date().toDateString()).reduce((a,s)=>{const st=driverData.stateTaxes?.find(x=>x.id===(s.state||""));const rate=st?.exempt?0:parseFloat(st?.rate||0);const taxable=(s.items||[]).reduce((b,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?b+(p?.price||0)*i.qty:b;},0);const tax=parseFloat((taxable*rate/100).toFixed(2));return a+s.total+tax;},0).toFixed(2)} collected
                  </div>
                  <button onClick={async()=>{
                    const truckId = driverData.truck?.id;
                    if(!truckId) return;
                    try{
                      const [custsR, loadsR, salesR, pmtsR, prodsR, taxesR] = await Promise.all([
                        db.from("customers").select("id,name,address,phone,email,state,truck_id,notes").eq("truck_id",truckId),
                        db.from("loads").select("*").eq("truck_id",truckId).eq("status","out").order("created_at",{ascending:false}),
                        db.from("sales").select("*").eq("truck_id",truckId).order("created_at",{ascending:false}),
                        db.from("payments").select("sale_id,status,method,amount"),
                        db.from("products").select("*").order("cat").order("name"),
                        db.from("state_taxes").select("*"),
                      ]);
                      // Rebuild mergedLoad same as login
                      const allLoads = loadsR.data||[];
                      let mergedLoad = null;
                      if(allLoads.length>0){
                        const itemMap={};
                        allLoads.forEach(load=>(load.items||[]).forEach(item=>{itemMap[item.pid]=(itemMap[item.pid]||0)+item.qty;}));
                        mergedLoad={...allLoads[0],items:Object.entries(itemMap).map(([pid,qty])=>({pid,qty})),_allLoadIds:allLoads.map(l=>l.id)};
                      }
                      const paidIds=new Set((pmtsR.data||[]).filter(p=>p.status==="paid").map(p=>p.sale_id));
                      const salesWithPaid=(salesR.data||[]).map(s=>({...s,_paid:paidIds.has(s.id)}));
                      setDriverData(prev=>({
                        ...prev,
                        customers:custsR.data||prev.customers,
                        activeLoad:mergedLoad,
                        sales:salesWithPaid,
                        stateTaxes:taxesR.data||prev.stateTaxes,
                      }));
                      if(prodsR.data) setProducts(prodsR.data);
                      setMsg({t:"success",m:"Data refreshed"});
                      setTimeout(()=>setMsg(null),2000);
                    }catch(e){setMsg({t:"error",m:"Refresh failed: "+e.message});}
                  }} style={{marginTop:4,background:"transparent",border:"1px solid #1e3050",borderRadius:6,padding:"4px 10px",fontSize:11,color:"#4b6080",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                    Refresh
                  </button>
                  <button onClick={()=>{localStorage.removeItem("vitalwaveone_driver");setDriverUser(null);setDriverData(null);setDriverTab("dashboard");}}
                    style={{marginTop:8,background:"transparent",border:"1px solid #1e3050",borderRadius:6,padding:"4px 10px",fontSize:11,color:"#4b6080",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Tab navigation */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",gap:6,marginBottom:16}}>
                {[
                  {k:"dashboard",e:"ðŸ ",l:"Home"},
                  {k:"route",e:"ðŸ“…",l:"Route"},
                  {k:"load",e:"ðŸ“¦",l:"Load"},
                  {k:"sell",e:"ðŸ’³",l:"Sell"},
                  {k:"bulkpay",e:"ðŸ’°",l:"Bulk Pay"},
                  {k:"expenses",e:"ðŸ’¸",l:"Expenses"},
                  {k:"performance",e:"ðŸ“Š",l:"Stats"},
                  {k:"history",e:"ðŸ“„",l:"History"},
                ].map(t=>(
                  <button key={t.k} onClick={()=>setDriverTab(t.k)}
                    style={{padding:"10px 4px",borderRadius:9,border:`1.5px solid ${driverTab===t.k?"#0ea5e9":"#e5e7eb"}`,background:driverTab===t.k?"#f0f9ff":"#fff",cursor:"pointer",textAlign:"center",fontFamily:"'Inter',sans-serif",transition:"all .15s"}}>
                    <div style={{fontSize:18}}>{t.e}</div>
                    <div style={{fontSize:9,fontWeight:600,color:driverTab===t.k?"#0ea5e9":"#6b7280",marginTop:3}}>{t.l}</div>
                  </button>
                ))}
              </div>

              {/* â”€â”€ HOME TAB â”€â”€ */}
              {driverTab==="dashboard"&&<div>
                {/* Offline Banner */}
                {!isOnline&&<div style={{background:"#1a0505",border:"2px solid #dc2626",borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:22}}>ðŸ“µ</span>
                  <div>
                    <div style={{fontWeight:800,fontSize:13,color:"#dc2626"}}>YOU ARE OFFLINE</div>
                    <div style={{fontSize:11,color:"#f87171",marginTop:2}}>Sales will be saved locally and synced when you reconnect.</div>
                  </div>
                </div>}
                {/* Pending drafts banner */}
                {draftQueue.filter(d=>d._truckId===driverData.truck?.id).length>0&&<div style={{background:"#fffbeb",border:"2px solid #f59e0b",borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:22}}>â³</span>
                    <div>
                      <div style={{fontWeight:800,fontSize:13,color:"#92400e"}}>{draftQueue.filter(d=>d._truckId===driverData.truck?.id).length} DRAFT SALE{draftQueue.filter(d=>d._truckId===driverData.truck?.id).length!==1?"S":""} PENDING SYNC</div>
                      <div style={{fontSize:11,color:"#92400e",marginTop:2}}>Recorded offline â€” will sync automatically when online</div>
                    </div>
                  </div>
                  {isOnline&&<button onClick={async()=>{
                    const myDrafts=draftQueue.filter(d=>d._truckId===driverData.truck?.id);
                    let synced=0;
                    for(const draft of myDrafts){
                      try{
                        const{data:seqData}=await db.rpc("next_invoice_number");
                        const invId="INV-"+String(seqData||1).padStart(4,"0");
                        const ns={...draft,id:invId};
                        delete ns._draftId;delete ns._truckId;delete ns._offline;
                        await db.from("sales").insert(ns);
                        await db.from("payments").insert({sale_id:ns.id,status:"unpaid"});
                        setDriverData(prev=>({...prev,sales:[ns,...prev.sales]}));
                        removeDraft(draft._draftId);
                        synced++;
                      }catch{}
                    }
                    if(synced>0)alert(`âœ… Synced ${synced} offline sale${synced!==1?"s":""} successfully`);
                  }} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                    â†‘ Sync Now
                  </button>}
                </div>}
                {/* Today's Route Quick Banner */}
                {(()=>{
                  const today=new Date().toLocaleDateString("en-US",{weekday:"long"});
                  try{
                    const sched=JSON.parse(driverData.truck?.schedule||"{}");
                    const stops=sched[today]||[];
                    if(!stops.length)return null;
                    return(
                      <div onClick={()=>setDriverTab("route")} style={{background:"#0a1628",borderRadius:10,padding:"12px 16px",marginBottom:14,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:22}}>ðŸ“…</span>
                          <div>
                            <div style={{fontWeight:700,fontSize:13,color:"#fff"}}>{today}'s Route â€” {stops.length} stop{stops.length!==1?"s":""}</div>
                            <div style={{fontSize:11,color:"#4b6080",marginTop:2}}>Tap to see your delivery schedule</div>
                          </div>
                        </div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:"#f59e0b"}}>{stops.length} â†’</div>
                      </div>
                    );
                  }catch{return null;}
                })()}

                <div style={{background:driverData.activeLoad?"#f0fdf4":"#fef9c3",border:`1px solid ${driverData.activeLoad?"#a7f3d0":"#fde68a"}`,borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:24}}>{driverData.activeLoad?"ðŸŸ¢":"ðŸŸ¡"}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:driverData.activeLoad?"#065f46":"#92400e"}}>{driverData.activeLoad?"Truck Loaded & Active":"Truck Not Loaded"}</div>
                    <div style={{fontSize:12,color:driverData.activeLoad?"#047857":"#92400e"}}>{driverData.activeLoad?`Load ${driverData.activeLoad.id}   -   ${(driverData.activeLoad.items||[]).reduce((a,i)=>a+i.qty,0)} units loaded`:"Tap Load to load your truck"}</div>
                  </div>
                </div>

                {/* â”€â”€ TRUCK INVENTORY â”€â”€ */}
                {driverData.activeLoad&&(()=>{
                  const loadedItems=driverData.activeLoad.items||[];
                  const allLdIds=driverData.activeLoad._allLoadIds||[driverData.activeLoad.id];
                  const soldMap=driverData.sales
                    .filter(s=>allLdIds.includes(s.load_id))
                    .reduce((acc,s)=>{(s.items||[]).forEach(i=>{acc[i.pid]=(acc[i.pid]||0)+i.qty;});return acc;},{});
                  const totalLoaded=loadedItems.reduce((a,i)=>a+i.qty,0);
                  const totalSold=loadedItems.reduce((a,i)=>a+(soldMap[i.pid]||0),0);
                  const totalRemaining=totalLoaded-totalSold;
                  return(
                    <div className="card" style={{marginBottom:14}}>
                      <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontWeight:700,fontSize:13,color:"#0a1628"}}>ðŸ“¦ Truck Inventory</div>
                        <div style={{display:"flex",gap:12,fontSize:11}}>
                          <span style={{color:"#6b7280"}}>Loaded: <strong style={{color:"#0ea5e9"}}>{totalLoaded}</strong></span>
                          <span style={{color:"#6b7280"}}>Sold: <strong style={{color:"#059669"}}>{totalSold}</strong></span>
                          <span style={{color:"#6b7280"}}>Left: <strong style={{color:totalRemaining<5?"#dc2626":"#212121"}}>{totalRemaining}</strong></span>
                        </div>
                      </div>
                      {loadedItems.map(item=>{
                        const p=products.find(x=>x.id===item.pid);
                        const sold=soldMap[item.pid]||0;
                        const remaining=Math.max(0,item.qty-sold);
                        const pct=item.qty>0?(remaining/item.qty)*100:0;
                        return(
                          <div key={item.pid} style={{padding:"10px 16px",borderBottom:"1px solid #f9fafb"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                              <div>
                                <div style={{fontWeight:600,fontSize:13}}>{p?.name||item.pid}</div>
                                <div style={{fontSize:10,color:"#9ca3af"}}>SKU: {p?.sku} Â· ${p?.price}/unit</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontWeight:800,fontSize:18,color:remaining===0?"#dc2626":remaining<=3?"#f59e0b":"#059669"}}>{remaining}</div>
                                <div style={{fontSize:10,color:"#9ca3af"}}>of {item.qty} left</div>
                              </div>
                            </div>
                            <div style={{height:5,background:"#f3f4f6",borderRadius:3,overflow:"hidden",marginBottom:3}}>
                              <div style={{height:"100%",width:`${pct}%`,background:pct>50?"#059669":pct>20?"#f59e0b":"#dc2626",borderRadius:3,transition:"width .3s"}}/>
                            </div>
                            {sold>0&&<div style={{fontSize:10,color:"#6b7280"}}>âœ“ {sold} sold Â· <span style={{color:"#059669",fontWeight:600}}>${(sold*(p?.price||0)).toFixed(2)}</span></div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {driverData.activeLoad&&(()=>{
                  const loadedItems=driverData.activeLoad.items||[];
                  const allLdIds=driverData.activeLoad._allLoadIds||[driverData.activeLoad.id];
                  const soldMap=driverData.sales
                    .filter(s=>allLdIds.includes(s.load_id))
                    .reduce((acc,s)=>{(s.items||[]).forEach(i=>{acc[i.pid]=(acc[i.pid]||0)+i.qty;});return acc;},{});
                  const totalRemaining=loadedItems.reduce((a,i)=>a+Math.max(0,i.qty-(soldMap[i.pid]||0)),0);
                  if(totalRemaining===0) return null;
                  // Check if already has a pending reset
                  const hasPendingReset=driverData.resetStatus==="pending";
                  return(
                    <div style={{marginBottom:14}}>
                      {hasPendingReset
                        ?<div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                          <span style={{fontSize:22}}>â³</span>
                          <div>
                            <div style={{fontWeight:700,fontSize:13,color:"#854d0e"}}>Reset Request Pending</div>
                            <div style={{fontSize:12,color:"#92400e"}}>Your request to reset truck inventory is waiting for admin approval.</div>
                          </div>
                        </div>
                        :<div style={{background:"#fff7ed",border:"1.5px solid #fed7aa",borderRadius:10,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                          <div>
                            <div style={{fontWeight:700,fontSize:13,color:"#c2410c"}}>ðŸ”„ Need to reset truck inventory?</div>
                            <div style={{fontSize:12,color:"#9a3412",marginTop:2}}>{totalRemaining} units still on truck Â· admin approval required</div>
                          </div>
                          <button onClick={()=>{
                            if(!window.confirm("Request inventory reset?\n\nThis will ask your admin to:\n- Return "+totalRemaining+" units to warehouse\n- Close your current load\n\nYou cannot undo this request.")) return;
                            db.from("truck_resets").insert({
                              id:"RST-"+Math.random().toString(36).slice(2,8).toUpperCase(),
                              truck_id:driverData.truck?.id,
                              driver_name:driverData.truck?.driver,
                              requested_by:driverData.profile?.email||"driver",
                              remaining_units:totalRemaining,
                              load_id:driverData.activeLoad?.id||null,
                              status:"pending",
                              note:"Driver requested reset - "+totalRemaining+" units remaining",
                              created_at:new Date().toISOString(),
                            }).then(({error})=>{
                              if(error) setMsg({t:"error",m:"Failed: "+error.message});
                              else{
                                setDriverData(prev=>({...prev,resetStatus:"pending"}));
                                setMsg({t:"success",m:"Reset request sent to admin - awaiting approval"});
                              }
                            });
                          }}
                            style={{background:"#c2410c",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>
                            Request Reset
                          </button>
                        </div>}
                    </div>
                  );
                })()}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                  {[
                    {l:"Customers",v:driverData.customers.length,e:"â›½",c:"#0ea5e9"},
                    {l:"Today's Sales",v:driverData.sales.filter(s=>new Date(s.created_at).toDateString()===new Date().toDateString()).length,e:"ðŸ“„",c:"#7c3aed"},
                    {l:"Collected Today",v:`$${driverData.sales.filter(s=>s._paid&&new Date(s.created_at).toDateString()===new Date().toDateString()).reduce((a,s)=>{const st=driverData.stateTaxes?.find(x=>x.id===(s.state||""));const rate=st?.exempt?0:parseFloat(st?.rate||0);const taxable=(s.items||[]).reduce((b,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?b+(p?.price||0)*i.qty:b;},0);const tax=parseFloat((taxable*rate/100).toFixed(2));return a+s.total+tax;},0).toFixed(2)}`,e:"ðŸ’°",c:"#059669"},{l:"Balance Due",v:(()=>{const lastUnpaid=driverData.sales.filter(s=>!s._paid).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];if(!lastUnpaid)return "$0.00";const st=driverData.stateTaxes?.find(x=>x.id===(lastUnpaid.state||""));const rate=st?.exempt?0:parseFloat(st?.rate||0);const taxable=(lastUnpaid.items||[]).reduce((b,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?b+(p?.price||0)*i.qty:b;},0);const tax=parseFloat((taxable*rate/100).toFixed(2));return "$"+(lastUnpaid.total+tax+parseFloat(lastUnpaid.previous_balance||0)).toFixed(2);})(),e:"â³",c:"#f59e0b"},
                  ].map(k=>(
                    <div key={k.l} className="card" style={{padding:"12px",textAlign:"center"}}>
                      <div style={{fontSize:20,marginBottom:3}}>{k.e}</div>
                      <div style={{fontWeight:800,fontSize:18,color:k.c}}>{k.v}</div>
                      <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{k.l}</div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{marginBottom:14}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#0a1628"}}>â›½ My Customers</div>
                    <button onClick={()=>setShowAddCust(v=>!v)}
                      style={{background:"#0a1628",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                      ï¼‹ Add Customer
                    </button>
                  </div>

                  {/* Add Customer Form */}
                  {showAddCust&&(()=>{
                    const submit=async()=>{
                      if(!newCustForm.name.trim()) return;
                      setNewCustSaving(true);
                      try{
                        // SECURITY FIX #4: Add company_id for tenant isolation
                        const rec={id:"C"+uid(),name:newCustForm.name.trim(),address:newCustForm.address.trim(),phone:newCustForm.phone.trim(),email:newCustForm.email.trim(),state:newCustForm.state.trim(),notes:"",truck_id:driverData.truck?.id,company_id:co?.id,created_at:new Date().toISOString()};

                        // SECURITY: Validate before saving
                        const validation = validateWalkInRegistration(rec, co?.id);
                        if(!validation.valid) {
                          throw new Error(validation.errors[0] || "Invalid customer data");
                        }

                        const{error}=await db.from("customers").insert(rec);
                        if(error)throw error;
                        setDriverData(prev=>({...prev,customers:[rec,...prev.customers]}));
                        setShowAddCust(false);
                        setNewCustForm({name:"",address:"",phone:"",email:"",state:""});
                        setMsg({t:"success",m:`[OK] ${rec.name} added to your route`});
                      }catch(e){setMsg({t:"error",m:e.message});}
                      setNewCustSaving(false);
                    };
                    return(
                      <div style={{padding:"14px 16px",borderBottom:"1px solid #f3f4f6",background:"#f9fafb"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#0a1628",marginBottom:10}}>New Customer â€” auto-assigned to your truck</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                          {[["Business Name *","name","e.g. Corner Gas Mart"],["Phone","phone","(555) 000-0000"],["Address","address","123 Main St, Dallas TX"]].map(([l,k,p])=>(
                            <div key={k} className="field" style={{gridColumn:k==="address"?"1/-1":"auto"}}>
                              <label style={{fontSize:10}}>{l}</label>
                              <input placeholder={p} value={newCustForm[k]} onChange={e=>setNewCustForm(prev=>({...prev,[k]:e.target.value}))}
                                style={{fontSize:13,padding:"8px 10px"}}/>
                            </div>
                          ))}
                          <div className="field">
                            <label style={{fontSize:10}}>State</label>
                            <select value={newCustForm.state} onChange={e=>setNewCustForm(prev=>({...prev,state:e.target.value}))}
                              style={{fontSize:13,padding:"8px 10px",width:"100%",border:"1px solid #e5e7eb",borderRadius:6}}>
                              <option value="">â€” State â€”</option>
                              {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={submit} disabled={newCustSaving||!newCustForm.name.trim()}
                            style={{background:"#0a1628",color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",opacity:!newCustForm.name.trim()?0.5:1}}>
                            {newCustSaving?"Addingâ€¦":"âœ… Add Customer"}
                          </button>
                          <button onClick={()=>{setShowAddCust(false);setNewCustForm({name:"",address:"",phone:"",email:"",state:"",});}}
                            style={{background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {(()=>{
                    const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                    const todayIdx=new Date().getDay(); // 0=Sun...6=Sat

                    // Parse schedule from customer notes
                    const getSchedule=c=>{
                      try{
                        const m=(c.notes||"").match(/SCHEDULE:({.*?})/);
                        return m?JSON.parse(m[1]):{day:-1,order:99};
                      }catch{return{day:-1,order:99};}
                    };

                    // Save schedule back to notes
                    const saveSchedule=async(c,day,order)=>{
                      const baseNotes=(c.notes||"").replace(/SCHEDULE:\{[^}]*\}/g,"").trim();
                      const newNotes=baseNotes+(baseNotes?"\n":"")+"SCHEDULE:"+JSON.stringify({day:parseInt(day),order:parseInt(order)||99});
                      const{error}=await db.from("customers").update({notes:newNotes}).eq("id",c.id);
                      if(!error){
                        setDriverData(prev=>({...prev,customers:prev.customers.map(x=>x.id===c.id?{...x,notes:newNotes}:x)}));
                      }
                    };

                    // Sort: today's customers first by order, then other days, then unscheduled
                    const sorted=[...driverData.customers].sort((a,b)=>{
                      const sa=getSchedule(a), sb=getSchedule(b);
                      const aTod=sa.day===todayIdx, bTod=sb.day===todayIdx;
                      if(aTod&&!bTod) return -1;
                      if(!aTod&&bTod) return 1;
                      if(aTod&&bTod) return (sa.order||99)-(sb.order||99);
                      // Both not today â€” sort by day proximity, then order
                      if(sa.day!==-1&&sb.day===-1) return -1;
                      if(sa.day===-1&&sb.day!==-1) return 1;
                      if(sa.day!==-1&&sb.day!==-1){
                        // Next occurrence of each day from today
                        const nextA=(sa.day-todayIdx+7)%7||7;
                        const nextB=(sb.day-todayIdx+7)%7||7;
                        if(nextA!==nextB) return nextA-nextB;
                        return (sa.order||99)-(sb.order||99);
                      }
                      return 0;
                    });

                    const navToAddr=addr=>{
                      if(!addr) return;
                      const enc=encodeURIComponent(addr);
                      const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
                      window.open(isIOS?`maps://maps.apple.com/?q=${enc}`:`https://www.google.com/maps/search/?api=1&query=${enc}`,"_blank");
                    };

                    // Track which customer has schedule editor open
                    let prevDayLabel="";

                    return sorted.map((c,idx)=>{
                      const sch=getSchedule(c);
                      const isToday=sch.day===todayIdx;
                      const hasDay=sch.day>=0;

                      // Day divider label
                      const dayLabel=isToday?"Today"
                        :hasDay?DAYS[sch.day]
                        :"Unscheduled";
                      const showDivider=dayLabel!==prevDayLabel;
                      prevDayLabel=dayLabel;

                      return(
                        <div key={c.id}>
                          {showDivider&&<div style={{padding:"6px 16px",background:isToday?"#f0fdf4":hasDay?"#f8fafc":"#fafafa",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:10,fontWeight:800,letterSpacing:".08em",color:isToday?"#059669":hasDay?"#0ea5e9":"#9ca3af"}}>
                              {isToday?"ðŸ“… TODAY":""}
                              {!isToday&&hasDay?"ðŸ“… "+dayLabel.toUpperCase():""}
                              {!hasDay?"â€” UNSCHEDULED â€”":""}
                            </span>
                            {isToday&&<span style={{fontSize:9,background:"#dcfce7",color:"#065f46",borderRadius:4,padding:"1px 6px",fontWeight:700}}>VISIT DAY</span>}
                          </div>}

                          <div style={{padding:"12px 16px",borderBottom:"1px solid #f9fafb",background:isToday?"#f0fdf4":"#fff",transition:"background .15s"}}>
                            {/* Customer info row */}
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                  {hasDay&&<span style={{fontSize:10,fontWeight:800,color:isToday?"#059669":"#0ea5e9",background:isToday?"#dcfce7":"#e0f2fe",borderRadius:4,padding:"1px 6px",flexShrink:0}}>
                                    {isToday?"Today":"Next: "+DAYS[sch.day]}{sch.order<99?" #"+sch.order:""}
                                  </span>}
                                  <span style={{fontWeight:600,fontSize:13}}>{c.name}</span>
                                </div>
                                {c.address&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>ðŸ“ {c.address}</div>}
                                {c.phone&&<div style={{fontSize:11,color:"#9ca3af"}}>ðŸ“ž {c.phone}</div>}
                              </div>
                              <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                                {c.address&&<button onClick={()=>navToAddr(c.address)}
                                  style={{background:"#f0f9ff",color:"#0ea5e9",border:"1.5px solid #bae6fd",borderRadius:7,padding:"5px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                                  ðŸ—º
                                </button>}
                                <button onClick={()=>{setDriverSaleCust(c.id);setDriverTab("sell");}}
                                  style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                                  Sell
                                </button>
                              </div>
                            </div>

                            {/* Schedule editor - inline */}
                            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              <span style={{fontSize:10,color:"#9ca3af",flexShrink:0}}>Visit day:</span>
                              <select
                                value={sch.day}
                                onChange={e=>saveSchedule(c,e.target.value,sch.order)}
                                style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 4px",background:"#fff",color:"#374151",cursor:"pointer"}}>
                                <option value={-1}>â€” none â€”</option>
                                {DAYS.map((d,i)=><option key={i} value={i}>{d}{i===todayIdx?" (Today)":""}</option>)}
                              </select>
                              {hasDay&&<>
                                <span style={{fontSize:10,color:"#9ca3af",flexShrink:0}}>Order:</span>
                                <select
                                  value={sch.order>=99?"":`${sch.order}`}
                                  onChange={e=>saveSchedule(c,sch.day,e.target.value||99)}
                                  style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 4px",background:"#fff",color:"#374151",cursor:"pointer",width:52}}>
                                  <option value="">â€”</option>
                                  {[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}</option>)}
                                </select>
                              </>}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>}

              {/* â”€â”€ LOAD TAB â”€â”€ */}
              {driverTab==="route"&&<DriverRouteTab driverData={driverData} setDriverData={setDriverData} setDriverTab={setDriverTab} setDriverSaleCust={setDriverSaleCust}/>}

              {driverTab==="performance"&&<DriverStatsTab driverData={driverData} products={products}/>}

              {driverTab==="load"&&<DriverLoadTab driverData={driverData} setDriverData={setDriverData} products={products} supabase={supabase} co={co}/>}

              {/* â”€â”€ SELL TAB â”€â”€ */}
              {driverTab==="sell"&&<DriverSellTab driverData={driverData} setDriverData={setDriverData} products={products} supabase={supabase} co={driverData.co||co} initCust={driverSaleCust} setDriverSaleCust={setDriverSaleCust} payForm={payForm} setPayForm={setPayForm} paymentSaving={paymentSaving} setPaymentSaving={setPaymentSaving} collectPayment={collectPayment} createdSale={createdSale} setCreatedSale={setCreatedSale} showPayment={showPayment} setShowPayment={setShowPayment}/>}

              {/* â”€â”€ EXPENSES TAB â”€â”€ */}
              {driverTab==="expenses"&&<DriverExpensesTab driverData={driverData} supabase={supabase}/>}

              {/* â”€â”€ BULK PAY TAB â”€â”€ */}
              {driverTab==="bulkpay"&&<div>
                <div style={{fontWeight:700,fontSize:14,color:"#0a1628",marginBottom:12}}>ðŸ’° Bulk Payment â€” Pay Multiple Invoices</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>SELECT CUSTOMER</label>
                    <select value={bulkPayCust} onChange={e=>{setBulkPayCust(e.target.value);setBulkPaySel(new Set());}}
                      style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                      <option value="">â€” Choose customer â€”</option>
                      {driverData.customers.filter(c=>driverData.sales.some(s=>s.cust_id===c.id&&!s._paid)).map(c=>(
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>PAYMENT METHOD</label>
                    <select value={bulkPayMethod} onChange={e=>setBulkPayMethod(e.target.value)}
                      style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                      {[["cash","ðŸ’µ Cash"],["check","ðŸ¦ Check"],["zelle","ðŸ“± Zelle"],["card","ðŸ’³ Card"]].map(([v,l])=>(
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {bulkPayMethod==="check"&&<div style={{marginBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4}}>CHECK NUMBER</label>
                  <input value={bulkPayCheck} onChange={e=>setBulkPayCheck(e.target.value)} placeholder="Check #"
                    style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif"}}/>
                </div>}

                {bulkPayCust?(()=>{
                  const custUnpaid=driverData.sales
                    .filter(s=>s.cust_id===bulkPayCust&&!s._paid)
                    .sort((a,b)=>new Date(b.created_at||b.date)-new Date(a.created_at||a.date));
                  const latestInv=custUnpaid[0];
                  const allSel=custUnpaid.length>0&&custUnpaid.every(s=>bulkPaySel.has(s.id));

                  // Grand total = latest invoice's full amount (includes all prev balances)
                  // Partial selection = sum of selected invoices' grand totals (last selected carries the balance)
                  const getGT=s=>{
                    const st=driverData.stateTaxes?.find(x=>x.id===(s.state||""));
                    const rate=st?.exempt?0:parseFloat(st?.rate||0);
                    const tax=parseFloat(((s.items||[]).reduce((b,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?b+(p?.price||0)*i.qty:b;},0)*rate/100).toFixed(2));
                    return parseFloat((s.total+tax+parseFloat(s.previous_balance||0)).toFixed(2));
                  };

                  // When all selected: use latest invoice's grand total (carries full balance)
                  // When partial: find the latest selected invoice and use its grand total
                  const selectedIds=[...bulkPaySel];
                  const selTotal=selectedIds.length===0?0:
                    allSel&&latestInv?getGT(latestInv):
                    (()=>{
                      const selSales=custUnpaid.filter(s=>bulkPaySel.has(s.id));
                      const latestSel=selSales[0]; // already sorted newest first
                      return latestSel?getGT(latestSel):0;
                    })();

                  const doBulkPay=async()=>{
                    if(bulkPaySel.size===0)return;
                    setBulkPaySaving(true);
                    try{
                      const ids=[...bulkPaySel];
                      await Promise.all(ids.map(sid=>{
                        const ex=driverData.sales.find(s=>s.id===sid);
                        return db.from("payments").upsert({sale_id:sid,status:"paid",method:bulkPayMethod,amount:selTotal/ids.length,check_number:bulkPayCheck||""},{onConflict:"sale_id"});
                      }));
                      // Log to payments_log
                      await db.from("payments_log").insert({
                        id:"PMT-"+Math.random().toString(36).slice(2,8).toUpperCase(),
                        cust_id:bulkPayCust,truck_id:driverData.truck?.id,
                        method:bulkPayMethod,amount:selTotal,
                        check_number:bulkPayCheck||"",
                        invoice_ids:ids,
                        note:bulkPayNote||`Driver bulk payment â€” ${ids.length} invoices`,
                        date:new Date().toLocaleDateString(),
                        collected_at:new Date().toISOString(),
                        collected_by:driverData.truck?.driver,
                      });
                      setDriverData(prev=>({...prev,sales:prev.sales.map(s=>bulkPaySel.has(s.id)?{...s,_paid:true}:s)}));
                      setBulkPaySel(new Set());setBulkPayCheck("");setBulkPayNote("");
                      setMsg({t:"success",m:`âœ… ${ids.length} invoices paid â€” ${fmt(selTotal)}`});
                      setTimeout(()=>setMsg(null),3000);
                    }catch(e){setMsg({t:"error",m:e.message});}
                    setBulkPaySaving(false);
                  };

                  if(custUnpaid.length===0) return <div className="card" style={{padding:32,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:28,marginBottom:6}}>âœ…</div><div>All invoices paid for this customer</div></div>;

                  return(<>
                    {/* Select all bar */}
                    <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontWeight:600,fontSize:13}}>
                        <input type="checkbox" checked={allSel} onChange={()=>{if(allSel)setBulkPaySel(new Set());else setBulkPaySel(new Set(custUnpaid.map(s=>s.id)));}} style={{width:18,height:18}}/>
                        {allSel?"Deselect All":`Select All (${custUnpaid.length})`}
                      </label>
                      {bulkPaySel.size>0&&<div style={{fontSize:13,fontWeight:700,color:"#059669"}}>{bulkPaySel.size} selected Â· {fmt(selTotal)}</div>}
                    </div>

                    {/* Invoice rows */}
                    {custUnpaid.map((s,idx)=>{
                      const isLatest=idx===0;
                      const gt=getGT(s);
                      const sel=bulkPaySel.has(s.id);
                      return(
                        <div key={s.id} onClick={()=>{const ns=new Set(bulkPaySel);sel?ns.delete(s.id):ns.add(s.id);setBulkPaySel(ns);}}
                          style={{background:sel?"#f0fdf4":isLatest?"#fffbeb":"#fff",border:`1.5px solid ${sel?"#a7f3d0":isLatest?"#fde68a":"#e5e7eb"}`,borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <input type="checkbox" checked={sel} readOnly style={{width:18,height:18}}/>
                            <div>
                              <div style={{fontWeight:700,fontSize:13,color:"#7c3aed"}}>{s.id}{isLatest&&<span style={{fontSize:9,color:"#f59e0b",fontWeight:700,marginLeft:6}}>â˜… TOTAL DUE</span>}</div>
                              <div style={{fontSize:11,color:"#9ca3af"}}>{fmtDate(s)}</div>
                              {parseFloat(s.previous_balance||0)>0&&<div style={{fontSize:10,color:"#6b7280"}}>incl. {fmt(parseFloat(s.previous_balance||0))} prev balance</div>}
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontWeight:800,fontSize:isLatest?18:15,color:sel?"#059669":isLatest?"#dc2626":"#0a1628"}}>{fmt(gt)}</div>
                          </div>
                        </div>
                      );
                    })}

                    {bulkPaySel.size>0&&<>
                      <input value={bulkPayNote} onChange={e=>setBulkPayNote(e.target.value)} placeholder="Note (optional)"
                        style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",marginBottom:10}}/>
                      <button onClick={doBulkPay} disabled={bulkPaySaving}
                        style={{width:"100%",padding:"14px",background:"#059669",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                        {bulkPaySaving?<><span className="sp">âŸ³</span>Savingâ€¦</>:`âœ… Pay ${bulkPaySel.size} Invoices â€” ${fmt(selTotal)}`}
                      </button>
                    </>}
                  </>);
                })():<div style={{background:"#f9fafb",border:"1.5px dashed #e5e7eb",borderRadius:10,padding:32,textAlign:"center",color:"#9ca3af"}}>
                  <div style={{fontSize:32,marginBottom:8}}>ðŸ’°</div>
                  <div style={{fontWeight:600}}>Select a customer above to see their unpaid invoices</div>
                </div>}
              </div>}

              {/* â”€â”€ HISTORY TAB â”€â”€ */}
              {driverTab==="history"&&<div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#0a1628"}}>ðŸ“„ Invoice History</div>
                  <input
                    value={histSearch}
                    onChange={e=>{setHistSearch(e.target.value);setHistPage(0);}}
                    placeholder="ðŸ” Search invoicesâ€¦"
                    style={{width:190,padding:"7px 11px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",fontFamily:"'Inter',sans-serif"}}
                  />
                </div>
                {(()=>{
                  const sorted=[...driverData.sales].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
                  const hq=histSearch.toLowerCase();
                  const filtered=hq?sorted.filter(s=>{
                    const cust=driverData.customers.find(c=>c.id===s.cust_id);
                    return (s.id||"").toLowerCase().includes(hq)||(cust?.name||"").toLowerCase().includes(hq)||(s.date||"").toLowerCase().includes(hq);
                  }):sorted;
                  const totalPages=Math.ceil(filtered.length/HIST_PER_PAGE);
                  const page=Math.min(histPage,Math.max(0,totalPages-1));
                  const pageItems=filtered.slice(page*HIST_PER_PAGE,(page+1)*HIST_PER_PAGE);
                  if(filtered.length===0) return <div className="card" style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No invoices found</div>;
                  return(<>
                    {pageItems.map(s=>{
                      const cust=driverData.customers.find(c=>c.id===s.cust_id);
                      const isPaid=s._paid||false;
                      const createdBy=s.truck_id===driverData.truck?.id?"ðŸšš You":s.truck_id?"ðŸšš Driver":!s.truck_id?"ðŸª Walk-in":"ðŸ“± Portal";
                      const saleTax=(()=>{
                        const st=driverData.stateTaxes?.find(x=>x.id===(s.state||""));
                        const rate=st?.exempt?0:parseFloat(st?.rate||0);
                        if(!rate)return 0;
                        const taxable=(s.items||[]).reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?a+(p?.price||0)*i.qty:a;},0);
                        return parseFloat((taxable*rate/100).toFixed(2));
                      })();
                      const prevBal=parseFloat(s.previous_balance||0);
                      const gt=parseFloat((s.total+saleTax+prevBal).toFixed(2));
                      return(
                        <div key={s.id} className="card" style={{padding:"14px 16px",marginBottom:10,borderLeft:`4px solid ${isPaid?"#059669":s.email_sent?"#0ea5e9":"#e5e7eb"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                            <div>
                              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                                <span style={{background:"#f5f3ff",color:"#7c3aed",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700,cursor:"pointer",textDecoration:"underline"}} onClick={()=>setDriverViewInv(s)}>{s.id}</span>
                                {isPaid
                                  ?<span style={{background:"#dcfce7",color:"#166534",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700}}>âœ“ PAID</span>
                                  :<span style={{background:"#fef9c3",color:"#854d0e",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700}}>â³ UNPAID</span>
                                }
                              </div>
                              <div style={{fontWeight:600,fontSize:13,marginTop:4}}>{cust?.name||"Unknown"}</div>
                              <div style={{fontSize:11,color:"#9ca3af"}}>{fmtDate(s)} Â· <span style={{color:"#6b7280"}}>{createdBy}</span></div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontWeight:800,fontSize:18,color:isPaid?"#059669":"#7c3aed"}}>${gt.toFixed(2)}</div>
                              {saleTax>0&&<div style={{fontSize:10,color:"#9ca3af"}}>incl. ${saleTax.toFixed(2)} tax</div>}
                              {prevBal>0&&<div style={{fontSize:10,color:"#dc2626",fontWeight:600}}>{s.check_penalty_applied>0?"ðŸš¨ Returned Check Penalty":`incl. $${prevBal.toFixed(2)} prev. balance`}</div>}
                              {s.email_sent&&<div style={{fontSize:10,color:"#0ea5e9"}}>âœ“ Email sent</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <button onClick={()=>setDriverViewInv(s)} style={{flex:1,padding:"8px",background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:7,fontSize:12,fontWeight:600,color:"#7c3aed",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>ðŸ‘ View</button>
                            {!isPaid&&<button onClick={()=>{setCreatedSaleForHistory(s);setShowHistoryPayment(true);}} style={{flex:1,padding:"8px",background:"#059669",border:"none",borderRadius:7,fontSize:12,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>ðŸ’° Collect</button>}
                            {cust?.email&&!s.email_sent&&<button onClick={()=>sendInvoiceEmail(s,cust)} style={{flex:1,padding:"8px",background:"#0ea5e9",border:"none",borderRadius:7,fontSize:12,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>ðŸ“§ Email</button>}
                            {isPaid&&<div style={{flex:1,padding:"8px",background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:7,fontSize:12,color:"#059669",textAlign:"center",fontWeight:600}}>âœ“ Paid</div>}
                          </div>
                        </div>
                      );
                    })}
                    {/* Pagination */}
                    {totalPages>1&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 4px",marginTop:4,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:11,color:"#9ca3af"}}>Showing {page*HIST_PER_PAGE+1}â€“{Math.min((page+1)*HIST_PER_PAGE,filtered.length)} of {filtered.length}</div>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={()=>setHistPage(p=>p-1)} disabled={page===0}
                          style={{padding:"5px 12px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:page===0?"not-allowed":"pointer",color:page===0?"#9ca3af":"#0a1628",fontWeight:600}}>â† Prev</button>
                        {Array.from({length:totalPages},(_,i)=>i).filter(i=>i===0||i===totalPages-1||Math.abs(i-page)<=1).reduce((acc,i,idx,arr)=>{if(idx>0&&i-arr[idx-1]>1)acc.push("â€¦");acc.push(i);return acc;},[]).map((i,k)=>
                          i==="â€¦"?<span key={k} style={{padding:"5px 4px",fontSize:11,color:"#9ca3af",lineHeight:"28px"}}>â€¦</span>:
                          <button key={k} onClick={()=>setHistPage(i)}
                            style={{padding:"5px 10px",fontSize:12,border:i===page?"none":"1.5px solid #e5e7eb",borderRadius:7,background:i===page?"#0a1628":"#fff",color:i===page?"#fff":"#0a1628",fontWeight:700,cursor:"pointer",minWidth:32}}>
                            {i+1}
                          </button>
                        )}
                        <button onClick={()=>setHistPage(p=>p+1)} disabled={page>=totalPages-1}
                          style={{padding:"5px 12px",fontSize:12,border:"1.5px solid #e5e7eb",borderRadius:7,background:"#fff",cursor:page>=totalPages-1?"not-allowed":"pointer",color:page>=totalPages-1?"#9ca3af":"#0a1628",fontWeight:600}}>Next â†’</button>
                      </div>
                    </div>}
                  </>);
                })()}
              </div>}

              {/* Invoice viewer modal */}
              {driverViewInv&&<div style={{position:"fixed",inset:0,background:"#00000060",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
                <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:560,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{fontWeight:700,fontSize:16}}>Invoice {driverViewInv.id}</div>
                    <div style={{display:"flex",gap:8}}>
                      {driverData.customers.find(c=>c.id===driverViewInv.cust_id)?.email&&
                        <button onClick={()=>{sendInvoiceEmail(driverViewInv,driverData.customers.find(c=>c.id===driverViewInv.cust_id));setDriverViewInv(null);}}
                          style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                          ðŸ“§ Email
                        </button>
                      }
                      <button onClick={()=>window.print()} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>ðŸ–¨ Print</button>
                      <button onClick={async()=>{
                        const {jsPDF}=await import('jspdf');
                        const {default:html2canvas}=await import('html2canvas');
                        const el=document.querySelector('.wdoc')||document.querySelector('[class*="wdoc"]');
                        if(!el)return alert('Invoice not ready');
                        const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
                        const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
                        const w=pdf.internal.pageSize.getWidth();
                        pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w,(canvas.height*w)/canvas.width);
                        pdf.save(`Invoice-${driverViewInv.id}.pdf`);
                      }} style={{background:"#059669",color:"#fff",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>â¬‡ï¸ PDF</button>
                      <button onClick={()=>setDriverViewInv(null)} style={{background:"#f3f4f6",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,cursor:"pointer"}}>âœ• Close</button>
                    </div>
                  </div>
                  <DriverInvoiceView sale={driverViewInv} customers={driverData.customers} products={products} co={co} driver={driverData.truck?.driver} stateTaxes={driverData.stateTaxes}/>
                </div>
              </div>}

              {/* History Payment Modal */}
              {showHistoryPayment&&createdSaleForHistory&&(()=>{
                const s=createdSaleForHistory;
                const saleTax=(()=>{const st=driverData.stateTaxes?.find(x=>x.id===(s.state||""));const rate=st?.exempt?0:parseFloat(st?.rate||0);if(!rate)return 0;const taxable=(s.items||[]).reduce((a,i)=>{const p=products.find(x=>x.id===i.pid);return isTaxableProd(p)?a+(p?.price||0)*i.qty:a;},0);return parseFloat((taxable*rate/100).toFixed(2));})();
                const gt=parseFloat((s.total+saleTax).toFixed(2));
                const cardTotal=parseFloat((gt*(1+CARD_FEE/100)).toFixed(2));
                const methods=[{id:"cash",label:"ðŸ’µ Cash",color:"#059669"},{id:"check",label:"ðŸ§¾ Check",color:"#0369a1"},{id:"money_order",label:"ðŸ“® Money Order",color:"#7c3aed"},{id:"zelle",label:"âš¡ Zelle",color:"#6366f1"},{id:"card",label:`ðŸ’³ Card (+${CARD_FEE}%)`,color:"#dc2626"}];
                return(
                  <div style={{position:"fixed",inset:0,background:"#00000070",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
                    <div style={{background:"#fff",borderRadius:16,padding:20,maxWidth:420,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                        <div style={{fontWeight:700,fontSize:15}}>ðŸ’° Collect Payment â€” {s.id}</div>
                        <button onClick={()=>{setShowHistoryPayment(false);setCreatedSaleForHistory(null);}} style={{background:"#f3f4f6",border:"none",borderRadius:7,padding:"6px 12px",cursor:"pointer"}}>âœ•</button>
                      </div>
                      <div style={{background:"#f9fafb",borderRadius:8,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:13,color:"#6b7280"}}>Total Due</span>
                        <span style={{fontWeight:800,fontSize:18,color:"#0a1628"}}>${gt.toFixed(2)}</span>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
                        {methods.map(m=>(
                          <button key={m.id} onClick={()=>setPayForm(p=>({...p,method:m.id}))}
                            style={{padding:"11px 14px",borderRadius:9,border:`2px solid ${payForm.method===m.id?m.color:"#e5e7eb"}`,background:payForm.method===m.id?m.color+"15":"#fff",cursor:"pointer",display:"flex",justifyContent:"space-between",fontFamily:"'Inter',sans-serif"}}>
                            <span style={{fontWeight:600,fontSize:13,color:payForm.method===m.id?m.color:"#212121"}}>{m.label}</span>
                            {m.id==="card"&&<span style={{fontSize:11,color:"#9ca3af"}}>${cardTotal.toFixed(2)}</span>}
                          </button>
                        ))}
                      </div>
                      {payForm.method==="check"&&<input value={payForm.checkNum} onChange={e=>setPayForm(p=>({...p,checkNum:e.target.value}))} placeholder="Check number" style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px",fontSize:13,marginBottom:10,boxSizing:"border-box"}}/>}
                      {payForm.method==="zelle"&&<input value={payForm.zelleRef} onChange={e=>setPayForm(p=>({...p,zelleRef:e.target.value}))} placeholder="Zelle reference" style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px",fontSize:13,marginBottom:10,boxSizing:"border-box"}}/>}
                      {payForm.method==="money_order"&&<input value={payForm.checkNum} onChange={e=>setPayForm(p=>({...p,checkNum:e.target.value}))} placeholder="Money order number" style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px",fontSize:13,marginBottom:10,boxSizing:"border-box"}}/>}
                      <button onClick={async()=>{
                        await collectPayment(s,payForm.method);
                        setDriverData(prev=>({...prev,sales:prev.sales.map(x=>x.id===s.id?{...x,_paid:true}:x)}));
                        setShowHistoryPayment(false);
                        setCreatedSaleForHistory(null);
                      }} disabled={paymentSaving}
                        style={{width:"100%",padding:"13px",background:"#059669",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                        {paymentSaving?"Saving...":"âœ… Confirm Payment"}
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}
        </div>}
        {isWalkIn&&<div className="fu">
          {/* Header */}
          <div style={{marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:22,color:"#0a1628",marginBottom:2}}>ðŸª Walk-in Sale</div>
              <div style={{fontSize:12,color:"#9ca3af"}}>Authorized users only</div>
            </div>
            <button onClick={()=>{setIsWalkIn(false);setWalkInVerified(false);setWalkInCust(null);setWalkInUser(null);setWalkInSearch("");setWalkInPhone("");setWalkInEmail("");setWalkInPw("");setWalkInError("");setWalkInMode("customer");setWiRegMsg(null);}}
              style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#6b7280",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:600}}>â† Back</button>
          </div>

          {/* â”€â”€ AUTH GATE â”€â”€ */}
          {!walkInVerified&&walkInMode!=="register"&&(
            <div style={{maxWidth:460,margin:"0 auto"}}>
              <div className="card" style={{padding:28,borderTop:"4px solid #7c3aed"}}>
                {/* Mode toggle */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:22}}>
                  {[["customer","ðŸ‘¤ Customer"],["staff","ðŸ”‘ Staff / Driver"]].map(([m,l])=>(
                    <button key={m} onClick={()=>{setWalkInMode(m);setWalkInError("");setWiOtpSent(false);setWiOtpCode("");setWiOtpError("");}}
                      style={{padding:"9px 8px",borderRadius:8,border:`1.5px solid ${walkInMode===m?"#7c3aed":"#e5e7eb"}`,background:walkInMode===m?"#7c3aed":"#fff",color:walkInMode===m?"#fff":"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {walkInMode==="customer"?(
                  <>
                    <div style={{textAlign:"center",marginBottom:18}}>
                      <div style={{fontSize:36,marginBottom:6}}>ðŸ’Ž</div>
                      <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:17,color:"#0a1628",marginBottom:3}}>Customer Access</div>
                      <div style={{fontSize:12,color:"#6b7280"}}>Enter your registered phone â€” we'll send a WhatsApp code</div>
                    </div>
                    {walkInError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:12}}>âš ï¸ {walkInError}</div>}
                    {!otpSent?(
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        <div className="field">
                          <label>Phone Number *</label>
                          <input type="tel" placeholder="e.g. 7135550100" value={otpPhone}
                            onChange={e=>setOtpPhone(e.target.value)}
                            onKeyDown={e=>e.key==="Enter"&&sendCustOtp()}
                            style={{fontSize:16,letterSpacing:2,textAlign:"center"}}/>
                        </div>
                        {otpError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626"}}>âš ï¸ {otpError}</div>}
                        <button onClick={sendCustOtp} disabled={otpLoading||otpPhone.length<10}
                          style={{width:"100%",padding:"13px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4}}>
                          {otpLoading?<><span className="sp">âŸ³</span>Sendingâ€¦</>:<>ðŸ’¬ Send WhatsApp Code</>}
                        </button>
                      </div>
                    ):(
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:8,padding:"10px",fontSize:12,color:"#065f46",textAlign:"center"}}>âœ… Code sent to WhatsApp ending in {otpPhone.slice(-4)}</div>
                        <div className="field">
                          <label>Enter 6-digit code</label>
                          <input type="text" inputMode="numeric" maxLength={6} placeholder="â€¢ â€¢ â€¢ â€¢ â€¢ â€¢"
                            value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,""))}
                            onKeyDown={e=>e.key==="Enter"&&verifyCustOtp()}
                            style={{fontSize:26,letterSpacing:10,textAlign:"center",fontWeight:700}}/>
                        </div>
                        {otpError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626"}}>âš ï¸ {otpError}</div>}
                        <button onClick={verifyCustOtp} disabled={otpLoading||otpCode.length!==6}
                          style={{width:"100%",padding:"13px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                          {otpLoading?<><span className="sp">âŸ³</span>Verifyingâ€¦</>:<>âœ… Verify & Continue</>}
                        </button>
                        {otpCooldown===0
                          ?<button onClick={sendCustOtp} style={{background:"none",border:"none",color:"#7c3aed",fontSize:12,cursor:"pointer",textAlign:"center",fontWeight:600}}>Resend code</button>
                          :<div style={{textAlign:"center",fontSize:12,color:"#9ca3af"}}>Resend in {otpCooldown}s</div>}
                        <button onClick={()=>{setOtpSent(false);setOtpCode("");setOtpError("");}} style={{background:"none",border:"none",color:"#9ca3af",fontSize:11,cursor:"pointer",textAlign:"center"}}>â† Change number</button>
                      </div>
                    )}
                  </>
                ):(
                  <>
                    <div style={{textAlign:"center",marginBottom:18}}>
                      <div style={{fontSize:36,marginBottom:6}}>ðŸ”‘</div>
                      <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:17,color:"#0a1628",marginBottom:3}}>Staff / Driver Access</div>
                      <div style={{fontSize:12,color:"#6b7280"}}>Enter your registered phone â€” we'll send a WhatsApp code</div>
                    </div>
                    {!wiOtpSent?(
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        <div className="field">
                          <label>Phone Number *</label>
                          <input type="tel" placeholder="e.g. 7135550100" value={wiOtpPhone}
                            onChange={e=>setWiOtpPhone(e.target.value)}
                            onKeyDown={e=>e.key==="Enter"&&sendWiOtp()}
                            style={{fontSize:16,letterSpacing:2,textAlign:"center"}}/>
                        </div>
                        {wiOtpError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626"}}>âš ï¸ {wiOtpError}</div>}
                        <button onClick={sendWiOtp} disabled={wiOtpLoading||wiOtpPhone.length<10}
                          style={{width:"100%",padding:"13px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4}}>
                          {wiOtpLoading?<><span className="sp">âŸ³</span>Sendingâ€¦</>:<>ðŸ’¬ Send WhatsApp Code</>}
                        </button>
                      </div>
                    ):(
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:8,padding:"10px",fontSize:12,color:"#065f46",textAlign:"center"}}>âœ… Code sent to WhatsApp ending in {wiOtpPhone.slice(-4)}</div>
                        <div className="field">
                          <label>Enter 6-digit code</label>
                          <input type="text" inputMode="numeric" maxLength={6} placeholder="â€¢ â€¢ â€¢ â€¢ â€¢ â€¢"
                            value={wiOtpCode} onChange={e=>setWiOtpCode(e.target.value.replace(/\D/g,""))}
                            onKeyDown={e=>e.key==="Enter"&&verifyWiOtp()}
                            style={{fontSize:26,letterSpacing:10,textAlign:"center",fontWeight:700}}/>
                        </div>
                        {wiOtpError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626"}}>âš ï¸ {wiOtpError}</div>}
                        <button onClick={verifyWiOtp} disabled={wiOtpLoading||wiOtpCode.length!==6}
                          style={{width:"100%",padding:"13px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                          {wiOtpLoading?<><span className="sp">âŸ³</span>Verifyingâ€¦</>:<>âœ… Verify & Continue</>}
                        </button>
                        <button onClick={()=>{setWiOtpSent(false);setWiOtpCode("");setWiOtpError("");}} style={{background:"none",border:"none",color:"#9ca3af",fontSize:11,cursor:"pointer",textAlign:"center"}}>â† Change number</button>
                        {wiOtpCooldown===0
                          ?<button onClick={sendWiOtp} style={{background:"none",border:"none",color:"#7c3aed",fontSize:12,cursor:"pointer",textAlign:"center",fontWeight:600}}>Resend code</button>
                          :<div style={{textAlign:"center",fontSize:12,color:"#9ca3af"}}>Resend in {wiOtpCooldown}s</div>}
                      </div>
                    )}
                    {/* Registration link for staff */}
                    <div style={{marginTop:16,padding:"12px 14px",background:"#f5f3ff",borderRadius:8,border:"1px solid #ddd6fe"}}>
                      <div style={{fontSize:12,color:"#6b7280",marginBottom:4}}><strong style={{color:"#5b21b6"}}>New staff or receptionist?</strong></div>
                      <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>Request access â€” an admin will review and approve your account.</div>
                      <button onClick={()=>{setWalkInMode("register");setWalkInError("");}}
                        style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                        Request Walk-in Access â†’
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* â”€â”€ REGISTRATION FORM â”€â”€ */}
          {!walkInVerified&&walkInMode==="register"&&(
            <div style={{maxWidth:460,margin:"0 auto"}}>
              <div className="card" style={{padding:28,borderTop:"4px solid #7c3aed"}}>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <div style={{fontSize:36,marginBottom:6}}>ðŸ“</div>
                  <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:18,color:"#0a1628",marginBottom:3}}>Request Walk-in Access</div>
                  <div style={{fontSize:12,color:"#6b7280"}}>Requires admin approval before you can log in</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div className="field">
                    <label>Full Name *</label>
                    <input placeholder="e.g. Sarah Johnson" value={wiReg.name}
                      onChange={e=>setWiReg(r=>({...r,name:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
                  </div>
                  <div className="field">
                    <label>Email Address *</label>
                    <input type="email" placeholder="you@email.com" value={wiReg.email}
                      onChange={e=>setWiReg(r=>({...r,email:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
                  </div>
                  <div className="field">
                    <label>Phone Number *</label>
                    <input placeholder="(713) 555-0100" value={wiReg.phone}
                      onChange={e=>setWiReg(r=>({...r,phone:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
                  </div>
                  <div className="field">
                    <label>Address</label>
                    <input placeholder="e.g. 123 Main St, Houston, TX 77001" value={wiReg.address}
                      onChange={e=>setWiReg(r=>({...r,address:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
                  </div>
                  <div className="field">
                    <label>Role</label>
                    <select value={wiReg.role} onChange={e=>setWiReg(r=>({...r,role:e.target.value}))}
                      style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:9,padding:"11px 14px",fontSize:14,color:"#111",width:"100%"}}>
                      <option value="driver">ðŸšš Driver</option>
                      <option value="staff">Receptionist / In-House Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  {wiReg.role==="driver"&&<div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#0369a1"}}>
                    ðŸ“‹ As a driver, your request will be reviewed by the admin. Once approved, your phone number will be added to the system and you can log in via WhatsApp OTP.
                  </div>}
                  <div className="field">
                    <label>Note (optional)</label>
                    <input placeholder="e.g. Front desk receptionist" value={wiReg.note}
                      onChange={e=>setWiReg(r=>({...r,note:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
                  </div>
                  {wiRegMsg&&<div style={{background:wiRegMsg.t==="success"?"#f0fdf4":"#fef2f2",border:`1px solid ${wiRegMsg.t==="success"?"#a7f3d0":"#fecaca"}`,borderRadius:8,padding:"10px 14px",fontSize:13,color:wiRegMsg.t==="success"?"#065f46":"#dc2626"}}>{wiRegMsg.m}</div>}
                  <button onClick={submitWiRegistration} disabled={wiRegSaving}
                    style={{width:"100%",padding:"13px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:wiRegSaving?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:wiRegSaving?0.7:1}}>
                    {wiRegSaving?<><span className="sp">âŸ³</span> Submittingâ€¦</>:"Submit Access Request"}
                  </button>
                  <button onClick={()=>setWalkInMode("customer")}
                    style={{width:"100%",padding:"10px",background:"none",border:"1.5px solid #e5e7eb",borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",color:"#6b7280"}}>
                    â† Back to Login
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* â”€â”€ VERIFIED: show walk-in sale â”€â”€ */}
          {walkInVerified&&(
            <>
              <div style={{background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:10,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>âœ…</span>
                <div>
                  <div style={{fontSize:13,color:"#5b21b6",fontWeight:700}}>
                    {walkInUser ? walkInUser.displayName : walkInCust?.name} â€” verified
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",textTransform:"capitalize"}}>
                    {walkInUser ? `${walkInUser.role} access` : "customer"}
                  </div>
                </div>
                <button onClick={()=>{setWalkInVerified(false);setWalkInCust(null);setWalkInUser(null);setWalkInSearch("");setWalkInPhone("");setWalkInEmail("");setWalkInPw("");}}
                  style={{marginLeft:"auto",fontSize:11,color:"#7c3aed",background:"none",border:"1px solid #ddd6fe",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Switch</button>
              </div>
              <DriverWalkInTab
                driverData={{customers, stateTaxes:portalStateTaxes, sales:[], co}}
                setDriverData={()=>{}}
                products={products.filter(p=>p.shelf>0)}
                supabase={supabase}
                initCust={walkInCust?.id||null}
                setDriverViewInv={setDriverViewInv}
              />
              {/* Invoice modal for walk-in */}
              {driverViewInv&&<div style={{position:"fixed",inset:0,background:"#00000060",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setDriverViewInv(null)}>
                <div style={{background:"#fff",borderRadius:14,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                  <div style={{padding:"14px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontWeight:700,fontSize:16}}>Invoice {driverViewInv.id}</div>
                    <button onClick={()=>setDriverViewInv(null)} style={{background:"#f3f4f6",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,cursor:"pointer"}}>âœ• Close</button>
                  </div>
                  <div style={{padding:16}}>
                    <DriverInvoiceView sale={driverViewInv} customers={customers} products={products} co={co} driver={customers.find(c=>c.id===driverViewInv.cust_id)?.name||""} stateTaxes={portalStateTaxes}/>
                  </div>
                </div>
              </div>}
            </>
          )}
        </div>}

        {isExisting&&<div className="fu">
          <div style={{maxWidth:420,margin:"0 auto"}}>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:22,color:"#0a1628",marginBottom:6,textAlign:"center"}}>ðŸ‘¤ Customer Login</div>
            <div style={{fontSize:13,color:"#6b7280",textAlign:"center",marginBottom:24}}>We'll send a 6-digit code to your WhatsApp</div>
            <div className="card" style={{padding:28}}>
              {otpError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:14}}>âš ï¸ {otpError}</div>}
              {!otpSent?(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div className="field">
                    <label>Your Phone Number (on your account)</label>
                    <input type="tel" placeholder="e.g. 7135550100" value={otpPhone}
                      onChange={e=>setOtpPhone(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&sendCustOtp()}
                      style={{fontSize:16,letterSpacing:2,textAlign:"center"}}/>
                  </div>
                  <button onClick={sendCustOtp} disabled={otpLoading||otpPhone.length<10}
                    style={{background:"#0a1628",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    {otpLoading?<><span className="sp">âŸ³</span>Sendingâ€¦</>:<>ðŸ’¬ Send WhatsApp Code</>}
                  </button>
                  <div style={{textAlign:"center",fontSize:12,color:"#9ca3af"}}>
                    Not registered? <span style={{color:"#0a1628",fontWeight:600,cursor:"pointer"}} onClick={()=>{setIsExisting(false);setIsNew(true);}}>Register here â†’</span>
                  </div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:8,padding:"12px 14px",fontSize:13,color:"#065f46",textAlign:"center"}}>
                    âœ… Code sent to WhatsApp ending in {otpPhone.slice(-4)}
                  </div>
                  <div className="field">
                    <label>Enter 6-digit code</label>
                    <input type="text" inputMode="numeric" maxLength={6} placeholder="â€¢ â€¢ â€¢ â€¢ â€¢ â€¢"
                      value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,""))}
                      onKeyDown={e=>e.key==="Enter"&&verifyCustOtp()}
                      style={{fontSize:28,letterSpacing:10,textAlign:"center",fontWeight:700}}/>
                  </div>
                  <button onClick={verifyCustOtp} disabled={otpLoading||otpCode.length!==6}
                    style={{background:"#0a1628",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    {otpLoading?<><span className="sp">âŸ³</span>Verifyingâ€¦</>:<>âœ… Verify & Access Account</>}
                  </button>
                  <button onClick={()=>{setOtpSent(false);setOtpCode("");setOtpError("");}}
                    style={{background:"none",border:"none",color:"#9ca3af",fontSize:12,cursor:"pointer",textAlign:"center"}}>
                    â† Change phone number
                  </button>
                  {otpCooldown===0
                    ?<button onClick={sendCustOtp} style={{background:"none",border:"none",color:"#0ea5e9",fontSize:12,cursor:"pointer",textAlign:"center",fontWeight:600}}>Resend code</button>
                    :<div style={{textAlign:"center",fontSize:12,color:"#9ca3af"}}>Resend in {otpCooldown}s</div>
                  }
                </div>
              )}
            </div>
          </div>
        </div>}

        {/* â”€â”€ NEW: registration form â”€â”€ */}
        {isNew&&<div className="fu">
          <div style={{maxWidth:640,margin:"0 auto"}}>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:22,color:"#0a1628",marginBottom:20,textAlign:"center"}}>Register Your Business</div>
            <div className="card" style={{padding:28}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}} className="grid2">
                <div className="field">
                  <label>Business Name *</label>
                  <input placeholder="Speedy Gas & Mart" value={reg.businessName} onChange={e=>setReg(r=>({...r,businessName:e.target.value}))} className={regErrors.businessName?"error":""}/>
                  {regErrors.businessName&&<span style={{fontSize:11,color:"#ef4444"}}>{regErrors.businessName}</span>}
                </div>
                <div className="field">
                  <label>Owner Full Name *</label>
                  <input placeholder="John Smith" value={reg.ownerName} onChange={e=>setReg(r=>({...r,ownerName:e.target.value}))} className={regErrors.ownerName?"error":""}/>
                  {regErrors.ownerName&&<span style={{fontSize:11,color:"#ef4444"}}>{regErrors.ownerName}</span>}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}} className="grid2">
                <div className="field">
                  <label>Email Address *</label>
                  <input type="email" placeholder="owner@gasstation.com" value={reg.email} onChange={e=>setReg(r=>({...r,email:e.target.value}))} className={regErrors.email?"error":""}/>
                  {regErrors.email&&<span style={{fontSize:11,color:"#ef4444"}}>{regErrors.email}</span>}
                </div>
                <div className="field">
                  <label>Phone Number *</label>
                  <input placeholder="(713) 555-0100" value={reg.phone} onChange={e=>setReg(r=>({...r,phone:e.target.value}))} className={regErrors.phone?"error":""}/>
                  {regErrors.phone&&<span style={{fontSize:11,color:"#ef4444"}}>{regErrors.phone}</span>}
                </div>
              </div>
              <div style={{height:1,background:"#f3f4f6",margin:"4px 0 14px"}}/>
              <div style={{fontSize:11,fontWeight:600,color:"#9ca3af",letterSpacing:".08em",marginBottom:12}}>BUSINESS ADDRESS</div>
              <div className="field" style={{marginBottom:14}}>
                <label>Street Address *</label>
                <input placeholder="1420 N Main St" value={reg.address} onChange={e=>setReg(r=>({...r,address:e.target.value}))} className={regErrors.address?"error":""}/>
                {regErrors.address&&<span style={{fontSize:11,color:"#ef4444"}}>{regErrors.address}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px",gap:14,marginBottom:24}} className="grid2">
                <div className="field">
                  <label>City *</label>
                  <input placeholder="Houston" value={reg.city} onChange={e=>setReg(r=>({...r,city:e.target.value}))} className={regErrors.city?"error":""}/>
                  {regErrors.city&&<span style={{fontSize:11,color:"#ef4444"}}>{regErrors.city}</span>}
                </div>
                <div className="field">
                  <label>State</label>
                  <select value={reg.state} onChange={e=>setReg(r=>({...r,state:e.target.value}))}>
                    <option value="">â€” Select State â€”</option>
                    {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>ZIP Code</label>
                  <input placeholder="77001" value={reg.zip} onChange={e=>setReg(r=>({...r,zip:e.target.value}))}/>
                </div>
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexDirection:"column"}}>
                {portalError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626"}}>{portalError}</div>}
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                  <button className="btn-ghost" style={{padding:"10px 20px",fontSize:13}} onClick={()=>{setPortalError("");setIsNew(false);}}>â† Back</button>
                  <button className="btn-amber" onClick={()=>{setPortalError("");handleRegister();}} disabled={submitting}>
                    {submitting?<><span className="sp">âŸ³</span> Registeringâ€¦</>:<>Register & Continue â†’</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>}
      </div>}

      {/* â•â• CUSTOMER CHOICE â€” place order or view account â•â• */}
      {step==="custchoice"&&selCust&&<div className="fu">
        <div style={{maxWidth:560,margin:"0 auto"}}>
          {/* Welcome header */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:36,marginBottom:8}}>ðŸ‘‹</div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:24,color:"#0a1628",marginBottom:6}}>Welcome back, {selCust.name}</div>
            <div style={{fontSize:13,color:"#6b7280"}}>What would you like to do today?</div>
          </div>

          {/* Returned Check Warning on choice screen */}
          {(selCust?.notes||"").includes("RETURNED_CHECK:1")&&(
            <div style={{background:"#1a0000",border:"2px solid #dc2626",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:22}}>ðŸš¨</span>
              <div style={{fontSize:12,color:"#f87171"}}>
                <strong style={{color:"#dc2626"}}>Returned check on file.</strong> A ${co?.check_penalty||50} penalty applies if paying by check on your next order.
              </div>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Place Order */}
            <div className="card" style={{padding:28,cursor:"pointer",border:"2px solid #e5e7eb",textAlign:"center",transition:"all .2s"}}
              onClick={()=>setStep("order")}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#0a1628";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px #0a162820";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:40,marginBottom:12}}>ðŸ›’</div>
              <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:18,color:"#0a1628",marginBottom:8}}>Place an Order</div>
              <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6}}>Browse products and submit your order for delivery</div>
              <div style={{marginTop:16,background:"#0a1628",color:"#fff",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700}}>Order Now â†’</div>
            </div>

            {/* View Account */}
            <div className="card" style={{padding:28,cursor:"pointer",border:"2px solid #e5e7eb",textAlign:"center",transition:"all .2s",position:"relative"}}
              onClick={()=>setStep("myaccount")}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px #f59e0b20";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#e5e7eb";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <div style={{fontSize:40,marginBottom:12}}>ðŸ“‹</div>
              <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:18,color:"#0a1628",marginBottom:8}}>My Account</div>
              <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6}}>View invoices, payment history and outstanding balance</div>
              {custPrevBalance>0&&<div style={{marginTop:8,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,padding:"6px 10px",fontSize:12,fontWeight:700,color:"#dc2626"}}>
                âš ï¸ Balance due: ${custPrevBalance.toFixed(2)}
              </div>}
              <div style={{marginTop:custPrevBalance>0?10:16,background:"#f59e0b",color:"#0a0e18",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700}}>View Account â†’</div>
            </div>
          </div>

          <button onClick={()=>{setStep("home");setIsExisting(false);setSelCust(null);}} style={{display:"block",margin:"20px auto 0",background:"none",border:"none",color:"#9ca3af",fontSize:12,cursor:"pointer"}}>â† Back to home</button>
        </div>
      </div>}

      {/* â•â• MY ACCOUNT â•â• */}
      {step==="myaccount"&&selCust&&<CustomerAccountView selCust={selCust} supabase={supabase} co={co} setStep={setStep} products={products}/>}

      {/* â•â• ORDER FORM â•â• */}
      {step==="order"&&<div className="fu">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
          <div>
            <button onClick={()=>{setStep("home");setQuantities({});}} style={{background:"#f5f5f5",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 16px",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,marginBottom:10,fontFamily:"'Inter',sans-serif"}}>â† Back to Store Selection</button>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:26,color:"#0a1628"}}>Product Catalog</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{products.length} products available Â· select quantities</div>
          </div>
          {orderItems.length>0&&(
            <div style={{background:"#0a1628",borderRadius:12,padding:"14px 20px",minWidth:210}}>
              <div style={{fontSize:10,color:"#4b6080",letterSpacing:".08em",marginBottom:5}}>ORDER TOTAL</div>
              <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:26,color:"#f59e0b"}}>{fmt(total)}</div>
              <div style={{fontSize:11,color:"#4b6080",marginBottom:12}}>{orderItems.length} item{orderItems.length!==1?"s":""} Â· incl. tobacco tax</div>
              <button className="btn-amber" style={{width:"100%",justifyContent:"center",padding:"10px"}} onClick={()=>setStep("review")}>Review Order â†’</button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <input placeholder="ðŸ”  Search product, SKU..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{padding:"9px 14px",border:"1.5px solid #e5e7eb",borderRadius:9,fontSize:13,background:"#fff",width:220,transition:"border .15s"}}
            onFocus={e=>e.target.style.borderColor="#0a1628"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setCatFilter(c)}
                style={{padding:"7px 14px",borderRadius:20,border:"1.5px solid",borderColor:catFilter===c?catC(c):"#e5e7eb",background:catFilter===c?catC(c)+"18":"#fff",color:catFilter===c?catC(c):"#6b7280",fontSize:11,fontWeight:catFilter===c?700:400,cursor:"pointer",transition:"all .15s"}}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Product Table */}
        <div className="card" style={{overflow:"hidden"}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"70px 90px 1fr 90px 110px 80px 90px 130px",background:"#0a1628",padding:"11px 18px",gap:8}} className="prod-grid">
            {["Stock #","SKU","Description","Type","Unit","Price","Available","Order Qty"].map(h=>(
              <div key={h} style={{fontSize:9,fontWeight:700,color:"#4b6080",letterSpacing:".1em",textTransform:"uppercase",textAlign:["Price","In Stock","Order Qty"].includes(h)?"center":"left"}} className={["Stock #","SKU","Type","Unit"].includes(h)?"hide-sm":""}>{h}</div>
            ))}
          </div>

          {filtered.length===0
            ?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:28,marginBottom:8}}>ðŸ“¦</div><div style={{fontSize:13}}>No products match</div></div>
            :filtered.map((p,i)=>{
              const qty=parseInt(quantities[p.id])||0, sel=qty>0;
              const atMax = qty>=p.totalStock;
              const isLow = p.totalStock>0 && p.totalStock<10;
              return (
                <div key={p.id} className="prod-row" style={{display:"grid",gridTemplateColumns:"70px 90px 1fr 90px 110px 80px 90px 130px",padding:"13px 18px",gap:8,background:sel?"#fffbeb":"transparent",alignItems:"center"}}>
                  <div style={{fontSize:10,color:"#9ca3af",fontFamily:"monospace"}} className="hide-sm">{p.id}</div>
                  <div style={{fontSize:10,fontFamily:"monospace",fontWeight:600,color:"#374151"}} className="hide-sm">{p.sku}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:"#111"}}>{p.name}</div>
                    {sel&&<div style={{fontSize:11,color:"#f59e0b",marginTop:2}}>âœ“ {qty} Ã— {fmt(getEffectivePrice(selCust,p))} = <strong>{fmt(qty*getEffectivePrice(selCust,p))}</strong></div>}
                  </div>
                  <div className="hide-sm"><span className="cat-tag" style={{background:catC(p.cat)+"18",color:catC(p.cat)}}>{p.cat}</span></div>
                  <div style={{fontSize:11,color:"#6b7280"}} className="hide-sm">{p.unit}</div>
                  <div style={{textAlign:"center",fontWeight:700,fontSize:14,color:"#0a1628"}}>{(()=>{const ep=getEffectivePrice(selCust,p);return ep!==p.price?<><span style={{color:"#7c3aed"}}>{fmt(ep)}</span><div style={{fontSize:9,textDecoration:"line-through",color:"#9ca3af",fontWeight:400}}>{fmt(p.price)}</div></>:<span>{fmt(p.price)}</span>;})()}</div>
                  <div style={{textAlign:"center"}}>
                    <span style={{fontWeight:700,fontSize:13,color:isLow?"#ef4444":p.totalStock<20?"#f59e0b":"#10b981"}}>{p.totalStock}</span>
                    {p.onTruck>0&&<div style={{fontSize:9,color:"#6b7280"}}>ðŸ­{p.shelf}+ðŸšš{p.onTruck}</div>}
                    {isLow&&<div style={{fontSize:9,color:"#ef4444",fontWeight:700}}>LOW STOCK</div>}
                    {atMax&&qty>0&&<div style={{fontSize:9,color:"#f59e0b",fontWeight:700}}>MAX</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
                    <button className="qty-btn" onClick={()=>setQty(p.id,qty-1,p.totalStock)}>âˆ’</button>
                    <input type="number" min="0" max={p.totalStock} value={quantities[p.id]||""} placeholder="0"
                      onChange={e=>setQty(p.id,e.target.value,p.totalStock)}
                      style={{width:44,textAlign:"center",border:"1.5px solid",borderColor:sel?"#f59e0b":"#e5e7eb",borderRadius:7,padding:"5px 4px",fontSize:14,fontWeight:700,color:"#111",background:sel?"#fffbeb":"#fff"}}/>
                    <button className="qty-btn"
                      disabled={atMax}
                      style={{background:qty>0&&!atMax?"#0a1628":"#fff",color:qty>0&&!atMax?"#fff":"#374151",borderColor:qty>0&&!atMax?"#0a1628":"#e5e7eb",cursor:atMax?"not-allowed":"pointer",opacity:atMax?0.4:1}}
                      onClick={()=>!atMax&&setQty(p.id,qty+1,p.totalStock)}>+</button>
                  </div>
                </div>
              );
            })}
        </div>

        {orderItems.length>0&&<div style={{marginTop:14}}>
          <div className="card" style={{padding:"16px 18px",marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:600,color:"#9ca3af",letterSpacing:".08em",display:"block",marginBottom:7}}>SPECIAL INSTRUCTIONS / NOTES (OPTIONAL)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Delivery time preference, special requests, preferred items..."
              style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"10px 13px",fontSize:13,resize:"vertical",minHeight:64,fontFamily:"'Inter',sans-serif",color:"#111",transition:"border .15s"}}
              onFocus={e=>e.target.style.borderColor="#0a1628"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
          </div>
          <div style={{background:"#0a1628",borderRadius:12,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",gap:22,flexWrap:"wrap"}}>
              {[{l:"Products",v:orderItems.length},{l:"Subtotal",v:fmt(subtotal)},{l:`Tax   -   Tobacco only`,v:fmt(tax)},{l:"TOTAL",v:fmt(total),big:true}].map(k=>(
                <div key={k.l}><div style={{fontSize:9,color:"#4b6080",letterSpacing:".08em"}}>{k.l}</div><div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:k.big?24:16,color:k.big?"#f59e0b":"#fff"}}>{k.v}</div></div>
              ))}
            </div>
            <button className="btn-amber" onClick={()=>setStep("review")}>Review Order â†’</button>
          </div>
        </div>}
      </div>}

      {/* â•â• REVIEW â•â• */}
      {step==="review"&&<div className="fu">
        <button onClick={()=>setStep("order")} style={{background:"#f5f5f5",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 16px",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,marginBottom:18,fontFamily:"'Inter',sans-serif"}}>â† Back to Catalog</button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:16,alignItems:"start"}} className="grid2">
          <div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:26,color:"#0a1628",marginBottom:16}}>Review Your Order</div>

            {/* Customer Info */}
            <div className="card" style={{padding:"16px 18px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:".1em",marginBottom:10}}>ORDERING FOR</div>
              <div style={{fontWeight:700,fontSize:15,color:"#111"}}>{selCust?.name}</div>
              {(()=>{const vn=(selCust?.notes||"").replace(/CUSTOM_PRICES:[^}]*}/g,"").trim();return vn?<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{vn}</div>:null;})()}
              {selCust?.address&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>ðŸ“ {selCust.address}</div>}
              {selCust?.phone&&<div style={{fontSize:12,color:"#6b7280"}}>ðŸ“ž {selCust.phone}</div>}
              {selCust?.email&&<div style={{fontSize:12,color:"#6b7280"}}>âœ‰ï¸ {selCust.email}</div>}
            </div>

            {/* Returned Check Warning */}
            {custRcFlag&&(
              <div style={{background:"#1a0000",border:"2px solid #dc2626",borderRadius:10,padding:"14px 18px",marginBottom:12,display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:28,flexShrink:0}}>ðŸš¨</span>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:"#dc2626",marginBottom:4}}>RETURNED CHECK ON FILE</div>
                  <div style={{fontSize:13,color:"#f87171",lineHeight:1.6}}>
                    Your account has a returned check on file. A <strong style={{color:"#fbbf24"}}>${custRcFee} penalty</strong> will be added to your invoice by your account manager.
                    Contact us at <strong style={{color:"#fbbf24"}}>{co?.phone||"your driver"}</strong> to resolve this.
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="card" style={{overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #f3f4f6",fontWeight:700,fontSize:13,color:"#111"}}>
                {orderItems.length} Product{orderItems.length!==1?"s":""} Ordered
              </div>
              {orderItems.map((item,i)=>{
                const p=products.find(x=>x.id===item.pid);
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px",borderBottom:"1px solid #f9fafb"}}>
                    <div style={{width:36,height:36,borderRadius:8,background:catC(p?.cat)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>ðŸ“¦</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13,color:"#111"}}>{p?.name}</div>
                      <div style={{fontSize:10,color:"#9ca3af",marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
                        <span>Stock: {p?.id}</span><span>SKU: {p?.sku}</span><span>{p?.unit}</span>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:700,fontSize:13}}>{item.qty} Ã— {fmt(p?.price||0)}</div>
                      <div style={{color:"#f59e0b",fontWeight:700,fontSize:15}}>{fmt(item.qty*(p?.price||0))}</div>
                    </div>
                  </div>
                );
              })}
              {notes&&<div style={{padding:"11px 18px",background:"#fffbeb",fontSize:12,color:"#92400e"}}><strong>Note:</strong> {notes}</div>}
            </div>
          </div>

          {/* Summary + Payment */}
          <div style={{position:"sticky",top:76}}>
            <div style={{background:"#0a1628",borderRadius:14,padding:"22px",color:"#fff"}}>
              <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:20,marginBottom:14}}>Order Summary</div>
              {/* Previous balance warning */}
              {custPrevBalance>0&&<div style={{background:"#dc2626",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:12,color:"#fff",marginBottom:4}}>âš ï¸ Outstanding Balance</div>
                {custPrevInvs.slice(0,3).map(s=>(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#fecaca",marginBottom:2}}>
                    <span>{s.id} Â· {fmtDate(s)}</span><span>${s.total.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,color:"#fff",borderTop:"1px solid #ef4444",marginTop:4,paddingTop:4}}>
                  <span>Previous Balance</span><span>{fmt(custPrevBalance)}</span>
                </div>
              </div>}
              {[{l:"Subtotal",v:fmt(subtotal)},{l:`Tax   -   Tobacco only`,v:fmt(tax)},{l:"New Order Total",v:fmt(total)},...(custPrevBalance>0?[{l:"âš ï¸ Previous Balance",v:fmt(custPrevBalance)}]:[])].map(k=>(
                <div key={k.l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #ffffff10"}}>
                  <span style={{fontSize:12,color:k.l.includes("Balance")?"#fca5a5":"#4b6080"}}>{k.l}</span>
                  <span style={{fontSize:12,color:k.l.includes("Balance")?"#fca5a5":"#9ca3af"}}>{k.v}</span>
                </div>
              ))}
              {/* Promo code */}
              <div style={{padding:"10px 0",borderBottom:"1px solid #ffffff10"}}>
                {promoApplied
                  ?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:"#10b981",fontWeight:700}}>ðŸ·ï¸ {promoApplied.code} ({promoApplied.label})</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:12,color:"#10b981",fontWeight:700}}>âˆ’{fmt(promoApplied.discount)}</span>
                      <button onClick={()=>setPromoApplied(null)} style={{background:"transparent",border:"1px solid #374151",borderRadius:4,padding:"2px 6px",fontSize:10,color:"#6b7280",cursor:"pointer"}}>Remove</button>
                    </div>
                  </div>
                  :<div>
                    <div style={{display:"flex",gap:6}}>
                      <input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())} placeholder="Promo code"
                        style={{flex:1,background:"#0d1f3a",border:"1.5px solid #1e3a5f",borderRadius:7,padding:"8px 12px",fontSize:12,color:"#fff",fontFamily:"'Inter',sans-serif"}}/>
                      <button onClick={applyPromo} style={{background:"#f59e0b",color:"#0a0e18",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Apply</button>
                    </div>
                    {promoError&&<div style={{fontSize:11,color:"#f87171",marginTop:4}}>{promoError}</div>}
                  </div>
                }
              </div>
              {payMethod==="card"&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #ffffff10"}}>
                <span style={{fontSize:12,color:"#a78bfa"}}>Card surcharge ({CARD_FEE}%)</span>
                <span style={{fontSize:12,color:"#a78bfa"}}>+{fmt(cardSurcharge)}</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"14px 0",borderTop:"1px solid #ffffff20",marginTop:3}}>
                <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:17}}>Total Due</span>
                <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:24,color:"#f59e0b"}}>{fmt(grandTotal+custPrevBalance)}</span>
              </div>

              {/* Payment method selector */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:"#4b6080",letterSpacing:".08em",marginBottom:10}}>HOW WOULD YOU LIKE TO PAY?</div>
                {custRcFlag&&(
                  <div style={{background:"#1a0000",border:"1px solid #dc2626",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#f87171",fontWeight:600}}>
                    ðŸš¨ Returned check on file â€” <strong style={{color:"#fbbf24"}}>${custRcFee} penalty</strong> will be added to your invoice by your account manager.
                  </div>
                )}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {/* Pay on delivery */}
                  <div onClick={()=>{setPayMethod("delivery");setClientSecret(null);setStripeReady(false);setStripeError(null);}}
                    style={{padding:"12px 14px",borderRadius:9,border:`2px solid ${payMethod==="delivery"?"#f59e0b":"#1e3050"}`,background:payMethod==="delivery"?"#f59e0b14":"transparent",cursor:"pointer",transition:"all .15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${payMethod==="delivery"?"#f59e0b":"#4b6080"}`,background:payMethod==="delivery"?"#f59e0b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {payMethod==="delivery"&&<div style={{width:8,height:8,borderRadius:"50%",background:"#0a1628"}}/>}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:payMethod==="delivery"?"#f59e0b":"#fff"}}>ðŸ’µ Pay on Delivery</div>
                        <div style={{fontSize:11,color:"#4b6080",marginTop:1}}>
                        Cash Â· Check Â· Money Order Â· Zelle â€” No fee
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Pay by card */}
                  <div onClick={()=>{setPayMethod("card");loadStripeIntent();}}
                    style={{padding:"12px 14px",borderRadius:9,border:`2px solid ${payMethod==="card"?"#a78bfa":"#1e3050"}`,background:payMethod==="card"?"#a78bfa14":"transparent",cursor:"pointer",transition:"all .15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${payMethod==="card"?"#a78bfa":"#4b6080"}`,background:payMethod==="card"?"#a78bfa":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {payMethod==="card"&&<div style={{width:8,height:8,borderRadius:"50%",background:"#0a1628"}}/>}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:payMethod==="card"?"#a78bfa":"#fff"}}>ðŸ’³ Pay by Card Now</div>
                        <div style={{fontSize:11,color:"#4b6080",marginTop:1}}>Credit or Debit Â· {CARD_FEE}% surcharge applies</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stripe card form */}
              {payMethod==="card"&&<div style={{marginBottom:14}}>
                {!stripeReady&&!stripeError&&<div style={{textAlign:"center",padding:"16px",color:"#4b6080",fontSize:12}}>
                  <span style={{display:"inline-block",animation:"spin .8s linear infinite"}}>âŸ³</span> Loading secure payment formâ€¦
                </div>}
                {stripeError&&<div style={{background:"#1a0a0a",border:"1px solid #4a1010",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#f87171",marginBottom:10}}>
                  âš ï¸ {stripeError}
                </div>}
                {stripeReady&&clientSecret&&<div>
                  <div id="stripe-payment-element" style={{marginBottom:12}}></div>
                  <div style={{fontSize:10,color:"#374151",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    ðŸ”’ Secured by Stripe Â· PCI compliant
                  </div>
                </div>}
              </div>}

              {stripeError&&payMethod==="card"&&<button onClick={loadStripeIntent} style={{width:"100%",background:"transparent",border:"1px solid #4b6080",borderRadius:8,padding:"8px",fontSize:11,color:"#4b6080",cursor:"pointer",marginBottom:10,fontFamily:"'Inter',sans-serif"}}>â†» Retry</button>}

              {portalError&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:9,padding:"12px 16px",fontSize:13,color:"#dc2626",marginBottom:12,fontWeight:500}}>{portalError}</div>}

              {/* Signature Pad */}
              <div style={{marginBottom:14,background:"#0d1f3a",border:"1px solid #1e3a5f",borderRadius:10,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>âœï¸ Customer Signature {sigData&&<span style={{color:"#10b981"}}>âœ“ Captured</span>}</div>
                  {sigData&&<button onClick={()=>{setSigData(null);const c=sigCanvasRef.current;if(c){const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);}}} style={{background:"transparent",border:"1px solid #374151",borderRadius:5,padding:"3px 8px",fontSize:10,color:"#6b7280",cursor:"pointer"}}>Clear</button>}
                </div>
                <canvas ref={sigCanvasRef} width={340} height={100}
                  style={{background:"#fff",borderRadius:7,width:"100%",height:90,cursor:"crosshair",display:"block",touchAction:"none"}}
                  onMouseDown={e=>{setSigDrawing(true);const c=sigCanvasRef.current;const r=c.getBoundingClientRect();const ctx=c.getContext("2d");ctx.beginPath();ctx.moveTo((e.clientX-r.left)*(c.width/r.width),(e.clientY-r.top)*(c.height/r.height));}}
                  onMouseMove={e=>{if(!sigDrawing)return;const c=sigCanvasRef.current;const r=c.getBoundingClientRect();const ctx=c.getContext("2d");ctx.strokeStyle="#0a1628";ctx.lineWidth=2;ctx.lineCap="round";ctx.lineTo((e.clientX-r.left)*(c.width/r.width),(e.clientY-r.top)*(c.height/r.height));ctx.stroke();}}
                  onMouseUp={()=>{setSigDrawing(false);setSigData(sigCanvasRef.current.toDataURL());}}
                  onTouchStart={e=>{e.preventDefault();setSigDrawing(true);const c=sigCanvasRef.current;const r=c.getBoundingClientRect();const ctx=c.getContext("2d");const t=e.touches[0];ctx.beginPath();ctx.moveTo((t.clientX-r.left)*(c.width/r.width),(t.clientY-r.top)*(c.height/r.height));}}
                  onTouchMove={e=>{e.preventDefault();if(!sigDrawing)return;const c=sigCanvasRef.current;const r=c.getBoundingClientRect();const ctx=c.getContext("2d");ctx.strokeStyle="#0a1628";ctx.lineWidth=2;ctx.lineCap="round";const t=e.touches[0];ctx.lineTo((t.clientX-r.left)*(c.width/r.width),(t.clientY-r.top)*(c.height/r.height));ctx.stroke();}}
                  onTouchEnd={()=>{setSigDrawing(false);setSigData(sigCanvasRef.current.toDataURL());}}
                />
                <div style={{fontSize:10,color:"#4b6080",marginTop:6,textAlign:"center"}}>Sign above to confirm receipt of goods</div>
              </div>

              <button className="btn-amber" style={{width:"100%",justifyContent:"center",padding:"13px",opacity:(payMethod==="card"&&!stripeReady)?0.5:1}} onClick={()=>{setPortalError("");handleSubmit();}} disabled={submitting||(payMethod==="card"&&!stripeReady)}>
                {submitting?<><span className="sp">âŸ³</span>Processingâ€¦</>:payMethod==="card"?`ðŸ’³ Pay ${fmt(grandTotal)} Now`:`[OK] Submit Order  -  Pay on Delivery`}
              </button>
              <div style={{fontSize:10,color:"#374151",textAlign:"center",marginTop:8,lineHeight:1.6}}>
                {payMethod==="delivery"?"Driver will collect payment upon delivery":"Your card will be charged immediately"}
              </div>
            </div>
          </div>
        </div>
      </div>}

      {/* â•â• CONFIRMED â•â• */}
      {step==="confirm"&&order&&<div className="fu">
        <div className="no-print" style={{background:order.paidOnline?"#ede9fe":"#d1fae5",border:`1px solid ${order.paidOnline?"#c4b5fd":"#a7f3d0"}`,borderRadius:12,padding:"18px 22px",marginBottom:22,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{width:46,height:46,background:order.paidOnline?"#7c3aed":"#10b981",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>âœ“</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:20,color:order.paidOnline?"#4c1d95":"#065f46"}}>
              {order.paidOnline?"Order Placed & Payment Confirmed!":"Order Submitted Successfully!"}
            </div>
            <div style={{fontSize:12,color:order.paidOnline?"#6d28d9":"#047857",marginTop:3}}>
              Order <strong>{order.id}</strong> â€” {order.paidOnline?`ðŸ’³ $${grandTotal.toFixed(2)} charged to your card`:"ðŸ’µ Driver will collect payment on delivery"}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={()=>window.print()} style={{background:"#fff",border:`1.5px solid ${order.paidOnline?"#7c3aed":"#10b981"}`,borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",color:order.paidOnline?"#4c1d95":"#065f46",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",gap:6}}>ðŸ–¨ï¸ Print / Save PDF</button>
            <button onClick={resetAll} style={{background:order.paidOnline?"#7c3aed":"#10b981",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",color:"#fff",fontFamily:"'Inter',sans-serif"}}>New Order</button>
          </div>
        </div>
        <Invoice order={order} products={products} co={co}/>
        {order.signature&&(
          <div style={{marginTop:16,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8}}>âœï¸ Customer Signature â€” Proof of Delivery</div>
            <img src={order.signature} alt="signature" style={{maxWidth:300,border:"1px solid #e5e7eb",borderRadius:6,background:"#fff"}}/>
          </div>
        )}
      </div>}

      </div>
    </div>
  );
}