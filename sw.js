const CACHE_NAME = 'duo-arcade-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install Event: Cache basic assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch Event: Serve from cache, fallback to network
// This fetch handler is REQUIRED for Chrome to show the "Install" prompt
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});