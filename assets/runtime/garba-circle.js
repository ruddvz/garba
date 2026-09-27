/**
 * PlayGarba Garba Circle
 * Pure scheduling, link-code and clock-sync logic for listening together without a backend.
 *
 * A circle is fully described by its link code: a seed, a start instant on the server clock,
 * the song it started from and a fingerprint of the resulting schedule. Every phone rebuilds
 * the same schedule from its own catalogue and reads its position from a clock that has been
 * aligned to the HTTP `Date` header of the site it was served from.
 */

import { isLivePlayable } from './live-station.js';

export const CIRCLE_CODE_VERSION = '1';
export const DEFAULT_DRIFT_THRESHOLD_SECONDS = 0.35;

const MIN_SONG_SECONDS = 10;
const UINT32_MAX = 0xffffffff;
// Start instants outside this range are treated as corrupt links.
const MIN_START_MS = Date.UTC(2024, 0, 1);
const MAX_START_MS = Date.UTC(2100, 0, 1);
const SONG_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SONG_ID_LENGTH = 120;
const CHECK_SPACE = 36 ** 3;

/**
 * True when a song can be played in a circle: it has a playable YouTube route (same rule as
 * 24/7 Live Radio) and a real catalogue duration. Live Radio's 180s default is never used here,
 * because a guessed duration would move every later song boundary.
 */
export function isCircleEligible(song) {
  if (!isLivePlayable(song)) return false;
  if (song.presentationRole && song.presentationRole !== 'catalogue') return false;
  const duration = Number(song.durationSeconds);
  return Number.isFinite(duration) && duration > MIN_SONG_SECONDS;
}

/** 32-bit FNV-1a hash of a string. */
export function fnv1a(text) {
  let hash = 0x811c9dc5;
  const value = String(text);
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Deterministic PRNG returning floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the shared song order. Eligible songs are sorted by id (so catalogue load order does not
 * matter), shuffled with the circle seed, and the host's song is moved to the front.
 * @param {Array} songs Catalogue songs
 * @param {{ seed: number, firstSongId?: string }} options
 */
export function buildCircleSchedule(songs = [], { seed = 0, firstSongId = null } = {}) {
  const byId = new Map();
  for (const song of songs || []) {
    if (isCircleEligible(song) && !byId.has(song.id)) byId.set(song.id, song);
  }
  const ordered = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const random = mulberry32(seed);
  for (let i = ordered.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }
  const firstIndex = firstSongId ? ordered.findIndex((song) => song.id === firstSongId) : -1;
  if (firstIndex > 0) ordered.unshift(...ordered.splice(firstIndex, 1));
  return ordered;
}

/**
 * Short stable hash of everything that decides what a listener hears and when: song order,
 * durations, video ids and chapter starts. Two phones with different catalogue versions
 * produce different fingerprints.
 */
export function scheduleFingerprint(schedule = []) {
  const lines = (schedule || []).map((song) => [
    song.id,
    Number(song.durationSeconds),
    String(song.youtubeId || song.playbackSourceUrl || ''),
    Number(song.youtubeStartSeconds || 0),
  ].join('|'));
  return fnv1a(lines.join('\n')).toString(36);
}

function codeCheck(body) {
  return (fnv1a(body) % CHECK_SPACE).toString(36).padStart(3, '0');
}

/**
 * Encode a circle into a compact, URL-safe code:
 * `1.<seed36>.<start36>.<fingerprint>.<check>.<firstSongId>`.
 * The check characters catch truncated or mistyped links before they are mistaken for a
 * catalogue mismatch.
 */
export function encodeCircleCode({ seed, startMs, firstSongId, fingerprint } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) return null;
  if (!Number.isInteger(startMs) || startMs < MIN_START_MS || startMs > MAX_START_MS) return null;
  const id = String(firstSongId || '');
  if (!SONG_ID_RE.test(id) || id.length > MAX_SONG_ID_LENGTH) return null;
  const fp = String(fingerprint || '');
  if (!/^[0-9a-z]{1,7}$/.test(fp) || parseInt(fp, 36) > UINT32_MAX) return null;
  const body = [CIRCLE_CODE_VERSION, seed.toString(36), startMs.toString(36), fp].join('.');
  return `${body}.${codeCheck(`${body}.${id}`)}.${id}`;
}

