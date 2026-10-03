/* Resham Pavilion, as the 2D scene needs it. A round floor laid with a maroon mandala, a tall lacquered mast at its
   centre and, from the mast's crown out to a ring of truss towers, hundreds of red and gold ribbons radiating in a
   full-span canopy; red lounges round the floor; the band on a low stage at the far side. The 3D venue
   (venue3d/src/venues/resham.js) is built from this plan (it's handed this spec), so the sofas it builds are the ones
   the people here sit on. */
(function () {
  'use strict';
  var RS = { floor: 16, towers: 25, nTowers: 16, towerH: 10.5, mastH: 19, crownY: 18.3, lounge: 18.4 };
  // The lounges: a sofa facing the floor at each place round it (not before the band, the DJ or the near rows), and two
  // rows of sofas on the near side where you sit when you watch from far off
  var K = window.GarbaVenueKit, sofas = [];
  K.ring(sofas, RS.lounge, [-150, -128, -52, -30, -8, 14, 36, 144, 166, 188, 210], 2.6);
  [-2.7, 0, 2.7].forEach(function (x) { K.sofa(sofas, x, -18.6, 0, 2.5, 'a'); });
  [-2.9, 2.9].forEach(function (x) { K.sofa(sofas, x, -20.4, 0, 2.5, 'b'); });
  RS.sofas = sofas;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).resham = {
    label: 'Resham Dome',
    // still being finished: View tags it and a board says so the first time you're in it (drop this when it's done)
    soon: true,
    // Open air under a canopy of cloth: the ribbons soak up the highs, a short soft tail, a little off the towers
    sound: {
      desc: 'An open pavilion under a canopy of red ribbons. The cloth softens the sound; a short, warm tail.',
      trim: 1.3, dry: 0.95, wet: 0.42, clappers: 50, spread: 0.013, distance: [2.2, 9], far: [22, 48],
      tone: { lowShelf: [150, -1.5], mid: [1800, 0.8, 1.0], highShelf: [5000, -4.5] },
      ir: { length: 1.8, predelay: 0.006, taps: [[0.006, 0.34, 7000], [0.07, 0.18, 3200], [0.15, 0.1, 2400]], tail: { level: 0.07, rt: [1.0, 0.8, 0.4] } },
      room: { level: 0.14, cut: 1100 }, night: 0.85, roomTone: 0
    },
    plan: RS,
    cams: { circle: [0, 4.4, -12.5], far: [0, 2.35, -20.7], stage: [0, 3.0, 13.9] },
    frames: { far: { hor: 0.46, lens: 0.8 } },
    stage: { x0: -6.5, x1: 6.5, z: 19.2, h: 1.0, depth: 4.4, band: 'big', bandFront: 20.1, crowd: 5.6, fillX: 3.0 },
    dj: { x: 11.8, z: 14.6 },
    rings: [5.6, 9.4, 13.2], pairs: 6, walkers: 24, couples: 3, kids: 12,
    garbo: 'mast', mast: { r: 0.42, h: RS.mastH, plinth: 1.3, plinthH: 0.45 },
    floorR: RS.floor,
    ground: function (x, z, r) { return Math.hypot(x, z) < RS.floor - 1 - r; },
    // You can walk all of it: the floor, out among the lounges to the towers, and out through the gate
    walk: function (x, z) { return Math.hypot(x, z) < RS.towers - 1 || (Math.abs(x) < 2.6 && z < 0 && z > -RS.towers - 3); },
    bounds: [-15, 15, -15, 15], home: { x: 0, z: -14.6 },
    fill: { ring: 7.7, groups: [[-6.2, -13.4, 1.1], [6.0, -13.2, 1.0], [0.2, -14.6, 0.55, 2]] },
    follow: [6.2, 3.4], stageLine: [14.6, 5.5],
    drone: { lo: 7.4, hi: 9.2, k: 3, back: 13, dir: [0.25, 0.97] }, haze: 0.14, hazeFade: 1.2,
    echo: [[-24, 4, 'listener'], [24, 4, 'listener'], [0, 6, 26]],
    aerial: { ground: '#16220f', floor: '#5a1420' },
    sky2d: { stops: [[0, '#04051a'], [0.6, '#140f33'], [1, '#3d1f1a']], stars: 140, moon: { x: 0.8, y: 0.3, r: 0.02, col: '#f5ecd6' }, ground: ['#2a1410', '#0c0806'] },
    // The plan for the map: the floor, the ring of towers, the canopy's spokes, the lounges
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: RS.floor, s: 'edge' });
      for (var i = 0; i < RS.nTowers; i++) { var a = (i + 0.5) / RS.nTowers * Math.PI * 2, b = (i + 1.5) / RS.nTowers * Math.PI * 2; out.shapes.push({ k: 'ring', x: Math.cos(a) * RS.towers, z: Math.sin(a) * RS.towers, r: 0.5, s: 'post' }); out.shapes.push({ k: 'line', pts: [[Math.cos(a) * RS.towers, Math.sin(a) * RS.towers], [Math.cos(b) * RS.towers, Math.sin(b) * RS.towers]], s: 'wall' }); }
      for (var k = 0; k < 32; k++) { var c = k / 32 * Math.PI * 2; out.shapes.push({ k: 'line', pts: [[Math.cos(c) * 0.6, Math.sin(c) * 0.6], [Math.cos(c) * RS.towers, Math.sin(c) * RS.towers]], s: 'faint' }); }
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: 0.42, s: 'post' });
      sofas.forEach(function (sf) { var c0 = Math.cos(sf.ry), s0 = Math.sin(sf.ry), h = sf.len / 2; out.shapes.push({ k: 'poly', pts: [[sf.x - c0 * h, sf.z + s0 * h], [sf.x + c0 * h, sf.z - s0 * h], [sf.x + c0 * h - s0 * 0.8, sf.z - s0 * h - c0 * 0.8], [sf.x - c0 * h - s0 * 0.8, sf.z + s0 * h - c0 * 0.8]], s: 'seat' }); });
    },
    // People sitting out on the lounges round the floor; from far off you sit on the second row of sofas on the near
    // side, the two of you on the middle sofa in front
    seats: function (h) { return K.seats(h, sofas); },
    far: function (h) {
      K.far(h, sofas, -18.54);
      h.out.push({ x: 5.4, y: 0, z: -17.6, kind: 'stand', who: h.person({ stander: true, phone: true, sway: 1 }) });
    },
    rest: function (h) { return K.rest(h, sofas, 15.6); },
    back2d: function (h) {
      K.disc(h, RS.floor, '#4a1018');
      h.g.strokeStyle = 'rgba(214,166,74,.55)'; h.g.lineWidth = 1.2;
      [15.5, 11.3, 7.5, 3.0].forEach(function (rr) { h.groundRing(0, 0, rr, 0, Math.PI * 2, 64); h.g.stroke(); });
      h.fillPoly([[-0.42, 0, 0], [0.42, 0, 0], [0.34, RS.mastH, 0], [-0.34, RS.mastH, 0]], '#5a0c14');
    }
  };
})();
