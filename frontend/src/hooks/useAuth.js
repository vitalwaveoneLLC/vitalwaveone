// Authentication hook - vitalwaveone.com
import { useState, useEffect, useCallback } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem('vw_admin_session');
        if (stored) {
          const session = JSON.parse(stored);
          if (session.expires > Date.now()) {
            setUser(session.user);
          } else {
            localStorage.removeItem('vw_admin_session');
            localStorage.removeItem('vw_token');
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const session = {
        user: data.user,
        token: data.token,
        expires: Date.now() + 24 * 60 * 60 * 1000,
      };

      localStorage.setItem('vw_admin_session', JSON.stringify(session));
      localStorage.setItem('vw_token', data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('vw_admin_session');
    localStorage.removeItem('vw_token');
    setUser(null);
  }, []);

  return { user, loading, error, login, logout };
};

export default useAuth;
