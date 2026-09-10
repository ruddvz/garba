#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import {
  DEFAULT_BUDGETS,
  SESSION_PROFILES,
  attachNetworkAccounting,
  collectSessionSnapshot,
  compactSnapshot,
  evaluateSessionBudgets,
  exerciseExploreRoundTrip,
  exercisePlayerCycle,
  installSessionInstrumentation,
  makeNetworkState,
  parseSessionArgs,
  resetSessionTransientMetrics,
  usageText,
} from './session-stability-lib.mjs';

async function loadChromium() {
  try {
    const { chromium } = await import('@playwright/test');
    return chromium;
  } catch {
    console.error('Missing @playwright/test. Use the repository-standard temporary runner without changing package.json:');
    console.error('  npm install --no-save --no-package-lock @playwright/test@1.55.0');
    console.error('  npx playwright install chromium');
    process.exit(2);
  }
}

function attachRuntimeFailureCapture(page, originValue, failures, expectedCancellations) {
  const onPageError = (error) => failures.push(`pageerror: ${error.message}`);
  const onConsole = (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('ERR_INTERNET_DISCONNECTED')) return;
    try {
      const sourceUrl = message.location()?.url;
      if (sourceUrl && new URL(sourceUrl).origin !== originValue) return;
    } catch {
      // Keep an unparseable same-document console error rather than hiding it.
    }
    failures.push(`console: ${text}`);
  };
  const onRequestFailed = (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin !== originValue) return;
      if (url.searchParams.get('session-soak') === 'offline') return;
      const failure = request.failure()?.errorText || '';
      const detail = `${request.method()} ${url.pathname}${url.search} ${failure}`.trim();
      if (failure.includes('ERR_ABORTED')) {
        // Rapid selection and navigation are required soak journeys. Chromium reports
        // correctly superseded requests as ERR_ABORTED; preserve them as cancellation
        // evidence rather than silently ignoring them or calling them runtime failures.
        expectedCancellations.push(detail);
        return;
      }
      failures.push(`requestfailed: ${detail}`);
    } catch {
      // Ignore malformed/non-URL request values.
    }
  };
  const onResponse = (response) => {
    try {
      const url = new URL(response.url());
      if (url.origin === originValue && response.status() >= 400) {
        failures.push(`http ${response.status()}: ${url.pathname}${url.search}`);
      }
    } catch {
      // Ignore malformed/non-URL response values.
    }
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);
  return () => {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  };
}

