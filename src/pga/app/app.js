const VIEWS = ['home', 'audience', 'listening', 'health', 'more'];
const navButtons = [...document.querySelectorAll('[data-nav]')];
const views = [...document.querySelectorAll('[data-view]')];
const announcer = document.querySelector('#announcer');
const boundary = document.querySelector('#boundary');
const boundaryTitle = document.querySelector('#boundaryTitle');
const boundaryBody = document.querySelector('#boundaryBody');
const boundaryAction = document.querySelector('#boundaryAction');
const connectionLabel = document.querySelector('#connectionLabel');
const refreshButton = document.querySelector('#refreshButton');
const accessButton = document.querySelector('#accessButton');
const installButton = document.querySelector('#installButton');
let deferredInstallPrompt = null;
let activeBoundary = 'ready';

function normaliseView(value) {
  return VIEWS.includes(value) ? value : 'home';
}

function selectView(next, { focus = true, updateHash = true } = {}) {
  const view = normaliseView(next);
  for (const section of views) {
    const selected = section.dataset.view === view;
    section.hidden = !selected;
    section.classList.toggle('is-active', selected);
  }
  for (const button of navButtons) {
    if (button.dataset.nav === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (updateHash && location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  const heading = document.querySelector(`[data-view="${view}"] h1`);
  if (focus && heading) heading.focus({ preventScroll: true });
  announcer.textContent = `${heading?.textContent || view} view`;
}

const boundaries = {
  ready: null,
  loading: {
    title: 'Loading protected data',
    body: 'PGA is waiting for the latest aggregate response.',
    action: null,
  },
  offline: {
    title: 'Offline',
    body: 'The PGA shell is available, but private analytics cannot refresh while this device is offline.',
    action: 'Try again',
  },
  stale: {
    title: 'Data is stale',
    body: 'The last trustworthy snapshot is older than its freshness target. Its original timestamp must remain visible.',
    action: 'Refresh',
  },
  error: {
    title: 'Data could not be loaded',
    body: 'The protected query failed. PGA will not replace the missing result with zero.',
    action: 'Retry',
  },
  'auth-expired': {
    title: 'Access expired',
    body: 'Private data is unavailable until access is restored.',
    action: 'Refresh access',
  },
};

function setBoundary(kind = 'ready') {
  const safeKind = Object.hasOwn(boundaries, kind) ? kind : 'error';
  activeBoundary = safeKind;
  const config = boundaries[safeKind];
  if (!config) {
    boundary.hidden = true;
    connectionLabel.textContent = navigator.onLine ? 'Shell ready' : 'Offline';
    return;
  }
  boundary.hidden = false;
  boundary.dataset.state = safeKind;
  boundaryTitle.textContent = config.title;
  boundaryBody.textContent = config.body;
  boundaryAction.hidden = !config.action;
  boundaryAction.textContent = config.action || '';
  connectionLabel.textContent = config.title;
  announcer.textContent = config.title;
}

function syncNetworkState() {
  if (!navigator.onLine) setBoundary('offline');
  else if (activeBoundary === 'offline') setBoundary('ready');
}

function refreshProtectedState() {
  if (!navigator.onLine) {
    setBoundary('offline');
    return;
  }
  setBoundary('loading');
  window.setTimeout(() => setBoundary('ready'), 180);
}

for (const button of navButtons) {
  button.addEventListener('click', () => selectView(button.dataset.nav));
}

window.addEventListener('hashchange', () => selectView(location.hash.slice(1), { updateHash: false }));
window.addEventListener('online', syncNetworkState);
window.addEventListener('offline', syncNetworkState);
refreshButton.addEventListener('click', refreshProtectedState);
accessButton.addEventListener('click', () => location.reload());
boundaryAction.addEventListener('click', () => {
  if (activeBoundary === 'auth-expired') location.reload();
  else refreshProtectedState();
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
  announcer.textContent = 'PGA installed';
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

const fixtureAllowed = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (fixtureAllowed) {
  window.PGA_TEST = Object.freeze({
    selectView: (view) => selectView(view),
    setBoundary: (kind) => setBoundary(kind),
  });
}

selectView(location.hash.slice(1), { focus: false, updateHash: false });
syncNetworkState();
