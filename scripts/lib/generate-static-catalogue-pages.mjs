import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const outputDir = path.resolve(root, process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]) || '_site');
const checkOnly = process.argv.includes('--check');
const baseUrl = 'https://playgarba.com';
const socialImage = `${baseUrl}/assets/backgrounds/library/15-traditional-canopy-courtyard.webp`;

const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const [songs, releaseRows] = await Promise.all([
  readJson('data/songs.json'),
  readJson('data/releases.json'),
]);

const identity = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
const releaseRowsById = new Map();
const conflictingReleaseIds = [];
for (const release of releaseRows) {
  const existing = releaseRowsById.get(release.id);
  if (!existing) {
    releaseRowsById.set(release.id, release);
    continue;
  }
  if (identity(existing.title) !== identity(release.title) || identity(existing.artist) !== identity(release.artist)) {
    conflictingReleaseIds.push({ id: release.id, first: `${existing.title} — ${existing.artist}`, duplicate: `${release.title} — ${release.artist}` });
  }
}
if (conflictingReleaseIds.length) {
  throw new Error(`Conflicting duplicate release IDs: ${conflictingReleaseIds.map((item) => `${item.id} (${item.first} <> ${item.duplicate})`).join('; ')}`);
}
const releases = [...releaseRowsById.values()];
const duplicateReleaseRowCount = releaseRows.length - releases.length;
const releaseById = new Map(releases.map((release) => [release.id, release]));

const songsByRelease = new Map();
for (const song of songs) {
  const list = songsByRelease.get(song.releaseId) || [];
  list.push(song);
  songsByRelease.set(song.releaseId, list);
}
for (const list of songsByRelease.values()) {
  list.sort((a, b) => Number(a.trackNumber || 0) - Number(b.trackNumber || 0) || String(a.title).localeCompare(String(b.title)));
}

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const escapeXml = escapeHtml;
const jsonForHtml = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const hash = (value) => createHash('sha1').update(String(value)).digest('hex').slice(0, 10);
const baseSlug = (value) => String(value || '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-')
  .slice(0, 120) || `item-${hash(value)}`;

function buildSlugMap(items) {
  const result = new Map();
  const claimed = new Map();
  for (const item of items) {
    let slug = baseSlug(item.id);
    const prior = claimed.get(slug);
    if (prior && prior !== item.id) slug = `${slug}-${hash(item.id)}`;
    const secondaryPrior = claimed.get(slug);
    if (secondaryPrior && secondaryPrior !== item.id) throw new Error(`SEO slug collision: ${item.id} and ${secondaryPrior} both resolve to ${slug}`);
    claimed.set(slug, item.id);
    result.set(item.id, slug);
  }
  return result;
}

const songSlug = buildSlugMap(songs);
const releaseSlug = buildSlugMap(releases);
const unknownReleaseSongs = songs.filter((song) => song.releaseId && !releaseById.has(song.releaseId));
if (unknownReleaseSongs.length) {
  throw new Error(`${unknownReleaseSongs.length} songs reference a release that is not present in data/releases.json`);
}
if (new Set(songSlug.values()).size !== songs.length) throw new Error('Song SEO route collision detected');
if (new Set(releaseSlug.values()).size !== releases.length) throw new Error('Release SEO route collision detected');
if (songs.length < 1000 || releases.length < 100) throw new Error(`Catalogue unexpectedly small: ${songs.length} songs, ${releases.length} canonical releases`);

const durationLabel = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const minutes = Math.floor(total / 60);
  const remainder = Math.round(total % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};
const isoDuration = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const minutes = Math.floor(total / 60);
  const remainder = Math.round(total % 60);
  return `PT${minutes ? `${minutes}M` : ''}${remainder ? `${remainder}S` : ''}`;
};
const cleanMeta = (value, max = 158) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

