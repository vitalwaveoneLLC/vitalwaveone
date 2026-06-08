# VitalWaveOne - Complete Implementation Guide

## Overview
This document provides step-by-step instructions to set up and deploy VitalWaveOne with all fixes and email OTP authentication.

**Status**: Production Ready  
**Last Updated**: May 30, 2026

---

## Phase 1: Local Setup (15 minutes)

### Step 1: Environment Configuration
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit .env.local with your settings
# See ENV_SETUP.md for detailed configuration
nano .env.local
```

**Required Variables**:
- `EMAIL_SERVICE` - Email provider (sendgrid, gmail, mailgun)
- `SENDGRID_API_KEY` - API key for email service
- `JWT_SECRET` - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
- `CSRF_SECRET` - Any random string for CSRF protection
- `PASSWORD_SALT` - Salt for password hashing

### Step 2: Install Dependencies
```bash
# Install npm packages
npm install

# Verify installation
npm list
```

### Step 3: Start Development Server
```bash
# Start local development server
npm run dev

# Server should be running at http://localhost:5173
```

---

## Phase 2: Verify Core Components (10 minutes)

### File Structure Check
Verify all required files exist:

```bash
# Check component files
ls -l src/ErrorBoundary.jsx          # Error boundary component
ls -l src/OtpLogin.jsx               # OTP login component
ls -l src/utils/sanitize.js          # Input sanitization

# Check API files
ls -l api/auth.js                    # Authentication endpoints
ls -l api/email.js                   # Email service
ls -l api/db.js                      # Database/data endpoints

# Check main components
ls -l src/App.jsx                    # Admin dashboard
ls -l src/OrderPortal.jsx            # Customer portal
```

### Component Verification
```javascript
// 1. Error Boundary
import ErrorBoundary from './src/ErrorBoundary.jsx';
// Wraps app to catch errors

// 2. OTP Login
import { OtpLogin } from './src/OtpLogin.jsx';
// Handles email OTP authentication

// 3. Sanitization
import { sanitizeEmail, validateForm } from './src/utils/sanitize.js';
// Prevents XSS attacks
```

---

## Phase 3: Test Authentication Flow (20 minutes)

### Test 1: Email OTP Request
```bash
# 1. Open browser console
# 2. Make test request:

const response = await fetch('/api/auth?action=send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    role: 'customer'
  })
});

const data = await response.json();
console.log(data);
// Expected: { ok: true, message: "OTP sent to..." }
```

### Test 2: OTP Verification
```javascript
// Look for OTP in console logs or email
// Default dev OTP in browser console after send-otp

const response = await fetch('/api/auth?action=verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    otp: '123456',  // OTP from email
    role: 'customer'
  })
});

const data = await response.json();
console.log(data);
// Expected: { ok: true, token: "..." }
```

### Test 3: Login Component
```bash
# 1. Stop dev server (Ctrl+C)
# 2. Update src/main.jsx to import OtpLogin:

import { OtpLogin } from './OtpLogin.jsx';

// 3. In App.jsx, use it:
<ErrorBoundary>
  <OtpLogin onLoginSuccess={(user) => setLoggedInUser(user)} />
</ErrorBoundary>

# 4. Restart server
npm run dev

# 5. Test login flow at http://localhost:5173
```

---

## Phase 4: Verify Security Features (15 minutes)

### Security Check 1: CSRF Protection
```javascript
// Check CSRF token in localStorage
console.log(localStorage.getItem('csrf_token'));
// Should show a token

// Verify it's included in requests
// Check Network tab → request headers
// Should see: X-CSRF-Token: [token]
```

### Security Check 2: Input Sanitization
```javascript
import { sanitizeEmail, escapeHtml } from './utils/sanitize.js';

// Test sanitization
console.log(sanitizeEmail('TEST@EXAMPLE.COM  '));
// Output: test@example.com

console.log(escapeHtml('<script>alert("xss")</script>'));
// Output: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### Security Check 3: Password Validation
```javascript
import { OtpLogin } from './OtpLogin.jsx';

// Component includes password validation:
// - Minimum 8 characters
// - At least one uppercase
// - At least one lowercase
// - At least one number

// Test with: MyPassword123
// Should accept

// Test with: password
// Should reject (no uppercase, no number)
```

---

