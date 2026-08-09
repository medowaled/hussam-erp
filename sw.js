const CACHE_NAME = 'hussam-erp-v2.5-cache';
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
  './js/modals.js',
  './js/pwa-install.js',
  './js/views/dashboard.js',
  './js/views/pos.js',
  './js/views/inventory.js',
  './js/views/customers.js',
  './js/views/employees.js',
  './js/views/reports.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }).catch(err => console.log('SW Cache add error:', err))
  );
  self.skipWaiting();
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
