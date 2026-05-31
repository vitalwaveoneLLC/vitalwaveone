// ═══════════════════════════════════════════════════════════════════════════
// VitalWaveOne OTP Login Component (Replaces WhatsApp with Email OTP)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

export function OtpLogin({ onLoginSuccess, role = 'customer' }) {
  const [step, setStep] = useState('email'); // email, otp, password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');

  // Generate CSRF token on mount
  useEffect(() => {
    const token = localStorage.getItem('csrf_token');
    if (!token) {
      const newToken = Math.random().toString(36).substring(2, 15) +
                       Math.random().toString(36).substring(2, 15);
      localStorage.setItem('csrf_token', newToken);
      setCsrfToken(newToken);
    } else {
      setCsrfToken(token);
    }
  }, []);

  const sanitizeEmail = (e) => {
    return e.toLowerCase().trim();
  };

  const validateEmail = (e) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(e);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate
    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(
        `${window.location.origin}/api/auth?action=send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            email: sanitizeEmail(email),
            role
          })
        },
        10000
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send OTP');
      }

      const data = await response.json();

      setSuccess(`OTP sent to ${data.message.split(' ').slice(-1)[0]}`);
      setStep('otp');
      setOtpExpiry(Date.now() + data.expiresIn * 1000);
      setOtp('');

    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(
        `${window.location.origin}/api/auth?action=verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            email: sanitizeEmail(email),
            otp,
            role
          })
        },
        10000
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Invalid OTP');
      }

      const data = await response.json();

      if (data.isNewUser) {
        // New user - show password setup
        setSuccess('OTP verified! Now set your password.');
        setStep('password');
        setTempToken(data.tempToken);
        setIsNewUser(true);
      } else {
        // Existing user - login success
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_email', data.email);
        localStorage.setItem('user_role', data.user.role);
        setSuccess('Login successful!');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 500);
      }

    } catch (err) {
      setError(err.message || 'Invalid OTP');
    }

    setLoading(false);
  };

  const validatePassword = (pwd) => {
    if (!pwd || pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain number';
    }
    return '';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithTimeout(
        `${window.location.origin}/api/auth?action=register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            email: sanitizeEmail(email),
            password,
            confirmPassword,
            name: name || email.split('@')[0],
            role,
            tempToken
          })
        },
        10000
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Registration failed');
      }

      const data = await response.json();

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_email', data.email);
      localStorage.setItem('user_role', data.user.role);
      setSuccess('Account created successfully!');

      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 500);

    } catch (err) {
      setError(err.message || 'Registration failed');
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '100%',
        maxWidth: '400px',
        padding: '40px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '8px',
          color: '#0a1628'
        }}>
          🎯 VitalWaveOne
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '32px'
        }}>
          {role === 'admin' ? 'Admin Dashboard' : role === 'driver' ? 'Driver App' : 'Customer Portal'}
        </p>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            ✓ {success}
          </div>
        )}

        {/* STEP 1: Email Input */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%',
                padding: '10px',
                background: loading || !email ? '#cbd5e1' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || !email ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? '⏳ Sending...' : '📧 Send OTP'}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                6-Digit Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength="6"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '20px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  fontWeight: '600',
                  outline: 'none'
                }}
              />
              <p style={{
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '6px'
              }}>
                ⏱️ Code expires in {Math.floor((otpExpiry - Date.now()) / 1000)}s
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{
                width: '100%',
                padding: '10px',
                background: loading || otp.length !== 6 ? '#cbd5e1' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Verifying...' : '✓ Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError('');
              }}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                background: 'transparent',
                color: '#667eea',
                border: '1px solid #667eea',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ← Change Email
            </button>
          </form>
        )}

        {/* STEP 3: Password Setup (New Users Only) */}
        {step === 'password' && isNewUser && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                Full Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <p style={{
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '6px'
              }}>
                • At least 8 characters<br/>
                • Uppercase, lowercase, number
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#64748b',
                marginBottom: '6px',
                textTransform: 'uppercase'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || password !== confirmPassword}
              style={{
                width: '100%',
                padding: '10px',
                background: loading ? '#cbd5e1' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Creating Account...' : '🎉 Create Account'}
            </button>
          </form>
        )}

        <p style={{
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: 'center',
          marginTop: '24px'
        }}>
          🔒 Secure login powered by email verification
        </p>
      </div>
    </div>
  );
}

export default OtpLogin;
