# 🚀 VitalWave Deployment to Vercel + Neon

**Project:** VitalWave Wholesale Platform v2.0  
**Domain:** vitalwaveone.com  
**Frontend Hosting:** Vercel  
**Backend Hosting:** Vercel  
**Database:** Neon (PostgreSQL)  
**Status:** Ready to Deploy

---

## 📋 Deployment Checklist

- [ ] GitHub account & repository
- [ ] Vercel account (vercel.com)
- [ ] Neon account (neon.tech)
- [ ] Environment variables configured
- [ ] Database created in Neon
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] API connected to database
- [ ] Domain configured (optional)

---

## 🔗 Architecture

```
Domain (vitalwaveone.com)
    ↓
Vercel Frontend (React)
    ↓ HTTPS
Vercel Backend (Node.js API)
    ↓ SSL
Neon Database (PostgreSQL)
```

---

## Step 1: Setup Neon Database (5 minutes)

### 1.1 Create Neon Account
```
1. Go to https://neon.tech
2. Sign up free (no credit card needed)
3. Create organization
4. Confirm email
```

### 1.2 Create Database Project
```
1. Click "Create Project"
2. Name: vitalwaveone
3. Region: US East (closest to you)
4. PostgreSQL 15
5. Click "Create Project"
6. Wait for database to initialize
```

### 1.3 Get Connection String
```
1. On project page, find Connection string
2. Select "Connection string" tab
3. Copy the full string (looks like):
   postgresql://user:password@host.neon.tech:5432/vitalwaveone
4. Save this - you'll need it
```

### 1.4 Load Database Schema
```
1. Click "SQL Editor" in Neon console
2. Copy entire content from schema.sql
3. Paste into SQL editor
4. Click "Execute"
5. Wait for success message
6. Tables should appear in browser on left
```

### 1.5 Create Neon Variables for Vercel
Note these for later:
- **DATABASE_URL** - The connection string you copied

---

## Step 2: Setup GitHub (5 minutes)

### 2.1 Create Repository
```bash
cd /path/to/vitalwaveone

# Initialize git if not already done
git init
git add .
git commit -m "VitalWave Platform - Ready for Vercel Deployment"

# Create repo on GitHub
# Go to github.com → New Repository
# Name: vitalwaveone
# Public or Private (your choice)
# Click Create
```

### 2.2 Push to GitHub
```bash
# Add remote (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/vitalwaveone.git
git branch -M main
git push -u origin main

# Wait for push to complete
# Refresh GitHub to see files
```

---

## Step 3: Deploy Backend to Vercel (10 minutes)

### 3.1 Create Vercel Account
```
1. Go to https://vercel.com
2. Click "Sign Up"
3. Click "Continue with GitHub"
4. Authorize Vercel
5. Confirm email
```

### 3.2 Deploy Backend
```
1. In Vercel Dashboard, click "Add New..." → "Project"
2. Select your GitHub repository (vitalwaveone)
3. Click Import
4. Framework: Node.js
5. Build Command: (leave empty)
6. Start Command: (leave empty)
7. Install Command: npm install
8. Click Deploy
9. Wait 2-3 minutes for deployment
10. You'll see: "Congratulations! Your deployment is ready"
11. Copy the deployment URL (like vitalwaveone-api.vercel.app)
```

### 3.3 Add Environment Variables
```
1. In Vercel project, go to Settings
2. Click "Environment Variables"
3. Add variables:

   DATABASE_URL: [PASTE NEON CONNECTION STRING]
   JWT_SECRET: your-super-secret-key-min-32-characters-long
   STRIPE_PUBLIC_KEY: pk_test_xxx (from Stripe dashboard)
   STRIPE_SECRET_KEY: sk_test_xxx (from Stripe dashboard)
   NODE_ENV: production
   CORS_ORIGIN: https://vitalwaveone.vercel.app (frontend URL)
   PORT: (leave empty, Vercel handles this)

4. Click Save
5. Redeploy project (Settings → Deployments → Redeploy)
```

### 3.4 Test Backend
```bash
# Health check
curl https://vitalwaveone-api.vercel.app/api/health

# Should return:
# {"status":"ok","timestamp":"2026-06-02T..."}
```

---

## Step 4: Deploy Frontend to Vercel (10 minutes)

### 4.1 Update Frontend Configuration
Edit `src/utils/api.js`:
```javascript
// Change from:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// To:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vitalwaveone-api.vercel.app/api';
```

### 4.2 Update vercel.json
Edit `vercel.json` in project root:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_BASE_URL": "@vite_api_base_url"
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 4.3 Deploy Frontend
```
1. In Vercel Dashboard, click "Add New..." → "Project"
2. Select your vitalwaveone repository (again)
3. Framework: Vite
4. Root Directory: ./ (default)
5. Build Command: npm run build
6. Output Directory: dist
7. Install Command: npm install
8. Click Deploy
9. Wait 2-3 minutes
10. Copy the deployment URL (like vitalwaveone.vercel.app)
```

### 4.4 Add Frontend Environment Variables
```
1. In Frontend Vercel project, go to Settings
2. Click "Environment Variables"
3. Add:
   VITE_API_BASE_URL: https://vitalwaveone-api.vercel.app/api
   VITE_STRIPE_PUBLIC_KEY: pk_test_xxx

4. Click Save
5. Redeploy (Settings → Deployments → Redeploy)
```

### 4.5 Test Frontend
```
1. Go to https://vitalwaveone.vercel.app
2. You should see the landing page
3. Click "Get Started" or "Create Account"
4. Try to register a company
5. Should redirect to admin portal
6. Real data should load from backend
```

---

