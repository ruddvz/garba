(() => {
  const STORAGE_KEY = 'garba:atmosphere';
  const SOURCE_MANIFEST = 'data/atmosphere-sources.json';
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const utilityBar = document.querySelector('.utilities');
  const app = document.getElementById('app');
  const directAudio = document.getElementById('audio');
  if (!utilityBar || !app) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const MODES = {
    off: { label: 'Off', master: 0, voices: 0, events: 0, crowd: 0, spatial: false },
    courtyard: { label: 'Courtyard', master: 0.075, voices: 2, events: 0.28, crowd: 0, spatial: true },
    ground: { label: 'Live Ground', master: 0.095, voices: 3, events: 0.52, crowd: 0.38, spatial: false },
    immersive: { label: 'Immersive 360°', master: 0.105, voices: 4, events: 0.68, crowd: 0.30, spatial: true },
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  })();

  const state = {
    context: null,
    master: null,
    highpass: null,
    lowpass: null,
    compressor: null,
    mode: MODES[stored?.mode] ? stored.mode : 'off',
    level: clamp(Number(stored?.level ?? 0.45), 0.05, 1),
    voices: [],
    stickBuffers: [],
    clapBuffers: [],
    eventTimer: 0,
    orbitTimer: 0,
    idleTimer: 0,
    previewTimer: 0,
    crowdBuffer: null,
    crowdPromise: null,
    crowdSource: null,
    crowdGain: null,
    crowdFilter: null,
    panelOpen: false,
    previewActive: false,
    playbackActive: false,
    sceneReady: false,
    generation: 0,
    previousFocus: null,
    inertNodes: [],
  };

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: state.mode, level: state.level })); } catch { /* storage unavailable */ }
  }

  function constrainedConnection() {
    return Boolean(connection?.saveData) || /(^|-)2g$/.test(String(connection?.effectiveType || ''));
  }

  function playbackIsActive() {
    if (document.hidden) return false;
    if (directAudio?.currentSrc && !directAudio.paused && !directAudio.ended) return true;
    return app.classList.contains('is-playing');
  }

  function runtimeProfile() {
    const base = MODES[state.mode];
    if (!base || state.mode === 'off' || !constrainedConnection()) return base;
    return { ...base, voices: Math.min(base.voices, 2), events: base.events * 0.62, crowd: 0 };
  }

  function injectStyles() {
    if (document.getElementById('garbaAtmosphereStyles')) return;
    const style = document.createElement('style');
    style.id = 'garbaAtmosphereStyles';
    style.textContent = `
      .atmosphere-button{position:relative}
      .atmosphere-button[aria-pressed="true"]{color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,rgba(8,10,18,.22))}
      .atmosphere-button::after{content:"";position:absolute;right:6px;top:6px;width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:0;transform:scale(.6);transition:opacity 160ms ease,transform 180ms ease;box-shadow:0 0 0 2px rgba(8,10,18,.54)}
      .atmosphere-button[aria-pressed="true"]::after{opacity:1;transform:scale(1)}
      .atmosphere-button svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
      .atmosphere-backdrop{position:fixed;z-index:89;inset:0;border:0;padding:0;background:rgba(3,5,10,.26);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
      .atmosphere-backdrop[hidden],.atmosphere-panel[hidden]{display:none!important}
      .atmosphere-panel{position:fixed;z-index:90;top:max(76px,calc(env(safe-area-inset-top) + 58px));right:max(14px,env(safe-area-inset-right));width:min(360px,calc(100vw - 28px));box-sizing:border-box;padding:16px;color:#f6ecd7;border:1px solid rgba(246,236,215,.14);border-radius:22px;background:rgba(12,14,25,.965);box-shadow:0 28px 90px rgba(0,0,0,.52);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
      .atmosphere-panel-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .atmosphere-heading{display:flex;align-items:center;gap:9px;min-width:0}
      .atmosphere-panel h2{margin:0;font:600 18px/1.15 var(--sans,system-ui);letter-spacing:-.01em}
      .atmosphere-test,.atmosphere-close{display:inline-grid;place-items:center;border:1px solid rgba(246,236,215,.12);color:inherit;background:rgba(246,236,215,.05);cursor:pointer}
      .atmosphere-test{width:30px;height:30px;border-radius:999px}
      .atmosphere-test[aria-pressed="true"]{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 52%,rgba(246,236,215,.14));background:color-mix(in srgb,var(--accent) 13%,rgba(246,236,215,.04))}
      .atmosphere-test svg{width:14px;height:14px;fill:currentColor}
      .atmosphere-close{width:34px;height:34px;border-radius:999px;font:300 22px/1 var(--sans,system-ui)}
      .atmosphere-modes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:15px}
      .atmosphere-mode{min-height:42px;padding:10px 11px;border:1px solid rgba(246,236,215,.11);border-radius:13px;color:inherit;background:rgba(246,236,215,.045);cursor:pointer;font:600 12px/1.2 var(--sans,system-ui);transition:background 160ms ease,border-color 160ms ease,transform 160ms ease}
      .atmosphere-mode:hover{background:rgba(246,236,215,.075)}
      .atmosphere-mode:active{transform:scale(.985)}
      .atmosphere-mode[aria-pressed="true"]{border-color:color-mix(in srgb,var(--accent) 62%,rgba(246,236,215,.15));background:color-mix(in srgb,var(--accent) 13%,rgba(246,236,215,.04))}
      .atmosphere-headphone-icon{display:inline-block;width:13px;height:13px;margin-left:5px;vertical-align:-2px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .atmosphere-level{margin-top:16px}
      .atmosphere-level-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
      .atmosphere-level label{font:600 12px/1 var(--sans,system-ui)}
      .atmosphere-level output{opacity:0;transition:opacity 140ms ease;color:rgba(246,236,215,.68);font:600 11px/1 var(--sans,system-ui)}
      .atmosphere-level.is-adjusting output{opacity:1}
      .atmosphere-level input{--fill:${Math.round(state.level * 100)}%;appearance:none;-webkit-appearance:none;width:100%;height:24px;margin:0;background:transparent;cursor:pointer}
      .atmosphere-level input::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:linear-gradient(90deg,var(--accent) 0 var(--fill),rgba(246,236,215,.14) var(--fill) 100%)}
      .atmosphere-level input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;margin-top:-6px;border:2px solid rgba(12,14,25,.95);border-radius:50%;background:#f6ecd7;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 35%,transparent),0 3px 10px rgba(0,0,0,.35)}
      .atmosphere-level input::-moz-range-track{height:6px;border-radius:999px;background:rgba(246,236,215,.14)}
      .atmosphere-level input::-moz-range-progress{height:6px;border-radius:999px;background:var(--accent)}
      .atmosphere-level input::-moz-range-thumb{width:16px;height:16px;border:2px solid rgba(12,14,25,.95);border-radius:50%;background:#f6ecd7;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 35%,transparent),0 3px 10px rgba(0,0,0,.35)}
      .atmosphere-level input:disabled{opacity:.35;cursor:default}
      .atmosphere-status{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      .atmosphere-panel :focus-visible{outline:2px solid var(--accent);outline-offset:3px}
      @media(max-width:700px){.atmosphere-backdrop{background:rgba(3,5,10,.42)}.atmosphere-panel{top:auto;right:max(10px,env(safe-area-inset-right));bottom:max(10px,calc(env(safe-area-inset-bottom) + 8px));left:max(10px,env(safe-area-inset-left));width:auto;border-radius:24px;padding:16px}}
      @media(max-width:390px){.atmosphere-panel{left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom))}.atmosphere-modes{grid-template-columns:1fr 1fr}}
      @media(prefers-reduced-motion:reduce){.atmosphere-button::after,.atmosphere-mode,.atmosphere-level output{transition:none}}
    `;
    document.head.append(style);
  }

  function focusables() {
    return [...state.panel.querySelectorAll('button:not([disabled]),input:not([disabled]),[href],[tabindex]:not([tabindex="-1"])')].filter((node) => node.getClientRects().length > 0);
  }

  function setBackgroundInert(inert) {
    if (inert) {
      state.inertNodes = [app, document.getElementById('providerStage'), document.getElementById('youtubeStage'), document.getElementById('installBanner')].filter((node) => node && node !== state.panel && !state.panel.contains(node));
      state.inertNodes.forEach((node) => node.setAttribute('inert', ''));
    } else {
      state.inertNodes.forEach((node) => node.removeAttribute('inert'));
      state.inertNodes = [];
    }
  }

  function createUi() {
    injectStyles();
    const button = document.createElement('button');
    button.id = 'atmosphereButton';
    button.className = 'icon-button atmosphere-button';
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.7"></circle><path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2M15.6 8.4a5.1 5.1 0 0 1 0 7.2M5.5 5.5a9.2 9.2 0 0 0 0 13M18.5 5.5a9.2 9.2 0 0 1 0 13"></path></svg>';
    const queue = document.getElementById('queueButton');
    utilityBar.insertBefore(button, queue?.nextSibling || null);

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'atmosphere-backdrop';
    backdrop.hidden = true;
    backdrop.tabIndex = -1;
    backdrop.setAttribute('aria-label', 'Close Garba Atmosphere');
    document.body.append(backdrop);

    const panel = document.createElement('section');
    panel.id = 'atmospherePanel';
    panel.className = 'atmosphere-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'atmosphereTitle');
    panel.innerHTML = `
      <div class="atmosphere-panel-header">
        <div class="atmosphere-heading">
          <h2 id="atmosphereTitle">Garba Atmosphere</h2>
          <button class="atmosphere-test" type="button" aria-label="Test Garba Atmosphere" aria-pressed="false" title="Test atmosphere">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.4v13.2L18.5 12 8 5.4Z"></path></svg>
          </button>
        </div>
        <button class="atmosphere-close" type="button" aria-label="Close Garba Atmosphere">×</button>
      </div>
      <div class="atmosphere-modes"></div>
      <div class="atmosphere-level">
        <div class="atmosphere-level-row"><label for="atmosphereLevel">Intensity</label><output for="atmosphereLevel">${Math.round(state.level * 100)}%</output></div>
        <input id="atmosphereLevel" type="range" min="5" max="100" step="5" value="${Math.round(state.level * 100)}" />
      </div>
      <p class="atmosphere-status" role="status" aria-live="polite"></p>
    `;
    document.body.append(panel);

    const modes = panel.querySelector('.atmosphere-modes');
    for (const [id, profile] of Object.entries(MODES)) {
      const mode = document.createElement('button');
      mode.type = 'button';
      mode.className = 'atmosphere-mode';
      mode.dataset.mode = id;
      const headphone = id === 'immersive' ? '<svg class="atmosphere-headphone-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"></path><path d="M4 14h3v6H5.5A1.5 1.5 0 0 1 4 18.5V14ZM20 14h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5V14Z"></path></svg>' : '';
      mode.innerHTML = `${profile.label}${headphone}`;
      mode.addEventListener('click', () => setMode(id, { userGesture: true }));
      modes.append(mode);
    }

    const close = panel.querySelector('.atmosphere-close');
    const test = panel.querySelector('.atmosphere-test');
    const slider = panel.querySelector('#atmosphereLevel');
    const output = panel.querySelector('output');
    const levelWrap = panel.querySelector('.atmosphere-level');

    const syncSliderFill = () => slider.style.setProperty('--fill', `${slider.value}%`);
    const endAdjust = () => levelWrap.classList.remove('is-adjusting');

    button.addEventListener('click', () => setPanelOpen(!state.panelOpen));
    backdrop.addEventListener('click', () => setPanelOpen(false));
    close.addEventListener('click', () => setPanelOpen(false));
    test.addEventListener('click', () => togglePreview());
    slider.addEventListener('input', () => {
      state.level = clamp(Number(slider.value) / 100, 0.05, 1);
      output.value = `${Math.round(state.level * 100)}%`;
      levelWrap.classList.add('is-adjusting');
      syncSliderFill();
      persist();
      applyMasterLevel();
      dispatchChange('level');
    });
    slider.addEventListener('pointerup', () => setTimeout(endAdjust, 500));
    slider.addEventListener('change', () => setTimeout(endAdjust, 500));
    slider.addEventListener('blur', endAdjust);

    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPanelOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    state.button = button;
    state.backdrop = backdrop;
    state.panel = panel;
    state.slider = slider;
    state.output = output;
    state.test = test;
    state.status = panel.querySelector('.atmosphere-status');
    syncSliderFill();
    syncUi();
  }

  function setPanelOpen(open) {
    const next = Boolean(open);
    if (next === state.panelOpen) return;
    state.panelOpen = next;
    if (next) {
      state.previousFocus = document.activeElement;
      state.panel.hidden = false;
      state.backdrop.hidden = false;
      state.button.setAttribute('aria-expanded', 'true');
      setBackgroundInert(true);
      requestAnimationFrame(() => state.panel.querySelector('.atmosphere-mode[aria-pressed="true"]')?.focus({ preventScroll: true }));
    } else {
      state.panel.hidden = true;
      state.backdrop.hidden = true;
      state.button.setAttribute('aria-expanded', 'false');
      setBackgroundInert(false);
      const target = state.previousFocus?.isConnected ? state.previousFocus : state.button;
      state.previousFocus = null;
      target?.focus?.({ preventScroll: true });
    }
  }

  function syncUi() {
    const profile = MODES[state.mode];
    if (!state.button) return;
    state.button.setAttribute('aria-pressed', String(state.mode !== 'off'));
    state.button.setAttribute('aria-label', `Garba Atmosphere: ${profile.label}`);
    state.button.title = `Garba Atmosphere: ${profile.label}`;
    state.panel?.querySelectorAll('.atmosphere-mode').forEach((control) => control.setAttribute('aria-pressed', String(control.dataset.mode === state.mode)));
    if (state.slider) state.slider.disabled = state.mode === 'off';
    if (state.test) {
      state.test.disabled = state.mode === 'off';
      state.test.setAttribute('aria-pressed', String(state.previewActive));
      state.test.setAttribute('aria-label', state.previewActive ? 'Stop atmosphere test' : 'Test Garba Atmosphere');
      state.test.title = state.previewActive ? 'Stop test' : 'Test atmosphere';
      const path = state.test.querySelector('path');
      if (path) path.setAttribute('d', state.previewActive ? 'M7 6h4v12H7V6Zm6 0h4v12h-4V6Z' : 'M8 5.4v13.2L18.5 12 8 5.4Z');
    }
  }

  function setStatus(message = '') {
    if (state.status) state.status.textContent = message;
  }

  function dispatchChange(reason) {
    window.dispatchEvent(new CustomEvent('garba:atmosphere-change', { detail: { reason, mode: state.mode, level: state.level, audible: state.playbackActive || state.previewActive, constrained: constrainedConnection() } }));
  }

  function createStickBuffer(variation = 0) {
    const duration = 0.07;
    const rate = state.context.sampleRate;
    const buffer = state.context.createBuffer(1, Math.ceil(rate * duration), rate);
    const data = buffer.getChannelData(0);
    const base = 960 + variation * 90;
    for (let i = 0; i < data.length; i += 1) {
      const t = i / rate;
      const env = Math.exp(-t * 58);
      const wood = Math.sin(Math.PI * 2 * base * t) * 0.52 + Math.sin(Math.PI * 2 * (base * 1.72) * t) * 0.24;
      data[i] = (wood + (Math.random() * 2 - 1) * 0.11) * env;
    }
    return buffer;
  }

  function createClapBuffer(variation = 0) {
    const duration = 0.14;
    const rate = state.context.sampleRate;
    const buffer = state.context.createBuffer(1, Math.ceil(rate * duration), rate);
    const data = buffer.getChannelData(0);
    const bursts = [0, 0.015 + variation * 0.001, 0.031 + variation * 0.0015];
    for (let i = 0; i < data.length; i += 1) {
      const t = i / rate;
      let env = 0;
      for (const start of bursts) if (t >= start) env += Math.exp(-(t - start) * 52);
      data[i] = (Math.random() * 2 - 1) * Math.min(1, env) * 0.62;
    }
    return buffer;
  }

  async function ensureContext() {
    if (!AudioContextCtor) { setStatus('Atmosphere audio is not supported on this browser.'); return false; }
    if (!state.context) {
      try { state.context = new AudioContextCtor({ latencyHint: 'playback' }); } catch {
        try { state.context = new AudioContextCtor(); } catch { setStatus('Garba Atmosphere could not start on this device.'); return false; }
      }
      state.master = state.context.createGain();
      state.master.gain.value = 0;
      state.highpass = state.context.createBiquadFilter();
      state.highpass.type = 'highpass';
      state.highpass.frequency.value = 105;
      state.highpass.Q.value = 0.28;
      state.lowpass = state.context.createBiquadFilter();
      state.lowpass.type = 'lowpass';
      state.lowpass.frequency.value = 7800;
      state.lowpass.Q.value = 0.22;
      state.compressor = state.context.createDynamicsCompressor();
      state.compressor.threshold.value = -20;
      state.compressor.knee.value = 18;
      state.compressor.ratio.value = 2.6;
      state.compressor.attack.value = 0.008;
      state.compressor.release.value = 0.22;
      state.master.connect(state.highpass).connect(state.lowpass).connect(state.compressor).connect(state.context.destination);
      state.stickBuffers = [0, 1, 2].map(createStickBuffer);
      state.clapBuffers = [0, 1, 2].map(createClapBuffer);
    }
    if (state.context.state !== 'running') {
      try { await state.context.resume(); } catch { return false; }
    }
    return state.context.state === 'running';
  }

  function createNoiseBuffer(seconds = 4, seedOffset = 0) {
    const rate = state.context.sampleRate;
    const buffer = state.context.createBuffer(1, Math.ceil(rate * seconds), rate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.018 * white) / 1.018;
      const t = index / rate;
      data[index] = clamp(brown * 2.2 * (0.72 + 0.28 * Math.sin((t + seedOffset) * Math.PI * 0.18)), -1, 1);
    }
    return buffer;
  }

  function createPanner(angle, distance = 1.8, hrtf = true) {
    const panner = state.context.createPanner();
    panner.panningModel = hrtf ? 'HRTF' : 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 9;
    panner.rolloffFactor = 0.46;
    panner.positionX.value = Math.sin(angle) * distance;
    panner.positionY.value = 0;
    panner.positionZ.value = -Math.cos(angle) * distance;
    return panner;
  }

  function createBedVoice(index, count, spatial) {
    const source = state.context.createBufferSource();
    source.buffer = createNoiseBuffer(4.2 + index * 0.39, index * 0.6);
    source.loop = true;
    const filter = state.context.createBiquadFilter();
    filter.type = index % 2 ? 'bandpass' : 'lowpass';
    filter.frequency.value = index % 2 ? 620 + index * 95 : 980 + index * 75;
    filter.Q.value = index % 2 ? 0.52 : 0.28;
    const gain = state.context.createGain();
    gain.gain.value = 0.060 + index * 0.008;
    const angle = (index / Math.max(1, count)) * Math.PI * 2 + 0.45;
    const panner = createPanner(angle, spatial ? 2.0 : 2.7, spatial);
    source.connect(filter).connect(gain).connect(panner).connect(state.master);
    source.start(0, Math.random() * source.buffer.duration);
    return { source, filter, gain, panner, angle };
  }

  async function loadCrowdBuffer() {
    if (state.crowdBuffer) return state.crowdBuffer;
    if (state.crowdPromise) return state.crowdPromise;
    if (constrainedConnection() || !navigator.onLine) return null;
    state.crowdPromise = (async () => {
      try {
        const manifestResponse = await fetch(SOURCE_MANIFEST, { cache: 'force-cache' });
        if (!manifestResponse.ok) return null;
        const manifest = await manifestResponse.json();
        const sourceMeta = manifest.sources?.find((entry) => entry.enabled && entry.role === 'crowd-bed');
        if (!sourceMeta?.audioUrl || sourceMeta.license !== 'public-domain' || sourceMeta.containsMusic !== false) return null;
        const response = await fetch(sourceMeta.audioUrl, { mode: 'cors', cache: 'force-cache' });
        if (!response.ok) return null;
        const bytes = await response.arrayBuffer();
        state.crowdBuffer = await state.context.decodeAudioData(bytes.slice(0));
        return state.crowdBuffer;
      } catch { return null; } finally { state.crowdPromise = null; }
    })();
    return state.crowdPromise;
  }

  function stopCrowd() {
    try { state.crowdSource?.stop(); } catch { /* already stopped */ }
    for (const node of [state.crowdSource, state.crowdFilter, state.crowdGain]) try { node?.disconnect(); } catch { /* no-op */ }
    state.crowdSource = null;
    state.crowdGain = null;
    state.crowdFilter = null;
  }

  async function startCrowd(profile, generation) {
    stopCrowd();
    if (!profile?.crowd || state.previewActive || constrainedConnection()) return;
    const buffer = await loadCrowdBuffer();
    if (!buffer || generation !== state.generation || state.mode === 'off' || !state.playbackActive) return;
    const source = state.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = state.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5400;
    filter.Q.value = 0.2;
    const gain = state.context.createGain();
    gain.gain.value = profile.crowd * 0.34;
    source.connect(filter).connect(gain).connect(state.master);
    source.start(0, Math.random() * Math.max(0.1, buffer.duration - 1));
    state.crowdSource = source;
    state.crowdFilter = filter;
    state.crowdGain = gain;
  }

  function disconnectVoice(voice) {
    try { voice.source.stop(); } catch { /* already stopped */ }
    for (const node of [voice.source, voice.filter, voice.gain, voice.panner]) try { node.disconnect(); } catch { /* no-op */ }
  }

  function clearScene() {
    clearTimeout(state.eventTimer);
    clearInterval(state.orbitTimer);
    state.eventTimer = 0;
    state.orbitTimer = 0;
    state.voices.splice(0).forEach(disconnectVoice);
    stopCrowd();
    state.sceneReady = false;
  }

  function eventPanner() {
    return createPanner(Math.random() * Math.PI * 2, 1.35 + Math.random() * 1.8, true);
  }

  function playTransient(kind) {
    if (!state.context || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const source = state.context.createBufferSource();
    source.buffer = kind === 'stick' ? state.stickBuffers[Math.floor(Math.random() * state.stickBuffers.length)] : state.clapBuffers[Math.floor(Math.random() * state.clapBuffers.length)];
    const filter = state.context.createBiquadFilter();
    filter.type = kind === 'stick' ? 'lowpass' : 'bandpass';
    filter.frequency.value = kind === 'stick' ? 3900 + Math.random() * 700 : 1450 + Math.random() * 450;
    if (kind === 'clap') filter.Q.value = 0.55;
    const gain = state.context.createGain();
    gain.gain.value = kind === 'stick' ? 0.18 + Math.random() * 0.06 : 0.14 + Math.random() * 0.05;
    const panner = eventPanner();
    source.connect(filter).connect(gain).connect(panner).connect(state.master);
    source.start();
    source.addEventListener('ended', () => { for (const node of [source, filter, gain, panner]) try { node.disconnect(); } catch { /* no-op */ } }, { once: true });
  }

  function scheduleEvent(profile, generation) {
    clearTimeout(state.eventTimer);
    if (!profile?.events || generation !== state.generation || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const base = state.mode === 'immersive' ? 1450 : state.mode === 'ground' ? 1950 : 3100;
    const spread = state.mode === 'immersive' ? 2400 : state.mode === 'ground' ? 3000 : 4200;
    const delay = base + Math.random() * spread / Math.max(0.18, profile.events);
    state.eventTimer = setTimeout(() => {
      if (generation !== state.generation || (!state.playbackActive && !state.previewActive)) return;
      playTransient(Math.random() < 0.58 ? 'stick' : 'clap');
      if ((state.mode === 'immersive' || state.mode === 'ground') && Math.random() < 0.20) setTimeout(() => { if (generation === state.generation && (state.playbackActive || state.previewActive)) playTransient('stick'); }, 120 + Math.random() * 120);
      scheduleEvent(profile, generation);
    }, delay);
  }

  function startOrbit(generation) {
    clearInterval(state.orbitTimer);
    if (state.mode !== 'immersive' || reducedMotion.matches) return;
    state.orbitTimer = setInterval(() => {
      if (generation !== state.generation || state.mode !== 'immersive' || !state.context || !state.sceneReady) return;
      const now = state.context.currentTime;
      state.voices.forEach((voice, index) => {
        voice.angle += (index % 2 ? -1 : 1) * (0.10 + Math.random() * 0.09);
        const distance = 2.0 + index * 0.08;
        voice.panner.positionX.setTargetAtTime(Math.sin(voice.angle) * distance, now, 3.2);
        voice.panner.positionZ.setTargetAtTime(-Math.cos(voice.angle) * distance, now, 3.2);
      });
    }, 5200);
  }

  function targetMasterGain() {
    if (!state.context || !state.master || state.mode === 'off' || document.hidden || (!state.playbackActive && !state.previewActive)) return 0;
    return runtimeProfile().master * state.level;
  }

  function applyMasterLevel({ quick = false } = {}) {
    if (!state.context || !state.master) return;
    const target = targetMasterGain();
    const now = state.context.currentTime;
    state.master.gain.cancelScheduledValues(now);
    state.master.gain.setTargetAtTime(target, now, target > 0 ? (quick ? 0.06 : 0.18) : 0.055);
  }

  async function buildScene({ smooth = true } = {}) {
    const generation = ++state.generation;
    clearTimeout(state.idleTimer);
    if (state.mode === 'off') { applyMasterLevel({ quick: true }); clearScene(); return; }
    if (!await ensureContext()) return;
    if (smooth && state.sceneReady) {
      state.master.gain.setTargetAtTime(0, state.context.currentTime, 0.05);
      await sleep(110);
      if (generation !== state.generation) return;
    }
    clearScene();
    const profile = runtimeProfile();
    for (let index = 0; index < profile.voices; index += 1) state.voices.push(createBedVoice(index, profile.voices, profile.spatial));
    state.sceneReady = true;
    scheduleEvent(profile, generation);
    startOrbit(generation);
    applyMasterLevel();
    void startCrowd(profile, generation);
  }

  function scheduleIdleSuspend() {
    clearTimeout(state.idleTimer);
    if (state.previewActive || state.playbackActive || state.mode === 'off') return;
    state.idleTimer = setTimeout(() => {
      if (state.previewActive || state.playbackActive) return;
      clearScene();
      if (state.context?.state === 'running') state.context.suspend().catch(() => {});
    }, 2400);
  }

  function stopPreview({ announce = true } = {}) {
    clearTimeout(state.previewTimer);
    state.previewTimer = 0;
    if (!state.previewActive) return;
    state.previewActive = false;
    syncUi();
    applyMasterLevel({ quick: true });
    if (announce) setStatus('Atmosphere test stopped.');
    scheduleIdleSuspend();
    dispatchChange('preview-ended');
  }

  async function previewCurrentMode() {
    if (state.mode === 'off') return;
    if (state.previewActive) { stopPreview(); return; }
    clearTimeout(state.previewTimer);
    if (!await ensureContext()) return;
    state.previewActive = true;
    syncUi();
    await buildScene({ smooth: true });
    setStatus(`Testing ${MODES[state.mode].label}.`);
    state.previewTimer = setTimeout(() => stopPreview({ announce: false }), 6000);
    dispatchChange('preview-started');
  }

  function togglePreview() { return previewCurrentMode(); }

  async function setMode(mode, { userGesture = false } = {}) {
    if (!MODES[mode]) return;
    stopPreview({ announce: false });
    state.mode = mode;
    persist();
    syncUi();
    dispatchChange('mode');
    if (mode === 'off') {
      applyMasterLevel({ quick: true });
      await sleep(100);
      clearScene();
      scheduleIdleSuspend();
      return;
    }
    if (userGesture && !await ensureContext()) return;
    state.playbackActive = playbackIsActive();
    if (state.playbackActive) await buildScene({ smooth: true });
    else scheduleIdleSuspend();
  }

  function syncPlaybackState() {
    const active = playbackIsActive();
    if (active === state.playbackActive && !(active && state.mode !== 'off' && !state.sceneReady)) return;
    state.playbackActive = active;
    if (active) stopPreview({ announce: false });
    dispatchChange(active ? 'play' : 'pause');
    if (state.mode === 'off') return;
    if (active) {
      clearTimeout(state.idleTimer);
      ensureContext().then((ready) => {
        if (!ready || !state.playbackActive) return;
        if (!state.sceneReady) void buildScene({ smooth: false });
        else {
          applyMasterLevel();
          scheduleEvent(runtimeProfile(), state.generation);
          startOrbit(state.generation);
          if (runtimeProfile().crowd && !state.crowdSource) void startCrowd(runtimeProfile(), state.generation);
        }
      });
    } else if (!state.previewActive) {
      applyMasterLevel({ quick: true });
      scheduleIdleSuspend();
    }
  }

  function trustedPlaybackUnlock(event) {
    if (!event.isTrusted || state.mode === 'off') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest('#playButton,#miniPlay,.song-copy,#prevButton,#nextButton,#miniPrev,#miniNext,#atmosphereButton,.atmosphere-mode,#atmosphereLevel,.atmosphere-test')) return;
    ensureContext().then((ready) => { if (ready) requestAnimationFrame(syncPlaybackState); });
  }

  function handleConnectionChange() {
    if (state.mode !== 'off' && state.playbackActive) void buildScene({ smooth: true });
  }

  createUi();
  state.playbackActive = playbackIsActive();

  directAudio?.addEventListener('play', syncPlaybackState);
  directAudio?.addEventListener('pause', syncPlaybackState);
  directAudio?.addEventListener('ended', syncPlaybackState);
  directAudio?.addEventListener('emptied', syncPlaybackState);
  document.addEventListener('pointerdown', trustedPlaybackUnlock, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (!event.isTrusted || event.code !== 'Space' || state.mode === 'off') return;
    ensureContext().then((ready) => { if (ready) requestAnimationFrame(syncPlaybackState); });
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.playbackActive = false;
      stopPreview({ announce: false });
      applyMasterLevel({ quick: true });
      scheduleIdleSuspend();
    } else requestAnimationFrame(syncPlaybackState);
  });
  new MutationObserver(syncPlaybackState).observe(app, { attributes: true, attributeFilter: ['class'] });
  connection?.addEventListener?.('change', handleConnectionChange);
  reducedMotion.addEventListener?.('change', () => { if (state.mode === 'immersive' && (state.playbackActive || state.previewActive)) void buildScene({ smooth: true }); });

  const songSheet = document.getElementById('songSheet');
  if (songSheet) new MutationObserver(() => { if (state.panelOpen && songSheet.getAttribute('aria-hidden') === 'false') setPanelOpen(false); }).observe(songSheet, { attributes: true, attributeFilter: ['aria-hidden'] });

  window.addEventListener('pagehide', () => {
    stopPreview({ announce: false });
    state.playbackActive = false;
    applyMasterLevel({ quick: true });
    if (state.context?.state === 'running') state.context.suspend().catch(() => {});
  });
  window.addEventListener('pageshow', () => requestAnimationFrame(syncPlaybackState));

  window.GARBA_ATMOSPHERE = {
    get mode() { return state.mode; },
    set mode(value) { void setMode(value); },
    get level() { return state.level; },
    set level(value) {
      state.level = clamp(Number(value) || 0.45, 0.05, 1);
      if (state.slider) {
        state.slider.value = String(Math.round(state.level * 100));
        state.slider.style.setProperty('--fill', `${Math.round(state.level * 100)}%`);
      }
      if (state.output) state.output.value = `${Math.round(state.level * 100)}%`;
      persist();
      applyMasterLevel();
      dispatchChange('level');
    },
    get active() { return state.mode !== 'off' && (state.playbackActive || state.previewActive) && Boolean(state.context) && state.sceneReady; },
    get playbackSynced() { return state.playbackActive; },
    get constrained() { return constrainedConnection(); },
    get spatialModel() { return state.mode === 'immersive' ? 'HRTF' : 'stereo-plus-spatial-events'; },
    setMode,
    preview() { return previewCurrentMode(); },
    stopPreview,
    stop() { return setMode('off'); },
  };
})();