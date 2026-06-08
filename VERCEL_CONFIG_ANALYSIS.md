# Vercel Configuration Deep Dive Analysis

## Project Structure
```
vitalwaveone/
├── package.json (root - monorepo metadata only)
├── frontend/
│   ├── package.json (React/Vite dependencies)
│   ├── vercel.json (SPA routing config)
│   ├── vite.config.js (builds to dist/)
│   └── src/ (React app)
├── api/
│   ├── package.json (Node.js serverless dependencies)
│   ├── auth/[action].js (auth endpoints)
│   ├── billing/index.js (billing endpoints)
│   ├── test.js (health check)
│   └── [...slug].js (catch-all router)
├── lib/
│   ├── db.js (database utilities)
│   ├── middleware.js (body parsing helpers)
│   └── handlers/ (endpoint handlers)
└── scripts/
    └── validate-vercel-config.js (validation tool)
```

## Vercel Deployment Configuration

### Root Directory: `/frontend`
- **Set in Vercel Dashboard**: Project Settings → Root Directory → `/frontend`
- **Purpose**: Tell Vercel that the build root is the frontend folder
- **Build Command**: `npm run build` (runs `vite build`)
- **Output Directory**: `dist/` (Vite's output)
- **Install Command**: `npm install --include=dev`

### Frontend vercel.json (`frontend/vercel.json`)
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Purpose**: SPA (Single Page Application) routing
- React Router handles client-side navigation
- Any request NOT matching a file → serve `/index.html`
- React app takes over and routes based on URL
- **Status**: ✅ CORRECT

### Root vercel.json
- **Status**: ❌ REMOVED (was causing conflicts)
- **Why**: In a monorepo with Root Directory = `/frontend`, root-level vercel.json conflicts
- **Correct approach**: Use dashboard settings instead

## API Serverless Functions

### Location & Routing
- **Files**: `/api/**/*.js` (at root level, NOT under /frontend)
- **Routes**: 
  - `/api/auth/[action].js` → handles login, register, verify, otp-send, otp-verify
  - `/api/billing/index.js` → handles billing operations
  - `/api/[...slug].js` → catch-all for other resources
  - `/api/storage/upload.js` → file uploads
  - `/api/test.js` → health check

### How Vercel Routes API Calls
1. Frontend makes request: `fetch('/api/auth/login', ...)`
2. Vercel sees `/api/**` pattern
3. Routes to serverless functions at `/api/` (root level)
4. **No explicit rewrite needed** - Vercel handles this automatically in monorepo

## Critical Configuration Points

### ✅ CORRECT
1. **Root Directory set to `/frontend`** in Vercel Dashboard
2. **frontend/vercel.json has SPA rewrite** for React Router
3. **API functions at root level** (`/api/` folder at project root)
4. **package.json at root is minimal** (no dependencies to install)
5. **frontend/package.json has build script** (`vite build`)
6. **api/package.json has Node.js dependencies**

### ⚠️ POTENTIAL ISSUES
1. **CORS headers in API endpoints** - All returning `Access-Control-Allow-Origin: *`
   - Check if this causes issues with Vercel's request processing
2. **Body parsing in serverless** - Using async stream parsing
   - Vercel may have strict constraints on request body handling
3. **Import paths in API** - Using ES modules (`import`)
   - Need to ensure Vercel's Node.js supports this (it does, but worth noting)

## Login Flow Verification

### Expected Request Path
```
Frontend:
  1. User enters credentials
  2. POST to `/api/auth/login`
  3. Fetch with JSON body
  
Vercel Routing:
  1. Receives POST /api/auth/login
  2. Routes to /api/auth/[action].js
  3. Query param: action = 'login'
  
API Handler:
  1. Receives request, parses body
  2. Validates email/password
  3. Generates JWT token
  4. Returns { token, user }
  
Frontend:
  1. Receives response
  2. Stores token in localStorage
  3. Navigates to /admin
```

### Current Issue
- Frontend is receiving an error during login
- Likely causes:
  1. Body not being parsed correctly
  2. Response format mismatch
  3. API endpoint not being reached (routing issue)
  4. CORS blocking the response

## Recommendations

### Immediate Actions
1. **Test API directly**: `curl -X POST https://vitalwaveone.vercel.app/api/test`
   - Verify serverless functions are deployed
   - Check CORS headers are being sent
   
2. **Check browser console**: Open DevTools → Network tab
   - Look for `/api/auth/login` request
   - Check if request is being sent
   - Check response status and body
   
3. **Verify Vercel deployment logs**:
   - Go to Vercel dashboard
   - Check "Deployments" → latest → "Build Logs"
   - Look for any errors in function setup

### Configuration Cleanup
1. **Ensure NO vercel.json at root** - Delete if it exists
2. **Verify Root Directory is `/frontend`** in Vercel dashboard
3. **Check Build Command**: Should be `npm run build`
4. **Check Output Directory**: Should be `dist`

## Monorepo Pattern Validation

✅ **Correct Pattern**:
- Single Vercel project
- Root Directory = `/frontend` (where the SPA is)
- `/api` functions at project root (serverless)
- Both deployed together

❌ **Incorrect Pattern**:
- Two separate Vercel projects (one for frontend, one for backend)
- Having vercel.json at both root AND frontend
- Setting conflicting Root Directories

**Current Status**: Following the correct pattern ✅

## Next Steps

1. **Deploy the cleaned vercel.json**
2. **Check Vercel build logs for errors**
3. **Test with curl**: `curl -X POST https://vitalwaveone.vercel.app/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'`
4. **Check browser Network tab** during login attempt
5. **Review API response format** - Ensure it matches frontend expectations

