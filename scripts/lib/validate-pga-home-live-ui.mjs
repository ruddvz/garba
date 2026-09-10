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
    status: 'complete', generatedAt, dataThrough,
    window: { from: '2026-09-09T18:30:00.000Z', to: '2026-09-10T18:30:00.000Z', timezone: 'Asia/Kolkata' },
    sources: [{ name: 'analytics-engine', status: 'complete', sampled: false }],
    data: {
      today: {
        uniqueBrowsers: metric(0), sessions: metric(7), confirmedPlayStarts: metric(4), surfaceViews: metric(11),
      },
      listeningTodayMs: metric(3_900_000),
      lifetime: {
        sessions: metric(120), confirmed_play_starts: metric(86), surface_views: metric(310), listening_ms: metric(75_600_000),
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
    status: 'complete', generatedAt, dataThrough,
    sources: [{ name: 'analytics-engine-live', status: 'complete', sampled: false }],
    data: {
      liveNow: metric(0), listeningNow: metric(0), browsingNow: metric(0), expirySeconds: 120, trendMinutes: 30,
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

assert.equal(normaliseHomeMetric(null), null);
assert.equal(normaliseHomeMetric({ value: null }), null, 'null must not become zero');
assert.equal(normaliseHomeMetric({ value: '0' }), null, 'numeric strings must not be coerced');
assert.equal(normaliseHomeMetric({ value: -1 }), null, 'negative metrics must be rejected');
assert.equal(normaliseHomeMetric(metric(0)).value, 0, 'real numeric zero must survive');

const home = normaliseHomeResult(homeReady);
assert.equal(home.state, 'complete');
assert.equal(home.usable, true);
assert.equal(home.today.uniqueBrowsers.value, 0);
assert.equal(home.today.sessions.value, 7);
assert.equal(home.listeningTodayMs.value, 3_900_000);
assert.equal(home.lifetime.sessions.value, 120);
assert.equal(home.sessionsDaily.length, 2);
assert.equal(home.window.timezone, 'Asia/Kolkata');

const live = normaliseLiveResult(liveReady);
assert.equal(live.state, 'complete');
assert.equal(live.liveNow.value, 0);
assert.equal(live.expirySeconds, 120);
assert.equal(live.trendMinutes, 30);
assert.equal(live.breakdowns.surface.find((row) => row.label === 'player').metric.value, 7);
assert.equal(live.breakdowns.displayMode.find((row) => row.label === 'browser').metric.value, 6);
assert.equal(live.breakdowns.world.find((row) => row.label === 'courtyard').metric.value, 7);
assert.equal(live.trend[1].liveNow.value, 3);
assert.equal(live.trend[1].listeningNow.value, 2);
assert.equal(live.trend[1].browsingNow.value, 1);

const complete = composeHomeLiveResults(homeReady, liveReady);
assert.equal(complete.schemaVersion, 'pga-home-live-ui/v1');
assert.equal(complete.state, 'complete');
assert.equal(complete.home.today.uniqueBrowsers.value, 0);
assert.equal(complete.live.liveNow.value, 0);

const missingLive = composeHomeLiveResults(homeReady, { transport: 'unavailable', envelope: null });
assert.equal(missingLive.state, 'partial');
assert.equal(missingLive.home.today.sessions.value, 7);
assert.equal(missingLive.live.liveNow, null, 'missing Live must remain unavailable');

const missingHome = composeHomeLiveResults({ transport: 'error', envelope: null }, liveReady);
assert.equal(missingHome.state, 'partial');
assert.equal(missingHome.home.today, null);
assert.equal(missingHome.live.liveNow.value, 0);

assert.equal(composeHomeLiveResults(homeReady, { transport: 'auth-expired', envelope: null }).state, 'auth-expired');
assert.equal(composeHomeLiveResults({ ...homeReady, envelope: { ...homeReady.envelope, status: 'stale' } }, liveReady).state, 'stale');

const invalidHome = normaliseHomeResult({
  transport: 'ready',
  envelope: { status: 'complete', generatedAt, data: { today: { sessions: { value: -4, precision: 'exact', sampled: false } } } },
});
assert.equal(invalidHome.today.sessions, null);
assert.equal(invalidHome.usable, false);

const groupedLive = normaliseLiveResult({
  transport: 'ready',
  envelope: { status: 'partial', generatedAt, data: { liveNow: metric(3), listeningNow: metric(1), browsingNow: metric(2), breakdowns: { surface: [{ key: 'player', count: 3 }] }, trend: null } },
});
assert.equal(groupedLive.state, 'partial');
assert.equal(groupedLive.breakdowns.surface[0].metric.value, 3);
assert.equal(groupedLive.trend, null);
assert.deepEqual(composeHomeLiveResults(homeReady, liveReady), composeHomeLiveResults(homeReady, liveReady));
assert.equal(Object.isFrozen(complete), true);
assert.equal(Object.isFrozen(complete.home), true);
assert.equal(Object.isFrozen(complete.live), true);

const [clientSource, indexHtml, css] = await Promise.all([
  readFile(path.join(root, 'src/pga/app/home-live.js'), 'utf8'),
  readFile(path.join(root, 'src/pga/app/index.html'), 'utf8'),
  readFile(path.join(root, 'src/pga/app/home-live.css'), 'utf8'),
]);

assert.match(clientSource, /controller\?\.abort\(\)/, 'refresh must abort the previous Home request');
assert.match(clientSource, /const token = \+\+generation/, 'refresh must create a newer request generation');
assert.match(clientSource, /token !== generation \|\| signal\.aborted/, 'late responses must not render');
assert.match(clientSource, /Promise\.all\(\[wrap\('\/api\/home'\), wrap\('\/api\/live'\)\]\)/, 'Home must request protected sources independently');
assert.match(clientSource, /mountHomeLive\(\{ autoLoad: !fixtureAllowed \}\)/, 'static localhost shell fixtures must not make unavailable backend requests');
assert.match(clientSource, /if \(autoLoad && isActive\(\)\) load/, 'non-Home deep links must not eagerly request Home analytics');
assert.doesNotMatch(clientSource, /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write\s*\(/, 'Home must avoid raw HTML injection');
assert.doesNotMatch(clientSource, /localStorage|sessionStorage|document\.cookie|eval\s*\(/, 'Home must not add storage, cookie or eval behaviour');

assert.match(indexHtml, /Active sessions, not people/);
assert.match(indexHtml, /Anonymous browser IDs, not people/);
assert.equal((indexHtml.match(/home-live\.css/g) || []).length, 1);
assert.equal((indexHtml.match(/home-live\.js/g) || []).length, 1);
assert.ok(indexHtml.indexOf('./app.js') < indexHtml.indexOf('./home-live.js'));

assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.match(css, /@media \(min-width: 520px\)/);
assert.match(css, /@media \(min-width: 720px\)/);
assert.match(css, /@media \(forced-colors: active\)/);
assert.doesNotMatch(css, /100vw/, 'Home styles must not use viewport width');
assert.doesNotMatch(css, /(?:^|\n)\s*width:\s*(?:[4-9]\d{2,}|\d{4,})px\b/m, 'Home styles must not introduce large fixed element widths');

console.log('✓ PGA Home + Live preserves real zero, missing-data truth and partial-source visibility');
console.log('✓ Current and richer Live breakdown/trend contracts normalise deterministically');
console.log('✓ Refresh cancellation, lazy active-view loading, fixture safety and no-raw-HTML guards pass');
