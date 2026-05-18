// service-worker.js
const CACHE_NAME = 'compact-phones-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.csv',
  './manifest.json',
  './favicon.svg',
  './apple-touch-icon.png',
  './maskable.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(fetchRes => {
        if (!fetchRes || fetchRes.status !== 200 || fetchRes.type !== 'basic') return fetchRes;
        const responseToCache = fetchRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return fetchRes;
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});