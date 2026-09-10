import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const controllerPath = path.join(repoRoot, 'src/playback/direct-media-controller.js');

const controllerApi = require(controllerPath);
const authorityStateApi = require(path.join(repoRoot, 'src/playback/direct-media-authority-state.js'));
const mediaSessionPolicyApi = require(path.join(repoRoot, 'src/playback/media-session-policy.js'));
const lifecyclePolicyApi = require(path.join(repoRoot, 'src/playback/playback-lifecycle-policy.js'));
const sourceResolverApi = require(path.join(repoRoot, 'src/playback/direct-source-resolver.js'));

const { createDirectMediaController, MEDIA_EVENTS } = controllerApi;

class FakeMediaElement {
  constructor() {
    this.src = '';
    this.currentSrc = '';
    this.duration = Number.NaN;
    this.currentTime = 0;
    this.playbackRate = 1;
    this.error = null;
    this.loadCalls = 0;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.addCounts = new Map();
    this.removeCounts = new Map();
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
    this.addCounts.set(type, (this.addCounts.get(type) || 0) + 1);
  }

  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
    this.removeCounts.set(type, (this.removeCounts.get(type) || 0) + 1);
  }

  load() {
    this.loadCalls += 1;
  }

  play() {
    this.playCalls += 1;
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
  }

  removeAttribute(name) {
    if (name === 'src') {
      this.src = '';
      this.currentSrc = '';
    }
  }

  emit(type, values = {}) {
    if (Object.prototype.hasOwnProperty.call(values, 'currentSrc')) this.currentSrc = values.currentSrc;
    else if (!this.currentSrc) this.currentSrc = this.src;
    if (Object.prototype.hasOwnProperty.call(values, 'duration')) this.duration = values.duration;
    if (Object.prototype.hasOwnProperty.call(values, 'currentTime')) this.currentTime = values.currentTime;
    if (Object.prototype.hasOwnProperty.call(values, 'playbackRate')) this.playbackRate = values.playbackRate;
    if (Object.prototype.hasOwnProperty.call(values, 'error')) this.error = values.error;
    for (const handler of [...(this.listeners.get(type) || [])]) handler({ type, target: this });
  }
}

class FakeMediaSession {
  constructor() {
    this.metadata = null;
    this.playbackState = 'none';
    this.handlers = new Map();
    this.handlerCalls = [];
    this.positionCalls = [];
  }

  setActionHandler(action, handler) {
    this.handlerCalls.push({ action, handler });
    if (handler === null) this.handlers.delete(action);
    else this.handlers.set(action, handler);
  }

  setPositionState(value) {
    this.positionCalls.push(value === undefined ? null : { ...value });
  }
}

function song(id = 'song-a') {
  return {
    id,
    title: id === 'song-a' ? 'Song A' : 'Song B',
    artist: id === 'song-a' ? 'Artist A' : 'Artist B',
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
      rightsHolder: `Rights ${id}`,
      licenseName: 'Direct streaming permission',
      proofUrl: `https://rights.playgarba.example/grants/${id}`,
    },
  };
}

function resolution(id = 'song-a') {
  return sourceResolverApi.resolvePlaybackSource({
    song: song(id),
    directEntry: directEntry(id),
    directSongId: id,
  });
}

function identity(id = 'song-a') {
  return {
    songId: id,
    title: id === 'song-a' ? 'Song A' : 'Song B',
    artist: id === 'song-a' ? 'Artist A' : 'Artist B',
    album: id === 'song-a' ? 'Album A' : 'Album B',
    artwork: [{ src: `https://art.playgarba.example/${id}.png`, sizes: '512x512', type: 'image/png' }],
  };
}

const fullCapabilities = Object.freeze({
  canPlay: true,
  canPause: true,
  canStop: true,
  canSeek: true,
  canPrevious: true,
  canNext: true,
  seekBackwardSeconds: 10,
  seekForwardSeconds: 15,
});

function setup(overrides = {}) {
  const mediaElement = overrides.mediaElement || new FakeMediaElement();
  const mediaSession = overrides.mediaSession === undefined ? new FakeMediaSession() : overrides.mediaSession;
  const metadataSeen = [];
  const stateChanges = [];
  const previousCalls = [];
  const nextCalls = [];
  const controller = createDirectMediaController({
    mediaElement,
    mediaSession,
    metadataFactory: (metadata) => {
      const copy = { ...metadata, artwork: [...metadata.artwork] };
      metadataSeen.push(copy);
      return copy;
    },
    authorityStateApi,
    mediaSessionPolicyApi,
    lifecyclePolicyApi,
    sourceResolverApi,
    onPrevious: (context) => { previousCalls.push(context); return true; },
    onNext: (context) => { nextCalls.push(context); return true; },
    onStateChange: (change) => stateChanges.push(change),
  });
  return { controller, mediaElement, mediaSession, metadataSeen, stateChanges, previousCalls, nextCalls };
}

