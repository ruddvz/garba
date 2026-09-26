/*
 * PlayGarba Immersive view and the More card.
 *
 * Simple and Immersive are complete, mutually exclusive player surfaces. The production player remains
 * mounted as the playback owner while the complete Garbo prototype is shown in an isolated frame.
 *
 * More gathers the less-used top-bar actions (share, Garba Circle, My Garba, Atmosphere). A separate
 * switch below More chooses the player renderer. Proxy rows still act through the original buttons.
 */
(function () {
  'use strict';

  var VIEW_KEY = 'garba:view';
  var app = document.getElementById('app');
  if (!app || !window.GARBA_IMMERSIVE_PLAYER || window.GARBA_IMMERSIVE_VIEW) return;

  var view = 'simple';
  try { if (localStorage.getItem(VIEW_KEY) === 'immersive') view = 'immersive'; } catch (e) { /* storage unavailable */ }

  /* ---------- complete embedded prototype ---------- */
  var overlay = null, frame = null, syncTimer = 0, catalogueSent = false, catalogueSignature = '';
  var nonstopSets = [], nonstopSetsStatus = 'loading', nonstopPromise = null;
  var CHANNEL = 'playgarba:immersive-prototype';
  function ensureFrame() {
    if (overlay) return;
    overlay = document.createElement('section');
    overlay.className = 'garbo-prototype-overlay';
    overlay.setAttribute('aria-label', 'Immersive Garbo player'); overlay.hidden = true;
    frame = document.createElement('iframe'); frame.className = 'garbo-prototype-frame';
    frame.title = 'Garbo player prototype'; frame.allow = 'autoplay; clipboard-write; fullscreen'; frame.tabIndex = 0;
    overlay.append(frame); document.body.appendChild(overlay);
    frame.addEventListener('load', function () { sendSnapshot(true); });
  }
  function sendSnapshot(includeCatalogue) {
    if (!frame || !frame.contentWindow || view !== 'immersive') return;
    var snapshot = window.GARBA_IMMERSIVE_PLAYER.snapshot();
    var sendCatalogue = includeCatalogue || !catalogueSent || snapshot.catalogueSignature !== catalogueSignature;
    if (sendCatalogue) {
      snapshot = window.GARBA_IMMERSIVE_PLAYER.snapshot({ includeCatalogue: true });
      snapshot.nonstopSets = nonstopSets;
      snapshot.nonstopSetsStatus = nonstopSetsStatus;
    }
    if (Array.isArray(snapshot.songs) && snapshot.songs.length) {
      catalogueSent = true;
      catalogueSignature = snapshot.catalogueSignature || '';
    }
    frame.contentWindow.postMessage({ channel: CHANNEL, type: 'state', snapshot: snapshot }, location.origin);
  }
  function syncNonstopCatalogue() {
    if (nonstopPromise) return nonstopPromise;
    if (typeof window.GARBA_IMMERSIVE_PLAYER.loadNonstopCatalogue !== 'function') {
      nonstopSetsStatus = 'error';
      sendSnapshot(true);
      return Promise.resolve([]);
    }
    nonstopPromise = window.GARBA_IMMERSIVE_PLAYER.loadNonstopCatalogue().then(function (sets) {
      nonstopSets = Array.isArray(sets) ? sets : [];
      nonstopSetsStatus = 'ready';
      sendSnapshot(true);
      return nonstopSets;
    }).catch(function () {
      nonstopSets = [];
      nonstopSetsStatus = 'error';
      sendSnapshot(true);
      return [];
    });
    return nonstopPromise;
  }
  function onMessage(event) {
    if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow) return;
    var message = event.data;
    if (!message || message.channel !== CHANNEL) return;
    if (message.type === 'view') { setView(message.view); return; }
    if (message.type === 'ready') {
      catalogueSent = false;
      sendSnapshot(true);
      if (typeof window.GARBA_IMMERSIVE_PLAYER.syncCatalogue === 'function') {
        window.GARBA_IMMERSIVE_PLAYER.syncCatalogue().then(function () {
          if (view === 'immersive') sendSnapshot(true);
        }).catch(function () { /* keep the current player snapshot available */ });
      }
      syncNonstopCatalogue();
    }
    else if (message.type === 'action' && typeof message.action === 'string') {
      if (message.action === 'circle') setView('simple', true);
      window.GARBA_IMMERSIVE_PLAYER.action(message.action, message.value);
      sendSnapshot(false);
    } else if (message.type === 'exit') setView('simple');
  }
  function startPrototype() {
    ensureFrame(); overlay.hidden = false;
    closeCard(false);
    app.setAttribute('aria-hidden', 'true'); app.inert = true;
    if (!frame.src) {
      var isLocalDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      var protoPath = isLocalDev ? './docs/product/prototypes/garbo/?live=1&embed=1&v=20260926-3' : './garbo/prototype/?live=1&embed=1&v=20260926-3';
      frame.src = new URL(protoPath, location.href).href;
    }
    window.addEventListener('message', onMessage);
    sendSnapshot(true);
    clearInterval(syncTimer);
    syncTimer = setInterval(function () { sendSnapshot(!catalogueSent); }, 500);
    frame.focus({ preventScroll: true });
  }
  function stopPrototype() {
    var wasOpen = overlay && !overlay.hidden;
    clearInterval(syncTimer); syncTimer = 0;
    window.removeEventListener('message', onMessage);
    if (overlay) overlay.hidden = true;
    app.removeAttribute('aria-hidden'); app.inert = false;
    catalogueSent = false; catalogueSignature = '';
    nonstopPromise = null;
    if (wasOpen) {
      var simpleSwitch = document.querySelector('[data-view-switch]');
      if (simpleSwitch) simpleSwitch.focus({ preventScroll: true });
      else if (moreButton) moreButton.focus({ preventScroll: true });
    }
  }

  function setView(next, quiet) {
    view = next === 'immersive' ? 'immersive' : 'simple';
    try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* storage unavailable */ }
    app.classList.toggle('view-immersive', view === 'immersive');
    if (view === 'immersive') startPrototype(); else stopPrototype();
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
    document.querySelectorAll('[data-view-switch]').forEach(function (b) { b.setAttribute('aria-checked', String(view === 'immersive')); });
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

  document.addEventListener('click', function (e) {
    var button = e.target.closest('[data-view-switch]');
    if (button) setView(view === 'immersive' ? 'simple' : 'immersive');
  });

  /* ---------- wiring ---------- */
  window.addEventListener('garba:playback-state-change', function () { sendSnapshot(false); });
  window.addEventListener('garba:atmosphere-change', function () { sendSnapshot(false); });

  window.GARBA_IMMERSIVE_VIEW = {
    get view() { return view; },
    set view(v) { setView(v, true); },
    get sceneReady() { return !!frame && !overlay.hidden; },
  };

  setView(view, true);
})();
