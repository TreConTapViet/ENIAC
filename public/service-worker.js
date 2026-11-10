// Service worker "tự gỡ" ở gốc trang.
// Bản cũ trên nhánh main từng đăng ký /service-worker.js (phạm vi "/") và lưu trang cũ vào cache
// "phoido-studio-v*". Web hiện tại không dùng service worker ở gốc; app PWA có service worker riêng ở /app/.
// Trình duyệt nào còn bản cũ sẽ tải file này khi kiểm tra cập nhật: xoá cache cũ, tự gỡ, tải lại các tab.
// Không xoá cache của app ("phoido-studio-app-*") và không đụng tới đăng ký có phạm vi /app/.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('phoido-studio') && !name.startsWith('phoido-studio-app'))
          .map((name) => caches.delete(name)),
      );
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) {
        client.navigate(client.url).catch(() => {});
      }
    })(),
  );
});
