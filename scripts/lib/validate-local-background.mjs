import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');

const [runtime, provider] = await Promise.all([
  read('assets/runtime/local-background.js'),
  read('provider-runtime.js'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  "const DB_NAME = 'playgarba-local-media'",
  "indexedDB.open(DB_NAME, DB_VERSION)",
  "const LIBRARY_BASE = 'assets/backgrounds/library/'",
  'const LIBRARY_BACKGROUNDS = [',
  'accept=\"image/*\"',
  "String(file.type || '').startsWith('image/')",
  'URL.createObjectURL(blob)',
  'URL.revokeObjectURL(state.objectUrl)',
  "app.style.setProperty('--garba-custom-background'",
  "app.dataset.customBackground = 'true'",
  "delete app.dataset.customBackground",
  "kind: 'library'",
  'data-action=\"upload-background\">Upload',
  'data-action=\"reset-background\" disabled>Reset',
  'data-action=\"explore-backgrounds\">Explore',
  'data-library-background=',
  'aria-haspopup=\"menu\"',
  'saveStoredBackground',
  'deleteStoredBackground',
  "Background saved on this device.",
  "PlayGarba background restored.",
  'window.GARBA_LOCAL_BACKGROUND',
]) {
  if (!runtime.includes(marker)) fail(`Local background runtime is missing: ${marker}`);
}

const libraryBlock = runtime.match(/const LIBRARY_BACKGROUNDS = \[([\s\S]*?)\n  \];/);
const libraryCount = libraryBlock?.[1].match(/\.webp'/g)?.length || 0;
if (libraryCount !== 15) fail(`Explore must expose exactly 15 curated backgrounds, found ${libraryCount}`);

for (const forbidden of [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bFormData\b/,
  /navigator\.sendBeacon/,
]) {
  if (forbidden.test(runtime)) fail(`Local background runtime must not use a network/upload path: ${forbidden}`);
}

for (const marker of [
  'function loadLocalBackgroundRuntime()',
  "script.id = 'garbaLocalBackgroundRuntime'",
  "script.src = 'assets/runtime/local-background.js'",
  'loadLocalBackgroundRuntime();',
]) {
  if (!provider.includes(marker)) fail(`Provider bootstrap is missing local background loader: ${marker}`);
}

if (failed) process.exit(1);
console.log('✓ Background menu exposes Upload, Reset and Explore with 15 curated images and device-local uploads');
