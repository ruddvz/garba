#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import {
  CONSTRAINED_PROFILE,
  deriveServerMetrics,
  medianDeltas,
  parseArgs,
  readServiceWorkerMetadata,
  startFixtureServer,
  summariseSamples,
  usageText,
} from './sw-install-contention-lib.mjs';

const LIFECYCLE_METRICS = [
  'serviceWorkerRegisterCallMs',
  'serviceWorkerRegistrationResolvedMs',
  'serviceWorkerInstalledMs',
  'serviceWorkerActivatingMs',
  'serviceWorkerActivatedMs',
  'serviceWorkerReadyResolvedMs',
  'serviceWorkerControllerChangeMs',
  'serviceWorkerRegisterToInstalledMs',
  'serviceWorkerInstalledToActivatingMs',
  'serviceWorkerActivationDurationMs',
  'serviceWorkerRegisterToReadyMs',
];

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(values, fraction) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const index = Math.min(finite.length - 1, Math.max(0, Math.ceil(finite.length * fraction) - 1));
  return finite[index];
}

function summariseLifecycle(samples) {
  return Object.fromEntries(LIFECYCLE_METRICS.map((key) => {
    const values = samples.map((sample) => sample[key]).filter(Number.isFinite);
    return [key, {
      samples: values.length,
      median: round(percentile(values, 0.5)),
      p75: round(percentile(values, 0.75)),
      min: values.length ? round(Math.min(...values)) : null,
      max: values.length ? round(Math.max(...values)) : null,
    }];
  }));
}

function durationBetween(end, start) {
  return Number.isFinite(end) && Number.isFinite(start) && end >= start ? round(end - start) : null;
}

function deriveLifecycleMetrics(lifecycle) {
  const value = lifecycle || {};
  const registerCallMs = Number.isFinite(value.registerCallMs) ? value.registerCallMs : null;
  const registrationResolvedMs = Number.isFinite(value.registrationResolvedMs) ? value.registrationResolvedMs : null;
  const installedMs = Number.isFinite(value.installedMs) ? value.installedMs : null;
  const activatingMs = Number.isFinite(value.activatingMs) ? value.activatingMs : null;
  const activatedMs = Number.isFinite(value.activatedMs) ? value.activatedMs : null;
  const readyResolvedMs = Number.isFinite(value.readyResolvedMs) ? value.readyResolvedMs : null;
  const controllerChangeMs = Number.isFinite(value.controllerChangeMs) ? value.controllerChangeMs : null;

  return {
    serviceWorkerRegisterCallMs: round(registerCallMs),
    serviceWorkerRegistrationResolvedMs: round(registrationResolvedMs),
    serviceWorkerInstalledMs: round(installedMs),
    serviceWorkerActivatingMs: round(activatingMs),
    serviceWorkerActivatedMs: round(activatedMs),
    serviceWorkerReadyResolvedMs: round(readyResolvedMs),
    serviceWorkerControllerChangeMs: round(controllerChangeMs),
    serviceWorkerRegisterToInstalledMs: durationBetween(installedMs, registerCallMs),
    serviceWorkerInstalledToActivatingMs: durationBetween(activatingMs, installedMs),
    serviceWorkerActivationDurationMs: durationBetween(activatedMs, activatingMs),
    serviceWorkerRegisterToReadyMs: durationBetween(readyResolvedMs, registerCallMs),
  };
}

async function loadChromium() {
  try {
    const { chromium } = await import('@playwright/test');
    return chromium;
  } catch {
    console.error('Missing @playwright/test. Install the temporary repository-standard runner without changing package.json:');
    console.error('  npm install --no-save --no-package-lock @playwright/test@1.55.0');
    console.error('  npx playwright install chromium');
    process.exit(2);
  }
}

async function configureCpuProfile(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CONSTRAINED_PROFILE.cpuThrottleRate });
  return cdp;
}

