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
  exerciseSessionCycle,
  installSessionInstrumentation,
  makeNetworkState,
  parseSessionArgs,
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

function attachRuntimeFailureCapture(page, originValue, failures) {
  const onPageError = (error) => failures.push(`pageerror: ${error.message}`);
  const onConsole = (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  };
  const onRequestFailed = (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin !== originValue) return;
      const failure = request.failure()?.errorText || '';
      if (url.searchParams.get('session-soak') === 'offline') return;
      failures.push(`requestfailed: ${request.method()} ${url.pathname}${url.search} ${failure}`);
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
  const journeys = [];
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
  const detachRuntimeFailures = attachRuntimeFailureCapture(page, options.originValue, runtimeFailures);

  let boot;
  try {
    boot = await waitForPlayer(page, options.origin);
    await page.waitForTimeout(profile.settleMs);
    snapshots.push(await collectSessionSnapshot(page, cdp, 'baseline-warm', networkState));

    for (let cycle = 0; cycle < options.cycles; cycle += 1) {
      const journey = await exerciseSessionCycle(page, cdp, options, cycle);
      journeys.push(journey);
      await page.waitForTimeout(profile.settleMs);
      snapshots.push(await collectSessionSnapshot(page, cdp, `cycle-${cycle + 1}`, networkState));
    }

    await page.waitForTimeout(profile.postGcSettleMs);
    snapshots.push(await collectSessionSnapshot(page, cdp, 'final-settled', networkState));
  } finally {
    detachRuntimeFailures();
    detachNetworkAccounting();
    await cdp.detach().catch(() => {});
    await context.close();
    await browser.close();
  }

  const dedupedRuntimeFailures = uniqueFailures(runtimeFailures);
  const budgetFailures = evaluateSessionBudgets(snapshots, dedupedRuntimeFailures, DEFAULT_BUDGETS);
  const baseline = snapshots[0] || null;
  const final = snapshots.at(-1) || null;

  const report = {
    schemaVersion: 1,
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
      harnessInstrumentation: 'addInitScript test-only counters plus Chromium CDP Memory/Performance metrics',
      detachedDomNodesDirectlyMeasured: false,
      detachedDomBoundary: 'Chromium CDP exposes aggregate document/node/listener counters here; detached-node claims require a heap-snapshot diagnostic and are not fabricated.',
      browserWideTimerCountClaimed: false,
      browserWideListenerCountClaimed: false,
      playGarbaOwnedIntervalsInstrumented: true,
      playGarbaConstructedObserversInstrumented: true,
      objectUrlsInstrumented: true,
      longTasksObservedWhereSupported: true,
      sameOriginNetworkAccounted: true,
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
    },
    baseline: baseline ? compactSnapshot(baseline) : null,
    final: final ? compactSnapshot(final) : null,
    trend: snapshots.map(compactSnapshot),
    journeys,
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
