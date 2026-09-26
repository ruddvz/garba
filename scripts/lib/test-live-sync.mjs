import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildLiveSchedule, createLiveTimeline, getLiveBroadcastState } from '../../assets/runtime/live-station.js';
import { createLiveSync, planLiveStep } from '../../assets/runtime/live-sync.js';
import { mulberry32 } from '../../assets/runtime/garba-circle.js';

const root = path.resolve(import.meta.dirname, '../..');
const pass = (message) => console.log(`✓ ${message}`);

const catalogue = JSON.parse(await readFile(path.join(root, 'data/songs.json'), 'utf8'));

// The broadcast position before millisecond precision, kept here as the reference.
function legacyBroadcast(songs, timestampMs) {
  const schedule = buildLiveSchedule(songs);
  let total = 0;
  const segments = schedule.map((song, index) => {
    const duration = (Number.isFinite(song.durationSeconds) && song.durationSeconds > 10) ? Math.round(song.durationSeconds) : 180;
    const segment = { song, index, startSecond: total, duration, endSecond: total + duration };
    total += duration;
    return segment;
  });
  const t = Math.floor(Math.max(0, timestampMs) / 1000) % total;
  const segment = segments.find((entry) => t >= entry.startSecond && t < entry.endSecond) || segments[0];
  const seekSeconds = Math.max(0, t - segment.startSecond);
  return { songId: segment.song.id, seekSeconds, remainingSeconds: Math.max(0, segment.duration - seekSeconds), trackIndex: segment.index };
}

/* ---------------- timeline precision, unchanged broadcast ---------------- */

const timeline = createLiveTimeline(catalogue);
assert.ok(timeline && timeline.segments.length > 100, 'real catalogue has a live schedule');
const random = mulberry32(20261011);
for (let i = 0; i < 3000; i += 1) {
  const ms = Math.floor(Date.UTC(2026, 9, 11) + random() * 90 * 86400000);
  const now = timeline.at(ms);
  const legacy = legacyBroadcast(catalogue, ms);
  assert.equal(now.songId, legacy.songId, `same song at ${ms}`);
  assert.equal(now.seekSeconds, legacy.seekSeconds, `same whole-second seek at ${ms}`);
  assert.equal(now.remainingSeconds, legacy.remainingSeconds, `same whole-second remaining at ${ms}`);
  assert.equal(now.trackIndex, legacy.trackIndex);
  assert.ok(now.offsetSeconds >= now.seekSeconds && now.offsetSeconds < now.seekSeconds + 1, 'exact offset lies within its second');
  assert.ok(Math.abs(now.offsetSeconds + now.remainingExactSeconds - now.duration) < 1e-9, 'exact offset and remaining add up to the slot');
}
assert.deepEqual(getLiveBroadcastState(catalogue, 1790000123456), timeline.at(1790000123456), 'getLiveBroadcastState delegates to the timeline');
const boundary = timeline.segments[5].startSecond * 1000;
assert.equal(timeline.at(boundary).songId, timeline.segments[5].songId, 'a slot starts exactly at its boundary');
assert.equal(timeline.at(boundary - 1).songId, timeline.segments[4].songId, 'one millisecond earlier is the previous slot');
assert.ok(Math.abs(timeline.at(boundary + 250).offsetSeconds - 0.25) < 1e-9, 'offset keeps milliseconds');
pass(`broadcast matches the previous whole-second schedule at 3000 instants and now keeps milliseconds (${timeline.segments.length} songs)`);

/* ---------------- step planning ---------------- */

const song = (id) => ({ id });
const slot = (id, offsetSeconds, duration) => ({ song: song(id), offsetSeconds, remainingExactSeconds: duration - offsetSeconds });
assert.deepEqual(planLiveStep({ broadcast: slot('a', 10, 200), activeSongId: 'a' }), { action: 'hold' });
assert.deepEqual(planLiveStep({ broadcast: slot('b', 1, 200), activeSongId: 'a' }), { action: 'open' });
assert.deepEqual(planLiveStep({ broadcast: slot('a', 199, 200), activeSongId: 'a' }), { action: 'wait', waitSeconds: 1 });
assert.deepEqual(planLiveStep({ broadcast: slot('a', 150, 200), activeSongId: 'a', ended: true }), { action: 'wait', waitSeconds: 50 });
assert.deepEqual(planLiveStep({ broadcast: slot('b', 1, 200), activeSongId: 'nonstop:x', inSchedule: () => false }), { action: 'none' });
assert.deepEqual(planLiveStep({ broadcast: null, activeSongId: 'a' }), { action: 'none' });
pass('step planning holds mid-song, follows the broadcast, waits out early endings and leaves other modes alone');

/* ---------------- devices with skewed clocks, simulated ---------------- */

const yt = (id, durationSeconds) => ({
  id,
  title: id,
  genre: 'traditional',
  durationSeconds,
  youtubeId: `v-${id}`,
  playbackProvider: 'youtube',
  playbackSourceUrl: `https://www.youtube.com/watch?v=v-${id}`,
  playbackSourceType: 'verified-label-channel',
});
const songs = [yt('song-a', 200), yt('song-b', 150), yt('song-c', 300), yt('song-d', 240)];
const liveTimeline = createLiveTimeline(songs);

