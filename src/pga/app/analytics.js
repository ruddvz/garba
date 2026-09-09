export const PGA_RANGES = Object.freeze(['7d', '30d', '90d']);

export function metricValue(metric) {
  const value = Number(metric?.value);
  return Number.isFinite(value) ? value : null;
}

export function formatMetric(metric) {
  const value = metricValue(metric);
  if (value === null) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

export function formatDuration(metric) {
  const ms = metricValue(metric);
  if (ms === null) return '—';
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export function ratio(numerator, denominator) {
  const n = metricValue(numerator);
  const d = metricValue(denominator);
  if (n === null || d === null || d <= 0) return null;
  return { value: n / d, numerator: n, denominator: d };
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

function metricFromNumber(value, source = {}) {
  return {
    value: Number.isFinite(Number(value)) ? Number(value) : 0,
    precision: source.precision || 'unknown',
    sampled: source.sampled ?? 'unknown',
  };
}

function addMetric(target, metric) {
  const value = metricValue(metric);
  if (value === null) return target;
  target.value += value;
  if (metric?.precision === 'estimated') target.precision = 'estimated';
  if (metric?.sampled === true) target.sampled = true;
  return target;
}

export function aggregateBreakdowns(rows = [], selector) {
  const totals = new Map();
  for (const row of rows) {
    const key = selector(row);
    if (!key) continue;
    const current = totals.get(key) || { value: 0, precision: 'exact', sampled: false };
    addMetric(current, row.sessions);
    totals.set(key, current);
  }
  return [...totals.entries()]
    .map(([label, metric]) => ({ label, metric }))
    .sort((a, b) => b.metric.value - a.metric.value || a.label.localeCompare(b.label));
}

export function parseClient(value = '') {
  const [device = 'unknown', os = 'unknown', browser = 'unknown'] = String(value).split('|');
  return { device, os, browser };
}

function acquisitionLabel(value = '') {
  const [referrer = '', source = '', medium = ''] = String(value).split('|');
  if (source) return medium ? `${source} · ${medium}` : source;
  if (referrer) return referrer;
  return 'Direct';
}

export function normaliseAudience(envelope) {
  if (!envelope || envelope.status === 'unavailable' || !envelope.data) {
    return { state: 'unavailable', range: null, summary: null, distributions: {} };
  }
  const rows = Array.isArray(envelope.data.breakdowns) ? envelope.data.breakdowns : [];
  return {
    state: envelope.status || 'complete',
    range: envelope.data.range || null,
    generatedAt: envelope.generatedAt || null,
    dataThrough: envelope.dataThrough || null,
    summary: envelope.data.summary || null,
    distributions: {
      device: aggregateBreakdowns(rows, (row) => parseClient(row.client).device),
      os: aggregateBreakdowns(rows, (row) => parseClient(row.client).os),
      browser: aggregateBreakdowns(rows, (row) => parseClient(row.client).browser),
      displayMode: aggregateBreakdowns(rows, (row) => row.displayMode === 'standalone' || row.displayMode === 'minimal-ui' ? 'PWA' : 'Browser'),
      acquisition: aggregateBreakdowns(rows, (row) => acquisitionLabel(row.acquisition)),
      country: aggregateBreakdowns(rows, (row) => row.country && row.country !== 'ZZ' ? row.country : 'Unknown'),
      region: aggregateBreakdowns(rows, (row) => row.region || null),
    },
  };
}

function eventTotals(rows = []) {
  const totals = new Map();
  for (const row of rows) {
    const key = row.eventName || 'unknown';
    const current = totals.get(key) || { value: 0, precision: 'exact', sampled: false };
    addMetric(current, row.events);
    totals.set(key, current);
  }
  return totals;
}

function topContent(rows = []) {
  const totals = new Map();
  for (const row of rows) {
    if (row.eventName !== 'playback_started' || !row.contentId) continue;
    const canonicalId = row.canonicalId || row.contentId;
    const type = row.contentType || 'content';
    const key = `${type}:${canonicalId}`;
    const current = totals.get(key) || {
      key,
      contentType: type,
      contentId: canonicalId,
      label: row.contentLabel || null,
      artist: row.artist || null,
      releaseTitle: row.releaseTitle || null,
      metric: { value: 0, precision: 'exact', sampled: false },
    };
    addMetric(current.metric, row.events);
    totals.set(key, current);
  }
  return [...totals.values()]
    .sort((a, b) => b.metric.value - a.metric.value || a.contentId.localeCompare(b.contentId));
}

function worldTotals(rows = []) {
  const totals = new Map();
  for (const row of rows) {
    if (!row.world || row.eventName !== 'playback_started') continue;
    const current = totals.get(row.world) || { value: 0, precision: 'exact', sampled: false };
    addMetric(current, row.events);
    totals.set(row.world, current);
  }
  return [...totals.entries()].map(([label, metric]) => ({ label, metric })).sort((a, b) => b.metric.value - a.metric.value);
}

function errorTotals(rows = []) {
  const totals = new Map();
  for (const row of rows) {
    if (!['playback_error', 'playback_unavailable'].includes(row.eventName)) continue;
    const label = row.errorCode || (row.eventName === 'playback_unavailable' ? 'unavailable' : 'unknown');
    const current = totals.get(label) || { value: 0, precision: 'exact', sampled: false };
    addMetric(current, row.events);
    totals.set(label, current);
  }
  return [...totals.entries()].map(([label, metric]) => ({ label, metric })).sort((a, b) => b.metric.value - a.metric.value);
}

export function normaliseListening(envelope) {
  if (!envelope || envelope.status === 'unavailable' || !envelope.data) {
    return { state: 'unavailable', range: null, metrics: {}, topContent: [], worlds: [], errors: [], unmetDemand: [] };
  }
  const rows = Array.isArray(envelope.data.rows) ? envelope.data.rows : [];
  const totals = eventTotals(rows);
  const playIntents = totals.get('play_intent') || metricFromNumber(0);
  const confirmedStarts = totals.get('playback_started') || metricFromNumber(0);
  const search = envelope.data.search || {};
  return {
    state: envelope.status || 'complete',
    range: envelope.data.range || null,
    generatedAt: envelope.generatedAt || null,
    dataThrough: envelope.dataThrough || null,
    metrics: {
      playIntents,
      confirmedStarts,
      listeningMs: envelope.data.listeningMs || null,
      pauses: totals.get('playback_paused') || metricFromNumber(0),
      next: totals.get('next_requested') || metricFromNumber(0),
      previous: totals.get('previous_requested') || metricFromNumber(0),
      skips: totals.get('skip_requested') || metricFromNumber(0),
    },
    playSuccess: ratio(confirmedStarts, playIntents),
    search: {
      searches: search.searches || null,
      selectedSearches: search.selectedSearches || null,
      searchesWithConfirmedPlay: search.searchesWithConfirmedPlay || null,
      zeroResultSearches: search.zeroResultSearches || null,
      selectionRate: ratio(search.selectedSearches, search.searches),
      playRate: ratio(search.searchesWithConfirmedPlay, search.searches),
      zeroResultRate: ratio(search.zeroResultSearches, search.searches),
    },
    topContent: topContent(rows),
    worlds: worldTotals(rows),
    errors: errorTotals(rows),
    unmetDemand: Array.isArray(search.unmetDemand) ? search.unmetDemand : [],
  };
}

export async function fetchPgaEnvelope(path, { range, signal, fetchImpl = fetch } = {}) {
  const url = new URL(path, location.origin);
  if (range && PGA_RANGES.includes(range)) url.searchParams.set('range', range);
  const response = await fetchImpl(url, { credentials: 'same-origin', cache: 'no-store', signal, headers: { accept: 'application/json' } });
  if (response.status === 401 || response.status === 403) return { transport: 'auth-expired', envelope: null };
  let envelope = null;
  try { envelope = await response.json(); } catch { /* non-JSON is a transport failure */ }
  if (!response.ok || !envelope) return { transport: 'error', envelope };
  return { transport: envelope.status === 'unavailable' ? 'unavailable' : 'ready', envelope };
}
