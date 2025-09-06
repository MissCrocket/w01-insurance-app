// sw.js

// [TECH] Basic Offline Support using a Service Worker

const CACHE_NAME = 'cii-w01-tutor-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/mascot.css',
  '/js/main.js',
  '/js/boot.js',
  '/js/config.js',
  '/js/services/progressService.js',
  '/js/ui.js',
  '/js/utils/spacedRepetition.js',
  '/manifest.json',
  '/public/favicon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  // Add all data files to the cache
  '/data/contract_and_agency_ch3.json',
  '/data/contribution_and_subrogation_ch8.json',
  '/data/disclosure_and_representation_ch5.json',
  '/data/ethics_and_governance_ch10.json',
  '/data/indemnity_ch7.json',
  '/data/insurable_interest_ch4.json',
  '/data/insurance_market_ch2.json',
  '/data/insurance_regulation_ch9.json',
  '/data/proximate_cause_ch6.json',
  '/data/risk_and_insurance_ch1.json',
  '/data/specimen_exam.json'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});