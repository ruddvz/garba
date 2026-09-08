import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../../data/catalogue/index.json', import.meta.url);
const index = JSON.parse(await readFile(file, 'utf8'));
if (!Object.hasOwn(index, 'nonstopSets')) {
  console.log('Catalogue index already uses discovery as the only Nonstop source.');
  process.exit(0);
}
delete index.nonstopSets;
await writeFile(file, `${JSON.stringify(index)}\n`);
console.log('Removed legacy nonstopSets pointer from data/catalogue/index.json.');
