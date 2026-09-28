/* Ask PlayGarba: help inside the player. It answers from what PlayGarba actually has: the song that's playing, a
   short list of curated answers about features, the live catalogue, and our own help and culture pages. There is no
   model and no server, so it cannot invent a song, a feature or a fact; when it doesn't know, it says so and offers
   the request form with the question filled in.

   Decision order for every question:
     1. normalise (typos, Romanised Gujarati, "3 taali" and friends);
     2. "what's playing" → the player's current song;
     3. a curated feature answer, with the control to press and the page it comes from;
     4. an artist or a song in the catalogue, with play buttons;
     5. the closest section of our own pages, quoted with a link;
     6. otherwise an honest "not in PlayGarba yet" and the request form.

   The engine is pure (GARBA_ASK_ENGINE.route) so it is tested outside the browser; the panel is built only when
   someone opens it. Questions stay in this tab for an hour (sessionStorage) and are never sent anywhere. */
(function (root) {
  'use strict';

  var STOP = ('a an the is are am was were be been i me my we our you your it its this that these those to of in on at for ' +
    'with and or but how what where when why which who can could do does did will would should please pls plz there here ' +
    'add feature option want need like get have has any some more also just give make let us so if not no yes ok hi hello ' +
    'playgarba garba website site app page player song songs music thank thanks kem che chhe su shu kevi rite mate ne ma ' +
    'from they their them all other same able way ways into about only very much many then than own also both each').split(' ');
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  // Words too general to decide an answer on their own
  var WEAK = { name: 1, off: 1, view: 1, step: 1, steps: 1, app: 1, tab: 1, face: 1, light: 1, order: 1, stick: 1, heart: 1, error: 1, stops: 1, pass: 1, pay: 1, free: 1, event: 1, events: 1, download: 1, random: 1, man: 1, woman: 1, boy: 1, girl: 1 };

  function fold(s) {
    return String(s || '').normalize('NFC').toLowerCase()
      .replace(/[’'`]/g, "'").replace(/'s\b/g, '').replace(/[^\p{L}\p{N}'/ ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hasPhrase(q, phrase) {
    if (!phrase) return false;
    // Whole words for Latin text; Gujarati script has no word boundaries in \b, so a plain contains is used there
    if (/[^\x00-\x7f]/.test(phrase)) return q.indexOf(phrase) >= 0;
    // A plural still counts: "characters", "names", "steps"
    return new RegExp('(?:^|\\s)' + escapeRe(phrase) + '(?:s|es)?(?=\\s|$)').test(q);
  }
  function normalise(question, synonyms) {
    var q = ' ' + fold(question) + ' ';
    var keys = Object.keys(synonyms || {}).sort(function (a, b) { return b.length - a.length; });
    keys.forEach(function (k) {
      var from = fold(k);
      if (!from) return;
      var re = /[^\x00-\x7f]/.test(from) ? new RegExp(escapeRe(from), 'g') : new RegExp('(^|\\s)' + escapeRe(from) + '(?=\\s|$)', 'g');
      q = q.replace(re, function (m, pre) { return (pre || ' ') + synonyms[k]; });
    });
    return q.replace(/\s+/g, ' ').trim();
  }
  function words(q) { return q.split(' ').filter(function (w) { return w && !STOPSET[w] && w.length > 1; }); }

  var NOW_RE = /\b(what|which|whats|what's|kayu|kyu|konsu|kaunsa|name of)\b.*\b(song|playing|this|track|gaanu|gaano|garbo)\b|\bnow playing\b|\bcurrent song\b|\bsong name\b|\bthis song\b|\bwho (is )?sing/;

  function scoreIntents(q, intents) {
    var best = null;
    intents.forEach(function (it) {
      var s = 0, n0 = 0;
      it.phrases.forEach(function (p) {
        var ph = fold(p);
        if (!hasPhrase(q, ph)) return;
        var n = ph.split(' ').length, v = n === 1 && WEAK[ph] ? 1.5 : 2 + n * 1.5;
        if (v > s) { s = v; n0 = n; }
      });
      // A step or style named on its own ("dodhiyu") is a strong signal even as one word
      if (s && it.topic === 'steps' && it.status === 'live' && it.phrases.some(function (p) { return hasPhrase(q, fold(p)); })) s += 1;
      if (s && (!best || s > best.score)) best = { intent: it, score: s, words: n0 };
    });
    return best;
  }

  // Two spellings of one name, a letter or two apart ("ghadvi" for "gadhvi"): optimal string alignment distance
  function near(a, b) {
    if (a === b) return true;
    var max = Math.min(a.length, b.length) >= 6 ? 2 : Math.min(a.length, b.length) >= 5 ? 1 : 0;
    if (!max || Math.abs(a.length - b.length) > max) return false;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length] <= max;
  }
  // Credits that aren't a person to look up
  var NOT_ARTIST = { traditional: 1, various: 1, 'various artists': 1, unknown: 1 };
  function catalogueHits(q, snap) {
    if (!snap || !Array.isArray(snap.songs)) return null;
    var qw = words(q).filter(function (w) { return w.length > 2; });
    if (!qw.length) return null;
    var artists = [], songs = [];
    (snap.collections || []).forEach(function (c) {
      if (c.kind !== 'artist') return;
      var name = fold(c.title), nw = name.split(' ');
      if (NOT_ARTIST[name]) return;
      // Every word of the artist's name is in the question (Aditya Gadhvi), allowing a slip of spelling, or a single
      // distinctive surname is
      var all = nw.every(function (w) { return qw.some(function (x) { return x === w || (w.length > 4 && near(x, w)); }); });
      var part = nw.length > 1 && nw.some(function (w) { return w.length > 4 && qw.indexOf(w) >= 0; });
      if (all) artists.push({ c: c, s: 3 + nw.length }); else if (part) artists.push({ c: c, s: 1 });
    });
    snap.songs.forEach(function (s) {
      var t = fold(s.title);
      if (!t || t.length < 3) return;
      var tw = words(t);
      if (!tw.length) return;
      var hit = tw.filter(function (w) { return qw.indexOf(w) >= 0; }).length;
      // The whole title is in the question, or most of its words are
      if (hasPhrase(q, t)) songs.push({ s: s, score: 10 + tw.length });
      else if (tw.length > 1 && hit >= Math.max(2, Math.ceil(tw.length * 0.66))) songs.push({ s: s, score: hit * 2 });
      else if (tw.length === 1 && tw[0].length > 4 && qw.length <= 3 && qw.indexOf(tw[0]) >= 0) songs.push({ s: s, score: 3 });
    });
    artists.sort(function (a, b) { return b.s - a.s; });
    songs.sort(function (a, b) { return b.score - a.score || (b.s.playable ? 1 : 0) - (a.s.playable ? 1 : 0); });
    // Keep one entry per title (chapters and re-releases repeat), playable first
    var seen = {}, top = [];
    songs.forEach(function (x) { var k = fold(x.s.title) + '|' + fold(x.s.artist); if (seen[k] || top.length >= 5) return; seen[k] = 1; top.push(x); });
    var strongArtists = artists.filter(function (a) { return a.s > 1; });
    if (!strongArtists.length && !top.length) return null;
    return {
      artists: strongArtists.slice(0, 2).map(function (a) { return a.c; }), songs: top.map(function (x) { return x.s; }),
      score: (strongArtists.length ? strongArtists[0].s : 0) + (top.length ? top[0].score : 0),
      // An artist, or a title of more than one word: specific enough to beat a feature word
      multi: strongArtists.length > 0 || (top.length > 0 && words(fold(top[0].s.title)).length > 1)
    };
  }

  function pageHit(q, pages) {
    if (!pages || !pages.sections) return null;
    var qw = words(q);
    if (!qw.length) return null;
    var df = {}, N = pages.sections.length;
    pages.sections.forEach(function (sec) {
      var seen = {};
      (fold(sec.heading) + ' ' + fold(sec.text)).split(' ').forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } });
    });
    var best = null;
    pages.sections.forEach(function (sec) {
      var h = ' ' + fold(sec.heading) + ' ', t = ' ' + fold(sec.text) + ' ', s = 0, matched = 0;
      qw.forEach(function (w) {
        // "danced" finds "dance", "navratri's" finds "navratri": a word's stem is enough, at the start of a word
        var st = w.length > 5 ? w.slice(0, w.length - 2) : w;
        var idf = Math.log(1 + N / (1 + (df[w] || df[st] || 0))), inH = h.indexOf(' ' + st) >= 0, inT = t.indexOf(' ' + st) >= 0;
        if (inH || inT) matched++;
        s += (inH ? 2.2 : 0) * idf + (inT ? 1 : 0) * idf;
      });
      if (matched && (!best || s > best.score)) best = { sec: sec, score: s, matched: matched };
    });
    // One ordinary word shared with a page isn't an answer
    if (!best || best.score < 3.2 || (best.matched < 2 && qw.length > 1)) return null;
    return best;
  }

  var KNOW_RE = /\b(why|history|difference|differ|meaning|origin|what is|what are|who (?:was|were|are|is)|tell me about)\b/;
  function pageAnswer(page) { return { kind: 'page', text: firstSentences(page.sec.text, 3), heading: page.sec.heading, source: { label: page.sec.page, href: page.sec.href } }; }
  function firstSentences(text, n) {
    var parts = String(text).match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    return parts.slice(0, n).join('').trim();
  }

  // Asking for a song or a singer, rather than a feature
  var SONGISH = /\b(song|album|artist|singer|playlist|track|garba by|by [a-z]+ [a-z]+)\b/;

  // The one entry point: a question in, a structured answer out
  function route(question, ctx) {
    ctx = ctx || {};
    var kb = ctx.intents || { intents: [], synonyms: {} };
    var raw = String(question || '').trim();
    if (!raw) return { kind: 'empty' };
    var q = normalise(raw, kb.synonyms);
    if (ctx.topic === 'now' || NOW_RE.test(q)) return nowPlaying(ctx.snapshot);

    var hit = scoreIntents(q, kb.intents || []);
    var cat = catalogueHits(q, ctx.snapshot);
    var page = pageHit(q, ctx.pages);

    // A named artist or song outranks a single general word ("add Aditya Gadhvi songs" is about the artist), but a
    // style named on its own ("add Dakla") is about the style, not a one-word song that shares its name
    if (cat && (!hit || hit.score < 4 || (cat.score >= 10 && cat.multi))) return catalogueAnswer(cat, hit);
    // A question about the tradition ("what's the difference between Garba and Dandiya") is for our pages when they
    // cover more of it than the feature answer does
    if (page && KNOW_RE.test(q) && (!hit || (hit.words < page.matched && page.score >= 6))) return pageAnswer(page);
    if (hit && hit.score >= 2) {
      var it = hit.intent;
      return { kind: 'intent', id: it.id, status: it.status, text: it.answer, actions: (it.actions || []).slice(), source: it.source || null, also: cat || null };
    }
    // Asked for a song or a singer by name that isn't here: say so, never quote a page instead
    if (SONGISH.test(q) && !KNOW_RE.test(q)) {
      return { kind: 'missing', text: "That isn't in PlayGarba yet. Tell us the song and the singer, and we'll look for the exact recording.", actions: [{ label: 'Request it', do: 'ask' }] };
    }
    if (page) return pageAnswer(page);
    return { kind: 'fallback', text: "I couldn't find that in PlayGarba. If it's a song, tell us the title and the singer. If it's an idea, tell us what you'd like.", actions: [{ label: 'Tell us', do: 'ask' }] };
  }

  function nowPlaying(snap) {
    var song = snap && snap.song;
    if (!song) return { kind: 'now', text: 'Nothing is playing right now. Pick a style under the player, or ask me for a song or an artist.' };
    var genre = (snap.genres || []).filter(function (g) { return g.id === (song.genre || snap.genreId); })[0];
    var line = song.title + (song.artist ? ' by ' + song.artist : '') + '.' + (genre ? ' Style: ' + (genre.label || genre.name) + '.' : '');
    var acts = [];
    var artist = (snap.collections || []).filter(function (c) { return c.kind === 'artist' && song.artist && fold(song.artist).indexOf(fold(c.title)) >= 0 && c.playable; })[0];
    if (artist) acts.push({ label: 'Play more by ' + artist.title, do: 'list', id: artist.id });
    if (!snap.favourite) acts.push({ label: 'Save to My Garba', do: 'player', name: 'favourite' });
    return { kind: 'now', paused: !snap.playing, text: line, actions: acts };
  }

  function catalogueAnswer(cat, hit) {
    var items = [], text;
    cat.artists.forEach(function (c) {
      items.push({ title: c.title, sub: c.playable + (c.playable === 1 ? ' song can play' : ' songs can play'), action: c.playable ? { label: 'Play', do: 'list', id: c.id } : null });
    });
    cat.songs.forEach(function (s) {
      items.push({ title: s.title, sub: s.artist || '', action: s.playable ? { label: 'Play', do: 'song', id: s.id } : null, na: !s.playable });
    });
    if (cat.artists.length && cat.songs.length) text = "Here's what PlayGarba has.";
    else if (cat.artists.length) text = cat.artists.length > 1 ? 'These artists are in PlayGarba. Playing one keeps the music on their songs.' : cat.artists[0].title + ' is in PlayGarba. Playing the list keeps the music on their songs.';
    else text = cat.songs.length > 1 ? 'These are in PlayGarba.' : 'This is in PlayGarba.';
    if (cat.songs.some(function (s) { return !s.playable; })) text += " Songs marked Not available can't play right now.";
    return { kind: 'catalogue', text: text, items: items, actions: [{ label: 'Not the one? Request it', do: 'ask' }], alsoIntent: hit && hit.intent ? hit.intent.id : null };
  }

  root.GARBA_ASK_ENGINE = { route: route, normalise: normalise, fold: fold };
  if (typeof document === 'undefined') return;

  /* ---------------- the panel ---------------- */
  var KEY = 'playgarba:ask:v1', HOUR = 3600e3;
  var kb = null, pages = null, loading = null, panel = null, opener = null, thread = null, home = null, input = null, newBtn = null;

  function load() {
    if (loading) return loading;
    var base = document.baseURI;
    function get(p) { return fetch(new URL(p, base).href, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); }); }
    loading = Promise.all([get('assets/runtime/ask-intents.json'), get('assets/runtime/ask-pages.json').catch(function () { return { sections: [] }; })])
      .then(function (r) { kb = r[0]; pages = r[1]; })
      .catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function player() { return root.GARBA_IMMERSIVE_PLAYER || null; }
  function snapshot() { try { var p = player(); return p && p.snapshot ? p.snapshot({ includeCatalogue: true }) : null; } catch (e) { return null; } }

  var CSS = [
    '.ask-scrim{position:fixed;inset:0;z-index:1190;background:rgba(3,4,10,.46);animation:ask-fade .2s ease}',
    '.ask-panel{position:fixed;z-index:1200;display:flex;flex-direction:column;color:var(--ivory,#f6ecd7);background:var(--panel-solid,#111624);border:1px solid rgba(214,176,111,.22);box-shadow:var(--shadow,0 28px 90px rgba(0,0,0,.42));font:15px/1.45 var(--sans,system-ui,sans-serif)}',
    '.ask-panel[hidden],.ask-scrim[hidden]{display:none}',
    '@media (min-width:720px){.ask-panel{top:calc(var(--safe-top,20px) + 50px);right:var(--safe-right,20px);width:min(400px,calc(100vw - 32px));height:min(640px,calc(100dvh - var(--safe-top,20px) - 70px));border-radius:20px;animation:ask-in .22s var(--ease,ease)}.ask-grab{display:none}}',
    '@media (max-width:719.98px){.ask-panel{left:0;right:0;bottom:0;height:min(88dvh,720px);border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom);animation:ask-up .26s var(--ease,ease)}}',
    '@keyframes ask-in{from{opacity:0;transform:translateY(-6px) scale(.98)}}@keyframes ask-up{from{transform:translateY(40px);opacity:.4}}@keyframes ask-fade{from{opacity:0}}',
    '.ask-grab{align-self:center;width:40px;height:5px;margin:8px 0 2px;border-radius:3px;background:rgba(246,236,215,.24);touch-action:none}',
    '.ask-head{display:flex;align-items:center;gap:10px;padding:12px 12px 10px 16px;border-bottom:1px solid rgba(246,236,215,.08);touch-action:none}',
    '.ask-mark{width:30px;height:30px;flex:0 0 30px;color:var(--accent,#d6b06f)}',
    '.ask-head h2{flex:1;margin:0;font:400 20px/1.2 var(--serif,Georgia,serif);letter-spacing:.01em}',
    '.ask-ib{min-width:38px;min-height:38px;display:grid;place-items:center;border:0;border-radius:50%;background:none;color:var(--ivory,#f6ecd7);cursor:pointer}',
    '.ask-ib:hover{background:rgba(246,236,215,.08)}.ask-ib svg{width:20px;height:20px}',
    '.ask-new{border:1px solid var(--faint,rgba(246,236,215,.22));border-radius:16px;background:none;color:var(--ivory,#f6ecd7);padding:6px 12px;font:600 12.5px/1 var(--sans,system-ui);cursor:pointer}',
    '.ask-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px}',
    '.ask-hello{margin:4px 0 2px;font:400 24px/1.25 var(--serif,Georgia,serif)}.ask-sub{margin:0 0 16px;color:var(--muted,rgba(246,236,215,.68));font-size:14px}',
    '.ask-primary{display:flex;align-items:center;gap:10px;width:100%;padding:14px 16px;margin-bottom:14px;border:0;border-radius:14px;background:var(--accent,#d6b06f);color:#16110a;font:600 15px/1.2 var(--sans,system-ui);text-align:left;cursor:pointer}',
    '.ask-primary svg{width:18px;height:18px}',
    '.ask-chips{display:flex;flex-wrap:wrap;gap:8px}',
    '.ask-chip{border:1px solid var(--faint,rgba(246,236,215,.22));border-radius:18px;background:none;color:var(--ivory,#f6ecd7);padding:9px 13px;font:500 13.5px/1.2 var(--sans,system-ui);cursor:pointer}',
    '.ask-chip:hover{border-color:rgba(214,176,111,.6)}',
    '.ask-thread{list-style:none;margin:0;padding:0;display:grid;gap:14px}',
    '.ask-q{justify-self:end;max-width:85%;padding:9px 13px;border-radius:16px 16px 4px 16px;background:rgba(246,236,215,.1);font-size:14.5px;overflow-wrap:anywhere}',
    '.ask-a{max-width:94%;padding:12px 14px;border-radius:4px 16px 16px 16px;background:rgba(246,236,215,.04);border:1px solid rgba(246,236,215,.08)}',
    '.ask-a p{margin:0}.ask-a .ask-tag{display:inline-block;margin-bottom:6px;font:700 10.5px/1 var(--sans,system-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--accent,#d6b06f)}',
    '.ask-a .ask-tag.not-yet{color:#d79b86}',
    '.ask-a h3{margin:0 0 4px;font:600 14px/1.3 var(--sans,system-ui);color:var(--muted,rgba(246,236,215,.68))}',
    '.ask-items{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:2px}',
    '.ask-items li{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid rgba(246,236,215,.07)}',
    '.ask-items .t{flex:1;min-width:0}.ask-items strong{display:block;font:600 14.5px/1.3 var(--serif,Georgia,serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ask-items span{display:block;font-size:12.5px;color:var(--muted,rgba(246,236,215,.68));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ask-items .na{font-size:11px;font-weight:600;color:#d79b86}',
    '.ask-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
    '.ask-act{border:1px solid rgba(214,176,111,.55);border-radius:16px;background:none;color:var(--accent,#d6b06f);padding:7px 12px;font:600 13px/1.2 var(--sans,system-ui);cursor:pointer;text-decoration:none}',
    '.ask-act.small{padding:5px 11px;font-size:12.5px}.ask-act:hover{background:rgba(214,176,111,.12)}',
    '.ask-src{display:inline-block;margin-top:9px;font-size:12.5px;color:var(--muted,rgba(246,236,215,.68));text-decoration:underline;text-underline-offset:3px}',
    '.ask-compose{display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid rgba(246,236,215,.08)}',
    '.ask-compose input{flex:1;min-width:0;height:44px;padding:0 14px;border-radius:22px;border:1px solid var(--faint,rgba(246,236,215,.22));background:rgba(246,236,215,.05);color:var(--ivory,#f6ecd7);font:15px/1.3 var(--sans,system-ui)}',
    '.ask-compose button{width:44px;height:44px;flex:0 0 44px;border:0;border-radius:50%;background:var(--accent,#d6b06f);color:#16110a;display:grid;place-items:center;cursor:pointer}',
    '.ask-compose button svg{width:20px;height:20px}',
    '.ask-foot{margin:0;padding:0 16px 10px;font-size:11.5px;color:var(--muted,rgba(246,236,215,.68))}',
    '.ask-panel :focus-visible{outline:2px solid var(--accent,#d6b06f);outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){.ask-panel,.ask-scrim{animation:none}}'
  ].join('');

  var SVG_MARK = '<svg class="ask-mark" viewBox="0 0 32 32" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M8 13c0-4.4 3.6-8 8-8s8 3.6 8 8c0 5.8-3.6 11-8 11s-8-5.2-8-11Z"/><path fill="currentColor" d="M16 9.2c1.4 1.6 2 3 2 4.2a2 2 0 0 1-4 0c0-1.2.6-2.6 2-4.2Z"/><path stroke="currentColor" stroke-width="1.4" stroke-linecap="round" d="M11 27h10M13 24.5 12 27M19 24.5l1 2.5"/></svg>';
  var SVG_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var SVG_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var coarse = root.matchMedia ? root.matchMedia('(pointer: coarse)') : { matches: false };

  function build() {
    var st = el('style'); st.id = 'askPlayGarbaStyle'; st.textContent = CSS; document.head.appendChild(st);
    var scrim = el('div', 'ask-scrim'); scrim.hidden = true;
    panel = el('section', 'ask-panel'); panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'askTitle');
    panel.innerHTML = '<div class="ask-grab" aria-hidden="true"></div>' +
      '<header class="ask-head">' + SVG_MARK + '<h2 id="askTitle">Ask PlayGarba</h2><button class="ask-new" type="button" hidden>New question</button><button class="ask-ib ask-close" type="button" aria-label="Close">' + SVG_CLOSE + '</button></header>' +
      '<div class="ask-body"><div class="ask-home"><p class="ask-hello">What are you looking for?</p><p class="ask-sub">Pick a topic or ask below.</p>' +
      '<button class="ask-primary" type="button">' + SVG_SEARCH + '<span>Find a song or artist</span></button><div class="ask-chips" role="group" aria-label="Topics"></div></div>' +
      '<ol class="ask-thread" aria-live="polite"></ol></div>' +
      '<form class="ask-compose" autocomplete="off"><input type="text" enterkeyhint="send" maxlength="200" placeholder="Ask about a song or a feature" aria-label="Ask PlayGarba"><button type="submit" aria-label="Ask">' + SVG_SEND + '</button></form>' +
      '<p class="ask-foot">Answers come from PlayGarba itself. Your questions stay on this device.</p>';
    document.body.append(scrim, panel);
    thread = panel.querySelector('.ask-thread'); home = panel.querySelector('.ask-home'); input = panel.querySelector('input'); newBtn = panel.querySelector('.ask-new');
    panel.querySelector('.ask-close').addEventListener('click', close);
    scrim.addEventListener('click', close);
    newBtn.addEventListener('click', function () { thread.textContent = ''; home.hidden = false; newBtn.hidden = true; save([]); if (!coarse.matches) input.focus(); });
    panel.querySelector('.ask-primary').addEventListener('click', function () { input.placeholder = 'Type a song or an artist'; input.focus(); });
    panel.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ''; ask(v); });
    // Escape closes it wherever focus is, even after a topic chip it pressed has stepped aside
    // (in the capture phase, so the player's own shortcuts don't swallow it first)
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel && !panel.hidden) { e.preventDefault(); e.stopPropagation(); close(); } }, true);
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(panel.querySelectorAll('button:not([hidden]),a[href],input')).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    dragToClose(panel.querySelector('.ask-grab'), panel.querySelector('.ask-head'));
    panel._scrim = scrim;
  }

  // On a phone the sheet follows a drag down from its handle or header, and closes past a short distance
  function dragToClose() {
    var y0 = null, dy = 0, id = null;
    [].slice.call(arguments).forEach(function (h) {
      h.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' || e.target.closest('button')) return;
        y0 = e.clientY; dy = 0; id = e.pointerId; try { h.setPointerCapture(id); } catch (err) { /* capture unavailable */ }
      });
      h.addEventListener('pointermove', function (e) { if (e.pointerId !== id || y0 == null) return; dy = Math.max(0, e.clientY - y0); panel.style.transform = 'translateY(' + dy + 'px)'; });
      function end(e) { if (e.pointerId !== id) return; y0 = null; id = null; panel.style.transform = ''; if (dy > 90) close(); }
      h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    });
  }

  function chips() {
    var box = panel.querySelector('.ask-chips'); box.textContent = '';
    (kb.topics || []).forEach(function (t) {
      var b = el('button', 'ask-chip', t.label); b.type = 'button';
      b.addEventListener('click', function () {
        ask(t.label, t.id === 'now' ? 'now' : null, t.ask);
        // The chips step aside for the answer; keep focus inside the panel
        (coarse.matches ? newBtn : input).focus({ preventScroll: true });
      });
      box.appendChild(b);
    });
  }

  function formUrl(q) {
    var u = new URL((kb && kb.form) || 'https://tally.so/r/0QXgY9');
    if (q) u.searchParams.set('question', q.slice(0, 200));
    return u.href;
  }

  function doAction(a, q) {
    var p = player();
    if (a.do === 'ask') { root.open(formUrl(q), '_blank', 'noopener'); return; }
    if (a.do === 'link') return;
    close(true);
    if (a.do === 'list' && p) p.action('play-list', { id: a.id });
    else if (a.do === 'song' && p) { p.action('song', a.id); setTimeout(function () { var s = p.snapshot(); if (s && !s.playing) p.action('play'); }, 60); }
    else if (a.do === 'genre' && p) p.action('genre', a.id);
    else if (a.do === 'player' && p) p.action(a.name, a.value);
    else if (a.do === 'immersive') { var sw = document.querySelector('[data-view-switch]'); if (sw && sw.getAttribute('aria-checked') !== 'true') sw.click(); }
    else if (a.do === 'open') { var t = document.querySelector(a.target); if (t) t.click(); }
  }

  function actionNode(a, q, small) {
    if (a.do === 'link' || a.do === 'ask') {
      var l = el('a', 'ask-act' + (small ? ' small' : ''), a.label);
      l.href = a.do === 'ask' ? formUrl(q) : a.href; l.target = '_blank'; l.rel = 'noopener';
      return l;
    }
    var b = el('button', 'ask-act' + (small ? ' small' : ''), a.label); b.type = 'button';
    b.addEventListener('click', function () { doAction(a, q); });
    return b;
  }

  function render(q, ans) {
    var li = el('li', 'ask-a');
    if (ans.status === 'not-yet') li.appendChild(el('span', 'ask-tag not-yet', 'Not yet'));
    else if (ans.kind === 'missing') li.appendChild(el('span', 'ask-tag not-yet', 'Not in PlayGarba yet'));
    else if (ans.kind === 'now' && /^Nothing/.test(ans.text) === false) li.appendChild(el('span', 'ask-tag', ans.paused ? 'Paused' : 'Now playing'));
    if (ans.heading) li.appendChild(el('h3', null, ans.heading));
    li.appendChild(el('p', null, ans.text));
    if (ans.items && ans.items.length) {
      var ul = el('ul', 'ask-items');
      ans.items.forEach(function (it) {
        var r = el('li'), t = el('div', 't');
        t.append(el('strong', null, it.title), el('span', null, it.sub));
        r.appendChild(t);
        if (it.action) r.appendChild(actionNode(it.action, q, true)); else r.appendChild(el('span', 'na', 'Not available'));
        ul.appendChild(r);
      });
      li.appendChild(ul);
    }
    if (ans.actions && ans.actions.length) {
      var acts = el('div', 'ask-acts');
      ans.actions.forEach(function (a) { acts.appendChild(actionNode(a, q)); });
      li.appendChild(acts);
    }
    if (ans.source && ans.source.href) {
      var s = el('a', 'ask-src', 'From ' + ans.source.label); s.href = ans.source.href; s.target = '_blank'; s.rel = 'noopener';
      li.appendChild(s);
    }
    return li;
  }

  function ask(q, topic, as) {
    home.hidden = true; newBtn.hidden = false;
    thread.appendChild(el('li', 'ask-q', q));
    var ans;
    try { ans = route(as || q, { intents: kb, pages: pages, snapshot: snapshot(), topic: topic }); }
    catch (e) { ans = { kind: 'fallback', text: "Something went wrong looking that up. Try asking another way.", actions: [] }; }
    var node = render(q, ans);
    thread.appendChild(node);
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    var turns = load_(); turns.push({ q: q, topic: topic || null, as: as || null }); save(turns.slice(-20));
  }

  function load_() { try { var d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return d && Date.now() - d.at < HOUR ? d.turns || [] : []; } catch (e) { return []; } }
  function save(turns) { try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), turns: turns })); } catch (e) { /* storage unavailable */ } }

  function open() {
    opener = document.activeElement;
    if (!panel) build();
    panel.hidden = false; panel._scrim.hidden = false;
    return load().then(function () {
      if (!panel.querySelector('.ask-chip')) {
        chips();
        // Restore this tab's questions from the last hour; the answers are worked out again from what's here now
        var turns = load_();
        if (turns.length) { save([]); turns.forEach(function (t) { ask(t.q, t.topic, t.as); }); }
      }
      if (!coarse.matches) input.focus(); else panel.querySelector('.ask-close').focus();
    }, function () {
      thread.appendChild(render('', { kind: 'fallback', text: "Ask PlayGarba couldn't load. Check your connection and try again.", actions: [] }));
    });
  }
  function close(keepFocus) {
    if (!panel || panel.hidden) return;
    panel.hidden = true; panel._scrim.hidden = true; panel.style.transform = '';
    if (keepFocus !== true && opener && opener.focus && document.contains(opener)) opener.focus();
  }

  root.GARBA_ASK = { open: open, close: close };

  // The player's More row opens it (and closes More first); Immersive can ask for it from its own frame
  function wire() {
    var b = document.getElementById('askButton');
    if (b) b.addEventListener('click', function () {
      var more = document.getElementById('moreCard');
      if (more && !more.hidden) { var mc = document.querySelector('[data-more-close]'); if (mc) mc.click(); }
      open();
    });
  }
  root.addEventListener('message', function (e) {
    if (e.origin !== root.location.origin || !e.data || e.data.type !== 'playgarba:ask') return;
    open();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})(typeof window !== 'undefined' ? window : globalThis);
