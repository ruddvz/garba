const HEALTH_SCHEMA = 'pga-health-presentation/v1';
const STATUS_CLASSES = new Set(['healthy', 'degraded', 'stale', 'unknown', 'failed']);
const HEALTH_SUBSYSTEMS = ['production', 'playback', 'deployment', 'ci', 'catalogue', 'telemetry', 'rollups', 'pwa'];

const section = document.querySelector('[data-view="health"]');
const stateNode = document.querySelector('#healthState');
const contentNode = document.querySelector('#healthContent');
const overallStatus = document.querySelector('#healthOverallStatus');
const overallSummary = document.querySelector('#healthOverallSummary');
const freshnessNode = document.querySelector('#healthFreshness');
const subsystemList = document.querySelector('#healthSubsystems');
const problemSection = document.querySelector('#healthProblemsSection');
const problemList = document.querySelector('#healthProblems');
const accessibilitySummary = document.querySelector('#healthAccessibilitySummary');
const refreshButton = document.querySelector('#refreshButton');
const navButtons = [...document.querySelectorAll('[data-nav="health"]')];

let activeController = null;
let loaded = false;

function activeHealthView() {
  return Boolean(section && !section.hidden);
}

function safeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return STATUS_CLASSES.has(status) ? status : 'unknown';
}

function safeText(value, fallback = '') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function safeSourceUrl(value) {
  const text = safeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return null;
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function formatTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) return 'No trustworthy timestamp';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function setState(kind, title, body) {
  if (!stateNode || !contentNode) return;
  stateNode.hidden = false;
  stateNode.dataset.state = safeStatus(kind) === 'unknown' ? kind : safeStatus(kind);
  const strong = stateNode.querySelector('strong');
  const paragraph = stateNode.querySelector('p');
  if (strong) strong.textContent = title;
  if (paragraph) paragraph.textContent = body;
  contentNode.hidden = true;
}

function showContent() {
  if (stateNode) stateNode.hidden = true;
  if (contentNode) contentNode.hidden = false;
}

function statusPill(status, label) {
  const pill = document.createElement('span');
  pill.className = 'health-status';
  pill.dataset.status = status;
  pill.textContent = label;
  return pill;
}

function sourceLink(source) {
  const url = safeSourceUrl(source?.url);
  if (!url) return null;
  const link = document.createElement('a');
  link.className = 'health-evidence-link';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noreferrer noopener';
  link.textContent = 'Evidence';
  return link;
}

function detailText(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return [];
  const preferred = [
    ['expectedBuildId', 'Expected build'],
    ['deployedBuildId', 'Deployed build'],
    ['revision', 'Revision'],
    ['catalogueVersion', 'Catalogue'],
    ['errors', 'Errors'],
    ['warnings', 'Warnings'],
    ['activeVersion', 'Active PWA'],
    ['expectedVersion', 'Expected PWA'],
    ['contentId', 'Smoke content'],
  ];
  const rows = [];
  for (const [key, label] of preferred) {
    if (!Object.prototype.hasOwnProperty.call(details, key)) continue;
    const value = details[key];
    if (value == null || value === '') continue;
    const text = typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value)
      ? `${value.slice(0, 9)}…`
      : String(value);
    rows.push(`${label}: ${text}`);
    if (rows.length === 3) break;
  }
  return rows;
}

function renderSubsystem(row) {
  const status = safeStatus(row?.status);
  const article = document.createElement('article');
  article.className = 'health-subsystem';
  article.dataset.status = status;
  article.setAttribute('role', 'listitem');

  const header = document.createElement('div');
  header.className = 'health-subsystem-head';
  const title = document.createElement('h3');
  title.textContent = safeText(row?.label, 'Unknown subsystem');
  header.append(title, statusPill(status, safeText(row?.statusLabel, 'Unknown')));

  const summary = document.createElement('p');
  summary.className = 'health-subsystem-summary';
  summary.textContent = safeText(row?.summary, 'Current evidence is unavailable.');

  const reason = Array.isArray(row?.reasons) ? safeText(row.reasons[0]) : '';
  if (reason) {
    const reasonNode = document.createElement('p');
    reasonNode.className = 'health-subsystem-reason';
    reasonNode.textContent = reason;
    article.append(header, summary, reasonNode);
  } else {
    article.append(header, summary);
  }

  const details = detailText(row?.details);
  if (details.length) {
    const detailList = document.createElement('ul');
    detailList.className = 'health-detail-list';
    for (const text of details) {
      const item = document.createElement('li');
      item.textContent = text;
      detailList.append(item);
    }
    article.append(detailList);
  }

  const footer = document.createElement('div');
  footer.className = 'health-subsystem-foot';
  const freshness = document.createElement('span');
  freshness.textContent = safeText(row?.freshness?.text, 'No freshness timestamp');
  footer.append(freshness);
  const link = sourceLink(row?.source);
  if (link) footer.append(link);
  article.append(footer);
  return article;
}

