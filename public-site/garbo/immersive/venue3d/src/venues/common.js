// What more than one venue builds the same way: the ground, light on it from lamps built elsewhere, the sponsors'
// places (and the screens two drones carry), and an uplight washing a wall.

import * as THREE from 'three';
import { LIGHT, lerp, sponsorTexture, creative, SPONSORS, TAU, seeded, canvasTexture } from '../util.js';
import { std } from '../kit.js';

/* ---------- ground surfaces (floors.js) ---------- */
export function ground(root, fl, w, d, cz, receive) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: fl.map, normalMap: fl.normalMap, normalScale: new THREE.Vector2(fl.normalScale, fl.normalScale), roughness: fl.roughness, metalness: 0 }));
  m.userData.decal = fl.decal ? { canvas: fl.decal, rect: fl.decalRect } : null;
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0, cz); m.receiveShadow = !!receive;
  // The ground's light maps (lighting.js) cover it edge to edge
  m.userData.rect = { w, d, cx: 0, cz };
  root.add(m);
  return m;
}
// Light on the ground from lamps whose source isn't built here (the DJ's laptop, lit by the 2D scene)
export function practicalPools(kit, list) { list.forEach(([x, z, r, hex, k, layer]) => kit.pools.add(x, 0.02, z, r, r, hex, k, { layer: layer || 'practical' })); }

/* ---------- the sponsors' places ---------- */
// A creative as a corner screen shows it and as a board carries it (each edge to edge)
export const cornerCreative = (url) => creative(url, 'corner', (u) => sponsorTexture(u, 1280, 448));
export const boardCreative = (url) => creative(url, 'board', (u) => sponsorTexture(u, 1024, Math.round(1024 / 2.34)));
// Each place shows the creative the 2D scene's sponsor plan gives it, dimming through black as it changes (fade)
export function showCreatives(meshes, plan, all, make, fade) {
  if (!plan || !all) return;
  meshes.forEach((m, i) => {
    const q = plan[i]; if (!q || q.k < 0) return;
    const tex = make(all.urls[q.k]); if (m.material.map !== tex) m.material.map = tex;
    fade(m, q.a);
  });
}

/* ---------- architectural and household light ---------- */
// An uplight on the ground by a wall: a small fixture, its wash up the wall and a little light on the ground at its foot.
// ry turns the wash to lie along the wall; (tx, tz) points from the fixture to the wall.
export function uplight(kit, root, x, z, ry, h, tx, tz) {
  const fx = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), std('#15110d', 0.6, 0.4)); fx.position.set(x, 0.06, z); fx.rotation.y = ry; root.add(fx);
  kit.bigBulbs.add(x, 0.14, z, 0, { color: LIGHT.amber, k: 0.9, s: 0.45, twinkle: 0, layer: 'architectural' });
  kit.pools.add(x + tx * 0.24, h * 0.42, z + tz * 0.24, 1.1, h * 0.75, LIGHT.amber, 0.24, { vertical: true, ry, layer: 'architectural' });
  kit.pools.add(x, 0.02, z, 1.3, 1.3, LIGHT.amber, 0.1, { layer: 'architectural' });
}

/* ---------- building blocks for the venues made of their own shapes (Pandora and after) ---------- */
export function hash(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
export function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const c = (a, b, d) => hash(xi + a, yi + b, zi + d);
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v), lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

