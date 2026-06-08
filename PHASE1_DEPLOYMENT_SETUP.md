# Phase 1 - Deployment Setup Guide

## 🚀 Complete Setup Instructions

### Step 1: Vercel Environment Variables

Add these to **Vercel Project Settings → Environment Variables**:

```
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key
VITE_API_URL=https://vitalwaveone-api.vercel.app/api
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
STRIPE_SECRET_KEY=sk_test_your_key (Backend only)
DATABASE_URL=postgresql://... (Backend only)
SMTP_USER=your_email@gmail.com (Backend only)
SMTP_PASS=your_app_password (Backend only)
JWT_SECRET=minimum_32_character_secret_key (Backend only)
```

### Step 2: Frontend Vercel Deployment

**vitalwaveone.vercel.app** is configured with:
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework: Vite React
- Node Version: 18.x

**Automatic deploys** on `git push origin main`

### Step 3: Backend Vercel Deployment

**vitalwaveone-api.vercel.app** needs setup:

1. Create new Vercel project
2. Connect `vitalwaveone` GitHub repo
3. Set Root Directory: `.` (if using same repo) or `api/`
4. Add environment variables (DB, SMTP, Stripe, JWT)
5. Build Command: `npm run build`
6. Start Command: `npm start`

### Step 4: Database Setup (Neon PostgreSQL)

1. Go to **neon.tech**
2. Create new project
3. Copy connection string
4. Add to `.env.local` and Vercel:
   ```
   DATABASE_URL=postgresql://user:pass@host.neon.tech/database
   ```
5. Run migration:
   ```bash
   psql $DATABASE_URL < migrations/0004_create_company_registration.sql
   ```

### Step 5: Email Configuration (Gmail)

1. **Enable 2-Factor Authentication** on Gmail
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Copy 16-character password
3. **Add to environment**:
   ```
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=xxxxxxxxxxxxxxxx
   ```

### Step 6: Stripe Keys

1. Go to **Stripe Dashboard** → Keys
2. Copy **Publishable Key** → `VITE_STRIPE_PUBLIC_KEY`
3. Copy **Secret Key** → `STRIPE_SECRET_KEY`

### Step 7: Google Maps API

1. Go to **Google Cloud Console**
2. Enable Maps JavaScript API
3. Create API Key
4. Copy to `VITE_GOOGLE_MAPS_API_KEY`

---

## ✅ Verification Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend API deployed to Vercel
- [ ] Database migration completed
- [ ] Environment variables set in Vercel
- [ ] Stripe keys configured
- [ ] Gmail app password generated
- [ ] API health endpoint responding
- [ ] Landing page loads
- [ ] Get Started button opens payment form
- [ ] OTP email sends successfully

---

## 🔗 Links to Check

```
Frontend: https://vitalwaveone.vercel.app
Backend Health: https://vitalwaveone-api.vercel.app/health
Backend API: https://vitalwaveone-api.vercel.app/api
Admin Portal: https://vitalwaveone.vercel.app/admin
Admin Ordering Platform Tab: https://vitalwaveone.vercel.app/admin (first tab)
Order Portal: https://vitalwaveone.vercel.app/order
Unique Staff Link Access: https://vitalwaveone.vercel.app/order/[unique_link_code]
Login: https://vitalwaveone.vercel.app/login
```

## 📋 Ordering Platform Link Feature

After successful payment:
1. Admin receives unique company-specific ordering link
2. Admin can access link from admin dashboard → "🔗 Ordering Platform" tab
3. Admin can copy, regenerate, enable/disable the link
4. Staff access the ordering portal via: `/order/[unique_link_code]`
5. Unique link automatically validates company and redirects to ordering portal

### API Endpoints for Ordering Links:
```
POST /api/company/:companyId/ordering-link                    - Create/get link
GET /api/company/:companyId/ordering-link                     - Fetch link
POST /api/company/:companyId/ordering-link/disable           - Disable link
POST /api/company/:companyId/ordering-link/enable            - Enable link
GET /api/validate-ordering-link/:link                         - Validate unique link
```

---

## 📞 Support

If deployment fails:

1. Check **Vercel Build Logs**
2. Verify **Environment Variables**
3. Check **Database Connection**
4. Test **Email Configuration**
5. Verify **API Endpoints** are responding

---

## 🎉 Phase 1 Complete!

All systems operational. Ready for Phase 2.
