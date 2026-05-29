# API Integration Guide - Next Steps

**Status:** ✅ Database migrated  
**Next:** Update all your API endpoints

---

## What Was Done

✅ **Updated:** `/api/auth/verify-admin.js` - Added rate limiting  
✅ **Created:** `/api/sample-secure-endpoint.js` - Template showing session + CSRF middleware

---

## Your Action Items

### 1. Copy Pattern to Other Endpoints

Use `/api/sample-secure-endpoint.js` as a template for all endpoints:

**For reading data (GET):**
```javascript
import { validateSession } from './middleware/auth.js';

// No CSRF needed for GET
// Just extract tenantId from request
```

**For creating/updating/deleting (POST/PUT/PATCH/DELETE):**
```javascript
import { validateSession } from './middleware/auth.js';
import { csrfMiddleware } from './middleware/csrf.js';

// Validate session
await validateSession(req, res, () => {});
if (!req.session) return res.status(401).json({ error: 'Unauthorized' });

// Validate CSRF
await csrfMiddleware(req, res, () => {});
if (res.headersSent) return;

// Your code here
```

---

### 2. Files You Need to Update

Find these files in `/api` and update them:

**Auth endpoints (add rate limiting):**
- `api/auth/verify-admin.js` ✅ DONE
- `api/auth/send-otp.js` (add rate limiting like verify-admin)
- `api/auth/verify-otp.js` (add rate limiting)
- `api/auth/signup.js` (add rate limiting)

**Mutation endpoints (add session + CSRF):**
- `api/data/[table].js` (POST, PUT, PATCH, DELETE methods)
- `api/storage/upload.js`
- `api/storage/delete.js`
- Any other endpoints that change data

---

### 3. Quick Update Template

For each endpoint file, add at the top:

```javascript
// Add these imports
import { checkRateLimit } from '../middleware/rate-limiter.js';
import { validateSession } from '../middleware/auth.js';
import { csrfMiddleware } from '../middleware/csrf.js';

export default async function handler(req, res) {
  // ... headers ...

  // For auth endpoints (rate limiting)
  const rateLimit = await checkRateLimit(`key:${identifier}`, 5, 900);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many attempts' });
  }

  // For mutation endpoints (session + CSRF)
  if (req.method !== 'GET') {
    await validateSession(req, res, () => {});
    if (!req.session) return res.status(401).json({ error: 'Unauthorized' });

    await csrfMiddleware(req, res, () => {});
    if (res.headersSent) return;
  }

  // Your existing code
}
```

---

## Frontend Integration (Next Step)

After updating API, update React components:

```javascript
// 1. Use session hook
import { useSession } from './hooks/useSession';
const { session, isAuthenticated } = useSession();

// 2. Use form validation
import { useFormValidation } from './hooks/useFormValidation';
import { customerSchema } from '../lib/validation';
const form = useFormValidation(customerSchema);

// 3. Send CSRF token with requests
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': localStorage.getItem('csrf_token'),
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

---

## Checklist

**API Endpoints:**
- [ ] Find all endpoints in `/api` folder
- [ ] Add rate limiting to auth endpoints
- [ ] Add session + CSRF to mutation endpoints
- [ ] Test each endpoint

**Frontend Components:**
- [ ] Add useSession hook to dashboard
- [ ] Add useFormValidation to all forms
- [ ] Add CSRF token to API requests
- [ ] Test login and forms

---

## Files Created

✅ `api/auth/verify-admin.js` - Updated with rate limiting
✅ `api/sample-secure-endpoint.js` - Template (reference only, don't use in production)
✅ `api/middleware/rate-limiter.js` - Rate limiting logic
✅ `api/middleware/auth.js` - Session validation
✅ `api/middleware/csrf.js` - CSRF token validation
✅ `src/hooks/useSession.jsx` - React session hook
✅ `src/hooks/useFormValidation.jsx` - React form validation

---

## Common Issues

**"Module not found: rate-limiter"**
→ Restart dev server: `npm run dev`

**Tests failing**
→ Run: `npm test`

**API returning 401**
→ Session not validated. Check middleware is imported.

---

## Next Steps

1. **Update API endpoints** using sample-secure-endpoint.js as guide
2. **Update React components** with useSession and useFormValidation hooks
3. **Test everything** - `npm test`
4. **Run dev server** - `npm run dev`

**Want me to update a specific endpoint file?** Let me know which one!
