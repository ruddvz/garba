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

if (!workflow.includes('cp index.html *.js styles.css manifest.webmanifest offline.html _site/')) {
  fail('Pages build must copy every root runtime JavaScript file with *.js');
}
if (!workflow.includes('Missing deployed script: $src')) {
  fail('Pages build must assert every index.html script exists in _site');
}
if (!workflow.includes("garba15-2k-q82.zip")) {
  fail('Pages build must support the checked-in 15-image 2K visual pack');
}
if (!workflow.includes("find _site/assets/backgrounds/library -maxdepth 1 -name '*.webp' | wc -l")) {
  fail('Pages build must verify all 15 extracted WebPs');
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
console.log('✓ Pages verifies the 15-image WebP visual pack when present');
console.log('✓ service-worker shell covers the complete document/module runtime graph');
console.log('✓ keyboard and Media Session Play route through the provider-aware Play control');
