const CACHE_PREFIX = 'garba-live-';
const CACHE_NAME = `${CACHE_PREFIX}v15`;
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
  './catalogue/',
  './catalogue/index.html',
  './catalogue/catalogue.css',
  './catalogue/catalogue.js',
  './catalogue/listening-library.js',
  './catalogue/search-surface.js',
  './manifest.webmanifest',
  './offline.html',
  './favicon.ico',
  './assets/icons/browserconfig.xml',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon-16.png',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon-48.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/apple-touch-icon-152.png',
  './assets/icons/apple-touch-icon-167.png',
  './assets/icons/mstile-150x150.png',
  './assets/icons/mstile-310x310.png',
  './assets/icons/maskable.svg',
  './assets/icons/maskable-192.png',
  './assets/icons/maskable-512.png',
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
  '/catalogue/catalogue.css',
  '/catalogue/catalogue.js',
  '/catalogue/listening-library.js',
  '/catalogue/search-surface.js',
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
const isCatalogueNavigation = (pathname) => pathname.endsWith('/catalogue/') || pathname.endsWith('/catalogue/index.html');
const isJsonData = (pathname) => pathname.includes('/data/') && pathname.endsWith('.json');

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const fallback = isCatalogueNavigation(url.pathname) ? './catalogue/index.html' : './index.html';
    event.respondWith(networkFirst(request, fallback));
    return;
  }

  if (isFreshRuntime(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isJsonData(url.pathname)) {
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
