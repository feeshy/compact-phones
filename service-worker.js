const VERSION = 'BUILD_TIME_PLACEHOLDER';
const CACHE_NAME = 'compact-phones-v' + VERSION;

const ASSETS = [
  './',
  './style.css',
  './script.js',
  './data.csv'
];

// 1. 安装阶段
self.addEventListener('install', (event) => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('Precache failed:', url, err))
        )
      );
    })
  );
});

// 2. 激活阶段：自动清理过期缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 运行时策略：SPA 适配版 StaleWhileRevalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 优先从缓存获取
      const cachedResponse = await cache.match(event.request);

      // 后台更新逻辑
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => { });

      // SPA 关键逻辑：如果是导航请求且缓存中没找到，回退到 index.html
      if (event.request.mode === 'navigate' && !cachedResponse) {
        return cache.match('./index.html').then(res => res || fetchPromise);
      }

      return cachedResponse || fetchPromise;
    })
  );
});