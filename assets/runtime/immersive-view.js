/*
 * PlayGarba Immersive view and the More card.
 *
 * Simple view, the courtyard artwork, stays the default. Immersive view is the listener's choice: the Garbo player
 * (docs/product/prototypes/garbo, published at /immersive/) takes over the screen, with the lamp, the venue, the DJ
 * and the rail of cards, while this page's own player keeps playing underneath. Garbo reads what that player is
 * doing and every one of its controls asks that player to act, so songs, genres, nonstop sets, 24/7 Live, My Garba
 * and YouTube all stay the real ones. It loads only when chosen and is remembered per device.
 *
 * The More card gathers the less-used top-bar actions (share, Garba Circle, My Garba, Atmosphere) with the view
 * switch, so each screen size keeps only what it needs in the bar. Rows act through the original buttons.
 */
(function () {
  'use strict';

  var VIEW_KEY = 'garba:view';
  var BASE = 'immersive/';
  var FONTS = 'https://fonts.googleapis.com/css2?family=Rasa:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Anek+Gujarati:wght@400;500;600;700&display=swap';
  var app = document.getElementById('app');
  if (!app || window.GARBA_IMMERSIVE_VIEW) return;

  var view = 'simple';
  try { if (localStorage.getItem(VIEW_KEY) === 'immersive') view = 'immersive'; } catch (e) { /* storage unavailable */ }
  // A hosted-live link only makes sense in the Garbo player
  if (/^#live=/.test(location.hash)) view = 'immersive';

  function $(id) { return document.getElementById(id); }
  function announce(message) {
    var live = $('immersiveViewStatus');
    if (live) { live.textContent = ''; setTimeout(function () { live.textContent = message; }, 30); }
  }
  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.async = false;
        s.onload = resolve;
        s.onerror = function () { delete scripts[src]; reject(new Error(src)); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }

  /* ---------- the real player, as Garbo sees it ---------- */
  function player() { return window.GARBA_APP; }
  function yt() { return window.GARBA_YOUTUBE_PLAYER; }
  function nonstop() { return window.GARBA_NONSTOP; }
  function click(id) { var b = $(id); if (b && !b.disabled) b.click(); }

  function setChapters(set) {
    return (set && Array.isArray(set.segments) ? set.segments : [])
      .filter(function (c) { return c && c.title && isFinite(c.startSeconds); })
      .map(function (c) { return { title: String(c.title), startSeconds: Number(c.startSeconds), endSeconds: Number(c.endSeconds) || null }; });
  }
  function mapSet(set) {
    var chapters = setChapters(set), last = chapters[chapters.length - 1];
    return {
      id: set.id, title: set.title, year: set.year,
      artists: Array.isArray(set.artists) ? set.artists : set.artist ? [set.artist] : [],
      durationSeconds: last && last.endSeconds ? last.endSeconds : null,
      chapters: chapters.length ? chapters : [{ title: set.title, startSeconds: 0 }]
    };
  }

  function snapshot() {
    var A = player(), st = A && A.getState ? A.getState() : null, Y = yt(), N = nonstop();
    var set = N && N.activeSet, elapsed = Y && Y.elapsedSeconds != null ? Y.elapsedSeconds : st ? st.elapsed : 0;
    var out = {
      songId: st ? st.songId : null,
      genre: st ? st.genreId : 'traditional',
      playing: app.classList.contains('is-playing'),
      elapsed: elapsed || 0,
      duration: st ? st.duration : 0,
      live: !!(st && st.liveMode),
      shuffle: !!(st && st.shuffleMode),
      favourite: !!(A && st && st.songId && A.isFavourite && A.isFavourite(st.songId))
    };
    if (set) {
      var chapters = setChapters(set), idx = -1;
      for (var i = 0; i < chapters.length; i++) { if (out.elapsed >= chapters[i].startSeconds) idx = i; else break; }
      out.setId = set.id; out.chapterIndex = idx;
      var last = chapters[chapters.length - 1];
      out.duration = last && last.endSeconds ? last.endSeconds : out.duration;
      out.playing = out.playing || !!(Y && Y.playing);
    }
    return out;
  }

  function catalogue() {
    return new Promise(function (resolve, reject) {
      var tries = 0;
      (function wait() {
        var A = player(), songs = A && A.getSongs ? A.getSongs() : [];
        if (songs.length) return resolve();
        if (++tries > 300) return reject(new Error('catalogue'));
        setTimeout(wait, 100);
      })();
    }).then(function () {
      var A = player();
      var genres = A.getGenres().filter(function (g) { return g && g.id && g.id !== 'nonstop'; }).map(function (g) { return { id: g.id, name: g.name || g.label || g.id, label: g.label || g.name || g.id }; });
      var songs = A.getSongs().map(function (s) {
        return { id: s.id, title: s.title, artist: s.artist, genre: s.genre, durationSeconds: s.durationSeconds || null, release: s.releaseTitle ? { title: s.releaseTitle, script: 'latn', year: s.year } : null, playable: A.canPlay(s) };
      });
      // Songs that can play come first, the way the player's own lists do
      songs = songs.filter(function (s) { return s.playable; }).concat(songs.filter(function (s) { return !s.playable; }));
      var N = nonstop();
      var sets = N && N.list ? N.list().then(function (list) { return (list || []).map(mapSet); }, function () { return []; }) : Promise.resolve([]);
      return sets.then(function (nonstopSets) { return { genres: genres, songs: songs, nonstopSets: nonstopSets }; });
    });
  }

  var followAt = 0;
  var bridge = {
    root: null, frame: null,
    active: function () { return view === 'immersive' && !!host && !host.hidden; },
    snapshot: snapshot,
    catalogue: catalogue,
    play: function () { if (!snapshot().playing) click('playButton'); },
    pause: function () { if (snapshot().playing) click('playButton'); },
    step: function (dir) { click(dir < 0 ? 'prevButton' : 'nextButton'); },
    selectGenre: function (id) {
      var N = nonstop();
      if (id === 'nonstop') { if (N && N.play) N.play(); return; }
      if (N && N.activeSetId && N.stop) N.stop();
      if (player()) player().selectGenre(id);
    },
    playSong: function (id, keep) {
      var N = nonstop();
      if (N && N.activeSetId && N.stop) N.stop();
      if (player()) player().selectSong(id, { autoplay: keep !== false });
    },
    playSet: function (id, at) {
      var N = nonstop();
      if (!N || !N.play) return;
      Promise.resolve(N.play(id)).then(function () { if (at > 0 && yt() && yt().seekTo) setTimeout(function () { yt().seekTo(at); }, 1200); });
    },
    seek: function (fraction) {
      var d = snapshot().duration, Y = yt();
      if (!d) return;
      if (Y && Y.seekTo) Y.seekTo(fraction * d);
    },
    // A hosted live: play its song, and keep within three seconds of where the live is
    follow: function (id, seconds) {
      var now = Date.now();
      if (now < followAt) return;
      var s = snapshot();
      if (s.songId !== id || s.setId) { followAt = now + 4000; bridge.playSong(id, true); return; }
      if (s.playing && Math.abs(s.elapsed - seconds) > 3 && yt() && yt().seekTo) { followAt = now + 2500; yt().seekTo(seconds); }
    },
    toggleLive: function () { click('liveStationButton'); },
    toggleShuffle: function () { click('shuffleButton'); },
    toggleFavourite: function (id) { if (player()) player().toggleFavourite(id); },
    toggleVideo: function () { var stage = $('youtubeStage'); if (stage) stage.classList.toggle('is-expanded'); },
    install: function () { click('installButton'); },
    shareUrl: function () { return location.href.split('#')[0]; },
    exit: function () { setView('simple'); }
  };

  /* ---------- mounting Garbo ---------- */
  var host = null, mounting = null, failed = false;
  function mount() {
    if (host) return Promise.resolve();
    if (mounting) return mounting;
    if (!document.querySelector('link[data-garbo-fonts]')) {
      var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = FONTS; f.dataset.garboFonts = ''; document.head.appendChild(f);
    }
    mounting = fetch(BASE + 'garbo.html').then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script').forEach(function (s) { s.remove(); });
      var el = document.createElement('div');
      el.className = 'garbo-host'; el.id = 'garboHost'; el.hidden = true;
      var root = el.attachShadow({ mode: 'open' });
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = BASE + 'garbo.css';
      var frame = document.createElement('div'); frame.className = 'garbo-frame';
      frame.innerHTML = doc.body.innerHTML;
      root.append(css, frame);
      document.body.appendChild(el);
      bridge.root = root; bridge.frame = frame;
      var styled = new Promise(function (ok) { css.onload = ok; css.onerror = ok; setTimeout(ok, 4000); });
      window.GARBO_BASE = BASE;
      window.GARBO_SINGER_BASE = BASE + 'singers/';
      window.GARBO_ATMO_BEDS = {
        'ground-crowd': ['assets/audio/festival-crowd.m4a', 'assets/audio/festival-crowd.ogg'],
        'courtyard-bed': ['assets/audio/courtyard-night.m4a', 'assets/audio/courtyard-night.ogg']
      };
      window.GARBO_HOST = bridge;
      var engine = window.GARBA_ATMOSPHERE_ENGINE ? Promise.resolve() : loadScript('assets/runtime/immersive-atmosphere.js');
      return Promise.all([styled, engine.catch(function () { /* Garbo falls back to its plain scene */ })])
        .then(function () { return loadScript('atmosphere/scene.js').catch(function () { /* plain scene */ }); })
        .then(function () { return loadScript(BASE + 'scene.js'); })
        .then(function () { return loadScript(BASE + 'garbo.js'); })
        .then(function () { host = el; });
    });
    mounting.catch(function () { mounting = null; });
    return mounting;
  }

  function setView(next, quiet) {
    view = next === 'immersive' ? 'immersive' : 'simple';
    try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* storage unavailable */ }
    renderViewChoice();
    if (view === 'immersive') {
      document.body.classList.add('garba-immersive-loading');
      mount().then(function () {
        document.body.classList.remove('garba-immersive-loading');
        if (view !== 'immersive') return;
        host.hidden = false;
        document.body.classList.add('garba-immersive');
        window.dispatchEvent(new Event('resize'));
        if (!quiet) announce('Immersive view on');
      }, function () {
        document.body.classList.remove('garba-immersive-loading');
        failed = true; view = 'simple'; renderViewChoice();
        announce('Immersive view could not load. Showing the simple view.');
      });
    } else {
      document.body.classList.remove('garba-immersive');
      if (host) host.hidden = true;
      if (!quiet) announce('Simple view on');
      var sw = $('immersiveSwitch'); if (sw && !quiet) sw.focus();
    }
  }

  /* ---------- the switch under More, and the More card ---------- */
  var moreButton = $('moreButton');
  var card = $('moreCard');
  var immersiveSwitch = $('immersiveSwitch');
  if (immersiveSwitch) immersiveSwitch.addEventListener('click', function () { closeCard(false); setView('immersive'); });

  function renderViewChoice() {
    if (immersiveSwitch) immersiveSwitch.setAttribute('aria-pressed', String(view === 'immersive'));
    if (!card) return;
    card.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
  }
  function renderRows() {
    if (!card) return;
    card.querySelectorAll('[data-proxy]').forEach(function (row) {
      var target = $(row.dataset.proxy);
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
      if (viewButton) { closeCard(false); setView(viewButton.dataset.view); return; }
      var row = e.target.closest('[data-proxy]');
      if (row) {
        var target = $(row.dataset.proxy);
        closeCard(false);
        if (target) target.click();
        return;
      }
      if (e.target.closest('[data-more-close]')) closeCard(true);
    });
    document.addEventListener('click', function (e) { if (!card.hidden && !card.contains(e.target) && e.target !== moreButton && !moreButton.contains(e.target)) closeCard(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !card.hidden) { e.preventDefault(); closeCard(true); } });
  }

  // While Garbo is on screen its own shortcuts apply; the page underneath must not also act on them
  window.addEventListener('keydown', function (e) {
    if (!bridge.active()) return;
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (t && t.matches && t.matches('input, textarea, select, [contenteditable]')) return;
    if (e.key === ' ' || e.key === '/' || e.key === 'k' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); if (snapshot().playing) bridge.pause(); else bridge.play(); }
      else e.stopImmediatePropagation();
    }
  }, true);

  window.GARBA_IMMERSIVE_VIEW = {
    get view() { return view; },
    set view(v) { setView(v, true); },
    get ready() { return !!host; },
    get failed() { return failed; }
  };

  renderViewChoice();
  if (view === 'immersive') setView('immersive', true);
})();
