/**
 * Frontend Authentication Manager
 * Handles JWT token lifecycle, company context, and session management
 */

const TOKEN_KEY = 'vw_jwt_token';
const USER_KEY = 'vw_user_context';
const COMPANY_KEY = 'vw_company_context';

/**
 * Store JWT token and user context
 */
export function setAuthToken(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Get stored JWT token
 */
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user context
 */
export function getUserContext() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user context:', error);
    return null;
  }
}

/**
 * Get company context (extracted from user)
 */
export function getCompanyContext() {
  const user = getUserContext();
  return user?.companyId ? {
    companyId: user.companyId,
    companyName: user.companyName,
  } : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken() && !!getUserContext();
}

/**
 * Check if user is admin
 */
export function isAdmin() {
  const user = getUserContext();
  return user?.role === 'admin';
}

/**
 * Clear all auth data (logout)
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(COMPANY_KEY);
}

/**
 * Get Authorization header
 */
export function getAuthHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Parse JWT payload (client-side only - for info, not security)
 */
export function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString()
    );

    return payload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token) {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  // Check if expired (with 1 minute buffer)
  const expiresAt = payload.exp * 1000; // Convert to milliseconds
  return Date.now() > expiresAt - 60000;
}

/**
 * Verify token is still valid
 */
export async function verifyToken(token, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

/**
 * Login user
 */
export async function login(email, password, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    // Store token and user context
    setAuthToken(data.token, data.user);

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Register new admin user
 */
export async function register(registrationData, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();

    // Store token and user context
    setAuthToken(data.token, data.user);

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Logout user
 */
export async function logout(apiUrl) {
  try {
    const token = getAuthToken();

    if (token) {
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    clearAuth();
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local storage even if server request fails
    clearAuth();
    return { success: true };
  }
}

export default {
  setAuthToken,
  getAuthToken,
  getUserContext,
  getCompanyContext,
  isAuthenticated,
  isAdmin,
  clearAuth,
  getAuthHeader,
  decodeJWT,
  isTokenExpired,
  verifyToken,
  login,
  register,
  logout,
};
