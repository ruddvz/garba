// KUTCH WHITE RANN · SALTLIGHT CIRCLE, built from the owner's starred references (research/venue-reference-pack, priority
// 13: the moonlit hero and the material, costume and prop study; generated concept art, not a real venue): a Garba
// circle out on the white salt under the moon. The salt runs to the horizon, its crust cracked into low polygons,
// silvered by the moon, a sheen where it's wet; a raised ivory platform, a warm strip of light under its edge, its rim
// a band of indigo patterned in white; at its middle one perforated terracotta lamp, a pot pierced with diamonds and
// circles, glowing, on a round wooden base with small lanterns round it; tall clay panels cut through with diamonds and
// set with round mirrors; the musicians on a low dais spread with an indigo durrie; low seating round the platform,
// indigo and ivory cushions and bolsters, brass bowls of candles, dried grass in pots, brass lanterns; out on the salt,
// round bhunga huts, white-walled under conical thatch, lit from within. Salt white, indigo, madder rust, terracotta.
//
// The plan is the 2D scene's (venues2d/kutch.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, normalMap, tex } from '../floors.js';
import { ground } from './common.js';
import { newDecor } from './decor.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const INDIGO = '#1e2a6a', MADDER = '#8a2a1e', TERRA = '#c8703a', AMBER = '#ffb45a';

