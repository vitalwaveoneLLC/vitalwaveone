// db.js - Frontend Neon DB client
// Drop-in replacement for supabase.js
// Maintains same API shape as Supabase client for easy migration

// Support both Vercel Functions (deployed) and local development
const API_BASE = import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/data` : '/api/data';
const RPC_BASE = import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/rpc` : '/api/rpc';

export const setTokenFn = (fn) => {}; // kept for compatibility

// Read tenant_id from admin/driver session OR URL parameter (for customer portal)
const getHeaders = async () => {
  try {
    // Admin session (set by LoginPage.jsx on admin OTP login)
    const adminStored = localStorage.getItem('vitalwaveone_admin');
    if (adminStored) {
      const admin = JSON.parse(adminStored);
      if (admin.tenant_id && admin.expires > Date.now()) {
        return { 'Content-Type': 'application/json', 'X-Tenant-ID': admin.tenant_id };
      }
    }
    // Driver session (set by OrderPortal.jsx on driver OTP login)
    const driverStored = localStorage.getItem('vitalwaveone_driver');
    if (driverStored) {
      const driver = JSON.parse(driverStored);
      if (driver.tenant_id && driver.expires > Date.now()) {
        return { 'Content-Type': 'application/json', 'X-Tenant-ID': driver.tenant_id };
      }
    }
    // Customer portal: tenant_id from URL parameter (e.g., /order?tenant=xxx)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTenant = params.get('tenant');
      if (urlTenant) {
        return { 'Content-Type': 'application/json', 'X-Tenant-ID': urlTenant };
      }
    }
  } catch {}
  return { 'Content-Type': 'application/json' };
};

// -- QUERY BUILDER ---------
// Mimics Supabase's chaining API: db.from('sales').select('*').eq('id', x)

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this._method = 'GET';
    this._select = '*';
    this._filters = {};
    this._order = null;
    this._limit = null;
    this._single = false;
    this._data = null;
    this._match = null;
    this._onConflict = 'id';
  }

  select(cols = '*') { this._select = cols; return this; }
  eq(col, val) { this._filters[col] = val; return this; }
  neq(col, val) { this._filters[col] = `neq.${val}`; return this; }
  gt(col, val) { this._filters[col] = `gt.${val}`; return this; }
  lt(col, val) { this._filters[col] = `lt.${val}`; return this; }
  in(col, vals) { this._filters[col] = `in.(${vals.join(',')})`; return this; }
  ilike(col, val) { this._filters[col] = `like.${val}`; return this; }
  order(col, { ascending = true } = {}) { this._order = `${col} ${ascending ? 'ASC' : 'DESC'}`; return this; }
  limit(n) { this._limit = n; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._single = true; return this; }

  insert(data) {
    this._method = 'POST';
    this._data = data;
    return this;
  }

  update(data) {
    this._method = 'PUT';
    this._data = data;
    return this;
  }

  upsert(data, { onConflict = 'id' } = {}) {
    this._method = 'PATCH';
    this._data = data;
    this._onConflict = onConflict;
    return this;
  }

  delete() {
    this._method = 'DELETE';
    return this;
  }

  // Execute the query
  async then(resolve, reject) {
    try {
      const headers = await getHeaders();

      let response;

      if (this._method === 'GET') {
        const params = new URLSearchParams({
          select: this._select,
          ...this._filters,
          ...(this._order ? { order: this._order } : {}),
          ...(this._limit ? { limit: this._limit } : {}),
          ...(this._single ? { single: '1' } : {}),
        });
        response = await fetch(`${API_BASE}/${this.table}?${params}`, { headers });
      }

      else if (this._method === 'POST') {
        response = await fetch(`${API_BASE}/${this.table}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(this._data),
        });
      }

      else if (this._method === 'PUT') {
        response = await fetch(`${API_BASE}/${this.table}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ data: this._data, match: this._match || this._filters }),
        });
      }

      else if (this._method === 'PATCH') {
        response = await fetch(`${API_BASE}/${this.table}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ data: this._data, onConflict: this._onConflict }),
        });
      }

      else if (this._method === 'DELETE') {
        response = await fetch(`${API_BASE}/${this.table}`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ match: this._filters }),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        // Return Supabase-compatible error shape
        resolve({ data: null, error: { message: errData.error || 'Request failed' } });
        return;
      }

      const data = await response.json();

      // Check plan restriction
      if (data?.upgrade) {
        resolve({ data: null, error: { message: data.error, upgrade: true } });
        return;
      }

      resolve({ data, error: null });
    } catch (e) {
      resolve({ data: null, error: { message: e.message } });
    }
  }
}

// -- AUTH (WhatsApp OTP session — no Supabase/Clerk) --
const auth = {
  getSession: async () => {
    return { data: { session: null }, error: null };
  },
  signOut: async () => {
    localStorage.removeItem('vitalwaveone_admin');
    localStorage.removeItem('vitalwaveone_driver');
    window.location.href = '/';
    return { error: null };
  },
  onAuthStateChange: () => {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
};

// -- STORAGE (Cloudflare R2 via API) --
const storage = {
  from: (bucket) => ({
    upload: async (path, file, options = {}) => {
      const headers = await getHeaders();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('path', path);

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Authorization': headers['Authorization'] || '' },
        body: formData,
      });
      const data = await res.json();
      return { data, error: res.ok ? null : { message: data.error } };
    },
    getPublicUrl: (path) => ({
      data: { publicUrl: `/api/storage/file?bucket=${bucket}&path=${encodeURIComponent(path)}` }
    }),
    remove: async (paths) => {
      const headers = await getHeaders();
      const res = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ bucket, paths }),
      });
      return { error: res.ok ? null : { message: 'Delete failed' } };
    },
  }),
};

// -- RPC --
const rpc = async (fn, params = {}) => {
  const headers = await getHeaders();
  const res = await fetch(`${RPC_BASE}/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const result = await res.json();
  return { data: result.data, error: res.ok ? null : { message: result.error } };
};

// -- FUNCTIONS (edge functions via Vercel API) --
const functions = {
  invoke: async (fn, { body } = {}) => {
    const headers = await getHeaders();
    const res = await fetch(`/api/functions/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { data, error: res.ok ? null : { message: data.error } };
  },
};

// -- MAIN CLIENT --
export const db = {
  from: (table) => new QueryBuilder(table),
  auth,
  storage,
  rpc,
  functions,
};

// useDbInit - removed (no longer needed; auth is WhatsApp OTP via localStorage)

export default db;
