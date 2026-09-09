export const DEFAULT_ORIGIN = 'http://127.0.0.1:4173';

export const SESSION_PROFILES = Object.freeze({
  ci: Object.freeze({
    cycles: 6,
    settleMs: 350,
    postGcSettleMs: 250,
  }),
  diagnostic: Object.freeze({
    cycles: 30,
    settleMs: 500,
    postGcSettleMs: 500,
  }),
});

export const DEFAULT_BUDGETS = Object.freeze({
  domNodeGrowth: 220,
  documentGrowth: 1,
  jsEventListenerGrowth: 80,
  heapGrowthBytes: 16 * 1024 * 1024,
  liveIntervalGrowth: 4,
  liveObserverGrowth: 8,
  activeObjectUrlGrowth: 2,
  mediaElementGrowth: 2,
  iframeGrowth: 1,
  warmRequestGrowthPerCycle: 60,
  backgroundLibraryUniqueGrowth: 3,
  longTaskMaxMs: 500,
  runtimeErrors: 0,
});

export function parseSessionArgs(argv) {
  const options = {
    origin: DEFAULT_ORIGIN,
    profile: 'ci',
    cycles: null,
    output: null,
    failOnBudget: true,
  };

  for (const argument of argv) {
    if (argument === '--help') {
      options.help = true;
      continue;
    }
    if (argument === '--no-fail') {
      options.failOnBudget = false;
      continue;
    }
    const [key, ...parts] = argument.split('=');
    const value = parts.join('=');
    if (key === '--origin' && value) options.origin = value;
    else if (key === '--profile' && value) options.profile = value;
    else if (key === '--cycles' && value) options.cycles = Number.parseInt(value, 10);
    else if (key === '--output' && value) options.output = value;
    else throw new Error(`Unknown or incomplete argument: ${argument}`);
  }

  if (!SESSION_PROFILES[options.profile]) {
    throw new Error(`--profile must be one of: ${Object.keys(SESSION_PROFILES).join(', ')}`);
  }
  if (options.cycles !== null && (!Number.isInteger(options.cycles) || options.cycles < 2 || options.cycles > 100)) {
    throw new Error('--cycles must be an integer from 2 to 100');
  }

  const parsedOrigin = new URL(options.origin);
  if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
    throw new Error('--origin must use http or https');
  }
  parsedOrigin.hash = '';
  parsedOrigin.search = '';
  options.origin = parsedOrigin.href;
  options.originValue = parsedOrigin.origin;
  options.cycles ??= SESSION_PROFILES[options.profile].cycles;
  return options;
}

export function usageText() {
  return `Usage: node scripts/performance/measure-session-stability.mjs [options]\n\nOptions:\n  --origin=<url>       Target origin (default: ${DEFAULT_ORIGIN})\n  --profile=<name>     ci or diagnostic (default: ci)\n  --cycles=<n>         Override profile cycles, 2-100\n  --output=<path>      Also write the JSON report to this path\n  --no-fail            Report budget failures without a non-zero exit\n  --help               Show this help\n\nThe harness is test-only. It never ships instrumentation to production and never invents browser-wide listener/timer counts.`;
}

