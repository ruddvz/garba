/* Garba venue scene: several circles dancing around their garbos in a drawn venue, with clap waves that
   leave the dancers and reach the listener on the beat they hear. Pure canvas drawing on a ground plane seen
   through a level camera; the page owns the audio and feeds this renderer its clock and beat. */
(function () {
  'use strict';

  var TAU = Math.PI * 2, NEAR = 0.6;
  var SKIRTS = ['#c0392b', '#d6246e', '#e8a33d', '#2f8f5b', '#3b4cc0', '#8e44ad', '#e67e22', '#16a085', '#b83227'];
  var TOPS = ['#f0c24b', '#2f8f5b', '#c2185b', '#3b4cc0', '#e67e22', '#8e44ad'];
  var BULBS = ['#ffd58a', '#ffb070', '#ffe9b8', '#9fe7b8', '#ff8fb3', '#8fc7ff'];

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
    var st = { venue: 'outdoors', listener: 'circle', style: 'claps', mode: 'immersive', on: false, level: 0.6, lit: null, progress: 0, chapters: null, chapterIndex: -1, live: false };
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
    function makeCircle(x, z, R, main) {
      var n = Math.max(8, Math.min(30, Math.round(TAU * R / 1.3))), c = { x0: x, z0: z, R: R, main: main, dancers: [], ph: [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU], w: (0.95 + rnd() * 0.35) / R, spin: main ? 0 : rnd() * TAU };
      for (var i = 0; i < n; i++) {
        var man = rnd() < 0.36;
        c.dancers.push({ a0: -Math.PI / 2 + i / n * TAU, man: man, col: SKIRTS[Math.floor(rnd() * SKIRTS.length)], top: TOPS[Math.floor(rnd() * TOPS.length)], ph: rnd() * TAU, ph2: rnd() * TAU, lag: rnd() * 0.02, h: 1.55 + rnd() * 0.2 + (man ? 0.1 : 0), flash: 0, clapAt: 0 });
      }
      return c;
    }
    function layout(id) {
      if (layouts[id]) return layouts[id];
      var circles = [makeCircle(0, 0, id === 'sheri' ? 4.4 : 5.6, true)];
      if (id === 'sheri') circles.push(makeCircle(lerp(-0.8, 0.8, rnd()), 17 + rnd() * 3, 3.4 + rnd() * 0.5, false));
      else {
        var want = id === 'outdoors' ? 4 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 3), box = id === 'outdoors' ? [-27, 27, -5, 38] : [-19, 19, -4, 31], tries = 0;
        while (circles.length < want + 1 && tries++ < 400) {
          var R = 2.6 + rnd() * (id === 'outdoors' ? 4.2 : 3.4), x = lerp(box[0] + R, box[1] - R, rnd()), z = lerp(box[2] + R, box[3] - R, rnd());
          if (z - R < -9) continue;
          var ok = circles.every(function (c) { return Math.hypot(c.x0 - x, c.z0 - z) > c.R + R + 2.6; });
          if (ok) circles.push(makeCircle(x, z, R, false));
        }
      }
      var L = { circles: circles, houses: id === 'sheri' ? houses() : null, stands: id === 'stadium' ? stands() : null };
      layouts[id] = L; return L;
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

    /* ---------- the fixed sky, cached ---------- */
    function sky(id) {
      var key = id + W + 'x' + H + '@' + Math.round(HOR / 3) + ':' + BX + ',' + BY; if (statics[key]) return statics[key];
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
        b.fillStyle = 'rgba(255,240,215,.85)'; b.beginPath(); b.arc(BX + BW * 0.84, BY + (HOR - BY) * 0.28, BW * 0.022, 0, TAU); b.fill();
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
      // Stage at the far end with an LED backdrop, the band and colour washes
      var hue = (t * 12) % 360;
      fillPoly([[-11, 0, 46], [11, 0, 46], [11, 1.6, 46], [-11, 1.6, 46]], '#1a100b');
      if (poly([[-10, 1.6, 47], [10, 1.6, 47], [10, 8.5, 47], [-10, 8.5, 47]])) {
        var a = P(-10, 5, 47), b2 = P(10, 5, 47), lg = g.createLinearGradient(a.x, 0, b2.x, 0);
        for (var i = 0; i <= 4; i++) lg.addColorStop(i / 4, 'hsla(' + ((hue + i * 40) % 360) + ',70%,' + (22 + 10 * bright) + '%,1)');
        g.fillStyle = lg; g.fill();
      }
      for (var q = 0; q < 26; q++) { var u = q / 25, p = P(lerp(-10, 10, u), 8.5 + Math.sin(u * Math.PI) * 1.2, 47); if (p) glow(p.x, p.y, Math.max(0.8, p.s * 0.1), BULBS[q % 3], 0.8 * bright); }
      for (var m = 0; m < 5; m++) { var pm = P(-6 + m * 3, 1.6, 45.6); if (pm) { g.fillStyle = '#0a0606'; g.beginPath(); g.ellipse(pm.x, pm.y - pm.s * 0.9, pm.s * 0.28, pm.s * 0.9, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(pm.x, pm.y - pm.s * 1.95, pm.s * 0.18, 0, TAU); g.fill(); } }
      [-14, 14].forEach(function (x) {
        fillPoly([[x - 1, 0, 45], [x + 1, 0, 45], [x + 1, 5.2, 45], [x - 1, 5.2, 45]], '#090707');
        for (var k = 0; k < 3; k++) { var c = P(x, 0.9 + k * 1.7, 44.9); if (c) { g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.beginPath(); g.arc(c.x, c.y, c.s * 0.6, 0, TAU); g.stroke(); } }
      });
      // Light towers with floodlights
      [-31, 31].forEach(function (x, i) {
        var base = P(x, 0, 16), top = P(x, 15, 16); if (!base || !top) return;
        g.strokeStyle = '#1c1511'; g.lineWidth = Math.max(1, base.s * 0.3); g.beginPath(); g.moveTo(base.x, base.y); g.lineTo(top.x, top.y); g.stroke();
        for (var k = 0; k < 4; k++) glow(top.x + (k - 1.5) * top.s * 0.7, top.y, Math.max(1.2, top.s * 0.28), '#fff4dc', bright);
      });
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
        if (kind === 'flags') { var fs = Math.min(9, pp.s * 0.35); g.fillStyle = ['#f08a24', '#2f8f5b', '#c2185b', '#ffc861', '#3b4cc0'][(j + seed) % 5]; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(pp.x - fs, pp.y); g.lineTo(pp.x + fs, pp.y); g.lineTo(pp.x, pp.y + fs * 1.6); g.closePath(); g.fill(); g.globalAlpha = 1; }
        else { var tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(t * 2.6 + j * 1.7 + seed); glow(pp.x, pp.y + 1, Math.min(3.2, Math.max(0.9, pp.s * 0.09)), BULBS[(j + seed) % BULBS.length], (tw + pulse * 0.25) * bright); }
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
      var hue = (t * 30) % 360;
      [[[-28, 0.2, 41.9], [28, 0.2, 41.9]], [[-24.9, 0.2, -34], [-24.9, 0.2, 41.9]], [[24.9, 0.2, -34], [24.9, 0.2, 41.9]]].forEach(function (seg, si) {
        var a0 = seg[0], b0 = seg[1];
        if (poly([[a0[0], 0.2, a0[2]], [b0[0], 0.2, b0[2]], [b0[0], 1.2, b0[2]], [a0[0], 1.2, a0[2]]])) {
          var pa = P(a0[0], 0.7, Math.max(a0[2], cam.z + 1)), pb = P(b0[0], 0.7, b0[2]);
          if (pa && pb) { var lg = g.createLinearGradient(pa.x, pa.y, pb.x, pb.y); for (var k = 0; k <= 5; k++) lg.addColorStop(k / 5, 'hsl(' + ((hue + k * 60 + si * 90) % 360) + ',80%,' + (30 + 12 * bright) + '%)'); g.fillStyle = lg; g.fill(); }
        }
      });
      // Crowd in the stands, with phone lights here and there
      var cols = ['#c9a37a', '#b76b5a', '#8f7aa8', '#d4b58c', '#6c8fa3', '#caa0b8'];
      for (i = 0; i < L.stands.length; i++) {
        var pp = L.stands[i], p;
        if (pp.side === 0) p = P(pp.u, 1.3 + pp.row * 0.95 + 0.35, 42 + pp.row * 1.5 + 0.4);
        else p = P(pp.side * (25 + pp.row * 1.5 + 0.4), 1.3 + pp.row * 0.95 + 0.35, pp.u);
        if (!p || p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H) continue;
        var sz = Math.max(1, p.s * 0.34);
        if (pp.p >= 0 && st.on && Math.sin(t * 1.7 + pp.p) > 0.55) glow(p.x, p.y - sz, Math.max(0.8, sz * 0.4), '#f4f7ff', 0.9);
        else { g.fillStyle = cols[pp.c]; g.globalAlpha = 0.75; g.fillRect(p.x - sz / 2, p.y - sz, sz, sz); g.globalAlpha = 1; }
      }
      // Stage at the far end
      fillPoly([[-8, 0, 36], [8, 0, 36], [8, 1.4, 36], [-8, 1.4, 36]], '#1b120c');
      if (poly([[-7, 1.4, 38], [7, 1.4, 38], [7, 6.5, 38], [-7, 6.5, 38]])) { g.fillStyle = 'hsl(' + ((hue + 200) % 360) + ',55%,' + (16 + 8 * bright) + '%)'; g.fill(); }
      for (var m = 0; m < 4; m++) { var pm = P(-4.5 + m * 3, 1.4, 36.6); if (pm) { g.fillStyle = '#0b0707'; g.beginPath(); g.ellipse(pm.x, pm.y - pm.s * 0.85, pm.s * 0.26, pm.s * 0.85, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(pm.x, pm.y - pm.s * 1.85, pm.s * 0.17, 0, TAU); g.fill(); } }
    }
    function stadiumOver(t) {
      // Bunting across the hall, then hanging lanterns, then moving spotlights
      [2, 18, 32].forEach(function (z, i) { drawStrand([-24, 11, z], [24, 11, z], 1.6, 'flags', t, i); });
      var lc = ['#ff9f5a', '#ff6fa3', '#7fe0a0', '#ffd58a'], n = 0;
      [34, 22, 10, -2].forEach(function (z) { [-15, -5, 5, 15].forEach(function (x) { lantern(x, 9.5 + (n % 2) * 0.8, z, lc[n % 4], t, n); n++; }); });
      g.save(); g.globalCompositeOperation = 'lighter';
      var heads = [[-18, 0], [-6, 0], [6, 0], [18, 0], [-12, 22], [12, 22]], bc = ['255,236,200', '255,120,190', '255,190,90', '120,220,255', '255,236,200', '190,140,255'];
      heads.forEach(function (h, i) {
        var hp = P(h[0], 20, h[1]); if (!hp) return;
        var tt = reduce ? 0 : t, tx = h[0] * 0.4 + Math.sin(tt * 0.35 + i * 1.9) * 9, tz = h[1] + Math.cos(tt * 0.27 + i) * 9;
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
      // Lane paving
      g.strokeStyle = 'rgba(255,220,170,.05)'; g.lineWidth = 1;
      for (var z = -30; z < 72; z += 2.2) { var a = P(-8, 0, z), b = P(8, 0, z); if (a && b) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
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
      if (h.bulbs) for (var q = h.z1 + 0.3; q < h.z2; q += 0.7) { var bp = P(X, h.h - 0.1, q); if (bp) glow(bp.x, bp.y, Math.max(0.6, bp.s * 0.06), BULBS[h.hue], (0.75 + pulse * 0.25) * bright); }
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
      var d = reduce ? 0 : 1;
      return { x: c.x0 + d * 0.7 * Math.sin(T * 0.09 + c.ph[0]), z: c.z0 + d * 0.6 * Math.sin(T * 0.07 + c.ph[1]) };
    }
    function dancerWorld(c, d, T, ctr) {
      var a = d.a0 + c.spin + (reduce ? 0 : 0.06 * Math.sin(T * 0.5 + d.ph2));
      var rr = c.R * (1 + 0.07 * Math.sin(2 * a + c.ph[2] + T * 0.15) + 0.045 * Math.sin(3 * a + c.ph[3] - T * 0.11)) + (reduce ? 0 : 0.22 * Math.sin(T * 0.8 + d.ph));
      return { x: ctr.x + Math.cos(a) * rr, z: ctr.z + Math.sin(a) * rr, a: a };
    }
    function figure(p, d, T, isYou, beatPh) {
      var s = p.s, x = p.x, y = p.y, h = d.h * s, up = d.flash > 0.25, moving = st.on && !reduce;
      var bob = moving ? Math.abs(Math.sin(beatPh * Math.PI + d.ph)) * 0.05 * s : 0, sw = moving ? Math.sin(beatPh * Math.PI + d.ph) : 0;
      y -= bob;
      var far = Math.min(1, p.z / 70);
      g.globalAlpha = 1 - far * 0.45;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, p.y, h * 0.2, h * 0.05, 0, 0, TAU); g.fill();
      var skirt = isYou ? '#f3e6d0' : d.col, top = isYou ? '#d6b06f' : d.top;
      if (d.man) {
        g.strokeStyle = '#efe6d6'; g.lineWidth = Math.max(1, h * 0.06);
        g.beginPath(); g.moveTo(x - h * 0.05, y - h * 0.42); g.lineTo(x - h * 0.08 - sw * h * 0.04, y); g.moveTo(x + h * 0.05, y - h * 0.42); g.lineTo(x + h * 0.08 + sw * h * 0.04, y); g.stroke();
        g.fillStyle = skirt; g.beginPath(); g.moveTo(x - h * 0.09, y - h * 0.8); g.lineTo(x + h * 0.09, y - h * 0.8); g.lineTo(x + h * (0.2 + 0.03 * sw), y - h * 0.42); g.lineTo(x - h * (0.2 - 0.03 * sw), y - h * 0.42); g.closePath(); g.fill();
      } else {
        var flare = h * (0.24 + (moving ? 0.04 * sw : 0));
        g.fillStyle = skirt; g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.52); g.lineTo(x + h * 0.08, y - h * 0.52); g.quadraticCurveTo(x + flare * 0.8, y - h * 0.2, x + flare, y); g.quadraticCurveTo(x, y + h * 0.04, x - flare, y); g.quadraticCurveTo(x - flare * 0.8, y - h * 0.2, x - h * 0.08, y - h * 0.52); g.fill();
        if (s > 12) { g.fillStyle = 'rgba(255,240,200,.55)'; for (var m = 0; m < 4; m++) g.fillRect(x - flare * 0.7 + m * flare * 0.45, y - h * 0.12 + (m % 2) * h * 0.05, Math.max(1, h * 0.02), Math.max(1, h * 0.02)); }
        g.fillStyle = top; g.fillRect(x - h * 0.075, y - h * 0.78, h * 0.15, h * 0.27);
        g.strokeStyle = isYou ? 'rgba(214,176,111,.9)' : 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(0.8, h * 0.03); g.beginPath(); g.moveTo(x - h * 0.08, y - h * 0.76); g.quadraticCurveTo(x + h * 0.1, y - h * 0.6, x + h * 0.14, y - h * 0.4); g.stroke();
      }
      g.fillStyle = '#d9b48c'; g.beginPath(); g.arc(x, y - h * 0.87, h * 0.075, 0, TAU); g.fill();
      if (d.man) { g.fillStyle = isYou ? '#d6b06f' : '#b8312b'; g.beginPath(); g.ellipse(x, y - h * 0.925, h * 0.085, h * 0.05, 0, Math.PI, 0); g.fill(); }
      else { g.fillStyle = '#1f130d'; g.beginPath(); g.ellipse(x, y - h * 0.9, h * 0.08, h * 0.05, 0, Math.PI, 0); g.fill(); g.beginPath(); g.arc(x, y - h * 0.955, h * 0.035, 0, TAU); g.fill(); }
      // Arms: raised to clap on the beat, swinging out between claps
      g.strokeStyle = '#d9b48c'; g.lineWidth = Math.max(0.8, h * 0.035); g.lineCap = 'round'; g.beginPath();
      var sy = y - h * 0.74;
      if (up) { g.moveTo(x - h * 0.07, sy); g.lineTo(x - h * 0.02, sy - h * 0.2); g.moveTo(x + h * 0.07, sy); g.lineTo(x + h * 0.02, sy - h * 0.2); }
      else { g.moveTo(x - h * 0.07, sy); g.lineTo(x - h * (0.2 + 0.05 * sw), sy + h * (0.12 - 0.1 * sw)); g.moveTo(x + h * 0.07, sy); g.lineTo(x + h * (0.2 - 0.05 * sw), sy + h * (0.12 + 0.1 * sw)); }
      g.stroke();
      if (st.style === 'dandiya') { g.strokeStyle = '#e8a33d'; g.lineWidth = Math.max(0.8, h * 0.025); g.beginPath(); var hx = up ? x - h * 0.02 : x - h * 0.2, hy = up ? sy - h * 0.2 : sy + h * 0.1; g.moveTo(hx, hy); g.lineTo(hx - h * 0.06, hy - h * 0.16); g.stroke(); }
      if (d.flash > 0.05) glow(x, sy - h * 0.23, Math.max(1, h * 0.03 * (1 + d.flash)), '#fff0d0', d.flash);
      g.globalAlpha = 1;
      if (isYou) {
        g.fillStyle = 'rgba(214,176,111,' + (0.25 + youGlow * 0.5) + ')'; g.beginPath(); g.ellipse(x, p.y, h * (0.32 + youGlow * 0.12), h * 0.09, 0, 0, TAU); g.fill();
        label('You', Math.max(28, Math.min(W - 28, x)), Math.max(26, y - h * 1.12), h);
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
      var c = L.circles[0], ctr = circleCentre(c, T), w = dancerWorld(c, c.dancers[0], T, ctr);
      return { x: w.x, z: w.z };
    }
    function spawnBeat(bt, T) {
      var L = layout(st.venue), you = listenerPos(L, T), far = st.listener === 'far';
      var col = st.style === 'dandiya' ? '232,163,61' : '243,230,208', firstT0 = bt;
      L.circles.forEach(function (c, ci) {
        var ctr = circleCentre(c, T), dd = Math.max(0, Math.hypot(you.x - ctr.x, you.z - ctr.z) - c.R), t0 = bt - dd / V;
        firstT0 = Math.min(firstT0, t0);
        var share = 0.5 + 0.45 * st.level;
        c.dancers.forEach(function (d, di) { if ((ci === 0 && di === 0 && !far) || rnd() < share) d.clapAt = t0 + d.lag; });
        waves.push({ kind: 'front', c: c, t0: t0, a: (c.main ? 0.6 : 0.42) * (far ? 1.1 : 1), col: col, lim: Math.max(10, dd + 3) });
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
        var ctr = circleCentre(c, T);
        g.strokeStyle = 'rgba(243,230,208,' + (c.main ? 0.12 : 0.07) + ')'; g.lineWidth = 1; groundRing(ctr.x, ctr.z, c.R + 0.7, 0, TAU); g.stroke();
        if (c.main) progressRing(ctr, c.R + 0.7, t);
        var lp = P(ctr.x, 0, ctr.z); if (lp) items.push({ z: lp.z, kind: 'lamp', p: lp, main: c.main });
        c.dancers.forEach(function (d, di) {
          if (d.clapAt && t >= d.clapAt) { d.flash = 1; d.clapAt = 0; }
          d.flash *= Math.exp(-dt * 7);
          var w = dancerWorld(c, d, T, ctr), p = P(w.x, 0, w.z);
          if (p && p.x > -60 && p.x < W + 60) items.push({ z: p.z, kind: 'dancer', p: p, d: d, you: ci === 0 && di === 0 && st.listener === 'circle' && view.k < 0.5 });
        });
      });
      items.sort(function (a, b2) { return b2.z - a.z; });
      var lit = st.lit != null ? st.lit : st.on ? 1 : 0.35;
      items.forEach(function (it) {
        if (it.kind === 'lamp') { var lp2 = it.main && opts.lampScale ? { x: it.p.x, y: it.p.y, s: it.p.s * opts.lampScale, z: it.p.z } : it.p; garbo(lp2, it.main ? lit : lit * 0.8, t, it.main); it.p = lp2; if (it.main) lampAt = { x: it.p.x / W, y: (it.p.y - it.p.s * 0.9) / H, r: it.p.s * 0.9 / W }; }
        else figure(it.p, it.d, T, it.you, beatPh);
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

  window.GarbaVenueScene = { create: create };
})();
