// service-worker.js
const CACHE_NAME = 'compact-phones-v2';
const urlsToCache = [
  './',
  './style.css',
  './script.js',
  './data.csv'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 网络请求成功 → 更新缓存并返回新数据
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // 网络失败 → 使用上次成功缓存的版本
        return caches.match(event.request);
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