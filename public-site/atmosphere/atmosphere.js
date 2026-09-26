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
  var scene = null;
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
    sceneSync();
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
  segment($('styles'), STYLES, st.style, function (id) { st.style = id; if (st.engine) st.engine.setStyle(id); sceneSync(); });
  segment($('patterns'), E.PATTERNS, st.pattern, function (id) { st.pattern = id; if (st.engine) st.engine.setPattern(id); });
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
    sceneSync();
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
    }
    readout();
  }
  $('bpm').addEventListener('input', function () { st.taps = []; tapDots(0, false); $('tapHint').textContent = 'Set by the slider. Tap 4 times to lock to a song instead.'; setBpm(+this.value); });
  $('level').addEventListener('input', function () {
    st.level = this.value / 100; $('levelOut').textContent = this.value + '%';
    if (st.on) st.engine.setLevel(st.level * 0.8);
    sceneSync();
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
    // Stamp the tap on the page clock first, so starting the audio on the first tap cannot delay it.
    var tappedAt = performance.now() / 1000;
    var btn = $('tap'); btn.classList.add('hit'); setTimeout(function () { btn.classList.remove('hit'); }, 90);
    var p = st.on ? Promise.resolve() : start();
    p.then(function () {
      if (!st.ctx) return;
      var ctx = st.ctx;
      var lastTap = st.taps[st.taps.length - 1];
      if (lastTap !== undefined && tappedAt - lastTap > 2) st.taps = [];
      st.taps.push(tappedAt); if (st.taps.length > 12) st.taps.shift();
      if (st.taps.length < 4) { tapDots(st.taps.length, false); $('tapHint').textContent = 'Keep going: ' + (4 - st.taps.length) + ' more ' + (4 - st.taps.length === 1 ? 'tap.' : 'taps.'); return; }
      var n = st.taps.length, mx = (n - 1) / 2, my = st.taps.reduce(function (a, b) { return a + b; }, 0) / n, num = 0, den = 0;
      for (var i = 0; i < n; i++) { num += (i - mx) * (st.taps[i] - my); den += (i - mx) * (i - mx); }
      var period = num / den, bpm = 60 / period;
      if (bpm < 50 || bpm > 200) return;
      setBpm(bpm, ctx.currentTime - (performance.now() / 1000 - (my - mx * period)) - (ctx.outputLatency || ctx.baseLatency || 0));
      tapDots(4, true);
      $('tapHint').textContent = 'Locked to your taps. Tap again if the rhythm changes.';
    });
  }

  /* ---------------- scene ---------------- */
  // The picture runs on the audio clock and the engine's own tempo, pattern and venue echo data.
  scene = window.GarbaVenueScene.create($('scene'), {
    venues: E.VENUES,
    reduceMotion: reduce,
    clock: function () { return st.ctx ? st.ctx.currentTime : performance.now() / 1000; },
    beats: function () {
      var tp = st.engine && st.engine.tempo;
      if (!tp || !(MODES[st.mode].profile.claps > 0)) return null;
      var pat = E.PATTERNS[st.pattern];
      return { anchor: tp.anchor, period: tp.period, cycle: pat.cycle, hits: pat.hits };
    },
    onFrame: function (l) {
      var lamp = $('lamp');
      lamp.style.left = (l.x * 100) + '%'; lamp.style.top = (l.y * 100) + '%';
    }
  });
  function sceneSync() { if (scene) scene.set({ venue: st.venue, listener: st.listener, style: st.style, mode: st.mode, on: st.on, level: st.level }); }
  sceneSync();

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
