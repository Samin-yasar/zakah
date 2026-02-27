/* ════════════════════════════════════════
   SERVICE WORKER — Zakah Calculator
   Samin's Initiatives
   ════════════════════════════════════════ */

const CACHE_NAME   = 'zakah-calc-v3';
const DATA_CACHE   = 'zakah-data-v3';

// Core shell 
const SHELL_ASSETS = [
  './index.html',
  './styles.css',
   './translations/en.js'
   './translations/bn.js'
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Noto+Serif+Bengali:wght@300;400;500;600;700&display=swap',
];

// Data files updated by GitHub Actions — cached separately with shorter TTL logic
const DATA_ASSETS = [
  './data/rates.json',
  './data/metals.json',
];

/* ── INSTALL: cache the app shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: clean up old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: stale-while-revalidate for data, cache-first for shell ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Data files: network-first (try fresh, fall back to cache)
  if (DATA_ASSETS.some(p => event.request.url.includes(p.replace('./', '')))) {
    event.respondWith(networkFirstWithCache(event.request, DATA_CACHE));
    return;
  }

  // Google Fonts & external CDN: stale-while-revalidate
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME));
    return;
  }

  // App shell: cache-first, fall back to network
  event.respondWith(cacheFirstWithNetwork(event.request, CACHE_NAME));
});

/* ── Strategy: Network-first, cache fallback ── */
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return await caches.match('./zakah-calculator.html') ||
      new Response('App is offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}