/**
 * Decode a circle code. Returns null for anything that is not exactly what
 * `encodeCircleCode` would produce.
 */
export function decodeCircleCode(value) {
  if (typeof value !== 'string' || value.length > 220) return null;
  const parts = value.split('.');
  if (parts.length !== 6 || parts[0] !== CIRCLE_CODE_VERSION) return null;
  const [, seed36, start36, fingerprint, check, firstSongId] = parts;
  if (!/^[0-9a-z]{1,7}$/.test(seed36) || !/^[0-9a-z]{1,11}$/.test(start36) || !/^[0-9a-z]{3}$/.test(check)) return null;
  const decoded = {
    seed: parseInt(seed36, 36),
    startMs: parseInt(start36, 36),
    fingerprint,
    firstSongId,
  };
  return encodeCircleCode(decoded) === value ? decoded : null;
}

/* ----------------------------- circles that play the host's own songs ----------------------------- */

// A circle can instead play a list the host picked, looped. The link carries the list itself:
// `2.<start36>.<fingerprint>.<check>.<item>.<item>…`. An item is one of:
// - `-` and a 7-character base-36 hash of a catalogue song's id, so thirty songs still make a QR code a phone can
//   scan. Ids never change, so the hash still finds the song after the catalogue grows;
// - a catalogue song id in full, used only when two songs in the catalogue share a hash;
// - `_`, an 11-character YouTube video id and the video's length in whole seconds in base 36, for a pasted link.
//   A pasted link carries its own length because no catalogue knows it, and every phone must agree on every
//   song boundary.
export const PICKED_CODE_VERSION = '2';
export const MAX_PICKED_ITEMS = 30;
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const MAX_LINK_SECONDS = 6 * 3600;
const MAX_PICKED_CODE_LENGTH = 2000;

/** A catalogue song a picked circle can carry by id: not one a listener added on their own device. */
export function isCatalogueCircleSong(song) {
  return Boolean(song) && isCircleEligible(song) && !song.userAdded && !song.circleLink;
}

/** The short form of a catalogue song id in a picked circle's link. */
export function songHash(id) {
  return fnv1a(String(id)).toString(36).padStart(7, '0');
}
const HASH_RE = /^[0-9a-z]{7}$/;

// How many catalogue songs share each hash, so a song whose hash isn't unique travels by its full id
function hashCounts(catalogueIds) {
  const counts = new Map();
  for (const id of catalogueIds || []) {
    const hash = songHash(id);
    counts.set(hash, (counts.get(hash) || 0) + 1);
  }
  return counts;
}

function itemToken(item, counts) {
  if (item?.kind === 'song') {
    if (item.hash != null) return HASH_RE.test(String(item.hash)) ? `-${item.hash}` : null;
    const id = String(item.id || '');
    if (!SONG_ID_RE.test(id) || id.length > MAX_SONG_ID_LENGTH) return null;
    const hash = songHash(id);
    return counts && counts.get(hash) === 1 ? `-${hash}` : id;
  }
  if (item?.kind === 'link') {
    const seconds = Math.round(Number(item.durationSeconds));
    if (!VIDEO_ID_RE.test(String(item.videoId || '')) || !(seconds > MIN_SONG_SECONDS) || seconds > MAX_LINK_SECONDS) return null;
    return `_${item.videoId}${seconds.toString(36)}`;
  }
  return null;
}

