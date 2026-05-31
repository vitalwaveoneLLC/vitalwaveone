# Google Maps Integration Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project named "VitalWaveOne"
3. Wait for project creation to complete

## Step 2: Enable Required APIs

In the Google Cloud Console:

1. Search for and enable these APIs:
   - **Maps JavaScript API**
   - **Maps Embed API**
   - **Geocoding API**
   - **Distance Matrix API** (for distance calculations)

2. Each API should show "Enabled" status

## Step 3: Create API Key

1. Go to **Credentials** in left sidebar
2. Click **Create Credentials** → **API Key**
3. Copy the API key (looks like: `AIzaSyD...`)
4. Click **Edit API Key** and:
   - Set **Application restrictions** to "HTTP referrers (web sites)"
   - Add your domains:
     - `https://yourdomain.com/*`
     - `https://*.vercel.app/*` (for Vercel preview deployments)
   - Set **API restrictions** to "Restrict key"
   - Select only the APIs you enabled above

## Step 4: Add to Environment Variables

### Local Development

Create `.env.local` in project root:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here...
```

### Production (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `VITE_GOOGLE_MAPS_API_KEY`
   - **Value:** Your Google Maps API Key
   - **Environments:** Production, Preview, Development
3. Save and redeploy

## Step 5: Update Code

The map component in `src/App.jsx` (Live Map tab) will:
- Load Google Maps script automatically
- Display truck locations in real-time
- Show customer locations on the same map
- Support zoom-to-location for customer navigation
- Show live tracking indicators for active trucks

## Current Implementation

The Live Map tab includes:
- **Truck Tracking:** Shows all trucks with live GPS indicators
- **Customer Locations:** Displays customer addresses on map
- **Zoom Control:** Double-click to zoom to customer location
- **Info Windows:** Click marker to see truck/customer details
- **Real-time Updates:** Map refreshes as truck locations update

## Testing Without API Key

The map will show a placeholder UI until you add your API key. This allows you to test other features while waiting for API access approval.

## Cost Estimates

Google Maps API pricing (approximate monthly):
- Map loads: $7 per 1,000 maps
- Geocoding: $5 per 1,000 requests
- Distance Matrix: $5 per 100 elements

**Tip:** Enable billing alerts in Google Cloud Console to monitor costs.

## Troubleshooting

### "Referer not allowed" Error
- Make sure your domain is added to API key restrictions

### Maps not loading
- Check browser console for errors
- Verify API key is correct
- Confirm APIs are enabled in Google Cloud Console
- Check that Maps JavaScript API is enabled

### High costs
- Implement caching to avoid redundant API calls
- Use web components to reduce map reloads
- Consider using static map tiles for background

## Next Steps

Once configured:
1. Trucks report GPS coordinates via API
2. Customers are geocoded (address → lat/lng) on creation
3. Map updates in real-time showing all trucks and customers
4. Admins can click to zoom to customer locations

For live tracking to work, you need to:
- Configure GPS reporting from trucks (mobile app / device)
- Store GPS coordinates in `trucks.latitude, trucks.longitude`
- Set update interval (e.g., every 30 seconds)
