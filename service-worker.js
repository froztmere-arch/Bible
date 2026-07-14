/* Scripture Quest — Service Worker
   Caches the app shell (HTML/manifest/icons) so the app opens instantly
   and works fully offline. Bible chapter text is cached separately by
   the app itself in localStorage, so this worker doesn't need to know
   about it — it only guarantees the app can load with zero connection. */

const CACHE_NAME = 'scripture-quest-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept calls to the Bible text API or Google Fonts —
  // let those go straight to the network (or fail naturally offline;
  // the app already handles that gracefully).
  if (url.hostname.includes('bible-api.com') || url.hostname.includes('fonts.g')) {
    return;
  }

  // App shell: cache-first so the app opens instantly, even offline.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
