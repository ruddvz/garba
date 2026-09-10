(function attachDirectMediaController(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GARBA_DIRECT_MEDIA_CONTROLLER = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function createDirectMediaControllerApi() {
  'use strict';

  const VERSION = 1;
  const MEDIA_EVENTS = Object.freeze([
    'loadstart',
    'loadedmetadata',
    'durationchange',
    'canplay',
    'playing',
    'pause',
    'waiting',
    'timeupdate',
    'seeked',
    'ended',
    'error',
  ]);
  const MEDIA_SESSION_ACTIONS = Object.freeze([
    'play',
    'pause',
    'stop',
    'seekto',
    'seekbackward',
    'seekforward',
    'previoustrack',
    'nexttrack',
  ]);
  const FOREGROUND_EVENTS = new Set(['visible', 'pageshow', 'resume']);
  const BACKGROUND_EVENTS = new Set(['hidden', 'pagehide', 'freeze']);
  const BLOCKED_PHASES = new Set(['idle', 'error', 'unavailable', 'ended']);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function nonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function safeCall(fn, fallback = undefined) {
    try {
      return typeof fn === 'function' ? fn() : fallback;
    } catch {
      return fallback;
    }
  }

  function canonicalHttpsUrl(value) {
    if (!nonEmptyString(value)) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' ? parsed.href : null;
    } catch {
      return null;
    }
  }

  function cloneArtwork(value) {
    if (!Array.isArray(value)) return Object.freeze([]);
    return Object.freeze(value
      .filter((item) => isPlainObject(item) && nonEmptyString(item.src))
      .map((item) => Object.freeze({
        src: item.src.trim(),
        ...(nonEmptyString(item.sizes) ? { sizes: item.sizes.trim() } : {}),
        ...(nonEmptyString(item.type) ? { type: item.type.trim() } : {}),
      })));
  }

  function cloneIdentity(identity, songId) {
    if (!isPlainObject(identity)) return null;
    if (String(identity.songId || '').trim() !== songId) return null;
    if (!nonEmptyString(identity.title) || !nonEmptyString(identity.artist)) return null;
    const copy = {
      songId,
      title: identity.title.trim(),
      artist: identity.artist.trim(),
      artwork: cloneArtwork(identity.artwork),
    };
    if (nonEmptyString(identity.album)) copy.album = identity.album.trim();
    return Object.freeze(copy);
  }

  function cloneCapabilities(capabilities) {
    const source = isPlainObject(capabilities) ? capabilities : {};
    return Object.freeze({
      canPlay: source.canPlay === true,
      canPause: source.canPause === true,
      canStop: source.canStop === true,
      canSeek: source.canSeek === true,
      canPrevious: source.canPrevious === true,
      canNext: source.canNext === true,
      seekBackwardSeconds: finiteNumber(source.seekBackwardSeconds) && source.seekBackwardSeconds > 0
        ? source.seekBackwardSeconds
        : null,
      seekForwardSeconds: finiteNumber(source.seekForwardSeconds) && source.seekForwardSeconds > 0
        ? source.seekForwardSeconds
        : null,
    });
  }

  function playbackStateFromAuthority(state) {
    if (!isPlainObject(state)) return 'unknown';
    if (state.phase === 'playing') return 'playing';
    if (state.phase === 'paused') return 'paused';
    if (state.phase === 'buffering') return 'buffering';
    if (state.phase === 'ended') return 'ended';
    if (state.phase === 'error') return 'error';
    if (state.phase === 'unavailable') return 'unavailable';
    return 'unknown';
  }

  function sourceObserved(mediaElement) {
    const current = String(mediaElement.currentSrc || '').trim();
    if (current) return canonicalHttpsUrl(current);
    return canonicalHttpsUrl(String(mediaElement.src || '').trim());
  }

  function defaultMetadataFactory(metadata) {
    return metadata;
  }

  function createDirectMediaController({
    mediaElement,
    mediaSession = null,
    metadataFactory = defaultMetadataFactory,
    authorityStateApi,
    mediaSessionPolicyApi,
    lifecyclePolicyApi,
    sourceResolverApi,
    onPrevious = null,
    onNext = null,
    onStateChange = null,
  } = {}) {
    if (!mediaElement
      || typeof mediaElement.addEventListener !== 'function'
      || typeof mediaElement.removeEventListener !== 'function'
      || typeof mediaElement.play !== 'function'
      || typeof mediaElement.pause !== 'function') {
      throw new TypeError('createDirectMediaController requires one persistent media element');
    }
    if (!authorityStateApi
      || typeof authorityStateApi.createInitialState !== 'function'
      || typeof authorityStateApi.reduceDirectMediaAuthorityState !== 'function') {
      throw new TypeError('direct-media authority reducer API is required');
    }
    if (!mediaSessionPolicyApi || typeof mediaSessionPolicyApi.buildMediaSessionPolicy !== 'function') {
      throw new TypeError('Media Session policy API is required');
    }
    if (!lifecyclePolicyApi || typeof lifecyclePolicyApi.reconcilePlaybackLifecycle !== 'function') {
      throw new TypeError('playback lifecycle policy API is required');
    }
    if (!sourceResolverApi || typeof sourceResolverApi.isBlockedConsumerProviderUrl !== 'function') {
      throw new TypeError('direct-source resolver API is required');
    }
    if (typeof metadataFactory !== 'function') throw new TypeError('metadataFactory must be a function');

    let state = authorityStateApi.createInitialState();
    let resolution = null;
    let identity = null;
    let capabilities = cloneCapabilities(null);
    let activeUrl = null;
    let destroyed = false;
    let foreground = true;
    let lifecycleStateClaim = null;
    let lastPolicy = null;
    let lastLifecycleDecision = null;
    const installedActions = new Set();
    const listeners = new Map();

    function notify(reason) {
      if (typeof onStateChange !== 'function') return;
      safeCall(() => onStateChange(Object.freeze({ state, policy: lastPolicy, reason })));
    }

    function sourceMatchesActive() {
      if (!activeUrl) return false;
      return sourceObserved(mediaElement) === activeUrl;
    }

    function mediaPosition() {
      return {
        duration: state.duration,
        position: state.position,
        playbackRate: finiteNumber(mediaElement.playbackRate) && mediaElement.playbackRate > 0
          ? mediaElement.playbackRate
          : 1,
      };
    }

    function projectedPlaybackState() {
      if (lifecycleStateClaim === 'playing') return 'playing';
      if (lifecycleStateClaim === 'paused') return 'paused';
      if (lifecycleStateClaim === 'none') return 'unknown';
      return playbackStateFromAuthority(state);
    }

    function clearAction(action) {
      if (!mediaSession || typeof mediaSession.setActionHandler !== 'function') return;
      safeCall(() => mediaSession.setActionHandler(action, null));
      installedActions.delete(action);
    }

    function clearAllActions() {
      for (const action of MEDIA_SESSION_ACTIONS) clearAction(action);
    }

    function commandAllowed() {
      return !destroyed
        && resolution
        && resolution.kind === 'direct'
        && state.songId === resolution.songId
        && !BLOCKED_PHASES.has(state.phase);
    }

    function play() {
      if (!commandAllowed() || capabilities.canPlay !== true) return false;
      const result = safeCall(() => mediaElement.play(), false);
      return result === false ? false : result;
    }

    function pause() {
      if (!commandAllowed() || capabilities.canPause !== true) return false;
      const result = safeCall(() => mediaElement.pause(), false);
      return result === false ? false : true;
    }

    function seekTo(target) {
      if (!commandAllowed() || capabilities.canSeek !== true) return false;
      if (!finiteNumber(target) || target < 0) return false;
      if (finiteNumber(state.duration) && state.duration > 0 && target > state.duration + 0.25) return false;
      const next = authorityStateApi.reduceDirectMediaAuthorityState(state, {
        type: 'seek-start',
        generation: state.generation,
        songId: state.songId,
        target,
      });
      if (next === state || next.seek?.active !== true) return false;
      state = next;
      lifecycleStateClaim = null;
      const written = safeCall(() => {
        mediaElement.currentTime = next.seek.target;
        return true;
      }, false);
      if (!written) return false;
      syncMediaSession('seek-start');
      notify('seek-start');
      return true;
    }

    function stop() {
      if (!commandAllowed() || capabilities.canStop !== true) return false;
      const paused = safeCall(() => {
        mediaElement.pause();
        return true;
      }, false);
      if (!paused) return false;
      if (capabilities.canSeek === true && finiteNumber(state.duration) && state.duration > 0) {
        safeCall(() => { mediaElement.currentTime = 0; });
      }
      return true;
    }

    function seekRelative(delta) {
      if (!finiteNumber(delta) || delta === 0) return false;
      const origin = finiteNumber(state.position) ? state.position : Number(mediaElement.currentTime);
      if (!finiteNumber(origin)) return false;
      const duration = finiteNumber(state.duration) && state.duration > 0 ? state.duration : null;
      const target = duration === null
        ? Math.max(0, origin + delta)
        : Math.min(duration, Math.max(0, origin + delta));
      return seekTo(target);
    }

    function actionHandler(action) {
      if (action === 'play') return () => play();
      if (action === 'pause') return () => pause();
      if (action === 'stop') return () => stop();
      if (action === 'seekto') return (details = {}) => seekTo(details.seekTime);
      if (action === 'seekbackward') return (details = {}) => {
        const offset = finiteNumber(details.seekOffset) && details.seekOffset > 0
          ? details.seekOffset
          : capabilities.seekBackwardSeconds;
        return finiteNumber(offset) ? seekRelative(-offset) : false;
      };
      if (action === 'seekforward') return (details = {}) => {
        const offset = finiteNumber(details.seekOffset) && details.seekOffset > 0
          ? details.seekOffset
          : capabilities.seekForwardSeconds;
        return finiteNumber(offset) ? seekRelative(offset) : false;
      };
      if (action === 'previoustrack') return () => safeCall(() => typeof onPrevious === 'function' && onPrevious({ songId: state.songId, generation: state.generation }), false);
      if (action === 'nexttrack') return () => safeCall(() => typeof onNext === 'function' && onNext({ songId: state.songId, generation: state.generation }), false);
      return null;
    }

    function applyActions(actions) {
      if (!mediaSession || typeof mediaSession.setActionHandler !== 'function') return;
      const wanted = new Set(Array.isArray(actions) ? actions : []);
      for (const action of MEDIA_SESSION_ACTIONS) {
        if (!wanted.has(action)) {
          clearAction(action);
          continue;
        }
        const handler = actionHandler(action);
        if (!handler) {
          clearAction(action);
          continue;
        }
        const installed = safeCall(() => {
          mediaSession.setActionHandler(action, handler);
          return true;
        }, false);
        if (installed) installedActions.add(action);
        else installedActions.delete(action);
      }
    }

    function applyPolicy(policy) {
      lastPolicy = policy;
      if (!mediaSession) return;

      if (!policy || policy.valid !== true) {
        clearAllActions();
        safeCall(() => { mediaSession.metadata = null; });
        safeCall(() => { mediaSession.playbackState = 'none'; });
        safeCall(() => mediaSession.setPositionState());
        return;
      }

      if (policy.metadata) {
        const metadata = safeCall(() => metadataFactory(policy.metadata), null);
        if (metadata !== null) safeCall(() => { mediaSession.metadata = metadata; });
      } else {
        safeCall(() => { mediaSession.metadata = null; });
      }
      safeCall(() => { mediaSession.playbackState = policy.playbackState || 'none'; });
      if (policy.position && typeof mediaSession.setPositionState === 'function') {
        safeCall(() => mediaSession.setPositionState(policy.position));
      } else if (typeof mediaSession.setPositionState === 'function') {
        safeCall(() => mediaSession.setPositionState());
      }
      applyActions(policy.actions);
    }

    function syncMediaSession() {
      if (!resolution || !identity) {
        applyPolicy(null);
        return null;
      }
      const policy = mediaSessionPolicyApi.buildMediaSessionPolicy({
        resolution,
        identity,
        playback: { state: projectedPlaybackState() },
        capabilities,
        position: mediaPosition(),
        environment: { foreground },
      });
      applyPolicy(policy);
      return policy;
    }

    function mediaEventPayload(type) {
      const payload = {
        type: type === 'seeked' ? 'seek-commit' : type,
        generation: state.generation,
        songId: state.songId,
      };
      const duration = Number(mediaElement.duration);
      const currentTime = Number(mediaElement.currentTime);
      if (finiteNumber(duration)) payload.duration = duration;
      if (finiteNumber(currentTime)) payload.currentTime = currentTime;
      if (type === 'error') {
        const mediaError = mediaElement.error;
        const code = isPlainObject(mediaError) && mediaError.code !== undefined
          ? `media-error-${String(mediaError.code)}`
          : 'media-error';
        payload.code = code;
      }
      return payload;
    }

    function handleMediaEvent(type) {
      if (destroyed || !resolution || !state.songId || !sourceMatchesActive()) return false;
      const previous = state;
      const next = authorityStateApi.reduceDirectMediaAuthorityState(state, mediaEventPayload(type));
      if (next === previous) return false;
      state = next;
      lifecycleStateClaim = null;
      syncMediaSession(type);
      notify(type);
      return true;
    }

    function select({ resolution: nextResolution, identity: nextIdentity, generation, capabilities: nextCapabilities } = {}) {
      if (destroyed || !isPlainObject(nextResolution)) return false;
      if (nextResolution.kind !== 'direct' || nextResolution.provider !== 'direct') return false;
      if (nextResolution.playable !== true || nextResolution.backgroundCapable !== true) return false;
      if (!nonEmptyString(nextResolution.songId) || !isPlainObject(nextResolution.media)) return false;
      const mediaUrl = canonicalHttpsUrl(nextResolution.media.url);
      if (!mediaUrl || sourceResolverApi.isBlockedConsumerProviderUrl(mediaUrl)) return false;
      const canonicalIdentity = cloneIdentity(nextIdentity, nextResolution.songId.trim());
      if (!canonicalIdentity) return false;

      const previous = state;
      const next = authorityStateApi.reduceDirectMediaAuthorityState(state, {
        type: 'select-direct',
        generation,
        songId: nextResolution.songId.trim(),
        source: nextResolution,
      });
      if (next === previous || next.songId !== nextResolution.songId.trim()) return false;

      state = next;
      resolution = nextResolution;
      identity = canonicalIdentity;
      capabilities = cloneCapabilities(nextCapabilities);
      activeUrl = mediaUrl;
      lifecycleStateClaim = null;
      lastLifecycleDecision = null;
      foreground = true;

      const assigned = safeCall(() => {
        mediaElement.src = mediaUrl;
        return true;
      }, false);
      if (!assigned) {
        state = authorityStateApi.reduceDirectMediaAuthorityState(state, {
          type: 'unavailable',
          generation: state.generation,
          songId: state.songId,
          reason: 'media-source-assignment-failed',
        });
        syncMediaSession('source-assignment-failed');
        notify('source-assignment-failed');
        return false;
      }

      safeCall(() => typeof mediaElement.load === 'function' && mediaElement.load());
      syncMediaSession('select-direct');
      notify('select-direct');
      return true;
    }

    function reconcileLifecycle(eventName, evidence = 'fresh') {
      if (destroyed || !resolution || !state.songId || !nonEmptyString(eventName)) return null;
      if (FOREGROUND_EVENTS.has(eventName)) foreground = true;
      else if (BACKGROUND_EVENTS.has(eventName)) foreground = false;

      const decision = lifecyclePolicyApi.reconcilePlaybackLifecycle({
        active: { songId: state.songId, generation: state.generation },
        resolution,
        playback: {
          state: playbackStateFromAuthority(state),
          evidence,
          generation: state.generation,
        },
        lifecycle: { event: eventName, generation: state.generation },
      });
      lastLifecycleDecision = decision;
      lifecycleStateClaim = decision && decision.valid === true ? decision.stateClaim : 'none';
      syncMediaSession(`lifecycle:${eventName}`);
      notify(`lifecycle:${eventName}`);
      return decision;
    }

    function markUnavailable(reason = 'direct-media-unavailable') {
      if (destroyed || !resolution || !state.songId) return false;
      const previous = state;
      state = authorityStateApi.reduceDirectMediaAuthorityState(state, {
        type: 'unavailable',
        generation: state.generation,
        songId: state.songId,
        reason,
      });
      if (state === previous) return false;
      lifecycleStateClaim = null;
      syncMediaSession('unavailable');
      notify('unavailable');
      return true;
    }

    function reset(generation) {
      if (destroyed) return false;
      const previous = state;
      const next = authorityStateApi.reduceDirectMediaAuthorityState(state, { type: 'reset', generation });
      if (next === previous) return false;
      safeCall(() => mediaElement.pause());
      safeCall(() => {
        if (typeof mediaElement.removeAttribute === 'function') mediaElement.removeAttribute('src');
        else mediaElement.src = '';
      });
      safeCall(() => typeof mediaElement.load === 'function' && mediaElement.load());
      state = next;
      resolution = null;
      identity = null;
      capabilities = cloneCapabilities(null);
      activeUrl = null;
      lifecycleStateClaim = null;
      lastLifecycleDecision = null;
      applyPolicy(null);
      notify('reset');
      return true;
    }

    for (const type of MEDIA_EVENTS) {
      const handler = () => handleMediaEvent(type);
      listeners.set(type, handler);
      mediaElement.addEventListener(type, handler);
    }

    function destroy() {
      if (destroyed) return false;
      destroyed = true;
      for (const [type, handler] of listeners) mediaElement.removeEventListener(type, handler);
      listeners.clear();
      clearAllActions();
      safeCall(() => { if (mediaSession) mediaSession.metadata = null; });
      safeCall(() => { if (mediaSession) mediaSession.playbackState = 'none'; });
      safeCall(() => mediaSession && typeof mediaSession.setPositionState === 'function' && mediaSession.setPositionState());
      return true;
    }

    return Object.freeze({
      version: VERSION,
      select,
      play,
      pause,
      stop,
      seekTo,
      reconcileLifecycle,
      markUnavailable,
      reset,
      destroy,
      getState: () => state,
      getPolicy: () => lastPolicy,
      getLifecycleDecision: () => lastLifecycleDecision,
      getActiveUrl: () => activeUrl,
      isDestroyed: () => destroyed,
    });
  }

  return {
    VERSION,
    MEDIA_EVENTS,
    createDirectMediaController,
  };
});
