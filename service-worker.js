/**
 * @fileoverview Service Worker dla AlkoRater PWA
 * Each release owns an immutable shell and catalog snapshot. Bump the version
 * whenever any precached file changes, including the catalog.
 */

const CACHE_VERSION = 'v8.1-apple-rc3';
const SCOPE_URL = new URL(self.registration.scope);
const CACHE_SCOPE = encodeURIComponent(SCOPE_URL.pathname);
const CACHE_NAME = `alko-rater-static-${CACHE_SCOPE}-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `alko-rater-data-${CACHE_SCOPE}-${CACHE_VERSION}`;
const RELEASE_CACHE_NAME = `alko-rater-release-${CACHE_SCOPE}`;
const RELEASE_KEY = new URL('./.alkorater-active-release', SCOPE_URL).href;

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './favicon.ico',
    './src/js/main.js',
    './src/js/app/state.js',
    './src/js/app/constants.js',
    './src/js/data/index.js',
    './src/js/data/favorite-repo.js',
    './src/js/data/product.js',
    './src/js/data/product-repo.js',
    './src/js/data/records.js',
    './src/js/services/index.js',
    './src/js/services/backup.js',
    './src/js/services/storage.js',
    './src/js/services/data-loader.js',
    './src/js/services/search.js',
    './src/js/services/sw-service.js',
    './src/js/ui/index.js',
    './src/js/ui/backup.js',
    './src/js/ui/icons.js',
    './src/js/ui/haptics.js',
    './src/js/ui/toast.js',
    './src/js/ui/tabs.js',
    './src/js/ui/renderer.js',
    './src/js/ui/dashboard.js',
    './src/js/ui/favorites.js',
    './src/js/ui/search-ui.js',
    './src/js/ui/modal.js',
    './src/js/ui/context-menu.js',
    './src/js/ui/badges.js',
    './src/js/ui/pull-to-refresh.js',
    './src/js/utils/index.js',
    './src/js/utils/dom.js',
    './src/js/utils/logger.js',
    './src/js/utils/debounce.js',
    './src/js/utils/spring.js',
    './src/js/utils/plural.js',
    './src/css/style.css',
    './icons/icon-60.png',
    './icons/icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './logo.png',
    './icons/splash/splash-1290x2796.png',
    './icons/splash/splash-1179x2556.png',
    './icons/splash/splash-1125x2436.png',
    './icons/splash/splash-1242x2208.png',
    './icons/splash/splash-2048x2732.png',
    './icons/splash/splash-1620x2160.png',
];

const DATA_TO_CACHE = ['./data/piwa.json', './data/wodki.json', './data/wina.json'];
const ASSET_URLS = new Set(ASSETS_TO_CACHE.map((path) => new URL(path, SCOPE_URL).href));
const INDEX_URL = new URL('./index.html', SCOPE_URL).href;

function precache(cacheName, paths) {
    const requests = paths.map(
        (path) => new Request(new URL(path, SCOPE_URL), { cache: 'reload' }),
    );
    return caches.open(cacheName).then((cache) => cache.addAll(requests));
}

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const metadata = await caches.open(RELEASE_CACHE_NAME);
            const active = await metadata.match(RELEASE_KEY);
            if (active && (await active.text()) === CACHE_VERSION) {
                throw new Error('A changed service worker must use a new cache version.');
            }
            const results = await Promise.allSettled([
                precache(CACHE_NAME, ASSETS_TO_CACHE),
                precache(DATA_CACHE_NAME, DATA_TO_CACHE),
            ]);
            const failure = results.find((result) => result.status === 'rejected');
            if (failure) {
                await Promise.all([caches.delete(CACHE_NAME), caches.delete(DATA_CACHE_NAME)]);
                throw failure.reason;
            }
        })(),
    );
});

// Keep the immediate predecessor for in-flight requests. Never touch foreign or
// legacy unscoped caches, whose ownership cannot be established on shared hosting.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            const metadata = await caches.open(RELEASE_CACHE_NAME);
            const active = await metadata.match(RELEASE_KEY);
            const previous = active ? await active.text() : null;
            const prefixes = [
                `alko-rater-static-${CACHE_SCOPE}-`,
                `alko-rater-data-${CACHE_SCOPE}-`,
            ];
            const keep = new Set([CACHE_VERSION, previous]);
            // Newer installs must not be retired by an older worker's activation.
            const olderNames = names.slice(0, names.indexOf(CACHE_NAME));
            if (previous && previous !== CACHE_VERSION) {
                await Promise.all(
                    olderNames.map((name) => {
                        const prefix = prefixes.find((candidate) => name.startsWith(candidate));
                        if (prefix && !keep.has(name.slice(prefix.length))) {
                            return caches.delete(name);
                        }
                    }),
                );
            }
            await metadata.put(RELEASE_KEY, new Response(CACHE_VERSION));
        })(),
    );
});

// ─── Message Bus ───────────────────────────────────────────────────────────────

function isInScope(url) {
    return url.origin === SCOPE_URL.origin && url.pathname.startsWith(SCOPE_URL.pathname);
}

async function activateIfSafe(event) {
    const source = event.source;
    if (!source?.id || !source.url || !isInScope(new URL(source.url))) {
        return;
    }

    const reply = (data) => (event.ports?.[0] || source).postMessage(data);
    try {
        // skipWaiting replaces controllers even without clients.claim(). Defer
        // while any other app page is open, including an uncontrolled first visit.
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const appClients = clients.filter((client) => isInScope(new URL(client.url)));
        if (!appClients.some((client) => client.id === source.id)) {
            reply({ type: 'UPDATE_DEFERRED', reason: 'unavailable' });
            return;
        }
        if (appClients.some((client) => client.id !== source.id)) {
            reply({ type: 'UPDATE_DEFERRED', reason: 'other-tabs' });
            return;
        }

        await self.skipWaiting();
        reply({ type: 'UPDATE_ACCEPTED' });
    } catch {
        reply({ type: 'UPDATE_DEFERRED', reason: 'unavailable' });
    }
}

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') {
        return;
    }

    if (data.type === 'SKIP_WAITING') {
        event.waitUntil(activateIfSafe(event));
    }

    if (data.type === 'GET_VERSION') {
        event.ports?.[0]?.postMessage({ version: CACHE_VERSION });
    }
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

function offlineResponse() {
    return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}

async function fromSnapshot(cacheName, url) {
    try {
        const cache = await caches.open(cacheName);
        return (await cache.match(url)) || offlineResponse();
    } catch {
        return offlineResponse();
    }
}

function recoveryPage(
    message = 'Pamięć offline jest niekompletna. Połącz się z internetem, zamknij inne karty AlkoRater i napraw kopię aplikacji. Oceny i notatki nie zostaną usunięte.',
) {
    return new Response(
        `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AlkoRater | Odzyskiwanie aplikacji</title><style>body{background:#071019;color:#f4f8fc;font:1rem/1.6 system-ui;margin:0;padding:24px}main{max-width:38rem;margin:5vh auto}h1{font-size:1.75rem;line-height:1.2}a{display:inline-flex;align-items:center;min-height:44px;padding:8px 16px;background:#f1b24f;color:#071019;border-radius:12px;font-weight:600}a:focus-visible{outline:3px solid #f1b24f;outline-offset:4px}</style></head><body><main><h1>Odzyskiwanie aplikacji</h1><p>${message}</p><p><a href="${SCOPE_URL.href}?repair-offline=1">Napraw pamięć offline</a></p><p>Naprawa dotyczy plików aplikacji, nie Twojej kolekcji. Nie czyść danych witryny w ustawieniach przeglądarki.</p></main></body></html>`,
        {
            status: 503,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'Content-Security-Policy':
                    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; base-uri 'none'",
            },
        },
    );
}

