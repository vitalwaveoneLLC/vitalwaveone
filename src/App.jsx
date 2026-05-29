// VitalWaveOne WMS - Fresh Clean Build
// No Supabase - using Vercel Functions + Neon PostgreSQL via db.js abstraction

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { db } from "./db";
import StripePaymentModal from "./StripePaymentModal.jsx";
import LoginPage from "./LoginPage.jsx";

// ───────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES & THEMES
// ───────────────────────────────────────────────────────────────────────────

const GS = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #f5f5f5; font-family: 'Inter', system-ui, sans-serif; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: #f0f0f0; }
      ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

      .app { font-family: 'Inter', system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; color: #111; font-size: 13px; }
      .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
      .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 16px; }
      .btn { cursor: pointer; border: 1px solid #e5e5e5; background: #fff; color: #111; font-family: 'Inter', sans-serif; font-weight: 500; padding: 6px 12px; border-radius: 7px; font-size: 12px; display: inline-flex; align-items: center; gap: 5px; transition: all .15s; }
      .btn:hover { background: #f5f5f5; border-color: #bbb; }
      .btn:disabled { opacity: .4; cursor: not-allowed; }
      .btn-primary { background: #7c3aed; color: #fff; border-color: #7c3aed; }
      .btn-primary:hover { background: #6d28d9; border-color: #6d28d9; }
      .btn-success { background: #10b981; color: #fff; border-color: #10b981; }
      .btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }

      input, select, textarea { background: #fff; border: 1px solid #e5e5e5; color: #111; border-radius: 7px; padding: 8px 12px; font-family: 'Inter', sans-serif; font-size: 13px; width: 100%; outline: none; }
      input:focus, select:focus, textarea:focus { border-color: #7c3aed; }

      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { text-align: left; padding: 9px 13px; font-size: 11px; color: #666; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; border-bottom: 1px solid #e5e5e5; background: #fafafa; }
      td { padding: 9px 13px; font-size: 13px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; color: #111; }

      .modal { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; }
      .modal-content { background: #fff; border: 1px solid #e5e5e5; border-radius: 14px; padding: 24px; max-width: 620px; width: 100%; max-height: 92vh; overflow-y: auto; }

      .tabs { display: flex; gap: 2px; border-bottom: 1px solid #e5e5e5; margin-bottom: 20px; }
      .tab-btn { padding: 12px 16px; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #666; font-weight: 500; font-size: 13px; transition: all .15s; }
      .tab-btn.active { color: #7c3aed; border-bottom-color: #7c3aed; }

      .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
      .badge-success { background: #d1fae5; color: #065f46; }
      .badge-warning { background: #fef3c7; color: #92400e; }
      .badge-danger { background: #fee2e2; color: #991b1b; }

      .spinner { display: inline-block; animation: spin .8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  </>
);

// ───────────────────────────────────────────────────────────────────────────
// ICONS
// ───────────────────────────────────────────────────────────────────────────

const ic = {
  menu: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  plus: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94M21 7.04a2.25 2.25 0 00-3.18-3.18L3 16.89v3.75h3.75L21 7.04z"/></svg>,
  trash: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  download: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

// ───────────────────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ───────────────────────────────────────────────────────────────────────────

const Spinner = ({ msg = "" }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 60, color: "#9ca3af", fontFamily: "'Inter',system-ui,sans-serif", fontSize: 14 }}>
    <svg className="spinner" width="18" height="18" fill="none" stroke="#7c3aed" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
    {msg || "Loading..."}
  </div>
);

const Empty = ({ icon, msg }) => (
  <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af" }}>
    <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 13, letterSpacing: ".05em" }}>{msg}</div>
  </div>
);

// ───────────────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ───────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("info");
  const [stripeModal, setStripeModal] = useState(null);

  // ─ Check auth on mount
  useEffect(() => {
    const adminStored = localStorage.getItem('vitalwaveone_admin');
    if (adminStored && JSON.parse(adminStored).expires > Date.now()) {
      loadData();
    } else {
      setLoading(false); // Not logged in
    }
  }, []);

  // ─ Toast helper
  const showToast = (msg, type = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // ─ Load all data from backend
  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, customersRes, productsRes, trucksRes, paymentsRes] = await Promise.all([
        db.from("sales").select("*").limit(100),
        db.from("customers").select("*"),
        db.from("products").select("*"),
        db.from("trucks").select("*"),
        db.from("payments").select("*").limit(50),
      ]);

      if (salesRes.data) setSales(salesRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (trucksRes.data) setTrucks(trucksRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
    } catch (e) {
      showToast(`Load error: ${e.message}`, "error");
    }
    setLoading(false);
  };

  // ─ Formatters
  const fmt = {
    phone: (p) => p ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : "-",
    money: (v) => typeof v === "number" ? `$${v.toFixed(2)}` : "-",
    date: (d) => d ? new Date(d).toLocaleDateString() : "-",
  };

  // Check if authenticated
  const adminStored = typeof window !== 'undefined' ? localStorage.getItem('vitalwaveone_admin') : null;
  const isAuthenticated = adminStored && JSON.parse(adminStored).expires > Date.now();

  // Show login if not authenticated
  if (!isAuthenticated && !loading) {
    return <LoginPage onBack={() => {}} />;
  }

  return (
    <div className="app">
      <GS />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "12px 20px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>VitalWaveOne WMS</h1>
          <button className="btn" onClick={loadData}>{ic.download} Refresh</button>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toastType === "error" ? "#fee2e2" : "#d1fae5",
          color: toastType === "error" ? "#991b1b" : "#065f46",
          padding: "12px 16px", borderRadius: 8, border: toastType === "error" ? "1px solid #fecaca" : "1px solid #a7f3d0",
          animation: "slideIn .2s ease"
        }}>
          {toastMsg}
        </div>
      )}

      <div className="container">
        {/* Tabs */}
        <div className="tabs">
          <button className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`tab-btn ${activeTab === "sales" ? "active" : ""}`} onClick={() => setActiveTab("sales")}>Sales</button>
          <button className={`tab-btn ${activeTab === "customers" ? "active" : ""}`} onClick={() => setActiveTab("customers")}>Customers</button>
          <button className={`tab-btn ${activeTab === "products" ? "active" : ""}`} onClick={() => setActiveTab("products")}>Products</button>
          <button className={`tab-btn ${activeTab === "trucks" ? "active" : ""}`} onClick={() => setActiveTab("trucks")}>Trucks</button>
          <button className={`tab-btn ${activeTab === "payments" ? "active" : ""}`} onClick={() => setActiveTab("payments")}>Payments</button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <Spinner msg="Loading data..." />
        ) : (
          <>
            {activeTab === "dashboard" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
                <div className="card">
                  <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Total Sales</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>{fmt.money(sales.reduce((sum, s) => sum + (s.total || 0), 0))}</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Total Payments</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{fmt.money(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Customers</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{customers.length}</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Trucks</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{trucks.length}</div>
                </div>
              </div>
            )}

            {activeTab === "sales" && (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Sales</h3>
                {sales.length === 0 ? (
                  <Empty icon="📊" msg="No sales yet" />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Truck</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.slice(0, 20).map(s => (
                          <tr key={s.id}>
                            <td><code>{s.id}</code></td>
                            <td>{customers.find(c => c.id === s.cust_id)?.name || "-"}</td>
                            <td>{trucks.find(t => t.id === s.truck_id)?.name || "-"}</td>
                            <td>{fmt.money(s.total)}</td>
                            <td>{fmt.date(s.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "customers" && (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Customers</h3>
                {customers.length === 0 ? (
                  <Empty icon="👥" msg="No customers yet" />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>City</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.slice(0, 20).map(c => (
                          <tr key={c.id}>
                            <td>{c.name}</td>
                            <td>{fmt.phone(c.phone)}</td>
                            <td>{c.email || "-"}</td>
                            <td>{c.city || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "products" && (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Products</h3>
                {products.length === 0 ? (
                  <Empty icon="📦" msg="No products yet" />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>SKU</th>
                          <th>Price</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.slice(0, 20).map(p => (
                          <tr key={p.id}>
                            <td>{p.name}</td>
                            <td><code>{p.sku || "-"}</code></td>
                            <td>{fmt.money(p.price)}</td>
                            <td>{p.stock || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "trucks" && (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Trucks</h3>
                {trucks.length === 0 ? (
                  <Empty icon="🚚" msg="No trucks yet" />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Driver</th>
                          <th>Plate</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trucks.slice(0, 20).map(t => (
                          <tr key={t.id}>
                            <td>{t.name}</td>
                            <td>{t.driver || "-"}</td>
                            <td>{t.plate || "-"}</td>
                            <td><span className={`badge badge-${t.active ? "success" : "warning"}`}>{t.active ? "Active" : "Inactive"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Payments</h3>
                {payments.length === 0 ? (
                  <Empty icon="💳" msg="No payments yet" />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.slice(0, 20).map(p => (
                          <tr key={p.id}>
                            <td><code>{p.id}</code></td>
                            <td>{fmt.money(p.amount)}</td>
                            <td>{p.method || "-"}</td>
                            <td>{fmt.date(p.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Stripe Payment Modal */}
      {stripeModal && (
        <StripePaymentModal
          sale={stripeModal.sale}
          customer={stripeModal.customer}
          driver={stripeModal.driver}
          saleTax={0}
          onClose={() => setStripeModal(null)}
          onSuccess={(pd) => {
            showToast(`💳 $${pd.amount.toFixed(2)} payment successful!`);
            setStripeModal(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
