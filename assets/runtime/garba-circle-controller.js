/**
 * PlayGarba Private Garba Circle controller
 * Connects the pure circle model to the app, the YouTube runtime and the Circle dialog.
 * A circle either keeps the music going (the catalogue in one shared, shuffled order) or plays the songs the host
 * picked: the current song, their Up next, and any YouTube links they paste, carried in the link itself.
 * The YouTube player stays the playback engine; this module only decides what should be
 * playing, where, and nudges the player back when it drifts.
 */

import {
  isCircleEligible,
  buildCircleSchedule,
  scheduleFingerprint,
  encodeCircleCode,
  decodeAnyCircleCode,
  encodePickedCode,
  buildPickedSchedule,
  pickedItemFor,
  isCatalogueCircleSong,
  MAX_PICKED_ITEMS,
  cleanCircleName,
  parseCircleFace,
  MAX_CIRCLE_NAME_LENGTH,
  getCirclePosition,
  measureClockOffset,
  createDateHeaderProbe,
} from './garba-circle.js';
import { qrSvg } from './qr-code.js';
import { CIRCLE_FACE_COUNT, circleFaceSvg, circleFaceLabel } from './circle-faces.js';
import { createSyncCorrector } from './sync-correction.js';
import { rankSearchRecords } from './search-core.js';

const DRIFT_INTERVAL_MS = 2000;
const DRIFT_READS = 10;
const SETTLE_AFTER_PLAY_MS = 700;
const BOUNDARY_WINDOW_SECONDS = 1.5;
// The host's last name and face, offered again when they start their next circle.
const HOST_KEY = 'garba:circle-host';
const NAME_SETTLE_MS = 350;
// YouTube errors that mean the video cannot play here at all (removed, embedding disabled).
const UNPLAYABLE_ERRORS = new Set([100, 101, 150]);
export const CIRCLE_VOTE_RESULT_LIMIT = 6;

const COPY = {
  lede: 'Everyone who opens your link hears the same song at the same moment, on their own phone. Only people with the link can join. Use earbuds for a silent garba.',
  joinLede: 'You have been invited to a Private Garba Circle. Everyone in it hears the same song at the same moment. Use earbuds for a silent garba.',
  syncing: 'Matching this phone’s clock…',
  ineligible: 'Keeping the music going needs a YouTube recording with a known length. Choose another song, or play your own songs instead.',
  nothingPicked: 'None of these songs can play in a circle yet. Choose a song, or paste a YouTube link, then try again.',
  lengths: 'Getting each song’s length from YouTube…',
  moveTogether: 'Everyone in the circle hears the same song. Leave the circle to choose another.',
  hostOnly: 'Only the host can add songs to this circle.',
  full: `A circle holds up to ${MAX_PICKED_ITEMS} songs.`,
  unplayable: 'This recording can’t play here, so the circle continues with the next song.',
  left: 'Left the circle.',
  invalid: 'This circle link is incomplete. Ask for the link again.',
  mismatch: 'This circle was started on a different version of PlayGarba. Reload to update, then open the link again.',
  empty: 'The circle has no songs it can play on this version of PlayGarba.',
  copied: 'Link copied.',
  copyFailed: 'Could not copy the link. Select it and copy it instead.',
  shareText: 'Join my Private Garba Circle on PlayGarba',
  title: 'Private Garba Circle',
};

// A picked song is the same song whether it came from the catalogue or a pasted link to the same video.
const itemKey = (item) => (item.kind === 'song' ? `s:${item.id}` : `y:${item.videoId}`);

function circleVoteSearchRecord(song) {
  return {
    id: song.id,
    title: [song.title, song.displayTitle].filter(Boolean),
    titleAliases: song.aliases,
    artist: song.artist,
    artistAliases: song.artistAliases,
    taxonomyTerms: [
      song.genre,
      song.category,
      ...(song.styles || []),
      ...(song.taxonomyStyles || []),
    ],
    song,
  };
}

/** Playable catalogue matches for a local next-track vote, using the player's search ranking. */
export function circleVoteCandidates(songs, query, { currentSongId = '', limit = CIRCLE_VOTE_RESULT_LIMIT } = {}) {
  if (!Array.isArray(songs) || !String(query || '').trim()) return [];
  const eligible = songs.filter((song) => isCatalogueCircleSong(song) && song.id !== currentSongId);
  return rankSearchRecords(eligible.map(circleVoteSearchRecord), query)
    .slice(0, Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : CIRCLE_VOTE_RESULT_LIMIT))
    .map(({ record }) => record.song);
}

function loadHost() {
  try {
    const saved = JSON.parse(localStorage.getItem(HOST_KEY) || 'null');
    return { name: cleanCircleName(saved?.name), face: parseCircleFace(saved?.face, CIRCLE_FACE_COUNT) };
  } catch {
    return { name: '', face: null };
  }
}

function saveHost(name, face) {
  try { localStorage.setItem(HOST_KEY, JSON.stringify({ name, face })); } catch { /* storage unavailable */ }
}

const localNow = typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin)
  ? () => performance.timeOrigin + performance.now()
  : () => Date.now();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function randomSeed() {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}

function formatClock(clock) {
  if (!clock?.reliable) return 'Could not check the clock. Sync depends on this phone’s time setting.';
  return `Clock matched to ±${Math.max(1, Math.round(clock.uncertaintyMs))} ms.`;
}

