// JYOT CHOWK, built from the owner's starred references (research/venue-reference-pack, priority 10: the plan
// zip-057, zip-058, zip-087, zip-090, zip-107, zip-109, zip-112, zip-121, zip-134, zip-158 and the concept board): a
// courtyard of cream stone lit by thousands of diyas. A round floor inlaid with a stone mandala in terracotta and
// teal; raised terraces down both sides and across the near end, their edges lined with diyas and carved lotus-bud
// lamps on pedestals; cusped arcades behind them; round mandala lanterns in pink, green, teal and saffron hung on wires
// strung between tall poles over the courtyard, and star kandils with tassels along the terraces; velvet sofas round
// the floor with brass bowls of flowers; the musicians on a platform before the deepstambh, a tower of stone with a
// lamp on every bracket up its height (the owner's change of 2026-10-02: no mandir behind the band), a smaller one
// either side, and across the back a wall of jharokhas with a diya in each; the gate in the near terrace hung with
// marigolds, its carved doors open, fire either side. Sacred figures are left out: the lanterns, the inlay and the
// carving are pattern.
//
// The plan is the 2D scene's (venues2d/jyot.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, wrap, normalMap, tex } from '../floors.js';
import { ground, glowInto, glowStone, DISCS, discTexture } from './common.js';
import { newDecor, rugTexture } from './decor.js';
import { sandstoneTexture, metreUV, arcade, diyaRow, nightSky, mergeAll, portal } from './heritage.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const GOLD = '#ffc070';

/* ---------- textures ---------- */
// Cream stone in big square slabs, each a shade apart, the joints fine
function slabs(res) {
  const r = seeded(23), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#8a7656'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  const n = 4, w = res / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const t = r(); g.fillStyle = `rgb(${Math.round(200 + t * 30)},${Math.round(182 + t * 26)},${Math.round(146 + t * 22)})`; g.fillRect(i * w + 1.5, k * w + 1.5, w - 3, w - 3); hg.fillStyle = '#9a9a9a'; hg.fillRect(i * w + 1.5, k * w + 1.5, w - 3, w - 3); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,245,225,.06)' : 'rgba(80,60,30,.06)'; g.fillRect(r() * res, r() * res, 1.5, 1.5); }
  for (let i = 0; i < 30; i++) { const x = r() * res, y = r() * res, rr = 30 + r() * 80; wrap(res, res, x, y, rr, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, 'rgba(110,80,40,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2); }); }
  return { map: tex(c, [70 / 4.8, 70 / 4.8]), normal: tex(normalMap(hc, 1.4), [70 / 4.8, 70 / 4.8], true) };
}
// The floor's mandala in stone mosaic: a border of terracotta and teal, a ring of petals, a lattice of diamonds, a lotus
// at the middle round the garbo
function floorDecal(rect, res, R) {
  const c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  const TERRA = '#a8502a', TEAL = '#2a7a78', CREAM = '#ecdcb8', INK = 'rgba(70,40,20,.85)';
  const disc = (rr, col) => { g.fillStyle = col; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill(); };
  disc(R + 0.6, TEAL); disc(R + 0.3, CREAM); disc(R, TERRA); disc(R - 0.35, CREAM);
  for (let i = 0; i < 96; i++) { const a = i / 96 * TAU; g.fillStyle = i % 2 ? TEAL : TERRA; g.save(); g.rotate(a); g.fillRect(R + 0.32, -0.08, 0.24, 0.16); g.restore(); }
  const petals = (n, r0, r1, w, fill, rot = 0) => { for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; g.save(); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, w, r0 + (r1 - r0) * 0.75, w * 0.6, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.75, -w * 0.6, r0 + (r1 - r0) * 0.3, -w, r0, 0); g.fillStyle = fill; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.04; g.stroke(); g.restore(); } };
  petals(32, R - 2.6, R - 0.45, 0.85, TERRA); petals(32, R - 2.3, R - 0.9, 0.4, TEAL, TAU / 64);
  g.strokeStyle = INK; g.lineWidth = 0.05; g.beginPath(); g.arc(0, 0, R - 2.65, 0, TAU); g.stroke();
  // the lattice of diamonds between the rings
  g.save(); g.beginPath(); g.arc(0, 0, R - 2.7, 0, TAU); g.arc(0, 0, 3.2, 0, TAU, true); g.clip('evenodd');
  for (let x = -R; x < R; x += 1.1) for (let z = -R; z < R; z += 1.1) { g.fillStyle = (Math.round(x / 1.1) + Math.round(z / 1.1)) % 2 ? 'rgba(168,80,42,.35)' : 'rgba(42,122,120,.3)'; g.beginPath(); g.moveTo(x, z - 0.5); g.lineTo(x + 0.5, z); g.lineTo(x, z + 0.5); g.lineTo(x - 0.5, z); g.closePath(); g.fill(); }
  g.restore();
  g.beginPath(); g.arc(0, 0, 3.2, 0, TAU); g.stroke();
  petals(16, 1.4, 3.1, 0.7, TERRA); petals(16, 1.5, 2.6, 0.35, TEAL, TAU / 32);
  disc(1.4, CREAM); g.beginPath(); g.arc(0, 0, 1.4, 0, TAU); g.stroke();
  g.restore();
  return c;
}
// A round lantern's face: rings of petals, triangles and dots in its colours, a pale centre, pierced dots round the rim

