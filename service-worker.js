const CACHE_NAME = 'alko-rater-v1';
const DATA_CACHE_NAME = 'alko-rater-data-v1';

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'data/piwa.json',
    'data/wodki.json',
    'data/wina.json',
    'icons/icon-60.png',
    'icons/icon-180.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.includes('data/')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse.ok) {
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch(() => cachedResponse);

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('index.html');
                }
            });
        })
    );
});