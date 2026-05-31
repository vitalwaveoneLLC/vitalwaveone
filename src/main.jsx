import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import OrderPortal from './OrderPortal.jsx'
import LandingPage from './LandingPage.jsx'
import SignupFlow from './SignupFlow.jsx'
import LoginPage from './LoginPage.jsx'
import { isNative, setStatusBarDark } from './capacitor.js'

const path = window.location.pathname;

// Check if admin is logged in via WhatsApp OTP session
function isAdminLoggedIn() {
  try {
    const stored = localStorage.getItem("vitalwaveone_admin");
    if (!stored) return false;
    const admin = JSON.parse(stored);
    return admin.expires > Date.now();
  } catch { return false; }
}

function Root() {
  const [view, setView] = useState(() => {
    if (path.startsWith('/order'))  return 'order';
    if (path.startsWith('/signup')) return 'signup';
    if (path.startsWith('/login'))  return 'login';
    if (path.startsWith('/app'))    return isAdminLoggedIn() ? 'app' : 'login';
    return 'landing';
  });

  useEffect(() => {
    if (isNative()) {
      setStatusBarDark();
      import('@capacitor/splash-screen')
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 300 }))
        .catch(() => {});
    } else {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
        });
      }
    }
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    setView(to.replace('/', '') || 'landing');
  };

  if (view === 'order')   return <OrderPortal />;
  if (view === 'app')     return <App />;
  if (view === 'login')   return <LoginPage onBack={() => navigate('/')} />;
  if (view === 'signup')  return <SignupFlow onComplete={() => navigate('/login')} onBack={() => navigate('/')} />;

  return (
    <LandingPage
      onSignUp={() => navigate('/signup')}
      onLogin={() => navigate('/login')}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
)
