// Bump the shell cache whenever an application release changes the startup
// flow. Existing installed clients then discard old hashed entry chunks rather
// than combining a new HTML shell with a previous protagonist-selection build.
const CACHE_NAME = 'asra-shell-v4';
const APP_SHELL = [
  '/',
  '/guide/',
  '/manifest.webmanifest',
  '/assets/ui/beta/beta-campaign-keyart-v1.webp',
  '/assets/ui/beta/beta-panel-material-v1.webp',
  '/assets/ui/asra-title-keyart-mobile-v1.webp',
  '/assets/ui/pwa-icon-192.png',
  '/assets/ui/pwa-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const fallbackPath = url.pathname.startsWith('/guide') ? '/guide/' : '/';
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(fallbackPath, copy));
          return response;
        })
        .catch(() => caches.match(fallbackPath)),
    );
    return;
  }

  if (!url.pathname.startsWith('/assets/')) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached ?? network;
    }),
  );
});
