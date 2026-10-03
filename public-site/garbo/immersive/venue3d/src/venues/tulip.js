// TULIP GROVE, built from the owner's starred references (research/venue-reference-pack, priority 7, "Violet Lantern
// Grove": the plan zip-013, zip-014, zip-016, zip-017, zip-020 and the violet garden study), with the owner's change of
// 2026-10-02: tulips where the references hang woven cones. A garden clearing at night among old trees whose trunks
// and boughs are lit violet from below, fairy lights wound round the bark. A round floor of pale stone marked in rings
// and spokes; over it, from a ring of slender posts, wires run in to the middle hung with hundreds of tulip lamps, each
// a bloom of petals glowing from within in pink, red, saffron, yellow, violet and white, and more hang from the trees'
// branches; stone paths through beds of glowing tulips and shrubs, low lamps along them; sofas round the floor; woven
// lounge pods among the trees; the musicians on a low wooden deck at the far side under a frame of tulip lamps.
//
// The plan is the 2D scene's (venues2d/violet.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, face, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, normalMap, tex } from '../floors.js';
import { ground, Shape, droneScreen } from './common.js';
import { newDecor, newWoods, barkTexture, leafTexture, rugTexture } from './decor.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const AMBER = '#ffb85a', VIOLET = '#9a5aff';

/* ---------- textures ---------- */
function lawn(res) {
  const r = seeded(31), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#16200f'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  for (let i = 0; i < 26000; i++) { const x = r() * res, y = r() * res, l = r(); g.strokeStyle = l < 0.5 ? `rgba(60,90,36,${0.15 + r() * 0.25})` : `rgba(6,12,4,${0.2 + r() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4); g.stroke(); hg.fillStyle = l < 0.5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)'; hg.fillRect(x, y, 1, 3); }
  return { map: tex(c, [36, 36]), normal: tex(normalMap(hc, 2), [36, 36], true) };
}
// The floor (rings and spokes, as the plan draws it), the paths of stone pavers through the garden, a stone apron round
function floorDecal(rect, res, VG) {
  const r = seeded(7), c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k, R = VG.floor;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  const pave = (x0, z0, x1, z1, w) => { const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len; for (let d = 0; d < len; d += 0.6) for (let s = -w / 2; s < w / 2; s += 0.6) { const t = 168 + r() * 30; g.fillStyle = `rgb(${t},${t - 8},${t - 4})`; g.save(); g.translate(x0 + ux * d - uz * s, z0 + uz * d + ux * s); g.rotate(Math.atan2(uz, ux)); g.fillRect(0.03, 0.03, 0.54, 0.54); g.restore(); } };
  // the paths: in from the south, and round to the pods, curving through the beds
  pave(0, -R, 0, -26, 2.4);
  [[-17, -17], [17, -17], [-18, 15], [18, 15]].forEach(([x, z]) => { const a = Math.atan2(z, x), p0 = [Math.cos(a) * (R + 2.5), Math.sin(a) * (R + 2.5)]; pave(p0[0], p0[1], x * 0.88, z * 0.88, 1.6); });
  // the stone apron round the floor, then the floor
  g.fillStyle = '#a49aa8'; g.beginPath(); g.arc(0, 0, R + 1.4, 0, TAU); g.fill();
  g.fillStyle = '#d4c8d8'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  for (let i = 0; i < 2600; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; g.fillStyle = r() < 0.5 ? 'rgba(255,250,255,.08)' : 'rgba(90,70,110,.08)'; g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 0.08, 0.08); }
  g.strokeStyle = 'rgba(110,90,130,.55)'; g.lineWidth = 0.05;
  for (let rr = 2; rr < R; rr += 1.1) { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
  g.lineWidth = 0.12; g.strokeStyle = 'rgba(120,100,140,.8)'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  g.restore();
  return c;
}
// Rattan woven in a lattice of diagonal strands, open between them
function weaveTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.lineCap = 'round';
    for (let k = -h; k < w + h; k += 10) {
      g.strokeStyle = '#e8b870'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k + h, 0); g.lineTo(k, h); g.stroke();
      g.strokeStyle = 'rgba(120,70,20,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke();
    }
    g.strokeStyle = '#d8a058'; g.lineWidth = 5; [6, h - 6].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
  });
}
function shrubLeaf() {
  return canvasTexture(64, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, h); g.bezierCurveTo(0, h * 0.6, w * 0.1, h * 0.15, w / 2, 0); g.bezierCurveTo(w * 0.9, h * 0.15, w, h * 0.6, w / 2, h); const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#16341a'); gr.addColorStop(1, '#3e6a2c'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(180,210,140,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 4); g.stroke(); });
}