export function installSessionInstrumentation() {
  const state = {
    createdIntervals: 0,
    clearedIntervals: 0,
    liveIntervals: new Set(),
    observers: {
      mutationCreated: 0,
      mutationDisconnected: 0,
      mutationLive: 0,
      resizeCreated: 0,
      resizeDisconnected: 0,
      resizeLive: 0,
      intersectionCreated: 0,
      intersectionDisconnected: 0,
      intersectionLive: 0,
    },
    objectUrlsCreated: 0,
    objectUrlsRevoked: 0,
    activeObjectUrls: new Set(),
    longTasks: [],
    runtimeErrors: [],
    unhandledRejections: [],
  };

  Object.defineProperty(window, '__PLAYGARBA_SESSION_STABILITY', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: state,
  });

  const originalSetInterval = window.setInterval.bind(window);
  const originalClearInterval = window.clearInterval.bind(window);
  window.setInterval = (...args) => {
    const id = originalSetInterval(...args);
    state.createdIntervals += 1;
    state.liveIntervals.add(id);
    return id;
  };
  window.clearInterval = (id) => {
    if (state.liveIntervals.delete(id)) state.clearedIntervals += 1;
    return originalClearInterval(id);
  };

  const wrapObserver = (name, key) => {
    const Original = window[name];
    if (typeof Original !== 'function') return;
    const createdKey = `${key}Created`;
    const disconnectedKey = `${key}Disconnected`;
    const liveKey = `${key}Live`;
    window[name] = class SessionStabilityObserver extends Original {
      constructor(...args) {
        super(...args);
        state.observers[createdKey] += 1;
        state.observers[liveKey] += 1;
        this.__sessionDisconnected = false;
      }
      disconnect() {
        if (!this.__sessionDisconnected) {
          this.__sessionDisconnected = true;
          state.observers[disconnectedKey] += 1;
          state.observers[liveKey] = Math.max(0, state.observers[liveKey] - 1);
        }
        return super.disconnect();
      }
    };
  };
  wrapObserver('MutationObserver', 'mutation');
  wrapObserver('ResizeObserver', 'resize');
  wrapObserver('IntersectionObserver', 'intersection');

  if (window.URL && typeof window.URL.createObjectURL === 'function') {
    const originalCreateObjectURL = window.URL.createObjectURL.bind(window.URL);
    const originalRevokeObjectURL = window.URL.revokeObjectURL.bind(window.URL);
    window.URL.createObjectURL = (...args) => {
      const url = originalCreateObjectURL(...args);
      state.objectUrlsCreated += 1;
      state.activeObjectUrls.add(url);
      return url;
    };
    window.URL.revokeObjectURL = (url) => {
      if (state.activeObjectUrls.delete(url)) state.objectUrlsRevoked += 1;
      return originalRevokeObjectURL(url);
    };
  }

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    // Long Task timing is Chromium-specific and optional.
  }

  window.addEventListener('error', (event) => {
    state.runtimeErrors.push(String(event.error?.message || event.message || 'window error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    state.unhandledRejections.push(String(event.reason?.message || event.reason || 'unhandled rejection'));
  });
}

function finiteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function metricValue(metrics, name) {
  return finiteNumber(metrics.find((metric) => metric.name === name)?.value);
}

export async function collectSessionSnapshot(page, cdp, label, networkState) {
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  await page.waitForTimeout(80);

  const [domCounters, performanceMetrics, inPage] = await Promise.all([
    cdp.send('Memory.getDOMCounters').catch(() => null),
    cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] })),
    page.evaluate(() => {
      const state = window.__PLAYGARBA_SESSION_STABILITY;
      const longTasks = state?.longTasks || [];
      const liveObservers = state?.observers
        ? state.observers.mutationLive + state.observers.resizeLive + state.observers.intersectionLive
        : null;
      return {
        domNodeCount: document.getElementsByTagName('*').length,
        iframeCount: document.querySelectorAll('iframe').length,
        mediaElementCount: document.querySelectorAll('audio, video').length,
        providerSurfaceCount: document.querySelectorAll('[id*="youtube" i], [class*="youtube" i], [id*="provider" i], [class*="provider" i]').length,
        liveIntervals: state?.liveIntervals?.size ?? null,
        createdIntervals: state?.createdIntervals ?? null,
        clearedIntervals: state?.clearedIntervals ?? null,
        liveObservers,
        observers: state?.observers ? { ...state.observers } : null,
        activeObjectUrls: state?.activeObjectUrls?.size ?? null,
        objectUrlsCreated: state?.objectUrlsCreated ?? null,
        objectUrlsRevoked: state?.objectUrlsRevoked ?? null,
        runtimeErrors: state?.runtimeErrors?.length ?? 0,
        unhandledRejections: state?.unhandledRejections?.length ?? 0,
        longTaskCount: longTasks.length,
        longTaskTotalMs: longTasks.reduce((sum, entry) => sum + entry.duration, 0),
        longTaskMaxMs: longTasks.length ? Math.max(...longTasks.map((entry) => entry.duration)) : 0,
        heapFromPerformanceMemory: finiteNumber(performance.memory?.usedJSHeapSize),
      };
    }),
  ]);

  const metrics = performanceMetrics.metrics || [];
  return {
    label,
    capturedAt: new Date().toISOString(),
    browser: {
      documents: finiteNumber(domCounters?.documents),
      nodes: finiteNumber(domCounters?.nodes),
      jsEventListeners: finiteNumber(domCounters?.jsEventListeners),
      jsHeapUsedBytes: metricValue(metrics, 'JSHeapUsedSize') ?? inPage.heapFromPerformanceMemory,
      jsHeapTotalBytes: metricValue(metrics, 'JSHeapTotalSize'),
      layoutObjects: metricValue(metrics, 'LayoutObjects'),
      nodesMetric: metricValue(metrics, 'Nodes'),
    },
    page: inPage,
    network: {
      sameOriginRequestCount: networkState.sameOriginRequestCount,
      sameOriginTransferBytes: networkState.sameOriginTransferBytes,
      backgroundLibraryRequests: networkState.backgroundLibraryRequests,
      uniqueBackgroundLibraryAssets: networkState.backgroundLibraryAssets.size,
    },
  };
}