function tokenItem(token) {
  if (token.startsWith('-')) {
    const hash = token.slice(1);
    return HASH_RE.test(hash) ? { kind: 'song', hash } : null;
  }
  if (token.startsWith('_')) {
    const videoId = token.slice(1, 12);
    const tail = token.slice(12);
    if (!VIDEO_ID_RE.test(videoId) || !/^[0-9a-z]{1,4}$/.test(tail)) return null;
    return { kind: 'link', videoId, durationSeconds: parseInt(tail, 36) };
  }
  return { kind: 'song', id: token };
}

/**
 * Encode a picked circle, or null when anything in it could not be decoded again exactly. With `catalogueIds`,
 * catalogue songs travel by their short hash wherever it is unique; without it, by their full id.
 */
export function encodePickedCode({ startMs, items, fingerprint, catalogueIds = null } = {}) {
  if (!Number.isInteger(startMs) || startMs < MIN_START_MS || startMs > MAX_START_MS) return null;
  if (!Array.isArray(items) || !items.length || items.length > MAX_PICKED_ITEMS) return null;
  const fp = String(fingerprint || '');
  if (!/^[0-9a-z]{1,7}$/.test(fp) || parseInt(fp, 36) > UINT32_MAX) return null;
  const counts = catalogueIds ? hashCounts(catalogueIds) : null;
  const tokens = items.map((item) => itemToken(item, counts));
  if (tokens.some((token) => !token)) return null;
  const body = [PICKED_CODE_VERSION, startMs.toString(36), fp].join('.');
  const list = tokens.join('.');
  const code = `${body}.${codeCheck(`${body}.${list}`)}.${list}`;
  return code.length <= MAX_PICKED_CODE_LENGTH ? code : null;
}

/** Decode a picked circle code. Returns null for anything `encodePickedCode` would not produce. */
export function decodePickedCode(value) {
  if (typeof value !== 'string' || value.length > MAX_PICKED_CODE_LENGTH) return null;
  const parts = value.split('.');
  if (parts.length < 5 || parts[0] !== PICKED_CODE_VERSION) return null;
  const [, start36, fingerprint, check] = parts;
  if (!/^[0-9a-z]{1,11}$/.test(start36) || !/^[0-9a-z]{3}$/.test(check)) return null;
  const items = parts.slice(4).map(tokenItem);
  if (items.some((item) => !item)) return null;
  const decoded = { startMs: parseInt(start36, 36), fingerprint, items };
  return encodePickedCode(decoded) === value ? decoded : null;
}

/** Either kind of circle code: `{ kind: 'shuffle', … }` (version 1), `{ kind: 'picked', … }` (version 2) or null. */
export function decodeAnyCircleCode(value) {
  const picked = decodePickedCode(value);
  if (picked) return { kind: 'picked', ...picked };
  const shuffle = decodeCircleCode(value);
  return shuffle ? { kind: 'shuffle', ...shuffle } : null;
}

/** A pasted YouTube link as a song the circle can schedule. Its title arrives later from YouTube. */
export function circleLinkSong({ videoId, durationSeconds, title = '' }) {
  return {
    id: `link-${videoId}`,
    title: String(title || '') || 'YouTube video',
    artist: 'Added to the circle',
    genre: 'traditional',
    category: 'circle-link',
    durationSeconds: Number(durationSeconds),
    youtubeId: videoId,
    youtubeStartSeconds: 0,
    playbackProvider: 'youtube',
    playbackSourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    playbackSourceType: 'circle-link',
    circleLink: true,
  };
}

/** The item a song becomes in a picked circle: a catalogue song by id, anything else by its YouTube video. */
export function pickedItemFor(song) {
  if (!song) return null;
  if (isCatalogueCircleSong(song)) return { kind: 'song', id: song.id };
  const videoId = String(song.youtubeId || '');
  const seconds = Math.round(Number(song.durationSeconds));
  if (!VIDEO_ID_RE.test(videoId) || !(seconds > MIN_SONG_SECONDS)) return null;
  return { kind: 'link', videoId, durationSeconds: seconds };
}

