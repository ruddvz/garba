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
    outdoors: { circle: [0, 4.4, -12.5], far: [0, 5.5, -26] },
    stadium: { circle: [0, 4.6, -12.5], far: [0, 9.5, -37] },
    sheri: { circle: [0, 4, -11.5], far: [-3, 3, -23] }
  };

  function create(canvas, opts) {
    opts = opts || {};
    var g = canvas.getContext('2d');
    var W = 1, H = 1, DPR = 1, F = 1, HOR = 1, box = null, BX = 0, BY = 0, BW = 1, BH = 1;
    var cam = { x: 0, y: 4, z: -15 };
    var TH = THEMES.traditional, BEAT = 0, band = {};
    var st = { theme: 'traditional', density: 1, venue: 'outdoors', listener: 'circle', style: 'claps', mode: 'immersive', on: false, level: 0.6, lit: null, progress: 0, chapters: null, chapterIndex: -1, live: false };
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
    function makeCircle(x, z, R, main, parent) {
      var n = Math.max(5, Math.min(44, Math.round(TAU * R / 1.3))), c = { x0: x, z0: z, R: R, main: main, parent: parent || null, dancers: [], ph: [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU], w: (0.95 + rnd() * 0.35) / R, spin: main ? 0 : rnd() * TAU, wob: parent ? 1.6 : 1 };
      for (var i = 0; i < n; i++) {
        var man = rnd() < 0.36;
        c.dancers.push({ a0: -Math.PI / 2 + i / n * TAU, delay: rnd() * 1.8, speed: 2.6 + rnd() * 1.2, man: man, stick: Math.floor(rnd() * 4), pagdi: ['#b8312b', '#e67e22', '#f0c24b', '#c2185b', '#f3e6d0'][Math.floor(rnd() * 5)], odhni: TOPS[Math.floor(rnd() * TOPS.length)], col: SKIRTS[Math.floor(rnd() * SKIRTS.length)], top: TOPS[Math.floor(rnd() * TOPS.length)], ph: rnd() * TAU, ph2: rnd() * TAU, lag: rnd() * 0.02, h: 1.55 + rnd() * 0.2 + (man ? 0.1 : 0), flash: 0, clapAt: 0 });
      }
      return c;
    }
    function layout(id) {
      if (layouts[id]) return layouts[id];
      // One garbo at the centre of the venue. Rings grow around it, and people start their own circles anywhere.
      var main = makeCircle(0, 0, id === 'sheri' ? 4.4 : 5.6, true), circles = [main];
      if (id !== 'sheri') circles.push(makeCircle(0, 0, 9.4, false, main));
      if (id === 'sheri') circles.push(makeCircle(lerp(-0.8, 0.8, rnd()), 18 + rnd() * 3, 3 + rnd() * 0.6, false));
      else {
        var want = id === 'outdoors' ? 4 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 2), box = id === 'outdoors' ? [-24, 24, 2, 38] : [-19, 19, 4, 31], tries = 0;
        while (circles.length < want + 2 && tries++ < 600) {
          var R = rnd() < 0.4 ? 1.6 + rnd() * 1.2 : 2.8 + rnd() * (id === 'outdoors' ? 3 : 2), x = lerp(box[0] + R, box[1] - R, rnd()), z = lerp(box[2] + R, box[3] - R, rnd());
          var ok = circles.every(function (c) { return Math.hypot(c.x0 - x, c.z0 - z) > c.R + R + 2.8; });
          if (ok) circles.push(makeCircle(x, z, R, false));
        }
      }
      var L = { circles: circles, houses: id === 'sheri' ? houses() : null, stands: id === 'stadium' ? stands() : null, stalls: stallsFor(id) };
      L.walkers = walkersFor(id, L);
      layouts[id] = L; return L;
    }
    // Food stalls: where they stand, which way they face (u runs along the counter, v into the stall)
    function stallsFor(id) {
      var list = id === 'outdoors' ? [[-26.5, 11, 'Chai', '#b8312b'], [-26.5, 18.5, 'Dabeli', '#2f6fa8'], [-26.5, 26, 'Pani puri', '#2f8f5b'], [26.5, 14, 'Water', '#2f6fa8'], [26.5, 22, 'Ice cream', '#8e44ad'], [26.5, 30, 'Snacks', '#e67e22']]
        : id === 'stadium' ? [[-20.5, 33.5, 'Chai', '#b8312b'], [20.5, 33.5, 'Snacks', '#e67e22']]
          : [[-6.2, 9, 'Pani puri', '#2f8f5b']];
      return list.map(function (a) {
        var side = a[0] < 0 ? -1 : 1, facing = id === 'stadium' ? 'camera' : 'inward';
        var st0 = { x: a[0], z: a[1], sign: a[2], col: a[3], w: id === 'sheri' ? 1.8 : 3.4, depth: id === 'sheri' ? 0.9 : 2.2, cart: id === 'sheri' };
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
      var n = { outdoors: 16, stadium: 10, sheri: 7 }[id], out = [];
      for (var i = 0; i < n; i++) {
        var p = freeSpot(id, L), man = rnd() < 0.5;
        var w = { x: p.x, z: p.z, tx: p.x, tz: p.z, wait: rnd() * 4, speed: 0.9 + rnd() * 0.6, man: man, col: SKIRTS[Math.floor(rnd() * SKIRTS.length)], top: TOPS[Math.floor(rnd() * TOPS.length)], ph: rnd() * TAU, ph2: 0, h: 1.5 + rnd() * 0.3 + (man ? 0.1 : 0), flash: 0, step: rnd() * TAU, walker: true };
        out.push(w);
      }
      return out;
    }
    function moveWalkers(L, id, dt) {
      L.walkers.forEach(function (w) {
        if (w.wait > 0) { w.wait -= dt; w.moving = false; return; }
        var dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz);
        if (d < 0.3) {
          w.moving = false; w.wait = 2 + rnd() * 6;
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
        w.x += vx / vl * w.speed * dt; w.z += vz / vl * w.speed * dt; w.step += dt * w.speed * 5.5; w.moving = true;
      });
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
      stage({ x0: -11, x1: 11, z: 46, h: 1.6, screenTop: 8.5, truss: 10.5, arrays: 13 }, t, 'outdoors');
      // Delay speaker towers halfway down the ground, so the back of the crowd hears the band on time
      [-21, 21].forEach(function (x) { speakerPole(x, 16, 6); });
    }
    function groundMarks(id) {
      // Scuffed earth, stones and footprints: fixed in the world so they move with the view
      var L = layout(id);
      if (!L.marks) { L.marks = []; for (var i = 0; i < 260; i++) L.marks.push([lerp(-30, 30, rnd()), lerp(-14, 44, rnd()), rnd()]); }
      for (var j = 0; j < L.marks.length; j++) {
        var m = L.marks[j], p = P(m[0], 0, m[1]); if (!p || p.x < 0 || p.x > W) continue;
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
    function outdoorsOver(t) {
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
      // LED ribbon along the front of the stands
      var hue = TH.hues[0];
      [[[-28, 0.2, 41.9], [28, 0.2, 41.9]], [[-24.9, 0.2, -34], [-24.9, 0.2, 41.9]], [[24.9, 0.2, -34], [24.9, 0.2, 41.9]]].forEach(function (seg, si) {
        var a0 = seg[0], b0 = seg[1];
        if (poly([[a0[0], 0.2, a0[2]], [b0[0], 0.2, b0[2]], [b0[0], 1.2, b0[2]], [a0[0], 1.2, a0[2]]])) {
          var pa = P(a0[0], 0.7, Math.max(a0[2], cam.z + 1)), pb = P(b0[0], 0.7, b0[2]);
          if (pa && pb) { var lg = g.createLinearGradient(pa.x, pa.y, pb.x, pb.y); for (var k = 0; k <= 5; k++) lg.addColorStop(k / 5, 'hsl(' + (TH.hues[(k + si) % TH.hues.length] + 20 * Math.sin(t * TH.speed + k)) + ',' + TH.sat + '%,' + (30 + 12 * bright + 8 * pulse) + '%)'); g.fillStyle = lg; g.fill(); }
        }
      });
      // Crowd in the stands, with phone lights here and there
      var cols = ['#c9a37a', '#b76b5a', '#8f7aa8', '#d4b58c', '#6c8fa3', '#caa0b8'];
      for (i = 0; i < L.stands.length; i++) {
        var pp = L.stands[i], p;
        if (pp.c / 6 + (i % 7) / 42 > 0.25 + st.density) continue;
        if (pp.side === 0) p = P(pp.u, 1.3 + pp.row * 0.95 + 0.35, 42 + pp.row * 1.5 + 0.4);
        else p = P(pp.side * (25 + pp.row * 1.5 + 0.4), 1.3 + pp.row * 0.95 + 0.35, pp.u);
        if (!p || p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H) continue;
        var sz = Math.max(1, p.s * 0.34);
        if (pp.p >= 0 && st.on && Math.sin(t * 1.7 + pp.p) > 0.55) glow(p.x, p.y - sz, Math.max(0.8, sz * 0.4), '#f4f7ff', 0.9);
        else { g.fillStyle = cols[pp.c]; g.globalAlpha = 0.75; g.fillRect(p.x - sz / 2, p.y - sz, sz, sz); g.globalAlpha = 1; }
      }
      stage({ x0: -8, x1: 8, z: 35.5, h: 1.4, screenTop: 6.8, truss: 8.4, arrays: 10 }, t, 'stadium');
    }
    function stadiumOver(t) {
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

    function sheriBack(t) {
      var L = layout('sheri');
      // Stone paving: courses across the lane and joints along it, with a gutter by each otla
      g.strokeStyle = 'rgba(255,220,170,.05)'; g.lineWidth = 1;
      for (var z = -30; z < 72; z += 1.4) { var a = P(-7.2, 0, z), b = P(7.2, 0, z); if (a && b) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
      for (var jx = -6; jx <= 6; jx += 2) { var j0 = P(jx, 0, Math.max(cam.z + 1.5, -30)), j1 = P(jx, 0, 72); if (j0 && j1) { g.beginPath(); g.moveTo(j0.x, j0.y); g.lineTo(j1.x, j1.y); g.stroke(); } }
      [-1, 1].forEach(function (sd) {
        fillPoly([[sd * 7.2, 0.01, Math.max(cam.z + 1, -40)], [sd * 6.9, 0.01, Math.max(cam.z + 1, -40)], [sd * 6.9, 0.01, 72], [sd * 7.2, 0.01, 72]], 'rgba(0,0,0,.35)');
        fillPoly([[sd * 7.25, 0, Math.max(cam.z + 1, -40)], [sd * 7.25, 0.45, Math.max(cam.z + 1, -40)], [sd * 7.25, 0.45, 72], [sd * 7.25, 0, 72]], '#3a3040');
      });
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
      bandOn('sheri', 0, 64.5, { x0: -3.2, x1: 3.2 });
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
          archWindow(X, yb, zc, ww, wh, door ? '#3a1f12' : lit ? 'rgba(255,186,96,.8)' : 'rgba(22,16,34,.95)');
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
          g.font = '700 ' + fs + 'px system-ui, -apple-system, sans-serif'; g.textAlign = 'center';
          var tw = g.measureText(sl.sign).width + fs;
          g.fillStyle = 'rgba(24,12,6,.9)'; roundRect(sp.x - tw / 2, sp.y - fs * 0.95, tw, fs * 1.4, fs * 0.3); g.fill();
          g.strokeStyle = sl.col; g.lineWidth = 1; g.stroke();
          g.fillStyle = '#ffd58a'; g.fillText(sl.sign, sp.x, sp.y + fs * 0.12);
        }
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
    function tint(hex, f) {
      if (!f) return hex;
      var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, bb = n & 255;
      return 'rgb(' + Math.round(lerp(r, 16, f)) + ',' + Math.round(lerp(gg, 10, f)) + ',' + Math.round(lerp(bb, 8, f)) + ')';
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
      var s = p.s, x = p.x, y = p.y, h = d.h * s, up = d.flash > 0.25;
      var walking = ((d.walker && d.moving) || d.walking) && !reduce, dancing = !d.walker && !d.role && st.on && !reduce && !d.walking && d.atHome !== false, playing = d.role && st.on && !reduce;
      if (d.sitting) h *= 0.64;
      var ph = walking ? d.step : beatPh * Math.PI + d.ph, sw = walking || dancing || playing ? Math.sin(ph) : 0;
      y -= (walking ? 0.025 : dancing ? 0.05 : 0.015) * Math.abs(sw) * s;
      var near = fade == null ? 0 : 1 - fade, dk = near * 0.88;
      if (h < 1.5) return;
      g.globalAlpha = 1 - Math.min(1, p.z / 70) * 0.4;
      if (!near) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, p.y, h * 0.2, h * 0.045, 0, 0, TAU); g.fill(); }
      var skin = tint(SKIN[Math.floor((d.ph || 0) * 10) % SKIN.length], dk), main = tint(isYou ? '#f3e6d0' : d.col, dk), top = tint(isYou ? '#d6b06f' : d.top, dk), gold = tint('#e8b04b', dk);
      var fine = h > 26 && !near, lw = Math.max(0.8, h * 0.034);
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (d.man) {
        // Churidar legs and mojari
        g.strokeStyle = tint('#efe6d6', dk); g.lineWidth = Math.max(1, h * 0.055);
        var lx = walking ? sw * h * 0.06 : sw * h * 0.03;
        g.beginPath(); g.moveTo(x - h * 0.045, y - h * 0.44); g.lineTo(x - h * 0.06 - lx, y - h * 0.02); g.moveTo(x + h * 0.045, y - h * 0.44); g.lineTo(x + h * 0.06 + lx, y - h * 0.02); g.stroke();
        g.fillStyle = tint('#3a1f12', dk); g.beginPath(); g.ellipse(x - h * 0.07 - lx, y, h * 0.04, h * 0.018, 0, 0, TAU); g.ellipse(x + h * 0.07 + lx, y, h * 0.04, h * 0.018, 0, 0, TAU); g.fill();
        // Kediyu: fitted at the chest, flared frill below
        var fl = h * (0.2 + (dancing ? 0.04 * sw : 0));
        g.fillStyle = main; g.beginPath();
        g.moveTo(x - h * 0.08, y - h * 0.8); g.lineTo(x + h * 0.08, y - h * 0.8); g.lineTo(x + h * 0.085, y - h * 0.62);
        g.quadraticCurveTo(x + fl * 0.8, y - h * 0.52, x + fl, y - h * 0.42); g.quadraticCurveTo(x, y - h * 0.38, x - fl, y - h * 0.42);
        g.quadraticCurveTo(x - fl * 0.8, y - h * 0.52, x - h * 0.085, y - h * 0.62); g.closePath(); g.fill();
        if (fine) { g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.02); g.beginPath(); g.moveTo(x - fl, y - h * 0.425); g.quadraticCurveTo(x, y - h * 0.385, x + fl, y - h * 0.425); g.stroke(); g.beginPath(); g.moveTo(x, y - h * 0.8); g.lineTo(x, y - h * 0.63); g.stroke(); }
      } else {
        // Chaniya with a bordered hem, then the choli and a strip of waist
        var flare = h * (0.25 + (dancing ? 0.045 * sw : walking ? 0.01 * sw : 0)), hem = y - h * 0.01;
        g.fillStyle = main; g.beginPath(); g.moveTo(x - h * 0.075, y - h * 0.55); g.lineTo(x + h * 0.075, y - h * 0.55);
        g.quadraticCurveTo(x + flare * 0.75, y - h * 0.22, x + flare, hem); g.quadraticCurveTo(x, hem + h * 0.05, x - flare, hem); g.quadraticCurveTo(x - flare * 0.75, y - h * 0.22, x - h * 0.075, y - h * 0.55); g.fill();
        g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.035); g.beginPath(); g.moveTo(x - flare * 0.97, hem - h * 0.015); g.quadraticCurveTo(x, hem + h * 0.035, x + flare * 0.97, hem - h * 0.015); g.stroke();
        if (fine) {
          g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1;
          for (var pl = -2; pl <= 2; pl++) { g.beginPath(); g.moveTo(x + pl * h * 0.02, y - h * 0.5); g.lineTo(x + pl * flare * 0.33, hem); g.stroke(); }
          g.fillStyle = 'rgba(255,248,225,.8)'; for (var m = 0; m < 6; m++) { var mu = (m + 0.5) / 6 * 2 - 1; g.beginPath(); g.arc(x + mu * flare * 0.82, hem - h * 0.07 + Math.abs(mu) * h * 0.02, Math.max(0.7, h * 0.011), 0, TAU); g.fill(); }
        }
        g.fillStyle = skin; g.fillRect(x - h * 0.06, y - h * 0.6, h * 0.12, h * 0.06);
        g.fillStyle = top; g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.79); g.lineTo(x + h * 0.08, y - h * 0.79); g.lineTo(x + h * 0.07, y - h * 0.6); g.lineTo(x - h * 0.07, y - h * 0.6); g.closePath(); g.fill();
        // Odhni over one shoulder, falling behind
        g.strokeStyle = tint(isYou ? '#d6b06f' : d.odhni || d.top, dk); g.globalAlpha *= 0.85; g.lineWidth = Math.max(1, h * 0.04);
        g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.78); g.quadraticCurveTo(x + h * 0.02, y - h * 0.62, x + h * 0.09, y - h * 0.56); g.quadraticCurveTo(x + h * (0.16 + 0.04 * sw), y - h * 0.48, x + h * (0.18 + 0.05 * sw), y - h * 0.3); g.stroke();
        g.globalAlpha /= 0.85;
      }
      // Neck and head
      g.fillStyle = skin; g.fillRect(x - h * 0.022, y - h * 0.83, h * 0.044, h * 0.05);
      g.beginPath(); g.arc(x, y - h * 0.885, h * 0.068, 0, TAU); g.fill();
      if (d.man) {
        g.fillStyle = tint(isYou ? '#d6b06f' : d.pagdi || '#b8312b', dk);
        g.beginPath(); g.ellipse(x, y - h * 0.935, h * 0.078, h * 0.052, 0, Math.PI, 0); g.lineTo(x + h * 0.078, y - h * 0.925); g.lineTo(x - h * 0.078, y - h * 0.925); g.fill();
        if (fine) { g.beginPath(); g.moveTo(x + h * 0.06, y - h * 0.94); g.quadraticCurveTo(x + h * 0.13, y - h * 0.9, x + h * 0.1, y - h * 0.84); g.lineWidth = Math.max(1, h * 0.02); g.strokeStyle = g.fillStyle; g.stroke(); }
      } else {
        g.fillStyle = tint('#1f130d', dk); g.beginPath(); g.ellipse(x, y - h * 0.905, h * 0.074, h * 0.05, 0, Math.PI, 0); g.fill();
        g.beginPath(); g.arc(x, y - h * 0.965, h * 0.034, 0, TAU); g.fill();
        if (fine) { g.fillStyle = '#c0392b'; g.beginPath(); g.arc(x, y - h * 0.9, Math.max(0.6, h * 0.008), 0, TAU); g.fill(); g.fillStyle = gold; g.beginPath(); g.arc(x - h * 0.066, y - h * 0.87, Math.max(0.6, h * 0.01), 0, TAU); g.arc(x + h * 0.066, y - h * 0.87, Math.max(0.6, h * 0.01), 0, TAU); g.fill(); }
      }
      // Arms: shoulder, elbow, hand
      var shy = y - h * 0.76, L = [x - h * 0.08, shy], R = [x + h * 0.08, shy], le, lh, re, rh;
      if (d.role === 'singer') { le = [x - h * 0.13, shy + h * 0.12]; lh = [x - h * 0.03, shy - h * 0.09]; re = [x + h * 0.16, shy + h * 0.02 - sw * h * 0.04]; rh = [x + h * 0.24, shy - h * 0.1 - sw * h * 0.08]; }
      else if (d.role === 'dhol') { var hit = Math.max(0, sw); le = [x - h * 0.16, shy + h * 0.1]; lh = [x - h * 0.22, shy + h * (0.2 - 0.06 * hit)]; re = [x + h * 0.16, shy + h * 0.1]; rh = [x + h * 0.22, shy + h * (0.2 - 0.06 * Math.max(0, -sw))]; }
      else if (d.role === 'keys') { le = [x - h * 0.14, shy + h * 0.14]; lh = [x - h * 0.1 + sw * h * 0.02, shy + h * 0.26]; re = [x + h * 0.14, shy + h * 0.14]; rh = [x + h * 0.1 - sw * h * 0.02, shy + h * 0.26]; }
      else if (up) { le = [x - h * 0.13, shy - h * 0.12]; lh = [x - h * 0.012, shy - h * 0.27]; re = [x + h * 0.13, shy - h * 0.12]; rh = [x + h * 0.012, shy - h * 0.27]; }
      else if (dancing) { le = [x - h * 0.18, shy + h * (0.02 - 0.06 * sw)]; lh = [x - h * 0.22, shy - h * (0.1 + 0.14 * sw)]; re = [x + h * 0.18, shy + h * (0.02 + 0.06 * sw)]; rh = [x + h * 0.22, shy - h * (0.1 - 0.14 * sw)]; }
      else { var a1 = walking ? sw * 0.05 : 0; le = [x - h * 0.11, shy + h * 0.15]; lh = [x - h * (0.12 + a1), shy + h * 0.3]; re = [x + h * 0.11, shy + h * 0.15]; rh = [x + h * (0.12 - a1), shy + h * 0.3]; }
      g.strokeStyle = skin; g.lineWidth = lw;
      g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(le[0], le[1]); g.lineTo(lh[0], lh[1]); g.moveTo(R[0], R[1]); g.lineTo(re[0], re[1]); g.lineTo(rh[0], rh[1]); g.stroke();
      if (fine && !d.man) { g.strokeStyle = gold; g.lineWidth = Math.max(1, h * 0.02); g.beginPath(); g.moveTo(lh[0], lh[1]); g.lineTo(lerp(le[0], lh[0], 0.8), lerp(le[1], lh[1], 0.8)); g.moveTo(rh[0], rh[1]); g.lineTo(lerp(re[0], rh[0], 0.8), lerp(re[1], rh[1], 0.8)); g.stroke(); }
      if (d.role === 'singer') { g.strokeStyle = tint('#222222', dk); g.lineWidth = Math.max(1, h * 0.025); g.beginPath(); g.moveTo(lh[0], lh[1]); g.lineTo(lh[0] + h * 0.02, lh[1] + h * 0.08); g.stroke(); }
      if (st.style === 'dandiya' && !d.walker && !d.role) {
        // On the beat the two sticks cross and strike; between beats they are held out, swinging with the step
        var len = h * 0.3, la, ra;
        if (up) { la = -Math.PI / 2 + 0.55; ra = -Math.PI / 2 - 0.55; }
        else { la = -Math.PI / 2 - 0.35 - 0.25 * sw; ra = -Math.PI / 2 + 0.35 - 0.25 * sw; }
        dandiya(lh[0], lh[1], la, len, d.stick || 0, dk, fine);
        dandiya(rh[0], rh[1], ra, len, d.stick || 0, dk, fine);
        if (up && d.flash > 0.4) glow(x, lh[1] - len * 0.62, Math.max(1, h * 0.03), '#fff3c4', d.flash);
      }
      if (d.flash > 0.05) glow(x, shy - h * 0.27, Math.max(1, h * 0.03 * (1 + d.flash)), '#fff0d0', d.flash);
      g.globalAlpha = 1;
      if (isYou) {
        g.fillStyle = 'rgba(214,176,111,' + (0.25 + youGlow * 0.5) + ')'; g.beginPath(); g.ellipse(x, p.y, h * (0.32 + youGlow * 0.12), h * 0.09, 0, 0, TAU); g.fill();
        label('You', Math.max(28, Math.min(W - 28, x)), Math.max(26, y - h * 1.14), h);
      }
    }
    function label(text, x, y, h) {
      var fs = Math.max(11, Math.min(14, h * 0.2));
      g.font = '700 ' + fs + 'px system-ui, -apple-system, sans-serif'; g.textAlign = 'center';
      var w = g.measureText(text).width + 12;
      g.fillStyle = 'rgba(11,6,5,.72)'; roundRect(x - w / 2, y - fs - 4, w, fs + 8, (fs + 8) / 2); g.fill();
      g.fillStyle = '#f3e6d0'; g.fillText(text, x, y + 0.5);
    }
    function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    /* ---------- where you sit when watching from far away ---------- */
    function seat(k) {
      if (k < 0.02) return;
      g.save(); g.translate(BX, BY); g.globalAlpha = Math.min(1, k * 1.4);
      var W = BW, H = BH, yb = H, u = W / 380, v = st.venue, x0 = W * 0.5;
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
        for (var c = 0; c < 6; c++) { var cx = W * (0.1 + c * 0.16); g.fillStyle = ['#b73a2e', '#2f6fa8', '#d9d2c5'][c % 3]; roundRect(cx - 17 * u, yb - H * 0.11, 34 * u, 7 * u, 3 * u); g.fill(); g.fillRect(cx - 15 * u, yb - H * 0.11 - 26 * u, 30 * u, 5 * u); g.fillRect(cx - 14 * u, yb - H * 0.11, 3 * u, H * 0.06); g.fillRect(cx + 11 * u, yb - H * 0.11, 3 * u, H * 0.06); }
        [0, 1, 4, 5].forEach(function (c) { spectator(W * (0.1 + c * 0.16), yb - H * 0.11, u, c); });
        seated(W * (0.1 + 2 * 0.16) + 8 * u, yb - H * 0.11, u);
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
      g.fillStyle = 'rgba(214,176,111,' + (0.22 + youGlow * 0.5) + ')'; g.beginPath(); g.ellipse(x, y - 18 * u, 24 * u * (1 + youGlow * 0.2), 30 * u * (1 + youGlow * 0.2), 0, 0, TAU); g.fill();
      g.fillStyle = '#f3e6d0';
      g.beginPath(); g.moveTo(x - 11 * u, y); g.quadraticCurveTo(x - 12 * u, y - 24 * u, x, y - 26 * u); g.quadraticCurveTo(x + 12 * u, y - 24 * u, x + 11 * u, y); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, y - 33 * u, 7.5 * u, 0, TAU); g.fill();
      label('You', x, y - 46 * u, 60 * u);
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
      var d0 = L.circles[0].dancers[0];
      if (d0.x != null) return { x: d0.x, z: d0.z };
      var c = L.circles[0], w = dancerWorld(c, d0, T, circleCentre(c, T));
      return { x: w.x, z: w.z };
    }
    // When the music stops the dancers drift off to rest: to the sides, the stalls and the water, or to sit on an
    // otla. When it starts they walk back, one by one, and the circles form again.
    function restSpot(id, L, d) {
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
      else if (dist > 0.2) { var step = Math.min(dist, d.speed * dt * (goHome && dist < 2 ? 0.6 + dist * 0.2 : 1)); d.x += dx / dist * step; d.z += dz / dist * step; d.step = (d.step || 0) + step * 5.5; }
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
        c.dancers.forEach(function (d, di) { if (d.atHome && ((ci === 0 && di === 0 && !far) || rnd() < share)) d.clapAt = t0 + d.lag; });
        if ((c.present || 0) < 0.15) return;
        waves.push({ kind: 'front', c: c, t0: t0, a: (c.main ? 0.6 : 0.42) * (far ? 1.1 : 1) * Math.min(1, (c.present || 0) * 1.2), col: col, lim: Math.max(10, dd + 3) });
      });
      arrivals.push({ t: bt, g: 1 });
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
    var T = 0, lampAt = { x: 0.5, y: 0.6, r: 0.08 };
    function frame(ms) {
      if (!running) return;
      var dt = Math.min(0.05, lastMs ? (ms - lastMs) / 1000 : 0.016); lastMs = ms;
      var t = clock();
      if (!reduce) T += dt;
      TH = THEMES[st.theme] || THEMES.traditional;
      var bb = opts.beats && opts.beats(); BEAT = bb ? ((t - bb.anchor) / bb.period) % 2 : T * 1.8;
      var target = st.listener === 'far' ? 1 : 0;
      view.k += (target - view.k) * Math.min(1, dt * (reduce ? 60 : 2.6));
      var ce = CAMS[st.venue] || CAMS.outdoors, e = ease(Math.max(0, Math.min(1, view.k)));
      HOR = BY + BH * lerp(0.3, 0.4, e);
      cam.x = lerp(ce.circle[0], ce.far[0], e); cam.y = lerp(ce.circle[1], ce.far[1], e); cam.z = lerp(ce.circle[2], ce.far[2], e);
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
        if (c.main) { progressRing(ctr, c.R + 0.7, t); var lp = P(ctr.x, 0, ctr.z); if (lp) items.push({ z: lp.z, kind: 'lamp', p: lp, main: true }); }
        var home = 0;
        c.dancers.forEach(function (d, di) {
          if (d.clapAt && t >= d.clapAt) { d.flash = 1; d.clapAt = 0; }
          d.flash *= Math.exp(-dt * 7);
          var slot = dancerWorld(c, d, T, ctr), w = travel(d, slot, dt);
          if (d.atHome) home++;
          var p = P(w.x, d.sitting ? (d.rest.y || 0) : 0, w.z);
          var fd = p ? Math.max(0, Math.min(1, (p.z - 3) / 4)) : 0;
          if (p && p.z > 2.2 && p.x > -60 && p.x < W + 60) items.push({ z: p.z, kind: 'dancer', p: p, d: d, fade: fd, you: ci === 0 && di === 0 && st.listener === 'circle' && view.k < 0.5 });
        });
        c.present = home / c.dancers.length;
      });
      if (!reduce) moveWalkers(L, st.venue, dt);
      L.walkers.forEach(function (w, wi) { if (wi / L.walkers.length > st.density) return; var p = P(w.x, 0, w.z), fd = p ? Math.max(0, Math.min(1, (p.z - 4) / 3)) : 0; if (p && fd > 0 && p.x > -40 && p.x < W + 40) items.push({ z: p.z, kind: 'dancer', p: p, d: w, fade: fd }); });
      L.stalls.forEach(function (sl) { var p = P(sl.x, 0, sl.z); if (p) items.push({ z: p.z + 1.5, kind: 'stall', sl: sl, p: p }); });
      items.sort(function (a, b2) { return b2.z - a.z; });
      var lit = st.lit != null ? st.lit : st.on ? 1 : 0.35;
      items.forEach(function (it) {
        if (it.kind === 'lamp') { var lp2 = it.main && opts.lampScale ? { x: it.p.x, y: it.p.y, s: it.p.s * opts.lampScale, z: it.p.z } : it.p; garbo(lp2, it.main ? lit : lit * 0.8, t, it.main); it.p = lp2; if (it.main) lampAt = { x: it.p.x / W, y: (it.p.y - it.p.s * 0.9) / H, r: it.p.s * 0.9 / W }; }
        else if (it.kind === 'stall') stall(it.sl, t);
        else figure(it.p, it.d, T, it.you, beatPh, it.you ? 1 : it.fade);
      });

      if (st.venue === 'outdoors') outdoorsOver(t); else if (st.venue === 'stadium') stadiumOver(t); else sheriOver(t);

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

      seat(view.k);

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
    function set(patch) {
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
