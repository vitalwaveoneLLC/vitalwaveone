# Ordering Platform Link - Implementation Summary

## Overview
Unique, shareable links for staff to access the ordering platform without authentication. Each company gets a company-specific link after payment is completed.

## Architecture

### 1. **Backend Components**

#### `api/ordering-link.js`
Central API for managing ordering platform links:
- `generateOrderingLink()` - Creates unique link code (format: `order_[random_hex]`)
- `createOrderingLink(req, res)` - POST `/api/company/:companyId/ordering-link` - Create/get link
- `getOrderingLink(req, res)` - GET `/api/company/:companyId/ordering-link` - Fetch existing link
- `disableOrderingLink(req, res)` - POST `/api/company/:companyId/ordering-link/disable` - Disable access
- `enableOrderingLink(req, res)` - POST `/api/company/:companyId/ordering-link/enable` - Re-enable access
- `validateOrderingLink(req, res)` - GET `/api/validate-ordering-link/:link` - Validate and return company info

#### `api/payment.js` (Updated)
- Now imports `generateOrderingLink` from `ordering-link.js`
- `saveCompanyRegistration()` automatically generates ordering link on payment success
- Stores link in `ordering_platform_link` column
- Sets `staff_link_created_at` timestamp

#### `api/index.js` (Updated)
Added 5 new routes for ordering link management:
```javascript
router.post('/company/:companyId/ordering-link', createOrderingLink);
router.get('/company/:companyId/ordering-link', getOrderingLink);
router.post('/company/:companyId/ordering-link/disable', disableOrderingLink);
router.post('/company/:companyId/ordering-link/enable', enableOrderingLink);
router.get('/validate-ordering-link/:link', validateOrderingLink);
```

### 2. **Database Schema**

#### Migration: `migrations/0005_add_ordering_platform_links.sql`
Added columns to `companies` table:
- `ordering_platform_link` (VARCHAR 255, UNIQUE) - The unique shareable URL code
- `ordering_platform_password` (VARCHAR 255, nullable) - Optional password protection
- `staff_link_created_at` (TIMESTAMP) - When link was created
- `staff_link_expires_at` (TIMESTAMP, nullable) - Optional expiration date
- `staff_link_active` (BOOLEAN, DEFAULT true) - Enable/disable link

Index created for fast link lookup:
```sql
CREATE INDEX idx_companies_ordering_platform_link ON companies(ordering_platform_link);
```

### 3. **Frontend Components**

#### `src/components/AdminTabs/OrderingPlatformTab.jsx`
Admin dashboard tab for managing ordering platform links:

**Features:**
- Display current ordering link with full URL preview
- Copy-to-clipboard button with visual feedback
- Link status badge (Active/Disabled)
- Regenerate link button (creates new unique link)
- Enable/Disable buttons (toggle access without changing link)
- Instructional info cards with Share & Link Management tips

**Flow:**
1. Load link on component mount
2. If no link exists, option to create one
3. Display full sharable URL: `https://vitalwaveone.vercel.app/order/order_[hex]`
4. Copy, regenerate, or toggle status as needed

#### `src/pages/OrderingPlatformAccess.jsx`
Landing page for unique link access:

**Flow:**
1. Staff visits: `/order/[unique_link_code]`
2. Component validates link via API
3. If valid: shows company name, stores session, redirects to ordering portal
4. If invalid/disabled: shows error message
5. Session stored includes: `companyId`, `companyName`, `link`, `timestamp`

#### `src/AppAdminIntegrated.jsx` (Updated)
- Imported `OrderingPlatformTab` component
- Added "🔗 Ordering Platform" as first tab in admin dashboard
- Passes `companyId` from session to tab component
- Retrieves `companyId` from localStorage admin session

#### `src/main.jsx` (Updated)
- Imported `OrderingPlatformAccess` component
- Added route pattern matching: `/order/[a-zA-Z0-9_]+` detects unique links
- Routes unique links to validation page before ordering portal
- Handles success (redirect to `/order`) and error (redirect to `/login`)

## User Flow

