import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const plannerPath = path.join(repoRoot, 'src/playback/direct-media-command-planner.js');
const authorityPath = path.join(repoRoot, 'src/playback/direct-media-authority-state.js');
const resolverPath = path.join(repoRoot, 'src/playback/direct-source-resolver.js');
const lifecyclePath = path.join(repoRoot, 'src/playback/playback-lifecycle-policy.js');
const mediaSessionPath = path.join(repoRoot, 'src/playback/media-session-policy.js');

const planner = require(plannerPath);
const authority = require(authorityPath);
const resolver = require(resolverPath);
const lifecycle = require(lifecyclePath);
const mediaSession = require(mediaSessionPath);

const { VERSION, planDirectMediaCommands } = planner;
const { createInitialState, reduceDirectMediaAuthorityState } = authority;
const { resolvePlaybackSource } = resolver;
const { reconcilePlaybackLifecycle } = lifecycle;
const { buildMediaSessionPolicy } = mediaSession;

function canonicalSong(id = 'song-a') {
  return {
    id,
    title: id === 'song-a' ? 'Song A' : 'Song B',
    artist: id === 'song-a' ? 'Artist A' : 'Artist B',
    album: 'Verified album',
    artwork: [{ src: `https://images.playgarba.example/${id}.webp`, sizes: '512x512', type: 'image/webp' }],
    playbackProvider: 'youtube',
    youtubeId: id === 'song-a' ? 'abcdefghijk' : 'zyxwvutsrqp',
    playbackSourceUrl: `https://www.youtube.com/watch?v=${id === 'song-a' ? 'abcdefghijk' : 'zyxwvutsrqp'}`,
    playbackSourceType: 'verified-track-source',
    playbackSearchOnly: false,
  };
}

function directEntry(id = 'song-a') {
  return {
    audioUrl: `https://audio.playgarba.example/${id}/master.m4a`,
    mimeType: 'audio/mp4',
    rights: {
      redistributionAuthorized: true,
      rightsHolder: 'Example Rights Holder',
      licenseName: 'Direct streaming permission',
      proofUrl: `https://rights.playgarba.example/grants/${id}`,
    },
  };
}

function directResolution(id = 'song-a') {
  return resolvePlaybackSource({
    song: canonicalSong(id),
    directEntry: directEntry(id),
    directSongId: id,
  });
}

function select(id = 'song-a', generation = 1, state = createInitialState()) {
  return reduceDirectMediaAuthorityState(state, {
    type: 'select-direct',
    generation,
    songId: id,
    source: directResolution(id),
  });
}

function media(state, type, overrides = {}) {
  return reduceDirectMediaAuthorityState(state, {
    type,
    generation: state.generation,
    songId: state.songId,
    ...overrides,
  });
}

function bindingFor(state, overrides = {}) {
  return {
    songId: state.songId,
    generation: state.generation,
    sourceUrl: state.source.media.url,
    ...overrides,
  };
}

function intentFor(state, type, overrides = {}) {
  return {
    type,
    songId: state.songId,
    generation: state.generation,
    ...overrides,
  };
}

function commandTypes(plan) {
  return plan.commands.map((command) => command.type);
}

function playingState(id = 'song-a', generation = 1) {
  let state = select(id, generation);
  state = media(state, 'loadedmetadata', { duration: 180, currentTime: 12 });
  return media(state, 'playing', { currentTime: 12 });
}

function directMediaSessionPolicy(state, playbackState = 'playing') {
  return buildMediaSessionPolicy({
    resolution: state.source,
    identity: canonicalSong(state.songId),
    playback: { state: playbackState },
    capabilities: {
      canPlay: true,
      canPause: true,
      canStop: true,
      canSeek: true,
      canPrevious: true,
      canNext: true,
      seekBackwardSeconds: 10,
      seekForwardSeconds: 10,
    },
    position: {
      duration: Number.isFinite(state.duration) && state.duration > 0 ? state.duration : 180,
      position: Number.isFinite(state.position) && state.position >= 0 ? state.position : 0,
      playbackRate: 1,
    },
    environment: { foreground: true },
  });
}

