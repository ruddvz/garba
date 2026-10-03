// VRINDAVAN COURTYARD, built from the owner's starred references (research/venue-reference-pack, priority 6: zip-042 to
// zip-048) and the owner's brief (2026-10-02: Vrindavan's feel, the mandir, peacocks and their feathers): an old courtyard of
// sandstone under a sky full of stars. Worn, cracked flagstones and a round dance floor
// ringed in darker stone, the garbo bare on a low stone plinth with diyas round it; arcades of cusped arches on carved
// pillars down both sides and across the near end, painted borders of lotus and vine along their back walls (no
// figures), stone benches with jute mats and embroidered cushions, clay pots, brass lanterns hanging in the bays,
// torches on iron stands and rows of diyas along the plinths; chhatris on the corners; the gate in the middle of the
// near arcade, a carved portal with studded doors standing open and fire in brass bowls either side; the musicians on
// a stone platform at the far end and, across the open court behind them, the mandir, its spire traced in festival
// lights, a marigold toran and a big brass bell in its porch, tulsi on its chaura before the steps. Vrindavan's own
// signs, never a figure: peacocks perched on the parapets with their trains hanging and two in the temple's court
// with their fans open, fans of peacock feathers hung in every arch, borders of feathers and bansuris, kadamba trees
// in the far corners with their round golden flowers.
//
// The plan is the 2D scene's (venues2d/vrindavan.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, wrap, normalMap, tex } from '../floors.js';
import { ground, glowInto, glowStone } from './common.js';
import { newDecor, rugTexture, newWoods, barkTexture, leafTexture } from './decor.js';
import { sandstoneTexture, metreUV, arcade, shikhara, pillarGeo, torch, fireBowl, diyaRow, nightSky, mergeAll, portal } from './heritage.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const TORCH = '#ff9a4a';

