const CACHE_NAME = 'vitalwaveone-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// Install - cache static assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(()=>{}))
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Supabase API calls: network only (never cache)
// - Stripe calls: network only
// - JS/CSS/images: cache first, fallback to network
// - HTML navigation: network first, fallback to cached index.html
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never cache API calls
  if (url.includes('supabase.co') || url.includes('stripe.com') || url.includes('r.stripe.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // HTML navigation - network first, fallback to index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then(r => r || new Response('Offline'))
      )
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
