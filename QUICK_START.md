# Quick Start - VitalWaveOne Modern Edition

## 🚀 30-Second Deploy

### Option 1: Push to Vercel (Recommended)

```bash
# 1. Ensure your environment variables are set in Vercel dashboard
vercel env ls  # Check current variables

# 2. Deploy
vercel deploy --prod

# 3. That's it! Your modern app is live
```

### Option 2: Local Testing First

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 What You Get

After deployment, you'll have:

- ✅ Modern purple-gradient interface
- ✅ WhatsApp OTP admin login
- ✅ Dashboard with KPIs (Revenue, AR, Customers, Trucks)
- ✅ Truck management system with live tracking
- ✅ Customer and sales tracking
- ✅ Interactive maps (placeholder until Google Maps API added)
- ✅ Professional responsive design
- ✅ Smooth animations and transitions

## 🗺️ Next: Set Up Google Maps (10 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project named "VitalWaveOne"
3. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
4. Create an API Key
5. Restrict it to your domain
6. Add to Vercel: `VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE`
7. Redeploy: `vercel deploy --prod`

**Detailed guide:** See `GOOGLE_MAPS_SETUP.md`

## 🧪 Test the Application

1. **Navigate to your domain**
   - Example: `https://vitalwaveone.com`

2. **See landing page**
   - Click "Sign In"

3. **Test login**
   - Enter phone: `+1 (317) 509-6262` (test number)
   - Click "Send WhatsApp code"
   - In development: code displays on screen
   - In production: code sent via WhatsApp

4. **Explore dashboard**
   - Dashboard tab: View KPIs
   - Truck Management: Add trucks
   - Live Map: See truck locations (after Google Maps)
   - Customers: Customer list
   - Sales: Invoice tracking

## 📋 Environment Variables Checklist

Before deploying, ensure these are in Vercel:

```
✓ DATABASE_URL
✓ VITE_GOOGLE_MAPS_API_KEY (optional, adds Google Maps)
✓ META_PHONE_NUMBER_ID (WhatsApp)
✓ META_ACCESS_TOKEN (WhatsApp)
✓ VITE_STRIPE_PUBLIC_KEY (if using Stripe)
✓ STRIPE_SECRET_KEY (if using Stripe)
```

Missing any? See `DEPLOYMENT_GUIDE.md`

## 🎨 Customize the Design

To change colors, edit `src/App.jsx` and find the `GlobalStyles` component:

```javascript
// Change primary color from purple to your brand color
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
// Change to: #your_color_1 and #your_color_2

// Change text colors
color: #1a202c;  // Dark slate - change to your preference

// Change success green
#10b981  // Green accent color
```

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ 🚚 VitalWaveOne WMS          [Admin Name] [Logout]      │
├─────────────────────────────────────────────────────────┤
│ [Dashboard] [Truck Mgmt] [Customers] [Sales] [Live Map] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Revenue  │  │    AR    │  │Customers│              │
│  │  $100K   │  │  $50K    │  │   25    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  ┌───────────────────────────────────────────────┐    │
│  │ Trucks Table                                   │    │
│  │ Driver | Truck Name | Phone | Status | Action│    │
│  │ John   | Box Truck  | +1... | ✓ Live | Edit │    │
│  │ Sarah  | Van        | +1... | ✓ Live | Edit │    │
│  └───────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Admin Credentials

Test login phone: `+1 (317) 509-6262`

Make sure this phone is registered in your database as admin:

```sql
INSERT INTO profiles (phone, full_name, role, tenant_id)
VALUES ('+13175096262', 'Admin User', 'admin', 'your-tenant-id');
```

## 🆘 Troubleshooting

### "Blank page after login"
- Check browser console (F12)
- Ensure session in localStorage is valid
- Clear cookies and try again

### "Maps not showing"
- Need Google Maps API key
- Add to environment variables
- Check browser console for errors

### "WhatsApp code not received"
- Check Meta account has payment method
- Template must be approved by Meta
- Check phone number is correct

### "Build fails locally"
- Try: `npm install vite@5.4.0 --save-dev`
- Delete `node_modules` and `npm install`
- But Vercel build should always work!

## 📞 Support Resources

- Google Maps: `GOOGLE_MAPS_SETUP.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
- Code Details: `MODERN_REBUILD_SUMMARY.md`
- Full Build Summary: This file

## ✅ Deployment Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Database connected and populated
- [ ] WhatsApp phone number registered as admin
- [ ] Google Maps API key generated (optional but recommended)
- [ ] Stripe keys added (if payments enabled)
- [ ] Domain configured in Vercel
- [ ] SSL certificate active
- [ ] Test login works with test phone
- [ ] Dashboard loads and displays KPIs
- [ ] Mobile view is responsive

## 🎉 You're Ready!

Your modern VitalWaveOne app is production-ready. Deploy with:

```bash
vercel deploy --prod
```

Monitor the build at: `https://vercel.com/dashboard`

---

**Built with ❤️**  
React 19.2.5 | Vite 8.0.10 | Modern Glassmorphism Design

Questions? See the documentation files included in this folder.