/* ---------- the ground: flagstones of worn sandstone ---------- */
function flagstones(res) {
  const r = seeded(17), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#5a3c26'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  // slabs in running courses, each its own shade, the joints dark and sunk
  const rows = 5, rh = res / rows;
  for (let row = 0; row < rows; row++) {
    let x = -r() * res * 0.3;
    while (x < res) {
      const w = res * (0.18 + r() * 0.22), t = r(), col = `rgb(${Math.round(150 + t * 50)},${Math.round(104 + t * 36)},${Math.round(66 + t * 26)})`;
      wrap(res, res, x + w / 2, row * rh + rh / 2, Math.max(w, rh), (px, py) => { g.fillStyle = col; g.fillRect(px - w / 2 + 2, py - rh / 2 + 2, w - 4, rh - 4); hg.fillStyle = '#9a9a9a'; hg.fillRect(px - w / 2 + 2, py - rh / 2 + 2, w - 4, rh - 4); });
      x += w;
    }
  }
  // wear and grime, and cracks wandering across the slabs
  for (let i = 0; i < 60; i++) { const x = r() * res, y = r() * res, rr = 20 + r() * 90; wrap(res, res, x, y, rr, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, r() < 0.5 ? 'rgba(40,24,12,.22)' : 'rgba(255,220,170,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2); }); }
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) { let x = r() * res, y = r() * res, a = r() * TAU; g.strokeStyle = 'rgba(30,16,8,.55)'; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += Math.cos(a) * 14; y += Math.sin(a) * 14; a += (r() - 0.5) * 1.2; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 12000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,230,190,.05)' : 'rgba(20,10,4,.07)'; g.fillRect(r() * res, r() * res, 1.5, 1.5); }
  return { map: tex(c, [60 / 4.8, 60 / 4.8]), normal: tex(normalMap(hc, 2.2), [60 / 4.8, 60 / 4.8], true) };
}
// The dance floor's ring of darker red stone, a band of carved lotus, the stone round the garbo's plinth
function floorDecal(rect, res, VR) {
  const c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k, R = VR.floor;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  const ring = (r0, r1, col) => { g.fillStyle = col; g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.arc(0, 0, r0, 0, TAU, true); g.fill('evenodd'); };
  ring(R - 0.05, R + 0.75, 'rgba(110,52,30,.85)');
  ring(R - 0.75, R - 0.05, 'rgba(150,84,46,.55)');
  g.strokeStyle = 'rgba(70,30,14,.7)'; g.lineWidth = 0.05;
  for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; g.save(); g.rotate(a); g.beginPath(); g.ellipse(R - 0.4, 0, 0.26, 0.13, 0, 0, TAU); g.stroke(); g.restore(); }
  [R + 0.75, R - 0.75, R - 0.05].forEach((rr) => { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); });
  // a star of slabs round the plinth
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.fillStyle = i % 2 ? 'rgba(170,110,64,.5)' : 'rgba(120,64,36,.5)'; g.beginPath(); g.moveTo(Math.cos(a - 0.2) * 1.6, Math.sin(a - 0.2) * 1.6); g.lineTo(Math.cos(a) * 3.4, Math.sin(a) * 3.4); g.lineTo(Math.cos(a + 0.2) * 1.6, Math.sin(a + 0.2) * 1.6); g.closePath(); g.fill(); }
  g.restore();
  return c;
}
// A painted border on an arcade's back wall, as Vrindavan paints them: peacock feathers and bansuris on ochre between
// bands of vermilion and indigo (no figures)
function borderTexture(seed) {
  const r = seeded(seed);
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#c89a5a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(90,40,20,.18)'; for (let i = 0; i < 400; i++) g.fillRect(r() * w, r() * h, 2, 2);
    g.fillStyle = '#7a2a18'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.fillStyle = '#2a3a6a'; g.fillRect(0, 12, w, 6); g.fillRect(0, h - 18, w, 6);
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.5) / 4 * w;
      if (i % 2) {
        // a bansuri lying across, its holes, a tassel
        g.strokeStyle = '#6a3a14'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 26, h / 2 + 8); g.lineTo(x + 26, h / 2 - 8); g.stroke();
        g.fillStyle = '#2a1408'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x - 12 + k * 7, h / 2 + 3.5 - k * 2.1, 1.3, 0, TAU); g.fill(); }
        g.strokeStyle = '#c8302a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 20, h / 2 + 7); g.lineTo(x - 24, h / 2 + 22); g.stroke();
      } else featherAt(g, x, h / 2 + 30, -Math.PI / 2 + (r() - 0.5) * 0.3, 48);
    }
  });
}
// One peacock feather (mor pankh) drawn on a canvas: its quill from (x, y) along angle a, `len` long, the eye at its tip
function featherAt(g, x, y, a, len) {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a);
  g.strokeStyle = '#8a7a3a'; g.lineWidth = Math.max(1, len * 0.03); g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  g.lineWidth = Math.max(0.6, len * 0.012);
  for (let t = 0.12; t < 0.86; t += 0.035) { const px = x + Math.cos(a) * len * t, py = y + Math.sin(a) * len * t, bl = len * (0.08 + 0.16 * t); g.strokeStyle = t > 0.6 ? 'rgba(60,140,80,.85)' : 'rgba(140,130,60,.75)'; g.beginPath(); g.moveTo(px, py); g.lineTo(px + nx * bl + Math.cos(a) * bl * 0.6, py + ny * bl + Math.sin(a) * bl * 0.6); g.moveTo(px, py); g.lineTo(px - nx * bl + Math.cos(a) * bl * 0.6, py - ny * bl + Math.sin(a) * bl * 0.6); g.stroke(); }
  const R = len * 0.2;
  [[1, '#3a8a3a'], [0.82, '#c8a040'], [0.62, '#2ab8a8'], [0.42, '#1a2a8a'], [0.22, '#0a0e30']].forEach(([k, c]) => { g.fillStyle = c; g.beginPath(); g.ellipse(ex - Math.cos(a) * R * 0.15 * (1 - k), ey - Math.sin(a) * R * 0.15 * (1 - k), R * k, R * k * 0.8, a + Math.PI / 2, 0, TAU); g.fill(); });
}
function featherTexture() { return canvasTexture(64, 256, (g, w, h) => { g.clearRect(0, 0, w, h); featherAt(g, w / 2, h - 4, -Math.PI / 2, h - 22); }); }
// A peacock's train hanging from its perch: many feathers, eyes in rows down it
function trainTexture() {
  return canvasTexture(128, 384, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 36; k++) { const x = w * (0.2 + 0.6 * ((k * 37) % 36) / 36), len = h * (0.55 + 0.4 * ((k * 13) % 9) / 9); featherAt(g, x, 6, Math.PI / 2 + (x / w - 0.5) * 0.5, len); } });
}
// A peacock's fan, open: feathers radiating from the middle of its foot, their eyes in rows round the edge
function fanTexture() {
  return canvasTexture(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); const cx = w / 2, cy = h * 0.98; for (let ring = 0; ring < 3; ring++) for (let k = 0; k <= 28; k++) { const a = Math.PI + (k / 28) * Math.PI + (ring % 2) * 0.05, len = h * (0.92 - ring * 0.2); featherAt(g, cx, cy, a, len); } });
}

