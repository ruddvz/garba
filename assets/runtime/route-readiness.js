const YOUTUBE_HOST_RE = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i;
const DIRECT_AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-flac',
]);
const BLOCKED_DIRECT_HOST_SUFFIXES = [
  'youtube.com',
  'youtu.be',
  'googlevideo.com',
  'spotify.com',
  'scdn.co',
  'music.apple.com',
  'mzstatic.com',
  'soundcloud.com',
  'sndcdn.com',
  'bandcamp.com',
  'bcbits.com',
  'qobuz.com',
  'gaana.com',
  'jiosaavn.com',
  'music.amazon.com',
  'music.amazon.ca',
  'music.amazon.in',
  'music.amazon.co.uk',
];

function youtubeVideoId(song) {
  const explicit = String(song?.youtubeId || '').trim();
  if (explicit) return explicit;
  try {
    const url = new URL(String(song?.playbackSourceUrl || ''));
    if (!YOUTUBE_HOST_RE.test(url.hostname)) return '';
    if (url.hostname.toLowerCase().endsWith('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    const queryId = url.searchParams.get('v');
    if (queryId) return queryId.trim();
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts');
    return marker >= 0 ? String(parts[marker + 1] || '').trim() : '';
  } catch {
    return '';
  }
}

function httpsUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function hostMatches(hostname, suffix) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  return host === suffix || host.endsWith(`.${suffix}`);
}

function blockedDirectMediaUrl(value) {
  const parsed = httpsUrl(value);
  if (!parsed) return false;
  return BLOCKED_DIRECT_HOST_SUFFIXES.some((suffix) => hostMatches(parsed.hostname, suffix));
}

function authorisedDirectRoute(song) {
  const hasDirectIntent = Boolean(
    String(song?.audioUrl || '').trim()
    || String(song?.playbackProvider || '').toLowerCase() === 'direct'
    || String(song?.playbackRouteKind || '').startsWith('direct')
  );
  if (!hasDirectIntent) return null;

  const rights = song?.directAudioRights;
  const audioUrl = httpsUrl(song?.audioUrl);
  const proofUrl = httpsUrl(rights?.proofUrl);
  const mimeType = String(song?.audioMimeType || '').trim().toLowerCase();
  const executable = Boolean(
    song?.playbackRouteKind === 'direct'
    && String(song?.playbackProvider || '').toLowerCase() === 'direct'
    && song?.playbackSourceType === 'licensed-direct'
    && song?.playbackReady === true
    && audioUrl
    && !blockedDirectMediaUrl(audioUrl.href)
    && DIRECT_AUDIO_MIME_TYPES.has(mimeType)
    && proofUrl
    && audioUrl.href.split('#')[0] !== proofUrl.href.split('#')[0]
    && rights?.redistributionAuthorized === true
    && String(rights?.rightsHolder || '').trim()
    && String(rights?.licenseName || '').trim()
  );

  return executable
    ? { status: 'direct-authorised', executable: true, videoId: '', provider: 'direct' }
    : { status: 'blocked-policy', executable: false, videoId: '', provider: 'direct' };
}

function routeReadiness(song, { temporarilyFailed = false } = {}) {
  if (!song) return { status: 'missing', executable: false, videoId: '' };
  if (temporarilyFailed) {
    return {
      status: 'temporary-failure',
      executable: false,
      videoId: youtubeVideoId(song),
      provider: String(song?.playbackProvider || '').toLowerCase() || null,
    };
  }

  const direct = authorisedDirectRoute(song);
  if (direct) return direct;

  const sourceType = String(song.playbackSourceType || '');
  if (song.playbackSearchOnly || sourceType === 'verified-release-track-reference') {
    return { status: 'reference-only', executable: false, videoId: youtubeVideoId(song) };
  }
  if (sourceType === 'verified-unchaptered-youtube-release') {
    return { status: 'reference-only', executable: false, videoId: youtubeVideoId(song) };
  }

  const provider = String(song.playbackProvider || '').toLowerCase();
  const sourceUrl = String(song.playbackSourceUrl || '');
  const videoId = youtubeVideoId(song);
  const youtubeCandidate = Boolean(
    String(song.youtubeId || '').trim()
    || provider === 'youtube'
    || /youtu(?:\.be|be\.com)/i.test(sourceUrl)
  );
  if (youtubeCandidate && videoId) return { status: 'exact-mapped', executable: true, videoId, provider: 'youtube' };
  return { status: 'missing', executable: false, videoId: '' };
}

const canExecuteSong = (song, options) => routeReadiness(song, options).executable;

if (typeof window !== 'undefined') {
  window.GARBA_ROUTE_READINESS = Object.freeze({ routeReadiness, canExecuteSong, youtubeVideoId });
}
