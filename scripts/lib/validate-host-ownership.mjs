import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const exists = async (file) => {
  try { await access(path.join(root, file)); return true; }
  catch { return false; }
};
const read = (file) => readFile(path.join(root, file), 'utf8');

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

if ((await read('CNAME')).trim() !== 'playgarba.com') fail('CNAME must reserve playgarba.com for GitHub Pages');
if (await exists('vercel.json')) fail('vercel.json must not remain in the Pages-only production source');
if (await exists('.vercel')) fail('.vercel/ must not remain in the production source');

if (failed) process.exit(1);
console.log('✓ hosting is consolidated: GitHub Pages owns the single PlayGarba production artifact at playgarba.com');
