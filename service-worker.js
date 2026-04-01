/**
 * @fileoverview Service Worker for AlkoRater PWA
 * Version: v2.2 — Stale-While-Revalidate for JSON, Cache-First for static assets
 * Optimized for iOS Safari — eliminates layout shifts, ensures smooth 60 FPS
 */

const CACHE_VERSION = "v4.0";
const CACHE_NAME = `alko-rater-static-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `alko-rater-data-${CACHE_VERSION}`;

// ─── Static Assets (Cache-First) ──────────────────────────────────────────────

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/js/main.js",
  "./src/js/state.js",
  "./src/js/data.js",
  "./src/js/ui.js",
  "./src/js/storage.js",
  "./src/css/style.css",
  "./icons/icon-60.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./logo.png",
];

// ─── Data Files (Stale-While-Revalidate) ──────────────────────────────────────

const DATA_TO_CACHE = [
  "./data/piwa.json",
  "./data/wodki.json",
  "./data/wina.json",
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
      caches.open(DATA_CACHE_NAME).then((cache) => cache.addAll(DATA_TO_CACHE)),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Activate — clean old caches ──────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (!cacheWhitelist.includes(name)) {
              return caches.delete(name);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Stale-While-Revalidate for JSON data files
  if (url.pathname.includes("/data/") && url.pathname.endsWith(".json")) {
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
      }),
    );
    return;
  }

  // Cache-First for all static assets
  event.respondWith(
    caches.match(event.request).then(
      (response) =>
        response ||
        fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        }),
    ),
  );
});
