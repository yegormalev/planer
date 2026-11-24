// Сервис-воркер: работа офлайн и показ уведомлений.
const CACHE = 'planer-v15';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'sync.js', 'sync-config.js', 'menu-data.js', 'learn-data.js', 'vendor/zxing-reader.js', 'vendor/zxing_reader.wasm', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Сначала сеть (чтобы обновления приходили сразу), при отсутствии сети отдаём кэш.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.endsWith('version.json')) return;      // проверка версии всегда идёт в сеть
  e.respondWith(
    fetch(req.url, { cache: 'no-cache' }).then(res => {                   // no-cache: не отдаём старые файлы из кэша браузера
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});

// Задел на будущее: настоящие push-уведомления с сервера.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Планер', {
    body: d.body || '', icon: 'icons/icon-192.png', tag: d.tag
  }));
});