export function makeNetworkState(originValue) {
  return {
    originValue,
    sameOriginRequestCount: 0,
    sameOriginTransferBytes: 0,
    backgroundLibraryRequests: 0,
    backgroundLibraryAssets: new Set(),
  };
}

export function attachNetworkAccounting(page, networkState) {
  const onRequest = (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin !== networkState.originValue) return;
      networkState.sameOriginRequestCount += 1;
      if (url.pathname.startsWith('/assets/backgrounds/library/')) {
        networkState.backgroundLibraryRequests += 1;
        networkState.backgroundLibraryAssets.add(url.pathname);
      }
    } catch {
      // Ignore malformed URLs.
    }
  };
  const onResponse = async (response) => {
    try {
      const url = new URL(response.url());
      if (url.origin !== networkState.originValue) return;
      const headers = await response.allHeaders().catch(() => ({}));
      const contentLength = Number.parseInt(headers['content-length'] || '0', 10);
      if (Number.isFinite(contentLength) && contentLength > 0) {
        networkState.sameOriginTransferBytes += contentLength;
      }
    } catch {
      // Ignore unavailable response metadata.
    }
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  return () => {
    page.off('request', onRequest);
    page.off('response', onResponse);
  };
}

export async function clickIfUsable(page, selector) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) return false;
  if (!(await locator.isVisible().catch(() => false))) return false;
  if (!(await locator.isEnabled().catch(() => false))) return false;
  await locator.click({ timeout: 2_500 }).catch(() => null);
  return true;
}

export async function closeTransientSurfaces(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await clickIfUsable(page, '#sheetClose');
  await page.keyboard.press('Escape').catch(() => {});
}

async function exerciseSearch(page, cycleIndex) {
  if (!(await clickIfUsable(page, '#searchButton'))) return 'unavailable';
  const input = page.locator('#searchInput');
  if (!(await input.isVisible().catch(() => false))) {
    await closeTransientSurfaces(page);
    return 'not-visible';
  }
  await input.fill(cycleIndex % 2 ? 'Garba' : 'Khalasi');
  await page.waitForTimeout(40);
  await input.fill('');
  await closeTransientSurfaces(page);
  return 'exercised';
}

async function exerciseQueueAndFavourites(page) {
  const results = {};
  results.queue = (await clickIfUsable(page, '#queueButton')) ? 'opened' : 'unavailable';
  await closeTransientSurfaces(page);
  results.favourites = (await clickIfUsable(page, '#favouritesButton')) ? 'opened' : 'unavailable';
  await closeTransientSurfaces(page);
  return results;
}

async function exerciseNonstop(page) {
  const opened = await clickIfUsable(page, '#nonstopButton');
  if (!opened) return 'unavailable';
  await page.waitForTimeout(50);
  const firstSet = page.locator('#nonstopBrowser .nonstop-set, #nonstopBrowser button[data-set-id]').first();
  if (await firstSet.isVisible().catch(() => false)) {
    await firstSet.click({ timeout: 2_000 }).catch(() => {});
  }
  await closeTransientSurfaces(page);
  return 'exercised';
}

async function exerciseAtmosphere(page) {
  const selector = [
    '[aria-label*="atmosphere" i]',
    '[title*="atmosphere" i]',
    '[aria-label*="courtyard" i]',
  ].join(', ');
  const opened = await clickIfUsable(page, selector);
  if (!opened) return 'unavailable';
  await page.waitForTimeout(40);
  await closeTransientSurfaces(page);
  return 'exercised';
}

async function exerciseBackground(page) {
  const selector = [
    '[aria-label*="background" i]',
    '[title*="background" i]',
    'button[data-background]',
  ].join(', ');
  const opened = await clickIfUsable(page, selector);
  if (!opened) return 'unavailable';
  await page.waitForTimeout(40);
  const candidate = page.locator('[data-background]:visible, [data-background-id]:visible').nth(1);
  if (await candidate.isVisible().catch(() => false)) {
    await candidate.click({ timeout: 2_000 }).catch(() => {});
  }
  await closeTransientSurfaces(page);
  return 'exercised';
}

async function exerciseExplore(page, origin) {
  const returnUrl = page.url();
  const exploreUrl = new URL('./explore/', origin).href;
  await page.goto(exploreUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => null);
  const input = page.locator('#catalogueSearch, #exploreSearch, input[type="search"]').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill('Garba').catch(() => {});
    await page.waitForTimeout(40);
    await input.fill('').catch(() => {});
  }
  const release = page.locator('.release-card, [data-release-id]').first();
  if (await release.isVisible().catch(() => false)) {
    await release.click({ timeout: 2_000 }).catch(() => {});
  }
  await page.goto(returnUrl || origin, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => null);
  await page.waitForFunction(() => Boolean(document.getElementById('playButton')), null, { timeout: 8_000 }).catch(() => {});
  return 'exercised';
}

