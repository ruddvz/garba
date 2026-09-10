import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { validateDirectAudioManifest } from './validate-direct-audio-rights.mjs';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resolverPath = path.join(repoRoot, 'src/playback/direct-source-resolver.js');
const resolver = require(resolverPath);

const {
  resolvePlaybackSource,
  failDirectPlayback,
  isExecutableYoutube,
  isBlockedConsumerProviderUrl,
} = resolver;

function song(overrides = {}) {
  return {
    id: 'garba-song-001',
    title: 'Garba Song',
    artist: 'Artist',
    playbackProvider: 'youtube',
    youtubeId: 'abcdefghijk',
    playbackSourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    playbackSourceType: 'verified-track-source',
    playbackSearchOnly: false,
    ...overrides,
  };
}

function directEntry(overrides = {}) {
  const base = {
    audioUrl: 'https://audio.playgarba.example/garba-song-001/stream.m4a',
    mimeType: 'audio/mp4',
    rights: {
      redistributionAuthorized: true,
      rightsHolder: 'Example Rights Holder',
      licenseName: 'Direct streaming permission',
      proofUrl: 'https://rights.playgarba.example/grants/garba-song-001',
    },
  };
  return {
    ...base,
    ...overrides,
    rights: overrides.rights === undefined ? base.rights : overrides.rights,
  };
}

function resolveDirect(entry = directEntry(), directSongId = 'garba-song-001') {
  return resolvePlaybackSource({ song: song(), directEntry: entry, directSongId });
}

{
  const entry = directEntry();
  const manifestErrors = validateDirectAudioManifest(
    { version: '1.0.0', tracks: { 'garba-song-001': entry } },
    new Set(['garba-song-001'])
  );
  assert.deepEqual(manifestErrors, [], 'resolver valid fixture must also satisfy the #984 manifest gate');

  const result = resolveDirect(entry);
  assert.equal(result.kind, 'direct');
  assert.equal(result.playable, true);
  assert.equal(result.backgroundCapable, true);
  assert.equal(result.songId, 'garba-song-001');
  assert.equal(result.provider, 'direct');
  assert.equal(result.media.url, 'https://audio.playgarba.example/garba-song-001/stream.m4a');
  assert.equal(result.media.mimeType, 'audio/mp4');
  assert.equal(result.provenance.sourceType, 'licensed-direct');
  assert.equal(result.provenance.rightsHolder, 'Example Rights Holder');
  assert.equal(result.provenance.licenseName, 'Direct streaming permission');
  assert.equal(result.provenance.proofUrl, 'https://rights.playgarba.example/grants/garba-song-001');
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.media), true);
  assert.equal(Object.isFrozen(result.provenance), true);
}

{
  const input = song();
  const result = resolvePlaybackSource({ song: input });
  assert.equal(result.kind, 'youtube-foreground');
  assert.equal(result.playable, true);
  assert.equal(result.backgroundCapable, false);
  assert.equal(result.songId, input.id);
  assert.equal(result.provider, 'youtube');
  assert.equal(result.provenance.videoId, input.youtubeId);
  assert.equal(result.provenance.startSeconds, 0);
  assert.equal(result.provenance.sourceUrl, input.playbackSourceUrl);
}

{
  const timestamped = song({ youtubeStartSeconds: 73 });
  const result = resolvePlaybackSource({ song: timestamped });
  assert.equal(result.kind, 'youtube-foreground');
  assert.equal(result.provenance.startSeconds, 73);
}

{
  const fromUrl = song({ youtubeId: null, playbackProvider: 'youtube', playbackSourceUrl: 'https://youtu.be/ZYX987abcde' });
  const result = resolvePlaybackSource({ song: fromUrl });
  assert.equal(result.kind, 'youtube-foreground');
  assert.equal(result.provenance.videoId, 'ZYX987abcde');
  assert.equal(result.provenance.sourceUrl, 'https://youtu.be/ZYX987abcde');
}

