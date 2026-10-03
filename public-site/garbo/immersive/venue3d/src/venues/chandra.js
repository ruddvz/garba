// CHANDRA VAN, built from the owner's starred references (research/venue-reference-pack, priority 5: zip-098, zip-104,
// zip-053, zip-039, the forest plan zip-037 and the bioluminescent-jungle board): a moonlit garden among banyans. A round
// floor of polished white marble where a lotus mandala is inlaid in gold; a narrow channel of water round it with lotus
// candles floating on it and a little bridge to the band; arches of twisted branches round the floor hung with big
// glowing paper lanterns; the musicians in a pavilion of branches; sofas among glowing teal leaves, violet lotuses and
// bell flowers, golden spikes and glowing mushrooms; banyans with their hanging roots all round; a huge moon low over
// the trees.
//
// The plan is the 2D scene's (venues2d/chandra.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { trees } from '../props.js';
import { canvas, normalMap, tex } from '../floors.js';
import { ground } from './common.js';
import { newDecor, rugTexture, newWoods, barkTexture, leafTexture } from './decor.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const AMBER = '#ffbe6a', TEAL = '#4ae8d8', VIOLET = '#b07aff';

/* ---------- textures ---------- */
function moss(res) {
  const r = seeded(73), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#0e1a12'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  for (let i = 0; i < 26000; i++) { const x = r() * res, y = r() * res, l = r(); g.fillStyle = l < 0.5 ? `rgba(40,70,40,${0.2 + r() * 0.3})` : `rgba(4,10,6,${0.25 + r() * 0.3})`; g.fillRect(x, y, 2, 2); hg.fillStyle = l < 0.5 ? '#a0a0a0' : '#606060'; hg.fillRect(x, y, 2, 2); }
  return { map: tex(c, [36, 36]), normal: tex(normalMap(hc, 2.4), [36, 36], true) };
}
// The floor: polished white marble in rings of slabs with grey veins, the lotus mandala inlaid in gold (as the
// bioluminescent-jungle board has it), a stone curb, the water round it, stone paths out to the seats
function floorDecal(rect, res, CV) {
  const r = seeded(19), c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  [[-90, 4.4], [90, 3]].forEach(([deg, len]) => { const a = deg * Math.PI / 180; g.save(); g.rotate(a); g.fillStyle = '#2a2e34'; g.fillRect(CV.water[1], -1.2, len, 2.4); g.restore(); });
  g.fillStyle = '#20242a'; g.beginPath(); g.arc(0, 0, CV.water[0], 0, TAU); g.fill();
  // flagstones in rings, each a shade apart, thin dark joints
  for (let ring = 0; ring < 7; ring++) {
    const r0 = ring * 2, r1 = Math.min(CV.floor, r0 + 2), n = Math.max(6, Math.round(TAU * (r0 + 1) / 1.8));
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, t = 206 + r() * 22; g.fillStyle = `rgb(${t},${t - 4},${t - 10})`; g.beginPath(); g.arc(0, 0, r1, a0, a1); g.arc(0, 0, r0, a1, a0, true); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,112,100,.35)'; g.lineWidth = 0.025; g.stroke(); }
  }
  // grey veins wandering through the marble
  g.save(); g.beginPath(); g.arc(0, 0, CV.floor, 0, TAU); g.clip();
  for (let i = 0; i < 60; i++) { let x = (r() - 0.5) * 2 * CV.floor, y = (r() - 0.5) * 2 * CV.floor, a = r() * TAU; g.strokeStyle = `rgba(110,104,100,${0.12 + r() * 0.16})`; g.lineWidth = 0.02 + r() * 0.04; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5; a += (r() - 0.5) * 0.8; g.lineTo(x, y); } g.stroke(); }
  g.restore();
  inlayLines(g, CV.floor, 'rgba(176,132,58,.95)', 1);
  g.strokeStyle = '#6a645a'; g.lineWidth = 0.3; g.beginPath(); g.arc(0, 0, CV.floor + 0.15, 0, TAU); g.stroke();
  g.restore();
  return c;
}
// The lotus mandala in the floor: drawn once in gold on the marble, and again as the light running in the inlay
function inlayLines(g, R, gold, wk, teal) {
  g.lineCap = 'round';
  const glow = !!teal, st = (w, col) => { if (glow) { g.lineWidth = w * 2.6; g.strokeStyle = col.replace('1)', '.14)'); g.stroke(); } g.lineWidth = w * wk; g.strokeStyle = col; g.stroke(); };
  teal = teal || gold;
  [R - 0.4, R - 0.9, 9.9, 4.6, 1.9].forEach((rr, i) => { g.beginPath(); g.arc(0, 0, rr, 0, TAU); st(i === 0 ? 0.08 : 0.05, i % 2 ? teal : gold); });
  const petals = (n, r0, r1, w, col) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; g.save(); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.35, w, r0 + (r1 - r0) * 0.8, w * 0.6, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.8, -w * 0.6, r0 + (r1 - r0) * 0.35, -w, r0, 0); st(0.045, col); g.restore(); } };
  petals(16, 4.8, 9.6, 1.6, gold); petals(16, 5.6, 8.6, 0.7, teal); petals(8, 2.0, 4.4, 1.0, gold);
  for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 10.2, Math.sin(a) * 10.2); g.lineTo(Math.cos(a) * (R - 1.1), Math.sin(a) * (R - 1.1)); st(0.025, i % 2 ? teal : gold); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.arc(Math.cos(a) * 11.6, Math.sin(a) * 11.6, 1.05, 0, TAU); st(0.03, gold); }
}
function inlayGlow(res, R) {
  const W = 2 * R + 1, c = canvas(res, res), g = c.getContext('2d'), k = res / W;
  g.fillStyle = '#000'; g.fillRect(0, 0, res, res); g.translate(res / 2, res / 2); g.scale(k, k);
  inlayLines(g, R, 'rgba(255,214,140,1)', 0.8, 'rgba(255,226,170,1)');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { t, W };
}
function glowLeafTexture() {
  return canvasTexture(128, 192, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const shape = () => { g.beginPath(); g.moveTo(w / 2, h); g.bezierCurveTo(w * 0.02, h * 0.62, w * 0.1, h * 0.12, w / 2, h * 0.02); g.bezierCurveTo(w * 0.9, h * 0.12, w * 0.98, h * 0.62, w / 2, h); g.closePath(); };
    shape(); const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#0c3a3a'); gr.addColorStop(1, '#1a6a6a'); g.fillStyle = gr; g.fill();
    g.save(); shape(); g.clip(); g.shadowColor = 'rgba(120,255,240,.9)'; g.shadowBlur = 5; g.strokeStyle = 'rgba(150,255,240,.95)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, h * 0.04); g.stroke();
    for (let i = 1; i < 10; i++) { const y = h * (1 - i / 10.5); [-1, 1].forEach((sd) => { g.lineWidth = 1.3; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + sd * w * 0.25, y - h * 0.04, w / 2 + sd * w * 0.44, y - h * 0.1); g.stroke(); }); }
    g.restore(); shape(); g.strokeStyle = 'rgba(140,255,240,.7)'; g.lineWidth = 1.5; g.stroke();
  });
}
function lanternTexture() {
  return canvasTexture(64, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#a0602a'); gr.addColorStop(0.5, '#ffe2a8'); gr.addColorStop(1, '#a0602a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,50,20,.7)'; g.lineWidth = 2; for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 10; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}
function moonTexture(res) {
  const r = seeded(4);
  return canvasTexture(res, res, (g, w) => {
    const cx = w / 2, R = w * 0.4;
    const halo = g.createRadialGradient(cx, cx, R * 0.9, cx, cx, w / 2); halo.addColorStop(0, 'rgba(200,180,255,.45)'); halo.addColorStop(1, 'rgba(200,180,255,0)'); g.fillStyle = halo; g.fillRect(0, 0, w, w);
    const f = g.createRadialGradient(cx - R * 0.3, cx - R * 0.3, R * 0.1, cx, cx, R); f.addColorStop(0, '#f6f0ff'); f.addColorStop(0.6, '#d8ccf0'); f.addColorStop(1, '#a898d0'); g.fillStyle = f; g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.clip();
    for (let i = 0; i < 14; i++) { const x = cx + (r() - 0.5) * R * 1.6, y = cx + (r() - 0.5) * R * 1.6, rr = R * (0.08 + r() * 0.2); g.fillStyle = `rgba(120,100,170,${0.15 + r() * 0.18})`; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, r() * 3, 0, TAU); g.fill(); }
    for (let i = 0; i < 40; i++) { const x = cx + (r() - 0.5) * R * 1.8, y = cx + (r() - 0.5) * R * 1.8, rr = R * (0.01 + r() * 0.04); g.strokeStyle = 'rgba(90,70,140,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke(); }
    g.restore();
  });
}
function sky(tier) {
  const root = new THREE.Group(), phone = tier.name === 'phone';
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { c0: { value: new THREE.Color('#0a0e1a') }, c1: { value: new THREE.Color('#3a3a7a') }, c2: { value: new THREE.Color('#1c1a48') }, c3: { value: new THREE.Color('#04051a') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h < 0.0 ? c0 : h < 0.12 ? mix(c1, c2, h / 0.12) : mix(c2, c3, clamp((h - 0.12) / 0.6, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }'
  }));
  dome.renderOrder = -10; root.add(dome);
  const r = seeded(31), n = phone ? 700 : 1300, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = r() * TAU, el = Math.asin(0.1 + Math.pow(r(), 0.7) * 0.9), R = 800, k = 0.3 + r() * 0.7; pos[i * 3] = Math.cos(a) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * R; col[i * 3] = k * 0.9; col[i * 3 + 1] = k * 0.92; col[i * 3 + 2] = k; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  root.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true })));
  // the huge moon, low over the trees at the far side
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(phone ? 512 : 1024), fog: false, depthWrite: false, transparent: true }));
  const az = -0.05, el = 0.3, R = 700; moon.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, Math.cos(az) * Math.cos(el) * R); moon.scale.setScalar(R * 0.42); root.add(moon);
  return { root, moonLight: { dir: moon.position.clone().normalize(), intensity: 0.4 }, info: null };
}

