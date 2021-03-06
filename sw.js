var cacheName = 'insights-pwa_v2';
var filesToCache = [
  '/',
  '/index.html',
  '/realtime.js',
  '/main.js'
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(e) {
  console.log('[Service Worker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

/* Serve cached content when offline */
// self.addEventListener('fetch', function(e) {
//   console.log('[Service Worker] Fetched resource ');
//   // e.respondWith(
//   //   caches.match(e.request).then(function(response) {
//   //     return response || fetch(e.request);
//   //   })
//   // );
// });

self.addEventListener('activate', function(event) {
  console.log('[ServiceWorke] Activate');
  // Perform some task
});