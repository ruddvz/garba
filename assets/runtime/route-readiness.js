const YOUTUBE_HOST_RE = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i;

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

function authorisedDirectRoute(song) {
  const hasDirectIntent = Boolean(
    String(song?.audioUrl || '').trim()
    || String(song?.playbackProvider || '').toLowerCase() === 'direct'
    || String(song?.playbackRouteKind || '').startsWith('direct')
  );
  if (!hasDirectIntent) return null;

  const rights = song?.directAudioRights;
  const audioUrl = String(song?.audioUrl || '').trim();
  const proofUrl = String(rights?.proofUrl || '').trim();
  let validUrls = false;
  try {
    validUrls = new URL(audioUrl).protocol === 'https:' && new URL(proofUrl).protocol === 'https:';
  } catch {
    validUrls = false;
  }

  const executable = Boolean(
    song?.playbackRouteKind === 'direct'
    && String(song?.playbackProvider || '').toLowerCase() === 'direct'
    && song?.playbackSourceType === 'licensed-direct'
    && song?.playbackReady === true
    && validUrls
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
