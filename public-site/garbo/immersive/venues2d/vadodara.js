/* Vadodara Vision 2047, as the 2D scene needs it. A plaza in the heart of a city at night: wet dark tiles, a round LED
   floor in the middle in rings of neon round a lotus, a rosette of light on each diagonal; tall LED pillars
   round the plaza, palms in planters, the stage at the far end before a great LED wall, an elevated metro line passing
   behind it; sofas round the floor and near rows to sit in from far off; the gates on the near side. The 3D venue
   (venue3d/src/venues/vadodara.js) is built from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var CY = { floor: 11, x: 30, z0: -24, z1: 34, lounge: 14.4, pillars: [[-22, -16], [22, -16], [-26, 0], [26, 0], [-24, 14], [24, 14], [-16, 26], [16, 26], [-9, -21], [9, -21]], diamonds: 15.4, metroZ: 44, metroY: 11 };
  var seats = [];
  // (clear of the rosettes on the diagonals)
  K.ring(seats, CY.lounge, [-170, -105, -75, -10, 12, 168], 2.6);
  [-2.4, 0, 2.4].forEach(function (x) { K.sofa(seats, x, -14.0, 0, 2.2, 'a'); });
  [-2.6, 2.6].forEach(function (x) { K.sofa(seats, x, -15.8, 0, 2.2, 'b'); });
  CY.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).vadodara = {
    label: 'Vadodara Vision 2047',
    // An open plaza between glass towers: hard echoes off the facades, late and spread, the city humming under it
    sound: {
      desc: 'An open plaza among the towers of a city at night. Hard echoes off the glass, late and wide.',
      trim: 1.15, dry: 0.85, wet: 0.6, clappers: 52, spread: 0.014, distance: [2.4, 10], far: [20, 44],
      tone: { lowShelf: [140, 1], mid: [1800, 0.9, 1.1], highShelf: [6500, -1] },
      ir: { length: 2.6, predelay: 0.012, taps: [[0.012, 0.3, 7600], [0.11, 0.24, 5200], [0.19, 0.18, 4200], [0.3, 0.1, 3000]], tail: { level: 0.1, rt: [1.6, 1.3, 0.8] } },
      room: { level: 0.1, cut: 900 }, night: 0.2, roomTone: 0.03
    },
    plan: CY,
    cams: { circle: [0, 4.4, -11.2], far: [0, 2.2, -16.0], stage: [0, 3.2, 14.0] },
    frames: { far: { hor: 0.46, lens: 0.8 } },
    // A full stage before the LED wall, its screen showing the drone's picture
    stage: { x0: -9, x1: 9, z: 20, h: 1.2, depth: 4.4, screenBottom: 2.2, screenTop: 9.6, truss: 11, arrays: 11.4, band: 'big', screen: true, crowd: 7, fillX: 3.4 },
    dj: { x: 12.8, z: 14.6 },
    rings: [5.4, 9.0], pairs: 6, walkers: 24, couples: 3, kids: 10,
    garbo: 'bare',
    floorR: CY.floor,
    // the drone's view (View → Aerial)
    aerialCam: { r: 36, h: 25, cz: 2 },
    ground: function (x, z, r) { return Math.hypot(x, z) < CY.floor - 0.9 - r; },
    // You can walk all of it: the whole plaza, past the booths and pillars, up to the stage
    walk: function (x, z) { return Math.abs(x) < CY.x - 2 && z > CY.z0 + 1.5 && z < 19.6; },
    bounds: [-10, 10, -10, 10], home: { x: 0, z: -10.2 },
    fill: { ring: 7.2, groups: [[-3.4, -9.2, 0.8], [3.3, -9.1, 0.75], [0.2, -10.0, 0.5, 2]] },
    follow: [6.0, 3.4], stageLine: [17.2, 8],
    drone: { lo: 9, hi: 12, k: 3.5, back: 13, dir: [0.25, 0.97] }, haze: 0.16, hazeFade: 1.4,
    echo: [[-30, 8, 'listener'], [30, 8, 'listener'], [0, 10, 44]],
    aerial: { ground: '#14121c', floor: '#3a1a5a' },
    sky2d: { stops: [[0, '#05030f'], [0.7, '#1a0e30'], [1, '#4a1a5a']], stars: 20, ground: ['#14121c', '#06050a'] },
    // The plan for the map: the plaza's edge, the LED floor and its diamonds, the pillars, the metro line behind the stage
    map: function (out) {
      out.shapes.push({ k: 'poly', pts: [[-CY.x, CY.z0], [CY.x, CY.z0], [CY.x, CY.z1], [-CY.x, CY.z1]], s: 'wall' });
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: CY.floor, s: 'edge' });
      [45, 135, 225, 315].forEach(function (d) { var a = d * Math.PI / 180, x = Math.cos(a) * CY.diamonds, z = Math.sin(a) * CY.diamonds; out.shapes.push({ k: 'poly', pts: [[x, z - 1.6], [x + 1.6, z], [x, z + 1.6], [x - 1.6, z]], s: 'step' }); });
      CY.pillars.forEach(function (p) { out.shapes.push({ k: 'ring', x: p[0], z: p[1], r: 0.9, s: 'post' }); });
      out.shapes.push({ k: 'line', pts: [[-60, CY.metroZ], [60, CY.metroZ]], s: 'faint' });
      seats.forEach(function (sf) { var c0 = Math.cos(sf.ry), s0 = Math.sin(sf.ry), h = sf.len / 2; out.shapes.push({ k: 'line', pts: [[sf.x - c0 * h, sf.z + s0 * h], [sf.x + c0 * h, sf.z - s0 * h]], s: 'step' }); });
    },
    seats: function (h) { return K.seats(h, seats, 0.65); },
    far: function (h) { K.far(h, seats, -13.94); },
    rest: function (h) { return K.rest(h, seats, CY.floor - 0.4); },
    back2d: function (h) {
      K.disc(h, CY.lounge + 4, '#14121c'); K.disc(h, CY.floor, '#3a1a5a');
      h.g.strokeStyle = 'rgba(255,60,210,' + (0.4 + 0.3 * h.bright) + ')'; h.g.lineWidth = 1.4;
      [CY.floor - 0.2, 8, 5].forEach(function (rr) { h.groundRing(0, 0, rr, 0, Math.PI * 2, 64); h.g.stroke(); });
      var S = this.stage;
      h.fillPoly([[S.x0, S.h, S.z], [S.x1, S.h, S.z], [S.x1, S.h, S.z + S.depth], [S.x0, S.h, S.z + S.depth]], '#1a1822');
    }
  };
})();
