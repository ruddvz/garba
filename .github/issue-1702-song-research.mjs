// Issue #1702 research helper. Temporary: deleted before the lane's PR is reviewed.
// Finds official YouTube auto-generated album tracks ("Provided to YouTube by …") for catalogue songs that have no
// playable route, and records every candidate with the evidence needed to accept or reject it.
import { readFile, writeFile } from 'node:fs/promises';

const EXCLUDED = new Set([
  'rangoli-vol16-2008', 'anand-vol8-2001', 'rangili-ramzat-8-kirtidan-2025', 'killol-2-kinjal-dave-2022',
  'de-taali-1999',
]);
const EXCLUDED_PATTERNS = [/tahukar-?9/i, /rang-saajan|rang-sajan/i, /trupti|kaushal/i];

const load = async (f) => { const d = JSON.parse(await readFile(f, 'utf8')); return Array.isArray(d) ? d : (d.songs || d.releases); };
const songs = await load('data/songs.json');
const releases = new Map((await load('data/releases.json')).map((r) => [r.id, r]));
const only = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);

const targets = new Map();
for (const s of songs) {
  if (s.youtubeId || s.audioUrl) continue;
  if (EXCLUDED.has(s.releaseId) || EXCLUDED_PATTERNS.some((p) => p.test(s.releaseId))) continue;
  if (only.length && !only.includes(s.releaseId)) continue;
  if (!targets.has(s.releaseId)) targets.set(s.releaseId, []);
  targets.get(s.releaseId).push(s);
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'SOCS=CAI; CONSENT=YES+cb',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: HEADERS });
      if (r.ok) return await r.text();
      if (r.status === 429) await sleep(5000 * (i + 1));
    } catch { await sleep(1500); }
  }
  return '';
}
function jsonAfter(html, marker) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  let i = html.indexOf('{', at), depth = 0, inStr = false, esc = false;
  const start = i;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
  }
  try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
}
function walk(node, key, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const n of node) walk(n, key, out); return out; }
  for (const [k, v] of Object.entries(node)) { if (k === key) out.push(v); walk(v, key, out); }
  return out;
}
const text = (t) => (t?.simpleText ?? (t?.runs || []).map((r) => r.text).join('')) || '';

export const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9઀-૿]+/g, ' ').trim();
// Looser form for Gujarati transliteration drift (aa/a, ee/i, oo/u, h after consonants, doubled letters)
export const loose = (s) => norm(s).replace(/aa/g, 'a').replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u')
  .replace(/([bcdfgjklmnprstvwz])h/g, '$1').replace(/(.)\1+/g, '$1').replace(/\s+/g, '');

