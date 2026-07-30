const CACHE_NAME = 'qc-cache-v1';
const urlsToCache = [
    '/',
    '/dashboard.html',
    '/inspection.html',
    '/css/style.css',
    '/js/app.js',
    '/js/dashboard.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
