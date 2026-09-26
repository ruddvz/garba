/* Garba Atmosphere listening room.
   Drives the same engine the player uses (window.GARBA_ATMOSPHERE_ENGINE) and draws what you
   hear: the circle, each clap as a wave travelling from its clapper to you, and the venue's
   echoes coming back off its walls, stands or speaker stacks. Echo timings are read from the
   engine's own venue data, so the picture and the sound agree. */
(function () {
  'use strict';
  var E = window.GARBA_ATMOSPHERE_ENGINE;
  var CFG = window.ATMO_CONFIG || { beds: {}, clips: [] };
  var $ = function (id) { return document.getElementById(id); };
  var TAU = Math.PI * 2;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!E) { $('err').textContent = 'The Atmosphere engine did not load. Refresh the page to try again.'; $('err').hidden = false; return; }

  var MODES = {
    crowd: { label: 'Crowd', desc: 'The ground around you: people, chatter and the night air. No claps.', profile: { crowd: 1, night: 1, claps: 0, spatial: false } },
    clapping: { label: 'Claps', desc: 'The circle clapping in time, with a quieter crowd.', profile: { crowd: 0.35, night: 0.6, claps: 1, spatial: false } },
    immersive: { label: 'Full circle', desc: 'The crowd and the claps all around you. Best on headphones.', profile: { crowd: 0.85, night: 1, claps: 0.9, spatial: true } }
  };
  var STYLES = { claps: 'Hand claps', dandiya: 'Dandiya sticks' };
  var st = { mode: 'immersive', venue: 'outdoors', listener: 'circle', style: 'claps', pattern: 'beat', bpm: 112, level: 0.6, dhol: false, on: false, ctx: null, engine: null, timer: 0, taps: [], keyed: false, dholNext: 0, dholStep: 0, dholGain: null };

  /* ---------------- controls ---------------- */
  function segment(el, items, current, onPick) {
    el.textContent = '';
    Object.keys(items).forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.id = id;
      b.textContent = typeof items[id] === 'string' ? items[id] : items[id].label;
      b.setAttribute('aria-pressed', String(id === current));
      b.addEventListener('click', function () { onPick(id); el.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
      el.appendChild(b);
    });
  }
  function readout() {
    var claps = MODES[st.mode].profile.claps;
    $('readout').innerHTML = E.VENUES[st.venue].label + ' <span>· ' + E.LISTENERS[st.listener].label + ' · ' + MODES[st.mode].label + (claps ? ' · ' + Math.round(st.bpm) + ' BPM' : '') + '</span>';
    $('modeDesc').textContent = MODES[st.mode].desc;
    $('venueDesc').textContent = E.VENUES[st.venue].desc;
    $('listenerDesc').textContent = E.LISTENERS[st.listener].desc;
    $('bpmOut').textContent = Math.round(st.bpm);
  }
  segment($('modes'), MODES, st.mode, function (id) { st.mode = id; if (st.engine) st.engine.setProfile(MODES[id].profile); readout(); });
  segment($('venues'), E.VENUES, st.venue, function (id) { st.venue = id; if (st.engine) st.engine.setVenue(id); readout(); });
  segment($('listeners'), E.LISTENERS, st.listener, function (id) { st.listener = id; if (st.engine) st.engine.setListener(id); readout(); });
  segment($('styles'), STYLES, st.style, function (id) { st.style = id; if (st.engine) st.engine.setStyle(id); });
  segment($('patterns'), E.PATTERNS, st.pattern, function (id) { st.pattern = id; if (st.engine) st.engine.setPattern(id); resyncVisualBeats(); });
  readout();

  function showError(msg) { var e = $('err'); e.textContent = msg; e.hidden = false; }

  /* ---------------- audio ---------------- */
  function decode(ctx, data) {
    return new Promise(function (resolve, reject) {
      var p = ctx.decodeAudioData(data, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
  }
  function loadBed(ctx) {
    return function (role) {
      var urls = (CFG.beds && CFG.beds[role]) || [];
      var i = 0;
      function next() {
        if (i >= urls.length) { showError('The crowd recording could not be decoded on this browser. Claps and sticks still play.'); return Promise.resolve(null); }
        var url = urls[i++];
        return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(function (d) { return decode(ctx, d); }).catch(next);
      }
      return next();
    };
  }
  function ensure() {
    if (st.ctx) return Promise.resolve();
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) { showError('This browser does not support Web Audio.'); return Promise.reject(new Error('no audio')); }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* unsupported */ }
    st.ctx = new Ctor({ latencyHint: 'playback' });
    st.engine = E.createEngine(st.ctx, { loadBed: loadBed(st.ctx) });
    st.engine.setVenue(st.venue, { ramp: 0.05 });
    st.engine.setListener(st.listener, { ramp: 0.05 });
    st.engine.setStyle(st.style);
    st.engine.setPattern(st.pattern);
    st.dholGain = st.ctx.createGain(); st.dholGain.gain.value = 0; st.dholGain.connect(st.ctx.destination);
    return Promise.resolve();
  }
  function start() {
    stopClips();
    return ensure().then(function () { return st.ctx.resume(); }).then(function () {
      return st.engine.setProfile(MODES[st.mode].profile);
    }).then(function () {
      st.engine.setLevel(st.level * 0.8, 0.2);
      st.engine.start();
      if (!st.engine.tempo) st.engine.setTempo(st.bpm, st.ctx.currentTime + 0.3);
      st.dholNext = st.engine.tempo.anchor; while (st.dholNext < st.ctx.currentTime) st.dholNext += 30 / st.bpm; st.dholStep = 0;
      st.dholGain.gain.setTargetAtTime(st.dhol ? 0.45 : 0, st.ctx.currentTime, 0.05);
      st.on = true;
      resyncVisualBeats();
      syncPower();
      clearInterval(st.timer);
      var last = performance.now();
      st.timer = setInterval(function () {
        var now = st.ctx.currentTime;
        st.engine.schedule(now + 0.2);
        scheduleDhol(now + 0.2);
        var t = performance.now(); if (!reduce) st.engine.animate((t - last) / 1000); last = t;
      }, 25);
    }).catch(function () { /* reported above */ });
  }
  function stop() {
    if (!st.on) return;
    st.on = false;
    clearInterval(st.timer);
    st.engine.stop({ fade: 0.25 });
    st.dholGain.gain.setTargetAtTime(0, st.ctx.currentTime, 0.05);
    syncPower();
  }
  function syncPower() {
    $('power').setAttribute('aria-checked', String(st.on));
    $('powerLabel').textContent = st.on ? 'Atmosphere is on' : 'Atmosphere is off';
    $('stage').classList.toggle('on', st.on);
    $('lampLabel').textContent = st.on ? 'Pause' : 'Light the lamp';
    $('lamp').setAttribute('aria-label', st.on ? 'Pause the Atmosphere' : 'Light the lamp to start');
  }
  function toggle() { if (st.on) stop(); else start(); }
  $('lamp').addEventListener('click', toggle);
  $('power').addEventListener('click', toggle);

  // Stand-in rhythm: a dry dhol on the same clock, never sent through the venue.
  function scheduleDhol(until) {
    var half = (60 / st.bpm) / 2;
    while (st.dholNext < until) {
      var t = st.dholNext, pos = st.dholStep % 8;
      if (pos === 0 || pos === 3 || pos === 6) boom(t);
      if (pos % 2 === 1 || pos === 4) slap(t, pos === 4 ? 0.5 : 0.28);
      st.dholStep += 1; st.dholNext += half;
    }
  }
  function boom(t) {
    var c = st.ctx, o = c.createOscillator(), e = c.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.25);
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.9, t + 0.005); e.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(e).connect(st.dholGain); o.start(t); o.stop(t + 0.5);
  }
  var slapBuf = null;
  function slap(t, level) {
    var c = st.ctx;
    if (!slapBuf) {
      slapBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
      var d = slapBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.012)) + Math.sin(TAU * 420 * i / c.sampleRate) * Math.exp(-i / (c.sampleRate * 0.02)) * 0.6;
    }
    var n = c.createBufferSource(), e = c.createGain(); n.buffer = slapBuf; e.gain.value = level; n.connect(e).connect(st.dholGain); n.start(t);
  }
  $('dhol').addEventListener('click', function () {
    st.dhol = !st.dhol; this.setAttribute('aria-pressed', String(st.dhol));
    if (st.ctx) st.dholGain.gain.setTargetAtTime(st.on && st.dhol ? 0.45 : 0, st.ctx.currentTime, 0.05);
  });

  function setBpm(bpm, anchor) {
    st.bpm = Math.max(70, Math.min(170, bpm));
    $('bpm').value = String(Math.round(st.bpm));
    if (st.engine) {
      var a = anchor != null ? anchor : st.ctx.currentTime + 0.05;
      st.engine.setTempo(st.bpm, a);
      st.dholNext = a; while (st.dholNext < st.ctx.currentTime) st.dholNext += 30 / st.bpm; st.dholStep = 0;
      resyncVisualBeats();
    }
    readout();
  }
  $('bpm').addEventListener('input', function () { st.taps = []; tapDots(0, false); $('tapHint').textContent = 'Set by the slider. Tap 4 times to lock to a song instead.'; setBpm(+this.value); });
  $('level').addEventListener('input', function () {
    st.level = this.value / 100; $('levelOut').textContent = this.value + '%';
    if (st.on) st.engine.setLevel(st.level * 0.8);
  });

  // Tap tempo: the same least-squares fit the player uses.
  $('tap').addEventListener('pointerdown', function (ev) { ev.preventDefault(); tap(); });
  $('tap').addEventListener('click', function (ev) { if (ev.detail === 0 && !st.keyed) tap(); st.keyed = false; });
  $('tap').addEventListener('keydown', function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && !ev.repeat) { ev.preventDefault(); st.keyed = true; tap(); } });
  function tapDots(n, locked) {
    document.querySelectorAll('#dots i').forEach(function (d, i) { d.classList.toggle('on', locked || i < n); });
    $('tap').classList.toggle('locked', !!locked);
    $('tap').textContent = locked ? 'Tap to adjust' : 'Tap the beat';
  }
  function tap() {
    var btn = $('tap'); btn.classList.add('hit'); setTimeout(function () { btn.classList.remove('hit'); }, 90);
    var p = st.on ? Promise.resolve() : start();
    p.then(function () {
      if (!st.ctx) return;
      var ctx = st.ctx, heard = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      var lastTap = st.taps[st.taps.length - 1];
      if (lastTap !== undefined && heard - lastTap > 2) st.taps = [];
      st.taps.push(heard); if (st.taps.length > 12) st.taps.shift();
      if (st.taps.length < 4) { tapDots(st.taps.length, false); $('tapHint').textContent = 'Keep going: ' + (4 - st.taps.length) + ' more ' + (4 - st.taps.length === 1 ? 'tap.' : 'taps.'); return; }
      var n = st.taps.length, mx = (n - 1) / 2, my = st.taps.reduce(function (a, b) { return a + b; }, 0) / n, num = 0, den = 0;
      for (var i = 0; i < n; i++) { num += (i - mx) * (st.taps[i] - my); den += (i - mx) * (i - mx); }
      var period = num / den, bpm = 60 / period;
      if (bpm < 50 || bpm > 200) return;
      setBpm(bpm, my - mx * period);
      tapDots(4, true);
      $('tapHint').textContent = 'Locked to your taps. Tap again if the rhythm changes.';
    });
  }

  /* ---------------- scene ---------------- */
  var cv = $('scene'), g = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1, backdrops = {};
  var view = { k: 0, venueFade: 1, prevVenue: null, shownVenue: st.venue };
  var waves = [], arrivals = [], haze = 0, youGlow = 0, spin = 0, visIdx = null, lastFrame = performance.now();
  var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(13);
  var dancers = []; for (var i = 0; i < 26; i++) dancers.push({ a: i / 26 * TAU, col: ['#c0392b', '#d6246e', '#e8a33d', '#2f8f5b', '#3b4cc0', '#8e44ad', '#e67e22'][i % 7], flash: 0, lag: rnd() * 0.012 });
  var stars = []; for (var s = 0; s < 90; s++) stars.push([rnd(), rnd() * 0.33, rnd()]);

  function lerp(a, b, t) { return a + (b - a) * t; }
  function geo() {
    var k = view.k;
    var c = { x: W / 2, y: lerp(H * 0.68, H * 0.49, k), rx: lerp(W * 0.36, W * 0.15, k) };
    c.ry = c.rx * lerp(0.34, 0.3, k);
    var you = { x: lerp(W / 2 + c.rx * 0.18, W / 2, k), y: lerp(c.y + c.ry * 0.5, H * 0.9, k) };
    return { hor: H * 0.36, c: c, you: you, scale: lerp(1, 0.5, k) };
  }

  function resize() {
    var r = cv.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    backdrops = {};
  }
  window.addEventListener('resize', resize);

  // Venue scenery, drawn once per size onto its own canvas.
  function backdrop(id) {
    if (backdrops[id]) return backdrops[id];
    var c = document.createElement('canvas'); c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
    var b = c.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
    var hor = H * 0.36;
    if (id === 'outdoors') {
      var sky = b.createLinearGradient(0, 0, 0, hor); sky.addColorStop(0, '#05061a'); sky.addColorStop(0.7, '#171133'); sky.addColorStop(1, '#3a1d16');
      b.fillStyle = sky; b.fillRect(0, 0, W, hor);
      stars.forEach(function (p) { b.fillStyle = 'rgba(255,245,225,' + (0.25 + p[2] * 0.6) + ')'; b.fillRect(p[0] * W, p[1] * H, 1.3, 1.3); });
      // Distant buildings along the edge of the ground
      b.fillStyle = '#0c0914';
      for (var x = 0; x < W; x += W / 22) { var bh = H * (0.02 + ((x * 7) % 13) / 13 * 0.05); b.fillRect(x, hor - bh, W / 24, bh + 1); }
      var gr = b.createLinearGradient(0, hor, 0, H); gr.addColorStop(0, '#1d120c'); gr.addColorStop(1, '#0c0705');
      b.fillStyle = gr; b.fillRect(0, hor, W, H - hor);
      // Poles and a string of bulbs
      b.strokeStyle = 'rgba(40,28,20,.9)'; b.lineWidth = 2;
      [[W * 0.06], [W * 0.94]].forEach(function (p) { b.beginPath(); b.moveTo(p[0], hor + H * 0.05); b.lineTo(p[0], H * 0.1); b.stroke(); });
      b.strokeStyle = 'rgba(80,60,40,.6)'; b.lineWidth = 1; b.beginPath(); b.moveTo(W * 0.06, H * 0.11); b.quadraticCurveTo(W / 2, H * 0.24, W * 0.94, H * 0.11); b.stroke();
      for (var q = 0; q <= 20; q++) { var u = q / 20, bx = lerp(lerp(W * 0.06, W / 2, u), lerp(W / 2, W * 0.94, u), u), by = lerp(lerp(H * 0.11, H * 0.24, u), lerp(H * 0.24, H * 0.11, u), u); glowDot(b, bx, by + 3, 2.2, ['#ffd58a', '#ff9f5a', '#ffe7b0', '#8fe3b0'][q % 4], 0.9); }
      // Speaker stacks
      [W * 0.13, W * 0.87].forEach(function (x) { speaker(b, x, hor + H * 0.06, H * 0.14); });
    } else if (id === 'stadium') {
      var roof = b.createLinearGradient(0, 0, 0, hor); roof.addColorStop(0, '#07070c'); roof.addColorStop(1, '#141220');
      b.fillStyle = roof; b.fillRect(0, 0, W, hor);
      b.strokeStyle = 'rgba(120,110,140,.16)'; b.lineWidth = 1;
      for (var t = 0; t < 12; t++) { b.beginPath(); b.moveTo(t / 11 * W, 0); b.lineTo(W / 2 + (t / 11 - 0.5) * W * 0.5, hor * 0.55); b.stroke(); }
      b.beginPath(); b.moveTo(0, hor * 0.3); b.lineTo(W, hor * 0.3); b.moveTo(W * 0.1, hor * 0.5); b.lineTo(W * 0.9, hor * 0.5); b.stroke();
      // Tiered stands full of people
      for (var tier = 0; tier < 5; tier++) {
        var ty = hor * 0.5 + tier * H * 0.034, span = W * (0.5 + tier * 0.12);
        b.fillStyle = 'rgba(30,26,40,' + (0.9 - tier * 0.1) + ')';
        b.beginPath(); b.ellipse(W / 2, ty + H * 0.02, span / 2 + 8, H * 0.03, 0, Math.PI, 0); b.fill();
        for (var pp = 0; pp < 44 + tier * 10; pp++) { var ang = Math.PI + (pp / (44 + tier * 10)) * Math.PI; var px = W / 2 + Math.cos(ang) * span / 2, py = ty + H * 0.02 + Math.sin(ang) * H * 0.03; b.fillStyle = 'rgba(' + [220, 200, 170][pp % 3] + ',' + [170, 150, 190][pp % 3] + ',' + [140, 170, 150][pp % 3] + ',.55)'; b.fillRect(px, py - 2, 2, 2); }
      }
      var fl = b.createLinearGradient(0, hor + H * 0.08, 0, H); fl.addColorStop(0, '#241a14'); fl.addColorStop(1, '#0d0907');
      b.fillStyle = fl; b.fillRect(0, hor + H * 0.08, W, H);
      b.fillStyle = 'rgba(214,176,111,.25)'; b.fillRect(0, hor + H * 0.08, W, 1);
      // Barrier boards between the stands and the floor
      b.fillStyle = '#0f0c14'; b.fillRect(0, hor + H * 0.065, W, H * 0.015);
      // Floor boards and a painted arena circle
      b.strokeStyle = 'rgba(255,220,170,.04)';
      for (var fb = 1; fb < 10; fb++) { var fy = hor + H * 0.08 + (H * 0.56) * Math.pow(fb / 10, 1.5); b.beginPath(); b.moveTo(0, fy); b.lineTo(W, fy); b.stroke(); }
      // Spotlights from the roof
      [0.2, 0.42, 0.58, 0.8].forEach(function (x, i) {
        var beam = b.createLinearGradient(0, 0, 0, H); beam.addColorStop(0, 'rgba(255,230,190,.18)'); beam.addColorStop(1, 'rgba(255,230,190,0)');
        b.fillStyle = beam; b.beginPath(); b.moveTo(W * x - 4, 0); b.lineTo(W * x + 4, 0); b.lineTo(W * (0.5 + (x - 0.5) * 0.4) + W * 0.1, H * 0.82); b.lineTo(W * (0.5 + (x - 0.5) * 0.4) - W * 0.1, H * 0.82); b.closePath(); b.fill();
        glowDot(b, W * x, 3, 3, '#fff2d6', 1);
      });
    } else {
      var sk = b.createLinearGradient(0, 0, 0, hor); sk.addColorStop(0, '#07061a'); sk.addColorStop(1, '#1d1432');
      b.fillStyle = sk; b.fillRect(0, 0, W, H);
      stars.slice(0, 30).forEach(function (p) { b.fillStyle = 'rgba(255,245,225,.5)'; b.fillRect(W * 0.3 + p[0] * W * 0.4, p[1] * H * 0.7, 1.2, 1.2); });
      var lane = b.createLinearGradient(0, hor, 0, H); lane.addColorStop(0, '#221810'); lane.addColorStop(1, '#0d0806');
      b.fillStyle = lane; b.beginPath(); b.moveTo(W * 0.3, hor); b.lineTo(W * 0.7, hor); b.lineTo(W * 1.1, H); b.lineTo(-W * 0.1, H); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(255,220,170,.05)';
      for (var r = 1; r < 9; r++) { var yy = hor + (H - hor) * Math.pow(r / 9, 1.6); b.beginPath(); b.moveTo(0, yy); b.lineTo(W, yy); b.stroke(); }
      // House fronts on both sides of the lane
      [0, 1].forEach(function (side) {
        var x0 = side ? W : 0, x1 = side ? W * 0.7 : W * 0.3;
        var fg = b.createLinearGradient(x0, 0, x1, 0); fg.addColorStop(0, '#22182e'); fg.addColorStop(1, '#130e1e');
        b.fillStyle = fg; b.beginPath(); b.moveTo(x0, 0); b.lineTo(x1, hor * 0.35); b.lineTo(x1, hor); b.lineTo(x0, H * 0.98); b.closePath(); b.fill();
        for (var wv = 0; wv < 6; wv++) {
          var u2 = 0.12 + wv * 0.14, wx = lerp(x0, x1, u2), top = lerp(0, hor * 0.35, u2), bot = lerp(H * 0.98, hor, u2);
          for (var fl2 = 0; fl2 < 2; fl2++) {
            var wy = lerp(top, bot, 0.25 + fl2 * 0.35), ws = (1 - u2 * 0.75) * W * 0.05, wh = ws * 1.5;
            b.fillStyle = (wv + fl2) % 3 ? 'rgba(255,190,100,.55)' : 'rgba(40,30,60,.9)';
            b.beginPath(); b.moveTo(wx - ws / 2, wy + wh / 2); b.lineTo(wx - ws / 2, wy - wh / 4); b.quadraticCurveTo(wx, wy - wh * 0.8, wx + ws / 2, wy - wh / 4); b.lineTo(wx + ws / 2, wy + wh / 2); b.closePath(); b.fill();
          }
        }
      });
      // Toran and bulbs across the lane
      for (var line = 0; line < 3; line++) {
        var y0 = H * (0.06 + line * 0.07), sag = H * (0.05 - line * 0.01), xl = W * (0.02 + line * 0.1), xr = W - xl;
        for (var f = 0; f < 18; f++) {
          var uu = (f + 0.5) / 18, fx = lerp(xl, xr, uu), fy = y0 + Math.sin(uu * Math.PI) * sag;
          if (line !== 1) { b.fillStyle = ['#f08a24', '#2f8f5b', '#c2185b', '#ffc861'][f % 4]; b.beginPath(); b.moveTo(fx - 5, fy); b.lineTo(fx + 5, fy); b.lineTo(fx, fy + 10); b.closePath(); b.fill(); }
          else glowDot(b, fx, fy + 2, 2, ['#ffd58a', '#ff6fa3', '#7fe0a0'][f % 3], 0.9);
        }
      }
    }
    // Soft vignette
    var vg = b.createRadialGradient(W / 2, H * 0.55, H * 0.2, W / 2, H * 0.55, H * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    b.fillStyle = vg; b.fillRect(0, 0, W, H);
    backdrops[id] = c;
    return c;
  }
  function glowDot(b, x, y, r, col, a) {
    b.globalAlpha = a * 0.35; b.fillStyle = col; b.beginPath(); b.arc(x, y, r * 3, 0, TAU); b.fill();
    b.globalAlpha = a; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill(); b.globalAlpha = 1;
  }
  function speaker(b, x, base, h) {
    var w = h * 0.42;
    b.fillStyle = '#0a0808'; b.fillRect(x - w / 2, base - h, w, h);
    b.strokeStyle = 'rgba(255,255,255,.08)'; b.strokeRect(x - w / 2, base - h, w, h);
    for (var i = 0; i < 3; i++) { b.beginPath(); b.arc(x, base - h * (0.2 + i * 0.3), w * 0.3, 0, TAU); b.strokeStyle = 'rgba(255,255,255,.14)'; b.stroke(); }
  }

  // Where the echoes come from in each venue, with delays taken from the engine's own venue data.
  function reflectors(id, gm) {
    var v = E.VENUES[id], hor = gm.hor, out = [];
    if (id === 'outdoors') {
      var taps = v.ir.taps.filter(function (t) { return t[0] > 0.05; });
      taps.slice(0, 2).forEach(function (t) { out.push({ x: W * 0.13, y: hor + H * 0.02, delay: t[0], level: t[1] * 3 }); out.push({ x: W * 0.87, y: hor + H * 0.02, delay: t[0] + 0.004, level: t[1] * 3 }); });
      taps.slice(2).forEach(function (t, i) { out.push({ x: W * (0.25 + i * 0.25), y: hor, delay: t[0], level: t[1] * 3 }); });
    } else if (id === 'stadium') {
      v.ir.taps.slice(0, 3).forEach(function (t) { for (var i = 0; i < 5; i++) out.push({ x: W * (0.2 + i * 0.15), y: hor * 0.7 + H * 0.06, delay: t[0] + i * 0.006, level: t[1] * 2.4 }); });
    } else {
      var fl = v.ir.flutter;
      for (var k = 0; k < 7; k++) out.push({ x: k % 2 ? W * 0.72 : W * 0.28, y: gm.c.y - gm.c.ry * 0.3, delay: fl.period * (k + 1), level: fl.first * Math.pow(fl.decay, k) * 2.6 });
    }
    return out;
  }
  var HAZE = { outdoors: { add: 0.05, rt: 0.5 }, sheri: { add: 0.12, rt: 0.9 }, stadium: { add: 0.22, rt: 2.2 } };

  // Sound is slower than light: the dancers clap first and the wavefront reaches you on the beat you hear.
  // In the circle the gap is tiny; far away it is long enough to watch the wave cross the ground.
  function aspect(gm) { return gm.c.ry / gm.c.rx; }
  function reach(gm) {
    var c = gm.c, asp = aspect(gm), dx = (gm.you.x - c.x) / c.rx, dy = (gm.you.y - c.y) / c.ry, e = Math.sqrt(dx * dx + dy * dy);
    return e < 1 ? { dir: -1, r: c.rx * (1 - e) } : { dir: 1, r: Math.max(1, (gm.you.y - c.y) / asp - c.rx) };
  }
  function waveSpeed(gm) { var rc = reach(gm); return lerp(W * 4, rc.r / 0.34, view.k); }
  function lead(gm) { return reach(gm).r / waveSpeed(gm); }
  function edist(a, b, asp) { var dx = a.x - b.x, dy = (a.y - b.y) / asp; return Math.sqrt(dx * dx + dy * dy); }

  function resyncVisualBeats() { visIdx = null; }
  function spawnHit(bt) {
    var gm = geo(), far = st.listener === 'far', dandiya = st.style === 'dandiya';
    var col = dandiya ? '232,163,61' : '243,230,208', speed = waveSpeed(gm), ld = lead(gm), asp = aspect(gm);
    var t0 = bt - ld, n = Math.round(dancers.length * (0.55 + 0.35 * st.level));
    var picks = dancers.slice().sort(function () { return rnd() - 0.5; }).slice(0, n);
    picks.forEach(function (d) { d.clapAt = t0 + d.lag; });
    // One front leaves the whole ring: outward to the venue (and to you when you stand back), inward to you in the circle
    waves.push({ kind: 'front', dir: 1, t0: t0, col: col, a: far ? 0.7 : 0.45, speed: speed });
    if (!far) waves.push({ kind: 'front', dir: -1, t0: t0, col: col, a: 0.4, speed: speed });
    arrivals.push({ t: bt, g: 1 });
    // Echoes: each reflector sends its own wave so it reaches you at the delay the engine uses for this venue
    reflectors(st.venue, gm).forEach(function (r) {
      var toYou = edist(r, gm.you, asp), start = Math.max(t0, bt + r.delay - toYou / speed);
      waves.push({ kind: 'echo', x: r.x, y: r.y, t0: start, col: '232,163,61', a: Math.min(0.55, 0.12 + r.level), speed: speed, lim: toYou * 1.06, aim: Math.atan2((gm.you.y - r.y) / asp, gm.you.x - r.x) });
      arrivals.push({ t: bt + r.delay, g: Math.min(0.6, r.level * 1.5) });
    });
    haze = Math.min(1, haze + HAZE[st.venue].add * (far ? 1.3 : 1));
  }
  function dancerPos(d, gm) {
    var a = d.a + spin, s = Math.sin(a);
    return { x: gm.c.x + Math.cos(a) * gm.c.rx, y: gm.c.y + s * gm.c.ry, s: s };
  }

  function drawDancer(d, gm, front) {
    var p = dancerPos(d, gm);
    if ((p.s > 0) !== front) return;
    var sc = gm.scale * (0.78 + 0.22 * (p.s + 1) / 2) * (W / 380);
    var x = p.x, y = p.y, up = d.flash > 0.2;
    g.globalAlpha = 0.55 + 0.45 * (p.s + 1) / 2;
    g.fillStyle = d.col;
    g.beginPath(); g.moveTo(x - 7 * sc, y); g.quadraticCurveTo(x, y + 3 * sc, x + 7 * sc, y); g.lineTo(x + 2.2 * sc, y - 11 * sc); g.lineTo(x - 2.2 * sc, y - 11 * sc); g.closePath(); g.fill();
    g.fillStyle = '#e4c29a'; g.fillRect(x - 1.6 * sc, y - 17 * sc, 3.2 * sc, 6.5 * sc);
    g.fillStyle = '#2a1a12'; g.beginPath(); g.arc(x, y - 19.6 * sc, 2.5 * sc, 0, TAU); g.fill();
    g.strokeStyle = st.style === 'dandiya' && up ? '#e8a33d' : '#e4c29a'; g.lineWidth = 1.2 * sc; g.lineCap = 'round';
    g.beginPath();
    if (up) { g.moveTo(x - 1.5 * sc, y - 15 * sc); g.lineTo(x - 2 * sc, y - 23 * sc); g.moveTo(x + 1.5 * sc, y - 15 * sc); g.lineTo(x + 2 * sc, y - 23 * sc); }
    else { g.moveTo(x - 1.5 * sc, y - 15 * sc); g.lineTo(x - 5 * sc, y - 11 * sc); g.moveTo(x + 1.5 * sc, y - 15 * sc); g.lineTo(x + 5 * sc, y - 11 * sc); }
    g.stroke();
    if (d.flash > 0.05) { g.fillStyle = 'rgba(255,240,210,' + d.flash + ')'; g.beginPath(); g.arc(x, y - 23.5 * sc, 2.6 * sc * (1 + d.flash), 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }
  function drawLamp(gm, t) {
    var x = gm.c.x, y = gm.c.y, sc = gm.scale * (W / 380), lit = st.on ? 1 : 0.35;
    var hg = g.createRadialGradient(x, y - 10 * sc, 2, x, y - 10 * sc, 70 * sc);
    hg.addColorStop(0, 'rgba(255,190,100,' + 0.55 * lit + ')'); hg.addColorStop(1, 'rgba(255,190,100,0)');
    g.fillStyle = hg; g.beginPath(); g.arc(x, y - 10 * sc, 70 * sc, 0, TAU); g.fill();
    g.fillStyle = 'rgb(' + Math.round(150 * (0.5 + lit / 2)) + ',' + Math.round(62 * (0.5 + lit / 2)) + ',30)';
    g.beginPath(); g.ellipse(x, y - 9 * sc, 11 * sc, 10 * sc, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,215,140,' + (0.3 + 0.7 * lit) + ')';
    for (var i = 0; i < 7; i++) { var a = i / 7 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 6 * sc, y - 9 * sc + Math.sin(a) * 4 * sc, 1.1 * sc, 0, TAU); g.fill(); }
    if (st.on) { var fl = 1 + 0.15 * Math.sin(t * 11); g.fillStyle = 'rgba(255,230,160,.9)'; g.beginPath(); g.ellipse(x, y - 21 * sc, 2.2 * sc, 4.5 * sc * fl, 0, 0, TAU); g.fill(); }
  }
  function drawYou(gm) {
    var x = gm.you.x, y = gm.you.y, sc = W / 380;
    var r = 9 * sc * (1 + youGlow * 0.35);
    g.fillStyle = 'rgba(214,176,111,' + (0.18 + youGlow * 0.4) + ')'; g.beginPath(); g.ellipse(x, y, r * 2.2, r * 0.9, 0, 0, TAU); g.fill();
    g.fillStyle = '#f3e6d0'; g.beginPath(); g.arc(x, y - 14 * sc, 4 * sc, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x - 5 * sc, y); g.lineTo(x + 5 * sc, y); g.lineTo(x + 3 * sc, y - 9 * sc); g.lineTo(x - 3 * sc, y - 9 * sc); g.closePath(); g.fill();
    g.font = '600 ' + Math.round(11 * sc) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(243,230,208,.85)';
    g.fillText('You', x, y + 16 * sc);
  }

  function frame(nowMs) {
    var dt = Math.min(0.05, (nowMs - lastFrame) / 1000); lastFrame = nowMs;
    var t = st.ctx ? st.ctx.currentTime : nowMs / 1000;
    if (!W) resize();
    // Ease between In the circle and Far away, and crossfade venues
    var targetK = st.listener === 'far' ? 1 : 0;
    view.k += (targetK - view.k) * Math.min(1, dt * (reduce ? 60 : 3));
    if (view.shownVenue !== st.venue) { view.prevVenue = view.shownVenue; view.shownVenue = st.venue; view.venueFade = reduce ? 1 : 0; }
    view.venueFade = Math.min(1, view.venueFade + dt * 2.2);
    var gm = geo();

    // Visual beats follow the engine's tempo and pattern, on the audio clock
    var tempo = st.engine && st.engine.tempo, claps = MODES[st.mode].profile.claps > 0;
    if (st.on && tempo && claps && !reduce) {
      if (visIdx === null) visIdx = Math.ceil((t - tempo.anchor) / tempo.period);
      var pat = E.PATTERNS[st.pattern];
      var ahead = lead(gm);
      while (tempo.anchor + visIdx * tempo.period - ahead < t + 0.05) {
        var bt = tempo.anchor + visIdx * tempo.period, pos = ((visIdx % pat.cycle) + pat.cycle) % pat.cycle;
        if (pat.hits.indexOf(pos) >= 0 && bt > t - 0.2) spawnHit(bt);
        visIdx++;
      }
    }
    if (st.on && !claps && !reduce && rnd() < dt * 6) { var md = dancers[Math.floor(rnd() * dancers.length)], mp = dancerPos(md, gm); waves.push({ x: mp.x, y: mp.y, t0: t, col: '243,230,208', a: 0.16, kind: 'murmur' }); }
    if (st.on && !reduce) spin -= dt * 0.22;

    // Backdrop
    g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
    if (view.prevVenue && view.venueFade < 1) { g.globalAlpha = 1; g.drawImage(backdrop(view.prevVenue), 0, 0, W, H); g.globalAlpha = view.venueFade; }
    g.drawImage(backdrop(view.shownVenue), 0, 0, W, H); g.globalAlpha = 1;

    // Reverb haze: how long the room keeps ringing after each clap
    haze *= Math.exp(-dt / (HAZE[st.venue].rt / 2.5));
    if (haze > 0.01) {
      var hz = g.createRadialGradient(gm.c.x, gm.c.y, 10, gm.c.x, gm.c.y, W * 0.75);
      hz.addColorStop(0, 'rgba(255,200,130,' + haze * 0.22 + ')'); hz.addColorStop(1, 'rgba(255,200,130,0)');
      g.fillStyle = hz; g.fillRect(0, 0, W, H);
    }
    // Floor circle
    g.strokeStyle = 'rgba(243,230,208,.14)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(gm.c.x, gm.c.y, gm.c.rx + 10 * gm.scale, gm.c.ry + 4 * gm.scale, 0, 0, TAU); g.stroke();

    dancers.forEach(function (d) { if (d.clapAt && t >= d.clapAt) { d.flash = 1; d.clapAt = 0; } d.flash *= Math.exp(-dt * 7); drawDancer(d, gm, false); });
    drawLamp(gm, t);
    dancers.forEach(function (d) { drawDancer(d, gm, true); });

    // Waves
    var asp = aspect(gm), rc = reach(gm), sc0 = gm.scale * (W / 380);
    for (var i = waves.length - 1; i >= 0; i--) {
      var w = waves[i], age = t - w.t0;
      if (age < 0) continue;
      if (w.kind === 'murmur') {
        var mr = age * W * 0.3, ml = W * 0.07 * gm.scale;
        if (mr > ml) { waves.splice(i, 1); continue; }
        g.strokeStyle = 'rgba(' + w.col + ',' + w.a * (1 - mr / ml) + ')'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(w.x, w.y, mr, mr * asp, 0, 0, TAU); g.stroke();
        continue;
      }
      var r = age * w.speed;
      if (w.kind === 'front') {
        var lim = w.dir < 0 ? gm.c.rx * 0.97 : Math.max(W * 0.9, rc.dir > 0 ? rc.r * 1.15 : 0);
        if (r > lim) { waves.splice(i, 1); continue; }
        var fx = gm.c.rx + w.dir * r, fa = w.a * Math.pow(1 - r / lim, 1.3);
        g.lineWidth = 2.2 * Math.max(0.6, gm.scale);
        g.strokeStyle = 'rgba(' + w.col + ',' + fa + ')';
        g.beginPath(); g.ellipse(gm.c.x, gm.c.y, fx, fx * asp, 0, 0, TAU); g.stroke();
        g.lineWidth = 7 * Math.max(0.6, gm.scale); g.strokeStyle = 'rgba(' + w.col + ',' + fa * 0.18 + ')'; g.stroke();
      } else {
        if (r > w.lim) { waves.splice(i, 1); continue; }
        var ea = w.a * Math.pow(1 - r / w.lim, 1.2);
        if (age < 0.18) glowDot(g, w.x, w.y, 3 * sc0 + 2, 'rgba(255,200,120,1)', (1 - age / 0.18) * w.a * 1.4);
        g.strokeStyle = 'rgba(' + w.col + ',' + ea + ')'; g.lineWidth = 1.6;
        g.beginPath(); g.ellipse(w.x, w.y, Math.max(0.5, r), Math.max(0.5, r * asp), 0, w.aim - 0.9, w.aim + 0.9); g.stroke();
      }
    }
    for (var j = arrivals.length - 1; j >= 0; j--) if (arrivals[j].t <= t) { youGlow = Math.max(youGlow, arrivals[j].g); arrivals.splice(j, 1); }
    youGlow *= Math.exp(-dt * 6);
    drawYou(gm);

    // Keep the lamp button on the lamp
    $('lamp').style.left = (gm.c.x / W * 100) + '%';
    $('lamp').style.top = (gm.c.y / H * 100) + '%';
    requestAnimationFrame(frame);
  }
  resize();
  requestAnimationFrame(frame);

  /* ---------------- recorded clips (artifact build only) ---------------- */
  var audios = [];
  function stopClips(except) { audios.forEach(function (a) { if (a !== except && !a.paused) a.pause(); }); }
  if (CFG.clips && CFG.clips.length) {
    $('clipsHead').hidden = false; $('clips').hidden = false;
    CFG.clips.forEach(function (c) {
      var li = document.createElement('li'); li.className = 'clip';
      li.innerHTML = '<button class="pb" type="button"><svg class="pl" viewBox="0 0 24 24"><path d="M8 5.6c0-1 1.1-1.6 1.9-1.1l9.6 6.4c.8.5.8 1.7 0 2.2l-9.6 6.4c-.8.5-1.9-.1-1.9-1.1Z"/></svg><svg class="pz" viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg></button><strong></strong><p></p><div class="bar" role="progressbar" aria-label="Position"><i></i></div>';
      li.querySelector('strong').textContent = c[1]; li.querySelector('p').textContent = c[2];
      var btn = li.querySelector('.pb'); btn.setAttribute('aria-label', 'Play ' + c[1]);
      var a = new Audio(c[0]); a.preload = 'none'; audios.push(a);
      var bar = li.querySelector('.bar'), fill = bar.querySelector('i');
      btn.addEventListener('click', function () { if (!a.paused) { a.pause(); return; } stop(); stopClips(a); a.play().catch(function () { showError('This browser blocked audio playback. Tap the clip again.'); }); });
      bar.addEventListener('click', function (ev) { if (a.duration) { var r = bar.getBoundingClientRect(); a.currentTime = (ev.clientX - r.left) / r.width * a.duration; } });
      a.addEventListener('play', function () { li.classList.add('playing'); btn.setAttribute('aria-label', 'Pause ' + c[1]); });
      a.addEventListener('pause', function () { li.classList.remove('playing'); btn.setAttribute('aria-label', 'Play ' + c[1]); });
      a.addEventListener('timeupdate', function () { if (a.duration) fill.style.width = (a.currentTime / a.duration * 100) + '%'; });
      $('clips').appendChild(li);
    });
  }
})();