assert.equal(VERSION, 1);

// 1. Selected direct A + empty binding -> bind then load, never implicit Play.
{
  const state = select('song-a', 1);
  const plan = planDirectMediaCommands({
    authority: state,
    binding: null,
    intent: intentFor(state, 'sync-source'),
  });
  assert.equal(plan.valid, true);
  assert.deepEqual(commandTypes(plan), ['bind-source', 'load-media']);
  assert.equal(plan.commands[0].songId, 'song-a');
  assert.equal(plan.commands[0].generation, 1);
  assert.equal(plan.commands[0].sourceUrl, 'https://audio.playgarba.example/song-a/master.m4a');
  assert.equal(plan.commands.some((command) => command.type === 'request-play'), false);
}

// 2. Exact matching binding -> no redundant bind/load.
{
  const state = select('song-a', 2);
  const plan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'sync-source'),
  });
  assert.deepEqual(commandTypes(plan), []);
}

// 3. Stale A binding after selecting B -> pause stale A, replace with B, load B.
{
  const a = select('song-a', 1);
  const staleBinding = bindingFor(a);
  const b = select('song-b', 2, a);
  const plan = planDirectMediaCommands({
    authority: b,
    binding: staleBinding,
    intent: intentFor(b, 'sync-source'),
  });
  assert.deepEqual(commandTypes(plan), ['request-pause', 'bind-source', 'load-media']);
  assert.equal(plan.commands[0].songId, 'song-a');
  assert.equal(plan.commands[0].generation, 1);
  assert.equal(plan.commands[1].songId, 'song-b');
  assert.equal(plan.commands[1].generation, 2);
  assert.equal(plan.commands[1].sourceUrl, b.source.media.url);
}

// 4. Play intent emits only the request. It never claims Playing.
{
  const state = select('song-a', 3);
  const plan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'play'),
  });
  assert.deepEqual(commandTypes(plan), ['request-play']);
  assert.equal('playbackState' in plan.commands[0], false);
  assert.equal('phase' in plan.commands[0], false);
  assert.equal('stateClaim' in plan.commands[0], false);
}

// Play does not silently repair a missing source binding.
{
  const state = select('song-a', 4);
  const plan = planDirectMediaCommands({
    authority: state,
    binding: null,
    intent: intentFor(state, 'play'),
  });
  assert.deepEqual(commandTypes(plan), []);
}

// 5. Pause intent while authoritatively playing requests Pause only.
{
  const state = playingState('song-a', 5);
  const plan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'pause'),
  });
  assert.deepEqual(commandTypes(plan), ['request-pause']);
  assert.equal(plan.commands[0].reason, 'listener-intent');
}

// 6. Wrong-generation and malformed intents fail closed.
{
  const state = select('song-a', 6);
  const wrong = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: { type: 'play', songId: 'song-a', generation: 5 },
  });
  assert.equal(wrong.valid, false);
  assert.equal(wrong.reason, 'intent-identity-mismatch');
  assert.deepEqual(commandTypes(wrong), []);

  const malformed = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: { type: 'autoplay', songId: 'song-a', generation: 6 },
  });
  assert.equal(malformed.valid, false);
  assert.equal(malformed.reason, 'intent-invalid');
  assert.deepEqual(commandTypes(malformed), []);
}

// Malformed attached-source evidence also fails closed.
{
  const state = select('song-a', 7);
  const plan = planDirectMediaCommands({
    authority: state,
    binding: { songId: 'song-a', generation: 7, sourceUrl: 'javascript:bad' },
    intent: intentFor(state, 'play'),
  });
  assert.equal(plan.valid, false);
  assert.equal(plan.reason, 'binding-invalid');
  assert.deepEqual(commandTypes(plan), []);
}