/* ---------- textures ---------- */
// The salt: near white, cracked into low polygons whose raised edges catch the moon, a little grey between
function salt(res) {
  const r = seeded(37), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#d4d4dc'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  // a jittered grid of cells, each drawn as a polygon with a raised white rim
  const n = 7, cell = res / n, pts = [];
  for (let i = 0; i <= n; i++) for (let k = 0; k <= n; k++) pts.push([(i + (i % n ? (r() - 0.5) * 0.6 : 0)) * cell, (k + (k % n ? (r() - 0.5) * 0.6 : 0)) * cell]);
  const P = (i, k) => pts[(i % (n + 1)) * (n + 1) + (k % (n + 1))];
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    const q = [P(i, k), P(i + 1, k), P(i + 1, k + 1), P(i, k + 1)], t = 200 + r() * 26;
    g.fillStyle = `rgb(${t},${t},${t + 6})`; g.beginPath(); q.forEach((p, m) => (m ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.stroke(); g.strokeStyle = 'rgba(120,120,140,.5)'; g.lineWidth = 1.2; g.stroke();
    hg.strokeStyle = '#d0d0d0'; hg.lineWidth = 6; hg.beginPath(); q.forEach((p, m) => (m ? hg.lineTo(p[0], p[1]) : hg.moveTo(p[0], p[1]))); hg.closePath(); hg.stroke();
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.2)' : 'rgba(120,120,140,.06)'; g.fillRect(r() * res, r() * res, 1.5, 1.5); }
  return { map: tex(c, [400 / 9, 400 / 9]), normal: tex(normalMap(hc, 1.6), [400 / 9, 400 / 9], true) };
}
// The platform's top: ivory, smooth, the indigo border with its white pattern, a fine rust line inside it
function deckTop(R) {
  return canvasTexture(2048, 2048, (g, w) => {
    const k = w / (2 * (R + 0.6)), c = w / 2; g.fillStyle = '#ece4d4'; g.fillRect(0, 0, w, w);
    g.save(); g.translate(c, c); g.scale(k, k);
    g.fillStyle = INDIGO; g.beginPath(); g.arc(0, 0, R + 0.6, 0, TAU); g.arc(0, 0, R - 0.5, 0, TAU, true); g.fill('evenodd');
    // the border's pattern: white stepped diamonds and dots, as the textiles have it
    g.fillStyle = '#f3ecdc';
    for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, rr = R + 0.05; g.save(); g.rotate(a); g.translate(rr, 0); g.beginPath(); g.moveTo(0, -0.14); g.lineTo(0.22, 0); g.lineTo(0, 0.14); g.lineTo(-0.22, 0); g.closePath(); g.fill(); g.fillStyle = INDIGO; g.beginPath(); g.moveTo(0, -0.06); g.lineTo(0.1, 0); g.lineTo(0, 0.06); g.lineTo(-0.1, 0); g.closePath(); g.fill(); g.fillStyle = '#f3ecdc'; g.beginPath(); g.arc(0.42, 0.13, 0.04, 0, TAU); g.arc(-0.42, -0.13, 0.04, 0, TAU); g.fill(); g.restore(); }
    g.strokeStyle = '#f3ecdc'; g.lineWidth = 0.05; [R - 0.42, R + 0.52].forEach((rr) => { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); });
    g.strokeStyle = MADDER; g.lineWidth = 0.05; g.beginPath(); g.arc(0, 0, R - 0.7, 0, TAU); g.stroke();
    g.restore();
  });
}
// A pot of terracotta pierced with diamonds and circles: the map the clay, the emissive map only the piercings
function lampSkin() {
  const W = 1024, H = 512, clay = canvas(W, H), light = canvas(W, H), g = clay.getContext('2d'), l = light.getContext('2d'), r = seeded(9);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#b8602e'); gr.addColorStop(1, '#8a4420'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,24,10' : '230,160,110'},${0.06 + r() * 0.08})`; g.fillRect(r() * W, r() * H, 2, 2); }
  l.fillStyle = '#000'; l.fillRect(0, 0, W, H);
  for (let row = 0; row < 6; row++) {
    const y = H * (0.18 + row * 0.13), n = 14;
    for (let i = 0; i < n; i++) {
      const x = (i + (row % 2) * 0.5) / n * W, s = 18 - Math.abs(row - 2.5) * 3;
      [g, l].forEach((c, k) => { c.fillStyle = k ? '#fff' : '#2a1206'; c.beginPath(); if (row % 2) c.arc(x, y, s * 0.55, 0, TAU); else { c.moveTo(x, y - s); c.lineTo(x + s * 0.7, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.7, y); c.closePath(); } c.fill(); });
    }
  }
  const map = new THREE.CanvasTexture(clay), em = new THREE.CanvasTexture(light);
  [map, em].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; });
  return { map, em };
}
// A clay panel: terracotta, cut through with diamonds and lozenges in a column, round mirrors set between them
function panelSkin() {
  const W = 128, H = 384, clay = canvas(W, H), cut = canvas(W, H), g = clay.getContext('2d'), a = cut.getContext('2d'), r = seeded(21);
  g.fillStyle = '#b8683a'; g.fillRect(0, 0, W, H); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,30,12' : '230,170,120'},${0.07 + r() * 0.08})`; g.fillRect(r() * W, r() * H, 2, 2); }
  a.fillStyle = '#fff'; a.fillRect(0, 0, W, H); a.fillStyle = '#000';
  for (let y = 40; y < H - 30; y += 74) {
    a.beginPath(); a.moveTo(W / 2, y - 26); a.lineTo(W / 2 + 22, y); a.lineTo(W / 2, y + 26); a.lineTo(W / 2 - 22, y); a.closePath(); a.fill();
    [[0.2, 0.5], [0.8, 0.5]].forEach(([u]) => { a.beginPath(); a.moveTo(W * u, y - 14); a.lineTo(W * u + 10, y); a.lineTo(W * u, y + 14); a.lineTo(W * u - 10, y); a.closePath(); a.fill(); });
    g.fillStyle = '#e8eef6'; g.beginPath(); g.arc(W / 2, y + 37, 7, 0, TAU); g.fill(); g.strokeStyle = '#7a3a18'; g.lineWidth = 2; g.stroke();
  }
  g.strokeStyle = '#7a3a18'; g.lineWidth = 4; g.strokeRect(4, 4, W - 8, H - 8);
  const map = new THREE.CanvasTexture(clay), alpha = new THREE.CanvasTexture(cut); map.colorSpace = THREE.SRGBColorSpace; return { map, alpha };
}
// A cushion's cloth: indigo or rust, white stepped diamonds and dots
function cloth(bg) {
  return canvasTexture(128, 64, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#f0e8d8'; for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y); g.lineTo(x, y + 4); g.lineTo(x - 4, y); g.closePath(); g.fill(); } });
}
function moonTexture() {
  return canvasTexture(256, 256, (g, w) => { const cx = w / 2, R = w * 0.36; const halo = g.createRadialGradient(cx, cx, R * 0.9, cx, cx, w / 2); halo.addColorStop(0, 'rgba(255,245,225,.45)'); halo.addColorStop(1, 'rgba(255,245,225,0)'); g.fillStyle = halo; g.fillRect(0, 0, w, w); g.fillStyle = '#fff8ea'; g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.fill(); });
}
function saltSky(tier) {
  const root = new THREE.Group(), phone = tier.name === 'phone';
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { c0: { value: new THREE.Color('#8a90b0') }, c1: { value: new THREE.Color('#5a6ca0') }, c2: { value: new THREE.Color('#24346c') }, c3: { value: new THREE.Color('#0a1236') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h < 0.0 ? c0 : h < 0.1 ? mix(c1, c2, h / 0.1) : mix(c2, c3, clamp((h - 0.1) / 0.6, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }'
  }));
  dome.renderOrder = -10; root.add(dome);
  const r = seeded(43), n = phone ? 400 : 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = r() * TAU, el = Math.asin(0.2 + Math.pow(r(), 0.7) * 0.8), R = 800, k = 0.25 + r() * 0.5; pos[i * 3] = Math.cos(a) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * R; col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  root.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true })));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), fog: false, depthWrite: false, transparent: true }));
  const az = -0.35, el = 0.16, R = 700; moon.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, Math.cos(az) * Math.cos(el) * R); moon.scale.setScalar(R * 0.06); root.add(moon);
  return { root, moonLight: { dir: moon.position.clone().normalize(), intensity: 0.7 }, info: null };
}

