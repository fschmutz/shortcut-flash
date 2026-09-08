const CACHE = 'racc-v3';
const SHELL = [
  './',
  './index.html',
  './404.html',
  './css/app.css',
  './css/fonts.css',
  './js/app.js',
  './js/missions.js',
  './js/challenges.js',
  './js/keys.js',
  './js/fx.js',
  './js/i18n.js',
  './js/version.js',
  './assets/favicon.png',
  './assets/apple-touch-icon.png',
  './assets/mascot.png',
  './manifest.webmanifest',
  './fonts/bungee-latin-400.woff2',
  './fonts/fredoka-latin-400.woff2',
  './fonts/fredoka-latin-500.woff2',
  './fonts/fredoka-latin-600.woff2',
  './fonts/fredoka-latin-700.woff2',
  './fonts/dmmono-latin-500.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
