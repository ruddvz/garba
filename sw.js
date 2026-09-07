const CACHE_PREFIX = 'garba-shell-';
const VERSION = `${CACHE_PREFIX}v4`;
const SHELL_CACHE = `${VERSION}:shell`;
const RUNTIME_CACHE = `${VERSION}:runtime`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './offline.html',
  './data/genres.json',
  './data/ui-demo-songs.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/backgrounds/library/11-master-dark-courtyard.webp',
  './assets/backgrounds/library/15-traditional-canopy-courtyard.webp',
  './assets/backgrounds/library/10-dandiya-purple-courtyard.webp',
  './assets/backgrounds/library/03-devotional-garba-courtyard.webp',
  './assets/backgrounds/library/14-gujarati-folk-courtyard.webp',
  './assets/backgrounds/library/04-colourful-garba-courtyard-a.webp',
  './assets/backgrounds/library/05-fusion-gujarati-neon.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('./index.html')) || caches.match('./offline.html'))
    );
    return;
  }

  if (url.pathname.endsWith('/data/songs.json') || url.pathname.endsWith('/data/genres.json') || url.pathname.endsWith('/data/ui-demo-songs.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script' || request.destination === 'manifest') {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await caches.match(request));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = (await cache.match(request)) || (await caches.match(request));
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