function createWorld(startMs) {
  // Virtual time: sleeps resolve in time order, so concurrent probes overlap as they would for real.
  const world = { t: startMs, queue: [], pumping: false };
  const step = () => {
    if (!world.queue.length) {
      world.pumping = false;
      return;
    }
    world.queue.sort((a, b) => a.at - b.at);
    const next = world.queue.shift();
    world.t = Math.max(world.t, next.at);
    next.resolve();
    setImmediate(step);
  };
  world.sleep = (ms) => new Promise((resolve) => {
    world.queue.push({ at: world.t + Math.max(0, ms), resolve });
    if (!world.pumping) {
      world.pumping = true;
      setImmediate(step);
    }
  });
  // Server Date header: exact time, one-second resolution, zero network latency.
  world.probe = async () => Math.floor(world.t / 1000) * 1000;
  return world;
}

function createDevice(world, { skewMs, loadLatencySeconds = 0 }) {
  const player = {
    activeSongId: null,
    playing: false,
    ended: false,
    base: 0,
    baseT: 0,
    get elapsedSeconds() { return this.activeSongId ? this.base + (world.t - this.baseT) / 1000 : null; },
    seekTo(seconds) { this.base = seconds; this.baseT = world.t; },
  };
  const toasts = [];
  let live = true;
  const sync = createLiveSync({
    songs: () => songs,
    isLive: () => live,
    player: () => player,
    now: () => world.t + skewMs,
    sleep: world.sleep,
    probe: world.probe,
    showToast: (message) => toasts.push(message),
    playLiveSong: (entry, offset) => {
      player.activeSongId = entry.id;
      player.playing = true;
      player.ended = false;
      player.seekTo(offset - loadLatencySeconds);
    },
  });
  return { sync, player, toasts, leave: () => { live = false; } };
}

const truth = (world) => liveTimeline.at(world.t);
const gap = (world, device) => {
  const now = truth(world);
  assert.equal(device.player.activeSongId, now.songId, 'device is on the broadcast song');
  return Math.abs(device.player.elapsedSeconds - now.offsetSeconds);
};
const settle = async (world, device, rounds = 3) => {
  for (let i = 0; i < rounds; i += 1) {
    await world.sleep(3100);
    await device.sync.alignOnce();
  }
};

{
  const world = createWorld(Date.UTC(2026, 9, 11, 16, 30, 7, 321));
  const devices = [-3700, 0, 12345, 999].map((skewMs, i) => createDevice(world, { skewMs, loadLatencySeconds: [0.4, 0.1, 1.2, 0.7][i] }));
  for (const device of devices) device.sync.start();
  // Each tunes in immediately on its own clock, then corrects once the server clock is measured.
  for (const device of devices) await settle(world, device);
  const gaps = devices.map((device) => gap(world, device));
  assert.ok(Math.max(...gaps) < 0.05, `all devices within 50 ms of the broadcast (${gaps.map((g) => g.toFixed(3)).join(', ')})`);
  const spread = Math.max(...devices.map((d) => d.player.elapsedSeconds)) - Math.min(...devices.map((d) => d.player.elapsedSeconds));
  assert.ok(spread < 0.05, 'devices agree with each other');
  for (const device of devices) {
    assert.ok(device.sync.diagnostics().clock.reliable, 'clock measured');
    assert.ok(device.sync.diagnostics().loadLeadSeconds < 1.5, 'clock error was not learned as load latency');
  }
  pass(`four devices with clocks −3.7 s to +12.3 s off and 0.1–1.2 s load latency converge on the same broadcast moment (worst ${Math.round(Math.max(...gaps) * 1000)} ms)`);

  // A stall (buffering, an ad) pushes one device 2 s behind: it catches up.
  const [stalled] = devices;
  stalled.player.seekTo(stalled.player.elapsedSeconds - 2);
  await settle(world, stalled);
  assert.ok(gap(world, stalled) < 0.05, 'stalled device rejoins the broadcast');
  pass('a device that falls 2 s behind seeks back onto the broadcast');

  // Song boundary: each device moves to the next broadcast song at the broadcast position.
  const remaining = truth(world).remainingExactSeconds;
  await world.sleep((remaining + 4) * 1000);
  for (const device of devices) await device.sync.alignOnce();
  for (const device of devices) await settle(world, device, 2);
  const boundaryGaps = devices.map((device) => gap(world, device));
  assert.ok(Math.max(...boundaryGaps) < 0.05, 'devices follow the broadcast across a song boundary');
  pass('across a song boundary every device opens the next broadcast song at the broadcast position, not from 0');

  // Next mid-song explains instead of skipping; an early ending waits for the slot.
  const [first] = devices;
  const before = first.player.activeSongId;
  first.sync.handleChangeSong();
  assert.equal(first.player.activeSongId, before, 'Next mid-song does not skip the broadcast');
  assert.equal(first.toasts.at(-1), 'Live Radio plays the same moment for everyone. Turn off Live to choose another song.');
  first.player.ended = true;
  first.player.playing = false;
  first.sync.handleChangeSong();
  assert.equal(first.player.activeSongId, before, 'an early ending waits for the slot instead of skipping ahead');
  pass('Next/auto-advance mid-slot keeps the broadcast; a recording that ends early waits for its slot');

  // Another mode takes the player: live sync leaves it alone, and stops once Live is off.
  const [, other] = devices;
  other.player.activeSongId = 'nonstop:set-1';
  await world.sleep(3100);
  await other.sync.alignOnce();
  assert.equal(other.player.activeSongId, 'nonstop:set-1', 'a player outside the schedule is not taken over');
  other.leave();
  await other.sync.alignOnce();
  assert.equal(other.sync.active, false, 'sync stops once Live Radio is off');
  pass('live sync never takes over another mode and stops with Live Radio');

  for (const device of devices) device.sync.stop();
}

console.log('live sync tests passed');