## Phase 5: Test Features (30 minutes)

### Feature 1: Customer Portal
```bash
# 1. Login as customer
# Email: customer@test.com
# OTP: Check console or email

# 2. Navigate to OrderPortal
# 3. Test features:
#    - Add products to cart
#    - Calculate tax
#    - View total
#    - Checkout flow
```

### Feature 2: Admin Dashboard
```bash
# 1. Login as admin
# Email: admin@test.com
# Role: admin (select during OTP)

# 2. Access App.jsx (Admin Dashboard)
# 3. Test features:
#    - Manage products
#    - View customers
#    - Process orders
#    - Generate reports
```

### Feature 3: Error Handling
```bash
# 1. Trigger an error intentionally
# 2. Error Boundary should catch it
# 3. Show user-friendly error message
# 4. "Try Again" button should work
```

---

## Phase 6: Build for Production (10 minutes)

### Step 1: Build Optimization
```bash
# Create production build
npm run build

# Check build size
ls -lh dist/

# Expected: <500KB total
```

### Step 2: Preview Build
```bash
# Install preview server (if not available)
npm install -g serve

# Start preview
serve -s dist -p 3000

# Test at http://localhost:3000
# Should work identically to dev
```

### Step 3: Production Checklist
```bash
# ✓ Environment variables configured
# ✓ API endpoints working
# ✓ Email service active
# ✓ Authentication flow complete
# ✓ Error boundary working
# ✓ Build optimization done
# ✓ Performance acceptable (<500KB)
```

---

## Phase 7: Deploy to Production (20 minutes)

### Option A: Deploy to Vercel

#### Step 1: Connect Repository
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### Step 2: Set Environment Variables
```bash
vercel env add VITE_API_URL
# Enter: https://your-domain.com/api

vercel env add SENDGRID_API_KEY
# Enter: your-production-api-key

vercel env add JWT_SECRET
# Enter: your-production-secret

vercel env add CSRF_SECRET
vercel env add PASSWORD_SALT
# Enter your values
```

#### Step 3: Deploy
```bash
# Deploy to staging
vercel deploy

# Deploy to production
vercel deploy --prod
```

### Option B: Deploy to Netlify

#### Step 1: Connect Repository
```bash
# Go to netlify.com
# Click "New site from Git"
# Connect your repository
```

#### Step 2: Configure Build
```
Build command: npm run build
Publish directory: dist
```

#### Step 3: Set Environment Variables
```
Site Settings → Build & Deploy → Environment
Add all variables from ENV_SETUP.md
```

#### Step 4: Deploy
```bash
# Netlify auto-deploys on git push
# Or manually: netlify deploy --prod
```

---

## Phase 8: Post-Deployment Verification (15 minutes)

### Step 1: Test Endpoints
```bash
# Test OTP endpoint
curl -X POST https://your-domain.com/api/auth?action=send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Should return: { ok: true, message: "OTP sent..." }
```

### Step 2: Test UI
```bash
# 1. Visit https://your-domain.com
# 2. Click "Login"
# 3. Enter test email
# 4. Verify OTP flow works
# 5. Test create account
# 6. Verify session stored
```

### Step 3: Monitor Performance
```bash
# Check Vercel/Netlify dashboard
# - Load time: <2 seconds
# - Error rate: <0.1%
# - CPU usage: <50%
```

### Step 4: Email Verification
```bash
# 1. Send test OTP
# 2. Check email (spam folder)
# 3. Verify format correct
# 4. Verify no sensitive data
# 5. Click all links work
```

---

## Phase 9: Production Hardening (30 minutes)

### Security Hardening
```bash
# 1. Rotate JWT_SECRET every 90 days
# 2. Monitor failed login attempts
# 3. Implement rate limiting
# 4. Enable email verification
# 5. Add 2FA (future enhancement)
```

### Performance Optimization
```bash
# 1. Enable caching headers
# 2. Compress responses (gzip)
# 3. Lazy load components
# 4. Optimize images
# 5. Use CDN for static assets
```

### Monitoring Setup
```bash
# 1. Install error tracking (Sentry)
# 2. Set up analytics (Mixpanel)
# 3. Monitor API performance
# 4. Set up uptime alerts
# 5. Configure log aggregation
```

---

## Phase 10: Maintenance Plan