/* ---------- a peacock ----------
   Its blue body and neck, its crest, and either its train draped from a perch (display false) or its fan spread
   behind it (display true); faces ry. Built from a few meshes in a group. */
function peacock(kit, root, x, y, z, ry, s, display, mats) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); root.add(g);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mats.blue); body.scale.set(0.15, 0.13, 0.26); body.position.set(0, display ? 0.48 : 0.12, 0); g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 0.34, 10), mats.neck); neck.position.set(0, (display ? 0.48 : 0.12) + 0.2, 0.2); neck.rotation.x = 0.35; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mats.neck); head.position.set(0, (display ? 0.48 : 0.12) + 0.38, 0.27); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.07, 6), mats.beak); beak.rotation.x = Math.PI / 2; beak.position.set(0, (display ? 0.48 : 0.12) + 0.37, 0.34); g.add(beak);
  for (let k = -1; k <= 1; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), mats.neck); c.position.set(k * 0.02, (display ? 0.48 : 0.12) + 0.5, 0.25 - Math.abs(k) * 0.01); g.add(c); }
  const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mats.wing); wing.scale.set(0.155, 0.1, 0.2); wing.position.set(0, (display ? 0.5 : 0.14), -0.06); g.add(wing);
  if (display) {
    const fan = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), mats.fan); fan.position.set(0, 0.48 + 1.12 - 0.04, -0.22); fan.rotation.x = -0.12; g.add(fan);
    [-0.05, 0.05].forEach((lx) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 5), mats.leg); leg.position.set(lx, 0.2, 0); g.add(leg); });
  } else {
    const train = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.55), mats.train); train.position.set(0, 0.06 - 0.75, -0.3); g.add(train);
  }
  return g;
}

