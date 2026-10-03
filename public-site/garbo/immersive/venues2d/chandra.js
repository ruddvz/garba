/* Chandra Van, as the 2D scene needs it. A moonlit jungle garden: a round floor of dark stone with a mandala glowing
   in its inlay, a narrow channel of water round it with lotus candles floating on it, arches of twisted branches round
   the floor hung with glowing lanterns, the musicians in a pavilion of branches at the far side, sofas among glowing
   leaves and violet bell flowers, banyans all round, and a huge moon low over the trees. The 3D venue
   (venue3d/src/venues/chandra.js) is built from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var CV = { floor: 14, water: [14.5, 15.5], arches: 17.2, nArches: 12 };
  var seats = [];
  K.ring(seats, 18.4, [-150, -126, -54, -30, -6, 30, 150, 174, 198], 2.4);
  [-2.5, 0, 2.5].forEach(function (x) { K.sofa(seats, x, -16.9, 0, 2.3, 'a'); });
  [-2.7, 2.7].forEach(function (x) { K.sofa(seats, x, -18.7, 0, 2.3, 'b'); });
  CV.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).chandra = {
    label: 'Chandra Van',
    // A garden among great trees: the leaves take the highs and the echoes, a soft short tail, water close by
    sound: {
      desc: 'A moonlit garden among great trees. The leaves soften everything; a soft, short tail.',
      trim: 1.3, dry: 0.95, wet: 0.4, clappers: 40, spread: 0.012, distance: [2, 8], far: [18, 40],
      tone: { lowShelf: [150, -1.5], mid: [2400, 0.8, 1.0], highShelf: [5500, -3.5] },
      ir: { length: 1.6, predelay: 0.006, taps: [[0.006, 0.32, 7500], [0.08, 0.14, 3200], [0.16, 0.08, 2400]], tail: { level: 0.05, rt: [1.0, 0.8, 0.4] } },
      room: { level: 0.12, cut: 1200 }, night: 1, roomTone: 0
    },
    plan: CV,
    cams: { circle: [0, 4.2, -11.5], far: [0, 2.3, -18.6], stage: [0, 2.9, 12.8] },
    frames: { far: { hor: 0.46, lens: 0.8 }, stage: { hor: 0.47, lens: 1.08 } },
    // The musicians in their pavilion of branches, over a little bridge across the water
    stage: { x0: -4.6, x1: 4.6, z: 18.2, h: 0.6, depth: 3.6, band: 'sheri', bandFront: 18.9, crowd: 5, fillX: 2.6 },
    dj: { x: 9.6, z: 9.6 },
    rings: [5.6, 9.4], pairs: 6, walkers: 20, couples: 3, kids: 10,
    garbo: 'bare',
    floorR: CV.floor,
    // the drone's view (View → Aerial)
    aerialCam: { r: 19, h: 34 },
    ground: function (x, z, r) { return Math.hypot(x, z) < CV.floor - 0.9 - r; },
    // You can walk all of it: the floor, over the bridge to the band, and out beyond the water among the arches and seats
    walk: function (x, z) { var r = Math.hypot(x, z); return r < CV.water[0] - 0.2 || (Math.abs(x) < 1.2 && z > 0 && r < 17.9) || (r > CV.water[1] + 0.2 && r < 23); },
    bounds: [-13, 13, -13, 13], home: { x: 0, z: -12.8 },
    fill: { ring: 7.5, groups: [[-6.6, -11.4, 1.1], [6.4, -11.2, 1.0], [0.2, -12.6, 0.55, 2]] },
    follow: [6, 3.4], stageLine: [13.2, 4.5],
    drone: { lo: 7.5, hi: 10, k: 3.5, back: 13, dir: [0.25, 0.97] }, haze: 0.1, hazeFade: 0.9,
    echo: [[-20, 3, 'listener'], [20, 3, 'listener']],
    aerial: { ground: '#0e1a14', floor: '#1a1e24' },
    sky2d: { stops: [[0, '#05061a'], [0.6, '#1a1640'], [1, '#2a2a5a']], stars: 160, moon: { x: 0.5, y: 0.42, r: 0.15, col: '#e6dcff' }, ground: ['#0e1a14', '#06090a'] },
    // The plan for the map: the floor, the water round it and its bridge, the arches, the band's pavilion
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: CV.floor, s: 'edge' }); out.shapes.push({ k: 'ring', x: 0, z: 0, r: CV.water[0], s: 'water' }); out.shapes.push({ k: 'ring', x: 0, z: 0, r: CV.water[1], s: 'water' });
      out.shapes.push({ k: 'poly', pts: [[-1.3, CV.water[0] - 0.6], [1.3, CV.water[0] - 0.6], [1.3, CV.water[1] + 0.6], [-1.3, CV.water[1] + 0.6]], s: 'step' });
      for (var i = 0; i < CV.nArches; i++) { var a = (i + 0.5) / CV.nArches * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < 0.3) continue; var c = [Math.cos(a) * CV.arches, Math.sin(a) * CV.arches], t = [-Math.sin(a) * 2.2, Math.cos(a) * 2.2]; out.shapes.push({ k: 'line', pts: [[c[0] - t[0], c[1] - t[1]], [c[0] + t[0], c[1] + t[1]]], s: 'art' }); }
      out.shapes.push({ k: 'ring', x: 0, z: this.stage.z + this.stage.depth / 2, r: 4.6, s: 'art' });
    },
    seats: function (h) { return K.seats(h, seats, 0.65); },
    far: function (h) { K.far(h, seats, -16.84); },
    rest: function (h) { return K.rest(h, seats, 13.4); },
    back2d: function (h) {
      K.disc(h, CV.water[1], '#0a1a2a'); K.disc(h, CV.floor, '#1a1e24');
      h.g.strokeStyle = 'rgba(255,200,110,.55)'; h.g.lineWidth = 1.2;
      [13.4, 9.0, 4.5].forEach(function (rr) { h.groundRing(0, 0, rr, 0, Math.PI * 2, 64); h.g.stroke(); });
      for (var i = 0; i < CV.nArches; i++) { var a = (i + 0.5) / CV.nArches * Math.PI * 2, p = h.P(Math.cos(a) * CV.arches, 4.6, Math.sin(a) * CV.arches); if (p) h.glow(p.x, p.y, Math.max(2, Math.min(10, p.s * 0.4)), '#ffc47a', 0.6 * h.bright + 0.2); }
    }
  };
})();