async function waitForPlayer(page, origin) {
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() => {
    const title = document.getElementById('songTitle');
    const play = document.getElementById('playButton');
    return Boolean(title?.textContent?.trim() && play?.getBoundingClientRect().width);
  }, null, { timeout: 20_000 });

  const catalogueReady = await page.waitForFunction(() => window.GARBA_CATALOGUE_READY === true, null, { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  return { catalogueReady };
}

async function configureCdp(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable').catch(() => {});
  await cdp.send('Network.enable').catch(() => {});
  return cdp;
}

function uniqueFailures(failures) {
  return [...new Set(failures)];
}

function classifyBoundedWarmup(snapshots, failures, budgets = DEFAULT_BUDGETS) {
  const observations = [];
  const remainingFailures = failures.filter((failure) => {
    if (failure.code !== 'document-growth') return true;

    const tail = snapshots
      .slice(-4)
      .map((sample) => sample.browser.documents)
      .filter(Number.isFinite);
    if (tail.length < 4) return true;

    const tailRange = Math.max(...tail) - Math.min(...tail);
    if (tailRange > budgets.documentGrowth) return true;

    observations.push({
      code: 'bounded-document-warmup',
      initialGrowth: failure.growth,
      finalFourDocuments: tail,
      tailRange,
      budget: budgets.documentGrowth,
      message: `renderer document counters warmed up by +${failure.growth} but stabilized across the final four player snapshots (${tail.join(' → ')})`,
    });
    return false;
  });

  return { failures: remainingFailures, observations };
}

function coverageFailures(boot, journeys, exploreJourneys) {
  const failures = [];
  if (!boot?.catalogueReady) {
    failures.push({ code: 'catalogue-not-ready', message: 'Full catalogue did not become ready before the warm-session soak.' });
  }
  if (!journeys.some((journey) => journey.genres?.clicks > 0)) {
    failures.push({ code: 'genre-coverage-missing', message: 'No genre switch completed during the player soak.' });
  }
  if (!journeys.some((journey) => journey.search?.status === 'exercised')) {
    failures.push({ code: 'search-coverage-missing', message: 'Search was not exercised during the player soak.' });
  }
  if (!journeys.some((journey) => journey.queueAndFavourites?.queue === 'opened')) {
    failures.push({ code: 'queue-coverage-missing', message: 'Queue was not opened during the player soak.' });
  }
  if (!journeys.some((journey) => journey.nonstop?.status === 'exercised')) {
    failures.push({ code: 'nonstop-coverage-missing', message: 'Nonstop chooser was not exercised during the player soak.' });
  }
  if (!journeys.some((journey) => journey.atmosphere?.status === 'exercised')) {
    failures.push({ code: 'atmosphere-coverage-missing', message: 'Garba Atmosphere was not exercised during the player soak.' });
  }
  const finalJourney = journeys.at(-1);
  if (finalJourney?.offlineRecovery !== 'recovered') {
    failures.push({ code: 'offline-recovery-missing', message: `Offline recovery result was ${finalJourney?.offlineRecovery || 'missing'}.` });
  }
  if (!exploreJourneys.length || exploreJourneys.some((journey) => !journey.entered || !journey.returnedToPlayer)) {
    failures.push({ code: 'explore-roundtrip-failed', message: 'Explore did not complete a post-soak enter-and-return round trip.' });
  }
  return failures;
}

async function main() {
  const options = parseSessionArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usageText());
    return;
  }

  const chromium = await loadChromium();
  const profile = SESSION_PROFILES[options.profile];
  const browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  const runtimeFailures = [];
  const expectedCancellations = [];
  const journeys = [];
  const exploreJourneys = [];
  const snapshots = [];

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    serviceWorkers: 'allow',
  });
  await context.addInitScript(installSessionInstrumentation);

  const page = await context.newPage();
  const cdp = await configureCdp(page);
  const networkState = makeNetworkState(options.originValue);
  const detachNetworkAccounting = attachNetworkAccounting(page, networkState);
  const detachRuntimeFailures = attachRuntimeFailureCapture(page, options.originValue, runtimeFailures, expectedCancellations);

  let boot = null;
  try {
    boot = await waitForPlayer(page, options.origin);
    await page.waitForTimeout(profile.settleMs);
    snapshots.push(await collectSessionSnapshot(page, cdp, 'baseline-warm', networkState));
    await resetSessionTransientMetrics(page);

    for (let cycle = 0; cycle < options.cycles; cycle += 1) {
      journeys.push(await exercisePlayerCycle(page, cdp, options, cycle));
      await page.waitForTimeout(profile.settleMs);
      snapshots.push(await collectSessionSnapshot(page, cdp, `cycle-${cycle + 1}`, networkState));
    }

    await page.waitForTimeout(profile.postGcSettleMs);
    snapshots.push(await collectSessionSnapshot(page, cdp, 'final-player-settled', networkState));

    // Navigation intentionally runs after the memory-growth budget phase. A full route
    // navigation creates a new document and would otherwise reset the very listener,
    // observer and object-URL state this soak is designed to measure.
    for (let round = 0; round < profile.exploreRounds; round += 1) {
      exploreJourneys.push(await exerciseExploreRoundTrip(page, options.origin, round));
    }
  } finally {
    detachRuntimeFailures();
    detachNetworkAccounting();
    await cdp.detach().catch(() => {});
    await context.close();
    await browser.close();
  }

  const dedupedRuntimeFailures = uniqueFailures(runtimeFailures);
  const dedupedExpectedCancellations = uniqueFailures(expectedCancellations);
  const evaluatedGrowthFailures = evaluateSessionBudgets(snapshots, dedupedRuntimeFailures, options.cycles, DEFAULT_BUDGETS);
  const boundedWarmup = classifyBoundedWarmup(snapshots, evaluatedGrowthFailures, DEFAULT_BUDGETS);
  const journeyFailures = coverageFailures(boot, journeys, exploreJourneys);
  const budgetFailures = [...boundedWarmup.failures, ...journeyFailures];
  const baseline = snapshots[0] || null;
  const final = snapshots.at(-1) || null;

  const report = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    testedRevision: process.env.PLAYGARBA_TESTED_REVISION || null,
    target: options.origin,
    profile: options.profile,
    cycles: options.cycles,
    browser: {
      name: 'chromium',
      version: browserVersion,
      playwright: '1.55.0 expected',
      viewport: { width: 1280, height: 800 },
    },
    measurementBoundary: {
      productionInstrumentationChanged: false,
      productionEquivalentFixtureRequired: true,
      harnessInstrumentation: 'context.addInitScript test-only counters plus Chromium CDP Memory/Performance metrics',
      budgetPhaseNavigation: 'none; one player document remains alive for every measured cycle',
      exploreNavigation: 'exercised only after the final player snapshot and excluded from player memory-growth deltas',
      detachedDomNodesDirectlyMeasured: false,
      detachedDomBoundary: 'Chromium aggregate document/node/listener counters are recorded; detached-node claims require a heap-snapshot diagnostic and are not fabricated.',
      browserWideTimerCountClaimed: false,
      browserWideListenerCountClaimed: false,
      playGarbaOwnedIntervalsInstrumented: true,
      playGarbaConstructedObserversInstrumented: true,
      playGarbaConstructedAudioContextsInstrumented: true,
      objectUrlsInstrumented: true,
      longTasksObservedWhereSupported: true,
      sameOriginTransferBytes: 'Resource Timing transferSize, not Content-Length',
      abortedRequestHandling: 'same-origin net::ERR_ABORTED requests are reported separately as expected cancellation evidence; all other request failures remain blocking runtime failures',
      serviceWorkers: 'allowed',
      providerPlaybackMayBeRequestedByJourney: true,
      thirdPartyTransferBytesIncluded: false,
    },
    boot: {
      fullCatalogueReadyBeforeSoak: Boolean(boot?.catalogueReady),
    },
    budgets: DEFAULT_BUDGETS,
    result: {
      passed: budgetFailures.length === 0,
      budgetFailures,
      runtimeFailures: dedupedRuntimeFailures,
      expectedRequestCancellations: dedupedExpectedCancellations,
      boundedWarmupObservations: boundedWarmup.observations,
    },
    baseline: baseline ? compactSnapshot(baseline) : null,
    final: final ? compactSnapshot(final) : null,
    trend: snapshots.map(compactSnapshot),
    journeys,
    exploreJourneys,
    snapshots,
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(json);
  if (options.output) await writeFile(options.output, json, 'utf8');

  if (options.failOnBudget && budgetFailures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
