// ─── SERVICE WORKER v4 — Smart caching + auto-update ───────
// 
// STRATEGY:
//   HTML files → Network first, fall back to cache (always gets latest)
//   Icons/assets → Cache first, fall back to network (fast loading)
//
// HOW TO PUSH UPDATES:
//   Just change ANY code in this file (even a comment) and push to GitHub.
//   The browser detects the SW file changed → downloads new version → updates cache.
//   You don't need to manually bump version numbers anymore.
//
// Last updated: 2026-06-29

const CACHE_NAME = 'budget-tracker-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './favicon-16.png',
  './apple-touch-icon.png',
  './posts.json'
];

// ─── INSTALL: Cache all assets ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Activate immediately, don't wait
  );
});

// ─── ACTIVATE: Clean old caches + take control ─────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('🗑️ Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => {
      console.log('✅ SW activated, claiming clients');
      return self.clients.claim(); // Take control of all open tabs immediately
    })
  );
});

// ─── FETCH: Network-first for HTML, cache-first for assets ─
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // HTML / navigation requests → NETWORK FIRST (always get latest)
  if (e.request.mode === 'navigate' || e.request.destination === 'document' ||
      url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Got network response — cache it for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Network failed — serve from cache (offline mode)
          return caches.match(e.request).then(cached => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // All other assets (icons, manifest, etc.) → CACHE FIRST (fast)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      });
    })
  );
});

// ─── MESSAGE: Handle skip-waiting from the app ─────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Force update all cached assets
  if (e.data && e.data.type === 'FORCE_UPDATE') {
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(ASSETS.map(url => {
        return fetch(url, { cache: 'no-store' }).then(response => {
          return cache.put(url, response);
        }).catch(() => {});
      }));
    }).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'UPDATED' }));
      });
    });
  }
});
