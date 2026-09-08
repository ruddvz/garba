import { setTimeout as delay } from 'node:timers/promises';

const LIVE_ORIGIN = normaliseOrigin(process.env.PLAYGARBA_LIVE_ORIGIN || 'https://live.playgarba.com');
const PUBLIC_ORIGIN = normaliseOrigin(process.env.PLAYGARBA_PUBLIC_ORIGIN || 'https://playgarba.com');
const WWW_ORIGIN = normaliseOrigin(process.env.PLAYGARBA_WWW_ORIGIN || 'https://www.playgarba.com');
const ATTEMPTS = positiveInt(process.env.SMOKE_ATTEMPTS, 6);
const RETRY_DELAY_MS = positiveInt(process.env.SMOKE_RETRY_DELAY_MS, 5000);
const REQUEST_TIMEOUT_MS = positiveInt(process.env.SMOKE_TIMEOUT_MS, 12000);
const MODE = process.argv[2] || 'live';

function normaliseOrigin(value) {
  const url = new URL(value);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalFrom(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\brel=["']canonical["']/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href) return href;
  }
  return null;
}

async function requestWithRetry(url, { as = 'text', redirect = 'follow', requireOk = true } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          'cache-control': 'no-cache',
          'user-agent': 'PlayGarba-production-smoke/1.1',
        },
        redirect,
        signal: controller.signal,
      });

      if (requireOk && !response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const body = as === 'buffer'
        ? Buffer.from(await response.arrayBuffer())
        : await response.text();

      clearTimeout(timer);
      return { response, body };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt}/${ATTEMPTS} failed for ${url}: ${message}`);
      if (attempt < ATTEMPTS) await delay(RETRY_DELAY_MS);
    }
  }

  throw new Error(`Unable to fetch ${url} after ${ATTEMPTS} attempts: ${lastError?.message || lastError}`);
}

async function fetchLive(path, options) {
  const requested = new URL(path, LIVE_ORIGIN);
  const result = await requestWithRetry(requested, options);
  const finalUrl = new URL(result.response.url);
  assert(
    finalUrl.origin === LIVE_ORIGIN.origin,
    `${requested} unexpectedly redirected off the live origin to ${finalUrl}`,
  );
  return result;
}

async function verifyPlayerHtml(path, expectedCanonical = LIVE_ORIGIN.href) {
  const { body: html } = await fetchLive(path);
  assert(/<html\b/i.test(html), `${path} did not return HTML`);
  assert(/PlayGarba/i.test(html), `${path} is missing the PlayGarba product marker`);
  const canonical = canonicalFrom(html);
  assert(canonical === expectedCanonical, `${path} canonical was ${canonical || 'missing'}, expected ${expectedCanonical}`);
  assert(!html.includes('https://playgarba.com/assets/social/'), `${path} still exposes the public apex as the player social origin`);
  return html;
}

async function verifyLive() {
  console.log(`Verifying live player origin: ${LIVE_ORIGIN.href}`);

  const root = await verifyPlayerHtml('/');
  assert(/rel=["']manifest["']/i.test(root), 'Player root is missing its web app manifest link');

  await verifyPlayerHtml('/?genre=traditional');
  await verifyPlayerHtml('/?nonstop=1');
  await verifyPlayerHtml('/?browse=1');
  await verifyPlayerHtml('/catalogue/', new URL('/catalogue/', LIVE_ORIGIN).href);

  const manifestUrl = new URL('/manifest.webmanifest', LIVE_ORIGIN);
  const { body: manifestText, response: manifestResponse } = await fetchLive('/manifest.webmanifest');
  const manifest = JSON.parse(manifestText);
  assert(/json/i.test(manifestResponse.headers.get('content-type') || '') || manifestText.trim().startsWith('{'), 'Manifest did not look like JSON');
  assert(manifest.name === 'PlayGarba', `Unexpected manifest name: ${manifest.name}`);
  assert(manifest.display === 'standalone', `Manifest display must remain standalone, got ${manifest.display}`);
  assert(typeof manifest.start_url === 'string' && manifest.start_url.length > 0, 'Manifest start_url is missing');
  assert(typeof manifest.scope === 'string' && manifest.scope.length > 0, 'Manifest scope is missing');
  assert(new URL(manifest.start_url, manifestUrl).origin === LIVE_ORIGIN.origin, 'Manifest start_url escaped the live origin');
  assert(new URL(manifest.scope, manifestUrl).origin === LIVE_ORIGIN.origin, 'Manifest scope escaped the live origin');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest icons are incomplete');
  assert(manifest.icons.some((icon) => String(icon.purpose || '').includes('maskable')), 'Manifest is missing a maskable icon');

  const { body: serviceWorker } = await fetchLive('/sw.js');
  assert(serviceWorker.length > 500, 'Service worker response is unexpectedly small');
  assert(/addEventListener\s*\(\s*['"]fetch['"]/i.test(serviceWorker), 'Service worker is missing its fetch handler');

  const { body: offline } = await fetchLive('/offline.html');
  assert(/<html\b/i.test(offline), 'Offline shell did not return HTML');

  const { body: robots } = await fetchLive('/robots.txt');
  assert(robots.includes(`Sitemap: ${new URL('/sitemap.xml', LIVE_ORIGIN).href}`), 'robots.txt does not advertise the live sitemap');

  const { body: sitemap } = await fetchLive('/sitemap.xml');
  assert(sitemap.includes(`<loc>${LIVE_ORIGIN.href}</loc>`), 'Sitemap is missing the live root');
  assert(sitemap.includes(`<loc>${new URL('/catalogue/', LIVE_ORIGIN).href}</loc>`), 'Sitemap is missing the live catalogue');
  assert(!sitemap.includes('<loc>https://playgarba.com/'), 'Live sitemap still contains public-apex player URLs');

  const { body: socialCard, response: socialResponse } = await fetchLive('/assets/social/garba-og-card.png', { as: 'buffer' });
  assert((socialResponse.headers.get('content-type') || '').includes('image/png'), 'OG card did not return image/png');
  assert(socialCard.length > 10000, `OG card is unexpectedly small (${socialCard.length} bytes)`);

  console.log('Live player production smoke test passed.');
}

async function verifyPublic() {
  console.log(`Verifying public website origin: ${PUBLIC_ORIGIN.href}`);
  const requiredPages = [
    ['/', PUBLIC_ORIGIN.href],
    ['/how-to-use/', new URL('/how-to-use/', PUBLIC_ORIGIN).href],
    ['/install/', new URL('/install/', PUBLIC_ORIGIN).href],
    ['/live/', new URL('/live/', PUBLIC_ORIGIN).href],
    ['/about/', new URL('/about/', PUBLIC_ORIGIN).href],
    ['/faq/', new URL('/faq/', PUBLIC_ORIGIN).href],
  ];

  for (const [path, expectedCanonical] of requiredPages) {
    const requested = new URL(path, PUBLIC_ORIGIN);
    const { response, body: html } = await requestWithRetry(requested);
    const finalUrl = new URL(response.url);
    assert(finalUrl.origin === PUBLIC_ORIGIN.origin, `${requested} redirected off the public origin to ${finalUrl}`);
    assert(/<html\b/i.test(html), `${path} did not return HTML`);
    assert(/PlayGarba|GARBA/i.test(html), `${path} is missing the PlayGarba product marker`);
    assert(canonicalFrom(html) === expectedCanonical, `${path} has the wrong canonical URL`);
    assert(html.includes('https://live.playgarba.com/'), `${path} does not expose the live player handoff`);
  }

  const { body: robots } = await requestWithRetry(new URL('/robots.txt', PUBLIC_ORIGIN));
  assert(robots.includes(`Sitemap: ${new URL('/sitemap.xml', PUBLIC_ORIGIN).href}`), 'Public robots.txt does not advertise the apex sitemap');

  const { body: sitemap } = await requestWithRetry(new URL('/sitemap.xml', PUBLIC_ORIGIN));
  for (const [, expectedCanonical] of requiredPages) {
    assert(sitemap.includes(`<loc>${expectedCanonical}</loc>`), `Public sitemap is missing ${expectedCanonical}`);
  }

  console.log('Public website production smoke test passed.');
}

async function verifyWww() {
  console.log(`Verifying www redirect: ${WWW_ORIGIN.href} → ${PUBLIC_ORIGIN.href}`);
  const { response } = await requestWithRetry(WWW_ORIGIN, {
    redirect: 'manual',
    requireOk: false,
  });

  assert([301, 308].includes(response.status), `www must use a permanent redirect (301 or 308), got HTTP ${response.status}`);
  const location = response.headers.get('location');
  assert(location, 'www redirect is missing a Location header');
  const target = new URL(location, WWW_ORIGIN);
  assert(target.href === PUBLIC_ORIGIN.href, `www redirects to ${target.href}, expected ${PUBLIC_ORIGIN.href}`);

  console.log('www permanent redirect verification passed.');
}

try {
  if (MODE === 'live') await verifyLive();
  else if (MODE === 'public') await verifyPublic();
  else if (MODE === 'www') await verifyWww();
  else throw new Error(`Unknown mode "${MODE}". Use "live", "public" or "www".`);
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
