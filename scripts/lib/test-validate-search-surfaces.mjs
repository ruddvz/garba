import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSearchSurfaces } from './validate-search-surfaces.mjs';

const ORIGIN = 'https://playgarba.com';

function write(root, relativePath, content) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function page({ title = 'Page · PlayGarba', description = 'Useful page description.', canonical, h1 = 'Page', robots = 'index, follow', ogUrl = canonical, ogTitle = title, ogImage = `${ORIGIN}/assets/social/card.png` } = {}) {
  return `<!doctype html><html><head>
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${ogTitle}">
<meta property="og:url" content="${ogUrl}">
<meta property="og:image" content="${ogImage}">
</head><body><main><h1>${h1}</h1></main></body></html>`;
}

function baseFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playgarba-seo-validator-'));
  write(root, '.github/workflows/pages.yml', `name: Pages\njobs:\n  build:\n    steps:\n      - run: |\n          cp -R \\\n            public-site/about \\\n            public-site/faq \\\n            public-site/how-to-use \\\n            public-site/install \\\n            public-site/live \\\n            public-site/what-is-garba \\\n            _site/\n`);
  write(root, 'robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  write(root, 'sitemap.xml', `<?xml version="1.0"?><urlset>\n<url><loc>${ORIGIN}/</loc></url>\n<url><loc>${ORIGIN}/explore/</loc></url>\n<url><loc>${ORIGIN}/what-is-garba/</loc></url>\n<url><loc>${ORIGIN}/how-to-use/</loc></url>\n<url><loc>${ORIGIN}/about/</loc></url>\n<url><loc>${ORIGIN}/install/</loc></url>\n<url><loc>${ORIGIN}/faq/</loc></url>\n</urlset>`);
  write(root, 'index.html', page({ title: 'PlayGarba', canonical: `${ORIGIN}/`, h1: 'PlayGarba' }));
  write(root, 'src/catalogue/index.html', page({ title: 'Explore', canonical: `${ORIGIN}/explore/`, h1: 'Explore' }));
  write(root, 'public-site/about/index.html', page({ title: 'About', canonical: `${ORIGIN}/about/`, h1: 'About' }));
  write(root, 'public-site/faq/index.html', page({ title: 'FAQ', canonical: `${ORIGIN}/faq/`, h1: 'FAQ' }));
  write(root, 'public-site/how-to-use/index.html', page({ title: 'Guide', canonical: `${ORIGIN}/how-to-use/`, h1: 'Guide' }));
  write(root, 'public-site/install/index.html', page({ title: 'Install', canonical: `${ORIGIN}/install/`, h1: 'Install' }));
  write(root, 'public-site/live/index.html', page({ title: 'Live', canonical: `${ORIGIN}/live/`, h1: 'Live' }));
  write(root, 'public-site/what-is-garba/index.html', page({ title: 'What is Garba?', canonical: `${ORIGIN}/what-is-garba/`, h1: 'What is Garba?' }));
  return root;
}

function expectValid(name, mutate = () => {}) {
  const root = baseFixture();
  try {
    mutate(root);
    const result = validateSearchSurfaces(root, { quiet: true });
    assert.equal(result.ok, true, `${name}: ${result.errors.join(' | ')}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function expectInvalid(name, mutate, expected) {
  const root = baseFixture();
  try {
    mutate(root);
    const result = validateSearchSurfaces(root, { quiet: true });
    assert.equal(result.ok, false, `${name}: expected validation failure`);
    assert.match(result.errors.join('\n'), expected, `${name}: unexpected errors: ${result.errors.join(' | ')}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

expectValid('valid production fixture', (root) => {
  const result = validateSearchSurfaces(root, { quiet: true });
  assert.equal(result.routes.length, 9, 'current Pages-style fixture should expose root, Explore, catalogue alias and six public pages');
});

expectValid('compatibility alias may share Explore canonical when omitted from sitemap', (root) => {
  // /catalogue/ is derived from the same source as /explore/ by the validator and is intentionally absent from sitemap.
  assert.ok(fs.existsSync(path.join(root, 'src/catalogue/index.html')));
});

expectInvalid('wrong canonical host', (root) => {
  write(root, 'public-site/about/index.html', page({ canonical: 'https://www.playgarba.com/about/', h1: 'About' }));
}, /canonical URL must use https:\/\/playgarba\.com/);

expectInvalid('duplicate sitemap URL', (root) => {
  fs.appendFileSync(path.join(root, 'sitemap.xml'), `\n<url><loc>${ORIGIN}/about/</loc></url>`);
}, /duplicate <loc>/);

expectInvalid('unknown sitemap route', (root) => {
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0"?><urlset><url><loc>${ORIGIN}/missing/</loc></url></urlset>`);
}, /URL is not deployed by the Pages artifact/);

expectInvalid('noindex route in sitemap', (root) => {
  write(root, 'public-site/about/index.html', page({ canonical: `${ORIGIN}/about/`, h1: 'About', robots: 'noindex, follow' }));
}, /sitemap route must not be noindex/);

expectInvalid('canonical alias may not be in sitemap', (root) => {
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0"?><urlset>\n<url><loc>${ORIGIN}/</loc></url>\n<url><loc>${ORIGIN}/explore/</loc></url>\n<url><loc>${ORIGIN}/catalogue/</loc></url>\n<url><loc>${ORIGIN}/about/</loc></url>\n</urlset>`);
}, /sitemap route must be self-canonical|canonical alias must not appear in sitemap/);

expectInvalid('robots may not block the whole site', (root) => {
  write(root, 'robots.txt', `User-agent: *\nDisallow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
}, /must not disallow the entire site/);

expectInvalid('og URL must match canonical', (root) => {
  write(root, 'public-site/about/index.html', page({ canonical: `${ORIGIN}/about/`, h1: 'About', ogUrl: `${ORIGIN}/wrong/` }));
}, /og:url must match canonical/);

expectInvalid('indexable deployed page requires H1', (root) => {
  write(root, 'public-site/about/index.html', page({ canonical: `${ORIGIN}/about/`, h1: '' }));
}, /missing non-empty <h1>/);

console.log('✓ Search surface validator self-tests passed (9 cases).');