async function installServiceWorkerLifecycleProbe(context) {
  await context.addInitScript(() => {
    const exposed = 'serviceWorker' in navigator;
    const state = {
      supported: exposed,
      registerWrapped: false,
      registerWrapError: null,
      controllerPresentAtInit: exposed ? Boolean(navigator.serviceWorker.controller) : false,
      registerCallMs: null,
      registerRejectedMs: null,
      registrationResolvedMs: null,
      updateFoundMs: null,
      installingMs: null,
      installedMs: null,
      activatingMs: null,
      activatedMs: null,
      redundantMs: null,
      readyResolvedMs: null,
      controllerChangeMs: null,
      controllerStateAtChange: null,
      events: [],
    };
    Object.defineProperty(window, '__PLAYGARBA_SW_LIFECYCLE__', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: state,
    });
    if (!exposed) return;

    const container = navigator.serviceWorker;
    const observedWorkers = new WeakSet();
    const observedRegistrations = new WeakSet();
    const stamp = (key, detail = null) => {
      const now = performance.now();
      if (!Number.isFinite(state[key])) state[key] = now;
      state.events.push({ type: key, atMs: now, detail });
    };
    const observeWorker = (worker, source) => {
      if (!worker) return;
      const capture = () => {
        const workerState = worker.state;
        const key = `${workerState}Ms`;
        if (Object.prototype.hasOwnProperty.call(state, key) && !Number.isFinite(state[key])) {
          stamp(key, source);
        } else {
          state.events.push({ type: 'workerStateObserved', atMs: performance.now(), detail: `${workerState}:${source}` });
        }
      };
      capture();
      if (observedWorkers.has(worker)) return;
      observedWorkers.add(worker);
      worker.addEventListener('statechange', capture);
    };
    const observeRegistration = (registration, source) => {
      if (!registration) return;
      observeWorker(registration.installing, `${source}:installing`);
      observeWorker(registration.waiting, `${source}:waiting`);
      observeWorker(registration.active, `${source}:active`);
      if (observedRegistrations.has(registration)) return;
      observedRegistrations.add(registration);
      registration.addEventListener('updatefound', () => {
        if (!Number.isFinite(state.updateFoundMs)) stamp('updateFoundMs', source);
        observeWorker(registration.installing, 'updatefound:installing');
      });
    };

    container.addEventListener('controllerchange', () => {
      if (!Number.isFinite(state.controllerChangeMs)) stamp('controllerChangeMs');
      state.controllerStateAtChange = container.controller?.state ?? null;
    });

    container.ready.then((registration) => {
      if (!Number.isFinite(state.readyResolvedMs)) stamp('readyResolvedMs');
      observeRegistration(registration, 'ready');
    }).catch(() => {});

    const originalRegister = container.register.bind(container);
    const instrumentedRegister = (...args) => {
      if (!Number.isFinite(state.registerCallMs)) stamp('registerCallMs', String(args[0] ?? ''));
      let promise;
      try {
        promise = originalRegister(...args);
      } catch (error) {
        if (!Number.isFinite(state.registerRejectedMs)) stamp('registerRejectedMs', String(error?.message || error));
        throw error;
      }
      promise.then((registration) => {
        if (!Number.isFinite(state.registrationResolvedMs)) stamp('registrationResolvedMs', registration?.scope ?? null);
        observeRegistration(registration, 'register-resolved');
      }, (error) => {
        if (!Number.isFinite(state.registerRejectedMs)) stamp('registerRejectedMs', String(error?.message || error));
      });
      return promise;
    };

    try {
      Object.defineProperty(container, 'register', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: instrumentedRegister,
      });
      state.registerWrapped = container.register === instrumentedRegister;
    } catch (error) {
      state.registerWrapError = String(error?.message || error);
    }
  });
}

async function waitForPlayer(page) {
  await page.waitForFunction(() => {
    const title = document.getElementById('songTitle');
    const play = document.getElementById('playButton');
    return Boolean(title?.textContent?.trim() && play?.getBoundingClientRect().width > 0);
  }, null, { timeout: 30_000 });
  return page.evaluate(() => performance.now());
}

async function waitForCatalogue(page) {
  await page.waitForFunction(() => window.GARBA_CATALOGUE_READY === true, null, { timeout: 60_000 });
  return page.evaluate(() => performance.now());
}

