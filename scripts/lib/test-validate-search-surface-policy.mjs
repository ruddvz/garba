import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateSearchSurfacePolicy } from './validate-search-surface-policy.mjs';

const ORIGIN = 'https://playgarba.com';

function policy(overrides = {}) {
  return {
    version: 1,
    canonicalOrigin: ORIGIN,
    admittedSitemapRoutes: ['/', '/explore/', '/what-is-garba/', '/navratri-2026/'],
    forbiddenRoutePrefixes: ['/songs/', '/artists/', '/releases/', '/nonstop/'],
    ...overrides,
  };
}

function sitemap(routes) {
  return `<?xml version="1.0"?><urlset>${routes.map((route) => `<url><loc>${route.startsWith('http') ? route : `${ORIGIN}${route}`}</loc></url>`).join('')}</urlset>`;
}

function expectValid(name, input) {
  const result = validateSearchSurfacePolicy(input);
  assert.equal(result.ok, true, `${name}: ${result.errors.join(' | ')}`);
}

function expectInvalid(name, input, expected) {
  const result = validateSearchSurfacePolicy(input);
  assert.equal(result.ok, false, `${name}: expected failure`);
  assert.match(result.errors.join('\n'), expected, `${name}: ${result.errors.join(' | ')}`);
}

export function runSearchSurfacePolicySelfTests() {
  expectValid('current-style admitted sitemap', {
    policy: policy(),
    sitemapXml: sitemap(['/', '/explore/', '/navratri-2026/']),
  });

  expectValid('admitted route does not have to be published', {
    policy: policy({ admittedSitemapRoutes: ['/', '/explore/', '/what-is-garba/', '/history-of-garba/'] }),
    sitemapXml: sitemap(['/', '/explore/']),
  });

  expectInvalid('unknown route', {
    policy: policy(),
    sitemapXml: sitemap(['/', '/explore/', '/new-keyword-page/']),
  }, /not admitted by search-surface policy/);

  expectInvalid('forbidden entity family remains forbidden even if allowlisted', {
    policy: policy({ admittedSitemapRoutes: ['/', '/explore/', '/songs/foo/'] }),
    sitemapXml: sitemap(['/', '/explore/', '/songs/foo/']),
  }, /forbidden route family cannot be admitted|forbidden entity-page family/);

  expectInvalid('wrong canonical origin', {
    policy: policy(),
    sitemapXml: sitemap(['/', 'https://www.playgarba.com/explore/']),
  }, /must use canonical origin/);

  expectInvalid('query canonical state', {
    policy: policy(),
    sitemapXml: sitemap(['/', `${ORIGIN}/explore/?genre=folk`]),
  }, /must not contain query\/hash state/);

  expectInvalid('duplicate policy route', {
    policy: policy({ admittedSitemapRoutes: ['/', '/explore/', '/explore/'] }),
    sitemapXml: sitemap(['/', '/explore/']),
  }, /duplicate admitted route/);

  expectInvalid('duplicate sitemap URL', {
    policy: policy(),
    sitemapXml: sitemap(['/', '/explore/', '/explore/']),
  }, /duplicate sitemap <loc>/);

  return 8;
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  const count = runSearchSurfacePolicySelfTests();
  console.log(`✓ Search surface policy self-tests passed (${count} cases).`);
}
