// VitalWaveOne WMS - Modern SaaS Edition
// FREE OpenStreetMap + Leaflet + Real-time GPS Tracking + Clean Minimalist Design

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./db";
import StripePaymentModal from "./StripePaymentModal.jsx";
import LoginPage from "./LoginPage.jsx";
import LandingPage from "./LandingPage.jsx";

// ────────────────────────────────────────────────────────────
// MODERN STYLING
// ────────────────────────────────────────────────────────────

const GlobalStyles = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" rel="stylesheet"/>
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        color: #1a202c;
        min-height: 100vh;
      }

      .app-container {
        background: #f8fafc;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .app-header {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.5);
        padding: 16px 24px;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .app-header h1 {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.3px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .app-content {
        flex: 1;
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
      }

      .tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        border-bottom: 2px solid #e2e8f0;
        overflow-x: auto;
        padding-bottom: 0;
      }

      .tab {
        padding: 12px 16px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        color: #94a3b8;
        border-bottom: 3px solid transparent;
        margin-bottom: -2px;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .tab.active {
        color: #667eea;
        border-bottom-color: #667eea;
      }

      .tab:hover {
        color: #475569;
      }

      .card {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.08);
        transition: all 0.3s ease;
        margin-bottom: 16px;
      }

      .card:hover {
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 12px 48px rgba(31, 38, 135, 0.12);
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .kpi-card {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: 14px;
        padding: 20px;
        text-align: center;
      }

      .kpi-value {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
        margin: 8px 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .kpi-label {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .btn {
        cursor: pointer;
        border: none;
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        font-size: 13px;
        padding: 10px 16px;
        border-radius: 10px;
        background: #f0f4f8;
        color: #475569;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn:hover {
        background: #e2e8f0;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      }

      .btn-primary:hover {
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }

      .btn-success {
        background: #10b981;
        color: white;
        border: none;
      }

      .btn-danger {
        background: #ef4444;
        color: white;
        border: none;
      }

      input, select, textarea {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #1a202c;
        border-radius: 10px;
        padding: 10px 14px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        width: 100%;
        outline: none;
        transition: all 0.2s ease;
      }

      input:focus, select:focus, textarea:focus {
        border-color: #667eea;
        background: white;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      label {
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: block;
        margin-bottom: 6px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th {
        text-align: left;
        padding: 12px 16px;
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
        border-bottom: 2px solid #e2e8f0;
        background: #f8fafc;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      td {
        padding: 12px 16px;
        font-size: 13px;
        border-bottom: 1px solid #e2e8f0;
        color: #334155;
      }

      tbody tr:hover {
        background: #f1f5f9;
      }

      .modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 300;
        padding: 16px;
        backdrop-filter: blur(4px);
      }

      .modal-content {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 20px;
        padding: 28px;
        max-width: 640px;
        width: 100%;
        max-height: 92vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      }

      .modal-content.wide {
        max-width: 900px;
      }

      .tag {
        display: inline-flex;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }

      .tag-success {
        background: #d1fae5;
        color: #065f46;
      }

      .tag-warning {
        background: #fef3c7;
        color: #854d0e;
      }

      .map-container {
        width: 100%;
        height: 600px;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
        margin-bottom: 24px;
      }

      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 14px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        z-index: 999;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .form-group {
        margin-bottom: 16px;
      }

      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .leaflet-container {
        font-family: 'Inter', sans-serif;
        background: #e0f2fe;
      }

      .leaflet-popup-content {
        font-family: 'Inter', sans-serif;
        margin: 0 !important;
        padding: 0 !important;
      }

      .leaflet-popup-content > div {
        padding: 8px 12px !important;
      }

      @media (max-width: 768px) {
        .app-content {
          padding: 16px;
        }

        .two-col {
          grid-template-columns: 1fr;
        }

        .map-container {
          height: 400px;
        }
      }
    `}</style>
  </>
);

const Icons = {
  map: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 19.08 6.24 19.08 17.76 12 22 4.92 17.76 4.92 6.24 12 2"/><line x1="12" y1="2" x2="12" y2="22"/></svg>,
  truck: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  download: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

// ────────────────────────────────────────────────────────────
// MAP COMPONENT
// ────────────────────────────────────────────────────────────

const MapView = ({ trucks, customers }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // Center on first customer or USA
      const centerLat = customers[0]?.latitude || 39.8283;
      const centerLng = customers[0]?.longitude || -98.5795;

      // Initialize map
      const map = L.map(mapRef.current).setView([centerLat, centerLng], 5);

      // Add FREE OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(map);

      // Add truck markers (red with live indicator)
      trucks.forEach((truck) => {
        if (truck.latitude && truck.longitude) {
          const popupHTML = `
            <div style="font-size: 12px; font-family: Inter, sans-serif;">
              <strong>🚚 ${truck.driver}</strong><br/>
              ${truck.name}<br/>
              <span style="color: #10b981; font-weight: 600;">● Live</span>
            </div>
          `;

          L.circleMarker([truck.latitude, truck.longitude], {
            radius: 8,
            fillColor: '#ef4444',
            color: '#991b1b',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          })
            .bindPopup(popupHTML)
            .addTo(map);
        }
      });

      // Add customer markers (blue pins)
      customers.forEach((customer) => {
        if (customer.latitude && customer.longitude) {
          const popupHTML = `
            <div style="font-size: 12px; font-family: Inter, sans-serif;">
              <strong>📍 ${customer.name}</strong><br/>
              ${customer.city || 'N/A'}, ${customer.state || 'N/A'}<br/>
              <a href="tel:${customer.phone}">${customer.phone || 'N/A'}</a>
            </div>
          `;

          L.marker([customer.latitude, customer.longitude])
            .bindPopup(popupHTML)
            .addTo(map);
        }
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [trucks, customers]);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
        🗺️ Live Truck Tracking - FREE (OpenStreetMap)
      </h3>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: 600,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1)',
          marginBottom: 24,
          background: '#f0f9ff'
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
        <div>
          <label>Active Trucks: {trucks.length}</label>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 6, fontSize: 12 }}>
            {trucks.length === 0 ? (
              <span style={{ color: '#94a3b8' }}>No trucks assigned</span>
            ) : (
              trucks.slice(0, 5).map((t, i) => (
                <div key={i} style={{ color: '#475569', paddingBottom: 6 }}>
                  🚚 {t.driver} - {t.name} <span style={{ color: '#10b981', fontWeight: 600 }}>● Live</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <label>Customer Locations: {customers.length}</label>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 6, fontSize: 12 }}>
            {customers.length === 0 ? (
              <span style={{ color: '#94a3b8' }}>No customers</span>
            ) : (
              customers.slice(0, 5).map((c, i) => (
                <div key={i} style={{ color: '#475569', paddingBottom: 6 }}>
                  📍 {c.name} - {c.city || 'N/A'}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// TRUCK MANAGEMENT TAB
// ────────────────────────────────────────────────────────────

const TruckManagementTab = ({ trucks, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: null, driver: "", name: "", phone: "", status: "active" });

  const handleSave = async () => {
    if (!form.driver || !form.name) return alert("Fill required fields");
    await onSave(form);
    setForm({ id: null, driver: "", name: "", phone: "", status: "active" });
    setShowModal(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          {Icons.plus} Add Truck
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Truck Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((t) => (
              <tr key={t.id}>
                <td>{t.driver}</td>
                <td>{t.name}</td>
                <td>{t.phone}</td>
                <td><span className="tag tag-success">Active</span></td>
                <td>
                  <button className="btn" onClick={() => setForm(t)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => onDelete(t.id)} style={{ marginLeft: 4 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content">
            <h2 style={{ marginBottom: 16 }}>Add Truck</h2>
            <div className="form-group">
              <label>Driver Name</label>
              <input value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Truck Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={handleSave} style={{ width: "100%" }}>Save Truck</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// MAIN APP
// ────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("landing"); // landing | login | dashboard
  const [tab, setTab] = useState("dashboard");
  const [auth, setAuth] = useState(null);
  const [data, setData] = useState({ sales: [], customers: [], trucks: [], products: [] });
  const [toast, setToast] = useState("");

  useEffect(() => {
    // Check auth on mount
    if (!window.localStorage) return;

    try {
      const session = localStorage.getItem("vitalwaveone_admin");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.expires > Date.now()) {
          setAuth(parsed);
          setPage("dashboard");
          loadData(parsed.tenant_id);
        } else {
          localStorage.removeItem("vitalwaveone_admin");
          setPage("login");
        }
      } else {
        setPage("landing");
      }
    } catch (e) {
      console.error("Auth error:", e);
      setPage("landing");
    }
  }, []);

  const loadData = async (tenantId) => {
    try {
      // For now, load empty data - in production connect to API
      // Example: const trucks = await fetch('/api/trucks?tenant_id=' + tenantId);
      setData({
        sales: [],
        customers: [],
        trucks: [],
        products: [],
      });
    } catch (e) {
      console.error("Load error:", e);
      // Still set empty data so dashboard loads
      setData({
        sales: [],
        customers: [],
        trucks: [],
        products: [],
      });
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Show landing while checking auth
  if (!page || page === "landing") return <LandingPage onSignIn={() => setPage("login")} />;
  if (page === "login") return <LoginPage onBack={() => setPage("landing")} />;

  // Dashboard requires auth
  if (!auth) return <div style={{ padding: 20, textAlign: "center" }}>Loading...</div>;

  const kpis = useMemo(() => ({
    totalRevenue: data.sales.reduce((sum, s) => sum + (s.total || 0), 0),
    totalAR: data.sales.filter(s => !s.paid).reduce((sum, s) => sum + (s.total || 0), 0),
    activeCustomers: data.customers.length,
    activeTrucks: data.trucks.length,
  }), [data]);

  return (
    <div className="app-container">
      <GlobalStyles />

      <div className="app-header">
        <h1>🚚 VitalWaveOne WMS</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>{auth?.name}</span>
          <button className="btn" onClick={() => {
            localStorage.removeItem("vitalwaveone_admin");
            setPage("landing");
          }}>
            {Icons.logout}
          </button>
        </div>
      </div>

      <div className="app-content">
        <div className="tabs">
          {[
            ["dashboard", "📊 Dashboard"],
            ["trucks", "🚚 Truck Management"],
            ["customers", "👥 Customers"],
            ["sales", "💰 Sales"],
            ["map", "🗺️ Live Map"],
          ].map(([key, label]) => (
            <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <div>
            <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>Dashboard</h2>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Total Revenue</div>
                <div className="kpi-value">${(kpis.totalRevenue / 1000).toFixed(1)}K</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Accounts Receivable</div>
                <div className="kpi-value">${(kpis.totalAR / 1000).toFixed(1)}K</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Active Customers</div>
                <div className="kpi-value">{kpis.activeCustomers}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Active Trucks</div>
                <div className="kpi-value">{kpis.activeTrucks}</div>
              </div>
            </div>
          </div>
        )}

        {tab === "trucks" && (
          <TruckManagementTab
            trucks={data.trucks}
            onSave={(form) => showToast("Truck saved!")}
            onDelete={() => showToast("Truck deleted!")}
          />
        )}

        {tab === "map" && (
          <MapView trucks={data.trucks} customers={data.customers} sales={data.sales} />
        )}

        {tab === "customers" && (
          <div className="card">
            <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Customers</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.city || "N/A"}</td>
                    <td><span className="tag tag-success">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "sales" && (
          <div className="card">
            <h2 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Sales Invoices</h2>
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", color: "#94a3b8" }}>No sales yet</td></tr>
                ) : (
                  data.sales.map((s) => (
                    <tr key={s.id}>
                      <td>{s.invoice_no}</td>
                      <td>{s.customer_name}</td>
                      <td>${s.total?.toFixed(2)}</td>
                      <td><span className={`tag ${s.paid ? "tag-success" : "tag-warning"}`}>{s.paid ? "Paid" : "Pending"}</span></td>
                      <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
