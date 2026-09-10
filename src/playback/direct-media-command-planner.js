(function attachDirectMediaCommandPlanner(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GARBA_DIRECT_MEDIA_COMMAND_PLANNER = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function createDirectMediaCommandPlanner() {
  'use strict';

  const VERSION = 1;
  const INTENTS = new Set(['sync-source', 'play', 'pause', 'seek', 'reconcile', 'clear']);
  const BINDABLE_PHASES = new Set(['selected', 'loading', 'ready', 'playing', 'paused', 'buffering']);
  const TERMINAL_PHASES = new Set(['ended', 'error', 'unavailable']);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function nonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function validGeneration(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function finitePositive(value) {
    return Number.isFinite(value) && value > 0;
  }

  function finiteNonNegative(value) {
    return Number.isFinite(value) && value >= 0;
  }

  function normaliseHttpsUrl(value) {
    if (!nonEmptyString(value)) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' ? parsed.href : null;
    } catch {
      return null;
    }
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (!isPlainObject(value)) return value;
    const copy = {};
    for (const [key, entry] of Object.entries(value)) copy[key] = cloneValue(entry);
    return copy;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for (const entry of Object.values(value)) deepFreeze(entry);
    return Object.freeze(value);
  }

  function makeCommand(type, fields = {}) {
    return { type, ...fields };
  }

  function makePlan({ valid, reason = null, intent = null, songId = null, generation = null, commands = [] }) {
    return deepFreeze({
      version: VERSION,
      valid,
      reason,
      intent,
      songId,
      generation,
      commands,
    });
  }

  function directAuthority(authority) {
    if (!isPlainObject(authority) || authority.version !== 1) return null;
    if (!nonEmptyString(authority.songId) || !validGeneration(authority.generation)) return null;
    if (!isPlainObject(authority.source)) return null;

    const source = authority.source;
    if (source.kind !== 'direct'
      || source.provider !== 'direct'
      || source.playable !== true
      || source.backgroundCapable !== true
      || String(source.songId || '').trim() !== authority.songId.trim()) return null;

    const sourceUrl = normaliseHttpsUrl(source.media && source.media.url);
    const mimeType = String(source.media && source.media.mimeType || '').trim().toLowerCase();
    if (!sourceUrl || !mimeType) return null;

    return {
      songId: authority.songId.trim(),
      generation: authority.generation,
      sourceUrl,
      mimeType,
      phase: String(authority.phase || '').trim(),
      playbackState: String(authority.playbackState || '').trim(),
      duration: authority.duration,
    };
  }

  function idleAuthority(authority) {
    return Boolean(
      isPlainObject(authority)
      && authority.version === 1
      && validGeneration(authority.generation)
      && authority.songId === null
      && authority.source === null
      && authority.phase === 'idle'
    );
  }

  function normaliseBinding(binding) {
    if (binding === null || binding === undefined) return { empty: true, valid: true };
    if (!isPlainObject(binding)) return { empty: false, valid: false };

    const songId = nonEmptyString(binding.songId) ? binding.songId.trim() : '';
    const generation = binding.generation;
    const sourceUrl = normaliseHttpsUrl(binding.sourceUrl);
    if (!songId || !validGeneration(generation) || !sourceUrl) {
      return { empty: false, valid: false };
    }
    return { empty: false, valid: true, songId, generation, sourceUrl };
  }

  function bindingMatches(active, binding) {
    return Boolean(
      binding.valid
      && !binding.empty
      && binding.songId === active.songId
      && binding.generation === active.generation
      && binding.sourceUrl === active.sourceUrl
    );
  }

  function normaliseIntent(intent) {
    if (!isPlainObject(intent) || !INTENTS.has(intent.type)) return null;
    const normalised = { type: intent.type };
    if (intent.songId !== undefined) normalised.songId = String(intent.songId || '').trim();
    if (intent.generation !== undefined) normalised.generation = intent.generation;
    if (intent.target !== undefined) normalised.target = intent.target;
    return normalised;
  }

  function intentMatchesActive(intent, active) {
    return nonEmptyString(intent.songId)
      && validGeneration(intent.generation)
      && intent.songId === active.songId
      && intent.generation === active.generation;
  }

  function activeIdentity(active) {
    return { songId: active.songId, generation: active.generation };
  }

  function bindingIdentity(binding) {
    return { songId: binding.songId, generation: binding.generation };
  }

  function sourceSyncCommands(active, binding) {
    if (!BINDABLE_PHASES.has(active.phase)) return [];
    const identity = activeIdentity(active);
    if (bindingMatches(active, binding)) return [];

    const commands = [];
    if (!binding.empty) {
      commands.push(makeCommand('request-pause', {
        ...bindingIdentity(binding),
        reason: 'replace-stale-binding',
      }));
    }
    commands.push(makeCommand('bind-source', {
      ...identity,
      sourceUrl: active.sourceUrl,
      mimeType: active.mimeType,
    }));
    commands.push(makeCommand('load-media', identity));
    return commands;
  }

  function clearBindingCommands(binding) {
    if (binding.empty || !binding.valid) return [];
    const identity = bindingIdentity(binding);
    return [
      makeCommand('request-pause', { ...identity, reason: 'clear-bound-source' }),
      makeCommand('clear-media-source', { ...identity, sourceUrl: binding.sourceUrl }),
    ];
  }

  function lifecycleMatches(lifecycleDecision, active) {
    return Boolean(
      isPlainObject(lifecycleDecision)
      && lifecycleDecision.version === 1
      && lifecycleDecision.valid === true
      && lifecycleDecision.songId === active.songId
      && lifecycleDecision.generation === active.generation
    );
  }

  function mediaSessionPolicyMatches(policy, active) {
    if (!isPlainObject(policy) || policy.version !== 1 || policy.valid !== true) return false;
    if (policy.songId !== active.songId || policy.provider !== 'direct' || policy.backgroundCapable !== true) return false;
    if (!isPlainObject(policy.metadata)
      || !nonEmptyString(policy.metadata.title)
      || !nonEmptyString(policy.metadata.artist)
      || !Array.isArray(policy.actions)) return false;
    return ['playing', 'paused', 'none'].includes(policy.playbackState);
  }

  function mediaSessionCommand(policy, active, intentType) {
    if (policy === null || policy === undefined) return null;
    const identity = activeIdentity(active);
    if (intentType === 'clear' || TERMINAL_PHASES.has(active.phase) || !mediaSessionPolicyMatches(policy, active)) {
      return makeCommand('clear-media-session', identity);
    }
    return makeCommand('sync-media-session', {
      ...identity,
      policy: cloneValue(policy),
    });
  }

  function transportCommands(active, binding, intent, lifecycleDecision) {
    const identity = activeIdentity(active);

    switch (intent.type) {
      case 'sync-source':
        return sourceSyncCommands(active, binding);

      case 'play':
        if (!bindingMatches(active, binding) || TERMINAL_PHASES.has(active.phase)) return [];
        return [makeCommand('request-play', identity)];

      case 'pause':
        if (!bindingMatches(active, binding) || active.playbackState !== 'playing') return [];
        return [makeCommand('request-pause', { ...identity, reason: 'listener-intent' })];

      case 'seek':
        if (!bindingMatches(active, binding)) return [];
        if (!finitePositive(active.duration) || !finiteNonNegative(intent.target) || intent.target > active.duration) return [];
        return [makeCommand('request-seek', { ...identity, target: intent.target })];

      case 'reconcile':
        if (!lifecycleMatches(lifecycleDecision, active)) return [];
        if (lifecycleDecision.decision === 'reconcile-before-claim'
          && lifecycleDecision.requiresReconciliation === true) {
          return [makeCommand('read-media-state', identity)];
        }
        return [];

      case 'clear':
        return clearBindingCommands(binding);

      default:
        return [];
    }
  }

  function planDirectMediaCommands({
    authority,
    binding = null,
    intent,
    lifecycleDecision = null,
    mediaSessionPolicy = null,
  } = {}) {
    const normalisedIntent = normaliseIntent(intent);
    if (!normalisedIntent) {
      return makePlan({ valid: false, reason: 'intent-invalid' });
    }

    const normalisedBinding = normaliseBinding(binding);
    if (!normalisedBinding.valid) {
      return makePlan({ valid: false, reason: 'binding-invalid', intent: normalisedIntent.type });
    }

    const active = directAuthority(authority);
    if (!active) {
      if (idleAuthority(authority)
        && (normalisedIntent.type === 'clear' || normalisedIntent.type === 'sync-source')) {
        return makePlan({
          valid: true,
          intent: normalisedIntent.type,
          generation: authority.generation,
          commands: clearBindingCommands(normalisedBinding),
        });
      }
      return makePlan({
        valid: false,
        reason: 'authority-not-direct',
        intent: normalisedIntent.type,
      });
    }

    if (!intentMatchesActive(normalisedIntent, active)) {
      return makePlan({
        valid: false,
        reason: 'intent-identity-mismatch',
        intent: normalisedIntent.type,
        songId: active.songId,
        generation: active.generation,
      });
    }

    const commands = transportCommands(active, normalisedBinding, normalisedIntent, lifecycleDecision);
    const sessionCommand = mediaSessionCommand(mediaSessionPolicy, active, normalisedIntent.type);
    if (sessionCommand) commands.push(sessionCommand);

    return makePlan({
      valid: true,
      intent: normalisedIntent.type,
      songId: active.songId,
      generation: active.generation,
      commands,
    });
  }

  return {
    VERSION,
    planDirectMediaCommands,
  };
});
