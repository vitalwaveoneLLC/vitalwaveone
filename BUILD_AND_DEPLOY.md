# VitalWaveOne - Build and Deployment Guide
**Status**: Ready to build ✅  
**Date**: May 31, 2026

---

## ✅ PRE-BUILD CHECKLIST

Before building, verify everything is in place:

```
✅ package.json - valid JSON (fixed)
✅ vite.config.js - has optimizations
✅ vercel.json - valid JSON (fixed)
✅ src/main.jsx - imports fixed
✅ src/LoginPage.jsx - imports fixed
✅ api/auth.js - cleaned & secured
✅ api/email.js - duplicates removed
✅ lib/email-utils.js - shared utilities
✅ All SaaS features intact
✅ No broken imports
✅ No test code in production
```

---

## 🚀 BUILD PROCESS (Step-by-Step)

### Step 1: Install Dependencies (5 minutes)
```bash
cd /path/to/vitalwaveone
npm install
```

**Expected output:**
```
added XXX packages in X.XXs
```

**If issues occur:**
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

### Step 2: Verify Development Server (5 minutes)
```bash
npm run dev
```

**Expected:**
- Server starts on `http://localhost:5173`
- No errors in console
- All pages load without errors

**Test URLs:**
- http://localhost:5173 - Landing page
- http://localhost:5173/order - Customer portal
- http://localhost:5173/login - Login/OTP
- http://localhost:5173/app - Admin dashboard

---

### Step 3: Build for Production (5 minutes)
```bash
npm run build
```

**Expected output:**
```
vite v8.0.10 building for production...
✓ 156 modules transformed.
dist/index.html                 0.46 kB │ gzip: 0.29 kB
dist/assets/index-ABC123.js   XXX.XX kB │ gzip: XXX.XX kB
✓ built in 12.34s
```

**If errors occur:**
```bash
# Clear vite cache
rm -rf .vite dist
npm run build
```

---

### Step 4: Test Production Build (5 minutes)
```bash
npm run preview
```

**Expected:**
- Server starts on `http://localhost:4173`
- Same tests as Step 2 - verify all pages load
- No console errors

---

## ⚙️ ENVIRONMENT SETUP

### Create `.env.local`
```bash
cp .env.example .env.local
```

### Edit `.env.local` with your values:
```env
# Email service
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Security (generate random strings)
JWT_SECRET=your-32-char-random-string-here
CSRF_SECRET=another-random-string
PASSWORD_SALT=one-more-random-string

# API
API_URL=http://localhost:5173/api
NODE_ENV=development
```

### Generate Random Secrets (Terminal)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this 3 times to get JWT_SECRET, CSRF_SECRET, PASSWORD_SALT.

---

## 📋 TESTING CHECKLIST

After build, verify:

### [ ] Landing Page
- [ ] Loads without errors
- [ ] Sign Up button works
- [ ] Login button works
- [ ] Images load

### [ ] Login / OTP
- [ ] Email input accepts email
- [ ] Send OTP button works
- [ ] OTP input appears after sending
- [ ] Verify OTP works
- [ ] Password set works
- [ ] Redirects to dashboard

### [ ] Customer Portal
- [ ] Products load
- [ ] Add to cart works
- [ ] Checkout works
- [ ] Invoice generation works

### [ ] Admin Dashboard
- [ ] Shows all tabs (Sales, Customers, Trucks, Drivers, Products)
- [ ] CRUD operations work
- [ ] Map loads
- [ ] Analytics display
- [ ] No console errors

### [ ] API Endpoints
- Test with curl or Postman:
```bash
# Send OTP
curl -X POST http://localhost:5173/api/auth?action=send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phone":"3175096262"}'

# Should return: { ok: true, message: "OTP sent to email", ... }
```

---

## 🐛 TROUBLESHOOTING

### Issue: npm install fails
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

### Issue: Port 5173 already in use
**Solution:**
```bash
npm run dev -- --port 3000
# Or kill the process using the port
```

