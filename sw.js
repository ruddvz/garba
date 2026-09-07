const CACHE_PREFIX = 'garba-shell-';
const VERSION = `${CACHE_PREFIX}v12-player-pwa`;
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
  './styles/part-7.css',
  './app.js',
  './ux-polish.js',
  './ux-next.js',
  './ux-input.js',
  './visual-library.js',
  './catalogue-bootstrap.js',
  './playback-bridge.js',
  './playback-status.js',
  './manifest.webmanifest',
  './offline.html',
  './data/genres.json',
  './data/taxonomy.json',
  './data/catalogue/index.json',
  './data/songs.json',
  './data/playback-sources.json',
  './data/playback-sources-current.json',
  './data/playback-sources-generated.json',
  './data/playback-coverage.json',
  './data/nonstop.json',
  './data/discovery/sets/index.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/maskable.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/backgrounds/traditional.svg',
  './assets/backgrounds/dandiya.svg',
  './assets/backgrounds/devotional.svg',
  './assets/backgrounds/folk.svg',
  './assets/backgrounds/sanedo.svg',
  './assets/backgrounds/fusion.svg'
];

const OPTIONAL_ARTWORK = [
  './assets/backgrounds/library/01-bollywood-garba-courtyard.webp',
  './assets/backgrounds/library/02-rhythmic-drums-courtyard-a.webp',
  './assets/backgrounds/library/03-devotional-garba-courtyard.webp',
  './assets/backgrounds/library/04-colourful-garba-courtyard-a.webp',
  './assets/backgrounds/library/05-fusion-gujarati-neon.webp',
  './assets/backgrounds/library/06-fusion-abstract-neon.webp',
  './assets/backgrounds/library/07-dandiya-purple-courtyard.webp',
  './assets/backgrounds/library/08-colourful-garba-courtyard-b.webp',
  './assets/backgrounds/library/09-warm-stage-courtyard.webp',
  './assets/backgrounds/library/10-dandiya-silhouette-courtyard.webp',
  './assets/backgrounds/library/11-master-dark-courtyard.webp',
  './assets/backgrounds/library/12-rhythmic-drums-courtyard-b.webp',
  './assets/backgrounds/library/13-traditional-marigold-courtyard.webp',
  './assets/backgrounds/library/14-gujarati-folk-courtyard.webp',
  './assets/backgrounds/library/15-traditional-canopy-courtyard.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL);
    await Promise.allSettled(OPTIONAL_ARTWORK.map(async (url) => {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
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

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'manifest') {
    event.respondWith(networkFirst(request));
    return;
  }

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