/**
 * The picked circle's songs in the host's order. Returns `{ schedule }`, or `{ missing }` naming a catalogue
 * song this phone doesn't have (or can't play in a circle), which means the phones run different catalogues.
 * A song picked twice plays once, where it was first picked.
 */
export function buildPickedSchedule(items = [], songs = []) {
  const byId = new Map();
  const byHash = new Map();
  for (const song of songs || []) {
    if (!song?.id || byId.has(song.id)) continue;
    byId.set(song.id, song);
    if (!isCatalogueCircleSong(song)) continue;
    const hash = songHash(song.id);
    byHash.set(hash, byHash.has(hash) ? null : song);
  }
  const schedule = [];
  const seen = new Set();
  for (const item of items || []) {
    let song = null;
    if (item?.kind === 'song') {
      // A hash two songs share on this phone can't be trusted: treat it like a missing song
      song = item.hash != null ? byHash.get(item.hash) : byId.get(item.id);
      if (!song || !isCircleEligible(song)) return { missing: item.id ?? `#${item.hash}` };
    } else if (item?.kind === 'link') {
      song = circleLinkSong(item);
    }
    if (!song || seen.has(song.id)) continue;
    seen.add(song.id);
    schedule.push(song);
  }
  return { schedule };
}

export const MAX_CIRCLE_NAME_LENGTH = 32;
// Control characters, zero-width characters and bidirectional overrides never belong in a circle's name.
const NAME_STRIP_RE = /[\u0000-\u001f\u007f-\u009f­​-‏‪-‮⁠-⁯﻿]/g;

/**
 * The name a host gave the circle, as it may be shown: plain text, one line, at most
 * MAX_CIRCLE_NAME_LENGTH characters. Anything else becomes ''.
 */
export function cleanCircleName(value) {
  if (typeof value !== 'string') return '';
  const text = value.replace(NAME_STRIP_RE, '').replace(/\s+/g, ' ').trim();
  return Array.from(text).slice(0, MAX_CIRCLE_NAME_LENGTH).join('').trim();
}

/** The face a link names: an index below `count`, or null for anything else. */
export function parseCircleFace(value, count) {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^(0|[1-9]\d?)$/.test(text)) return null;
  const index = Number(text);
  return index < count ? index : null;
}

/**
 * Where the circle is at `nowMs` (server-aligned milliseconds). The schedule loops.
 * Before the start instant the circle waits at the top of its first song.
 *
 * `unplayable` holds song ids that YouTube refuses to play here (embedding disabled, removed).
 * Every phone hits the same refusal, so each fills that song's slot the same way: the following
 * playable songs, laid out from the slot's start. When the slot ends the schedule resumes as usual.
 */
export function getCirclePosition(schedule, startMs, nowMs, { unplayable = null } = {}) {
  if (!Array.isArray(schedule) || !schedule.length || !Number.isFinite(startMs) || !Number.isFinite(nowMs)) return null;
  const durations = schedule.map((song) => Number(song.durationSeconds));
  if (durations.some((duration) => !(duration > 0))) return null;
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  const elapsedSeconds = (nowMs - startMs) / 1000;

  if (elapsedSeconds < 0) {
    return {
      song: schedule[0],
      index: 0,
      offsetSeconds: 0,
      remainingSeconds: durations[0],
      nextSong: schedule[1 % schedule.length],
      cycle: 0,
      started: false,
      startsInSeconds: -elapsedSeconds,
    };
  }

  const cycle = Math.floor(elapsedSeconds / total);
  let t = elapsedSeconds - cycle * total;
  let index = 0;
  while (index < durations.length - 1 && t >= durations[index]) {
    t -= durations[index];
    index += 1;
  }
  const offsetSeconds = Math.min(t, durations[index]);
  const position = {
    song: schedule[index],
    index,
    offsetSeconds,
    remainingSeconds: durations[index] - offsetSeconds,
    nextSong: schedule[(index + 1) % schedule.length],
    cycle,
    started: true,
    startsInSeconds: 0,
    substituteFor: null,
  };
  return unplayable?.has(position.song.id) ? substitutePosition(schedule, durations, position, unplayable) : position;
}

