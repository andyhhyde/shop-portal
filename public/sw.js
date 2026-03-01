// Service Worker for Shop Portal PWA
// Handles web push notifications and offline caching

// ── Push notification handler ──────────────────────────────────────────────
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Shop Portal', body: event.data.text() };
  }

  const title = payload.title || 'Shop Portal';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/dashboard' },
    // Keep overdue notifications persistent until user taps
    requireInteraction: payload.type === 'rent_overdue',
    tag: payload.relatedId || 'shop-portal',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click handler ─────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // If the app is already open, focus that tab
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Install / Activate ─────────────────────────────────────────────────────
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});
