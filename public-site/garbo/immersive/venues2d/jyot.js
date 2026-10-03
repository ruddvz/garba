/* Jyot Chowk, as the 2D scene needs it. A courtyard of cream stone: a round floor inlaid with a stone
   mandala; raised terraces down both sides and across the near end, their edges lined with diyas; arcades behind them;
   round mandala lanterns hung on wires from tall poles over the courtyard; velvet sofas round the floor; the musicians
   on a platform before a tower of lamps (a deepstambh) at the far end, a wall of jharokhas behind it; the gate, hung
   with marigolds, in the near terrace.
   The 3D venue (venue3d/src/venues/jyot.js) is built from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var DJ = { floor: 10.5, terrX: 15.4, terrNear: -17.6, terrH: 0.85, arcX: 18.6, arcNear: -20.8, farZ: 22, stambh: [0, 22.4], backZ: 27, gate: 2.8, lounge: 13 };
  var seats = [];
  // velvet sofas round the floor (not before the band, the DJ or the near rows)
  K.ring(seats, DJ.lounge, [-155, -128, -52, -25, 2, 30, 152, 178], 2.6);
  [-2.4, 0, 2.4].forEach(function (x) { K.sofa(seats, x, -13.0, 0, 2.2, 'a'); });
  [-2.6, 2.6].forEach(function (x) { K.sofa(seats, x, -14.8, 0, 2.2, 'b'); });
  DJ.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).jyot = {
    label: 'Jyot Chowk',
    // A walled stone court: bright slaps off the terraces and arcades, the jharokha wall throwing one back from the far end
    sound: {
      desc: 'A courtyard of carved stone lit by thousands of diyas. Bright echoes off the terraces and the far wall.',
      trim: 1.2, dry: 0.9, wet: 0.56, clappers: 34, spread: 0.012, distance: [1.8, 7], far: [16, 36],
      tone: { lowShelf: [160, -1], mid: [2400, 1.0, 1.0], highShelf: [6400, -1.5] },
      ir: { length: 1.8, predelay: 0.005, taps: [[0.007, 0.36, 7800], [0.05, 0.27, 5200], [0.1, 0.16, 3800], [0.17, 0.09, 2800]], tail: { level: 0.08, rt: [1.2, 1.0, 0.55] } },
      room: { level: 0.15, cut: 1500 }, night: 0.85, roomTone: 0
    },
    plan: DJ,
    cams: { circle: [0, 4.0, -10.0], far: [0, 2.2, -15.0], stage: [0, 2.8, 10.4] },
    frames: { far: { hor: 0.46, lens: 0.8 }, stage: { hor: 0.47, lens: 1.08 } },
    // The musicians on a platform before the tower of lamps
    stage: { x0: -5.2, x1: 5.2, z: 14.4, h: 0.6, depth: 3.4, band: 'sheri', bandFront: 15.1, crowd: 4.2, fillX: 2.6 },
    dj: { x: -9.2, z: 13.2 },
    rings: [5.2, 8.8], pairs: 4, walkers: 16, couples: 2, kids: 8,
    garbo: 'bare',
    floorR: DJ.floor,
    aerialCam: { r: 22, h: 30 },
    ground: function (x, z, r) { return Math.hypot(x, z) < DJ.floor - 0.9 - r; },
    // You can walk all of it: the court, up onto the terraces and under the arcades, round the tower of lamps to the
    // jharokha wall
    walk: function (x, z) {
      if (Math.hypot(x - DJ.stambh[0], z - DJ.stambh[1]) < 1.7 || Math.hypot(Math.abs(x) - 7.2, z - DJ.stambh[1] - 1.5) < 1.2) return false;
      return Math.abs(x) < DJ.arcX + 2.7 && z > DJ.arcNear - 2.7 && z < DJ.backZ - 0.6;
    },
    heightAt: function (x, z) {
      var S = this.stage, ax = Math.abs(x);
      if (x > S.x0 && x < S.x1 && z > S.z && z < S.z + S.depth) return S.h;
      if (ax > DJ.terrX || (z < DJ.terrNear && ax > DJ.gate)) return DJ.terrH;
      if (ax > DJ.terrX - 0.5 || (z < DJ.terrNear + 0.5 && ax > DJ.gate)) return DJ.terrH / 2;
      if (z > DJ.backZ - 1.2) return 0.9;
      return 0;
    },
    bounds: [-9.6, 9.6, -9.6, 9.6], home: { x: 0, z: -9.4 },
    fill: { ring: 6.8, groups: [[-3.3, -8.6, 0.8], [3.2, -8.5, 0.75], [0.2, -9.3, 0.5, 2]] },
    follow: [5.4, 3.1], stageLine: [11.2, 4],
    drone: { lo: 6.8, hi: 8.6, k: 3, back: 10, dir: [0.2, 0.98] }, haze: 0.1, hazeFade: 0.9,
    echo: [[-15.4, 2.2, 'listener'], [15.4, 2.2, 'listener'], [0, 4, 27]],
    aerial: { ground: '#8a7458', floor: '#c8b894' },
    sky2d: { stops: [[0, '#02040e'], [0.6, '#0a1028'], [1, '#2a2014']], stars: 160, ground: ['#7a6448', '#3a2a18'] },
    // The plan for the map: the floor, the terraces, the arcades, the gate, the tower of lamps, the lantern poles
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: DJ.floor, s: 'edge' });
      [-1, 1].forEach(function (sd) { out.shapes.push({ k: 'line', pts: [[sd * DJ.terrX, DJ.terrNear], [sd * DJ.terrX, DJ.farZ]], s: 'step' }); out.shapes.push({ k: 'line', pts: [[sd * DJ.arcX, DJ.arcNear], [sd * DJ.arcX, DJ.farZ]], s: 'wall' }); });
      out.shapes.push({ k: 'line', pts: [[-DJ.terrX, DJ.terrNear], [-DJ.gate, DJ.terrNear]], s: 'step' }); out.shapes.push({ k: 'line', pts: [[DJ.gate, DJ.terrNear], [DJ.terrX, DJ.terrNear]], s: 'step' });
      out.shapes.push({ k: 'ring', x: DJ.stambh[0], z: DJ.stambh[1], r: 1.6, s: 'post' }); out.shapes.push({ k: 'line', pts: [[-DJ.arcX, DJ.backZ], [DJ.arcX, DJ.backZ]], s: 'wall' });
      [130, 160, 190, 220, 240, 300, 320, 350, 20, 50].forEach(function (d) { var a = d * Math.PI / 180; out.shapes.push({ k: 'ring', x: Math.cos(a) * 12.4, z: Math.sin(a) * 12.4, r: 0.25, s: 'post' }); });
      seats.forEach(function (sf) { var c0 = Math.cos(sf.ry), s0 = Math.sin(sf.ry), h = sf.len / 2; out.shapes.push({ k: 'line', pts: [[sf.x - c0 * h, sf.z + s0 * h], [sf.x + c0 * h, sf.z - s0 * h]], s: 'step' }); });
    },
    seats: function (h) { return K.seats(h, seats, 0.65); },
    far: function (h) { K.far(h, seats, -12.94); },
    rest: function (h) { return K.rest(h, seats, DJ.floor - 0.4); },
    back2d: function (h) {
      K.disc(h, DJ.floor + 4, '#8a7458'); K.disc(h, DJ.floor, '#c8b894');
      var S = this.stage;
      h.fillPoly([[S.x0, S.h, S.z], [S.x1, S.h, S.z], [S.x1, S.h, S.z + S.depth], [S.x0, S.h, S.z + S.depth]], '#b8a07a');
    }
  };
})();
