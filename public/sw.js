/* Lira de Luna — Service Worker */
const CACHE = 'ldl-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/offline'])).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('/api/') || e.request.url.includes('/admin')) return;

  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then((r) => r ?? caches.match('/'))
    )
  );
});

/* ── Push notifications ── */
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'Lira de Luna', body: e.data.text() }; }

  const { title = 'Lira de Luna', body = '', url = '/', image, tag = 'ldl' } = data;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/customer.svg',
      badge: '/icons/badge.svg',
      image: image ?? undefined,
      data: { url },
      vibrate: [180, 80, 180],
      tag,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url ?? '/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url === target && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
