/**
 * PlayGarba Synchronized 24/7 Live Broadcast Engine
 * Deterministic, epoch-synced global radio schedule.
 * All listeners worldwide hear the exact same song at the exact same second.
 */

const DEFAULT_SONG_DURATION = 180;

/**
 * True when a song has a verified, playable YouTube route that the live schedule can use.
 * Shared with Garba Circle so both modes agree on what is playable.
 */
export function isLivePlayable(s) {
  if (!s || !s.id) return false;
  if (s.audioUrl) return false;
  if (s.playbackSearchOnly) return false;
  if (s.playbackSourceType === 'verified-release-track-reference' || s.playbackSourceType === 'verified-unchaptered-youtube-release') return false;

  // Must have a verified, playable YouTube route with valid video ID
  const explicit = String(s.youtubeId || '').trim();
  if (explicit) return true;

  const provider = String(s.playbackProvider || '').toLowerCase();
  const sourceUrl = String(s.playbackSourceUrl || '');
  const isYouTube = provider === 'youtube' || /youtu(?:\.be|be\.com)/i.test(sourceUrl);
  if (!isYouTube) return false;

  try {
    const url = new URL(sourceUrl);
    if (url.hostname.toLowerCase().endsWith('youtu.be')) return Boolean(url.pathname.split('/').filter(Boolean)[0]);
    if (url.searchParams.get('v')) return Boolean(url.searchParams.get('v').trim());
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex((p) => p === 'embed' || p === 'shorts');
    return marker >= 0 && Boolean(parts[marker + 1]?.trim());
  } catch {
    return false;
  }
}

/**
 * Filter and deterministically sequence playable songs into a balanced 24/7 radio rotation
 */
export function buildLiveSchedule(songs = []) {
  const playable = (songs || []).filter(isLivePlayable);

  if (!playable.length) return [];

  // Group by genre to interleave them harmoniously (Traditional -> Dandiya -> Folk -> Devotional -> Fusion -> Sanedo)
  const genreBuckets = {
    traditional: [],
    dandiya: [],
    folk: [],
    devotional: [],
    fusion: [],
    sanedo: [],
  };

  for (const song of playable) {
    const genre = song.genre && genreBuckets[song.genre] ? song.genre : 'traditional';
    genreBuckets[genre].push(song);
  }

  // Interleave genres so live radio has varied, dynamic tempo and mood
  const schedule = [];
  const genreKeys = ['traditional', 'dandiya', 'folk', 'devotional', 'fusion', 'sanedo'];
  let maxLen = 0;
  for (const key of genreKeys) {
    if (genreBuckets[key].length > maxLen) maxLen = genreBuckets[key].length;
  }

  for (let i = 0; i < maxLen; i++) {
    for (const key of genreKeys) {
      if (i < genreBuckets[key].length) {
        schedule.push(genreBuckets[key][i]);
      }
    }
  }

  return schedule.length ? schedule : playable;
}

/**
 * Compute the active broadcast track and seek position at a given millisecond timestamp
 * @param {Array} songs Catalogue songs
 * @param {number} timestampMs Date.now()
 */
export function getLiveBroadcastState(songs = [], timestampMs = Date.now()) {
  const schedule = buildLiveSchedule(songs);
  if (!schedule.length) return null;

  // Build cumulative duration timeline
  let totalDuration = 0;
  const segments = [];

  for (let i = 0; i < schedule.length; i++) {
    const song = schedule[i];
    const duration = (Number.isFinite(song.durationSeconds) && song.durationSeconds > 10)
      ? Math.round(song.durationSeconds)
      : DEFAULT_SONG_DURATION;

    segments.push({
      song,
      songId: song.id,
      index: i,
      startSecond: totalDuration,
      duration,
      endSecond: totalDuration + duration,
    });
    totalDuration += duration;
  }

  if (totalDuration <= 0) return null;

  // Universal current broadcast second (modulo timeline loop)
  const epochSecond = Math.floor(Math.max(0, timestampMs) / 1000);
  const currentTimelineSecond = epochSecond % totalDuration;

  // Binary or linear search to find current segment
  let currentSegment = segments[0];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (currentTimelineSecond >= seg.startSecond && currentTimelineSecond < seg.endSecond) {
      currentSegment = seg;
      break;
    }
  }

  const seekSeconds = Math.max(0, currentTimelineSecond - currentSegment.startSecond);
  const remainingSeconds = Math.max(0, currentSegment.duration - seekSeconds);
  const nextIndex = (currentSegment.index + 1) % segments.length;
  const nextSong = segments[nextIndex].song;

  return {
    song: currentSegment.song,
    songId: currentSegment.songId,
    seekSeconds,
    duration: currentSegment.duration,
    remainingSeconds,
    totalScheduleDuration: totalDuration,
    trackIndex: currentSegment.index,
    totalTracks: segments.length,
    nextSongId: nextSong.id,
    nextSong,
  };
}

/**
 * Get next scheduled live track for continuous station progression
 */
export function getNextLiveTrack(songs = [], currentSongId) {
  const schedule = buildLiveSchedule(songs);
  if (!schedule.length) return null;
  const currentIndex = schedule.findIndex((s) => s.id === currentSongId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % schedule.length : 0;
  return schedule[nextIndex];
}

if (typeof window !== 'undefined') {
  window.GARBA_LIVE_STATION = {
    isLivePlayable,
    buildLiveSchedule,
    getLiveBroadcastState,
    getNextLiveTrack,
  };
}
