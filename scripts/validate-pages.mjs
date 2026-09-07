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

for (const script of localScripts) {
  try { await access(path.join(root, script)); }
  catch { fail(`index.html references missing local script: ${script}`); }
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

for (const script of localScripts) {
  if (!serviceWorker.includes(`'./${script}'`) && !serviceWorker.includes(`"./${script}"`)) {
    fail(`Service worker shell does not include document runtime script: ${script}`);
  }
}

if (failed) process.exit(1);
console.log(`✓ Pages deploys ${localScripts.length} local runtime scripts`);
console.log('✓ Pages verifies the 15-image WebP visual pack when present');
console.log('✓ service-worker shell covers every document runtime script');
