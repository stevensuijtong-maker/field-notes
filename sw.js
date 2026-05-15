// Bump CACHE version whenever you deploy changes to index.html or sw.js
// e.g. 'field-notes-v2', 'field-notes-v3', ...
const CACHE = 'field-notes-v2';
const SHELL = [
  '/field-notes/',
  '/field-notes/manifest.json',
  '/field-notes/icon-192.png',
  '/field-notes/icon-512.png',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  // Never intercept Supabase API or WebSocket — always needs live data
  if (e.request.url.includes('supabase.co')) return;

  // Never intercept map tiles — let browser HTTP cache handle them natively.
  // Caching tiles in the service worker caused grey tile issues in Safari.
  if (e.request.url.includes('cartocdn.com')) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Only cache CDN assets (JS/CSS libraries), not tiles
        if (e.request.url.includes('jsdelivr.net')) {
          const clone = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        // Offline fallback for page navigations
        if (e.request.mode === 'navigate') return caches.match('/field-notes/');
      });
    })
  );
});
