/**
 * @fileoverview Service Worker dla AlkoRater PWA
 * v6.2 — Beer types, shared badges, code quality improvements.
 * Pre-caching offline, czyszczenie starego cache za pomocą wersji oraz
 * obsługa aktualizacji z pełnym flow przepowiadania wersji.
 */

const CACHE_VERSION = 'v7.1';
const CACHE_NAME = `alko-rater-static-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `alko-rater-data-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './src/js/main.js',
    './src/js/app/state.js',
    './src/js/app/constants.js',
    './src/js/data/index.js',
    './src/js/data/favorite-repo.js',
    './src/js/data/product-repo.js',
    './src/js/services/index.js',
    './src/js/services/storage.js',
    './src/js/services/data-loader.js',
    './src/js/services/search.js',
    './src/js/services/sw-service.js',
    './src/js/ui/index.js',
    './src/js/ui/haptics.js',
    './src/js/ui/toast.js',
    './src/js/ui/tabs.js',
    './src/js/ui/renderer.js',
    './src/js/ui/dashboard.js',
    './src/js/ui/favorites.js',
    './src/js/ui/search-ui.js',
    './src/js/ui/modal.js',
    './src/js/utils/index.js',
    './src/js/utils/dom.js',
    './src/js/utils/logger.js',
    './src/js/utils/debounce.js',
    './src/js/utils/spring.js',
    './src/css/style.css',
    './icons/icon-60.png',
    './icons/icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './logo.png',
];

const DATA_TO_CACHE = ['./data/piwa.json', './data/wodki.json', './data/wina.json'];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
            caches.open(DATA_CACHE_NAME).then((cache) => cache.addAll(DATA_TO_CACHE)),
        ]).catch((fallback) => {
            console.warn('[SW] install precache partial failure:', fallback);
        }),
    );

    // Note: skipWaiting() is called via the message handler, not here,
    // to let the app decide when to activate the new SW.
});

// ─── Message Bus ───────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'SKIP_WAITING' || data === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (data.type === 'GET_VERSION' && event.port) {
        event.port.postMessage({ version: CACHE_VERSION });
    }
});

// ─── Activate — czyszczenie starego cache'a + policy-based prefix ─────────────

self.addEventListener('activate', (event) => {
    const versionToRetain = CACHE_VERSION;

    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames.map((name) => {
                        if (name === CACHE_NAME || name === DATA_CACHE_NAME) return;

                        const hasVersion = /v\d+\.\d+/.test(name);
                        const shouldDelete = hasVersion ? true : name.includes('alko-rater');

                        if (shouldDelete) {
                            return caches.delete(name);
                        }
                    }),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    const isData = url.pathname.startsWith('/data/') && url.pathname.endsWith('.json');
    const isNavigateOrHtml =
        event.request.mode === 'navigate' ||
        /text\/html/.test(event.request.headers.get('accept') || '');

    const respond = async () => {
        try {
            if (isData) {
                const cache = await caches.open(DATA_CACHE_NAME);
                const cached = await cache.match(event.request).catch(() => null);

                const networkPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => cached);

                return cached || networkPromise;
            }

            if (isNavigateOrHtml) {
                const networkResponse = await fetch(event.request);
                if (networkResponse && networkResponse.ok) {
                    return networkResponse;
                }

                const cached = await caches.match(event.request).catch(() => null);
                if (cached) return cached;

                return caches.match('./index.html').catch(() => null);
            }

            const cache = await caches.open(CACHE_NAME);
            try {
                const networkResponse = await fetch(event.request);
                if (networkResponse && networkResponse.ok) {
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            } catch {
                const cached = await cache.match(event.request).catch(() => null);
                if (cached) return cached;
                return new Response('Offline', {
                    status: 503,
                    statusText: 'Service Unavailable',
                });
            }
        } catch (error) {
            if (isNavigateOrHtml) {
                return caches.match('./index.html').catch(() => null);
            }

            return new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
            });
        }
    };

    event.respondWith(respond());
});
