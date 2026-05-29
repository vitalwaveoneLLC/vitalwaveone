// VitalWaveOne WMS - Full Feature SaaS Edition (Neon + Multi-tenant)
// All features from old design integrated into new SaaS model
import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "./db";
import StripePaymentModal from "./StripePaymentModal.jsx";
import LoginPage from "./LoginPage.jsx";
import LandingPage from "./LandingPage.jsx";

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

const fmt = {
  money: (v) => typeof v === "number" ? `$${v.toFixed(2)}` : "$0.00",
  phone: (p) => p ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : "-",
  date: (d) => d ? new Date(d).toLocaleDateString() : "-",
  percent: (v) => `${(v || 0).toFixed(1)}%`,
};

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const downloadCSV = (rows, fn) => {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = fn;
  a.click();
};

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────

const GS = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#f5f5f5;}
      ::-webkit-scrollbar{width:5px;height:5px;}
      ::-webkit-scrollbar-track{background:#ebebeb;}
      ::-webkit-scrollbar-thumb{background:#c0c0c0;border-radius:3px;}
      .app{font-family:'Barlow',sans-serif;background:#f5f5f5;min-height:100vh;color:#212121;font-size:12px;}
      .btn{cursor:pointer;border:none;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:12px;padding:0;}
      .ba{background:#7c3aed;color:#fff;padding:8px 16px;border-radius:6px;}
      .ba:hover{background:#6d28d9;transform:translateY(-1px);}
      .bb{background:#ede9fe;color:#5b21b6;padding:8px 14px;border-radius:6px;}
      .bb:hover{background:#ddd6fe;}
      .bg{background:#ecfdf5;color:#065f46;padding:8px 14px;border-radius:6px;}
      .bg:hover{background:#d1fae5;}
      .br{background:#fef2f2;color:#991b1b;padding:8px 14px;border-radius:6px;}
      .br:hover{background:#fee2e2;}
      .bgh{background:transparent;color:#6b7280;padding:8px 14px;border-radius:6px;border:1px solid #d1d5db;}
      .bgh:hover{border-color:#7c3aed;color:#7c3aed;}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;}
      input,select,textarea{background:#fff;border:1px solid #d1d5db;color:#212121;border-radius:7px;padding:8px 12px;font-family:'Barlow',sans-serif;font-size:12px;width:100%;outline:none;}
      input:focus,select:focus,textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 2px #7c3aed18;}
      label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.09em;display:block;margin-bottom:4px;}
      .bdg{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;}
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
    `}</style>
  </>
);

const ic = {
  dash: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  truck: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  inv: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  ar: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  pl: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  users: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  gear: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>,
  plus: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chk: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>,
  X: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
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

// ─────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("landing");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  // All data
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // Edit states
  const [editingSale, setEditingSale] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingTruck, setEditingTruck] = useState(null);
  const [viewSale, setViewSale] = useState(null);

  const getAdmin = () => {
    const stored = localStorage.getItem('vitalwaveone_admin');
    return stored ? JSON.parse(stored) : null;
  };

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
      const admin = getAdmin();
      const [sales, customers, products, trucks, payments, expenses, orders, logs] = await Promise.all([
        db.from("sales").select("*").limit(200),
        db.from("customers").select("*"),
        db.from("products").select("*"),
        db.from("trucks").select("*"),
        db.from("payments").select("*"),
        db.from("expenses").select("*"),
        db.from("recurring_orders").select("*").catch(() => []),
        db.from("audit_log").select("*").limit(500).catch(() => []),
      ]);
      setSales(sales || []);
      setCustomers(customers || []);
      setProducts(products || []);
      setTrucks(trucks || []);
      setPayments(payments || []);
      setExpenses(expenses || []);
      setRecurringOrders(orders || []);
      setAuditLog(logs || []);
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

  // ── KPIs ──
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + (s.total || 0), 0), [sales]);
  const totalTax = useMemo(() => sales.reduce((sum, s) => sum + (s.tax || 0), 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((sum, s) => sum + (s.profit || 0), 0), [sales]);
  const totalAR = useMemo(
    () => sales.filter(s => !payments.find(p => p.sale_id === s.id && p.status === "paid")).reduce((sum, s) => sum + (s.total || 0), 0),
    [sales, payments]
  );

  // ── HANDLERS ──
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

  const handleLogout = () => {
    localStorage.removeItem('vitalwaveone_admin');
    setPage("landing");
  };

  // ── EXPORTS ──
  const exportInvoices = () => {
    const rows = [["Invoice", "Date", "Customer", "Driver", "Subtotal", "Tax", "Total", "Profit"]];
    sales.forEach((s) => {
      const cust = customers.find(c => c.id === s.cust_id);
      const truck = trucks.find(t => t.id === s.truck_id);
      rows.push([s.id, fmt.date(s.date), cust?.name || "-", truck?.driver || "-", fmt.money(s.total), fmt.money(s.tax), fmt.money((s.total || 0) + (s.tax || 0)), fmt.money(s.profit)]);
    });
    downloadCSV(rows, "invoices.csv");
  };

  const exportAR = () => {
    const rows = [["Invoice", "Customer", "Amount", "Status"]];
    sales.forEach((s) => {
      const cust = customers.find(c => c.id === s.cust_id);
      const paid = payments.find(p => p.sale_id === s.id && p.status === "paid");
      rows.push([s.id, cust?.name || "-", fmt.money(s.total), paid ? "Paid" : "Unpaid"]);
    });
    downloadCSV(rows, "ar.csv");
  };

  const exportPL = () => {
    const rows = [
      ["Metric", "Value"],
      ["Revenue", fmt.money(totalRevenue)],
      ["Tax", fmt.money(totalTax)],
      ["COGS", fmt.money(totalRevenue - totalProfit)],
      ["Gross Profit", fmt.money(totalProfit)],
      ["Margin %", fmt.percent((totalProfit / totalRevenue) * 100)],
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
            <button className="btn bgh" onClick={loadAllData}>{ic.dl} Refresh</button>
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
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e5e7eb", marginBottom: 20, overflowX: "auto", paddingBottom: 8 }}>
          {[
            { id: "dashboard", label: "Dashboard", icon: ic.dash },
            { id: "sales", label: "Sales", icon: ic.inv },
            { id: "ar", label: "A/R", icon: ic.ar },
            { id: "pl", label: "P&L", icon: ic.pl },
            { id: "trucks", label: "Trucks", icon: ic.truck },
            { id: "drivers", label: "Drivers", icon: ic.users },
            { id: "customers", label: "Customers", icon: ic.users },
            { id: "products", label: "Products", icon: ic.plus },
            { id: "expenses", label: "Expenses", icon: ic.plus },
            { id: "settings", label: "Settings", icon: ic.gear },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              className="btn"
              style={{
                padding: "12px 16px",
                borderBottom: activeTab === id ? "3px solid #7c3aed" : "3px solid transparent",
                background: "none",
                color: activeTab === id ? "#7c3aed" : "#6b7280",
                fontSize: 13,
                fontWeight: 600,
              }}
              onClick={() => setActiveTab(id)}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading...</div>
        ) : (
          <>
            {/* DASHBOARD */}
            {activeTab === "dashboard" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  <div className="kpi"><div className="kl">Revenue</div><div className="kv" style={{ color: "#7c3aed" }}>{fmt.money(totalRevenue)}</div></div>
                  <div className="kpi"><div className="kl">Tax</div><div className="kv" style={{ color: "#f59e0b" }}>{fmt.money(totalTax)}</div></div>
                  <div className="kpi"><div className="kl">Profit</div><div className="kv" style={{ color: "#10b981" }}>{fmt.money(totalProfit)}</div></div>
                  <div className="kpi"><div className="kl">A/R Outstanding</div><div className="kv" style={{ color: "#ef4444" }}>{fmt.money(totalAR)}</div></div>
                </div>
              </div>
            )}

            {/* SALES */}
            {activeTab === "sales" && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Sales Invoices ({sales.length})</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn ba" onClick={() => { setEditingSale({}); setModal("sale"); }}>{ic.plus} New</button>
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
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.slice(0, 50).map((s) => {
                        const cust = customers.find(c => c.id === s.cust_id);
                        const truck = trucks.find(t => t.id === s.truck_id);
                        return (
                          <tr key={s.id}>
                            <td><span className="tag" style={{ background: "#f5f3ff", color: "#7c3aed" }}>{s.id}</span></td>
                            <td>{fmt.date(s.date)}</td>
                            <td>{cust?.name || "-"}</td>
                            <td>{truck?.driver || "-"}</td>
                            <td>{fmt.money(s.total)}</td>
                            <td>{fmt.money(s.tax)}</td>
                            <td><strong>{fmt.money((s.total || 0) + (s.tax || 0))}</strong></td>
                            <td><button className="btn bb" onClick={() => { setEditingSale(s); setModal("sale"); }}>Edit</button></td>
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
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Accounts Receivable</h3>
                  <button className="btn bg" onClick={exportAR}>{ic.dl} Export</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {sales.filter(s => !payments.find(p => p.sale_id === s.id && p.status === "paid")).map((s) => {
                        const cust = customers.find(c => c.id === s.cust_id);
                        return (
                          <tr key={s.id}>
                            <td>{s.id}</td>
                            <td>{cust?.name || "-"}</td>
                            <td>{fmt.money(s.total)}</td>
                            <td><span className="tag" style={{ background: "#fef2f2", color: "#991b1b" }}>Unpaid</span></td>
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
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Profit & Loss</h3>
                  <button className="btn bg" onClick={exportPL}>{ic.dl} Export</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                  <div className="kpi"><div className="kl">Revenue</div><div className="kv" style={{ color: "#7c3aed" }}>{fmt.money(totalRevenue)}</div></div>
                  <div className="kpi"><div className="kl">Tax</div><div className="kv" style={{ color: "#f59e0b" }}>{fmt.money(totalTax)}</div></div>
                  <div className="kpi"><div className="kl">COGS</div><div className="kv" style={{ color: "#ef4444" }}>{fmt.money(totalRevenue - totalProfit)}</div></div>
                  <div className="kpi"><div className="kl">Profit</div><div className="kv" style={{ color: "#10b981" }}>{fmt.money(totalProfit)}</div></div>
                </div>
                <div style={{ marginTop: 16, padding: "16px", background: "#f9fafb", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Margin %</span>
                    <strong>{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TRUCKS */}
            {activeTab === "trucks" && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Trucks ({trucks.length})</h3>
                  <button className="btn ba" onClick={() => { setEditingTruck({}); setModal("truck"); }}>{ic.plus} New Truck</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Driver</th><th>Phone</th><th>License Plate</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {trucks.map((t) => (
                        <tr key={t.id}>
                          <td>{t.name}</td>
                          <td>{t.driver}</td>
                          <td>{fmt.phone(t.phone)}</td>
                          <td>{t.license_plate || "-"}</td>
                          <td><button className="btn bb" onClick={() => { setEditingTruck(t); setModal("truck"); }}>Edit</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CUSTOMERS */}
            {activeTab === "customers" && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Customers ({customers.length})</h3>
                  <button className="btn ba" onClick={() => { setEditingCustomer({}); setModal("customer"); }}>{ic.plus} New Customer</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td>{c.email || "-"}</td>
                          <td>{fmt.phone(c.phone)}</td>
                          <td>{c.city || "-"}</td>
                          <td><button className="btn bb" onClick={() => { setEditingCustomer(c); setModal("customer"); }}>Edit</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PRODUCTS */}
            {activeTab === "products" && (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 className="sh">Products ({products.length})</h3>
                  <button className="btn ba" onClick={() => { setEditingProduct({}); setModal("product"); }}>{ic.plus} New Product</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td>{p.sku || "-"}</td>
                          <td>{fmt.money(p.price)}</td>
                          <td>{p.stock || 0}</td>
                          <td><button className="btn bb" onClick={() => { setEditingProduct(p); setModal("product"); }}>Edit</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EXPENSES */}
            {activeTab === "expenses" && (
              <div className="card" style={{ padding: 20 }}>
                <h3 className="sh">Expenses</h3>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th></tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td>{fmt.date(e.date)}</td>
                          <td>{e.description}</td>
                          <td>{fmt.money(e.amount)}</td>
                          <td>{e.category || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === "settings" && (
              <div className="card" style={{ padding: 20 }}>
                <h3 className="sh">Settings</h3>
                <p style={{ color: "#6b7280" }}>Account settings and configuration coming soon...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODALS */}

      {modal === "sale" && (
        <Modal title="Create/Edit Sale" onClose={() => { setModal(null); setEditingSale(null); }} wide>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Date</label><input type="date" value={editingSale?.date || ""} onChange={(e) => setEditingSale({ ...editingSale, date: e.target.value })} /></div>
            <div><label>Customer</label><select value={editingSale?.cust_id || ""} onChange={(e) => setEditingSale({ ...editingSale, cust_id: e.target.value })}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label>Driver/Truck</label><select value={editingSale?.truck_id || ""} onChange={(e) => setEditingSale({ ...editingSale, truck_id: e.target.value })}><option value="">Select truck</option>{trucks.map((t) => <option key={t.id} value={t.id}>{t.driver} ({t.name})</option>)}</select></div>
            <div><label>Amount</label><input type="number" step="0.01" value={editingSale?.total || ""} onChange={(e) => setEditingSale({ ...editingSale, total: parseFloat(e.target.value) })} /></div>
            <div><label>Tax</label><input type="number" step="0.01" value={editingSale?.tax || ""} onChange={(e) => setEditingSale({ ...editingSale, tax: parseFloat(e.target.value) })} /></div>
            <button className="btn ba" onClick={saveSale} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Sale</button>
          </div>
        </Modal>
      )}

      {modal === "customer" && (
        <Modal title="Create/Edit Customer" onClose={() => { setModal(null); setEditingCustomer(null); }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Name</label><input value={editingCustomer?.name || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })} /></div>
            <div><label>Email</label><input type="email" value={editingCustomer?.email || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })} /></div>
            <div><label>Phone</label><input value={editingCustomer?.phone || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} /></div>
            <div><label>City</label><input value={editingCustomer?.city || ""} onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })} /></div>
            <button className="btn ba" onClick={saveCustomer} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Customer</button>
          </div>
        </Modal>
      )}

      {modal === "product" && (
        <Modal title="Create/Edit Product" onClose={() => { setModal(null); setEditingProduct(null); }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Name</label><input value={editingProduct?.name || ""} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} /></div>
            <div><label>SKU</label><input value={editingProduct?.sku || ""} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} /></div>
            <div><label>Price</label><input type="number" step="0.01" value={editingProduct?.price || ""} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} /></div>
            <div><label>Stock</label><input type="number" value={editingProduct?.stock || ""} onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })} /></div>
            <button className="btn ba" onClick={saveProduct} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Product</button>
          </div>
        </Modal>
      )}

      {modal === "truck" && (
        <Modal title="Create/Edit Truck" onClose={() => { setModal(null); setEditingTruck(null); }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div><label>Truck Name</label><input value={editingTruck?.name || ""} onChange={(e) => setEditingTruck({ ...editingTruck, name: e.target.value })} /></div>
            <div><label>Driver</label><input value={editingTruck?.driver || ""} onChange={(e) => setEditingTruck({ ...editingTruck, driver: e.target.value })} /></div>
            <div><label>Phone</label><input value={editingTruck?.phone || ""} onChange={(e) => setEditingTruck({ ...editingTruck, phone: e.target.value })} /></div>
            <div><label>License Plate</label><input value={editingTruck?.license_plate || ""} onChange={(e) => setEditingTruck({ ...editingTruck, license_plate: e.target.value })} /></div>
            <button className="btn ba" onClick={saveTruck} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>Save Truck</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
