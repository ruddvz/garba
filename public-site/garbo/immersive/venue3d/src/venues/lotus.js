// LOTUS AMPHITHEATRE, built from the owner's starred references (research/venue-reference-pack, priority 8: zip-075,
// zip-078, zip-088, zip-108, zip-116, zip-140, zip-153, zip-155, the plan zip-156 and zip-157): an open bowl under the
// night sky with the city's lights low on the horizon. A round floor of dark stone where a lotus is drawn in points and
// lines of cyan and magenta light; round it eight tiers of pale stone, a line of cyan light under every tread's nose
// and up every stair, brass lanterns standing on them, cushions where people sit; jali screens of carved stone round
// the top, lit warm from below, trees behind them; sofas with jewel cushions on the top tier either side; the stage
// raised at the north before a wall of jali and violet light; the way in at the south-west through a carved arch
// outlined in cyan, torches either side.
//
// The plan is the 2D scene's (venues2d/lotus.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, normalMap, tex } from '../floors.js';
import { trees } from '../props.js';
import { ground, Shape, glowInto, glowStone, droneScreen } from './common.js';
import { newDecor } from './decor.js';
import { sandstoneTexture, metreUV, torch, mergeAll } from './heritage.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const CYAN = '#40e4ff', MAGENTA = '#ff3ad0', WARM = '#ffc27a';

/* ---------- textures ---------- */
function granite(res) {
  const r = seeded(5), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#2a2c34'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  for (let i = 0; i < 26000; i++) { const l = r(); g.fillStyle = l < 0.4 ? `rgba(200,205,220,${0.05 + r() * 0.08})` : l < 0.7 ? `rgba(0,0,0,${0.1 + r() * 0.1})` : `rgba(120,110,140,${0.06 + r() * 0.06})`; g.fillRect(r() * res, r() * res, 1.6, 1.6); }
  g.strokeStyle = 'rgba(10,10,14,.7)'; g.lineWidth = 2; g.strokeRect(0, 0, res, res); hg.strokeStyle = '#404040'; hg.lineWidth = 3; hg.strokeRect(0, 0, res, res);
  return { map: tex(c, [80 / 3.2, 80 / 3.2]), normal: tex(normalMap(hc, 1.0), [80 / 3.2, 80 / 3.2], true) };
}
// The lotus in light (zip-078, zip-108): sixteen outer petals in cyan, eight inner ones in magenta, rings of points,
// a band of chevrons round the rim, all as lines and dots of light on black (laid additively over the floor)
function lotusLight(res, R) {
  const W = 2 * R + 0.6, c = canvas(res, res), g = c.getContext('2d'), k = res / W;
  g.fillStyle = '#000'; g.fillRect(0, 0, res, res); g.translate(res / 2, res / 2); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
  const C = 'rgba(90,235,255,', M = 'rgba(255,80,220,';
  const line = (col, w) => { g.lineWidth = w * 3; g.strokeStyle = col + '.12)'; g.stroke(); g.lineWidth = w; g.strokeStyle = col + '1)'; g.stroke(); };
  const dots = (rr, n, col, s) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; g.fillStyle = col + '.25)'; g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, s * 2.2, 0, TAU); g.fill(); g.fillStyle = col + '1)'; g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, s, 0, TAU); g.fill(); } };
  const petal = (a, r0, r1, w) => { g.save(); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, w, r0 + (r1 - r0) * 0.8, w * 0.7, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.8, -w * 0.7, r0 + (r1 - r0) * 0.3, -w, r0, 0); g.restore(); };
  // the rim: two rings and chevrons between them, in magenta
  g.beginPath(); g.arc(0, 0, R - 0.15, 0, TAU); line(M, 0.06); g.beginPath(); g.arc(0, 0, R - 0.9, 0, TAU); line(M, 0.05);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, a2 = (i + 0.5) / 48 * TAU, a3 = (i + 1) / 48 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * (R - 0.85), Math.sin(a) * (R - 0.85)); g.lineTo(Math.cos(a2) * (R - 0.2), Math.sin(a2) * (R - 0.2)); g.lineTo(Math.cos(a3) * (R - 0.85), Math.sin(a3) * (R - 0.85)); line(C, 0.04); }
  dots(R - 1.3, 120, M, 0.07);
  for (let i = 0; i < 16; i++) { petal(i / 16 * TAU, 2.6, R - 1.7, 1.9); line(C, 0.07); }
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * TAU; for (let d = 3; d < R - 2.2; d += 0.45) { g.fillStyle = M + '1)'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.06, 0, TAU); g.fill(); } }
  for (let i = 0; i < 8; i++) { petal(i / 8 * TAU + TAU / 16, 1.6, 5.4, 1.4); line(M, 0.07); }
  g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); line(C, 0.06); dots(2.1, 36, C, 0.06); g.beginPath(); g.arc(0, 0, 1.55, 0, TAU); line(M, 0.05);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { t, W };
}
// A jali: a stone screen pierced in a lattice of eight-pointed stars
function jaliTexture(holesOnly) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = holesOnly ? '#000' : '#d8cdb8'; g.fillRect(0, 0, w, h);
    g.fillStyle = holesOnly ? '#fff' : '#000';
    for (let y = 16; y < h - 8; y += 20) for (let x = 12 + ((y / 20) % 2) * 10; x < w - 6; x += 20) { g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rr = k % 2 ? 4 : 7.5; if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + rr, y); } g.closePath(); g.fill(); }
    if (!holesOnly) { g.strokeStyle = '#b8ab92'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }
  });
}

