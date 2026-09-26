/*
 * PlayGarba Immersive view and the More card.
 *
 * Simple view, the courtyard artwork, stays the default. Immersive view is the listener's choice: the live
 * venue scene (a garba night round a garbo, a stage, a DJ) drawn behind the same player and buttons. It
 * follows real playback, the genre and the Atmosphere venue and position, and it is remembered per device.
 * The scene loads only when Immersive is chosen.
 *
 * The More card gathers the less-used top-bar actions (share, Garba Circle, My Garba, Atmosphere) with the
 * view switch, so each screen size keeps only what it needs in the bar. Rows act through the original
 * buttons, so every feature keeps its own behaviour.
 */
(function () {
  'use strict';

  var VIEW_KEY = 'garba:view';
  var SCENE_SRC = 'atmosphere/scene.js';
  var app = document.getElementById('app');
  var world = app && app.querySelector('.world');
  if (!app || !world || window.GARBA_IMMERSIVE_VIEW) return;

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var view = 'simple';
  try { if (localStorage.getItem(VIEW_KEY) === 'immersive') view = 'immersive'; } catch (e) { /* storage unavailable */ }

  /* ---------- the venue scene ---------- */
  var scene = null, canvas = null, loading = null, failed = false;
  var THEMES = { traditional: 1, dandiya: 1, devotional: 1, folk: 1, sanedo: 1, fusion: 1, nonstop: 1 };

  function loadScene() {
    if (window.GarbaVenueScene) return Promise.resolve();
    if (!loading) {
      loading = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = SCENE_SRC; script.async = true;
        script.onload = resolve;
        script.onerror = function () { loading = null; reject(new Error('scene')); };
        document.head.appendChild(script);
      });
    }
    return loading;
  }

  function playing() { return app.classList.contains('is-playing'); }
  function atmosphere() {
    var a = window.GARBA_ATMOSPHERE;
    var out = { venue: 'outdoors', listener: 'circle' };
    if (a) { if (/^(outdoors|stadium|sheri)$/.test(a.venue)) out.venue = a.venue; if (/^(circle|far|stage)$/.test(a.listener)) out.listener = a.listener; }
    return out;
  }
  function frame() {
    // The venue composes itself in the upper part of the screen, above the song and the controls
    if (!scene || !canvas) return;
    var bar = app.querySelector('.topbar'), top = bar ? bar.getBoundingClientRect().bottom : 56, h = window.innerHeight, w = window.innerWidth;
    var title = document.getElementById('songTitle'), room = h * (w > h ? 0.46 : 0.36);
    // Keep the garbo and the dancers clear of the song title
    if (title && title.offsetParent) room = Math.min(room, title.getBoundingClientRect().top - top - 10);
    // A short screen (a phone on its side) has no room above the song, so the venue becomes a dimmed backdrop
    var backdrop = room < 150;
    canvas.classList.toggle('is-backdrop', backdrop);
    scene.setBox(backdrop ? { x: 0, y: 0, w: w, h: h } : { x: 0, y: top, w: w, h: room });
  }
  function sync() {
    if (!scene) return;
    var a = atmosphere(), on = playing(), genre = app.dataset.genre || 'traditional';
    scene.set({
      on: on, lit: on ? 1 : 0.35, mode: on ? 'immersive' : 'off', venue: a.venue, listener: a.listener,
      theme: THEMES[genre] ? genre : 'traditional', style: genre === 'dandiya' ? 'dandiya' : 'claps', level: 0.6, density: 1
    });
  }
  function startScene() {
    if (scene || failed) return;
    loadScene().then(function () {
      if (view !== 'immersive' || scene) return;
      canvas = document.createElement('canvas');
      canvas.className = 'immersive-stage';
      canvas.setAttribute('aria-hidden', 'true');
      world.insertBefore(canvas, world.querySelector('.world-vignette'));
      scene = window.GarbaVenueScene.create(canvas, { venues: window.GARBA_ATMOSPHERE_ENGINE && window.GARBA_ATMOSPHERE_ENGINE.VENUES, reduceMotion: reduceQuery.matches });
      frame(); sync();
    }, function () {
      // Without the scene the player stays on the artwork, and says why once
      failed = true; setView('simple', true);
      announce('Immersive view could not load. Showing the simple view.');
    });
  }
  function stopScene() {
    if (scene) { scene.stop(); scene = null; }
    if (canvas) { canvas.remove(); canvas = null; }
  }

  function setView(next, quiet) {
    view = next === 'immersive' ? 'immersive' : 'simple';
    try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* storage unavailable */ }
    app.classList.toggle('view-immersive', view === 'immersive');
    if (view === 'immersive') startScene(); else stopScene();
    renderViewChoice();
    if (!quiet) announce(view === 'immersive' ? 'Immersive view on' : 'Simple view on');
  }

  function announce(message) {
    var live = document.getElementById('immersiveViewStatus');
    if (live) { live.textContent = ''; setTimeout(function () { live.textContent = message; }, 30); }
  }

  /* ---------- the More card ---------- */
  var moreButton = document.getElementById('moreButton');
  var card = document.getElementById('moreCard');
  var opener = null;

  function renderViewChoice() {
    if (!card) return;
    card.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
  }
  // A row shows the state of the button it stands for, and only when that button exists on this page
  function renderRows() {
    if (!card) return;
    card.querySelectorAll('[data-proxy]').forEach(function (row) {
      var target = document.getElementById(row.dataset.proxy);
      row.hidden = !target;
      if (!target) return;
      var pressed = target.getAttribute('aria-pressed');
      if (pressed != null) row.setAttribute('aria-pressed', pressed); else row.removeAttribute('aria-pressed');
      var badge = row.querySelector('.more-badge'), src = target.querySelector('.utility-badge');
      if (badge) badge.textContent = src ? src.textContent : '';
    });
  }
  function openCard() {
    if (!card || !moreButton) return;
    opener = document.activeElement;
    renderRows(); renderViewChoice();
    card.hidden = false; moreButton.setAttribute('aria-expanded', 'true');
    var first = card.querySelector('[data-view][aria-pressed="true"]') || card.querySelector('button');
    if (first) first.focus();
  }
  function closeCard(restore) {
    if (!card || card.hidden) return;
    card.hidden = true; moreButton.setAttribute('aria-expanded', 'false');
    if (restore && moreButton) moreButton.focus();
  }

  if (moreButton && card) {
    moreButton.addEventListener('click', function (e) { e.stopPropagation(); if (card.hidden) openCard(); else closeCard(true); });
    card.addEventListener('click', function (e) {
      var viewButton = e.target.closest('[data-view]');
      if (viewButton) { setView(viewButton.dataset.view); return; }
      var row = e.target.closest('[data-proxy]');
      if (row) {
        var target = document.getElementById(row.dataset.proxy);
        closeCard(false);
        if (target) target.click();
        return;
      }
      if (e.target.closest('[data-more-close]')) closeCard(true);
    });
    document.addEventListener('click', function (e) { if (!card.hidden && !card.contains(e.target) && e.target !== moreButton && !moreButton.contains(e.target)) closeCard(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !card.hidden) { e.preventDefault(); closeCard(true); } });
  }

  /* ---------- wiring ---------- */
  window.addEventListener('garba:playback-state-change', sync);
  window.addEventListener('garba:atmosphere-change', sync);
  new MutationObserver(sync).observe(app, { attributes: true, attributeFilter: ['class', 'data-genre'] });
  window.addEventListener('resize', frame);
  window.addEventListener('garba:playback-state-change', frame);
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', function () { if (scene) { stopScene(); startScene(); } });

  window.GARBA_IMMERSIVE_VIEW = {
    get view() { return view; },
    set view(v) { setView(v, true); },
    get sceneReady() { return !!scene; },
  };

  setView(view, true);
})();
