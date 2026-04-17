/* ════════════════════════════════════════
   SERVICE WORKER — Zakah Calculator
   Samin's Initiatives
   ════════════════════════════════════════ */

const CACHE_NAME   = 'zakah-calc-v11';
const DATA_CACHE   = 'zakah-data-v11';

// Periodic sync tag — must match the tag registered in the client
const PERIODIC_SYNC_TAG = 'zakah-rates-refresh';

// Background sync tag — used when a rates fetch fails offline
const BGS_TAG = 'zakah-rates-bg-sync';

// Core shell
const SHELL_ASSETS = [
  './index.html',
  './app.js',
  './styles.css',
  './pdf-export.js',
  './libs/jspdf.umd.min.js',
  './translations/en.js',
  './translations/bn.js',
  './manifest.json',
];
const DATA_ASSETS = [
  './data/rates.json',
  './data/metals.json',
];

/* ════════════════════════════════════════
   INSTALL — cache the app shell
   ════════════════════════════════════════ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ════════════════════════════════════════
   ACTIVATE — purge old caches, claim clients
   ════════════════════════════════════════ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
     .then(() => {
       self.clients.matchAll({ type: 'window' }).then(clients => {
         clients.forEach(client =>
           client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME })
         );
       });
     })
  );
});

/* ════════════════════════════════════════
   FETCH — routing strategies
   ════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  // Data files: network-first, queue for background sync on failure
  if (DATA_ASSETS.some(p => event.request.url.includes(p.replace('./', '')))) {
    event.respondWith(networkFirstWithBGSync(event.request));
    return;
  }

  // App shell: cache-first, fall back to network
  event.respondWith(cacheFirstWithNetwork(event.request, CACHE_NAME));
});

/* ════════════════════════════════════════
   PERIODIC BACKGROUND SYNC
   Refreshes gold/metal rate data on a schedule
   ════════════════════════════════════════ */
self.addEventListener('periodicsync', event => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(refreshDataCache());
  }
});

async function refreshDataCache() {
  const cache = await caches.open(DATA_CACHE);
  await Promise.allSettled(
    DATA_ASSETS.map(async path => {
      try {
        const response = await fetch(path);
        if (response.ok) {
          await cache.put(path, response);
          console.log('[SW] Periodic sync refreshed:', path);
        }
      } catch (err) {
        console.warn('[SW] Periodic sync fetch failed:', path, err);
      }
    })
  );
  // Notify open clients so they can re-render with fresh rates
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client =>
    client.postMessage({ type: 'RATES_UPDATED' })
  );
}

/* ════════════════════════════════════════
   BACKGROUND SYNC
   Retries a failed data fetch once connectivity is restored
   ════════════════════════════════════════ */
self.addEventListener('sync', event => {
  if (event.tag === BGS_TAG) {
    event.waitUntil(refreshDataCache());
  }
});

/* ════════════════════════════════════════
   FETCH STRATEGIES
   ════════════════════════════════════════ */

// Network-first for data assets; registers a background sync if offline
async function networkFirstWithBGSync(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    console.warn('[SW] Data fetch failed, queuing background sync:', request.url, err);
    try {
      await self.registration.sync.register(BGS_TAG);
    } catch {
      // sync API not available (e.g. Firefox) — silent fail
    }
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' },
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
  } catch (err) {
    console.warn('[SW] Cache-first fetch failed, falling back to index.html:', request.url, err);
    return await caches.match('./index.html') ||
      new Response('App is offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(err => {
    console.warn('[SW] Stale-while-revalidate revalidation failed:', request.url, err);
    return cached;
  });
  return cached || fetchPromise;
}
