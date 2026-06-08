// src/db.js - Database abstraction layer
// Provides unified API for database operations
// Supports both mock data (development) and real database (production)

const API_BASE = window.location.origin + '/api';

/**
 * Query database
 * @param {string} action - Action name (e.g., 'get-products', 'get-customers')
 * @param {object} params - Query parameters
 * @returns {Promise<object>} - { data: [...] }
 */
export async function query(action, params = {}) {
  try {
    const url = new URL(`${API_BASE}/db`);
    url.searchParams.append('action', action);

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.append(k, v);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Query failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[db.query]', error.message);
    throw error;
  }
}

/**
 * Mutate database
 * @param {string} action - Action name (e.g., 'create-products', 'update-customers')
 * @param {object} body - Request body
 * @param {string} csrfToken - CSRF token for security
 * @returns {Promise<object>} - { data: {...} }
 */
export async function mutate(action, body = {}, csrfToken = null) {
  try {
    const method = action.includes('delete') ? 'DELETE' :
                   action.includes('update') ? 'PUT' : 'POST';

    const headers = { 'Content-Type': 'application/json' };
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

    const response = await fetch(`${API_BASE}/db?action=${action}`, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Mutation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[db.mutate]', error.message);
    throw error;
  }
}

/**
 * Export db object for compatibility
 */
export const db = {
  query,
  mutate,
};
