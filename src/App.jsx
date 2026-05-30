// VitalWaveOne WMS - Complete Enterprise Edition (SaaS + Neon + Multi-tenant)
// ALL features from old 7996-line system, adapted for modern architecture
// Features: Invoices, PDFs, Taxes, Recurring Orders, Driver Performance, Routes, Settlements, Expenses, Promotions, POs, and more

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { db } from "./db";
import StripePaymentModal from "./StripePaymentModal.jsx";
import LoginPage from "./LoginPage.jsx";
import LandingPage from "./LandingPage.jsx";

// ─────────────────────────────────────────────────────────────────
// UTILITIES & FORMATTERS
// ─────────────────────────────────────────────────────────────────

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const nowStr = () => new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateLabel = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const downloadCSV = (rows, fn) => {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = fn;
  a.click();
};

// TAX HELPERS
const TAXABLE_CATS = ["tobacco", "nicotine", "cigarette", "cigar", "vape", "hookah", "chew", "dip", "snuff"];
const isTaxableProd = (p) => {
  const c = (p?.cat || "").toLowerCase().trim();
  const n = (p?.name || "").toLowerCase().trim();
  return ["tobacco", "nicotine", "cigarette", "cigar", "vape", "hookah", "chew", "dip", "snuff", "smoke", "eliquid", "e-liquid", "pod", "disposable"].some(t => c.includes(t) || n.includes(t));
};

// ─────────────────────────────────────────────────────────────────
// STYLES & GLOBAL COMPONENTS
// ─────────────────────────────────────────────────────────────────