assert.deepEqual([...MEDIA_EVENTS], [
  'loadstart', 'loadedmetadata', 'durationchange', 'canplay', 'playing', 'pause',
  'waiting', 'timeupdate', 'seeked', 'ended', 'error',
]);

{
  const { controller, mediaElement } = setup();
  for (const type of MEDIA_EVENTS) assert.equal(mediaElement.addCounts.get(type), 1, `${type} listener must attach once`);
  assert.equal(controller.getState().phase, 'idle');
  controller.destroy();
  for (const type of MEDIA_EVENTS) assert.equal(mediaElement.removeCounts.get(type), 1, `${type} listener must be removed once`);
  assert.equal(controller.destroy(), false, 'destroy is idempotent');
}

{
  const { controller, mediaElement, mediaSession, metadataSeen } = setup();
  const accepted = controller.select({
    resolution: resolution('song-a'),
    identity: identity('song-a'),
    generation: 1,
    capabilities: fullCapabilities,
  });
  assert.equal(accepted, true);
  assert.equal(controller.getState().songId, 'song-a');
  assert.equal(controller.getState().phase, 'selected');
  assert.equal(controller.getState().playbackState, 'none');
  assert.equal(mediaElement.src, 'https://audio.playgarba.example/song-a/master.m4a');
  assert.equal(mediaElement.loadCalls, 1);
  assert.equal(mediaElement.playCalls, 0, 'selection must never autoplay');
  assert.equal(mediaSession.playbackState, 'none');
  assert.equal(mediaSession.metadata.title, 'Song A');
  assert.equal(mediaSession.metadata.artist, 'Artist A');
  assert.equal(metadataSeen.at(-1).album, 'Album A');
  assert.equal(mediaSession.handlers.size, 0, 'inactive selection must not advertise OS actions');

  const beforeIntent = controller.getState();
  const playResult = controller.play();
  assert.notEqual(playResult, false);
  assert.equal(mediaElement.playCalls, 1);
  assert.equal(controller.getState(), beforeIntent, 'play intent must not fabricate Playing state');
  assert.equal(mediaSession.playbackState, 'none');
}

{
  const { controller, mediaElement, mediaSession } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities });

  mediaElement.emit('loadstart', { currentSrc: mediaElement.src });
  assert.equal(controller.getState().phase, 'loading');

  mediaElement.emit('loadedmetadata', { duration: 180, currentTime: 0 });
  assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().duration, 180);
  assert.equal(controller.getState().position, 0);

  mediaElement.emit('canplay');
  assert.equal(controller.getState().phase, 'ready');

  mediaElement.emit('playing', { currentTime: 2.5 });
  assert.equal(controller.getState().phase, 'playing');
  assert.equal(controller.getState().playbackState, 'playing');
  assert.equal(mediaSession.playbackState, 'playing');
  assert.equal(mediaSession.handlers.has('play'), true);
  assert.equal(mediaSession.handlers.has('pause'), true);
  assert.equal(mediaSession.handlers.has('seekto'), true);
  assert.equal(mediaSession.handlers.has('previoustrack'), true);
  assert.equal(mediaSession.handlers.has('nexttrack'), true);
  assert.deepEqual(mediaSession.positionCalls.at(-1), { duration: 180, position: 2.5, playbackRate: 1 });

  mediaElement.emit('timeupdate', { currentTime: 12.25 });
  assert.equal(controller.getState().position, 12.25);
  assert.deepEqual(mediaSession.positionCalls.at(-1), { duration: 180, position: 12.25, playbackRate: 1 });

  mediaElement.emit('waiting', { currentTime: 12.5 });
  assert.equal(controller.getState().phase, 'buffering');
  assert.equal(controller.getState().songId, 'song-a');
  assert.equal(controller.getState().position, 12.5);
  assert.equal(mediaSession.playbackState, 'none');

  mediaElement.emit('playing', { currentTime: 13 });
  assert.equal(mediaSession.playbackState, 'playing');

  const pauseResult = controller.pause();
  assert.equal(pauseResult, true);
  assert.equal(mediaElement.pauseCalls, 1);
  assert.equal(controller.getState().phase, 'playing', 'pause command is intent until media evidence arrives');
  assert.equal(mediaSession.playbackState, 'playing');

  mediaElement.emit('pause', { currentTime: 14 });
  assert.equal(controller.getState().phase, 'paused');
  assert.equal(controller.getState().playbackState, 'paused');
  assert.equal(mediaSession.playbackState, 'paused');
}

