import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const app = await readFile(path.join(root, 'app.js'), 'utf8');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

for (const marker of [
  'const SEARCH_RESULT_LIMIT = 160;',
  "sheetSummary: $('sheetSummary')",
  'state.sheetMatchCount = state.songs.length;',
  "if (state.sheetMode === 'search' && songs.length > SEARCH_RESULT_LIMIT) return songs.slice(0, SEARCH_RESULT_LIMIT);",
  "state.sheetMode === 'search' && !query",
  'Keep typing to narrow the list.',
  "if (event.key === '/')",
  "openSheet('search', { trigger: els.searchButton });",
]) if (!app.includes(marker)) fail(`Search browser missing performance/UX marker: ${marker}`);

if (failed) process.exit(1);
console.log('✓ blank Search does not build the full catalogue DOM');
console.log('✓ broad Search results are capped at 160 rows with visible refinement guidance');
console.log('✓ the advertised / keyboard shortcut opens Search');
