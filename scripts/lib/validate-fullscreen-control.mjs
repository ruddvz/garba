import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const repoRoot = new URL('../../', import.meta.url);
const indexHtml = await readFile(new URL('index.html', repoRoot), 'utf8');
const runtimeSource = await readFile(new URL('assets/runtime/fullscreen-control.js', repoRoot), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('package.json', repoRoot), 'utf8'));

assert.equal((indexHtml.match(/id="fullscreenButton"/g) || []).length, 1, 'fullscreen control must exist exactly once');
assert.match(indexHtml, /id="fullscreenButton"[^>]*aria-label="Enter fullscreen"[^>]*aria-pressed="false"[^>]*hidden/, 'fullscreen control must fail closed in markup');
assert.match(indexHtml, /src="assets\/runtime\/fullscreen-control\.js"[^>]*defer/, 'fullscreen runtime must load explicitly');
assert.equal(packageJson.scripts['fullscreen:validate'], 'node scripts/lib/validate-fullscreen-control.mjs', 'focused fullscreen validator script must be registered');
assert.match(packageJson.scripts['check:modules'], /node --check assets\/runtime\/fullscreen-control\.js/, 'module syntax gate must cover fullscreen runtime');
assert.match(packageJson.scripts['check:modules'], /node --check scripts\/lib\/validate-fullscreen-control\.mjs/, 'module syntax gate must cover fullscreen validator');
assert.match(packageJson.scripts.check, /npm run fullscreen:validate/, 'repository check must execute fullscreen validation');
assert.doesNotMatch(runtimeSource, /userAgent|platform\s*[=!]=|requestFullscreen\(\).*setTimeout/i, 'fullscreen availability must not depend on UA sniffing or delayed auto-entry');

function createEventTarget(properties = {}) {
  const listeners = new Map();
  return Object.assign(properties, {
    addEventListener(type, listener) {
      const bucket = listeners.get(type) || [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
    addListener(listener) {
      const bucket = listeners.get('change') || [];
      bucket.push(listener);
      listeners.set('change', bucket);
    },
    async dispatch(type, event = { type }) {
      const bucket = listeners.get(type) || [];
      await Promise.all(bucket.map((listener) => listener(event)));
    },
  });
}

function createClassList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); },
  };
}

function createScenario({ installed = false, iosStandalone = false, supported = true, manifestFullscreen = false, rejectRequest = false, deferRequest = false } = {}) {
  const calls = { request: 0, exit: 0 };
  const buttonAttributes = new Map();
  const iconAttributes = new Map();
  const mediaQueries = new Map();
  let fullscreenElement = null;
  let deferredResolve = null;

  const toast = { textContent: '', classList: createClassList() };
  const iconPath = { setAttribute(name, value) { iconAttributes.set(name, String(value)); } };
  const button = createEventTarget({
    hidden: true,
    disabled: false,
    title: '',
    setAttribute(name, value) { buttonAttributes.set(name, String(value)); },
    getAttribute(name) { return buttonAttributes.get(name); },
  });

  let document;
  const app = {
    dataset: { songId: 'sentinel-song' },
    playerState: { progress: 321, queue: ['sentinel-song'], genre: 'traditional' },
  };

  function completeEnter() {
    fullscreenElement = app;
    return document.dispatch('fullscreenchange');
  }

  if (supported) {
    app.requestFullscreen = async () => {
      calls.request += 1;
      if (rejectRequest) throw new Error('fullscreen denied');
      if (deferRequest) {
        await new Promise((resolve) => {
          deferredResolve = async () => {
            await completeEnter();
            resolve();
          };
        });
        return;
      }
      await completeEnter();
    };
  }

  document = createEventTarget({
    fullscreenEnabled: supported,
    getElementById(id) {
      if (id === 'app') return app;
      if (id === 'fullscreenButton') return button;
      if (id === 'fullscreenIconPath') return iconPath;
      if (id === 'toast') return toast;
      return null;
    },
  });
  Object.defineProperty(document, 'fullscreenElement', { get: () => fullscreenElement });

  if (supported) {
    document.exitFullscreen = async () => {
      calls.exit += 1;
      fullscreenElement = null;
      await document.dispatch('fullscreenchange');
    };
  }

  const windowTarget = createEventTarget({
    matchMedia(queryText) {
      if (!mediaQueries.has(queryText)) {
        let matches = false;
        if (queryText === '(display-mode: standalone)') matches = installed;
        if (queryText === '(display-mode: fullscreen)') matches = manifestFullscreen;
        mediaQueries.set(queryText, createEventTarget({ media: queryText, matches }));
      }
      return mediaQueries.get(queryText);
    },
    setTimeout() { return 1; },
    clearTimeout() {},
  });

  vm.runInNewContext(runtimeSource, {
    document,
    navigator: { standalone: iosStandalone },
    window: windowTarget,
  }, { filename: 'assets/runtime/fullscreen-control.js' });

  return {
    app,
    button,
    calls,
    document,
    iconAttributes,
    mediaQueries,
    toast,
    async setFullscreenElement(value) {
      fullscreenElement = value;
      await document.dispatch('fullscreenchange');
    },
    async resolveDeferredRequest() {
      assert.equal(typeof deferredResolve, 'function', 'a deferred fullscreen request must be pending');
      await deferredResolve();
    },
  };
}

