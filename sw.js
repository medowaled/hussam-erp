const CACHE_NAME = 'hussam-erp-v2.8-live-sync';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/sidebar.css',
  './css/header.css',
  './css/pos.css',
  './css/tables.css',
  './css/modal.css',
  './css/print.css',
  './js/app.js',
  './js/state.js',
  './js/firebase.js',
  './js/modals.js',
  './js/pwa-install.js',
  './js/views/dashboard.js',
  './js/views/pos.js',
  './js/views/inventory.js',
  './js/views/customers.js',
  './js/views/reports.js',
  './js/views/settings.js',
  './js/views/login.js',
  './js/views/notifications.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }).catch(err => console.warn('SW Cache error:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy: fetch latest live code from server, fallback to cache offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

