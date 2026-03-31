const CACHE_VERSION    = 'v3'; // Bump przy każdym deploy!
const CACHE_NAME      = `alko-rater-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `alko-rater-data-${CACHE_VERSION}`;

// ─── Static Assets ────────────────────────────────────────────────────────────

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'manifest.json',
    // Modules (ES6 — all must be cached for offline)
    'src/js/main.js',
    'src/js/state.js',
    'src/js/data.js',
    'src/js/ui.js',
    'src/js/storage.js',
    // Styles
    'src/css/style.css',
    // Icons & logo
    'icons/icon-60.png',
    'icons/icon-180.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'logo.png',
];

// ─── Data Files (Stale-While-Revalidate) ──────────────────────────────────────

const DATA_TO_CACHE = [
    'data/piwa.json',
    'data/wodki.json',
    'data/wina.json',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)),
            caches.open(DATA_CACHE_NAME).then(cache => cache.addAll(DATA_TO_CACHE)),
        ])
    );
    self.skipWaiting();
});

// ─── Activate — clean old caches ──────────────────────────────────────────────

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames.map(name => {
                    if (!cacheWhitelist.includes(name)) return caches.delete(name);
                })
            ))
            .then(() => self.clients.claim())
    );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Stale-While-Revalidate for JSON data files
    if (url.pathname.includes('/data/')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request)
                        .then(networkResponse => {
                            if (networkResponse.ok) cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        })
                        .catch(() => cachedResponse);

                    // Return cache immediately; update runs in background
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Cache-First for all static assets
    event.respondWith(
        caches.match(event.request).then(response =>
            response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') return caches.match('index.html');
            })
        )
    );
});