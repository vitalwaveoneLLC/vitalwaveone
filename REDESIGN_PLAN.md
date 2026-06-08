# VitalWave Wholesale Platform - Redesign Plan

**Updated:** June 2, 2026
**Domain:** vitalwaveone.com
**Status:** In Progress

## Overview
Complete redesign of VitalWave project following Wholesale Platform App Documentation specifications with updated branding.

---

## Phase 1: Cleanup (CLEANUP_FILES_TO_DELETE.txt)
Delete 77+ obsolete documentation files from root directory:
- All AUDIT, DEPLOYMENT, BUILD, CHAT, FIX, CODE review files
- All status and summary files
- All migration and integration guides
- Keep: ARCHITECTURE.md, .env.example, .gitignore, package.json, src/, api/, lib/

**Files to Keep:**
- .env.example
- .gitignore
- .babelrc
- package.json
- package-lock.json
- src/ (full directory)
- api/ (full directory)
- lib/ (full directory)
- migrations/ (if needed)
- node_modules/ (dependencies)
- .git/ (version control)
- .github/ (CI/CD)
- .vercel/ (deployment)

---

## Phase 2: Brand Update to vitalwaveone.com
### Update all references:
1. **localStorage keys:** `vitalwaveone_admin`, `vitalwaveone_session`
2. **API endpoints:** `/api/vitalwaveone/*`
3. **Domain:** vitalwaveone.com
4. **Company name:** VitalWave Wholesale Platform
5. **Logo/assets:** Update with vitalwaveone branding

---

## Phase 3: Architecture per Documentation

### Admin Portal (App.jsx)
- [ ] Inventory Management Tab
- [ ] Truck Management Tab (with live map)
- [ ] IRS Reports Tab
- [ ] Invoices Tab (with status filters)
- [ ] Financial Tab (KPIs, P&L)
- [ ] Security & Privacy Settings (MFA/OTP)
- [ ] Purchase PO & Suppliers Tab
- [ ] Return Checks Tab
- [ ] Data Backup Tab
- [ ] Customers Tab
- [ ] Expenses & Equity Tab

### Ordering Portal (OrderPortal.jsx)
**Three User Types:**
1. **Customers**
   - Place orders & create invoices
   - View/download invoice PDFs
   - Payment options (card, check, cash, pay later)

2. **Drivers (Sales Personnel)**
   - Truck loading & inventory management
   - Daily route management with live map
   - Order & sales processing
   - Barcode scanning
   - Payment collection
   - Expense tracking

3. **Walk-in Staff**
   - Invoice creation
   - Barcode scanning
   - Real-time shelf inventory updates
   - Payment processing

### Landing Page (LandingPage.jsx)
- Subscription tier selection (Standard, Premium, Diamond)
- Stripe payment integration
- Company & admin registration flow
- Document/logo upload

### Security Requirements
- Admin: MFA/OTP, 10-min auto-logout
- Ordering: Face recognition (with OTP fallback), 15-min auto-logout
- Session management across all portals

---

## Phase 4: UI/UX Updates
- Modern, clean design
- Full mobile responsiveness (iOS, Android)
- Table display with pagination, sorting, search, filters
- Consistent visual hierarchy
- Touch-friendly interface

---

## Phase 5: Database & API Updates
- Multi-tenant architecture (per company)
- Neon Database integration
- Stripe payment processing
- Real-time inventory sync
- Live map/GPS tracking

---

## Implementation Status
- [ ] Phase 1: File Cleanup
- [ ] Phase 2: Brand Updates
- [ ] Phase 3: Architecture Refactor
- [ ] Phase 4: UI/UX Redesign
- [ ] Phase 5: Database Setup
- [ ] Testing & Deployment

---

## Files to Modify
1. `src/main.jsx` - Update brand keys, routing
2. `src/App.jsx` - Redesign admin portal
3. `src/OrderPortal.jsx` - Redesign ordering portal
4. `src/LandingPage.jsx` - Subscription & registration
5. `src/LoginPage.jsx` - Authentication
6. `src/OtpLogin.jsx` - OTP handling
7. `package.json` - Update dependencies
8. `.env.example` - Update environment variables
9. API routes in `api/` - Update endpoints

---

## Next Steps
1. Delete obsolete documentation files
2. Update branding throughout codebase
3. Refactor App.jsx according to admin portal specs
4. Refactor OrderPortal.jsx for three user types
5. Update LandingPage.jsx for subscription flow
6. Implement responsive design
7. Update API endpoints
8. Test all functionality
