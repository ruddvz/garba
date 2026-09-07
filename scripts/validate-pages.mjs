import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

const index = await readFile(path.join(root, 'index.html'), 'utf8');
const workflow = await readFile(path.join(root, '.github/workflows/pages.yml'), 'utf8');
const serviceWorker = await readFile(path.join(root, 'sw.js'), 'utf8');

const localScripts = [...index.matchAll(/<script[^>]+src="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((src) => !/^(?:https?:)?\/\//.test(src));

const runtimeFiles = new Set(localScripts);
const pending = [...localScripts];
while (pending.length) {
  const script = pending.shift();
  let source = '';
  try {
    source = await readFile(path.join(root, script), 'utf8');
  } catch {
    fail(`index/import graph references missing local script: ${script}`);
    continue;
  }

  for (const match of source.matchAll(/(?:import\s+(?:[^'";]+?\s+from\s+)?|import\s*\()(['"])(\.\.?\/[^'"]+)\1/g)) {
    const imported = path.posix.normalize(path.posix.join(path.posix.dirname(script), match[2]));
    if (!runtimeFiles.has(imported)) {
      runtimeFiles.add(imported);
      pending.push(imported);
    }
  }
}

for (const script of runtimeFiles) {
  try { await access(path.join(root, script)); }
  catch { fail(`runtime graph references missing local script: ${script}`); }
}

// The production workflow deliberately flattens styles into one response, so the
// runtime copy command need only prove every root JavaScript file is copied.
if (!/cp\s+index\.html\s+\*\.js\s+manifest\.webmanifest\s+offline\.html\s+_site\//.test(workflow)) {
  fail('Pages build must copy every root runtime JavaScript file with *.js');
}
if (!workflow.includes('Missing deployed script: $src')) {
  fail('Pages build must assert every index.html script exists in _site');
}

for (const marker of [
  'garba15-2048-q90.zip',
  '4690046d30ecd5400b3fc953a2a93f877d64921a69955d2b5dc6aa0bd65a769d',
  'garba15-2k-q82.zip',
  'Deploying visual pack: $PACK',
]) {
  if (!workflow.includes(marker)) fail(`Pages visual-pack selection missing marker: ${marker}`);
}
if (workflow.indexOf('garba15-2048-q90.zip') > workflow.indexOf('garba15-2k-q82.zip')) {
  fail('Pages must prefer the Q90 visual pack before the Q82 fallback');
}
if (!/find _site\/assets\/backgrounds\/library[^\n]+-name '\*\.webp'[^\n]+wc -l/.test(workflow) || !workflow.includes('Expected 15 WebPs')) {
  fail('Pages build must verify all 15 extracted WebPs');
}
if (!workflow.includes("file \"$image\" | grep -q 'Web/P image'")) {
  fail('Pages build must verify extracted artwork is valid WebP data');
}
if (!workflow.includes("rm -f _site/assets/backgrounds/garba15-*.zip")) {
  fail('Pages build must not publish any source artwork ZIP');
}
if (!workflow.includes("grep -q '@import' _site/styles.css")) {
  fail('Pages build must enforce one flattened production stylesheet');
}

for (const script of runtimeFiles) {
  if (!serviceWorker.includes(`'./${script}'`) && !serviceWorker.includes(`"./${script}"`)) {
    fail(`Service worker shell does not include runtime module: ${script}`);
  }
}

const nextUx = await readFile(path.join(root, 'ux-next.js'), 'utf8');
const inputUx = await readFile(path.join(root, 'ux-input.js'), 'utf8');
if (!nextUx.includes("import './ux-input.js';")) fail('ux-next.js must load playback input parity');
for (const marker of ['playButton?.click()', "setActionHandler('play'", 'providerSpaceGuard', 'stopImmediatePropagation']) {
  if (!inputUx.includes(marker)) fail(`ux-input.js missing playback parity guard: ${marker}`);
}

if (failed) process.exit(1);
console.log(`✓ Pages deploys ${localScripts.length} document scripts and ${runtimeFiles.size - localScripts.length} imported runtime modules`);
console.log('✓ Pages prefers the checksum-pinned Q90 visual pack and retains Q82 only as fallback');
console.log('✓ Pages verifies all 15 WebPs and excludes source ZIPs');
console.log('✓ production CSS is flattened to one request');
console.log('✓ service-worker shell covers the complete document/module runtime graph');
console.log('✓ keyboard and Media Session Play route through the provider-aware Play control');
