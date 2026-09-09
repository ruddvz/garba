const DEFAULT_CANONICAL_ORIGIN = 'https://playgarba.com';

function decodeXmlText(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeRoute(route) {
  const value = String(route || '').trim();
  if (!value || value === '/') return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function isCanonicalRouteShape(route) {
  if (route === '/') return true;
  return route.startsWith('/') && route.endsWith('/') && !route.includes('//') && !route.includes('?') && !route.includes('#');
}

export function parseSitemapLocs(xml = '') {
  return [...String(xml).matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeXmlText(match[1]).trim())
    .filter(Boolean);
}

export function validateSearchSurfacePolicy({ policy, sitemapXml }) {
  const errors = [];
  const warnings = [];

  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return { ok: false, errors: ['policy must be a JSON object'], warnings, sitemapRoutes: [] };
  }

  if (policy.version !== 1) errors.push(`policy.version must be 1, found ${String(policy.version)}`);

  const canonicalOrigin = String(policy.canonicalOrigin || '').replace(/\/$/, '');
  if (canonicalOrigin !== DEFAULT_CANONICAL_ORIGIN) {
    errors.push(`policy.canonicalOrigin must be ${DEFAULT_CANONICAL_ORIGIN}`);
  }

  const admitted = Array.isArray(policy.admittedSitemapRoutes) ? policy.admittedSitemapRoutes : [];
  const forbidden = Array.isArray(policy.forbiddenRoutePrefixes) ? policy.forbiddenRoutePrefixes : [];
  if (!admitted.length) errors.push('policy.admittedSitemapRoutes must contain at least one route');
  if (!forbidden.length) errors.push('policy.forbiddenRoutePrefixes must contain at least one route prefix');

  const admittedSet = new Set();
  for (const rawRoute of admitted) {
    const route = String(rawRoute || '').trim();
    if (normalizeRoute(route) !== route || !isCanonicalRouteShape(route)) {
      errors.push(`admitted route must use canonical leading/trailing-slash form without query/hash: ${route || '(empty)'}`);
      continue;
    }
    if (admittedSet.has(route)) errors.push(`duplicate admitted route: ${route}`);
    admittedSet.add(route);
  }

  const forbiddenSet = new Set();
  for (const rawPrefix of forbidden) {
    const prefix = String(rawPrefix || '').trim();
    if (prefix === '/' || normalizeRoute(prefix) !== prefix || !isCanonicalRouteShape(prefix)) {
      errors.push(`forbidden route prefix must be a non-root canonical path prefix: ${prefix || '(empty)'}`);
      continue;
    }
    if (forbiddenSet.has(prefix)) errors.push(`duplicate forbidden route prefix: ${prefix}`);
    forbiddenSet.add(prefix);
  }

  for (const route of admittedSet) {
    for (const prefix of forbiddenSet) {
      if (route === prefix || route.startsWith(prefix)) {
        errors.push(`forbidden route family cannot be admitted: ${route} matches ${prefix}`);
      }
    }
  }

  const sitemapLocs = parseSitemapLocs(sitemapXml);
  if (!sitemapLocs.length) errors.push('sitemap.xml contains no <loc> entries');

  const seenLocs = new Set();
  const sitemapRoutes = [];
  for (const loc of sitemapLocs) {
    if (seenLocs.has(loc)) errors.push(`duplicate sitemap <loc>: ${loc}`);
    seenLocs.add(loc);

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      errors.push(`sitemap URL must be absolute: ${loc}`);
      continue;
    }

    if (parsed.protocol !== 'https:' || parsed.origin !== canonicalOrigin) {
      errors.push(`sitemap URL must use canonical origin ${canonicalOrigin}: ${loc}`);
    }
    if (parsed.search || parsed.hash) errors.push(`sitemap URL must not contain query/hash state: ${loc}`);

    const route = parsed.pathname || '/';
    if (normalizeRoute(route) !== route || !isCanonicalRouteShape(route)) {
      errors.push(`sitemap route must use canonical leading/trailing-slash form: ${route}`);
      continue;
    }
    sitemapRoutes.push(route);

    for (const prefix of forbiddenSet) {
      if (route === prefix || route.startsWith(prefix)) {
        errors.push(`sitemap route uses forbidden entity-page family ${prefix}: ${route}`);
      }
    }

    if (!admittedSet.has(route)) {
      errors.push(`sitemap route is not admitted by search-surface policy: ${route}`);
    }
  }

  if (!admittedSet.has('/')) warnings.push('policy does not admit the canonical player root /');
  if (!admittedSet.has('/explore/')) warnings.push('policy does not admit the canonical Explore route /explore/');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    sitemapRoutes,
    admittedRoutes: [...admittedSet],
    forbiddenPrefixes: [...forbiddenSet],
  };
}