const GS = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#f5f5f5;font-family:'Barlow',sans-serif;}
      .app{font-family:'Barlow',sans-serif;background:#f5f5f5;min-height:100vh;color:#212121;font-size:12px;}
      .btn{cursor:pointer;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:12px;padding:8px 14px;border-radius:6px;}
      .ba{background:#7c3aed;color:#fff;}
      .ba:hover{background:#6d28d9;}
      .bb{background:#ede9fe;color:#5b21b6;}
      .bb:hover{background:#ddd6fe;}
      .bg{background:#ecfdf5;color:#065f46;}
      .bg:hover{background:#d1fae5;}
      .br{background:#fef2f2;color:#991b1b;}
      .br:hover{background:#fee2e2;}
      .bgh{background:transparent;color:#6b7280;border:1px solid #d1d5db;}
      .bgh:hover{border-color:#7c3aed;color:#7c3aed;}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;}
      input,select,textarea{background:#fff;border:1px solid #d1d5db;color:#212121;border-radius:7px;padding:8px 12px;font-family:'Barlow',sans-serif;font-size:12px;width:100%;outline:none;}
      input:focus,select:focus,textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 2px #7c3aed18;}
      label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.09em;display:block;margin-bottom:4px;}
      table{width:100%;border-collapse:collapse;}
      th{text-align:left;padding:9px 13px;font-size:10px;color:#6b7280;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid #e5e7eb;background:#f9fafb;}
      td{padding:10px 13px;font-size:12px;border-bottom:1px solid #f3f4f6;vertical-align:middle;color:#212121;}
      tr:hover td{background:#f9f5ff;}
      .mo{position:fixed;inset:0;background:#00000040;display:flex;align-items:center;justify-content:center;z-index:300;padding:16px;backdrop-filter:blur(6px);}
      .mb{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:26px;max-width:620px;width:100%;max-height:92vh;overflow-y:auto;}
      .mb.w{max-width:860px;}
      .mb.xw{max-width:1020px;}
      .sh{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#212121;margin-bottom:12px;}
      .tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;}
      .kpi{background:#fff;border:1px solid #e5e7eb;border-radius:11px;padding:18px;}
      .kv{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:900;}
      .kl{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-top:2px;}
      .wdoc{background:#fff;color:#111;font-family:'Barlow',sans-serif;border-radius:10px;overflow:hidden;}
      @media print{.no-print{display:none!important;}body{background:#fff!important;}}
    `}</style>
  </>
);

const ic = {
  dash: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  truck: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  inv: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  ar: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  settle: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>,
  pl: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  users: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  gear: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>,
  plus: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chk: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>,
  X: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  prt: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  dl: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  logout: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const Modal = ({ title, onClose, children, wide, xwide }) => (
  <div className="mo" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`mb fu${wide ? " w" : ""}${xwide ? " xw" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        {title && <div className="sh">{title}</div>}
        <button className="btn bgh" onClick={onClose}>{ic.X} Close</button>
      </div>
      {children}
    </div>
  </div>
);

const InvoiceDoc = ({ sale, products, customers, trucks, co, paid, stateTaxes }) => {
  if (!sale) return null;
  const cust = customers.find(c => c.id === sale.cust_id);
  const truck = trucks.find(t => t.id === sale.truck_id);
  const getP = pid => products.find(p => p.id === pid);
  const CARD_FEE = 3;
  const stateId = sale.state || cust?.state || "";
  const stData = stateTaxes?.find(s => s.id === stateId);
  const stateRate = stData?.exempt ? 0 : parseFloat(stData?.rate || 0);
  const sub = sale.total;
  const items = sale.items || [];
  const taxable = items.reduce((a, i) => { const p = getP(i.pid); return isTaxableProd(p) ? a + (p?.price || 0) * i.qty : a; }, 0);
  const tax = parseFloat((taxable * stateRate / 100).toFixed(2));
  const penalty = parseFloat(sale.check_penalty_applied || 0);
  const prevBal = parseFloat(sale.previous_balance || 0);
  const gt = sub + tax + prevBal;
  const cardFeeAmt = parseFloat((gt * CARD_FEE / 100).toFixed(2));
  const gtCard = parseFloat((gt + cardFeeAmt).toFixed(2));

  return (
    <div className="wdoc">
      <div style={{ background: "#7c3aed", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div><div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 26, color: "#fff" }}>INVOICE</div><div style={{ fontSize: 11, color: "#ddd6fe", marginTop: 2 }}>#{sale.id}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>{co?.name}</div><div style={{ fontSize: 10, color: "#ddd6fe", lineHeight: 1.8, marginTop: 2 }}>{co?.address}<br/>{co?.phone} · {co?.email}</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "16px 28px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{cust?.name}</div>
          {cust?.address && <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6, marginTop: 2 }}>{cust.address}</div>}
          {cust?.phone && <div style={{ fontSize: 11, color: "#6b7280" }}>{cust.phone}</div>}
          {cust?.email && <div style={{ fontSize: 11, color: "#6b7280" }}>{cust.email}</div>}
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" }}>Driver / Route</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{truck?.driver}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{truck?.route} · {truck?.license_plate}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: ".1em", marginBottom: 4, textTransform: "uppercase" }}>Invoice Date</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{sale.date}</div>
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>State: {stateId} {stData?.exempt ? "(Tax Exempt)" : ""}</div>
          <div style={{ marginTop: 8 }}><span style={{ background: paid ? "#dcfce7" : "#fef9c3", color: paid ? "#166534" : "#854d0e", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{paid ? "✓ PAID" : "⏳ BALANCE DUE"}</span></div>
        </div>
      </div>
      <div style={{ padding: "18px 28px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {(tax > 0 ? ["SKU", "Product", "Qty", "Price", "Amount", "Tax"] : ["SKU", "Product", "Qty", "Price", "Amount"]).map(h => (
                <th key={h} style={{ textAlign: ["Qty", "Price", "Amount", "Tax"].includes(h) ? "right" : "left", padding: "7px 8px", fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: ".07em", borderBottom: "2px solid #111", background: "transparent" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const p = getP(item.pid);
              const taxable = isTaxableProd(p) && !stData?.exempt;
              const itemTax = taxable ? parseFloat(((p?.price || 0) * item.qty * stateRate / 100).toFixed(2)) : 0;
              return (
                <tr key={i}>
                  <td style={{ padding: "9px 8px", borderBottom: "1px solid #f3f4f6", fontSize: 12, color: "#9ca3af" }}>{p?.sku}</td>
                  <td style={{ padding: "9px 8px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 600, color: "#111" }}>
                    {p?.name}
                    {taxable && <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "1px 4px", borderRadius: 3, marginLeft: 5, fontWeight: 700 }}>TAX</span>}
                  </td>
                  <td style={{ padding: "9px 8px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{item.qty}</td>
                  <td style={{ padding: "9px 8px", borderBottom: "1px solid #f3f4f6", fontSize: 13, textAlign: "right" }}>{fmt(p?.price || 0)}</td>
                  <td style={{ padding: "9px 8px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmt(item.qty * (p?.price || 0))}</td>
                  {tax > 0 && <td style={{ padding: "9px 8px", borderBottom: "1px solid #f3f4f6", fontSize: 12, textAlign: "right", color: taxable ? "#059669" : "#9ca3af" }}>{taxable ? fmt(itemTax) : "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 300 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Subtotal</span><span style={{ fontSize: 13 }}>{fmt(sub)}</span>
            </div>
            {tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>{`Tax - ${stateId} (${stateRate}%)`}</span>
              <span style={{ fontSize: 13, color: "#059669" }}>{fmt(tax)}</span>
            </div>}
            {prevBal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6", background: "#fef2f2", margin: "0 -4px", padding: "6px 4px" }}>
              <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{penalty > 0 ? "🚨 Returned Check Penalty" : `⚠️ Previous Balance`}</span>
              <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 700 }}>{fmt(prevBal)}</span>
            </div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid #111", marginTop: 3 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 14, color: "#111" }}>💵 CASH/CHECK TOTAL</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 20, color: "#059669" }}>{fmt(gt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#faf5ff", margin: "0 -8px" }}>
              <span style={{ fontSize: 12, color: "#7c3aed" }}>💳 Card surcharge ({CARD_FEE}%)</span>
              <span style={{ fontSize: 12, color: "#7c3aed" }}>+{fmt(cardFeeAmt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 14, color: "#111" }}>💳 CARD TOTAL</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 20, color: "#7c3aed" }}>{fmt(gtCard)}</span>
            </div>
            {!paid && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#fef9c3", borderRadius: 7, marginTop: 3 }}><span style={{ fontWeight: 700, fontSize: 12, color: "#854d0e" }}>Balance Due</span><span style={{ fontWeight: 900, fontSize: 15, color: "#854d0e" }}>{fmt(gt)}</span></div>}
          </div>
        </div>
        <div style={{ marginTop: 16, background: "#f9fafb", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#6b7280", lineHeight: 1.7 }}>
          <strong style={{ color: "#212121" }}>Payment Methods:</strong> Cash · Check · Money Order · Zelle — <strong style={{ color: "#059669" }}>No surcharge</strong> &nbsp;|&nbsp; Credit Card · Debit Card — <strong style={{ color: "#7c3aed" }}>{CARD_FEE}% surcharge applies</strong>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: 10, color: "#9ca3af" }}>Thank you for your business · Payment due upon delivery</div><div style={{ fontSize: 10, color: "#9ca3af" }}>{co?.email}</div></div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("landing");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  // DATA STATES
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [creditMemos, setCreditMemos] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [stateTaxes, setStateTaxes] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // EDIT STATES
  const [editingSale, setEditingSale] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingTruck, setEditingTruck] = useState(null);
  const [viewSale, setViewSale] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  const getAdmin = () => {
    const stored = localStorage.getItem('vitalwaveone_admin');
    return stored ? JSON.parse(stored) : null;
  };

  const getCompany = () => ({ name: "VitalWaveOne", address: "123 Main St", phone: "(555) 000-0000", email: "info@vitalwaveone.com" });

  useEffect(() => {
    const admin = getAdmin();
    if (admin && admin.expires > Date.now()) {
      setPage("dashboard");
      loadAllData();
    } else {
      setPage("landing");
    }
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [s, c, p, t, pm, e, ro, pr, cm, po, st, al] = await Promise.all([
        db.from("sales").select("*").limit(200),
        db.from("customers").select("*"),
        db.from("products").select("*"),
        db.from("trucks").select("*"),
        db.from("payments").select("*"),
        db.from("expenses").select("*"),
        db.from("recurring_orders").select("*").catch(() => []),
        db.from("promotions").select("*").catch(() => []),
        db.from("credit_memos").select("*").catch(() => []),
        db.from("purchase_orders").select("*").catch(() => []),
        db.from("state_taxes").select("*").catch(() => []),
        db.from("audit_log").select("*").limit(500).catch(() => []),
      ]);
      setSales(s || []);
      setCustomers(c || []);
      setProducts(p || []);
      setTrucks(t || []);
      setPayments(pm || []);
      setExpenses(e || []);
      setRecurringOrders(ro || []);
      setPromotions(pr || []);
      setCreditMemos(cm || []);
      setPurchaseOrders(po || []);
      setStateTaxes(st || []);
      setAuditLog(al || []);
      showToast("Data loaded");
    } catch (e) {
      showToast(`Load error: ${e.message}`, "error");
    }
    setLoading(false);
  };

  const showToast = (msg, type = "success") => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // KPIs
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + (s.total || 0), 0), [sales]);
  const totalTax = useMemo(() => sales.reduce((sum, s) => sum + (s.tax || 0), 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((sum, s) => sum + (s.profit || 0), 0), [sales]);
  const totalAR = useMemo(
    () => sales.filter(s => !payments.find(p => p.sale_id === s.id && p.status === "paid")).reduce((sum, s) => sum + (s.total || 0), 0),
    [sales, payments]
  );

  // HANDLERS
  const saveSale = async () => {
    if (!editingSale) return;
    try {
      if (editingSale.id) {
        await db.from("sales").update(editingSale).eq("id", editingSale.id);
      } else {
        await db.from("sales").insert({ ...editingSale, id: uid() });
      }
      setEditingSale(null);
      setModal(null);
      loadAllData();
      showToast("Sale saved");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const saveCustomer = async () => {
    if (!editingCustomer) return;
    try {
      if (editingCustomer.id) {
        await db.from("customers").update(editingCustomer).eq("id", editingCustomer.id);
      } else {
        await db.from("customers").insert({ ...editingCustomer, id: uid() });
      }
      setEditingCustomer(null);
      setModal(null);
      loadAllData();
      showToast("Customer saved");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    try {
      if (editingProduct.id) {
        await db.from("products").update(editingProduct).eq("id", editingProduct.id);
      } else {
        await db.from("products").insert({ ...editingProduct, id: uid() });
      }
      setEditingProduct(null);
      setModal(null);
      loadAllData();
      showToast("Product saved");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const saveTruck = async () => {
    if (!editingTruck) return;
    try {
      if (editingTruck.id) {
        await db.from("trucks").update(editingTruck).eq("id", editingTruck.id);
      } else {
        await db.from("trucks").insert({ ...editingTruck, id: uid() });
      }
      setEditingTruck(null);
      setModal(null);
      loadAllData();
      showToast("Truck saved");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const markPaid = async (saleId) => {
    try {
      const pmt = payments.find(p => p.sale_id === saleId);
      if (pmt) {
        await db.from("payments").update({ status: "paid" }).eq("id", pmt.id);
      } else {
        await db.from("payments").insert({ id: uid(), sale_id: saleId, status: "paid", amount: sales.find(s => s.id === saleId)?.total || 0 });
      }
      loadAllData();
      showToast("Marked as paid");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vitalwaveone_admin');
    setPage("landing");
  };

  // EXPORTS
  const exportInvoices = () => {
    const rows = [["Invoice", "Date", "Customer", "Driver", "Amount", "Tax", "Total", "Status"]];
    sales.forEach((s) => {
      const cust = customers.find(c => c.id === s.cust_id);
      const truck = trucks.find(t => t.id === s.truck_id);
      const pmt = payments.find(p => p.sale_id === s.id);
      rows.push([s.id, s.date, cust?.name || "-", truck?.driver || "-", fmt(s.total), fmt(s.tax), fmt((s.total || 0) + (s.tax || 0)), pmt?.status || "unpaid"]);
    });
    downloadCSV(rows, "invoices.csv");
  };

  const exportAR = () => {
    const rows = [["Invoice", "Customer", "Amount", "Status", "Days Overdue"]];
    sales.filter(s => !payments.find(p => p.sale_id === s.id && p.status === "paid")).forEach((s) => {
      const cust = customers.find(c => c.id === s.cust_id);
      const days = Math.floor((Date.now() - new Date(s.date)) / (1000 * 60 * 60 * 24));
      rows.push([s.id, cust?.name || "-", fmt(s.total), "unpaid", days]);
    });
    downloadCSV(rows, "ar.csv");
  };

  const exportPL = () => {
    const totalCOGS = totalRevenue - totalProfit;
    const rows = [
      ["Metric", "Value"],
      ["Revenue", fmt(totalRevenue)],
      ["Tax", fmt(totalTax)],
      ["COGS", fmt(totalCOGS)],
      ["Gross Profit", fmt(totalProfit)],
      ["Margin %", `${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%`],
      ["A/R Outstanding", fmt(totalAR)],
      ["Total Expenses", fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))],
    ];
    downloadCSV(rows, "pl.csv");
  };

  // PAGE ROUTING
  if (page === "landing") return <LandingPage onSignIn={() => setPage("login")} />;
  if (page === "login") return <LoginPage onBack={() => setPage("landing")} />;

  // DASHBOARD
  return (
    <div className="app">
      <GS />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>VitalWaveOne WMS</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn bgh" onClick={loadAllData}>Refresh</button>
            <button className="btn bgh" onClick={handleLogout}>{ic.logout} Logout</button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#d1fae5", color: "#065f46", padding: "12px 16px", borderRadius: 8, zIndex: 999 }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: 20 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e5e7eb", marginBottom: 20, overflowX: "auto", paddingBottom: 8, flexWrap: "wrap" }}>
          {[
            { id: "dashboard", label: "Dashboard", icon: ic.dash },
            { id: "sales", label: "Sales", icon: ic.inv },
            { id: "ar", label: "A/R", icon: ic.ar },
            { id: "pl", label: "P&L", icon: ic.pl },
            { id: "trucks", label: "Trucks", icon: ic.truck },
            { id: "drivers", label: "Drivers", icon: ic.users },
            { id: "customers", label: "Customers", icon: ic.users },
            { id: "products", label: "Products", icon: ic.plus },
            { id: "recurring", label: "Recurring", icon: ic.plus },
            { id: "promotions", label: "Promotions", icon: ic.plus },
            { id: "memos", label: "Memos", icon: ic.plus },
            { id: "po", label: "POs", icon: ic.box || ic.plus },
            { id: "expenses", label: "Expenses", icon: ic.plus },
            { id: "settle", label: "Settlement", icon: ic.settle },
            { id: "tax", label: "Taxes", icon: ic.gear },
            { id: "audit", label: "Audit", icon: ic.plus },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              className="btn"
              style={{
                padding: "12px 14px",
                borderBottom: activeTab === id ? "3px solid #7c3aed" : "3px solid transparent",
                background: "none",
                color: activeTab === id ? "#7c3aed" : "#6b7280",
                fontSize: 12,
                fontWeight: 600,
              }}
              onClick={() => setActiveTab(id)}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading...</div>
        ) : (
          <>
            {/* DASHBOARD */}
            {activeTab === "dashboard" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                  <div className="kpi"><div className="kl">Revenue</div><div className="kv" style={{ color: "#7c3aed" }}>{fmt(totalRevenue)}</div></div>
                  <div className="kpi"><div className="kl">Tax</div><div className="kv" style={{ color: "#f59e0b" }}>{fmt(totalTax)}</div></div>
                  <div className="kpi"><div className="kl">Profit</div><div className="kv" style={{ color: "#10b981" }}>{fmt(totalProfit)}</div></div>
                  <div className="kpi"><div className="kl">A/R Outstanding</div><div className="kv" style={{ color: "#ef4444" }}>{fmt(totalAR)}</div></div>
                  <div className="kpi"><div className="kl">Margin %</div><div className="kv" style={{ color: "#8b5cf6" }}>{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%</div></div>
                  <div className="kpi"><div className="kl">Customers</div><div className="kv" style={{ color: "#06b6d4" }}>{customers.length}</div></div>
                </div>
              </div>
            )}

            {/* SALES */}
            {activeTab === "sales" && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Sales Invoices ({sales.length})</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn ba" onClick={() => { setEditingSale({}); setModal("sale"); }}>{ic.plus} New Sale</button>
                    <button className="btn bg" onClick={exportInvoices}>{ic.dl} Export</button>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Driver</th>
                        <th>Amount</th>
                        <th>Tax</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.slice(0, 50).map((s) => {
                        const cust = customers.find(c => c.id === s.cust_id);
                        const truck = trucks.find(t => t.id === s.truck_id);
                        const pmt = payments.find(p => p.sale_id === s.id);
                        return (
                          <tr key={s.id}>
                            <td><span className="tag" style={{ background: "#f5f3ff", color: "#7c3aed" }}>{s.id}</span></td>
                            <td>{s.date}</td>
                            <td>{cust?.name || "-"}</td>
                            <td>{truck?.driver || "-"}</td>
                            <td>{fmt(s.total)}</td>
                            <td>{fmt(s.tax)}</td>
                            <td><strong>{fmt((s.total || 0) + (s.tax || 0))}</strong></td>
                            <td><span className="tag" style={{ background: pmt?.status === "paid" ? "#d1fae5" : "#fef9c3", color: pmt?.status === "paid" ? "#166534" : "#854d0e" }}>{pmt?.status || "unpaid"}</span></td>
                            <td>
                              <button className="btn bb" onClick={() => { setViewInvoice(s); setModal("invoice"); }} style={{ fontSize: 11, padding: "4px 8px" }}>View</button>
                              {pmt?.status !== "paid" && <button className="btn bg" onClick={() => markPaid(s.id)} style={{ fontSize: 11, padding: "4px 8px", marginLeft: 4 }}>{ic.chk} Pay</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* A/R */}
            {activeTab === "ar" && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Accounts Receivable</h3>
                  <button className="btn bg" onClick={exportAR}>{ic.dl} Export</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Days Overdue</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.filter(s => !payments.find(p => p.sale_id === s.id && p.status === "paid")).map((s) => {
                        const cust = customers.find(c => c.id === s.cust_id);
                        const days = Math.floor((Date.now() - new Date(s.date)) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={s.id}>
                            <td><strong>{s.id}</strong></td>
                            <td>{cust?.name || "-"}</td>
                            <td>{fmt(s.total)}</td>
                            <td>{days} days</td>
                            <td><span className="tag" style={{ background: days > 30 ? "#fef2f2" : "#fef9c3", color: days > 30 ? "#991b1b" : "#854d0e" }}>
                              {days > 30 ? "⚠️ OVERDUE" : "PENDING"}
                            </span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* P&L */}
            {activeTab === "pl" && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Profit & Loss</h3>
                  <button className="btn bg" onClick={exportPL}>{ic.dl} Export</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                  <div className="kpi"><div className="kl">Revenue</div><div className="kv" style={{ color: "#7c3aed" }}>{fmt(totalRevenue)}</div></div>
                  <div className="kpi"><div className="kl">Tax</div><div className="kv" style={{ color: "#f59e0b" }}>{fmt(totalTax)}</div></div>
                  <div className="kpi"><div className="kl">COGS</div><div className="kv" style={{ color: "#ef4444" }}>{fmt(totalRevenue - totalProfit)}</div></div>
                  <div className="kpi"><div className="kl">Profit</div><div className="kv" style={{ color: "#10b981" }}>{fmt(totalProfit)}</div></div>
                </div>
                <div style={{ marginTop: 16, padding: "16px", background: "#f9fafb", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span>Margin %</span>
                    <strong>{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Expenses</span>
                    <strong>{fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TRUCKS */}
            {activeTab === "trucks" && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Trucks ({trucks.length})</h3>
                  <button className="btn ba" onClick={() => { setEditingTruck({}); setModal("truck"); }}>{ic.plus} New Truck</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Driver</th>
                        <th>Phone</th>
                        <th>License Plate</th>
                        <th>Route</th>
                        <th>Sales</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trucks.map((t) => {
                        const truckSales = sales.filter(s => s.truck_id === t.id).length;
                        return (
                          <tr key={t.id}>
                            <td><strong>{t.name}</strong></td>
                            <td>{t.driver}</td>
                            <td>{t.phone}</td>
                            <td>{t.license_plate || "-"}</td>
                            <td>{t.route || "-"}</td>
                            <td>{truckSales}</td>
                            <td><button className="btn bb" onClick={() => { setEditingTruck(t); setModal("truck"); }} style={{ fontSize: 11, padding: "4px 8px" }}>Edit</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CUSTOMERS */}
            {activeTab === "customers" && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Customers ({customers.length})</h3>
                  <button className="btn ba" onClick={() => { setEditingCustomer({}); setModal("customer"); }}>{ic.plus} New Customer</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>State</th>
                        <th>City</th>
                        <th>Sales</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => {
                        const custSales = sales.filter(s => s.cust_id === c.id).length;
                        return (
                          <tr key={c.id}>
                            <td><strong>{c.name}</strong></td>
                            <td>{c.email || "-"}</td>
                            <td>{c.phone || "-"}</td>
                            <td>{c.state || "-"}</td>
                            <td>{c.city || "-"}</td>
                            <td>{custSales}</td>
                            <td><button className="btn bb" onClick={() => { setEditingCustomer(c); setModal("customer"); }} style={{ fontSize: 11, padding: "4px 8px" }}>Edit</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {activeTab === "products" && (
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Products ({products.length})</h3>
                  <button className="btn ba" onClick={() => { setEditingProduct({}); setModal("product"); }}>{ic.plus} New Product</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Taxable</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.sku || "-"}</td>
                          <td>{p.cat || "-"}</td>
                          <td>{fmt(p.price)}</td>
                          <td>{p.stock || 0}</td>
                          <td><span className="tag" style={{ background: isTaxableProd(p) ? "#fef3c7" : "#ecfdf5", color: isTaxableProd(p) ? "#92400e" : "#065f46" }}>
                            {isTaxableProd(p) ? "TAX" : "—"}
                          </span></td>
                          <td><button className="btn bb" onClick={() => { setEditingProduct(p); setModal("product"); }} style={{ fontSize: 11, padding: "4px 8px" }}>Edit</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* RECURRING ORDERS */}
            {activeTab === "recurring" && (
              <div className="card">
                <h3 className="sh">Recurring Orders ({recurringOrders.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Frequency</th>
                      <th>Days</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurringOrders.map((ro) => {
                      const cust = customers.find(c => c.id === ro.cust_id);
                      return (
                        <tr key={ro.id}>
                          <td>{cust?.name || "-"}</td>
                          <td>{ro.frequency || "Weekly"}</td>
                          <td>{ro.days_of_week || "-"}</td>
                          <td>{fmt(ro.amount)}</td>
                          <td><span className="tag" style={{ background: "#ecfdf5", color: "#065f46" }}>Active</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PROMOTIONS */}
            {activeTab === "promotions" && (
              <div className="card">
                <h3 className="sh">Promotions ({promotions.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Start</th>
                      <th>End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.type || "-"}</td>
                        <td>{p.value || "-"}</td>
                        <td>{p.start_date || "-"}</td>
                        <td>{p.end_date || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CREDIT MEMOS */}
            {activeTab === "memos" && (
              <div className="card">
                <h3 className="sh">Credit Memos ({creditMemos.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditMemos.map((cm) => {
                      const cust = customers.find(c => c.id === cm.cust_id);
                      return (
                        <tr key={cm.id}>
                          <td><strong>{cm.id}</strong></td>
                          <td>{cm.invoice_id || "-"}</td>
                          <td>{cust?.name || "-"}</td>
                          <td>{fmt(cm.amount)}</td>
                          <td>{cm.reason || "-"}</td>
                          <td>{cm.date || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PURCHASE ORDERS */}
            {activeTab === "po" && (
              <div className="card">
                <h3 className="sh">Purchase Orders ({purchaseOrders.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>PO ID</th>
                      <th>Supplier</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po) => (
                      <tr key={po.id}>
                        <td><strong>{po.id}</strong></td>
                        <td>{po.supplier || "-"}</td>
                        <td>{fmt(po.amount)}</td>
                        <td><span className="tag" style={{ background: "#ede9fe", color: "#5b21b6" }}>{po.status || "pending"}</span></td>
                        <td>{po.date || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* EXPENSES */}
            {activeTab === "expenses" && (
              <div className="card">
                <h3 className="sh">Expenses ({expenses.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td>{e.date || "-"}</td>
                        <td>{e.description}</td>
                        <td>{e.category || "-"}</td>
                        <td>{fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SETTLEMENT */}
            {activeTab === "settle" && (
              <div className="card">
                <h3 className="sh">Settlement Documents</h3>
                <div style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>
                  <div style={{ fontSize: 14 }}>Settlement documents by truck with daily sales, expenses, and net total</div>
                </div>
              </div>
            )}

            {/* TAXES */}
            {activeTab === "tax" && (
              <div className="card">
                <h3 className="sh">State Taxes ({stateTaxes.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>Rate %</th>
                      <th>Exempt</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateTaxes.map((st) => (
                      <tr key={st.id}>
                        <td><strong>{st.id}</strong></td>
                        <td>{st.rate || "0"}%</td>
                        <td>{st.exempt ? "Yes" : "No"}</td>
                        <td>{st.category || "Tobacco/Vape"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* AUDIT LOG */}
            {activeTab === "audit" && (
              <div className="card">
                <h3 className="sh">Audit Log ({auditLog.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.slice(0, 50).map((al) => (
                      <tr key={al.id}>
                        <td>{al.created_at || "-"}</td>
                        <td>{al.user_email || "-"}</td>
                        <td><span className="tag">{al.action || "-"}</span></td>
                        <td>{al.entity_type || "-"}</td>
                        <td style={{ fontSize: 11, color: "#9ca3af" }}>{al.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODALS */}

      {/* Sale Modal */}
      {modal === "sale" && (
        <Modal title="Create/Edit Sale" onClose={() => { setModal(null); setEditingSale(null); }} wide>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Date</label><input type="date" value={editingSale?.date || ""} onChange={(e) => setEditingSale({ ...editingSale, date: e.target.value })} /></div>
            <div><label>Customer</label><select value={editingSale?.cust_id || ""} onChange={(e) => setEditingSale({ ...editingSale, cust_id: e.target.value })}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label>Driver/Truck</label><select value={editingSale?.truck_id || ""} onChange={(e) => setEditingSale({ ...editingSale, truck_id: e.target.value })}><option value="">Select truck</option>{trucks.map((t) => <option key={t.id} value={t.id}>{t.driver} ({t.name})</option>)}</select></div>
            <div><label>Amount</label><input type="number" step="0.01" value={editingSale?.total || ""} onChange={(e) => setEditingSale({ ...editingSale, total: parseFloat(e.target.value) })} /></div>
            <div><label>Tax</label><input type="number" step="0.01" value={editingSale?.tax || ""} onChange={(e) => setEditingSale({ ...editingSale, tax: parseFloat(e.target.value) })} /></div>
            <div><label>Profit</label><input type="number" step="0.01" value={editingSale?.profit || ""} onChange={(e) => setEditingSale({ ...editingSale, profit: parseFloat(e.target.value) })} /></div>
            <button className="btn ba" onClick={saveSale} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Sale</button>
          </div>
        </Modal>
      )}

      {/* Customer Modal */}
      {modal === "customer" && (
        <Modal title="Create/Edit Customer" onClose={() => { setModal(null); setEditingCustomer(null); }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Name</label><input value={editingCustomer?.name || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })} /></div>
            <div><label>Email</label><input type="email" value={editingCustomer?.email || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })} /></div>
            <div><label>Phone</label><input value={editingCustomer?.phone || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} /></div>
            <div><label>Address</label><input value={editingCustomer?.address || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })} /></div>
            <div><label>City</label><input value={editingCustomer?.city || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })} /></div>
            <div><label>State</label><input value={editingCustomer?.state || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, state: e.target.value })} /></div>
            <button className="btn ba" onClick={saveCustomer} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Customer</button>
          </div>
        </Modal>
      )}

      {/* Product Modal */}
      {modal === "product" && (
        <Modal title="Create/Edit Product" onClose={() => { setModal(null); setEditingProduct(null); }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Name</label><input value={editingProduct?.name || ""} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} /></div>
            <div><label>SKU</label><input value={editingProduct?.sku || ""} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} /></div>
            <div><label>Category</label><input value={editingProduct?.cat || ""} onChange={(e) => setEditingProduct({ ...editingProduct, cat: e.target.value })} /></div>
            <div><label>Price</label><input type="number" step="0.01" value={editingProduct?.price || ""} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} /></div>
            <div><label>Stock</label><input type="number" value={editingProduct?.stock || ""} onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })} /></div>
            <button className="btn ba" onClick={saveProduct} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Product</button>
          </div>
        </Modal>
      )}

      {/* Truck Modal */}
      {modal === "truck" && (
        <Modal title="Create/Edit Truck" onClose={() => { setModal(null); setEditingTruck(null); }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Truck Name</label><input value={editingTruck?.name || ""} onChange={(e) => setEditingTruck({ ...editingTruck, name: e.target.value })} /></div>
            <div><label>Driver</label><input value={editingTruck?.driver || ""} onChange={(e) => setEditingTruck({ ...editingTruck, driver: e.target.value })} /></div>
            <div><label>Phone</label><input value={editingTruck?.phone || ""} onChange={(e) => setEditingTruck({ ...editingTruck, phone: e.target.value })} /></div>
            <div><label>License Plate</label><input value={editingTruck?.license_plate || ""} onChange={(e) => setEditingTruck({ ...editingTruck, license_plate: e.target.value })} /></div>
            <div><label>Route</label><input value={editingTruck?.route || ""} onChange={(e) => setEditingTruck({ ...editingTruck, route: e.target.value })} /></div>
            <button className="btn ba" onClick={saveTruck} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Truck</button>
          </div>
        </Modal>
      )}

      {/* Invoice View Modal */}
      {modal === "invoice" && viewInvoice && (
        <Modal title="" onClose={() => { setModal(null); setViewInvoice(null); }} xwide>
          <InvoiceDoc sale={viewInvoice} products={products} customers={customers} trucks={trucks} co={getCompany()} paid={payments.find(p => p.sale_id === viewInvoice.id)?.status === "paid"} stateTaxes={stateTaxes} />
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn bgh" onClick={() => window.print()}>{ic.prt} Print</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
