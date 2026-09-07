const CACHE_PREFIX = 'garba-shell-';
const VERSION = `${CACHE_PREFIX}v10-discovery`;
const SHELL_CACHE = `${VERSION}:shell`;
const RUNTIME_CACHE = `${VERSION}:runtime`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './styles/part-1.css',
  './styles/part-2.css',
  './styles/part-3.css',
  './styles/part-4.css',
  './styles/part-5.css',
  './styles/part-6.css',
  './app.js',
  './ux-polish.js',
  './ux-next.js',
  './visual-library.js',
  './catalogue-bootstrap.js',
  './playback-bridge.js',
  './manifest.webmanifest',
  './offline.html',
  './data/genres.json',
  './data/taxonomy.json',
  './data/catalogue/index.json',
  './data/playback-sources.json',
  './data/playback-sources-current.json',
  './data/nonstop.json',
  './data/discovery/sets/index.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/maskable.svg',
  './assets/icons/apple-touch-icon.png',
  // Lightweight fallbacks remain precached. The approved high-resolution
  // WebPs are cached on first use so installing the PWA does not download
  // the entire visual library at once.
  './assets/backgrounds/traditional.svg',
  './assets/backgrounds/dandiya.svg',
  './assets/backgrounds/devotional.svg',
  './assets/backgrounds/folk.svg',
  './assets/backgrounds/sanedo.svg',
  './assets/backgrounds/fusion.svg'
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
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true })) || (await caches.match('./index.html')) || caches.match('./offline.html'))
    );
    return;
  }

  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // JS/CSS are network-first so fixes reach installed PWAs immediately.
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'manifest') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Artwork and app icons are immutable per filename/version and are ideal for cache-first.
  if (request.destination === 'image') {
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
