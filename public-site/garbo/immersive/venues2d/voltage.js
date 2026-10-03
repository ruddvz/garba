/* Voltage Yard, as the 2D scene needs it. An industrial hall: brick walls with tall arched windows, steel columns, a
   sawtooth roof of trusses and skylights strung with neon; a mezzanine along both sides and across the near end with
   lounges on it; bars and lounges under it; a round LED dance floor in the middle of polished concrete; the stage at the
   far end with its LED wall and LED towers either side. From far off you stand at the near balcony's rail and look down
   over the floor. The 3D venue (venue3d/src/venues/voltage.js) is built from this plan. */
(function () {
  'use strict';
  var K = window.GarbaVenueKit;
  var VY = { floor: 15, x: 24, z0: -24, z1: 42, mezz: 17.6, deck: 5.4, balcony: -18.2, roof: 15.5 };
  // Lounges up on the side mezzanines (facing the floor) and down under them
  var seats = [];
  [-1, 1].forEach(function (sd) {
    for (var z = -12; z <= 26; z += 6.5) K.sofa(seats, sd * 20.1, z, sd < 0 ? Math.PI / 2 : -Math.PI / 2, 2.6, false, 'leather');
    for (var z2 = -9; z2 <= 21; z2 += 10) K.sofa(seats, sd * 21.6, z2, sd < 0 ? Math.PI / 2 : -Math.PI / 2, 2.6, false, 'leather');
  });
  // (the first lot are up on the mezzanine: they sit at its height)
  seats.forEach(function (sf, i) { sf.y = sf.x * sf.x < 21 * 21 ? VY.deck : 0; });
  VY.seats = seats;

  (window.GarbaVenueSpecs = window.GarbaVenueSpecs || {}).voltage = {
    label: 'Voltage Lab',
    // A big hall of brick and steel: a long bright reverb, a slap off the far wall, the roof's metal ringing a little
    sound: {
      desc: 'A warehouse of brick and steel. A long, bright reverb and a slap back off the far wall.',
      trim: 1, dry: 0.6, wet: 0.9, clappers: 55, spread: 0.014, distance: [2.5, 12], far: [20, 44],
      tone: { lowShelf: [150, 2], mid: [1200, 0.9, 1.2], highShelf: [6000, -1.5] },
      ir: { length: 3.8, predelay: 0.03, early: { count: 22, from: 0.02, to: 0.11, level: 0.65 }, taps: [[0.17, 0.32, 4200], [0.29, 0.18, 3200]], tail: { level: 0.22, rt: [2.6, 2.2, 1.5] } },
      room: { level: 0.09, cut: 800 }, night: 0, roomTone: 0.02
    },
    plan: VY,
    cams: { circle: [0, 4.6, -12.5], far: [0, 7.3, -20.4], stage: [0, 3.2, 23.2] },
    frames: { far: { hor: 0.2, lens: 0.74 } },
    // The stage is a full one: a deck, the band's riser, the LED wall behind them
    stage: { x0: -10, x1: 10, z: 30, h: 1.4, depth: 4.6, screenBottom: 2.4, screenTop: 10.6, truss: 12, arrays: 12.4, band: 'big', screen: true, crowd: 8, fillX: 3.7 },
    dj: { x: 15.4, z: 20 },
    rings: [5.6, 9.4, 13.2], pairs: 8, walkers: 26, couples: 3, kids: 10,
    garbo: 'bare',
    floorR: VY.floor,
    // the drone's view (View → Aerial)
    aerialCam: { r: 17, h: 12.4, cz: 5, hor: 0.1 },
    ground: function (x, z, r) { return Math.hypot(x, z) < VY.floor - 0.8 - r || (Math.abs(x) < 15 - r && z > 0 && z < 26 - r); },
    walk: function (x, z) { return Math.abs(x) < 17 && z > -17.6 && z < 28.4; },
    bounds: [-15, 15, -15, 26], home: { x: 0, z: -15 },
    fill: { ring: 7.7, groups: [[-9.2, -14.6, 1.4], [9.0, -14.4, 1.3], [0.3, -15.6, 0.55, 2]] },
    follow: [6.4, 3.6], stageLine: [24.6, 9],
    drone: { lo: 8, hi: 11, k: 3.5, back: 14, dir: [0.25, 0.97] }, haze: 0.2, hazeFade: 2,
    drop: [0.3, 9],
    echo: [[-24, 5, 'listener'], [24, 5, 'listener'], [0, 6, 42]],
    aerial: { ground: '#2a2830', floor: '#3a1a5a' },
    sky2d: { stops: [[0, '#05040c'], [1, '#1c1230']], stars: 0, ground: ['#24222a', '#0c0a10'] },
    // The mezzanines and the near balcony are 5.4 m up; everywhere else is the floor
    heightAt: function (x, z) { return Math.abs(x) > VY.mezz || z < VY.balcony ? VY.deck : 0; },
    // The plan for the map: the hall, the mezzanines and balcony, the columns, the LED floor
    map: function (out) {
      out.shapes.push({ k: 'poly', pts: [[-VY.x, VY.z0], [VY.x, VY.z0], [VY.x, VY.z1], [-VY.x, VY.z1]], s: 'wall' });
      [-1, 1].forEach(function (sd) { out.shapes.push({ k: 'line', pts: [[sd * VY.mezz, VY.z0], [sd * VY.mezz, VY.z1 - 6]], s: 'step' }); for (var z = VY.z0 + 3; z <= VY.z1 - 2; z += 6) out.shapes.push({ k: 'ring', x: sd * VY.mezz, z: z, r: 0.3, s: 'post' }); });
      out.shapes.push({ k: 'line', pts: [[-VY.mezz, VY.balcony], [VY.mezz, VY.balcony]], s: 'step' });
      out.shapes.push({ k: 'ring', x: 0, z: 0, r: VY.floor, s: 'edge' });
    },
    seats: function (h) {
      var out = K.seats(h, seats, 0.62);
      // (those up on the mezzanine sit at its height)
      out.forEach(function (se) { if (Math.abs(se.x) < 21) se.y = VY.deck + 0.45; });
      return out;
    },
    // From far off you stand at the near balcony's rail with the two of you, people along it either side
    far: function (h) {
      for (var x = -8; x <= 8; x += 0.62 + h.rnd() * 0.2) {
        if (Math.abs(x) < 3.2 || h.rnd() < 0.3) continue;
        h.out.push({ x: x, y: VY.deck, z: VY.balcony - 0.45 - h.rnd() * 0.3, kind: 'stand', who: h.person({ stander: true, phone: h.rnd() < 0.35, sway: h.rnd() * 6.3 }) });
      }
      ['w', 'm'].forEach(function (role) {
        var p = h.person({ stander: true, sway: h.rnd() * 6.3, man: role === 'm' }); p.seatRole = role;
        if (role === 'w') { p.col = '#8e1b2c'; p.top = '#d6a24a'; p.odhni = '#f3e6d0'; p.h = 1.62; } else { p.col = '#f3e6d0'; p.top = '#f3e6d0'; p.pagdi = '#8e1b2c'; p.stole = '#e8b04b'; p.h = 1.76; }
        h.out.push({ x: role === 'w' ? -1.15 : -0.5, y: VY.deck, z: VY.balcony - 0.42, kind: 'stand', who: p });
      });
    },
    rest: function (h) {
      if (h.rnd() < 0.4) { var sd = h.rnd() < 0.5 ? -1 : 1; return { x: sd * (15.6 + h.rnd() * 1.2), z: -10 + h.rnd() * 34 }; }
      var a = h.rnd() * Math.PI * 2; return { x: Math.cos(a) * 15.8, z: Math.sin(a) * 15.8 };
    },
    back2d: function (h) {
      h.fillPoly([[-24, 0, -24], [24, 0, -24], [24, 0, 42], [-24, 0, 42]], '#24222a');
      K.disc(h, VY.floor, '#3a1a5a');
      h.g.strokeStyle = 'rgba(255,80,220,.6)'; h.g.lineWidth = 1.5;
      [14.6, 10, 5].forEach(function (rr) { h.groundRing(0, 0, rr, 0, Math.PI * 2, 64); h.g.stroke(); });
      [-1, 1].forEach(function (sd) { h.fillPoly([[sd * 24, 0, -24], [sd * 24, 0, 42], [sd * 24, 15, 42], [sd * 24, 15, -24]], '#3a2420'); });
    }
  };
})();