### Weekly Tasks
- [ ] Review error logs
- [ ] Check failed login attempts
- [ ] Verify email delivery
- [ ] Test backup procedures

### Monthly Tasks
- [ ] Security audit
- [ ] Performance review
- [ ] Dependency updates
- [ ] Backup verification

### Quarterly Tasks
- [ ] Rotate secrets/keys
- [ ] Security assessment
- [ ] Capacity planning
- [ ] Feature releases

---

## Troubleshooting Guide

### OTP Not Sending
```bash
# 1. Check email service credentials
cat .env.local | grep EMAIL

# 2. Check API logs
vercel logs --tail

# 3. Verify email service status
# - SendGrid: sendgrid.com/status
# - Gmail: support.google.com

# 4. Test email directly
node -e "
require('nodemailer').createTransport({
  service: 'sendgrid',
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
}).sendMail({
  to: 'test@example.com',
  from: 'noreply@vitalwaveone.com',
  subject: 'Test',
  text: 'Test email'
}).then(() => console.log('Email sent'))
"
```

### Login Not Working
```bash
# 1. Check browser console for errors
# DevTools → Console tab

# 2. Check Network tab
# Verify /api/auth requests succeed

# 3. Check localStorage
console.log(localStorage);
// Should have: csrf_token, auth_token, user_email

# 4. Check server logs
vercel logs --tail
```

### Build Failing
```bash
# 1. Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 2. Check for TypeScript errors
npm run build -- --verbose

# 3. Review build logs
vercel logs

# 4. Check for circular dependencies
npm ls
```

---

## Quick Reference

### Common Commands
```bash
# Development
npm run dev              # Start local server
npm run build            # Create production build
npm run preview          # Preview production build

# Deployment
vercel deploy --prod     # Deploy to production
vercel logs --tail       # View logs
vercel env list          # List environment variables

# Testing
npm test                 # Run tests
npm run lint             # Check code quality
```

### File Locations
```
src/OtpLogin.jsx         # Login component
src/ErrorBoundary.jsx    # Error boundary
src/utils/sanitize.js    # Input validation
src/App.jsx              # Admin dashboard
src/OrderPortal.jsx      # Customer portal

api/auth.js              # Auth endpoints
api/email.js             # Email service
api/db.js                # Data endpoints

docs/
├── ENV_SETUP.md         # Environment configuration
├── IMPLEMENTATION_STEPS.md (this file)
├── DEPLOYMENT_CHECKLIST.md
└── API_MIGRATION_GUIDE.md
```

---

## Support & Resources

### Documentation
- [Environment Setup](./ENV_SETUP.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [API Documentation](./API_MIGRATION_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

### External Resources
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [SendGrid API](https://docs.sendgrid.com)
- [React Documentation](https://react.dev)

### Getting Help
```
Email: support@vitalwaveone.com
Phone: 317-509-6262
GitHub Issues: your-repo/issues
```

---

## Completion Checklist

Phase 1: Local Setup
- [ ] Environment configured
- [ ] Dependencies installed
- [ ] Dev server running

Phase 2: Component Verification
- [ ] All files present
- [ ] Imports working
- [ ] No build errors

Phase 3: Authentication
- [ ] OTP sending works
- [ ] OTP verification works
- [ ] Login flow complete

Phase 4: Security
- [ ] CSRF tokens generated
- [ ] Input sanitization working
- [ ] Password validation enforced

Phase 5: Features
- [ ] Customer portal functional
- [ ] Admin dashboard working
- [ ] Error handling in place

Phase 6: Build
- [ ] Production build created
- [ ] Build size acceptable
- [ ] Build preview working

Phase 7: Deployment
- [ ] Code deployed
- [ ] Environment variables set
- [ ] All endpoints accessible

Phase 8: Verification
- [ ] OTP flow works in production
- [ ] UI rendering correctly
- [ ] Performance acceptable
- [ ] Emails delivering

Phase 9: Hardening
- [ ] Security measures implemented
- [ ] Performance optimized
- [ ] Monitoring configured

Phase 10: Maintenance
- [ ] Weekly tasks scheduled
- [ ] Monthly review process defined
- [ ] Quarterly planning done

---

**Congratulations! VitalWaveOne is now production-ready.**

For ongoing maintenance, see the Maintenance Plan section above.