async function collectServiceWorkerState(page, scenario) {
  if (scenario === 'allowed') {
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return;
      await Promise.race([
        navigator.serviceWorker.ready.catch(() => null),
        new Promise((resolve) => setTimeout(resolve, 60_000)),
      ]);
    });
  } else {
    await page.waitForTimeout(500);
  }

  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) {
      return {
        supported: false,
        registrationCount: 0,
        ready: false,
        readyMs: null,
        controller: false,
        states: [],
        cacheKeys: [],
        lifecycle: window.__PLAYGARBA_SW_LIFECYCLE__ || null,
      };
    }

    let registrations = [];
    try { registrations = await navigator.serviceWorker.getRegistrations(); }
    catch { registrations = []; }

    let ready = false;
    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(null), 50)),
      ]);
      ready = Boolean(registration?.active);
    } catch {
      ready = false;
    }

    let cacheKeys = [];
    try { cacheKeys = await caches.keys(); }
    catch { cacheKeys = []; }

    const lifecycle = window.__PLAYGARBA_SW_LIFECYCLE__
      ? JSON.parse(JSON.stringify(window.__PLAYGARBA_SW_LIFECYCLE__))
      : null;

    return {
      supported: true,
      registrationCount: registrations.length,
      ready,
      readyMs: lifecycle?.readyResolvedMs ?? (ready ? performance.now() : null),
      controller: Boolean(navigator.serviceWorker.controller),
      states: registrations.map((registration) => ({
        scope: registration.scope,
        installing: registration.installing?.state ?? null,
        waiting: registration.waiting?.state ?? null,
        active: registration.active?.state ?? null,
      })),
      cacheKeys,
      lifecycle,
    };
  });
}

async function collectBrowserTiming(page, playerReadyMs, catalogueReadyMs) {
  return page.evaluate(({ playerReady, catalogueReady }) => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const songs = performance.getEntriesByType('resource').find((entry) => {
      try { return new URL(entry.name).pathname === '/data/songs.json'; }
      catch { return false; }
    });
    const resources = performance.getEntriesByType('resource').filter((entry) => {
      try { return new URL(entry.name).origin === location.origin; }
      catch { return false; }
    });
    const sum = (entries, key) => entries.reduce((total, entry) => total + (Number(entry[key]) || 0), 0);
    const songsResponseEndMs = Number.isFinite(songs?.responseEnd) ? songs.responseEnd : null;
    return {
      timeOriginMs: performance.timeOrigin,
      playerReadyMs: playerReady,
      domContentLoadedMs: navigation?.domContentLoadedEventEnd || null,
      loadEventMs: navigation?.loadEventEnd || null,
      catalogueReadyMs: catalogueReady,
      songsStartMs: Number.isFinite(songs?.startTime) ? songs.startTime : null,
      songsResponseEndMs,
      catalogueHydrationAfterSongsResponseMs: Number.isFinite(catalogueReady) && Number.isFinite(songsResponseEndMs)
        ? Math.max(0, catalogueReady - songsResponseEndMs)
        : null,
      resourceTimingCount: resources.length,
      resourceTimingTransferBytes: sum(resources, 'transferSize'),
    };
  }, { playerReady: playerReadyMs, catalogueReady: catalogueReadyMs });
}

function lifecycleOrderFailures(lifecycle) {
  const failures = [];
  const ordered = [
    ['registerCallMs', lifecycle?.registerCallMs],
    ['registrationResolvedMs', lifecycle?.registrationResolvedMs],
    ['installedMs', lifecycle?.installedMs],
    ['activatingMs', lifecycle?.activatingMs],
    ['activatedMs', lifecycle?.activatedMs],
    ['readyResolvedMs', lifecycle?.readyResolvedMs],
  ].filter(([, value]) => Number.isFinite(value));
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index][1] < ordered[index - 1][1]) {
      failures.push(`service-worker lifecycle order invalid: ${ordered[index][0]} < ${ordered[index - 1][0]}`);
    }
  }
  return failures;
}

