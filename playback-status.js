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

const statusState = { sources: {}, ready: false };
const els = {
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
  return PROVIDER_NAMES[key] || 'Verified provider';
}

function presentationFor(source, hasLocalAudio) {
  if (hasLocalAudio) {
    return {
      label: 'Direct audio',
      title: 'This track has a direct audio source.',
      kind: 'direct',
      action: 'Play direct audio',
      provider: '',
    };
  }
  if (!source) return null;

  const provider = providerName(source.provider);
  const sourceType = String(source.sourceType || '').toLowerCase();
  const releaseFallback = sourceType === 'verified-release-source';
  const official = sourceType.includes('official');
  const verified = sourceType.includes('verified');

  if (releaseFallback) {
    return {
      label: `Verified release · ${provider}`,
      title: `This is a verified release-level source on ${provider}, not a song-specific timestamp. Select this track in the provider player.`,
      kind: 'release',
      action: `Open verified release on ${provider}`,
      provider,
    };
  }

  return {
    label: `${official ? 'Official' : verified ? 'Verified' : 'Mapped'} · ${provider}`,
    title: `${official ? 'Official' : verified ? 'Verified' : 'Mapped'} song-level playback source on ${provider}.`,
    kind: official ? 'official' : verified ? 'verified' : 'mapped',
    action: `Play via ${provider}`,
    provider,
  };
}

function ensureBadge() {
  let badge = document.getElementById('playbackStatus');
  if (badge || !els.trackBlock) return badge;
  badge = document.createElement('span');
  badge.id = 'playbackStatus';
  badge.className = 'playback-status-pill';
  badge.setAttribute('aria-live', 'polite');
  els.trackBlock.append(badge);
  return badge;
}

function setButtonRoute(button, presentation, songTitle) {
  if (!button || button.classList.contains('is-playing')) return;
  if (!presentation) {
    if (statusState.ready) button.title = 'No verified playback route attached';
    button.removeAttribute('data-playback-provider');
    button.removeAttribute('data-playback-kind');
    return;
  }

  button.title = songTitle && !/loading|catalogue unavailable/i.test(songTitle)
    ? `${presentation.action}: ${songTitle}`
    : presentation.action;
  button.dataset.playbackKind = presentation.kind;
  if (presentation.provider) button.dataset.playbackProvider = presentation.provider;
  else button.removeAttribute('data-playback-provider');
}

function syncPlaybackStatus() {
  const badge = ensureBadge();
  const songId = currentSongId();
  const songTitle = String(els.songTitle?.textContent || '').trim();
  const hasLocalAudio = Boolean(els.audio?.getAttribute('src'));
  const source = songId ? statusState.sources[songId] : null;
  const presentation = presentationFor(source, hasLocalAudio);

  if (badge) {
    if (presentation) {
      badge.textContent = presentation.label;
      badge.title = presentation.title;
      badge.dataset.kind = presentation.kind;
      badge.classList.add('show');
    } else {
      badge.textContent = '';
      badge.removeAttribute('title');
      badge.removeAttribute('data-kind');
      badge.classList.remove('show');
    }
  }

  setButtonRoute(els.playButton, presentation, songTitle);
  setButtonRoute(els.miniPlay, presentation, songTitle);
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
    const manifests = await Promise.all(paths.filter(Boolean).map(fetchJson));
    statusState.sources = Object.assign({}, ...manifests.map((manifest) => manifest?.songSources || {}));
  } finally {
    statusState.ready = true;
    syncPlaybackStatus();
  }
}

function init() {
  ensureBadge();
  if (els.songTitle) {
    new MutationObserver(syncPlaybackStatus).observe(els.songTitle, { childList: true, characterData: true, subtree: true });
  }
  if (els.audio) {
    new MutationObserver(syncPlaybackStatus).observe(els.audio, { attributes: true, attributeFilter: ['src'] });
    els.audio.addEventListener('play', syncPlaybackStatus);
    els.audio.addEventListener('pause', syncPlaybackStatus);
  }
  window.addEventListener('popstate', () => requestAnimationFrame(syncPlaybackStatus));

  window.GARBA_PLAYBACK_STATUS = {
    get ready() { return statusState.ready; },
    sourceFor(songId) { return statusState.sources[songId] || null; },
    refresh: syncPlaybackStatus,
  };

  syncPlaybackStatus();
  loadPlaybackRoutes();
}

init();
