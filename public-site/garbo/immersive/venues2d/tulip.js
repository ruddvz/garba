/* Tulip Grove, as the 2D scene needs it. A garden clearing among old trees whose trunks are lit violet: a round
   floor of pale stone, and over it, from a ring of posts, wires strung to the middle hung with hundreds of woven cone
   lanterns, more hanging from the branches; sofas round the floor; woven lounge pods among the trees; the musicians
   on a low deck at the far side; stone paths through the beds. The 3D venue (venue3d/src/venues/tulip.js) is built
   from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var VG = { floor: 10.5, posts: 11.8, nPosts: 12, postH: 6.2, hubY: 7.4, lounge: 13.2, trees: [[-15.5, 4, 7.4, 13], [15.8, 6, 7.8, 13], [-13, -13.5, 6.8, 11], [13.8, -12.5, 6.6, 11], [-8, 18, 7.2, 12], [9.5, 18.5, 7.6, 12], [-19, -3, 6.4, 10], [19.5, -2, 6.6, 10]], pods: [[-17, -17], [17, -17], [-18, 15], [18, 15]] };
  var seats = [];
  K.ring(seats, VG.lounge, [-155, -128, -52, -25, 2, 30, 150, 178], 2.4);
  [-2.4, 0, 2.4].forEach(function (x) { K.sofa(seats, x, -13.4, 0, 2.2, 'a'); });
  [-2.6, 2.6].forEach(function (x) { K.sofa(seats, x, -15.2, 0, 2.2, 'b'); });
  VG.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).tulip = {
    label: 'Tulip Grove',
    // Open air among trees: the leaves soften everything, a short, dark tail
    sound: {
      desc: 'A garden clearing under old trees hung with woven lanterns. The leaves soften the sound; a short, dark tail.',
      trim: 1.25, dry: 0.95, wet: 0.4, clappers: 30, spread: 0.012, distance: [2, 8], far: [16, 36],
      tone: { lowShelf: [150, -1], mid: [2000, 0.8, 1.0], highShelf: [5200, -3.5] },
      ir: { length: 1.3, predelay: 0.007, taps: [[0.009, 0.28, 6200], [0.06, 0.16, 3600], [0.12, 0.08, 2400]], tail: { level: 0.05, rt: [0.8, 0.6, 0.35] } },
      room: { level: 0.1, cut: 1100 }, night: 0.95, roomTone: 0
    },
    plan: VG,
    cams: { circle: [0, 4.0, -10.4], far: [0, 2.2, -15.4], stage: [0, 2.8, 10.0] },
    frames: { far: { hor: 0.46, lens: 0.8 }, stage: { hor: 0.47, lens: 1.08 } },
    stage: { x0: -5.4, x1: 5.4, z: 13.8, h: 0.5, depth: 3.4, band: 'sheri', bandFront: 14.5, crowd: 4.2, fillX: 2.6 },
    dj: { x: 9.0, z: 12.4 },
    rings: [5.2, 8.8], pairs: 4, walkers: 18, couples: 2, kids: 8,
    garbo: 'bare',
    floorR: VG.floor,
    // the drone's view (View → Aerial), wide of the lounge pods
    aerialCam: { r: 20, h: 30 },
    ground: function (x, z, r) { return Math.hypot(x, z) < VG.floor - 0.9 - r; },
    // You can walk all of it: the floor, the garden round it, the paths, into the pods and up onto the band's deck
    walk: function (x, z) { return Math.hypot(x, z) < 23 || (Math.abs(x) < 1.6 && z < 0 && z > -26); },
    heightAt: function (x, z) { var S = this.stage; return x > S.x0 - 0.5 && x < S.x1 + 0.5 && z > S.z && z < S.z + S.depth + 0.3 ? S.h : 0; },
    bounds: [-9.6, 9.6, -9.6, 9.6], home: { x: 0, z: -9.6 },
    fill: { ring: 7.0, groups: [[-3.3, -8.8, 0.8], [3.2, -8.7, 0.75], [0.2, -9.5, 0.5, 2]] },
    follow: [5.6, 3.2], stageLine: [10.6, 4],
    drone: { lo: 8.4, hi: 10.2, k: 3, back: 11, dir: [0.2, 0.98] }, haze: 0.12, hazeFade: 1.0,
    echo: [[-15, 3, 'listener'], [15, 3, 'listener'], [0, 3, 20]],
    aerial: { ground: '#1a2414', floor: '#b8aac8' },
    sky2d: { stops: [[0, '#04061a'], [0.65, '#14123a'], [1, '#2a1a3a']], stars: 90, ground: ['#1a2414', '#0a0e08'] },
    // The plan for the map: the floor, the ring of posts, the trees, the pods, the path in
    map: function (out) {
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: VG.floor, s: 'edge' });
      for (var i = 0; i < VG.nPosts; i++) { var a = (i + 0.5) / VG.nPosts * Math.PI * 2; out.shapes.push({ k: 'ring', x: Math.cos(a) * VG.posts, z: Math.sin(a) * VG.posts, r: 0.2, s: 'post' }); out.shapes.push({ k: 'line', pts: [[Math.cos(a) * VG.posts, Math.sin(a) * VG.posts], [Math.cos(a) * 1.6, Math.sin(a) * 1.6]], s: 'faint' }); }
      VG.trees.forEach(function (t) { out.shapes.push({ k: 'ring', x: t[0], z: t[1], r: t[3] * 0.45, s: 'tree' }); });
      VG.pods.forEach(function (p) { out.shapes.push({ k: 'ring', x: p[0], z: p[1], r: 2.2, s: 'wall' }); });
      out.shapes.push({ k: 'line', pts: [[-1.2, -VG.floor], [-1.2, -24]], s: 'step' }); out.shapes.push({ k: 'line', pts: [[1.2, -VG.floor], [1.2, -24]], s: 'step' });
      seats.forEach(function (sf) { var c0 = Math.cos(sf.ry), s0 = Math.sin(sf.ry), h = sf.len / 2; out.shapes.push({ k: 'line', pts: [[sf.x - c0 * h, sf.z + s0 * h], [sf.x + c0 * h, sf.z - s0 * h]], s: 'step' }); });
    },
    seats: function (h) { return K.seats(h, seats, 0.62); },
    far: function (h) { K.far(h, seats, -13.34); },
    rest: function (h) { return K.rest(h, seats, VG.floor - 0.4); },
    back2d: function (h) {
      K.disc(h, VG.lounge + 3, '#1a2414'); K.disc(h, VG.floor, '#b8aac8');
      var S = this.stage;
      h.fillPoly([[S.x0, S.h, S.z], [S.x1, S.h, S.z], [S.x1, S.h, S.z + S.depth], [S.x0, S.h, S.z + S.depth]], '#6a4a2a');
    }
  };
})();
