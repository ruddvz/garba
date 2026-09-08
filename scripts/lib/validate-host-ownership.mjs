import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const readText = async (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await readText(file));

const [vercel, cnameRaw] = await Promise.all([
  readJson('vercel.json'),
  readText('CNAME'),
]);

let failed = false;
const fail = (message) => {
  console.error(`✗ ${message}`);
  failed = true;
};

const hostValue = (rule) => rule?.has?.find((entry) => entry?.type === 'host')?.value || null;
const allVercelRules = [
  ...(Array.isArray(vercel.rewrites) ? vercel.rewrites : []),
  ...(Array.isArray(vercel.redirects) ? vercel.redirects : []),
  ...(Array.isArray(vercel.headers) ? vercel.headers : []),
];

const cname = cnameRaw.trim();
if (cname !== 'live.playgarba.com') {
  fail(`CNAME must reserve GitHub Pages for live.playgarba.com, got ${JSON.stringify(cname)}`);
}

const liveOwnedByVercel = allVercelRules.filter((rule) => hostValue(rule) === 'live.playgarba.com');
if (liveOwnedByVercel.length) {
  fail('vercel.json must not route, redirect or otherwise claim live.playgarba.com; the live player belongs to GitHub Pages');
}

const apexRootRewrite = vercel.rewrites?.find((rule) =>
  rule.source === '/'
  && rule.destination === '/public-site/'
  && hostValue(rule) === 'playgarba.com'
);
const apexPathRewrite = vercel.rewrites?.find((rule) =>
  rule.source === '/:path*'
  && rule.destination === '/public-site/:path*'
  && hostValue(rule) === 'playgarba.com'
);
const wwwRedirect = vercel.redirects?.find((rule) =>
  rule.source === '/:path*'
  && rule.destination === 'https://playgarba.com/:path*'
  && rule.permanent === true
  && hostValue(rule) === 'www.playgarba.com'
);

if (!apexRootRewrite) fail('Vercel must route the playgarba.com root to public-site/');
if (!apexPathRewrite) fail('Vercel must route playgarba.com paths into public-site/');
if (!wwwRedirect) fail('Vercel must permanently redirect www.playgarba.com to the apex');

const allowedVercelHosts = new Set(['playgarba.com', 'www.playgarba.com']);
for (const rule of allVercelRules) {
  const host = hostValue(rule);
  if (host && !allowedVercelHosts.has(host)) {
    fail(`vercel.json contains an unexpected host ownership rule for ${JSON.stringify(host)}`);
  }
}

if (failed) process.exit(1);
console.log('✓ hosting split is explicit: GitHub Pages owns live.playgarba.com; Vercel owns apex/www only');
