// src/hooks/useSession.jsx
// React hook for managing secure sessions with httpOnly cookies
import { useState, useEffect, useCallback, useRef } from 'react';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortController = useRef(null);

  // Validate session on mount
  useEffect(() => {
    validateSession();

    return () => {
      // Cleanup
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const validateSession = useCallback(async () => {
    try {
      setLoading(true);
      abortController.current = new AbortController();

      const response = await fetch('/api/auth/validate-session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        signal: abortController.current.signal,
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setError(null);
      } else {
        setSession(null);
        if (response.status !== 401) {
          setError('Session validation failed');
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Session validation error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSession(null);
      // Clear CSRF token from localStorage
      localStorage.removeItem('csrf_token');
      window.location.href = '/';
    }
  }, []);

  const isAuthenticated = Boolean(session && session.id);
  const isAdmin = session?.userType === 'admin';
  const isDriver = session?.userType === 'driver';

  return {
    session,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isDriver,
    tenantId: session?.tenantId,
    logout,
    validateSession,
  };
}

export default useSession;
