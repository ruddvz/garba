const CACHE_PREFIX = 'garba-live-';
const CACHE_NAME = `${CACHE_PREFIX}v10`;
const LEGACY_PREFIX = 'garba-shell-';

const CORE_SHELL = [
  './',
  './index.html',
  './styles.css',
  './simple-runtime.js',
  './provider-runtime.js',
  './player-continuity.js',
  './youtube-player-runtime.js',
  './nonstop-browser.js',
  './app.js',
  './manifest.webmanifest',
  './offline.html',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/maskable.svg',
  './assets/backgrounds/traditional.svg',
  './assets/backgrounds/dandiya.svg',
  './assets/backgrounds/devotional.svg',
  './assets/backgrounds/folk.svg',
  './assets/backgrounds/sanedo.svg',
  './assets/backgrounds/fusion.svg',
];

const FRESH_RUNTIME_SUFFIXES = [
  '/index.html',
  '/styles.css',
  '/simple-runtime.js',
  '/provider-runtime.js',
  '/player-continuity.js',
  '/youtube-player-runtime.js',
  '/nonstop-browser.js',
  '/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) || key.startsWith(LEGACY_PREFIX))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || await network || Response.error();
}

async function networkFirst(request, fallback = null) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallback) {
      const fallbackResponse = await cache.match(fallback);
      if (fallbackResponse) return fallbackResponse;
    }
    return Response.error();
  }
}

const isFreshRuntime = (pathname) => FRESH_RUNTIME_SUFFIXES.some((suffix) => pathname.endsWith(suffix));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  if (isFreshRuntime(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.endsWith('/data/songs.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.endsWith('/data/genres.json')
    || url.pathname.includes('/data/discovery/sets/')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.includes('/assets/backgrounds/library/') && url.pathname.endsWith('.webp')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