{
  const staleProviderUrl = song({
    playbackProvider: 'spotify',
    playbackSourceUrl: 'https://open.spotify.com/track/stale-evidence',
    youtubeId: 'abcdefghijk',
  });
  const result = resolvePlaybackSource({ song: staleProviderUrl });
  assert.equal(result.kind, 'youtube-foreground');
  assert.equal(result.provenance.videoId, 'abcdefghijk');
  assert.equal(result.provenance.sourceUrl, 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(result.provenance.sourceUrl.includes('spotify.com'), false);
}

for (const unavailableSong of [
  song({ playbackSearchOnly: true }),
  song({ playbackSourceType: 'verified-unchaptered-youtube-release' }),
  song({ youtubeId: null, playbackProvider: 'youtube', playbackSourceUrl: '' }),
  song({ youtubeId: null, playbackProvider: 'spotify', playbackSourceUrl: 'https://open.spotify.com/track/example' }),
]) {
  const result = resolvePlaybackSource({ song: unavailableSong });
  assert.equal(result.kind, 'unavailable');
  assert.equal(result.playable, false);
  assert.equal(result.backgroundCapable, false);
  assert.equal(result.reason, 'no-executable-source');
}

{
  const result = resolvePlaybackSource({ song: null });
  assert.equal(result.kind, 'unavailable');
  assert.equal(result.reason, 'canonical-song-invalid');
  assert.equal(result.songId, '');
}

{
  const result = resolveDirect(directEntry(), 'different-song-id');
  assert.equal(result.kind, 'direct-invalid');
  assert.equal(result.playable, false);
  assert.match(result.errors.join('\n'), /does not match canonical song id/);
  assert.equal(result.songId, 'garba-song-001');
  assert.equal(result.provider, 'direct');
}

{
  const result = resolvePlaybackSource({ song: song(), directEntry: directEntry() });
  assert.equal(result.kind, 'direct-invalid');
  assert.match(result.errors.join('\n'), /direct song id is required/);
  assert.notEqual(result.kind, 'youtube-foreground');
}

{
  const result = resolveDirect(directEntry({
    rights: {
      redistributionAuthorized: false,
      rightsHolder: 'Example Rights Holder',
      licenseName: 'Direct streaming permission',
      proofUrl: 'https://rights.playgarba.example/grants/garba-song-001',
    },
  }));
  assert.equal(result.kind, 'direct-invalid');
  assert.match(result.errors.join('\n'), /authorisation must be exactly true/);
  assert.notEqual(result.kind, 'youtube-foreground');
}

for (const blockedUrl of [
  'https://www.youtube.com/watch?v=abcdefghijk',
  'https://youtu.be/abcdefghijk',
  'https://open.spotify.com/track/example',
  'https://music.apple.com/in/song/example/1',
  'https://soundcloud.com/example/song',
  'https://artist.bandcamp.com/track/example',
  'https://t4.bcbits.com/stream/example/mp3-128',
  'https://www.qobuz.com/us-en/album/example/example',
  'https://www.jiosaavn.com/song/example/abc',
  'https://gaana.com/song/example',
  'https://music.amazon.in/albums/example',
]) {
  assert.equal(isBlockedConsumerProviderUrl(blockedUrl), true, blockedUrl);
  const entry = directEntry({ audioUrl: blockedUrl });
  const manifestErrors = validateDirectAudioManifest(
    { version: '1.0.0', tracks: { 'garba-song-001': entry } },
    new Set(['garba-song-001'])
  );
  assert.ok(manifestErrors.some((error) => error.includes('consumer/provider stream URLs')), blockedUrl);

  const result = resolveDirect(entry);
  assert.equal(result.kind, 'direct-invalid', blockedUrl);
  assert.match(result.errors.join('\n'), /consumer\/provider URL/);
}

for (const allowedLookalikeUrl of [
  'https://bandcamp.com.example.org/audio.m4a',
  'https://bcbits.com.example.org/audio.m4a',
  'https://qobuz.com.example.org/audio.m4a',
]) {
  assert.equal(isBlockedConsumerProviderUrl(allowedLookalikeUrl), false, allowedLookalikeUrl);
  const entry = directEntry({ audioUrl: allowedLookalikeUrl });
  const manifestErrors = validateDirectAudioManifest(
    { version: '1.0.0', tracks: { 'garba-song-001': entry } },
    new Set(['garba-song-001'])
  );
  assert.equal(
    manifestErrors.some((error) => error.includes('consumer/provider stream URLs')),
    false,
    `lookalike hostname must not be provider-blocked: ${allowedLookalikeUrl}`,
  );
  assert.equal(resolveDirect(entry).kind, 'direct', `lookalike hostname must remain eligible: ${allowedLookalikeUrl}`);
}

{
  const result = resolveDirect({ ...directEntry(), unexpected: true });
  assert.equal(result.kind, 'direct-invalid');
  assert.match(result.errors.join('\n'), /unknown direct field/);
}

{
  const base = directEntry();
  const result = resolveDirect({
    ...base,
    rights: { ...base.rights, unexpected: true },
  });
  assert.equal(result.kind, 'direct-invalid');
  assert.match(result.errors.join('\n'), /unknown rights field/);
}

{
  const result = resolveDirect(directEntry({ mimeType: 'application/octet-stream' }));
  assert.equal(result.kind, 'direct-invalid');
  assert.match(result.errors.join('\n'), /MIME type is not allowed/);
}

{
  const base = directEntry();
  const result = resolveDirect({
    ...base,
    rights: { ...base.rights, proofUrl: base.audioUrl },
  });
  assert.equal(result.kind, 'direct-invalid');
  assert.match(result.errors.join('\n'), /proof URL cannot be the media URL/);
}

{
  const resolved = resolveDirect();
  const failed = failDirectPlayback(resolved, 'network-error');
  assert.equal(failed.kind, 'direct-failed');
  assert.equal(failed.playable, false);
  assert.equal(failed.backgroundCapable, false);
  assert.equal(failed.songId, resolved.songId);
  assert.equal(failed.provider, 'direct');
  assert.equal(failed.failure.code, 'network-error');
  assert.equal(failed.media.url, resolved.media.url);
  assert.equal(failed.provenance.proofUrl, resolved.provenance.proofUrl);
  assert.notEqual(failed.kind, 'youtube-foreground');
}

assert.throws(
  () => failDirectPlayback(resolvePlaybackSource({ song: song() })),
  /requires a direct playback resolution/
);

{
  const first = resolveDirect();
  const second = resolveDirect();
  assert.deepEqual(first, second);
}

assert.equal(isExecutableYoutube(song()), true);
assert.equal(isExecutableYoutube(song({ playbackSearchOnly: true })), false);
assert.equal(isExecutableYoutube(song({ playbackSourceType: 'verified-unchaptered-youtube-release' })), false);

{
  const source = await fs.readFile(resolverPath, 'utf8');
  for (const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'sendBeacon',
    'document.',
    'navigator.',
    'new Audio(',
    '.play()',
    '.pause()',
  ]) {
    assert.equal(source.includes(forbidden), false, `resolver must stay side-effect free: ${forbidden}`);
  }
}

console.log('Direct-source resolver tests passed.');