{
  const scenario = createScenario({ installed: false, supported: true });
  assert.equal(scenario.button.hidden, true, 'normal browser tabs must not expose fullscreen control');
  assert.equal(scenario.calls.request, 0, 'runtime must never auto-enter fullscreen');
}

{
  const scenario = createScenario({ iosStandalone: true, supported: false });
  assert.equal(scenario.button.hidden, true, 'installed surfaces without Fullscreen API support must show no dead control');
}

{
  const scenario = createScenario({ installed: true, supported: true, manifestFullscreen: true });
  assert.equal(scenario.button.hidden, true, 'manifest-fullscreen windows do not need a redundant fullscreen action');
}

{
  const scenario = createScenario({ installed: true, supported: true });
  assert.equal(scenario.button.hidden, false, 'supported installed surfaces must expose the control');
  assert.equal(scenario.button.getAttribute('aria-label'), 'Enter fullscreen');
  assert.equal(scenario.button.getAttribute('aria-pressed'), 'false');
  assert.equal(scenario.button.disabled, false);

  await scenario.button.dispatch('click');
  assert.equal(scenario.calls.request, 1, 'one user click must request fullscreen exactly once');
  assert.equal(scenario.document.fullscreenElement, scenario.app, 'the PlayGarba app root must be the fullscreen target');
  assert.equal(scenario.button.getAttribute('aria-label'), 'Exit fullscreen');
  assert.equal(scenario.button.getAttribute('aria-pressed'), 'true');

  await scenario.setFullscreenElement(null);
  assert.equal(scenario.button.getAttribute('aria-label'), 'Enter fullscreen', 'external or Escape exits must reconcile the label');
  assert.equal(scenario.button.getAttribute('aria-pressed'), 'false', 'external or Escape exits must reconcile pressed state');
  assert.equal(scenario.button.hidden, false, 'installed surface must keep the reversible control after external exit');
}

{
  const scenario = createScenario({ installed: true, supported: true });
  await scenario.button.dispatch('click');
  await scenario.button.dispatch('click');
  assert.equal(scenario.calls.exit, 1, 'active fullscreen click must use the platform exit path');
  assert.equal(scenario.document.fullscreenElement, null);
  assert.equal(scenario.button.getAttribute('aria-label'), 'Enter fullscreen');
}

{
  const scenario = createScenario({ installed: true, supported: true, rejectRequest: true });
  const sentinel = JSON.stringify(scenario.app.playerState);
  await scenario.button.dispatch('click');
  assert.equal(scenario.calls.request, 1);
  assert.equal(scenario.document.fullscreenElement, null, 'rejected fullscreen request must fail closed');
  assert.equal(scenario.button.disabled, false, 'rejected request must leave the control usable');
  assert.equal(scenario.toast.textContent, 'Fullscreen is not available right now.');
  assert.equal(scenario.toast.classList.contains('show'), true, 'rejected request must expose proportionate feedback');
  assert.equal(JSON.stringify(scenario.app.playerState), sentinel, 'fullscreen failure must not mutate playback state');
}

{
  const scenario = createScenario({ installed: true, supported: true, deferRequest: true });
  const firstClick = scenario.button.dispatch('click');
  assert.equal(scenario.button.disabled, true, 'fullscreen control must disable while a request is pending');
  await scenario.button.dispatch('click');
  assert.equal(scenario.calls.request, 1, 'repeated taps while pending must not create duplicate fullscreen requests');
  await scenario.resolveDeferredRequest();
  await firstClick;
  assert.equal(scenario.button.disabled, false);
  assert.equal(scenario.button.getAttribute('aria-label'), 'Exit fullscreen');
}

console.log('✓ fullscreen control is hidden by default and capability gated');
console.log('✓ supported installed surfaces enter, exit and reconcile external fullscreen exits');
console.log('✓ rejected and repeated requests fail safely without mutating playback state');
