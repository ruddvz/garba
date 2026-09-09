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
  'accept=\"image/*\"',
  "String(file.type || '').startsWith('image/')",
  'URL.createObjectURL(blob)',
  'URL.revokeObjectURL(state.objectUrl)',
  "app.style.setProperty('--garba-custom-background'",
  "app.dataset.customBackground = 'true'",
  "delete app.dataset.customBackground",
  'saveStoredBackground',
  'deleteStoredBackground',
  "Background saved on this device.",
  "PlayGarba background restored.",
  'window.GARBA_LOCAL_BACKGROUND',
]) {
  if (!runtime.includes(marker)) fail(`Local background runtime is missing: ${marker}`);
}

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
console.log('✓ Local custom background remains image-only, device-local, resettable and bootstrapped');