async function search(q, filter = '') {
  const html = await get(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en&gl=IN${filter}`);
  const data = jsonAfter(html, 'var ytInitialData');
  const videos = walk(data, 'videoRenderer').map((v) => ({
    videoId: v.videoId, title: text(v.title), channel: text(v.ownerText), length: text(v.lengthText),
    channelId: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '',
  }));
  const playlists = [
    ...walk(data, 'playlistRenderer').map((p) => ({ playlistId: p.playlistId, title: text(p.title), channel: text(p.shortBylineText), count: p.videoCount })),
    ...walk(data, 'lockupViewModel').filter((l) => l.contentType === 'LOCKUP_CONTENT_TYPE_PLAYLIST' || /^(PL|OLAK|RD)/.test(l.contentId || ''))
      .map((l) => ({ playlistId: l.contentId, title: l.metadata?.lockupMetadataViewModel?.title?.content || '', channel: JSON.stringify(l.metadata?.lockupMetadataViewModel?.metadata || '').match(/"content":"([^"]+)"/)?.[1] || '' })),
  ];
  return { videos, playlists };
}
async function playlist(id) {
  const html = await get(`https://www.youtube.com/playlist?list=${id}&hl=en`);
  const data = jsonAfter(html, 'var ytInitialData');
  return walk(data, 'playlistVideoRenderer').map((v) => ({
    videoId: v.videoId, title: text(v.title), channel: text(v.shortBylineText), lengthSeconds: Number(v.lengthSeconds || 0), index: Number(text(v.index) || 0),
  }));
}
async function watch(videoId) {
  const html = await get(`https://www.youtube.com/watch?v=${videoId}&hl=en`);
  const p = jsonAfter(html, 'var ytInitialPlayerResponse');
  if (!p) return null;
  const d = p.videoDetails || {}, m = p.microformat?.playerMicroformatRenderer || {};
  const desc = d.shortDescription || '';
  const lines = desc.split('\n').map((l) => l.trim());
  const provided = lines.find((l) => /^Provided to YouTube by /i.test(l));
  let track = '', artists = [], album = '';
  if (provided) {
    const rest = lines.slice(lines.indexOf(provided) + 1).filter(Boolean);
    const parts = (rest[0] || '').split(' · ');
    track = parts[0] || ''; artists = parts.slice(1);
    album = rest[1] || '';
  }
  return {
    videoId, title: d.title, author: d.author, channelId: d.channelId, lengthSeconds: Number(d.lengthSeconds || 0),
    status: p.playabilityStatus?.status, embeddable: p.playabilityStatus?.playableInEmbed !== false,
    provider: provided ? provided.replace(/^Provided to YouTube by /i, '') : '', track, artists, album,
    released: (lines.find((l) => /^Released on:/i.test(l)) || '').replace(/^Released on:\s*/i, ''),
    phonographic: lines.find((l) => /^℗/.test(l)) || '', uploadDate: m.uploadDate || '', category: m.category || '',
    chapters: (desc.match(/^\s*\(?\d{1,2}:\d{2}(?::\d{2})?\)?\s+.+$/gm) || []).slice(0, 80),
  };
}

function judge(song, release, w) {
  if (!w) return { verdict: 'unreadable' };
  const reasons = [];
  const albumOk = norm(w.album) === norm(release.title) ? 'exact' : loose(w.album) === loose(release.title) ? 'loose' : (norm(w.album).includes(norm(release.title)) || norm(release.title).includes(norm(w.album))) && w.album ? 'partial' : 'no';
  const trackOk = norm(w.track) === norm(song.title) ? 'exact' : loose(w.track) === loose(song.title) ? 'loose' : 'no';
  const canon = `${song.artist || ''} ${release.artist || ''}`;
  const artistOk = w.artists.some((a) => loose(canon).includes(loose(a).slice(0, 6))) ? 'yes' : 'no';
  if (!w.provider) reasons.push('not-auto-generated');
  if (w.status !== 'OK') reasons.push(`status:${w.status}`);
  if (!w.embeddable) reasons.push('not-embeddable');
  if (albumOk === 'no') reasons.push('album-mismatch');
  if (trackOk === 'no') reasons.push('track-mismatch');
  if (artistOk === 'no') reasons.push('artist-mismatch');
  const durationDelta = song.durationSeconds ? w.lengthSeconds - song.durationSeconds : null;
  if (durationDelta != null && Math.abs(durationDelta) > 8) reasons.push(`duration-delta:${durationDelta}`);
  const verdict = reasons.length ? 'reject' : (albumOk === 'exact' && trackOk === 'exact' ? 'accept' : 'review');
  return { verdict, albumOk, trackOk, artistOk, durationDelta, reasons };
}

const results = [];
const watched = new Map();
const watchOnce = async (id) => { if (!watched.has(id)) { watched.set(id, await watch(id)); await sleep(350); } return watched.get(id); };

for (const [releaseId, list] of targets) {
  const release = releases.get(releaseId) || { id: releaseId, title: releaseId };
  const leadArtist = String(release.artist || list[0].artist || '').split(/,|&| and /)[0].trim();
  const record = { releaseId, releaseTitle: release.title, releaseArtist: release.artist, unplayable: list.length, playlists: [], songs: [] };
  // 1. Album playlists (YouTube Music albums are OLAK5uy_ playlists from the Topic channel)
  const albumSearch = await search(`${release.title} ${leadArtist}`, '&sp=EgIQAw%3D%3D');
  await sleep(400);
  const albumCandidates = albumSearch.playlists.filter((p) => p.playlistId && (loose(p.title).includes(loose(release.title)) || loose(release.title).includes(loose(p.title).replace(/^album/, ''))));
  const pool = new Map();
  for (const p of albumCandidates.slice(0, 3)) {
    const items = await playlist(p.playlistId);
    await sleep(400);
    record.playlists.push({ ...p, items: items.length });
    for (const it of items) if (!pool.has(it.videoId)) pool.set(it.videoId, { ...it, via: `playlist:${p.playlistId}` });
  }
  for (const song of list) {
    const entry = { songId: song.id, title: song.title, artist: song.artist, trackNumber: song.trackNumber, durationSeconds: song.durationSeconds, candidates: [] };
    let cands = [...pool.values()].filter((v) => loose(v.title) === loose(song.title) || loose(v.title).startsWith(loose(song.title)));
    if (!cands.length) {
      const s = await search(`${song.title} ${release.title} ${leadArtist}`);
      await sleep(400);
      cands = s.videos.slice(0, 8).filter((v) => / - Topic$/.test(v.channel) || loose(v.title).includes(loose(song.title))).slice(0, 4).map((v) => ({ ...v, via: 'search' }));
    }
    for (const c of cands.slice(0, 4)) {
      const w = await watchOnce(c.videoId);
      entry.candidates.push({ via: c.via, ...w, judge: judge(song, release, w) });
    }
    const best = entry.candidates.find((c) => c.judge.verdict === 'accept') || entry.candidates.find((c) => c.judge.verdict === 'review');
    entry.best = best ? { videoId: best.videoId, verdict: best.judge.verdict } : null;
    record.songs.push(entry);
  }
  results.push(record);
  const acc = record.songs.filter((s) => s.best?.verdict === 'accept').length, rev = record.songs.filter((s) => s.best?.verdict === 'review').length;
  console.log(`${releaseId}: ${list.length} unplayable, ${acc} accept, ${rev} review, playlists ${record.playlists.map((p) => p.title).join(' | ')}`);
}

await writeFile('.github/issue-1702-results.json', JSON.stringify(results, null, 1));
const total = results.reduce((n, r) => n + r.songs.length, 0);
const accepted = results.reduce((n, r) => n + r.songs.filter((s) => s.best?.verdict === 'accept').length, 0);
const review = results.reduce((n, r) => n + r.songs.filter((s) => s.best?.verdict === 'review').length, 0);
console.log(`TOTAL ${total} songs, ${accepted} accept, ${review} review`);