// Flat-shaded faces written straight into arrays, in the venue's own coordinates. Each quad is turned to face `out`,
// and split into cells so the light baked into its corners (glow, below) falls smoothly across it.
export class Shape {
  constructor() { this.p = []; this.n = []; this.uv = []; }
  tri(a, b, c, ua, ub, uc, out) {
    let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (out && n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; n = n.map((v) => -v); }
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    [a, b, c].forEach((q) => { this.p.push(q[0], q[1], q[2]); this.n.push(n[0] / l, n[1] / l, n[2] / l); });
    this.uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  }
  // a (0,0), b (1,0), c (1,1), d (0,1); uvf maps a point to its texture coordinates
  grid(a, b, c, d, nu, nv, out, uvf) {
    const at = (s, t) => [0, 1, 2].map((i) => lerp(lerp(a[i], b[i], s), lerp(d[i], c[i], s), t));
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
      const p00 = at(i / nu, k / nv), p10 = at((i + 1) / nu, k / nv), p11 = at((i + 1) / nu, (k + 1) / nv), p01 = at(i / nu, (k + 1) / nv);
      this.tri(p00, p10, p11, uvf(p00), uvf(p10), uvf(p11), out); this.tri(p00, p11, p01, uvf(p00), uvf(p11), uvf(p01), out);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}
export const topUV = (p) => [p[0] / 2.6, p[2] / 2.6];
export const faceUV = (dir) => (p) => [(p[0] * dir[0] + p[2] * dir[1]) / 2.6, p[1] / 2.6];

/* ---------- light from the crystals, flora, ferns and lanterns, baked into the stone ----------
   Hundreds of small lights can't each be a real light. Their glow on the basalt round them is worked out once, at
   every corner of the stone, and kept in the stone's vertex colours, which its material adds as light of its own,
   rising and falling with the practical layer. */
export function glowInto(geo, sources) {
  const CELL = 6, grid = new Map(), key = (x, z) => Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
  sources.forEach((s) => { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const k = key(s.x + dx * CELL, s.z + dz * CELL); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); } });
  const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, n = pos.length / 3, out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], list = grid.get(key(x, z));
    if (!list) continue;
    let r = 0, g = 0, b = 0;
    for (const s of list) {
      const dx = s.x - x, dy = s.y - y, dz = s.z - z, d = Math.hypot(dx, dy, dz);
      if (d > s.r) continue;
      const f = (1 - d / s.r) * (1 - d / s.r) * Math.max(0.18, (dx * nor[i * 3] + dy * nor[i * 3 + 1] + dz * nor[i * 3 + 2]) / (d || 1));
      r += s.c.r * f; g += s.c.g * f; b += s.c.b * f;
    }
    out[i * 3] = Math.min(1.2, r); out[i * 3 + 1] = Math.min(1.2, g); out[i * 3 + 2] = Math.min(1.2, b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
}
export function glowStone(t, glow, key = 'stone') {
  const m = new THREE.MeshStandardMaterial(Object.assign({ map: t.map, roughness: t.roughness || 0.84, metalness: t.metalness || 0.02, vertexColors: true }, t.normal ? { normalMap: t.normal, normalScale: new THREE.Vector2(t.normalScale || 1.1, t.normalScale || 1.1) } : {}));
  m.userData.env = t.env != null ? t.env : 0.32;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlow;').replace('#include <color_fragment>', '')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * uGlow;');
  };
  m.customProgramCacheKey = () => 'glow-stone-' + key;
  return m;
}

/* ---------- a screen carried by two drones ----------
   A sheet of nearly clear glass (one part in ten), the sponsors' creatives on it, hung on thin tethers from two small
   drones at its upper corners; the three drift together, bobbing a little, rotors spinning, navigation lights blinking.
   o: { x, y, z (the sheet's middle), ry (facing), w (its width), i (which corner of the sponsor plan it shows) }.
   Returns update(t, ctx). */