/* ---------- the venue ---------- */
function kutch(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, KR = sp.plan, S = sp.stage, D = newDecor(kit, root), mx = new THREE.Matrix4();
  const sl = salt(phone ? 512 : 1024);
  const floorMesh = ground(root, { map: sl.map, normalMap: sl.normal, normalScale: 0.45, roughness: 0.55, decal: null, decalRect: null }, 400, 400, 0, tier.shadows);
  floorMesh.material.userData.env = 0.6;

  /* the platform: a raised ivory disc, its top the indigo-bordered deck, a warm strip of light under its edge, two steps */
  const R = KR.floor, H = KR.deck;
  const top = new THREE.Mesh(new THREE.CircleGeometry(R + 0.6, 128), new THREE.MeshStandardMaterial({ map: deckTop(R), roughness: 0.4, metalness: 0.02 })); top.rotation.x = -Math.PI / 2; top.position.y = H; top.receiveShadow = true; root.add(top);
  top.material.userData.env = 0.5;
  const side = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.55, H, 128, 1, true), std('#d8ccb6', 0.6)); side.position.y = H / 2; root.add(side);
  const strip = new THREE.Mesh(new THREE.TorusGeometry(R + 0.56, 0.035, 6, 160), kit.glow(AMBER, 1.6, 'architectural')); strip.rotation.x = Math.PI / 2; strip.position.y = 0.05; root.add(strip);
  kit.pools.add(0, 0.02, 0, R + 2.2, R + 2.2, AMBER, 0.05, { layer: 'architectural' });
  for (const a of [-Math.PI / 2, 0.6, 2.5]) { const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, H / 2, 0.6), std('#e2d8c4', 0.6)); step.position.set(Math.cos(a) * (R + 0.9), H / 4, Math.sin(a) * (R + 0.9)); step.rotation.y = Math.PI / 2 - a; root.add(step); }

  /* the lamp at the middle: the pierced pot on a round wooden base, its light, small lanterns round it */
  const L = KR.lamp, ls = lampSkin(), lampM = new THREE.MeshStandardMaterial({ map: ls.map, emissiveMap: ls.em, emissive: new THREE.Color(AMBER), emissiveIntensity: 2.4, roughness: 0.85 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(L.plinth, L.plinth + 0.05, L.plinthH, 48), std('#6a4428', 0.55)); base.position.y = H + L.plinthH / 2; root.add(base);
  const pot = new THREE.Mesh(new THREE.LatheGeometry([[0.2, 0], [0.42, 0.06], [0.62, 0.3], [0.66, 0.55], [0.58, 0.85], [0.4, 1.05], [0.24, 1.2], [0.2, 1.3], [0.12, 1.42], [0.05, 1.52], [0, 1.56]].map(([a, b]) => new THREE.Vector2(a, b)), 48), lampM);
  pot.position.y = H + L.plinthH; root.add(pot);
  kit.bigBulbs.add(0, H + L.plinthH + 0.6, 0, 0, { color: AMBER, k: 1.6, s: 0.8, twinkle: 0.15, layer: 'garbo' });
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU; D.lantern(Math.cos(a) * (L.plinth - 0.25), H + L.plinthH, Math.sin(a) * (L.plinth - 0.25), 0.55); }
  kit.pools.add(0, H + 0.01, 0, 4.4, 4.4, AMBER, 0.2, { layer: 'garbo', live: true });

  /* the clay panels: in pairs, cut through with diamonds, mirrors set in them, lit warm from their feet */
  const ps = panelSkin(), panelM = new THREE.MeshStandardMaterial({ map: ps.map, alphaMap: ps.alpha, alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide });
  KR.panels.forEach(([x, z]) => {
    const ry = Math.atan2(-x, -z), m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.4, 0.28), [std('#a85a2e', 0.85), std('#a85a2e', 0.85), std('#a85a2e', 0.85), std('#a85a2e', 0.85), panelM, panelM]);
    m.position.set(x, 1.7, z); m.rotation.y = ry; root.add(m);
    kit.bigBulbs.add(x - Math.sin(ry) * -0.5, 0.15, z - Math.cos(ry) * -0.5, 0, { color: AMBER, k: 0.9, s: 0.35, twinkle: 0, layer: 'architectural' });
    kit.pools.add(x + Math.sin(ry) * 0.3, 1.6, z + Math.cos(ry) * 0.3, 0.7, 1.7, AMBER, 0.18, { vertical: true, ry, layer: 'architectural' });
    D.urn(x + Math.sin(ry) * 0.9 + Math.cos(ry) * 0.8, z + Math.cos(ry) * 0.9 - Math.sin(ry) * 0.8);
  });

  /* the musicians' dais: low, spread with an indigo durrie, bolsters at the back, lanterns at its corners */
  const st = new THREE.Group(); root.add(st);
  const dais = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0 + 0.6, S.h, S.depth + 0.6), std('#d8ccb6', 0.6)); dais.position.set((S.x0 + S.x1) / 2, S.h / 2, S.z + S.depth / 2); st.add(dais);
  const durrie = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0, S.depth), new THREE.MeshStandardMaterial({ map: cloth(INDIGO), roughness: 1 })); durrie.rotation.x = -Math.PI / 2; durrie.position.set((S.x0 + S.x1) / 2, S.h + 0.005, S.z + S.depth / 2); st.add(durrie);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#ffd8a0' });
  [[S.x0, S.z], [S.x1, S.z], [S.x0, S.z + S.depth], [S.x1, S.z + S.depth]].forEach(([x, z]) => D.lantern(x, S.h, z, 0.9));
  kit.pools.add((S.x0 + S.x1) / 2, 0.02, S.z - 1.4, 3.6, 2.2, AMBER, 0.12, { layer: 'show' });

  /* low seating round the platform: indigo and rust cushions on durries, bolsters, brass bowls of candles, dried grass */
  const bolsters = [], bowls = [];
  (KR.seats || []).forEach((sf, i) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#d8ccb6', seat: i % 2 ? INDIGO : '#e8dcc4', cushions: [INDIGO, MADDER, '#f0e8d8', TERRA] });
    if (!sf.near) {
      const fx = Math.sin(sf.ry), fz = Math.cos(sf.ry), tx = Math.cos(sf.ry), tz = -Math.sin(sf.ry);
      bolsters.push([sf.x - fx * 0.25 + tx * (sf.len / 2 + 0.35), sf.z - fz * 0.25 + tz * (sf.len / 2 + 0.35), sf.ry]);
      bowls.push([sf.x + fx * 1.0 + tx * (sf.len / 2), sf.z + fz * 1.0 + tz * (sf.len / 2)]);
      D.lantern(sf.x + fx * 1.0 - tx * (sf.len / 2 + 0.2), 0, sf.z + fz * 1.0 - tz * (sf.len / 2 + 0.2), 0.85);
    }
  });
  if (bolsters.length) { const bm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 16), new THREE.MeshStandardMaterial({ map: cloth(INDIGO), roughness: 0.9 }), bolsters.length), q = new THREE.Quaternion(), e = new THREE.Euler(); bolsters.forEach(([x, z, ry], i) => bm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, 0.2, z), q.setFromEuler(e.set(0, ry, Math.PI / 2, 'YXZ')), new THREE.Vector3(1, 1, 1)))); root.add(bm); }
  bowls.forEach(([x, z]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 8, 0, TAU, Math.PI / 2, Math.PI / 2), std('#c9953a', 0.3, 0.9)); b.position.set(x, 0.3, z); root.add(b); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; kit.flames.add(x + Math.cos(a) * 0.14, 0.3, z + Math.sin(a) * 0.14, { s: 0.03, k: 0.7 }); } });
  // dried grass in clay pots here and there
  const grass = [];
  [[-12.8, 8], [12.8, 8], [-11, -8], [11, -8], [-6.2, 14.8], [6, 13.6]].forEach(([x, z]) => { D.urn(x, z); for (let k = 0; k < 14; k++) { const a = r() * TAU, t = 0.2 + r() * 0.25; grass.push(mx.compose(new THREE.Vector3(x, 0.55, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(a) * t, 0, Math.sin(a) * t)), new THREE.Vector3(1, 0.7 + r() * 0.5, 1)).clone()); } });
  { const gg = new THREE.CylinderGeometry(0.008, 0.02, 1, 4); gg.translate(0, 0.5, 0); const gm = new THREE.InstancedMesh(gg, std('#c8b088', 0.9), grass.length); grass.forEach((m, i) => gm.setMatrixAt(i, m)); root.add(gm); }

  /* the bhungas out on the salt: round white walls, a doorway glowing, a conical thatch, a pinnacle; lanterns before them */
  const whiteWall = std('#ece6da', 0.85), thatch = new THREE.MeshStandardMaterial({ map: canvasTexture(128, 64, (g, w, h) => { g.fillStyle = '#6a5034'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(${i % 2 ? '180,150,100' : '40,28,16'},.5)`; g.beginPath(); const x = (i * 37) % w; g.moveTo(x, 0); g.lineTo(x + ((i * 13) % 9) - 4, h); g.stroke(); } }), roughness: 0.95 });
  KR.huts.forEach(([x, z]) => {
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 2.4, 32), whiteWall); wall.position.set(x, 1.2, z); root.add(wall);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.12, 2.12, 0.18, 32, 1, true), std(MADDER, 0.7)); band.position.set(x, 2.1, z); root.add(band);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.2, 32), thatch); roof.position.set(x, 3.5, z); root.add(roof);
    const tipM = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), std('#c9953a', 0.4, 0.8)); tipM.position.set(x, 4.9, z); root.add(tipM);
    const face = Math.atan2(-x, -z), door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.7), kit.glow('#ffc070', 1.3, 'practical')); door.position.set(x + Math.sin(face) * 2.21, 0.9, z + Math.cos(face) * 2.21); door.rotation.y = face; root.add(door);
    kit.pools.add(x + Math.sin(face) * 3.4, 0.02, z + Math.cos(face) * 3.4, 2.4, 2.4, '#ffc070', 0.16, { layer: 'practical' });
    D.lantern(x + Math.sin(face + 0.5) * 3, 0, z + Math.cos(face + 0.5) * 3, 0.9);
  });
  // a line of lanterns out from the platform to the huts
  for (let k = 0; k < 9; k++) { const t = (k + 0.5) / 9, x = lerp(R + 1.5, 15, t) * Math.cos(0.6) + t * 4, z = lerp(R + 1.5, 15, t) * Math.sin(0.6) + t * 5; D.lantern(x, 0, z, 0.8); }
  /* the Rann runs flat to the horizon; far off, only the low line of a hill */
  horizonRidge(root, { radius: 600, base: -4, height: 9, seed: 23, arc: [Math.PI * 0.15, Math.PI * 0.45], cols: ['#5a6288', '#6a74a0'] });
  D.finish();

  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#2a3a6a', side: THREE.BackSide })));
  const em = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4dc').multiplyScalar(3) })); em.position.set(-16, 8, 42); env.add(em);

  const rig = {
    hemi: ['#6a7ab8', '#3a3a4a', 0.62, 0.9], moon: 1.4,
    spots: [{ pos: [-14, 22, 40], to: [0, 0, 0], color: '#dfe6ff', base: 46, distance: 90, angle: 0.55, layer: 'key' }, { pos: [(S.x0 + S.x1) / 2 + 3, 5, S.z - 4], to: [(S.x0 + S.x1) / 2, S.h + 1, S.z + 1.4], color: '#ffe0b8', base: 60, distance: 14, angle: 0.6, layer: 'show' }],
    points: [{ pos: [0, 2.4, 0], color: AMBER, base: 46, distance: 14, layer: 'garbo' }, { pos: [0, 2, -12], color: AMBER, base: 18, distance: 10, layer: 'practical' }, { pos: [-11, 2, 11], color: AMBER, base: 18, distance: 10, layer: 'practical' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#5a6694', 0.0065), exposure: 1.0, envScene: env,
    update(t, ctx) { lampM.emissiveIntensity = 1.4 + 1.6 * (ctx.lv.garbo != null ? ctx.lv.garbo : 1) * (ctx.reduce ? 1 : 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1)); }
  };
}

export default { seed: 1616, sky: saltSky, garbo: 'none', garboK: 8, land: false, build: kutch };
