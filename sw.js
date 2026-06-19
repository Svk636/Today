const CACHE_NAME = 'sadhak-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  // Google Fonts CSS – we cache the stylesheet, fonts will be cached by the browser
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@300;400;500;600&family=Noto+Sans+Devanagari:wght@300;400;500;600;700&display=swap'
];

// Install event – cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event – stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests that might fail (except fonts)
  const url = new URL(request.url);
  if (url.origin !== location.origin && !url.href.includes('fonts.googleapis.com') && !url.href.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => {
        // If we have a cached response, return it and update in background
        if (cached) {
          // Update cache in background (stale-while-revalidate)
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            }
          }).catch(() => {});
          return cached;
        }
        // Otherwise fetch from network
        return fetch(request).then((response) => {
          // Cache valid responses
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        }).catch(() => {
          // Fallback – though we don't have an offline fallback page, just return a basic response
          return new Response('Offline – please connect to the internet.', { status: 503 });
        });
      })
  );
});