{
  const { controller, mediaElement, mediaSession, previousCalls, nextCalls } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities });
  mediaElement.emit('loadedmetadata', { currentSrc: mediaElement.src, duration: 200, currentTime: 20 });
  mediaElement.emit('playing', { currentTime: 20 });

  const seekHandler = mediaSession.handlers.get('seekto');
  assert.equal(typeof seekHandler, 'function');
  seekHandler({ seekTime: 60 });
  assert.equal(mediaElement.currentTime, 60);
  assert.deepEqual(controller.getState().seek, { active: true, target: 60 });
  assert.equal(controller.getState().position, 20, 'seek intent must preserve last authoritative position');

  mediaElement.emit('seeked', { currentTime: 60 });
  assert.deepEqual(controller.getState().seek, { active: false, target: null });
  assert.equal(controller.getState().position, 60);

  mediaSession.handlers.get('seekbackward')({});
  assert.equal(mediaElement.currentTime, 50);
  mediaElement.emit('seeked', { currentTime: 50 });
  assert.equal(controller.getState().position, 50);

  mediaSession.handlers.get('seekforward')({ seekOffset: 20 });
  assert.equal(mediaElement.currentTime, 70);
  mediaElement.emit('seeked', { currentTime: 70 });
  assert.equal(controller.getState().position, 70);

  mediaSession.handlers.get('previoustrack')();
  mediaSession.handlers.get('nexttrack')();
  assert.deepEqual(previousCalls, [{ songId: 'song-a', generation: 1 }]);
  assert.deepEqual(nextCalls, [{ songId: 'song-a', generation: 1 }]);
}

{
  const { controller, mediaElement, mediaSession } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities });
  mediaElement.emit('loadedmetadata', { currentSrc: mediaElement.src, duration: 120, currentTime: 10 });
  mediaElement.emit('playing', { currentTime: 10 });
  assert.equal(mediaSession.metadata.title, 'Song A');

  const oldUrl = mediaElement.src;
  controller.select({ resolution: resolution('song-b'), identity: identity('song-b'), generation: 2, capabilities: fullCapabilities });
  const newUrl = mediaElement.src;
  assert.notEqual(oldUrl, newUrl);
  assert.equal(controller.getState().songId, 'song-b');
  assert.equal(controller.getState().phase, 'selected');
  assert.equal(mediaSession.metadata.title, 'Song B');

  mediaElement.emit('playing', { currentSrc: oldUrl, duration: 120, currentTime: 99 });
  assert.equal(controller.getState().songId, 'song-b');
  assert.equal(controller.getState().phase, 'selected');
  assert.equal(controller.getState().position, null);
  assert.equal(mediaSession.metadata.title, 'Song B', 'late A event must not overwrite B metadata');
  assert.equal(mediaSession.playbackState, 'none');

  mediaElement.emit('error', { currentSrc: oldUrl, error: { code: 3 } });
  assert.equal(controller.getState().phase, 'selected', 'late A error must not poison B');

  mediaElement.emit('loadstart', { currentSrc: newUrl });
  mediaElement.emit('loadedmetadata', { duration: 210, currentTime: 0 });
  mediaElement.emit('playing', { currentTime: 1 });
  assert.equal(controller.getState().songId, 'song-b');
  assert.equal(controller.getState().phase, 'playing');
  assert.equal(mediaSession.playbackState, 'playing');
}

{
  const { controller, mediaElement, mediaSession } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities });
  mediaElement.emit('loadedmetadata', { currentSrc: mediaElement.src, duration: 100, currentTime: 25 });
  mediaElement.emit('playing', { currentTime: 25 });

  const hidden = controller.reconcileLifecycle('hidden', 'fresh');
  assert.equal(hidden.valid, true);
  assert.equal(hidden.allowBackgroundContinuation, true);
  assert.equal(hidden.allowAutomaticResume, false);
  assert.equal(hidden.stateClaim, 'playing');
  assert.equal(mediaSession.playbackState, 'playing');
  assert.equal(mediaElement.playCalls, 0, 'lifecycle reconciliation must not force resume');

  const interrupted = controller.reconcileLifecycle('interrupted', 'fresh');
  assert.equal(interrupted.valid, true);
  assert.equal(interrupted.requiresReconciliation, true);
  assert.equal(interrupted.stateClaim, 'none');
  assert.equal(mediaSession.playbackState, 'none');
  assert.equal(mediaElement.playCalls, 0);
  assert.equal(mediaSession.handlers.size, 0, 'uncertain lifecycle truth must remove OS commands');

  mediaElement.emit('playing', { currentSrc: mediaElement.src, currentTime: 26 });
  assert.equal(mediaSession.playbackState, 'playing', 'fresh media evidence restores Playing truth');
}