## Step 5: Connect Custom Domain (Optional - 5 minutes)

### 5.1 Add Domain to Vercel
```
1. In Frontend Vercel project, Settings
2. Go to "Domains"
3. Click "Add Domain"
4. Type: vitalwaveone.com
5. Vercel shows DNS records to add
```

### 5.2 Update DNS
```
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS settings
3. Add CNAME records from Vercel
4. Wait 24-48 hours for propagation
5. Verify domain in Vercel
```

---

## Step 6: Verify Everything Works

### Test Checklist
```
[ ] Frontend loads at https://vitalwaveone.vercel.app
[ ] Landing page shows subscription tiers
[ ] Can register new company
[ ] Can login with email/password
[ ] Admin portal loads with real data
[ ] Can add products to inventory
[ ] Can approve customers
[ ] Can logout/login
[ ] API responds to all endpoints
[ ] Database persistence works
[ ] No CORS errors in browser console
```

---

## 🔧 Troubleshooting Vercel Deployment

### Issue: API returns 404
```
Fix:
1. Check backend URL in frontend API client
2. Verify backend is deployed and healthy
3. Test: curl https://vitalwaveone-api.vercel.app/api/health
4. Check Vercel logs: Vercel Dashboard → Deployments → View Logs
```

### Issue: CORS errors
```
Fix:
1. Check CORS_ORIGIN in backend env vars
2. Should be: https://vitalwaveone.vercel.app
3. Redeploy backend after changing
4. Clear browser cache
```

### Issue: Database connection fails
```
Fix:
1. Check DATABASE_URL in backend env vars
2. Verify it's the Neon connection string
3. Test connection locally: psql "$DATABASE_URL"
4. Check Neon console for any issues
5. Verify schema was loaded (SQL Editor)
```

### Issue: Build fails on Vercel
```
Fix:
1. Check build logs: Deployments → View Logs
2. Common issues:
   - Missing dependencies: npm install
   - Wrong build command: npm run build
   - Node version: Use Node 18+
3. Redeploy if you fix environment
```

### Issue: Frontend shows blank page
```
Fix:
1. Check browser console for errors
2. Check Vercel deployment logs
3. Verify VITE_API_BASE_URL is set
4. Try clearing cache: Ctrl+Shift+Delete
5. Check build output directory: dist
```

---

## 📊 Deployment Checklist Summary

### Frontend (Vercel)
- [ ] GitHub repo created and pushed
- [ ] Vercel project created
- [ ] Build command: npm run build
- [ ] Output directory: dist
- [ ] Environment variables set
- [ ] Domain configured (optional)
- [ ] Health check passed
- [ ] Can register and login

### Backend (Vercel)
- [ ] GitHub repo includes server.js
- [ ] Vercel project created
- [ ] Environment variables set
- [ ] DATABASE_URL points to Neon
- [ ] JWT_SECRET configured
- [ ] CORS_ORIGIN set to frontend URL
- [ ] API endpoints responding

### Database (Neon)
- [ ] Account created
- [ ] Project created
- [ ] Connection string saved
- [ ] Schema loaded
- [ ] Tables visible in console
- [ ] Can connect from backend

---

## 🔑 Final Environment Variables

### Neon Dashboard (for reference)
```
Connection String:
postgresql://user:password@host.neon.tech:5432/vitalwaveone
```

### Backend Vercel Environment Variables
```
DATABASE_URL = postgresql://user:password@host.neon.tech:5432/vitalwaveone
JWT_SECRET = your-32-char-secret-key-here
STRIPE_PUBLIC_KEY = pk_test_xxx
STRIPE_SECRET_KEY = sk_test_xxx
NODE_ENV = production
CORS_ORIGIN = https://vitalwaveone.vercel.app
```

### Frontend Vercel Environment Variables
```
VITE_API_BASE_URL = https://vitalwaveone-api.vercel.app/api
VITE_STRIPE_PUBLIC_KEY = pk_test_xxx
```

---

## 📱 Live URLs After Deployment

```
Frontend: https://vitalwaveone.vercel.app
Backend API: https://vitalwaveone-api.vercel.app
Database: Connected via Neon
Admin Portal: https://vitalwaveone.vercel.app/admin
Ordering Portal: https://vitalwaveone.vercel.app/order
```

---

## ⚡ Quick Reference

### Deployment Times
- Neon setup: 5 minutes
- GitHub: 5 minutes
- Backend deploy: 10 minutes
- Frontend deploy: 10 minutes
- **Total: 30 minutes**

### After Deployment
```bash
# Test backend
curl https://vitalwaveone-api.vercel.app/api/health

# Register company
curl -X POST https://vitalwaveone-api.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{...}'

# Access frontend
# https://vitalwaveone.vercel.app
```

---

## 🎯 Success Indicators

✅ Frontend loads without errors  
✅ Can register new account  
✅ Can login with email/password  
✅ Admin portal shows real data  
✅ API endpoints respond  
✅ Database persists data  
✅ No CORS errors  
✅ Responsive on mobile  

---

## 🚀 You're Live!

**Once deployed, your platform is available globally:**
- Frontend: Live on Vercel CDN
- Backend: Running on Vercel serverless
- Database: Hosted on Neon PostgreSQL
- Always on: 24/7 availability

**Share your platform URL with anyone, anywhere!**

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Neon Docs:** https://neon.tech/docs
- **PostgreSQL Help:** https://www.postgresql.org/docs/
- **Node.js Help:** https://nodejs.org/docs/

---

**Status: READY FOR PRODUCTION DEPLOYMENT** 🚀

**Estimated time to go live: 30 minutes**

Let's deploy! 🎉