function substitutePosition(schedule, durations, slot, unplayable) {
  const slotRemaining = slot.remainingSeconds;
  let t = slot.offsetSeconds;
  for (let step = 1; step < schedule.length; step += 1) {
    const index = (slot.index + step) % schedule.length;
    if (unplayable.has(schedule[index].id)) continue;
    if (t < durations[index]) {
      return {
        ...slot,
        song: schedule[index],
        index,
        offsetSeconds: t,
        remainingSeconds: Math.min(durations[index] - t, slotRemaining),
        substituteFor: slot.song.id,
      };
    }
    t -= durations[index];
  }
  return { ...slot, song: null, substituteFor: slot.song.id };
}

/**
 * Decide whether the local player should seek to rejoin the circle.
 * `leadSeconds` compensates for the time a seek itself takes to resume audio.
 */
export function planDriftCorrection({
  expectedSeconds,
  actualSeconds,
  thresholdSeconds = DEFAULT_DRIFT_THRESHOLD_SECONDS,
  leadSeconds = 0,
} = {}) {
  if (!Number.isFinite(expectedSeconds) || !Number.isFinite(actualSeconds)) {
    return { action: 'none', targetSeconds: null, driftSeconds: null };
  }
  const driftSeconds = actualSeconds - expectedSeconds;
  if (Math.abs(driftSeconds) < thresholdSeconds) return { action: 'none', targetSeconds: null, driftSeconds };
  return { action: 'seek', targetSeconds: Math.max(0, expectedSeconds + Math.max(0, leadSeconds)), driftSeconds };
}

/* ---------------------------------------------------------------------------------------------
 * Clock sync from the HTTP Date header.
 *
 * The header only has one-second resolution, but it is still exact: the server stamped a time
 * T with floor(T / 1000) * 1000 = S, somewhere between the local send and receive instants.
 * So the true offset (server − local) lies in (S − receivedAt, S + 1000 − sentAt). Intersecting
 * those intervals across probes, and timing probes so a server second boundary is predicted to
 * land inside the current window, narrows the window to roughly one round trip.
 * ------------------------------------------------------------------------------------------- */

/**
 * Intersect the offset intervals implied by probe samples.
 * @param {Array<{ sentAt: number, receivedAt: number, serverMs: number }>} samples
 * @returns {null | { lo: number, hi: number, offsetMs: number, uncertaintyMs: number, consistent: boolean, count: number, minRttMs: number }}
 */
export function intersectOffsetWindow(samples = []) {
  let lo = -Infinity;
  let hi = Infinity;
  let count = 0;
  let minRttMs = Infinity;
  for (const sample of samples || []) {
    const { sentAt, receivedAt, serverMs } = sample || {};
    if (![sentAt, receivedAt, serverMs].every(Number.isFinite) || receivedAt < sentAt) continue;
    const second = Math.floor(serverMs / 1000) * 1000;
    lo = Math.max(lo, second - receivedAt);
    hi = Math.min(hi, second + 1000 - sentAt);
    minRttMs = Math.min(minRttMs, receivedAt - sentAt);
    count += 1;
  }
  if (!count) return null;
  const consistent = lo < hi;
  return {
    lo,
    hi,
    offsetMs: (lo + hi) / 2,
    uncertaintyMs: consistent ? (hi - lo) / 2 : Infinity,
    consistent,
    count,
    minRttMs,
  };
}

/**
 * Local send times for the next probes. Each probe aims a server second boundary at one of
 * `count` evenly spaced offsets inside [lo, hi], so the replies split the window into
 * `count + 1` parts. All probes target the first boundary reachable after `afterMs`.
 */
