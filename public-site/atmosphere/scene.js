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
    outdoors: { circle: [0, 4.4, -12.5], far: [0, 5.5, -26], stage: [0, 3.3, 37.6] },
    stadium: { circle: [0, 4.6, -12.5], far: [0, 9.5, -37], stage: [0, 3.2, 27.3] },
    sheri: { circle: [0, 4, -11.5], far: [-3, 3, -23], stage: [0, 2.9, 57.6] }
  };

  // The DJ's booth beside the stage, where you walk to pick the next song. The camera stands in front of the table.
  var DJ = { outdoors: { x: 19.5, z: 22 }, stadium: { x: 15.5, z: 17 }, sheri: { x: 4.4, z: 60.6 } };
  // The booth and the space in front of it, where you stand to pick songs, stay clear
  function clearOfBooth(id, x, z, r) { var b = DJ[id]; return !b || (Math.hypot(b.x - x, b.z - z) > r + 3.2 && Math.hypot(b.x - x, b.z - 2.4 - z) > r + 2.6); }
  function djCam(id) { var b = DJ[id] || DJ.outdoors; return [b.x, 1.62, b.z - 2.35]; }

  function create(canvas, opts) {
    opts = opts || {};
    var g = canvas.getContext('2d');
    var W = 1, H = 1, DPR = 1, F = 1, HOR = 1, box = null, BX = 0, BY = 0, BW = 1, BH = 1;
    var cam = { x: 0, y: 4, z: -15 };
    var TH = THEMES.traditional, BEAT = 0, band = {};
    var st = { dj: false, djSay: '', youAs: 'woman', theme: 'traditional', density: 1, venue: 'outdoors', listener: 'circle', style: 'claps', mode: 'immersive', on: false, level: 0.6, lit: null, progress: 0, chapters: null, chapterIndex: -1, live: false };
    var view = { k: 0 };
    var rnd = seeded(opts.seed || (Date.now() % 100000) + 11);
    var layouts = {}, statics = {}, fade = null, fadeA = 0;
    var waves = [], arrivals = [], haze = 0, youGlow = 0, pulse = 0, beatKey = '', visIdx = null, lastMs = 0, running = true;
    // Render quality steps down on its own when frames run slow: first fewer pixels, then a smaller crowd
    var PIXELS = 2.4e6, QP = 1, QD = 1, slowFor = 0, frameMs = 16;
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
          var ok = clearOfBooth(id, x, z, R) && circles.every(function (c) { return Math.hypot(c.x0 - x, c.z0 - z) > c.R + R + 2.4; });
          if (ok) circles.push(makeCircle(x, z, R, false));
        }
      }
      // Around the edges: pairs spinning together and a few dancing alone
      var nPairs = id === 'outdoors' ? 9 : id === 'stadium' ? 6 : 3, bx0 = BOUNDS[id], ptries = 0, placed = 0;
      while (placed < nPairs && ptries++ < 400) {
        var solo = rnd() < 0.3, pr = solo ? 0.3 : 0.55, px = lerp(bx0[0] + 1, bx0[1] - 1, rnd()), pz = lerp(Math.max(bx0[2], 1), bx0[3] - 1, rnd());
        if (clearOfBooth(id, px, pz, pr) && circles.every(function (c) { return Math.hypot(c.x0 - px, c.z0 - pz) > c.R + pr + 1.6; })) { var pc = makeCircle(px, pz, pr, false, null, solo ? 1 : 2); pc.w = (solo ? 2.4 : 1.8) * (rnd() < 0.5 ? 1 : 1.2); pc.small = true; circles.push(pc); placed++; }
      }
      // Life around the dancing: people stopped at the edge of a circle to watch, clusters chatting further off,
      // and phones held up to record
      var standers = [];
      circles.forEach(function (c, ci) {
        if (c.small || ci === 1) return;
        var n = ci === 0 ? 0 : 1 + Math.floor(rnd() * 3), outer = ci === 0 && circles[1] && circles[1].parent ? (circles[2] && circles[2].parent ? circles[2].R : circles[1].R) : c.R;
        if (ci === 0) n = id === 'sheri' ? 4 : 10;
        for (var k = 0; k < n; k++) { var a = rnd() * TAU, rr = outer + 1.6 + rnd() * 1.6, sx = c.x0 + Math.cos(a) * rr, sz = c.z0 + Math.sin(a) * rr; if (sz < BOUNDS[id][2] - 2 || Math.abs(sx) > (id === 'sheri' ? 6.4 : 26) || !clearOfBooth(id, sx, sz, 0)) continue; standers.push(person({ x: sx, z: sz, stander: true, phone: rnd() < 0.3, sway: rnd() * TAU })); }
      });
      for (var gi = 0; gi < (id === 'sheri' ? 3 : 7); gi++) {
        var bx1 = BOUNDS[id], gx = lerp(bx1[0] + 2, bx1[1] - 2, rnd()), gz = lerp(Math.max(bx1[2], 0), bx1[3] - 2, rnd());
        if (!clearOfBooth(id, gx, gz, 1) || !circles.every(function (c) { return Math.hypot(c.x0 - gx, c.z0 - gz) > c.R + 2.4; })) continue;
        var m = 2 + Math.floor(rnd() * 3);
        for (var j = 0; j < m; j++) { var aj = j / m * TAU + rnd() * 0.5; standers.push(person({ x: gx + Math.cos(aj) * 0.7, z: gz + Math.sin(aj) * 0.55, stander: true, chat: true, phone: rnd() < 0.15, sway: rnd() * TAU, kid: rnd() < 0.15 })); }
      }
      var L = { circles: circles, houses: id === 'sheri' ? houses() : null, stands: id === 'stadium' ? stands() : null, stalls: stallsFor(id), standers: standers };
      L.gallery = galleryFor(id);
      L.kids = []; for (var ki = 0; ki < (id === 'sheri' ? 7 : 12); ki++) { var ks = freeSpot(id, L); L.kids.push(person({ x: ks.x, z: ks.z, tx: ks.x, tz: ks.z, wait: rnd() * 2, speed: 3 + rnd() * 1.4, step: 0, walker: true, kid: true, h: 0.9 + rnd() * 0.3 })); }
      L.walkers = walkersFor(id, L);
      L.seats = seatsFor(id);
      // Some of the people sitting out hold a cup of tea or look at their phones
      L.seats.forEach(function (se) { if (!se.who || se.who.kid) return; var r = rnd(); if (r < 0.22) se.who.holding = 'tea'; else if (r < 0.34) se.who.holding = 'phone'; });
      L.watchers = watchersFor(id);
      L.trees = treesFor(id);
      L.props = propsFor(id, L);
      if (id === 'sheri') sheriStreet(L);
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
    var BOUNDS = { outdoors: [-23, 23, -5, 40], stadium: [-21, 21, -5, 32], sheri: [-6, 6, -10, 60] };
    function freeSpot(id, L) {
      var bx = BOUNDS[id];
      for (var k = 0; k < 40; k++) {
        var x = lerp(bx[0], bx[1], rnd()), z = lerp(bx[2], bx[3], rnd());
        if (clearOfBooth(id, x, z, 0) && L.circles.every(function (c) { return Math.hypot(c.x0 - x, c.z0 - z) > c.R + 1.8; })) return { x: x, z: z };
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
    // Children: run between open spots round the ground (never ringing the garbo), and once the music plays now and then
    // straight through a circle. Anyone who can't reach a spot in a few seconds picks another, so nobody gets stuck
    // The mandvi, rangoli and diyas sit in a clear space nobody walks through
    var KEEP_OUT = 2.9;
    function clearOfCentre(o) {
      var d = Math.hypot(o.x, o.z);
      if (d < KEEP_OUT) { var k = d > 0.01 ? KEEP_OUT / d : 1; o.x = d > 0.01 ? o.x * k : KEEP_OUT; o.z = d > 0.01 ? o.z * k : 0; }
    }
    // Heading across the centre: go round it instead, keeping to one side for the whole detour. Choosing the side
    // afresh every frame made anyone bound for the spot straight across flip back and forth and stick at the edge.
    function roundCentre(o, mx, mz, dx, dz) {
      var rc = Math.hypot(o.x, o.z);
      if (rc > KEEP_OUT + 2.6) o.around = 0;
      if (rc > KEEP_OUT + 2.2 || (o.x * mx + o.z * mz) >= -0.05 * (rc || 1)) return [mx, mz];
      var ux = o.x / (rc || 1), uz = o.z / (rc || 1), tx = -uz, tz = ux;
      if (!o.around) o.around = (tx * dx + tz * dz) >= 0 ? 1 : -1;
      var nx = mx * 0.2 + tx * o.around + ux * 0.2, nz = mz * 0.2 + tz * o.around + uz * 0.2, l = Math.hypot(nx, nz) || 1;
      return [nx / l, nz / l];
    }
    function moveKids(L, id, dt) {
      var bx = BOUNDS[id];
      L.kids.forEach(function (k) {
        if (k.wait > 0) { k.wait -= dt; k.moving = false; return; }
        var dx = k.tx - k.x, dz = k.tz - k.z, d = Math.hypot(dx, dz);
        k.tt = (k.tt || 0) + dt;
        if (d < 0.3 || k.tt > 12) {
          k.moving = false; k.wait = rnd() * 0.8; k.around = 0; k.tt = 0;
          if (!st.on || L.circles.length <= 3) { var p0 = freeSpot(id, L); k.tx = p0.x; k.tz = p0.z; k.through = false; }
          else if (rnd() < 0.3 && L.circles.length > 3) { var c = L.circles[3 + Math.floor(rnd() * (L.circles.length - 3))], a2 = rnd() * TAU; k.tx = c.x0 + Math.cos(a2) * (c.R + 3); k.tz = Math.max(bx[2], c.z0 + Math.sin(a2) * (c.R + 3)); k.through = true; }
          else { var p = freeSpot(id, L); k.tx = p.x; k.tz = p.z; k.through = false; }
          return;
        }
        var vx = dx / d, vz = dz / d, bo = DJ[id];
        if (bo) { var bx0 = k.x - bo.x, bz0 = k.z - (bo.z - 1.2), bd = Math.hypot(bx0, bz0); if (bd < 4.5 && bd > 0.01) { var bp = (4.5 - bd) / 1.5; vx += bx0 / bd * bp; vz += bz0 / bd * bp; } }
        if (st.on && !k.through) L.circles.forEach(function (c) { var cx = k.x - c.x0, cz = k.z - c.z0, cd = Math.hypot(cx, cz), keep = c.R + 1.2; if (cd < keep + 1.5 && cd > 0.01) { var push = (keep + 1.5 - cd) / 1.5 * Math.min(1, d / 3); vx += cx / cd * push; vz += cz / cd * push; } });
        var vl0 = Math.hypot(vx, vz) || 1, rk = roundCentre(k, vx / vl0, vz / vl0, dx, dz); vx = rk[0]; vz = rk[1];
        var vl = 1, sp = k.speed * (st.on && !k.through ? 0.8 : 1);
        k.x += vx / vl * sp * dt; k.z += vz / vl * sp * dt; clearOfCentre(k); k.step = (k.step || 0) + dt * sp * 6; k.moving = true;
      });
    }
    function moveWalkers(L, id, dt) {
      L.walkers.forEach(function (w) {
        w.snap = Math.max(0, (w.snap || 0) - dt * 4);
        if (w.wait > 0) { w.wait -= dt; w.moving = false; if (w.photo && st.on && Math.random() < dt * 0.5) w.snap = 1; return; }
        var dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz);
        w.tt = (w.tt || 0) + dt;
        if (d < 0.3 || w.tt > 18) {
          w.moving = false; w.tt = 0; w.wait = w.kid ? 0.5 + rnd() * 2 : 2 + rnd() * 6;
          var target = L.stalls.length && rnd() < 0.35 ? L.stalls[Math.floor(rnd() * L.stalls.length)].front : freeSpot(id, L);
          w.tx = target.x + (rnd() - 0.5) * 1.2; w.tz = target.z + (rnd() - 0.5) * 1.2; w.around = 0; return;
        }
        // Head for the target and step around the circles and the DJ's booth on the way
        var vx = dx / d, vz = dz / d, bo = DJ[id];
        if (bo) { var bx0 = w.x - bo.x, bz0 = w.z - (bo.z - 1.2), bd = Math.hypot(bx0, bz0); if (bd < 4.5 && bd > 0.01) { var bp = (4.5 - bd) / 1.5; vx += bx0 / bd * bp; vz += bz0 / bd * bp; } }
        L.circles.forEach(function (c) {
          var cx = w.x - c.x0, cz = w.z - c.z0, cd = Math.hypot(cx, cz), keep = c.R + 1.6;
          if (cd < keep + 2 && cd > 0.01) { var push = (keep + 2 - cd) / 2 * Math.min(1, d / 3); vx += cx / cd * push - cz / cd * push * 0.6; vz += cz / cd * push + cx / cd * push * 0.6; }
        });
        var vl0 = Math.hypot(vx, vz) || 1, rw = roundCentre(w, vx / vl0, vz / vl0, dx, dz); vx = rw[0]; vz = rw[1];
        var vl = 1;
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
      // Rows behind you thin out in the middle so you look over shoulders, not into backs
      for (var rz = 0; rz < 4; rz++) for (var cx0 = -hw; cx0 <= hw; cx0 += 0.62 + rnd() * 0.3) {
        var zz = sz0 - 2.3 - rz * 0.9 + (rnd() - 0.5) * 0.3, aisle = rz < 2 ? 1.5 : 0.9 + rz * 0.5;
        if (rnd() < 0.2 || Math.abs(cx0) < aisle) continue;
        var djb0 = DJ[id]; if (djb0 && Math.abs(cx0 - djb0.x) < 1.8 && zz > djb0.z - 3.6 && zz < djb0.z + 1.2) continue;
        var rec = rnd() < 0.45, pp2 = person({ stander: true, phone: rec, video: rec && rnd() < 0.6, sway: rnd() * TAU, kid: rnd() < 0.06 });
        out.push({ x: cx0, y: 0, z: zz, kind: 'stand', who: pp2, view: 'stage' });
      }
      ['w', 'm'].forEach(function (role2) {
        var pp2 = person({ stander: true, sway: rnd() * TAU, man: role2 === 'm' }); pp2.seatRole = role2;
        if (role2 === 'w') { pp2.col = '#8e1b2c'; pp2.top = '#d6a24a'; pp2.odhni = '#f3e6d0'; pp2.h = 1.62; } else { pp2.col = '#f3e6d0'; pp2.top = '#f3e6d0'; pp2.pagdi = '#8e1b2c'; pp2.stole = '#e8b04b'; pp2.h = 1.76; }
        out.push({ x: role2 === 'w' ? -0.3 : 0.35, y: 0, z: sz0 - 2.1, kind: 'stand', who: pp2, view: 'stage' });
      });
      // Children chasing each other across the open ground in front of the stage, and a videographer with a gimbal at the barrier
      for (var rk = 0; rk < 3; rk++) out.push({ x: 0, y: 0, z: sz0 - 1.3 + rk * 0.3, kind: 'runner', view: 'stage', amp: hw * 0.55, sp: 0.45 + rk * 0.04, ph: rk * 0.5, who: person({ kid: true, h: 0.95 + rnd() * 0.25, walker: true, moving: true, step: rk }) });
      out.push({ x: -hw * 0.55, y: 0, z: sz0 - 0.9, kind: 'stand', view: 'stage', who: person({ stander: true, phone: true, video: true, gimbal: true, sway: 0.4, man: true }) });
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
        [[-14.8, 0.55, 0], [-14.3, 0.48, 0.6], [-12.6, 0.4, 2.1]].forEach(function (k) { out.push({ x: 0, y: 0, z: k[0], kind: 'runner', view: 'far', cx: -1, amp: 3.6, sp: k[1], ph: k[2], who: person({ kid: true, h: 0.95 + rnd() * 0.25, walker: true, moving: true, step: 0 }) }); });
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
    // Up the lane from the bench: the house on your right is purple with a white van
    // parked in front of it, and a motorbike and an Activa stand across the lane edges
    function sheriStreet(L) {
      var zc = 1.5, right = L.houses.filter(function (h) { return h.side > 0 && h.z1 <= zc && h.z2 >= zc; })[0];
      if (right) right.col = '#7a4f9e';
      var vz0 = zc - 1.9, vz1 = zc + 1.9;
      L.props = L.props.filter(function (o) { return !(o.x > 3 && o.z > vz0 - 1 && o.z < vz1 + 1) && !(o.z > -14.5 && o.z < -9 && Math.abs(o.x) > 4); });
      L.seats = L.seats.filter(function (se) { return !(se.x > 3 && se.z > vz0 - 1 && se.z < vz1 + 1); });
      L.props.push({ kind: 'van', x: 5.3, z: zc });
      L.props.push({ kind: 'bike', x: -5.5, z: -12.2, side: -1, col: '#1c1c1c' });
      L.props.push({ kind: 'activa', x: -5.55, z: 3.2, side: -1, col: '#e9e7e1' });
      L.props.push({ kind: 'activa', x: 5.55, z: -12.4, side: 1, col: '#2f6fa8' });
      L.props.push({ kind: 'bike', x: -5.4, z: 12.5, side: -1, col: '#8e1b2c' });
    }
    // A wheel in the side plane of a vehicle parked along the lane (points in y and z at a fixed x)
    function sideWheel(x, y, z, r) { var pts = []; for (var k = 0; k < 14; k++) { var a = k / 14 * TAU; pts.push([x, y + Math.sin(a) * r, z + Math.cos(a) * r]); } fillPoly(pts, '#141414'); var hub = []; for (var k2 = 0; k2 < 10; k2++) { var a2 = k2 / 10 * TAU; hub.push([x - 0.005, y + Math.sin(a2) * r * 0.5, z + Math.cos(a2) * r * 0.5]); } fillPoly(hub, '#8f9398'); }
    function van(o) {
      // A white Eeco-style van: its side faces the lane, its back faces you
      var x0 = o.x - 0.72, x1 = o.x + 0.72, z0 = o.z - 1.9, z1 = o.z + 1.9, b = 0.28, top = 1.9;
      fillPoly([[x0, top, z0], [x1, top, z0], [x1, top, z1 - 0.45], [x0, top, z1 - 0.45]], '#cfd0cc');
      fillPoly([[x0, b, z0], [x0, b, z1], [x0, 1.05, z1], [x0, top, z1 - 0.45], [x0, top, z0]], '#ecece7');
      fillPoly([[x0 - 0.004, 1.15, z0 + 0.25], [x0 - 0.004, 1.15, z1 - 0.9], [x0 - 0.004, 1.72, z1 - 0.9], [x0 - 0.004, 1.72, z0 + 0.25]], '#2a323c');
      fillPoly([[x0 - 0.005, 1.15, z1 - 0.8], [x0 - 0.005, 1.05, z1 - 0.1], [x0 - 0.005, 1.72, z1 - 0.52], [x0 - 0.005, 1.72, z1 - 0.8]], '#2a323c');
      [z0 + 1.3, z0 + 2.45].forEach(function (zp) { var a = P(x0 - 0.006, 1.15, zp), c = P(x0 - 0.006, 1.72, zp); if (a && c) { g.strokeStyle = '#ecece7'; g.lineWidth = Math.max(1, a.s * 0.04); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke(); } });
      var sl0 = P(x0 - 0.006, b + 0.05, z0 + 1.3), sl1 = P(x0 - 0.006, 1.1, z0 + 1.3); if (sl0 && sl1) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sl0.x, sl0.y); g.lineTo(sl1.x, sl1.y); g.stroke(); }
      fillPoly([[x0 - 0.004, b, z0], [x0 - 0.004, b, z1], [x0 - 0.004, b + 0.14, z1], [x0 - 0.004, b + 0.14, z0]], '#9a9c98');
      sideWheel(x0 - 0.01, 0.3, z0 + 0.65, 0.3); sideWheel(x0 - 0.01, 0.3, z1 - 0.7, 0.3);
      // The back: big rear window, tail lights, a yellow plate and a dark bumper
      fillPoly([[x0, b, z0], [x1, b, z0], [x1, top, z0], [x0, top, z0]], '#f1f1ec');
      fillPoly([[x0 + 0.14, 1.15, z0 - 0.004], [x1 - 0.14, 1.15, z0 - 0.004], [x1 - 0.14, 1.75, z0 - 0.004], [x0 + 0.14, 1.75, z0 - 0.004]], '#262e37');
      fillPoly([[x0 + 0.14, 1.55, z0 - 0.005], [x0 + 0.55, 1.75, z0 - 0.005], [x0 + 0.4, 1.75, z0 - 0.005], [x0 + 0.14, 1.62, z0 - 0.005]], 'rgba(255,255,255,.12)');
      [x0 + 0.06, x1 - 0.2].forEach(function (lx) { fillPoly([[lx, 0.62, z0 - 0.005], [lx + 0.14, 0.62, z0 - 0.005], [lx + 0.14, 0.95, z0 - 0.005], [lx, 0.95, z0 - 0.005]], '#a51d1a'); });
      fillPoly([[o.x - 0.24, 0.5, z0 - 0.006], [o.x + 0.24, 0.5, z0 - 0.006], [o.x + 0.24, 0.62, z0 - 0.006], [o.x - 0.24, 0.62, z0 - 0.006]], '#f2cf3e');
      fillPoly([[x0, b, z0 - 0.02], [x1, b, z0 - 0.02], [x1, 0.45, z0 - 0.02], [x0, 0.45, z0 - 0.02]], '#3a3b3d');
      var sh = P(o.x, 0, o.z); if (sh) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(sh.x, sh.y, sh.s * 0.9, sh.s * 0.12, 0, 0, TAU); g.fill(); }
    }
    // A motorbike or an Activa parked across the lane edge, seen side-on, its front towards the middle of the lane
    function twoWheeler(o) {
      var p = P(o.x, 0, o.z); if (!p) return;
      var s = p.s, dir = -o.side, bike = o.kind === 'bike', wr = s * (bike ? 0.31 : 0.23), wb = s * (bike ? 0.66 : 0.55), fx = p.x + dir * wb, rx = p.x - dir * wb, wy = p.y - wr;
      [fx, rx].forEach(function (wx) { g.fillStyle = '#131313'; g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.fill(); g.fillStyle = '#9ca0a5'; g.beginPath(); g.arc(wx, wy, wr * 0.45, 0, TAU); g.fill(); if (s > 30) { g.strokeStyle = 'rgba(40,40,40,.8)'; g.lineWidth = 1; for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI; g.beginPath(); g.moveTo(wx - Math.cos(a) * wr * 0.42, wy - Math.sin(a) * wr * 0.42); g.lineTo(wx + Math.cos(a) * wr * 0.42, wy + Math.sin(a) * wr * 0.42); g.stroke(); } } });
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (bike) {
        g.strokeStyle = '#2b2b2e'; g.lineWidth = Math.max(1, s * 0.04); g.beginPath(); g.moveTo(rx, wy); g.lineTo(p.x, p.y - s * 0.62); g.lineTo(fx - dir * s * 0.08, p.y - s * 0.95); g.lineTo(fx, wy); g.stroke();
        g.fillStyle = o.col; g.beginPath(); g.ellipse(p.x + dir * s * 0.18, p.y - s * 0.8, s * 0.24, s * 0.1, 0, 0, TAU); g.fill();
        g.fillStyle = '#161616'; g.beginPath(); g.moveTo(p.x - dir * s * 0.1, p.y - s * 0.78); g.lineTo(p.x - dir * s * 0.55, p.y - s * 0.72); g.lineTo(p.x - dir * s * 0.55, p.y - s * 0.66); g.lineTo(p.x - dir * s * 0.1, p.y - s * 0.7); g.closePath(); g.fill();
        g.strokeStyle = '#c9ccd1'; g.lineWidth = Math.max(1, s * 0.035); g.beginPath(); g.moveTo(p.x, p.y - s * 0.4); g.lineTo(rx - dir * s * 0.1, p.y - s * 0.42); g.stroke();
        g.strokeStyle = '#1b1b1b'; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.moveTo(fx - dir * s * 0.1, p.y - s * 0.98); g.lineTo(fx - dir * s * 0.02, p.y - s * 1.08); g.lineTo(fx - dir * s * 0.24, p.y - s * 1.1); g.stroke();
        g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(fx + dir * s * 0.02, p.y - s * 0.93, s * 0.06, 0, TAU); g.fill();
      } else {
        // Activa: step-through body, front apron, floorboard and the rounded rear cowl
        g.fillStyle = o.col;
        g.beginPath(); g.moveTo(fx - dir * s * 0.05, p.y - s * 0.28); g.quadraticCurveTo(fx - dir * s * 0.02, p.y - s * 0.95, fx - dir * s * 0.15, p.y - s * 1.0); g.lineTo(fx - dir * s * 0.28, p.y - s * 0.95); g.lineTo(fx - dir * s * 0.3, p.y - s * 0.3); g.closePath(); g.fill();
        g.fillRect(Math.min(fx - dir * s * 0.3, p.x + dir * s * 0.05), p.y - s * 0.3, Math.abs(fx - dir * s * 0.3 - (p.x + dir * s * 0.05)), s * 0.06);
        g.beginPath(); g.moveTo(p.x + dir * s * 0.05, p.y - s * 0.28); g.quadraticCurveTo(p.x - dir * s * 0.1, p.y - s * 0.72, rx + dir * s * 0.05, p.y - s * 0.62); g.quadraticCurveTo(rx - dir * s * 0.28, p.y - s * 0.5, rx - dir * s * 0.12, p.y - s * 0.3); g.closePath(); g.fill();
        g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(p.x - dir * s * 0.28, p.y - s * 0.7, s * 0.3, s * 0.06, 0, 0, TAU); g.fill();
        g.strokeStyle = '#2a2a2a'; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.moveTo(fx - dir * s * 0.2, p.y - s * 1.02); g.lineTo(fx - dir * s * 0.38, p.y - s * 1.05); g.stroke();
        g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(fx - dir * s * 0.12, p.y - s * 0.9, s * 0.045, 0, TAU); g.fill();
        g.strokeStyle = '#555'; g.lineWidth = 1; g.beginPath(); g.moveTo(fx - dir * s * 0.24, p.y - s * 1.04); g.lineTo(fx - dir * s * 0.3, p.y - s * 1.16); g.stroke();
      }
      g.lineCap = 'butt';
    }
    function prop(o, t) {
      if (o.kind === 'van') { van(o); return; }
      if (o.kind === 'bike' || o.kind === 'activa') { twoWheeler(o); return; }
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
      if (ga.who && ga.who.seatRole && (ga.view || 'far') === st.listener && !st.dj && ga.who.headAt) {
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
      if (sit && !reduce && st.on) x += Math.sin(T0 * 1.6 + (d.ph || 0) * 3) * h * 0.02;
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
      if (d.phone && d.video) {
        // Held sideways to record: the screen shows the stage lights, with the red recording dot
        var pw0 = h * (d.gimbal ? 0.13 : 0.11), ph0 = pw0 * 0.56, px0 = x + h * 0.1 - pw0 / 2, py0 = sh - h * 0.25;
        if (d.gimbal) { g.strokeStyle = '#1a1a1a'; g.lineWidth = Math.max(1, h * 0.02); g.beginPath(); g.moveTo(x + h * 0.1, sh - h * 0.16); g.lineTo(x + h * 0.1, py0 + ph0); g.stroke(); }
        g.fillStyle = '#0d0d0d'; g.fillRect(px0 - 1, py0 - 1, pw0 + 2, ph0 + 2);
        var sg0 = g.createLinearGradient(px0, 0, px0 + pw0, 0); sg0.addColorStop(0, 'hsl(' + TH.hues[0] + ',' + TH.sat + '%,' + (30 + 15 * pulse) + '%)'); sg0.addColorStop(1, 'hsl(' + TH.hues[TH.hues.length - 1] + ',' + TH.sat + '%,' + (38 + 15 * pulse) + '%)');
        g.fillStyle = sg0; g.fillRect(px0, py0, pw0, ph0);
        g.fillStyle = 'rgba(255,240,210,.8)'; g.fillRect(px0 + pw0 * 0.3, py0 + ph0 * 0.55, pw0 * 0.4, ph0 * 0.2);
        if (Math.sin(T0 * 4 + (d.sway || 0)) > -0.3) { g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(px0 + pw0 * 0.14, py0 + ph0 * 0.22, Math.max(0.8, ph0 * 0.12), 0, TAU); g.fill(); }
        glow(x + h * 0.1, py0 + ph0 / 2, Math.max(1, h * 0.05), '#eaf3ff', 0.35);
      } else if (d.phone) { g.fillStyle = 'rgba(200,225,255,.95)'; g.fillRect(x + h * 0.075, sh - h * 0.25, h * 0.05, h * 0.09); glow(x + h * 0.1, sh - h * 0.2, Math.max(0.8, h * 0.03), '#eaf3ff', 0.5); }
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
    // A moulded plastic chair side-on along the edge: four splayed legs, the seat, and a back with slots in it
    function chair(se) {
      var sd = se.side, x = se.x, z = se.z, o = sd * 0.22;
      g.strokeStyle = se.col;
      [[-o, -0.2], [-o, 0.2], [o, -0.2], [o, 0.2]].forEach(function (l) { var a = P(x + l[0] * 1.1, 0, z + l[1] * 1.1), b = P(x + l[0], 0.45, z + l[1]); if (a && b) { g.lineWidth = Math.max(0.7, a.s * 0.03); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } });
      fillPoly([[x - o, 0.45, z - 0.22], [x + o, 0.45, z - 0.22], [x + o, 0.45, z + 0.22], [x - o, 0.45, z + 0.22]], se.col);
      fillPoly([[x + o, 0.45, z - 0.22], [x + o * 1.12, 0.95, z - 0.2], [x + o * 1.12, 0.95, z + 0.2], [x + o, 0.45, z + 0.22]], se.col);
      var sl = P(x + o * 1.06, 0.72, z); if (sl && sl.s > 22) { g.fillStyle = 'rgba(0,0,0,.2)'; for (var k = -1; k <= 1; k++) { var q = P(x + o * 1.06, 0.72, z + k * 0.1); if (q) g.fillRect(q.x - 0.5, q.y - q.s * 0.1, Math.max(1, q.s * 0.02), q.s * 0.2); } }
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
        var base = P(x, 0, 16), top = P(x, 11, 16); if (!base || !top) return;
        g.strokeStyle = '#1c1511'; g.lineWidth = Math.max(1, base.s * 0.3); g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(top.x, top.y); g.stroke();
        // The lamp head: a dark frame of four lamps angled down at the ground, with the light falling from it
        var hw = top.s * 1.6, hh = top.s * 0.9, hx = top.x - hw / 2, hy = top.y - hh;
        var beam = g.createLinearGradient(top.x, top.y, pool ? pool.x : top.x, pool ? pool.y : top.y + 200);
        beam.addColorStop(0, 'rgba(255,240,210,' + 0.1 * bright + ')'); beam.addColorStop(1, 'rgba(255,240,210,0)');
        if (pool) { g.fillStyle = beam; g.beginPath(); g.moveTo(hx, top.y); g.lineTo(hx + hw, top.y); g.lineTo(pool.x + pool.s * 6, pool.y); g.lineTo(pool.x - pool.s * 6, pool.y); g.closePath(); g.fill(); }
        g.fillStyle = '#16110e'; g.fillRect(hx - 1, hy - 1, hw + 2, hh + 2);
        for (var k = 0; k < 4; k++) glow(hx + hw * (k % 2 ? 0.72 : 0.28), hy + hh * (k < 2 ? 0.3 : 0.72), Math.max(1, Math.min(3.4, top.s * 0.22)), '#fff4dc', 0.35 + 0.65 * bright);
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
      screenPanel(sx0, sx1, o.h, o.screenTop, zB, t, id);
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
        cabinet(sx - 0.4, 0, zF - 0.9, 0.78, 1.1); cabinet(sx + 0.4, 0, zF - 0.9, 0.78, 1.1); cabinet(sx, 1.1, zF - 0.9, 0.7, 0.55);
      });
      // Front edge of the stage with a line of bulbs
      for (var fb = 0; fb <= 16; fb++) { var fp = P(lerp(o.x0, o.x1, fb / 16), o.h, zF - 0.02); if (fp) glow(fp.x, fp.y, Math.max(0.7, Math.min(2.2, fp.s * 0.07)), TH.bulbs[fb % TH.bulbs.length], (0.8 + 0.2 * pulse) * bright); }
      if (st.listener === 'stage') {
        // Cables snaking across the deck to the mic stands and the players
        g.strokeStyle = 'rgba(8,8,10,.9)';
        [-0.3, -0.12, 0.08, 0.22, 0.36].forEach(function (u, ci) {
          var a0 = P(u * (o.x1 - o.x0), o.h + 0.01, zF + 0.3), a1 = P(u * (o.x1 - o.x0) + (ci % 2 ? 0.9 : -0.7), o.h + 0.01, zF + 0.9), a2 = P(u * (o.x1 - o.x0) + (ci % 2 ? 0.3 : -0.2), o.h + 0.01, zB - 0.05);
          if (a0 && a1 && a2) { g.lineWidth = Math.max(1, a0.s * 0.02); g.beginPath(); g.moveTo(a0.x, a0.y); g.quadraticCurveTo(a1.x, a1.y, a2.x, a2.y); g.stroke(); }
        });
        // Up close: wedge monitors along the front of the deck, low haze rolling off it, and beams sweeping down from the truss
        [-0.18, 0.18, -0.36, 0.36].forEach(function (u) { var mx = u * (o.x1 - o.x0); fillPoly([[mx - 0.35, o.h, zF + 0.15], [mx + 0.35, o.h, zF + 0.15], [mx + 0.3, o.h + 0.32, zF + 0.4], [mx - 0.3, o.h + 0.32, zF + 0.4]], '#0c0a0a'); });
        if (st.on) {
          g.save(); g.globalCompositeOperation = 'lighter';
          for (var hz = 0; hz < 3; hz++) { var hp = P(Math.sin(t * 0.2 + hz * 2.1) * (o.x1 - o.x0) * 0.3, o.h + 0.3, zF + 0.2); if (hp) { var hr = hp.s * 3.2, hg = g.createRadialGradient(hp.x, hp.y, 1, hp.x, hp.y, hr); hg.addColorStop(0, 'rgba(' + TH.glowTint + ',' + 0.07 * bright + ')'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.beginPath(); g.ellipse(hp.x, hp.y, hr, hr * 0.28, 0, 0, TAU); g.fill(); } }
          for (var bm = 0; bm < 6; bm++) {
            var bu = lerp(o.x0 + 1, o.x1 - 1, (bm + 0.5) / 6), sw2 = reduce ? 0 : Math.sin(t * (0.4 + TH.speed) + bm * 1.3) * 3.5;
            var src = P(bu, o.truss - 0.3, zF), d0 = P(bu + sw2 - 1, 0, zF - 5), d1 = P(bu + sw2 + 1, 0, zF - 5); if (!src || !d0 || !d1) continue;
            var bg = g.createLinearGradient(src.x, src.y, (d0.x + d1.x) / 2, d0.y), col = TH.beams[bm % TH.beams.length];
            bg.addColorStop(0, 'rgba(' + col + ',' + (0.16 + 0.1 * pulse) * bright + ')'); bg.addColorStop(1, 'rgba(' + col + ',0)');
            g.fillStyle = bg; g.beginPath(); g.moveTo(src.x, src.y); g.lineTo(d0.x, d0.y); g.lineTo(d1.x, d1.y); g.closePath(); g.fill();
          }
          g.restore();
        }
      }
      bandOn(id, o.h, zF + 0.6, o);
    }
    // The big screen behind the band carries a live aerial shot of the ground, as if a drone were circling over
    // the garbo. When it's too small to read it shows a mandala that breathes with the beat instead.
    // PlayGarba.com sits at the top in the same lettering as the page's own logo, with nothing behind it.
    function screenPanel(x0, x1, y0, y1, z, t, id) {
      if (!poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]])) return;
      var a = P(x0, y0, z), b2 = P(x1, y0, z), tp = P(x0, y1, z), c = P((x0 + x1) / 2, (y0 + y1) / 2, z); if (!a || !b2 || !tp || !c) return;
      var rx = a.x, ry = tp.y, rw = b2.x - a.x, rh = a.y - tp.y;
      g.save(); g.clip();
      if (rh > 34 && rw > 60) aerial(id, rx, ry, rw, rh, t);
      else {
        var lg = g.createLinearGradient(a.x, 0, b2.x, 0);
        TH.hues.forEach(function (hh, i) { lg.addColorStop(i / Math.max(1, TH.hues.length - 1), 'hsl(' + (hh + 15 * Math.sin(t * TH.speed + i)) + ',' + TH.sat + '%,' + (14 + 8 * bright) + '%)'); });
        g.fillStyle = lg; g.fillRect(a.x - 2, 0, b2.x - a.x + 4, H);
        // Mandala: petals and rings that open on each beat
        var R = Math.min(rw * 0.2, rh * 0.42) * (1 + 0.08 * pulse), rot = reduce ? 0 : t * 0.15 * TH.speed / 0.3, my = c.y + rh * 0.06;
        g.strokeStyle = 'rgba(255,236,200,' + (0.35 + 0.35 * pulse) * bright + ')'; g.lineWidth = Math.max(0.8, R * 0.03);
        for (var ring = 1; ring <= 3; ring++) { g.beginPath(); g.arc(c.x, my, R * ring / 3, 0, TAU); g.stroke(); }
        for (var pt = 0; pt < 12; pt++) { var an = rot + pt / 12 * TAU; g.beginPath(); g.ellipse(c.x + Math.cos(an) * R * 0.62, my + Math.sin(an) * R * 0.62, R * 0.3, R * 0.1, an, 0, TAU); g.stroke(); }
      }
      // The panel's LED grid, then the name across the top
      if (rh > 24) { g.fillStyle = ledGrid() || 'rgba(0,0,0,0)'; g.globalAlpha = 0.5; g.fillRect(rx, ry, rw, rh); g.globalAlpha = 1; }
      // Sized like the page's logo, fitted to the part of the screen you can see, and kept below the readout
      var fs = Math.min(W < 700 ? 26 : 32, rh * 0.15, rw * 0.075);
      if (fs >= 7) {
        var top0 = Math.max(ry + fs * 0.35, Math.min(ry + rh * 0.3, 62));
        brandMark(rx + rw / 2, top0 + fs * 0.95, fs);
      }
      g.restore();
    }
    // The logo as the page draws it: by default the site's serif wordmark; a page can pass its own lettering and mark
    var BRAND = opts.brand || {}, markPaths = null;
    function brandMark(cx, base, fs) {
      var text = BRAND.text || 'PlayGarba.com', font = (BRAND.font || '400 {s}px "Iowan Old Style", "Palatino Linotype", Baskerville, Georgia, "Times New Roman", serif').replace('{s}', fs.toFixed(1));
      g.save(); g.font = font; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      try { g.letterSpacing = (BRAND.spacing != null ? BRAND.spacing : 0.018) * fs + 'px'; } catch (e) { /* older canvas */ }
      var tw0 = g.measureText(text).width, ms = BRAND.mark ? fs * 1.15 : 0, gap = BRAND.mark ? fs * 0.32 : 0, x0 = cx - (tw0 + ms + gap) / 2;
      g.shadowColor = 'rgba(3,4,10,.85)'; g.shadowBlur = fs * 0.35; g.shadowOffsetY = fs * 0.05;
      if (BRAND.mark) drawMark(x0, base - fs * 0.92, ms);
      g.fillStyle = '#f6ecd7'; g.fillText(text, x0 + ms + gap, base);
      g.restore();
    }
    // The garbo mark from the player's logo, from the same drawing
    function drawMark(x, y, size) {
      if (!markPaths) {
        try { markPaths = [['M16 1.4c1.9 2.2 3 4 3 5.8 0 1.8-1.3 3-3 3s-3-1.2-3-3c0-1.8 1.1-3.6 3-5.8Z', '#ffb347'], ['M16 5.2c.8 1 1.2 1.8 1.2 2.5 0 .8-.5 1.3-1.2 1.3s-1.2-.5-1.2-1.3c0-.7.4-1.5 1.2-2.5Z', '#fff6dc'], ['M12.1 10.4h7.8a1.1 1.1 0 0 1 0 2.2h-7.8a1.1 1.1 0 0 1 0-2.2Z', '#e8b04b'], ['M11.8 12.4C7.9 14 5.4 17.2 5.4 21c0 5.2 4.8 9.3 10.6 9.3s10.6-4.1 10.6-9.3c0-3.8-2.5-7-6.4-8.6Z', '#a8461f'], ['M10.4 20.3l1.5 2.6h-3Zm5.6 0l1.5 2.6h-3Zm5.6 0l1.5 2.6h-3Z', '#ffd27a']].map(function (p) { return [new Path2D(p[0]), p[1]]; }); } catch (e) { markPaths = []; }
      }
      g.save(); g.translate(x, y); g.scale(size / 32, size / 32);
      markPaths.forEach(function (p) { g.fillStyle = p[1]; g.fill(p[0]); });
      g.strokeStyle = '#e8b04b'; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(7.6, 17.2); g.bezierCurveTo(9.9, 18.2, 12.8, 18.7, 16, 18.7); g.bezierCurveTo(19.2, 18.7, 22.1, 18.2, 24.4, 17.2); g.stroke();
      g.restore();
    }
    var ledPat = null;
    function ledGrid() {
      if (ledPat === null) {
        try { var cv = document.createElement('canvas'); cv.width = cv.height = 3; var c2 = cv.getContext('2d'); c2.fillStyle = 'rgba(0,0,0,.55)'; c2.fillRect(2, 0, 1, 3); c2.fillRect(0, 2, 3, 1); ledPat = g.createPattern(cv, 'repeat'); } catch (e) { ledPat = false; }
      }
      return ledPat || null;
    }
    // A quiet sequence of overhead drone shots. It follows the same people as the ground scene,
    // but lets their movement make the gathering readable instead of drawing its circles for them.
    function aerial(id, rx, ry, rw, rh, t) {
      var L = layout(id), c0 = L.circles[0], ctr = circleCentre(c0, T), sheri = id === 'sheri';
      var baseSpan = sheri ? 20 : 30;
      var groups = L.circles.filter(function (c) { return !c.small && !c.parent && c.shown; });
      groups.sort(function (a, b) { return a.z0 - b.z0; });
      var near = groups[1] || c0, far = groups[2] || groups[groups.length - 1] || c0;
      var nearAt = circleCentre(near, T), farAt = circleCentre(far, T);
      // The drone's shots, one after another: the whole ground, a low orbit of the ring round the garbo, a child who
      // cuts straight through a circle, the couple marked તું and તારો, then a tilted fly-over from one ring to the next
      var you = null; c0.dancers.forEach(function (d) { if (d.coupleRole === 'w' && d.wx != null) you = d; });
      var runner = null; L.kids.forEach(function (kd) { if (!runner && kd.through && kd.moving) runner = kd; });
      if (!runner) runner = L.kids.filter(function (kd) { return kd.moving; })[0] || L.kids[0];
      var SHOTS = [
        { dur: 9, at: function () { return { x: ctr.x, z: ctr.z, zoom: 0.94, tilt: 0, spin: 0.012 }; } },
        { dur: 8, at: function (u) { return { x: ctr.x, z: ctr.z, zoom: 2.3 + 0.3 * u, tilt: 0.35, spin: 0.09 }; } },
        { dur: 8, at: function () { return runner ? { x: runner.x, z: runner.z, zoom: 3, tilt: 0.25, spin: 0.02 } : { x: nearAt.x, z: nearAt.z, zoom: 1.3, tilt: 0, spin: 0.02 }; } },
        { dur: 7, at: function (u) { return you ? { x: you.wx, z: you.wz, zoom: 3.4 - 0.4 * u, tilt: 0.3, spin: 0.03 } : { x: ctr.x, z: ctr.z, zoom: 1.6, tilt: 0.2, spin: 0.03 }; } },
        { dur: 9, at: function (u) { return { x: lerp(nearAt.x, farAt.x, u), z: lerp(nearAt.z, farAt.z, u), zoom: 1.45, tilt: 0.6, spin: 0.015 }; } }
      ];
      var total = SHOTS.reduce(function (n, sh) { return n + sh.dur; }, 0), tc = reduce ? 0 : t % total, si = 0;
      while (si < SHOTS.length - 1 && tc >= SHOTS[si].dur) { tc -= SHOTS[si].dur; si++; }
      var cur = SHOTS[si].at(tc / SHOTS[si].dur);
      // Each new shot flies over from where the last one ended
      var fly = reduce ? 1 : ease(Math.min(1, tc / 1.8));
      if (fly < 1) { var prevS = SHOTS[(si + SHOTS.length - 1) % SHOTS.length], was = prevS.at(1); ['x', 'z', 'zoom', 'tilt'].forEach(function (key) { cur[key] = lerp(was[key], cur[key], fly); }); }
      var span = baseSpan / cur.zoom, tilt = cur.tilt;
      var rot = sheri ? Math.PI / 2 : 0.4;
      if (!reduce) rot += 0.075 * Math.sin(t * 0.12) + t * cur.spin;
      var fx = cur.x, fz = cur.z;
      if (!reduce && sheri) fz += 1.2 * Math.sin(t * 0.09);
      var k = rh / span, cx = rx + rw / 2, cy = ry + rh * 0.56, cr = Math.cos(rot), sr = Math.sin(rot);
      // A tilted shot looks across the ground: depth squeezes, and the near side opens out a little
      function M(x, z) { var dx = x - fx, dz = z - fz, u = (dx * cr - dz * sr) * k, v = (dx * sr + dz * cr) * k, pf = 1 - tilt * 0.3 * Math.max(-1, Math.min(1, v / (rh * 0.6))); return [cx + u * pf, cy - v * (1 - tilt * 0.45)]; }
      function quad(pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(function (q, i) { var m = M(q[0], q[1]); if (i) g.lineTo(m[0], m[1]); else g.moveTo(m[0], m[1]); }); g.closePath(); g.fill(); }
      // Ground, and the venue around it
      g.fillStyle = id === 'stadium' ? '#3b2717' : sheri ? '#2a2430' : '#2b1e14'; g.fillRect(rx, ry, rw, rh);
      if (id === 'outdoors') {
        quad([[-60, -60], [60, -60], [60, 90], [-60, 90]], '#1d2616'); quad([[-27, -8], [27, -8], [27, 44], [-27, 44]], '#3a2a1b');
        L.trees.forEach(function (tr) { var m = M(tr.x, tr.z); g.fillStyle = '#16301b'; g.beginPath(); g.arc(m[0], m[1], 2.2 * k, 0, TAU); g.fill(); });
      } else if (id === 'stadium') {
        quad([[-34, -46], [34, -46], [34, 54], [-34, 54]], '#231b2b');
        for (var r0 = 0; r0 < 8; r0++) { var e = 25 + r0 * 1.5; g.strokeStyle = r0 % 2 ? 'rgba(90,70,110,.8)' : 'rgba(60,48,76,.8)'; g.lineWidth = Math.max(1, 1.2 * k); g.beginPath(); var q0 = M(-e, -34), q1 = M(-e, 42 + r0 * 1.5), q2 = M(e, 42 + r0 * 1.5), q3 = M(e, -34); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.lineTo(q3[0], q3[1]); g.stroke(); }
        quad([[-24.8, -34], [24.8, -34], [24.8, 41.8], [-24.8, 41.8]], '#4a3120');
      } else {
        quad([[-7.2, -40], [7.2, -40], [7.2, 90], [-7.2, 90]], '#3a3340');
        L.houses.forEach(function (h) { var X = h.side * 8, X2 = h.side * 16; quad([[X, h.z1], [X2, h.z1], [X2, h.z2], [X, h.z2]], h.col); quad([[X, h.z1], [X + h.side * 0.5, h.z1], [X + h.side * 0.5, h.z2], [X, h.z2]], 'rgba(0,0,0,.35)'); });
      }
      // Stage and stalls as rooftops
      var sz = { outdoors: [46, -11, 11], stadium: [35.5, -8, 8], sheri: [63.9, -3.4, 3.4] }[id];
      quad([[sz[1], sz[0]], [sz[2], sz[0]], [sz[2], sz[0] + 2.2], [sz[1], sz[0] + 2.2]], '#161016');
      L.stalls.forEach(function (sl) { var hw = sl.w / 2, dp = sl.depth; quad([[sl.x - sl.U[0] * hw, sl.z - sl.U[1] * hw], [sl.x + sl.U[0] * hw, sl.z + sl.U[1] * hw], [sl.x + sl.U[0] * hw + sl.V[0] * dp, sl.z + sl.U[1] * hw + sl.V[1] * dp], [sl.x - sl.U[0] * hw + sl.V[0] * dp, sl.z - sl.U[1] * hw + sl.V[1] * dp]], sl.col); });
      // Keep the lamp and rangoli as a warm anchor while the camera drifts through the crowd.
      var mc = M(ctr.x, ctr.z), lit = st.lit != null ? st.lit : st.on ? 1 : 0.35, pr = (c0.R + 1) * k;
      var gl = g.createRadialGradient(mc[0], mc[1], 1, mc[0], mc[1], pr * 1.3); gl.addColorStop(0, 'rgba(255,190,110,' + (0.22 * lit + 0.1 * pulse) + ')'); gl.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(mc[0], mc[1], pr * 1.3, 0, TAU); g.fill();
      for (var pe = 0; pe < 16; pe++) { var an = rot + pe / 16 * TAU; g.fillStyle = 'hsl(' + TH.hues[pe % TH.hues.length] + ',' + TH.sat + '%,' + (40 + 10 * bright) + '%)'; g.beginPath(); g.ellipse(mc[0] + Math.cos(an) * 1.5 * k, mc[1] + Math.sin(an) * 1.5 * k, 0.9 * k, 0.32 * k, an, 0, TAU); g.fill(); }
      glow(mc[0], mc[1], Math.max(2, 0.7 * k), '#ffcf7a', 0.9 * lit + 0.1);
      // People from above: individual skirts, kediyus and small flashes on claps and turns.
      var dr = Math.max(1.4, 0.4 * k);
      function dot(x, z, col, rr, head, fl, turn) {
        var m = M(x, z); if (m[0] < rx - 4 || m[0] > rx + rw + 4 || m[1] < ry - 4 || m[1] > ry + rh + 4) return;
        g.save(); g.translate(m[0], m[1]);
        g.fillStyle = col; g.beginPath();
        g.moveTo(-rr * 0.42, -rr * 0.38); g.quadraticCurveTo(0, -rr * 0.62, rr * 0.42, -rr * 0.38);
        g.lineTo(rr * 0.72, rr * 0.72); g.quadraticCurveTo(0, rr * 1.02, -rr * 0.72, rr * 0.72); g.closePath(); g.fill();
        if (head) { g.fillStyle = head; g.beginPath(); g.arc(0, -rr * 0.62, rr * 0.3, 0, TAU); g.fill(); }
        if (fl > 0.3) {
          g.strokeStyle = 'rgba(255,239,207,' + Math.min(0.9, fl) + ')'; g.lineWidth = Math.max(0.55, rr * 0.15); g.lineCap = 'round';
          g.beginPath(); g.moveTo(-rr * 0.32, -rr * 0.22); g.lineTo(-rr * 0.76, -rr * 0.68); g.moveTo(rr * 0.32, -rr * 0.22); g.lineTo(rr * 0.76, -rr * 0.68); g.stroke();
        }
        g.restore();
        if (fl > 0.3) glow(m[0], m[1], rr * 1.4, '#fff0d0', fl * 0.8);
        if (turn > 0.55) { g.strokeStyle = 'rgba(255,220,164,' + Math.min(0.38, turn * 0.28) + ')'; g.lineWidth = Math.max(0.55, rr * 0.12); g.beginPath(); g.arc(m[0], m[1], rr * 1.35, -0.7, 1.8); g.stroke(); }
      }
      L.circles.forEach(function (c) { if (!c.shown) return; c.dancers.forEach(function (d) { if (d.wx == null) return; dot(d.wx, d.wz, d.col, d.man ? dr * 0.85 : dr * (1 + 0.4 * (d.twirl || 0)), d.man ? d.pagdi || '#b8312b' : '#1f130d', d.flash || 0, d.twirl || 0); }); });
      var sm = dr * 0.72;
      L.standers.forEach(function (p) { dot(p.x, p.z, p.top || p.col, sm, '#1f130d', 0); });
      L.walkers.forEach(function (p, i) { if (i / L.walkers.length <= (st.density * QD)) dot(p.x, p.z, p.top || p.col, sm, '#1f130d', 0); });
      L.kids.forEach(function (p) { dot(p.x, p.z, p.top || p.col, sm * 0.75, '#1f130d', 0); });
      L.gallery.forEach(function (ga) { if (ga.who && ga.view === 'stage') dot(ga.x, ga.z, ga.who.top || ga.who.col, sm, ga.who.man ? ga.who.pagdi || '#b8312b' : '#1f130d', 0); });
      // A shot, not a map: the corners fall off into shadow
      var vg = g.createRadialGradient(cx, ry + rh / 2, rh * 0.35, cx, ry + rh / 2, Math.max(rw, rh) * 0.62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(rx, ry, rw, rh);
      g.fillStyle = 'rgba(' + TH.glowTint + ',' + 0.06 * pulse + ')'; g.fillRect(rx, ry, rw, rh);
      // A small drone-feed tag in the corner, its light blinking
      var tf = Math.max(7, Math.min(13, rh * 0.06));
      if (rw > 150) {
        g.save(); g.font = '600 ' + tf.toFixed(1) + 'px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(246,236,215,.78)';
        var tx0 = rx + rw - tf * 7.4, ty0 = ry + rh - tf * 1.3;
        if (reduce || (t % 1.2) < 0.8) { g.fillStyle = '#e0473b'; g.beginPath(); g.arc(tx0, ty0, tf * 0.3, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(246,236,215,.78)'; g.fillText('DRONE', tx0 + tf * 0.7, ty0);
        g.restore();
      }
    }
    // The band: a lead singer and a second voice at the front, dhol and keys behind them
    // The players each have a couple of flourishes of their own, at their own odd moments: the dhol player throws
    // his sticks up and comes down in a flurry, the keys player throws a hand in the air, the benjo player leans into
    // it, the tabla player rattles off a fast run. Now and then the whole band hits it together.
    var FLAIRS = { dhol: ['raise', 'lean'], keys: ['handup', 'sway'], benjo: ['step', 'sway'], tabla: ['flurry', 'shake'] };
    var burst = { at: -99, next: 30 };
    function bandFlair(members) {
      var now = T;
      if (st.on && !reduce && now > burst.next) { burst.at = now; burst.next = now + 45 + rnd() * 60; }
      var inBurst = now - burst.at < 3.2;
      members.forEach(function (m) {
        var list = FLAIRS[m.role];
        if (!list) return;
        if (m.flairNext == null) m.flairNext = now + 5 + rnd() * 12;
        if (inBurst && m.flairT0 !== burst.at) { m.flair = list[0]; m.flairT0 = burst.at; m.flairDur = 3.2; }
        else if (st.on && !reduce && now > m.flairNext) { m.flair = list[Math.floor(rnd() * list.length)]; m.flairT0 = now; m.flairDur = 1.6 + rnd() * 1.6; m.flairNext = now + m.flairDur + 7 + rnd() * 16; }
        var u = m.flair ? (now - m.flairT0) / m.flairDur : 1;
        m.fk = u >= 0 && u < 1 && st.on && !reduce ? Math.sin(Math.PI * u) : 0;
      });
      return inBurst ? Math.sin(Math.PI * (now - burst.at) / 3.2) : 0;
    }
    // Shift on a keyboard cues the singers: each press, the next move from a shuffled set, so every move comes round
    var SINGER_MOVES = ['hop', 'spin', 'point', 'clapup', 'dance', 'wave'], moveBag = [];
    function swapSingers() {
      var ss = (band[st.venue] || []).filter(function (m) { return m.role === 'singer'; });
      if (reduce) return;
      ss.forEach(function (m, i) { m.cue = { act: 'swap', at: T + i * 0.5 }; });
    }
    function cueSingers() {
      var ss = (band[st.venue] || []).filter(function (m) { return m.role === 'singer'; });
      if (!ss.length || reduce) return false;
      if (!moveBag.length) { moveBag = SINGER_MOVES.slice(); for (var i = moveBag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = moveBag[i]; moveBag[i] = moveBag[j]; moveBag[j] = tmp; } }
      var move = moveBag.pop();
      ss.forEach(function (m, i) { m.cue = { act: move, at: T + i * 0.18 }; });
      return move;
    }
    function bandOn(id, y, z, o) {
      if (!band[id]) {
        var w = (o.x1 - o.x0);
        band[id] = [
          { role: 'dhol', x: o.x0 + w * 0.2, man: true, col: '#f3e6d0', top: '#b8312b', pagdi: '#e67e22', h: 1.72, ph: 0.3, flash: 0 },
          { role: 'singer', x: o.x0 + w * 0.42, man: false, col: '#c2185b', top: '#f0c24b', odhni: '#f0c24b', h: 1.62, ph: 1.1, flash: 0 },
          { role: 'singer', x: o.x0 + w * 0.58, man: true, col: '#f0c24b', top: '#8e44ad', pagdi: '#b8312b', h: 1.74, ph: 2.2, flash: 0 },
          { role: 'keys', x: o.x0 + w * 0.8, man: true, col: '#2f8f5b', top: '#2f8f5b', pagdi: '#f3e6d0', h: 1.7, ph: 0.8, flash: 0 },
          { role: 'benjo', x: o.x0 + w * 0.67, man: true, col: '#f3e6d0', top: '#3b4cc0', pagdi: '#f0c24b', h: 1.7, ph: 1.7, flash: 0, near: true },
          { role: 'tabla', x: o.x0 + w * 0.3, man: true, sitting: true, rest: { y: 0 }, col: '#f3e6d0', top: '#d8453a', pagdi: '#f3e6d0', h: 1.7, ph: 2.6, flash: 0, near: true, older: true }
        ];
      }
      // By the stage you see the players properly: the singers sway, the dhol sticks come down on the beat, the benjo player strums
      var close = (st.listener === 'stage' || st.dj) && st.on && !reduce, bs = Math.sin(BEAT * Math.PI), used = [];
      var singers = band[id].filter(function (m) { return m.role === 'singer'; });
      var hype = bandFlair(band[id]);
      if (hype > 0.4) singers.forEach(function (m) { if (!m.cue && m.act !== 'wave' && m.act !== 'walk') { m.act = 'wave'; m.until = burst.at + 3.2; } });
      if (hype > 0) pulse = Math.max(pulse, hype * 0.9);
      singers.forEach(function (m) { singerPlan(m, singers, o); });
      band[id].forEach(function (m, i) {
        if (m.near && st.listener !== 'stage') return;
        var bz = m.role === 'singer' ? z - 0.3 : z + 0.4, mx = m.role === 'singer' ? m.cx : m.x, p = P(mx, y, bz); if (!p) return;
        var spot = g.createRadialGradient(p.x, p.y - p.s, 1, p.x, p.y - p.s, p.s * 1.6); spot.addColorStop(0, 'rgba(' + TH.beams[i % TH.beams.length] + ',' + 0.35 * bright + ')'); spot.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = spot; g.beginPath(); g.arc(p.x, p.y - p.s, p.s * 1.6, 0, TAU); g.fill();
        if (m.role === 'keys') fillPoly([[m.x - 0.6, y + 0.85, bz - 0.3], [m.x + 0.6, y + 0.85, bz - 0.3], [m.x + 0.6, y + 0.95, bz - 0.3], [m.x - 0.6, y + 0.95, bz - 0.3]], '#111');
        figure(p, m, T, false, BEAT, 1);
        // Each singer can wear the song's artist as a cut-out head (face and hair on a transparent background),
        // a little oversized, the way a figurine's head is. A duet puts each artist on the singer of the same sex.
        if (m.role === 'singer') {
          var fc = null; for (var fi2 = 0; fi2 < faces.length; fi2++) { var f0 = faces[fi2]; if (used.indexOf(fi2) < 0 && f0.img && f0.man === !!m.man) { fc = f0; used.push(fi2); break; } }
          if (fc) {
            var hh = m.h * p.s, ih = hh * 0.3, iw = ih * (fc.img.naturalWidth && fc.img.naturalHeight ? fc.img.naturalWidth / fc.img.naturalHeight : 1), hy0 = p.y - hh * (m.dancing ? 0.9 : 0.885) - Math.abs(Math.sin(BEAT * Math.PI)) * hh * 0.01;
            g.drawImage(fc.img, p.x - iw / 2, hy0 - ih * 0.58, iw, ih);
          }
        }
        if (m.role === 'dhol') {
          var dp = P(m.x, y + 0.9, bz - 0.25);
          if (dp && close) {
            // The barrel slung across the waist, a stick in each hand: the thick one on the bass head, the cane on the treble
            var hw0 = dp.s * 0.3, hr0 = dp.s * 0.17;
            g.fillStyle = '#7a3b1a'; g.fillRect(dp.x - hw0, dp.y - hr0, hw0 * 2, hr0 * 2);
            g.strokeStyle = '#e8b04b'; g.lineWidth = Math.max(0.8, dp.s * 0.02); for (var rb = -2; rb <= 2; rb++) { g.beginPath(); g.moveTo(dp.x + rb * hw0 * 0.4, dp.y - hr0); g.lineTo(dp.x + rb * hw0 * 0.4 + hw0 * 0.2, dp.y + hr0); g.stroke(); }
            g.fillStyle = '#e9dcc0'; g.beginPath(); g.ellipse(dp.x - hw0, dp.y, hr0 * 0.35, hr0, 0, 0, TAU); g.ellipse(dp.x + hw0, dp.y, hr0 * 0.35, hr0, 0, 0, TAU); g.fill();
            var hitL = Math.max(0, bs), hitR = Math.max(0, -bs), sl = dp.s * 0.34;
            g.strokeStyle = '#3b2213'; g.lineWidth = Math.max(1.2, dp.s * 0.035); g.beginPath(); g.moveTo(dp.x - hw0 * 1.05, dp.y - hr0 * 0.2); g.lineTo(dp.x - hw0 * 1.05 - sl * 0.5, dp.y - hr0 * 0.2 - sl * (0.2 + 0.8 * (1 - hitL))); g.stroke();
            g.strokeStyle = '#c9a56b'; g.lineWidth = Math.max(0.8, dp.s * 0.018); g.beginPath(); g.moveTo(dp.x + hw0 * 1.05, dp.y - hr0 * 0.1); g.quadraticCurveTo(dp.x + hw0 * 1.05 + sl * 0.3, dp.y - sl * 0.6, dp.x + hw0 * 1.05 + sl * 0.6, dp.y - hr0 * 0.1 - sl * (0.15 + 0.9 * (1 - hitR))); g.stroke();
            if (hitL > 0.85) glow(dp.x - hw0, dp.y, dp.s * 0.12, '#ffe7b0', (hitL - 0.85) * 5);
            if (hitR > 0.85) glow(dp.x + hw0, dp.y, dp.s * 0.1, '#ffe7b0', (hitR - 0.85) * 5);
          } else if (dp) { g.fillStyle = '#7a3b1a'; g.beginPath(); g.ellipse(dp.x, dp.y, dp.s * 0.34, dp.s * 0.2, 0, 0, TAU); g.fill(); g.strokeStyle = '#e8b04b'; g.lineWidth = Math.max(0.8, dp.s * 0.03); g.stroke(); }
        }
        if (m.role === 'tabla') {
          // A pair of tabla in front of him on the deck
          [-1, 1].forEach(function (sd) { var tp = P(m.x + sd * 0.13, y + (sd < 0 ? 0.2 : 0.17), bz - 0.3); if (!tp) return; var tr = tp.s * (sd < 0 ? 0.1 : 0.08); g.fillStyle = sd < 0 ? '#9aa0a6' : '#6b3b1c'; g.fillRect(tp.x - tr, tp.y, tr * 2, tr * 1.6); g.fillStyle = '#e9dcc0'; g.beginPath(); g.ellipse(tp.x, tp.y, tr, tr * 0.35, 0, 0, TAU); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.ellipse(tp.x, tp.y, tr * 0.4, tr * 0.14, 0, 0, TAU); g.fill(); });
        }
        if (m.role === 'benjo') {
          // A benjo across the lap: a long box with typewriter keys and strings, the right hand strumming
          var b0 = P(m.x - 0.35, y + 0.95, bz - 0.3), b1 = P(m.x + 0.35, y + 0.9, bz - 0.3);
          if (b0 && b1) { var bt = b0.s * 0.09; g.fillStyle = '#5a2d14'; g.beginPath(); g.moveTo(b0.x, b0.y - bt); g.lineTo(b1.x, b1.y - bt); g.lineTo(b1.x, b1.y + bt); g.lineTo(b0.x, b0.y + bt); g.closePath(); g.fill();
            g.fillStyle = '#f3e6d0'; for (var kk = 0; kk < 8; kk++) { var ku = 0.1 + kk * 0.08; g.fillRect(lerp(b0.x, b1.x, ku) - 1, lerp(b0.y, b1.y, ku) - bt * 0.9, Math.max(1, bt * 0.35), bt * 0.6); }
            g.strokeStyle = 'rgba(255,240,210,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(b0.x, b0.y + bt * 0.3); g.lineTo(b1.x, b1.y + bt * 0.3); g.stroke(); }
        }
        if (close && m.role === 'singer') {
          // In-ear wire and a little shine on the mic in the spot
          var mh = m.h * p.s; glow(p.x - mh * 0.03, p.y - mh * 0.84, Math.max(1, mh * 0.03), '#fff6e0', 0.35 + 0.3 * pulse);
        }
        if (m.role === 'singer') { var ms = P(m.x - 0.25, y, bz - 0.35), mt = P(m.x - 0.25, y + 1.45, bz - 0.35); if (ms && mt) { g.strokeStyle = '#1a1a1a'; g.lineWidth = Math.max(0.8, ms.s * 0.03); g.beginPath(); g.moveTo(ms.x, ms.y); g.lineTo(mt.x, mt.y); g.stroke(); } }
      });
    }
    // The DJ's booth: a table draped in bandhani, a laptop, a controller that blinks on the beat, a steel jug of chhas
    // and a stack of cups. The DJ sits behind it on a stool, headphones round the neck, sipping chhas from a paper cup.
    var djMan = { role: 'dj', man: true, sitting: true, rest: { y: 0.8 }, col: '#1d1b26', top: '#1d1b26', pagdi: '#1f130d', stole: '#d8453a', legs: '#2a2733', h: 1.74, ph: 0.45, flash: 0, moustache: true, vest: '#8e1b2c' };
    var djTalk = { text: '', t: 0 };
    // A speaker cabinet facing you: grille, woofer that kicks on the beat, a horn tweeter and a maker's plate
    function cabinet(x, y0, z, w, hgt) {
      var a = P(x - w / 2, y0, z), b = P(x + w / 2, y0 + hgt, z); if (!a || !b) return;
      var L = a.x, R = b.x, T0 = b.y, B = a.y, cw = R - L, ch = B - T0; if (cw < 2) return;
      var gr = g.createLinearGradient(L, 0, R, 0); gr.addColorStop(0, '#151414'); gr.addColorStop(0.5, '#222020'); gr.addColorStop(1, '#121111');
      g.fillStyle = gr; g.fillRect(L, T0, cw, ch);
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = Math.max(0.6, cw * 0.02); g.strokeRect(L + 0.5, T0 + 0.5, cw - 1, ch - 1);
      if (cw > 14) { g.fillStyle = 'rgba(255,255,255,.05)'; for (var gy = T0 + ch * 0.08; gy < B - ch * 0.06; gy += Math.max(2, cw * 0.07)) for (var gx = L + cw * 0.08; gx < R - cw * 0.06; gx += Math.max(2, cw * 0.07)) g.fillRect(gx, gy, 1, 1); }
      var wr = cw * 0.36 * (1 + 0.05 * pulse), wy = T0 + ch * 0.62;
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = Math.max(0.7, cw * 0.025); g.beginPath(); g.arc(L + cw / 2, wy, wr, 0, TAU); g.stroke();
      g.fillStyle = '#0b0a0a'; g.beginPath(); g.arc(L + cw / 2, wy, wr * 0.8, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(L + cw / 2, wy, wr * 0.22, 0, TAU); g.fill();
      g.fillStyle = '#0b0a0a'; g.beginPath(); g.moveTo(L + cw * 0.3, T0 + ch * 0.12); g.lineTo(R - cw * 0.3, T0 + ch * 0.12); g.lineTo(R - cw * 0.38, T0 + ch * 0.28); g.lineTo(L + cw * 0.38, T0 + ch * 0.28); g.closePath(); g.fill();
      g.fillStyle = 'rgba(232,176,75,.55)'; g.fillRect(L + cw * 0.36, B - ch * 0.08, cw * 0.28, Math.max(1, ch * 0.025));
      if (st.on) glow(R - cw * 0.14, T0 + ch * 0.06, Math.max(0.6, cw * 0.03), '#6dff9a', 0.8);
    }
    function djBooth(b, t) {
      var x = b.x, z = b.z, tw = 0.8, th = 0.74, td = 0.34, near = P(x, th, z - td);
      if (st.djSay !== djTalk.text) { djTalk.text = st.djSay; djTalk.t0 = performance.now(); }
      djTalk.t = (performance.now() - (djTalk.t0 || 0)) / 1000; djMan.talking = !!djTalk.text && djTalk.t < 1.6;
      // The stall: two bamboo poles and a crossbar, with a mirror-work toran and a sagging string of bulbs
      var ph0 = 2.45, pz = z + 0.95, poles = [-1.15, 1.15].map(function (u) { return [P(x + u, 0, pz), P(x + u, ph0, pz)]; });
      if (poles[0][0] && poles[0][1] && poles[1][0] && poles[1][1]) {
        g.strokeStyle = '#9b7a45'; g.lineWidth = Math.max(1, poles[0][0].s * 0.06);
        g.beginPath(); poles.forEach(function (p) { g.moveTo(p[0].x, p[0].y); g.lineTo(p[1].x, p[1].y); }); g.moveTo(poles[0][1].x, poles[0][1].y); g.lineTo(poles[1][1].x, poles[1][1].y); g.stroke();
        g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = Math.max(0.6, poles[0][0].s * 0.012);
        poles.forEach(function (p) { for (var nd = 1; nd < 5; nd++) { var ny = lerp(p[0].y, p[1].y, nd / 5); g.beginPath(); g.moveTo(p[0].x - p[0].s * 0.035, ny); g.lineTo(p[0].x + p[0].s * 0.035, ny); g.stroke(); } });
        // Marigold strings wound down the poles
        poles.forEach(function (p, pi) { for (var mk = 0; mk < 14; mk++) { var mu = mk / 14, my = lerp(p[1].y, p[0].y, mu * 0.75), mx = p[0].x + Math.sin(mu * 18 + pi) * p[0].s * 0.04; g.fillStyle = mk % 3 ? '#f08a24' : '#f6c342'; g.beginPath(); g.arc(mx, my, Math.max(0.8, p[0].s * 0.03), 0, TAU); g.fill(); } });
        for (var tk = 0; tk < 13; tk++) {
          var tu = (tk + 0.5) / 13, ta = P(lerp(x - 1.15, x + 1.15, tu - 0.5 / 13), ph0, pz), tb = P(lerp(x - 1.15, x + 1.15, tu + 0.5 / 13), ph0, pz), tp = P(lerp(x - 1.15, x + 1.15, tu), ph0 - 0.22 - (tk % 2) * 0.05 + (reduce ? 0 : Math.sin(t * 1.4 + tk) * 0.015), pz);
          if (!ta || !tb || !tp) continue;
          g.fillStyle = TH.flags[tk % TH.flags.length]; g.beginPath(); g.moveTo(ta.x, ta.y); g.lineTo(tb.x, tb.y); g.lineTo(tp.x, tp.y); g.closePath(); g.fill();
          glow((ta.x + tb.x + tp.x) / 3, (ta.y + tb.y + tp.y) / 3, Math.max(0.6, ta.s * 0.014), '#ffffff', 0.35 + 0.35 * Math.max(0, Math.sin(t * 2 + tk)));
        }
        for (var k = 0; k <= 10; k++) { var u = k / 10, bp = P(lerp(x - 1.15, x + 1.15, u), ph0 - 0.35 - Math.sin(u * Math.PI) * 0.28, pz); if (bp) glow(bp.x, bp.y, Math.max(0.7, Math.min(3, bp.s * 0.05)), TH.bulbs[k % TH.bulbs.length], (0.75 + 0.25 * pulse) * bright); }
      }
      // Speakers on tripod stands at each end of the table
      [-1, 1].forEach(function (sd) {
        var sx = x + sd * 1.28, sb0 = P(sx, 0, z + 0.2), sb1 = P(sx, 1.22, z + 0.2); if (!sb0 || !sb1) return;
        g.strokeStyle = '#1b1814'; g.lineWidth = Math.max(1, sb0.s * 0.025); g.beginPath(); g.moveTo(sb0.x - sb0.s * 0.22, sb0.y); g.lineTo(sb1.x, sb1.y - sb1.s * 0.5); g.lineTo(sb0.x + sb0.s * 0.22, sb0.y); g.moveTo(sb0.x, sb0.y - sb0.s * 0.05); g.lineTo(sb1.x, sb1.y); g.stroke();
        cabinet(sx, 1.2, z + 0.2, 0.44, 0.66);
      });
      // The DJ on his stool, lit from below by the screen
      var dp = P(x, 0.8, z + 0.55);
      if (dp) {
        var stool = P(x, 0, z + 0.55); if (stool) { g.strokeStyle = '#3a2a1c'; g.lineWidth = Math.max(1, stool.s * 0.05); g.beginPath(); g.moveTo(stool.x - stool.s * 0.18, stool.y); g.lineTo(dp.x, dp.y); g.lineTo(stool.x + stool.s * 0.18, stool.y); g.stroke(); }
        var glowR = dp.s * 0.9, lg0 = g.createRadialGradient(dp.x, dp.y - dp.s * 1.1, 1, dp.x, dp.y - dp.s * 1.1, glowR); lg0.addColorStop(0, 'rgba(170,200,255,' + 0.22 * bright + ')'); lg0.addColorStop(1, 'rgba(170,200,255,0)'); g.fillStyle = lg0; g.beginPath(); g.arc(dp.x, dp.y - dp.s * 1.1, glowR, 0, TAU); g.fill();
        figure(dp, djMan, T, false, BEAT, 1);
      }
      // Table top with a lit edge, and a maroon bandhani cloth with gold borders
      fillPoly([[x - tw, th, z - td], [x + tw, th, z - td], [x + tw, th, z + td], [x - tw, th, z + td]], '#4a2e1b');
      fillPoly([[x - tw, th - 0.03, z - td], [x + tw, th - 0.03, z - td], [x + tw, th, z - td], [x - tw, th, z - td]], '#7a5232');
      fillPoly([[x - tw, 0, z - td], [x + tw, 0, z - td], [x + tw, th - 0.03, z - td], [x - tw, th - 0.03, z - td]], '#8e1b2c');
      fillPoly([[x - tw, th - 0.15, z - td - 0.005], [x + tw, th - 0.15, z - td - 0.005], [x + tw, th - 0.03, z - td - 0.005], [x - tw, th - 0.03, z - td - 0.005]], '#e8b04b');
      fillPoly([[x - tw, 0, z - td - 0.005], [x + tw, 0, z - td - 0.005], [x + tw, 0.07, z - td - 0.005], [x - tw, 0.07, z - td - 0.005]], '#e8b04b');
      if (near && near.s > 40) {
        // Bandhani: rows of tiny tie-dye dots in white and yellow, sparser near the sign
        for (var br = 0; br < 5; br++) for (var bc = 0; bc < 22; bc++) {
          var bu = (bc + (br % 2) * 0.5 + 0.5) / 22.5, bq = P(lerp(x - tw, x + tw, bu), 0.12 + br * 0.1, z - td - 0.01); if (!bq) continue;
          if (Math.abs(bu - 0.5) < 0.2 && br > 0 && br < 4) continue;
          g.fillStyle = (br + bc) % 3 ? 'rgba(255,246,230,.8)' : 'rgba(246,195,66,.85)'; g.beginPath(); g.arc(bq.x, bq.y, Math.max(0.6, bq.s * 0.009), 0, TAU); g.fill();
        }
      }
      // Mirror-work triangles hanging from the table's front edge, then a marigold scallop
      for (var mt = 0; mt < 16; mt++) { var m0 = P(lerp(x - tw, x + tw, mt / 16), th - 0.15, z - td - 0.015), m1 = P(lerp(x - tw, x + tw, (mt + 1) / 16), th - 0.15, z - td - 0.015), m2 = P(lerp(x - tw, x + tw, (mt + 0.5) / 16), th - 0.26, z - td - 0.015); if (!m0 || !m1 || !m2) continue; g.fillStyle = mt % 2 ? '#2f8f5b' : '#c2185b'; g.beginPath(); g.moveTo(m0.x, m0.y); g.lineTo(m1.x, m1.y); g.lineTo(m2.x, m2.y); g.closePath(); g.fill(); if (m0.s > 30) glow((m0.x + m1.x) / 2, m0.y + (m2.y - m0.y) * 0.4, Math.max(0.6, m0.s * 0.01), '#ffffff', 0.5 + 0.4 * Math.max(0, Math.sin(t * 3 + mt))); }
      for (var mg = 0; mg <= 24; mg++) { var mu2 = mg / 24, mq = P(lerp(x - tw, x + tw, mu2), th - 0.03 - Math.abs(Math.sin(mu2 * Math.PI * 4)) * 0.06, z - td - 0.02); if (mq && mq.s > 6) { g.fillStyle = mg % 3 ? '#f08a24' : '#f6c342'; g.beginPath(); g.arc(mq.x, mq.y, Math.max(0.8, mq.s * 0.026), 0, TAU); g.fill(); } }
      // A lit sign board on the cloth: DJ in neon inside a ring of marquee bulbs
      var sgA = P(x - 0.25, 0.22, z - td - 0.02), sgB = P(x + 0.25, 0.46, z - td - 0.02);
      if (sgA && sgB && sgA.s > 10) {
        var sL = sgA.x, sR = sgB.x, sT = sgB.y, sB = sgA.y, nc = 'rgb(' + TH.beams[0] + ')';
        g.fillStyle = '#140c0a'; roundRect(sL, sT, sR - sL, sB - sT, (sB - sT) * 0.2); g.fill();
        for (var mb = 0; mb < 16; mb++) { var mu3 = mb / 16, per = mu3 * 2 * ((sR - sL) + (sB - sT)), bx0, by0, wq = sR - sL, hq = sB - sT; if (per < wq) { bx0 = sL + per; by0 = sT; } else if (per < wq + hq) { bx0 = sR; by0 = sT + per - wq; } else if (per < 2 * wq + hq) { bx0 = sR - (per - wq - hq); by0 = sB; } else { bx0 = sL; by0 = sB - (per - 2 * wq - hq); } glow(bx0, by0, Math.max(0.6, sgA.s * 0.012), TH.bulbs[mb % TH.bulbs.length], Math.floor(t * 4) % 2 === mb % 2 ? 1 : 0.45); }
        var nf = (sB - sT) * 0.62;
        g.save(); g.font = '800 ' + nf + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = nc; g.shadowBlur = nf * (0.5 + 0.4 * pulse); g.fillStyle = '#fff6e6'; g.fillText('DJ', (sL + sR) / 2, (sT + sB) / 2 + nf * 0.04);
        g.restore();
      }
      // Laptop: an aluminium lid facing you, stickers on it, the screen's light leaking over the top
      var l0 = P(x - 0.36, th + 0.012, z + 0.02), l1 = P(x + 0.1, th + 0.012, z + 0.02), l2 = P(x + 0.1, th + 0.3, z + 0.1), l3 = P(x - 0.36, th + 0.3, z + 0.1);
      if (l0 && l1 && l2 && l3) {
        var bs0 = P(x - 0.38, th, z - 0.04), bs1 = P(x + 0.12, th + 0.014, z - 0.04); if (bs0 && bs1) { g.fillStyle = '#9ea3aa'; g.fillRect(bs0.x, bs1.y, bs1.x - bs0.x, Math.max(1.5, bs0.y - bs1.y + 1)); }
        var alu = g.createLinearGradient(l3.x, l3.y, l1.x, l1.y); alu.addColorStop(0, '#c5c9cf'); alu.addColorStop(0.55, '#9da2a9'); alu.addColorStop(1, '#7d8289');
        g.fillStyle = alu; g.beginPath(); g.moveTo(l0.x, l0.y); g.lineTo(l1.x, l1.y); g.lineTo(l2.x, l2.y); g.lineTo(l3.x, l3.y); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
        var rim = g.createLinearGradient(0, l3.y - 6, 0, l3.y + 2); rim.addColorStop(0, 'rgba(170,200,255,0)'); rim.addColorStop(1, 'rgba(170,200,255,' + 0.55 * bright + ')'); g.fillStyle = rim; g.fillRect(l3.x, l3.y - 6, l2.x - l3.x, 8);
        var lw0 = l1.x - l0.x;
        if (lw0 > 20) {
          var gc = P(x - 0.13, th + 0.16, z + 0.06); if (gc) { var r0 = lw0 * 0.1; g.fillStyle = '#1a0f0b'; g.beginPath(); g.arc(gc.x, gc.y, r0 * 1.35, 0, TAU); g.fill(); g.fillStyle = '#b8562a'; g.beginPath(); g.arc(gc.x, gc.y + r0 * 0.25, r0 * 0.8, 0, TAU); g.fill(); glow(gc.x, gc.y - r0 * 0.7, r0 * 0.45, '#ffcf7a', 0.9 * bright); }
          var st1 = P(x - 0.3, th + 0.24, z + 0.09); if (st1) { g.save(); g.translate(st1.x, st1.y); g.rotate(-0.25); g.fillStyle = '#f6c342'; roundRect(0, 0, lw0 * 0.16, lw0 * 0.07, lw0 * 0.02); g.fill(); g.fillStyle = '#8e1b2c'; g.font = '700 ' + Math.max(4, lw0 * 0.045) + 'px system-ui'; g.textBaseline = 'middle'; g.fillText('ગરબા', lw0 * 0.015, lw0 * 0.036); g.restore(); }
          var st2 = P(x + 0.03, th + 0.07, z + 0.04); if (st2) { g.fillStyle = '#2f8f5b'; g.beginPath(); for (var sp2 = 0; sp2 < 10; sp2++) { var sa = sp2 / 10 * TAU - Math.PI / 2, sr = sp2 % 2 ? lw0 * 0.025 : lw0 * 0.055; g.lineTo(st2.x + Math.cos(sa) * sr, st2.y + Math.sin(sa) * sr); } g.closePath(); g.fill(); }
        }
      }
      // Controller: two jog wheels turning with the music, a mixer with faders and knobs, pads lighting on the beat
      var c0 = P(x + 0.16, th + 0.01, z - 0.2), c1 = P(x + 0.7, th + 0.05, z - 0.2);
      if (c0 && c1) {
        var cw0 = c1.x - c0.x, cy0 = c1.y, chh = Math.max(3, c0.y - c1.y + c0.s * 0.03);
        g.fillStyle = '#16161a'; roundRect(c0.x, cy0, cw0, chh, chh * 0.25); g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke();
        [0.2, 0.8].forEach(function (u, ji) { var jx = c0.x + cw0 * u, jy = cy0 + chh * 0.45, jr = cw0 * 0.15, ang = reduce ? 0 : T * 3 * (ji ? -1 : 1); g.fillStyle = '#2a2b31'; g.beginPath(); g.ellipse(jx, jy, jr, jr * 0.38, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(' + TH.beams[ji % TH.beams.length] + ',.8)'; g.lineWidth = Math.max(0.8, jr * 0.08); g.beginPath(); g.ellipse(jx, jy, jr, jr * 0.38, 0, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(jx, jy); g.lineTo(jx + Math.cos(ang) * jr * 0.8, jy + Math.sin(ang) * jr * 0.3); g.stroke(); });
        for (var fd = 0; fd < 3; fd++) { var fx = c0.x + cw0 * (0.43 + fd * 0.07), fy = cy0 + chh * (0.3 + 0.35 * (0.5 + 0.5 * Math.sin(T * 0.7 + fd * 2))); g.fillStyle = '#000'; g.fillRect(fx - 0.5, cy0 + chh * 0.2, 1, chh * 0.6); g.fillStyle = '#d9d9de'; g.fillRect(fx - cw0 * 0.012, fy - 1, cw0 * 0.024, 2); }
        for (var kn = 0; kn < 4; kn++) { g.fillStyle = '#8c8f96'; g.beginPath(); g.arc(c0.x + cw0 * (0.4 + (kn % 2) * 0.2), cy0 + chh * (kn < 2 ? 0.14 : 0.86), Math.max(0.7, cw0 * 0.012), 0, TAU); g.fill(); }
        for (var pd = 0; pd < 8; pd++) { var pside = pd < 4 ? 0.2 : 0.8, px0 = c0.x + cw0 * (pside - 0.09 + (pd % 4) * 0.06), py0 = cy0 + chh * 0.88; g.fillStyle = (Math.floor(BEAT * 2) + pd) % 4 === 0 ? 'rgb(' + TH.beams[pd % TH.beams.length] + ')' : 'rgba(255,255,255,.12)'; g.fillRect(px0, py0 - Math.max(1, chh * 0.08), Math.max(1.5, cw0 * 0.045), Math.max(1, chh * 0.08)); }
      }
      // A small brass diya, the steel jug of chhas and a stack of paper cups
      var dy = P(x + 0.72, th, z + 0.12); if (dy) { var dr = Math.max(1.2, dy.s * 0.04); g.fillStyle = '#b8862e'; g.beginPath(); g.ellipse(dy.x, dy.y, dr, dr * 0.45, 0, 0, Math.PI); g.fill(); glow(dy.x, dy.y - dr * 0.9, dr * (0.9 + 0.15 * Math.sin(t * 9)), '#ffcf7a', 0.95); }
      var jg = P(x - 0.62, th, z - 0.05), jt = P(x - 0.62, th + 0.2, z - 0.05);
      if (jg && jt) { var jw = jg.s * 0.07; var jgr = g.createLinearGradient(jg.x - jw, 0, jg.x + jw, 0); jgr.addColorStop(0, '#6f7378'); jgr.addColorStop(0.45, '#e6e9ec'); jgr.addColorStop(1, '#7c8086'); g.fillStyle = jgr; g.beginPath(); g.moveTo(jg.x - jw, jg.y); g.lineTo(jg.x + jw, jg.y); g.lineTo(jt.x + jw * 0.75, jt.y); g.lineTo(jt.x - jw * 0.75, jt.y); g.closePath(); g.fill(); g.strokeStyle = 'rgba(80,84,90,.9)'; g.lineWidth = Math.max(1, jw * 0.12); g.beginPath(); g.arc(jg.x + jw * 1.05, lerp(jg.y, jt.y, 0.55), jw * 0.45, -Math.PI / 2, Math.PI / 2); g.stroke(); }
      var cs = P(x - 0.45, th, z - 0.18), ct2 = P(x - 0.45, th + 0.14, z - 0.18);
      if (cs && ct2) { var cw = cs.s * 0.035; g.fillStyle = '#f4efe4'; g.beginPath(); g.moveTo(cs.x - cw * 0.8, cs.y); g.lineTo(cs.x + cw * 0.8, cs.y); g.lineTo(ct2.x + cw, ct2.y); g.lineTo(ct2.x - cw, ct2.y); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.7; for (var cl = 1; cl < 4; cl++) { var cy = lerp(cs.y, ct2.y, cl / 4); g.beginPath(); g.moveTo(cs.x - cw * 0.9, cy); g.lineTo(cs.x + cw * 0.9, cy); g.stroke(); } }
      if (djTalk.text && djTalk.t < 3.2) djBubble(dp, djTalk);
    }
    // What the DJ says: a round speech bubble centred over his head, its tail pointing down at him
    function djBubble(dp, talk) {
      if (!dp) return;
      var h = djMan.h * dp.s, hx = dp.x, headTop = dp.y + 0.48 * h - h * 1.0;
      var pop = reduce ? 1 : Math.min(1, talk.t / 0.2), ease0 = 1 - Math.pow(1 - pop, 3), fadeOut = Math.max(0, Math.min(1, (3.2 - talk.t) / 0.4)), k = 0.7 + 0.3 * ease0;
      var fs = Math.max(15, Math.min(32, h * 0.08)) * k;
      g.save(); g.globalAlpha = fadeOut; g.font = '700 ' + fs + 'px ' + GU_FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      var tw0 = g.measureText(talk.text).width, bw = tw0 + fs * 1.6, bh = fs * 2, tail = fs * 0.7, gap = fs * 0.35;
      var by = headTop - gap - tail - bh, bx = hx - bw / 2;
      bx = Math.max(8, Math.min(W - bw - 8, bx)); by = Math.max(8, by);
      var tx = Math.max(bx + bh * 0.5, Math.min(bx + bw - bh * 0.5, hx));
      g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 12; g.shadowOffsetY = 3;
      g.fillStyle = '#fff8ec'; roundRect(bx, by, bw, bh, bh / 2); g.fill();
      g.shadowBlur = 0; g.shadowOffsetY = 0;
      g.beginPath(); g.moveTo(tx - tail * 0.6, by + bh - 1); g.quadraticCurveTo(tx, by + bh + tail * 0.3, hx, headTop - gap); g.quadraticCurveTo(tx + tail * 0.2, by + bh + tail * 0.2, tx + tail * 0.6, by + bh - 1); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(232,176,75,.9)'; g.lineWidth = Math.max(1.5, fs * 0.08); roundRect(bx + 1.5, by + 1.5, bw - 3, bh - 3, bh / 2 - 1.5); g.stroke();
      g.fillStyle = '#6b1420'; g.fillText(talk.text, bx + bw / 2, by + bh * 0.54);
      g.restore();
    }
    // Life round the booth: kids dancing, a friend on a chair with his phone, a water cooler, crates of cold drinks,
    // stacked chairs and a few stones. Made once per venue and drawn in depth with everything else.
    var djLife = {};
    function djAround(id) {
      if (djLife[id]) return djLife[id];
      var b = DJ[id], out = { people: [], props: [] };
      out.people.push({ x: b.x - 1.75, z: b.z + 0.45, d: person({ kid: true, man: false, h: 1.0, col: '#c2185b', top: '#f6c342' }) });
      out.people.push({ x: b.x - 2.2, z: b.z + 0.95, d: person({ kid: true, h: 1.12, man: true, col: '#2f6fa8', top: '#2f6fa8', pagdi: '#1f130d', ph: 1.2 }) });
      out.people.push({ x: b.x + 1.85, z: b.z + 0.75, seat: true, d: person({ man: true, sitting: true, rest: { y: 0.45 }, holding: 'phone', col: '#f3e6d0', top: '#3b4cc0', h: 1.72 }) });
      out.people.push({ x: b.x + 0.98, z: b.z + 0.02, d: person({ kid: true, stander: true, h: 0.98, man: true, col: '#e67e22', top: '#e67e22', pagdi: '#1f130d', sway: 0.3 }) });
      out.people.push({ x: b.x - 2.6, z: b.z + 0.1, d: person({ stander: true, man: false, holding: 'tea', col: '#2f8f5b', top: '#d6a24a', h: 1.6, sway: 1.1 }) });
      out.props.push({ kind: 'cooler', x: b.x - 1.6, z: b.z + 0.55 });
      out.props.push({ kind: 'crates', x: b.x - 1.95, z: b.z + 0.05 });
      out.props.push({ kind: 'chairs', x: b.x + 2.4, z: b.z + 1.25 });
      out.props.push({ kind: 'plasticChair', x: b.x + 1.85, z: b.z + 0.75, col: '#2f6fa8' });
      [[-1.1, -0.75, 0.13], [-0.7, -0.9, 0.1], [1.15, -0.8, 0.12], [1.5, -0.6, 0.09], [2.0, -0.2, 0.14]].forEach(function (s0) { out.props.push({ kind: 'stone', x: b.x + s0[0], z: b.z + s0[1], r: s0[2] }); });
      djLife[id] = out; return out;
    }
    function djProp(o, t) {
      if (o.kind === 'stone') { var p = P(o.x, 0, o.z); if (!p) return; var r = o.r * p.s; g.fillStyle = '#6d6259'; g.beginPath(); g.ellipse(p.x, p.y - r * 0.35, r, r * 0.55, 0, Math.PI, 0); g.lineTo(p.x + r, p.y); g.lineTo(p.x - r, p.y); g.fill(); g.fillStyle = 'rgba(255,240,220,.12)'; g.beginPath(); g.ellipse(p.x - r * 0.3, p.y - r * 0.6, r * 0.4, r * 0.15, 0, 0, TAU); g.fill(); return; }
      if (o.kind === 'cooler') {
        // A blue water drum on a stand with a tap and a steel glass on a chain
        fillPoly([[o.x - 0.25, 0, o.z], [o.x + 0.25, 0, o.z], [o.x + 0.25, 0.5, o.z], [o.x - 0.25, 0.5, o.z]], '#3a2a1c');
        var c0 = P(o.x - 0.24, 0.5, o.z - 0.01), c1 = P(o.x + 0.24, 1.08, o.z - 0.01); if (!c0 || !c1) return;
        var bg = g.createLinearGradient(c0.x, 0, c1.x, 0); bg.addColorStop(0, '#1d4f8a'); bg.addColorStop(0.45, '#3f7fc4'); bg.addColorStop(1, '#173f6e');
        g.fillStyle = bg; roundRect(c0.x, c1.y, c1.x - c0.x, c0.y - c1.y, (c1.x - c0.x) * 0.18); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1; [0.3, 0.7].forEach(function (u) { var yy = lerp(c1.y, c0.y, u); g.beginPath(); g.moveTo(c0.x, yy); g.lineTo(c1.x, yy); g.stroke(); });
        var tp0 = P(o.x, 0.58, o.z - 0.02); if (tp0) { g.fillStyle = '#c9ccd1'; g.fillRect(tp0.x - tp0.s * 0.02, tp0.y - tp0.s * 0.02, tp0.s * 0.04, tp0.s * 0.07); }
        return;
      }
      if (o.kind === 'crates') {
        // Two red crates of cold drinks, bottle caps showing
        for (var cr = 0; cr < 2; cr++) { var y0 = cr * 0.28, xo = cr * 0.04; fillPoly([[o.x - 0.3 + xo, y0, o.z], [o.x + 0.3 + xo, y0, o.z], [o.x + 0.3 + xo, y0 + 0.27, o.z], [o.x - 0.3 + xo, y0 + 0.27, o.z]], cr ? '#a8201a' : '#8c1a15'); var cp = P(o.x + xo, y0 + 0.2, o.z - 0.01); if (cp && cp.s > 30) { g.fillStyle = 'rgba(0,0,0,.35)'; for (var hs = -2; hs <= 2; hs++) g.fillRect(cp.x + hs * cp.s * 0.1 - cp.s * 0.03, cp.y - cp.s * 0.04, cp.s * 0.06, cp.s * 0.05); } }
        for (var bt = 0; bt < 5; bt++) { var bq = P(o.x - 0.22 + bt * 0.11 + 0.04, 0.6, o.z + 0.1); if (bq) { g.fillStyle = bt % 2 ? '#e8b04b' : '#d8453a'; g.beginPath(); g.arc(bq.x, bq.y, Math.max(0.8, bq.s * 0.025), 0, TAU); g.fill(); } }
        return;
      }
      if (o.kind === 'chairs') { for (var sc = 0; sc < 5; sc++) plasticChair(o.x, o.z, '#ece6da', sc * 0.09); return; }
      if (o.kind === 'plasticChair') plasticChair(o.x, o.z, o.col, 0);
    }
    // A moulded plastic chair seen from the front: seat, splayed legs and a slatted back
    function plasticChair(x, z, col, lift) {
      var y = 0.45 + (lift || 0);
      fillPoly([[x - 0.22, y, z - 0.2], [x + 0.22, y, z - 0.2], [x + 0.22, y, z + 0.2], [x - 0.22, y, z + 0.2]], col);
      var lf = [[-0.22, -0.2], [0.22, -0.2], [-0.21, 0.2], [0.21, 0.2]];
      g.strokeStyle = col; lf.forEach(function (l) { var a = P(x + l[0] * 1.08, lift || 0, z + l[1] * 1.05), b = P(x + l[0], y, z + l[1]); if (a && b) { g.lineWidth = Math.max(1, a.s * 0.03); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } });
      fillPoly([[x - 0.22, y, z + 0.2], [x + 0.22, y, z + 0.2], [x + 0.2, y + 0.45, z + 0.24], [x - 0.2, y + 0.45, z + 0.24]], col);
      var sl0 = P(x, y + 0.15, z + 0.215); if (sl0 && sl0.s > 25) { g.fillStyle = 'rgba(0,0,0,.18)'; for (var sl = -2; sl <= 2; sl++) g.fillRect(sl0.x + sl * sl0.s * 0.07 - sl0.s * 0.012, sl0.y - sl0.s * 0.12, sl0.s * 0.024, sl0.s * 0.2); }
    }
    // What each singer is doing: a small plan that keeps changing, so they never loop. They sing at a spot with
    // their own gestures, stroll to another spot along the front, wave to the crowd, and now and then dance a few
    // garba steps, clapping on the beat. With the music stopped they chat and wait.
    function singerPlan(m, singers, o) {
      var now = T, dt = Math.min(0.1, Math.max(0, now - (m.lastT == null ? now : m.lastT))); m.lastT = now;
      var lo = o.x0 + (o.x1 - o.x0) * 0.3, hi = o.x0 + (o.x1 - o.x0) * 0.7;
      if (m.cx == null) { m.cx = m.x; m.tx = m.x; m.act = 'sing'; m.until = now + 2 + rnd() * 3; }
      if (reduce) { m.cx = m.x; m.act = 'sing'; m.walking = false; m.dancing = false; m.cheer = 0; m.twirl = 0; return; }
      var MOVE_LEN = { hop: 1.5, spin: 2.2, point: 2, clapup: 2.6, dance: 4, wave: 2.2 };
      if (m.cue && now >= m.cue.at) {
        // Changing sides for a new song: each singer walks across to where the other stood, mirrored across the stage
        if (m.cue.act === 'swap') { m.act = 'walk'; m.tx = Math.max(lo, Math.min(hi, lo + hi - m.cx)); m.t0 = now; m.until = now + 6; m.cued = true; }
        else { m.act = m.cue.act; m.t0 = now; m.until = now + MOVE_LEN[m.act]; m.cued = true; }
        m.cue = null;
      }
      if (now > m.until || (!m.cued && ((!st.on && m.act !== 'idle') || (st.on && m.act === 'idle')))) {
        var r = rnd(); m.cued = false; m.t0 = now;
        if (!st.on) { m.act = 'idle'; m.until = now + 3 + rnd() * 4; }
        else if (r < 0.34) {
          // Pick a spot along the front that keeps a clear gap from the other singer
          m.act = 'walk'; var others = singers.filter(function (x) { return x !== m; }), tries = 0, tx;
          do { tx = lerp(lo, hi, rnd()); } while (tries++ < 12 && others.some(function (x) { return Math.abs(x.tx - tx) < 1.3 || Math.abs(x.cx - tx) < 1.3; }));
          m.tx = tx; m.until = now + 6;
        }
        else if (r < 0.46) { m.act = 'dance'; m.until = now + 3.5 + rnd() * 2.5; }
        else if (r < 0.56) { m.act = 'wave'; m.until = now + 1.8 + rnd() * 1.5; }
        else if (r < 0.62) { m.act = 'hop'; m.until = now + MOVE_LEN.hop; }
        else if (r < 0.68) { m.act = 'spin'; m.until = now + MOVE_LEN.spin; }
        else if (r < 0.74) { m.act = 'point'; m.until = now + MOVE_LEN.point; }
        else if (r < 0.8) { m.act = 'clapup'; m.until = now + MOVE_LEN.clapup; }
        else { m.act = 'sing'; m.until = now + 3 + rnd() * 4; m.gest = rnd(); }
      }
      // Walking along the front at an easy pace, legs stepping
      var d0 = m.tx - m.cx, spd = m.act === 'walk' ? 0.75 : 0.25;
      if (Math.abs(d0) > 0.03) { var stp = Math.sign(d0) * Math.min(Math.abs(d0), spd * dt); m.cx += stp; m.step = (m.step || 0) + Math.abs(stp) * 9; }
      m.walking = m.act === 'walk' && Math.abs(d0) > 0.06;
      if (m.act === 'walk' && !m.walking) { m.act = 'sing'; m.until = now + 2.5 + rnd() * 3; }
      // Dancing: a few steps side to side with a turn, a clap on each beat
      var danceK = m.act === 'dance' ? Math.min(1, (m.until - now) / 0.6, (now - (m.until - 6)) / 0.6) : 0;
      m.dancing = m.act === 'dance'; m.twirl = Math.max(0, danceK) * (0.5 + 0.4 * Math.max(0, Math.sin(now * 2.4)));
      if (m.dancing) { m.cx += Math.sin(now * 2.2 + m.ph) * 0.35 * dt; var bi = Math.floor(BEAT); if (bi !== m.lastBeat) { m.lastBeat = bi; m.flash = 1; } }
      m.flash = (m.flash || 0) * Math.exp(-dt * 6);
      m.cheer = m.act === 'wave' ? 1 : 0;
      m.idle = m.act === 'idle';
      // A hop twice on the beat, a full twirl that flares the skirt, a point out to the crowd, a clap over the head
      var mu = m.t0 != null && m.until > m.t0 ? Math.max(0, Math.min(1, (now - m.t0) / (m.until - m.t0))) : 1, env = Math.sin(Math.PI * mu);
      m.hopK = m.act === 'hop' ? Math.abs(Math.sin(mu * Math.PI * 3)) * env : 0;
      if (m.act === 'spin') { m.twirl = Math.max(m.twirl, env); m.spinK = env; } else m.spinK = 0;
      m.pose = m.act === 'point' || m.act === 'clapup' ? m.act : null; m.poseK = m.pose ? Math.min(1, env * 1.6) : 0;
      if (m.act === 'clapup') { var cb = Math.floor(BEAT); if (cb !== m.lastClap) { m.lastClap = cb; m.flash = 1; } }
      m.cx = Math.max(lo - 0.6, Math.min(hi + 0.6, m.cx));
    }
    function speakerPole(x, z, h) {
      var b = P(x, 0, z), t0 = P(x, h, z); if (!b || !t0) return;
      g.strokeStyle = '#1f1914'; g.lineWidth = Math.max(1, b.s * 0.12); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(t0.x, t0.y); g.stroke();
      cabinet(x, h, z, 0.9, 1.2);
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
      var key = [W, H, BX, BY, BW, BH, cam.x.toFixed(2), cam.y.toFixed(2), cam.z.toFixed(2), (st.density * QD).toFixed(2)].join('|');
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
        if (pp.c / 6 + (i % 7) / 42 > 0.25 + (st.density * QD)) continue;
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
      // The society's projector screen, tied up on the wall over the shrine
      fillPoly([[-3.45, 3.45, 71.75], [3.45, 3.45, 71.75], [3.45, 6.55, 71.75], [-3.45, 6.55, 71.75]], '#14100c');
      screenPanel(-3.3, 3.3, 3.55, 6.45, 71.7, t, 'sheri');
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
      if (d.role && !st.on && !reduce) { x += Math.sin(T * 0.6 + d.ph * 3) * h * 0.012; y -= Math.max(0, Math.sin(T * 1.1 + d.ph)) * h * 0.004; }
      if (d.fk > 0.02) { if (d.flair === 'sway' || d.flair === 'step' || d.flair === 'lean') x += Math.sin(T * 3.4 + d.ph) * h * 0.06 * d.fk; if (d.flair === 'lean' || d.flair === 'raise') y -= Math.abs(Math.sin(T * 6.5 + d.ph)) * h * 0.025 * d.fk; if (d.flair === 'shake') x += Math.sin(T * 17) * h * 0.012 * d.fk; }
      if (d.hopK) y -= d.hopK * h * 0.13;
      var near = fade == null ? 0 : 1 - fade, dk = near * 0.88;
      FOGF = isYou || d.coupleRole || near ? 0 : Math.max(0, Math.min(0.62, ((st.listener === 'stage' || st.dj ? p.z - 21.5 : p.z + cam.z - 9)) / 55));
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
      // A mirror-work vest over the kediyu (the DJ wears one), and an older sitter's shawl round the shoulders
      if (d.vest && d.man && h > 30) {
        g.fillStyle = tint(d.vest, dk);
        [-1, 1].forEach(function (sd) { g.beginPath(); g.moveTo(x + sd * h * 0.012, y - h * 0.79); g.lineTo(x + sd * h * 0.085, y - h * 0.8); g.lineTo(x + sd * h * 0.095, y - h * 0.55); g.lineTo(x + sd * h * 0.03, y - h * 0.52); g.closePath(); g.fill(); });
        g.fillStyle = gold; for (var vm = 0; vm < 6; vm++) { var vy = y - h * (0.76 - (vm % 3) * 0.08), vx = x + (vm < 3 ? -1 : 1) * h * 0.055; g.beginPath(); g.arc(vx, vy, Math.max(0.7, h * 0.01), 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(235,245,255,.9)'; for (var vm2 = 0; vm2 < 4; vm2++) { g.beginPath(); g.arc(x + (vm2 < 2 ? -1 : 1) * h * 0.06, y - h * (0.72 - (vm2 % 2) * 0.1), Math.max(0.6, h * 0.006), 0, TAU); g.fill(); }
      }
      if (d.sitting && d.older && h > 18) { g.strokeStyle = tint(d.shawl || '#8c6a4f', dk); g.lineWidth = Math.max(1.5, h * 0.06); g.beginPath(); g.moveTo(x - h * 0.1, y - h * 0.74); g.quadraticCurveTo(x, y - h * 0.7, x + h * 0.1, y - h * 0.74); g.stroke(); }
      // The couple's finery: her heavy gold hem and necklace, his gold stole and pagdi band
      if (d.coupleRole === 'w' && fine) {
        g.strokeStyle = gold; g.lineWidth = Math.max(1.2, h * 0.05); g.beginPath(); g.moveTo(x - flare * 0.95, hem - h * 0.05); g.quadraticCurveTo(x, hem - h * 0.01, x + flare * 0.95, hem - h * 0.05); g.stroke();
        g.strokeStyle = gold; g.lineWidth = Math.max(0.8, h * 0.012); g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.785); g.quadraticCurveTo(x + h * 0.02, y - h * 0.63, x + h * 0.09, y - h * 0.565); g.stroke();
      }
      // The singers dress up: her chaniya has a mirror-work border that catches the lights, bandhani dots and a heavy
      // gold hem; he wears a gold stole over the kediyu, and the tail of his safa falls behind
      if (d.role === 'singer' && h > 18) {
        if (!d.man) {
          g.strokeStyle = gold; g.lineWidth = Math.max(1.2, h * 0.045); g.beginPath(); g.moveTo(x - flare * 0.95, hem - h * 0.05); g.quadraticCurveTo(x, hem - h * 0.01, x + flare * 0.95, hem - h * 0.05); g.stroke();
          g.fillStyle = 'rgba(255,248,230,.55)';
          for (var br = 0; br < 3; br++) for (var bc = -3; bc <= 3; bc++) { var bu = bc / 3.6, by2 = lerp(y - h * 0.46, hem - h * 0.12, br / 2.2), bw2 = lerp(h * 0.08, flare * 0.85, (by2 - (y - h * 0.55)) / Math.max(1, hem - (y - h * 0.55))); g.beginPath(); g.arc(x + bu * bw2, by2, Math.max(0.5, h * 0.007), 0, TAU); g.fill(); }
          for (var mw = 0; mw < 9; mw++) { var mu2 = (mw + 0.5) / 9 * 2 - 1, gx2 = x + mu2 * flare * 0.9, gy2 = hem - h * 0.035 + Math.abs(mu2) * h * 0.02, tw2 = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(T * 5 + mw * 1.7 + d.ph * 3); g.fillStyle = 'rgba(235,245,255,' + (0.45 + 0.5 * tw2) + ')'; g.beginPath(); g.arc(gx2, gy2, Math.max(0.7, h * 0.012), 0, TAU); g.fill(); if (tw2 > 0.93) glow(gx2, gy2, Math.max(1, h * 0.028), '#ffffff', (tw2 - 0.93) * 9); }
        } else {
          g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.032); g.beginPath(); g.moveTo(x + h * 0.08, y - h * 0.8); g.quadraticCurveTo(x - h * 0.02, y - h * 0.62, x - h * 0.12, y - h * 0.44); g.stroke();
        }
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
        if (d.role === 'dj') { g.beginPath(); g.ellipse(x + h * 0.012, y - h * 0.975, h * 0.055, h * 0.03, -0.25, 0, TAU); g.fill(); }
        if (fine) { g.beginPath(); g.moveTo(x + h * 0.06, y - h * 0.94); g.quadraticCurveTo(x + h * 0.13, y - h * 0.9, x + h * 0.1, y - h * 0.84); g.lineWidth = Math.max(1, h * 0.02); g.strokeStyle = g.fillStyle; g.stroke(); }
      } else {
        g.fillStyle = tint(d.older ? '#9a948c' : '#1f130d', dk); g.beginPath(); g.ellipse(x, y - h * 0.905, h * 0.074, h * 0.05, 0, Math.PI, 0); g.fill();
        g.beginPath(); g.arc(x, y - h * 0.965, h * 0.034, 0, TAU); g.fill();
        if (fine) { g.strokeStyle = gold; g.lineWidth = Math.max(0.6, h * 0.008); g.beginPath(); g.moveTo(x, y - h * 0.955); g.lineTo(x, y - h * 0.925); g.stroke(); g.fillStyle = gold; g.beginPath(); g.arc(x, y - h * 0.922, Math.max(0.7, h * 0.012), 0, TAU); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(x, y - h * 0.9, Math.max(0.6, h * 0.008), 0, TAU); g.fill(); g.fillStyle = gold; g.beginPath(); g.arc(x - h * 0.066, y - h * 0.87, Math.max(0.6, h * 0.01), 0, TAU); g.arc(x + h * 0.066, y - h * 0.87, Math.max(0.6, h * 0.01), 0, TAU); g.fill(); }
      }
      // The singers' jewellery and his safa tail
      if (d.role === 'singer' && h > 18) {
        if (!d.man) { g.fillStyle = gold; [-1, 1].forEach(function (sd) { g.beginPath(); g.arc(x + sd * h * 0.066, y - h * 0.862, Math.max(0.7, h * 0.012), 0, TAU); g.fill(); g.beginPath(); g.arc(x + sd * h * 0.066, y - h * 0.84, Math.max(0.8, h * 0.016), 0, TAU); g.fill(); }); }
        else { var tail = reduce ? 0 : Math.sin(T * 2.2 + d.ph) * h * 0.012; g.strokeStyle = tint(d.pagdi || '#b8312b', dk); g.lineWidth = Math.max(1, h * 0.028); g.beginPath(); g.moveTo(x - h * 0.06, y - h * 0.93); g.quadraticCurveTo(x - h * 0.13 + tail, y - h * 0.86, x - h * 0.11 + tail, y - h * 0.74); g.stroke(); }
      }
      // Arms: shoulder, elbow, hand
      var shy = y - h * 0.76, L = [x - h * 0.08, shy], R = [x + h * 0.08, shy], le, lh, re, rh;
      if (d.role === 'singer' && d.idle) { le = [x - h * 0.12, shy + h * 0.15]; lh = [x - h * 0.08, shy + h * 0.27]; var tk2 = reduce ? 0 : Math.max(0, Math.sin(T * 1.7 + d.ph)); re = [x + h * 0.13, shy + h * 0.12]; rh = [x + h * (0.12 + 0.06 * tk2), shy + h * (0.28 - 0.14 * tk2)]; }
      else if (d.role === 'singer' && !d.dancing) {
        // The mic in one hand; the other hand draws the phrase: an open palm, a reach to the crowd, a hand on the heart
        le = [x - h * 0.13, shy + h * 0.12]; lh = [x - h * 0.03, shy - h * 0.09];
        if (d.cheer) { var wv = reduce ? 0 : Math.sin(T * 7) * h * 0.04; re = [x + h * 0.15, shy - h * 0.13]; rh = [x + h * 0.2 + wv, shy - h * 0.32]; }
        else { var gp = reduce ? 0 : Math.sin(T * 1.3 + d.ph) * 0.5 + Math.sin(T * 0.47 + d.ph * 2) * 0.5, g0 = (d.gest || 0) < 0.33 ? 0 : (d.gest || 0) < 0.66 ? 1 : 2;
          if (g0 === 2) { re = [x + h * 0.12, shy + h * 0.1]; rh = [x + h * 0.02, shy + h * (0.06 + 0.02 * gp)]; }
          else { re = [x + h * (0.15 + 0.03 * gp), shy + h * (0.04 - 0.05 * gp) - sw * h * 0.03]; rh = [x + h * (0.22 + 0.06 * gp + (g0 ? 0.04 : 0)), shy - h * (0.06 + 0.1 * gp + (g0 ? 0.05 : 0)) - sw * h * 0.05]; } } }
      else if (d.role === 'tabla') { var tk = reduce ? 0 : Math.sin(T * 9 + d.ph); le = [x - h * 0.15, shy + h * 0.14]; lh = [x - h * 0.13, shy + h * (0.28 - 0.04 * Math.max(0, tk))]; re = [x + h * 0.15, shy + h * 0.14]; rh = [x + h * 0.13, shy + h * (0.29 - 0.04 * Math.max(0, -tk))]; }
      else if (d.role === 'dhol') { var hit = Math.max(0, sw); le = [x - h * 0.16, shy + h * 0.1]; lh = [x - h * 0.22, shy + h * (0.2 - 0.06 * hit)]; re = [x + h * 0.16, shy + h * 0.1]; rh = [x + h * 0.22, shy + h * (0.2 - 0.06 * Math.max(0, -sw))]; }
      else if (d.role === 'dj') {
        // One hand on the laptop; the other holds a cup of chhas and brings it up for a sip every few seconds
        var sp = reduce ? 0 : Math.max(0, Math.sin(((T + d.ph * 10) % 7) / 7 * TAU * 1 - 1.2)), sip = sp > 0.6 && !d.talking ? Math.min(1, (sp - 0.6) / 0.3) : 0;
        le = [x - h * 0.14, shy + h * 0.14]; lh = [x - h * 0.06 + sw * h * 0.015, shy + h * 0.24];
        re = [x + h * 0.15, shy + h * (0.13 - 0.1 * sip)]; rh = [x + h * lerp(0.14, 0.035, sip), shy + h * lerp(0.1, -0.06, sip)];
        d.cupAt = rh;
      }
      else if (d.role === 'benjo') { le = [x - h * 0.15, shy + h * 0.12]; lh = [x - h * 0.2, shy + h * 0.2]; re = [x + h * 0.14, shy + h * 0.12]; rh = [x + h * 0.16, shy + h * (0.2 + 0.03 * sw)]; }
      else if (d.role === 'keys') { var rip = reduce ? 0 : Math.sin(T * 7 + d.ph) * h * 0.02; le = [x - h * 0.14, shy + h * 0.14]; lh = [x - h * 0.1 + sw * h * 0.02 + rip, shy + h * 0.26]; re = [x + h * 0.14, shy + h * 0.14]; rh = [x + h * 0.1 - sw * h * 0.02 + rip * 0.7, shy + h * 0.26]; }
      else if (d.holding === 'tea') { le = [x - h * 0.12, shy + h * 0.15]; lh = [x - h * 0.13, shy + h * 0.3]; re = [x + h * 0.12, shy + h * 0.16]; rh = [x + h * 0.07, shy + h * 0.06]; d.cupAt = rh; }
      else if (d.holding === 'phone') { le = [x - h * 0.11, shy + h * 0.14]; lh = [x - h * 0.02, shy + h * 0.12]; re = [x + h * 0.11, shy + h * 0.14]; rh = [x + h * 0.02, shy + h * 0.12]; }
      else if (d.sitting && !d.role) { le = [x - h * 0.11, shy + h * 0.15]; lh = [x - h * 0.06, shy + h * 0.29]; re = [x + h * 0.11, shy + h * 0.15]; rh = [x + h * 0.06, shy + h * 0.29]; }
      else if (d.stander && d.phone) { le = [x - h * 0.13, shy + h * 0.15]; lh = [x - h * 0.13, shy + h * 0.3]; re = [x + h * 0.1, shy - h * 0.06]; rh = [x + h * 0.06, shy - h * 0.2]; }
      else if (d.stander && d.chat && Math.sin(T * 1.3 + d.sway) > 0.4) { le = [x - h * 0.12, shy + h * 0.15]; lh = [x - h * 0.13, shy + h * 0.3]; re = [x + h * 0.16, shy + h * 0.12]; rh = [x + h * 0.22, shy + h * (0.02 + 0.04 * Math.sin(T * 5 + d.sway))]; }
      else if (d.photo && !walking) { le = [x - h * 0.12, shy + h * 0.06]; lh = [x - h * 0.04, shy - h * 0.1]; re = [x + h * 0.12, shy + h * 0.06]; rh = [x + h * 0.04, shy - h * 0.1]; }
      else if (tw > 0.3) { le = [x - h * 0.17, shy - h * 0.1]; lh = [x - h * 0.24, shy - h * 0.24]; re = [x + h * 0.17, shy - h * 0.1]; rh = [x + h * 0.24, shy - h * 0.24]; }
      else if (up) { le = [x - h * 0.13, shy - h * 0.12]; lh = [x - h * 0.012, shy - h * 0.27]; re = [x + h * 0.13, shy - h * 0.12]; rh = [x + h * 0.012, shy - h * 0.27]; }
      else if (dancing) { le = [x - h * 0.18, shy + h * (0.02 - 0.06 * sw)]; lh = [x - h * 0.22, shy - h * (0.1 + 0.14 * sw)]; re = [x + h * 0.18, shy + h * (0.02 + 0.06 * sw)]; rh = [x + h * 0.22, shy - h * (0.1 - 0.14 * sw)]; }
      else { var a1 = walking ? sw * 0.05 : 0; le = [x - h * 0.11, shy + h * 0.15]; lh = [x - h * (0.12 + a1), shy + h * 0.3]; re = [x + h * 0.11, shy + h * 0.15]; rh = [x + h * (0.12 - a1), shy + h * 0.3]; }
      // The flourishes and cued moves reshape the arms, easing in and out
      if (d.fk > 0.02) {
        var fk = d.fk;
        if (d.flair === 'raise') { var fq0 = Math.sin(T * 14 + d.ph) * h * 0.03; le = [lerp(le[0], x - h * 0.15, fk), lerp(le[1], shy - h * 0.12, fk)]; lh = [lerp(lh[0], x - h * 0.13, fk), lerp(lh[1], shy - h * 0.32 + fq0, fk)]; re = [lerp(re[0], x + h * 0.15, fk), lerp(re[1], shy - h * 0.12, fk)]; rh = [lerp(rh[0], x + h * 0.13, fk), lerp(rh[1], shy - h * 0.32 - fq0, fk)]; }
        if (d.flair === 'handup') { re = [lerp(re[0], x + h * 0.16, fk), lerp(re[1], shy - h * 0.12, fk)]; rh = [lerp(rh[0], x + h * 0.21, fk), lerp(rh[1], shy - h * 0.34 + Math.sin(T * 6) * h * 0.02, fk)]; }
        if (d.flair === 'flurry') { var fq1 = Math.sin(T * 24 + d.ph); lh = [lh[0], lh[1] - Math.max(0, fq1) * h * 0.05 * fk]; rh = [rh[0], rh[1] - Math.max(0, -fq1) * h * 0.05 * fk]; }
      }
      if (d.pose && d.poseK > 0.02) {
        var pk = d.poseK;
        if (d.pose === 'point') { re = [lerp(re[0], x + h * 0.17, pk), lerp(re[1], shy - h * 0.03, pk)]; rh = [lerp(rh[0], x + h * 0.31, pk), lerp(rh[1], shy - h * 0.13, pk)]; }
        else { var cl = reduce ? 0.5 : Math.abs(Math.sin(BEAT * Math.PI)); le = [lerp(le[0], x - h * 0.13, pk), lerp(le[1], shy - h * 0.15, pk)]; lh = [lerp(lh[0], x - h * (0.02 + 0.06 * cl), pk), lerp(lh[1], shy - h * 0.33, pk)]; re = [lerp(re[0], x + h * 0.13, pk), lerp(re[1], shy - h * 0.15, pk)]; rh = [lerp(rh[0], x + h * (0.02 + 0.06 * cl), pk), lerp(rh[1], shy - h * 0.33, pk)]; }
      }
      g.strokeStyle = skin; g.lineWidth = lw;
      g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(le[0], le[1]); g.lineTo(lh[0], lh[1]); g.moveTo(R[0], R[1]); g.lineTo(re[0], re[1]); g.lineTo(rh[0], rh[1]); g.stroke();
      if (fine && !d.man) { g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.02); g.beginPath(); g.moveTo(lh[0], lh[1]); g.lineTo(lerp(le[0], lh[0], 0.8), lerp(le[1], lh[1], 0.8)); g.moveTo(rh[0], rh[1]); g.lineTo(lerp(re[0], rh[0], 0.8), lerp(re[1], rh[1], 0.8)); g.stroke(); }
      if (d.stander && d.phone) { g.fillStyle = '#111'; g.fillRect(rh[0] - h * 0.03, rh[1] - h * 0.07, h * 0.06, h * 0.1); g.fillStyle = 'rgba(200,225,255,.9)'; g.fillRect(rh[0] - h * 0.022, rh[1] - h * 0.06, h * 0.044, h * 0.08); if (st.on) glow(rh[0], rh[1] - h * 0.02, Math.max(0.8, h * 0.03), '#eaf3ff', 0.5); }
      if (d.photo && !walking) { g.fillStyle = '#151515'; g.fillRect(x - h * 0.07, shy - h * 0.16, h * 0.14, h * 0.08); if (d.snap > 0) glow(x, shy - h * 0.12, Math.max(1.5, h * 0.06 * (1 + d.snap)), '#ffffff', d.snap); }
      if (d.role === 'dj' && h > 50) {
        // Up close the DJ has a face: eyes, brows, and a grin that opens when he talks
        var fy = y - h * 0.885, ink = '#1f130d';
        g.fillStyle = ink; g.beginPath(); g.arc(x - h * 0.024, fy - h * 0.006, Math.max(1, h * 0.0085), 0, TAU); g.arc(x + h * 0.024, fy - h * 0.006, Math.max(1, h * 0.0085), 0, TAU); g.fill();
        g.strokeStyle = ink; g.lineWidth = Math.max(1, h * 0.006); g.beginPath(); g.moveTo(x - h * 0.038, fy - h * 0.024); g.lineTo(x - h * 0.012, fy - h * 0.028); g.moveTo(x + h * 0.012, fy - h * 0.028); g.lineTo(x + h * 0.038, fy - h * 0.024); g.stroke();
        var talkOpen = d.talking && !reduce ? Math.abs(Math.sin(T * 14)) : 0;
        g.fillStyle = '#7a2418'; g.beginPath(); g.ellipse(x, fy + h * 0.036, h * 0.02, h * (0.005 + 0.012 * talkOpen), 0, 0, TAU); g.fill();
        g.strokeStyle = '#e8b04b'; g.lineWidth = Math.max(1, h * 0.008); g.beginPath(); g.arc(x, y - h * 0.8, h * 0.05, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      }
      if (d.holding === 'tea' && d.cupAt && h > 14) { var tc = d.cupAt; g.fillStyle = '#f4efe4'; g.fillRect(tc[0] - h * 0.018, tc[1] - h * 0.045, h * 0.036, h * 0.045); g.fillStyle = '#b07a4a'; g.fillRect(tc[0] - h * 0.015, tc[1] - h * 0.043, h * 0.03, h * 0.008); if (!reduce && h > 30) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tc[0], tc[1] - h * 0.05); g.quadraticCurveTo(tc[0] + h * 0.02 * Math.sin(T * 2), tc[1] - h * 0.08, tc[0], tc[1] - h * 0.11); g.stroke(); } }
      if (d.holding === 'phone' && h > 14) { g.fillStyle = '#111'; g.fillRect(x - h * 0.025, shy + h * 0.06, h * 0.05, h * 0.075); g.fillStyle = 'rgba(200,225,255,.9)'; g.fillRect(x - h * 0.02, shy + h * 0.065, h * 0.04, h * 0.065); glow(x, shy + h * 0.1, Math.max(1, h * 0.06), '#cfe0ff', 0.35); }
      if (d.role === 'dj' && d.cupAt) {
        // Headphones round the neck, and the paper cup of chhas
        g.strokeStyle = '#111'; g.lineWidth = Math.max(1, h * 0.02); g.beginPath(); g.arc(x, y - h * 0.8, h * 0.07, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
        g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(x - h * 0.07, y - h * 0.79, h * 0.03, 0, TAU); g.arc(x + h * 0.07, y - h * 0.79, h * 0.03, 0, TAU); g.fill();
        var cx0 = d.cupAt[0], cy0 = d.cupAt[1], cw0 = h * 0.03, ch0 = h * 0.075;
        g.fillStyle = 'rgba(248,246,238,.95)'; g.beginPath(); g.moveTo(cx0 - cw0 * 0.75, cy0 + ch0 * 0.35); g.lineTo(cx0 + cw0 * 0.75, cy0 + ch0 * 0.35); g.lineTo(cx0 + cw0, cy0 - ch0 * 0.65); g.lineTo(cx0 - cw0, cy0 - ch0 * 0.65); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = Math.max(0.6, h * 0.006); g.stroke();
        g.fillStyle = '#fbfaf3'; g.beginPath(); g.ellipse(cx0, cy0 - ch0 * 0.65, cw0, cw0 * 0.3, 0, 0, TAU); g.fill();
      }
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
      if (d.wantHome !== goHome) { d.wantHome = goHome; d.wait = d.delay; d.around = 0; }
      var target = goHome ? slot : d.rest, dx = target.x - d.x, dz = target.z - d.z, dist = Math.hypot(dx, dz);
      if (d.wait > 0) d.wait -= dt;
      else if (dist > 0.2) {
        var step = Math.min(dist, d.speed * dt * (goHome && dist < 2 ? 0.6 + dist * 0.2 : 1)), mx = dx / dist, mz = dz / dist, rc = Math.hypot(d.x, d.z);
        // Walk round the centre rather than across it
        var rd = roundCentre(d, mx, mz, dx, dz); mx = rd[0]; mz = rd[1];
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

    /* ---------- the song's progress, traced counterclockwise round the garbo, just outside its rangoli ---------- */
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
    var camVenue = null, camNow = [0, 4.4, -12.5], horNow = 0.3, camSettled = true, walk = null, camKeyNow = '';
    var T = 0, lampAt = { x: 0.5, y: 0.6, r: 0.08 }, youLabel = null, partnerLabel = null, lightAt = null;
    function frame(ms) {
      if (!running) return;
      var dt = Math.min(0.05, lastMs ? (ms - lastMs) / 1000 : 0.016);
      if (lastMs && !document.hidden) {
        var gap = ms - lastMs; if (gap < 250) frameMs += (gap - frameMs) * 0.05;
        slowFor = frameMs > 28 ? slowFor + gap : 0;
        if (slowFor > 2500 && (QP > 0.5 || QD > 0.55)) { if (QP > 0.5) { QP = Math.max(0.5, QP - 0.25); resize(); } else QD = Math.max(0.55, QD - 0.2); slowFor = 0; frameMs = 20; }
      }
      lastMs = ms;
      var t = clock();
      if (!reduce) T += dt;
      TH = THEMES[st.theme] || THEMES.traditional;
      var bb = opts.beats && opts.beats(); BEAT = bb ? ((t - bb.anchor) / bb.period) % 2 : T * 1.8;
      var target = st.listener === 'far' ? 1 : 0;
      // You walk between the places you can stand: a second or two along an eased path, lifted over the crowd on
      // a long walk, with a step in it. A new venue starts in place.
      var ct = st.dj ? djCam(st.venue) : (CAMS[st.venue] || CAMS.outdoors)[st.listener] || CAMS.outdoors.circle, hf = st.dj ? 0.2 : { circle: 0.3, far: 0.4, stage: 0.44 }[st.listener] || 0.3;
      // On a wide screen the DJ stands right of centre, leaving the left for the laptop's song list
      if (st.dj && W > H * 1.1) { ct[0] -= 1.35; ct[1] += 0.12; ct[2] -= 1.3; }
      var camKey = st.venue + '/' + (st.dj ? 'dj' : st.listener);
      if (camVenue !== st.venue || reduce) { camVenue = st.venue; camNow = ct.slice(); horNow = hf; walk = null; camKeyNow = camKey; }
      else if (camKey !== camKeyNow) { camKeyNow = camKey; var wd = Math.hypot(ct[0] - camNow[0], ct[1] - camNow[1], ct[2] - camNow[2]); walk = { from: camNow.slice(), h0: horNow, t: 0, dur: Math.min(1.8, 0.8 + wd / 45), lift: Math.min(2.6, wd * 0.06) }; }
      if (walk) {
        walk.t += dt;
        var wp = Math.min(1, walk.t / walk.dur), we = wp < 0.5 ? 2 * wp * wp : 1 - Math.pow(-2 * wp + 2, 2) / 2, arc = Math.sin(wp * Math.PI);
        for (var ci0 = 0; ci0 < 3; ci0++) camNow[ci0] = walk.from[ci0] + (ct[ci0] - walk.from[ci0]) * we;
        camNow[1] += arc * walk.lift + Math.sin(wp * Math.PI * 7) * 0.05 * arc; camNow[0] += Math.sin(wp * Math.PI * 3.5) * 0.06 * arc;
        horNow = walk.h0 + (hf - walk.h0) * we;
        if (wp >= 1) walk = null;
      } else {
        var ek = Math.min(1, dt * 2.4);
        camNow[0] += (ct[0] - camNow[0]) * ek; camNow[1] += (ct[1] - camNow[1]) * ek; camNow[2] += (ct[2] - camNow[2]) * ek; horNow += (hf - horNow) * ek;
      }
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
        c.shown = !(ci > 1 && (ci - 1) / L.circles.length > (st.density * QD));
        if (!c.shown) return;
        var ctr = circleCentre(c, T);
        if (c.main) { rangoliAt(ctr, t); progressRing(ctr, 2.25, t); var lp = P(ctr.x, 0, ctr.z); if (lp) items.push({ z: lp.z, kind: 'lamp', p: lp, main: true, ctr: ctr }); }
        var home = 0;
        c.dancers.forEach(function (d, di) {
          if (d.clapAt && t >= d.clapAt) { d.flash = 1; d.clapAt = 0; }
          d.flash *= Math.exp(-dt * 7); d.twirl *= Math.exp(-dt * 2.2);
          var slot = dancerWorld(c, d, T, ctr), w = travel(d, slot, dt);
          d.wx = w.x; d.wz = w.z;
          if (d.atHome) home++;
          var p = P(w.x, d.sitting ? (d.rest.y || 0) : 0, w.z); d._px = p ? p.x : null;
          var fd = p ? Math.max(0, Math.min(1, (p.z - 3) / 4)) : 0;
          if (p && p.z > 2.2 && p.x > -60 && p.x < W + 60) items.push({ z: p.z, kind: 'dancer', p: p, d: d, fade: fd, you: !!d.coupleRole && d.coupleRole === (st.youAs === 'man' ? 'm' : 'w') && st.listener === 'circle' && view.k < 0.5 && !st.dj, partner: !!d.coupleRole && d.coupleRole !== (st.youAs === 'man' ? 'm' : 'w') && st.listener === 'circle' && view.k < 0.5 && !st.dj });
        });
        c.present = home / c.dancers.length;
        // Raas: neighbours pair up and strike each other's sticks, so each turns toward the other on the beat
        for (var pi = 0; pi + 1 < c.dancers.length; pi += 2) { var da = c.dancers[pi], db = c.dancers[pi + 1]; if (da._px != null && db._px != null) { da.strikeDir = db._px >= da._px ? 1 : -1; db.strikeDir = -da.strikeDir; } else { da.strikeDir = db.strikeDir = 0; } }
      });
      if (!reduce) { moveWalkers(L, st.venue, dt); moveKids(L, st.venue, dt); }
      L.standers.forEach(function (sd0) { if (sd0.clapAt && t >= sd0.clapAt) { sd0.flash = 1; sd0.clapAt = 0; } sd0.flash *= Math.exp(-dt * 4); var p = P(sd0.x, 0, sd0.z); if (p && p.z > (st.dj ? 3 : 2.5) && p.x > -30 && p.x < W + 30) items.push({ z: p.z, kind: 'dancer', p: p, d: sd0, fade: Math.max(0, Math.min(1, (p.z - 3) / 4)) }); });
      var nearCut = st.dj ? 3 : 2.5;
      L.kids.forEach(function (k) { var p = P(k.x, 0, k.z); if (p && p.z > nearCut && p.x > -30 && p.x < W + 30) items.push({ z: p.z, kind: 'dancer', p: p, d: k, fade: Math.max(0, Math.min(1, (p.z - 3) / 4)) }); });
      L.walkers.forEach(function (w, wi) { if (wi / L.walkers.length > (st.density * QD)) return; var p = P(w.x, 0, w.z), fd = p ? Math.max(0, Math.min(1, (p.z - 4) / 3)) : 0; if (p && fd > 0 && p.z > nearCut && p.x > -40 && p.x < W + 40) items.push({ z: p.z, kind: 'dancer', p: p, d: w, fade: fd }); });
      L.stalls.forEach(function (sl) { var p = P(sl.x, 0, sl.z); if (p) items.push({ z: p.z + 1.5, kind: 'stall', sl: sl, p: p }); });
      L.trees.forEach(function (tr) { if (tr.z >= 44) return; var p = P(tr.x, 0, tr.z); if (p && p.z > 1.5) items.push({ z: p.z, kind: 'tree', tr: tr }); });
      if (DJ[st.venue]) { var djb = DJ[st.venue], djp = P(djb.x, 0, djb.z); if (djp && djp.z > 1 && djp.x > -80 && djp.x < W + 80) items.push({ z: djp.z + 0.3, kind: 'dj', b: djb }); }
      if (DJ[st.venue]) { var life = djAround(st.venue);
        life.props.forEach(function (o) { var p = P(o.x, 0, o.z); if (p && p.z > 1.2 && p.x > -60 && p.x < W + 60) items.push({ z: p.z + (o.kind === 'plasticChair' ? 0.02 : 0), kind: 'djprop', o: o }); });
        life.people.forEach(function (q) { var p = P(q.x, q.seat ? 0.45 : 0, q.z); if (p && p.z > 1.6 && p.x > -60 && p.x < W + 60) items.push({ z: p.z - 0.01, kind: 'dancer', p: p, d: q.d, fade: 1 }); }); }
      L.props.forEach(function (o) { var p = P(o.x, 0, o.z); if (p && p.z > 2 && p.x > -60 && p.x < W + 60) items.push({ z: p.z, kind: 'prop', o: o }); });
      L.gallery.forEach(function (ga) {
        if (ga.kind === 'runner') { ga.x = (ga.cx || 0) + Math.sin(T * (ga.sp || 0.5) + (ga.ph || 0)) * (ga.amp || 8); ga.who.step = T * 9 + (ga.ph || 0); ga.who.moving = true; }
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
      var D0 = -cam.z, FOG = [{ z: st.listener === 'stage' || st.dj ? 60 : D0 + 40, a: 0.42 }], fi = 0;
      items.forEach(function (it) {
        while (fi < FOG.length && it.z < FOG[fi].z) fogBand(FOG[fi++]);
        if (it.kind === 'lamp') { var lp2 = it.main && opts.lampScale ? { x: it.p.x, y: it.p.y, s: it.p.s * opts.lampScale, z: it.p.z } : it.p; mandvi(it.ctr, 'back', t); garbo(lp2, it.main ? lit : lit * 0.8, t, it.main); mandvi(it.ctr, 'front', t); it.p = lp2; if (it.main) lampAt = { x: it.p.x / W, y: (it.p.y - it.p.s * 0.9) / H, r: it.p.s * 0.9 / W }; }
        else if (it.kind === 'stall') stall(it.sl, t);
        else if (it.kind === 'tree') drawTree(it.tr, t);
        else if (it.kind === 'prop') prop(it.o, t);
        else if (it.kind === 'dj') djBooth(it.b, t);
        else if (it.kind === 'djprop') djProp(it.o, t);
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
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      // At most about 2.4 million pixels a frame: phones keep full sharpness, big screens draw a little softer
      DPR = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1, Math.sqrt(PIXELS * QP * QP / (W * H))));
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      layoutBox(); statics = {}; fade = null;
    }
    function layoutBox() {
      BX = box ? box.x : 0; BY = box ? box.y : 0; BW = box ? box.w : W; BH = box ? box.h : H;
      HOR = BY + BH * 0.3; F = Math.min(BW, BH * 1.05) * 0.95;
    }
    var faces = [];
    function loadFaces(list) {
      var next = (list || []).filter(function (f) { return f && f.url; }).slice(0, 4);
      faces = next.map(function (f) {
        var old = faces.filter(function (o) { return o.url === f.url; })[0];
        if (old) { old.man = !!f.man; return old; }
        var rec = { url: f.url, man: !!f.man, img: null }, im = new Image(); im.decoding = 'async'; im.onload = function () { rec.img = im; }; im.src = f.url; return rec;
      });
    }
    function set(patch) {
      // Singer heads for the song's artists: singerFaces is a list, singerFace a single one
      if (patch.singerFaces !== undefined) loadFaces(patch.singerFaces);
      else if (patch.singerFace !== undefined) loadFaces(patch.singerFace ? [patch.singerFace] : []);
      if (patch.venue && patch.venue !== st.venue && W > 1) {
        fade = fade || document.createElement('canvas'); fade.width = canvas.width; fade.height = canvas.height;
        fade.getContext('2d').drawImage(canvas, 0, 0); fadeA = 1; waves = []; arrivals = [];
      }
      if (patch.listener && patch.listener !== st.listener) { waves = []; arrivals = []; }
      // A new song: its progress starts again from the top, and the singers change sides for it
      if (patch.progress != null) { if ((st.progress || 0) > 0.3 && patch.progress < 0.05) swapSingers(); }
      for (var k in patch) st[k] = patch[k];
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
    // Shift on a keyboard cues the singers' next move, except while typing
    if (opts.keys !== false) window.addEventListener('keydown', function (e) {
      if (e.key !== 'Shift' || e.repeat || !running) return;
      var tgt = e.composedPath ? e.composedPath()[0] : e.target;
      if (tgt && tgt.closest && tgt.closest('input, textarea, select, [contenteditable]')) return;
      cueSingers();
    });
    resize();
    if (!opts.manual) requestAnimationFrame(frame);
    return {
      set: set, resize: resize,
      // Where the scene composes itself inside the canvas, in CSS pixels. Omit to use the whole canvas.
      setBox: function (b) { box = b; layoutBox(); statics = {}; },
      draw: frame,
      lamp: function () { return lampAt; },
      // The singers' next move, as Shift does it; returns the move's name
      cueSingers: cueSingers,
      stop: function () { running = false; }
    };
  }

  window.GarbaVenueScene = { create: create, moonInfo: moonInfo };
})();