async function navigationSnapshot() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const available = new Set((await cache.keys()).map((request) => request.url));
        if ([...ASSET_URLS].some((url) => !available.has(url))) {
            return recoveryPage();
        }
        return (await cache.match(INDEX_URL)) || recoveryPage();
    } catch {
        return recoveryPage();
    }
}

async function repairOffline() {
    try {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (clients.filter((client) => isInScope(new URL(client.url))).length > 1) {
            return recoveryPage(
                'Zamknij pozostałe karty AlkoRater i spróbuj ponownie. Nie zmieniono danych ani plików aplikacji.',
            );
        }
        const online = await fetch(
            new Request(new URL('./service-worker.js', SCOPE_URL), { cache: 'no-store' }),
        );
        if (!online.ok) {
            return recoveryPage(
                'Naprawa wymaga połączenia z internetem. Spróbuj ponownie po odzyskaniu połączenia.',
            );
        }
        const metadata = await caches.open(RELEASE_CACHE_NAME);
        await metadata.delete(RELEASE_KEY);
        await self.registration.unregister();
        return Response.redirect(SCOPE_URL.href, 303);
    } catch {
        return recoveryPage(
            'Nie udało się naprawić kopii aplikacji. Sprawdź połączenie z internetem i spróbuj ponownie. Oceny pozostają w pamięci przeglądarki.',
        );
    }
}

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    if (!isInScope(url)) {
        return;
    }

    if (event.request.mode === 'navigate' && url.searchParams.get('repair-offline') === '1') {
        event.respondWith(repairOffline());
        return;
    }

    url.search = '';
    url.hash = '';
    const path = url.pathname.slice(SCOPE_URL.pathname.length);
    const isData = path.startsWith('data/') && path.endsWith('.json');
    const isNavigateOrHtml =
        event.request.mode === 'navigate' ||
        /text\/html/.test(event.request.headers.get('accept') || '');
    const isShellAsset = ASSET_URLS.has(url.href) || /^(src|icons)\//.test(path);

    const respond = async () => {
        if (isData) {
            return fromSnapshot(DATA_CACHE_NAME, url.href);
        }
        if (isNavigateOrHtml) {
            return navigationSnapshot();
        }
        if (isShellAsset) {
            return fromSnapshot(CACHE_NAME, url.href);
        }

        try {
            return (await fetch(event.request)) || offlineResponse();
        } catch {
            return offlineResponse();
        }
    };

    event.respondWith(respond());
});