const pageStyles = `
:root{color-scheme:dark;--bg:#111323;--panel:#191c31;--text:#f6ecd7;--muted:#aaa7b7;--line:rgba(246,236,215,.13);--accent:#f4b55f;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -20%,#303455 0,#111323 42%,#090b13 100%);color:var(--text);min-height:100vh}a{color:inherit}.shell{width:min(920px,calc(100% - 32px));margin:0 auto;padding:28px 0 56px}.brand{display:inline-block;text-decoration:none;font-weight:750;letter-spacing:-.03em;font-size:1.3rem;margin-bottom:64px}.eyebrow{color:var(--accent);font-size:.78rem;font-weight:750;letter-spacing:.12em;text-transform:uppercase;margin:0 0 14px}.hero{padding:clamp(26px,6vw,64px);border:1px solid var(--line);border-radius:30px;background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025));box-shadow:0 32px 90px rgba(0,0,0,.32)}h1{font-size:clamp(2.35rem,8vw,5.5rem);letter-spacing:-.055em;line-height:.94;margin:0;max-width:13ch}h2{font-size:clamp(1.45rem,4vw,2.1rem);letter-spacing:-.035em}.artist{font-size:clamp(1.05rem,3vw,1.4rem);color:var(--muted);margin:18px 0 0}.meta{display:flex;flex-wrap:wrap;gap:10px;margin:30px 0 0}.pill{padding:9px 12px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:.9rem}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:34px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;border-radius:999px;text-decoration:none;font-weight:720;background:var(--text);color:#111323}.button.secondary{background:transparent;color:var(--text);border:1px solid var(--line)}.section{margin-top:28px;padding:24px;border:1px solid var(--line);border-radius:24px;background:rgba(17,19,35,.62)}.tracks{list-style:none;padding:0;margin:0}.tracks li+li{border-top:1px solid var(--line)}.track-link{display:grid;grid-template-columns:3rem minmax(0,1fr) auto;gap:12px;align-items:center;padding:16px 4px;text-decoration:none}.track-number,.track-meta{color:var(--muted);font-size:.88rem}.track-title{font-weight:680}.notice{color:var(--muted);font-size:.88rem;line-height:1.6;margin-top:20px}.catalogue-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.catalogue-card{display:block;text-decoration:none;padding:18px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.025)}.catalogue-card strong{display:block;margin-bottom:6px}.catalogue-card span{color:var(--muted);font-size:.88rem}@media(max-width:560px){.shell{width:min(100% - 22px,920px);padding-top:18px}.brand{margin-bottom:44px}.hero{border-radius:24px;padding:24px}.track-link{grid-template-columns:2.2rem minmax(0,1fr)}.track-meta{grid-column:2}}
`;