function sampleValidity(sample, swMetadata) {
  const failures = [...sample.failures];
  for (const statusFailure of sample.server.statusFailures) {
    failures.push(`fixture http ${statusFailure.status}: ${statusFailure.path}`);
  }
  if (!Number.isFinite(sample.playerReadyMs)) failures.push('player-ready milestone missing');
  if (!Number.isFinite(sample.catalogueReadyMs)) failures.push('full-catalogue milestone missing');
  if (sample.scenario === 'allowed') {
    if (sample.server.serviceWorkerScriptRequestCount < 1) failures.push('allowed sample did not request /sw.js');
    if (sample.serviceWorker.registrationCount < 1) failures.push('allowed sample has no service-worker registration');
    if (!sample.serviceWorker.ready) failures.push('allowed sample did not reach an active service worker');
    if (swMetadata.cacheName && !sample.serviceWorker.cacheKeys.includes(swMetadata.cacheName)) {
      failures.push(`allowed sample did not activate expected cache ${swMetadata.cacheName}`);
    }
    const lifecycle = sample.serviceWorker.lifecycle;
    if (!lifecycle?.registerWrapped) failures.push(`service-worker lifecycle register probe unavailable${lifecycle?.registerWrapError ? `: ${lifecycle.registerWrapError}` : ''}`);
    for (const key of ['registerCallMs', 'registrationResolvedMs', 'installedMs', 'activatingMs', 'activatedMs', 'readyResolvedMs']) {
      if (!Number.isFinite(lifecycle?.[key])) failures.push(`service-worker lifecycle milestone missing: ${key}`);
    }
    failures.push(...lifecycleOrderFailures(lifecycle));
    if (sample.serviceWorker.controller && !lifecycle?.controllerPresentAtInit && !Number.isFinite(lifecycle?.controllerChangeMs)) {
      failures.push('service-worker controller is present but controller acquisition was not observed');
    }
  } else if (sample.serviceWorker.registrationCount !== 0) {
    failures.push(`blocked sample unexpectedly has ${sample.serviceWorker.registrationCount} service-worker registration(s)`);
  }
  return [...new Set(failures)];
}