/* ---------- the venue ---------- */
function lotus(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, LO = sp.plan, S = sp.stage, D = newDecor(kit, root);
  const tiers = new Shape(), strips = new Shape(), sources = [], glow = { value: 1 }, extra = [];
  const src = (x, y, z, hex, k, reach) => sources.push({ x, y, z, r: reach, c: new THREE.Color(hex).multiplyScalar(k) });
  const rad = (d) => d * Math.PI / 180, P = (d, rr) => [Math.cos(rad(d)) * rr, Math.sin(rad(d)) * rr];
  const inStage = (d) => { const dn = ((d % 360) + 360) % 360; return dn > LO.stageFrom && dn < LO.stageTo; };
  const aisleAt = (d, rr) => LO.aisles.find((a) => Math.abs(((d - a + 540) % 360) - 180) * Math.PI / 180 * rr < LO.aisleW);

  const gr = granite(phone ? 512 : 1024);
  const floorMesh = ground(root, { map: gr.map, normalMap: gr.normal, normalScale: 0.3, roughness: 0.4, decal: null, decalRect: null }, 110, 110, 4, tier.shadows);
  floorMesh.material.userData.env = 0.7;
  const ll = lotusLight(phone ? 1024 : 2048, LO.floor), lotusMat = kit.litMap(ll.t, 1.45, 'show', { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), lotusM = new THREE.Mesh(new THREE.PlaneGeometry(ll.W, ll.W), lotusMat);
  lotusM.rotation.x = -Math.PI / 2; lotusM.position.y = 0.008; lotusM.renderOrder = 1; lotusM.userData.dynamic = true; root.add(lotusM);
  kit.pools.add(0, 0.02, 0, LO.floor + 2, LO.floor + 2, '#a050ff', 0.06, { layer: 'show' });

  /* the tiers: every 2° a slice of each tread and its riser, the stage's gap left open; in the aisles, stairs of two
     half-steps to each tier; a strip of cyan under every nose */
  const STEP = 2;
  for (let k = 0; k < LO.tiers; k++) {
    const r0 = LO.r0 + k * LO.tread, r1 = k === LO.tiers - 1 ? LO.top + 1.4 : r0 + LO.tread, y0 = k * LO.rise, y1 = (k + 1) * LO.rise;
    for (let d = LO.stageTo; d < LO.stageFrom + 360; d += STEP) {
      const dm = d + STEP / 2, aisle = aisleAt(dm, r0 + LO.tread / 2);
      const A = P(d, r0), B = P(d + STEP, r0), C = P(d + STEP, r1), Dd = P(d, r1);
      if (aisle == null) {
        tiers.grid([A[0], y1, A[1]], [B[0], y1, B[1]], [C[0], y1, C[1]], [Dd[0], y1, Dd[1]], 1, 1, [0, 1, 0], (p) => [p[0] / 2.4, p[2] / 2.4]);
        tiers.grid([A[0], y0, A[1]], [B[0], y0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], 1, 1, [-Math.cos(rad(dm)), 0, -Math.sin(rad(dm))], (p) => [Math.hypot(p[0], p[2]) * rad(dm) / 2.4, p[1] / 2.4]);
        const e = 0.012, ia = [A[0] * (1 - e / r0), A[1] * (1 - e / r0)], ib = [B[0] * (1 - e / r0), B[1] * (1 - e / r0)];
        strips.grid([ia[0], y1 - 0.09, ia[1]], [ib[0], y1 - 0.09, ib[1]], [ib[0], y1 - 0.025, ib[1]], [ia[0], y1 - 0.025, ia[1]], 1, 1, [-Math.cos(rad(dm)), 0, -Math.sin(rad(dm))], () => [0, 0]);
      } else {
        // two half-steps up to this tier
        [[0, 0.5], [0.5, 1]].forEach(([f0, f1]) => {
          const ra = r0 + f0 * (r1 - r0) * (k === LO.tiers - 1 ? LO.tread / (r1 - r0) : 1), rb = r0 + f1 * (k === LO.tiers - 1 ? LO.tread : r1 - r0), ya = y0 + f0 * LO.rise, yb = y0 + f1 * LO.rise;
          const a1 = P(d, ra), b1 = P(d + STEP, ra), c1 = P(d + STEP, rb), d1 = P(d, rb);
          tiers.grid([a1[0], yb, a1[1]], [b1[0], yb, b1[1]], [c1[0], yb, c1[1]], [d1[0], yb, d1[1]], 1, 1, [0, 1, 0], (p) => [p[0] / 2.4, p[2] / 2.4]);
          tiers.grid([a1[0], ya, a1[1]], [b1[0], ya, b1[1]], [b1[0], yb, b1[1]], [a1[0], yb, a1[1]], 1, 1, [-Math.cos(rad(dm)), 0, -Math.sin(rad(dm))], (p) => [Math.hypot(p[0], p[2]) * rad(dm) / 2.4, p[1] / 2.4]);
          strips.grid([a1[0] * 0.999, yb - 0.08, a1[1] * 0.999], [b1[0] * 0.999, yb - 0.08, b1[1] * 0.999], [b1[0] * 0.999, yb - 0.02, b1[1] * 0.999], [a1[0] * 0.999, yb - 0.02, a1[1] * 0.999], 1, 1, [-Math.cos(rad(dm)), 0, -Math.sin(rad(dm))], () => [0, 0]);
        });
        if (k === LO.tiers - 1) { const a2 = P(d, r0 + LO.tread), b2 = P(d + STEP, r0 + LO.tread), c2 = P(d + STEP, r1), d2 = P(d, r1); tiers.grid([a2[0], y1, a2[1]], [b2[0], y1, b2[1]], [c2[0], y1, c2[1]], [d2[0], y1, d2[1]], 1, 1, [0, 1, 0], (p) => [p[0] / 2.4, p[2] / 2.4]); }
      }
    }
    // the tier's ends at the stage's gap
    [LO.stageTo, LO.stageFrom + 360].forEach((d) => { const A = P(d, r0), B = P(d, r1), n = d === LO.stageTo ? [-Math.sin(rad(d)), 0, Math.cos(rad(d))] : [Math.sin(rad(d)), 0, -Math.cos(rad(d))]; tiers.grid([A[0], 0, A[1]], [B[0], 0, B[1]], [B[0], y1, B[1]], [A[0], y1, A[1]], 2, 1, n, (p) => [Math.hypot(p[0], p[2]) / 2.4, p[1] / 2.4]); });
  }
  // the back of the top tier: a low wall round its outer edge
  for (let d = LO.stageTo; d < LO.stageFrom + 360; d += STEP) { const A = P(d, LO.top + 1.4), B = P(d + STEP, LO.top + 1.4), yT = LO.tiers * LO.rise; tiers.grid([A[0], yT, A[1]], [B[0], yT, B[1]], [B[0], yT + 0.5, B[1]], [A[0], yT + 0.5, A[1]], 1, 1, [-Math.cos(rad(d + 1)), 0, -Math.sin(rad(d + 1))], (p) => [p[0] / 2.4, p[1] / 2.4]); }

  /* brass lanterns on the tiers, here and there; cushions under the people the 2D scene seats */
  for (let k = 1; k < LO.tiers; k += 2) for (let d = LO.stageTo + 6; d < LO.stageFrom + 354; d += 360 / (14 + k * 2)) {
    const rr = LO.r0 + k * LO.tread + 0.25, p = P(d, rr); if (aisleAt(d, rr) != null) continue;
    D.lantern(p[0], (k + 1) * LO.rise, p[1], 0.75); src(p[0], (k + 1) * LO.rise + 0.3, p[1], WARM, 0.45, 2.6);
  }
  LO.aisles.forEach((a) => { for (let k = 0; k < LO.tiers; k += 2) [-1, 1].forEach((sd) => { const rr = LO.r0 + k * LO.tread + 0.5, t = (LO.aisleW + 0.35) / rr * sd, p = [Math.cos(rad(a) + t) * rr, Math.sin(rad(a) + t) * rr]; D.lantern(p[0], (k + 1) * LO.rise, p[1], 0.7); src(p[0], (k + 1) * LO.rise + 0.3, p[1], WARM, 0.4, 2.4); }); });
  const seatList = ((data && data.seats) || []).filter((se) => se.kind === 'terrace'), cushionCols = ['#c2185b', '#1e7a8a', '#e0a02a', '#6a2a9a', '#a01a3a', '#2a8a5a'];
  if (seatList.length) {
    const cm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), std('#ffffff', 0.85), seatList.length), mx = new THREE.Matrix4(), cc = new THREE.Color();
    seatList.forEach((se, i) => { mx.compose(new THREE.Vector3(se.x, se.y + 0.05, se.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(se.x, se.z), 0)), new THREE.Vector3(0.3, 0.085, 0.24)); cm.setMatrixAt(i, mx); cm.setColorAt(i, cc.set(cushionCols[i % cushionCols.length])); });
    root.add(cm);
  }

  /* the jali screens round the top, lit from below; trees behind them */
  const jaliMat = new THREE.MeshStandardMaterial({ map: jaliTexture(), alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide, transparent: false });
  jaliMat.map.colorSpace = THREE.SRGBColorSpace;
  // the lanterns behind each screen show through its stars, warm (zip-088, zip-140)
  jaliMat.emissiveMap = jaliTexture(true); jaliMat.emissive.set('#ffb060'); kit.selfLit(jaliMat, 1.3, 'architectural');
  const jg = new THREE.PlaneGeometry(1.7, 3.8); jg.translate(0, 1.9, 0);
  const jaliList = [];
  for (let d = LO.stageTo + 3; d < LO.stageFrom + 357; d += 6) {
    if (Math.abs(((d - LO.entrance + 540) % 360) - 180) < 5) continue;
    const p = P(d, LO.jali), yT = LO.tiers * LO.rise; jaliList.push([p[0], yT, p[1], -rad(d) - Math.PI / 2]);
    const warm = Math.round(d / 6) % 4 !== 0; kit.pools.add(p[0] * 0.99, yT + 1.6, p[1] * 0.99, 0.9, 1.6, warm ? WARM : '#4a9aff', warm ? 0.16 : 0.14, { vertical: true, ry: -rad(d) - Math.PI / 2, layer: 'architectural' });
    if (Math.round(d / 6) % 2 === 0) kit.bigBulbs.add(p[0] * 0.985, yT + 0.12, p[1] * 0.985, 0, { color: warm ? WARM : '#6ab8ff', k: 0.7, s: 0.3, twinkle: 0, layer: 'architectural' });
  }
  { const im = new THREE.InstancedMesh(jg, jaliMat, jaliList.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); jaliList.forEach(([x, y, z, ry], i) => im.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, ry, 0)), new THREE.Vector3(1, 1, 1)))); root.add(im); }
  const tl = [];
  for (let i = 0; i < (phone ? 14 : 24); i++) { const a = r() * TAU, d = LO.jali + 3 + r() * 6; if (inStage(a * 180 / Math.PI)) continue; const n = 4 + Math.floor(r() * 3), blobs = []; for (let k = 0; k < n; k++) blobs.push([(r() - 0.5) * 2.6, 3.6 + r() * 1.8, (r() - 0.5) * 1.2, 1.1 + r() * 1.0]); tl.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.8 + r() * 0.3, blobs, fairy: r() < 0.5, hue: 0, tone: Math.floor(r() * 3) }); }
  trees(kit, root, tl);

  /* the sofas on the top tier either side, jewel cushions, lanterns */
  const yTop = LO.tiers * LO.rise;
  [[-12, 12], [168, 192]].forEach(([d0, d1]) => { for (let d = d0; d <= d1; d += 8) { const rr = LO.top + 0.7, p = P(d, rr), ry = Math.atan2(-p[0], -p[1]); D.sofa(p[0], p[1], ry, 2.4, { y: yTop, wood: '#6a6a70', seat: '#d8d0c4', cushions: ['#c2185b', '#1e7a8a', '#e0a02a', '#6a2a9a'] }); } });

  /* the stage: raised at the north, a strip of cyan along its front, jali and bars of violet and blue light behind */
  const st = new THREE.Group(); root.add(st);
  const stoneM = std('#3a3640', 0.7, 0.05), zB = S.z + S.depth;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0 + 4, S.h, S.depth + 1.2), stoneM); deck.position.set(0, S.h / 2, S.z + S.depth / 2 + 0.4); st.add(deck);
  strips.grid([S.x0 - 2, S.h - 0.07, S.z - 0.21], [S.x1 + 2, S.h - 0.07, S.z - 0.21], [S.x1 + 2, S.h - 0.03, S.z - 0.21], [S.x0 - 2, S.h - 0.03, S.z - 0.21], 1, 1, [0, 0, -1], () => [0, 0]);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#40e4ff' });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0 + 4, 6.2, 0.3), std('#1a1822', 0.8)); backWall.position.set(0, S.h + 3.1, zB + 0.6); st.add(backWall);
  for (let i = 0; i < 9; i++) { const x = lerp(S.x0 - 1, S.x1 + 1, i / 8), bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.4, 0.08), kit.glow(i % 2 ? '#7a5aff' : '#3a8aff', 1.6, 'show')); bar.position.set(x, S.h + 3.0, zB + 0.42); st.add(bar); }
  for (let i = 0; i < 4; i++) { const x = lerp(S.x0 - 0.2, S.x1 + 0.2, (i + 0.5) / 4), j = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.2), jaliMat); j.position.set(x, S.h + 2.9, zB + 0.4); j.rotation.y = Math.PI; st.add(j); }
  kit.pools.add(0, S.h + 3, zB + 0.35, (S.x1 - S.x0) * 0.6, 3.2, '#7a5aff', 0.14, { vertical: true, ry: Math.PI, layer: 'show' });
  kit.pools.add(0, 0.02, S.z - 2.4, 6, 3, '#c080ff', 0.1, { layer: 'show' });
  [S.x0 - 1.6, S.x1 + 1.6].forEach((x) => { D.lantern(x, S.h, S.z + 0.3, 1); });

  /* the way in at the south-west: a carved arch over the aisle at the top, outlined in cyan, torches either side */
  { const a = rad(LO.entrance), rr = LO.top + 1.2, c = [Math.cos(a) * rr, Math.sin(a) * rr], ry = -a - Math.PI / 2, yT = LO.tiers * LO.rise, Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0));
    const W2 = 1.6, H = 4.6, w = (x, y) => new THREE.Vector3(x, y, 0).applyQuaternion(Q).add(new THREE.Vector3(c[0], yT, c[1]));
    [-1, 1].forEach((sd) => { const pier = metreUV(new THREE.BoxGeometry(1.0, H + 1.2, 1.0), 2.4); pier.applyMatrix4(new THREE.Matrix4().compose(w(sd * (W2 + 0.5), (H + 1.2) / 2), Q, new THREE.Vector3(1, 1, 1))); extra.push(pier); });
    const lintel = metreUV(new THREE.BoxGeometry(2 * W2 + 2, 1.0, 1.0), 2.4); lintel.applyMatrix4(new THREE.Matrix4().compose(w(0, H + 0.7), Q, new THREE.Vector3(1, 1, 1))); extra.push(lintel);
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; if (t < 0.2) pts.push(w(-W2, t / 0.2 * 2.8)); else if (t > 0.8) pts.push(w(W2, (1 - t) / 0.2 * 2.8)); else { const u = (t - 0.2) / 0.6, th = Math.PI * (1 - u); pts.push(w(Math.cos(th) * W2, 2.8 + Math.sin(th) * 1.5)); } }
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.05, 6), kit.glow(CYAN, 1.6, 'architectural')));
    const iron = std('#1c1814', 0.6, 0.6);
    [-1, 1].forEach((sd) => { const p = w(sd * (W2 + 1.3), 0); torch(kit, root, iron, p.x, p.z, 1.8, yT); src(p.x, yT + 2, p.z, '#ff9a4a', 0.9, 4.5); });
  }
  /* beyond the jali: trees round the bowl, then the city's lights low on the horizon, as the references have them */
  forestBelt(kit, root, { r0: 26, r1: 62, n: phone ? 140 : 300, h: [6, 11], seed: 41, tones: ['#1a2c1a', '#20341e', '#162616'] });
  townBelt(kit, root, { r0: 100, r1: 220, n: phone ? 110 : 240, style: 'modern', h: [10, 40], seed: 43 });
  horizonRidge(root, { radius: 330, base: -4, height: 14, seed: 13, cols: ['#06070e', '#0e1020'] });
  D.finish();

  /* the stone: pale, the lanterns' light baked into it */
  const geo = mergeAll([tiers.geometry()].concat(extra.map((g) => (g.index ? g.toNonIndexed() : g))));
  glowInto(geo, sources);
  const t = sandstoneTexture(['#c8c0b4', '#a8a094'], 21); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const stone = new THREE.Mesh(geo, glowStone({ map: t, roughness: 0.82 }, glow, 'lotus-stone')); stone.receiveShadow = !!tier.shadows; root.add(stone);
  const stripMat = kit.glow(CYAN, 1.85, 'architectural'); root.add(new THREE.Mesh(strips.geometry(), stripMat));

  // two screens of clear glass, each carried by a pair of drones, over the upper tiers either side
  const drones = [-1, 1].map((sd, i) => droneScreen(kit, root, { x: sd * 14, y: 7.6, z: 8, ry: Math.atan2(-sd * 14, -8), w: 5.6, i }));

  const rig = {
    hemi: ['#3a4878', '#2a2420', 0.45, 0.7], moon: 1,
    spots: [{ pos: [0, 16, -18], to: [0, 0, 2], color: '#d8d8ff', base: 30, distance: 50, angle: 0.62, layer: 'key' }, { pos: [0, 7, S.z - 6], to: [0, S.h + 1.2, S.z + 1.8], color: '#ffe4c8', base: 90, distance: 18, angle: 0.55, layer: 'show' }],
    points: [{ pos: [-12, 3, -4], color: WARM, base: 26, distance: 14, layer: 'practical' }, { pos: [12, 3, -4], color: WARM, base: 26, distance: 14, layer: 'practical' }, { pos: [0, 2.5, 0], color: '#a060ff', base: 22, distance: 14, layer: 'show' }, { pos: [0, 5, S.z + 2], color: '#7a5aff', base: 40, distance: 14, layer: 'show' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#0e1020', 0.006), exposure: 1.0,
    update(t2, ctx) { glow.value = 0.8 * (0.35 + 0.65 * (ctx.lv.practical || 0)); drones.forEach((d) => d.update(t2, ctx)); }
  };
}

export default { seed: 1111, sky: true, garbo: 'bare', garboK: 6, build: lotus };
