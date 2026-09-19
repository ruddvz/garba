const fs = require('node:fs');

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const writeMin = (path, value) => fs.writeFileSync(path, `${JSON.stringify(value)}\n`);
const writePretty = (path, value) => fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const releaseId = 'de-taali-1999';

const existing = new Map([
  ['de-taali-1999-01-pethalpur-ma-gujarati-garba-song', { trackNumber: 7, artist: 'Falguni Pathak' }],
  ['de-taali-1999-02-aavo-to-ramvane-gujarati-garba-song', { trackNumber: 1, artist: 'Falguni Pathak' }],
  ['de-taali-1999-03-mathe-matu-mahini-gujarati-garba-song', { trackNumber: 4, artist: 'Falguni Pathak' }],
  ['de-taali-1999-04-nahi-melure-gujarati-garba-song', { trackNumber: 5, artist: 'Falguni Pathak' }],
  ['de-taali-1999-05-kaun-halave-limbdi-gujarati-garba-song', { trackNumber: 6, artist: 'Falguni Pathak' }],
  ['de-taali-1999-06-pani-gayatare-gujarati-garba-song', { trackNumber: 8, artist: 'Falguni Pathak' }],
  ['de-taali-1999-07-sawaa-man-sonu-gujarati-garba-song', { trackNumber: 9, artist: 'Falguni Pathak' }],
  ['de-taali-1999-08-hadke-pepdo-gujarati-garba-song', { trackNumber: 10, artist: 'Falguni Pathak' }],
  ['de-taali-1999-09-sora-chayo-chayo-gayoto-gujarati-garba-song', { trackNumber: 11, artist: 'Falguni Pathak' }],
  ['de-taali-1999-10-nadi-kinare-naliyeri-gujarati-garba-song', { trackNumber: 12, artist: 'Falguni Pathak' }],
  ['de-taali-1999-11-he-ji-re-riddhi-de-siddhi-de-gujarati-garba-song', { trackNumber: 13, artist: 'Hemant Chauhan' }],
  ['de-taali-1999-12-rame-ambe-maa-gujarati-garba-song', { trackNumber: 14, artist: 'Falguni Pathak' }],
  ['de-taali-1999-13-saathiaa-puravo-dware-gujarati-garba-song', { trackNumber: 15, artist: 'Falguni Pathak' }],
  ['de-taali-1999-14-chhanu-ne-chhapnu-gujarati-garba-song', { trackNumber: 16, artist: 'Falguni Pathak' }],
  ['de-taali-1999-15-oonchi-talavdi-ni-kor-gujarati-garba-song', { trackNumber: 17, artist: 'Falguni Pathak' }],
  ['de-taali-1999-16-morli-to-chali-gujarati-garba-song', { trackNumber: 18, artist: 'Falguni Pathak' }],
  ['de-taali-1999-17-chhailaji-re-gujarati-garba-song', { trackNumber: 19, artist: 'Falguni Pathak' }],
  ['de-taali-1999-18-najar-na-jaam-gujarati-garba-song', { trackNumber: 20, artist: 'Falguni Pathak' }],
  ['de-taali-1999-19-taliyo-na-taale-gujarati-garba-song', { trackNumber: 21, artist: 'Falguni Pathak' }],
  ['de-taali-1999-20-mari-mahisagar-ne-aare-gujarati-garba-song', { trackNumber: 25, artist: 'Falguni Pathak' }],
]);

