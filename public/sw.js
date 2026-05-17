// GoGlobal CRM service worker — basic offline cache + push notifications
const CACHE = 'goglobal-crm-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Cache only same-origin GETs to /lidy and asset routes
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/lidy') && !url.pathname.startsWith('/assets') && url.pathname !== '/ppp.png') return;

  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || new Response('offline', { status: 503 })))
  );
});

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: 'GoGlobal CRM', body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'GoGlobal CRM';
  const opts = {
    body: data.body || '',
    icon: '/ppp.png',
    badge: '/ppp.png',
    data: data.url || '/lidy',
    tag: data.tag || 'crm',
    requireInteraction: !!data.requireInteraction,
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data || '/lidy';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes('/lidy')) { c.focus(); return; }
      }
      self.clients.openWindow(target);
    })
  );
});
