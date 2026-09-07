const PROVIDER_NAMES = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  'apple-music': 'Apple Music',
  'amazon-music': 'Amazon Music',
  qobuz: 'Qobuz',
  bandcamp: 'Bandcamp',
  soundcloud: 'SoundCloud',
  external: 'Verified provider',
};

const playbackStatusState = {
  sources: {},
  ready: false,
};

const playbackStatusEls = {
  trackBlock: document.getElementById('trackBlock'),
  songTitle: document.getElementById('songTitle'),
  audio: document.getElementById('audio'),
  playButton: document.getElementById('playButton'),
  miniPlay: document.getElementById('miniPlay'),
};

function currentSongId() {
  return new URLSearchParams(location.search).get('song');
}

async function fetchJson(path) {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function providerName(provider = '') {
  const key = String(provider).toLowerCase();
  return PROVIDER_NAMES[key] || key.replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`) || 'Provider';
}

function sourcePresentation(source) {
  if (!source) return null;
  const provider = providerName(source.provider);
  const type = String(source.sourceType || '').toLowerCase();
  const releaseFallback = type === 'verified-release-source';
  const official = type.includes('official');
  const verified = type.includes('verified');

  if (releaseFallback) {
    return {
      label: `Verified release · ${provider}`,
      action: `Open verified release on ${provider}`,
      description: `Verified release source on ${provider}. You may need to select this track inside the provider.`,
      kind: 'release',
      provider,
    };
  }

  return {
    label: `${official ? 'Official' : verified ? 'Verified' : 'Provider'} source · ${provider}`,
    action: `Play via ${provider}`,
    description: `${official ? 'Official' : verified ? 'Verified' : 'Provider'} playback source mapped to this catalogue entry.`,
    kind: official ? 'official' : verified ? 'verified' : 'provider',
    provider,
  };
}

function ensureStatusBadge() {
  const legacy = document.getElementById('sourceBadge');
  if (legacy) {
    legacy.hidden = true;
    legacy.setAttribute('aria-hidden', 'true');
    legacy.style.display = 'none';
  }

  let badge = document.getElementById('playbackStatus');
  if (badge || !playbackStatusEls.trackBlock) return badge;
  badge = document.createElement('span');
  badge.id = 'playbackStatus';
  badge.className = 'source-badge playback-status';
  badge.setAttribute('aria-live', 'polite');
  playbackStatusEls.trackBlock.append(badge);
  return badge;
}

function setButtonRoute(button, presentation, songTitle, hasLocalAudio) {
  if (!button || button.classList.contains('is-playing')) return;

  if (hasLocalAudio) {
    button.title = 'Play direct audio';
    button.removeAttribute('data-playback-provider');
    button.removeAttribute('data-playback-kind');
    return;
  }

  if (!presentation) {
    if (playbackStatusState.ready) button.title = 'Find a verified playback source';
    return;
  }

  const title = songTitle && !/loading|catalogue unavailable/i.test(songTitle)
    ? `${presentation.action}: ${songTitle}`
    : presentation.action;
  button.title = title;
  button.dataset.playbackProvider = presentation.provider;
  button.dataset.playbackKind = presentation.kind;
}

function syncPlaybackStatus() {
  const badge = ensureStatusBadge();
  const songId = currentSongId();
  const songTitle = String(playbackStatusEls.songTitle?.textContent || '').trim();
  const hasLocalAudio = Boolean(playbackStatusEls.audio?.getAttribute('src'));
  const source = songId ? playbackStatusState.sources[songId] : null;
  const presentation = sourcePresentation(source);

  if (badge) {
    if (hasLocalAudio) {
      badge.textContent = 'Direct audio';
      badge.title = 'This track has a direct audio source.';
      badge.dataset.kind = 'direct';
      badge.classList.add('show');
    } else if (presentation) {
      badge.textContent = presentation.label;
      badge.title = presentation.description;
      badge.dataset.kind = presentation.kind;
      badge.classList.add('show');
    } else {
      badge.textContent = '';
      badge.removeAttribute('title');
      badge.removeAttribute('data-kind');
      badge.classList.remove('show');
    }
  }

  setButtonRoute(playbackStatusEls.playButton, presentation, songTitle, hasLocalAudio);
  setButtonRoute(playbackStatusEls.miniPlay, presentation, songTitle, hasLocalAudio);
}

async function loadPlaybackRoutes() {
  try {
    const index = await fetchJson('data/catalogue/index.json');
    const configured = index?.playbackSources || [
      'data/playback-sources-generated.json',
      'data/playback-sources.json',
      'data/playback-sources-current.json',
    ];
    const paths = Array.isArray(configured) ? configured : [configured];
    const manifests = await Promise.all(paths.filter(Boolean).map((path) => fetchJson(path)));
    playbackStatusState.sources = Object.assign(
      {},
      ...manifests.map((manifest) => manifest?.songSources || {}),
    );
  } finally {
    playbackStatusState.ready = true;
    syncPlaybackStatus();
  }
}

function initPlaybackStatus() {
  ensureStatusBadge();
  playbackStatusEls.songTitle && new MutationObserver(syncPlaybackStatus).observe(
    playbackStatusEls.songTitle,
    { childList: true, characterData: true, subtree: true },
  );
  playbackStatusEls.audio && new MutationObserver(syncPlaybackStatus).observe(
    playbackStatusEls.audio,
    { attributes: true, attributeFilter: ['src'] },
  );
  playbackStatusEls.audio?.addEventListener('play', syncPlaybackStatus);
  playbackStatusEls.audio?.addEventListener('pause', syncPlaybackStatus);
  window.addEventListener('popstate', () => requestAnimationFrame(syncPlaybackStatus));

  window.GARBA_PLAYBACK_STATUS = {
    get ready() { return playbackStatusState.ready; },
    sourceFor(songId) { return playbackStatusState.sources[songId] || null; },
    refresh: syncPlaybackStatus,
  };

  syncPlaybackStatus();
  loadPlaybackRoutes();
}

initPlaybackStatus();