/* ---------- the venue ---------- */
function chandra(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, CV = sp.plan, S = sp.stage, D = newDecor(kit, root), woods = newWoods();
  const ms = moss(phone ? 512 : 1024), decalRect = { cx: 0, cz: 0, w: 46, d: 46 };
  const floorMesh = ground(root, { map: ms.map, normalMap: ms.normal, normalScale: 0.35, roughness: 0.42, decal: floorDecal(decalRect, phone ? 1024 : 2048, CV), decalRect }, 110, 110, 4, tier.shadows);
  floorMesh.material.userData.env = 0.85;
  const ig = inlayGlow(phone ? 1024 : 2048, CV.floor), inl = new THREE.Mesh(new THREE.PlaneGeometry(ig.W, ig.W), kit.litMap(ig.t, 0.45, 'architectural', { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  inl.rotation.x = -Math.PI / 2; inl.position.y = 0.006; inl.renderOrder = 1; root.add(inl);

  /* the water round the floor, lotus candles floating on it, a little bridge over it to the band */
  const water = new THREE.Mesh(new THREE.RingGeometry(CV.water[0], CV.water[1], 96), new THREE.MeshStandardMaterial({ color: '#06121c', roughness: 0.04, metalness: 0.2 }));
  water.material.userData.env = 1.3; water.rotation.x = -Math.PI / 2; water.position.y = 0.004; root.add(water);
  [CV.water[0] - 0.05, CV.water[1] + 0.05].forEach((rr) => { const k = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.1, 4, 96), std('#3a3e46', 0.7)); k.rotation.x = Math.PI / 2; k.scale.z = 0.5; k.position.y = 0.04; root.add(k); });
  const pads = [], lotus = [];
  for (let i = 0; i < (phone ? 24 : 44); i++) { const a = r() * TAU, d = lerp(CV.water[0] + 0.25, CV.water[1] - 0.25, r()); if (Math.abs(Math.cos(a)) < 0.12 && Math.sin(a) > 0) continue; pads.push([Math.cos(a) * d, Math.sin(a) * d, r() * TAU, 0.18 + r() * 0.12]); if (i % 2 === 0) { lotus.push([Math.cos(a) * d, Math.sin(a) * d]); kit.flames.add(Math.cos(a) * d, 0.08, Math.sin(a) * d, { bowl: null, s: 0.03, k: 0.6 }); kit.pools.add(Math.cos(a) * d, 0.02, Math.sin(a) * d, 0.8, 0.8, LIGHT.flame, 0.12, { layer: 'flame' }); } }
  const pm = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 12), std('#1a4a2a', 0.6, 0, { side: THREE.DoubleSide }), pads.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion();
  pads.forEach(([x, z, a, s], i) => pm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, 0.03, z), q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, a)), new THREE.Vector3(s, s, s)))); root.add(pm);
  const lg = new THREE.LatheGeometry([[0, 0], [0.08, 0.02], [0.12, 0.06], [0.1, 0.12], [0.06, 0.15]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
  const lm = new THREE.InstancedMesh(lg, kit.glow('#ff9ac8', 1.2, 'flame'), lotus.length); lotus.forEach(([x, z], i) => lm.setMatrixAt(i, mx.makeTranslation(x, 0.02, z))); root.add(lm);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, CV.water[1] - CV.water[0] + 1.2), std('#5a3a22', 0.7)); bridge.position.set(0, 0.12, (CV.water[0] + CV.water[1]) / 2); root.add(bridge);
  [-1.3, 1.3].forEach((x) => { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, CV.water[1] - CV.water[0] + 1.2), std('#4a2e1a', 0.7)); rail.position.set(x, 0.7, (CV.water[0] + CV.water[1]) / 2); root.add(rail); });

  /* the arches of branches round the floor, lanterns hanging from them */
  const lanterns = [];
  for (let i = 0; i < CV.nArches; i++) {
    const a = (i + 0.5) / CV.nArches * TAU; if (Math.abs(a - Math.PI / 2) < 0.3) continue;
    const c = [Math.cos(a) * CV.arches, 0, Math.sin(a) * CV.arches], t = [-Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2];
    const tops = woods.arch([c[0] - t[0], 0, c[2] - t[2]], [c[0] + t[0], 0, c[2] + t[2]], 5.8 + r() * 0.8, 3, 0.12);
    tops.forEach((p, k) => { if (k % 2 && phone) return; const L = 0.6 + r() * 0.9; kit.wires.line(p, [p[0], p[1] - L, p[2]]); lanterns.push([p[0], p[1] - L - 0.35, p[2], 1.0 + r() * 0.5, r() < 0.74 ? AMBER : r() < 0.5 ? TEAL : VIOLET]); });
  }
  // the long walk of arches at the back right, lanterns down it
  for (let k = 0; k < 6; k++) { const a = 0.55, d = 21 + k * 3.2, c = [Math.cos(a) * d, 0, Math.sin(a) * d], t = [-Math.sin(a) * 1.8, 0, Math.cos(a) * 1.8]; woods.arch([c[0] - t[0], 0, c[2] - t[2]], [c[0] + t[0], 0, c[2] + t[2]], 4.8, 2, 0.1).forEach((p, j) => { if (j === 3) lanterns.push([p[0], p[1] - 0.8, p[2], 0.7, AMBER]); }); }

  /* the musicians' pavilion: a dome of branches over a wooden deck, lanterns inside it */
  const st = new THREE.Group(); root.add(st);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0, S.h, S.depth), std('#5a3a22', 0.6, 0.05)); deck.position.set(0, S.h / 2, S.z + S.depth / 2); st.add(deck);
  D.rug(0, S.z + 1.6, S.x1 - S.x0 - 0.6, 2.4, 0, rugTexture('persian', ['#1e3a5a', '#7a1a5a', '#d6a64a', '#e6f0e8']), S.h + 0.006);
  const pc = [0, S.z + S.depth / 2];
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, b = a + Math.PI * 0.9; if (Math.sin(a) < -0.5) continue; woods.arch([pc[0] + Math.cos(a) * 4.6, 0, pc[1] + Math.sin(a) * 2.2], [pc[0] + Math.cos(b) * 4.6, 0, pc[1] + Math.sin(b) * 2.2], 5.2, 2, 0.1); }
  [-2.4, 0, 2.4].forEach((x) => lanterns.push([x, 3.4, S.z + 1.8, 0.9, AMBER]));
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#9affe8' });
  kit.pools.add(0, 0.02, S.z - 1.4, 4.5, 2.4, AMBER, 0.12, { layer: 'show' });

  /* the lanterns: oval paper lanterns, each a lamp, their light on the ground below */
  const lt = lanternTexture(), lgeo = new THREE.LatheGeometry([[0, -0.5], [0.2, -0.45], [0.33, -0.2], [0.36, 0.05], [0.3, 0.3], [0.15, 0.45], [0, 0.5]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
  const lmat = kit.litMap(lt, 1.4, 'practical'), lim = new THREE.InstancedMesh(lgeo, lmat, lanterns.length), cc = new THREE.Color();
  lim.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(lanterns.length * 3), 3);
  lanterns.forEach(([x, y, z, s, c], i) => { lim.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q.identity(), new THREE.Vector3(s, s, s))); lim.setColorAt(i, cc.set(c === AMBER ? '#ffffff' : c)); if (y < 7) kit.pools.add(x, 0.02, z, 2.2 * s, 2.2 * s, c, 0.07, { layer: 'practical' }); });
  root.add(lim);

  /* banyans all round, their roots hanging; dark trees beyond */
  const tips = [];
  for (let i = 0; i < (phone ? 7 : 11); i++) {
    const a = (i + r() * 0.6) / (phone ? 7 : 11) * TAU, d = 24 + r() * 5, x = Math.cos(a) * d, z = Math.sin(a) * d;
    woods.tree(r, x, z, 6.5 + r() * 2, 9 + r() * 3, Math.atan2(-z, -x), { trunk: 0.9, branches: phone ? 5 : 7, leaves: phone ? 5 : 8, arc: 4.2, rise: 1.4 }).forEach((p) => tips.push(p));
  }
  tips.forEach((p, i) => { if (i % 5 === 0 && p[1] > 4) woods.drop(p, 0, 0.05); if (i % 3 === 0) kit.bulbs.add(p[0], p[1] - 0.1, p[2], 0, { color: i % 2 ? '#ffd8a0' : '#9affe8', k: 0.5, s: 0.5, twinkle: 0.5, layer: 'festive' }); });
  const bg = []; for (let i = 0; i < (phone ? 26 : 44); i++) { const a = r() * TAU, d = 34 + r() * 20; if (Math.sin(a) > 0.82) continue; const n = 5 + Math.floor(r() * 3), blobs = []; for (let k = 0; k < n; k++) blobs.push([(r() - 0.5) * 5, 6 + r() * 4, (r() - 0.5) * 2, 2.4 + r() * 1.8]); bg.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 1.2 + r() * 0.6, blobs, fairy: false, hue: 0, tone: Math.floor(r() * 3) }); }
  trees(kit, root, bg);
  const leafMat = kit.selfLit(new THREE.MeshStandardMaterial({ map: leafTexture(['#0e2a1c', '#14382a', '#1e4a34', '#0a2016'], 23), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }), 0.06, 'festive');
  woods.build(root, new THREE.MeshStandardMaterial({ map: barkTexture(9, ['#2a2620', '#4a4236']), roughness: 0.9 }), leafMat, ['#a8c8b8', '#d0e8d8']);

  /* the glowing garden: giant teal leaves, violet bell flowers, glowing mushrooms */
  const leaves = [], bells = [], caps = [], flowers = [], spikes = [];
  const bed = (x, z, big) => {
    for (let k = 0; k < (big ? 7 : 4); k++) { const a = r() * TAU, s = (big ? 1.6 : 1.0) * (0.7 + r() * 0.5); leaves.push([x + Math.cos(a) * 0.3, z + Math.sin(a) * 0.3, a, 0.5 + r() * 0.5, s]); }
    if (r() < 0.55) for (let k = 0; k < 2; k++) flowers.push([x + (r() - 0.5) * 1.6, z + (r() - 0.5) * 1.6, 0.28 + r() * 0.2]);
    if (r() < 0.35) spikes.push([x + (r() - 0.5) * 1.2, z + (r() - 0.5) * 1.2, 0.8 + r() * 0.6]);
    for (let k = 0; k < 6; k++) bells.push([x + (r() - 0.5) * 1.4, 0.5 + r() * 1.2, z + (r() - 0.5) * 1.4]);
    if (r() < 0.6) for (let k = 0; k < 4; k++) caps.push([x + (r() - 0.5) * 1.2, z + (r() - 0.5) * 1.2, 0.1 + r() * 0.16]);
    kit.pools.add(x, 0.02, z, 1.8, 1.8, TEAL, 0.05, { layer: 'architectural' });
  };
  for (let i = 0; i < (phone ? 24 : 44); i++) { const a = (i + r() * 0.5) / (phone ? 24 : 44) * TAU, d = 16.2 + r() * 1.6; if (Math.abs(a - Math.PI / 2) < 0.28 || Math.abs(a - Math.PI * 1.5) < 0.22) continue; bed(Math.cos(a) * d, Math.sin(a) * d, r() < 0.65); }
  for (let i = 0; i < 12; i++) { const a = r() * TAU, d = 20 + r() * 3; bed(Math.cos(a) * d, Math.sin(a) * d, true); }
  const leafGeo = new THREE.PlaneGeometry(1, 1.5); leafGeo.translate(0, 0.75, 0);
  const glm = new THREE.InstancedMesh(leafGeo, kit.litMap(glowLeafTexture(), 1.1, 'architectural', { alphaTest: 0.35, side: THREE.DoubleSide }), leaves.length), e = new THREE.Euler();
  leaves.forEach(([x, z, a, tilt, s], i) => glm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(e.set(tilt, a, 0, 'YXZ')), new THREE.Vector3(s, s, s)))); root.add(glm);
  const bgeo = new THREE.LatheGeometry([[0, 0.12], [0.03, 0.1], [0.06, 0.03], [0.08, -0.04], [0.06, -0.06]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
  const bm = new THREE.InstancedMesh(bgeo, kit.glow(VIOLET, 1.4, 'architectural'), bells.length); bells.forEach(([x, y, z], i) => { bm.setMatrixAt(i, mx.makeTranslation(x, y, z)); kit.wires.line([x, y + 0.1, z], [x + 0.05, y + 0.6, z]); }); root.add(bm);
  // violet lotuses glowing open, petals in two rings; golden spikes rising like agaves
  if (flowers.length) {
    const pg = new THREE.ConeGeometry(0.22, 0.7, 4, 1, true); pg.translate(0, 0.35, 0); pg.rotateX(0.55);
    const petals = []; flowers.forEach(([x, z, s]) => { for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + (k % 2) * 0.3, tilt = k % 2 ? 0.75 : 0.35; petals.push(mx.compose(new THREE.Vector3(x, 0.05, z), q.setFromEuler(e.set(tilt, a, 0, 'YXZ')), new THREE.Vector3(s, s, s)).clone()); } kit.pools.add(x, 0.02, z, 1.2, 1.2, VIOLET, 0.08, { layer: 'architectural' }); });
    const fm = new THREE.InstancedMesh(pg, kit.glow('#c88aff', 1.25, 'architectural'), petals.length); petals.forEach((m, i) => fm.setMatrixAt(i, m)); root.add(fm);
  }
  if (spikes.length) {
    const sg = new THREE.ConeGeometry(0.07, 1, 4); sg.translate(0, 0.5, 0);
    const list = []; spikes.forEach(([x, z, h]) => { for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; list.push(mx.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(e.set(0.35 + (k % 3) * 0.15, a, 0, 'YXZ')), new THREE.Vector3(1, h * (0.7 + (k % 2) * 0.4), 1)).clone()); } });
    const sm = new THREE.InstancedMesh(sg, kit.glow('#ffc860', 1.0, 'architectural'), list.length); list.forEach((m, i) => sm.setMatrixAt(i, m)); root.add(sm);
  }
  const cgeo = new THREE.SphereGeometry(1, 10, 5, 0, TAU, 0, Math.PI / 2);
  const cm = new THREE.InstancedMesh(cgeo, kit.glow('#ffb86a', 0.9, 'architectural'), caps.length); caps.forEach(([x, z, s], i) => cm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, s * 1.2, z), q.identity(), new THREE.Vector3(s, s * 0.5, s)))); root.add(cm);

  /* the seats among the plants, rugs and lantern posts by them, baskets of dandiya sticks */
  (CV.seats || []).forEach((sf, i) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#4a3a2a', seat: '#e6dccb', cushions: ['#b8307a', '#1e7a7a', '#d6a64a', '#5a3a9a'] });
    const fx = Math.sin(sf.ry), fz = Math.cos(sf.ry), tx = Math.cos(sf.ry), tz = -Math.sin(sf.ry);
    if (!sf.near) { D.table(sf.x + fx * 1.0, sf.z + fz * 1.0, 0.7, 0.5, { candles: 1 }); D.urn(sf.x + tx * (sf.len / 2 + 0.4), sf.z + tz * (sf.len / 2 + 0.4)); }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6), std('#2a2018', 0.6, 0.3)); post.position.set(sf.x - tx * (sf.len / 2 + 0.4), 0.8, sf.z - tz * (sf.len / 2 + 0.4)); root.add(post);
    D.lantern(sf.x - tx * (sf.len / 2 + 0.4), 1.6, sf.z - tz * (sf.len / 2 + 0.4), 0.9);
  });
  for (let i = 0; i < 28; i++) { const a = (i + 0.5) / 28 * TAU, x = Math.cos(a) * (CV.floor - 0.4), z = Math.sin(a) * (CV.floor - 0.4); if (Math.abs(x) < 2 && Math.abs(z) > 13) continue; D.lantern(x, 0, z, 0.8); }
  /* the forest beyond the garden, out to the horizon: banyans and dark trees in two belts, a treeline at the edge of
     sight, a gap kept low where the moon rises over the band */
  const moonGap = (x, z, d) => z > 0 && Math.abs(x) < z * 0.55 && d < 95;
  forestBelt(kit, root, { r0: 31, r1: 110, n: phone ? 450 : 1000, h: [8, 16], seed: 81, tones: ['#0e2418', '#123020', '#16382a', '#0c1e16'], dim: 0.55, lights: [0.06, '#9affe8'], skip: (x, z) => moonGap(x, z, Math.hypot(x, z)) || Math.hypot(x - Math.cos(0.55) * 29, z - Math.sin(0.55) * 29) < 9 });
  forestBelt(kit, root, { r0: 110, r1: 230, n: phone ? 350 : 800, h: [12, 22], seed: 83, tones: ['#0a1a14', '#0c2018', '#081610'], dim: 0.6 });
  horizonRidge(root, { radius: 320, base: -4, height: 34, tree: true, seed: 5, cols: ['#04080a', '#0a1614'] });
  D.finish();

  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#0c1022', side: THREE.BackSide })));
  const em = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8ccff').multiplyScalar(2.4) })); em.position.set(0, 12, 40); env.add(em);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 4 ? AMBER : TEAL).multiplyScalar(3) })); m.position.set(Math.cos(a) * 18, 4, Math.sin(a) * 18); env.add(m); }

  const rig = {
    hemi: ['#5a5a9a', '#101e16', 0.5, 0.78], moon: 1,
    spots: [{ pos: [-2, 22, 40], to: [0, 0, 2], color: '#d8d0ff', base: 60, distance: 80, angle: 0.5, layer: 'key' }, { pos: [0, 5, S.z - 4], to: [0, S.h + 1.1, S.z + 1.8], color: '#ffe0b8', base: 70, distance: 14, angle: 0.6, layer: 'show' }],
    points: [{ pos: [-12, 4, 8], color: AMBER, base: 34, distance: 16, layer: 'practical' }, { pos: [12, 4, 8], color: AMBER, base: 34, distance: 16, layer: 'practical' }, { pos: [0, 4, -14], color: AMBER, base: 28, distance: 14, layer: 'practical' }, { pos: [0, 2, 16], color: TEAL, base: 20, distance: 12, layer: 'architectural' }]
  };
  return { rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#0a1020', 0.012), exposure: 0.98, envScene: env };
}

export default { seed: 808, sky, garbo: 'bare', garboK: 11, build: chandra };
