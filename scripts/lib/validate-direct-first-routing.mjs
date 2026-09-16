import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const provider = fs.readFileSync('provider-runtime.js', 'utf8');
const readinessSource = fs.readFileSync('assets/runtime/route-readiness.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('data/direct-audio.json', 'utf8'));
const resolver = require('../../src/playback/direct-source-resolver.js');

const exactYoutubeSong = {
  id: 'garba-song-001',
  title: 'Garba Song',
  artist: 'Artist',
  playbackProvider: 'youtube',
  youtubeId: 'abcdefghijk',
  playbackSourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  playbackSourceType: 'verified-track-source',
  playbackSearchOnly: false,
};

const validDirectEntry = {
  audioUrl: 'https://audio.playgarba.example/garba-song-001/stream.m4a',
  mimeType: 'audio/mp4',
  rights: {
    redistributionAuthorized: true,
    rightsHolder: 'Example Rights Holder',
    licenseName: 'Direct streaming permission',
    proofUrl: 'https://rights.playgarba.example/grants/garba-song-001',
  },
};

const directDecision = resolver.resolvePlaybackSource({
  song: exactYoutubeSong,
  directEntry: validDirectEntry,
  directSongId: exactYoutubeSong.id,
});
assert.equal(directDecision.kind, 'direct', 'valid #984-authorised direct media must win deterministically');
assert.equal(directDecision.playable, true);
assert.equal(directDecision.backgroundCapable, true);
assert.equal(directDecision.songId, exactYoutubeSong.id, 'direct selection must preserve canonical recording identity');
assert.equal(directDecision.media.url, validDirectEntry.audioUrl);
assert.equal(directDecision.provenance.proofUrl, validDirectEntry.rights.proofUrl);

const invalidDirectDecision = resolver.resolvePlaybackSource({
  song: exactYoutubeSong,
  directEntry: {
    ...validDirectEntry,
    rights: { ...validDirectEntry.rights, redistributionAuthorized: false },
  },
  directSongId: exactYoutubeSong.id,
});
assert.equal(invalidDirectDecision.kind, 'direct-invalid');
assert.equal(invalidDirectDecision.playable, false);
assert.notEqual(invalidDirectDecision.kind, 'youtube-foreground', 'invalid direct rows must fail closed instead of falling back to another provider');

const noDirectDecision = resolver.resolvePlaybackSource({ song: exactYoutubeSong });
assert.equal(noDirectDecision.kind, 'youtube-foreground', 'exact YouTube must remain foreground fallback when no direct row exists');
assert.equal(noDirectDecision.songId, exactYoutubeSong.id);

const failedDirect = resolver.failDirectPlayback(directDecision, 'media-error');
assert.equal(failedDirect.kind, 'direct-failed', 'direct playback failure must be distinguishable from no direct route');
assert.equal(failedDirect.songId, directDecision.songId, 'provider failure must preserve canonical recording identity');
assert.equal(failedDirect.provider, 'direct');
assert.equal(failedDirect.failure.code, 'media-error');
assert.equal(failedDirect.provenance.proofUrl, directDecision.provenance.proofUrl);

const context = { window: {}, URL, Set };
vm.createContext(context);
vm.runInContext(readinessSource, context);
const readiness = context.window.GARBA_ROUTE_READINESS;
assert.ok(readiness, 'route-readiness contract must expose itself');

const enrichedDirectSong = {
  ...exactYoutubeSong,
  audioUrl: directDecision.media.url,
  audioMimeType: directDecision.media.mimeType,
  playbackProvider: 'direct',
  playbackSourceUrl: directDecision.media.url,
  playbackSourceType: 'licensed-direct',
  playbackReady: true,
  playbackRouteKind: 'direct',
  directAudioRights: { ...validDirectEntry.rights },
};
const directReadiness = readiness.routeReadiness(enrichedDirectSong);
assert.equal(directReadiness.status, 'direct-authorised');
assert.equal(directReadiness.executable, true);
assert.equal(directReadiness.provider, 'direct');
assert.equal(readiness.canExecuteSong(enrichedDirectSong), true);

const blockedRights = readiness.routeReadiness({
  ...enrichedDirectSong,
  directAudioRights: { ...validDirectEntry.rights, redistributionAuthorized: false },
});
assert.equal(blockedRights.status, 'blocked-policy');
assert.equal(blockedRights.executable, false);

const blockedConsumerStream = readiness.routeReadiness({
  ...enrichedDirectSong,
  audioUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  playbackSourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
});
assert.equal(blockedConsumerStream.status, 'blocked-policy');
assert.equal(blockedConsumerStream.executable, false, 'consumer-provider streams must never become direct media');

const blockedCatalogueAudio = readiness.routeReadiness({
  ...exactYoutubeSong,
  audioUrl: 'https://audio.example.org/unverified.mp3',
});
assert.equal(blockedCatalogueAudio.status, 'blocked-policy');
assert.equal(blockedCatalogueAudio.executable, false, 'catalogue audioUrl alone must never bypass the rights contract');

const temporaryDirectFailure = readiness.routeReadiness(enrichedDirectSong, { temporarilyFailed: true });
assert.equal(temporaryDirectFailure.status, 'temporary-failure');
assert.equal(temporaryDirectFailure.executable, false);
assert.equal(temporaryDirectFailure.provider, 'direct');
assert.equal(temporaryDirectFailure.videoId, exactYoutubeSong.youtubeId, 'failure diagnostics may retain exact YouTube identity without executing it');

const youtubeReadiness = readiness.routeReadiness(exactYoutubeSong);
assert.equal(youtubeReadiness.status, 'exact-mapped');
assert.equal(youtubeReadiness.executable, true);
assert.equal(youtubeReadiness.provider, 'youtube');

for (const marker of [
  "const DIRECT_MANIFEST_PATH = 'data/direct-audio.json';",
  "const DIRECT_RESOLVER_PATH = 'src/playback/direct-source-resolver.js';",
  'function loadDirectManifest()',
  'function loadDirectResolver()',
  'async function sanitiseSongsDirectFirst(songs)',
  'resolver.resolvePlaybackSource({ song, directEntry, directSongId: songId })',
  "resolution?.kind === 'direct'",
  'function applyDirectResolution(song, directEntry, resolution)',
  'function blockedDirectPolicy(song, directEntry, reason',
  "playbackRouteKind: 'direct'",
  "playbackSourceType: 'licensed-direct'",
  'directAudioRights: { ...directEntry.rights }',
  "blockedDirectPolicy(song, directEntry, 'direct-resolver-unavailable')",
  "blockedDirectPolicy(song, directEntry, resolution?.reason || 'direct-entry-invalid')",
  'if (!songId || !Object.prototype.hasOwnProperty.call(tracks, songId)) return applyYoutubeOnlyPolicy(song);',
  'return isAuthorisedDirect(song) || isExactYoutube(song);',
  'safeSongs = await sanitiseSongsDirectFirst(songs);',
  'window.GARBA_PLAYBACK_POLICY = playbackPolicy;',
]) {
  assert.match(provider, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `provider runtime missing direct-first marker: ${marker}`);
}

assert.match(provider, /delete safe\.audioUrl;/, 'unverified catalogue audio must still be stripped by the fallback policy');
assert.match(provider, /upstreamFetch\(DIRECT_MANIFEST_PATH/, 'direct manifest must bypass the wrapped songs fetch');
assert.doesNotMatch(provider, /src\/optional\/direct-audio-bridge\.js/, 'production routing must not depend on the permissive optional bridge');
assert.doesNotMatch(provider, /googlevideo\.com.*fetch|youtube.*audioUrl/i, 'production routing must not extract or proxy YouTube consumer streams');

assert.equal(manifest.version, '1.0.0', 'production direct manifest version must remain explicit');
assert.equal(typeof manifest.tracks, 'object');
assert.equal(Array.isArray(manifest.tracks), false);
assert.equal(Object.keys(manifest.tracks).length, 0, 'zero authorised production tracks is truthful until rights-cleared media is added');

console.log('Direct-first routing validated: authorised direct wins, invalid direct fails closed, exact YouTube remains no-direct fallback, and identity/provenance survive failure.');