/* ---------- the venue ---------- */
function vrindavan(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, VR = sp.plan, S = sp.stage, D = newDecor(kit, root);
  const stone = [], sources = [], glow = { value: 1 };
  const src = (x, y, z, hex, k, reach) => sources.push({ x, y, z, r: reach, c: new THREE.Color(hex).multiplyScalar(k) });
  const add = (geo, m) => { const g2 = geo.index ? geo.toNonIndexed() : geo; if (m) g2.applyMatrix4(m); g2.deleteAttribute('color'); stone.push(g2); };
  const M = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  const iron = std('#1c1814', 0.6, 0.6);

  const fs = flagstones(phone ? 512 : 1024), decalRect = { cx: 0, cz: 2, w: 44, d: 44 };
  const floorMesh = ground(root, { map: fs.map, normalMap: fs.normal, normalScale: 0.5, roughness: 0.88, decal: floorDecal(decalRect, phone ? 1024 : 2048, VR), decalRect }, 90, 90, 6, tier.shadows);

  /* the garbo's plinth: an octagon of stone, two steps, diyas round its edge */
  [[1.5, 0.16], [1.15, 0.3]].forEach(([rr, h]) => add(metreUV(new THREE.CylinderGeometry(rr, rr, h, 8), 2.4), M(0, h / 2, 0, Math.PI / 8)));
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * TAU; kit.flames.add(Math.cos(a) * 1.36, 0.17, Math.sin(a) * 1.36, { s: 0.045, k: 0.8 }); }

  /* the arcades: both sides, and the near end either side of the gate; the far end either side of the court */
  const lamps = [], bays = [];
  const run = (p0, p1, n, o) => { const a = arcade(stone, p0, p1, n, Object.assign({ h: 4.4, spring: 2.5, rise: 1.25, back: 3.2 }, o)); a.bays.forEach((b) => bays.push(Object.assign({ out: a.n }, b))); return a; };
  run([-VR.arcX, VR.arcZ0], [-VR.arcX, VR.arcZ1], 10);
  run([VR.arcX, VR.arcZ1], [VR.arcX, VR.arcZ0], 10);
  run([VR.arcX, VR.nearZ], [VR.gate, VR.nearZ], 4);
  run([-VR.gate, VR.nearZ], [-VR.arcX, VR.nearZ], 4);
  run([-VR.arcX, VR.farZ], [-VR.opening, VR.farZ], 3);
  run([VR.opening, VR.farZ], [VR.arcX, VR.farZ], 3);
  // the corners closed with solid piers, a chhatri on each: four pillars, a dome and a kalash
  const pg = pillarGeo(2.1, 0.13);
  [[-VR.arcX, VR.nearZ], [VR.arcX, VR.nearZ], [-VR.arcX, VR.farZ], [VR.arcX, VR.farZ]].forEach(([x, z]) => {
    const ox = Math.sign(x) * 1.6, oz = Math.sign(z) * 1.6;
    add(metreUV(new THREE.BoxGeometry(3.6, 5.6, 3.6), 2.4), M(x + ox, 2.8, z + oz));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => add(pg.clone(), M(x + ox + a * 1.2, 5.6, z + oz + b * 1.2)));
    add(metreUV(new THREE.BoxGeometry(3.2, 0.25, 3.2), 2.4), M(x + ox, 7.8, z + oz));
    add(metreUV(new THREE.SphereGeometry(1.45, 16, 8, 0, TAU, 0, Math.PI / 2), 2.4), M(x + ox, 7.9, z + oz, 0, 1, 1.15, 1));
    add(new THREE.ConeGeometry(0.18, 0.7, 8), M(x + ox, 9.7, z + oz));
    src(x + ox, 8.5, z + oz, '#ffd09a', 0.25, 4);
  });
  // in each bay: a brass lantern hanging from the arch, a painted border on the back wall, and (every other bay) a
  // torch before the pillar
  const borders = [borderTexture(3), borderTexture(5)].map((t) => kit.litMap(t, 0.14, 'practical'));
  bays.forEach((b, i) => {
    const hx = b.x + b.nx * 1.4, hz = b.z + b.nz * 1.4;
    kit.wires.line([hx, 4.15, hz], [hx, 3.1, hz]); D.lantern(hx, 2.75, hz, 0.85); src(hx, 3, hz, LIGHT.tungsten, 0.4, 3.6);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), borders[i % 2]); wall.position.set(b.x + b.nx * 3.2, 2.7, b.z + b.nz * 3.2); wall.rotation.y = Math.atan2(-b.nx, -b.nz); root.add(wall);
    if (i % 2 === 0) { const tx = b.x - b.nx * 0.95, tz = b.z - b.nz * 0.95; torch(kit, root, iron, tx, tz); src(tx, 2.2, tz, TORCH, 0.9, 5); kit.pools.add(tx, 0.02, tz, 3.2, 3.2, TORCH, 0.12, { layer: 'flame' }); }
    // diyas along the plinth's edge
    diyaRow(kit, [b.x - b.nx * 0.42 - b.nz * 1.2, 0.36, b.z - b.nz * 0.42 + b.nx * 1.2], [b.x - b.nx * 0.42 + b.nz * 1.2, 0.36, b.z - b.nz * 0.42 - b.nx * 1.2], 0.6, 0.04);
  });

  /* mor pankh: a fan of peacock feathers hung in each arch, eyes down */
  const feathers = [];
  bays.forEach((b) => { for (let k = -2; k <= 2; k++) feathers.push([b.x - b.nx * 0.05, 3.95, b.z - b.nz * 0.05, Math.atan2(-b.nx, -b.nz), Math.PI + k * 0.22]); });
  if (feathers.length) {
    const fg = new THREE.PlaneGeometry(0.18, 0.7); fg.translate(0, 0.35, 0);
    const fm = new THREE.InstancedMesh(fg, kit.selfLit(new THREE.MeshStandardMaterial({ map: featherTexture(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.5 }), 0.2, 'practical'), feathers.length), q = new THREE.Quaternion(), e = new THREE.Euler(), mx2 = new THREE.Matrix4();
    feathers.forEach(([x, y, z, ry, roll], i) => fm.setMatrixAt(i, mx2.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, ry, roll, 'YXZ')), new THREE.Vector3(1, 1, 1))));
    root.add(fm);
  }

  /* peacocks: perched on the parapets with their trains hanging down the arcade's face, and two in the temple's court
     with their fans open */
  const pmats = {
    blue: std('#1648b8', 0.32, 0.35), neck: std('#1a62d8', 0.3, 0.4), beak: std('#c8b890', 0.6), wing: std('#6a5a3a', 0.7), leg: std('#8a8a8a', 0.6),
    train: kit.selfLit(new THREE.MeshStandardMaterial({ map: trainTexture(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.45 }), 0.18, 'architectural'),
    fan: kit.selfLit(new THREE.MeshStandardMaterial({ map: fanTexture(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.45 }), 0.22, 'architectural')
  };
  const parapet = 4.4 + 0.85;
  // (each faces out over the parapet, so its train hangs down the side towards the court)
  [[-VR.arcX, -7.5, -Math.PI / 2], [-VR.arcX, 9.5, -Math.PI / 2], [VR.arcX, -2.5, Math.PI / 2], [VR.arcX, 13.5, Math.PI / 2], [-11.5, VR.farZ, 0], [11.5, VR.farZ, 0]].forEach(([x, z, ry]) => peacock(kit, root, x, parapet, z, ry, 1.3, false, pmats));
  [[-6.8, VR.temple[1] - 8.6, -0.25], [6.8, VR.temple[1] - 8.6, 0.25]].forEach(([x, z, ry]) => { peacock(kit, root, x, 0, z, Math.PI + ry, 1.15, true, pmats); src(x, 1.2, z - 1.2, '#ffd8a0', 0.3, 3); kit.pools.add(x, 0.02, z - 0.6, 1.8, 1.8, '#ffcf8a', 0.08, { layer: 'architectural' }); });

  /* kadamba trees in the far corners of the court, their round golden flowers, bells and lamps hung in them */
  const woods = newWoods(), ktips = [];
  [[-12.4, 17.4, 0.6], [12.6, 17.2, 2.5]].forEach(([x, z, dir]) => woods.tree(r, x, z, 6.2, 9, dir, { trunk: 0.7, branches: phone ? 5 : 7, leaves: phone ? 6 : 9, rise: 1.6 }).forEach((p) => ktips.push(p)));
  const kleaf = kit.selfLit(new THREE.MeshStandardMaterial({ map: leafTexture(['#1e3a1a', '#2c4c20', '#3e6228', '#16301a', '#4a6a2a'], 29), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }), 0.1, 'practical');
  woods.build(root, new THREE.MeshStandardMaterial({ map: barkTexture(7, ['#4a3a2a', '#6a5a46']), roughness: 0.9 }), kleaf, ['#ffd08a', '#ffe8b0']);
  const balls = []; ktips.forEach((p, i) => { if (i % 2) return; for (let k = 0; k < 3; k++) balls.push([p[0] + (r() - 0.5) * 1.6, p[1] + 0.2 + r() * 1.2, p[2] + (r() - 0.5) * 1.6]); if (i % 6 === 0 && p[1] > 3.5) { kit.wires.line(p, [p[0], p[1] - 0.6, p[2]]); D.bell(p[0], p[1] - 0.6, p[2], 1.3); } if (i % 6 === 2 && p[1] > 3.5) { kit.wires.line(p, [p[0], p[1] - 0.9, p[2]]); kit.bigBulbs.add(p[0], p[1] - 1.0, p[2], 0, { color: '#ffc47a', k: 0.9, s: 0.45, twinkle: 0.1, layer: 'practical' }); } });
  if (balls.length) { const bm2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 1), kit.glow('#f0a82a', 0.75, 'practical'), balls.length), mb = new THREE.Matrix4(); balls.forEach(([x, y, z], i) => bm2.setMatrixAt(i, mb.makeTranslation(x, y, z))); root.add(bm2); }

  /* tulsi on its chaura before the temple's steps, a diya on each */
  const tulsi = [];
  [[-4.6, VR.temple[1] - 11.8], [4.6, VR.temple[1] - 11.8]].forEach(([x, z]) => {
    add(metreUV(new THREE.BoxGeometry(1.1, 0.45, 1.1), 2.4), M(x, 0.225, z)); add(metreUV(new THREE.BoxGeometry(0.8, 0.55, 0.8), 2.4), M(x, 0.72, z));
    for (let k = 0; k < 9; k++) tulsi.push([x + (r() - 0.5) * 0.45, 1.1 + r() * 0.5, z + (r() - 0.5) * 0.45, 0.16 + r() * 0.08]);
    kit.flames.add(x + 0.32, 1.0, z - 0.32, { s: 0.05, k: 0.9 }); src(x, 1.2, z, TORCH, 0.4, 2.5);
  });
  { const tm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std('#2e5a24', 0.8), tulsi.length), mt = new THREE.Matrix4(); tulsi.forEach(([x, y, z, sz], i) => tm.setMatrixAt(i, mt.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sz, sz * 1.2, sz)))); root.add(tm); }

  /* the gate: a carved portal in the near arcade, studded doors of dark wood standing open, fire either side */
  portal(kit, root, add, M, VR.nearZ, VR.gate, 7.2).forEach(([x, y, z]) => src(x, y, z, TORCH, 1.0, 6));

  /* the musicians' platform: two steps of stone up to it, a durrie, lanterns at its corners */
  const st = new THREE.Group(); root.add(st);
  const zB = S.z + S.depth;
  add(metreUV(new THREE.BoxGeometry(S.x1 - S.x0, S.h, S.depth), 2.4), M((S.x0 + S.x1) / 2, S.h / 2, S.z + S.depth / 2));
  add(metreUV(new THREE.BoxGeometry(S.x1 - S.x0 - 1, S.h / 2, 0.5), 2.4), M((S.x0 + S.x1) / 2, S.h / 4, S.z - 0.25));
  D.rug((S.x0 + S.x1) / 2, S.z + 1.6, S.x1 - S.x0 - 0.6, 2.4, 0, rugTexture('stripe', ['#7a1a14', '#1e3a6a', '#d6a64a', '#f0e0c0']), S.h + 0.006);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#ffb050' });
  [S.x0 + 0.3, S.x1 - 0.3].forEach((x) => { D.lantern(x, S.h, S.z + 0.25, 1); src(x, S.h + 0.5, S.z + 0.25, LIGHT.tungsten, 0.4, 3); });
  kit.pools.add(0, 0.02, S.z - 1.6, 4.5, 2.4, LIGHT.warm, 0.12, { layer: 'show' });
  diyaRow(kit, [S.x0 + 0.2, S.h, S.z + 0.08], [S.x1 - 0.2, S.h, S.z + 0.08], 0.45, 0.04);

  /* the temple across the open court behind the band: its spire lit from below, a flag on top, diyas on its steps */
  const tp = shikhara(stone, VR.temple, Math.PI, 1.05);
  tp.faces.forEach((p) => src(p.x, p.y, p.z, '#ffb070', 1.1, 9));
  [[-3.8, VR.temple[1] - 9.6], [3.8, VR.temple[1] - 9.6]].forEach(([x, z]) => { torch(kit, root, iron, x, z, 2.2); src(x, 2.4, z, TORCH, 1.0, 7); });
  diyaRow(kit, [-5, 0.52, VR.temple[1] - 6.2], [5, 0.52, VR.temple[1] - 6.2], 0.4, 0.045);
  diyaRow(kit, [-4.2, 1.02, VR.temple[1] - 5.6], [4.2, 1.02, VR.temple[1] - 5.6], 0.4, 0.045);
  kit.pools.add(0, tp.J + 6, VR.temple[1] - 5.5, 4.5, 6, '#ffb070', 0.18, { vertical: true, ry: Math.PI, layer: 'architectural' });
  // festival lights traced up the spire: a ring at every storey, and lines up its four ridges
  { const sT = 1.05, R = 3.4 * sT, H = 13 * sT, y0 = tp.J + 3.6 * sT, cx = VR.temple[0], cz = VR.temple[1] + 1.2 * sT;
    const rad = (v, a) => R * (Math.pow(1 - Math.pow(v, 1.5), 0.85) * 0.92 + 0.08) * (1 + 0.16 * Math.pow(Math.abs(Math.cos(2 * a)), 4) - 0.06 * Math.pow(Math.abs(Math.sin(4 * a)), 2)) * 1.07;
    for (let k = 1; k <= 8; k++) { const v = k / 9; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; kit.bulbs.add(cx + Math.cos(a) * rad(v, a), y0 + v * H, cz + Math.sin(a) * rad(v, a), i + k, { color: k % 2 ? '#ffd27a' : '#ffb04a', k: 0.75, s: 0.55, twinkle: 0.25, layer: 'festive' }); } }
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; for (let v = 0.02; v < 0.97; v += 0.035) kit.bulbs.add(cx + Math.cos(a) * rad(v, a), y0 + v * H, cz + Math.sin(a) * rad(v, a), q * 40 + Math.round(v * 30), { color: '#fff0c8', k: 0.85, s: 0.55, twinkle: 0.3, layer: 'festive' }); }
    // round the porch's roof
    for (let i = 0; i <= 20; i++) { const t = i / 20; kit.bulbs.add(cx + lerp(-2.8, 2.8, t) * sT, tp.J + 3.7 * sT, VR.temple[1] - 4.4 * sT - 1.8 * sT, i, { color: '#ffd27a', k: 0.75, s: 0.55, twinkle: 0.2, layer: 'festive' }); }
  }
  // a toran of marigolds across the porch, a big brass bell hanging in it
  { const zf = VR.temple[1] - 5.6 * 1.05 - 0.4, y = tp.J + 3.2; const pts = [];
    for (let x = -2.3; x <= 2.3; x += 0.09) pts.push([x, y - 0.35 * (1 - Math.pow(x / 2.3, 2)), zf]);
    for (let x = -2.2; x <= 2.2; x += 0.55) for (let d = 0.1; d < 0.7; d += 0.085) pts.push([x, y - 0.35 * (1 - Math.pow(x / 2.3, 2)) - d, zf]);
    const mm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), std('#ffffff', 0.85), pts.length), mt = new THREE.Matrix4(), c = new THREE.Color(); pts.forEach(([px, py, pz], i) => { mm.setMatrixAt(i, mt.makeTranslation(px, py, pz)); mm.setColorAt(i, c.set(i % 4 === 1 ? '#ffd24a' : '#f08a1a')); }); root.add(mm);
    kit.wires.line([0, tp.J + 3.4, zf + 1.4], [0, tp.J + 2.4, zf + 1.4]); D.bell(0, tp.J + 2.4, zf + 1.4, 3.2);
  }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), std('#e8601a', 0.8, 0, { side: THREE.DoubleSide })); flag.position.set(tp.top.x + 0.7, tp.top.y + 1.3, tp.top.z); root.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), iron); pole.position.set(tp.top.x, tp.top.y + 0.9, tp.top.z); root.add(pole);
  // the court round the temple: a low wall with a coping
  [[-14, VR.farZ + 3, -14, 46], [14, VR.farZ + 3, 14, 46], [-14, 46, 14, 46]].forEach(([x0, z0, x1, z1]) => { const len = Math.hypot(x1 - x0, z1 - z0); add(metreUV(new THREE.BoxGeometry(len, 1.6, 0.5), 2.4), M((x0 + x1) / 2, 0.8, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2)); });

  /* the benches under the side arcades: jute mats, cushions, a clay pot at each end; the near rows */
  const pots = [];
  (VR.seats || []).forEach((sf) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#b88a5a', seat: '#b89a6a', cushions: ['#8a1e1a', '#c27a1a', '#2a3a6a', '#6a1a3a'] });
    if (!sf.near) { const tx = Math.cos(sf.ry), tz = -Math.sin(sf.ry); pots.push([sf.x + tx * (sf.len / 2 + 0.35), sf.z + tz * (sf.len / 2 + 0.35)]); }
  });
  if (pots.length) {
    const pot = new THREE.LatheGeometry([[0, 0], [0.16, 0.02], [0.27, 0.18], [0.25, 0.36], [0.12, 0.48], [0.1, 0.52], [0.13, 0.56]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
    const pm = new THREE.InstancedMesh(pot, std('#9a4a26', 0.82), pots.length), mx = new THREE.Matrix4();
    pots.forEach(([x, z], i) => pm.setMatrixAt(i, mx.makeTranslation(x, 0.36, z))); root.add(pm);
  }
  // diyas round the floor's edge
  for (let i = 0; i < 40; i++) { const a = (i + 0.5) / 40 * TAU; kit.flames.add(Math.cos(a) * (VR.floor + 0.4), 0.01, Math.sin(a) * (VR.floor + 0.4), { s: 0.045, k: 0.75 }); }
  /* beyond the courtyard: the old town, flat roofs, domes and small temple spires among trees, hills at the horizon */
  const inCourt = (x, z) => Math.abs(x) < VR.arcX + 6 && z > VR.nearZ - 6 && z < 50;
  townBelt(kit, root, { r0: 26, r1: 120, n: phone ? 140 : 300, style: 'old', seed: 91, skip: inCourt, wall: '#4a3a2a' });
  forestBelt(kit, root, { r0: 28, r1: 110, n: phone ? 150 : 320, h: [7, 13], seed: 93, tones: ['#1a2a16', '#20321a', '#162414'], skip: inCourt });
  horizonRidge(root, { radius: 300, base: -4, height: 28, seed: 15, cols: ['#06060c', '#14121c'] });
  D.finish();

  /* all the stone as one mesh, the light of the torches and lanterns baked into it */
  const geo = mergeAll(stone); glowInto(geo, sources);
  const stoneMesh = new THREE.Mesh(geo, glowStone({ map: (() => { const t = sandstoneTexture(['#d8aa70', '#a8743e'], 7, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })(), roughness: 0.86 }, glow, 'sandstone'));
  stoneMesh.castShadow = !phone; stoneMesh.receiveShadow = !!tier.shadows; root.add(stoneMesh);

  const rig = {
    hemi: ['#3a3a5a', '#3a2010', 0.4, 0.62], moon: 1,
    spots: [{ pos: [-8, 18, -10], to: [0, 0, 4], color: '#c8d0ff', base: 26, distance: 50, angle: 0.62, layer: 'key' }, { pos: [0, 5.5, S.z - 4.5], to: [0, S.h + 1.1, S.z + 1.6], color: '#ffe0b8', base: 70, distance: 14, angle: 0.6, layer: 'show' }],
    points: [{ pos: [-12, 3, 0], color: TORCH, base: 34, distance: 14, layer: 'flame' }, { pos: [12, 3, 0], color: TORCH, base: 34, distance: 14, layer: 'flame' }, { pos: [0, 3, -15], color: TORCH, base: 26, distance: 12, layer: 'flame' }, { pos: [0, 8, VR.temple[1] - 8], color: '#ffb070', base: 40, distance: 18, layer: 'architectural' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#1a1420', 0.008), exposure: 1.0,
    update(t, ctx) { glow.value = 0.85 * (0.35 + 0.65 * Math.max(ctx.lv.flame || 0, ctx.lv.practical || 0)); }
  };
}
export default { seed: 909, sky: nightSky, garbo: 'bare', garboK: 8, build: vrindavan };
