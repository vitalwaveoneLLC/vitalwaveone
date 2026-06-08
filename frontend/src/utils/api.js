// API utilities - Multi-tenant SaaS with JWT Authentication
import { getAuthToken, clearAuth, getUserContext } from './auth-manager.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_TIMEOUT = 30000;

class APIError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'APIError';
  }
}

/**
 * Make authenticated API request with JWT token
 * Automatically adds company context to headers
 */
export const apiCall = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const token = getAuthToken();
    const user = getUserContext();

    const headers = {
      'Content-Type': 'application/json',
      // Add JWT token for authentication
      ...(token && { Authorization: `Bearer ${token}` }),
      // Add company context for multi-tenancy (informational)
      ...(user?.companyId && { 'X-Company-Id': user.companyId }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear session and redirect to login
        clearAuth();
        window.location.href = '/login';
      }
      throw new APIError(
        response.status,
        data.error || data.message || 'API Error',
        data
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new APIError(408, 'Request timeout. Please check your connection.');
    }
    throw error;
  }
};

/**
 * GET request
 */
export const get = (endpoint) => apiCall(endpoint, { method: 'GET' });

/**
 * POST request
 */
export const post = (endpoint, body) =>
  apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });

/**
 * PUT request
 */
export const put = (endpoint, body) =>
  apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

/**
 * DELETE request
 */
export const del = (endpoint) => apiCall(endpoint, { method: 'DELETE' });

/**
 * File upload with JWT token
 */
export const upload = async (endpoint, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const user = getUserContext();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(user?.companyId && { 'X-Company-Id': user.companyId }),
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    const data = await response.json().catch(() => ({}));
    throw new APIError(response.status, data.error || 'Upload failed', data);
  }

  return response.json();
};

export default { get, post, put, del, upload };
