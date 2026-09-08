import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const readText = async (file) => readFile(path.join(root, file), 'utf8');
const readJson = async (file) => JSON.parse(await readText(file));
const vercel = await readJson('vercel.json');

let failed = false;
const fail = (message) => { console.error(`✗ ${message}`); failed = true; };
const hostValue = (rule) => rule?.has?.find((entry) => entry?.type === 'host')?.value || null;
const redirects = Array.isArray(vercel.redirects) ? vercel.redirects : [];
const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
const allVercelRules = [...redirects, ...rewrites, ...(Array.isArray(vercel.headers) ? vercel.headers : [])];

try {
  await readText('CNAME');
  fail('CNAME must not reserve a production hostname for GitHub Pages');
} catch {}

const hasRedirect = (source, destination, host = null) => redirects.some((rule) =>
  rule.source === source
  && rule.destination === destination
  && rule.permanent === true
  && hostValue(rule) === host
);
const hasRewrite = (source, destination) => rewrites.some((rule) => rule.source === source && rule.destination === destination);

if (!hasRedirect('/:path*', 'https://playgarba.com/:path*', 'www.playgarba.com')) fail('www must permanently redirect to the apex while preserving paths');
if (!hasRedirect('/:path*', 'https://playgarba.com/:path*', 'live.playgarba.com')) fail('legacy live paths must permanently redirect to the apex');
if (!hasRedirect('/catalogue/:path*', 'https://playgarba.com/explore/:path*', 'live.playgarba.com')) fail('legacy live catalogue links must redirect to /explore/');
if (!hasRedirect('/catalogue/:path*', 'https://playgarba.com/explore/:path*')) fail('legacy apex /catalogue/ links must redirect to /explore/');
if (!hasRewrite('/explore/', '/catalogue/')) fail('the existing Explore implementation must be served at /explore/');

const allowedVercelHosts = new Set(['www.playgarba.com', 'live.playgarba.com']);
for (const rule of allVercelRules) {
  const host = hostValue(rule);
  if (host && !allowedVercelHosts.has(host)) fail(`vercel.json contains an unexpected host ownership rule for ${JSON.stringify(host)}`);
}

if (failed) process.exit(1);
console.log('✓ hosting is consolidated: Vercel serves the player at the apex and redirects www/live compatibility hosts');