function documentShell({ title, description, canonical, type = 'website', schema, body }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(cleanMeta(description));
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="theme-color" content="#111323" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta property="og:site_name" content="PlayGarba" />
<meta property="og:type" content="${escapeHtml(type)}" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:image" content="${socialImage}" />
<meta property="og:image:alt" content="PlayGarba Gujarati Garba artwork" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${socialImage}" />
<style>${pageStyles}</style>
<script type="application/ld+json">${jsonForHtml(schema)}</script>
</head>
<body>${body}</body>
</html>`;
}

function songPage(song) {
  const release = releaseById.get(song.releaseId);
  const slug = songSlug.get(song.id);
  const canonical = `${baseUrl}/songs/${slug}/`;
  const playerUrl = `${baseUrl}/?genre=${encodeURIComponent(song.genre || 'traditional')}&song=${encodeURIComponent(song.id)}`;
  const releaseUrl = release ? `${baseUrl}/releases/${releaseSlug.get(release.id)}/` : null;
  const duration = durationLabel(song.durationSeconds);
  const year = release?.originalReleaseYear || (release?.releaseDate ? String(release.releaseDate).slice(0, 4) : null);
  const description = `${song.title} by ${song.artist}${release ? ` from ${release.title}` : ''}. Discover this Gujarati Garba track and open its verified playback route on PlayGarba.`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    url: canonical,
    byArtist: { '@type': 'MusicGroup', name: song.artist },
    genre: [song.genre, song.category, ...(song.styles || [])].filter(Boolean),
    ...(isoDuration(song.durationSeconds) ? { duration: isoDuration(song.durationSeconds) } : {}),
    ...(release ? { inAlbum: { '@type': 'MusicAlbum', name: release.title, url: releaseUrl } } : {}),
    potentialAction: { '@type': 'ListenAction', target: playerUrl },
  };
  const meta = [song.genre, song.category, duration, year].filter(Boolean)
    .map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('');
  const body = `<main class="shell">
<a class="brand" href="${baseUrl}/">PlayGarba</a>
<section class="hero">
<p class="eyebrow">Gujarati Garba song</p>
<h1>${escapeHtml(song.title)}</h1>
<p class="artist">${escapeHtml(song.artist)}</p>
<div class="meta">${meta}</div>
<div class="actions">
<a class="button" href="${escapeHtml(playerUrl)}">Play this song</a>
${releaseUrl ? `<a class="button secondary" href="${releaseUrl}">View release</a>` : ''}
</div>
<p class="notice">PlayGarba links to verified playback sources. Provider availability, ads, account requirements and regional access can vary by source.</p>
</section>
</main>`;
  return documentShell({ title: `${song.title} — ${song.artist} | PlayGarba`, description, canonical, type: 'music.song', schema, body });
}

function releasePage(release) {
  const slug = releaseSlug.get(release.id);
  const canonical = `${baseUrl}/releases/${slug}/`;
  const tracks = songsByRelease.get(release.id) || [];
  const year = release.originalReleaseYear || (release.releaseDate ? String(release.releaseDate).slice(0, 4) : null);
  const description = `${release.title} by ${release.artist}${year ? ` (${year})` : ''}. Browse ${tracks.length || release.songCount || ''} Gujarati Garba track${tracks.length === 1 ? '' : 's'} on PlayGarba.`;
  const first = tracks[0];
  const firstPlayerUrl = first ? `${baseUrl}/?genre=${encodeURIComponent(first.genre || release.visualGenre || 'traditional')}&song=${encodeURIComponent(first.id)}` : baseUrl;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: release.title,
    url: canonical,
    byArtist: { '@type': 'MusicGroup', name: release.artist },
    ...(year ? { datePublished: String(release.releaseDate || year) } : {}),
    ...(release.label ? { recordLabel: { '@type': 'Organization', name: release.label } } : {}),
    numTracks: tracks.length || release.songCount || undefined,
    track: tracks.map((song, index) => ({
      '@type': 'MusicRecording',
      position: Number(song.trackNumber || index + 1),
      name: song.title,
      url: `${baseUrl}/songs/${songSlug.get(song.id)}/`,
    })),
  };
  const meta = [year, release.label, release.entryType, `${tracks.length || release.songCount || 0} tracks`].filter(Boolean)
    .map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('');
  const trackRows = tracks.length ? tracks.map((song, index) => {
    const duration = durationLabel(song.durationSeconds);
    return `<li><a class="track-link" href="${baseUrl}/songs/${songSlug.get(song.id)}/"><span class="track-number">${escapeHtml(song.trackNumber || index + 1)}</span><span class="track-title">${escapeHtml(song.title)}</span>${duration ? `<span class="track-meta">${duration}</span>` : ''}</a></li>`;
  }).join('') : '<li class="notice">Track-level catalogue entries are not available for this release yet.</li>';
  const body = `<main class="shell">
<a class="brand" href="${baseUrl}/">PlayGarba</a>
<section class="hero">
<p class="eyebrow">Gujarati Garba release</p>
<h1>${escapeHtml(release.title)}</h1>
<p class="artist">${escapeHtml(release.artist)}</p>
<div class="meta">${meta}</div>
<div class="actions"><a class="button" href="${escapeHtml(firstPlayerUrl)}">Open in PlayGarba</a><a class="button secondary" href="${baseUrl}/catalogue/">Browse catalogue</a></div>
</section>
<section class="section"><h2>Tracks</h2><ol class="tracks">${trackRows}</ol></section>
</main>`;
  return documentShell({ title: `${release.title} — ${release.artist} | PlayGarba`, description, canonical, type: 'music.album', schema, body });
}

function cataloguePage() {
  const sorted = [...releases].sort((a, b) => Number(b.originalReleaseYear || 0) - Number(a.originalReleaseYear || 0) || String(a.title).localeCompare(String(b.title)));
  const cards = sorted.map((release) => {
    const year = release.originalReleaseYear || (release.releaseDate ? String(release.releaseDate).slice(0, 4) : '');
    return `<a class="catalogue-card" href="${baseUrl}/releases/${releaseSlug.get(release.id)}/"><strong>${escapeHtml(release.title)}</strong><span>${escapeHtml(release.artist)}${year ? ` · ${escapeHtml(year)}` : ''}</span></a>`;
  }).join('');
  const canonical = `${baseUrl}/catalogue/`;
  const body = `<main class="shell"><a class="brand" href="${baseUrl}/">PlayGarba</a><section class="hero"><p class="eyebrow">Open Gujarati music catalogue</p><h1>Garba songs & releases</h1><p class="artist">${songs.length.toLocaleString('en-IN')} songs across ${releases.length.toLocaleString('en-IN')} releases, with verified-source playback routing where available.</p></section><section class="section"><h2>Releases</h2><div class="catalogue-grid">${cards}</div></section></main>`;
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'PlayGarba Gujarati Garba catalogue', url: canonical, mainEntity: { '@type': 'ItemList', numberOfItems: releases.length } };
  return documentShell({ title: 'Gujarati Garba songs & releases | PlayGarba', description: `Browse ${songs.length} Gujarati Garba songs across ${releases.length} releases on PlayGarba.`, canonical, schema, body });
}

const urls = [
  `${baseUrl}/`,
  `${baseUrl}/catalogue/`,
  ...releases.map((release) => `${baseUrl}/releases/${releaseSlug.get(release.id)}/`),
  ...songs.map((song) => `${baseUrl}/songs/${songSlug.get(song.id)}/`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;

if (checkOnly) {
  const duplicateNote = duplicateReleaseRowCount ? `; ${duplicateReleaseRowCount} duplicate release row${duplicateReleaseRowCount === 1 ? '' : 's'} canonicalized by ID` : '';
  console.log(`✓ static catalogue generator validated ${songs.length} songs, ${releases.length} canonical releases and ${urls.length} canonical URLs${duplicateNote}`);
  process.exit(0);
}

async function writeBatches(entries, batchSize = 80) {
  for (let i = 0; i < entries.length; i += batchSize) {
    await Promise.all(entries.slice(i, i + batchSize).map(async ({ directory, html }) => {
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'index.html'), html);
    }));
  }
}

await writeBatches(songs.map((song) => ({ directory: path.join(outputDir, 'songs', songSlug.get(song.id)), html: songPage(song) })));
await writeBatches(releases.map((release) => ({ directory: path.join(outputDir, 'releases', releaseSlug.get(release.id)), html: releasePage(release) })));
await mkdir(path.join(outputDir, 'catalogue'), { recursive: true });
await writeFile(path.join(outputDir, 'catalogue', 'index.html'), cataloguePage());
await writeFile(path.join(outputDir, 'sitemap.xml'), sitemap);
console.log(`Generated ${songs.length} song pages, ${releases.length} release pages, catalogue index and ${urls.length}-URL sitemap in ${path.relative(root, outputDir) || '.'}${duplicateReleaseRowCount ? `; canonicalized ${duplicateReleaseRowCount} duplicate release row${duplicateReleaseRowCount === 1 ? '' : 's'}` : ''}.`);
