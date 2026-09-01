const CACHE_NAME = 'fisa-atelier-v85';
const APP_FILES = [
  './',
  './index.html',
  './sw.js',
  './manifest.webmanifest',
  './icon-180.png?v=1.4.24',
  './icon-192.png?v=1.4.24',
  './icon-512.png?v=1.4.24',
  './startup-ipad-portrait.png',
  './startup-ipad-landscape.png',
  './sample.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedShell = await cache.match('./index.html');
      const networkPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          cache.put('./index.html', response.clone());
        }
        return response;
      });

      if (cachedShell) {
        event.waitUntil(networkPromise.catch(() => {}));
        return cachedShell;
      }

      try {
        return await networkPromise;
      } catch {
        return new Response('<h1>Offline</h1>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 503
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    const networkFetch = fetch(event.request).then((response) => {
      if (response.ok) {
        cache.put(event.request, response.clone());
      }
      return response;
    });

    if (cached) {
      event.waitUntil(networkFetch.catch(() => {}));
      return cached;
    }

    try {
      return await networkFetch;
    } catch {
      return Response.error();
    }
  })());
});
