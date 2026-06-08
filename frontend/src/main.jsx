import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import * as authManager from './utils/auth-manager.js'
import AppAdminIntegrated from './AppAdminIntegrated.jsx'
import OrderPortal from './OrderPortal.jsx'
import HomePage from './HomePage.jsx'
import LoginPageIntegrated from './LoginPageIntegrated.jsx'
import OrderingPlatformAccess from './pages/OrderingPlatformAccess.jsx'

const path = window.location.pathname;

/**
 * VitalWave Wholesale Platform v2.0 - Integrated with API
 * Domain: vitalwaveone.com
 *
 * Routes:
 * - / → LandingPage (subscription selection, landing)
 * - /login → LoginPage (admin & user authentication)
 * - /admin → AdminPortal (admin dashboard)
 * - /order → OrderingPortal (customer/driver/walk-in portal)
 */

// Session/Auth utilities
function getAdminSession() {
  try {
    const stored = localStorage.getItem("vw_admin_session");
    if (!stored) return null;
    const session = JSON.parse(stored);
    return session.expires > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function getUserSession() {
  try {
    const stored = localStorage.getItem("vw_user_session");
    if (!stored) return null;
    const session = JSON.parse(stored);
    return session.expires > Date.now() ? session : null;
  } catch {
    return null;
  }
}

/**
 * Root component handling all routing
 */
function Root() {
  const [view, setView] = useState(() => {
    if (path.startsWith('/admin')) return getAdminSession() ? 'admin' : 'login';
    if (path.match(/^\/order\/[a-zA-Z0-9_]+$/)) return 'ordering-access'; // Unique link access
    if (path.startsWith('/order')) return getUserSession() ? 'order' : 'login';
    if (path.startsWith('/login')) return 'login';
    return 'landing';
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Register service worker for offline support
    if ('serviceWorker' in navigator && !window.isNative) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch(() => { /* offline support optional */ });
    }
  }, []);

  const handleLogout = () => {
    // Clear all auth data (JWT token + user context) using auth-manager
    authManager.clearAuth();
    navigate('/login');
  };

  const handleLoginSuccess = (user) => {
    // Navigate based on user role
    // user.role will be 'admin', 'driver', 'customer', etc.
    if (user.role === 'admin') {
      navigate('/admin');
    } else if (['driver', 'customer', 'walk-in'].includes(user.role)) {
      navigate('/order');
    } else {
      navigate('/');
    }
  };

  const navigate = (to) => {
    setLoading(true);
    window.history.pushState({}, '', to);
    setView(
      to === '/' ? 'landing' :
      to === '/login' ? 'login' :
      to.startsWith('/admin') ? 'admin' :
      to.match(/^\/order\/[a-zA-Z0-9_]+$/) ? 'ordering-access' :
      to.startsWith('/order') ? 'order' :
      'landing'
    );
    setTimeout(() => setLoading(false), 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-4 text-4xl font-bold text-indigo-600">VitalWave</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Render view
  if (view === 'admin') return <AppAdminIntegrated onLogout={handleLogout} />;
  if (view === 'order') return <OrderPortal onLogout={handleLogout} />;
  if (view === 'ordering-access') {
    const match = path.match(/^\/order\/([a-zA-Z0-9_]+)$/);
    const link = match ? match[1] : null;
    return <OrderingPlatformAccess
      link={link}
      onSuccess={() => navigate('/order')}
      onError={() => navigate('/login')}
    />;
  }
  if (view === 'login') return <LoginPageIntegrated onLoginSuccess={handleLoginSuccess} onBack={() => navigate('/')} />;
  return <HomePage />;
}

// Mount app with Toast notifications
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
    <Toaster position="top-right" reverseOrder={false} />
  </React.StrictMode>
)
