const CACHE = 'tecrural-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Solo peticiones del propio origen
  if (url.origin !== self.location.origin) return;

  const networkFirst = request.mode === 'navigate' || url.pathname.startsWith('/api/');
  const cacheApiResponse = !url.pathname.startsWith('/api/admin/');

  event.respondWith(
    networkFirst
      ? fetch(request)
          .then((response) => {
            if (response.ok && cacheApiResponse) {
              caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(async () => {
            const cached = cacheApiResponse ? await caches.match(request) : undefined;
            return cached || (request.mode === 'navigate' ? caches.match('/') : Response.error());
          })
      : caches.match(request).then((cached) =>
          cached || fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
        )
  );
});
