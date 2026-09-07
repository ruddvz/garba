import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_site') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const markdownFiles = (await walk(root)).filter((file) => file.endsWith('.md'));
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
let checked = 0;

for (const file of markdownFiles) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (!target || target.startsWith('#') || /^(?:https?:|mailto:|tel:)/i.test(target)) continue;
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    target = target.split('#')[0].split('?')[0];
    if (!target) continue;
    try { target = decodeURIComponent(target); } catch { /* keep literal path */ }
    const resolved = path.resolve(path.dirname(file), target);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      fail(`${path.relative(root, file)} links outside the repository: ${match[1]}`);
      continue;
    }
    try { await access(resolved); checked += 1; }
    catch { fail(`${path.relative(root, file)} has broken local link: ${match[1]}`); }
  }
}

if (failed) process.exit(1);
console.log(`✓ ${markdownFiles.length} Markdown files scanned; ${checked} local links resolve`);