async function exerciseVisibility(cdp) {
  try {
    await cdp.send('Emulation.setPageVisibilityOverride', { visibilityState: 'hidden' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await cdp.send('Emulation.setPageVisibilityOverride', { visibilityState: 'visible' });
    return 'emulated-hidden-visible';
  } catch {
    return 'unsupported-by-cdp';
  }
}

async function exerciseOfflineRecovery(page, cdp, originValue) {
  try {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
      connectionType: 'none',
    });
    await page.evaluate(async (origin) => {
      await fetch(`${origin}/manifest.webmanifest?session-soak=offline`, { cache: 'no-store' }).catch(() => null);
    }, originValue);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
      connectionType: 'wifi',
    });
    const recovered = await page.evaluate(async (origin) => {
      try {
        const response = await fetch(`${origin}/manifest.webmanifest?session-soak=recovered`, { cache: 'no-store' });
        return response.ok;
      } catch {
        return false;
      }
    }, originValue);
    return recovered ? 'recovered' : 'recovery-request-failed';
  } catch {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
      connectionType: 'wifi',
    }).catch(() => {});
    return 'unsupported-or-failed';
  }
}

export async function exerciseSessionCycle(page, cdp, options, cycleIndex) {
  const journey = {
    cycle: cycleIndex,
    transport: {},
    genres: 0,
    search: null,
    queueAndFavourites: null,
    nonstop: null,
    explore: null,
    atmosphere: null,
    background: null,
    visibility: null,
    offlineRecovery: null,
  };

  journey.transport.playPause = await clickIfUsable(page, '#playButton');
  if (journey.transport.playPause) {
    await page.waitForTimeout(30);
    await clickIfUsable(page, '#playButton');
  }
  journey.transport.next = await clickIfUsable(page, '#nextButton');
  journey.transport.previous = await clickIfUsable(page, '#prevButton');

  const genres = page.locator('#genreStrip .genre-button');
  const genreCount = await genres.count();
  for (let offset = 0; offset < Math.min(genreCount, 3); offset += 1) {
    const index = (cycleIndex + offset) % Math.max(1, genreCount);
    const button = genres.nth(index);
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 2_000 }).catch(() => {});
      journey.genres += 1;
    }
  }

  journey.search = await exerciseSearch(page, cycleIndex);
  journey.queueAndFavourites = await exerciseQueueAndFavourites(page);
  journey.nonstop = await exerciseNonstop(page);
  journey.atmosphere = await exerciseAtmosphere(page);
  journey.background = await exerciseBackground(page);

  if (cycleIndex % 2 === 0) journey.explore = await exerciseExplore(page, options.origin);
  else journey.explore = 'deferred-this-cycle';

  journey.visibility = await exerciseVisibility(cdp);
  journey.offlineRecovery = cycleIndex === options.cycles - 1
    ? await exerciseOfflineRecovery(page, cdp, options.originValue)
    : 'final-cycle-only';

  await closeTransientSurfaces(page);
  return journey;
}

function delta(finalValue, baselineValue) {
  return Number.isFinite(finalValue) && Number.isFinite(baselineValue)
    ? finalValue - baselineValue
    : null;
}

function monotonicGrowth(samples, read, meaningfulDelta) {
  const values = samples.map(read).filter(Number.isFinite);
  if (values.length < 4) return false;
  const tail = values.slice(-4);
  const increasing = tail.every((value, index) => index === 0 || value >= tail[index - 1]);
  return increasing && tail.at(-1) - tail[0] > meaningfulDelta;
}

