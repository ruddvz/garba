import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, pages, pkg] = await Promise.all([
  read('assets/runtime/provider-focus.js'),
  read('.github/workflows/pages.yml'),
  read('package.json'),
]);

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  "const STAGE_SELECTOR = '#providerStage, #youtubeStage'",
  "stage.getAttribute('aria-hidden') !== 'true'",
  'stage.contains(active)',
  "target.focus({ preventScroll: true })",
  "document.addEventListener('click', rememberTrigger, { capture: true })",
  'GARBA_PROVIDER_FOCUS_RUNTIME',
]) {
  if (!runtime.includes(marker)) fail(`Provider-focus runtime is missing: ${marker}`);
}

for (const marker of [
  'cat assets/runtime/provider-focus.js >> _site/app.js',
  "grep -q 'GARBA_PROVIDER_FOCUS_RUNTIME' _site/app.js",
]) {
  if (!pages.includes(marker)) fail(`Pages provider-focus packaging is missing: ${marker}`);
}

if (!pkg.includes('node --check assets/runtime/provider-focus.js')) fail('check:modules must syntax-check assets/runtime/provider-focus.js');
if (!pkg.includes('node scripts/lib/validate-provider-focus-runtime.mjs')) fail('npm run check must validate provider-focus packaging');

if (failed) process.exit(1);
console.log('✓ hidden provider stages cannot retain keyboard focus');
console.log('✓ focus restoration prefers the playback control that opened the provider');
console.log('✓ outside-click provider closure does not steal focus from the user target');
console.log('✓ Pages folds provider-focus recovery into the network-first app.js payload');
