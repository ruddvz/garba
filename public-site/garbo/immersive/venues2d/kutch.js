/* Kutch White Rann, as the 2D scene needs it. A Garba circle out on the white salt under the moon: a raised ivory dance
   platform with an indigo border, a perforated terracotta lamp at its middle; clay panels with mirror work round it;
   the musicians on a low dais to the left; floor seating on indigo durries round the platform; round bhunga huts lit
   from within out on the salt. The 3D venue (venue3d/src/venues/kutch.js) is built from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var KR = { floor: 10, deck: 0.32, lamp: { r: 0.62, h: 1.5, plinth: 1.05, plinthH: 0.2 }, huts: [[16, 22], [21.5, 19], [26, 14.5]], panels: [[-6.5, 15.5], [-3.6, 16.6], [12.6, -4], [12.6, 3.5], [-13, 4], [-13, -4]] };
  var seats = [];
  // low seating on durries round the platform (bench height), and the near rows from far off
  K.ring(seats, 12.6, [-150, -128, -52, -30, 10, 32, 168], 2.6, 'bench');
  [-2.4, 0, 2.4].forEach(function (x) { K.sofa(seats, x, -12.8, 0, 2.2, 'a', 'bench'); });
  [-2.6, 2.6].forEach(function (x) { K.sofa(seats, x, -14.6, 0, 2.2, 'b', 'bench'); });
  KR.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).kutch = {
    label: 'Kutch White Rann',
    // still being finished: View tags it and a board says so the first time you're in it (drop this when it's done)
    soon: true,
    // Flat open salt to the horizon: nothing at all throws the sound back
    sound: {
      desc: 'A circle out on the white salt under the moon. Nothing throws the sound back; it runs out over the Rann.',
      trim: 1.35, dry: 1.0, wet: 0.22, clappers: 26, spread: 0.01, distance: [2, 8], far: [16, 36],
      tone: { lowShelf: [150, -2], mid: [2200, 0.8, 1.0], highShelf: [6200, -2] },
      ir: { length: 0.8, predelay: 0.01, taps: [[0.014, 0.12, 5200]], tail: { level: 0.02, rt: [0.5, 0.4, 0.25] } },
      room: { level: 0.05, cut: 800 }, night: 1, roomTone: 0.01
    },
    plan: KR,
    cams: { circle: [0, 4.2, -10.2], far: [0, 2.0, -14.6], stage: [-11.4, 2.4, 7.0] },
    frames: { far: { hor: 0.46, lens: 0.8 }, stage: { hor: 0.47, lens: 1.08 } },
    // The musicians on a low dais to the left of the circle, facing it
    stage: { x0: -14.2, x1: -8.6, z: 10.8, h: 0.3, depth: 2.8, band: 'sheri', bandFront: 11.4, crowd: 3.6, fillX: 2.2 },
    dj: { x: 8.8, z: 10.6 },
    rings: [4.8, 8.2], pairs: 4, walkers: 14, couples: 2, kids: 6,
    garbo: 'mast', mast: KR.lamp,
    floorR: KR.floor,
    // the drone's view (View → Aerial)
    aerialCam: { r: 30, h: 18, cz: 3 },
    ground: function (x, z, r) { return Math.hypot(x, z) < KR.floor - 0.9 - r && Math.hypot(x, z) > KR.lamp.plinth + 0.4 + r; },
    // You can walk all of it: the platform, off its steps onto the salt, out to the huts
    walk: function (x, z) { return Math.hypot(x, z) > KR.lamp.plinth + 0.3 && Math.hypot(x, z - 6) < 30; },
    heightAt: function (x, z) { var r = Math.hypot(x, z), S = this.stage; if (x > S.x0 && x < S.x1 && z > S.z && z < S.z + S.depth) return S.h; return r < KR.floor + 0.6 ? KR.deck : 0; },
    bounds: [-9.2, 9.2, -9.2, 9.2], home: { x: 0, z: -9.4 },
    fill: { ring: 6.6, groups: [[-3.2, -8.4, 0.75], [3.1, -8.3, 0.7], [0.2, -9.1, 0.5, 2]] },
    follow: [5.4, 3.1], stageLine: [10, 3.5, -11.4],
    drone: { lo: 7, hi: 9, k: 3, back: 10, dir: [0.2, 0.98] }, haze: 0.05, hazeFade: 0.5,
    echo: [],
    aerial: { ground: '#d8d6dc', floor: '#ece4d4' },
    sky2d: { stops: [[0, '#0a1430'], [0.65, '#1c2c5a'], [1, '#3a4a78']], stars: 90, moon: { x: 0.36, y: 0.5, r: 0.03, col: '#fff4dc' }, ground: ['#cfd0da', '#8a8ea8'] },
    // The plan for the map: the platform, the lamp, the dais, the clay panels, the huts
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: KR.floor + 0.6, s: 'edge' }); out.shapes.push({ k: 'ring', x: 0, z: 0, r: KR.floor - 0.9, s: 'step' });
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: KR.lamp.plinth, s: 'post' });
      KR.panels.forEach(function (p) { out.shapes.push({ k: 'ring', x: p[0], z: p[1], r: 0.5, s: 'post' }); });
      KR.huts.forEach(function (p) { out.shapes.push({ k: 'ring', x: p[0], z: p[1], r: 2.2, s: 'wall' }); });
      seats.forEach(function (sf) { var c0 = Math.cos(sf.ry), s0 = Math.sin(sf.ry), h = sf.len / 2; out.shapes.push({ k: 'line', pts: [[sf.x - c0 * h, sf.z + s0 * h], [sf.x + c0 * h, sf.z - s0 * h]], s: 'step' }); });
    },
    seats: function (h) { return K.seats(h, seats, 0.62); },
    far: function (h) { K.far(h, seats, -12.74); },
    rest: function (h) { return K.rest(h, seats, KR.floor - 0.4); },
    back2d: function (h) {
      K.disc(h, 40, '#d8d6dc'); K.disc(h, KR.floor + 0.6, '#2a3a7a'); K.disc(h, KR.floor - 0.5, '#ece4d4');
      var S = this.stage; h.fillPoly([[S.x0, S.h, S.z], [S.x1, S.h, S.z], [S.x1, S.h, S.z + S.depth], [S.x0, S.h, S.z + S.depth]], '#2a3a7a');
    }
  };
})();
