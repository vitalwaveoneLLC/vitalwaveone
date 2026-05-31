# VitalWaveOne Modern Edition - Deployment Guide

## What's New in This Build

✅ **Modern UI/UX Redesign**
- Clean Minimalist design with glassmorphism effects
- Professional typography (Inter font family)
- Smooth transitions and animations
- Responsive layout for all screen sizes

✅ **Google Maps Integration**
- Live truck tracking on interactive map
- Customer location visualization
- Real-time GPS positioning support
- Zoom-to-customer-location functionality
- Info windows for truck/customer details

✅ **Truck Management Dashboard**
- Real-time truck status display
- Driver assignment management
- Live tracking indicators
- Add/Edit/Delete truck operations

✅ **Key Performance Indicators**
- Total Revenue tracking
- Accounts Receivable monitoring
- Active Customers count
- Active Trucks count

## Deployment Steps

### Step 1: Update Environment Variables

In your Vercel project settings, add:

```
DATABASE_URL=postgresql://user:pass@host/db
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
META_PHONE_NUMBER_ID=your_phone_id
META_ACCESS_TOKEN=your_access_token
VITE_STRIPE_PUBLIC_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
R2_ACCOUNT_ID=account_id
R2_ACCESS_KEY_ID=key_id
R2_SECRET_ACCESS_KEY=secret
R2_BUCKET_NAME=vitalwaveone
```

### Step 2: Local Build Testing

Before deploying, test locally:

```bash
npm install
npm run build
npm run preview
```

If build fails with Vite issues, try:

```bash
npm install vite@5.4.0 --save-dev
npm run build
```

### Step 3: Deploy to Vercel

```bash
vercel deploy --prod
```

Or push to GitHub and connect to Vercel:

```bash
git add .
git commit -m "Modern redesign with Google Maps"
git push origin main
```

### Step 4: Configure Google Maps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create API key with these APIs enabled:
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
3. Add your Vercel domain to API key restrictions
4. Add key to Vercel environment variables as `VITE_GOOGLE_MAPS_API_KEY`
5. Redeploy

### Step 5: Test the Application

1. Navigate to your domain
2. Click "Sign in" (or test with landing page)
3. Enter your phone number (test: +13175096262)
4. Check WhatsApp for OTP
5. Verify admin credentials
6. Explore the dashboard:
   - **Dashboard tab**: View KPIs
   - **Truck Management**: Add trucks with driver info
   - **Live Map**: See truck/customer locations (placeholder until Google Maps API added)
   - **Customers**: View customer list
   - **Sales**: View invoices

## File Structure

```
vitalwaveone/
├── src/
│   ├── App.jsx              ← Main dashboard (3000+ lines, modern design)
│   ├── LoginPage.jsx         ← WhatsApp OTP login
│   ├── LandingPage.jsx       ← Marketing landing page
│   ├── db.js                 ← Neon PostgreSQL abstraction
│   └── main.jsx              ← Entry point
├── api/
│   ├── functions/[fn].js     ← Serverless functions (send-otp, etc)
│   └── auth.js               ← WhatsApp OTP authentication
├── public/
│   ├── index.html
│   └── service-worker.js
├── vite.config.js
├── vercel.json               ← Vercel routing config
├── package.json
└── GOOGLE_MAPS_SETUP.md      ← Google Maps setup instructions
```

## Key Features Implemented

### Authentication
- WhatsApp OTP login with 2-stage verification
- 8-hour session expiry
- Admin role verification
- Multi-tenant support

### Dashboard
- 16 data management tabs (Sales, Customers, Trucks, etc.)
- Real-time KPI calculations
- Responsive card-based layout
- Modern styling with gradients

### Truck Management
- Live location tracking (placeholder)
- Driver assignment
- Status indicators
- CRUD operations

### Maps
- Google Maps integration ready
- Truck location markers
- Customer location pins
- Interactive info windows
- Zoom controls

### Data Management
- Sales invoice tracking
- Customer management
- Product inventory
- Recurring orders
- P&L reporting
- A/R tracking
- Tax calculations (state-based)

## Troubleshooting

### Build Fails with "No such file or directory"
- Delete `dist` folder
- Clear `node_modules/.vite`
- Run `npm install` again
- Try downgrading Vite: `npm install vite@5.4.0 --save-dev`

### Maps Not Loading
- Verify Google Maps API key is added to env vars
- Check browser console for errors
- Ensure APIs are enabled in Google Cloud Console
- Confirm domain is in API key restrictions

### Login Not Working
- Check that Meta WhatsApp API credentials are configured
- Verify phone number is registered as admin in database
- Check OTP code expiry (10 minutes)
- Test with phone +1 (317) 509-6262 (demo)

### Blank Page After Login
- Check browser localStorage for `vitalwaveone_admin` session
- Verify session hasn't expired
- Check /app route in browser (should redirect to /app automatically)
- Clear localStorage and try again

## Performance Optimization

The modern build includes:
- Tree-shaking for unused code
- CSS-in-JS optimization
- Lazy component loading
- Image optimization (via Vercel)
- Caching strategy for static assets

## Support

For issues:
1. Check browser console (F12)
2. Check Vercel logs: `vercel logs --prod`
3. Check database connection in `.env`
4. Verify all API keys are correctly set

## Next Steps

After deployment:
1. Set up Google Maps API key
2. Test WhatsApp OTP delivery
3. Configure Stripe payment processing
4. Set up database backups
5. Enable SSL/TLS monitoring
6. Configure CDN for media files

---

**Built with:** React 19.2.5, Vite 8.0.10, Neon PostgreSQL, Vercel Functions
**UI Framework:** Custom Glassmorphism Design System
**Authentication:** WhatsApp Business API OTP
**Maps:** Google Maps API (configurable)
