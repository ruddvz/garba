import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const ok = (message) => console.log(`✓ ${message}`);
const exists = async (file) => {
  try { await access(path.join(root, file)); return true; }
  catch { return false; }
};
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));

const requiredRootFiles = new Set([
  '.gitignore',
  'CONTRIBUTING.md',
  'README.md',
  'app.js',
  'index.html',
  'manifest.webmanifest',
  'nonstop-browser.js',
  'offline.html',
  'package.json',
  'simple-runtime.js',
  'styles.css',
  'sw.js',
]);
const allowedRootDirs = new Set(['.github', 'assets', 'data', 'docs', 'scripts', 'src', 'styles']);

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.name === '.git') continue;
  if (entry.isDirectory()) {
    if (!allowedRootDirs.has(entry.name)) fail(`Unexpected root directory: ${entry.name}`);
    continue;
  }
  if (!requiredRootFiles.has(entry.name)) fail(`Unexpected root file: ${entry.name}`);
}
for (const file of requiredRootFiles) if (!await exists(file)) fail(`Missing required root file: ${file}`);

const rootJs = (await readdir(root)).filter((file) => file.endsWith('.js')).sort();
const expectedRootJs = ['app.js', 'nonstop-browser.js', 'simple-runtime.js', 'sw.js'];
if (JSON.stringify(rootJs) !== JSON.stringify(expectedRootJs)) {
  fail(`Root JavaScript must be production-only. Expected ${expectedRootJs.join(', ')}, found ${rootJs.join(', ')}`);
} else ok('root JavaScript is production-only');

const styleLayers = [
  '00-foundation-and-player.css',
  '10-browser-and-shell.css',
  '20-responsive-and-accessibility.css',
  '30-product-polish.css',
  '40-accessibility-states.css',
  '50-discovery-and-performance.css',
  '60-runtime-and-provider.css',
];
const actualStyles = (await readdir(path.join(root, 'styles'))).filter((file) => file.endsWith('.css')).sort();
if (JSON.stringify(actualStyles) !== JSON.stringify(styleLayers)) {
  fail(`Styles must use the ordered semantic layer set. Found: ${actualStyles.join(', ')}`);
} else ok('styles use ordered semantic filenames');
const styleEntry = await read('styles.css');
const expectedImports = styleLayers.map((file) => `@import url("styles/${file}");`).join('\n') + '\n';
if (styleEntry !== expectedImports) fail('styles.css import order does not match the semantic layer contract');

if (!await exists('assets/backgrounds/garba15-2k.zip')) fail('Canonical artwork pack assets/backgrounds/garba15-2k.zip is missing');
if (await exists('assets/backgrounds/garba15-2k-q82.zip')) fail('Legacy artwork alias garba15-2k-q82.zip must not coexist with the canonical filename');

const optionalFiles = [
  'catalogue-bootstrap.js',
  'direct-audio-bridge.js',
  'playback-bridge.js',
  'playback-prewarm.js',
  'playback-release-guard.js',
  'playback-routes.js',
  'ux-input.js',
  'ux-next.js',
  'ux-polish.js',
  'visual-library.js',
];
for (const file of optionalFiles) if (!await exists(`src/optional/${file}`)) fail(`Missing retained optional module: src/optional/${file}`);
if (!await exists('src/optional/README.md')) fail('src/optional/README.md must document the production boundary');

const docsTop = await readdir(path.join(root, 'docs'), { withFileTypes: true });
for (const entry of docsTop) {
  if (entry.isFile() && entry.name !== 'README.md') fail(`Documentation must be grouped by responsibility, found docs/${entry.name}`);
}
for (const folder of ['catalogue', 'operations', 'product', 'project', 'rights']) {
  if (!await exists(`docs/${folder}`)) fail(`Missing documentation responsibility folder: docs/${folder}`);
}

const catalogueIndex = await readJson('data/catalogue/index.json');
const requiredIndexedPaths = [
  ...(catalogueIndex.songChunks || []),
  ...(catalogueIndex.releaseChunks || []),
  ...(catalogueIndex.freeSourceChunks || []),
  ...(catalogueIndex.playbackSources || []),
  catalogueIndex.taxonomy,
  catalogueIndex.nonstopSets,
  catalogueIndex.discovery?.setsIndex,
].filter(Boolean);
for (const file of requiredIndexedPaths) if (!await exists(file)) fail(`Catalogue manifest references missing file: ${file}`);

const compareCanonicalDir = async (dir, indexed) => {
  const actual = (await readdir(path.join(root, dir))).filter((file) => file.endsWith('.json')).map((file) => `${dir}/${file}`).sort();
  const expected = indexed.filter((file) => file.startsWith(`${dir}/`)).sort();
  for (const file of actual) if (!expected.includes(file)) fail(`Unindexed canonical shard in ${dir}: ${file}`);
  for (const file of expected) if (!actual.includes(file)) fail(`Indexed shard missing from ${dir}: ${file}`);
};
await compareCanonicalDir('data/catalogue/songs', catalogueIndex.songChunks || []);
await compareCanonicalDir('data/catalogue/releases', catalogueIndex.releaseChunks || []);
await compareCanonicalDir('data/catalogue/free-sources', catalogueIndex.freeSourceChunks || []);

for (const file of [
  'data/catalogue/archive/README.md',
  'data/catalogue/archive/rangtaal-release-2025.json',
  'data/catalogue/archive/rangtaal-song-2025.json',
  'data/catalogue/archive/umesh-barot-garba-2022-2025.json',
  'data/README.md',
  'docs/README.md',
]) if (!await exists(file)) fail(`Missing repository organisation file: ${file}`);

const pages = await read('.github/workflows/pages.yml');
if (pages.includes('cp index.html *.js')) fail('Pages deployment must not copy JavaScript through a root glob');
for (const file of expectedRootJs) if (!pages.includes(file)) fail(`Pages workflow does not explicitly account for runtime file: ${file}`);
for (const layer of styleLayers) if (!pages.includes(`styles/${layer}`)) fail(`Pages workflow missing style layer: ${layer}`);
if (!pages.includes("PACK='assets/backgrounds/garba15-2k.zip'")) fail('Pages workflow must use the canonical artwork-pack filename');

if (failed) process.exit(1);
ok('catalogue source directories contain only manifest-indexed shards');
ok('unindexed historical catalogue fragments are isolated in archive/');
ok('documentation is grouped by responsibility');
ok('Pages deployment uses explicit runtime and stylesheet contracts');
