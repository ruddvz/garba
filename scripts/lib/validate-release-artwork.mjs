import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const manifest = await readJson('data/release-artwork.json');
const releases = await readJson('data/releases.json');
const releaseById = new Map(releases.filter((release) => release?.id).map((release) => [release.id, release]));
const allowedArtworkHosts = (host) => host === 'm.media-amazon.com' || host.endsWith('.mzstatic.com');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
let failed = false;

const fail = (message) => {
  console.error(`✗ ${message}`);
  failed = true;
};

if (manifest.version !== 1 || !manifest.releases || typeof manifest.releases !== 'object' || Array.isArray(manifest.releases)) {
  fail('release-artwork.json must contain a version 1 releases object');
}

for (const [releaseId, entry] of Object.entries(manifest.releases || {})) {
  const release = releaseById.get(releaseId);
  if (!release) {
    fail(`Artwork references unknown release: ${releaseId}`);
    continue;
  }
  if (entry?.verified !== true) fail(`${releaseId}: artwork entries must be explicitly verified`);
  if (!entry?.sourceProvider || typeof entry.sourceProvider !== 'string') fail(`${releaseId}: sourceProvider is required`);
  if (!datePattern.test(String(entry?.verifiedAt || ''))) fail(`${releaseId}: verifiedAt must be YYYY-MM-DD`);

  for (const [field, value] of [['imageUrl', entry?.imageUrl], ['sourceUrl', entry?.sourceUrl]]) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') fail(`${releaseId}: ${field} must use HTTPS`);
      if (field === 'imageUrl' && !allowedArtworkHosts(url.hostname)) fail(`${releaseId}: unapproved artwork host ${url.hostname}`);
    } catch {
      fail(`${releaseId}: ${field} must be a valid absolute URL`);
    }
  }

  if (!Array.isArray(entry?.verificationSources) || entry.verificationSources.length < 2) {
    fail(`${releaseId}: at least two release identity verification sources are required`);
  } else {
    for (const source of entry.verificationSources) {
      if (!source?.platform) fail(`${releaseId}: verification source platform is required`);
      try {
        const url = new URL(source?.url);
        if (url.protocol !== 'https:') fail(`${releaseId}: verification source must use HTTPS`);
      } catch {
        fail(`${releaseId}: verification source URL is invalid`);
      }
    }
  }

  const canonicalSources = new Set((release.sources || []).map((source) => source.url));
  if (!canonicalSources.has(entry.sourceUrl)) fail(`${releaseId}: artwork sourceUrl must also be a canonical release source`);
  const verifiedSourceUrls = new Set((entry.verificationSources || []).map((source) => source.url));
  if (!verifiedSourceUrls.has(entry.sourceUrl)) fail(`${releaseId}: sourceUrl must appear in verificationSources`);
}

if (failed) process.exit(1);
console.log(`✓ verified release artwork manifest: ${Object.keys(manifest.releases || {}).length} release covers`);
