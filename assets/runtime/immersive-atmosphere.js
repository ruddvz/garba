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
    off: { label: 'Off', description: 'Original song only', master: 0, voices: 0, events: 0, crowd: 0, spatial: false },
    courtyard: { label: 'Courtyard', description: 'Soft room energy around the music', master: 0.034, voices: 2, events: 0.24, crowd: 0, spatial: true },
    ground: { label: 'Live Ground', description: 'Crowd bed, claps and dandiya texture', master: 0.045, voices: 3, events: 0.46, crowd: 0.34, spatial: false },
    immersive: { label: 'Immersive 360°', description: 'Binaural HRTF scene for headphones', master: 0.052, voices: 4, events: 0.62, crowd: 0.28, spatial: true },
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
    level: clamp(Number(stored?.level ?? 0.45), 0.15, 1),
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
    crowdSourceMeta: null,
    panelOpen: false,
    previewActive: false,
    playbackActive: false,
    sceneReady: false,
    generation: 0,
    previousFocus: null,
    inertNodes: [],
  };

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: state.mode, level: state.level })); } catch { /* storage can be unavailable */ }
  }

  function constrainedConnection() {
    return Boolean(connection?.saveData) || /(^|-)2g$/.test(String(connection?.effectiveType || ''));
  }

  function genericProviderOpen() {
    return Boolean(document.querySelector('#providerStage.open[aria-hidden="false"]'));
  }

  function playbackIsActive() {
    if (document.hidden) return false;
    if (directAudio?.currentSrc && !directAudio.paused && !directAudio.ended) return true;
    return app.classList.contains('is-playing');
  }

  function runtimeProfile() {
    const base = MODES[state.mode];
    if (!base || state.mode === 'off') return base;
    if (!constrainedConnection()) return base;
    return {
      ...base,
      voices: Math.min(base.voices, 2),
      events: base.events * 0.62,
      crowd: 0,
    };
  }

  function injectStyles() {
    if (document.getElementById('garbaAtmosphereStyles')) return;
    const style = document.createElement('style');
    style.id = 'garbaAtmosphereStyles';
    style.textContent = `
      .atmosphere-button { position: relative; }
      .atmosphere-button[aria-pressed="true"] { color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, rgba(8,10,18,.22)); }
      .atmosphere-button::after { content:""; position:absolute; right:6px; top:6px; width:6px; height:6px; border-radius:50%; background:var(--accent); opacity:0; transform:scale(.6); transition:opacity 160ms ease, transform 180ms ease; box-shadow:0 0 0 2px rgba(8,10,18,.54); }
      .atmosphere-button[aria-pressed="true"]::after { opacity:1; transform:scale(1); }
      .atmosphere-button svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.65; stroke-linecap:round; stroke-linejoin:round; }
      .atmosphere-backdrop { position:fixed; z-index:89; inset:0; border:0; padding:0; background:rgba(3,5,10,.26); backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px); }
      .atmosphere-backdrop[hidden], .atmosphere-panel[hidden] { display:none !important; }
      .atmosphere-panel { position:fixed; z-index:90; top:max(76px, calc(env(safe-area-inset-top) + 58px)); right:max(14px, env(safe-area-inset-right)); width:min(372px, calc(100vw - 28px)); box-sizing:border-box; padding:17px; color:#f6ecd7; border:1px solid rgba(246,236,215,.14); border-radius:22px; background:rgba(12,14,25,.965); box-shadow:0 28px 90px rgba(0,0,0,.52); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); }
      .atmosphere-panel-header { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
      .atmosphere-panel h2 { margin:0; font:600 18px/1.15 var(--sans, system-ui); letter-spacing:-.01em; }
      .atmosphere-panel p { margin:6px 0 0; color:rgba(246,236,215,.68); font:400 13px/1.45 var(--sans, system-ui); }
      .atmosphere-close { width:36px; height:36px; flex:0 0 36px; border:1px solid rgba(246,236,215,.12); border-radius:999px; color:inherit; background:rgba(246,236,215,.05); font:300 23px/1 var(--sans, system-ui); cursor:pointer; }
      .atmosphere-modes { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:16px; }
      .atmosphere-mode { position:relative; min-height:78px; padding:12px 12px 11px; text-align:left; border:1px solid rgba(246,236,215,.11); border-radius:15px; color:inherit; background:rgba(246,236,215,.045); cursor:pointer; transition:background 160ms ease, border-color 160ms ease, transform 160ms ease; }
      .atmosphere-mode:hover { background:rgba(246,236,215,.075); }
      .atmosphere-mode:active { transform:scale(.985); }
      .atmosphere-mode strong, .atmosphere-mode span { display:block; }
      .atmosphere-mode strong { font:600 13px/1.2 var(--sans, system-ui); }
      .atmosphere-mode span { margin-top:5px; color:rgba(246,236,215,.58); font:400 11px/1.32 var(--sans, system-ui); }
      .atmosphere-mode[aria-pressed="true"] { border-color:color-mix(in srgb, var(--accent) 62%, rgba(246,236,215,.15)); background:color-mix(in srgb, var(--accent) 13%, rgba(246,236,215,.04)); }
      .atmosphere-headphones { display:inline-flex !important; width:max-content; margin-top:7px !important; padding:3px 6px; border-radius:999px; background:rgba(246,236,215,.07); color:rgba(246,236,215,.72) !important; font-size:9px !important; letter-spacing:.04em; text-transform:uppercase; }
      .atmosphere-level { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:10px; margin-top:16px; }
      .atmosphere-level label { font:600 12px/1 var(--sans, system-ui); }
      .atmosphere-level output { width:38px; text-align:right; color:rgba(246,236,215,.68); font:600 11px/1 var(--sans, system-ui); }
      .atmosphere-level input { width:100%; accent-color:var(--accent); }
      .atmosphere-level input:disabled { opacity:.4; }
      .atmosphere-source-note { margin-top:14px !important; padding-top:12px; border-top:1px solid rgba(246,236,215,.09); font-size:11px !important; }
      .atmosphere-status { min-height:32px; display:flex; align-items:center; margin-top:9px !important; padding:8px 10px; border-radius:11px; background:rgba(246,236,215,.045); color:color-mix(in srgb, var(--accent) 72%, #f6ecd7) !important; font-size:11px !important; }
      .atmosphere-data-note { display:none; margin-top:8px !important; color:rgba(246,236,215,.52) !important; font-size:10px !important; }
      .atmosphere-data-note.show { display:block; }
      .atmosphere-panel :focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
      @media (max-width:700px) {
        .atmosphere-backdrop { background:rgba(3,5,10,.42); }
        .atmosphere-panel { top:auto; right:max(10px, env(safe-area-inset-right)); bottom:max(10px, calc(env(safe-area-inset-bottom) + 8px)); left:max(10px, env(safe-area-inset-left)); width:auto; max-height:min(82dvh, 620px); overflow:auto; border-radius:24px; padding:18px; }
        .atmosphere-modes { gap:9px; }
        .atmosphere-mode { min-height:82px; }
      }
      @media (max-width:390px) {
        .atmosphere-panel { left:8px; right:8px; bottom:max(8px, env(safe-area-inset-bottom)); }
        .atmosphere-modes { grid-template-columns:1fr; }
        .atmosphere-mode { min-height:66px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .atmosphere-button::after, .atmosphere-mode { transition:none; }
      }
    `;
    document.head.append(style);
  }

  function focusables() {
    return [...state.panel.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
      .filter((node) => node.getClientRects().length > 0);
  }

  function setBackgroundInert(inert) {
    if (inert) {
      state.inertNodes = [app, document.getElementById('providerStage'), document.getElementById('youtubeStage'), document.getElementById('installBanner')]
        .filter((node) => node && node !== state.panel && !state.panel.contains(node));
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
        <div>
          <h2 id="atmosphereTitle">Garba Atmosphere</h2>
          <p>Place a subtle venue layer beneath the song. Immersive 360° uses binaural HRTF positioning and is best with headphones.</p>
        </div>
        <button class="atmosphere-close" type="button" aria-label="Close Garba Atmosphere">×</button>
      </div>
      <div class="atmosphere-modes"></div>
      <div class="atmosphere-level">
        <label for="atmosphereLevel">Intensity</label>
        <input id="atmosphereLevel" type="range" min="15" max="100" step="5" value="${Math.round(state.level * 100)}" />
        <output for="atmosphereLevel">${Math.round(state.level * 100)}%</output>
      </div>
      <p class="atmosphere-source-note">Live Ground can add a very quiet public-domain stereo crowd bed. Local claps, dandiya hits and spatial room texture keep the feature usable offline.</p>
      <p class="atmosphere-data-note">Data Saver is active. Remote crowd audio is disabled and the local scene uses fewer voices.</p>
      <p class="atmosphere-status" role="status" aria-live="polite"></p>
    `;
    document.body.append(panel);

    const modes = panel.querySelector('.atmosphere-modes');
    for (const [id, profile] of Object.entries(MODES)) {
      const mode = document.createElement('button');
      mode.type = 'button';
      mode.className = 'atmosphere-mode';
      mode.dataset.mode = id;
      const headphone = id === 'immersive' ? '<span class="atmosphere-headphones">Headphones</span>' : '';
      mode.innerHTML = `<strong>${profile.label}</strong><span>${profile.description}</span>${headphone}`;
      mode.addEventListener('click', () => setMode(id, { userGesture: true }));
      modes.append(mode);
    }

    const close = panel.querySelector('.atmosphere-close');
    const slider = panel.querySelector('#atmosphereLevel');
    const output = panel.querySelector('output');

    button.addEventListener('click', () => setPanelOpen(!state.panelOpen));
    backdrop.addEventListener('click', () => setPanelOpen(false));
    close.addEventListener('click', () => setPanelOpen(false));
    slider.addEventListener('input', () => {
      state.level = clamp(Number(slider.value) / 100, 0.15, 1);
      output.value = `${Math.round(state.level * 100)}%`;
      persist();
      applyMasterLevel();
      dispatchChange('level');
    });

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
    state.status = panel.querySelector('.atmosphere-status');
    state.dataNote = panel.querySelector('.atmosphere-data-note');
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
    state.panel?.querySelectorAll('.atmosphere-mode').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    });
    if (state.slider) state.slider.disabled = state.mode === 'off';
    state.dataNote?.classList.toggle('show', constrainedConnection());
  }

  function setStatus(message = '') {
    if (state.status) state.status.textContent = message;
  }

  function dispatchChange(reason) {
    window.dispatchEvent(new CustomEvent('garba:atmosphere-change', {
      detail: {
        reason,
        mode: state.mode,
        level: state.level,
        audible: state.playbackActive || state.previewActive,
        constrained: constrainedConnection(),
      },
    }));
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
      const noise = (Math.random() * 2 - 1) * 0.11;
      data[i] = (wood + noise) * env;
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
    if (!AudioContextCtor) {
      setStatus('Spatial audio is not supported in this browser.');
      return false;
    }
    if (!state.context) {
      try { state.context = new AudioContextCtor({ latencyHint: 'playback' }); }
      catch {
        try { state.context = new AudioContextCtor(); }
        catch {
          setStatus('Garba Atmosphere could not start on this device.');
          return false;
        }
      }

      state.master = state.context.createGain();
      state.master.gain.value = 0;
      state.highpass = state.context.createBiquadFilter();
      state.highpass.type = 'highpass';
      state.highpass.frequency.value = 115;
      state.highpass.Q.value = 0.32;
      state.lowpass = state.context.createBiquadFilter();
      state.lowpass.type = 'lowpass';
      state.lowpass.frequency.value = 7600;
      state.lowpass.Q.value = 0.24;
      state.compressor = state.context.createDynamicsCompressor();
      state.compressor.threshold.value = -22;
      state.compressor.knee.value = 18;
      state.compressor.ratio.value = 3;
      state.compressor.attack.value = 0.006;
      state.compressor.release.value = 0.2;
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
      const drift = 0.72 + 0.28 * Math.sin((t + seedOffset) * Math.PI * 0.18);
      data[index] = clamp(brown * 2.2 * drift, -1, 1);
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
    gain.gain.value = 0.052 + index * 0.007;
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
        const decoded = await state.context.decodeAudioData(bytes.slice(0));
        state.crowdSourceMeta = sourceMeta;
        state.crowdBuffer = decoded;
        return decoded;
      } catch {
        return null;
      } finally {
        state.crowdPromise = null;
      }
    })();
    return state.crowdPromise;
  }

  function stopCrowd() {
    try { state.crowdSource?.stop(); } catch { /* already stopped */ }
    for (const node of [state.crowdSource, state.crowdFilter, state.crowdGain]) {
      try { node?.disconnect(); } catch { /* no-op */ }
    }
    state.crowdSource = null;
    state.crowdGain = null;
    state.crowdFilter = null;
  }

  async function startCrowd(profile, generation) {
    stopCrowd();
    if (!profile?.crowd || state.previewActive) return;
    if (constrainedConnection()) {
      if (generation === state.generation) setStatus('Data Saver: local ambience only.');
      return;
    }
    const buffer = await loadCrowdBuffer();
    if (!buffer || generation !== state.generation || state.mode === 'off' || !state.playbackActive) {
      if (!buffer && generation === state.generation && state.playbackActive) setStatus('Local spatial ambience active. Crowd bed unavailable.');
      return;
    }

    const source = state.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = state.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.2;
    const gain = state.context.createGain();
    gain.gain.value = profile.crowd * 0.28;
    source.connect(filter).connect(gain).connect(state.master);
    source.start(0, Math.random() * Math.max(0.1, buffer.duration - 1));
    state.crowdSource = source;
    state.crowdFilter = filter;
    state.crowdGain = gain;
    setStatus(state.mode === 'immersive' ? 'Immersive HRTF scene active with a subtle stereo crowd bed.' : 'Live Ground atmosphere active.');
  }

  function disconnectVoice(voice) {
    try { voice.source.stop(); } catch { /* already stopped */ }
    for (const node of [voice.source, voice.filter, voice.gain, voice.panner]) {
      try { node.disconnect(); } catch { /* no-op */ }
    }
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
    const angle = Math.random() * Math.PI * 2;
    return createPanner(angle, 1.35 + Math.random() * 1.8, true);
  }

  function playStick() {
    if (!state.context || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const source = state.context.createBufferSource();
    source.buffer = state.stickBuffers[Math.floor(Math.random() * state.stickBuffers.length)];
    const filter = state.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3900 + Math.random() * 700;
    const gain = state.context.createGain();
    gain.gain.value = 0.16 + Math.random() * 0.05;
    const panner = eventPanner();
    source.connect(filter).connect(gain).connect(panner).connect(state.master);
    source.start();
    source.addEventListener('ended', () => {
      for (const node of [source, filter, gain, panner]) try { node.disconnect(); } catch { /* no-op */ }
    }, { once: true });
  }

  function playClap() {
    if (!state.context || state.mode === 'off' || (!state.playbackActive && !state.previewActive)) return;
    const source = state.context.createBufferSource();
    source.buffer = state.clapBuffers[Math.floor(Math.random() * state.clapBuffers.length)];
    const filter = state.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1450 + Math.random() * 450;
    filter.Q.value = 0.55;
    const gain = state.context.createGain();
    gain.gain.value = 0.12 + Math.random() * 0.045;
    const panner = eventPanner();
    source.connect(filter).connect(gain).connect(panner).connect(state.master);
    source.start();
    source.addEventListener('ended', () => {
      for (const node of [source, filter, gain, panner]) try { node.disconnect(); } catch { /* no-op */ }
    }, { once: true });
  }

  function scheduleEvent(profile, generation) {
    clearTimeout(state.eventTimer);
    if (!profile?.events || generation !== state.generation || state.mode === 'off') return;
    if (!state.playbackActive && !state.previewActive) return;

    const base = state.mode === 'immersive' ? 1750 : state.mode === 'ground' ? 2350 : 3600;
    const spread = state.mode === 'immersive' ? 2800 : state.mode === 'ground' ? 3600 : 4700;
    const delay = base + Math.random() * spread / Math.max(0.18, profile.events);
    state.eventTimer = setTimeout(() => {
      if (generation !== state.generation || (!state.playbackActive && !state.previewActive)) return;
      if (Math.random() < 0.58) playStick(); else playClap();
      if ((state.mode === 'immersive' || state.mode === 'ground') && Math.random() < 0.18) {
        setTimeout(() => {
          if (generation === state.generation && (state.playbackActive || state.previewActive)) playStick();
        }, 120 + Math.random() * 120);
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
        voice.panner.positionX.setTargetAtTime(x, now, 3.2);
        voice.panner.positionZ.setTargetAtTime(z, now, 3.2);
      });
    }, 5200);
  }

  function targetMasterGain() {
    if (!state.context || !state.master || state.mode === 'off' || document.hidden) return 0;
    if (!state.playbackActive && !state.previewActive) return 0;
    return runtimeProfile().master * state.level;
  }

  function applyMasterLevel({ quick = false } = {}) {
    if (!state.context || !state.master) return;
    const target = targetMasterGain();
    const now = state.context.currentTime;
    state.master.gain.cancelScheduledValues(now);
    state.master.gain.setTargetAtTime(target, now, target > 0 ? (quick ? 0.08 : 0.22) : 0.07);
  }

  async function buildScene({ smooth = true } = {}) {
    const generation = ++state.generation;
    clearTimeout(state.idleTimer);
    if (state.mode === 'off') {
      applyMasterLevel({ quick: true });
      clearScene();
      return;
    }
    if (!await ensureContext()) return;

    if (smooth && state.sceneReady) {
      state.master.gain.setTargetAtTime(0, state.context.currentTime, 0.06);
      await sleep(130);
      if (generation !== state.generation) return;
    }

    clearScene();
    const profile = runtimeProfile();
    for (let index = 0; index < profile.voices; index += 1) {
      state.voices.push(createBedVoice(index, profile.voices, profile.spatial));
    }
    state.sceneReady = true;
    scheduleEvent(profile, generation);
    startOrbit(generation);
    applyMasterLevel();
    void startCrowd(profile, generation);

    if (!profile.crowd) {
      if (state.previewActive) setStatus(`Previewing ${MODES[state.mode].label}. It will follow playback.`);
      else if (state.mode === 'immersive') setStatus(reducedMotion.matches ? 'Immersive HRTF active. Spatial motion is reduced.' : 'Immersive HRTF active.');
      else setStatus(`${MODES[state.mode].label} atmosphere active.`);
    }
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

  async function previewCurrentMode() {
    clearTimeout(state.previewTimer);
    if (state.mode === 'off') return;
    if (!await ensureContext()) return;
    state.previewActive = true;
    await buildScene({ smooth: true });
    state.previewTimer = setTimeout(() => {
      state.previewActive = false;
      applyMasterLevel({ quick: true });
      setStatus('Ready. Atmosphere starts with playback.');
      scheduleIdleSuspend();
      dispatchChange('preview-ended');
    }, 2100);
  }

  async function setMode(mode, { userGesture = false } = {}) {
    if (!MODES[mode]) return;
    clearTimeout(state.previewTimer);
    state.previewActive = false;
    state.mode = mode;
    persist();
    syncUi();
    dispatchChange('mode');

    if (mode === 'off') {
      setStatus('Original song only.');
      applyMasterLevel({ quick: true });
      await sleep(120);
      clearScene();
      scheduleIdleSuspend();
      return;
    }

    if (userGesture && !await ensureContext()) return;
    state.playbackActive = playbackIsActive();
    if (state.playbackActive) {
      await buildScene({ smooth: true });
      return;
    }

    if (genericProviderOpen()) {
      setStatus('This provider does not expose reliable play/pause state. Atmosphere stays paused instead of running by itself.');
    } else if (userGesture) {
      await previewCurrentMode();
    } else {
      setStatus('Ready. Atmosphere starts with playback.');
      scheduleIdleSuspend();
    }
  }

  function syncPlaybackState() {
    const active = playbackIsActive();
    if (active === state.playbackActive && !(active && state.mode !== 'off' && !state.sceneReady)) {
      if (!active && state.mode !== 'off' && genericProviderOpen()) {
        setStatus('Provider playback cannot expose reliable play/pause state. Atmosphere is paused.');
      }
      return;
    }

    state.playbackActive = active;
    clearTimeout(state.previewTimer);
    state.previewActive = false;
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
          setStatus(state.mode === 'immersive' ? 'Immersive HRTF active.' : `${MODES[state.mode].label} atmosphere active.`);
        }
      });
    } else {
      applyMasterLevel({ quick: true });
      if (genericProviderOpen()) setStatus('Provider playback cannot expose reliable play/pause state. Atmosphere is paused.');
      else setStatus('Paused with the music.');
      scheduleIdleSuspend();
    }
  }

  function trustedPlaybackUnlock(event) {
    if (!event.isTrusted || state.mode === 'off') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest('#playButton, #miniPlay, .song-copy, #prevButton, #nextButton, #miniPrev, #miniNext, #atmosphereButton, .atmosphere-mode, #atmosphereLevel')) return;
    ensureContext().then((ready) => {
      if (!ready) return;
      requestAnimationFrame(syncPlaybackState);
    });
  }

  function handleConnectionChange() {
    syncUi();
    if (state.mode === 'off') return;
    if (state.playbackActive) void buildScene({ smooth: true });
    else if (constrainedConnection()) setStatus('Data Saver: local ambience only when playback starts.');
  }

  createUi();
  state.playbackActive = playbackIsActive();
  if (state.mode === 'off') setStatus('Original song only.');
  else setStatus(state.playbackActive ? 'Atmosphere will start with playback.' : 'Ready. Atmosphere starts with playback.');

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
      applyMasterLevel({ quick: true });
      scheduleIdleSuspend();
    } else {
      requestAnimationFrame(syncPlaybackState);
    }
  });
  new MutationObserver(syncPlaybackState).observe(app, { attributes: true, attributeFilter: ['class'] });
  connection?.addEventListener?.('change', handleConnectionChange);
  reducedMotion.addEventListener?.('change', () => {
    if (state.mode === 'immersive' && state.playbackActive) void buildScene({ smooth: true });
  });

  const songSheet = document.getElementById('songSheet');
  if (songSheet) {
    new MutationObserver(() => {
      if (state.panelOpen && songSheet.getAttribute('aria-hidden') === 'false') setPanelOpen(false);
    }).observe(songSheet, { attributes: true, attributeFilter: ['aria-hidden'] });
  }

  window.addEventListener('pagehide', () => {
    clearTimeout(state.previewTimer);
    state.previewActive = false;
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
      state.level = clamp(Number(value) || 0.45, 0.15, 1);
      if (state.slider) state.slider.value = String(Math.round(state.level * 100));
      if (state.output) state.output.value = `${Math.round(state.level * 100)}%`;
      persist();
      applyMasterLevel();
      dispatchChange('level');
    },
    get active() { return state.mode !== 'off' && state.playbackActive && Boolean(state.context) && state.sceneReady; },
    get playbackSynced() { return state.playbackActive; },
    get constrained() { return constrainedConnection(); },
    get spatialModel() { return state.mode === 'immersive' ? 'HRTF' : 'stereo-plus-spatial-events'; },
    setMode,
    preview() { return previewCurrentMode(); },
    stop() { return setMode('off'); },
  };
})();
