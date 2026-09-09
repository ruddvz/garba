import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { validateSearchSurfacePolicy } from './validate-search-surface-policy.mjs';
import { runSearchSurfacePolicySelfTests } from './test-validate-search-surface-policy.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const exists = async (file) => {
  try { await access(path.join(root, file)); return true; }
  catch { return false; }
};
const read = (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await read(file));

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };

if ((await read('CNAME')).trim() !== 'playgarba.com') fail('CNAME must reserve playgarba.com for GitHub Pages');
if (await exists('vercel.json')) fail('vercel.json must not remain in the Pages-only production source');
if (await exists('.vercel')) fail('.vercel/ must not remain in the production source');

try {
  const count = runSearchSurfacePolicySelfTests();
  console.log(`✓ search-surface policy regression tests passed (${count} cases)`);
} catch (error) {
  fail(`search-surface policy self-test failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const policy = await readJson('data/search-surface-policy.json');
  const sitemapXml = await read('sitemap.xml');
  const result = validateSearchSurfacePolicy({ policy, sitemapXml });
  for (const error of result.errors) fail(`search-surface policy: ${error}`);
  for (const warning of result.warnings) console.warn(`! search-surface policy: ${warning}`);
  if (result.ok) console.log(`✓ search-surface policy admits all ${result.sitemapRoutes.length} canonical sitemap route(s)`);
} catch (error) {
  fail(`search-surface policy could not be evaluated: ${error instanceof Error ? error.message : String(error)}`);
}

if (failed) process.exit(1);
console.log('✓ hosting is consolidated: GitHub Pages owns the single PlayGarba production artifact at playgarba.com');