function renderProblems(problems = []) {
  if (!problemSection || !problemList) return;
  problemList.replaceChildren();
  const actionable = Array.isArray(problems) ? problems.filter((problem) => safeStatus(problem?.status) !== 'healthy') : [];
  problemSection.hidden = actionable.length === 0;
  for (const problem of actionable.slice(0, 8)) {
    const item = document.createElement('article');
    item.className = 'health-problem';
    item.dataset.status = safeStatus(problem?.status);

    const top = document.createElement('div');
    top.className = 'health-problem-head';
    const title = document.createElement('strong');
    title.textContent = safeText(problem?.label, 'Health check');
    top.append(title, statusPill(safeStatus(problem?.status), safeText(problem?.statusLabel, 'Unknown')));

    const summary = document.createElement('p');
    summary.textContent = safeText(problem?.summary, 'Current evidence needs attention.');
    item.append(top, summary);

    const actionText = safeText(problem?.action);
    if (actionText) {
      const action = document.createElement('p');
      action.className = 'health-action';
      action.textContent = actionText;
      item.append(action);
    }

    const link = sourceLink(problem?.source);
    if (link) item.append(link);
    problemList.append(item);
  }
}

function renderHealth(presentation) {
  const status = safeStatus(presentation.status);
  if (overallStatus) {
    overallStatus.dataset.status = status;
    overallStatus.textContent = safeText(presentation.statusLabel, 'Unknown');
  }
  if (overallSummary) overallSummary.textContent = safeText(presentation.summary, 'Current health cannot be confirmed.');
  if (freshnessNode) {
    const evaluated = presentation.evaluatedAt || presentation.generatedAt;
    freshnessNode.textContent = evaluated ? `Evaluated ${formatTimestamp(evaluated)}` : 'No trustworthy health timestamp';
  }
  if (accessibilitySummary) accessibilitySummary.textContent = safeText(presentation.accessibilitySummary);

  const rows = Array.isArray(presentation.subsystems) ? presentation.subsystems : [];
  const byName = new Map(rows.map((row) => [row?.name, row]));
  subsystemList?.replaceChildren(...HEALTH_SUBSYSTEMS.map((name) => renderSubsystem(byName.get(name) || {
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    status: 'unknown',
    statusLabel: 'Unknown',
    summary: 'Current evidence is unavailable.',
    reasons: ['No canonical subsystem evidence was supplied.'],
    freshness: { text: 'No freshness timestamp' },
  })));

  renderProblems(presentation.problems);
  showContent();
}

function validPresentation(value) {
  return Boolean(
    value
      && typeof value === 'object'
      && !Array.isArray(value)
      && value.schemaVersion === HEALTH_SCHEMA
      && Array.isArray(value.subsystems),
  );
}

async function loadHealth({ force = false } = {}) {
  if (!section || (!force && loaded)) return;
  if (!navigator.onLine) {
    setState('offline', 'Offline', 'Health evidence cannot refresh while this device is offline. The app will not display an old snapshot as current.');
    return;
  }

  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  setState('loading', 'Checking PlayGarba', 'Refreshing protected production, deployment, CI and operational evidence.');

  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (activeController !== controller) return;
    if (response.status === 401 || response.status === 403) {
      setState('auth-expired', 'Access expired', 'Cloudflare Access must be restored before private Health evidence can be shown.');
      return;
    }
    if (!response.ok) {
      setState('error', 'Health unavailable', 'The protected Health endpoint failed. Missing health evidence is not rendered as healthy.');
      return;
    }
    const payload = await response.json();
    if (!validPresentation(payload)) {
      setState('error', 'Health response rejected', 'The protected endpoint returned an unexpected schema, so PGA will not guess the current state.');
      return;
    }
    loaded = true;
    renderHealth(payload);
  } catch (error) {
    if (error?.name === 'AbortError') return;
    setState('error', 'Health unavailable', 'The protected Health request failed. Missing health evidence is not rendered as healthy.');
  } finally {
    if (activeController === controller) activeController = null;
  }
}

for (const button of navButtons) {
  button.addEventListener('click', () => loadHealth());
}
refreshButton?.addEventListener('click', () => {
  if (activeHealthView()) loadHealth({ force: true });
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#health') loadHealth();
});
window.addEventListener('online', () => {
  if (activeHealthView()) loadHealth({ force: true });
});
window.addEventListener('offline', () => {
  if (activeHealthView()) setState('offline', 'Offline', 'Health evidence cannot refresh while this device is offline. The app will not display an old snapshot as current.');
});

const fixtureAllowed = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (fixtureAllowed) {
  window.PGA_HEALTH_TEST = Object.freeze({
    render: (presentation) => renderHealth(presentation),
    load: () => loadHealth({ force: true }),
  });
}

if (location.hash === '#health') loadHealth();