async function measureSample(browser, fixture, origin, scenario, pair, order, swMetadata) {
  const sampleId = `pair-${pair}-${scenario}`;
  fixture.beginSample(sampleId);

  const context = await browser.newContext({
    ...CONSTRAINED_PROFILE.context,
    serviceWorkers: scenario === 'allowed' ? 'allow' : 'block',
  });
  await installServiceWorkerLifecycleProbe(context);
  const page = await context.newPage();
  const cdp = await configureCpuProfile(page);
  const failures = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin === new URL(origin).origin) {
        failures.push(`requestfailed: ${request.method()} ${url.pathname}${url.search} ${request.failure()?.errorText || ''}`.trim());
      }
    } catch {
      // Ignore malformed/non-URL request values.
    }
  });

  let playerReadyMs = null;
  let catalogueReadyMs = null;
  let browserTiming = {
    timeOriginMs: null,
    playerReadyMs: null,
    loadEventMs: null,
    catalogueReadyMs: null,
    songsResponseEndMs: null,
    catalogueHydrationAfterSongsResponseMs: null,
  };
  let serviceWorker = {
    supported: false,
    registrationCount: 0,
    ready: false,
    readyMs: null,
    controller: false,
    states: [],
    cacheKeys: [],
    lifecycle: null,
  };

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    try { playerReadyMs = await waitForPlayer(page); }
    catch (error) { failures.push(`player-ready: ${error.message}`); }
    try { catalogueReadyMs = await waitForCatalogue(page); }
    catch (error) { failures.push(`catalogue-ready: ${error.message}`); }
    await page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
    serviceWorker = await collectServiceWorkerState(page, scenario);
    await fixture.waitForIdle(20_000);
    browserTiming = await collectBrowserTiming(page, playerReadyMs, catalogueReadyMs);
  } finally {
    await cdp.detach().catch(() => {});
    await context.close().catch(() => {});
    await fixture.waitForIdle(20_000);
  }

  const rawServer = fixture.endSample(sampleId);
  const server = deriveServerMetrics(rawServer, swMetadata, browserTiming);
  const lifecycleMetrics = deriveLifecycleMetrics(serviceWorker.lifecycle);
  const sample = {
    sampleId,
    pair,
    order,
    scenario,
    browserContextIsolated: true,
    serviceWorkerMode: scenario === 'allowed' ? 'allow' : 'block',
    playerReadyMs: browserTiming.playerReadyMs,
    domContentLoadedMs: browserTiming.domContentLoadedMs,
    loadEventMs: browserTiming.loadEventMs,
    catalogueReadyMs: browserTiming.catalogueReadyMs,
    songsStartMs: browserTiming.songsStartMs,
    songsResponseEndMs: browserTiming.songsResponseEndMs,
    catalogueHydrationAfterSongsResponseMs: browserTiming.catalogueHydrationAfterSongsResponseMs,
    resourceTimingCount: browserTiming.resourceTimingCount,
    resourceTimingTransferBytes: browserTiming.resourceTimingTransferBytes,
    serviceWorkerReadyMs: serviceWorker.readyMs,
    ...lifecycleMetrics,
    serviceWorker,
    serverRequestCount: server.serverRequestCount,
    serverResponseBytes: server.serverResponseBytes,
    uniqueRequestPathCount: server.uniqueRequestPathCount,
    coreShellRequestCount: server.coreShellRequestCount,
    coreShellResponseBytes: server.coreShellResponseBytes,
    postLoadPreCatalogueRequestCount: server.postLoadPreCatalogueRequestCount,
    peakInFlightRequests: server.peakInFlightRequests,
    server,
    consoleErrors,
    failures,
  };
  sample.validityFailures = sampleValidity(sample, swMetadata);
  sample.valid = sample.validityFailures.length === 0;
  return sample;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usageText());
    return;
  }

  const chromium = await loadChromium();
  const swMetadata = await readServiceWorkerMetadata(options.root);
  const fixture = await startFixtureServer(options.root, options.host, options.port, CONSTRAINED_PROFILE.network);
  const browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  const samples = [];

  try {
    for (let pair = 1; pair <= options.runs; pair += 1) {
      const order = pair % 2 === 1 ? ['blocked', 'allowed'] : ['allowed', 'blocked'];
      for (let index = 0; index < order.length; index += 1) {
        const scenario = order[index];
        const sample = await measureSample(browser, fixture, fixture.origin, scenario, pair, index + 1, swMetadata);
        samples.push(sample);
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await fixture.close().catch(() => {});
  }

  const allowed = samples.filter((sample) => sample.scenario === 'allowed' && sample.valid);
  const blocked = samples.filter((sample) => sample.scenario === 'blocked' && sample.valid);
  const allowedSummary = summariseSamples(allowed);
  const blockedSummary = summariseSamples(blocked);
  const validityFailures = samples.flatMap((sample) => sample.validityFailures.map((failure) => `${sample.sampleId}: ${failure}`));
  if (allowed.length !== options.runs) validityFailures.push(`valid allowed samples ${allowed.length}/${options.runs}`);
  if (blocked.length !== options.runs) validityFailures.push(`valid blocked samples ${blocked.length}/${options.runs}`);

  const report = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    testedRevision: process.env.PLAYGARBA_TESTED_REVISION || null,
    browser: {
      name: 'chromium',
      version: browserVersion,
      playwright: '1.55.0 expected',
    },
    fixture: {
      root: options.root,
      cachePolicy: 'public, max-age=0, must-revalidate with deterministic ETag',
      serviceWorkerCacheName: swMetadata.cacheName,
      coreShellEntryCount: swMetadata.coreShellEntryCount,
      serviceWorkerScript: '/sw.js',
      networkEnforcement: fixture.networkEnforcement,
    },
    profile: CONSTRAINED_PROFILE,
    experiment: {
      pairs: options.runs,
      sampleCount: samples.length,
      order: samples.map((sample) => ({ sampleId: sample.sampleId, scenario: sample.scenario, pair: sample.pair, order: sample.order })),
      browserCpuThrottleAppliedToPageTarget: true,
      networkThrottleAppliedAtSharedOrigin: true,
      networkThrottleAppliesToServiceWorkerRequests: true,
      lifecycleProbe: 'page-init wrapper returns the original navigator.serviceWorker.register promise unchanged and observes exposed registration/worker/controller state transitions only',
      providerPlaybackInitiated: false,
      blockedScenarioMeaning: 'upper-bound comparison against zero service-worker registration/install work; not the expected benefit of any specific production deferral',
      performanceBudgetApplied: false,
      reasonNoPerformanceBudget: 'baseline distributions are evidence for a later materiality decision; CI fails only when the experiment itself is invalid',
    },
    result: {
      valid: validityFailures.length === 0,
      validityFailures: [...new Set(validityFailures)],
      allowedSummary,
      blockedSummary,
      lifecycleSummary: {
        allowed: summariseLifecycle(allowed),
        blocked: summariseLifecycle(blocked),
      },
      medianDeltaAllowedMinusBlocked: medianDeltas(allowedSummary, blockedSummary),
      materialityDetermined: false,
    },
    samples,
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(json);
  if (options.output) await writeFile(options.output, json, 'utf8');
  if (!report.result.valid) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
