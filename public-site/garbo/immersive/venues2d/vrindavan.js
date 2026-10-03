/* Vrindavan Courtyard, as the 2D scene needs it. A courtyard of old sandstone: a round dance floor of worn flagstones
   with the garbo on a low stone plinth at its middle; arcades of cusped arches on carved pillars down both sides and
   across the near end, stone benches with jute mats and cushions under them; the gate in the middle of the near
   arcade; the musicians on a stone platform at the far end, and beyond them, across an open court, a temple's spire.
   The 3D venue (venue3d/src/venues/vrindavan.js) is built from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var VR = { floor: 11, arcX: 16.6, arcZ0: -18.6, arcZ1: 21, nearZ: -18.6, farZ: 21, gate: 3.2, opening: 7, temple: [0, 34], benchX: 14.4 };
  var seats = [];
  // stone benches under the side arcades, facing the floor
  [-8.6, -5.2, -1.8, 1.6, 5, 8.4, 11.8].forEach(function (z) { K.sofa(seats, -VR.benchX, z, Math.PI / 2, 2.8, false, 'bench'); K.sofa(seats, VR.benchX, z, -Math.PI / 2, 2.8, false, 'bench'); });
  // and the two near rows you sit in from far off
  [-2.4, 0, 2.4].forEach(function (x) { K.sofa(seats, x, -13.4, 0, 2.2, 'a', 'bench'); });
  [-2.6, 2.6].forEach(function (x) { K.sofa(seats, x, -15.2, 0, 2.2, 'b', 'bench'); });
  VR.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).vrindavan = {
    label: 'Vrindavan Courtyard',
    // Stone all round: quick, bright slaps off the arcades either side, the open sky taking the rest
    sound: {
      desc: 'An old sandstone courtyard under the stars. Quick echoes off the arcades either side, the sky open overhead.',
      trim: 1.2, dry: 0.92, wet: 0.55, clappers: 30, spread: 0.011, distance: [1.8, 7], far: [16, 34],
      tone: { lowShelf: [160, -1], mid: [2400, 1.0, 1.1], highShelf: [6200, -1.5] },
      ir: { length: 1.7, predelay: 0.005, taps: [[0.007, 0.34, 7600], [0.048, 0.26, 5200], [0.096, 0.15, 3600], [0.15, 0.08, 2600]], tail: { level: 0.07, rt: [1.1, 0.9, 0.5] } },
      room: { level: 0.14, cut: 1500 }, night: 0.85, roomTone: 0
    },
    plan: VR,
    cams: { circle: [0, 4.0, -10.4], far: [0, 2.2, -15.4], stage: [0, 2.8, 10.6] },
    frames: { far: { hor: 0.46, lens: 0.8 }, stage: { hor: 0.47, lens: 1.08 } },
    // The musicians on a stone platform at the far end, the temple's court behind them
    stage: { x0: -5.4, x1: 5.4, z: 14.6, h: 0.75, depth: 3.4, band: 'sheri', bandFront: 15.3, crowd: 4.2, fillX: 2.6 },
    dj: { x: 9.2, z: 13.4 },
    rings: [5.4, 9.0], pairs: 4, walkers: 16, couples: 2, kids: 8,
    garbo: 'full',
    floorR: VR.floor,
    // the drone's view (View → Aerial)
    aerialCam: { r: 22, h: 30, cz: 3 },
    ground: function (x, z, r) { return Math.hypot(x, z) < VR.floor - 0.9 - r; },
    // You can walk all of it: the court, under the arcades, up onto the band's platform, and through the opening at the far
    // end into the temple's court, up its steps to the porch
    walk: function (x, z) {
      if (Math.abs(x) < 3.4 && Math.abs(z - (VR.temple[1] + 1.3)) < 3.4) return false;
      return (Math.abs(x) < VR.arcX + 2.9 && z > VR.nearZ - 2.9 && z < VR.farZ + 0.2) || (Math.abs(x) < VR.opening && z >= VR.farZ && z < VR.farZ + 4) || (Math.abs(x) < 13.4 && z >= VR.farZ + 3.4 && z < 45);
    },
    heightAt: function (x, z) {
      var S = this.stage, t = VR.temple[1], ax = Math.abs(x);
      if (x > S.x0 && x < S.x1 && z > S.z && z < S.z + S.depth) return S.h;
      if (ax < 4.6 && Math.abs(z - (t + 0.6)) < 6.6) return 1.68; if (ax < 5.1 && Math.abs(z - (t + 0.4)) < 7.2) return 1.0; if (ax < 5.8 && Math.abs(z - t) < 7.5) return 0.5;
      if (ax > VR.arcX - 0.5 || (z < VR.nearZ + 0.5 && z > VR.nearZ - 3.6 && ax > VR.gate) || (z > VR.farZ - 0.5 && z < VR.farZ + 3.6 && ax > VR.opening)) return 0.35;
      return Math.hypot(x, z) < 1.15 ? 0.3 : 0;
    },
    bounds: [-10, 10, -10, 10], home: { x: 0, z: -9.8 },
    fill: { ring: 7.0, groups: [[-3.4, -8.8, 0.8], [3.3, -8.7, 0.75], [0.2, -9.6, 0.5, 2]] },
    follow: [5.6, 3.2], stageLine: [11.2, 4],
    drone: { lo: 6.4, hi: 8.2, k: 3, back: 10, dir: [0.2, 0.98] }, haze: 0.1, hazeFade: 0.9,
    echo: [[-16, 2.5, 'listener'], [16, 2.5, 'listener'], [0, 4, 24]],
    aerial: { ground: '#6a4a30', floor: '#8a6440' },
    sky2d: { stops: [[0, '#03050f'], [0.6, '#0c1430'], [1, '#3a2a1e']], stars: 220, ground: ['#5a3c24', '#2a1a10'] },
    // The plan for the map: the floor, the arcades, the benches, the gate, the temple
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: VR.floor, s: 'edge' });
      [-1, 1].forEach(function (sd) { out.shapes.push({ k: 'line', pts: [[sd * VR.arcX, VR.arcZ0], [sd * VR.arcX, VR.arcZ1]], s: 'wall' }); });
      out.shapes.push({ k: 'line', pts: [[-VR.arcX, VR.nearZ], [-VR.gate, VR.nearZ]], s: 'wall' }); out.shapes.push({ k: 'line', pts: [[VR.gate, VR.nearZ], [VR.arcX, VR.nearZ]], s: 'wall' });
      out.shapes.push({ k: 'line', pts: [[-VR.arcX, VR.farZ], [-VR.opening, VR.farZ]], s: 'wall' }); out.shapes.push({ k: 'line', pts: [[VR.opening, VR.farZ], [VR.arcX, VR.farZ]], s: 'wall' });
      out.shapes.push({ k: 'poly', pts: [[-5.5, VR.temple[1] - 6], [5.5, VR.temple[1] - 6], [5.5, VR.temple[1] + 6], [-5.5, VR.temple[1] + 6]], s: 'faint' });
      seats.forEach(function (sf) { var c0 = Math.cos(sf.ry), s0 = Math.sin(sf.ry), h = sf.len / 2; out.shapes.push({ k: 'line', pts: [[sf.x - c0 * h, sf.z + s0 * h], [sf.x + c0 * h, sf.z - s0 * h]], s: 'step' }); });
    },
    seats: function (h) { return K.seats(h, seats, 0.62); },
    far: function (h) { K.far(h, seats, -13.34); },
    rest: function (h) { return K.rest(h, seats, VR.floor - 0.5); },
    back2d: function (h) {
      K.disc(h, VR.floor + 6, '#6a4a30'); K.disc(h, VR.floor, '#8a6440');
      var S = this.stage;
      h.fillPoly([[S.x0, S.h, S.z], [S.x1, S.h, S.z], [S.x1, S.h, S.z + S.depth], [S.x0, S.h, S.z + S.depth]], '#7a5434');
      [-1, 1].forEach(function (sd) { h.fillPoly([[sd * VR.arcX, 0, VR.arcZ0], [sd * VR.arcX, 0, VR.arcZ1], [sd * VR.arcX, 4.6, VR.arcZ1], [sd * VR.arcX, 4.6, VR.arcZ0]], '#5a3a22'); });
    }
  };
})();