export function evaluateSessionBudgets(snapshots, runtimeFailures, budgets = DEFAULT_BUDGETS) {
  if (snapshots.length < 2) return [{ code: 'insufficient-snapshots', message: 'Need baseline and final snapshots.' }];
  const baseline = snapshots[0];
  const final = snapshots.at(-1);
  const failures = [];

  const checks = [
    ['dom-node-growth', delta(final.browser.nodes, baseline.browser.nodes), budgets.domNodeGrowth],
    ['document-growth', delta(final.browser.documents, baseline.browser.documents), budgets.documentGrowth],
    ['event-listener-growth', delta(final.browser.jsEventListeners, baseline.browser.jsEventListeners), budgets.jsEventListenerGrowth],
    ['heap-growth', delta(final.browser.jsHeapUsedBytes, baseline.browser.jsHeapUsedBytes), budgets.heapGrowthBytes],
    ['interval-growth', delta(final.page.liveIntervals, baseline.page.liveIntervals), budgets.liveIntervalGrowth],
    ['observer-growth', delta(final.page.liveObservers, baseline.page.liveObservers), budgets.liveObserverGrowth],
    ['object-url-growth', delta(final.page.activeObjectUrls, baseline.page.activeObjectUrls), budgets.activeObjectUrlGrowth],
    ['media-element-growth', delta(final.page.mediaElementCount, baseline.page.mediaElementCount), budgets.mediaElementGrowth],
    ['iframe-growth', delta(final.page.iframeCount, baseline.page.iframeCount), budgets.iframeGrowth],
  ];
  for (const [code, growth, budget] of checks) {
    if (Number.isFinite(growth) && growth > budget) {
      failures.push({ code, growth, budget, message: `${code} exceeded budget: +${growth} > +${budget}` });
    }
  }

  const warmRequestGrowth = delta(final.network.sameOriginRequestCount, baseline.network.sameOriginRequestCount);
  const cycles = Math.max(1, snapshots.length - 1);
  const perCycleRequests = Number.isFinite(warmRequestGrowth) ? warmRequestGrowth / cycles : null;
  if (Number.isFinite(perCycleRequests) && perCycleRequests > budgets.warmRequestGrowthPerCycle) {
    failures.push({
      code: 'warm-request-growth',
      value: perCycleRequests,
      budget: budgets.warmRequestGrowthPerCycle,
      message: `same-origin warm requests averaged ${perCycleRequests.toFixed(1)} per cycle`,
    });
  }

  const backgroundGrowth = delta(final.network.uniqueBackgroundLibraryAssets, baseline.network.uniqueBackgroundLibraryAssets);
  if (Number.isFinite(backgroundGrowth) && backgroundGrowth > budgets.backgroundLibraryUniqueGrowth) {
    failures.push({
      code: 'background-library-growth',
      growth: backgroundGrowth,
      budget: budgets.backgroundLibraryUniqueGrowth,
      message: `warm session fetched ${backgroundGrowth} additional unique background-library assets`,
    });
  }

  if (final.page.longTaskMaxMs > budgets.longTaskMaxMs) {
    failures.push({
      code: 'long-task-max',
      value: final.page.longTaskMaxMs,
      budget: budgets.longTaskMaxMs,
      message: `longest task ${final.page.longTaskMaxMs.toFixed(1)}ms exceeded ${budgets.longTaskMaxMs}ms`,
    });
  }

  const runtimeErrorCount = runtimeFailures.length + final.page.runtimeErrors + final.page.unhandledRejections;
  if (runtimeErrorCount > budgets.runtimeErrors) {
    failures.push({
      code: 'runtime-errors',
      value: runtimeErrorCount,
      budget: budgets.runtimeErrors,
      message: `${runtimeErrorCount} runtime/network assertion errors were captured`,
    });
  }

  if (monotonicGrowth(snapshots, (sample) => sample.browser.nodes, Math.max(50, budgets.domNodeGrowth / 3))) {
    failures.push({ code: 'dom-monotonic-growth', message: 'DOM counters rose monotonically across the final four snapshots.' });
  }
  if (monotonicGrowth(snapshots, (sample) => sample.browser.jsHeapUsedBytes, Math.max(4 * 1024 * 1024, budgets.heapGrowthBytes / 3))) {
    failures.push({ code: 'heap-monotonic-growth', message: 'GC-normalised JS heap rose monotonically across the final four snapshots.' });
  }

  return failures;
}

export function compactSnapshot(snapshot) {
  return {
    label: snapshot.label,
    nodes: snapshot.browser.nodes,
    documents: snapshot.browser.documents,
    jsEventListeners: snapshot.browser.jsEventListeners,
    jsHeapUsedBytes: snapshot.browser.jsHeapUsedBytes,
    liveIntervals: snapshot.page.liveIntervals,
    liveObservers: snapshot.page.liveObservers,
    activeObjectUrls: snapshot.page.activeObjectUrls,
    mediaElementCount: snapshot.page.mediaElementCount,
    iframeCount: snapshot.page.iframeCount,
    longTaskCount: snapshot.page.longTaskCount,
    longTaskMaxMs: snapshot.page.longTaskMaxMs,
    sameOriginRequestCount: snapshot.network.sameOriginRequestCount,
    uniqueBackgroundLibraryAssets: snapshot.network.uniqueBackgroundLibraryAssets,
  };
}
