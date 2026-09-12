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
    courtyard: { label: 'Courtyard', master: 0.28, voices: 2, events: 0.40, crowd: 0, spatial: true },
    ground: { label: 'Live Ground', master: 0.34, voices: 3, events: 0.58, crowd: 0.45, spatial: false },
    immersive: { label: 'Immersive 360°', master: 0.40, voices: 4, events: 0.72, crowd: 0.38, spatial: true },
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  })();

  const state = {
    context: null,
    master: null,
    convolver: null,
    convolverGain: null,
    dryGain: null,
    subFilter: null,
    bodyFilter: null,
    airFilter: null,
    highpass: null,
    lowpass: null,
    compressor: null,
    mode: MODES[stored?.mode] ? stored.mode : 'off',
    level: clamp(Number(stored?.level ?? 0.45), 0.05, 1),
    voices: [],
    stickBuffers: [],
    clapBuffers: [],
    thumpBuffers: [],
    phraseTimers: [],
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
    test.addEventListener('click', () => {
      ensureContext().then(() => togglePreview());
    });
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

  function createVenueImpulse(mode) {
    const rate = state.context.sampleRate;
    const duration = mode === 'courtyard' ? 2.4 : mode === 'ground' ? 1.6 : 2.5;
    const length = Math.ceil(rate * duration);
    const buffer = state.context.createBuffer(2, length, rate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    if (mode === 'courtyard') {
      const earlyTaps = [
        { time: 0.013, gainL: 0.62, gainR: 0.36 },
        { time: 0.026, gainL: 0.34, gainR: 0.56 },
        { time: 0.045, gainL: 0.50, gainR: 0.44 },
        { time: 0.070, gainL: 0.36, gainR: 0.46 },
        { time: 0.096, gainL: 0.40, gainR: 0.28 },
        { time: 0.132, gainL: 0.26, gainR: 0.34 },
      ];
      for (const tap of earlyTaps) {
        const idx = Math.floor(tap.time * rate);
        if (idx < length) {
          left[idx] += tap.gainL;
          right[idx] += tap.gainR;
        }
      }
      let b0L = 0;
      let b0R = 0;
      for (let i = 0; i < length; i += 1) {
        const t = i / rate;
        const dampCutoff = Math.max(0.04, 1.0 - t * 0.42);
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        b0L = b0L * (1 - dampCutoff) + whiteL * dampCutoff;
        b0R = b0R * (1 - dampCutoff) + whiteR * dampCutoff;
        const decay = Math.exp(-t * 2.7);
        left[i] += b0L * decay * 0.48;
        right[i] += b0R * decay * 0.48;
      }
    } else if (mode === 'ground') {
      const slapTaps = [
        { time: 0.118, gainL: 0.54, gainR: 0.32 },
        { time: 0.182, gainL: 0.32, gainR: 0.50 },
        { time: 0.244, gainL: 0.26, gainR: 0.22 },
      ];
      for (const tap of slapTaps) {
        const start = Math.floor(tap.time * rate);
        const smearLen = Math.floor(0.016 * rate);
        for (let s = 0; s < smearLen && (start + s) < length; s += 1) {
          const env = Math.sin((s / smearLen) * Math.PI);
          left[start + s] += (Math.random() * 2 - 1) * tap.gainL * env;
          right[start + s] += (Math.random() * 2 - 1) * tap.gainR * env;
        }
      }
      let b0L = 0;
      let b0R = 0;
      for (let i = 0; i < length; i += 1) {
        const t = i / rate;
        const dampCutoff = Math.max(0.02, 0.62 - t * 0.36);
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        b0L = b0L * (1 - dampCutoff) + whiteL * dampCutoff;
        b0R = b0R * (1 - dampCutoff) + whiteR * dampCutoff;
        const decay = Math.exp(-t * 3.7);
        left[i] += b0L * decay * 0.34;
        right[i] += b0R * decay * 0.34;
      }
    } else {
      const ringTaps = [
        { time: 0.008, gainL: 0.68, gainR: 0.38 },
        { time: 0.019, gainL: 0.42, gainR: 0.64 },
        { time: 0.038, gainL: 0.58, gainR: 0.42 },
        { time: 0.064, gainL: 0.34, gainR: 0.54 },
        { time: 0.098, gainL: 0.44, gainR: 0.34 },
        { time: 0.148, gainL: 0.28, gainR: 0.32 },
      ];
      for (const tap of ringTaps) {
        const idx = Math.floor(tap.time * rate);
        if (idx < length) {
          left[idx] += tap.gainL;
          right[idx] += tap.gainR;
        }
      }
      let b0L = 0;
      let b0R = 0;
      for (let i = 0; i < length; i += 1) {
        const t = i / rate;
        const dampCutoff = Math.max(0.05, 0.94 - t * 0.30);
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        b0L = b0L * (1 - dampCutoff) + whiteL * dampCutoff;
        b0R = b0R * (1 - dampCutoff) + whiteR * dampCutoff;
        const decay = Math.exp(-t * 2.3);
        left[i] += b0L * decay * 0.42;
        right[i] += b0R * decay * 0.42;
      }
    }

    let maxVal = 0;
    for (let i = 0; i < length; i += 1) {
      const aL = Math.abs(left[i]);
      const aR = Math.abs(right[i]);
      if (aL > maxVal) maxVal = aL;
      if (aR > maxVal) maxVal = aR;
    }
    if (maxVal > 0.001) {
      const norm = 0.88 / maxVal;
      for (let i = 0; i < length; i += 1) {
        left[i] *= norm;
        right[i] *= norm;
      }
    }
    return buffer;
  }

  function updateVenueAcoustics(mode) {
    if (!state.context || mode === 'off') return;
    try {
      if (state.convolver) {
        state.master.disconnect(state.convolver);
        state.convolver.disconnect();
      }
    } catch { /* no-op */ }
    state.convolver = state.context.createConvolver();
    state.convolver.buffer = createVenueImpulse(mode);
    state.master.connect(state.convolver);
    state.convolver.connect(state.convolverGain);

    if (mode === 'courtyard') {
      state.convolverGain.gain.value = 0.56;
      state.dryGain.gain.value = 0.72;
      state.bodyFilter.gain.value = 2.6;
      state.airFilter.gain.value = -1.8;
    } else if (mode === 'ground') {
      state.convolverGain.gain.value = 0.42;
      state.dryGain.gain.value = 0.82;
      state.bodyFilter.gain.value = 1.2;
      state.airFilter.gain.value = -3.6;
    } else {
      state.convolverGain.gain.value = 0.60;
      state.dryGain.gain.value = 0.75;
      state.bodyFilter.gain.value = 2.0;
      state.airFilter.gain.value = -1.5;
    }
  }

  function createStickBuffer(variation = 0) {
    const duration = 0.16;
    const rate = state.context.sampleRate;
    const buffer = state.context.createBuffer(1, Math.ceil(rate * duration), rate);
    const data = buffer.getChannelData(0);
    const f1 = 1060 + variation * 85;
    const f2 = f1 * 2.76;
    const f3 = f1 * 5.40;
    const b1 = 5880 + variation * 140;
    const b2 = 7420 + variation * 180;
    for (let i = 0; i < data.length; i += 1) {
      const t = i / rate;
      const crack = (Math.random() * 2 - 1) * Math.exp(-t * 360) * 0.45;
      const woodEnv = Math.exp(-t * 54);
      const wood = (
        Math.sin(Math.PI * 2 * f1 * t) * 0.55 +
        Math.sin(Math.PI * 2 * f2 * t) * 0.28 +
        Math.sin(Math.PI * 2 * f3 * t) * 0.14
      ) * woodEnv;
      let brass = 0;
      if (t > 0.0015) {
        const bt = t - 0.0015;
        const shimmer = 0.7 + 0.3 * Math.sin(Math.PI * 2 * 175 * bt);
        const brassEnv = Math.exp(-bt * 38);
        brass = (
          Math.sin(Math.PI * 2 * b1 * bt) * 0.22 +
          Math.sin(Math.PI * 2 * b2 * bt) * 0.15 +
          (Math.random() * 2 - 1) * 0.08
        ) * shimmer * brassEnv;
      }
      data[i] = clamp((crack + wood + brass) * 0.92, -1, 1);
    }
    return buffer;
  }

  function createClapBuffer(variation = 0) {
    const duration = 0.24;
    const rate = state.context.sampleRate;
    const buffer = state.context.createBuffer(1, Math.ceil(rate * duration), rate);
    const data = buffer.getChannelData(0);
    const cavityFreq = 390 + variation * 35;
    const flams = [
      { start: 0, amp: 0.95 },
      { start: 0.008 + variation * 0.002, amp: 0.72 },
      { start: 0.017 + variation * 0.003, amp: 0.58 },
      { start: 0.026 + variation * 0.004, amp: 0.40 },
    ];
    for (let i = 0; i < data.length; i += 1) {
      const t = i / rate;
      let sum = 0;
      for (const flam of flams) {
        if (t >= flam.start) {
          const dt = t - flam.start;
          const cavity = Math.sin(Math.PI * 2 * cavityFreq * dt) * Math.exp(-dt * 46) * 0.45;
          const slapNoise = (Math.random() * 2 - 1) * Math.exp(-dt * 78) * 0.55;
          sum += (cavity + slapNoise) * flam.amp;
        }
      }
      data[i] = clamp(sum * 0.68, -1, 1);
    }
    return buffer;
  }

  function createThumpBuffer(variation = 0) {
    const duration = 0.18;
    const rate = state.context.sampleRate;
    const buffer = state.context.createBuffer(1, Math.ceil(rate * duration), rate);
    const data = buffer.getChannelData(0);
    const startFreq = 86 + variation * 8;
    for (let i = 0; i < data.length; i += 1) {
      const t = i / rate;
      const currentFreq = Math.max(44, startFreq * Math.exp(-t * 18));
      const phase = Math.PI * 2 * currentFreq * t;
      const thump = Math.sin(phase) * Math.exp(-t * 26) * 0.75;
      const gravel = (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.22;
      data[i] = clamp((thump + gravel) * 0.85, -1, 1);
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

      state.dryGain = state.context.createGain();
      state.dryGain.gain.value = 0.76;

      state.convolverGain = state.context.createGain();
      state.convolverGain.gain.value = 0.54;

      state.subFilter = state.context.createBiquadFilter();
      state.subFilter.type = 'peaking';
      state.subFilter.frequency.value = 65;
      state.subFilter.gain.value = 3.2;
      state.subFilter.Q.value = 0.85;

      state.bodyFilter = state.context.createBiquadFilter();
      state.bodyFilter.type = 'peaking';
      state.bodyFilter.frequency.value = 360;
      state.bodyFilter.gain.value = 2.2;
      state.bodyFilter.Q.value = 0.9;

      state.airFilter = state.context.createBiquadFilter();
      state.airFilter.type = 'highshelf';
      state.airFilter.frequency.value = 6200;
      state.airFilter.gain.value = -2.5;

      state.highpass = state.context.createBiquadFilter();
      state.highpass.type = 'highpass';
      state.highpass.frequency.value = 42;
      state.highpass.Q.value = 0.4;

      state.lowpass = state.context.createBiquadFilter();
      state.lowpass.type = 'lowpass';
      state.lowpass.frequency.value = 9400;
      state.lowpass.Q.value = 0.25;

      state.compressor = state.context.createDynamicsCompressor();
      state.compressor.threshold.value = -16;
      state.compressor.knee.value = 12;
      state.compressor.ratio.value = 2.6;
      state.compressor.attack.value = 0.005;
      state.compressor.release.value = 0.22;

      state.master.connect(state.dryGain);
      state.dryGain.connect(state.subFilter);
      state.convolverGain.connect(state.subFilter);

      state.subFilter.connect(state.bodyFilter)
        .connect(state.airFilter)
        .connect(state.highpass)
        .connect(state.lowpass)
        .connect(state.compressor)
        .connect(state.context.destination);

      state.stickBuffers = [0, 1, 2, 3].map(createStickBuffer);
      state.clapBuffers = [0, 1, 2, 3].map(createClapBuffer);
      state.thumpBuffers = [0, 1].map(createThumpBuffer);
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
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.992 * b0 + white * 0.055;
      b1 = 0.955 * b1 + white * 0.115;
      b2 = 0.850 * b2 + white * 0.240;
      const pink = (b0 + b1 + b2) * 0.42;
      const t = index / rate;
      const swell = 0.82 + 0.18 * Math.sin((t + seedOffset) * Math.PI * 0.32);
      data[index] = clamp(pink * swell, -1, 1);
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
    const x = Math.sin(angle) * distance;
    const z = -Math.cos(angle) * distance;
    if (panner.positionX && 'value' in panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = 0;
      panner.positionZ.value = z;
    } else if (panner.setPosition) {
      panner.setPosition(x, 0, z);
    }
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
    gain.gain.value = 0.20 + index * 0.035;
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
        let response = await fetch(sourceMeta.audioUrl, { mode: 'cors', cache: 'force-cache' });
        if (!response.ok && sourceMeta.audioUrl.endsWith('.ogg')) {
          const mp3Fallback = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/fd/1_minute_at_the_alexa_mall_in_berlin.ogg/1_minute_at_the_alexa_mall_in_berlin.ogg.mp3';
          response = await fetch(mp3Fallback, { mode: 'cors', cache: 'force-cache' });
        }
        if (!response.ok) return null;
        const bytes = await response.arrayBuffer();
        try {
          state.crowdBuffer = await state.context.decodeAudioData(bytes.slice(0));
        } catch {
          const mp3Fallback = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/fd/1_minute_at_the_alexa_mall_in_berlin.ogg/1_minute_at_the_alexa_mall_in_berlin.ogg.mp3';
          const alt = await fetch(mp3Fallback, { mode: 'cors', cache: 'force-cache' });
          if (alt.ok) {
            const altBytes = await alt.arrayBuffer();
            state.crowdBuffer = await state.context.decodeAudioData(altBytes.slice(0));
          }
        }
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
    if (!profile?.crowd || constrainedConnection()) return;
    const buffer = await loadCrowdBuffer();
    if (!buffer || generation !== state.generation || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const source = state.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = state.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5400;
    filter.Q.value = 0.2;
    const gain = state.context.createGain();
    gain.gain.value = profile.crowd * 0.45;
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
    state.phraseTimers.forEach(clearTimeout);
    state.phraseTimers = [];
    state.voices.splice(0).forEach(disconnectVoice);
    stopCrowd();
    state.sceneReady = false;
  }

  function eventPanner(angle = null, distance = null) {
    const panAngle = angle ?? (Math.random() * Math.PI * 2);
    const panDistance = distance ?? (1.35 + Math.random() * 1.8);
    return createPanner(panAngle, panDistance, true);
  }

  function playTransient(kind, { angle = null, distance = null, gainScale = 1 } = {}) {
    if (!state.context || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const source = state.context.createBufferSource();
    if (kind === 'stick') {
      source.buffer = state.stickBuffers[Math.floor(Math.random() * state.stickBuffers.length)];
    } else if (kind === 'thump') {
      source.buffer = state.thumpBuffers[Math.floor(Math.random() * state.thumpBuffers.length)];
    } else {
      source.buffer = state.clapBuffers[Math.floor(Math.random() * state.clapBuffers.length)];
    }
    const filter = state.context.createBiquadFilter();
    if (kind === 'stick') {
      filter.type = 'lowpass';
      filter.frequency.value = 8600 + Math.random() * 1200;
    } else if (kind === 'thump') {
      filter.type = 'lowpass';
      filter.frequency.value = 160 + Math.random() * 40;
    } else {
      filter.type = 'bandpass';
      filter.frequency.value = 1800 + Math.random() * 420;
      filter.Q.value = 0.55;
    }
    const gain = state.context.createGain();
    const baseGain = kind === 'stick' ? 0.44 : kind === 'thump' ? 0.48 : 0.38;
    gain.gain.value = (baseGain + Math.random() * 0.08) * gainScale;
    const panner = eventPanner(angle, distance);
    source.connect(filter).connect(gain).connect(panner).connect(state.master);
    source.start();
    source.addEventListener('ended', () => { for (const node of [source, filter, gain, panner]) try { node.disconnect(); } catch { /* no-op */ } }, { once: true });
  }

  function playRhythmicPhrase(phraseType) {
    if (!state.context || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const generation = state.generation;
    const queueStep = (fn, delay) => {
      const tid = setTimeout(() => {
        if (generation === state.generation && (state.playbackActive || state.previewActive)) fn();
      }, delay);
      state.phraseTimers.push(tid);
    };

    if (phraseType === 'tran-taali') {
      playTransient('clap', { angle: -0.65, distance: 1.8, gainScale: 0.85 });
      queueStep(() => playTransient('clap', { angle: 0.65, distance: 1.8, gainScale: 0.88 }), 310);
      queueStep(() => {
        playTransient('clap', { angle: 0.05, distance: 1.4, gainScale: 1.15 });
        playTransient('thump', { angle: 0, distance: 1.2, gainScale: 1.1 });
        playTransient('stick', { angle: 0.25, distance: 1.6, gainScale: 0.95 });
      }, 620);
    } else if (phraseType === 'dandiya-duet') {
      playTransient('stick', { angle: -0.85, distance: 1.6, gainScale: 0.95 });
      queueStep(() => playTransient('stick', { angle: 0.85, distance: 1.6, gainScale: 0.95 }), 280);
      queueStep(() => {
        playTransient('stick', { angle: 0.0, distance: 1.3, gainScale: 1.2 });
        playTransient('thump', { angle: 0.1, distance: 1.3, gainScale: 0.9 });
      }, 560);
    } else if (phraseType === 'be-taali') {
      playTransient('clap', { angle: -0.4, distance: 1.7, gainScale: 0.9 });
      queueStep(() => {
        playTransient('clap', { angle: 0.4, distance: 1.6, gainScale: 1.05 });
        playTransient('thump', { angle: 0, distance: 1.3, gainScale: 0.85 });
      }, 190);
    } else {
      const pick = Math.random();
      if (pick < 0.45) playTransient('stick');
      else if (pick < 0.80) playTransient('clap');
      else playTransient('thump');
    }
  }

  function scheduleEvent(profile, generation) {
    clearTimeout(state.eventTimer);
    if (!profile?.events || generation !== state.generation || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const base = state.mode === 'immersive' ? 1100 : state.mode === 'ground' ? 1400 : 1900;
    const spread = state.mode === 'immersive' ? 1600 : state.mode === 'ground' ? 2000 : 2600;
    const delay = base + Math.random() * spread / Math.max(0.18, profile.events);
    state.eventTimer = setTimeout(() => {
      if (generation !== state.generation || (!state.playbackActive && !state.previewActive)) return;
      const roll = Math.random();
      if (state.mode === 'courtyard') {
        if (roll < 0.45) playRhythmicPhrase('tran-taali');
        else if (roll < 0.75) playRhythmicPhrase('be-taali');
        else playRhythmicPhrase('single');
      } else if (state.mode === 'ground') {
        if (roll < 0.42) playRhythmicPhrase('dandiya-duet');
        else if (roll < 0.74) playRhythmicPhrase('tran-taali');
        else playRhythmicPhrase('single');
      } else {
        if (roll < 0.38) playRhythmicPhrase('dandiya-duet');
        else if (roll < 0.72) playRhythmicPhrase('tran-taali');
        else if (roll < 0.90) playRhythmicPhrase('be-taali');
        else playRhythmicPhrase('single');
      }
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
        const x = Math.sin(voice.angle) * distance;
        const z = -Math.cos(voice.angle) * distance;
        if (voice.panner.positionX?.setTargetAtTime) {
          voice.panner.positionX.setTargetAtTime(x, now, 3.2);
          voice.panner.positionZ.setTargetAtTime(z, now, 3.2);
        } else if (voice.panner.setPosition) {
          voice.panner.setPosition(x, 0, z);
        }
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
    updateVenueAcoustics(state.mode);
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
    setTimeout(() => {
      if (state.previewActive) {
        if (state.mode === 'courtyard') playRhythmicPhrase('tran-taali');
        else if (state.mode === 'ground') playRhythmicPhrase('dandiya-duet');
        else playRhythmicPhrase('tran-taali');
      }
    }, 180);
    setTimeout(() => {
      if (state.previewActive) {
        if (state.mode === 'courtyard') playRhythmicPhrase('be-taali');
        else if (state.mode === 'ground') playRhythmicPhrase('tran-taali');
        else playRhythmicPhrase('dandiya-duet');
      }
    }, 1850);
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
  document.addEventListener('click', trustedPlaybackUnlock, { capture: true });
  document.addEventListener('touchend', trustedPlaybackUnlock, { capture: true });
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