// A tulip's bloom: a cup on a lathe, its rim drawn up into six petal points (three outer, three inner, a little lower)
function tulipGeometry() {
  const geo = new THREE.LatheGeometry([[0.01, 0], [0.07, 0.01], [0.15, 0.05], [0.2, 0.13], [0.215, 0.24], [0.2, 0.34], [0.17, 0.42]].map(([a, b]) => new THREE.Vector2(a, b)), 18, 0, TAU);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); if (y < 0.2) continue;
    const a = Math.atan2(p.getZ(i), p.getX(i)), k = (y - 0.2) / 0.22, lobe = Math.pow(Math.abs(Math.cos(a * 3)), 3), inner = Math.pow(Math.abs(Math.sin(a * 3)), 3);
    p.setY(i, y + k * (0.09 * lobe + 0.05 * inner));
    const pinch = 1 - k * 0.12 * (1 - Math.max(lobe, inner)); p.setX(i, p.getX(i) * pinch); p.setZ(i, p.getZ(i) * pinch);
  }
  geo.computeVertexNormals();
  return geo;
}
// The petals' light: deep at the base, pale towards the rim, fine veins up them
function petalTexture() {
  return canvasTexture(64, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#9a9a9a'); gr.addColorStop(0.55, '#e8e8e8'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,120,120,.35)'; g.lineWidth = 1; for (let x = 4; x < w; x += 8) { g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 3, h / 2, x, 0); g.stroke(); }
  });
}
const TULIPS = ['#ff4a8a', '#ff3a48', '#ff9a2a', '#ffd23a', '#b06aff', '#fff0f4', '#ff6ab8'];

