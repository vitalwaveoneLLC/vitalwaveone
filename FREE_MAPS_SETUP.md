# Free Maps Setup - OpenStreetMap + Leaflet

## Why OpenStreetMap?

✅ **Completely Free** - No API key required, no costs  
✅ **Open Source** - Community-driven, transparent  
✅ **Full Featured** - Markers, popups, routing, etc.  
✅ **No Rate Limits** - Use as much as you need  
✅ **Privacy Friendly** - Data stays on your servers  
✅ **Works Offline** - Can cache tiles locally  

**Cost: $0/month forever**

---

## Option 1: Leaflet + OpenStreetMap (Recommended)

### Step 1: Install Leaflet

```bash
npm install leaflet
```

### Step 2: Create Map Component

Add this to `src/App.jsx` in the MapView component:

```javascript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

const MapView = ({ trucks, customers }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map centered on first customer or default to USA
    const centerLat = customers[0]?.latitude || 39.8283;
    const centerLng = customers[0]?.longitude || -98.5795;

    // Create map
    const map = L.map(mapRef.current).setView([centerLat, centerLng], 5);

    // Add OpenStreetMap tiles (FREE)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add truck markers (red)
    trucks.forEach(truck => {
      if (truck.latitude && truck.longitude) {
        L.circleMarker([truck.latitude, truck.longitude], {
          radius: 8,
          fillColor: '#ef4444',
          color: '#991b1b',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).bindPopup(`
          <div style="font-size: 12px; font-weight: 600;">
            🚚 ${truck.driver}<br/>
            ${truck.name}<br/>
            <span style="color: #10b981;">● Live</span>
          </div>
        `).addTo(map);
      }
    });

    // Add customer markers (blue)
    customers.forEach(customer => {
      if (customer.latitude && customer.longitude) {
        L.marker([customer.latitude, customer.longitude], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).bindPopup(`
          <div style="font-size: 12px;">
            📍 ${customer.name}<br/>
            ${customer.city}, ${customer.state || 'N/A'}<br/>
            ${customer.phone || 'N/A'}
          </div>
        `).addTo(map);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [trucks, customers]);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
        🗺️ Live Truck Tracking & Customer Map (FREE - OpenStreetMap)
      </h3>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: 600,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1)',
          marginBottom: 24
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
        <div>
          <label>Active Trucks: {trucks.length}</label>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 6 }}>
            {trucks.length === 0 ? (
              <span style={{ color: '#94a3b8', fontSize: 12 }}>No trucks assigned</span>
            ) : (
              trucks.slice(0, 5).map((t, i) => (
                <div key={i} style={{ fontSize: 12, color: '#475569', paddingBottom: 6 }}>
                  🚚 {t.driver} - {t.name} <span style={{ color: '#10b981' }}>● Live</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <label>Customer Locations: {customers.length}</label>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 6 }}>
            {customers.length === 0 ? (
              <span style={{ color: '#94a3b8', fontSize: 12 }}>No customers</span>
            ) : (
              customers.slice(0, 5).map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: '#475569', paddingBottom: 6 }}>
                  📍 {c.name} - {c.city || 'N/A'}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
```

### Step 3: Update Your Database

Your trucks and customers tables need GPS coordinates:

```sql
-- Add GPS columns to trucks table
ALTER TABLE trucks ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE trucks ADD COLUMN longitude DECIMAL(11, 8);

-- Add GPS columns to customers table
ALTER TABLE customers ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE customers ADD COLUMN longitude DECIMAL(11, 8);

-- Example data
UPDATE trucks SET latitude = 39.7684, longitude = -86.1581 WHERE id = 1;  -- Indianapolis
UPDATE customers SET latitude = 40.7128, longitude = -74.0060 WHERE id = 1;  -- New York
```

### Step 4: Update App.jsx

Replace the MapView import in your App.jsx:

```javascript
// At the top of App.jsx
import MapView from './MapView.jsx';  // Create new file or update existing

// In your map tab:
{tab === "map" && (
  <MapView trucks={data.trucks} customers={data.customers} />
)}
```

---

## Option 2: Mapbox (Free Tier Available)

If you want more features than Leaflet, Mapbox has a free tier:

- **Free:** 50,000 map loads/month
- **Paid:** Beyond that ($4 per 100k loads)