export function droneScreen(kit, root, o) {
  const w = o.w || 5, h = w / (1280 / 448), g = new THREE.Group(); g.position.set(o.x, o.y, o.z); g.rotation.y = o.ry || 0; g.userData.dynamic = true; root.add(g);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.4, h + 0.4), new THREE.MeshBasicMaterial({ color: '#cfe4ff', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, fog: false })); g.add(glass);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: cornerCreative(SPONSORS[o.i ? 3 : 0]), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, fog: false })); pic.position.z = 0.01; pic.scale.x = -1; g.add(pic); // (the world is mirrored in z: this reads the picture the right way round)
  const edge = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, fog: false });
  [h / 2 + 0.2, -h / 2 - 0.2].forEach((y) => { const e = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.4, 0.035), edge); e.position.set(0, y, 0.015); g.add(e); });
  const shell = std('#26232c', 0.4, 0.4), dark = std('#121216', 0.5, 0.4), rotors = [], lights = [];
  [-1, 1].forEach((sd) => {
    const d = new THREE.Group(); d.position.set(sd * (w / 2 + 0.1), h / 2 + 1.5, 0); g.add(d);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.3), shell); d.add(body);
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([ax, az], k) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.36), dark); arm.position.set(ax * 0.13, 0, az * 0.13); arm.rotation.y = Math.atan2(ax, az); d.add(arm);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.15, 18), new THREE.MeshBasicMaterial({ color: '#dfe4ee', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; disc.position.set(ax * 0.25, 0.06, az * 0.25); d.add(disc);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 0.02), dark); blade.position.set(ax * 0.25, 0.065, az * 0.25); d.add(blade); rotors.push({ blade, dir: k % 3 ? 1 : -1 });
    });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })); lamp.position.set(0, -0.06, 0.16); d.add(lamp); lights.push({ m: lamp, c: new THREE.Color(sd < 0 ? '#ff4a3a' : '#5dff8a') });
    // the tether down to the sheet's corner
    const len = 1.5 - 0.05, teth = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 4), new THREE.MeshBasicMaterial({ color: '#c8d0e0', transparent: true, opacity: 0.5 })); teth.position.set(sd * (w / 2 + 0.1), h / 2 + 0.2 + len / 2 - 0.02, 0); g.add(teth);
  });
  const y0 = o.y, ph = (o.x + o.z) * 0.3;
  return {
    update(t, ctx) {
      const tt = ctx.reduce ? 0 : t;
      g.position.y = y0 + 0.22 * Math.sin(tt * 0.7 + ph); g.rotation.z = 0.025 * Math.sin(tt * 0.5 + ph);
      rotors.forEach((r2, k) => { r2.blade.rotation.y = ctx.reduce ? k : t * 80 * r2.dir; });
      const blink = ctx.reduce ? 1 : (tt % 1.2) < 0.12 ? 1 : 0.25; lights.forEach((l) => l.m.material.color.copy(l.c).multiplyScalar(2.5 * blink));
      showCreatives([pic], ctx.sponsors && ctx.sponsors.corners && [ctx.sponsors.corners[o.i ? 1 : 0]], ctx.sponsors, cornerCreative, (m, a) => { m.material.opacity = 0.85 * a; });
    }
  };
}

// Round lanterns of paper on a wire (Jyot Chowk, Vrindavan): rings of colour, petals and dots, lit from within
export const DISCS = [['#e83a8a', '#ffd24a', '#2ab8a8', '#fff0d0'], ['#3ac86a', '#ffb02a', '#e8406a', '#fff0d0'], ['#2ab8c8', '#f0e04a', '#c83ab0', '#fff0d0'], ['#ff8a2a', '#3a7ae8', '#ffe04a', '#fff0d0'], ['#e8402a', '#f0c84a', '#3ab86a', '#fff0d0']];
export function discTexture(pal, seed) {
  const r = seeded(seed);
  return canvasTexture(256, 256, (g, w) => {
    const c = w / 2; g.fillStyle = pal[3]; g.fillRect(0, 0, w, w);
    const ring = (r0, r1, col) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r1, 0, TAU); g.arc(c, c, r0, 0, TAU, true); g.fill('evenodd'); };
    ring(108, 128, pal[0]); ring(96, 108, pal[1]);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.fillStyle = i % 2 ? pal[0] : pal[2]; g.beginPath(); g.moveTo(c + Math.cos(a - 0.12) * 60, c + Math.sin(a - 0.12) * 60); g.lineTo(c + Math.cos(a) * 95, c + Math.sin(a) * 95); g.lineTo(c + Math.cos(a + 0.12) * 60, c + Math.sin(a + 0.12) * 60); g.closePath(); g.fill(); }
    ring(44, 58, pal[2]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.fillStyle = pal[1]; g.beginPath(); g.ellipse(c + Math.cos(a) * 30, c + Math.sin(a) * 30, 12, 6, a, 0, TAU); g.fill(); }
    g.fillStyle = pal[0]; g.beginPath(); g.arc(c, c, 14, 0, TAU); g.fill();
    g.fillStyle = '#fffaf0'; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; g.beginPath(); g.arc(c + Math.cos(a) * 118, c + Math.sin(a) * 118, 3, 0, TAU); g.fill(); }
    for (let i = 0; i < 30; i++) { const a = r() * TAU, d = 62 + r() * 30; g.fillStyle = 'rgba(255,255,240,.5)'; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 1.6, 0, TAU); g.fill(); }
  });
}
