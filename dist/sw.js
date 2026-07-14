const CACHE_NAME = 'iconstudio-v4.0.3';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/assets/img/base-placeholder.svg',
    '/assets/favicon/favicon-96x96.png',
    '/assets/favicon/favicon.svg',
    '/assets/favicon/favicon.ico',
    '/assets/favicon/apple-touch-icon.png',
    '/assets/favicon/site.webmanifest',
    '/assets/favicon/web-app-manifest-192x192.png',
    '/assets/favicon/web-app-manifest-512x512.png'
];

// Install Event - cache core shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell');
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - clear old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - network-first with cache fallback
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // Skip Cloudinary/API uploads or remote URLs that shouldn't be cached in the shell
    const url = new URL(event.request.url);
    if (url.hostname.includes('cloudinary.com') || url.pathname.includes('/s/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached asset but fetch update in background (stale-while-revalidate)
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
                        }
                    })
                    .catch(() => {/* Ignore network failures in background fetch */});
                return cachedResponse;
            }

            // Fallback to network
            return fetch(event.request).then((networkResponse) => {
                // Cache dynamic fonts or library assets
                if (
                    networkResponse.status === 200 &&
                    (url.hostname.includes('fonts.googleapis.com') ||
                     url.hostname.includes('fonts.gstatic.com') ||
                     url.hostname.includes('unpkg.com'))
                ) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                // If offline and requesting the page, return index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
            });
        })
    );
});