const newSongs = [
  { id: 'de-taali-1999-02-pankhida-pankhida-gujarati-garba-song', title: 'Pankhida Pankhida (Gujarati Garba Song)', artist: 'Falguni Pathak', genre: 'dandiya', category: 'raas-dandiya', styles: ['dandiya', '1990s'], durationSeconds: 167, releaseId, trackNumber: 2, audioUrl: null, placeholder: false, sourceStatus: 'verified-metadata', audioAvailability: 'not-bundled', artistPrecision: 'track-level', youtubeId: null },
  { id: 'de-taali-1999-03-maniyaro-te-gujarati-garba-song', title: 'Maniyaro Te (Gujarati Garba Song)', artist: 'Falguni Pathak', genre: 'dandiya', category: 'raas-dandiya', styles: ['dandiya', '1990s'], durationSeconds: 42, releaseId, trackNumber: 3, audioUrl: null, placeholder: false, sourceStatus: 'verified-metadata', audioAvailability: 'not-bundled', artistPrecision: 'track-level', youtubeId: null },
  { id: 'de-taali-1999-22-dham-dhammak-dham-gujarati-garba-song', title: 'Dham Dhammak Dham (Gujarati Garba Song)', artist: 'Falguni Pathak', genre: 'dandiya', category: 'raas-dandiya', styles: ['dandiya', '1990s'], durationSeconds: 95, releaseId, trackNumber: 22, audioUrl: null, placeholder: false, sourceStatus: 'verified-metadata', audioAvailability: 'not-bundled', artistPrecision: 'track-level', youtubeId: null },
  { id: 'de-taali-1999-23-engineki-siti-gujarati-garba-song', title: 'Engineki Siti (Gujarati Garba Song)', artist: 'Falguni Pathak', genre: 'dandiya', category: 'raas-dandiya', styles: ['dandiya', '1990s'], durationSeconds: 100, releaseId, trackNumber: 23, audioUrl: null, placeholder: false, sourceStatus: 'verified-metadata', audioAvailability: 'not-bundled', artistPrecision: 'track-level', youtubeId: null },
  { id: 'de-taali-1999-24-bichhuda-bichhuda-gujarati-garba-song', title: 'Bichhuda Bichhuda (Gujarati Garba Song)', artist: 'Falguni Pathak', genre: 'dandiya', category: 'raas-dandiya', styles: ['dandiya', '1990s'], durationSeconds: 119, releaseId, trackNumber: 24, audioUrl: null, placeholder: false, sourceStatus: 'verified-metadata', audioAvailability: 'not-bundled', artistPrecision: 'track-level', youtubeId: null },
  { id: 'de-taali-1999-26-chhand-ane-doha-gujarati-garba-song', title: 'Chhand Ane Doha (Gujarati Garba Song)', artist: 'Falguni Pathak', genre: 'dandiya', category: 'raas-dandiya', styles: ['dandiya', '1990s'], durationSeconds: 82, releaseId, trackNumber: 26, audioUrl: null, placeholder: false, sourceStatus: 'verified-metadata', audioAvailability: 'not-bundled', artistPrecision: 'track-level', youtubeId: null },
];

const song2Path = 'data/catalogue/songs/songs-02.json';
const song3Path = 'data/catalogue/songs/songs-03.json';
const songs2 = read(song2Path);
const songs3 = read(song3Path);
const old2 = songs2.filter((song) => song.releaseId === releaseId);
const old3 = songs3.filter((song) => song.releaseId === releaseId);
if (old2.length !== 12 || old3.length !== 8) throw new Error(`Expected existing De Taali split 12/8, got ${old2.length}/${old3.length}`);
if (!old2.every((song) => existing.has(song.id)) || !old3.every((song) => existing.has(song.id))) throw new Error('Existing De Taali stable-ID set changed; refusing to apply');
if (!songs2.slice(-old2.length).every((song) => song.releaseId === releaseId)) throw new Error('Expected songs-02 De Taali rows to remain a contiguous tail');
if (!songs3.slice(0, old3.length).every((song) => song.releaseId === releaseId)) throw new Error('Expected songs-03 De Taali rows to remain a contiguous head');

const patchExisting = (song) => {
  const truth = existing.get(song.id);
  if (!truth) return song;
  return { ...song, artist: truth.artist, trackNumber: truth.trackNumber, artistPrecision: 'track-level' };
};
const patched2 = old2.map(patchExisting);
const patched3 = old3.map(patchExisting);
const add2 = newSongs.filter((song) => song.trackNumber <= 14);
const add3 = newSongs.filter((song) => song.trackNumber >= 15);
const canonical2 = [...patched2, ...add2].sort((a, b) => a.trackNumber - b.trackNumber);
const canonical3 = [...patched3, ...add3].sort((a, b) => a.trackNumber - b.trackNumber);
const next2 = [...songs2.slice(0, -old2.length), ...canonical2];
const next3 = [...canonical3, ...songs3.slice(old3.length)];