// 7. Seek requires finite authoritative duration and rejects malformed/out-of-range targets without clamping.
{
  const state = playingState('song-a', 8);
  const good = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'seek', { target: 90 }),
  });
  assert.deepEqual(commandTypes(good), ['request-seek']);
  assert.equal(good.commands[0].target, 90);

  for (const target of [-1, 181, Infinity, NaN, '90']) {
    const rejected = planDirectMediaCommands({
      authority: state,
      binding: bindingFor(state),
      intent: intentFor(state, 'seek', { target }),
    });
    assert.deepEqual(commandTypes(rejected), [], `seek target must fail closed: ${String(target)}`);
  }

  const noDuration = select('song-a', 9);
  const noDurationSeek = planDirectMediaCommands({
    authority: noDuration,
    binding: bindingFor(noDuration),
    intent: intentFor(noDuration, 'seek', { target: 10 }),
  });
  assert.deepEqual(commandTypes(noDurationSeek), []);
}

// 8. Lifecycle reconcile-before-claim requests a media-state read only, never resume.
{
  const state = playingState('song-a', 10);
  const decision = reconcilePlaybackLifecycle({
    active: { songId: state.songId, generation: state.generation },
    resolution: state.source,
    playback: { state: 'unknown', evidence: 'stale', generation: state.generation },
    lifecycle: { event: 'pageshow', generation: state.generation },
  });
  assert.equal(decision.decision, 'reconcile-before-claim');

  const plan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'reconcile'),
    lifecycleDecision: decision,
  });
  assert.deepEqual(commandTypes(plan), ['read-media-state']);
  assert.equal(plan.commands.some((command) => command.type === 'request-play'), false);
}

// 9. Preserve-authoritative-state lifecycle output creates no synthetic transport.
{
  const state = playingState('song-a', 11);
  const decision = reconcilePlaybackLifecycle({
    active: { songId: state.songId, generation: state.generation },
    resolution: state.source,
    playback: { state: 'playing', evidence: 'fresh', generation: state.generation },
    lifecycle: { event: 'pageshow', generation: state.generation },
  });
  assert.equal(decision.decision, 'preserve-authoritative-state');

  const plan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'reconcile'),
    lifecycleDecision: decision,
  });
  assert.deepEqual(commandTypes(plan), []);
}

// Lifecycle decisions for another generation are ignored.
{
  const state = playingState('song-a', 12);
  const staleDecision = {
    version: 1,
    valid: true,
    decision: 'reconcile-before-claim',
    songId: 'song-a',
    generation: 11,
    requiresReconciliation: true,
  };
  const plan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'reconcile'),
    lifecycleDecision: staleDecision,
  });
  assert.deepEqual(commandTypes(plan), []);
}

// 10. Idle/reset authority plus an old direct binding may pause and clear that stale binding.
{
  const old = select('song-a', 13);
  const oldBinding = bindingFor(old);
  const idle = reduceDirectMediaAuthorityState(old, { type: 'reset', generation: 14 });
  const plan = planDirectMediaCommands({
    authority: idle,
    binding: oldBinding,
    intent: { type: 'clear' },
  });
  assert.equal(plan.valid, true);
  assert.equal(plan.songId, null);
  assert.equal(plan.generation, 14);
  assert.deepEqual(commandTypes(plan), ['request-pause', 'clear-media-source']);
  assert.equal(plan.commands[0].songId, 'song-a');
  assert.equal(plan.commands[1].sourceUrl, oldBinding.sourceUrl);
}

// 11. Matching valid direct Media Session policy is passed through as one sync command.
{
  const state = playingState('song-a', 15);
  const policy = directMediaSessionPolicy(state, 'playing');
  assert.equal(policy.valid, true);
  assert.equal(policy.provider, 'direct');

  const plan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'sync-source'),
    mediaSessionPolicy: policy,
  });
  assert.deepEqual(commandTypes(plan), ['sync-media-session']);
  assert.deepEqual(plan.commands[0].policy, policy);
  assert.notEqual(plan.commands[0].policy, policy, 'planner must clone caller policy before freezing its output');
}

