// ==============================================
// FinanceOS PWA Service Worker
// Cache-first for static assets, network-first for pages
// ==============================================

const CACHE_NAME = "financeos-cache-v1";
const OFFLINE_URL = "/offline.html";

const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/offline.html",
  // Standard system fonts
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and skip Supabase / external auth API requests
  if (event.request.method !== "GET" || event.request.url.includes("/auth/v1")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // Cache dynamic static assets
          const responseToCache = response.clone();
          const url = new URL(event.request.url);
          if (
            url.pathname.startsWith("/_next/static") ||
            url.pathname.startsWith("/icons/") ||
            url.pathname.startsWith("/images/")
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // If network fails, check if the request is for a page/navigation
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return null;
        });
    })
  );
});