/**
 * @param {{
 *   songs: () => Array,
 *   currentSong: () => object | null,
 *   hostElapsedSeconds: () => number,
 *   playCircleSong: (song: object, offsetSeconds: number) => Promise<void> | void,
 *   pickedSongs: () => Array,
 *   resolveDuration: (song: object) => Promise<number>,
 *   registerCircleSongs: (songs: Array) => void,
 *   showToast: (message: string) => void,
 *   onChange: () => void,
 *   trigger: () => HTMLElement | null,
 * }} app
 */
export function createCircleController(app) {
  const player = () => window.GARBA_YOUTUBE_PLAYER || null;
  const probe = createDateHeaderProbe({ url: './robots.txt' });
  const corrector = createSyncCorrector({ player, now: localNow });

  const circle = {
    status: 'idle', // idle | setup | starting | ready | active | invalid | mismatch
    role: null,
    // shuffle: the catalogue in one shared order. picked: the host's own songs, looped.
    kind: 'shuffle',
    items: [],
    // The host added songs since the link was last copied or shared
    listChanged: false,
    message: '',
    code: null,
    startMs: 0,
    schedule: [],
    unplayable: new Set(),
    clock: null,
    clockPromise: null,
    wasPlaying: false,
    pendingLoadSongId: null,
    boundaryTimer: null,
    settleTimer: null,
    driftTimer: null,
    measuring: false,
    lastDriftSeconds: null,
    // What the host called the circle and the face they gave it. Both travel in the link.
    name: '',
    face: null,
    // This first voting slice is deliberately local. It does not alter the shared schedule.
    voteQuery: '',
    voteSongId: null,
  };

  let dialog = null;
  let immersiveCircleEntry = null;
  let dialogTrigger = null;
  let lastEyebrow = '';
  let lastVoteRender = '';
  const parts = {};

  const syncedNow = () => localNow() + (circle.clock?.offsetMs || 0);
  const position = (at = syncedNow()) => getCirclePosition(circle.schedule, circle.startMs, at, { unplayable: circle.unplayable });
  const linkUrl = () => {
    const url = new URL(location.pathname || '/', location.origin);
    url.searchParams.set('circle', circle.code);
    if (circle.name) url.searchParams.set('n', circle.name);
    if (circle.face != null) url.searchParams.set('f', String(circle.face));
    return url.toString();
  };
  const title = () => circle.name || COPY.title;

  function eyebrow() {
    if (circle.status !== 'active') return '';
    if (circle.pendingLoadSongId || circle.lastDriftSeconds == null) return 'Private Garba Circle · syncing';
    return player()?.playing ? 'Private Garba Circle · in sync' : 'Private Garba Circle · paused';
  }

  // Tell the app to re-render (eyebrow, button state, URL) only when something it shows changed.
  function notify() {
    syncImmersiveCircleEntry();
    const next = `${circle.status}|${circle.code}|${eyebrow()}|${circle.name}|${circle.face}|${circle.kind}`;
    if (next === lastEyebrow) return;
    lastEyebrow = next;
    app.onChange();
  }

  function syncClock() {
    circle.clockPromise = measureClockOffset({ probe, now: localNow, sleep })
      .then((clock) => {
        circle.clock = clock;
        return clock;
      })
      .finally(() => { circle.clockPromise = null; });
    return circle.clockPromise;
  }

  async function clockReady() {
    if (circle.clockPromise) return circle.clockPromise;
    if (circle.clock) return circle.clock;
    return syncClock();
  }

  /* ----------------------------- playback alignment ----------------------------- */

  function clearTimers() {
    clearTimeout(circle.boundaryTimer);
    clearTimeout(circle.settleTimer);
    clearInterval(circle.driftTimer);
    circle.boundaryTimer = null;
    circle.settleTimer = null;
    circle.driftTimer = null;
  }

  const inSchedule = (songId) => circle.schedule.some((song) => song.id === songId);

  function goToCircle() {
    const now = position();
    if (!now || circle.status !== 'active') return;
    clearTimeout(circle.boundaryTimer);
    circle.boundaryTimer = null;
    if (!now.song) {
      // Nothing in the circle can play right now: wait for the next slot.
      waitForBoundary(now.remainingSeconds);
      return;
    }
    // Aim ahead by how late this phone usually lands after opening a recording.
    const offset = Math.min(now.offsetSeconds + corrector.loadLead, Math.max(0, now.remainingSeconds + now.offsetSeconds - 0.5));
    circle.pendingLoadSongId = now.song.id;
    corrector.loaded();
    Promise.resolve(app.playCircleSong(now.song, offset)).catch(() => {});
    renderDialog();
  }

  function waitForBoundary(remainingSeconds) {
    clearTimeout(circle.boundaryTimer);
    circle.boundaryTimer = setTimeout(() => {
      circle.boundaryTimer = null;
      goToCircle();
    }, Math.max(0, remainingSeconds * 1000) + 60);
  }

  async function measureDrift(songId) {
    // The IFrame API reports time through postMessage and may update it in steps of a few hundred
    // ms, so a single read can be stale. Over a ~450 ms window the largest reading is the freshest.
    let drift = -Infinity;
    let first = null;
    let last = null;
    for (let i = 0; i < DRIFT_READS; i += 1) {
      const actual = player()?.elapsedSeconds;
      const now = position();
      if (!Number.isFinite(actual) || now?.song?.id !== songId || player()?.activeSongId !== songId) return null;
      drift = Math.max(drift, actual - now.offsetSeconds);
      last = { actual, expected: now.offsetSeconds };
      first ??= last;
      if (i < DRIFT_READS - 1) await sleep(50);
    }
    // Skip readings taken while the player is stalled (buffering): its clock is not advancing.
    const advanced = last.actual - first.actual;
    const elapsed = last.expected - first.expected;
    return elapsed > 0 && advanced >= elapsed * 0.5 ? drift : null;
  }


  async function alignOnce() {
    if (circle.status !== 'active' || circle.measuring) return;
    const yt = player();
    if (!yt?.playing) return;
    const now = position();
    if (!now?.song) return;
    if (now.song.id !== yt.activeSongId) {
      // Another mode (for example Nonstop) took over the player: the listener left the circle.
      if (!inSchedule(yt.activeSongId)) leave();
      else if (!circle.boundaryTimer) goToCircle();
      return;
    }
    if (corrector.busy()) return;

    circle.measuring = true;
    try {
      const drift = await measureDrift(now.song.id);
      if (drift == null || circle.status !== 'active') return;
      circle.lastDriftSeconds = drift;
      circle.pendingLoadSongId = null;
      const fresh = position();
      if (fresh?.song?.id !== now.song.id) return;
      // Learns this phone's load and seek delays, then seeks (aiming ahead) or briefly changes
      // the playback rate to close small gaps without an audible skip.
      corrector.correct({
        drift,
        remainingSeconds: fresh.remainingSeconds,
        expectedSeconds: () => position()?.offsetSeconds ?? fresh.offsetSeconds,
        seekTo: (seconds) => player()?.seekTo?.(seconds),
      });
    } finally {
      circle.measuring = false;
      renderStatus();
      notify();
    }
  }

  function startDriftLoop() {
    clearInterval(circle.driftTimer);
    circle.driftTimer = setInterval(alignOnce, DRIFT_INTERVAL_MS);
  }

  function onPlaybackStateChange(event) {
    if (circle.status !== 'active' || event.detail?.loading) return;
    const playing = Boolean(event.detail?.playing) && player()?.playing === true;
    if (playing && !circle.wasPlaying) {
      // First frames after a load, seek or resume: measure soon, then keep the regular loop.
      clearTimeout(circle.settleTimer);
      corrector.resumed();
      circle.settleTimer = setTimeout(alignOnce, SETTLE_AFTER_PLAY_MS);
    }
    circle.wasPlaying = playing;
    notify();
    renderStatus();
  }

  function onPlayerError(event) {
    const { code, songId } = event.detail || {};
    if (circle.status !== 'active' || !UNPLAYABLE_ERRORS.has(code) || !inSchedule(songId)) return;
    circle.unplayable.add(songId);
    app.showToast(COPY.unplayable);
    goToCircle();
  }

  async function resync() {
    if (circle.status !== 'active') return;
    await syncClock().catch(() => null);
    if (circle.status !== 'active') return;
    corrector.resumed();
    alignOnce();
    renderStatus();
  }

  /* ----------------------------- lifecycle ----------------------------- */

  function activate(role) {
    circle.status = 'active';
    circle.role = role;
    circle.wasPlaying = false;
    startDriftLoop();
    notify();
  }

  // The host chooses how the circle plays before anything starts
  function openSetup() {
    Object.assign(circle, { status: 'setup', role: 'host', message: '', kind: 'shuffle', items: [], listChanged: false, voteQuery: '', voteSongId: null });
    lastVoteRender = '';
    openDialog();
  }

  function hostIdentity() {
    const host = loadHost();
    circle.name = host.name;
    circle.face = host.face ?? randomSeed() % CIRCLE_FACE_COUNT;
  }

  /**
   * The songs a picked circle can carry, in order. Catalogue songs travel by id; pasted links and songs added on
   * this device travel by video and length, and a length YouTube hasn't told us yet is asked for first.
   */
  async function pickedItemsFrom(songs) {
    const items = [];
    const seen = new Set();
    let skipped = 0;
    for (const song of songs || []) {
      if (!song) continue;
      let item = pickedItemFor(song);
      if (!item && song.youtubeId && !(Number(song.durationSeconds) > 0)) {
        const seconds = await Promise.resolve(app.resolveDuration(song)).catch(() => 0);
        if (seconds > 0) {
          song.durationSeconds = seconds;
          item = pickedItemFor(song);
        }
      }
      if (!item) { skipped += 1; continue; }
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
    return { items, skipped };
  }

  // Catalogue songs travel in the link by a short hash, checked for uniqueness against this catalogue
  const catalogueIds = () => app.songs().filter(isCatalogueCircleSong).map((song) => song.id);

  function useSchedule(schedule) {
    circle.schedule = schedule;
    const links = schedule.filter((song) => song.circleLink);
    if (links.length) app.registerCircleSongs(links);
  }

  async function start(kind = 'shuffle') {
    const song = app.currentSong();
    if (kind !== 'picked' && !isCircleEligible(song)) {
      circle.message = COPY.ineligible;
      renderDialog();
      return false;
    }
    circle.status = 'starting';
    circle.role = 'host';
    circle.kind = kind === 'picked' ? 'picked' : 'shuffle';
    circle.message = '';
    hostIdentity();
    openDialog();

    const clockWait = clockReady().catch(() => null);
    let picked = null;
    if (circle.kind === 'picked') {
      renderDialog();
      picked = await pickedItemsFrom(app.pickedSongs());
      if (circle.status !== 'starting') return false;
    }
    const clock = await clockWait;
    if (circle.status !== 'starting') return false;
    circle.clock = clock || { offsetMs: 0, uncertaintyMs: Infinity, reliable: false };

    const yt = player();
    const elapsed = Math.max(0, Number(app.hostElapsedSeconds()) || 0);
    let schedule;
    if (circle.kind === 'picked') {
      const items = picked.items.slice(0, MAX_PICKED_ITEMS);
      const built = items.length ? buildPickedSchedule(items, app.songs()) : { schedule: [] };
      if (!built.schedule?.length) {
        Object.assign(circle, { status: 'setup', message: COPY.nothingPicked });
        renderDialog({ focus: true });
        return false;
      }
      schedule = built.schedule;
      // The current song carries on where it is when it opens the list; otherwise the list starts from its top
      const first = schedule[0];
      const continuing = song && (first.id === song.id || (first.youtubeId && first.youtubeId === song.youtubeId));
      circle.startMs = Math.round(syncedNow() - (continuing ? elapsed : 0) * 1000);
      circle.items = items;
      circle.code = encodePickedCode({ startMs: circle.startMs, items, fingerprint: scheduleFingerprint(schedule), catalogueIds: catalogueIds() });
      if (!circle.code) {
        Object.assign(circle, { status: 'setup', message: COPY.full, items: [] });
        renderDialog({ focus: true });
        return false;
      }
      useSchedule(schedule);
      const left = picked.skipped + Math.max(0, picked.items.length - items.length);
      if (left) app.showToast(`${left} ${left === 1 ? 'song was' : 'songs were'} left out: YouTube didn’t give ${left === 1 ? 'its' : 'their'} length.`);
    } else {
      const seed = randomSeed();
      schedule = buildCircleSchedule(app.songs(), { seed, firstSongId: song.id });
      circle.schedule = schedule;
      circle.startMs = Math.round(syncedNow() - elapsed * 1000);
      circle.code = encodeCircleCode({ seed, startMs: circle.startMs, firstSongId: song.id, fingerprint: scheduleFingerprint(schedule) });
    }
    const alreadyPlaying = yt?.playing && yt.activeSongId === schedule[0].id && schedule[0].id === song?.id;
    activate('host');
    if (alreadyPlaying) circle.wasPlaying = true;
    else goToCircle();
    renderDialog({ focus: true });
    return true;
  }

  /**
   * The host adds songs to a circle that plays their own songs. They go at the end, so everything already playing
   * keeps its place; the link changes, and the dialog asks the host to share the new one.
   */
  async function addSongs(songs) {
    if (!(circle.status === 'active' && circle.role === 'host' && circle.kind === 'picked')) return { added: 0, reason: 'host-only' };
    const { items, skipped } = await pickedItemsFrom(songs);
    if (circle.status !== 'active') return { added: 0 };
    const have = new Set(circle.items.map(itemKey));
    const fresh = items.filter((item) => !have.has(itemKey(item)));
    const take = fresh.slice(0, Math.max(0, MAX_PICKED_ITEMS - circle.items.length));
    if (!take.length) return { added: 0, reason: fresh.length ? 'full' : skipped ? 'no-length' : 'already-in' };
    const nextItems = [...circle.items, ...take];
    const built = buildPickedSchedule(nextItems, app.songs());
    if (!built.schedule) return { added: 0 };
    // Songs go on the end, so within the list's first time through every boundary stays where it was. Once the
    // list has looped, the start is moved so the song and second playing now stay exactly as they are.
    let startMs = circle.startMs;
    const slot = getCirclePosition(circle.schedule, circle.startMs, syncedNow());
    if (slot?.started && slot.cycle > 0) {
      const before = circle.schedule.slice(0, slot.index).reduce((sum, song) => sum + Number(song.durationSeconds), 0);
      startMs = Math.round(syncedNow() - (before + slot.offsetSeconds) * 1000);
    }
    const code = encodePickedCode({ startMs, items: nextItems, fingerprint: scheduleFingerprint(built.schedule), catalogueIds: catalogueIds() });
    if (!code) return { added: 0, reason: 'full' };
    Object.assign(circle, { items: nextItems, startMs, code, listChanged: true });
    useSchedule(built.schedule);
    notify();
    renderDialog();
    return { added: take.length, reason: fresh.length > take.length ? 'full' : '' };
  }

  /**
   * Read a `?circle=` code on load. Returns the circle's current song so the player can show it
   * before the listener taps Join, or null when the link cannot be joined.
   */
  function prepareJoin(code, { name = '', face = null } = {}) {
    const decoded = decodeAnyCircleCode(code);
    circle.name = cleanCircleName(name);
    circle.face = parseCircleFace(face, CIRCLE_FACE_COUNT);
    circle.role = 'guest';
    circle.code = code;
    circle.kind = decoded?.kind === 'picked' ? 'picked' : 'shuffle';
    circle.items = decoded?.kind === 'picked' ? decoded.items : [];
    let schedule = [];
    let missing = false;
    if (decoded?.kind === 'picked') {
      const built = buildPickedSchedule(decoded.items, app.songs());
      missing = Boolean(built.missing);
      schedule = built.schedule || [];
    } else if (decoded) {
      schedule = buildCircleSchedule(app.songs(), { seed: decoded.seed, firstSongId: decoded.firstSongId });
    }
    if (!decoded) {
      circle.status = 'invalid';
      circle.message = COPY.invalid;
    } else if (missing) {
      circle.status = 'mismatch';
      circle.message = COPY.mismatch;
    } else if (!schedule.length) {
      circle.status = 'invalid';
      circle.message = COPY.empty;
    } else if (scheduleFingerprint(schedule) !== decoded.fingerprint || (decoded.kind === 'shuffle' && schedule[0].id !== decoded.firstSongId)) {
      circle.status = 'mismatch';
      circle.message = COPY.mismatch;
    } else {
      circle.status = 'ready';
      useSchedule(schedule);
      circle.startMs = decoded.startMs;
      syncClock().catch(() => null).finally(renderDialog);
    }
    openDialog();
    if (circle.status !== 'ready') return null;
    const now = getCirclePosition(schedule, decoded.startMs, Date.now());
    return now ? { song: now.song, offsetSeconds: now.offsetSeconds } : null;
  }

  async function join() {
    if (circle.status !== 'ready') return;
    parts.join.disabled = true;
    parts.join.textContent = 'Joining…';
    const clock = await clockReady().catch(() => null);
    if (circle.status !== 'ready') return;
    circle.clock = clock || { offsetMs: 0, uncertaintyMs: Infinity, reliable: false };
    activate('guest');
    goToCircle();
    renderDialog();
  }

  function leave({ quiet = false } = {}) {
    if (circle.status === 'idle') return;
    const wasActive = circle.status === 'active';
    clearTimers();
    corrector.reset();
    Object.assign(circle, {
      status: 'idle', role: null, message: '', code: null, startMs: 0, schedule: [], unplayable: new Set(), pendingLoadSongId: null, lastDriftSeconds: null, name: '', face: null, kind: 'shuffle', items: [], listChanged: false, voteQuery: '', voteSongId: null,
    });
    lastVoteRender = '';
    closeDialog();
    notify();
    if (wasActive && !quiet) app.showToast(COPY.left);
  }

  /**
   * Next/Previous and the YouTube auto-advance while in a circle: go where the circle is,
   * wait for its boundary at the end of a song, or explain why the song cannot change.
   */
  function handleChangeSong() {
    const now = position();
    const yt = player();
    if (!now?.song) return;
    if (now.song.id !== yt?.activeSongId) goToCircle();
    else if (now.remainingSeconds < BOUNDARY_WINDOW_SECONDS || yt?.ended) waitForBoundary(now.remainingSeconds);
    else app.showToast(COPY.moveTogether);
  }

  /* ----------------------------- dialog ----------------------------- */

  function mountImmersiveCircleEntry() {
    const frame = document.querySelector('iframe[title="Immersive Garbo player"]');
    const frameDocument = frame?.contentDocument;
    const bridge = frameDocument?.getElementById('circleBridge');
    const liveButton = frameDocument?.getElementById('liveBtn');
    const footer = liveButton?.closest('.foot');
    if (!bridge || !liveButton || !footer) return;

    let stack = frameDocument.getElementById('circleBottomStack');
    if (!stack) {
      stack = frameDocument.createElement('div');
      stack.id = 'circleBottomStack';
      stack.style.cssText = 'grid-column:1;justify-self:start;display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0;pointer-events:auto';
      footer.insertBefore(stack, liveButton);
      stack.append(bridge, liveButton);
    }
    bridge.className = 'live';
    bridge.setAttribute('aria-haspopup', 'dialog');
    const icon = bridge.querySelector('svg');
    if (icon) icon.replaceWith(frameDocument.createElement('i'));

    immersiveCircleEntry = bridge;
    syncImmersiveCircleEntry();
  }

  function syncImmersiveCircleEntry() {
    if (!immersiveCircleEntry?.isConnected) {
      immersiveCircleEntry = null;
      mountImmersiveCircleEntry();
      if (!immersiveCircleEntry) return;
    }
    const ready = circle.status === 'ready';
    const label = immersiveCircleEntry.querySelector('span');
    if (label) label.textContent = ready ? 'Join anonymously' : 'Private Garba Circle';
    immersiveCircleEntry.setAttribute('aria-label', ready ? 'Join anonymously. Join the Circle and vote.' : 'Open Private Garba Circle.');
    // Once joined, Garbo's original bottom Live control becomes the named Circle control,
    // including the chosen face. Hide this entry then so the footer never shows two Circles.
    immersiveCircleEntry.style.display = circle.status === 'active' ? 'none' : '';
  }

  function watchImmersiveCircleEntry() {
    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin) return;
      const frame = document.querySelector('iframe[title="Immersive Garbo player"]');
      if (!frame || event.source !== frame.contentWindow) return;
      const message = event.data;
      if (!message || message.channel !== 'playgarba:immersive-prototype') return;
      if (message.type === 'ready') mountImmersiveCircleEntry();
      if (message.type === 'action' && message.action === 'circle' && immersiveCircleEntry?.isConnected) {
        dialogTrigger = immersiveCircleEntry;
      }
    });
    mountImmersiveCircleEntry();
  }

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'circle-dialog';
    dialog.id = 'circleDialog';
    dialog.setAttribute('aria-labelledby', 'circleTitle');
    dialog.setAttribute('aria-describedby', 'circleLede');
    dialog.innerHTML = `
      <div class="circle-sheet">
        <header class="circle-header">
          <span class="circle-face" data-circle="face" hidden></span>
          <h2 id="circleTitle">Private Garba Circle</h2>
          <button class="icon-button circle-close" type="button" data-circle="close" aria-label="Close Private Garba Circle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg></button>
        </header>
        <p class="circle-lede" id="circleLede"></p>
        <p class="circle-message" data-circle="message" role="alert" hidden></p>
        <button class="circle-primary" type="button" data-circle="join" hidden>Join anonymously</button>
        <div class="circle-setup" data-circle="setup" role="group" aria-label="How the circle plays" hidden>
          <button class="circle-choice" type="button" data-circle="startShuffle"><strong>Keep the music going</strong><span>Starts with this song, then everyone hears the catalogue in one shared order.</span></button>
          <button class="circle-choice" type="button" data-circle="startPicked"><strong>Play your songs</strong><span data-circle="pickedHint">This song, then your Up next.</span></button>
        </div>
        <div class="circle-invite" data-circle="invite" hidden>
          <div class="circle-identity" data-circle="identity" hidden>
            <label class="circle-field"><span class="circle-field-label">Circle name</span><input class="circle-name" type="text" data-circle="name" maxlength="${MAX_CIRCLE_NAME_LENGTH}" autocomplete="off" autocapitalize="words" enterkeyhint="done" spellcheck="false" placeholder="Private Garba Circle" /></label>
            <div class="circle-field">
              <span class="circle-field-label" id="circleFacesLabel">Face</span>
              <div class="circle-face-grid" data-circle="faces" role="radiogroup" aria-labelledby="circleFacesLabel"></div>
            </div>
          </div>
          <p class="circle-songs" data-circle="songs" hidden></p>
          <section class="circle-vote" data-circle="vote" aria-labelledby="circleVoteTitle" hidden>
            <p class="circle-vote-kicker">Next track</p>
            <h3 id="circleVoteTitle">Vote for the next track</h3>
            <p class="circle-vote-help" id="circleVoteHelp">Choose one playable catalogue song. Your choice stays on this device for now.</p>
            <label class="visually-hidden" for="circleVoteSearch">Search songs or artists</label>
            <input class="circle-vote-search" id="circleVoteSearch" type="search" data-circle="voteSearch" aria-describedby="circleVoteHelp" autocomplete="off" enterkeyhint="search" placeholder="Search songs or artists" />
            <div class="circle-vote-selection" data-circle="voteSelection" hidden>
              <p><span>Your choice on this device</span><strong data-circle="voteSelectionTitle"></strong></p>
              <button type="button" data-circle="voteRemove">Remove vote</button>
            </div>
            <ul class="circle-vote-results" data-circle="voteResults" aria-label="Matching songs"></ul>
            <p class="circle-vote-empty" data-circle="voteEmpty"></p>
          </section>
          <div class="circle-qr" data-circle="qr"></div>
          <p class="circle-link"><span class="visually-hidden">Circle link: </span><span data-circle="link"></span></p>
          <div class="circle-actions">
            <button class="circle-primary" type="button" data-circle="copy">Copy link</button>
            <button class="circle-secondary" type="button" data-circle="share" hidden>Share</button>
          </div>
        </div>
        <p class="circle-status" data-circle="status" role="status" aria-live="polite"></p>
        <p class="visually-hidden" data-circle="announce" aria-live="polite"></p>
        <p class="circle-next" data-circle="next" hidden></p>
        <button class="circle-leave" type="button" data-circle="leave" hidden>Leave circle</button>
      </div>`;
    document.body.append(dialog);
    for (const node of dialog.querySelectorAll('[data-circle]')) parts[node.dataset.circle] = node;
    parts.lede = dialog.querySelector('#circleLede');

    parts.close.addEventListener('click', closeDialog);
    parts.join.addEventListener('click', join);
    parts.startShuffle.addEventListener('click', () => start('shuffle'));
    parts.startPicked.addEventListener('click', () => start('picked'));
    parts.copy.addEventListener('click', copyLink);
    parts.share.addEventListener('click', shareLink);
    parts.leave.addEventListener('click', () => leave());
    parts.voteSearch.addEventListener('input', () => {
      circle.voteQuery = parts.voteSearch.value;
      renderVote({ force: true });
    });
    parts.voteResults.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-vote-song]') : null;
      if (!button) return;
      circle.voteSongId = button.dataset.voteSong;
      renderVote({ force: true });
      syncImmersiveCircleEntry();
      parts.announce.textContent = 'Vote saved on this device.';
    });
    parts.voteRemove.addEventListener('click', () => {
      circle.voteSongId = null;
      renderVote({ force: true });
      syncImmersiveCircleEntry();
      parts.announce.textContent = 'Vote removed from this device.';
    });
    buildIdentity();
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });
    dialog.addEventListener('close', () => {
      if (circle.status === 'invalid' || circle.status === 'mismatch' || circle.status === 'setup') leaveUnjoined();
      const trigger = dialogTrigger?.isConnected ? dialogTrigger : app.trigger();
      dialogTrigger = null;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
    // Keys inside the dialog belong to the dialog, not to the player's global shortcuts
    // (the YouTube runtime closes playback on Escape).
    window.addEventListener('keydown', (event) => {
      if (!dialog?.open) return;
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
      } else identityKey(event);
    }, { capture: true });
  }

  /* ----------------------------- the circle's name and face ----------------------------- */

  let nameTimer = null;
  function buildIdentity() {
    for (let index = 0; index < CIRCLE_FACE_COUNT; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'circle-face-choice';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-label', circleFaceLabel(index));
      button.innerHTML = circleFaceSvg(index);
      button.addEventListener('click', () => chooseFace(index));
      parts.faces.append(button);
    }
    parts.name.addEventListener('input', () => {
      clearTimeout(nameTimer);
      nameTimer = setTimeout(() => setName(parts.name.value), NAME_SETTLE_MS);
    });
    parts.name.addEventListener('change', () => {
      clearTimeout(nameTimer);
      setName(parts.name.value);
      parts.name.value = circle.name;
    });
  }

  // The dialog keeps its keys from the player's shortcuts, so it hands the ones the name and faces need here.
  function identityKey(event) {
    if (event.target === parts.name) {
      if (event.key === 'Enter') { event.preventDefault(); parts.name.blur(); }
      return;
    }
    const index = [...parts.faces.children].indexOf(event.target);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (index < 0 || !step) return;
    event.preventDefault();
    const next = (index + step + CIRCLE_FACE_COUNT) % CIRCLE_FACE_COUNT;
    chooseFace(next);
    parts.faces.children[next].focus();
  }

  function identityChanged() {
    saveHost(circle.name, circle.face);
    renderDialog();
    notify();
  }

  function setName(value) {
    if (circle.role !== 'host') return;
    const name = cleanCircleName(value);
    if (name === circle.name) return;
    circle.name = name;
    identityChanged();
  }

  function chooseFace(index) {
    if (circle.role !== 'host' || circle.face === index) return;
    circle.face = index;
    identityChanged();
  }

  function renderIdentity() {
    const heading = dialog.querySelector('#circleTitle');
    if (heading.textContent !== title()) heading.textContent = title();
    const shown = circle.status === 'active' || circle.status === 'ready' ? circle.face : null;
    parts.face.hidden = shown == null;
    if (parts.face.dataset.index !== String(shown)) {
      parts.face.dataset.index = String(shown);
      parts.face.innerHTML = shown == null ? '' : circleFaceSvg(shown);
    }
    const editing = circle.status === 'active' && circle.role === 'host';
    parts.identity.hidden = !editing;
    if (!editing) return;
    if (document.activeElement !== parts.name && parts.name.value !== circle.name) parts.name.value = circle.name;
    [...parts.faces.children].forEach((button, index) => {
      const chosen = index === circle.face;
      button.setAttribute('aria-checked', String(chosen));
      button.tabIndex = chosen || (circle.face == null && index === 0) ? 0 : -1;
    });
  }

  function leaveUnjoined() {
    Object.assign(circle, { status: 'idle', role: null, message: '', code: null, schedule: [], name: '', face: null, kind: 'shuffle', items: [], listChanged: false, voteQuery: '', voteSongId: null });
    lastVoteRender = '';
    notify();
  }

  function openDialog() {
    if (!dialog) buildDialog();
    const opening = !dialog.open;
    if (opening) dialog.showModal();
    renderDialog({ focus: opening });
  }

  function closeDialog() {
    if (dialog?.open) dialog.close();
  }

  function toggle() {
    if (circle.status === 'idle') { openSetup(); return true; }
    if (dialog?.open) closeDialog();
    else openDialog();
    return true;
  }

  function renderStatus() {
    if (!dialog) return;
    const yt = player();
    const now = circle.status === 'active' ? position() : null;
    let text = '';
    if (circle.status === 'starting') text = circle.kind === 'picked' ? COPY.lengths : COPY.syncing;
    else if (circle.status === 'ready' && !circle.clock) text = COPY.syncing;
    else if (circle.status === 'ready') text = formatClock(circle.clock);
    else if (circle.status === 'active') {
      if (!yt?.playing) text = `Paused. Press Play to rejoin the circle where it is now. ${formatClock(circle.clock)}`;
      else if (circle.lastDriftSeconds == null) text = `${circle.role === 'host' ? 'Starting the circle…' : 'Joining the circle…'} ${formatClock(circle.clock)}`;
      else text = `In sync. ${formatClock(circle.clock)}`;
    }
    if (parts.status.textContent !== text) parts.status.textContent = text;
    const nextTitle = now && !now.substituteFor ? now.nextSong?.title || '' : '';
    parts.next.hidden = !nextTitle;
    const nextText = nextTitle ? `Up next in the circle: ${nextTitle}` : '';
    if (parts.next.textContent !== nextText) parts.next.textContent = nextText;
  }

  function renderVote({ force = false } = {}) {
    if (!dialog) return;
    const active = circle.status === 'active';
    parts.vote.hidden = !active;
    if (!active) return;

    const songs = app.songs() || [];
    const currentSongId = app.currentSong()?.id || '';
    let selected = songs.find((song) => song.id === circle.voteSongId && isCatalogueCircleSong(song)) || null;
    if (circle.voteSongId && !selected) circle.voteSongId = null;
    const matches = circleVoteCandidates(songs, circle.voteQuery, { currentSongId });
    const renderKey = JSON.stringify([circle.voteQuery, circle.voteSongId, currentSongId, matches.map((song) => song.id)]);
    if (!force && renderKey === lastVoteRender) return;
    lastVoteRender = renderKey;

    if (document.activeElement !== parts.voteSearch && parts.voteSearch.value !== circle.voteQuery) {
      parts.voteSearch.value = circle.voteQuery;
    }
    parts.voteSelection.hidden = !selected;
    parts.voteSelectionTitle.textContent = selected
      ? [selected.title || selected.displayTitle, selected.artist].filter(Boolean).join(' · ')
      : '';

    parts.voteResults.replaceChildren(...matches.map((song) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const titleNode = document.createElement('strong');
      const artistNode = document.createElement('span');
      button.type = 'button';
      button.dataset.voteSong = song.id;
      button.setAttribute('aria-pressed', String(song.id === circle.voteSongId));
      titleNode.textContent = song.title || song.displayTitle || 'Untitled song';
      artistNode.textContent = song.artist || 'PlayGarba catalogue';
      button.append(titleNode, artistNode);
      item.append(button);
      return item;
    }));
    parts.voteEmpty.textContent = circle.voteQuery.trim()
      ? (matches.length ? '' : 'No playable Circle songs found. Try another song or artist.')
      : 'Search the PlayGarba catalogue to choose a song.';
  }

  function renderDialog({ focus = false } = {}) {
    if (!dialog) return;
    const { status } = circle;
    const active = status === 'active';
    dialog.dataset.state = status;
    const invited = circle.role === 'guest' && !active;
    parts.lede.textContent = invited && circle.name
      ? `You have been invited to ${circle.name}, a Private Garba Circle. Everyone in it hears the same song at the same moment. Use earbuds for a silent garba.`
      : invited ? COPY.joinLede : COPY.lede;
    renderIdentity();
    parts.message.hidden = !circle.message;
    parts.message.textContent = circle.message;
    parts.join.hidden = status !== 'ready';
    if (status === 'ready') {
      parts.join.disabled = false;
      parts.join.textContent = 'Join anonymously';
    }
    const setup = status === 'setup';
    parts.setup.hidden = !setup;
    if (setup) {
      const queued = Math.max(0, (app.pickedSongs() || []).length - 1);
      parts.pickedHint.textContent = queued
        ? `This song, then the ${queued} ${queued === 1 ? 'song' : 'songs'} in your Up next. Paste YouTube links to add more.`
        : 'This song for now. Add songs to Up next, or paste YouTube links, and they join the circle.';
    }
    const picking = active && circle.kind === 'picked';
    parts.songs.hidden = !picking;
    if (picking) {
      const count = circle.schedule.length;
      const what = `${count} ${count === 1 ? 'song' : 'songs'} in this circle, played in order and then from the top.`;
      parts.songs.textContent = circle.role !== 'host' ? what
        : circle.listChanged ? `You added songs. Share the new link so everyone hears them. ${what}`
          : `${what} Add to Up next or paste a YouTube link to add more.`;
      parts.songs.classList.toggle('is-changed', circle.role === 'host' && circle.listChanged);
    }
    parts.invite.hidden = !active;
    parts.leave.hidden = !active;
    parts.share.hidden = !(active && typeof navigator.share === 'function');
    if (active && parts.link.textContent !== linkUrl()) {
      const url = linkUrl();
      parts.link.textContent = url;
      parts.qr.innerHTML = qrSvg(url, { title: 'QR code for the Private Garba Circle link' });
    }
    renderVote();
    renderStatus();
    // Focus the action that matters in this state; also rescue focus from a control that was hidden.
    const focusTarget = status === 'ready' ? parts.join : active ? parts.copy : status === 'setup' ? parts.startShuffle : parts.close;
    const lost = !dialog.contains(document.activeElement) || document.activeElement?.hidden;
    if (dialog.open && (focus || lost)) focusTarget.focus({ preventScroll: true });
  }

  // Toasts sit below a modal dialog, so feedback is given inside it.
  let feedbackTimer = null;
  function feedback(message) {
    parts.announce.textContent = message;
    parts.copy.textContent = message === COPY.copied ? 'Link copied' : 'Copy link';
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      parts.copy.textContent = 'Copy link';
      parts.announce.textContent = '';
    }, 2200);
  }

  // Once the host passes the new link on, the nudge to share it goes away
  function linkShared() {
    if (!circle.listChanged) return;
    circle.listChanged = false;
    renderDialog();
  }

  async function copyLink() {
    linkShared();
    try {
      await navigator.clipboard.writeText(linkUrl());
      feedback(COPY.copied);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(parts.link);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      feedback(COPY.copyFailed);
    }
  }

  async function shareLink() {
    linkShared();
    const result = await window.GARBA_SHARE_INTENT?.executeShare?.({ title: title(), text: circle.name ? `Join ${circle.name}, my Private Garba Circle on PlayGarba` : COPY.shareText, url: linkUrl() });
    if (result?.status === 'copied') feedback(COPY.copied);
    else if (result?.status === 'failed') feedback(COPY.copyFailed);
  }

  /* ----------------------------- wiring ----------------------------- */

  window.addEventListener('garba:playback-state-change', onPlaybackStateChange);
  window.addEventListener('garba:youtube-error', onPlayerError);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resync(); });
  window.addEventListener('online', resync);
  watchImmersiveCircleEntry();

  return Object.freeze({
    get active() { return circle.status === 'active'; },
    // shuffle or picked, while a circle is joinable or active
    get kind() { return circle.status === 'idle' ? null : circle.kind; },
    // host or guest, while a circle is being set up, joined or played
    get role() { return circle.status === 'idle' ? null : circle.role; },
    // True for the host of a circle that plays their own songs: Up next and pasted links add to it
    get canAddSongs() { return circle.status === 'active' && circle.role === 'host' && circle.kind === 'picked'; },
    addSongs,
    hostOnlyMessage: COPY.hostOnly,
    // The link code stays in the address bar while the circle is joinable or active.
    get code() { return circle.status === 'idle' ? null : circle.code; },
    // The name and face the host gave the circle, while it is joinable or active.
    get identity() {
      if (circle.status !== 'active' && circle.status !== 'ready') return null;
      return { name: circle.name, face: circle.face, title: title() };
    },
    // Opens the circle's dialog without starting or leaving anything.
    show() { if (circle.status !== 'idle') openDialog(); },
    eyebrow,
    start,
    prepareJoin,
    join,
    leave,
    toggle,
    handleChangeSong,
    // Read-only diagnostics for tests and support.
    diagnostics: () => ({
      status: circle.status,
      role: circle.role,
      code: circle.code,
      clock: circle.clock,
      startMs: circle.startMs,
      syncedNow: syncedNow(),
      position: circle.status === 'active' ? position() : null,
      lastDriftSeconds: circle.lastDriftSeconds,
      seekLeadSeconds: corrector.seekLead,
      loadLeadSeconds: corrector.loadLead,
      nudging: corrector.nudging,
      fineCorrections: corrector.fine,
    }),
  });
}
