// Service worker của app PWA, phạm vi /app/ (đăng ký ở src/main.tsx).
// Không chặn trang web ở "/" vì nằm ngoài phạm vi. Mạng trước, cache sau (dùng khi mất mạng).
const CACHE_NAME = 'phoido-studio-app-v1';
const SCOPE = new URL(self.registration.scope).pathname; // "/app/"
const PRECACHE_URLS = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'pwa-192x192.png',
  SCOPE + 'pwa-512x512.png',
  SCOPE + 'pwa-maskable-512x512.png',
  SCOPE + 'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          // Chỉ dọn cache của chính app; web dùng chung origin nên không đụng cache khác
          .filter((name) => name.startsWith('phoido-studio') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Không cache manifest, service worker, API, và các dịch vụ Firebase/Google
  if (
    url.pathname === SCOPE + 'manifest.json' ||
    url.pathname === SCOPE + 'service-worker.js' ||
    url.pathname.startsWith('/api/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Trang HTML: mạng trước, mất mạng thì dùng index.html đã cache
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(SCOPE + 'index.html').then((cachedIndex) => {
            return cachedIndex || caches.match(SCOPE);
          });
        })
    );
    return;
  }

  // Script, style, ảnh, mô hình 3D: mạng trước để bản mới có hiệu lực ngay, mất mạng thì dùng cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