/* ---------- the venue ---------- */
function violet(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, VG = sp.plan, S = sp.stage, D = newDecor(kit, root), woods = newWoods();
  const lw = lawn(phone ? 512 : 1024), decalRect = { cx: 0, cz: -2, w: 60, d: 60 };
  const floorMesh = ground(root, { map: lw.map, normalMap: lw.normal, normalScale: 0.5, roughness: 0.85, decal: floorDecal(decalRect, phone ? 1024 : 2048, VG), decalRect }, 110, 110, 0, tier.shadows);
  const cones = [], iron = std('#2a2420', 0.55, 0.5);
  const cone = (x, y, z, s) => { cones.push([x, y, z, s]); };

  /* the posts round the floor, wires from each to a ring over the middle, lanterns all along them */
  const posts = [], hub = 1.6;
  for (let i = 0; i < VG.nPosts; i++) {
    const a = (i + 0.5) / VG.nPosts * TAU, x = Math.cos(a) * VG.posts, z = Math.sin(a) * VG.posts; posts.push([x, z, a]);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, VG.postH, 8), iron); p.position.set(x, VG.postH / 2, z); root.add(p);
    kit.bigBulbs.add(x * 0.99, 0.3, z * 0.99, 0, { color: VIOLET, k: 0.9, s: 0.35, twinkle: 0, layer: 'architectural' });
    const A = [x, VG.postH - 0.1, z], B = [Math.cos(a) * hub, VG.hubY, Math.sin(a) * hub];
    kit.wires.cable(A, B, 0.6, 12);
    const len = Math.hypot(B[0] - A[0], B[2] - A[2]), n = Math.floor(len / (phone ? 1.6 : 1.05));
    for (let k = 1; k < n; k++) { const u = k / n, x2 = lerp(A[0], B[0], u), z2 = lerp(A[2], B[2], u), y2 = lerp(A[1], B[1], u) - 0.6 * 4 * u * (1 - u), drop = 0.3 + ((k * 7 + i * 3) % 5) * 0.22; kit.wires.line([x2, y2, z2], [x2, y2 - drop, z2]); cone(x2, y2 - drop, z2, 0.8 + ((k + i) % 3) * 0.15); }
    // and round the ring of posts, from each to the next
    const nx = Math.cos(a + TAU / VG.nPosts) * VG.posts, nz = Math.sin(a + TAU / VG.nPosts) * VG.posts;
    kit.wires.cable(A, [nx, VG.postH - 0.1, nz], 0.5, 8);
    for (let k = 1; k < 5; k++) { const u = k / 5, x2 = lerp(x, nx, u), z2 = lerp(z, nz, u), y2 = VG.postH - 0.1 - 0.5 * 4 * u * (1 - u) - 0.5; kit.wires.line([x2, y2 + 0.5, z2], [x2, y2, z2]); cone(x2, y2, z2, 0.85); }
  }
  // the ring at the middle of the canopy, a cluster of lanterns under it
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(hub, 0.04, 6, 32), iron); ring.rotation.x = Math.PI / 2; ring.position.y = VG.hubY; root.add(ring); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; cone(Math.cos(a) * hub, VG.hubY - 0.6 - (i % 3) * 0.3, Math.sin(a) * hub, 1.1); kit.wires.line([Math.cos(a) * hub, VG.hubY, Math.sin(a) * hub], [Math.cos(a) * hub, VG.hubY - 0.6 - (i % 3) * 0.3, Math.sin(a) * hub]); } }

  /* the old trees round the clearing: violet light up their trunks and into their boughs, lanterns hanging from them */
  const tips = [];
  VG.trees.forEach(([x, z, h, spread], i) => {
    const dir = Math.atan2(-z, -x);
    woods.tree(r, x, z, h, spread, dir, { trunk: 0.85 + (i % 3) * 0.08, branches: phone ? 5 : 8, leaves: phone ? 5 : 8, rise: 1.6 }).forEach((p) => tips.push(p));
    const ux = -x / Math.hypot(x, z), uz = -z / Math.hypot(x, z);
    kit.pools.add(x + ux * 0.75, h * 0.4, z + uz * 0.75, 1.3, h * 0.45, VIOLET, 0.62, { vertical: true, ry: Math.atan2(ux, uz), layer: 'architectural' });
    kit.bigBulbs.add(x + ux * 1.0, 0.25, z + uz * 1.0, 0, { color: VIOLET, k: 1.1, s: 0.45, twinkle: 0, layer: 'architectural' });
    // fairy lights wound round the trunk
    for (let k = 0; k < 26; k++) { const a = k * 0.9, y = 0.4 + k * 0.17; kit.bulbs.add(x + Math.cos(a) * 0.5, y, z + Math.sin(a) * 0.5, k, { color: '#b080ff', k: 0.6, s: 0.4, twinkle: 0.5, layer: 'festive' }); }
  });
  tips.forEach((p, i) => { if (i % (phone ? 4 : 2)) return; if (Math.hypot(p[0], p[2]) < VG.floor + 1) return; const drop = 0.4 + (i % 4) * 0.3; kit.wires.line(p, [p[0], p[1] - drop, p[2]]); cone(p[0], p[1] - drop, p[2], 0.75 + (i % 3) * 0.12); });
  const leafMat = kit.selfLit(new THREE.MeshStandardMaterial({ map: leafTexture(['#2a1e4a', '#3a2a5e', '#24402a', '#4a3a6a', '#1e3a24'], 19), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }), 0.24, 'architectural');
  woods.build(root, new THREE.MeshStandardMaterial({ map: barkTexture(15, ['#3a3040', '#5a4a5e']), roughness: 0.9 }), leafMat, ['#c8b0ff', '#ffd8a0']);

  /* the tulip lamps: each bloom hangs open side down from a short green stem, lit from within in its colour */
  const bloom = tulipGeometry(), hung = bloom.clone(); hung.rotateX(Math.PI); hung.translate(0, -0.06, 0);
  const petalMat = kit.litMap(petalTexture(), 1.5, 'festive', { side: THREE.DoubleSide });
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), tc = new THREE.Color();
  // (built once every lamp is placed, the stage's too: see hangTulips() below)
  const hangTulips = () => {
    const cm = new THREE.InstancedMesh(hung, petalMat, cones.length);
    cones.forEach(([x, y, z, s], i) => { const col = TULIPS[(i * 5 + Math.floor(x * 3)) % TULIPS.length & 7 % TULIPS.length]; cm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q.setFromEuler(new THREE.Euler(0, i * 0.7, 0)), new THREE.Vector3(s * 1.15, s * 1.15, s * 1.15))); cm.setColorAt(i, tc.set(TULIPS[i % TULIPS.length])); kit.bigBulbs.add(x, y - 0.32 * s, z, i, { color: '#ffe2c0', k: 0.8, s: 0.4 * s, twinkle: 0.05, layer: 'festive' }); void col; });
    root.add(cm);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5), std('#3a7a2a', 0.7), cones.length); cones.forEach(([x, y, z], i) => stems.setMatrixAt(i, mx.makeTranslation(x, y, z))); root.add(stems);
  };
  kit.pools.add(0, 0.02, 0, VG.floor + 1, VG.floor + 1, AMBER, 0.07, { layer: 'festive' });

  /* the beds: shrubs of broad leaves and violet flowers along the paths and round the trees; low lamps along the paths */
  const beds = new Shape(), flowers = [];
  const bed = (x, z, s) => {
    const a0 = r() * TAU, n = 7;
    for (let i = 0; i < n; i++) {
      const az = a0 + i / n * TAU, L = s * (0.7 + r() * 0.5), W = L * 0.5, e = 0.6 + r() * 0.6, hor = [Math.cos(az), Math.sin(az)], sv = [Math.cos(az + Math.PI / 2), Math.sin(az + Math.PI / 2)];
      const mid = [x + hor[0] * Math.cos(e) * L * 0.5, Math.sin(e) * L * 0.55, z + hor[1] * Math.cos(e) * L * 0.5], tip = [x + hor[0] * L * 0.9, Math.sin(e) * L * 0.6, z + hor[1] * L * 0.9];
      const b0 = [x - sv[0] * 0.03, 0.03, z - sv[1] * 0.03], b1 = [x + sv[0] * 0.03, 0.03, z + sv[1] * 0.03], m0 = [mid[0] - sv[0] * W / 2, mid[1], mid[2] - sv[1] * W / 2], m1 = [mid[0] + sv[0] * W / 2, mid[1], mid[2] + sv[1] * W / 2];
      beds.tri(b0, b1, m1, [0.45, 0], [0.55, 0], [1, 0.5]); beds.tri(b0, m1, m0, [0.45, 0], [1, 0.5], [0, 0.5]); beds.tri(m0, m1, tip, [0, 0.5], [1, 0.5], [0.5, 1]);
    }
    for (let k = 0; k < 12; k++) flowers.push([x + (r() - 0.5) * s * 1.8, 0.3 + r() * 0.35 * s, z + (r() - 0.5) * s * 1.8]);
  };
  for (let i = 0; i < (phone ? 16 : 30); i++) { const a = (i + r() * 0.6) / (phone ? 16 : 30) * TAU, d = VG.lounge + 2.2 + r() * 3; if (Math.abs(Math.cos(a)) < 0.12 && Math.sin(a) < 0) continue; bed(Math.cos(a) * d, Math.sin(a) * d, 0.9 + r() * 0.6); }
  [-1, 1].forEach((sd) => { for (let z = -VG.floor - 2; z > -25; z -= 1.8) { bed(sd * (1.9 + r() * 0.4), z, 0.7 + r() * 0.3); kit.bigBulbs.add(sd * 1.45, 0.55, z + 0.9, 0, { color: '#ffe0b0', k: 0.8, s: 0.28, twinkle: 0, layer: 'practical' }); } });
  root.add(new THREE.Mesh(beds.geometry(), kit.selfLit(new THREE.MeshStandardMaterial({ map: shrubLeaf(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.65 }), 0.08, 'architectural')));
  if (flowers.length) {
    // tulips standing in the beds: a stem and a bloom glowing in its colour
    const fm = new THREE.InstancedMesh(bloom, kit.litMap(petalTexture(), 1.1, 'architectural', { side: THREE.DoubleSide }), flowers.length), sm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.01, 1, 5), std('#3a7a2a', 0.7), flowers.length), fc = new THREE.Color();
    flowers.forEach(([x, y, z], i) => { const h = y + 0.15; fm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, h, z), q.identity(), new THREE.Vector3(0.42, 0.42, 0.42))); fm.setColorAt(i, fc.set(TULIPS[(i * 3) % TULIPS.length])); sm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, h / 2, z), q.identity(), new THREE.Vector3(1, h, 1))); });
    root.add(fm); root.add(sm);
  }

  /* the woven lounge pods among the trees: a round sofa under a dome of rattan, open towards the floor, lit within */
  const podMat = kit.litMap(weaveTexture(), 0.45, 'practical', { alphaTest: 0.35, side: THREE.DoubleSide, transparent: false });
  VG.pods.forEach(([x, z]) => {
    const face = Math.atan2(-x, -z), dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 24, 12, face + 0.9, TAU - 1.8, 0, Math.PI / 2), podMat);
    dome.scale.y = 1.15; dome.position.set(x, 0, z); root.add(dome);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.18, 24), std('#5a4430', 0.7)); base.position.set(x, 0.09, z); root.add(base);
    for (let k = -1; k <= 1; k++) { const a = face + Math.PI + k * 0.9, sx = x + Math.sin(a) * 1.5, sz = z + Math.cos(a) * 1.5; D.sofa(sx, sz, a + Math.PI, 1.6, { y: 0.18, wood: '#6a4a2a', seat: '#e8dcc8', cushions: ['#7a4aba', '#c89a4a', '#4a2a6a'] }); }
    D.table(x, z, 0.8, 0.8, { y: 0.18, candles: 1, wood: '#4a3020' });
    kit.bigBulbs.add(x, 2.3, z, 0, { color: AMBER, k: 1.0, s: 0.5, twinkle: 0.04, layer: 'practical' });
    kit.pools.add(x, 0.2, z, 2.2, 2.2, AMBER, 0.14, { layer: 'practical', live: true });
  });

  /* the musicians' deck at the far side, a frame of posts over it hung with lanterns */
  const st = new THREE.Group(); root.add(st);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0 + 1, S.h, S.depth + 0.6), std('#6a4424', 0.65, 0.05)); deck.position.set(0, S.h / 2, S.z + S.depth / 2); st.add(deck);
  D.rug(0, S.z + 1.6, S.x1 - S.x0 - 0.6, 2.4, 0, rugTexture('stripe', ['#3a2a6a', '#c89a4a', '#7a4aba', '#e6dccb']), S.h + 0.006);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#c080ff' });
  [[S.x0 - 0.3, S.z + 0.2], [S.x1 + 0.3, S.z + 0.2], [S.x0 - 0.3, S.z + S.depth], [S.x1 + 0.3, S.z + S.depth]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 8), iron); p.position.set(x, 2.3, z); st.add(p); });
  [[S.x0 - 0.3, S.x1 + 0.3, S.z + 0.2], [S.x0 - 0.3, S.x1 + 0.3, S.z + S.depth]].forEach(([x0, x1, z]) => { kit.wires.cable([x0, 4.55, z], [x1, 4.55, z], 0.3, 10); for (let x = x0 + 0.8; x < x1 - 0.5; x += 1.0) cone(x, 4.1, z, 0.75); });
  kit.pools.add(0, 0.02, S.z - 1.6, 4.5, 2.4, AMBER, 0.12, { layer: 'show' });
  // behind the band a screen of woven cane, glowing violet and pink through the weave, tulip lamps along its top
  const weave = canvasTexture(512, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.75, 20, w / 2, h * 0.75, w * 0.6); gr.addColorStop(0, '#ffb0e0'); gr.addColorStop(0.45, '#b060f0'); gr.addColorStop(1, '#2a1450');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a2416'; g.lineWidth = 7;
    for (let k = -h; k < w + h; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k + h, 0); g.lineTo(k, h); g.stroke(); }
    g.lineWidth = 12; g.strokeRect(0, 0, w, h);
  });
  const BW = S.x1 - S.x0 + 0.6, bz = S.z + S.depth + 0.12;
  const screen = face(new THREE.Mesh(new THREE.PlaneGeometry(BW, 3.2), kit.litMap(weave, 0.8, 'architectural'))); screen.position.set(0, S.h + 1.6, bz); st.add(screen);
  const frameM = std('#4a3020', 0.7);
  [[0, S.h + 3.24, BW + 0.2, 0.12], [0, S.h + 0.05, BW + 0.2, 0.1]].forEach(([x, y, w, hh]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.14), frameM); b.position.set(x, y, bz + 0.04); st.add(b); });
  for (let x = -BW / 2 + 0.5; x <= BW / 2 - 0.4; x += 0.9) cone(x, S.h + 3.0, bz - 0.12, 0.55);
  kit.pools.add(0, S.h + 1.6, bz - 0.05, BW * 0.45, 1.8, '#c080ff', 0.12, { vertical: true, layer: 'architectural' });

  hangTulips();

  /* sofas round the floor */
  (VG.seats || []).forEach((sf) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#5a4030', seat: '#e6dccb', cushions: ['#7a4aba', '#c89a4a', '#5a2a7a', '#d8b0e8'] });
    if (!sf.near) { const fx = Math.sin(sf.ry), fz = Math.cos(sf.ry); D.lantern(sf.x + fx * 1.2 + Math.cos(sf.ry) * (sf.len / 2 + 0.3), 0, sf.z + fz * 1.2 - Math.sin(sf.ry) * (sf.len / 2 + 0.3), 0.85); }
  });
  /* beyond the clearing: the grove goes on, some trees lit violet, a few hung with lights, a treeline at the horizon */
  forestBelt(kit, root, { r0: 26, r1: 105, n: phone ? 400 : 850, h: [8, 15], seed: 71, tones: ['#1a1a2a', '#201e34', '#1a2a22', '#24203a'], lift: 0.85, lights: [0.07, '#b080ff'], skip: (x, z) => Math.abs(x) < 4 && z < 0 });
  horizonRidge(root, { radius: 300, base: -4, height: 26, tree: true, seed: 9, cols: ['#06050c', '#120e1e'] });
  D.finish();

  const rig = {
    hemi: ['#3a3070', '#1a1a14', 0.42, 0.66], moon: 1,
    spots: [{ pos: [-6, 16, -12], to: [0, 0, 3], color: '#d0c8ff', base: 30, distance: 46, angle: 0.62, layer: 'key' }, { pos: [0, 5.5, S.z - 4.5], to: [0, S.h + 1.1, S.z + 1.6], color: '#ffe0b8', base: 70, distance: 14, angle: 0.6, layer: 'show' }],
    points: [{ pos: [0, 5.5, 0], color: AMBER, base: 34, distance: 16, layer: 'festive' }, { pos: [-12, 2, 4], color: VIOLET, base: 30, distance: 14, layer: 'architectural' }, { pos: [12, 2, 4], color: VIOLET, base: 30, distance: 14, layer: 'architectural' }, { pos: [0, 2, -14], color: VIOLET, base: 24, distance: 12, layer: 'architectural' }]
  };
  // two screens of clear glass, each carried by a pair of drones, over the garden either side, under the tulip lamps
  const drones = [-1, 1].map((sd, i) => droneScreen(kit, root, { x: sd * 15.5, y: 4.3, z: 8, ry: Math.atan2(-sd * 15.5, -8), w: 5.0, i }));
  return { rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#1a1430', 0.012), exposure: 1.0, update(t, ctx) { drones.forEach((d) => d.update(t, ctx)); } };
}

export default { seed: 1212, sky: true, garbo: 'bare', garboK: 7, build: violet };