```bash
npm install mapbox-gl
```

But for small business use, **Leaflet + OpenStreetMap is better** (truly unlimited, free forever).

---

## Option 3: Maptiler (Free Tier)

Similar to Mapbox:
- **Free:** 100,000 tiles/month
- **Paid:** Beyond that
- No API needed, just use free tile layer

---

## GPS Tracking Integration

### How to Get GPS Coordinates

**Option A: Manual Entry**
- User enters address
- You geocode it to lat/lng (free services available)

**Option B: Device GPS**
- Mobile app sends GPS coordinates
- Store in database

**Option C: Auto Geocoding**
```javascript
// Free geocoding service (OpenStreetMap Nominatim)
async function geocodeAddress(address) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );
  const data = await res.json();
  if (data[0]) {
    return {
      latitude: data[0].lat,
      longitude: data[0].lon
    };
  }
}
```

---

## Real-Time Tracking Setup

For live truck tracking, you need:

1. **GPS Device in Truck**
   - Phone with GPS (Geolocation API)
   - Dedicated GPS tracker
   - Fleet management device

2. **Send GPS Periodically**
   ```javascript
   // Update truck location every 30 seconds
   setInterval(async () => {
     const position = await new Promise((resolve) => {
       navigator.geolocation.getCurrentPosition(resolve);
     });
     
     await fetch('/api/trucks/update-location', {
       method: 'POST',
       body: JSON.stringify({
         truck_id: truckId,
         latitude: position.coords.latitude,
         longitude: position.coords.longitude
       })
     });
   }, 30000);
   ```

3. **Store in Database**
   ```sql
   INSERT INTO truck_locations (truck_id, latitude, longitude, timestamp)
   VALUES ($1, $2, $3, NOW());
   ```

4. **Display on Map**
   - Refresh map data every 30 seconds
   - Show latest position from database

---

## Cost Comparison

| Service | Setup | Monthly Cost | Features |
|---------|-------|-------------|----------|
| **OpenStreetMap + Leaflet** | Free | $0 | Markers, popups, zooming ✓ |
| **Google Maps** | API Key | $0-500+ | Same, but $$$ |
| **Mapbox** | Free tier | $0-200+ | More polished, better tiles |
| **Maptiler** | Free tier | $0-100+ | Good balance |

---

## Implementation Checklist

- [ ] `npm install leaflet`
- [ ] Add MapView component (see code above)
- [ ] Add GPS columns to trucks/customers tables
- [ ] Update App.jsx to use new MapView
- [ ] Add latitude/longitude to truck/customer forms
- [ ] Test map loads and displays markers
- [ ] Set up GPS tracking (optional)
- [ ] Deploy to Vercel

---

## Example: Adding Truck Location Form

```javascript
<form onSubmit={handleAddTruck}>
  <input 
    type="text" 
    placeholder="Driver name" 
    value={form.driver} 
    onChange={(e) => setForm({...form, driver: e.target.value})}
  />
  <input 
    type="text" 
    placeholder="Truck name" 
    value={form.name}
    onChange={(e) => setForm({...form, name: e.target.value})}
  />
  <input 
    type="text" 
    placeholder="Current address" 
    value={form.address}
    onChange={async (e) => {
      const addr = e.target.value;
      setForm({...form, address: addr});
      
      // Auto-geocode
      if (addr.length > 5) {
        const coords = await geocodeAddress(addr);
        if (coords) {
          setForm(prev => ({...prev, latitude: coords.latitude, longitude: coords.longitude}));
        }
      }
    }}
  />
  <input type="hidden" value={form.latitude} />
  <input type="hidden" value={form.longitude} />
  <button>Add Truck</button>
</form>
```

---

## Summary

**Use OpenStreetMap + Leaflet for:**
- ✅ Zero cost
- ✅ No API keys needed
- ✅ No monthly bills
- ✅ Full control
- ✅ Privacy-friendly
- ✅ Perfect for small-medium businesses

**Installation:** Just `npm install leaflet` and copy the MapView component above.

---

**Cost:** $0/month forever
**Setup Time:** 15 minutes
**Truck Tracking:** Fully supported
**Customer Locations:** Fully supported
**Status:** Production-ready