export function planProbeTimes({ lo, hi, oneWayMs = 0, afterMs, count = 1 }) {
  if (![lo, hi, afterMs].every(Number.isFinite) || !(hi > lo) || count < 1) return [];
  const targets = Array.from({ length: count }, (_, j) => lo + ((j + 1) * (hi - lo)) / (count + 1));
  const latest = targets[targets.length - 1];
  const boundary = Math.ceil((afterMs + oneWayMs + latest) / 1000) * 1000;
  return targets.map((offset) => boundary - offset - oneWayMs).sort((a, b) => a - b);
}

/**
 * Measure the offset between the local clock and the server clock.
 * @param {{ probe: () => Promise<number>, now: () => number, sleep: (ms: number) => Promise<void>,
 *   maxProbes?: number, probesPerRound?: number, maxDurationMs?: number, targetUncertaintyMs?: number }} options
 *   `probe` resolves with the server time parsed from a Date header (ms).
 * @returns {Promise<{ offsetMs: number, uncertaintyMs: number, reliable: boolean, probes: number, reason?: string }>}
 */
export async function measureClockOffset({
  probe,
  now,
  sleep,
  maxProbes = 10,
  probesPerRound = 3,
  maxDurationMs = 4000,
  targetUncertaintyMs = 15,
} = {}) {
  let probes = 0;

  const attempt = async () => {
    const startedAt = now();
    const samples = [];
    const runProbe = async () => {
      probes += 1;
      const sentAt = now();
      try {
        const serverMs = await probe();
        const receivedAt = now();
        if (Number.isFinite(serverMs)) samples.push({ sentAt, receivedAt, serverMs });
      } catch {
        // A failed probe only costs one attempt.
      }
    };

    let used = 1;
    await runProbe();
    while (used < maxProbes && now() - startedAt < maxDurationMs) {
      const window = intersectOffsetWindow(samples);
      if (!window) {
        used += 1;
        await runProbe();
        continue;
      }
      if (!window.consistent || window.uncertaintyMs <= targetUncertaintyMs) break;
      const count = Math.min(probesPerRound, maxProbes - used);
      const times = planProbeTimes({ lo: window.lo, hi: window.hi, oneWayMs: window.minRttMs / 2, afterMs: now() + 5, count });
      // Stop when the round could not finish inside the time budget.
      if (times[times.length - 1] + 2 * window.minRttMs - startedAt > maxDurationMs) break;
      used += count;
      await Promise.all(times.map(async (at) => {
        const wait = at - now();
        if (wait > 0) await sleep(wait);
        await runProbe();
      }));
    }
    return intersectOffsetWindow(samples);
  };

  let window = await attempt();
  if (window && !window.consistent) window = await attempt();
  if (!window) return { offsetMs: 0, uncertaintyMs: Infinity, reliable: false, probes, reason: 'no-date-header' };
  if (!window.consistent) return { offsetMs: 0, uncertaintyMs: Infinity, reliable: false, probes, reason: 'inconsistent' };
  return { offsetMs: window.offsetMs, uncertaintyMs: window.uncertaintyMs, reliable: true, probes };
}

/**
 * Browser probe: a HEAD request that bypasses every cache and returns the server Date (ms).
 */
export function createDateHeaderProbe({ fetchImpl = globalThis.fetch?.bind(globalThis), url = './robots.txt' } = {}) {
  return async () => {
    const token = Math.random().toString(36).slice(2, 10);
    const response = await fetchImpl(`${url}?circle-clock=${token}`, { method: 'HEAD', cache: 'no-store' });
    const serverMs = Date.parse(response.headers.get('date') || '');
    if (!Number.isFinite(serverMs)) throw new Error('Response has no Date header');
    return serverMs;
  };
}

if (typeof window !== 'undefined') {
  window.GARBA_CIRCLE = Object.freeze({
    isCircleEligible,
    buildCircleSchedule,
    scheduleFingerprint,
    encodeCircleCode,
    decodeCircleCode,
    cleanCircleName,
    parseCircleFace,
    getCirclePosition,
    planDriftCorrection,
    intersectOffsetWindow,
    planProbeTimes,
    measureClockOffset,
    createDateHeaderProbe,
  });
}