### For Admin (Creating & Managing Link):
1. Admin logs in → Admin Dashboard
2. Clicks "🔗 Ordering Platform" tab (first tab)
3. System creates unique link on first load OR shows existing link
4. Admin copies the full URL: `https://vitalwaveone.vercel.app/order/order_abc123...`
5. Admin can:
   - **Copy** - Get URL for sharing
   - **Regenerate** - Create new link (old one becomes invalid)
   - **Enable/Disable** - Toggle access without changing link
   - **View Full URL** - Show complete shareable link

### For Staff (Accessing Portal):
1. Staff receives link from admin: `https://vitalwaveone.vercel.app/order/order_abc123...`
2. Staff clicks link or pastes in browser
3. System validates link → shows company name
4. Redirects to ordering portal (`/order`) with company context
5. Staff places orders without account creation

## API Integration

### Creating Link (On Payment Success)
```javascript
// In payment.js saveCompanyRegistration()
const orderingLink = generateOrderingLink();
// Insert with ordering_platform_link = orderingLink
```

### Admin Fetching Link
```javascript
// GET /api/company/:companyId/ordering-link
const response = await fetch(
  `${API_URL}/company/${companyId}/ordering-link`
);
const data = await response.json();
// Returns: { link, fullUrl, active }
```

### Validating Unique Link
```javascript
// GET /api/validate-ordering-link/:link
const response = await fetch(
  `${API_URL}/validate-ordering-link/${uniqueLink}`
);
const data = await response.json();
// Returns: { companyId, companyName, valid: true }
```

### Toggling Link Status
```javascript
// POST /api/company/:companyId/ordering-link/disable
// POST /api/company/:companyId/ordering-link/enable
const response = await fetch(
  `${API_URL}/company/${companyId}/ordering-link/disable`,
  { method: 'POST' }
);
```

## Security Features

1. **Unique Link Generation** - Cryptographically random hex string
2. **Link Validation** - API checks if link exists and is active
3. **Status Toggle** - Admins can disable links without deletion
4. **Session Isolation** - Separate `ordering_session` from admin session
5. **Link Expiration** (future) - Optional expiry date via `staff_link_expires_at`
6. **Password Protection** (future) - Optional via `ordering_platform_password`

## Testing Checklist

- [ ] Create new company via payment flow
- [ ] Verify ordering link is generated automatically
- [ ] Access admin dashboard "Ordering Platform" tab
- [ ] View ordering link with full URL
- [ ] Copy link to clipboard
- [ ] Visit unique link URL directly
- [ ] Validate link page shows company name
- [ ] Verify redirect to ordering portal works
- [ ] Test regenerating link (old link becomes invalid)
- [ ] Test disabling link (access denied)
- [ ] Test enabling disabled link (access restored)
- [ ] Try invalid/fake link (error page)
- [ ] Verify session storage has correct company info

## Future Enhancements

1. **Link Expiration** - Auto-expire links after set time period
2. **Password Protection** - Optional password for additional security
3. **Access Logs** - Track who accessed via link and when
4. **Multi-level Sharing** - Generate sub-links for departments/regions
5. **QR Code** - Generate QR code for easy sharing via mobile
6. **Analytics** - Track ordering volume from each company link

## Files Modified/Created

### New Files
- `api/ordering-link.js` - Ordering link management
- `src/components/AdminTabs/OrderingPlatformTab.jsx` - Admin UI for links
- `src/pages/OrderingPlatformAccess.jsx` - Link validation page

### Modified Files
- `api/payment.js` - Auto-generate link on payment success
- `api/index.js` - Added 5 new routes
- `migrations/0005_add_ordering_platform_links.sql` - Database schema
- `src/AppAdminIntegrated.jsx` - Added new tab
- `src/main.jsx` - Added routing for unique links
- `PHASE1_DEPLOYMENT_SETUP.md` - Updated documentation

## Deployment Steps

1. Push code to GitHub
2. Run migration in Neon: `psql $DATABASE_URL < migrations/0005_add_ordering_platform_links.sql`
3. Deploy backend to Vercel
4. Deploy frontend to Vercel
5. Test feature from beginning to end

## Environment Variables Required

None new - uses existing `VITE_API_BASE_URL` and `DATABASE_URL`
