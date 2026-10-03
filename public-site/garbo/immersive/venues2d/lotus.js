/* Lotus Amphitheatre, as the 2D scene needs it. A round floor of dark stone where a lotus glows in cyan and magenta
   light; round it, eight tiers of pale stone stepping up, broken only where the stage stands at the north and by the
   stairs of the aisles; jali screens round the top; the musicians on a raised stage. People sit on the tiers; from far
   off you sit on the fourth tier facing the stage. The 3D venue (venue3d/src/venues/lotus.js) is built to this plan. */
(function () {
  'use strict';
  var LO = { floor: 10, r0: 11.4, tread: 1.1, rise: 0.42, tiers: 8, stageFrom: 50, stageTo: 130, aisles: [-125, -55, 15, 165], aisleW: 1.2, entrance: -125 };
  LO.top = LO.r0 + LO.tiers * LO.tread; LO.jali = LO.top + 0.9;
  function deg(x, z) { return Math.atan2(z, x) * 180 / Math.PI; }
  function inStage(a) { return a > LO.stageFrom && a < LO.stageTo; }
  function inAisle(x, z) { var r = Math.hypot(x, z) || 1, a = deg(x, z); return LO.aisles.some(function (d) { var da = Math.abs(((a - d + 540) % 360) - 180) * Math.PI / 180; return da * r < LO.aisleW; }); }
  function at(a, r) { var t = a * Math.PI / 180; return [Math.cos(t) * r, Math.sin(t) * r]; }
  var NEAR = [-115, -65];

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).lotus = {
    label: 'Lotus Amphitheatre',
    // An open bowl of stone tiers: many short echoes off the steps all round, the sky open above
    sound: {
      desc: 'An open bowl of stone tiers under the night sky. Short echoes off the steps all round, nothing overhead.',
      trim: 1.25, dry: 0.94, wet: 0.5, clappers: 48, spread: 0.013, distance: [2, 8], far: [18, 40],
      tone: { lowShelf: [150, -1.5], mid: [2200, 0.9, 1.1], highShelf: [6000, -2] },
      ir: { length: 2.0, predelay: 0.005, taps: [[0.006, 0.34, 8000], [0.034, 0.26, 5600], [0.068, 0.2, 4200], [0.12, 0.12, 3000], [0.2, 0.06, 2200]], tail: { level: 0.06, rt: [1.1, 0.9, 0.5] } },
      room: { level: 0.15, cut: 1300 }, night: 0.8, roomTone: 0
    },
    plan: LO,
    cams: { circle: [0, 4.0, -9.6], far: [0, 2.83, -15.55], stage: [0, 3.0, 8.0] },
    frames: { far: { hor: 0.42, lens: 0.8 }, stage: { hor: 0.47, lens: 1.1 } },
    // The stage raised at the north, in the gap the tiers leave for it
    stage: { x0: -6.2, x1: 6.2, z: 11.8, h: 1.1, depth: 4.4, band: 'sheri', bandFront: 12.6, crowd: 4.4, fillX: 2.8 },
    dj: { x: 8.4, z: 11.0 },
    rings: [5.0, 8.4], pairs: 4, walkers: 18, couples: 2, kids: 8,
    garbo: 'bare',
    floorR: LO.floor,
    aerialCam: { r: 21, h: 30 },
    ground: function (x, z, r) { return Math.hypot(x, z) < LO.floor - 0.9 - r; },
    // You can walk all of it: the floor, up the tiers and their stairs to the top, and up onto the stage
    walk: function (x, z) { var r = Math.hypot(x, z); return inStage(deg(x, z)) ? z < 17.2 && Math.abs(x) < 10 : r < LO.top + 1.2; },
    bounds: [-9.4, 9.4, -9.4, 9.4], home: { x: 0, z: -9.0 },
    fill: { ring: 6.6, groups: [[-3.2, -8.2, 0.75], [3.1, -8.1, 0.7], [0.2, -8.8, 0.5, 2]] },
    follow: [5.4, 3.1], stageLine: [9.4, 4.5],
    drone: { lo: 8, hi: 10.5, k: 3, back: 12, dir: [0.2, 0.98] }, haze: 0.06, hazeFade: 0.7,
    echo: [[-14, 1.5, 'listener'], [14, 1.5, 'listener'], [0, 2.5, 18], [-16, 3, -10], [16, 3, -10]],
    aerial: { ground: '#4a4640', floor: '#14161e' },
    sky2d: { stops: [[0, '#03051a'], [0.6, '#0e1438'], [1, '#2a2440']], stars: 120, ground: ['#4a4640', '#1a1816'] },
    // How high the stone is under x, z: the tier you'd sit on (the stage's gap is level ground)
    heightAt: function (x, z) {
      var r = Math.hypot(x, z), a = deg(x, z), S = this.stage;
      if (Math.abs(x) < (S.x1 - S.x0) / 2 + 2 && z > S.z && z < S.z + S.depth + 1.2) return S.h;
      if (r < LO.r0 || inStage(a)) return 0;
      var k = Math.min(LO.tiers - 1, Math.floor((r - LO.r0) / LO.tread));
      return (k + 1) * LO.rise;
    },
    // The plan for the map: the floor, every tier's edge, the aisles, the jali round the top, the stage
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: LO.floor, s: 'edge' });
      for (var k = 0; k <= LO.tiers; k++) {
        var rr = LO.r0 + k * LO.tread, pts = [];
        for (var d = LO.stageTo; d <= LO.stageFrom + 360; d += 4) pts.push(at(d, rr));
        out.shapes.push({ k: 'line', pts: pts, s: k === LO.tiers ? 'wall' : 'step' });
      }
      var jp = []; for (var d2 = LO.stageTo; d2 <= LO.stageFrom + 360; d2 += 4) jp.push(at(d2, LO.jali)); out.shapes.push({ k: 'line', pts: jp, s: 'wall' });
      LO.aisles.forEach(function (d) { out.shapes.push({ k: 'line', pts: [at(d, LO.r0), at(d, LO.top)], s: 'stair' }); });
    },
    // People sitting out on the tiers round the floor, on cushions (the 3D venue puts one under each)
    seats: function (h) {
      var out = [];
      for (var k = 0; k < LO.tiers; k++) {
        var rr = LO.r0 + k * LO.tread + 0.75, y = (k + 1) * LO.rise, step = 0.72 / rr * 180 / Math.PI;
        for (var d = LO.stageTo + 4; d < LO.stageFrom + 356; d += step) {
          var dn = ((d + 180) % 360) - 180;
          if (dn > NEAR[0] - 8 && dn < NEAR[1] + 8) continue;
          var p = at(d, rr);
          if (inAisle(p[0], p[1]) || h.rnd() > (k > 5 ? 0.22 : 0.38)) continue;
          out.push({ kind: 'terrace', x: p[0], y: y, z: p[1], who: h.person({ sitting: true, older: k < 2 && h.rnd() < 0.4, rest: { y: 0.45 } }) });
        }
      }
      return out;
    },
    // From far off you sit on the fourth tier facing the stage, the two of you on the tier below, neighbours along the
    // tiers either side; each tier leaves its outline in short lengths, so it hides the lower half of whoever sits just
    // beyond it.
    far: function (h) {
      for (var k = 0; k <= 3; k++) {
        var a0 = LO.r0 + k * LO.tread, a1 = a0 + LO.tread, yk = (k + 1) * LO.rise, n = 12;
        for (var q = 0; q < n; q++) {
          var d0 = NEAR[0] + (NEAR[1] - NEAR[0]) * q / n, d1 = NEAR[0] + (NEAR[1] - NEAR[0]) * (q + 1) / n, sol = [];
          [[a0, d0], [a0, d1], [a1, d1], [a1, d0]].forEach(function (c) { var p = at(c[1], c[0]); sol.push(p[0], 0, p[1], p[0], yk, p[1]); });
          var mid = at((d0 + d1) / 2, a0);
          h.out.push({ x: mid[0], y: yk, z: mid[1], kind: 'riser', solid: sol, poly: true });
        }
        if (k === 3) continue;
        var as = a0 + 0.85, st = 0.66 / as * 180 / Math.PI;
        for (var d = NEAR[0] + 2; d < NEAR[1] - 2; d += st) {
          var sp = at(d + (h.rnd() - 0.5) * 0.3, as);
          if (k === 2 && Math.abs(sp[0]) < 0.75) continue;
          if (h.rnd() < (Math.abs(sp[0]) < 6 ? 0.8 : 0.6)) h.sitter(sp[0], yk, sp[1], 'bench', null);
        }
      }
      var cz = -(LO.r0 + 2 * LO.tread + 0.85);
      h.sitter(-0.31, 3 * LO.rise, cz, 'bench', 'w'); h.sitter(0.31, 3 * LO.rise, cz, 'bench', 'm');
    },
    // Between songs: a seat on the bottom tier, or a spot by the floor's edge
    rest: function (h) {
      if (h.rnd() < 0.5) { var d = [-20, 0, 25, 155, 180, 200][Math.floor(h.rnd() * 6)], p = at(d + (h.rnd() - 0.5) * 10, LO.r0 + 0.7); return { x: p[0], z: p[1], y: LO.rise, sit: true }; }
      var a = h.rnd() * Math.PI * 2; return { x: Math.cos(a) * (LO.floor - 0.5), z: Math.sin(a) * (LO.floor - 0.5) };
    },
    // Drawn without the 3D venue: the floor, the tiers, the stage
    back2d: function (h) {
      K0(h, LO.top, '#4a4640'); K0(h, LO.floor, '#14161e');
      h.g.strokeStyle = 'rgba(80,220,255,' + (0.4 + 0.3 * h.bright) + ')'; h.g.lineWidth = 1.2;
      for (var k = 0; k < LO.tiers; k++) { h.groundRing(0, 0, LO.r0 + k * LO.tread, 0, Math.PI * 2, 64); h.g.stroke(); }
      var S = this.stage;
      h.fillPoly([[S.x0, S.h, S.z], [S.x1, S.h, S.z], [S.x1, S.h, S.z + S.depth], [S.x0, S.h, S.z + S.depth]], '#2a2830');
    }
  };
  function K0(h, r, col) { window.GarbaVenueKit.disc(h, r, col); }
})();
