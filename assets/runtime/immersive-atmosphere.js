(() => {
  const STORAGE_KEY = 'garba:atmosphere';
  const SOURCE_MANIFEST = 'data/atmosphere-sources.json';
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const utilityBar = document.querySelector('.utilities');
  if (!utilityBar) return;

  const MODES = {
    off: { label: 'Off', description: 'Original song only', master: 0, voices: 0, events: 0, crowd: 0, spatial: false },
    courtyard: { label: 'Courtyard', description: 'Soft nearby room energy', master: 0.042, voices: 2, events: 0.42, crowd: 0, spatial: true },
    ground: { label: 'Live Ground', description: 'Crowd bed, claps and dandiya texture', master: 0.058, voices: 3, events: 0.78, crowd: 0.62, spatial: false },
    immersive: { label: 'Immersive 360°', description: 'HRTF scene around you · headphones', master: 0.066, voices: 4, events: 1, crowd: 0.46, spatial: true },
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  })();

  const state = {
    context: null,
    master: null,
    mode: MODES[stored?.mode] ? stored.mode : 'off',
    level: clamp(Number(stored?.level ?? 0.42), 0.1, 1),
    voices: [],
    eventTimer: 0,
    orbitTimer: 0,
    crowdBuffer: null,
    crowdPromise: null,
    crowdSource: null,
    crowdGain: null,
    crowdSourceMeta: null,
    panelOpen: false,
    generation: 0,
  };

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: state.mode, level: state.level })); } catch { /* storage can be unavailable */ }
  }

  function injectStyles() {
    if (document.getElementById('garbaAtmosphereStyles')) return;
    const style = document.createElement('style');
    style.id = 'garbaAtmosphereStyles';
    style.textContent = `
      .atmosphere-button[aria-pressed="true"] { color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, rgba(8,10,18,.22)); }
      .atmosphere-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.65; stroke-linecap: round; stroke-linejoin: round; }
      .atmosphere-panel { position: fixed; z-index: 90; top: max(76px, calc(env(safe-area-inset-top) + 58px)); right: max(14px, env(safe-area-inset-right)); width: min(350px, calc(100vw - 28px)); padding: 16px; color: #f6ecd7; border: 1px solid rgba(246,236,215,.13); border-radius: 20px; background: rgba(12,14,25,.94); box-shadow: 0 24px 80px rgba(0,0,0,.46); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
      .atmosphere-panel[hidden] { display: none !important; }
      .atmosphere-panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
      .atmosphere-panel h2 { margin: 0; font: 600 18px/1.15 var(--sans, system-ui); letter-spacing: -.01em; }
      .atmosphere-panel p { margin: 6px 0 0; color: rgba(246,236,215,.68); font: 400 13px/1.45 var(--sans, system-ui); }
      .atmosphere-close { width: 34px; height: 34px; flex: 0 0 34px; border: 1px solid rgba(246,236,215,.12); border-radius: 999px; color: inherit; background: rgba(246,236,215,.05); font: 300 23px/1 var(--sans, system-ui); }
      .atmosphere-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 15px; }
      .atmosphere-mode { min-height: 72px; padding: 11px 12px; text-align: left; border: 1px solid rgba(246,236,215,.11); border-radius: 14px; color: inherit; background: rgba(246,236,215,.045); }
      .atmosphere-mode strong, .atmosphere-mode span { display: block; }
      .atmosphere-mode strong { font: 600 13px/1.2 var(--sans, system-ui); }
      .atmosphere-mode span { margin-top: 5px; color: rgba(246,236,215,.58); font: 400 11px/1.3 var(--sans, system-ui); }
      .atmosphere-mode[aria-pressed="true"] { border-color: color-mix(in srgb, var(--accent) 62%, rgba(246,236,215,.15)); background: color-mix(in srgb, var(--accent) 13%, rgba(246,236,215,.04)); }
      .atmosphere-level { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; margin-top: 15px; }
      .atmosphere-level label { font: 500 12px/1 var(--sans, system-ui); }
      .atmosphere-level output { width: 34px; text-align: right; color: rgba(246,236,215,.68); font: 500 11px/1 var(--sans, system-ui); }
      .atmosphere-level input { width: 100%; accent-color: var(--accent); }
      .atmosphere-source-note { margin-top: 13px !important; padding-top: 12px; border-top: 1px solid rgba(246,236,215,.09); }
      .atmosphere-status { min-height: 16px; margin-top: 8px !important; color: color-mix(in srgb, var(--accent) 70%, #f6ecd7) !important; }
      @media (max-width:700px) {
        .atmosphere-panel { top: auto; right: 12px; bottom: max(12px, calc(env(safe-area-inset-bottom) + 10px)); left: 12px; width: auto; border-radius: 22px; }
      }
    `;
    document.head.append(style);
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

    const panel = document.createElement('section');
    panel.id = 'atmospherePanel';
    panel.className = 'atmosphere-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'atmosphereTitle');
    panel.innerHTML = `
      <div class="atmosphere-panel-header">
        <div><h2 id="atmosphereTitle">Garba Atmosphere</h2><p>Add a separate ambient layer beneath the song. Immersive 360° is designed for headphones.</p></div>
        <button class="atmosphere-close" type="button" aria-label="Close Garba Atmosphere">×</button>
      </div>
      <div class="atmosphere-modes"></div>
      <div class="atmosphere-level">
        <label for="atmosphereLevel">Level</label>
        <input id="atmosphereLevel" type="range" min="10" max="100" step="5" value="${Math.round(state.level * 100)}" />
        <output for="atmosphereLevel">${Math.round(state.level * 100)}%</output>
      </div>
      <p class="atmosphere-source-note">Live Ground can use a public-domain stereo crowd bed when online. The HRTF layers and dandiya/clap accents are generated locally, so the effect still works offline.</p>
      <p class="atmosphere-status" role="status" aria-live="polite"></p>
    `;
    document.body.append(panel);

    const modes = panel.querySelector('.atmosphere-modes');
    for (const [id, profile] of Object.entries(MODES)) {
      const mode = document.createElement('button');
      mode.type = 'button';
      mode.className = 'atmosphere-mode';
      mode.dataset.mode = id;
      mode.innerHTML = `<strong>${profile.label}</strong><span>${profile.description}</span>`;
      mode.addEventListener('click', () => setMode(id, { userGesture: true }));
      modes.append(mode);
    }

    const close = panel.querySelector('.atmosphere-close');
    const slider = panel.querySelector('#atmosphereLevel');
    const output = panel.querySelector('output');

    button.addEventListener('click', () => setPanelOpen(!state.panelOpen));
    close.addEventListener('click', () => setPanelOpen(false));
    slider.addEventListener('input', () => {
      state.level = clamp(Number(slider.value) / 100, 0.1, 1);
      output.value = `${Math.round(state.level * 100)}%`;
      persist();
      applyMasterLevel();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!state.panelOpen || panel.contains(event.target) || button.contains(event.target)) return;
      setPanelOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !state.panelOpen) return;
      event.stopPropagation();
      setPanelOpen(false);
      button.focus({ preventScroll: true });
    }, true);

    state.button = button;
    state.panel = panel;
    state.status = panel.querySelector('.atmosphere-status');
    syncUi();
  }

  function setPanelOpen(open) {
    state.panelOpen = Boolean(open);
    state.panel.hidden = !state.panelOpen;
    state.button.setAttribute('aria-expanded', String(state.panelOpen));
    if (state.panelOpen) requestAnimationFrame(() => state.panel.querySelector('.atmosphere-mode[aria-pressed="true"]')?.focus({ preventScroll: true }));
  }

  function syncUi() {
    const profile = MODES[state.mode];
    state.button.setAttribute('aria-pressed', String(state.mode !== 'off'));
    state.button.setAttribute('aria-label', `Garba Atmosphere: ${profile.label}`);
    state.button.title = `Garba Atmosphere: ${profile.label}`;
    state.panel?.querySelectorAll('.atmosphere-mode').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    });
  }

  function setStatus(message = '') {
    if (state.status) state.status.textContent = message;
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
        catch { return false; }
      }
      state.master = state.context.createGain();
      state.master.gain.value = 0;
      state.master.connect(state.context.destination);
    }
    if (state.context.state !== 'running') {
      try { await state.context.resume(); } catch { return false; }
    }
    return state.context.state === 'running';
  }

  function createNoiseBuffer(seconds = 4) {
    const rate = state.context.sampleRate;
    const buffer = state.context.createBuffer(1, Math.ceil(rate * seconds), rate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.018 * white) / 1.018;
      data[index] = clamp(brown * 3.3, -1, 1);
    }
    return buffer;
  }

  function createPanner(angle, distance = 1.6, hrtf = true) {
    const panner = state.context.createPanner();
    panner.panningModel = hrtf ? 'HRTF' : 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 8;
    panner.rolloffFactor = 0.55;
    panner.positionX.value = Math.sin(angle) * distance;
    panner.positionY.value = 0;
    panner.positionZ.value = -Math.cos(angle) * distance;
    return panner;
  }

  function createBedVoice(index, count, spatial) {
    const source = state.context.createBufferSource();
    source.buffer = createNoiseBuffer(3.5 + index * 0.37);
    source.loop = true;

    const filter = state.context.createBiquadFilter();
    filter.type = index % 2 ? 'bandpass' : 'lowpass';
    filter.frequency.value = index % 2 ? 720 + index * 90 : 1050 + index * 80;
    filter.Q.value = index % 2 ? 0.55 : 0.35;

    const gain = state.context.createGain();
    gain.gain.value = 0.012 + index * 0.0015;
    const angle = (index / count) * Math.PI * 2 + 0.4;
    const panner = createPanner(angle, spatial ? 1.8 : 2.4, spatial);
    source.connect(filter).connect(gain).connect(panner).connect(state.master);
    source.start(0, Math.random() * source.buffer.duration);
    return { source, filter, gain, panner, angle };
  }

  async function loadCrowdBuffer() {
    if (state.crowdBuffer) return state.crowdBuffer;
    if (state.crowdPromise) return state.crowdPromise;
    state.crowdPromise = (async () => {
      try {
        const manifestResponse = await fetch(SOURCE_MANIFEST, { cache: 'force-cache' });
        if (!manifestResponse.ok) return null;
        const manifest = await manifestResponse.json();
        const sourceMeta = manifest.sources?.find((entry) => entry.enabled && entry.role === 'crowd-bed');
        if (!sourceMeta?.audioUrl || sourceMeta.license !== 'public-domain') return null;
        const response = await fetch(sourceMeta.audioUrl, { mode: 'cors', cache: 'force-cache' });
        if (!response.ok) return null;
        const bytes = await response.arrayBuffer();
        const decoded = await state.context.decodeAudioData(bytes.slice(0));
        state.crowdSourceMeta = sourceMeta;
        state.crowdBuffer = decoded;
        return decoded;
      } catch {
        return null;
      }
    })();
    return state.crowdPromise;
  }

  function stopCrowd() {
    try { state.crowdSource?.stop(); } catch { /* already stopped */ }
    state.crowdSource?.disconnect();
    state.crowdGain?.disconnect();
    state.crowdSource = null;
    state.crowdGain = null;
  }

  async function startCrowd(profile, generation) {
    stopCrowd();
    if (!profile.crowd) return;
    const buffer = await loadCrowdBuffer();
    if (!buffer || generation !== state.generation || state.mode === 'off') {
      if (!buffer && generation === state.generation) setStatus('Using offline spatial ambience. Crowd bed could not load.');
      return;
    }
    const source = state.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const highpass = state.context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 135;
    const lowpass = state.context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3200;
    const gain = state.context.createGain();
    gain.gain.value = 0.036 * profile.crowd;
    source.connect(highpass).connect(lowpass).connect(gain).connect(state.master);
    source.start(0, Math.random() * Math.max(0.1, buffer.duration - 0.1));
    state.crowdSource = source;
    state.crowdGain = gain;
    setStatus('Public-domain stereo crowd bed active.');
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
  }

  function eventPanner() {
    const angle = Math.random() * Math.PI * 2;
    return createPanner(angle, 1.15 + Math.random() * 1.5, true);
  }

  function playStick() {
    if (!state.context || state.mode === 'off') return;
    const now = state.context.currentTime;
    const oscillator = state.context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(1850 + Math.random() * 900, now);
    oscillator.frequency.exponentialRampToValueAtTime(1150 + Math.random() * 500, now + 0.045);
    const gain = state.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035 + Math.random() * 0.018, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    const panner = eventPanner();
    oscillator.connect(gain).connect(panner).connect(state.master);
    oscillator.start(now);
    oscillator.stop(now + 0.075);
    oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); panner.disconnect(); }, { once: true });
  }

  function playClap() {
    if (!state.context || state.mode === 'off') return;
    const duration = 0.09;
    const buffer = state.context.createBuffer(1, Math.ceil(state.context.sampleRate * duration), state.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (data.length * 0.17));
    const source = state.context.createBufferSource();
    source.buffer = buffer;
    const filter = state.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1550 + Math.random() * 900;
    filter.Q.value = 0.65;
    const gain = state.context.createGain();
    gain.gain.value = 0.038 + Math.random() * 0.018;
    const panner = eventPanner();
    source.connect(filter).connect(gain).connect(panner).connect(state.master);
    source.start();
    source.addEventListener('ended', () => { source.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); }, { once: true });
  }

  function scheduleEvent(profile, generation) {
    clearTimeout(state.eventTimer);
    if (!profile.events || generation !== state.generation || state.mode === 'off') return;
    const min = state.mode === 'immersive' ? 650 : 1050;
    const spread = state.mode === 'immersive' ? 1450 : 2300;
    const delay = min + Math.random() * spread / profile.events;
    state.eventTimer = setTimeout(() => {
      if (generation !== state.generation || state.mode === 'off') return;
      if (Math.random() < 0.64) playStick(); else playClap();
      if (state.mode === 'immersive' && Math.random() < 0.16) setTimeout(playStick, 110 + Math.random() * 90);
      scheduleEvent(profile, generation);
    }, delay);
  }

  function startOrbit(generation) {
    clearInterval(state.orbitTimer);
    if (state.mode !== 'immersive') return;
    state.orbitTimer = setInterval(() => {
      if (generation !== state.generation || state.mode !== 'immersive' || !state.context) return;
      const now = state.context.currentTime;
      state.voices.forEach((voice, index) => {
        voice.angle += 0.12 + index * 0.014;
        const x = Math.sin(voice.angle) * 1.9;
        const z = -Math.cos(voice.angle) * 1.9;
        voice.panner.positionX.setTargetAtTime(x, now, 1.9);
        voice.panner.positionZ.setTargetAtTime(z, now, 1.9);
      });
    }, 2400);
  }

  function applyMasterLevel() {
    if (!state.context || !state.master) return;
    const profile = MODES[state.mode];
    const target = document.hidden ? 0 : profile.master * state.level;
    const now = state.context.currentTime;
    state.master.gain.cancelScheduledValues(now);
    state.master.gain.setTargetAtTime(target, now, target > 0 ? 0.18 : 0.08);
  }

  async function buildScene() {
    const generation = ++state.generation;
    const profile = MODES[state.mode];
    clearScene();
    if (state.mode === 'off') {
      applyMasterLevel();
      setStatus('');
      return;
    }
    if (!await ensureContext()) {
      setStatus('Could not start spatial audio in this browser.');
      return;
    }
    for (let index = 0; index < profile.voices; index += 1) {
      state.voices.push(createBedVoice(index, profile.voices, profile.spatial));
    }
    applyMasterLevel();
    scheduleEvent(profile, generation);
    startOrbit(generation);
    void startCrowd(profile, generation);
    if (!profile.crowd) setStatus(profile.spatial ? 'HRTF spatial scene active.' : 'Atmosphere active.');
  }

  async function setMode(mode, { userGesture = false } = {}) {
    if (!MODES[mode]) return;
    state.mode = mode;
    persist();
    syncUi();
    if (mode !== 'off' && userGesture) await ensureContext();
    await buildScene();
  }

  function trustedPlaybackUnlock(event) {
    if (!event.isTrusted || state.mode === 'off') return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest('#playButton, #miniPlay, .song-copy, #prevButton, #nextButton, #miniPrev, #miniNext, #atmosphereButton, .atmosphere-mode')) return;
    ensureContext().then((ready) => {
      if (ready && !state.voices.length && state.mode !== 'off') void buildScene();
    });
  }

  createUi();
  document.addEventListener('pointerdown', trustedPlaybackUnlock, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (!event.isTrusted || event.code !== 'Space' || state.mode === 'off') return;
    ensureContext().then((ready) => { if (ready && !state.voices.length) void buildScene(); });
  }, { capture: true });
  document.addEventListener('visibilitychange', applyMasterLevel);
  window.addEventListener('pagehide', () => {
    if (state.context && state.context.state === 'running') state.context.suspend().catch(() => {});
  });
  window.addEventListener('pageshow', () => {
    if (state.mode !== 'off') syncUi();
  });

  window.GARBA_ATMOSPHERE = {
    get mode() { return state.mode; },
    set mode(value) { void setMode(value); },
    get level() { return state.level; },
    set level(value) {
      state.level = clamp(Number(value) || 0.42, 0.1, 1);
      persist();
      applyMasterLevel();
    },
    get active() { return state.mode !== 'off' && Boolean(state.context); },
    get spatialModel() { return state.mode === 'immersive' ? 'HRTF' : 'stereo-plus-spatial-events'; },
    setMode,
    stop() { return setMode('off'); },
  };
})();
