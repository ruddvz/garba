import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  composeHomeLiveResults,
  normaliseHomeMetric,
  normaliseHomeResult,
  normaliseLiveResult,
} from '../../src/pga/app/home-live.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const metric = (value, precision = 'exact', sampled = false) => ({ value, precision, sampled });
const generatedAt = '2026-09-10T06:40:00.000Z';
const dataThrough = '2026-09-10T06:39:30.000Z';

const homeReady = {
  transport: 'ready',
  envelope: {
    status: 'complete',
    generatedAt,
    dataThrough,
    window: {
      from: '2026-09-09T18:30:00.000Z',
      to: '2026-09-10T18:30:00.000Z',
      timezone: 'Asia/Kolkata',
    },
    sources: [
      { name: 'analytics-engine', status: 'complete', sampled: false },
      { name: 'd1-rollups', status: 'complete', sampled: false },
    ],
    data: {
      today: {
        uniqueBrowsers: metric(0),
        sessions: metric(7),
        confirmedPlayStarts: metric(4),
        surfaceViews: metric(11),
      },
      listeningTodayMs: metric(3_900_000),
      lifetime: {
        sessions: metric(120),
        confirmed_play_starts: metric(86),
        surface_views: metric(310),
        listening_ms: metric(75_600_000),
      },
      sessionsDaily: [
        { day: '2026-09-08', value: 5, precision: 'exact', sampled: false, dataThroughMs: 1_757_300_000_000 },
        { day: '2026-09-09', value: 7, precision: 'exact', sampled: false, dataThroughMs: 1_757_386_000_000 },
      ],
    },
  },
};

const liveReady = {
  transport: 'ready',
  envelope: {
    status: 'complete',
    generatedAt,
    dataThrough,
    sources: [{ name: 'analytics-engine-live', status: 'complete', sampled: false }],
    data: {
      liveNow: metric(0),
      listeningNow: metric(0),
      browsingNow: metric(0),
      expirySeconds: 120,
      trendMinutes: 30,
      breakdowns: [
        { surface: 'player', world: 'courtyard', displayMode: 'browser', sessions: metric(3), listeningSessions: metric(2), browsingSessions: metric(1) },
        { surface: 'player', world: 'courtyard', displayMode: 'pwa', sessions: metric(4), listeningSessions: metric(3), browsingSessions: metric(1) },
        { surface: 'explore', world: null, displayMode: 'browser', sessions: metric(3), listeningSessions: metric(0), browsingSessions: metric(3) },
      ],
      trend: [
        { minute: '2026-09-10T06:38:00.000Z', activeSessions: metric(2), listeningSessions: metric(1), browsingSessions: metric(1) },
        { minute: '2026-09-10T06:39:00.000Z', activeSessions: metric(3), listeningSessions: metric(2), browsingSessions: metric(1) },
      ],
    },
  },
};

assert.equal(normaliseHomeMetric(null), null, 'missing metric must not become zero');
assert.equal(normaliseHomeMetric({ value: null }), null, 'null metric value must not become zero');
assert.equal(normaliseHomeMetric({ value: '0' }), null, 'string zero must not silently become numeric zero');
assert.equal(normaliseHomeMetric({ value: -1 }), null, 'negative metric must be rejected');
assert.equal(normaliseHomeMetric(metric(0)).value, 0, 'real numeric zero must stay zero');

const home = normaliseHomeResult(homeReady);
assert.equal(home.state, 'complete');
assert.equal(home.usable, true);
assert.equal(home.today.uniqueBrowsers.value, 0, 'real zero browser count must be preserved');
assert.equal(home.today.sessions.value, 7);
assert.equal(home.listeningTodayMs.value, 3_900_000);
assert.equal(home.lifetime.sessions.value, 120);
assert.equal(home.sessionsDaily.length, 2);
assert.equal(home.window.timezone, 'Asia/Kolkata');
assert.equal(home.dataThrough, dataThrough);

const live = normaliseLiveResult(liveReady);
assert.equal(live.state, 'complete');
assert.equal(live.liveNow.value, 0, 'real zero live sessions must remain zero');
assert.equal(live.expirySeconds, 120);
assert.equal(live.trendMinutes, 30);
assert.equal(live.breakdowns.surface.find((row) => row.label === 'player').metric.value, 7, 'flat privacy-safe Live rows should aggregate by presentation dimension');
assert.equal(live.breakdowns.displayMode.find((row) => row.label === 'browser').metric.value, 6);
assert.equal(live.breakdowns.world.find((row) => row.label === 'courtyard').metric.value, 7);
assert.equal(live.trend.length, 2);
assert.equal(live.trend[1].liveNow.value, 3);
assert.equal(live.trend[1].listeningNow.value, 2);
assert.equal(live.trend[1].browsingNow.value, 1);

const complete = composeHomeLiveResults(homeReady, liveReady);
assert.equal(complete.schemaVersion, 'pga-home-live-ui/v1');
assert.equal(complete.state, 'complete');
assert.equal(complete.home.today.uniqueBrowsers.value, 0);
assert.equal(complete.live.liveNow.value, 0);

