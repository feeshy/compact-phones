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

// 3. 运行时策略
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // ==========================================
  // 字体文件按需缓存：Cache First
  // ==========================================
  // 通过 destination 判断是否为字体请求，或通过后缀名兜底
  if (event.request.destination === 'font' || event.request.url.endsWith('.woff2')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // 1. 优先检查缓存
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          // 如果命中了缓存，直接返回！绝对不触发任何后续的网络请求，节省流量
          return cachedResponse;
        }

        // 2. 缓存没命中，说明原生系统里没有前面的字体，浏览器确实按需发起了下载
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // 下载成功后，将其存入缓存，供未来永久使用
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
    );
    // 处理完字体后直接 return，跳过下面的通用 SWR 逻辑
    return;
  }

  // ==========================================
  // 通用资源：StaleWhileRevalidate
  // ==========================================
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