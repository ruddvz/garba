/* Garbo player prototype: player logic, sheets and states.
   Playback is simulated with a clock. All song facts come from sample.json. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var app = $('app');
  var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var scene = new window.GarboScene.Scene($('scene'));
  var mirrors = new window.GarboScene.MirrorBand($('mirrorBand'));

  var STEPS = [
    { name: 'Be tali', desc: 'Two claps in each round', claps: 2 },
    { name: 'Tran tali', desc: 'Three claps in each round', claps: 3 },
    { name: 'Hinch', desc: 'Mixes Garba and Raas movement', claps: 0 },
    { name: 'Dodhiyu', desc: 'Four steps forward, two steps back', claps: 0 },
    { name: 'Popatiyu', desc: 'The parrot step, led by the shoulders and hands', claps: 0 },
    { name: 'Raas', desc: 'Danced in pairs with dandiya sticks', claps: 0 }
  ];

  var S = {
    data: null, genres: [], genre: 'traditional',
    queue: [], index: 0, track: null,
    mode: 'ember', resumeMode: 'ember', pos: 0,
    shuffle: false, saved: new Set(), offline: false,
    nonstop: null, tonight: null, live: false, loadTimer: null
  };

  try { JSON.parse(localStorage.getItem('garbo-proto-saved') || '[]').forEach(function (id) { S.saved.add(id); }); } catch (e) { /* storage unavailable */ }

  /* ---------- helpers ---------- */
  function fmt(sec) {
    if (sec == null || !isFinite(sec)) return '';
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function genreInfo(id) { for (var i = 0; i < S.genres.length; i++) if (S.genres[i].id === id) return S.genres[i]; return null; }
  function playableIn(genre) { return S.data.songs.filter(function (s) { return s.genre === genre && s.playable; }); }
  var toastTimer;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- now playing ---------- */
  function trackView() {
    var t = S.track;
    if (!t) return { eyebrow: '', title: '', artist: '', from: null };
    if (t.kind === 'empty') return { eyebrow: t.eyebrow, title: t.title, artist: t.artist, from: null };
    if (t.kind === 'chapter') {
      var set = t.set;
      return { eyebrow: 'Nonstop Garba · chapter ' + (t.chapterIndex + 1) + ' of ' + set.chapters.length, title: t.title, artist: set.artists.join(', '), from: { text: set.title, script: 'latn' } };
    }
    var g = genreInfo(t.song.genre);
    var eyebrow = S.live ? '24/7 Live' : S.tonight ? 'Tonight · ' + (S.tonight.part + 1) + ' of ' + TONIGHT.length + ' · ' + (g ? g.label : '') : (g ? g.label : '');
    var rel = t.song.release;
    return { eyebrow: eyebrow, title: t.song.title, artist: t.song.artist, from: rel ? { text: rel.title, script: rel.script, year: rel.year } : null };
  }

  function renderNP(animate) {
    var v = trackView(), np = $('np');
    var apply = function () {
      $('eyebrow').textContent = v.eyebrow;
      var title = $('title');
      title.textContent = v.title;
      title.title = v.title;
      title.classList.toggle('long', v.title.length > 34);
      $('artist').textContent = v.artist;
      var from = $('from'); from.textContent = '';
      if (v.from) {
        from.append('From ');
        var span = el('span', null, v.from.text);
        if (v.from.script === 'gu') span.lang = 'gu';
        from.append(span);
      }
      np.classList.remove('swap');
    };
    if (animate && !reducedQuery.matches) { np.classList.add('swap'); setTimeout(apply, 170); } else apply();
    $('heartBtn').setAttribute('aria-pressed', String(!!(S.track && S.track.song && S.saved.has(S.track.song.id))));
    renderTime();
    markCurrentRows();
  }

  function duration() {
    var t = S.track;
    if (!t) return null;
    if (t.kind === 'chapter') return t.set.durationSeconds;
    if (t.kind === 'song') return t.song.durationSeconds;
    return null;
  }

  function progress() {
    var t = S.track;
    if (!t || S.live) return 0;
    if (t.kind === 'chapter') {
      var set = t.set, n = set.chapters.length, c = t.chapterIndex;
      if (set.durationSeconds) return S.pos / set.durationSeconds;
      var start = set.chapters[c].startSeconds, next = set.chapters[c + 1];
      var within = next ? Math.min(1, (S.pos - start) / (next.startSeconds - start)) : 0;
      return (c + within) / n;
    }
    var d = duration();
    return d ? S.pos / d : 0;
  }

  function chapterMarks() {
    var t = S.track;
    if (!t || t.kind !== 'chapter') return null;
    var set = t.set, n = set.chapters.length;
    return set.chapters.map(function (ch, i) { return set.durationSeconds ? ch.startSeconds / set.durationSeconds : i / n; });
  }

  function renderTime() {
    var elapsed = $('elapsed'), dur = $('duration'), sep = document.querySelector('.time-sep');
    elapsed.className = ''; sep.hidden = false;
    if (!S.track || S.track.kind === 'empty') { elapsed.textContent = ''; dur.textContent = ''; sep.hidden = true; return; }
    if (S.live) { elapsed.textContent = 'Live now'; elapsed.className = 'live-now'; dur.textContent = ''; sep.hidden = true; return; }
    var d = duration();
    elapsed.textContent = fmt(S.pos);
    dur.textContent = d ? fmt(d) : 'Duration unknown';
    var seek = $('ringSeek');
    seek.disabled = !d && !(S.track.kind === 'chapter');
    seek.value = String(Math.round(Math.min(1, progress()) * 1000));
    seek.setAttribute('aria-valuetext', fmt(S.pos) + (d ? ' of ' + fmt(d) : ''));
  }

  /* ---------- modes ---------- */
  var HINTS = {
    ember: 'Tap the garbo to light it',
    paused: 'Paused',
    loading: 'Lighting the lamp…',
    playing: '',
    live: '',
    offline: '',
    unavailable: 'No verified YouTube route yet',
    empty: 'Try another genre'
  };

  function setMode(mode) {
    S.mode = mode;
    app.dataset.state = mode;
    app.dataset.playing = String(mode === 'playing' || mode === 'live');
    var playing = app.dataset.playing === 'true';
    $('playBtn').setAttribute('aria-label', mode === 'loading' ? 'Loading' : playing ? 'Pause' : 'Play');
    $('lampHit').setAttribute('aria-label', playing ? 'Pause' : 'Light the garbo to play');
    var blocked = mode === 'unavailable' || mode === 'empty' || mode === 'offline';
    $('playBtn').disabled = blocked;
    $('lampHit').disabled = blocked;
    $('hint').textContent = HINTS[mode] || '';
    $('offlineBar').hidden = mode !== 'offline';
    $('liveBtn').setAttribute('aria-pressed', String(S.live));
    scene.set({ mode: mode === 'paused' ? 'ember' : mode === 'empty' ? 'unavailable' : mode });
  }

  function play() {
    if (S.offline || !S.track) return;
    if (S.track.kind === 'song' && !S.track.song.playable) { setMode('unavailable'); return; }
    if (S.track.kind === 'empty') return;
    clearTimeout(S.loadTimer);
    setMode('loading');
    S.loadTimer = setTimeout(function () { if (S.mode === 'loading') setMode(S.live ? 'live' : 'playing'); }, 1300);
  }
  function pause() { clearTimeout(S.loadTimer); setMode('paused'); }
  function toggle() {
    if (S.mode === 'playing' || S.mode === 'live' || S.mode === 'loading') pause(); else play();
  }

  /* ---------- queue ---------- */
  function loadSong(song, keepPlaying) {
    S.nonstop = null;
    S.track = { kind: 'song', song: song };
    S.pos = 0;
    scene.set({ chapters: null, chapterIndex: -1 });
    renderNP(true);
    if (!song.playable) { clearTimeout(S.loadTimer); setMode('unavailable'); return; }
    if (keepPlaying) play(); else setMode(S.offline ? 'offline' : 'ember');
  }

  function loadSet(set, chapterIndex, keepPlaying) {
    S.live = false;
    S.nonstop = set;
    var c = Math.max(0, Math.min(set.chapters.length - 1, chapterIndex || 0));
    S.track = { kind: 'chapter', set: set, chapterIndex: c, title: set.chapters[c].title };
    S.pos = set.chapters[c].startSeconds;
    scene.set({ chapters: chapterMarks(), chapterIndex: c });
    renderNP(true);
    if (keepPlaying) play(); else setMode(S.offline ? 'offline' : 'ember');
  }

  function setGenre(id, keepPlaying) {
    S.genre = id;
    renderDial();
    if (id === 'nonstop') { S.queue = []; loadSet(S.data.nonstopSets[0], 0, keepPlaying); return; }
    S.queue = playableIn(id);
    S.index = 0;
    if (!S.queue.length) {
      var g = genreInfo(id);
      S.nonstop = null;
      S.track = { kind: 'empty', eyebrow: g ? g.label : id, title: 'No ' + (g ? g.name : id) + ' songs to play yet', artist: 'No verified YouTube routes in this sample.' };
      scene.set({ chapters: null, chapterIndex: -1 });
      clearTimeout(S.loadTimer);
      renderNP(true); setMode('empty');
      return;
    }
    loadSong(S.queue[0], keepPlaying);
  }

  function isActive() { return S.mode === 'playing' || S.mode === 'live' || S.mode === 'loading'; }

  function step(dir) {
    var keep = isActive();
    var t = S.track;
    if (t && t.kind === 'chapter') {
      var c = t.chapterIndex + dir;
      if (c >= t.set.chapters.length) { if (S.tonight) return advanceTonight(keep); c = 0; }
      if (c < 0) c = 0;
      loadSet(t.set, c, keep); return;
    }
    if (!S.queue.length) return;
    if (dir > 0 && S.tonight && S.index + 1 >= S.queue.length) return advanceTonight(keep);
    if (S.shuffle && dir > 0) {
      var n = S.queue.length, r = n > 1 ? (S.index + 1 + Math.floor(Math.random() * (n - 1))) % n : 0;
      S.index = r;
    } else {
      S.index = (S.index + dir + S.queue.length) % S.queue.length;
    }
    loadSong(S.queue[S.index], keep);
  }

  /* ---------- simulated clock ---------- */
  function tick(dt) {
    if (S.mode !== 'playing' && S.mode !== 'live') return;
    if (S.live) return;
    S.pos += dt;
    var t = S.track;
    if (t.kind === 'chapter') {
      var next = t.set.chapters[t.chapterIndex + 1];
      if (next && S.pos >= next.startSeconds) {
        t.chapterIndex++; t.title = next.title;
        scene.set({ chapterIndex: t.chapterIndex });
        renderNP(true);
      }
      if (t.set.durationSeconds && S.pos >= t.set.durationSeconds) step(1);
    } else {
      var d = duration();
      if (d && S.pos >= d) { step(1); return; }
    }
  }

  /* ---------- genre dial ---------- */
  var dialButtons = [];
  var measureCtx = document.createElement('canvas').getContext('2d');
  function buildDial() {
    var track = $('dialTrack');
    var items = [{ id: 'nonstop', name: 'Nonstop' }].concat(S.genres);
    items.forEach(function (g) {
      var b = el('button', null, g.name); b.type = 'button'; b.dataset.genre = g.id;
      b.addEventListener('click', function () { exitSpecial(); setGenre(g.id, isActive()); });
      track.appendChild(b); dialButtons.push(b);
    });
    var dial = $('dial'), startX = null, moved = false;
    dial.addEventListener('pointerdown', function (e) { startX = e.clientX; moved = false; });
    dial.addEventListener('pointermove', function (e) {
      if (startX == null) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 54) { moved = true; startX = e.clientX; moveDial(dx < 0 ? 1 : -1); }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { dial.addEventListener(n, function () { startX = null; }); });
    dial.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    dial.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); moveDial(e.key === 'ArrowRight' ? 1 : -1); var cur = dial.querySelector('[aria-current="true"]'); if (cur) cur.focus(); }
    });
    dial.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) { e.preventDefault(); moveDial(e.deltaX > 0 ? 1 : -1); } }, { passive: false });
  }
  var dialTimer;
  function moveDial(dir) {
    var ids = dialButtons.map(function (b) { return b.dataset.genre; });
    var i = Math.max(0, Math.min(ids.length - 1, ids.indexOf(S.genre) + dir));
    if (ids[i] === S.genre) return;
    S.genre = ids[i]; renderDial();
    clearTimeout(dialTimer);
    var keep = isActive();
    dialTimer = setTimeout(function () { exitSpecial(); setGenre(ids[i], keep); }, 220);
  }
  function renderDial() {
    var ids = dialButtons.map(function (b) { return b.dataset.genre; }), cur = ids.indexOf(S.genre);
    var half = ($('dial').clientWidth || 360) / 2, GAP = 26, arcR = half * 2.2;
    // Measure label text at its final size so positions don't depend on a running transition.
    var widths = dialButtons.map(function (b, i) {
      measureCtx.font = i === cur ? '600 16.5px "Anek Gujarati", system-ui, sans-serif' : '500 14px "Anek Gujarati", system-ui, sans-serif';
      return measureCtx.measureText(b.textContent).width + 16;
    });
    var xs = [], x = 0;
    xs[cur] = 0;
    for (var r = cur + 1; r < ids.length; r++) { x += widths[r - 1] / 2 + GAP + widths[r] / 2; xs[r] = x; }
    x = 0;
    for (var l = cur - 1; l >= 0; l--) { x -= widths[l + 1] / 2 + GAP + widths[l] / 2; xs[l] = x; }
    dialButtons.forEach(function (b, i) {
      var d = i - cur, off = Math.abs(xs[i]), visible = off < half + 20;
      b.style.left = xs[i] + 'px';
      b.style.top = (off * off / (2 * arcR)) + 'px';
      b.style.opacity = visible ? String(Math.max(0.25, 1 - off / (half * 1.15))) : '0';
      b.style.visibility = visible ? 'visible' : 'hidden';
      b.tabIndex = d === 0 ? 0 : -1;
      if (d === 0) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  /* ---------- live, tonight ---------- */
  function exitSpecial() { if (S.live) { S.live = false; } if (S.tonight) { S.tonight = null; } }

  function toggleLive() {
    if (S.live) { S.live = false; setGenre(S.genre === 'nonstop' ? 'traditional' : S.genre, false); toast('Left 24/7 Live'); return; }
    S.tonight = null; S.live = true; S.nonstop = null;
    var pool = S.data.songs.filter(function (s) { return s.playable; });
    S.queue = pool; S.index = Math.floor(pool.length / 3);
    S.track = { kind: 'song', song: pool[S.index] };
    scene.set({ chapters: null, chapterIndex: -1 });
    renderNP(true);
    play();
  }

  var TONIGHT = [];
  function buildTonight() {
    var set = S.data.nonstopSets[1] || S.data.nonstopSets[0];
    TONIGHT = [
      { label: 'Devotional Garba', genre: 'devotional', at: '9:00 pm' },
      { label: 'Traditional Garba', genre: 'traditional', at: '9:40 pm' },
      { label: 'Nonstop set', set: set, at: '10:30 pm', detail: set.title },
      { label: 'Dandiya Raas', genre: 'dandiya', at: '11:30 pm' },
      { label: 'Modern Fusion Garba', genre: 'fusion', at: '12:20 am' }
    ];
    var list = $('nightList');
    TONIGHT.forEach(function (p) {
      var li = el('li'); li.append(el('strong', null, p.label));
      li.append(el('span', null, p.at));
      if (p.detail) { var d = el('span', null, p.detail); d.style.gridColumn = '2 / -1'; d.style.marginTop = '-4px'; li.append(d); }
      list.append(li);
    });
    // Arc: the night rises from left to right
    var svg = $('nightArc'), NS = 'http://www.w3.org/2000/svg';
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M14 128 C 90 124, 150 104, 200 76 S 300 20, 326 14');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'rgba(214,176,111,.55)'); path.setAttribute('stroke-width', '2');
    svg.append(path);
    var len = path.getTotalLength ? path.getTotalLength() : 0;
    TONIGHT.forEach(function (p, i) {
      var pt = len ? path.getPointAtLength(len * (0.04 + i * 0.23)) : { x: 20 + i * 75, y: 120 - i * 25 };
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', '6');
      c.setAttribute('fill', '#160e0b'); c.setAttribute('stroke', '#d6b06f'); c.setAttribute('stroke-width', '2');
      c.setAttribute('r', '10');
      c.dataset.part = String(i);
      svg.append(c);
      var tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', pt.x); tx.setAttribute('y', pt.y + 4);
      tx.setAttribute('text-anchor', 'middle'); tx.dataset.part = String(i);
      tx.setAttribute('fill', '#d6b06f'); tx.setAttribute('font-size', '12'); tx.setAttribute('font-weight', '700'); tx.setAttribute('font-family', 'Anek Gujarati, system-ui, sans-serif');
      tx.textContent = String(i + 1); svg.append(tx);
    });
    [['9 pm', 14, 146, 'start'], ['1 am', 326, 40, 'end']].forEach(function (lab) {
      var tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', lab[1]); tx.setAttribute('y', lab[2]); tx.setAttribute('text-anchor', lab[3]);
      tx.setAttribute('fill', '#978672'); tx.setAttribute('font-size', '11'); tx.setAttribute('font-family', 'Anek Gujarati, system-ui, sans-serif');
      tx.textContent = lab[0]; svg.append(tx);
    });
    $('startTonight').addEventListener('click', function () { closeSheet(); startTonightPart(0, true); });
  }
  function renderTonightMarks() {
    var part = S.tonight ? S.tonight.part : -1;
    $('nightArc').querySelectorAll('circle').forEach(function (c) { var i = +c.dataset.part; c.setAttribute('fill', i < part ? '#d6b06f' : i === part ? '#e8a33d' : '#160e0b'); c.setAttribute('r', i === part ? '12' : '10'); });
    $('nightArc').querySelectorAll('text[data-part]').forEach(function (t) { var i = +t.dataset.part; t.setAttribute('fill', i <= part ? '#3a1712' : '#d6b06f'); });
    $('nightList').querySelectorAll('li').forEach(function (li, i) { li.classList.toggle('now', i === part); });
    $('startTonight').textContent = S.tonight ? 'Restart tonight' : 'Start tonight';
  }
  function startTonightPart(i, keep) {
    S.live = false;
    var p = TONIGHT[i];
    S.tonight = { part: i, set: p.set || null };
    if (p.set) { S.genre = 'nonstop'; renderDial(); S.queue = []; loadSet(p.set, 0, keep); }
    else { S.genre = p.genre; renderDial(); S.queue = playableIn(p.genre).slice(0, 3); S.index = 0; loadSong(S.queue[0], keep); }
    renderTonightMarks();
  }
  function advanceTonight(keep) {
    var i = S.tonight.part + 1;
    if (i >= TONIGHT.length) { S.tonight = null; toast('That was tonight. Thanks for dancing.'); pause(); renderTonightMarks(); return; }
    startTonightPart(i, keep);
  }

  /* ---------- sheets ---------- */
  var openSheet = null, opener = null;
  function focusables(root) { return Array.prototype.filter.call(root.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])'), function (n) { return !n.disabled && n.offsetParent !== null; }); }
  function showSheet(id, focusId) {
    if (openSheet) closeSheet(true);
    opener = document.activeElement;
    var s = $(id); s.hidden = false; openSheet = s;
    if (id !== 'aboutPage') $('scrim').hidden = false;
    app.inert = true;
    var target = focusId ? $(focusId) : s;
    setTimeout(function () { if (target) target.focus(); }, 30);
    if (id === 'exploreSheet') { mirrors.resize(); renderRows(); }
    if (id === 'tonightSheet') renderTonightMarks();
    if (id === 'shareSheet') drawShare();
  }
  function closeSheet(silent) {
    if (!openSheet) return;
    openSheet.hidden = true; openSheet = null;
    $('scrim').hidden = true; app.inert = false;
    if (!silent && opener && opener.focus) opener.focus();
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
  $('scrim').addEventListener('click', function () { closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (openSheet) {
      if (e.key === 'Escape') {
        if (e.target === $('searchInput') && $('searchInput').value) { $('searchInput').value = ''; renderRows(); return; }
        e.preventDefault(); closeSheet(); return;
      }
      if (e.key === 'Tab') {
        var f = focusables(openSheet); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (e.target.matches('input')) return;
    if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); toggle(); }
    if (e.key === '/') { e.preventDefault(); showSheet('exploreSheet', 'searchInput'); }
  });

  /* Explore */
  var chipGenre = 'all';
  function buildChips() {
    var chips = $('genreChips');
    [{ id: 'all', name: 'All' }].concat(S.genres).forEach(function (g) {
      var b = el('button', null, g.name); b.type = 'button'; b.dataset.genre = g.id; b.setAttribute('aria-pressed', String(g.id === 'all'));
      b.addEventListener('click', function () { chipGenre = g.id; chips.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); renderRows(); });
      chips.append(b);
    });
  }
  function renderRows() {
    var q = $('searchInput').value.trim().toLowerCase();
    var ul = $('songRows'); ul.textContent = '';
    var songs = S.data.songs.filter(function (s) {
      if (chipGenre !== 'all' && s.genre !== chipGenre) return false;
      if (!q) return true;
      return (s.title + ' ' + s.artist + ' ' + (s.release ? s.release.title : '')).toLowerCase().indexOf(q) !== -1;
    });
    if (!songs.length) {
      var g = genreInfo(chipGenre);
      ul.append(el('li', 'empty', q ? 'No songs match "' + $('searchInput').value.trim() + '".' : 'No ' + (g ? g.name : '') + ' songs in this sample have a verified YouTube route yet.'));
    }
    songs.forEach(function (s) {
      var li = el('li'), b = el('button', 'row'); b.type = 'button'; b.dataset.id = s.id;
      b.append(el('strong', null, s.title), el('span', 'dur', s.durationSeconds ? fmt(s.durationSeconds) : ''));
      var meta = el('span', null, s.artist);
      b.append(meta);
      if (!s.playable) { b.setAttribute('aria-disabled', 'true'); b.append(el('span', 'badge na', 'Not playable yet')); }
      b.addEventListener('click', function () {
        exitSpecial();
        S.genre = s.genre; renderDial();
        S.queue = playableIn(s.genre); S.index = Math.max(0, S.queue.indexOf(s));
        closeSheet(); loadSong(s, s.playable);
        if (!s.playable) toast('This recording is not available yet.');
      });
      li.append(b); ul.append(li);
    });
    var sets = $('setRows'); sets.textContent = '';
    S.data.nonstopSets.forEach(function (set) {
      var li = el('li'), b = el('button', 'row'); b.type = 'button';
      b.append(el('strong', null, set.title), el('span', 'dur', set.durationSeconds ? fmt(set.durationSeconds) : ''), el('span', null, set.artists.join(', ') + ' · ' + set.chapters.length + ' chapters'));
      b.addEventListener('click', function () { exitSpecial(); S.genre = 'nonstop'; renderDial(); closeSheet(); loadSet(set, 0, true); });
      li.append(b); sets.append(li);
    });
    markCurrentRows();
  }
  function markCurrentRows() {
    var id = S.track && S.track.song ? S.track.song.id : null;
    document.querySelectorAll('#songRows .row').forEach(function (r) { r.classList.toggle('is-current', r.dataset.id === id); });
  }
  function buildSteps() {
    var ul = $('stepRows');
    STEPS.forEach(function (st) {
      var li = el('li', 'step');
      li.append(el('strong', null, st.name), el('span', null, st.desc), el('span', null, 'No songs tagged yet'));
      if (st.claps) {
        var c = el('span', 'claps'); c.setAttribute('role', 'img'); c.setAttribute('aria-label', st.claps + ' claps');
        for (var i = 0; i < 4; i++) { var d = el('i'); if (i < st.claps) d.className = 'c'; c.append(d); }
        li.append(c);
      }
      ul.append(li);
    });
  }
  var tabs = ['tabSongs', 'tabNonstop', 'tabSteps'];
  tabs.forEach(function (id, i) {
    $(id).addEventListener('click', function () { selectTab(i); });
    $(id).addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; selectTab(n); $(tabs[n]).focus(); }
    });
  });
  function selectTab(n) {
    tabs.forEach(function (id, i) {
      var on = i === n; $(id).setAttribute('aria-selected', String(on)); $(id).tabIndex = on ? 0 : -1;
      $($(id).getAttribute('aria-controls')).hidden = !on;
    });
  }
  $('searchInput').addEventListener('input', renderRows);

  /* Share */
  function drawShare() {
    var v = trackView();
    window.GarboScene.drawCard($('shareCard'), { eyebrow: v.eyebrow, title: v.title, artist: v.artist });
  }
  $('shareGo').addEventListener('click', function () {
    var canvas = $('shareCard');
    if (!navigator.canShare || !canvas.toBlob) { toast("Sharing isn't available in this browser."); return; }
    canvas.toBlob(function (blob) {
      var file = new File([blob], 'playgarba.png', { type: 'image/png' });
      if (!navigator.canShare({ files: [file] })) { toast("Sharing isn't available in this browser."); return; }
      navigator.share({ files: [file], title: trackView().title }).catch(function () { /* cancelled */ });
    });
  });

  /* ---------- prototype states ---------- */
  function findLong() { var s = S.data.songs.filter(function (x) { return x.playable; }); s.sort(function (a, b) { return b.title.length - a.title.length; }); return s[0]; }
  var STATES = [
    { id: 'ember', name: 'Paused', desc: 'Ember glow, waiting', run: function () { exitSpecial(); setGenre('traditional', false); } },
    { id: 'loading', name: 'Loading', desc: 'Lamp catching', run: function () { exitSpecial(); setGenre('traditional', false); setMode('loading'); } },
    { id: 'playing', name: 'Playing', desc: 'Lit, dancers moving', run: function () { exitSpecial(); setGenre('traditional', false); S.pos = 40; setMode('playing'); } },
    { id: 'nonstop', name: 'Nonstop set', desc: 'Chapters on the circle', run: function () { exitSpecial(); S.genre = 'nonstop'; renderDial(); loadSet(S.data.nonstopSets[1] || S.data.nonstopSets[0], 4, false); setMode('playing'); } },
    { id: 'live', name: '24/7 Live', desc: 'No seeking, always on', run: function () { if (!S.live) toggleLive(); setMode('live'); } },
    { id: 'long', name: 'Long title', desc: 'Two-line limit', run: function () { exitSpecial(); var s = findLong(); S.genre = s.genre; renderDial(); S.queue = playableIn(s.genre); S.index = S.queue.indexOf(s); loadSong(s, false); } },
    { id: 'unavailable', name: 'Not playable yet', desc: 'Gujarati release, no route', run: function () { exitSpecial(); var s = S.data.songs.filter(function (x) { return !x.playable; })[0]; if (s) { S.genre = s.genre; renderDial(); loadSong(s, false); } } },
    { id: 'offline', name: 'Offline', desc: 'Lamp goes dark', run: function () { goOffline(true); } },
    { id: 'empty', name: 'Empty genre', desc: 'Sanedo has no routes', run: function () { exitSpecial(); setGenre('sanedo', false); } },
    { id: 'tonight', name: 'Tonight', desc: 'Night in five parts', run: function () { startTonightPart(1, false); setMode('playing'); } }
  ];
  function buildStates() {
    var grid = $('stateGrid');
    STATES.forEach(function (st) {
      var b = el('button'); b.type = 'button'; b.append(st.name, el('span', null, st.desc));
      b.addEventListener('click', function () { closeSheet(true); if (S.offline && st.id !== 'offline') goOffline(false); st.run(); });
      grid.append(b);
    });
  }
  function goOffline(on) {
    if (on === S.offline) return;
    S.offline = on;
    if (on) { S.resumeMode = isActive() ? 'playing' : S.mode; clearTimeout(S.loadTimer); setMode('offline'); }
    else { if (S.resumeMode === 'playing') play(); else setMode(S.resumeMode === 'offline' ? 'ember' : S.resumeMode); toast("You're back online."); }
  }
  window.addEventListener('offline', function () { goOffline(true); });
  window.addEventListener('online', function () { goOffline(false); });

  /* ---------- wiring ---------- */
  $('playBtn').addEventListener('click', toggle);
  $('lampHit').addEventListener('click', toggle);
  $('prevBtn').addEventListener('click', function () { if (S.pos > 5 && S.track && S.track.kind === 'song') { S.pos = 0; renderTime(); } else step(-1); });
  $('nextBtn').addEventListener('click', function () { step(1); });
  $('shuffleBtn').addEventListener('click', function () { S.shuffle = !S.shuffle; this.setAttribute('aria-pressed', String(S.shuffle)); toast(S.shuffle ? 'Shuffle on' : 'Shuffle off'); });
  $('heartBtn').addEventListener('click', function () {
    if (!S.track || !S.track.song) { toast('Only songs can be saved in this prototype.'); return; }
    var id = S.track.song.id, on = !S.saved.has(id);
    if (on) S.saved.add(id); else S.saved.delete(id);
    try { localStorage.setItem('garbo-proto-saved', JSON.stringify(Array.from(S.saved))); } catch (e) { /* storage unavailable */ }
    this.setAttribute('aria-pressed', String(on));
    toast(on ? 'Saved to My Garba' : 'Removed from My Garba');
  });
  $('ringSeek').addEventListener('input', function () {
    var f = this.value / 1000, t = S.track;
    if (!t || S.live) return;
    if (t.kind === 'chapter') {
      var set = t.set, n = set.chapters.length;
      var c = set.durationSeconds ? set.chapters.reduce(function (acc, ch, i) { return ch.startSeconds <= f * set.durationSeconds ? i : acc; }, 0) : Math.min(n - 1, Math.floor(f * n));
      if (c !== t.chapterIndex) { t.chapterIndex = c; t.title = set.chapters[c].title; scene.set({ chapterIndex: c }); renderNP(false); }
      S.pos = set.durationSeconds ? f * set.durationSeconds : set.chapters[c].startSeconds;
    } else {
      var d = duration(); if (!d) return; S.pos = f * d;
    }
    renderTime();
  });
  $('liveBtn').addEventListener('click', toggleLive);
  $('searchBtn').addEventListener('click', function () { showSheet('exploreSheet', 'searchInput'); });
  $('exploreBtn').addEventListener('click', function () { showSheet('exploreSheet'); });
  $('tonightBtn').addEventListener('click', function () { showSheet('tonightSheet'); });
  $('moreBtn').addEventListener('click', function () { showSheet('moreSheet'); });
  $('videoBtn').addEventListener('click', function () { showSheet('videoSheet'); });
  $('shareOpen').addEventListener('click', function () { showSheet('shareSheet'); });
  $('aboutOpen').addEventListener('click', function () { showSheet('aboutPage'); });
  $('installBtn').addEventListener('click', function () { toast('Your browser shows its install prompt here.'); });
  $('atmoBtn').addEventListener('click', function () { toast('The existing Atmosphere controls move here from the top bar.'); });

  /* ---------- layout + loop ---------- */
  function relayout() {
    scene.resize();
    scene.layout($('lampSlot').getBoundingClientRect(), $('np').getBoundingClientRect());
    renderDial();
  }
  window.addEventListener('resize', relayout);
  if (window.ResizeObserver) new ResizeObserver(relayout).observe($('lampSlot'));

  var last = performance.now(), t0 = last, clockAcc = 0, stillT = 1.3;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    clockAcc += dt;
    if (clockAcc >= 0.25) { tick(clockAcc); clockAcc = 0; renderTime(); scene.set({ progress: progress() }); }
    if (!document.hidden) {
      var still = reducedQuery.matches;
      scene.set({ still: still });
      scene.frame(still ? stillT : (now - t0) / 1000, still ? 1 : dt);
      if (openSheet && openSheet.id === 'exploreSheet' && !still) mirrors.frame((now - t0) / 1000);
      if (openSheet && openSheet.id === 'exploreSheet' && still) mirrors.frame(stillT);
    }
    animateClaps(now);
    requestAnimationFrame(loop);
  }
  var clapBeat = -1;
  function animateClaps(now) {
    if (!openSheet || openSheet.id !== 'exploreSheet' || $('panelSteps').hidden || reducedQuery.matches) return;
    var beat = Math.floor(now / 520) % 4;
    if (beat === clapBeat) return; clapBeat = beat;
    document.querySelectorAll('.claps').forEach(function (c) { c.querySelectorAll('i').forEach(function (d, i) { d.classList.toggle('hit', i === beat && d.classList.contains('c')); }); });
  }

  function applyHash() {
    var h = location.hash.replace('#', '');
    if (!h) return;
    var st = STATES.filter(function (x) { return x.id === h; })[0];
    if (st) { st.run(); return; }
    if (h === 'explore') showSheet('exploreSheet');
    if (h === 'steps') { showSheet('exploreSheet'); selectTab(2); }
    if (h === 'nonstop-list') { showSheet('exploreSheet'); selectTab(1); }
    if (h === 'tonight-sheet') showSheet('tonightSheet');
    if (h === 'more') showSheet('moreSheet');
    if (h === 'about') showSheet('aboutPage');
    if (h === 'share') showSheet('shareSheet');
  }

  fetch('sample.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
    S.data = data; S.genres = data.genres;
    buildDial(); buildChips(); buildSteps(); buildTonight(); buildStates();
    setGenre('traditional', false);
    relayout();
    applyHash();
    window.addEventListener('hashchange', applyHash);
    requestAnimationFrame(loop);
  }).catch(function () {
    $('title').textContent = "Couldn't load the sample catalogue";
    $('artist').textContent = 'Serve this folder over http so sample.json can load.';
    $('eyebrow').textContent = ''; $('from').textContent = '';
    setMode('empty');
    relayout(); requestAnimationFrame(loop);
  });
})();