{
  const { controller, mediaElement, mediaSession } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities });
  mediaElement.emit('loadedmetadata', { currentSrc: mediaElement.src, duration: 90, currentTime: 10 });
  mediaElement.emit('playing', { currentTime: 10 });

  mediaElement.emit('ended', { currentTime: 90 });
  assert.equal(controller.getState().phase, 'ended');
  assert.equal(mediaSession.playbackState, 'none', 'terminal policy clears OS Playing claim');
  assert.equal(mediaSession.metadata, null);
  assert.equal(mediaSession.handlers.size, 0);

  assert.equal(controller.play(), false, 'ended authority does not auto-restart without a new explicit selection');
}

{
  const { controller, mediaElement, mediaSession } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities });
  mediaElement.emit('loadedmetadata', { currentSrc: mediaElement.src, duration: 90, currentTime: 10 });
  mediaElement.emit('playing', { currentTime: 10 });
  mediaElement.emit('error', { error: { code: 3 } });
  assert.equal(controller.getState().phase, 'error');
  assert.deepEqual(controller.getState().error, { code: 'media-error-3' });
  assert.equal(mediaSession.playbackState, 'none');
  assert.equal(mediaSession.metadata, null);
  assert.equal(mediaSession.handlers.size, 0);
}

{
  const { controller, mediaElement, mediaSession } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities });
  mediaElement.emit('playing', { currentSrc: mediaElement.src, currentTime: 3 });
  assert.equal(controller.markUnavailable('rights-revoked'), true);
  assert.equal(controller.getState().phase, 'unavailable');
  assert.equal(controller.getState().error.code, 'rights-revoked');
  assert.equal(mediaSession.metadata, null);
  assert.equal(mediaSession.handlers.size, 0);
  assert.equal(controller.play(), false);
}

{
  const { controller, mediaElement } = setup();
  const youtube = sourceResolverApi.resolvePlaybackSource({ song: song('song-a') });
  assert.equal(youtube.kind, 'youtube-foreground');
  assert.equal(controller.select({ resolution: youtube, identity: identity('song-a'), generation: 1, capabilities: fullCapabilities }), false);
  assert.equal(mediaElement.src, '');
  assert.equal(mediaElement.loadCalls, 0);

  const forged = {
    ...resolution('song-a'),
    media: { url: 'https://www.youtube.com/watch?v=abcdefghijk', mimeType: 'audio/mp4' },
  };
  assert.equal(controller.select({ resolution: forged, identity: identity('song-a'), generation: 1, capabilities: fullCapabilities }), false);
  assert.equal(mediaElement.src, '');
}

{
  const { controller, mediaElement } = setup();
  assert.equal(controller.select({ resolution: resolution('song-a'), identity: identity('song-b'), generation: 1, capabilities: fullCapabilities }), false);
  assert.equal(mediaElement.src, '');
  assert.equal(controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 1, capabilities: fullCapabilities }), true);
  assert.equal(controller.select({ resolution: resolution('song-b'), identity: identity('song-b'), generation: 1, capabilities: fullCapabilities }), false, 'generation must increase');
  assert.equal(controller.getState().songId, 'song-a');
}

{
  const { controller, mediaElement, mediaSession } = setup();
  controller.select({ resolution: resolution('song-a'), identity: identity('song-a'), generation: 3, capabilities: fullCapabilities });
  mediaElement.emit('loadedmetadata', { currentSrc: mediaElement.src, duration: 60, currentTime: 5 });
  mediaElement.emit('playing', { currentTime: 5 });
  assert.equal(mediaSession.handlers.size > 0, true);

  assert.equal(controller.reset(4), true);
  assert.equal(controller.getState().phase, 'idle');
  assert.equal(controller.getState().generation, 4);
  assert.equal(controller.getState().songId, null);
  assert.equal(mediaElement.src, '');
  assert.equal(mediaSession.metadata, null);
  assert.equal(mediaSession.playbackState, 'none');
  assert.equal(mediaSession.handlers.size, 0);
  assert.equal(controller.reset(4), false);
}

{
  assert.throws(
    () => createDirectMediaController({}),
    /persistent media element/
  );
}

{
  const source = await fs.readFile(controllerPath, 'utf8');
  for (const forbidden of [
    'new Audio(',
    'document.',
    'navigator.',
    'fetch(',
    'XMLHttpRequest',
    'sendBeacon',
    'youtube-player',
    'googlevideo.com',
  ]) {
    assert.equal(source.includes(forbidden), false, `controller must not own provider/bootstrap/network surface: ${forbidden}`);
  }
}

console.log('Direct-media controller tests passed.');