// 12. Mismatched, invalid and terminal Media Session presentation clears stale session state.
{
  const state = playingState('song-a', 16);
  const valid = directMediaSessionPolicy(state, 'playing');
  const mismatched = { ...valid, songId: 'song-b' };

  const mismatchPlan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'sync-source'),
    mediaSessionPolicy: mismatched,
  });
  assert.deepEqual(commandTypes(mismatchPlan), ['clear-media-session']);

  const terminalPolicy = buildMediaSessionPolicy({
    resolution: state.source,
    identity: canonicalSong(state.songId),
    playback: { state: 'ended' },
    capabilities: {},
    position: null,
    environment: { foreground: true },
  });
  assert.equal(terminalPolicy.valid, false);
  const terminalPlan = planDirectMediaCommands({
    authority: state,
    binding: bindingFor(state),
    intent: intentFor(state, 'sync-source'),
    mediaSessionPolicy: terminalPolicy,
  });
  assert.deepEqual(commandTypes(terminalPlan), ['clear-media-session']);
}

// Terminal authority cannot request Play even if the old media binding still matches.
{
  let state = playingState('song-a', 17);
  const binding = bindingFor(state);
  state = media(state, 'ended', { currentTime: 180 });
  const plan = planDirectMediaCommands({
    authority: state,
    binding,
    intent: intentFor(state, 'play'),
  });
  assert.deepEqual(commandTypes(plan), []);
}

// 13. YouTube/unavailable/non-direct authority input emits zero direct-media transport commands.
{
  const youtube = resolvePlaybackSource({ song: canonicalSong('song-a') });
  assert.equal(youtube.kind, 'youtube-foreground');
  const fakeAuthority = {
    version: 1,
    generation: 18,
    songId: 'song-a',
    source: youtube,
    phase: 'selected',
    playbackState: 'none',
    duration: null,
  };
  const plan = planDirectMediaCommands({
    authority: fakeAuthority,
    binding: null,
    intent: { type: 'play', songId: 'song-a', generation: 18 },
  });
  assert.equal(plan.valid, false);
  assert.equal(plan.reason, 'authority-not-direct');
  assert.deepEqual(commandTypes(plan), []);

  const unavailable = {
    ...fakeAuthority,
    source: { version: 1, kind: 'unavailable', playable: false, songId: 'song-a' },
  };
  const unavailablePlan = planDirectMediaCommands({
    authority: unavailable,
    binding: null,
    intent: { type: 'play', songId: 'song-a', generation: 18 },
  });
  assert.deepEqual(commandTypes(unavailablePlan), []);
}

// 14. Identical inputs are deterministic, inputs stay unchanged, and the output is deeply frozen.
{
  const state = playingState('song-a', 19);
  const binding = bindingFor(state);
  const policy = directMediaSessionPolicy(state, 'playing');
  const input = {
    authority: state,
    binding,
    intent: intentFor(state, 'sync-source'),
    mediaSessionPolicy: policy,
  };
  const snapshot = JSON.stringify(input);
  const first = planDirectMediaCommands(input);
  const second = planDirectMediaCommands(input);

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(input), snapshot, 'planner must not mutate caller inputs');
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.commands), true);
  assert.equal(Object.isFrozen(first.commands[0]), true);
  assert.equal(Object.isFrozen(first.commands[0].policy), true);
  assert.equal(Object.isFrozen(first.commands[0].policy.metadata), true);
  assert.equal(Object.isFrozen(first.commands[0].policy.metadata.artwork), true);
}

// The planner is an authority-to-command transformation only. It performs no browser/media/network side effects.
{
  const source = await fs.readFile(plannerPath, 'utf8');
  for (const forbidden of [
    'fetch(',
    'XMLHttpRequest',
    'sendBeacon',
    'document.',
    'navigator.mediaSession',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'setTimeout(',
    'setInterval(',
    'HTMLMediaElement',
    'new Audio(',
    '.play()',
    '.pause()',
  ]) {
    assert.equal(source.includes(forbidden), false, `command planner must stay side-effect free: ${forbidden}`);
  }
}

console.log('Direct-media command planner tests passed.');