const all = [...canonical2, ...canonical3];
if (all.length !== 26) throw new Error(`Expected 26 De Taali songs after reconcile, got ${all.length}`);
const numbers = all.map((song) => song.trackNumber).sort((a, b) => a - b);
if (numbers.join(',') !== Array.from({ length: 26 }, (_, i) => i + 1).join(',')) throw new Error(`Canonical track-number coverage is not exactly 1..26: ${numbers.join(',')}`);
if (new Set(all.map((song) => song.id)).size !== 26) throw new Error('De Taali stable IDs are not unique');
for (const id of existing.keys()) if (!all.some((song) => song.id === id)) throw new Error(`Existing stable ID disappeared: ${id}`);
if (all.filter((song) => song.artist === 'Hemant Chauhan').length !== 1 || all.find((song) => song.trackNumber === 13)?.artist !== 'Hemant Chauhan') throw new Error('Hemant Chauhan performer boundary must be exactly canonical track 13');
if (all.filter((song) => song.artist === 'Falguni Pathak').length !== 25) throw new Error('Expected 25 Falguni Pathak track-level credits');

writeMin(song2Path, next2);
writeMin(song3Path, next3);

const releasesPath = 'data/catalogue/releases/releases-01.json';
const releases = read(releasesPath);
const release = releases.find((entry) => entry.id === releaseId);
if (!release || release.songCount !== 26 || release.trackImportComplete !== false) throw new Error('Unexpected De Taali release baseline');
release.trackImportComplete = true;
release.description = 'A 26-track 1999 Various Artists Dandia release issued by Sony BMG Music Entertainment (India) Pvt. Ltd., catalogued with Raas/Dandiya and Bollywood/filmi material. The complete 26-track programme is catalogued with track-level performer metadata.';
writeMin(releasesPath, releases);

const indexPath = 'data/catalogue/index.json';
const index = read(indexPath);
if (index.songCount !== 1706 || index.version !== '0.29.9') throw new Error(`Unexpected catalogue baseline ${index.songCount} / ${index.version}`);
index.songCount = 1712;
index.version = '0.29.10';
writeMin(indexPath, index);

const playbackPath = 'data/playback-sources-de-taali-exact.json';
const playback = read(playbackPath);
const sourceEntries = Object.entries(playback.songSources || {});
if (sourceEntries.length !== 20 || sourceEntries.some(([id]) => !existing.has(id))) throw new Error('Unexpected De Taali playback stable-ID set');
const routeTruth = (source) => JSON.stringify({ provider: source.provider, videoId: source.videoId ?? null, startSeconds: source.startSeconds ?? null, sourceUrl: source.sourceUrl, sourceType: source.sourceType, releaseId: source.releaseId, evidenceType: source.evidenceType });
const beforeTruth = Object.fromEntries(sourceEntries.map(([id, source]) => [id, routeTruth(source)]));
for (const [id, source] of sourceEntries) source.trackNumber = existing.get(id).trackNumber;
playback.version = '0.2.1';
playback.updated = '2026-09-19';
playback.note = 'Issue #1458 retains its ten independently verified De Taali (1999) Sony-supplied auto-generated YouTube full-track routes and ten exact Amazon Music provenance rows. Issue #1113 now aligns these 20 stable playback identities to the canonical 26-track album numbering while the six newly imported catalogue rows intentionally receive no explicit executable route. No provider, video ID, URL, timestamp, source authority or recording identity is changed.';
for (const [id, source] of Object.entries(playback.songSources)) if (routeTruth(source) !== beforeTruth[id]) throw new Error(`Playback route truth changed for ${id}`);
writePretty(playbackPath, playback);

console.log(`Reconciled De Taali: ${all.length} canonical songs, tracks ${numbers[0]}-${numbers.at(-1)}, ${newSongs.length} new rows.`);
