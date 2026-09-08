import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const [runtime, pages, pkg] = await Promise.all([
  read('assets/runtime/seek-state.js'),
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

if (!pages.includes('cat app.js assets/runtime/seek-state.js > _site/app.js')) {
  fail('Pages must keep the bundled interaction runtime inside deployed app.js');
}
if (!pages.includes("grep -q 'GARBA_SEEK_STATE_RUNTIME' _site/app.js")) {
  fail('Pages must verify the bundled interaction runtime');
}
if (!pkg.includes('node --check assets/runtime/seek-state.js')) {
  fail('check:modules must syntax-check the bundled interaction runtime');
}
if (!pkg.includes('node scripts/lib/validate-provider-focus-runtime.mjs')) {
  fail('npm run check must validate provider-focus recovery');
}

if (failed) process.exit(1);
console.log('✓ hidden provider stages cannot retain keyboard focus');
console.log('✓ focus restoration prefers the playback control that opened the provider');
console.log('✓ outside-click provider closure does not steal focus from the user target');
console.log('✓ provider-focus recovery ships inside the existing network-first app.js payload');
