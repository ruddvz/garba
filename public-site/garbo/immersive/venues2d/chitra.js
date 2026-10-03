/* Chitra Aangan, as the 2D scene needs it. A garden courtyard: a round floor of pale lime plaster in a ring of white
   gravel, great trees spreading over it hung with strings of lights, a curved wall of painted devotional panels on the
   right, the musicians on a low wooden platform at the far left, benches and sofas round the gravel, low walls behind.
   The 3D venue (venue3d/src/venues/chitra.js) is built from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var CA = { floor: 11.5, gravel: 16, wall: 14.2, wallFrom: -16, wallTo: 76, panels: 12, boundary: 19.6 };
  var seats = [];
  K.ring(seats, 13.4, [-152, -128, -56, -32, 150, 176, 202], 2.3);
  [-2.4, 0, 2.4].forEach(function (x) { K.sofa(seats, x, -13.7, 0, 2.2, 'a', 'bench'); });
  [-2.6, 2.6].forEach(function (x) { K.sofa(seats, x, -15.5, 0, 2.2, 'b', 'bench'); });
  CA.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).chitra = {
    label: 'Chitra Aangan',
    // A courtyard: a quick slap off the panel wall and the low walls, leaves above soaking up the rest
    sound: {
      desc: 'A garden courtyard under great trees. A quick echo off the painted wall, the leaves soak up the rest.',
      trim: 1.2, dry: 0.92, wet: 0.5, clappers: 28, spread: 0.01, distance: [1.6, 6], far: [14, 30],
      tone: { lowShelf: [160, -1], mid: [2200, 0.9, 1.2], highShelf: [6000, -2] },
      ir: { length: 1.4, predelay: 0.006, taps: [[0.008, 0.3, 7000], [0.042, 0.22, 4800], [0.075, 0.12, 3200]], tail: { level: 0.06, rt: [0.9, 0.75, 0.45] } },
      room: { level: 0.12, cut: 1500 }, night: 0.9, roomTone: 0
    },
    plan: CA,
    cams: { circle: [0, 4.0, -10.6], far: [0, 2.2, -15.7], stage: [-6, 2.8, 9.2] },
    frames: { far: { hor: 0.46, lens: 0.8 }, stage: { hor: 0.47, lens: 1.08 } },
    // The musicians' platform at the far left, facing you
    stage: { x0: -9.4, x1: -2.6, z: 14.2, h: 0.45, depth: 2.8, band: 'sheri', bandFront: 14.9, crowd: 4.2, fillX: 2.6 },
    // The DJ in the gap between the musicians' platform and the first panel, clear of the owner's artwork
    dj: { x: 0.8, z: 13.3 },
    rings: [5.6, 9.2], pairs: 4, walkers: 16, couples: 2, kids: 8,
    garbo: 'bare',
    floorR: CA.floor,
    aerialCam: { r: 18, h: 30 },
    ground: function (x, z, r) { return Math.hypot(x, z) < CA.floor - 0.9 - r; },
    // You can walk all of it: the floor, the gravel, the seats and the garden to the walls, round the panels (not through)
    walk: function (x, z) { var r = Math.hypot(x, z), d = Math.atan2(z, x) * 180 / Math.PI; return r < CA.boundary - 1 && !(r > CA.wall - 0.5 && r < CA.wall + 0.6 && d > CA.wallFrom - 2 && d < CA.wallTo + 2); },
    bounds: [-10.5, 10.5, -10.5, 10.5], home: { x: 0, z: -10.2 },
    fill: { ring: 7.4, groups: [[-3.4, -9.0, 0.8], [3.3, -8.9, 0.75], [0.2, -10.0, 0.5, 2]] },
    follow: [5.6, 3.2], stageLine: [9.6, 3.5, -6],
    drone: { lo: 6.4, hi: 8.2, k: 3, back: 10, dir: [0.2, 0.98] }, haze: 0.08, hazeFade: 0.8,
    echo: [[13, 2, 'listener'], [-17, 1.5, 'listener'], [8, 2, 12]],
    aerial: { ground: '#1a2414', floor: '#cdbd98' },
    sky2d: { stops: [[0, '#05070f'], [0.7, '#0f1424'], [1, '#2a2418']], stars: 60, ground: ['#2a2418', '#0e0b08'] },
    // The plan for the map: the floor, the gravel, the panel wall, the trees, the walls round the courtyard
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: CA.floor, s: 'edge' }); out.shapes.push({ k: 'ring', x: 0, z: 0, r: CA.gravel, s: 'faint' });
      var pts = []; for (var d = CA.wallFrom; d <= CA.wallTo; d += 4) { var a = d * Math.PI / 180; pts.push([Math.cos(a) * CA.wall, Math.sin(a) * CA.wall]); } out.shapes.push({ k: 'line', pts: pts, s: 'art' });
      [[-15.5, 5, 7], [14.5, 17.5, 8], [-12.5, -14.5, 6], [16.5, -10, 6], [-3, 24, 6]].forEach(function (t) { out.shapes.push({ k: 'ring', x: t[0], z: t[1], r: t[2], s: 'tree' }); });
      var wl = []; for (var w = 1.75; w < 5.55; w += 0.16) wl.push([Math.cos(w) * CA.boundary, Math.sin(w) * CA.boundary]); out.shapes.push({ k: 'line', pts: wl, s: 'wall' });
    },
    seats: function (h) { return K.seats(h, seats, 0.65); },
    far: function (h) { K.far(h, seats, -13.64); },
    rest: function (h) { return K.rest(h, seats, 11.0); },
    back2d: function (h) {
      K.disc(h, CA.gravel, '#7a7466'); K.disc(h, CA.floor, '#cdbd98');
      for (var i = 0; i < CA.panels; i++) {
        var a = (CA.wallFrom + (i + 0.5) * (CA.wallTo - CA.wallFrom) / CA.panels) * Math.PI / 180, x = Math.cos(a) * CA.wall, z = Math.sin(a) * CA.wall, tx = -Math.sin(a) * 0.85, tz = Math.cos(a) * 0.85;
        h.fillPoly([[x - tx, 0.3, z - tz], [x + tx, 0.3, z + tz], [x + tx, 3.7, z + tz], [x - tx, 3.7, z - tz]], ['#8e1b2c', '#1e5a6a', '#c98a2a', '#3a2a6a'][i % 4]);
      }
      var S = this.stage;
      h.fillPoly([[S.x0, S.h, S.z], [S.x1, S.h, S.z], [S.x1, S.h, S.z + S.depth], [S.x0, S.h, S.z + S.depth]], '#5a3a20');
    }
  };
})();
