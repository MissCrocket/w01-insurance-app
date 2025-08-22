self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('cii-w01-tutor-store').then((cache) => cache.addAll([
      '/',
      '/index.html',
      '/js/main.js',
      '/css/style.css',
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});