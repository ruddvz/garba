/* Garba venue scene: several circles dancing around their garbos in a drawn venue, with clap waves that
   leave the dancers and reach the listener on the beat they hear. Pure canvas drawing on a ground plane seen
   through a level camera; the page owns the audio and feeds this renderer its clock and beat. */
(function () {
  'use strict';

  var TAU = Math.PI * 2, NEAR = 0.6;
  var SYNODIC = 29.530588853, NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

  // The moon's age in days since new moon (today's when no age is given), how much of it is lit, and its name.
  function moonInfo(age) {
    if (age == null) age = (((Date.now() - NEW_MOON) / 864e5) % SYNODIC + SYNODIC) % SYNODIC;
    var k = (1 - Math.cos(age / SYNODIC * TAU)) / 2, waxing = age < SYNODIC / 2;
    var name = age < 1 || age > SYNODIC - 1 ? 'new moon' : k > 0.97 ? 'full moon' : Math.abs(k - 0.5) < 0.06 ? (waxing ? 'first quarter' : 'last quarter') : k < 0.5 ? (waxing ? 'waxing crescent' : 'waning crescent') : (waxing ? 'waxing gibbous' : 'waning gibbous');
    return { age: age, lit: k, name: name, waxing: waxing };
  }
  var SKIRTS = ['#c0392b', '#d6246e', '#e8a33d', '#2f8f5b', '#3b4cc0', '#8e44ad', '#e67e22', '#16a085', '#b83227'];
  var TOPS = ['#f0c24b', '#2f8f5b', '#c2185b', '#3b4cc0', '#e67e22', '#8e44ad'];
  var BULBS = ['#ffd58a', '#ffb070', '#ffe9b8', '#9fe7b8', '#ff8fb3', '#8fc7ff'];
  // Each kind of Garba night is lit differently: bulbs, stage washes, the stage screen and how fast the lights move.
  var THEMES = {
    traditional: { bulbs: ['#ffd58a', '#ffb070', '#ffe9b8', '#ff9f5a'], flags: ['#f08a24', '#c2185b', '#ffc861', '#2f8f5b', '#b8312b'], beams: ['255,214,150', '255,170,90', '255,236,200', '255,190,120'], hues: [28, 42, 16], sat: 75, speed: 0.3, glowTint: '255,190,110' },
    dandiya: { bulbs: ['#ffd58a', '#ff6fa3', '#7fe0a0', '#8fc7ff', '#ffb070', '#c38fff'], flags: ['#f08a24', '#2f8f5b', '#c2185b', '#ffc861', '#3b4cc0'], beams: ['255,120,190', '120,220,255', '255,200,90', '190,140,255'], hues: [320, 190, 45, 270], sat: 82, speed: 0.75, glowTint: '255,170,200' },
    devotional: { bulbs: ['#ffe9b8', '#ffd58a', '#fff4dc'], flags: ['#f08a24', '#ffc861', '#b8312b', '#f3e6d0'], beams: ['255,236,200', '255,214,150'], hues: [34, 22], sat: 60, speed: 0.12, glowTint: '255,210,150', diyas: true },
    folk: { bulbs: ['#ffb070', '#ffd58a', '#e8a33d', '#9fe7b8'], flags: ['#b8312b', '#2f8f5b', '#e8a33d', '#3b4cc0'], beams: ['255,190,120', '210,235,170', '255,220,160'], hues: [24, 90, 12], sat: 62, speed: 0.28, glowTint: '255,190,120' },
    sanedo: { bulbs: ['#ffd58a', '#ff8fb3', '#ffb070', '#9fe7b8'], flags: ['#c2185b', '#f08a24', '#ffc861', '#2f8f5b'], beams: ['255,140,190', '255,200,110', '255,236,200'], hues: [340, 30, 50], sat: 78, speed: 0.55, glowTint: '255,170,170' },
    fusion: { bulbs: ['#8fc7ff', '#c38fff', '#ff6fa3', '#7fe0ff'], flags: ['#3b4cc0', '#8e44ad', '#c2185b', '#16a085'], beams: ['120,220,255', '190,120,255', '255,90,180', '90,255,220'], hues: [200, 280, 320], sat: 88, speed: 1.05, glowTint: '170,150,255' },
    nonstop: { bulbs: ['#ffd58a', '#ff6fa3', '#8fc7ff', '#ffb070', '#7fe0a0'], flags: ['#f08a24', '#2f8f5b', '#c2185b', '#ffc861', '#3b4cc0'], beams: ['255,200,110', '255,120,190', '120,220,255', '255,236,200'], hues: [30, 320, 190], sat: 80, speed: 0.65, glowTint: '255,190,140' }
  };

  function seeded(s) { s = s % 2147483647 || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // Where the camera stands, in metres. The main circle's garbo is at the origin and Z runs away from you.
  var CAMS = {
    outdoors: { circle: [0, 4.4, -12.5], far: [0, 5.5, -26], stage: [0, 3.7, 35.2] },
    stadium: { circle: [0, 4.6, -12.5], far: [0, 9.5, -37], stage: [0, 3.7, 25.2] },
    sheri: { circle: [0, 4, -11.5], far: [-3, 3, -23], stage: [0, 3.3, 56.2] }
  };

  function create(canvas, opts) {
    opts = opts || {};
    var g = canvas.getContext('2d');
    var W = 1, H = 1, DPR = 1, F = 1, HOR = 1, box = null, BX = 0, BY = 0, BW = 1, BH = 1;
    var cam = { x: 0, y: 4, z: -15 };
    var TH = THEMES.traditional, BEAT = 0, band = {};
    var st = { youAs: 'woman', theme: 'traditional', density: 1, venue: 'outdoors', listener: 'circle', style: 'claps', mode: 'immersive', on: false, level: 0.6, lit: null, progress: 0, chapters: null, chapterIndex: -1, live: false };
    var view = { k: 0 };
    var rnd = seeded(opts.seed || (Date.now() % 100000) + 11);
    var layouts = {}, statics = {}, fade = null, fadeA = 0;
    var waves = [], arrivals = [], haze = 0, youGlow = 0, pulse = 0, beatKey = '', visIdx = null, lastMs = 0, running = true;
    var reduce = !!opts.reduceMotion;
    var clock = opts.clock || function () { return performance.now() / 1000; };
    var venues = opts.venues || {};

    /* ---------- projection ---------- */
    function P(X, Y, Z) {
      var zc = Z - cam.z; if (zc < NEAR - 1e-6) return null;
      var s = F / zc; return { x: BX + BW / 2 + (X - cam.x) * s, y: HOR + (cam.y - Y) * s, s: s, z: zc };
    }
    function clip(pts) {
      var out = [];
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length], za = a[2] - cam.z, zb = b[2] - cam.z;
        if (za >= NEAR) out.push(a);
        if ((za >= NEAR) !== (zb >= NEAR)) { var t = (NEAR - za) / (zb - za); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]); }
      }
      return out;
    }
    function poly(pts) {
      pts = clip(pts); if (pts.length < 3) return false;
      g.beginPath();
      for (var i = 0; i < pts.length; i++) { var p = P(pts[i][0], pts[i][1], pts[i][2]); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
      g.closePath(); return true;
    }
    function fillPoly(pts, col) { if (poly(pts)) { g.fillStyle = col; g.fill(); } }
    function glow(x, y, r, col, a) {
      if (a <= 0.01 || r <= 0) return;
      g.globalAlpha = Math.min(1, a) * 0.3; g.fillStyle = col; g.beginPath(); g.arc(x, y, r * 3.2, 0, TAU); g.fill();
      g.globalAlpha = Math.min(1, a); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1;
    }
    function groundRing(cx, cz, r, a0, a1, seg) {
      var started = false; seg = seg || 56;
      g.beginPath();
      for (var i = 0; i <= seg; i++) {
        var a = lerp(a0, a1, i / seg), p = P(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r);
        if (!p) { started = false; continue; }
        if (started) g.lineTo(p.x, p.y); else { g.moveTo(p.x, p.y); started = true; }
      }
    }
    function sag(a, b, drop, u) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - drop * 4 * u * (1 - u), lerp(a[2], b[2], u)]; }

    /* ---------- layouts: the circles on the ground, re-drawn at random each visit ---------- */
    function person(extra) {
      var man = rnd() < 0.4, d = {
        man: man, col: SKIRTS[Math.floor(rnd() * SKIRTS.length)], top: TOPS[Math.floor(rnd() * TOPS.length)], tier: TOPS[Math.floor(rnd() * TOPS.length)],
        odhni: TOPS[Math.floor(rnd() * TOPS.length)], pagdi: ['#b8312b', '#e67e22', '#f0c24b', '#c2185b', '#f3e6d0', '#2f8f5b'][Math.floor(rnd() * 6)],
        moustache: man && rnd() < 0.55, stick: Math.floor(rnd() * 4), ph: rnd() * TAU, ph2: rnd() * TAU, h: 1.52 + rnd() * 0.22 + (man ? 0.1 : 0), flash: 0, twirl: 0
      };
      for (var k in extra) d[k] = extra[k];
      return d;
    }
    function makeCircle(x, z, R, main, parent, force) {
      var n = force || Math.max(5, Math.min(60, Math.round(TAU * R / (parent ? 1.15 : 1.08)))), c = { x0: x, z0: z, R: R, main: main, parent: parent || null, dancers: [], ph: [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU], w: (0.95 + rnd() * 0.35) / R, spin: main ? 0 : rnd() * TAU, wob: parent ? 1.6 : 1 };
      for (var i = 0; i < n; i++) {
        var d0 = person({ a0: -Math.PI / 2 + i / n * TAU, delay: rnd() * 1.8, speed: 2.6 + rnd() * 1.2, lag: rnd() * 0.02, clapAt: 0 });
        if (main && i < 2) {
          // You and your partner: she in a maroon chaniya with a heavy gold border, he in ivory with a maroon pagdi and a gold stole
          if (i === 0) { d0.man = false; d0.coupleRole = 'w'; d0.col = '#8e1b2c'; d0.top = '#d6a24a'; d0.tier = '#e8b04b'; d0.odhni = '#f3e6d0'; d0.h = 1.62; d0.stick = 2; }
          else { d0.man = true; d0.coupleRole = 'm'; d0.col = '#f3e6d0'; d0.top = '#f3e6d0'; d0.legs = '#7a1a2e'; d0.pagdi = '#8e1b2c'; d0.stole = '#e8b04b'; d0.moustache = true; d0.h = 1.76; d0.stick = 2; }
          d0.a0 = -Math.PI / 2 + (i === 0 ? -0.5 : 0.5) / n * TAU; d0.delay = 0.2 + i * 0.2; d0.ph = 1.3; d0.lag = 0;
        }
        if (d0.coupleRole) d0.alt = person({ man: d0.man, h: d0.h });
        c.dancers.push(d0);
      }
      return c;
    }
    function layout(id) {
      if (layouts[id]) return layouts[id];
      // One garbo at the centre of the venue. Rings grow around it, and people start their own circles anywhere.
      var main = makeCircle(0, 0, id === 'sheri' ? 4.4 : 5.6, true), circles = [main];
      if (id !== 'sheri') circles.push(makeCircle(0, 0, 9.4, false, main));
      if (id === 'outdoors') circles.push(makeCircle(0, 0, 13.2, false, main));
      if (id === 'sheri') {
        circles.push(makeCircle(lerp(-0.8, 0.8, rnd()), 17 + rnd() * 2, 3 + rnd() * 0.5, false));
        circles.push(makeCircle(lerp(-1, 1, rnd()), 29 + rnd() * 2, 2.6 + rnd() * 0.5, false));
        circles.push(makeCircle(lerp(-1, 1, rnd()), 41 + rnd() * 3, 2.8 + rnd() * 0.5, false));
      } else {
        var base = circles.length, want = id === 'outdoors' ? 7 + Math.floor(rnd() * 3) : 5 + Math.floor(rnd() * 2), box = id === 'outdoors' ? [-25, 25, -2, 40] : [-20, 20, 2, 32], tries = 0;
        while (circles.length < want + base && tries++ < 900) {
          var R = rnd() < 0.4 ? 1.6 + rnd() * 1.2 : 2.8 + rnd() * (id === 'outdoors' ? 3 : 2), x = lerp(box[0] + R, box[1] - R, rnd()), z = lerp(box[2] + R, box[3] - R, rnd());
          var ok = circles.every(function (c) { return Math.hypot(c.x0 - x, c.z0 - z) > c.R + R + 2.4; });
          if (ok) circles.push(makeCircle(x, z, R, false));
        }
      }
      // Around the edges: pairs spinning together and a few dancing alone
      var nPairs = id === 'outdoors' ? 9 : id === 'stadium' ? 6 : 3, bx0 = BOUNDS[id], ptries = 0, placed = 0;
      while (placed < nPairs && ptries++ < 400) {
        var solo = rnd() < 0.3, pr = solo ? 0.3 : 0.55, px = lerp(bx0[0] + 1, bx0[1] - 1, rnd()), pz = lerp(Math.max(bx0[2], 1), bx0[3] - 1, rnd());
        if (circles.every(function (c) { return Math.hypot(c.x0 - px, c.z0 - pz) > c.R + pr + 1.6; })) { var pc = makeCircle(px, pz, pr, false, null, solo ? 1 : 2); pc.w = (solo ? 2.4 : 1.8) * (rnd() < 0.5 ? 1 : 1.2); pc.small = true; circles.push(pc); placed++; }
      }
      // Life around the dancing: people stopped at the edge of a circle to watch, clusters chatting further off,
      // and phones held up to record
      var standers = [];
      circles.forEach(function (c, ci) {
        if (c.small || ci === 1) return;
        var n = ci === 0 ? 0 : 1 + Math.floor(rnd() * 3), outer = ci === 0 && circles[1] && circles[1].parent ? (circles[2] && circles[2].parent ? circles[2].R : circles[1].R) : c.R;
        if (ci === 0) n = id === 'sheri' ? 4 : 10;
        for (var k = 0; k < n; k++) { var a = rnd() * TAU, rr = outer + 1.6 + rnd() * 1.6, sx = c.x0 + Math.cos(a) * rr, sz = c.z0 + Math.sin(a) * rr; if (sz < BOUNDS[id][2] - 2 || Math.abs(sx) > (id === 'sheri' ? 6.4 : 26)) continue; standers.push(person({ x: sx, z: sz, stander: true, phone: rnd() < 0.3, sway: rnd() * TAU })); }
      });
      for (var gi = 0; gi < (id === 'sheri' ? 3 : 7); gi++) {
        var bx1 = BOUNDS[id], gx = lerp(bx1[0] + 2, bx1[1] - 2, rnd()), gz = lerp(Math.max(bx1[2], 0), bx1[3] - 2, rnd());
        if (!circles.every(function (c) { return Math.hypot(c.x0 - gx, c.z0 - gz) > c.R + 2.4; })) continue;
        var m = 2 + Math.floor(rnd() * 3);
        for (var j = 0; j < m; j++) { var aj = j / m * TAU + rnd() * 0.5; standers.push(person({ x: gx + Math.cos(aj) * 0.7, z: gz + Math.sin(aj) * 0.55, stander: true, chat: true, phone: rnd() < 0.15, sway: rnd() * TAU, kid: rnd() < 0.15 })); }
      }
      var L = { circles: circles, houses: id === 'sheri' ? houses() : null, stands: id === 'stadium' ? stands() : null, stalls: stallsFor(id), standers: standers };
      L.gallery = galleryFor(id);
      L.kids = []; for (var ki = 0; ki < (id === 'sheri' ? 7 : 12); ki++) { var ks = freeSpot(id, L); L.kids.push(person({ x: ks.x, z: ks.z, tx: ks.x, tz: ks.z, wait: rnd() * 2, speed: 3 + rnd() * 1.4, step: 0, walker: true, kid: true, h: 0.9 + rnd() * 0.3 })); }
      L.walkers = walkersFor(id, L);
      L.seats = seatsFor(id);
      L.watchers = watchersFor(id);
      L.trees = treesFor(id);
      L.props = propsFor(id, L);
      L.motes = []; for (var mi = 0; mi < 80; mi++) L.motes.push([lerp(-26, 26, rnd()), rnd() * 9, lerp(-6, 46, rnd()), 0.1 + rnd() * 0.25, rnd() * TAU]);
      layouts[id] = L; return L;
    }
    // Food stalls: where they stand, which way they face (u runs along the counter, v into the stall)
    function stallsFor(id) {
      var list = id === 'outdoors' ? [[-26.5, 11, 'ચા', '#b8312b', 'Chai'], [-26.5, 18.5, 'દાબેલી', '#2f6fa8', 'Dabeli'], [-26.5, 26, 'પાણીપુરી', '#2f8f5b', 'Pani puri'], [26.5, 14, 'પાણી', '#2f6fa8', 'Water'], [26.5, 22, 'આઈસ્ક્રીમ', '#8e44ad', 'Ice cream'], [26.5, 30, 'નાસ્તો', '#e67e22', 'Snacks']]
        : id === 'stadium' ? [[-20.5, 33.5, 'ચા', '#b8312b', 'Chai'], [20.5, 33.5, 'નાસ્તો', '#e67e22', 'Snacks']]
          : [[-6.2, 9, 'પાણીપુરી', '#2f8f5b', 'Pani puri']];
      return list.map(function (a) {
        var side = a[0] < 0 ? -1 : 1, facing = id === 'stadium' ? 'camera' : 'inward';
        var st0 = { x: a[0], z: a[1], sign: a[2], col: a[3], en: a[4], w: id === 'sheri' ? 1.8 : 3.4, depth: id === 'sheri' ? 0.9 : 2.2, cart: id === 'sheri' };
        if (facing === 'camera') { st0.U = [1, 0]; st0.V = [0, 1]; } else { st0.U = [0, -side]; st0.V = [side, 0]; }
        st0.front = { x: st0.x - st0.V[0] * 1.3, z: st0.z - st0.V[1] * 1.3 };
        st0.vendor = { man: rnd() < 0.6, col: SKIRTS[Math.floor(rnd() * SKIRTS.length)], top: TOPS[Math.floor(rnd() * TOPS.length)], ph: rnd() * TAU, ph2: 0, h: 1.65, flash: 0 };
        return st0;
      });
    }
    // Where people walk; kept clear of the space right in front of the camera
    var BOUNDS = { outdoors: [-23, 23, -5, 40], stadium: [-21, 21, -5, 32], sheri: [-6, 6, -3, 60] };
    function freeSpot(id, L) {
      var bx = BOUNDS[id];
      for (var k = 0; k < 40; k++) {
        var x = lerp(bx[0], bx[1], rnd()), z = lerp(bx[2], bx[3], rnd());
        if (L.circles.every(function (c) { return Math.hypot(c.x0 - x, c.z0 - z) > c.R + 1.8; })) return { x: x, z: z };
      }
      return { x: bx[0], z: bx[3] };
    }
    function walkersFor(id, L) {
      var n = { outdoors: 32, stadium: 18, sheri: 14 }[id], out = [];
      for (var i = 0; i < n; i++) {
        var p = freeSpot(id, L), kid = rnd() < 0.22, photo = !kid && rnd() < 0.14;
        var w = person({ x: p.x, z: p.z, tx: p.x, tz: p.z, wait: rnd() * 4, speed: kid ? 1.7 + rnd() * 0.9 : 0.9 + rnd() * 0.6, step: rnd() * TAU, walker: true, kid: kid, photo: photo, snap: 0 });
        if (kid) w.h = 0.95 + rnd() * 0.3;
        out.push(w);
      }
      return out;
    }
    // Children: tag in the empty middle while the music is off; once it plays they run round the edges, and now and then straight through a circle
    // The mandvi, rangoli and diyas sit in a clear space nobody walks through
    var KEEP_OUT = 2.9;
    function clearOfCentre(o) {
      var d = Math.hypot(o.x, o.z);
      if (d < KEEP_OUT) { var k = d > 0.01 ? KEEP_OUT / d : 1; o.x = d > 0.01 ? o.x * k : KEEP_OUT; o.z = d > 0.01 ? o.z * k : 0; }
    }
    function moveKids(L, id, dt) {
      var bx = BOUNDS[id];
      L.kids.forEach(function (k) {
        if (k.wait > 0) { k.wait -= dt; k.moving = false; return; }
        var dx = k.tx - k.x, dz = k.tz - k.z, d = Math.hypot(dx, dz);
        if (d < 0.3) {
          k.moving = false; k.wait = rnd() * 0.8;
          if (!st.on) { var a = rnd() * TAU, r = KEEP_OUT + 0.6 + rnd() * (id === 'sheri' ? 2 : 6); k.tx = Math.max(bx[0], Math.min(bx[1], Math.cos(a) * r)); k.tz = Math.max(bx[2], Math.sin(a) * r * (id === 'sheri' ? 3 : 1) + (id === 'sheri' ? 12 : 4)); k.through = false; }
          else if (rnd() < 0.3 && L.circles.length > 3) { var c = L.circles[3 + Math.floor(rnd() * (L.circles.length - 3))], a2 = rnd() * TAU; k.tx = c.x0 + Math.cos(a2) * (c.R + 3); k.tz = Math.max(bx[2], c.z0 + Math.sin(a2) * (c.R + 3)); k.through = true; }
          else { var p = freeSpot(id, L); k.tx = p.x; k.tz = p.z; k.through = false; }
          return;
        }
        var vx = dx / d, vz = dz / d;
        if (st.on && !k.through) L.circles.forEach(function (c) { var cx = k.x - c.x0, cz = k.z - c.z0, cd = Math.hypot(cx, cz), keep = c.R + 1.2; if (cd < keep + 1.5 && cd > 0.01) { var push = (keep + 1.5 - cd) / 1.5; vx += cx / cd * push; vz += cz / cd * push; } });
        var vl = Math.hypot(vx, vz) || 1, sp = k.speed * (st.on && !k.through ? 0.8 : 1);
        k.x += vx / vl * sp * dt; k.z += vz / vl * sp * dt; clearOfCentre(k); k.step = (k.step || 0) + dt * sp * 6; k.moving = true;
      });
    }
    function moveWalkers(L, id, dt) {
      L.walkers.forEach(function (w) {
        w.snap = Math.max(0, (w.snap || 0) - dt * 4);
        if (w.wait > 0) { w.wait -= dt; w.moving = false; if (w.photo && st.on && Math.random() < dt * 0.5) w.snap = 1; return; }
        var dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz);
        if (d < 0.3) {
          w.moving = false; w.wait = w.kid ? 0.5 + rnd() * 2 : 2 + rnd() * 6;
          var target = L.stalls.length && rnd() < 0.35 ? L.stalls[Math.floor(rnd() * L.stalls.length)].front : freeSpot(id, L);
          w.tx = target.x + (rnd() - 0.5) * 1.2; w.tz = target.z + (rnd() - 0.5) * 1.2; return;
        }
        // Head for the target and step around the circles on the way
        var vx = dx / d, vz = dz / d;
        L.circles.forEach(function (c) {
          var cx = w.x - c.x0, cz = w.z - c.z0, cd = Math.hypot(cx, cz), keep = c.R + 1.6;
          if (cd < keep + 2 && cd > 0.01) { var push = (keep + 2 - cd) / 2; vx += cx / cd * push - cz / cd * push * 0.6; vz += cz / cd * push + cx / cd * push * 0.6; }
        });
        var vl = Math.hypot(vx, vz) || 1;
        w.x += vx / vl * w.speed * dt; w.z += vz / vl * w.speed * dt; clearOfCentre(w); w.step += dt * w.speed * 5.5; w.moving = true;
      });
    }
    // Rows of plastic chairs along the sides of an open ground, most of them taken by the older folk watching
    // Where you sit when you watch from far away: a row of chairs, the stadium's stepped benches, a bench in the lane.
    // You and your partner sit among neighbours, seen from behind as the camera looks over your shoulders.
    function galleryFor(id) {
      var out = [];
      function sitter(x, y, z, kind, role, view) { var d = role ? person({ man: role === 'm', sitting: true, rest: { y: y } }) : rnd() < 0.8 ? person({ sitting: true, older: rnd() < 0.3, rest: { y: y } }) : null; if (role) { d.seatRole = role; if (role === 'w') { d.col = '#8e1b2c'; d.top = '#d6a24a'; d.odhni = '#f3e6d0'; d.h = 1.62; } else { d.col = '#f3e6d0'; d.top = '#f3e6d0'; d.pagdi = '#8e1b2c'; d.h = 1.76; } } out.push({ x: x, y: y, z: z, kind: kind, who: d, view: view || 'far', col: ['#b73a2e', '#2f6fa8', '#d9d2c5', '#2f8f5b'][Math.floor(rnd() * 4)] }); }
      if (id === 'outdoors') {
        [-18.4, -17.2, -16].forEach(function (z, row) { for (var x = -5.2 + (row % 2) * 0.4; x <= 5.2; x += 0.8) { var role = row === 0 && Math.abs(x + 0.4) < 0.05 ? 'w' : row === 0 && Math.abs(x - 0.4) < 0.05 ? 'm' : null; sitter(x, 0.45, z, 'chair', role); } });
        [-1, 1].forEach(function (sd) { for (var k = 0; k < 3; k++) out.push({ x: sd * (6.2 + k * 0.5), y: 0, z: -17.6 + k * 0.4, kind: 'stand', who: person({ stander: true, phone: k === 1, sway: rnd() * TAU }) }); });
      }
      // By the stage: a standing crowd seen from behind, lots of phones up, and the two of you at the front
      var sz0 = { outdoors: 46, stadium: 35.5, sheri: 64.5 }[id], hw = id === 'sheri' ? 5.5 : 8;
      for (var rz = 0; rz < 4; rz++) for (var cx0 = -hw; cx0 <= hw; cx0 += 0.62 + rnd() * 0.3) {
        var zz = sz0 - 2.3 - rz * 0.9 + (rnd() - 0.5) * 0.3, role2 = rz === 0 && Math.abs(cx0 + 0.3) < 0.31 ? 'w' : rz === 0 && Math.abs(cx0 - 0.35) < 0.31 ? 'm' : null;
        if (!role2 && (rnd() < 0.25 || (rz === 0 && Math.abs(cx0) < 1.2))) continue;
        var pp2 = person({ stander: true, phone: rnd() < 0.3, sway: rnd() * TAU, kid: rnd() < 0.06 });
        if (role2) { pp2.seatRole = role2; pp2.man = role2 === 'm'; pp2.phone = false; if (role2 === 'w') { pp2.col = '#8e1b2c'; pp2.top = '#d6a24a'; pp2.odhni = '#f3e6d0'; pp2.h = 1.62; } else { pp2.col = '#f3e6d0'; pp2.top = '#f3e6d0'; pp2.pagdi = '#8e1b2c'; pp2.stole = '#e8b04b'; pp2.h = 1.76; } zz = sz0 - 2.1; cx0 = role2 === 'w' ? -0.3 : 0.35; }
        out.push({ x: cx0, y: 0, z: zz, kind: 'stand', who: pp2, view: 'stage' });
      }
      if (id === 'stadium') {
        // Shallow steps so you look down over the rows in front to the floor
        for (var k = 0; k < 5; k++) {
          var z = -32.4 + k * 1.15, y = 7.6 - k * 0.42;
          out.push({ x: 0, y: y, z: z + 0.45, kind: 'step', w: 11 });
          for (var x = -9.6 + (k % 2) * 0.3; x <= 9.6; x += 0.62) { var role = k === 0 && Math.abs(x + 0.29) < 0.2 ? 'w' : k === 0 && Math.abs(x - 0.33) < 0.2 ? 'm' : null; if (role || rnd() < (k === 0 ? 0.45 : 0.72)) sitter(x, y, z, 'bench', role); }
        }
        [-33.6, -34.8].forEach(function (z, i) { out.push({ x: 0, y: 7.6 + (i + 1) * 0.42, z: z + 0.45, kind: 'step', w: 11 }); });
        out.push({ x: -10.6, y: 7.1, z: -30.9, kind: 'stand', who: person({ stander: true, phone: true, sway: 1 }) });
        out.push({ x: 10.4, y: 7.1, z: -31, kind: 'stand', who: person({ stander: true, sway: 2 }) });
        out.push({ x: 0, y: 6.2, z: -30.1, kind: 'runner', who: person({ kid: true, h: 1.05, walker: true, moving: true, step: 0 }) });
      } else if (id === 'sheri') {
        out.push({ x: -3, y: 0.45, z: -19.2, kind: 'benchPlank', w: 2 });
        sitter(-3.35, 0.45, -19.2, 'bench', 'w'); sitter(-2.6, 0.45, -19.2, 'bench', 'm'); sitter(-4.15, 0.45, -19.2, 'bench', null);
        out.push({ x: -1.2, y: 0, z: -18.6, kind: 'stand', who: person({ stander: true, phone: true, sway: 0.5 }) });
        out.push({ x: -0.5, y: 0, z: -18.1, kind: 'stand', who: person({ stander: true, sway: 1.5 }) });
      }
      return out;
    }
    function seatsFor(id) {
      var out = [];
      if (id === 'sheri') {
        [-1, 1].forEach(function (sd) {
          for (var z = -22; z < 60; z += 1.6 + rnd() * 3.2) {
            var r = rnd(), older = rnd() < 0.55;
            if (r < 0.55) out.push({ kind: 'otla', x: sd * 6.95, y: 0.45, z: z, side: sd, who: person({ sitting: true, older: older, rest: { y: 0.45 } }) });
            else if (r < 0.75) out.push({ x: sd * 6.35, y: 0.45, z: z, side: sd, col: ['#b73a2e', '#2f6fa8', '#d9d2c5', '#2f8f5b'][Math.floor(rnd() * 4)], who: person({ sitting: true, older: true, rest: { y: 0.45 } }) });
            else out.push({ kind: 'ground', x: sd * (5.6 + rnd() * 0.6), y: 0, z: z, side: sd, who: person({ sitting: true, kid: rnd() < 0.5, h: 1.2 + rnd() * 0.4, rest: { y: 0 } }) });
          }
        });
        return out;
      }
      if (id !== 'outdoors') return out;
      [-1, 1].forEach(function (sd) {
        [[-4, 8.5], [32, 41]].forEach(function (span) {
          for (var z = span[0]; z <= span[1]; z += 1.05) {
            var taken = rnd() < 0.72, older = rnd() < 0.6;
            out.push({ x: sd * (24.3 + (Math.round(z) % 2) * 0.1), z: z, side: sd, col: ['#b73a2e', '#2f6fa8', '#d9d2c5', '#2f8f5b'][Math.floor(rnd() * 4)], who: taken ? person({ sitting: true, older: older, rest: { y: 0.45 } }) : null });
          }
        });
      });
      return out;
    }
    // People standing at the barrier in the stadium, cheering now and then
    function watchersFor(id) {
      var out = [];
      if (id !== 'stadium') return out;
      [-1, 1].forEach(function (sd) { for (var z = -6; z <= 32; z += 0.7 + rnd() * 0.9) out.push(person({ x: sd * (23.9 - rnd() * 0.5), z: z, watcher: true })); });
      return out;
    }
    // Neem and peepal trees ring the open ground; some are wrapped in fairy lights
    function treesFor(id) {
      var out = [];
      if (id !== 'outdoors') return out;
      function tree(x, z, big) { var n = 5 + Math.floor(rnd() * 3), blobs = []; for (var i = 0; i < n; i++) blobs.push([(rnd() - 0.5) * 4.2, 5 + rnd() * 3.2, (rnd() - 0.5) * 1.5, 1.8 + rnd() * 1.6]); out.push({ x: x, z: z, s: big ? 1.25 : 0.8 + rnd() * 0.4, blobs: blobs, fairy: rnd() < 0.55, hue: Math.floor(rnd() * 6), tone: Math.floor(rnd() * 3) }); }
      for (var x = -48; x <= 48; x += 6 + rnd() * 4) tree(x, 58 + rnd() * 12, rnd() < 0.3);
      [-1, 1].forEach(function (sd) { for (var z = -14; z < 56; z += 7 + rnd() * 5) tree(sd * (33 + rnd() * 9), z, rnd() < 0.3); });
      tree(-29.5, -7, true); tree(30.5, -9.5, true);
      return out;
    }
    function drawTree(tr, t) {
      var base = P(tr.x, 0, tr.z), top = P(tr.x, 4.6 * tr.s, tr.z); if (!base || !top) return;
      g.strokeStyle = '#1c130c'; g.lineCap = 'round'; g.lineWidth = Math.max(1.2, base.s * 0.5 * tr.s); g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(top.x, top.y); g.stroke();
      g.lineWidth = Math.max(0.8, base.s * 0.2 * tr.s); g.beginPath(); g.moveTo(lerp(base.x, top.x, 0.6), lerp(base.y, top.y, 0.6)); g.lineTo(top.x - base.s * 1.3 * tr.s, top.y - base.s * 0.6); g.moveTo(lerp(base.x, top.x, 0.75), lerp(base.y, top.y, 0.75)); g.lineTo(top.x + base.s * 1.2 * tr.s, top.y - base.s * 0.8); g.stroke();
      var greens = [['#0f1d12', '#1a2c18'], ['#12200f', '#20321a'], ['#0d1a14', '#1a2b22']][tr.tone];
      tr.blobs.forEach(function (bl, i) {
        var c = P(tr.x + bl[0] * tr.s, bl[1] * tr.s, tr.z + bl[2] * tr.s); if (!c) return;
        var r = c.s * bl[3] * tr.s;
        var gr = g.createRadialGradient(c.x - r * 0.3, c.y - r * 0.4, r * 0.1, c.x, c.y, r); gr.addColorStop(0, greens[1]); gr.addColorStop(1, greens[0]);
        g.fillStyle = gr; g.beginPath(); g.arc(c.x, c.y, r, 0, TAU); g.fill();
        // Warm light from the ground catches the underside of the leaves
        g.fillStyle = 'rgba(' + TH.glowTint + ',' + 0.08 * bright + ')'; g.beginPath(); g.arc(c.x, c.y + r * 0.35, r * 0.7, 0, Math.PI); g.fill();
      });
      if (tr.fairy) for (var k = 0; k < 26; k++) {
        var bl2 = tr.blobs[k % tr.blobs.length], an = k * 2.4, rr = bl2[3] * 0.8 * ((k * 37) % 10) / 10;
        var q = P(tr.x + (bl2[0] + Math.cos(an) * rr) * tr.s, (bl2[1] + Math.sin(an) * rr * 0.8) * tr.s, tr.z + bl2[2] * tr.s - 0.5); if (!q) continue;
        glow(q.x, q.y, Math.max(0.5, Math.min(1.8, q.s * 0.05)), TH.bulbs[(tr.hue + k) % TH.bulbs.length], (0.5 + 0.5 * Math.sin(t * 2.2 + k * 1.3)) * bright);
      }
    }
    // Things at the edges that a wide screen shows: parked scooters, a shamiyana, water tanks, tulsi pots, a cow
    function propsFor(id, L) {
      var out = [];
      var cols = ['#b73a2e', '#2f6fa8', '#d9d2c5', '#1c1c1c', '#e8a33d', '#6c8fa3'];
      if (id === 'outdoors') {
        [-1, 1].forEach(function (sd) { for (var z = -8; z < 40; z += 1.1) if (rnd() < 0.7) out.push({ kind: 'scooter', x: sd * (30 + rnd() * 1.2), z: z, col: cols[Math.floor(rnd() * cols.length)], side: sd }); });
        out.push({ kind: 'tent', x: -37, z: 44, col: '#b8312b' }); out.push({ kind: 'tent', x: 37, z: 46, col: '#e8a33d' });
      } else if (id === 'sheri') {
        [-1, 1].forEach(function (sd) { for (var z = -6; z < 60; z += 3 + rnd() * 5) { var r = rnd(); out.push(r < 0.45 ? { kind: 'scooter', x: sd * 6.4, z: z, col: cols[Math.floor(rnd() * cols.length)], side: sd } : r < 0.8 ? { kind: 'tulsi', x: sd * 7.05, z: z } : { kind: 'none' }); } });
        out.push({ kind: 'cow', x: 5.2, z: 23 + rnd() * 6 });
      }
      return out.filter(function (o) { return o.kind !== 'none'; });
    }
    function prop(o, t) {
      var p = P(o.x, 0, o.z); if (!p) return;
      var s = p.s;
      if (o.kind === 'scooter') {
        g.fillStyle = '#111'; g.beginPath(); g.arc(p.x - s * 0.5, p.y - s * 0.2, s * 0.2, 0, TAU); g.arc(p.x + s * 0.5, p.y - s * 0.2, s * 0.2, 0, TAU); g.fill();
        g.fillStyle = o.col; g.beginPath(); g.moveTo(p.x - s * 0.7, p.y - s * 0.35); g.lineTo(p.x + s * 0.2, p.y - s * 0.35); g.lineTo(p.x + s * 0.45, p.y - s * 0.85); g.lineTo(p.x + s * 0.6, p.y - s * 0.85); g.lineTo(p.x + s * 0.55, p.y - s * 0.3); g.lineTo(p.x + s * 0.75, p.y - s * 0.25); g.lineTo(p.x - s * 0.1, p.y - s * 0.6); g.lineTo(p.x - s * 0.7, p.y - s * 0.6); g.closePath(); g.fill();
        g.fillStyle = '#222'; g.fillRect(p.x - s * 0.62, p.y - s * 0.7, s * 0.55, s * 0.12);
      } else if (o.kind === 'tent') {
        var a = P(o.x - 4, 0, o.z), b = P(o.x + 4, 0, o.z), ta = P(o.x - 4, 3.2, o.z), tb = P(o.x + 4, 3.2, o.z), apex = P(o.x, 4.6, o.z); if (!a || !b || !ta || !tb || !apex) return;
        g.fillStyle = 'rgba(255,200,130,' + 0.14 * bright + ')'; g.fillRect(ta.x, ta.y, tb.x - ta.x, a.y - ta.y);
        for (var k = 0; k < 8; k++) { var u0 = k / 8, u1 = (k + 1) / 8; g.fillStyle = k % 2 ? '#f3e6d0' : o.col; g.beginPath(); g.moveTo(apex.x, apex.y); g.lineTo(lerp(ta.x, tb.x, u0), ta.y); g.lineTo(lerp(ta.x, tb.x, u1), ta.y); g.closePath(); g.fill(); }
        g.strokeStyle = '#2a1a10'; g.lineWidth = Math.max(1, a.s * 0.1); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(ta.x, ta.y); g.moveTo(b.x, b.y); g.lineTo(tb.x, tb.y); g.stroke();
        for (var q = 0; q <= 8; q++) glow(lerp(ta.x, tb.x, q / 8), ta.y + 2, Math.max(0.7, a.s * 0.06), TH.bulbs[q % TH.bulbs.length], 0.8 * bright);
      } else if (o.kind === 'tulsi') {
        g.fillStyle = '#8a4b22'; g.fillRect(p.x - s * 0.2, p.y - s * 0.5, s * 0.4, s * 0.5);
        g.fillStyle = '#e8b04b'; g.fillRect(p.x - s * 0.2, p.y - s * 0.42, s * 0.4, s * 0.05);
        g.fillStyle = '#2f6b33'; g.beginPath(); g.arc(p.x, p.y - s * 0.72, s * 0.28, 0, TAU); g.arc(p.x - s * 0.15, p.y - s * 0.6, s * 0.18, 0, TAU); g.arc(p.x + s * 0.16, p.y - s * 0.62, s * 0.18, 0, TAU); g.fill();
        glow(p.x + s * 0.3, p.y - s * 0.05, Math.max(0.6, s * 0.05), '#ffcf7a', (0.7 + 0.3 * Math.sin(t * 8 + o.z)) * bright);
      } else if (o.kind === 'cow') {
        g.fillStyle = '#ece3d3'; g.beginPath(); g.ellipse(p.x, p.y - s * 0.45, s * 0.95, s * 0.42, 0, 0, TAU); g.fill();
        g.fillStyle = '#d9cdb8'; g.beginPath(); g.ellipse(p.x - s * 0.95, p.y - s * 0.72, s * 0.28, s * 0.22, -0.3, 0, TAU); g.fill();
        g.strokeStyle = '#e8d9b0'; g.lineWidth = Math.max(1, s * 0.06); g.beginPath(); g.moveTo(p.x - s * 1.05, p.y - s * 0.9); g.quadraticCurveTo(p.x - s * 1.2, p.y - s * 1.15, p.x - s * 1.0, p.y - s * 1.2); g.moveTo(p.x - s * 0.85, p.y - s * 0.9); g.quadraticCurveTo(p.x - s * 0.7, p.y - s * 1.15, p.x - s * 0.9, p.y - s * 1.2); g.stroke();
        g.fillStyle = '#b8312b'; g.beginPath(); g.arc(p.x - s * 0.8, p.y - s * 0.55, s * 0.07, 0, TAU); g.fill();
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(p.x, p.y, s * 1.1, s * 0.12, 0, 0, TAU); g.fill();
      }
    }
    function galleryItem(ga, p, T0) {
      if (ga.kind === 'step') {
        // A concrete bench step: its top, with a worn edge
        fillPoly([[ga.x - ga.w, ga.y, ga.z - 1.0], [ga.x + ga.w, ga.y, ga.z - 1.0], [ga.x + ga.w, ga.y, ga.z + 0.1], [ga.x - ga.w, ga.y, ga.z + 0.1]], '#2c2636');
        fillPoly([[ga.x - ga.w, ga.y, ga.z + 0.1], [ga.x + ga.w, ga.y, ga.z + 0.1], [ga.x + ga.w, ga.y - 0.42, ga.z + 0.12], [ga.x - ga.w, ga.y - 0.42, ga.z + 0.12]], '#1e1a26');
        fillPoly([[ga.x - ga.w, ga.y - 0.02, ga.z + 0.08], [ga.x + ga.w, ga.y - 0.02, ga.z + 0.08], [ga.x + ga.w, ga.y + 0.04, ga.z + 0.1], [ga.x - ga.w, ga.y + 0.04, ga.z + 0.1]], '#5a5068');
        return;
      }
      if (ga.kind === 'benchPlank') {
        fillPoly([[ga.x - ga.w / 2 - 0.2, 0.45, ga.z - 0.22], [ga.x + ga.w / 2 + 0.2, 0.45, ga.z - 0.22], [ga.x + ga.w / 2 + 0.2, 0.45, ga.z + 0.22], [ga.x - ga.w / 2 - 0.2, 0.45, ga.z + 0.22]], '#6b3f1f');
        [-1, 1].forEach(function (sd) { var a = P(ga.x + sd * ga.w / 2, 0, ga.z - 0.2), b = P(ga.x + sd * ga.w / 2, 0.45, ga.z - 0.2); if (a && b) { g.strokeStyle = '#3b2213'; g.lineWidth = Math.max(1, a.s * 0.08); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } });
        return;
      }
      if (ga.kind === 'chair') fillPoly([[ga.x - 0.22, 0.45, ga.z - 0.22], [ga.x + 0.22, 0.45, ga.z - 0.22], [ga.x + 0.22, 0.45, ga.z + 0.22], [ga.x - 0.22, 0.45, ga.z + 0.22]], ga.col);
      if (ga.who) { ga.who.backWord = null; ga.who.headAt = null; }
      if (ga.who) backFigure(ga.kind === 'stand' || ga.kind === 'runner' ? P(ga.x, ga.y, ga.z) : p, ga.who, T0, ga.kind === 'runner');
      if (ga.who && ga.who.seatRole && (ga.view || 'far') === st.listener && ga.who.headAt) {
        var youSeat = ga.who.seatRole === (st.youAs === 'man' ? 'm' : 'w'), lab = { x: ga.who.headAt.x, y: ga.who.headAt.y, h: ga.who.h * p.s, man: ga.who.man, hx: ga.who.headAt.x, hy: ga.who.headAt.y };
        if (youSeat) youLabel = lab; else partnerLabel = lab;
      }
      if (ga.kind === 'chair') {
        // The chair back sits between you and the sitter, so only their shoulders and head show above it
        fillPoly([[ga.x - 0.22, 0.45, ga.z - 0.22], [ga.x + 0.22, 0.45, ga.z - 0.22], [ga.x + 0.22, 0.98, ga.z - 0.25], [ga.x - 0.22, 0.98, ga.z - 0.25]], ga.col);
        var lg = P(ga.x - 0.2, 0, ga.z - 0.22), lt = P(ga.x - 0.2, 0.45, ga.z - 0.22), rg = P(ga.x + 0.2, 0, ga.z - 0.22), rt = P(ga.x + 0.2, 0.45, ga.z - 0.22);
        if (lg && lt && rg && rt) { g.strokeStyle = ga.col; g.lineWidth = Math.max(1, lg.s * 0.05); g.beginPath(); g.moveTo(lg.x, lg.y); g.lineTo(lt.x, lt.y); g.moveTo(rg.x, rg.y); g.lineTo(rt.x, rt.y); g.stroke(); }
      }

    }
    // Someone seen from behind: back of the head, hair or pagdi, the choli or kediyu, the odhni falling down the back
    function backFigure(p, d, T0, running) {
      FOGF = 0;
      var s = p.s, x = p.x, y = p.y, h = d.h * s, sit = !!d.sitting, hip = sit ? y - h * 0.02 : y - h * 0.5;
      if (h < 3) return;
      var skin = SKIN[Math.floor((d.ph || 0) * 10) % SKIN.length], top = d.top, main = d.col, hair = d.older ? '#9a948c' : '#1f130d';
      if (h < 14 && !d.backWord) {
        // Far off: a couple of shapes are enough
        g.globalAlpha = 1 - Math.min(1, p.z / 70) * 0.4;
        g.fillStyle = sit || d.man ? top : main; g.fillRect(x - h * 0.1, hip - h * 0.26, h * 0.2, sit ? h * 0.26 : h * 0.26 + (y - hip));
        g.fillStyle = d.man ? d.pagdi || '#b8312b' : hair; g.beginPath(); g.arc(x, hip - h * 0.365, h * 0.075, 0, TAU); g.fill();
        g.globalAlpha = 1; return;
      }
      if (d.stander && !reduce) x += Math.sin(T0 * 0.8 + (d.sway || 0)) * h * 0.02;
      if (running) y -= Math.abs(Math.sin(d.step || 0)) * h * 0.05;
      g.lineCap = 'round';
      if (!sit) {
        if (d.man) { g.strokeStyle = d.legs || '#efe6d6'; g.lineWidth = Math.max(1, h * 0.055); var lx = running ? Math.sin(d.step) * h * 0.06 : 0; g.beginPath(); g.moveTo(x - h * 0.045, hip + h * 0.06); g.lineTo(x - h * 0.06 - lx, y); g.moveTo(x + h * 0.045, hip + h * 0.06); g.lineTo(x + h * 0.06 + lx, y); g.stroke(); }
        else { g.fillStyle = main; g.beginPath(); g.moveTo(x - h * 0.075, hip - h * 0.03); g.lineTo(x + h * 0.075, hip - h * 0.03); g.quadraticCurveTo(x + h * 0.19, y - h * 0.22, x + h * 0.24, y); g.quadraticCurveTo(x, y + h * 0.04, x - h * 0.24, y); g.quadraticCurveTo(x - h * 0.19, y - h * 0.22, x - h * 0.075, hip - h * 0.03); g.fill(); g.strokeStyle = '#e8b04b'; g.lineWidth = Math.max(1, h * 0.03); g.beginPath(); g.moveTo(x - h * 0.23, y - h * 0.01); g.quadraticCurveTo(x, y + h * 0.03, x + h * 0.23, y - h * 0.01); g.stroke(); }
      } else if (!d.man) { g.fillStyle = main; g.beginPath(); g.ellipse(x, hip, h * 0.2, h * 0.07, 0, Math.PI, 0); g.fill(); }
      // Back: a choli with a strip of skin above the waist, or the back of a kediyu
      var sh = hip - h * 0.26;
      if (d.man) { g.fillStyle = top; g.beginPath(); g.moveTo(x - h * 0.09, sh); g.lineTo(x + h * 0.09, sh); g.lineTo(x + h * 0.13, hip + (sit ? 0 : h * 0.1)); g.lineTo(x - h * 0.13, hip + (sit ? 0 : h * 0.1)); g.closePath(); g.fill(); }
      else { g.fillStyle = skin; g.fillRect(x - h * 0.07, sh + h * 0.12, h * 0.14, h * 0.13); g.fillStyle = top; g.fillRect(x - h * 0.085, sh, h * 0.17, h * 0.13); g.fillStyle = main; g.fillRect(x - h * 0.08, hip - h * 0.03, h * 0.16, h * 0.04); }
      // Arms resting at the sides (or one raised with a phone)
      g.strokeStyle = skin; g.lineWidth = Math.max(0.8, h * 0.034);
      g.beginPath(); g.moveTo(x - h * 0.085, sh + h * 0.02); g.lineTo(x - h * 0.12, hip - h * 0.02);
      if (d.phone) { g.moveTo(x + h * 0.085, sh + h * 0.02); g.lineTo(x + h * 0.1, sh - h * 0.16); } else { g.moveTo(x + h * 0.085, sh + h * 0.02); g.lineTo(x + h * 0.12, hip - h * 0.02); }
      g.stroke();
      if (d.phone) { g.fillStyle = 'rgba(200,225,255,.95)'; g.fillRect(x + h * 0.075, sh - h * 0.25, h * 0.05, h * 0.09); glow(x + h * 0.1, sh - h * 0.2, Math.max(0.8, h * 0.03), '#eaf3ff', 0.5); }
      // Odhni falling from one shoulder down the back
      if (!d.man) { g.strokeStyle = d.odhni || d.top; g.globalAlpha = 0.85; g.lineWidth = Math.max(1, h * 0.045); g.beginPath(); g.moveTo(x + h * 0.08, sh); g.quadraticCurveTo(x, sh + h * 0.12, x - h * 0.09, hip + (sit ? -h * 0.02 : h * 0.15)); g.stroke(); g.globalAlpha = 1; }
      if (d.man && d.stole) { g.strokeStyle = d.stole; g.lineWidth = Math.max(1, h * 0.03); g.beginPath(); g.moveTo(x - h * 0.08, sh); g.lineTo(x + h * 0.06, hip); g.stroke(); }
      // Your word printed on your back, so it never covers the view
      if (d.backWord) {
        var you0 = d.backWord === 'તું', fs0 = Math.max(9, Math.min(22, h * 0.075));
        if (you0) glow(x, sh + h * 0.1, h * 0.16, 'rgba(255,210,130,1)', 0.25 + youGlow * 0.3);
        g.font = '700 ' + fs0 + 'px ' + GU_FONT; g.textAlign = 'center';
        var pw = Math.max(fs0 * 1.8, g.measureText(d.backWord).width + fs0 * 0.8), ph = fs0 * 1.4;
        g.fillStyle = you0 ? '#e8b04b' : 'rgba(243,230,208,.95)'; roundRect(x - pw / 2, sh + h * 0.035, pw, ph, fs0 * 0.3); g.fill();
        g.fillStyle = you0 ? '#2a1208' : '#6b1420'; g.fillText(d.backWord, x, sh + h * 0.035 + ph * 0.72);
      }
      // Neck and the back of the head
      g.fillStyle = skin; g.fillRect(x - h * 0.022, sh - h * 0.05, h * 0.044, h * 0.05);
      var hy = sh - h * 0.105;
      d.headAt = { x: x, y: hy - h * 0.085 };
      if (d.man) { g.fillStyle = skin; g.beginPath(); g.arc(x, hy, h * 0.066, 0, TAU); g.fill(); g.fillStyle = d.older ? '#f3e6d0' : d.pagdi || '#b8312b'; g.beginPath(); g.ellipse(x, hy - h * 0.025, h * 0.078, h * 0.058, 0, Math.PI, 0); g.lineTo(x + h * 0.078, hy - h * 0.005); g.lineTo(x - h * 0.078, hy - h * 0.005); g.fill(); }
      else { g.fillStyle = hair; g.beginPath(); g.arc(x, hy, h * 0.07, 0, TAU); g.fill(); g.beginPath(); g.arc(x, hy + h * 0.055, h * 0.036, 0, TAU); g.fill(); g.fillStyle = '#e8b04b'; g.beginPath(); g.arc(x, hy + h * 0.055, Math.max(0.6, h * 0.012), 0, TAU); g.fill(); }
    }
    function chair(se) {
      var sd = se.side, x = se.x, z = se.z, o = sd * 0.22;
      fillPoly([[x - o, 0.45, z - 0.22], [x + o, 0.45, z - 0.22], [x + o, 0.45, z + 0.22], [x - o, 0.45, z + 0.22]], se.col);
      fillPoly([[x + o, 0.45, z - 0.22], [x + o, 0.95, z - 0.22], [x + o, 0.95, z + 0.22], [x + o, 0.45, z + 0.22]], se.col);
      var a = P(x - o, 0, z), b = P(x - o, 0.45, z); if (a && b) { g.strokeStyle = se.col; g.lineWidth = Math.max(0.7, a.s * 0.04); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    }
    function houses() {
      var list = [], cols = ['#3a4468', '#5e4526', '#5c3040', '#28524f', '#5b5241', '#4a3a5e'];
      [-1, 1].forEach(function (side) {
        for (var z = -48; z < 70;) {
          var w = 5 + rnd() * 3.5, h = 6.8 + rnd() * 4.5;
          list.push({ side: side, z1: z, z2: z + w, h: h, col: cols[Math.floor(rnd() * cols.length)], floors: h > 9.5 ? 3 : 2, lit: rnd(), balcony: rnd() < 0.5, rangoli: rnd() < 0.55, bulbs: rnd() < 0.6, hue: Math.floor(rnd() * 6) });
          z += w + 0.15;
        }
      });
      return list;
    }
    function stands() {
      var people = [];
      for (var row = 0; row < 11; row++) for (var x = -27; x <= 27; x += 0.72) people.push({ side: 0, row: row, u: x, c: Math.floor(rnd() * 6), p: rnd() < 0.05 ? rnd() * TAU : -1 });
      [-1, 1].forEach(function (side) { for (var row = 0; row < 9; row++) for (var z = -30; z <= 42; z += 0.8) people.push({ side: side, row: row, u: z, c: Math.floor(rnd() * 6), p: rnd() < 0.04 ? rnd() * TAU : -1 }); });
      return people;
    }

    /* ---------- the moon: its real phase tonight, or the phase on a chosen night ---------- */
    function moonAge() { return st.moonAge != null ? st.moonAge : moonInfo().age; }
    function drawMoon(b, x, y, r, age) {
      var ph = age / SYNODIC, k = (1 - Math.cos(ph * TAU)) / 2;
      var gl = b.createRadialGradient(x, y, r * 0.6, x, y, r * 5); gl.addColorStop(0, 'rgba(255,240,215,' + (0.05 + 0.2 * k) + ')'); gl.addColorStop(1, 'rgba(255,240,215,0)');
      b.fillStyle = gl; b.beginPath(); b.arc(x, y, r * 5, 0, TAU); b.fill();
      b.fillStyle = 'rgba(150,150,180,.16)'; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill();
      if (k < 0.004) return;
      b.save(); b.translate(x, y); if (ph > 0.5) b.scale(-1, 1);
      b.beginPath(); b.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
      b.ellipse(0, 0, r * Math.abs(1 - 2 * k), r, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
      b.closePath(); b.fillStyle = 'rgba(255,243,220,.96)'; b.fill(); b.restore();
    }

    /* ---------- the fixed sky, cached ---------- */
    function sky(id) {
      var key = id + W + 'x' + H + '@' + Math.round(HOR / 3) + ':' + BX + ',' + BY + 'm' + Math.round(moonAge() * 4); if (statics[key]) return statics[key];
      if (Object.keys(statics).length > 5) statics = {};
      var c = document.createElement('canvas'); c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
      var b = c.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
      var r2 = seeded(99), i;
      if (id === 'stadium') {
        var roof = b.createLinearGradient(0, 0, 0, HOR); roof.addColorStop(0, '#050409'); roof.addColorStop(1, '#171222');
        b.fillStyle = roof; b.fillRect(0, 0, W, HOR + 1);
        var fl = b.createLinearGradient(0, HOR, 0, H); fl.addColorStop(0, '#2a1d14'); fl.addColorStop(1, '#130c08');
        b.fillStyle = fl; b.fillRect(0, HOR, W, H - HOR);
      } else {
        var s = b.createLinearGradient(0, 0, 0, HOR); s.addColorStop(0, '#04051a'); s.addColorStop(0.62, '#140f33'); s.addColorStop(1, id === 'sheri' ? '#2a1b36' : '#3d1f1a');
        b.fillStyle = s; b.fillRect(0, 0, W, HOR + 1);
        for (i = 0; i < 120; i++) { b.fillStyle = 'rgba(255,245,225,' + (0.2 + r2() * 0.6) + ')'; b.fillRect(r2() * W, r2() * HOR * 0.92, 1.2, 1.2); }
        var age = moonAge(), yA = Math.min(age, 29.5 - age, 14.8) / 14.8;
        drawMoon(b, BX + BW * 0.82, BY + (HOR - BY) * lerp(0.7, 0.24, yA), Math.max(5, BW * 0.026), age);
        b.fillStyle = id === 'sheri' ? '#140f10' : '#0d0913';
        if (id === 'outdoors') {
          for (var x = 0; x < W; x += W / 30) { var bh = HOR * (0.03 + r2() * 0.09); b.fillRect(x, HOR - bh, W / 31, bh + 1); for (var w = 0; w < 3; w++) if (r2() < 0.4) { b.fillStyle = 'rgba(255,196,120,.5)'; b.fillRect(x + r2() * W / 34, HOR - r2() * bh, 1.5, 1.5); b.fillStyle = '#0d0913'; } }
          var hz = b.createLinearGradient(0, HOR - HOR * 0.2, 0, HOR); hz.addColorStop(0, 'rgba(255,140,70,0)'); hz.addColorStop(1, 'rgba(255,140,70,.16)');
          b.fillStyle = hz; b.fillRect(0, HOR - HOR * 0.2, W, HOR * 0.2);
        }
        var gr = b.createLinearGradient(0, HOR, 0, H); gr.addColorStop(0, id === 'sheri' ? '#2b2019' : '#2a1b10'); gr.addColorStop(1, '#100a06');
        b.fillStyle = gr; b.fillRect(0, HOR, W, H - HOR);
      }
      statics[key] = c; return c;
    }

    /* ---------- venue structures, drawn in perspective each frame ---------- */
    var bright = 1;
    function outdoorsBack(t) {
      groundMarks('outdoors');
      // Light towers with floodlights, and the pools of light they throw
      [-31, 31].forEach(function (x) {
        var pool = P(x * 0.55, 0, 14); if (pool) { var pr = pool.s * 9, pg = g.createRadialGradient(pool.x, pool.y, 1, pool.x, pool.y, pr); pg.addColorStop(0, 'rgba(' + TH.glowTint + ',' + 0.12 * bright + ')'); pg.addColorStop(1, 'rgba(' + TH.glowTint + ',0)'); g.fillStyle = pg; g.beginPath(); g.ellipse(pool.x, pool.y, pr, pr * 0.3, 0, 0, TAU); g.fill(); }
        var base = P(x, 0, 16), top = P(x, 15, 16); if (!base || !top) return;
        g.strokeStyle = '#1c1511'; g.lineWidth = Math.max(1, base.s * 0.3); g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(top.x, top.y); g.stroke();
        for (var k = 0; k < 4; k++) glow(top.x + (k - 1.5) * top.s * 0.7, top.y, Math.max(1.2, Math.min(4, top.s * 0.28)), '#fff4dc', bright);
      });
      // Trees beyond the stage go behind it; the rest are sorted in with the crowd
      layout('outdoors').trees.filter(function (tr) { return tr.z >= 44; }).sort(function (a, b) { return b.z - a.z; }).forEach(function (tr) { drawTree(tr, t); });
      stage({ x0: -11, x1: 11, z: 46, h: 1.6, screenTop: 8.5, truss: 10.5, arrays: 13 }, t, 'outdoors');
      // Delay speaker towers halfway down the ground, so the back of the crowd hears the band on time
      [-21, 21].forEach(function (x) { speakerPole(x, 16, 6); });
    }
    function groundMarks(id) {
      // Scuffed earth, stones and footprints: fixed in the world so they move with the view
      var L = layout(id);
      if (!L.marks) { L.marks = []; for (var i = 0; i < 260; i++) L.marks.push([lerp(-30, 30, rnd()), lerp(-14, 44, rnd()), rnd()]); }
      for (var j = 0; j < L.marks.length; j++) {
        var m = L.marks[j], p = P(m[0], 0, m[1]); if (!p || p.x < 0 || p.x > W || p.s < 4) continue;
        g.fillStyle = m[2] < 0.5 ? 'rgba(255,220,170,.05)' : 'rgba(0,0,0,.18)';
        g.beginPath(); g.ellipse(p.x, p.y, Math.max(0.6, p.s * (0.12 + m[2] * 0.25)), Math.max(0.3, p.s * 0.04), 0, 0, TAU); g.fill();
      }
    }
    // A stage: deck, screen with a mandala that breathes with the beat, truss with lights, hung speaker arrays and the band
    function stage(o, t, id) {
      var zF = o.z, zB = o.z + 1.4;
      fillPoly([[o.x0, 0, zF], [o.x1, 0, zF], [o.x1, o.h, zF], [o.x0, o.h, zF]], '#1a100b');
      fillPoly([[o.x0, o.h, zF], [o.x1, o.h, zF], [o.x1, o.h, zB], [o.x0, o.h, zB]], '#2a1a10');
      var sx0 = o.x0 + 1, sx1 = o.x1 - 1;
      if (poly([[sx0, o.h, zB], [sx1, o.h, zB], [sx1, o.screenTop, zB], [sx0, o.screenTop, zB]])) {
        var c = P((sx0 + sx1) / 2, (o.h + o.screenTop) / 2, zB), a = P(sx0, o.h, zB), b2 = P(sx1, o.h, zB);
        g.save(); g.clip();
        var lg = g.createLinearGradient(a.x, 0, b2.x, 0);
        TH.hues.forEach(function (hh, i) { lg.addColorStop(i / Math.max(1, TH.hues.length - 1), 'hsl(' + (hh + 15 * Math.sin(t * TH.speed + i)) + ',' + TH.sat + '%,' + (14 + 8 * bright) + '%)'); });
        g.fillStyle = lg; g.fillRect(a.x - 2, 0, b2.x - a.x + 4, H);
        // Mandala: petals and rings that open on each beat
        var R = (b2.x - a.x) * 0.2 * (1 + 0.08 * pulse), rot = reduce ? 0 : t * 0.15 * TH.speed / 0.3;
        g.strokeStyle = 'rgba(255,236,200,' + (0.35 + 0.35 * pulse) * bright + ')'; g.lineWidth = Math.max(0.8, R * 0.03);
        for (var ring = 1; ring <= 3; ring++) { g.beginPath(); g.arc(c.x, c.y, R * ring / 3, 0, TAU); g.stroke(); }
        for (var pt = 0; pt < 12; pt++) { var an = rot + pt / 12 * TAU; g.beginPath(); g.ellipse(c.x + Math.cos(an) * R * 0.62, c.y + Math.sin(an) * R * 0.62, R * 0.3, R * 0.1, an, 0, TAU); g.stroke(); }
        g.restore();
      }
      // Truss towers and the top beam, with par cans
      var tl = P(o.x0 - 0.4, 0, zF), tr = P(o.x1 + 0.4, 0, zF), tlt = P(o.x0 - 0.4, o.truss, zF), trt = P(o.x1 + 0.4, o.truss, zF);
      if (tl && tr && tlt && trt) {
        g.strokeStyle = '#3a3440'; g.lineWidth = Math.max(1, tl.s * 0.25);
        g.beginPath(); g.moveTo(tl.x, tl.y); g.lineTo(tlt.x, tlt.y); g.lineTo(trt.x, trt.y); g.lineTo(tr.x, tr.y); g.stroke();
        for (var pc = 0; pc < 10; pc++) {
          var u = (pc + 0.5) / 10, px = lerp(tlt.x, trt.x, u), py = lerp(tlt.y, trt.y, u) + tl.s * 0.3, col = 'rgb(' + TH.beams[pc % TH.beams.length] + ')';
          glow(px, py, Math.max(1, Math.min(3.5, tl.s * 0.2)), col, (0.6 + 0.4 * pulse) * bright);
        }
      }
      // Hung line arrays and subs on the ground, one pair each side
      [-1, 1].forEach(function (sd) {
        var x = sd * o.arrays, prev = null;
        for (var k = 0; k < 6; k++) {
          var y = o.truss - 1 - k * 0.62, zz = zF - 0.4 - k * k * 0.03;
          fillPoly([[x - 0.7, y - 0.55, zz], [x + 0.7, y - 0.55, zz], [x + 0.7, y, zz], [x - 0.7, y, zz]], '#0b0909');
          var gp = P(x, y - 0.28, zz - 0.01); if (gp) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(gp.x - gp.s * 0.6, gp.y - gp.s * 0.12, gp.s * 1.2, gp.s * 0.24); }
        }
        var sx = sd * (o.x1 - 2.5);
        fillPoly([[sx - 0.8, 0, zF - 0.9], [sx + 0.8, 0, zF - 0.9], [sx + 0.8, 1.1, zF - 0.9], [sx - 0.8, 1.1, zF - 0.9]], '#0a0808');
        var sp = P(sx, 0.55, zF - 0.92); if (sp) { g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.arc(sp.x, sp.y, sp.s * 0.4, 0, TAU); g.stroke(); }
      });
      // Front edge of the stage with a line of bulbs
      for (var fb = 0; fb <= 16; fb++) { var fp = P(lerp(o.x0, o.x1, fb / 16), o.h, zF - 0.02); if (fp) glow(fp.x, fp.y, Math.max(0.7, Math.min(2.2, fp.s * 0.07)), TH.bulbs[fb % TH.bulbs.length], (0.8 + 0.2 * pulse) * bright); }
      bandOn(id, o.h, zF + 0.6, o);
    }
    // The band: a lead singer and a second voice at the front, dhol and keys behind them
    function bandOn(id, y, z, o) {
      if (!band[id]) {
        var w = (o.x1 - o.x0);
        band[id] = [
          { role: 'dhol', x: o.x0 + w * 0.2, man: true, col: '#f3e6d0', top: '#b8312b', pagdi: '#e67e22', h: 1.72, ph: 0.3, flash: 0 },
          { role: 'singer', x: o.x0 + w * 0.42, man: false, col: '#c2185b', top: '#f0c24b', odhni: '#f0c24b', h: 1.62, ph: 1.1, flash: 0 },
          { role: 'singer', x: o.x0 + w * 0.58, man: true, col: '#f0c24b', top: '#8e44ad', pagdi: '#b8312b', h: 1.74, ph: 2.2, flash: 0 },
          { role: 'keys', x: o.x0 + w * 0.8, man: true, col: '#2f8f5b', top: '#2f8f5b', pagdi: '#f3e6d0', h: 1.7, ph: 0.8, flash: 0 }
        ];
      }
      band[id].forEach(function (m, i) {
        var bz = m.role === 'singer' ? z - 0.3 : z + 0.4, p = P(m.x, y, bz); if (!p) return;
        var spot = g.createRadialGradient(p.x, p.y - p.s, 1, p.x, p.y - p.s, p.s * 1.6); spot.addColorStop(0, 'rgba(' + TH.beams[i % TH.beams.length] + ',' + 0.35 * bright + ')'); spot.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = spot; g.beginPath(); g.arc(p.x, p.y - p.s, p.s * 1.6, 0, TAU); g.fill();
        if (m.role === 'keys') fillPoly([[m.x - 0.6, y + 0.85, bz - 0.3], [m.x + 0.6, y + 0.85, bz - 0.3], [m.x + 0.6, y + 0.95, bz - 0.3], [m.x - 0.6, y + 0.95, bz - 0.3]], '#111');
        figure(p, m, 0, false, BEAT, 1);
        // The lead singer can wear a face picture for the song's artist, drawn as a round, slightly oversized head
        if (singer.img && singer.img.complete && singer.img.naturalWidth && m.role === 'singer' && (singer.man ? m.man : !m.man)) {
          var hh = m.h * p.s, hr = hh * 0.13, hx = p.x, hy = p.y - hh * 0.9;
          g.save(); g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.clip(); g.drawImage(singer.img, hx - hr, hy - hr, hr * 2, hr * 2); g.restore();
          g.strokeStyle = '#e8b04b'; g.lineWidth = Math.max(1, hr * 0.08); g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.stroke();
        }
        if (m.role === 'dhol') { var dp = P(m.x, y + 0.9, bz - 0.25); if (dp) { g.fillStyle = '#7a3b1a'; g.beginPath(); g.ellipse(dp.x, dp.y, dp.s * 0.34, dp.s * 0.2, 0, 0, TAU); g.fill(); g.strokeStyle = '#e8b04b'; g.lineWidth = Math.max(0.8, dp.s * 0.03); g.stroke(); } }
        if (m.role === 'singer') { var ms = P(m.x - 0.25, y, bz - 0.35), mt = P(m.x - 0.25, y + 1.45, bz - 0.35); if (ms && mt) { g.strokeStyle = '#1a1a1a'; g.lineWidth = Math.max(0.8, ms.s * 0.03); g.beginPath(); g.moveTo(ms.x, ms.y); g.lineTo(mt.x, mt.y); g.stroke(); } }
      });
    }
    function speakerPole(x, z, h) {
      var b = P(x, 0, z), t0 = P(x, h, z); if (!b || !t0) return;
      g.strokeStyle = '#1f1914'; g.lineWidth = Math.max(1, b.s * 0.12); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(t0.x, t0.y); g.stroke();
      fillPoly([[x - 0.45, h, z], [x + 0.45, h, z], [x + 0.45, h + 1.2, z], [x - 0.45, h + 1.2, z]], '#0b0909');
      var cone = P(x, h + 0.6, z - 0.01); if (cone) { g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.beginPath(); g.arc(cone.x, cone.y, cone.s * 0.3, 0, TAU); g.stroke(); }
    }
    // Chhatris: mirror-work umbrellas hung over the circles, turning slowly
    function chhatri(x, y, z, t, i) {
      var top = P(x, y + 2.2, z), c = P(x, y, z); if (!top || !c || c.z < 4) return;
      var r = Math.min(40, c.s * 1.1), ry = r * Math.max(0.18, Math.min(0.5, (cam.y - y) / c.z * 0.9 + 0.25)), rot = reduce ? 0 : t * 0.25 + i;
      g.strokeStyle = 'rgba(90,70,50,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(c.x, c.y - ry * 1.4); g.stroke();
      var cols = [TH.flags[0], '#f6c342', TH.flags[2 % TH.flags.length], '#2f8f5b', TH.flags[1 % TH.flags.length], '#3b4cc0'];
      for (var k = 0; k < 12; k++) {
        var a0 = rot + k / 12 * TAU, a1 = rot + (k + 1) / 12 * TAU;
        g.fillStyle = cols[k % cols.length]; g.beginPath(); g.moveTo(c.x, c.y - ry * 1.4); g.lineTo(c.x + Math.cos(a0) * r, c.y + Math.sin(a0) * ry); g.lineTo(c.x + Math.cos(a1) * r, c.y + Math.sin(a1) * ry); g.closePath(); g.fill();
      }
      for (var m = 0; m < 12; m++) { var am = rot + (m + 0.5) / 12 * TAU, mx = c.x + Math.cos(am) * r * 0.6, my = c.y - ry * 0.45 + Math.sin(am) * ry * 0.55; g.fillStyle = 'rgba(255,250,235,' + (0.55 + 0.4 * Math.sin(t * 3 + m)) + ')'; g.beginPath(); g.arc(mx, my, Math.max(0.6, r * 0.04), 0, TAU); g.fill(); }
      for (var q = 0; q < 12; q++) { var aq = rot + q / 12 * TAU, qx = c.x + Math.cos(aq) * r, qy = c.y + Math.sin(aq) * ry; if (Math.sin(aq) < -0.3) continue; g.strokeStyle = cols[(q + 2) % cols.length]; g.lineWidth = Math.max(0.7, r * 0.04); g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx, qy + r * 0.28); g.stroke(); g.fillStyle = '#e8b04b'; g.beginPath(); g.arc(qx, qy + r * 0.3, Math.max(0.6, r * 0.035), 0, TAU); g.fill(); }
    }
    function chhatris(y, t) { for (var i = 0; i < 6; i++) { var a = i / 6 * TAU + 0.3; chhatri(Math.cos(a) * 8.5, y, 4 + Math.sin(a) * 8.5, t, i); } }
    function outdoorsOver(t) {
      chhatris(7.2, t);
      // Poles with strings of bulbs and bunting crossing the ground
      var zs = [-10, 5, 20, 35], X = 24, h = 7.4;
      zs.forEach(function (z) { [-X, X].forEach(function (x) { var b = P(x, 0, z), tp = P(x, h, z); if (b && tp) { g.strokeStyle = '#22180f'; g.lineWidth = Math.max(1, b.s * 0.12); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(tp.x, tp.y); g.stroke(); } }); });
      var strands = [];
      zs.forEach(function (z, i) { strands.push([[-X, h, z], [X, h, z], i % 2 ? 'flags' : 'bulbs']); if (i < zs.length - 1) { strands.push([[-X, h, z], [X, h, zs[i + 1]], 'bulbs']); strands.push([[X, h, z], [-X, h, zs[i + 1]], 'bulbs']); } });
      strands.sort(function (a, b) { return (b[0][2] + b[1][2]) - (a[0][2] + a[1][2]); });
      strands.forEach(function (s, si) { drawStrand(s[0], s[1], 1.5, s[2], t, si); });
    }
    function drawStrand(a, b, drop, kind, t, seed) {
      var len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.round(len / (kind === 'flags' ? 0.9 : 1.25));
      g.strokeStyle = 'rgba(70,52,36,.7)'; g.lineWidth = 0.8; g.beginPath(); var st0 = false;
      for (var i = 0; i <= 30; i++) { var q = sag(a, b, drop, i / 30), p = P(q[0], q[1], q[2]); if (!p) { st0 = false; continue; } if (st0) g.lineTo(p.x, p.y); else { g.moveTo(p.x, p.y); st0 = true; } }
      g.stroke();
      for (var j = 1; j < n; j++) {
        var qq = sag(a, b, drop, j / n), pp = P(qq[0], qq[1], qq[2]); if (!pp || pp.y < -20 || pp.x < -20 || pp.x > W + 20) continue;
        if (kind === 'flags') { var fs = Math.min(9, pp.s * 0.35); g.fillStyle = TH.flags[(j + seed) % TH.flags.length]; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(pp.x - fs, pp.y); g.lineTo(pp.x + fs, pp.y); g.lineTo(pp.x, pp.y + fs * 1.6); g.closePath(); g.fill(); g.globalAlpha = 1; }
        else { var tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(t * 2.6 + j * 1.7 + seed); glow(pp.x, pp.y + 1, Math.min(3.2, Math.max(0.9, pp.s * 0.09)), TH.bulbs[(j + seed) % TH.bulbs.length], (tw + pulse * 0.25) * bright); }
      }
    }
    function lantern(x, y, z, col, t, i) {
      var sw = reduce ? 0 : Math.sin(t * 1.3 + i) * 0.12, top = P(x, y + 1, z), p = P(x + sw, y, z); if (!p || !top) return;
      g.strokeStyle = 'rgba(80,60,40,.6)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(p.x, p.y); g.stroke();
      if (p.z < 5) return;
      var r = Math.min(10, p.s * 0.32); glow(p.x, p.y + r, r * 0.9, col, 0.55 * bright + pulse * 0.1);
      g.fillStyle = col; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + r, p.y + r * 0.8); g.lineTo(p.x + r * 0.7, p.y + r * 2); g.lineTo(p.x - r * 0.7, p.y + r * 2); g.lineTo(p.x - r, p.y + r * 0.8); g.closePath(); g.fill();
      g.fillStyle = '#d6b06f'; g.fillRect(p.x - r * 0.1, p.y + r * 2, r * 0.2, r * 0.7); g.globalAlpha = 1;
    }

    function stadiumBack(t) {
      var L = layout('stadium'), i;
      // Wooden floor boards running away from you
      g.strokeStyle = 'rgba(255,220,170,.035)'; g.lineWidth = 1;
      for (var fx = -24; fx <= 24; fx += 1.6) { var f0 = P(fx, 0, Math.max(cam.z + 1.5, -14)), f1 = P(fx, 0, 42); if (f0 && f1) { g.beginPath(); g.moveTo(f0.x, f0.y); g.lineTo(f1.x, f1.y); g.stroke(); } }
      // Roof, risers and the seated crowd only change when the camera moves, so they are cached while the view is still
      standsLayer(L);
      // LED ribbon along the front of the stands
      var hue = TH.hues[0];
      [[[-28, 0.2, 41.9], [28, 0.2, 41.9]], [[-24.9, 0.2, -34], [-24.9, 0.2, 41.9]], [[24.9, 0.2, -34], [24.9, 0.2, 41.9]]].forEach(function (seg, si) {
        var a0 = seg[0], b0 = seg[1];
        if (poly([[a0[0], 0.2, a0[2]], [b0[0], 0.2, b0[2]], [b0[0], 1.2, b0[2]], [a0[0], 1.2, a0[2]]])) {
          var pa = P(a0[0], 0.7, Math.max(a0[2], cam.z + 1)), pb = P(b0[0], 0.7, b0[2]);
          if (pa && pb) { var lg = g.createLinearGradient(pa.x, pa.y, pb.x, pb.y); for (var k = 0; k <= 5; k++) lg.addColorStop(k / 5, 'hsl(' + (TH.hues[(k + si) % TH.hues.length] + 20 * Math.sin(t * TH.speed + k)) + ',' + TH.sat + '%,' + (30 + 12 * bright + 8 * pulse) + '%)'); g.fillStyle = lg; g.fill(); }
        }
      });
      // Phone lights twinkle over the cached crowd
      for (i = 0; i < L.stands.length; i++) {
        var pp = L.stands[i]; if (pp.p < 0 || !st.on || Math.sin(t * 1.7 + pp.p) <= 0.55) continue;
        var p = pp.side === 0 ? P(pp.u, 1.3 + pp.row * 0.95 + 0.35, 42 + pp.row * 1.5 + 0.4) : P(pp.side * (25 + pp.row * 1.5 + 0.4), 1.3 + pp.row * 0.95 + 0.35, pp.u);
        if (!p || p.x < -4 || p.x > W + 4) continue;
        var sz = Math.max(1, p.s * 0.34); glow(p.x, p.y - sz, Math.max(0.8, sz * 0.4), '#f4f7ff', 0.9);
      }
      stage({ x0: -8, x1: 8, z: 35.5, h: 1.4, screenTop: 6.8, truss: 8.4, arrays: 10 }, t, 'stadium');
      // Banners hanging over the stands, exit signs by the aisles, and big screens up in the corners
      [-1, 1].forEach(function (sd) {
        for (var bz = -24; bz <= 36; bz += 10) {
          var bx = sd * 25.1, col = TH.flags[((bz + 40) / 10 + (sd > 0 ? 1 : 0)) % TH.flags.length];
          fillPoly([[bx, 5.5, bz - 1.1], [bx, 5.5, bz + 1.1], [bx, 2.4, bz + 1.1], [bx, 1.8, bz], [bx, 2.4, bz - 1.1]], col);
          fillPoly([[bx - sd * 0.01, 5.1, bz - 0.8], [bx - sd * 0.01, 5.1, bz + 0.8], [bx - sd * 0.01, 4.9, bz + 0.8], [bx - sd * 0.01, 4.9, bz - 0.8]], '#e8b04b');
          var ex = P(sd * 25.05, 1.9, bz + 5); if (ex) { var es = Math.max(2, ex.s * 0.5); g.fillStyle = '#1f8f4b'; g.fillRect(ex.x - es / 2, ex.y - es * 0.3, es, es * 0.6); }
        }
        if (poly([[sd * 34, 11, 44], [sd * 22, 11, 44], [sd * 22, 17, 44], [sd * 34, 17, 44]])) {
          var sc = P(sd * 28, 14, 44), sw = P(sd * 34, 14, 44);
          var lg = g.createLinearGradient(sw.x, 0, sc.x, 0); lg.addColorStop(0, 'hsl(' + TH.hues[0] + ',' + TH.sat + '%,' + (14 + 6 * bright) + '%)'); lg.addColorStop(1, 'hsl(' + TH.hues[TH.hues.length - 1] + ',' + TH.sat + '%,' + (20 + 10 * pulse) + '%)');
          g.fillStyle = lg; g.fill();
          if (sc) { g.strokeStyle = 'rgba(255,236,200,' + (0.25 + 0.3 * pulse) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(sc.x, sc.y, sc.s * 1.8, 0, TAU); g.stroke(); }
        }
      });
    }
    var standsCache = null, standsKey = '';
    function standsLayer(L) {
      var settled = camSettled;
      var key = [W, H, BX, BY, BW, BH, cam.x.toFixed(2), cam.y.toFixed(2), cam.z.toFixed(2), st.density.toFixed(2)].join('|');
      if (settled && standsCache && standsKey === key) { g.drawImage(standsCache, 0, 0, W, H); return; }
      if (!settled) { drawStands(L); return; }
      standsCache = standsCache || document.createElement('canvas');
      standsCache.width = canvas.width; standsCache.height = canvas.height;
      var live = g, cg = standsCache.getContext('2d'); cg.setTransform(DPR, 0, 0, DPR, 0, 0); cg.clearRect(0, 0, W, H);
      g = cg; drawStands(L); g = live; standsKey = key;
      g.drawImage(standsCache, 0, 0, W, H);
    }
    function drawStands(L) {
      // Roof trusses
      g.strokeStyle = 'rgba(140,125,160,.18)'; g.lineWidth = 1;
      for (var z = -30; z <= 60; z += 10) { var a = P(-40, 22, z), b = P(40, 22, z); if (a && b) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
      for (var x = -40; x <= 40; x += 10) { var a2 = P(x, 22, 60), b2 = P(x, 22, Math.max(cam.z + 1, -30)); if (a2 && b2) { g.beginPath(); g.moveTo(a2.x, a2.y); g.lineTo(b2.x, b2.y); g.stroke(); } }
      // Stands: risers first, far end then sides
      for (var row = 10; row >= 0; row--) {
        var zf = 42 + row * 1.5, yf = 1.3 + row * 0.95;
        fillPoly([[-28, yf - 0.95, zf], [28, yf - 0.95, zf], [28, yf, zf], [-28, yf, zf]], 'rgb(' + (26 + row) + ',' + (22 + row) + ',' + (34 + row) + ')');
      }
      [-1, 1].forEach(function (s) {
        for (var row = 8; row >= 0; row--) { var xr = s * (25 + row * 1.5), y = 1.3 + row * 0.95; fillPoly([[xr, y - 0.95, -34], [xr, y - 0.95, 42], [xr, y, 42], [xr, y, -34]], 'rgb(' + (22 + row) + ',' + (19 + row) + ',' + (30 + row) + ')'); }
      });
      var cols = ['#c9a37a', '#b76b5a', '#8f7aa8', '#d4b58c', '#6c8fa3', '#caa0b8'];
      for (var i = 0; i < L.stands.length; i++) {
        var pp = L.stands[i], p;
        if (pp.c / 6 + (i % 7) / 42 > 0.25 + st.density) continue;
        if (pp.side === 0) p = P(pp.u, 1.3 + pp.row * 0.95 + 0.35, 42 + pp.row * 1.5 + 0.4);
        else p = P(pp.side * (25 + pp.row * 1.5 + 0.4), 1.3 + pp.row * 0.95 + 0.35, pp.u);
        if (!p || p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H) continue;
        var sz = Math.max(1, p.s * 0.34);
        g.fillStyle = cols[pp.c]; g.globalAlpha = 0.75; g.fillRect(p.x - sz / 2, p.y - sz, sz, sz); g.globalAlpha = 1;
      }
    }
    function stadiumOver(t) {
      chhatris(8.2, t);
      // Marigold curtains falling from the truss either side of the stage
      [-1, 1].forEach(function (sd) {
        for (var k = 0; k < 6; k++) {
          var x = sd * (9.2 + k * 0.35), a = P(x, 8.2, 35.2 - k * 0.05), b = P(x, 2.4, 35.2 - k * 0.05); if (!a || !b) continue;
          var dot = Math.max(1.2, a.s * 0.14), gap = Math.max(1, a.s * 0.18);
          g.lineCap = 'round'; g.lineWidth = dot;
          g.setLineDash([0.01, gap + dot]); g.strokeStyle = '#f29a2e'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
          g.lineDashOffset = -(gap + dot) / 2; g.strokeStyle = '#f6c342'; g.stroke();
          g.setLineDash([]); g.lineDashOffset = 0;
        }
      });
      // Bunting across the hall, then hanging lanterns, then moving spotlights
      [2, 18, 32].forEach(function (z, i) { drawStrand([-24, 11, z], [24, 11, z], 1.6, 'flags', t, i); });
      var lc = ['#ff9f5a', '#ff6fa3', '#7fe0a0', '#ffd58a'], n = 0;
      [34, 22, 10, -2].forEach(function (z) { [-15, -5, 5, 15].forEach(function (x) { lantern(x, 9.5 + (n % 2) * 0.8, z, lc[n % 4], t, n); n++; }); });
      g.save(); g.globalCompositeOperation = 'lighter';
      var heads = [[-18, 0], [-6, 0], [6, 0], [18, 0], [-12, 22], [12, 22]], bc = heads.map(function (h0, i0) { return TH.beams[i0 % TH.beams.length]; });
      heads.forEach(function (h, i) {
        var hp = P(h[0], 20, h[1]); if (!hp) return;
        var tt = reduce ? 0 : t * TH.speed / 0.3, tx = h[0] * 0.4 + Math.sin(tt * 0.35 + i * 1.9) * 9, tz = h[1] + Math.cos(tt * 0.27 + i) * 9;
        var fp = P(tx, 0, tz); if (!fp) return;
        var spread = fp.s * 2.4;
        var gr = g.createLinearGradient(hp.x, hp.y, fp.x, fp.y); var nearFade = Math.min(1, hp.z / 25); gr.addColorStop(0, 'rgba(' + bc[i] + ',' + 0.2 * bright * nearFade + ')'); gr.addColorStop(1, 'rgba(' + bc[i] + ',' + 0.05 * bright * nearFade + ')');
        g.fillStyle = gr; g.beginPath(); g.moveTo(hp.x - 2, hp.y); g.lineTo(hp.x + 2, hp.y); g.lineTo(fp.x + spread, fp.y); g.lineTo(fp.x - spread, fp.y); g.closePath(); g.fill();
        g.fillStyle = 'rgba(' + bc[i] + ',' + 0.12 * bright + ')'; g.beginPath(); g.ellipse(fp.x, fp.y, spread, spread * 0.3, 0, 0, TAU); g.fill();
        glow(hp.x, hp.y, 2, 'rgb(' + bc[i] + ')', 0.9);
      });
      g.restore();
    }

    var layerCache = {};
    function cachedLayer(name, draw) {
      var settled = camSettled;
      var key = [W, H, BX, BY, BW, BH, cam.x.toFixed(2), cam.y.toFixed(2), cam.z.toFixed(2)].join('|'), c = layerCache[name];
      if (settled && c && c.key === key) { g.drawImage(c.cv, 0, 0, W, H); return; }
      if (!settled) { draw(true); return; }
      c = layerCache[name] = layerCache[name] || { cv: document.createElement('canvas') };
      c.cv.width = canvas.width; c.cv.height = canvas.height;
      var live = g, cg = c.cv.getContext('2d'); cg.setTransform(DPR, 0, 0, DPR, 0, 0); cg.clearRect(0, 0, W, H);
      g = cg; draw(false); g = live; c.key = key; g.drawImage(c.cv, 0, 0, W, H);
    }
    function drawPaving(quick) {
      var r3 = seeded(5), z0 = Math.max(Math.floor(cam.z + 1.5), -24);
      for (var z = z0; z < 72; z += 1.3) {
        var off = (Math.round(z / 1.3) % 2) * 0.6;
        for (var x = -7 + off; x < 7; x += 1.2) {
          var tone = 30 + Math.floor(r3() * 14), x1 = Math.min(7, x + 1.14), xa = Math.max(-7, x);
          if (quick && (Math.round(z) % 3)) continue;
          fillPoly([[xa, 0, z], [x1, 0, z], [x1, 0, z + 1.24], [xa, 0, z + 1.24]], 'rgb(' + (tone + 8) + ',' + (tone - 2) + ',' + (tone - 10) + ')');
        }
      }
      // A worn, slightly glossy strip down the middle where most feet go
      var m0 = P(0, 0, z0 + 1), m1 = P(0, 0, 72); if (m0 && m1) { var gr = g.createLinearGradient(0, m1.y, 0, m0.y); gr.addColorStop(0, 'rgba(255,210,150,0)'); gr.addColorStop(1, 'rgba(255,210,150,.06)'); if (poly([[-2.4, 0.005, z0 + 1], [2.4, 0.005, z0 + 1], [1.2, 0.005, 72], [-1.2, 0.005, 72]])) { g.fillStyle = gr; g.fill(); } }
    }
    function sheriBack(t) {
      var L = layout('sheri');
      // Stone paving: laid in courses, each stone a slightly different tone, kept as an image while the view is still
      cachedLayer('sheriPaving', drawPaving);
      [-1, 1].forEach(function (sd) {
        fillPoly([[sd * 7.2, 0.01, Math.max(cam.z + 1, -40)], [sd * 6.9, 0.01, Math.max(cam.z + 1, -40)], [sd * 6.9, 0.01, 72], [sd * 7.2, 0.01, 72]], 'rgba(0,0,0,.35)');
        fillPoly([[sd * 7.25, 0, Math.max(cam.z + 1, -40)], [sd * 7.25, 0.45, Math.max(cam.z + 1, -40)], [sd * 7.25, 0.45, 72], [sd * 7.25, 0, 72]], '#3a3040');
      });
      // A temple spire rising behind the end of the lane, outlined in bulbs
      var sb = P(0, 12, 78), st2 = P(0, 22, 78), sw0 = P(3.2, 12, 78);
      if (sb && st2 && sw0) {
        var hw = sw0.x - sb.x;
        g.fillStyle = '#231a2c'; g.beginPath(); g.moveTo(sb.x - hw, sb.y); g.bezierCurveTo(sb.x - hw * 0.95, sb.y - (sb.y - st2.y) * 0.6, sb.x - hw * 0.35, st2.y + (sb.y - st2.y) * 0.1, sb.x, st2.y); g.bezierCurveTo(sb.x + hw * 0.35, st2.y + (sb.y - st2.y) * 0.1, sb.x + hw * 0.95, sb.y - (sb.y - st2.y) * 0.6, sb.x + hw, sb.y); g.closePath(); g.fill();
        for (var tb = 0; tb <= 14; tb++) { var u = tb / 14, bx2 = sb.x - hw + hw * 2 * u, by2 = sb.y - (sb.y - st2.y) * Math.sin(u * Math.PI) * 0.98; glow(bx2, by2, Math.max(0.6, sb.s * 0.06), TH.bulbs[tb % TH.bulbs.length], 0.8 * bright); }
        g.strokeStyle = '#3a2413'; g.lineWidth = 1; g.beginPath(); g.moveTo(sb.x, st2.y); g.lineTo(sb.x, st2.y - sb.s * 1.6); g.stroke();
        g.fillStyle = '#d8453a'; g.beginPath(); g.moveTo(sb.x, st2.y - sb.s * 1.6); g.lineTo(sb.x + sb.s * 1.1, st2.y - sb.s * 1.3 + (reduce ? 0 : Math.sin(t * 4) * sb.s * 0.1)); g.lineTo(sb.x, st2.y - sb.s * 1.0); g.fill();
      }
      // House at the end of the lane with a small shrine
      fillPoly([[-8.2, 0, 72], [8.2, 0, 72], [8.2, 12, 72], [-8.2, 12, 72]], '#2c2338');
      var sh = P(0, 0, 71.8);
      if (sh) {
        var sw = sh.s * 1.3, shh = sh.s * 2.7;
        glow(sh.x, sh.y - shh * 0.5, sw * 0.8, '#ff9a4a', 0.45 * bright);
        g.fillStyle = '#7a1a14'; g.beginPath(); g.moveTo(sh.x - sw, sh.y); g.lineTo(sh.x - sw, sh.y - shh * 0.7); g.quadraticCurveTo(sh.x, sh.y - shh * 1.25, sh.x + sw, sh.y - shh * 0.7); g.lineTo(sh.x + sw, sh.y); g.closePath(); g.fill();
        g.strokeStyle = '#e8b04b'; g.lineWidth = Math.max(1, sh.s * 0.12); g.stroke();
        for (var d = 0; d < 5; d++) glow(sh.x + (d - 2) * sw * 0.4, sh.y - sh.s * 0.2, Math.max(0.8, sh.s * 0.08), '#ffcf7a', 0.9);
        for (var wv = 0; wv < 4; wv++) { var wp = P(-6 + wv * 4, 7.5, 71.8); if (wp) { g.fillStyle = wv % 2 ? 'rgba(255,190,100,.6)' : 'rgba(40,30,60,.9)'; g.fillRect(wp.x - wp.s * 0.5, wp.y - wp.s * 0.8, wp.s, wp.s * 1.6); } }
      }
      // House fronts on both sides, far to near
      var hs = L.houses.slice().sort(function (a, b) { return b.z1 - a.z1; });
      hs.forEach(function (h) { house(h, t); });
      // Street lamps on brackets, each throwing a pool of warm light
      for (var lz = 62; lz >= -20; lz -= 14) [-1, 1].forEach(function (sd, k) {
        var z0 = lz + k * 7, arm0 = P(sd * 8, 5.2, z0), arm1 = P(sd * 6.6, 5.2, z0), pool = P(sd * 5.8, 0, z0);
        if (pool) { var pr = pool.s * 4, pg = g.createRadialGradient(pool.x, pool.y, 1, pool.x, pool.y, pr); pg.addColorStop(0, 'rgba(255,200,130,' + 0.16 * bright + ')'); pg.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = pg; g.beginPath(); g.ellipse(pool.x, pool.y, pr, pr * 0.3, 0, 0, TAU); g.fill(); }
        if (arm0 && arm1) { g.strokeStyle = '#1b1510'; g.lineWidth = Math.max(1, arm0.s * 0.08); g.beginPath(); g.moveTo(arm0.x, arm0.y); g.lineTo(arm1.x, arm1.y); g.stroke(); glow(arm1.x, arm1.y + 2, Math.max(1, Math.min(4, arm1.s * 0.14)), '#ffd9a0', bright); }
      });
      // Musicians by the shrine, with a speaker on a stand each side
      [-4.6, 4.6].forEach(function (x) { speakerPole(x, 64, 1.8); });
      // A low wooden takht for the musicians by the shrine
      fillPoly([[-3.4, 0, 63.9], [3.4, 0, 63.9], [3.4, 0.6, 63.9], [-3.4, 0.6, 63.9]], '#4a2a16');
      fillPoly([[-3.4, 0.6, 63.9], [3.4, 0.6, 63.9], [3.4, 0.6, 66], [-3.4, 0.6, 66]], '#6b3f1f');
      fillPoly([[-3.4, 0.45, 63.88], [3.4, 0.45, 63.88], [3.4, 0.6, 63.88], [-3.4, 0.6, 63.88]], '#9b1f1a');
      bandOn('sheri', 0.6, 64.5, { x0: -3.2, x1: 3.2 });
    }
    function house(h, t) {
      var X = h.side * 8;
      if (h.z2 < cam.z + NEAR) return;
      if (!poly([[X, 0, h.z1], [X, h.h, h.z1], [X, h.h, h.z2], [X, 0, h.z2]])) return;
      g.fillStyle = h.col; g.fill();
      g.fillStyle = 'rgba(0,0,0,' + (0.25 + 0.2 * (h.side > 0 ? 1 : 0)) + ')'; g.fill();
      // Cornice line
      fillPoly([[X, h.h - 0.4, h.z1], [X, h.h, h.z1], [X, h.h, h.z2], [X, h.h - 0.4, h.z2]], 'rgba(214,176,111,.18)');
      var w = h.z2 - h.z1, cols = Math.max(2, Math.round(w / 2.2)), f, c;
      for (f = 0; f < h.floors; f++) {
        var y0 = 0.9 + f * 3.1;
        for (c = 0; c < cols; c++) {
          var zc = h.z1 + w * (c + 0.5) / cols, door = f === 0 && c === Math.floor(cols / 2);
          var ww = door ? 0.75 : 0.5, wh = door ? 2.3 : 1.5, yb = door ? 0 : y0;
          var lit = ((h.lit * 10 + f * 3 + c) % 3) < 1.6;
          if (door) archWindow(X, yb, zc, ww + 0.14, wh + 0.16, '#7a4a22');
          archWindow(X, yb, zc, ww, wh, door ? '#3a1f12' : lit ? 'rgba(255,186,96,.8)' : 'rgba(22,16,34,.95)');
          if (!door && f > 0) [-1, 1].forEach(function (sd2) { fillPoly([[X - h.side * 0.02, yb, zc + sd2 * ww], [X - h.side * 0.02, yb, zc + sd2 * (ww + 0.34)], [X - h.side * 0.02, yb + wh * 0.72, zc + sd2 * (ww + 0.34)], [X - h.side * 0.02, yb + wh * 0.72, zc + sd2 * ww]], ['#2f5d4a', '#3a4f7a', '#6b3a1c'][h.hue % 3]); });
          if (door) {
            // Toran over the door and marigold strands
            for (var k = 0; k < 7; k++) { var tp = P(X, 2.7, zc - 0.9 + k * 0.3); if (tp) { var fs = tp.s * 0.12; g.fillStyle = ['#f08a24', '#2f8f5b', '#c2185b', '#ffc861'][k % 4]; g.beginPath(); g.moveTo(tp.x - fs, tp.y); g.lineTo(tp.x + fs, tp.y); g.lineTo(tp.x, tp.y + fs * 2); g.closePath(); g.fill(); } }
            [-1, 1].forEach(function (s) { var a = P(X, 2.6, zc + s * 0.85), b = P(X, 0.8, zc + s * 0.85); if (a && b) { g.strokeStyle = '#f2a33a'; g.lineWidth = Math.max(1, a.s * 0.1); g.setLineDash([Math.max(1, a.s * 0.08), Math.max(1, a.s * 0.05)]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]); } });
          } else if (lit && f < h.floors) {
            var dp = P(X - h.side * 0.1, yb - 0.05, zc); if (dp) glow(dp.x, dp.y, Math.max(0.7, dp.s * 0.05), '#ffcf7a', (reduce ? 0.8 : 0.6 + 0.4 * Math.sin(t * 7 + zc * 3)) * bright);
          }
        }
        if (f === 1 && h.balcony) fillPoly([[X - h.side * 0.7, y0 - 0.2, h.z1 + 0.6], [X - h.side * 0.7, y0 + 0.7, h.z1 + 0.6], [X - h.side * 0.7, y0 + 0.7, h.z2 - 0.6], [X - h.side * 0.7, y0 - 0.2, h.z2 - 0.6]], 'rgba(120,80,50,.55)');
      }
      if (h.bulbs) for (var cq = h.z1 + 0.6; cq < h.z2 - 0.3; cq += 1.1) for (var cy2 = h.h - 0.8; cy2 > 1.2; cy2 -= 0.9) { var cp = P(X - h.side * 0.05, cy2, cq); if (cp && cp.x > -10 && cp.x < W + 10) glow(cp.x, cp.y, Math.min(1.6, Math.max(0.5, cp.s * 0.04)), TH.bulbs[(h.hue + Math.round(cy2)) % TH.bulbs.length], (0.55 + 0.35 * Math.sin(t * 3 + cq + cy2 * 2) + pulse * 0.2) * bright); }
      if (h.bulbs) for (var q = h.z1 + 0.3; q < h.z2; q += 0.7) { var bp = P(X, h.h - 0.1, q); if (bp) glow(bp.x, bp.y, Math.min(2.4, Math.max(0.6, bp.s * 0.06)), TH.bulbs[h.hue % TH.bulbs.length], (0.75 + pulse * 0.25) * bright); }
      if (h.rangoli) { var rp = P(X - h.side * 1.4, 0, (h.z1 + h.z2) / 2); if (rp) rangoli(rp, h.hue); }
      if (h.hue === 3 && h.z2 - h.z1 > 5.5) {
        // A small kariyana shop: a painted board over the shutter
        var zm = (h.z1 + h.z2) / 2 + 1.4;
        fillPoly([[X - h.side * 0.03, 2.55, zm - 1.3], [X - h.side * 0.03, 2.55, zm + 1.3], [X - h.side * 0.03, 3.15, zm + 1.3], [X - h.side * 0.03, 3.15, zm - 1.3]], '#b8312b');
        var tp2 = P(X - h.side * 0.05, 2.85, zm); if (tp2 && tp2.s > 6) { var fs2 = Math.min(13, tp2.s * 0.32); g.font = '700 ' + fs2 + 'px "Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, "Anek Gujarati", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe9b8'; g.fillText('કરિયાણા', tp2.x, tp2.y + fs2 * 0.35); }
      }
      if (h.hue % 2 === 0) { var tz = (h.z1 + h.z2) / 2, tk = P(X + h.side * 1.4, h.h, tz), tk2 = P(X + h.side * 1.4, h.h + 1.2, tz); if (tk && tk2) { var tw2 = Math.max(2, tk.s * 0.6); g.fillStyle = '#16141a'; g.fillRect(tk.x - tw2 / 2, tk2.y, tw2, tk.y - tk2.y); g.fillStyle = '#1f1d24'; g.beginPath(); g.ellipse(tk.x, tk2.y, tw2 / 2, tw2 * 0.12, 0, 0, TAU); g.fill(); } }
      if (h.hue % 3 === 1) { var az = h.z1 + 1, a0 = P(X + h.side * 0.5, h.h, az), a1 = P(X + h.side * 0.5, h.h + 1.6, az); if (a0 && a1) { g.strokeStyle = 'rgba(30,26,34,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.moveTo(a1.x - a1.s * 0.4, a1.y + a1.s * 0.2); g.lineTo(a1.x + a1.s * 0.4, a1.y + a1.s * 0.2); g.stroke(); } }
    }
    function archWindow(X, y, z, hw, hh, col) {
      var a = P(X, y, z - hw), b = P(X, y, z + hw), c = P(X, y + hh * 0.7, z + hw), d = P(X, y + hh * 0.7, z - hw), top = P(X, y + hh * 1.12, z);
      if (!a || !b || !c || !d || !top) return;
      g.fillStyle = col; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(d.x, d.y); g.quadraticCurveTo(top.x, top.y, c.x, c.y); g.lineTo(b.x, b.y); g.closePath(); g.fill();
    }
    function rangoli(p, hue) {
      var r = p.s * 0.8, cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8e44ad', '#ff6fa3'];
      for (var k = 3; k >= 1; k--) { g.fillStyle = cols[(hue + k) % cols.length]; g.globalAlpha = 0.65; g.beginPath(); g.ellipse(p.x, p.y, r * k / 3, r * k / 3 * 0.28, 0, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    function sheriOver(t) {
      // Electric wires sagging across and along the lane
      g.strokeStyle = 'rgba(12,10,14,.75)'; g.lineWidth = 0.8;
      [[-8, 9, 6, 8, 8.5, 20], [-8, 8.2, 26, 8, 9, 14], [-8, 9.2, 40, 8, 8, 48], [-8, 8.6, 2, 8, 8.8, -4], [-7.8, 9.4, -6, -7.8, 9.4, 60], [7.8, 9, -6, 7.8, 9, 60]].forEach(function (wv) {
        var st0 = false; g.beginPath();
        for (var i = 0; i <= 24; i++) { var q = sag([wv[0], wv[1], wv[2]], [wv[3], wv[4], wv[5]], 0.6, i / 24), pq = P(q[0], q[1], q[2]); if (!pq) { st0 = false; continue; } if (st0) g.lineTo(pq.x, pq.y); else { g.moveTo(pq.x, pq.y); st0 = true; } }
        g.stroke();
      });
      // Fabric canopies (chandarvo) across the lane, printed in triangles
      [12, 21, 34].forEach(function (z, ci) {
        var cols = [TH.flags[ci % TH.flags.length], '#f6c342', '#2f8f5b', '#b8312b'];
        for (var k = 0; k < 10; k++) {
          var u0 = k / 10, u1 = (k + 1) / 10, a = sag([-8, 7.6, z], [8, 7.6, z], 0.9, u0), b = sag([-8, 7.6, z], [8, 7.6, z], 0.9, u1);
          fillPoly([[a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1] - 0.2, b[2] + 1.6], [a[0], a[1] - 0.2, a[2] + 1.6]], cols[k % cols.length]);
          var tq = P((a[0] + b[0]) / 2, a[1] - 0.05, a[2]); if (tq) { var fs3 = Math.max(1, tq.s * 0.18); g.fillStyle = cols[(k + 1) % cols.length]; g.beginPath(); g.moveTo(tq.x - fs3, tq.y); g.lineTo(tq.x + fs3, tq.y); g.lineTo(tq.x, tq.y + fs3 * 1.6); g.fill(); }
        }
      });
      var zs = [60, 50, 41, 32, 24, 16, 8, 0, -8], lc = ['#ff9f5a', '#ff6fa3', '#7fe0a0', '#ffd58a'];
      zs.forEach(function (z, i) {
        if (i % 3 === 0) { drawStrand([-8, 6.8, z], [8, 6.8, z + 2], 1.1, 'bulbs', t, i); drawStrand([-8, 6.8, z + 2], [8, 6.8, z], 1.1, 'bulbs', t, i + 3); }
        else drawStrand([-8, 6.4, z], [8, 6.4, z], 1.3, i % 3 === 1 ? 'flags' : 'bulbs', t, i);
        if (i % 2 === 0) lantern(0, 4.4, z + 0.5, lc[i % 4], t, i);
      });
    }

    /* ---------- food stalls ---------- */
    function stall(sl, t) {
      var U = sl.U, V = sl.V, hw = sl.w / 2, D = sl.depth;
      function wpt(u, y, v) { return [sl.x + U[0] * u + V[0] * v, y, sl.z + U[1] * u + V[1] * v]; }
      function at(u, y, v) { var q = wpt(u, y, v); return P(q[0], q[1], q[2]); }
      if (poly([wpt(-hw, 0, D), wpt(hw, 0, D), wpt(hw, 2.4, D), wpt(-hw, 2.4, D)])) { g.fillStyle = '#5a2f17'; g.fill(); g.fillStyle = 'rgba(255,190,110,' + 0.4 * bright + ')'; g.fill(); }
      fillPoly([wpt(-hw, 0, 0), wpt(-hw, 0, D), wpt(-hw, 2.4, D), wpt(-hw, 2.4, 0)], '#32200f');
      fillPoly([wpt(hw, 0, 0), wpt(hw, 0, D), wpt(hw, 2.4, D), wpt(hw, 2.4, 0)], '#32200f');
      var vp = at(0.2, 0, D * 0.55); if (vp) figure(vp, sl.vendor, 0, false, 0);
      fillPoly([wpt(-hw, 0, 0), wpt(hw, 0, 0), wpt(hw, 1, 0), wpt(-hw, 1, 0)], sl.col);
      fillPoly([wpt(-hw, 0.97, 0), wpt(hw, 0.97, 0), wpt(hw, 1.05, -0.25), wpt(-hw, 1.05, -0.25)], '#d9c3a0');
      for (var k = 0; k < 3; k++) { var pot = at(-hw * 0.6 + k * hw * 0.6, 1.05, -0.1); if (pot) { g.fillStyle = ['#c9a37a', '#b5651d', '#e8d5b0'][k]; g.beginPath(); g.ellipse(pot.x, pot.y - pot.s * 0.12, pot.s * 0.18, pot.s * 0.13, 0, 0, TAU); g.fill(); } }
      fillPoly([wpt(-hw - 0.3, 2.75, -0.5), wpt(hw + 0.3, 2.75, -0.5), wpt(hw + 0.3, 2.95, D), wpt(-hw - 0.3, 2.95, D)], 'rgba(40,24,14,.95)');
      var n = 8;
      for (var i = 0; i < n; i++) { var u0 = -hw - 0.3 + (sl.w + 0.6) * i / n, u1 = -hw - 0.3 + (sl.w + 0.6) * (i + 1) / n; fillPoly([wpt(u0, 2.3, -0.5), wpt(u1, 2.3, -0.5), wpt(u1, 2.75, -0.5), wpt(u0, 2.75, -0.5)], i % 2 ? '#efe2c8' : sl.col); }
      for (var bq = 0; bq <= 6; bq++) { var bp = at(-hw + sl.w * bq / 6, 2.24, -0.5); if (bp) glow(bp.x, bp.y, Math.min(3, Math.max(0.8, bp.s * 0.06)), TH.bulbs[bq % TH.bulbs.length], (0.8 + pulse * 0.2) * bright); }
      var sp = at(0, 3.3, -0.5);
      if (sp) {
        var fs = Math.min(14, sp.s * 0.4);
        if (fs >= 6) {
          g.font = '700 ' + fs + 'px "Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, "Anek Gujarati", system-ui, sans-serif'; g.textAlign = 'center';
          var tw = g.measureText(sl.sign).width + fs, fe = fs * 0.55;
          g.fillStyle = 'rgba(24,12,6,.9)'; roundRect(sp.x - tw / 2, sp.y - fs * 1.05, tw, fs * 1.55 + (fe >= 6 ? fe : 0), fs * 0.3); g.fill();
          g.strokeStyle = sl.col; g.lineWidth = 1; g.stroke();
          g.fillStyle = '#ffd58a'; g.fillText(sl.sign, sp.x, sp.y + fs * 0.12);
          if (fe >= 6) { g.font = '600 ' + fe + 'px system-ui, sans-serif'; g.fillStyle = 'rgba(255,230,190,.75)'; g.fillText(sl.en, sp.x, sp.y + fs * 0.12 + fe * 1.15); }
        }
      }
    }

    /* ---------- the mandvi: a small decorated canopy over the central garbo ---------- */
    function mandvi(ctr, part, t) {
      var small = st.venue === 'sheri', cx = ctr.x, cz = ctr.z, r = small ? 0.78 : 1.0, top = small ? 2.4 : 2.85, posts = [[-r, -r], [r, -r], [r, r], [-r, r]];
      // Carved pillars in red and gold bands, front pair drawn after the garbo
      posts.forEach(function (q) {
        var front = q[1] < 0; if ((part === 'front') !== front) return;
        for (var sgi = 0; sgi < 6; sgi++) {
          var a = P(cx + q[0], top * sgi / 6, cz + q[1]), b = P(cx + q[0], top * (sgi + 1) / 6, cz + q[1]); if (!a || !b) continue;
          g.strokeStyle = sgi % 2 ? '#e8b04b' : '#8e1b1b'; g.lineWidth = Math.max(1, a.s * (sgi === 0 ? 0.13 : 0.09)); g.lineCap = 'butt'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
      });
      if (part === 'back') {
        // A framed image of the goddess, glowing behind the garbo, draped in red cloth
        var fb = P(cx, 0.55, cz + 0.75), ft = P(cx, 1.55, cz + 0.75);
        if (fb && ft) {
          var fw = (fb.y - ft.y) * 0.72, fh = fb.y - ft.y;
          glow(fb.x, ft.y + fh / 2, fw * 0.6, 'rgba(255,180,90,1)', 0.35 * bright);
          g.fillStyle = '#e8b04b'; g.fillRect(fb.x - fw / 2, ft.y, fw, fh);
          var ig = g.createLinearGradient(0, ft.y, 0, fb.y); ig.addColorStop(0, '#f6c35a'); ig.addColorStop(1, '#c0392b');
          g.fillStyle = ig; g.fillRect(fb.x - fw * 0.4, ft.y + fh * 0.08, fw * 0.8, fh * 0.84);
          g.fillStyle = 'rgba(255,240,200,.7)'; g.beginPath(); g.arc(fb.x, ft.y + fh * 0.38, fw * 0.22, 0, TAU); g.fill();
          g.fillStyle = '#9b1f1a'; g.beginPath(); g.moveTo(fb.x - fw * 0.6, ft.y); g.quadraticCurveTo(fb.x, ft.y + fh * 0.25, fb.x + fw * 0.6, ft.y); g.lineTo(fb.x + fw * 0.6, ft.y + fh * 0.5); g.quadraticCurveTo(fb.x + fw * 0.45, ft.y + fh * 0.2, fb.x + fw * 0.35, ft.y + fh * 0.1); g.lineTo(fb.x - fw * 0.35, ft.y + fh * 0.1); g.quadraticCurveTo(fb.x - fw * 0.45, ft.y + fh * 0.2, fb.x - fw * 0.6, ft.y + fh * 0.5); g.closePath(); g.fill();
        }
        return;
      }
      // Marigold garlands swinging between the front pillars and round the sides
      [[[-r, -r], [r, -r]], [[-r, -r], [-r, r]], [[r, -r], [r, r]]].forEach(function (pair, gi) {
        var A = [cx + pair[0][0], top - 0.1, cz + pair[0][1]], B = [cx + pair[1][0], top - 0.1, cz + pair[1][1]];
        for (var k = 0; k <= 12; k++) { var q = sag(A, B, 0.55, k / 12), pp = P(q[0], q[1], q[2]); if (pp) { g.fillStyle = k % 2 ? '#f29a2e' : '#f6c342'; g.beginPath(); g.arc(pp.x, pp.y, Math.max(0.8, pp.s * 0.07), 0, TAU); g.fill(); } }
      });
      // Tiered roof: a scalloped dome, a smaller dome above it, a kalash and a red flag
      var c = P(cx, top, cz), apex = P(cx, top + 0.9, cz), apex2 = P(cx, top + 1.45, cz); if (!c || !apex || !apex2) return;
      var ex = P(cx + r * 1.15, top, cz); var rx = ex ? Math.abs(ex.x - c.x) : c.s * r, ry = rx * Math.max(0.12, (cam.y - top) / Math.max(4, c.z) * 0.9 + 0.08);
      g.fillStyle = '#5a1510'; g.beginPath(); g.ellipse(c.x, c.y, rx, Math.abs(ry), 0, 0, TAU); g.fill();
      function dome(cy, ay, w, c1, c2) { g.beginPath(); g.moveTo(cx0 - w, cy); g.quadraticCurveTo(cx0 - w * 0.25, ay - (cy - ay) * 0.1, cx0, ay); g.quadraticCurveTo(cx0 + w * 0.25, ay - (cy - ay) * 0.1, cx0 + w, cy); g.closePath(); var dg = g.createLinearGradient(0, ay, 0, cy); dg.addColorStop(0, c1); dg.addColorStop(1, c2); g.fillStyle = dg; g.fill(); }
      var cx0 = c.x;
      dome(c.y, apex.y, rx, '#f0c24b', '#9b1f1a');
      g.strokeStyle = 'rgba(255,230,170,.6)'; g.lineWidth = Math.max(0.6, c.s * 0.02);
      for (var rb = -2; rb <= 2; rb++) { g.beginPath(); g.moveTo(cx0 + rb * rx * 0.38, c.y); g.quadraticCurveTo(cx0 + rb * rx * 0.2, apex.y + (c.y - apex.y) * 0.3, cx0, apex.y); g.stroke(); }
      dome(apex.y + (c.y - apex.y) * 0.15, apex2.y, rx * 0.35, '#f6d27a', '#c0392b');
      g.fillStyle = '#e8b04b'; g.beginPath(); g.arc(cx0, apex2.y - c.s * 0.1, Math.max(1, c.s * 0.11), 0, TAU); g.fill();
      var fp0 = apex2.y - c.s * 0.15, fp1 = apex2.y - c.s * 0.75, wave = reduce ? 0 : Math.sin(t * 4) * c.s * 0.06;
      g.strokeStyle = '#3a2413'; g.lineWidth = Math.max(0.7, c.s * 0.025); g.beginPath(); g.moveTo(cx0, fp0); g.lineTo(cx0, fp1); g.stroke();
      g.fillStyle = '#d8453a'; g.beginPath(); g.moveTo(cx0, fp1); g.lineTo(cx0 + c.s * 0.42, fp1 + c.s * 0.12 + wave); g.lineTo(cx0, fp1 + c.s * 0.26); g.closePath(); g.fill();
      // Scalloped edge with bulbs, a toran fringe and small bells
      for (var k = 0; k < 18; k++) {
        var an = k / 18 * TAU, bx = cx0 + Math.cos(an) * rx, by = c.y + Math.sin(an) * Math.abs(ry);
        if (Math.sin(an) > -0.25) {
          var fs = Math.max(1, c.s * 0.1); g.fillStyle = TH.flags[k % TH.flags.length]; g.beginPath(); g.moveTo(bx - fs, by); g.lineTo(bx + fs, by); g.lineTo(bx, by + fs * 1.8); g.closePath(); g.fill();
          if (k % 3 === 0) { g.strokeStyle = '#8a6a2a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by + c.s * 0.35); g.stroke(); g.fillStyle = '#e8b04b'; g.beginPath(); g.arc(bx, by + c.s * 0.4, Math.max(0.8, c.s * 0.05), 0, TAU); g.fill(); }
        }
        glow(bx, by, Math.max(0.7, Math.min(2.2, c.s * 0.05)), TH.bulbs[k % TH.bulbs.length], (0.7 + 0.3 * Math.sin(t * 3 + k) + pulse * 0.2) * bright);
      }
    }
    // Rangoli under the garbo: petals, a ring of dots and a bright centre, laid on the ground in perspective
    function rangoliAt(ctr, t) {
      var cols = [TH.flags[0], '#f4a261', '#2a9d8f', TH.flags[2 % TH.flags.length], '#e9c46a'];
      function blob(pts, col, a) { var first = true; g.beginPath(); for (var i = 0; i < pts.length; i++) { var q = P(pts[i][0], 0.01, pts[i][1]); if (!q) return; if (first) { g.moveTo(q.x, q.y); first = false; } else g.lineTo(q.x, q.y); } g.closePath(); g.globalAlpha = a; g.fillStyle = col; g.fill(); g.globalAlpha = 1; }
      var ring = []; for (var k = 0; k < 24; k++) { var a0 = k / 24 * TAU; ring.push([ctr.x + Math.cos(a0) * 1.6, ctr.z + Math.sin(a0) * 1.6]); }
      blob(ring, '#3a1d12', 0.55);
      for (var pt = 0; pt < 8; pt++) {
        var an = pt / 8 * TAU, pts = [];
        for (var j = 0; j <= 10; j++) { var u = j / 10 * TAU, px = Math.cos(u) * 0.55 + 0.75, pz = Math.sin(u) * 0.24; pts.push([ctr.x + Math.cos(an) * px - Math.sin(an) * pz, ctr.z + Math.sin(an) * px + Math.cos(an) * pz]); }
        blob(pts, cols[pt % cols.length], 0.85);
      }
      var inner = []; for (var m = 0; m < 16; m++) { var a1 = m / 16 * TAU; inner.push([ctr.x + Math.cos(a1) * 0.5, ctr.z + Math.sin(a1) * 0.5]); }
      blob(inner, '#f6c342', 0.9);
      for (var d = 0; d < 20; d++) { var a2 = d / 20 * TAU, q = P(ctr.x + Math.cos(a2) * 1.45, 0.01, ctr.z + Math.sin(a2) * 1.45); if (q) { g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, q.s * 0.04), 0, TAU); g.fill(); } }
      // Diyas round the rangoli, flickering
      for (var dy = 0; dy < 12; dy++) {
        var a3 = (dy + 0.5) / 12 * TAU, qd = P(ctr.x + Math.cos(a3) * 1.85, 0, ctr.z + Math.sin(a3) * 1.85); if (!qd) continue;
        g.fillStyle = '#7a3b1a'; g.beginPath(); g.ellipse(qd.x, qd.y, Math.max(1, qd.s * 0.09), Math.max(0.5, qd.s * 0.035), 0, 0, TAU); g.fill();
        var fl = reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 9 + dy * 1.7);
        glow(qd.x, qd.y - qd.s * 0.07, Math.max(0.6, qd.s * 0.035 * fl), '#ffd27a', (st.on ? 0.95 : 0.6) * fl);
      }
    }

    /* ---------- the garbo ---------- */
    function garbo(p, lit, t, main) {
      var s = p.s, x = p.x, y = p.y, L = 0.45 + 0.55 * lit;
      if (lit > 0.02) { var hr = s * (main ? 2.6 : 2); var hg = g.createRadialGradient(x, y - s * 1.05, 1, x, y - s * 1.05, hr); hg.addColorStop(0, 'rgba(255,180,90,' + 0.42 * lit + ')'); hg.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = hg; g.beginPath(); g.arc(x, y - s * 1.05, hr, 0, TAU); g.fill(); }
      // Low wooden stand draped in a red cloth
      g.fillStyle = '#3b2213'; g.fillRect(x - s * 0.34, y - s * 0.5, s * 0.07, s * 0.5); g.fillRect(x + s * 0.27, y - s * 0.5, s * 0.07, s * 0.5);
      g.fillStyle = '#9b1f1a'; g.beginPath(); g.moveTo(x - s * 0.42, y - s * 0.56); g.lineTo(x + s * 0.42, y - s * 0.56); g.lineTo(x + s * 0.36, y - s * 0.3); g.lineTo(x, y - s * 0.18); g.lineTo(x - s * 0.36, y - s * 0.3); g.closePath(); g.fill();
      g.fillStyle = '#e8b04b'; for (var k = 0; k < 5; k++) g.fillRect(x - s * 0.36 + k * s * 0.18, y - s * 0.3 + (k % 2) * s * 0.05, s * 0.03, s * 0.03);
      // Clay pot
      var cy = y - s * 0.9, r = s * 0.3;
      var body = g.createRadialGradient(x - r * 0.35, cy - r * 0.3, r * 0.1, x, cy, r * 1.2);
      body.addColorStop(0, 'rgb(' + Math.round(205 * L) + ',' + Math.round(110 * L) + ',' + Math.round(58 * L) + ')'); body.addColorStop(1, 'rgb(' + Math.round(96 * L) + ',' + Math.round(40 * L) + ',' + Math.round(20 * L) + ')');
      g.fillStyle = body; g.beginPath(); g.ellipse(x, cy, r, r * 0.92, 0, 0, TAU); g.fill();
      // Perforations: light spills through when lit
      var fl = reduce ? 1 : 0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 7.3);
      g.fillStyle = lit > 0.05 ? 'rgba(255,' + Math.round(210 + 30 * fl) + ',130,' + (0.25 + 0.75 * lit * fl) + ')' : 'rgba(40,16,8,.9)';
      var rows = [[-0.5, 5], [-0.15, 7], [0.2, 7], [0.52, 5]];
      rows.forEach(function (rw, ri) { var yy = cy + rw[0] * r, span = Math.sqrt(1 - rw[0] * rw[0]) * r * 1.6; for (var j = 0; j < rw[1]; j++) { var xx = x - span / 2 + span * (j + 0.5) / rw[1]; g.beginPath(); if (ri % 2) { g.moveTo(xx, yy - r * 0.1); g.lineTo(xx + r * 0.08, yy + r * 0.07); g.lineTo(xx - r * 0.08, yy + r * 0.07); g.closePath(); } else g.arc(xx, yy, r * 0.055, 0, TAU); g.fill(); } });
      // Neck with a marigold garland, then the diya on top
      g.fillStyle = 'rgb(' + Math.round(120 * L) + ',' + Math.round(50 * L) + ',' + Math.round(24 * L) + ')';
      g.beginPath(); g.ellipse(x, cy - r * 0.88, r * 0.42, r * 0.14, 0, 0, TAU); g.fill();
      for (var m = 0; m < 9; m++) { var ma = Math.PI * (m / 8); g.fillStyle = m % 2 ? '#f29a2e' : '#f6c342'; g.beginPath(); g.arc(x - Math.cos(ma) * r * 0.5, cy - r * 0.78 + Math.sin(ma) * r * 0.16, r * 0.075, 0, TAU); g.fill(); }
      g.fillStyle = '#6a2c14'; g.beginPath(); g.ellipse(x, cy - r * 1.02, r * 0.26, r * 0.08, 0, 0, TAU); g.fill();
      if (lit > 0.25) {
        var f = (lit - 0.25) / 0.75, fh = r * (0.55 + (reduce ? 0 : 0.08 * Math.sin(t * 9) + 0.04 * Math.sin(t * 23))) * f, swy = reduce ? 0 : Math.sin(t * 5) * r * 0.04, base = cy - r * 1.05;
        glow(x, base - fh * 0.4, r * 0.18, 'rgba(255,200,110,1)', 0.5 * f);
        g.beginPath(); g.moveTo(x - r * 0.1, base); g.quadraticCurveTo(x - r * 0.12, base - fh * 0.6, x + swy, base - fh); g.quadraticCurveTo(x + r * 0.12, base - fh * 0.6, x + r * 0.1, base); g.closePath();
        var ff = g.createLinearGradient(0, base - fh, 0, base); ff.addColorStop(0, 'rgba(255,244,200,' + f + ')'); ff.addColorStop(0.55, 'rgba(255,190,70,' + f + ')'); ff.addColorStop(1, 'rgba(230,90,30,' + f + ')');
        g.fillStyle = ff; g.fill();
      }
    }

    /* ---------- dancers ---------- */
    function circleCentre(c, T) {
      if (c.parent) return circleCentre(c.parent, T);
      // The garbo and its mandvi stand exactly at the centre; only the smaller circles drift
      if (c.main) return { x: c.x0, z: c.z0 };
      var d = reduce ? 0 : 1;
      return { x: c.x0 + d * 0.7 * Math.sin(T * 0.09 + c.ph[0]), z: c.z0 + d * 0.6 * Math.sin(T * 0.07 + c.ph[1]) };
    }
    function dancerWorld(c, d, T, ctr) {
      var a = d.a0 + c.spin + (reduce ? 0 : 0.06 * Math.sin(T * 0.5 + d.ph2));
      var rr = c.R * (1 + c.wob * (0.07 * Math.sin(2 * a + c.ph[2] + T * 0.15) + 0.045 * Math.sin(3 * a + c.ph[3] - T * 0.11))) + (reduce ? 0 : 0.22 * Math.sin(T * 0.8 + d.ph));
      return { x: ctr.x + Math.cos(a) * rr, z: ctr.z + Math.sin(a) * rr, a: a };
    }
    // Figures are drawn from the feet up in units of their height. near (0 to 1) darkens a figure that passes
    // right in front of the camera into a silhouette, so it frames the view instead of blocking it.
    var SKIN = ['#c99a72', '#b98563', '#d9b48c', '#a8744f', '#c08a60'];
    // Colours are darkened towards shadow (f) and faded into the night haze with distance (FOGF), cached by value
    var tintCache = {}, FOGF = 0;
    function tint(hex, f) {
      if (!f && !FOGF) return hex;
      var q = Math.round((f || 0) * 20), qf = Math.round(FOGF * 20), key = hex + q + '/' + qf, hit = tintCache[key]; if (hit) return hit;
      var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, bb = n & 255, ff = q / 20, fg = qf / 20;
      r = lerp(lerp(r, 16, ff), 26, fg); gg = lerp(lerp(gg, 10, ff), 20, fg); bb = lerp(lerp(bb, 8, ff), 38, fg);
      return (tintCache[key] = 'rgb(' + Math.round(r) + ',' + Math.round(gg) + ',' + Math.round(bb) + ')');
    }
    // Four kinds of dandiya: lacquered spiral stripes, maroon with mirror work, gold gota with a tassel, bright bands
    var STICKS = [
      { bands: ['#c0392b', '#2f8f5b', '#f0c24b'], ends: '#e8b04b' },
      { bands: ['#6b1a1a'], ends: '#e8b04b', mirrors: true },
      { bands: ['#e8b04b', '#d69a2d'], ends: '#b8312b', tassel: '#c2185b' },
      { bands: ['#f0c24b', '#c2185b', '#3b4cc0', '#16a085'], ends: '#f3e6d0', tassel: '#f08a24' }
    ];
    function dandiya(x0, y0, ang, len, kind, dk, fine) {
      var sd = STICKS[kind % STICKS.length], n = sd.bands.length > 1 ? 6 : 1, dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
      var x1 = x0 - dx * 0.22, y1 = y0 - dy * 0.22, w = Math.max(0.9, len * 0.08);
      g.lineCap = 'butt'; g.lineWidth = w;
      for (var i = 0; i < n; i++) {
        var a0 = i / n, a1 = (i + 1) / n;
        g.strokeStyle = tint(sd.bands[i % sd.bands.length], dk);
        g.beginPath(); g.moveTo(x1 + (dx * 1.22) * a0, y1 + (dy * 1.22) * a0); g.lineTo(x1 + (dx * 1.22) * a1, y1 + (dy * 1.22) * a1); g.stroke();
      }
      g.lineCap = 'round'; g.strokeStyle = tint(sd.ends, dk); g.lineWidth = w * 1.25;
      g.beginPath(); g.moveTo(x1 + dx * 1.2, y1 + dy * 1.2); g.lineTo(x1 + dx * 1.22, y1 + dy * 1.22); g.stroke();
      if (fine && sd.mirrors) { g.fillStyle = 'rgba(255,250,235,.9)'; for (var m = 1; m < 5; m++) { g.beginPath(); g.arc(x1 + dx * 1.22 * m / 5, y1 + dy * 1.22 * m / 5, w * 0.35, 0, TAU); g.fill(); } }
      if (sd.tassel) { g.strokeStyle = tint(sd.tassel, dk); g.lineWidth = Math.max(0.7, w * 0.45); g.beginPath(); for (var k = -1; k <= 1; k++) { g.moveTo(x1, y1); g.lineTo(x1 + k * w * 0.9, y1 + len * 0.16); } g.stroke(); }
    }
    function figure(p, d, T, isYou, beatPh, fade) {
      if (d.coupleRole && st.listener !== 'circle' && d.alt) { var a0 = d.alt; ['flash', 'twirl', 'atHome', 'walking', 'step', 'sitting', 'rest', 'ph'].forEach(function (k) { a0[k] = d[k]; }); d = a0; }
      var s = p.s, x = p.x, y = p.y, h = d.h * s, up = d.flash > 0.25;
      var walking = ((d.walker && d.moving) || d.walking) && !reduce, dancing = !d.walker && !d.role && !d.watcher && !d.stander && !d.sitting && st.on && !reduce && !d.walking && d.atHome !== false, playing = d.role && st.on && !reduce, tw = d.twirl || 0;
      var groundY = null;
      if (d.sitting) { groundY = p.y + ((d.rest && d.rest.y) || 0) * s; y = p.y + 0.48 * h; }
      var ph = walking ? d.step : beatPh * Math.PI + d.ph, sw = walking || dancing || playing ? Math.sin(ph) : 0;
      if (!d.sitting) y -= (walking ? 0.025 : dancing ? 0.05 : 0.015) * Math.abs(sw) * s;
      if (d.stander && !reduce) x += Math.sin(T * 0.8 + d.sway) * h * 0.02;
      var near = fade == null ? 0 : 1 - fade, dk = near * 0.88;
      FOGF = isYou || d.coupleRole || near ? 0 : Math.max(0, Math.min(0.62, (p.z - (-cam.z) - 9) / 55));
      if (h < 1.5) return;
      g.globalAlpha = 1 - Math.min(1, p.z / 70) * 0.4;
      // Light falls off away from the garbo: people out at the edges are a shade darker than those by the lamp
      if (!near && !isYou && !d.coupleRole && !d.role && lightAt) { var ld = Math.hypot(p.x - lightAt.x, (p.y - lightAt.y) * 2.2) / Math.max(1, W * 0.9); dk = Math.max(dk, Math.min(0.42, ld * 0.5) * (st.on ? 0.8 : 1)); }
      if (!near && h > 16) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, groundY != null ? groundY : p.y, h * 0.2, h * 0.045, 0, 0, TAU); g.fill(); }
      var skin = tint(SKIN[Math.floor((d.ph || 0) * 10) % SKIN.length], dk), main = tint(d.col, dk), top = tint(d.top, dk), gold = tint('#e8b04b', dk);
      var fine = (h > 26 || (d.coupleRole && h > 12)) && !near, lw = Math.max(0.8, h * 0.034);
      if (h < 11 && !isYou && !d.coupleRole) {
        // Far away: a few shapes read as a person and keep a big crowd cheap to draw
        if (d.man) { g.fillStyle = tint('#efe6d6', dk); g.fillRect(x - h * 0.07, y - h * 0.44, h * 0.14, h * 0.44); g.fillStyle = main; g.beginPath(); g.moveTo(x - h * 0.09, y - h * 0.8); g.lineTo(x + h * 0.09, y - h * 0.8); g.lineTo(x + h * 0.2, y - h * 0.42); g.lineTo(x - h * 0.2, y - h * 0.42); g.fill(); }
        else { var fl0 = h * (0.25 + 0.12 * tw); g.fillStyle = main; g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.56); g.lineTo(x + h * 0.08, y - h * 0.56); g.lineTo(x + fl0, y); g.lineTo(x - fl0, y); g.fill(); g.fillStyle = top; g.fillRect(x - h * 0.075, y - h * 0.79, h * 0.15, h * 0.24); }
        g.fillStyle = skin; g.beginPath(); g.arc(x, y - h * 0.885, h * 0.078, 0, TAU); g.fill();
        if (up || dancing || tw > 0.3) { g.strokeStyle = skin; g.lineWidth = Math.max(0.6, h * 0.05); g.beginPath(); var ay = up ? 0.27 : 0.14 + 0.1 * sw; g.moveTo(x - h * 0.08, y - h * 0.76); g.lineTo(x - h * 0.18, y - h * (0.76 + ay)); g.moveTo(x + h * 0.08, y - h * 0.76); g.lineTo(x + h * 0.18, y - h * (0.76 + (up ? 0.27 : 0.14 - 0.1 * sw))); g.stroke(); }
        if (d.flash > 0.05) glow(x, y - h * 1.03, Math.max(0.8, h * 0.05), '#fff0d0', d.flash);
        g.globalAlpha = 1; return;
      }
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (d.man) {
        // Churidar legs and mojari
        g.strokeStyle = tint(d.legs || '#efe6d6', dk); g.lineWidth = Math.max(1, h * 0.055);
        var lx = walking ? sw * h * 0.06 : sw * h * 0.03;
        if (d.sitting && groundY - (y - h * 0.44) < h * 0.1) {
          // Sitting cross-legged on the ground
          g.fillStyle = tint(d.legs || '#efe6d6', dk); g.beginPath(); g.ellipse(x, groundY - h * 0.03, h * 0.2, h * 0.05, 0, 0, TAU); g.fill();
        } else if (d.sitting) {
          g.beginPath(); g.moveTo(x - h * 0.05, y - h * 0.44); g.lineTo(x - h * 0.08, groundY - h * 0.01); g.moveTo(x + h * 0.05, y - h * 0.44); g.lineTo(x + h * 0.08, groundY - h * 0.01); g.stroke();
          g.fillStyle = tint('#3a1f12', dk); g.beginPath(); g.ellipse(x - h * 0.09, groundY, h * 0.04, h * 0.018, 0, 0, TAU); g.ellipse(x + h * 0.09, groundY, h * 0.04, h * 0.018, 0, 0, TAU); g.fill();
        } else {
        g.beginPath(); g.moveTo(x - h * 0.045, y - h * 0.44); g.lineTo(x - h * 0.06 - lx, y - h * 0.02); g.moveTo(x + h * 0.045, y - h * 0.44); g.lineTo(x + h * 0.06 + lx, y - h * 0.02); g.stroke();
        g.fillStyle = tint('#3a1f12', dk); g.beginPath(); g.ellipse(x - h * 0.07 - lx, y, h * 0.04, h * 0.018, 0, 0, TAU); g.ellipse(x + h * 0.07 + lx, y, h * 0.04, h * 0.018, 0, 0, TAU); g.fill();
        }
        // Kediyu: fitted at the chest, flared frill below
        var fl = h * (0.2 + (dancing ? 0.04 * sw : 0));
        g.fillStyle = main; g.beginPath();
        g.moveTo(x - h * 0.08, y - h * 0.8); g.lineTo(x + h * 0.08, y - h * 0.8); g.lineTo(x + h * 0.085, y - h * 0.62);
        g.quadraticCurveTo(x + fl * 0.8, y - h * 0.52, x + fl, y - h * 0.42); g.quadraticCurveTo(x, y - h * 0.38, x - fl, y - h * 0.42);
        g.quadraticCurveTo(x - fl * 0.8, y - h * 0.52, x - h * 0.085, y - h * 0.62); g.closePath(); g.fill();
        if (fine) { g.fillStyle = gold; for (var em = -2; em <= 2; em++) { g.beginPath(); g.arc(x + em * h * 0.032, y - h * 0.7 + Math.abs(em) * h * 0.012, Math.max(0.6, h * 0.01), 0, TAU); g.fill(); } }
        if (fine) { g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.02); g.beginPath(); g.moveTo(x - fl, y - h * 0.425); g.quadraticCurveTo(x, y - h * 0.385, x + fl, y - h * 0.425); g.stroke(); g.beginPath(); g.moveTo(x, y - h * 0.8); g.lineTo(x, y - h * 0.63); g.stroke(); }
      } else {
        // Chaniya with a bordered hem, then the choli and a strip of waist
        var flare = h * (0.25 + (dancing ? 0.045 * sw : walking ? 0.01 * sw : 0) + 0.16 * tw + (d.sitting ? 0.06 : 0)), hem = d.sitting ? groundY : y - h * 0.01 - h * 0.03 * tw;
        g.fillStyle = main; g.beginPath(); g.moveTo(x - h * 0.075, y - h * 0.55); g.lineTo(x + h * 0.075, y - h * 0.55);
        g.quadraticCurveTo(x + flare * 0.75, y - h * 0.22, x + flare, hem); g.quadraticCurveTo(x, hem + h * 0.05, x - flare, hem); g.quadraticCurveTo(x - flare * 0.75, y - h * 0.22, x - h * 0.075, y - h * 0.55); g.fill();
        g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.035); g.beginPath(); g.moveTo(x - flare * 0.97, hem - h * 0.015); g.quadraticCurveTo(x, hem + h * 0.035, x + flare * 0.97, hem - h * 0.015); g.stroke();
        if (fine) {
          var ty = y - h * 0.3, tfl = h * 0.075 + (flare - h * 0.075) * 0.55;
          g.strokeStyle = tint(d.tier || d.top, dk); g.lineWidth = Math.max(1, h * 0.028); g.beginPath(); g.moveTo(x - tfl, ty); g.quadraticCurveTo(x, ty + h * 0.03, x + tfl, ty); g.stroke();
          if (dancing || walking) { g.fillStyle = tint('#7a1a14', dk); var fx = sw * h * 0.04; g.beginPath(); g.ellipse(x - h * 0.06 + fx, y + h * 0.01, h * 0.035, h * 0.014, 0, 0, TAU); g.ellipse(x + h * 0.06 - fx, y + h * 0.01, h * 0.035, h * 0.014, 0, 0, TAU); g.fill(); }
        }
        if (fine) {
          g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1;
          for (var pl = -2; pl <= 2; pl++) { g.beginPath(); g.moveTo(x + pl * h * 0.02, y - h * 0.5); g.lineTo(x + pl * flare * 0.33, hem); g.stroke(); }
          g.fillStyle = 'rgba(255,248,225,.8)'; for (var m = 0; m < 6; m++) { var mu = (m + 0.5) / 6 * 2 - 1; g.beginPath(); g.arc(x + mu * flare * 0.82, hem - h * 0.07 + Math.abs(mu) * h * 0.02, Math.max(0.7, h * 0.011), 0, TAU); g.fill(); }
        }
        g.fillStyle = skin; g.fillRect(x - h * 0.06, y - h * 0.6, h * 0.12, h * 0.06);
        g.fillStyle = top; g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.79); g.lineTo(x + h * 0.08, y - h * 0.79); g.lineTo(x + h * 0.07, y - h * 0.6); g.lineTo(x - h * 0.07, y - h * 0.6); g.closePath(); g.fill();
        // Odhni over one shoulder, falling behind
        g.strokeStyle = tint(d.odhni || d.top, dk); g.globalAlpha *= 0.85; g.lineWidth = Math.max(1, h * 0.04);
        g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.78); g.quadraticCurveTo(x + h * 0.02, y - h * 0.62, x + h * 0.09, y - h * 0.56); g.quadraticCurveTo(x + h * (0.16 + 0.04 * sw + 0.1 * tw), y - h * 0.48, x + h * (0.18 + 0.05 * sw + 0.14 * tw), y - h * 0.3); g.stroke();
        g.globalAlpha /= 0.85;
        if (fine) { g.fillStyle = 'rgba(255,248,225,.75)'; [0.25, 0.5, 0.75].forEach(function (u) { var ox = lerp(x - h * 0.08, x + h * 0.09, u), oy = lerp(y - h * 0.78, y - h * 0.56, u); g.beginPath(); g.arc(ox, oy, Math.max(0.6, h * 0.009), 0, TAU); g.fill(); }); }
      }
      // The couple's finery: her heavy gold hem and necklace, his gold stole and pagdi band
      if (d.coupleRole === 'w' && fine) {
        g.strokeStyle = gold; g.lineWidth = Math.max(1.2, h * 0.05); g.beginPath(); g.moveTo(x - flare * 0.95, hem - h * 0.05); g.quadraticCurveTo(x, hem - h * 0.01, x + flare * 0.95, hem - h * 0.05); g.stroke();
        g.strokeStyle = gold; g.lineWidth = Math.max(0.8, h * 0.012); g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.785); g.quadraticCurveTo(x + h * 0.02, y - h * 0.63, x + h * 0.09, y - h * 0.565); g.stroke();
      }
      if (d.coupleRole === 'm') { g.strokeStyle = tint(d.stole, dk); g.lineWidth = Math.max(1, h * 0.035); g.beginPath(); g.moveTo(x + h * 0.08, y - h * 0.8); g.quadraticCurveTo(x - h * 0.02, y - h * 0.62, x - h * 0.12, y - h * 0.44); g.stroke(); }
      // Neck and head
      g.fillStyle = skin; g.fillRect(x - h * 0.022, y - h * 0.83, h * 0.044, h * 0.05);
      g.beginPath(); g.arc(x, y - h * 0.885, h * 0.068, 0, TAU); g.fill();
      if (d.coupleRole === 'w' && fine) { g.strokeStyle = gold; g.lineWidth = Math.max(0.8, h * 0.014); g.beginPath(); g.arc(x, y - h * 0.83, h * 0.05, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
      if (d.man) {
        if (fine && d.moustache) { g.strokeStyle = tint('#1f130d', dk); g.lineWidth = Math.max(0.8, h * 0.012); g.beginPath(); g.moveTo(x - h * 0.03, y - h * 0.862); g.quadraticCurveTo(x, y - h * 0.872, x + h * 0.03, y - h * 0.862); g.stroke(); }
        g.fillStyle = tint(d.older ? '#f3e6d0' : d.pagdi || '#b8312b', dk);
        g.beginPath(); g.ellipse(x, y - h * 0.935, h * 0.078, h * 0.052, 0, Math.PI, 0); g.lineTo(x + h * 0.078, y - h * 0.925); g.lineTo(x - h * 0.078, y - h * 0.925); g.fill();
        if (d.coupleRole === 'm') { g.strokeStyle = gold; g.lineWidth = Math.max(0.8, h * 0.012); g.beginPath(); g.moveTo(x - h * 0.078, y - h * 0.93); g.lineTo(x + h * 0.078, y - h * 0.93); g.stroke(); }
        if (fine) { g.beginPath(); g.moveTo(x + h * 0.06, y - h * 0.94); g.quadraticCurveTo(x + h * 0.13, y - h * 0.9, x + h * 0.1, y - h * 0.84); g.lineWidth = Math.max(1, h * 0.02); g.strokeStyle = g.fillStyle; g.stroke(); }
      } else {
        g.fillStyle = tint(d.older ? '#9a948c' : '#1f130d', dk); g.beginPath(); g.ellipse(x, y - h * 0.905, h * 0.074, h * 0.05, 0, Math.PI, 0); g.fill();
        g.beginPath(); g.arc(x, y - h * 0.965, h * 0.034, 0, TAU); g.fill();
        if (fine) { g.strokeStyle = gold; g.lineWidth = Math.max(0.6, h * 0.008); g.beginPath(); g.moveTo(x, y - h * 0.955); g.lineTo(x, y - h * 0.925); g.stroke(); g.fillStyle = gold; g.beginPath(); g.arc(x, y - h * 0.922, Math.max(0.7, h * 0.012), 0, TAU); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(x, y - h * 0.9, Math.max(0.6, h * 0.008), 0, TAU); g.fill(); g.fillStyle = gold; g.beginPath(); g.arc(x - h * 0.066, y - h * 0.87, Math.max(0.6, h * 0.01), 0, TAU); g.arc(x + h * 0.066, y - h * 0.87, Math.max(0.6, h * 0.01), 0, TAU); g.fill(); }
      }
      // Arms: shoulder, elbow, hand
      var shy = y - h * 0.76, L = [x - h * 0.08, shy], R = [x + h * 0.08, shy], le, lh, re, rh;
      if (d.role === 'singer') { le = [x - h * 0.13, shy + h * 0.12]; lh = [x - h * 0.03, shy - h * 0.09]; re = [x + h * 0.16, shy + h * 0.02 - sw * h * 0.04]; rh = [x + h * 0.24, shy - h * 0.1 - sw * h * 0.08]; }
      else if (d.role === 'dhol') { var hit = Math.max(0, sw); le = [x - h * 0.16, shy + h * 0.1]; lh = [x - h * 0.22, shy + h * (0.2 - 0.06 * hit)]; re = [x + h * 0.16, shy + h * 0.1]; rh = [x + h * 0.22, shy + h * (0.2 - 0.06 * Math.max(0, -sw))]; }
      else if (d.role === 'keys') { le = [x - h * 0.14, shy + h * 0.14]; lh = [x - h * 0.1 + sw * h * 0.02, shy + h * 0.26]; re = [x + h * 0.14, shy + h * 0.14]; rh = [x + h * 0.1 - sw * h * 0.02, shy + h * 0.26]; }
      else if (d.stander && d.phone) { le = [x - h * 0.13, shy + h * 0.15]; lh = [x - h * 0.13, shy + h * 0.3]; re = [x + h * 0.1, shy - h * 0.06]; rh = [x + h * 0.06, shy - h * 0.2]; }
      else if (d.stander && d.chat && Math.sin(T * 1.3 + d.sway) > 0.4) { le = [x - h * 0.12, shy + h * 0.15]; lh = [x - h * 0.13, shy + h * 0.3]; re = [x + h * 0.16, shy + h * 0.12]; rh = [x + h * 0.22, shy + h * (0.02 + 0.04 * Math.sin(T * 5 + d.sway))]; }
      else if (d.photo && !walking) { le = [x - h * 0.12, shy + h * 0.06]; lh = [x - h * 0.04, shy - h * 0.1]; re = [x + h * 0.12, shy + h * 0.06]; rh = [x + h * 0.04, shy - h * 0.1]; }
      else if (tw > 0.3) { le = [x - h * 0.17, shy - h * 0.1]; lh = [x - h * 0.24, shy - h * 0.24]; re = [x + h * 0.17, shy - h * 0.1]; rh = [x + h * 0.24, shy - h * 0.24]; }
      else if (up) { le = [x - h * 0.13, shy - h * 0.12]; lh = [x - h * 0.012, shy - h * 0.27]; re = [x + h * 0.13, shy - h * 0.12]; rh = [x + h * 0.012, shy - h * 0.27]; }
      else if (dancing) { le = [x - h * 0.18, shy + h * (0.02 - 0.06 * sw)]; lh = [x - h * 0.22, shy - h * (0.1 + 0.14 * sw)]; re = [x + h * 0.18, shy + h * (0.02 + 0.06 * sw)]; rh = [x + h * 0.22, shy - h * (0.1 - 0.14 * sw)]; }
      else { var a1 = walking ? sw * 0.05 : 0; le = [x - h * 0.11, shy + h * 0.15]; lh = [x - h * (0.12 + a1), shy + h * 0.3]; re = [x + h * 0.11, shy + h * 0.15]; rh = [x + h * (0.12 - a1), shy + h * 0.3]; }
      g.strokeStyle = skin; g.lineWidth = lw;
      g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(le[0], le[1]); g.lineTo(lh[0], lh[1]); g.moveTo(R[0], R[1]); g.lineTo(re[0], re[1]); g.lineTo(rh[0], rh[1]); g.stroke();
      if (fine && !d.man) { g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.02); g.beginPath(); g.moveTo(lh[0], lh[1]); g.lineTo(lerp(le[0], lh[0], 0.8), lerp(le[1], lh[1], 0.8)); g.moveTo(rh[0], rh[1]); g.lineTo(lerp(re[0], rh[0], 0.8), lerp(re[1], rh[1], 0.8)); g.stroke(); }
      if (d.stander && d.phone) { g.fillStyle = '#111'; g.fillRect(rh[0] - h * 0.03, rh[1] - h * 0.07, h * 0.06, h * 0.1); g.fillStyle = 'rgba(200,225,255,.9)'; g.fillRect(rh[0] - h * 0.022, rh[1] - h * 0.06, h * 0.044, h * 0.08); if (st.on) glow(rh[0], rh[1] - h * 0.02, Math.max(0.8, h * 0.03), '#eaf3ff', 0.5); }
      if (d.photo && !walking) { g.fillStyle = '#151515'; g.fillRect(x - h * 0.07, shy - h * 0.16, h * 0.14, h * 0.08); if (d.snap > 0) glow(x, shy - h * 0.12, Math.max(1.5, h * 0.06 * (1 + d.snap)), '#ffffff', d.snap); }
      if (d.role === 'singer') { g.strokeStyle = tint('#222222', dk); g.lineWidth = Math.max(1, h * 0.025); g.beginPath(); g.moveTo(lh[0], lh[1]); g.lineTo(lh[0] + h * 0.02, lh[1] + h * 0.08); g.stroke(); }
      if (st.style === 'dandiya' && !d.walker && !d.role) {
        // On the beat the two sticks cross and strike; between beats they are held out, swinging with the step
        var len = h * 0.3, la, ra;
        if (up && d.strikeDir && !d.walker) { var toward = d.strikeDir > 0 ? -0.5 : -Math.PI + 0.5; la = toward - 0.18; ra = toward + 0.18; }
        else if (up) { la = -Math.PI / 2 + 0.55; ra = -Math.PI / 2 - 0.55; }
        else { la = -Math.PI / 2 - 0.35 - 0.25 * sw; ra = -Math.PI / 2 + 0.35 - 0.25 * sw; }
        dandiya(lh[0], lh[1], la, len, d.stick || 0, dk, fine);
        dandiya(rh[0], rh[1], ra, len, d.stick || 0, dk, fine);
        if (up && d.flash > 0.4) glow(x + (d.strikeDir || 0) * h * 0.28, lh[1] - len * (d.strikeDir ? 0.35 : 0.62), Math.max(1, h * 0.035), '#fff3c4', d.flash);
      }
      if (d.flash > 0.05) glow(x, shy - h * 0.27, Math.max(1, h * 0.03 * (1 + d.flash)), '#fff0d0', d.flash);
      g.globalAlpha = 1;
      if (isYou) {
        g.fillStyle = 'rgba(214,176,111,' + (0.25 + youGlow * 0.5) + ')'; g.beginPath(); g.ellipse(x, p.y, h * (0.32 + youGlow * 0.12), h * 0.09, 0, 0, TAU); g.fill();
        youLabel = { x: x, y: y - h * (d.man ? 0.985 : 1.0), h: h, man: d.coupleRole === 'm', hx: x, hy: y - h * 0.97 };
      }
    }
    function fogBand(f) {
      var s0 = F / f.z, yG = HOR + cam.y * s0, yT = Math.max(0, HOR + (cam.y - 11) * s0), yB = Math.min(H, yG + (yG - HOR) * 0.25 + 6);
      if (yG < 0 || yT >= H) return;
      var col = st.venue === 'stadium' ? '26,19,28' : st.venue === 'sheri' ? '22,17,32' : '20,15,30';
      var gr = g.createLinearGradient(0, yT, 0, yB);
      gr.addColorStop(0, 'rgba(' + col + ',0)'); gr.addColorStop(Math.max(0.01, Math.min(0.98, (HOR - yT) / Math.max(1, yB - yT))), 'rgba(' + col + ',' + f.a + ')');
      gr.addColorStop(Math.max(0.02, Math.min(0.99, (yG - yT) / Math.max(1, yB - yT))), 'rgba(' + col + ',' + f.a * 0.85 + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = gr;
      if (st.venue === 'sheri') { var l = P(-7.2, 0, cam.z + f.z), r = P(7.2, 0, cam.z + f.z); if (l && r) g.fillRect(l.x, yT, r.x - l.x, yB - yT); }
      else g.fillRect(0, yT, W, yB - yT);
    }
    // A soft warm follow-spot on you and your partner
    function followSpot(p, d) {
      var h = d.h * p.s, cy = p.y - h * 0.5, r = h * 0.9;
      var sg = g.createRadialGradient(p.x, cy, h * 0.05, p.x, cy, r); sg.addColorStop(0, 'rgba(255,214,150,' + (0.3 + 0.2 * youGlow) + ')'); sg.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(p.x, cy, r, 0, TAU); g.fill();
    }
    // In Gujarati: તું (you) over you, and તારો or તારી (yours) over your partner, on a small leaf-shaped tag
    var GU_FONT = '"Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, "Anek Gujarati", FreeSerif, system-ui, sans-serif';
    function coupleWord(you, man) { return you ? 'તું' : man ? 'તારો' : 'તારી'; }
    function tagSize(h, compact) { var fs = compact ? Math.max(10, Math.min(13, h * 0.08)) : Math.max(12, Math.min(17, h * 0.15)); return { fs: fs, hh: fs * 1.55, tip: fs * 0.55 }; }
    function tag(x, y, h, you, man, T0, compact, lead) {
      var text = coupleWord(you, man), z = tagSize(h, compact), fs = z.fs;
      g.font = '700 ' + fs + 'px ' + GU_FONT; g.textAlign = 'center';
      var w = Math.max(fs * 1.9, g.measureText(text).width + fs * 1.1), hh = z.hh, bob = reduce ? 0 : Math.sin(T0 * 2.2 + (you ? 0 : 1.3)) * 1.5, top = y - hh - z.tip - 3 + bob;
      x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x));
      if (lead) { g.strokeStyle = you ? 'rgba(232,176,75,.8)' : 'rgba(243,230,208,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, top + hh + z.tip); g.lineTo(lead.x, lead.y); g.stroke(); }
      if (you) glow(x, top + hh * 0.5, hh * 0.5, 'rgba(255,210,130,1)', 0.2 + youGlow * 0.35);
      g.beginPath(); g.moveTo(x - w / 2, top + hh * 0.35); g.quadraticCurveTo(x - w / 2, top, x - w / 2 + hh * 0.35, top); g.lineTo(x + w / 2 - hh * 0.35, top); g.quadraticCurveTo(x + w / 2, top, x + w / 2, top + hh * 0.35);
      g.lineTo(x + w / 2, top + hh * 0.7); g.quadraticCurveTo(x + w / 2, top + hh, x + w / 2 - hh * 0.3, top + hh); g.lineTo(x + fs * 0.35, top + hh); g.lineTo(x, top + hh + fs * 0.55); g.lineTo(x - fs * 0.35, top + hh); g.lineTo(x - w / 2 + hh * 0.3, top + hh); g.quadraticCurveTo(x - w / 2, top + hh, x - w / 2, top + hh * 0.7); g.closePath();
      g.fillStyle = you ? '#e8b04b' : 'rgba(243,230,208,.94)'; g.fill();
      g.strokeStyle = you ? '#fff1c2' : 'rgba(142,27,44,.5)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = you ? '#2a1208' : '#6b1420'; g.fillText(text, x, top + hh * 0.7);
    }
    // Pictograms over the two of you, like the signs on a door: a woman in a dress and a man. Yours glows gold.
    function marker(x, y, h, you, T0, man) {
      var r = Math.max(8, Math.min(13, h * 0.11)) * (you ? 1 : 0.85), bob = reduce ? 0 : Math.sin(T0 * 2.4 + (you ? 0 : 1.2)) * r * 0.25, cy = y - r * 2.4 + bob;
      var col = you ? '#f3c766' : 'rgba(243,230,208,.9)';
      if (you) glow(x, cy + r * 0.1, r * 0.8, 'rgba(255,210,130,1)', 0.18 + youGlow * 0.3);
      // A small round badge so the sign reads against the lit crowd
      g.fillStyle = 'rgba(11,6,5,.72)'; g.beginPath(); g.arc(x, cy + r * 0.12, r * 1.55, 0, TAU); g.fill();
      g.strokeStyle = you ? '#e8b04b' : 'rgba(243,230,208,.35)'; g.lineWidth = you ? 1.6 : 1; g.stroke();
      g.fillStyle = 'rgba(11,6,5,.72)'; g.beginPath(); g.moveTo(x - r * 0.35, cy + r * 1.55); g.lineTo(x + r * 0.35, cy + r * 1.55); g.lineTo(x, cy + r * 2.05); g.closePath(); g.fill();
      r *= 0.72; cy += r * 0.2;
      g.fillStyle = col;
      g.beginPath(); g.arc(x, cy - r * 0.95, r * 0.36, 0, TAU); g.fill();
      if (man) {
        roundRect(x - r * 0.42, cy - r * 0.5, r * 0.84, r * 1.05, r * 0.2); g.fill();
        g.fillRect(x - r * 0.36, cy + r * 0.45, r * 0.3, r * 0.95); g.fillRect(x + r * 0.06, cy + r * 0.45, r * 0.3, r * 0.95);
      } else {
        g.beginPath(); g.moveTo(x - r * 0.24, cy - r * 0.52); g.lineTo(x + r * 0.24, cy - r * 0.52); g.lineTo(x + r * 0.62, cy + r * 0.72); g.lineTo(x - r * 0.62, cy + r * 0.72); g.closePath(); g.fill();
        g.fillRect(x - r * 0.3, cy + r * 0.7, r * 0.22, r * 0.72); g.fillRect(x + r * 0.08, cy + r * 0.7, r * 0.22, r * 0.72);
      }
    }
    function partnerMark(p, d) {
      var h = d.h * p.s;
      g.fillStyle = 'rgba(214,176,111,.22)'; g.beginPath(); g.ellipse(p.x, p.y, h * 0.3, h * 0.08, 0, 0, TAU); g.fill();
      var by = p.y - (st.on && !reduce ? Math.abs(Math.sin(BEAT * Math.PI + d.ph)) * 0.05 * p.s : 0);
      partnerLabel = { x: p.x, y: by - h * (d.man ? 0.985 : 1.0), h: h, man: d.coupleRole === 'm', hx: p.x, hy: by - h * 0.97 };
    }
    function label(text, x, y, h, soft) {
      var fs = Math.max(soft ? 10 : 11, Math.min(soft ? 12.5 : 14, h * 0.2));
      g.font = '700 ' + fs + 'px system-ui, -apple-system, sans-serif'; g.textAlign = 'center';
      var w = g.measureText(text).width + 12;
      g.fillStyle = 'rgba(11,6,5,.72)'; roundRect(x - w / 2, y - fs - 4, w, fs + 8, (fs + 8) / 2); g.fill();
      g.fillStyle = soft ? '#e8c98f' : '#f3e6d0'; g.fillText(text, x, y + 0.5);
    }
    function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    /* ---------- where you sit when watching from far away ---------- */
    function seat(k) {
      if (k < 0.02) return;
      g.save(); g.translate(BX, BY); g.globalAlpha = Math.min(1, k * 1.4);
      var W = BW, H = BH, yb = H, u = Math.min(1.45, W / 380), v = st.venue, x0 = W * 0.5;
      if (v === 'stadium') {
        for (var r = 0; r < 2; r++) {
          var yy = yb - H * 0.05 - r * H * 0.075;
          g.fillStyle = r ? '#1b1624' : '#231c2e'; g.fillRect(0, yy - H * 0.02, W, H * 0.08);
          for (var sx = (r ? 14 : 0) * u; sx < W; sx += 30 * u) { g.fillStyle = r ? '#3a2b4a' : '#4a3459'; roundRect(sx + 3 * u, yy - H * 0.05, 24 * u, H * 0.035, 5 * u); g.fill(); }
        }
        g.strokeStyle = 'rgba(214,176,111,.35)'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(0, yb - H * 0.19); g.lineTo(W, yb - H * 0.19); g.stroke();
        for (var q = 0; q < 7; q++) if (q !== 3) spectator(W * (0.08 + q * 0.14), yb - H * 0.13 - (q % 2) * H * 0.075, u, q);
        seated(x0, yb - H * 0.13, u);
      } else if (v === 'outdoors') {
        g.fillStyle = 'rgba(12,8,6,.8)'; g.fillRect(0, yb - H * 0.07, W, H * 0.07);
        // A row of plastic chairs as wide as the screen, most taken, with you on one near the middle
        var nC = Math.max(6, Math.round(W / (62 * u))), mine = Math.floor(nC / 2) - (nC % 2 ? 0 : 1);
        for (var c = 0; c < nC; c++) { var cx = W * (c + 0.5) / nC; g.fillStyle = ['#b73a2e', '#2f6fa8', '#d9d2c5'][c % 3]; roundRect(cx - 17 * u, yb - H * 0.11, 34 * u, 7 * u, 3 * u); g.fill(); g.fillRect(cx - 15 * u, yb - H * 0.11 - 26 * u, 30 * u, 5 * u); g.fillRect(cx - 14 * u, yb - H * 0.11, 3 * u, H * 0.06); g.fillRect(cx + 11 * u, yb - H * 0.11, 3 * u, H * 0.06); }
        for (var sc2 = 0; sc2 < nC; sc2++) if (sc2 !== mine && (sc2 * 7) % 5 !== 2) spectator(W * (sc2 + 0.5) / nC, yb - H * 0.11, u, sc2);
        seated(W * (mine + 0.5) / nC, yb - H * 0.11, u);
      } else {
        g.fillStyle = '#2a2330'; g.fillRect(0, yb - H * 0.1, W * 0.78, H * 0.1);
        g.fillStyle = '#3a3140'; g.fillRect(0, yb - H * 0.1, W * 0.78, 5 * u);
        g.fillStyle = '#1b1420'; g.fillRect(0, 0, W * 0.07, yb);
        for (var tt = 0; tt < 5; tt++) { g.fillStyle = ['#f08a24', '#2f8f5b', '#c2185b', '#ffc861', '#3b4cc0'][tt]; g.beginPath(); g.moveTo(W * 0.07, H * 0.1 + tt * 16 * u); g.lineTo(W * 0.07 + 10 * u, H * 0.1 + tt * 16 * u + 7 * u); g.lineTo(W * 0.07, H * 0.1 + tt * 16 * u + 14 * u); g.fill(); }
        glow(W * 0.66, yb - H * 0.1 - 3 * u, 2.5 * u, '#ffcf7a', 0.9 + (reduce ? 0 : 0.1 * Math.sin(clock() * 9)));
        spectator(W * 0.2, yb - H * 0.1, u, 5);
        seated(W * 0.42, yb - H * 0.1, u);
      }
      g.globalAlpha = 1; g.restore();
    }
    function spectator(x, y, u, i) {
      g.fillStyle = ['#2a1f2e', '#33242a', '#1f2a33'][i % 3];
      g.beginPath(); g.moveTo(x - 11 * u, y); g.quadraticCurveTo(x - 12 * u, y - 24 * u, x, y - 26 * u); g.quadraticCurveTo(x + 12 * u, y - 24 * u, x + 11 * u, y); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, y - 33 * u, 7.5 * u, 0, TAU); g.fill();
    }
    function seated(x, y, u) {
      // Your partner sits beside you
      var px = x + 28 * u;
      g.fillStyle = '#d6a24a';
      g.beginPath(); g.moveTo(px - 10 * u, y); g.quadraticCurveTo(px - 11 * u, y - 22 * u, px, y - 24 * u); g.quadraticCurveTo(px + 11 * u, y - 22 * u, px + 10 * u, y); g.closePath(); g.fill();
      g.beginPath(); g.arc(px, y - 30.5 * u, 7 * u, 0, TAU); g.fill();

      g.fillStyle = 'rgba(214,176,111,' + (0.22 + youGlow * 0.5) + ')'; g.beginPath(); g.ellipse(x, y - 18 * u, 24 * u * (1 + youGlow * 0.2), 30 * u * (1 + youGlow * 0.2), 0, 0, TAU); g.fill();
      g.fillStyle = '#f3e6d0';
      g.beginPath(); g.moveTo(x - 11 * u, y); g.quadraticCurveTo(x - 12 * u, y - 24 * u, x, y - 26 * u); g.quadraticCurveTo(x + 12 * u, y - 24 * u, x + 11 * u, y); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, y - 33 * u, 7.5 * u, 0, TAU); g.fill();
      var youMan = st.youAs === 'man'; marker(x, y - 44 * u, 70 * u, true, clock(), youMan); marker(x + 28 * u, y - 40 * u, 64 * u, false, clock(), !youMan);
    }

    /* ---------- echoes: where they come from in each venue ---------- */
    function reflectors(listener) {
      var v = venues[st.venue], out = [], taps, i;
      if (!v || !v.ir) return out;
      if (st.venue === 'outdoors') {
        taps = v.ir.taps.filter(function (tp) { return tp[0] > 0.05; });
        if (taps[0]) { out.push({ x: -14, y: 3, z: 45, d: taps[0][0], l: taps[0][1] * 2.4 }); out.push({ x: 14, y: 3, z: 45, d: taps[0][0] + 0.005, l: taps[0][1] * 2.4 }); }
        if (taps[1]) out.push({ x: 0, y: 5, z: 47, d: taps[1][0], l: taps[1][1] * 2.4 });
        for (i = 2; i < taps.length; i++) out.push({ x: (i % 2 ? -1 : 1) * 30, y: 3, z: 80 + i * 8, d: taps[i][0], l: taps[i][1] * 2.4 });
      } else if (st.venue === 'stadium') {
        taps = v.ir.taps;
        if (taps[0]) { out.push({ x: 0, y: 5, z: 46, d: taps[0][0], l: taps[0][1] * 1.8 }); out.push({ x: -27, y: 5, z: listener.z, d: taps[0][0] * 0.7, l: taps[0][1] * 1.5 }); out.push({ x: 27, y: 5, z: listener.z, d: taps[0][0] * 0.72, l: taps[0][1] * 1.5 }); }
        if (taps[1]) { out.push({ x: -20, y: 6, z: 46, d: taps[1][0], l: taps[1][1] * 1.8 }); out.push({ x: 20, y: 6, z: 46, d: taps[1][0] + 0.01, l: taps[1][1] * 1.8 }); }
      } else if (v.ir.flutter) {
        var fl = v.ir.flutter;
        for (i = 0; i < 6; i++) out.push({ x: i % 2 ? 8 : -8, y: 3, z: listener.z + 1.5, d: fl.period * (i + 1), l: fl.first * Math.pow(fl.decay, i) * 2 });
      }
      return out;
    }

    /* ---------- beats and waves ---------- */
    var V = 80; // how fast the waves cross the ground on screen, in metres per second (slowed so you can watch them)
    function listenerPos(L, T) {
      if (st.listener === 'far') return { x: cam.x, z: cam.z + 3 };
      var d0 = L.circles[0].dancers[st.youAs === 'man' ? 1 : 0];
      if (d0.x != null) return { x: d0.x, z: d0.z };
      var c = L.circles[0], w = dancerWorld(c, d0, T, circleCentre(c, T));
      return { x: w.x, z: w.z };
    }
    // When the music stops the dancers drift off to rest: to the sides, the stalls and the water, or to sit on an
    // otla. When it starts they walk back, one by one, and the circles form again.
    function restSpot(id, L, d) {
      if (d.coupleRole) { var cs = d.coupleRole === 'w' ? -0.35 : 0.35; return id === 'sheri' ? { x: -2.6 + cs, z: -2.2 } : { x: -3.4 + cs, z: -3.8 }; }
      var r = rnd(), side = rnd() < 0.5 ? -1 : 1;
      if (id === 'sheri') {
        if (r < 0.6) return { x: side * 6.85, z: lerp(-4, 56, rnd()), y: 0.45, sit: true };
        return { x: side * lerp(5, 6.3, rnd()), z: lerp(-2, 58, rnd()) };
      }
      if (L.stalls.length && r < 0.3) { var sl = L.stalls[Math.floor(rnd() * L.stalls.length)]; return { x: sl.front.x + (rnd() - 0.5) * 2.4, z: sl.front.z + (rnd() - 0.5) * 2.4 }; }
      if (id === 'stadium') return { x: side * lerp(19.5, 23.5, rnd()), z: lerp(-4, 32, rnd()), sit: rnd() < 0.35 };
      if (r < 0.45) return { x: side * lerp(16, 23, rnd()), z: lerp(0, 36, rnd()), sit: rnd() < 0.3 };
      return { x: lerp(-18, 18, rnd()), z: lerp(33, 41, rnd()), sit: rnd() < 0.25 };
    }
    function travel(d, slot, dt) {
      var L0 = layout(st.venue), goHome = st.on;
      if (!d.rest) d.rest = restSpot(st.venue, L0, d);
      if (d.x == null || reduce) { var start = goHome ? slot : d.rest; d.x = start.x; d.z = start.z; d.wantHome = goHome; d.wait = 0; }
      if (d.wantHome !== goHome) { d.wantHome = goHome; d.wait = d.delay; }
      var target = goHome ? slot : d.rest, dx = target.x - d.x, dz = target.z - d.z, dist = Math.hypot(dx, dz);
      if (d.wait > 0) d.wait -= dt;
      else if (dist > 0.2) {
        var step = Math.min(dist, d.speed * dt * (goHome && dist < 2 ? 0.6 + dist * 0.2 : 1)), mx = dx / dist, mz = dz / dist, rc = Math.hypot(d.x, d.z);
        // Walk round the centre rather than across it
        if (rc < KEEP_OUT + 2 && (d.x * mx + d.z * mz) < 0) { var tx0 = -d.z / (rc || 1), tz0 = d.x / (rc || 1), side = (tx0 * dx + tz0 * dz) >= 0 ? 1 : -1; mx = mx * 0.3 + tx0 * side; mz = mz * 0.3 + tz0 * side; var ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml; }
        d.x += mx * step; d.z += mz * step; clearOfCentre(d); d.step = (d.step || 0) + step * 5.5;
      }
      if (goHome && dist < 0.35) { d.x = slot.x; d.z = slot.z; }
      d.walking = dist > 0.35 && d.wait <= 0 && !reduce;
      d.atHome = goHome && dist < 0.35;
      d.sitting = !goHome && !d.walking && !!d.rest.sit && dist < 0.35;
      return { x: d.x, z: d.z };
    }
    function spawnBeat(bt, T) {
      var L = layout(st.venue), you = listenerPos(L, T), far = st.listener === 'far';
      var col = st.style === 'dandiya' ? '232,163,61' : '243,230,208', firstT0 = bt;
      L.circles.forEach(function (c, ci) {
        var ctr = circleCentre(c, T), dd = Math.max(0, Math.hypot(you.x - ctr.x, you.z - ctr.z) - c.R), t0 = bt - dd / V;
        firstT0 = Math.min(firstT0, t0);
        var share = 0.5 + 0.45 * st.level;
        c.dancers.forEach(function (d, di) { if (d.atHome && ((ci === 0 && di === 0 && !far) || rnd() < share)) d.clapAt = t0 + d.lag; if (d.atHome && !(ci === 0 && di === 0) && rnd() < 0.04) d.twirl = 1; });
        if ((c.present || 0) < 0.15 || c.small) return;
        waves.push({ kind: 'front', c: c, t0: t0, a: (c.main ? 0.6 : 0.42) * (far ? 1.1 : 1) * Math.min(1, (c.present || 0) * 1.2), col: col, lim: Math.max(10, dd + 3) });
      });
      arrivals.push({ t: bt, g: 1 });
      L.watchers.forEach(function (wt) { if (rnd() < 0.12) wt.clapAt = bt; });
      L.standers.forEach(function (sd0) { if (!sd0.phone && rnd() < 0.1) sd0.clapAt = bt; });
      reflectors(you).forEach(function (r) {
        var dr = Math.hypot(you.x - r.x, you.z - r.z), s0 = Math.max(firstT0, bt + r.d - dr / V);
        waves.push({ kind: 'echo', x: r.x, y: r.y, z: r.z, t0: s0, a: Math.min(0.5, 0.1 + r.l), lim: dr * 1.05, aim: Math.atan2(you.z - r.z, you.x - r.x) });
        arrivals.push({ t: bt + r.d, g: Math.min(0.55, r.l * 1.4) });
      });
      haze = Math.min(1, haze + ({ outdoors: 0.05, sheri: 0.12, stadium: 0.22 }[st.venue] || 0.1) * (far ? 1.3 : 1));
      pulse = 1;
    }
    function scheduleBeats(t, T) {
      var b = opts.beats ? opts.beats() : null;
      if (!b || !st.on || reduce || st.mode === 'crowd' || st.mode === 'off') { visIdx = null; return; }
      var key = b.anchor.toFixed(4) + '|' + b.period.toFixed(5) + '|' + b.cycle + '|' + b.hits.join(',');
      if (key !== beatKey) { beatKey = key; visIdx = null; }
      var ahead = 0.6;
      if (visIdx === null) visIdx = Math.ceil((t - b.anchor) / b.period);
      while (b.anchor + visIdx * b.period - ahead < t) {
        var bt = b.anchor + visIdx * b.period, pos = ((visIdx % b.cycle) + b.cycle) % b.cycle;
        if (b.hits.indexOf(pos) >= 0 && bt > t) spawnBeat(bt, T);
        visIdx++;
      }
    }

    /* ---------- the song's progress, traced counterclockwise from the front of the main circle ---------- */
    function progressRing(ctr, r, t) {
      var start = -Math.PI / 2;
      g.lineCap = 'round';
      if (st.live) {
        var sw = reduce ? 0 : (t * 0.35) % 1;
        g.strokeStyle = 'rgba(216,69,58,.8)'; g.lineWidth = 2.4; groundRing(ctr.x, ctr.z, r, start + sw * TAU, start + sw * TAU + 0.9, 20); g.stroke();
      } else if (st.progress > 0) {
        g.strokeStyle = '#d6b06f'; g.lineWidth = 2.6; groundRing(ctr.x, ctr.z, r, start, start + Math.min(1, st.progress) * TAU, 72); g.stroke();
      }
      if (st.chapters) st.chapters.forEach(function (f, i) {
        var a = start + f * TAU, p = P(ctr.x + Math.cos(a) * r, 0, ctr.z + Math.sin(a) * r); if (!p) return;
        g.fillStyle = i <= st.chapterIndex ? '#d6b06f' : 'rgba(243,230,208,.4)';
        g.beginPath(); g.arc(p.x, p.y, i === st.chapterIndex ? 3.6 : 2.2, 0, TAU); g.fill();
      });
      g.lineCap = 'butt';
    }

    /* ---------- frame ---------- */
    var camVenue = null, camNow = [0, 4.4, -12.5], horNow = 0.3, camSettled = true;
    var T = 0, lampAt = { x: 0.5, y: 0.6, r: 0.08 }, youLabel = null, partnerLabel = null, lightAt = null;
    function frame(ms) {
      if (!running) return;
      var dt = Math.min(0.05, lastMs ? (ms - lastMs) / 1000 : 0.016); lastMs = ms;
      var t = clock();
      if (!reduce) T += dt;
      TH = THEMES[st.theme] || THEMES.traditional;
      var bb = opts.beats && opts.beats(); BEAT = bb ? ((t - bb.anchor) / bb.period) % 2 : T * 1.8;
      var target = st.listener === 'far' ? 1 : 0;
      // The camera eases between the three places you can stand; a new venue starts in place
      var ct = (CAMS[st.venue] || CAMS.outdoors)[st.listener] || CAMS.outdoors.circle, hf = { circle: 0.3, far: 0.4, stage: 0.3 }[st.listener] || 0.3;
      if (camVenue !== st.venue || reduce) { camVenue = st.venue; camNow = ct.slice(); horNow = hf; }
      var ek = Math.min(1, dt * 2.4);
      camNow[0] += (ct[0] - camNow[0]) * ek; camNow[1] += (ct[1] - camNow[1]) * ek; camNow[2] += (ct[2] - camNow[2]) * ek; horNow += (hf - horNow) * ek;
      camSettled = Math.abs(ct[0] - camNow[0]) + Math.abs(ct[1] - camNow[1]) + Math.abs(ct[2] - camNow[2]) < 0.02;
      view.k += (target - view.k) * Math.min(1, dt * (reduce ? 60 : 2.6));
      var ce = CAMS[st.venue] || CAMS.outdoors, e = ease(Math.max(0, Math.min(1, view.k)));
      HOR = BY + BH * horNow;
      cam.x = camNow[0]; cam.y = camNow[1]; cam.z = camNow[2];
      bright += ((st.on ? 1 : 0.55) - bright) * Math.min(1, dt * 3);
      pulse *= Math.exp(-dt * 5);
      var L = layout(st.venue);
      if (st.on && !reduce) L.circles.forEach(function (c) { c.spin += c.w * dt; });

      scheduleBeats(t, T);
      if (st.on && !reduce && st.mode === 'crowd' && Math.random() < dt * 8) {
        var mc = L.circles[Math.floor(Math.random() * L.circles.length)], md = mc.dancers[Math.floor(Math.random() * mc.dancers.length)], mw = dancerWorld(mc, md, T, circleCentre(mc, T));
        waves.push({ kind: 'murmur', x: mw.x, z: mw.z, t0: t, a: 0.22 });
      }

      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.drawImage(sky(st.venue), 0, 0, W, H);
      if (st.venue === 'outdoors') outdoorsBack(t); else if (st.venue === 'stadium') stadiumBack(t); else sheriBack(t);

      // Reverb haze: how long the venue keeps ringing after each clap
      haze *= Math.exp(-dt / (({ outdoors: 0.5, sheri: 0.9, stadium: 2.2 }[st.venue] || 1) / 2.5));
      var mainP = P(0, 0, 0);
      if (haze > 0.01 && mainP) { var hz = g.createRadialGradient(mainP.x, mainP.y, 4, mainP.x, mainP.y, W * 0.8); hz.addColorStop(0, 'rgba(255,200,130,' + haze * 0.2 + ')'); hz.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = hz; g.fillRect(0, 0, W, H); }

      // Floor rings, then every dancer and garbo sorted far to near
      var items = [], beatPh = 0, b = opts.beats && opts.beats();
      if (b) beatPh = ((t - b.anchor) / b.period) % 2; else beatPh = T * 1.8;
      L.circles.forEach(function (c, ci) {
        if (ci > 1 && (ci - 1) / L.circles.length > st.density) return;
        var ctr = circleCentre(c, T);
        if (c.main) { rangoliAt(ctr, t); progressRing(ctr, c.R + 0.7, t); var lp = P(ctr.x, 0, ctr.z); if (lp) items.push({ z: lp.z, kind: 'lamp', p: lp, main: true, ctr: ctr }); }
        var home = 0;
        c.dancers.forEach(function (d, di) {
          if (d.clapAt && t >= d.clapAt) { d.flash = 1; d.clapAt = 0; }
          d.flash *= Math.exp(-dt * 7); d.twirl *= Math.exp(-dt * 2.2);
          var slot = dancerWorld(c, d, T, ctr), w = travel(d, slot, dt);
          if (d.atHome) home++;
          var p = P(w.x, d.sitting ? (d.rest.y || 0) : 0, w.z); d._px = p ? p.x : null;
          var fd = p ? Math.max(0, Math.min(1, (p.z - 3) / 4)) : 0;
          if (p && p.z > 2.2 && p.x > -60 && p.x < W + 60) items.push({ z: p.z, kind: 'dancer', p: p, d: d, fade: fd, you: !!d.coupleRole && d.coupleRole === (st.youAs === 'man' ? 'm' : 'w') && st.listener === 'circle' && view.k < 0.5, partner: !!d.coupleRole && d.coupleRole !== (st.youAs === 'man' ? 'm' : 'w') && st.listener === 'circle' && view.k < 0.5 });
        });
        c.present = home / c.dancers.length;
        // Raas: neighbours pair up and strike each other's sticks, so each turns toward the other on the beat
        for (var pi = 0; pi + 1 < c.dancers.length; pi += 2) { var da = c.dancers[pi], db = c.dancers[pi + 1]; if (da._px != null && db._px != null) { da.strikeDir = db._px >= da._px ? 1 : -1; db.strikeDir = -da.strikeDir; } else { da.strikeDir = db.strikeDir = 0; } }
      });
      if (!reduce) { moveWalkers(L, st.venue, dt); moveKids(L, st.venue, dt); }
      L.standers.forEach(function (sd0) { if (sd0.clapAt && t >= sd0.clapAt) { sd0.flash = 1; sd0.clapAt = 0; } sd0.flash *= Math.exp(-dt * 4); var p = P(sd0.x, 0, sd0.z); if (p && p.z > 2.5 && p.x > -30 && p.x < W + 30) items.push({ z: p.z, kind: 'dancer', p: p, d: sd0, fade: Math.max(0, Math.min(1, (p.z - 3) / 4)) }); });
      L.kids.forEach(function (k) { var p = P(k.x, 0, k.z); if (p && p.z > 2.5 && p.x > -30 && p.x < W + 30) items.push({ z: p.z, kind: 'dancer', p: p, d: k, fade: Math.max(0, Math.min(1, (p.z - 3) / 4)) }); });
      L.walkers.forEach(function (w, wi) { if (wi / L.walkers.length > st.density) return; var p = P(w.x, 0, w.z), fd = p ? Math.max(0, Math.min(1, (p.z - 4) / 3)) : 0; if (p && fd > 0 && p.x > -40 && p.x < W + 40) items.push({ z: p.z, kind: 'dancer', p: p, d: w, fade: fd }); });
      L.stalls.forEach(function (sl) { var p = P(sl.x, 0, sl.z); if (p) items.push({ z: p.z + 1.5, kind: 'stall', sl: sl, p: p }); });
      L.trees.forEach(function (tr) { if (tr.z >= 44) return; var p = P(tr.x, 0, tr.z); if (p && p.z > 1.5) items.push({ z: p.z, kind: 'tree', tr: tr }); });
      L.props.forEach(function (o) { var p = P(o.x, 0, o.z); if (p && p.z > 2 && p.x > -60 && p.x < W + 60) items.push({ z: p.z, kind: 'prop', o: o }); });
      L.gallery.forEach(function (ga) {
        if (ga.kind === 'runner') { ga.x = Math.sin(T * 0.5) * 8; ga.who.step = T * 9; ga.who.moving = true; }
        var p = P(ga.x, ga.y, ga.z); if (p && p.z > 0.9 && p.x > -60 && p.x < W + 60) items.push({ z: p.z + (ga.kind === 'step' ? 0.6 : 0), kind: 'gallery', ga: ga, p: p });
      });
      L.seats.forEach(function (se) { var p = P(se.x, se.y != null ? se.y : 0.45, se.z); if (p && p.z > 2.2 && p.x > -30 && p.x < W + 30) items.push({ z: p.z, kind: 'seat', se: se, p: p, fade: Math.max(0, Math.min(1, (p.z - 3) / 4)) }); });
      L.watchers.forEach(function (wt) { if (wt.clapAt && t >= wt.clapAt) { wt.flash = 1; wt.clapAt = 0; } wt.flash *= Math.exp(-dt * 3); var p = P(wt.x, 0, wt.z); if (p && p.z > 2.2 && p.x > -30 && p.x < W + 30) items.push({ z: p.z, kind: 'dancer', p: p, d: wt, fade: Math.max(0, Math.min(1, (p.z - 3) / 4)) }); });
      items.sort(function (a, b2) { return b2.z - a.z; });
      var lc0 = P(circleCentre(L.circles[0], T).x, 1, circleCentre(L.circles[0], T).z); lightAt = lc0 ? { x: lc0.x, y: lc0.y } : null;
      youLabel = null; partnerLabel = null;
      var lit = st.lit != null ? st.lit : st.on ? 1 : 0.35;
      // Depth: veils of night air laid between layers of the crowd, thicker the further back, so the circle round
      // the garbo stays crisp and everything behind it recedes instead of piling into one cluster
      var D0 = -cam.z, FOG = [{ z: D0 + 40, a: 0.42 }], fi = 0;
      items.forEach(function (it) {
        while (fi < FOG.length && it.z < FOG[fi].z) fogBand(FOG[fi++]);
        if (it.kind === 'lamp') { var lp2 = it.main && opts.lampScale ? { x: it.p.x, y: it.p.y, s: it.p.s * opts.lampScale, z: it.p.z } : it.p; mandvi(it.ctr, 'back', t); garbo(lp2, it.main ? lit : lit * 0.8, t, it.main); mandvi(it.ctr, 'front', t); it.p = lp2; if (it.main) lampAt = { x: it.p.x / W, y: (it.p.y - it.p.s * 0.9) / H, r: it.p.s * 0.9 / W }; }
        else if (it.kind === 'stall') stall(it.sl, t);
        else if (it.kind === 'tree') drawTree(it.tr, t);
        else if (it.kind === 'prop') prop(it.o, t);
        else if (it.kind === 'gallery') galleryItem(it.ga, it.p, T);
        else if (it.kind === 'seat') { if (!it.se.kind) chair(it.se); if (it.se.who) figure(it.p, it.se.who, T, false, beatPh, it.fade); }
        else { if (it.you || it.partner) followSpot(it.p, it.d); figure(it.p, it.d, T, it.you, beatPh, it.you || it.partner ? 1 : it.fade); if (it.partner) partnerMark(it.p, it.d); }
      });

      while (fi < FOG.length) fogBand(FOG[fi++]);
      FOGF = 0;
      if (st.venue === 'outdoors') outdoorsOver(t); else if (st.venue === 'stadium') stadiumOver(t); else sheriOver(t);
      // Your label always sits on top, so you can find yourself in the crowd
      // Each tag rests on its own head. If the two would overlap, your partner's is lifted above yours with a line down to their head.
      var compact = st.listener !== 'circle', lead = null;
      if (partnerLabel && youLabel) {
        var zs = tagSize(youLabel.h, compact), need = zs.hh + zs.tip + 6, wide = zs.fs * 2.6;
        if (Math.abs(partnerLabel.x - youLabel.x) < wide && Math.abs(partnerLabel.y - youLabel.y) < need) { lead = { x: partnerLabel.hx, y: partnerLabel.y - 2 }; partnerLabel.y = Math.min(partnerLabel.y, youLabel.y) - need; }
      }
      if (partnerLabel) tag(partnerLabel.x, partnerLabel.y, partnerLabel.h, false, partnerLabel.man, T, compact, lead);
      if (youLabel) tag(youLabel.x, youLabel.y, youLabel.h, true, youLabel.man, T, compact, null);

      // Dust and moths drifting up through the light
      if (!reduce && st.venue !== 'sheri') {
        g.save(); g.globalCompositeOperation = 'lighter';
        L.motes.forEach(function (m) {
          m[1] += m[3] * dt; if (m[1] > 9) m[1] = 0.3;
          var q = P(m[0] + Math.sin(T * 0.4 + m[4]) * 0.4, m[1], m[2]); if (!q || q.x < 0 || q.x > W) return;
          g.fillStyle = 'rgba(' + TH.glowTint + ',' + 0.35 * bright * (0.6 + 0.4 * Math.sin(T * 2 + m[4])) + ')';
          g.fillRect(q.x, q.y, Math.max(1, q.s * 0.03), Math.max(1, q.s * 0.03));
        });
        g.restore();
      }

      // Waves
      for (var i = waves.length - 1; i >= 0; i--) {
        var w = waves[i], age = t - w.t0; if (age < 0) continue;
        var r = age * V;
        if (w.kind === 'murmur') {
          var ml = 1.6; if (age * 3 > ml) { waves.splice(i, 1); continue; }
          g.strokeStyle = 'rgba(243,230,208,' + w.a * (1 - age * 3 / ml) + ')'; g.lineWidth = 1; groundRing(w.x, w.z, age * 3, 0, TAU, 24); g.stroke(); continue;
        }
        if (r > w.lim) { waves.splice(i, 1); continue; }
        if (w.kind === 'front') {
          var ctr2 = circleCentre(w.c, T), fa = w.a * Math.pow(1 - r / w.lim, 1.2);
          g.strokeStyle = 'rgba(' + w.col + ',' + fa + ')'; g.lineWidth = 2; groundRing(ctr2.x, ctr2.z, w.c.R + r, 0, TAU, 72); g.stroke();
          g.strokeStyle = 'rgba(' + w.col + ',' + fa * 0.2 + ')'; g.lineWidth = 7; g.stroke();
        } else {
          var ea = w.a * Math.pow(1 - r / w.lim, 1.1), rp = P(w.x, w.y, w.z);
          if (rp && age < 0.2) glow(rp.x, rp.y, Math.max(2, rp.s * 0.6), 'rgba(255,196,110,1)', (1 - age / 0.2) * w.a * 1.5);
          g.strokeStyle = 'rgba(232,163,61,' + ea + ')'; g.lineWidth = 1.6; groundRing(w.x, w.z, r, w.aim - 0.75, w.aim + 0.75, 28); g.stroke();
        }
      }
      for (var j = arrivals.length - 1; j >= 0; j--) if (arrivals[j].t <= t) { youGlow = Math.max(youGlow, arrivals[j].g); arrivals.splice(j, 1); }
      youGlow *= Math.exp(-dt * 6);


      // Soft vignette, then the fade from the previous venue
      var vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      if (fade && fadeA > 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = fadeA; g.drawImage(fade, 0, 0); g.globalAlpha = 1; fadeA -= dt * (reduce ? 10 : 2); g.setTransform(DPR, 0, 0, DPR, 0, 0); }
      if (opts.overlay) opts.overlay(g, W, H);
      if (opts.onFrame) opts.onFrame(lampAt);
      if (!opts.manual) requestAnimationFrame(frame);
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      layoutBox(); statics = {}; fade = null;
    }
    function layoutBox() {
      BX = box ? box.x : 0; BY = box ? box.y : 0; BW = box ? box.w : W; BH = box ? box.h : H;
      HOR = BY + BH * 0.3; F = Math.min(BW, BH * 1.05) * 0.95;
    }
    var singer = { img: null, man: false, url: '' };
    function set(patch) {
      if (patch.singerFace !== undefined) {
        var sf = patch.singerFace || {}, url = sf.url || '';
        if (url !== singer.url) { singer.url = url; singer.img = null; if (url) { var im = new Image(); im.decoding = 'async'; im.onload = function () { if (singer.url === url) singer.img = im; }; im.src = url; } }
        singer.man = !!sf.man;
      }
      if (patch.venue && patch.venue !== st.venue && W > 1) {
        fade = fade || document.createElement('canvas'); fade.width = canvas.width; fade.height = canvas.height;
        fade.getContext('2d').drawImage(canvas, 0, 0); fadeA = 1; waves = []; arrivals = [];
      }
      if (patch.listener && patch.listener !== st.listener) { waves = []; arrivals = []; }
      for (var k in patch) st[k] = patch[k];
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
    resize();
    if (!opts.manual) requestAnimationFrame(frame);
    return {
      set: set, resize: resize,
      // Where the scene composes itself inside the canvas, in CSS pixels. Omit to use the whole canvas.
      setBox: function (b) { box = b; layoutBox(); statics = {}; },
      draw: frame,
      lamp: function () { return lampAt; },
      stop: function () { running = false; }
    };
  }

  window.GarbaVenueScene = { create: create, moonInfo: moonInfo };
})();