const missingLive = composeHomeLiveResults(homeReady, { transport: 'unavailable', envelope: null });
assert.equal(missingLive.state, 'partial', 'usable Home plus missing Live must stay partial');
assert.equal(missingLive.home.today.sessions.value, 7, 'usable Home values must survive Live failure');
assert.equal(missingLive.live.liveNow, null, 'missing Live must remain missing rather than zero');

const missingHome = composeHomeLiveResults({ transport: 'error', envelope: null }, liveReady);
assert.equal(missingHome.state, 'partial', 'usable Live plus failed Home must stay partial');
assert.equal(missingHome.home.today, null);
assert.equal(missingHome.live.liveNow.value, 0);

const auth = composeHomeLiveResults(homeReady, { transport: 'auth-expired', envelope: null });
assert.equal(auth.state, 'auth-expired', 'access expiry must remain blocking even if an older Home source is usable');

const stale = composeHomeLiveResults({
  ...homeReady,
  envelope: { ...homeReady.envelope, status: 'stale' },
}, liveReady);
assert.equal(stale.state, 'stale');
assert.equal(stale.home.today.sessions.value, 7, 'stale evidence should remain inspectable and timestamped');

const invalidHome = normaliseHomeResult({
  transport: 'ready',
  envelope: {
    status: 'complete',
    generatedAt,
    dataThrough,
    data: { today: { sessions: { value: -4, precision: 'exact', sampled: false } } },
  },
});
assert.equal(invalidHome.today.sessions, null, 'invalid negative metric must not become a dashboard value');
assert.equal(invalidHome.usable, false);

const groupedLive = normaliseLiveResult({
  transport: 'ready',
  envelope: {
    status: 'partial',
    generatedAt,
    data: {
      liveNow: metric(3),
      listeningNow: metric(1),
      browsingNow: metric(2),
      breakdowns: { surface: [{ key: 'player', count: 3 }] },
      trend: null,
    },
  },
});
assert.equal(groupedLive.state, 'partial');
assert.equal(groupedLive.breakdowns.surface[0].metric.value, 3, 'legacy/grouped optional breakdown shape remains supported');
assert.equal(groupedLive.trend, null, 'missing optional trend must stay absent, not fake-empty');

assert.deepEqual(
  composeHomeLiveResults(homeReady, liveReady),
  composeHomeLiveResults(homeReady, liveReady),
  'identical inputs must produce deterministic output',
);
assert.equal(Object.isFrozen(complete), true);
assert.equal(Object.isFrozen(complete.home), true);
assert.equal(Object.isFrozen(complete.live), true);

const [clientSource, indexHtml, css] = await Promise.all([
  readFile(path.join(root, 'src/pga/app/home-live.js'), 'utf8'),
  readFile(path.join(root, 'src/pga/app/index.html'), 'utf8'),
  readFile(path.join(root, 'src/pga/app/home-live.css'), 'utf8'),
]);

assert.match(clientSource, /controller\?\.abort\(\)/, 'refresh must abort the previous Home request');
assert.match(clientSource, /const token = \+\+generation/, 'refresh must create a monotonically newer request generation');
assert.match(clientSource, /token !== generation \|\| signal\.aborted/, 'late or aborted responses must not render');
assert.match(clientSource, /Promise\.all\(\[wrap\('\/api\/home'\), wrap\('\/api\/live'\)\]\)/, 'Home must request the two protected sources independently');
assert.doesNotMatch(clientSource, /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\s*\(/, 'Home must not use raw HTML injection primitives');
assert.doesNotMatch(clientSource, /localStorage|sessionStorage|document\.cookie|eval\s*\(/, 'Home module must not add storage, cookie or eval behaviour');

assert.match(indexHtml, /Active sessions, not people/, 'Live now must be labelled as sessions, not people');
assert.match(indexHtml, /Anonymous browser IDs, not people/, 'unique browser copy must not claim unique humans');
assert.equal((indexHtml.match(/home-live\.css/g) || []).length, 1, 'Home stylesheet must be loaded exactly once');
assert.equal((indexHtml.match(/home-live\.js/g) || []).length, 1, 'Home module must be loaded exactly once');
assert.ok(indexHtml.indexOf('./app.js') < indexHtml.indexOf('./home-live.js'), 'existing PGA controller must load before the isolated Home module');

assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/, 'phone Home layout must remain width-bounded');
assert.match(css, /@media \(min-width: 520px\)/, 'Home should progressively expand above phone width');
assert.match(css, /@media \(min-width: 720px\)/, 'Home should have an explicit tablet/desktop layout');
assert.match(css, /@media \(forced-colors: active\)/, 'Home trend styling must retain forced-colours support');
assert.doesNotMatch(css, /100vw|width:\s*[4-9][0-9]{2,}px/, 'Home styles must not introduce fixed viewport-width overflow');

console.log('✓ PGA Home + Live normalisation preserves real zero and missing-data truth');
console.log('✓ Home keeps usable partial sources, privacy-safe Live context and optional trend compatibility');
console.log('✓ Refresh generation/abort guards, no-raw-HTML security and responsive accessibility contracts are present');
