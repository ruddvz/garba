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
import { ground, glowInto, glowStone, DISCS } from './common.js';
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
// The floor's mandala, inlaid in the stone (zip-121, zip-107): a pale disc ringed in teal and terracotta, a border of
// lotus petals outlined in white marble on red sandstone, sixteen great petals with their veins, a band of interlaced
// circles, a twelve-pointed star of white lines on the darker stone inside it, and the lotus round the garbo. The fills
// let the stone's grain through; fine dark joints edge each piece the way inlay is set.
function floorDecal(rect, res, R) {
  const c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  const TERRA = 'rgba(160,74,38,.9)', TEAL = 'rgba(30,108,106,.88)', PALE = 'rgba(232,214,180,.82)', RED = 'rgba(150,92,56,.86)', WHITE = 'rgba(250,244,230,.95)', JOINT = 'rgba(60,34,16,.7)';
  const disc = (rr, col) => { g.fillStyle = col; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill(); };
  const band = (r0, r1, col) => { g.fillStyle = col; g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.arc(0, 0, r0, 0, TAU, true); g.fill('evenodd'); };
  const line = (rr, lw, col = WHITE) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); };
  const petal = (r0, r1, w, rot) => { g.save(); g.rotate(rot); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, w, r0 + (r1 - r0) * 0.75, w * 0.62, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.75, -w * 0.62, r0 + (r1 - r0) * 0.3, -w, r0, 0); g.restore(); };
  // the border: teal, a band of terracotta beads on white, teal again
  band(R + 0.5, R + 0.68, TEAL); band(R + 0.22, R + 0.5, WHITE); band(R, R + 0.22, TEAL);
  for (let i = 0; i < 132; i++) { g.save(); g.rotate(i / 132 * TAU); g.fillStyle = i % 2 ? TERRA : TEAL; g.beginPath(); g.moveTo(R + 0.24, 0); g.lineTo(R + 0.36, 0.11); g.lineTo(R + 0.48, 0); g.lineTo(R + 0.36, -0.11); g.closePath(); g.fill(); g.restore(); }
  // the lotus border: white-edged petals on red sandstone
  band(R - 1.3, R, RED);
  for (let i = 0; i < 72; i++) { petal(R - 1.22, R - 0.08, 0.3, (i + 0.5) / 72 * TAU); g.fillStyle = PALE; g.fill(); g.strokeStyle = WHITE; g.lineWidth = 0.05; g.stroke(); petal(R - 1.05, R - 0.4, 0.12, (i + 0.5) / 72 * TAU); g.fillStyle = i % 2 ? TERRA : TEAL; g.fill(); }
  line(R - 1.3, 0.07); line(R, 0.05);
  // sixteen great petals on pale stone, each veined, a bud between each pair
  band(R - 4.3, R - 1.3, PALE);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    petal(R - 4.25, R - 1.4, 1.05, a); g.fillStyle = i % 2 ? 'rgba(160,74,38,.55)' : 'rgba(30,108,106,.5)'; g.fill(); g.strokeStyle = WHITE; g.lineWidth = 0.07; g.stroke();
    petal(R - 3.95, R - 1.85, 0.55, a); g.strokeStyle = WHITE; g.lineWidth = 0.04; g.stroke();
    g.save(); g.rotate(a); g.strokeStyle = WHITE; g.lineWidth = 0.035; g.beginPath(); g.moveTo(R - 4.1, 0); g.lineTo(R - 1.6, 0); g.stroke(); for (let v = 0; v < 4; v++) { const x0 = R - 3.6 + v * 0.5; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 0.35, 0.28 - v * 0.04); g.moveTo(x0, 0); g.lineTo(x0 + 0.35, -0.28 + v * 0.04); g.stroke(); } g.restore();
    petal(R - 2.6, R - 1.45, 0.24, a + TAU / 32); g.fillStyle = WHITE; g.fill();
  }
  line(R - 4.3, 0.08);
  // a band of interlaced circles (the rosette of the inlay floors), white on the red stone
  band(R - 5.3, R - 4.3, RED);
  g.save(); g.beginPath(); g.arc(0, 0, R - 4.32, 0, TAU); g.arc(0, 0, R - 5.28, 0, TAU, true); g.clip('evenodd');
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; g.strokeStyle = WHITE; g.lineWidth = 0.035; g.beginPath(); g.arc(Math.cos(a) * (R - 4.8), Math.sin(a) * (R - 4.8), 0.62, 0, TAU); g.stroke(); }
  g.restore();
  line(R - 5.3, 0.08);
  // the twelve-pointed star of white lines on the darker stone, dots where its lines cross
  band(3.2, R - 5.3, 'rgba(196,160,112,.8)');
  const rs = R - 5.45, star = (step, rot) => { g.beginPath(); for (let i = 0; i <= 12; i++) { const a = rot + (i * step % 12) / 12 * TAU; const x = Math.cos(a) * rs, y = Math.sin(a) * rs; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.strokeStyle = WHITE; g.lineWidth = 0.05; g.stroke(); };
  star(5, 0); star(5, TAU / 24);
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.fillStyle = WHITE; g.beginPath(); g.arc(Math.cos(a) * (R - 5.55), Math.sin(a) * (R - 5.55), 0.07, 0, TAU); g.fill(); }
  // the lotus round the garbo
  line(3.2, 0.06);
  for (let i = 0; i < 16; i++) { petal(1.4, 3.1, 0.72, i / 16 * TAU); g.fillStyle = TERRA; g.fill(); g.strokeStyle = WHITE; g.lineWidth = 0.05; g.stroke(); petal(1.5, 2.6, 0.34, i / 16 * TAU + TAU / 32); g.fillStyle = TEAL; g.fill(); g.strokeStyle = JOINT; g.lineWidth = 0.025; g.stroke(); }
  disc(1.4, PALE); line(1.4, 0.06); line(1.15, 0.03);
  // the joints between the bands
  [R + 0.68, R - 1.36, R - 4.36, R - 5.36, 3.26].forEach((rr) => line(rr, 0.025, JOINT));
  g.restore();
  return c;
}
// A round lantern's face (zip-087, zip-109): a gold rim set with lamps, a ring of triangles, sixteen petals inside it,
// a lotus at the middle, every piece of colour edged in dark lead like a window's glass
function wheelTexture(pal, seed) {
  const r = seeded(seed);
  return canvasTexture(512, 512, (g, w) => {
    const c = w / 2, LEAD = 'rgba(48,20,10,.92)';
    g.fillStyle = pal[3]; g.fillRect(0, 0, w, w);
    const ring = (r0, r1, col) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r1, 0, TAU); g.arc(c, c, r0, 0, TAU, true); g.fill('evenodd'); };
    const line = (rr, lw = 3) => { g.strokeStyle = LEAD; g.lineWidth = lw; g.beginPath(); g.arc(c, c, rr, 0, TAU); g.stroke(); };
    const petal = (r0, r1, wd, a) => { g.save(); g.translate(c, c); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, wd, r0 + (r1 - r0) * 0.75, wd * 0.6, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.75, -wd * 0.6, r0 + (r1 - r0) * 0.3, -wd, r0, 0); g.restore(); };
    ring(228, 256, '#d89a32');
    for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, x = c + Math.cos(a) * 242, y = c + Math.sin(a) * 242; const gr = g.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.5, '#ffe08a'); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
    ring(206, 228, pal[0]);
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, b = (i + 1) / 48 * TAU; g.fillStyle = i % 2 ? pal[1] : pal[2]; g.beginPath(); g.moveTo(c + Math.cos(a) * 206, c + Math.sin(a) * 206); g.lineTo(c + Math.cos((a + b) / 2) * 176, c + Math.sin((a + b) / 2) * 176); g.lineTo(c + Math.cos(b) * 206, c + Math.sin(b) * 206); g.closePath(); g.fill(); g.strokeStyle = LEAD; g.lineWidth = 2; g.stroke(); }
    line(256 - 2, 4); line(228); line(206); line(176);
    for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * TAU; petal(84, 174, 30, a); g.fillStyle = i % 2 ? pal[0] : pal[2]; g.fill(); g.strokeStyle = LEAD; g.lineWidth = 3; g.stroke(); petal(100, 158, 13, a); g.fillStyle = pal[1]; g.fill(); g.stroke(); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.fillStyle = pal[1]; g.beginPath(); g.arc(c + Math.cos(a) * 160, c + Math.sin(a) * 160, 7, 0, TAU); g.fill(); g.strokeStyle = LEAD; g.lineWidth = 2; g.stroke(); }
    ring(70, 84, pal[1]); line(84); line(70);
    for (let i = 0; i < 8; i++) { petal(24, 68, 18, i / 8 * TAU); g.fillStyle = i % 2 ? pal[2] : pal[0]; g.fill(); g.strokeStyle = LEAD; g.lineWidth = 2.5; g.stroke(); }
    g.fillStyle = pal[1]; g.beginPath(); g.arc(c, c, 22, 0, TAU); g.fill(); line(22, 3);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(c, c, 9, 0, TAU); g.fill();
    for (let i = 0; i < 50; i++) { const a = r() * TAU, d = 90 + r() * 80; g.fillStyle = 'rgba(255,255,240,.45)'; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 1.8, 0, TAU); g.fill(); }
  });
}
// A star kandil's paper (zip-058): six panels of one colour, each with a pale lozenge, gold ribs between them
function kandilTexture(hex) {
  return canvasTexture(192, 128, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x0 = i * w / 6, xm = x0 + w / 12;
      const gr = g.createLinearGradient(x0, 0, x0 + w / 6, 0); gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(x0, 0, w / 6, h);
      g.fillStyle = 'rgba(255,248,220,.85)'; g.beginPath(); g.moveTo(xm, h * 0.3); g.lineTo(xm + 8, h * 0.5); g.lineTo(xm, h * 0.7); g.lineTo(xm - 8, h * 0.5); g.closePath(); g.fill();
      g.fillStyle = '#e0a83a'; g.fillRect(x0, 0, 2.5, h);
    }
    g.fillStyle = '#e0a83a'; g.fillRect(0, h * 0.48, w, 3);
  });
}

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
  // (eight petals round it, each edged in carved stone and pierced, brightest low down where the flame is)
  const budTex = canvasTexture(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#ffb04a'); gr.addColorStop(0.55, '#ffd890'); gr.addColorStop(1, '#fff2d0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const x0 = i * w / 8, xm = x0 + w / 16, pet = () => { g.beginPath(); g.moveTo(x0 + 2, h); g.bezierCurveTo(x0 + 2, h * 0.5, xm - 4, h * 0.3, xm, h * 0.08); g.bezierCurveTo(xm + 4, h * 0.3, x0 + w / 8 - 2, h * 0.5, x0 + w / 8 - 2, h); };
      pet(); g.strokeStyle = 'rgba(110,52,16,.9)'; g.lineWidth = 5; g.stroke();
      g.fillStyle = 'rgba(120,56,14,.7)'; for (let y = h * 0.3; y < h - 10; y += 16) for (let dx = -1; dx <= 1; dx++) { if (Math.abs(dx) * 8 > (y / h) * 12) continue; g.beginPath(); g.ellipse(xm + dx * 9, y, 3, 4.5, 0, 0, TAU); g.fill(); }
    }
  });
  const bm = new THREE.InstancedMesh(budGeo, kit.litMap(budTex, 1.2, 'flame'), buds.length), mx = new THREE.Matrix4();
  buds.forEach(([x, y, z], i) => { box(x - 0.3, y, z - 0.3, x + 0.3, y + 0.8, z + 0.3); box(x - 0.38, y + 0.8, z - 0.38, x + 0.38, y + 0.9, z + 0.38); box(x - 0.36, y, z - 0.36, x + 0.36, y + 0.12, z + 0.36); bm.setMatrixAt(i, mx.makeTranslation(x, y + 0.9, z)); src(x, y + 1.4, z, GOLD, 0.6, 4); kit.pools.add(x, y + 0.92, z, 1.4, 1.4, LIGHT.flame, 0.1, { layer: 'flame', live: true }); });
  root.add(bm);

  /* the arcades behind the terraces, their floor at the terrace's height */
  const bays = [];
  // (their outlines traced in small lamps, as the court's are on a festival night: along the parapet's top and under
  // the eave's edge, the side that faces the court)
  const AH = 4.6, rim = (p0, p1, y, off, gap) => { const dx = p1[0] - p0[0], dz = p1[1] - p0[1], len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len, n = Math.round(len / gap); for (let i = 0; i <= n; i++) { const u = i / n; kit.bulbs.add(p0[0] + dx * u - nx * off, y, p0[1] + dz * u - nz * off, 0, { color: '#ffc878', k: 0.85, s: 0.55, twinkle: 0.06, layer: 'architectural' }); } };
  const run = (p0, p1, n) => { arcade(stone, p0, p1, n, { h: AH, spring: 2.6, rise: 1.3, back: 3, plinth: T }).bays.forEach((b) => bays.push(b)); rim(p0, p1, AH + 0.88, 0.26, 0.42); rim(p0, p1, AH - 0.06, 1.1, 0.55); };
  run([-AX, AN], [-AX, FZ], 10); run([AX, FZ], [AX, AN], 10);
  run([AX, AN], [DJ.gate, AN], 4); run([-DJ.gate, AN], [-AX, AN], 4);
  bays.forEach((b, i) => { const hx = b.x + b.nx * 1.3, hz = b.z + b.nz * 1.3; kit.wires.line([hx, 4.35, hz], [hx, 3.3, hz]); D.lantern(hx, 2.95, hz, 0.8); src(hx, 3.1, hz, LIGHT.tungsten, 0.45, 3.6); });

  /* the gate in the near terrace, hung with marigolds */
  portal(kit, root, add, M, AN, DJ.gate, 6.8, { marigolds: true }).forEach(([x, y, z]) => src(x, y, z, '#ff9a4a', 1.0, 6));
  // its court face carved: a moulded frame round the arch, pilasters on the piers, swags of marigolds under the lintel,
  // and a tall brass samai either side of the way in, five wicks burning on each (zip-090)
  {
    const ow = DJ.gate * 2 - 3.2, hs = Math.min(3.6, 6.8 - 1.6 - ow / 2 - 0.3), fr = new THREE.Shape(), ho = new THREE.Path(), bw = 0.32;
    fr.moveTo(ow / 2 + bw, 0); fr.lineTo(ow / 2 + bw, hs); fr.absarc(0, hs, ow / 2 + bw, 0, Math.PI, false); fr.lineTo(-ow / 2 - bw, 0); fr.closePath();
    ho.moveTo(ow / 2, 0); ho.lineTo(ow / 2, hs); ho.absarc(0, hs, ow / 2, 0, Math.PI, false); ho.lineTo(-ow / 2, 0); ho.closePath(); fr.holes.push(ho);
    const fg = new THREE.ExtrudeGeometry(fr, { depth: 0.14, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 16 });
    add(metreUV(fg, 2.4), M(0, 0, AN + 0.3));
    [-1, 1].forEach((sd) => { const px = sd * (DJ.gate - 0.7); box(px - 0.24, 0, AN + 0.8, px + 0.24, 4.9, AN + 0.94); box(px - 0.34, 4.9, AN + 0.78, px + 0.34, 5.12, AN + 1.0); box(px - 0.34, 0, AN + 0.78, px + 0.34, 0.4, AN + 1.0); });
    const pts = [], top = 6.8 - 1.7;
    for (let k = 0; k < 4; k++) { const x0 = -DJ.gate + 0.9 + k * (DJ.gate * 2 - 1.8) / 4, x1 = x0 + (DJ.gate * 2 - 1.8) / 4; for (let u = 0; u <= 1.001; u += 0.05) pts.push([lerp(x0, x1, u), top - 0.5 * 4 * u * (1 - u), AN + 0.86]); for (let y = 0; y < 0.7; y += 0.085) pts.push([x0, top - 0.04 - y, AN + 0.86]); }
    const fmM = kit.selfLit(std('#ffffff', 0.85), 0.32, 'flame');
    fmM.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;'); };
    fmM.customProgramCacheKey = () => 'marigolds';
    const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), fmM, pts.length), c = new THREE.Color();
    pts.forEach(([x, y, z], i) => { fm.setMatrixAt(i, mx.makeTranslation(x, y, z)); fm.setColorAt(i, c.set(i % 4 === 1 ? '#ffd24a' : '#f08a1a')); }); root.add(fm);
    // (brass that holds the flames' glow: unlit metal with nothing to reflect reads black)
    const brass = kit.selfLit(std('#c9953a', 0.4, 0.5), 0.9, 'flame'); brass.emissive.set('#a8681c');
    const samai = new THREE.LatheGeometry([[0, 0], [0.32, 0], [0.32, 0.06], [0.18, 0.14], [0.08, 0.24], [0.05, 0.6], [0.09, 0.66], [0.045, 0.72], [0.04, 1.42], [0.09, 1.48], [0.04, 1.54], [0.04, 1.6], [0.3, 1.66], [0.32, 1.7], [0.06, 1.72], [0.05, 1.86], [0.1, 1.94], [0.02, 2.1], [0, 2.12]].map(([a, b]) => new THREE.Vector2(a, b)), 18);
    [-1, 1].forEach((sd) => { const x = sd * (DJ.gate - 0.5), z = AN + 1.5, m = new THREE.Mesh(samai, brass); m.position.set(x, 0, z); m.castShadow = false; root.add(m); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; kit.flames.add(x + Math.cos(a) * 0.26, 1.7, z + Math.sin(a) * 0.26, { bowl: null, s: 0.05, k: 1.1, pool: false }); } src(x, 1.9, z, GOLD, 1.0, 4.5); kit.pools.add(x, 0.02, z, 2.2, 2.2, LIGHT.flame, 0.2, { layer: 'flame' }); });
    src(0, 4.6, AN + 1.6, '#ffb060', 0.7, 5);
  }

  /* behind the band, the deepstambh: an octagonal tower of stone, a lamp on every bracket up its height, a canopy and a
     flame on top; a smaller one either side; and across the back of the court a wall of jharokhas, a diya in each */
  const stambh = (x, z, h, rr, rings) => {
    add(metreUV(new THREE.CylinderGeometry(rr * 1.9, rr * 2.1, 0.5, 8), 2.4), M(x, 0.25, z, Math.PI / 8)); add(metreUV(new THREE.CylinderGeometry(rr * 1.5, rr * 1.6, 0.5, 8), 2.4), M(x, 0.75, z, Math.PI / 8));
    add(metreUV(new THREE.CylinderGeometry(rr * 0.72, rr, h, 8, 1), 2.4), M(x, 1 + h / 2, z, Math.PI / 8));
    for (let k = 0; k < rings; k++) {
      const y = 1.6 + k * (h - 1.2) / rings, rk = lerp(rr, rr * 0.72, (y - 1) / h) + 0.16, n = Math.max(8, Math.round(rk * 9));
      add(metreUV(new THREE.CylinderGeometry(rk + 0.06, rk - 0.08, 0.1, 16), 2.4), M(x, y - 0.06, z));
      // (each ring's lamps light the ledge they stand on through the stone's own glow, not a pool apiece: those stacked
      // up the tower into a column of light)
      for (let i = 0; i < n; i++) { const a = (i + 0.5 * (k % 2)) / n * TAU; kit.flames.add(x + Math.cos(a) * rk, y, z + Math.sin(a) * rk, { s: 0.045, k: 0.8, pool: false }); }
      src(x, y, z, GOLD, 0.3, rk + 1.6);
    }
    add(metreUV(new THREE.CylinderGeometry(rr * 1.0, rr * 0.8, 0.25, 8), 2.4), M(x, 1 + h + 0.12, z, Math.PI / 8));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; add(metreUV(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), 2.4), M(x + Math.cos(a) * rr * 0.6, 1 + h + 0.8, z + Math.sin(a) * rr * 0.6)); }
    add(metreUV(new THREE.SphereGeometry(rr * 0.85, 12, 6, 0, TAU, 0, Math.PI / 2), 2.4), M(x, 1 + h + 1.35, z, 0, 1, 0.9, 1));
    kit.flames.add(x, 1 + h + 0.45, z, { bowl: 'brass', s: 0.14, k: 1.3 }); src(x, 1 + h + 0.6, z, GOLD, 1.0, 4);
  };
  stambh(DJ.stambh[0], DJ.stambh[1], 11, 0.75, 12);
  [-1, 1].forEach((sd) => stambh(sd * 7.2, DJ.stambh[1] + 1.5, 6.4, 0.5, 7));
  kit.pools.add(DJ.stambh[0], 0.02, DJ.stambh[1], 3.6, 3.6, GOLD, 0.16, { layer: 'flame' });
  // the jharokha wall: niches with cusped arches across the court's far side, a row of diyas on each sill
  const jw = arcade(stone, [-AX, DJ.backZ], [AX, DJ.backZ], 11, { h: 5.6, spring: 3.0, rise: 1.4, back: 0.7, plinth: 0.9 });
  jw.bays.forEach((b) => { diyaRow(kit, [b.x - 1.0, 0.92, b.z + 0.2], [b.x + 1.0, 0.92, b.z + 0.2], 0.28, 0.04); kit.bigBulbs.add(b.x, 3.9, b.z + 0.3, 0, { color: GOLD, k: 0.8, s: 0.45, twinkle: 0.1, layer: 'practical' }); src(b.x, 2.4, b.z + 0.3, GOLD, 0.7, 3.4); });
  add(metreUV(new THREE.BoxGeometry(2 * AX + 1, 7.6, 0.5), 2.4), M(0, 3.8, DJ.backZ + 1.0));
  [-1, 1].forEach((sd) => box(sd > 0 ? AX : -AX - 3.4, 0, FZ, sd > 0 ? AX + 3.4 : -AX, 5.6, DJ.backZ + 1.2));
  for (let x = -AX + 1; x <= AX - 1; x += 3.5) add(metreUV(new THREE.ConeGeometry(0.45, 1.3, 4), 2.4), M(x, 7.6 + 0.65, DJ.backZ + 1.0, Math.PI / 4));
  rim([-AX - 0.4, DJ.backZ + 0.75], [AX + 0.4, DJ.backZ + 0.75], 7.64, 0, 0.42);

  /* the musicians' platform before the deepstambh */
  const st = new THREE.Group(); root.add(st);
  box(S.x0, 0, S.z, S.x1, S.h, S.z + S.depth); box(S.x0 + 0.5, 0, S.z - 0.5, S.x1 - 0.5, S.h / 2, S.z);
  D.rug((S.x0 + S.x1) / 2, S.z + 1.6, S.x1 - S.x0 - 0.6, 2.4, 0, rugTexture('persian', ['#8a1424', '#1e5a3a', '#d6a64a', '#f3e6d0']), S.h + 0.006);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#ffb040' });
  diyaRow(kit, [S.x0 + 0.2, S.h, S.z + 0.08], [S.x1 - 0.2, S.h, S.z + 0.08], 0.36, 0.04);
  kit.pools.add(0, 0.02, S.z - 1.6, 4.5, 2.4, LIGHT.warm, 0.12, { layer: 'show' });

  /* the round lanterns: tall poles round the courtyard, wires strung between them over it, lanterns along the wires */
  const NP = 10, PR = 12.4, PH = 8.6, wood = std('#6a4426', 0.55, 0.1), brassP = std('#c9953a', 0.35, 0.85), poles = [];
  // (clear of the stage at the north and of the near rows at the south)
  const POLE_AT = [130, 160, 190, 220, 240, 300, 320, 350, 20, 50];
  for (let i = 0; i < NP; i++) { const a = POLE_AT[i] * Math.PI / 180, x = Math.cos(a) * PR, z = Math.sin(a) * PR; poles.push([x, z]); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, PH, 10), wood); p.position.set(x, PH / 2, z); root.add(p);
    // (turned brass bands up it and a finial on top)
    [0.3, 2.4, 4.8, 7.2].forEach((y, k) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - k * 0.008, 0.14 - k * 0.008, k ? 0.12 : 0.6, 12), brassP); b.position.set(x, y, z); root.add(b); });
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), brassP); f.position.set(x, PH + 0.05, z); root.add(f); }
  const discs = DISCS.map(() => []);
  // (they turn to face down the court, to the gate and the band, the way they're hung for the people on the floor)
  const hangDisc = (x, y, z, s) => { discs[Math.floor(r() * DISCS.length)].push([x, y, z, s, (r() - 0.5) * 0.8]); };
  for (let i = 0; i < NP; i++) for (const step of [3, 4]) {
    const a = poles[i], b = poles[(i + step) % NP], A = [a[0], PH - 0.2, a[1]], B = [b[0], PH - 0.2, b[1]], len = Math.hypot(B[0] - A[0], B[2] - A[2]);
    if (step === 4 && i % 2) continue;
    kit.wires.cable(A, B, 0.9, 12);
    const n = Math.floor(len / (phone ? 5.4 : 4.4));
    for (let k = 1; k < n; k++) { const u = k / n, sagY = -0.9 * 4 * u * (1 - u), drop = 0.5 + r() * 1.1, s = 0.42 + r() * 0.2; const x = lerp(A[0], B[0], u), z = lerp(A[2], B[2], u), y = PH - 0.2 + sagY; kit.wires.line([x, y, z], [x, y - drop + s, z]); hangDisc(x, y - drop, z, s); }
  }
  poles.forEach(([x, z]) => hangDisc(x, PH + 0.8, z, 0.72));
  // (a brass rim round each; the faces lit)
  const dg = new THREE.CylinderGeometry(1, 1, 0.12, 40); dg.rotateX(Math.PI / 2);
  discs.forEach((list, k) => {
    if (!list.length) return;
    const face = kit.litMap(wheelTexture(DISCS[k], 11 + k), 1.12, 'festive'), im = new THREE.InstancedMesh(dg, [kit.glow('#d89a32', 0.7, 'festive'), face, face], list.length), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach(([x, y, z, s, ry], i) => { im.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, ry, 0)), new THREE.Vector3(s, s, s))); });
    root.add(im);
  });
  kit.pools.add(0, 0.02, 0, 14, 14, '#ffc8a0', 0.05, { layer: 'festive' });

  /* star kandils on lines along the terraces: paper stars in jewel colours, a tassel under each */
  const kandils = [[], [], [], []], KC = ['#ff4a6a', '#3ad87a', '#ffd04a', '#3ac8e8'];
  [-1, 1].forEach((sd) => { const xw = sd * (X + 1.4); kit.wires.cable([xw, 4.6, NZ + 0.5], [xw, 4.6, FZ - 0.5], 0.5, 18); for (let z = NZ + 1.6; z < FZ - 1; z += 1.8) { const u = (z - NZ - 0.5) / (FZ - NZ - 1), y = 4.6 - 0.5 * 4 * u * (1 - u) - 0.55; kit.wires.line([xw, y + 0.5, z], [xw, y + 0.2, z]); kandils[Math.floor(r() * 4)].push([xw, y, z]); } });
  // (a kandil of six paper panels: a cap, wide shoulders, a long point, the tassel under it)
  const kg = new THREE.LatheGeometry([[0, 0.34], [0.07, 0.34], [0.09, 0.28], [0.24, 0.12], [0.26, 0.02], [0.2, -0.12], [0.08, -0.34], [0.02, -0.42], [0, -0.43]].map(([a, b]) => new THREE.Vector2(a, b)), 6);
  kandils.forEach((list, k) => { if (!list.length) return; const im = new THREE.InstancedMesh(kg, kit.litMap(kandilTexture(KC[k]), 1.1, 'festive'), list.length); list.forEach(([x, y, z], i) => im.setMatrixAt(i, mx.makeTranslation(x, y, z))); root.add(im); const tg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), std(KC[k], 0.8), list.length); list.forEach(([x, y, z], i) => tg.setMatrixAt(i, mx.makeTranslation(x, y - 0.64, z))); root.add(tg); });

  /* velvet sofas round the floor, brass bowls of flowers on low tables, rugs; diyas round the floor's edge */
  const VEL = [['#1e5a3a', ['#c8962a', '#8a1424', '#1e2a6a']], ['#8a1424', ['#1e5a3a', '#c8962a', '#2a3a8a']], ['#1e2a6a', ['#8a1424', '#c8962a', '#1e5a3a']]];
  (DJ.seats || []).forEach((sf, i) => {
    const v = VEL[i % 3]; D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#5a3a1a', seat: v[0], cushions: v[1] });
    // (the near rows lit from behind by lanterns at their ends, so their backs read from the row behind)
    if (sf.near) { kit.pools.add(sf.x, 0.6, sf.z - 0.44, sf.len * 0.9, 0.9, '#ffc890', 0.16, { vertical: true, ry: Math.PI, layer: 'flame', live: true }); if (sf.near === 'a' && Math.abs(sf.x) > 1) D.lantern(sf.x + Math.sign(sf.x) * (sf.len / 2 + 0.35), 0, sf.z - 0.2); }
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
    points: [{ pos: [-14, 2.5, 2], color: GOLD, base: 30, distance: 14, layer: 'flame' }, { pos: [14, 2.5, 2], color: GOLD, base: 30, distance: 14, layer: 'flame' }, { pos: [0, 7, 0], color: '#ffd0b0', base: 26, distance: 18, layer: 'festive' }, { pos: [0, 7, DJ.stambh[1] - 3], color: GOLD, base: 26, distance: 18, layer: 'flame' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#18141e', 0.007), exposure: 1.0,
    update(t2, ctx) { glow.value = 0.9 * (0.35 + 0.65 * Math.max(ctx.lv.flame || 0, ctx.lv.architectural || 0)); }
  };
}

export default { seed: 1010, sky: nightSky, garbo: 'bare', garboK: 8, build: jyot };