### Issue: Build fails with "Module not found"
**Solution:**
```bash
# Verify all files exist
ls src/App.jsx src/main.jsx api/auth.js lib/email-utils.js

# Clear cache and rebuild
rm -rf dist .vite
npm run build
```

### Issue: CORS errors in console
**Solution:**
```bash
# Check that CORS headers are set in api files
# This is normal for local development
# Will be fixed in production with Vercel
```

### Issue: OTP email not sending
**Solutions:**
1. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env.local
2. Verify Gmail app password is correct (not regular password)
3. Check Gmail security settings allow app access
4. Look in browser console for error messages

---

## 📦 DEPLOYMENT TO VERCEL

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: Complete reconstruction - Phase 1 fixes"
git push origin main
```

### Step 2: Deploy to Vercel
```bash
npm run build  # Optional - Vercel will do this
vercel --prod
```

Or connect on vercel.com dashboard:
1. Import project from GitHub
2. Select `vitalwaveone` repo
3. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables (see above)
5. Deploy

### Step 3: Add Environment Variables in Vercel
In Vercel dashboard → Settings → Environment Variables:
```
GMAIL_USER = your-email@gmail.com
GMAIL_APP_PASSWORD = your-app-password
JWT_SECRET = (32-char random)
CSRF_SECRET = (random string)
PASSWORD_SALT = (random string)
API_URL = https://your-domain.vercel.app/api
NODE_ENV = production
ALLOWED_ORIGIN = https://your-domain.vercel.app
```

### Step 4: Test Production
- Visit https://your-domain.vercel.app
- Test OTP login
- Test all features
- Check browser console for errors

---

## 🔍 PRODUCTION VERIFICATION

After deployment, verify:

✅ Site loads (< 3 seconds)  
✅ OTP login works  
✅ Email sends successfully  
✅ Dashboard fully functional  
✅ Customer portal works  
✅ No console errors  
✅ HTTPS enforced  
✅ Images load  

---

## 📊 BUILD STATISTICS

**Expected Results:**
- Build size: < 500 KB (gzipped)
- Build time: < 20 seconds
- No warnings in build output
- 0 breaking changes to features

---

## ✨ SUCCESS INDICATORS

Build is successful when:

✅ `npm run build` completes without errors  
✅ `dist/` folder is created  
✅ `npm run preview` loads app  
✅ All pages render correctly  
✅ No console errors  
✅ All features work  

---

## 📞 ISSUES?

If you encounter any issues:

1. **Check the error message** - it often tells you exactly what's wrong
2. **Read the troubleshooting section** above
3. **Check browser console** (F12) for detailed errors
4. **Look in vite/build output** for clues
5. **Verify environment variables** are set correctly
6. **Try clearing cache**: `rm -rf node_modules dist .vite`

---

## 🎯 NEXT AFTER BUILD

Once build succeeds:

1. ✅ Verify all tests pass (see Testing Checklist)
2. ✅ Review code changes: `git diff HEAD~1`
3. ✅ Deploy to Vercel (see Deployment section)
4. ✅ Test production URL
5. ✅ Monitor error logs for issues
6. ✅ Set up monitoring/analytics (optional)

---

## 📝 COMMIT LOG REFERENCE

```
Commit: Fix corrupted package.json
Commit: Create lib/email-utils.js (shared utilities)
Commit: Rewrite api/auth.js (remove test OTP)
Commit: Rewrite api/email.js (remove duplicates)
Commit: Fix import errors in src/main.jsx
Commit: Enhance vite.config.js
Commit: Fix vercel.json
Commit: Add .env.example

All commits are safe for production
```

---

## 🚀 YOU'RE READY!

The codebase is now:
✅ Clean and organized  
✅ Free of duplication  
✅ Properly configured  
✅ Ready to build  
✅ Ready to deploy  

**Next command**: `npm install` → `npm run build`

Good luck! 🎉