/* ---------- the venue ---------- */
function jyot(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, DJ = sp.plan, S = sp.stage, D = newDecor(kit, root);
  const stone = [], sources = [], glow = { value: 1 };
  const src = (x, y, z, hex, k, reach) => sources.push({ x, y, z, r: reach, c: new THREE.Color(hex).multiplyScalar(k) });
  const add = (geo, m) => { const g2 = geo.index ? geo.toNonIndexed() : geo; if (m) g2.applyMatrix4(m); g2.deleteAttribute('color'); stone.push(g2); };
  const M = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  const box = (x0, y0, z0, x1, y1, z1) => add(metreUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), 2.4), M((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));

  const sl = slabs(phone ? 512 : 1024), decalRect = { cx: 0, cz: 0, w: 26, d: 26 };
  const floorMesh = ground(root, { map: sl.map, normalMap: sl.normal, normalScale: 0.35, roughness: 0.6, decal: floorDecal(decalRect, phone ? 1024 : 2048, DJ.floor), decalRect }, 100, 100, 8, tier.shadows);
  floorMesh.material.userData.env = 0.5;

  /* the terraces: a step and the terrace above it down both sides and across the near end (the gate's gap in it) */
  const T = DJ.terrH, X = DJ.terrX, AX = DJ.arcX, NZ = DJ.terrNear, AN = DJ.arcNear, FZ = DJ.farZ, edges = [];
  [-1, 1].forEach((sd) => {
    const x0 = sd > 0 ? X : -AX, x1 = sd > 0 ? AX : -X;
    box(x0, 0, NZ, x1, T, FZ); box(sd > 0 ? X - 0.5 : -X, 0, NZ, sd > 0 ? X : -X + 0.5, T / 2, FZ);
    edges.push([[sd * (X - 0.25), T / 2 + 0.01, NZ + 0.3], [sd * (X - 0.25), T / 2 + 0.01, FZ - 0.3]], [[sd * (X + 0.12), T + 0.01, NZ + 0.3], [sd * (X + 0.12), T + 0.01, FZ - 0.3]]);
  });
  [[-AX, -DJ.gate], [DJ.gate, AX]].forEach(([x0, x1]) => { box(x0, 0, AN, x1, T, NZ); box(x0, 0, NZ, x1, T / 2, NZ + 0.5); edges.push([[x0 + 0.3, T / 2 + 0.01, NZ + 0.25], [x1 - 0.3, T / 2 + 0.01, NZ + 0.25]], [[x0 + 0.3, T + 0.01, NZ - 0.12], [x1 - 0.3, T + 0.01, NZ - 0.12]]); });
  edges.forEach(([a, b]) => diyaRow(kit, a, b, phone ? 0.55 : 0.4, 0.04));
  // lotus-bud lamps on pedestals along the terraces' edges: carved shells, pierced, the flame inside
  const buds = [];
  [-1, 1].forEach((sd) => { for (let z = NZ + 2; z < FZ - 1; z += 5) buds.push([sd * (X + 0.5), T, z]); });
  [-1, 1].forEach((sd) => { for (let x = DJ.gate + 2.5; x < AX - 1; x += 5) buds.push([sd * x, T, NZ - 0.5]); });
  const budGeo = new THREE.LatheGeometry([[0, 0], [0.22, 0.08], [0.34, 0.36], [0.3, 0.7], [0.16, 1.0], [0.02, 1.2], [0, 1.22]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
  const budTex = canvasTexture(128, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#ff9a3a'); gr.addColorStop(0.6, '#ffd08a'); gr.addColorStop(1, '#fff0c8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,50,10,.75)'; for (let y = 8; y < h; y += 12) for (let x = (y / 12 % 2) * 6; x < w; x += 12) { g.beginPath(); g.ellipse(x, y, 3.5, 2, 0, 0, TAU); g.fill(); } });
  const bm = new THREE.InstancedMesh(budGeo, kit.litMap(budTex, 1.2, 'flame'), buds.length), mx = new THREE.Matrix4();
  buds.forEach(([x, y, z], i) => { box(x - 0.3, y, z - 0.3, x + 0.3, y + 0.9, z + 0.3); bm.setMatrixAt(i, mx.makeTranslation(x, y + 0.9, z)); src(x, y + 1.4, z, GOLD, 0.6, 4); kit.pools.add(x, y + 0.92, z, 1.4, 1.4, LIGHT.flame, 0.1, { layer: 'flame', live: true }); });
  root.add(bm);

  /* the arcades behind the terraces, their floor at the terrace's height */
  const bays = [];
  const run = (p0, p1, n) => arcade(stone, p0, p1, n, { h: 4.6, spring: 2.6, rise: 1.3, back: 3, plinth: T }).bays.forEach((b) => bays.push(b));
  run([-AX, AN], [-AX, FZ], 10); run([AX, FZ], [AX, AN], 10);
  run([AX, AN], [DJ.gate, AN], 4); run([-DJ.gate, AN], [-AX, AN], 4);
  bays.forEach((b, i) => { const hx = b.x + b.nx * 1.3, hz = b.z + b.nz * 1.3; kit.wires.line([hx, 4.35, hz], [hx, 3.3, hz]); D.lantern(hx, 2.95, hz, 0.8); src(hx, 3.1, hz, LIGHT.tungsten, 0.45, 3.6); });

  /* the gate in the near terrace, hung with marigolds */
  portal(kit, root, add, M, AN, DJ.gate, 6.8, { marigolds: true }).forEach(([x, y, z]) => src(x, y, z, '#ff9a4a', 1.0, 6));

  /* behind the band, the deepstambh: an octagonal tower of stone, a lamp on every bracket up its height, a canopy and a
     flame on top; a smaller one either side; and across the back of the court a wall of jharokhas, a diya in each */
  const stambh = (x, z, h, rr, rings) => {
    add(metreUV(new THREE.CylinderGeometry(rr * 1.9, rr * 2.1, 0.5, 8), 2.4), M(x, 0.25, z, Math.PI / 8)); add(metreUV(new THREE.CylinderGeometry(rr * 1.5, rr * 1.6, 0.5, 8), 2.4), M(x, 0.75, z, Math.PI / 8));
    add(metreUV(new THREE.CylinderGeometry(rr * 0.72, rr, h, 8, 1), 2.4), M(x, 1 + h / 2, z, Math.PI / 8));
    for (let k = 0; k < rings; k++) {
      const y = 1.6 + k * (h - 1.2) / rings, rk = lerp(rr, rr * 0.72, (y - 1) / h) + 0.16, n = Math.max(8, Math.round(rk * 9));
      add(metreUV(new THREE.CylinderGeometry(rk + 0.06, rk - 0.08, 0.1, 16), 2.4), M(x, y - 0.06, z));
      for (let i = 0; i < n; i++) { const a = (i + 0.5 * (k % 2)) / n * TAU; kit.flames.add(x + Math.cos(a) * rk, y, z + Math.sin(a) * rk, { s: 0.04, k: 0.75 }); }
      src(x, y, z, GOLD, 0.7, rk + 2.2);
    }
    add(metreUV(new THREE.CylinderGeometry(rr * 1.0, rr * 0.8, 0.25, 8), 2.4), M(x, 1 + h + 0.12, z, Math.PI / 8));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; add(metreUV(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), 2.4), M(x + Math.cos(a) * rr * 0.6, 1 + h + 0.8, z + Math.sin(a) * rr * 0.6)); }
    add(metreUV(new THREE.SphereGeometry(rr * 0.85, 12, 6, 0, TAU, 0, Math.PI / 2), 2.4), M(x, 1 + h + 1.35, z, 0, 1, 0.9, 1));
    kit.flames.add(x, 1 + h + 0.45, z, { bowl: 'brass', s: 0.14, k: 1.3 }); src(x, 1 + h + 0.6, z, GOLD, 1.0, 4);
  };
  stambh(DJ.stambh[0], DJ.stambh[1], 11, 0.75, 18);
  [-1, 1].forEach((sd) => stambh(sd * 7.2, DJ.stambh[1] + 1.5, 6.4, 0.5, 10));
  kit.pools.add(DJ.stambh[0], 5.5, DJ.stambh[1] - 1.2, 1.8, 5.2, GOLD, 0.06, { vertical: true, ry: Math.PI, layer: 'flame' });
  // the jharokha wall: niches with cusped arches across the court's far side, a row of diyas on each sill
  const jw = arcade(stone, [-AX, DJ.backZ], [AX, DJ.backZ], 11, { h: 5.6, spring: 3.0, rise: 1.4, back: 0.7, plinth: 0.9 });
  jw.bays.forEach((b) => { diyaRow(kit, [b.x - 1.0, 0.92, b.z + 0.2], [b.x + 1.0, 0.92, b.z + 0.2], 0.28, 0.04); kit.bigBulbs.add(b.x, 3.9, b.z + 0.3, 0, { color: GOLD, k: 0.8, s: 0.45, twinkle: 0.1, layer: 'practical' }); src(b.x, 2.4, b.z + 0.3, GOLD, 0.7, 3.4); });
  add(metreUV(new THREE.BoxGeometry(2 * AX + 1, 7.6, 0.5), 2.4), M(0, 3.8, DJ.backZ + 1.0));
  [-1, 1].forEach((sd) => box(sd > 0 ? AX : -AX - 3.4, 0, FZ, sd > 0 ? AX + 3.4 : -AX, 5.6, DJ.backZ + 1.2));
  for (let x = -AX + 1; x <= AX - 1; x += 3.5) add(metreUV(new THREE.ConeGeometry(0.45, 1.3, 4), 2.4), M(x, 7.6 + 0.65, DJ.backZ + 1.0, Math.PI / 4));

  /* the musicians' platform before the deepstambh */
  const st = new THREE.Group(); root.add(st);
  box(S.x0, 0, S.z, S.x1, S.h, S.z + S.depth); box(S.x0 + 0.5, 0, S.z - 0.5, S.x1 - 0.5, S.h / 2, S.z);
  D.rug((S.x0 + S.x1) / 2, S.z + 1.6, S.x1 - S.x0 - 0.6, 2.4, 0, rugTexture('persian', ['#8a1424', '#1e5a3a', '#d6a64a', '#f3e6d0']), S.h + 0.006);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#ffb040' });
  diyaRow(kit, [S.x0 + 0.2, S.h, S.z + 0.08], [S.x1 - 0.2, S.h, S.z + 0.08], 0.36, 0.04);
  kit.pools.add(0, 0.02, S.z - 1.6, 4.5, 2.4, LIGHT.warm, 0.12, { layer: 'show' });

  /* the round lanterns: tall poles round the courtyard, wires strung between them over it, lanterns along the wires */
  const NP = 10, PR = 12.4, PH = 8.6, iron = std('#2a221a', 0.6, 0.5), poles = [];
  // (clear of the stage at the north and of the near rows at the south)
  const POLE_AT = [130, 160, 190, 220, 250, 290, 320, 350, 20, 50];
  for (let i = 0; i < NP; i++) { const a = POLE_AT[i] * Math.PI / 180, x = Math.cos(a) * PR, z = Math.sin(a) * PR; poles.push([x, z]); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, PH, 8), iron); p.position.set(x, PH / 2, z); root.add(p); }
  const discs = DISCS.map(() => []);
  const hangDisc = (x, y, z, s) => { discs[Math.floor(r() * DISCS.length)].push([x, y, z, s, Math.atan2(-x, -z) + (r() - 0.5) * 0.4]); };
  for (let i = 0; i < NP; i++) for (const step of [3, 4]) {
    const a = poles[i], b = poles[(i + step) % NP], A = [a[0], PH - 0.2, a[1]], B = [b[0], PH - 0.2, b[1]], len = Math.hypot(B[0] - A[0], B[2] - A[2]);
    if (step === 4 && i % 2) continue;
    kit.wires.cable(A, B, 0.9, 12);
    const n = Math.floor(len / (phone ? 4.2 : 3.2));
    for (let k = 1; k < n; k++) { const u = k / n, sagY = -0.9 * 4 * u * (1 - u), drop = 0.3 + r() * 0.5; const x = lerp(A[0], B[0], u), z = lerp(A[2], B[2], u), y = PH - 0.2 + sagY; kit.wires.line([x, y, z], [x, y - drop + 0.4, z]); hangDisc(x, y - drop, z, 0.28 + r() * 0.14); }
  }
  poles.forEach(([x, z]) => hangDisc(x, PH + 0.6, z, 0.55));
  const dg = new THREE.CylinderGeometry(1, 1, 0.16, 36); dg.rotateX(Math.PI / 2);
  discs.forEach((list, k) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(dg, kit.litMap(discTexture(DISCS[k], 11 + k), 1.15, 'festive'), list.length), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach(([x, y, z, s, ry], i) => { im.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, ry, 0)), new THREE.Vector3(s, s, s))); });
    root.add(im);
  });
  kit.pools.add(0, 0.02, 0, 14, 14, '#ffc8a0', 0.05, { layer: 'festive' });

  /* star kandils on lines along the terraces: paper stars in jewel colours, a tassel under each */
  const kandils = [[], [], [], []], KC = ['#ff4a6a', '#3ad87a', '#ffd04a', '#3ac8e8'];
  [-1, 1].forEach((sd) => { const xw = sd * (X + 1.4); kit.wires.cable([xw, 4.6, NZ + 0.5], [xw, 4.6, FZ - 0.5], 0.5, 18); for (let z = NZ + 1.6; z < FZ - 1; z += 1.8) { const u = (z - NZ - 0.5) / (FZ - NZ - 1), y = 4.6 - 0.5 * 4 * u * (1 - u) - 0.55; kit.wires.line([xw, y + 0.5, z], [xw, y + 0.2, z]); kandils[Math.floor(r() * 4)].push([xw, y, z]); } });
  const kg = new THREE.OctahedronGeometry(0.26, 0); kg.scale(1, 1.3, 1);
  kandils.forEach((list, k) => { if (!list.length) return; const im = new THREE.InstancedMesh(kg, kit.glow(KC[k], 1.2, 'festive'), list.length); list.forEach(([x, y, z], i) => im.setMatrixAt(i, mx.makeTranslation(x, y, z))); root.add(im); const tg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), std(KC[k], 0.8), list.length); list.forEach(([x, y, z], i) => tg.setMatrixAt(i, mx.makeTranslation(x, y - 0.52, z))); root.add(tg); });

  /* velvet sofas round the floor, brass bowls of flowers on low tables, rugs; diyas round the floor's edge */
  const VEL = [['#1e5a3a', ['#c8962a', '#8a1424', '#1e2a6a']], ['#8a1424', ['#1e5a3a', '#c8962a', '#2a3a8a']], ['#1e2a6a', ['#8a1424', '#c8962a', '#1e5a3a']]];
  (DJ.seats || []).forEach((sf, i) => {
    const v = VEL[i % 3]; D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#5a3a1a', seat: v[0], cushions: v[1] });
    if (!sf.near) { const fx = Math.sin(sf.ry), fz = Math.cos(sf.ry); D.rug(sf.x + fx * 0.9, sf.z + fz * 0.9, sf.len + 1, 1.8, -sf.ry, rugTexture('persian', ['#7a1424', '#1c2a5a', '#d6a64a', '#f3e6d0'])); D.table(sf.x + fx * 1.0, sf.z + fz * 1.0, 0.8, 0.55, { candles: 1, wood: '#4a2a14' }); D.urn(sf.x - Math.cos(sf.ry) * (sf.len / 2 + 0.4), sf.z + Math.sin(sf.ry) * (sf.len / 2 + 0.4)); }
  });
  for (let i = 0; i < 44; i++) { const a = (i + 0.5) / 44 * TAU; kit.flames.add(Math.cos(a) * (DJ.floor + 0.75), 0.01, Math.sin(a) * (DJ.floor + 0.75), { s: 0.045, k: 0.8 }); }
  // palms in brass pots on the terraces
  [-1, 1].forEach((sd) => { for (let z = NZ + 4.5; z < FZ - 2; z += 10) D.palm(sd * (AX - 1.4), z, 0.9); });
  /* beyond the courtyard: the town round it, flat roofs, domes and spires among trees, hills at the horizon */
  const inChowk = (x, z) => Math.abs(x) < AX + 7 && z > AN - 7 && z < DJ.backZ + 7;
  townBelt(kit, root, { r0: 30, r1: 120, n: phone ? 140 : 300, style: 'old', seed: 101, skip: inChowk, wall: '#4a3e30' });
  forestBelt(kit, root, { r0: 30, r1: 110, n: phone ? 140 : 300, h: [7, 13], seed: 103, tones: ['#1a2a16', '#20321a', '#162414'], skip: inChowk });
  horizonRidge(root, { radius: 300, base: -4, height: 24, seed: 17, cols: ['#06060c', '#14121c'] });
  D.finish();

  /* the stone: cream sandstone, the lamps' light baked into it */
  const geo = mergeAll(stone); glowInto(geo, sources);
  const t = sandstoneTexture(['#ecdcb8', '#c8b088'], 13, true); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const stoneMesh = new THREE.Mesh(geo, glowStone({ map: t, roughness: 0.8 }, glow, 'creamstone')); stoneMesh.castShadow = !phone; stoneMesh.receiveShadow = !!tier.shadows; root.add(stoneMesh);

  const rig = {
    hemi: ['#3a4060', '#4a3418', 0.42, 0.66], moon: 1,
    spots: [{ pos: [8, 18, -10], to: [0, 0, 4], color: '#d0d8ff', base: 24, distance: 50, angle: 0.62, layer: 'key' }, { pos: [0, 5.5, S.z - 4.5], to: [0, S.h + 1.1, S.z + 1.6], color: '#ffe0b8', base: 70, distance: 14, angle: 0.6, layer: 'show' }],
    points: [{ pos: [-14, 2.5, 2], color: GOLD, base: 30, distance: 14, layer: 'flame' }, { pos: [14, 2.5, 2], color: GOLD, base: 30, distance: 14, layer: 'flame' }, { pos: [0, 7, 0], color: '#ffd0b0', base: 26, distance: 18, layer: 'festive' }, { pos: [0, 7, DJ.stambh[1] - 3], color: GOLD, base: 44, distance: 18, layer: 'flame' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#18141e', 0.007), exposure: 1.0,
    update(t2, ctx) { glow.value = 0.9 * (0.35 + 0.65 * Math.max(ctx.lv.flame || 0, ctx.lv.architectural || 0)); }
  };
}

export default { seed: 1010, sky: nightSky, garbo: 'bare', garboK: 8, build: jyot };
