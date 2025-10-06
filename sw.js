const CACHE = 'mangystau-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/places.json',
  '/styles.css' // if you extract styles
  // add leaflet assets, minimal icons, etc.
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // cache navigations and JSON responses
        if (resp && resp.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return resp;
      }).catch(() => {
        // fallback for navigation
        if (e.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});