// The kit every venue is built from: materials, and the things a Garba night has hundreds of (bulbs, bunting flags,
// wires, pools of light, stage beams), each drawn as one instanced mesh so a venue costs a handful of draw calls.

import * as THREE from 'three';
import { TAU, col, glowTexture, sag, LIGHT } from './util.js';
import { flicker } from './lighting.js';

/* ---------- materials, shared by value ---------- */
const mats = new Map();
export function std(hex, rough = 0.85, metal = 0, extra) {
  const key = hex + '|' + rough + '|' + metal + (extra ? JSON.stringify(extra) : '');
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: rough, metalness: metal }, extra || {})); mats.set(key, m); }
  return m;
}
export function lambert(hex, extra) {
  const key = 'L' + hex + (extra ? JSON.stringify(extra) : '');
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial(Object.assign({ color: hex }, extra || {})); mats.set(key, m); }
  return m;
}
// Vertex-coloured, for props merged from several coloured pieces
export const vertexMat = (rough = 0.8, metal = 0) => std('#ffffff', rough, metal, { vertexColors: true });
// Something that gives off its own light: a flat colour pushed past white so the bloom picks it up
export function glowMat(hex, k = 3) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) });
}

/* ---------- bulbs: every small light in a venue, one instanced mesh ---------- */
// Each bulb keeps its place, which theme colour it takes (an index into the palette), a twinkle phase and how bright
// it sits. Colours are rewritten each frame from the palette, so a theme change is instant.
export class Bulbs {
  constructor(radius = 0.06, detail = 6) {
    this.list = [];
    // (a bulb is a point of light with a bloom round it; eighty faces keep it round even when it hangs close by)
    this.geo = new THREE.IcosahedronGeometry(radius, detail > 6 ? 1 : 0);
    this.mesh = null;
  }
  add(x, y, z, idx, opts = {}) {
    this.list.push({ x, y, z, idx, ph: opts.ph != null ? opts.ph : Math.random() * TAU, k: opts.k || 1, s: opts.s || 1, twinkle: opts.twinkle != null ? opts.twinkle : 0.28, fixed: opts.color || null, group: opts.group || 0, layer: opts.layer || 'festive' });
  }
  build(parent) {
    const n = this.list.length;
    if (!n) return null;
    const m = new THREE.InstancedMesh(this.geo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
    const mx = new THREE.Matrix4();
    this.list.forEach((b, i) => m.setMatrixAt(i, mx.makeScale(b.s, b.s, b.s).setPosition(b.x, b.y, b.z)));
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    m.frustumCulled = false;
    parent.add(m);
    this.mesh = m;
    return m;
  }
  // palette: hex list; lv: the lighting layers' levels; pulse 0..1 on the beat; groups can be gated (phones held up)
  update(t, palette, lv, pulse, reduce, groupK) {
    if (!this.mesh) return;
    const a = this.mesh.instanceColor.array, c = new THREE.Color();
    for (let i = 0; i < this.list.length; i++) {
      const b = this.list[i];
      c.copy(b.fixed ? col(b.fixed) : col(palette[b.idx % palette.length]));
      const tw = reduce ? 1 : 1 - b.twinkle + b.twinkle * Math.sin(t * 2.6 + b.ph);
      const g = groupK ? groupK[b.group] ?? 1 : 1;
      // Festive bulbs dance a little on the beat; lamps (practicals) burn steady
      const beat = b.layer === 'festive' || b.layer === 'show' ? pulse * 0.25 : 0;
      const k = b.k * (lv[b.layer] ?? 1) * (tw + beat) * 2.3 * g;
      a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k;
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
}

/* ---------- bunting: triangular flags on a line ---------- */
export class Flags {
  constructor() {
    this.list = [];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, -1.6, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    this.geo = g;
  }
  add(x, y, z, ry, size, idx) { this.list.push({ x, y, z, ry, size, idx, ph: Math.random() * TAU }); }
  build(parent) {
    const n = this.list.length;
    if (!n) return null;
    const m = new THREE.InstancedMesh(this.geo, new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }), n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    m.frustumCulled = false;
    parent.add(m);
    this.mesh = m;
    this.pose(0, true);
    return m;
  }
  setPalette(palette) {
    if (!this.mesh) return;
    const a = this.mesh.instanceColor.array;
    this.list.forEach((f, i) => { const c = col(palette[f.idx % palette.length]); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; });
    this.mesh.instanceColor.needsUpdate = true;
  }
  // A light breeze: each flag swings a little on its line
  pose(t, force) {
    if (!this.mesh) return;
    const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), mx = new THREE.Matrix4();
    this.list.forEach((f, i) => {
      e.set(force ? 0 : Math.sin(t * 1.7 + f.ph) * 0.25, f.ry, 0, 'YXZ');
      q.setFromEuler(e); s.set(f.size, f.size, f.size); p.set(f.x, f.y, f.z);
      this.mesh.setMatrixAt(i, mx.compose(p, q, s));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- wires and ropes: thin dark lines, all in one draw ---------- */
export class Wires {
  constructor(hex = '#2a2019', opacity = 0.8) { this.pts = []; this.hex = hex; this.opacity = opacity; }
  line(a, b) { this.pts.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
  cable(a, b, drop, n = 20) {
    let prev = sag(a, b, drop, 0);
    for (let i = 1; i <= n; i++) { const q = sag(a, b, drop, i / n); this.line(prev, q); prev = q; }
  }
  build(parent) {
    if (!this.pts.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pts, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: this.hex, transparent: this.opacity < 1, opacity: this.opacity }));
    parent.add(m);
    return m;
  }
}

// A strand hung between two points: bulbs or flags along a sagging wire
// opts.gap: metres between bulbs (a dense string for a canopy of lights); opts.pools: false when the string is one of
// many over the same spot, so the ground under them isn't lit many times over
export function strand(kit, a, b, drop, kind, seed, opts = {}) {
  kit.wires.cable(a, b, drop);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(2, Math.round(len / (opts.gap || (kind === 'flags' ? 0.9 : 1.1))));
  const ry = Math.atan2(b[0] - a[0], b[2] - a[2]) + Math.PI / 2;
  for (let j = 1; j < n; j++) {
    const q = sag(a, b, drop, j / n);
    if (kind === 'flags') kit.flags.add(q[0], q[1], q[2], ry, 0.3, j + seed);
    else {
      kit.bulbs.add(q[0], q[1] - 0.06, q[2], j + seed, { ph: j * 1.7 + seed, s: opts.s || 1 });
      // Strings of bulbs overhead throw a soft, dappled light on the ground under them
      if (opts.pools !== false && j % 3 === 1) kit.pools.add(q[0], 0.02, q[2], 2.8, 2.8, '#ffd58a', 0.085, { layer: 'festive', theme: true });
    }
  }
}

/* ---------- curtain lights: strands of rice lights hung down a wall ---------- */
// A house front dressed for Navratri: dozens of strands, each with dozens of lights, from the parapet down. They're drawn
// as a few glowing sheets instead of thousands of bulbs: a tile of four strands of lights, repeated along the wall and
// down it, in three sets that each take one of the night's colours. The lights run down their strands (the tile
// scrolls), as a chaser does, and every fourth is brighter, so the run reads.
function curtainTexture() {
  const S = 128, t = canvasTile(S, (g) => {
    g.clearRect(0, 0, S, S);
    for (let k = 0; k < 4; k++) {
      const x = (k + 0.5) * S / 4;
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x - 0.5, 0, 1, S);
      for (let j = 0; j < 8; j++) {
        const y = (j + 0.5) * S / 8 + (k % 2) * S / 16, a = j % 4 === (k % 4) ? 1 : 0.5, gr = g.createRadialGradient(x, y, 0, x, y, 6);
        gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.35, `rgba(255,255,255,${a * 0.55})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x - 6, y - 6, 12, 12);
      }
    }
  });
  return t;
}
function canvasTile(S, draw) {
  const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export class Curtains {
  constructor() { this.list = []; this.sets = []; }
  // A sheet along a wall from (x0, z0) to (x1, z1), from y0 up to y1, just off it towards (nx, nz); idx: its colour set
  add(x0, z0, x1, z1, y0, y1, nx, nz, idx) { this.list.push({ x0, z0, x1, z1, y0, y1, nx, nz, idx: ((idx % 3) + 3) % 3 }); }
  build(parent) {
    if (!this.list.length) return;
    const tex = curtainTexture(), TILE = 1.2;
    for (let s = 0; s < 3; s++) {
      const pos = [], uv = [];
      this.list.filter((c) => c.idx === s).forEach((c) => {
        const len = Math.hypot(c.x1 - c.x0, c.z1 - c.z0), ox = c.nx * 0.04, oz = c.nz * 0.04, u = len / TILE, v = (c.y1 - c.y0) / TILE;
        const A = [c.x0 + ox, c.y0, c.z0 + oz], B = [c.x1 + ox, c.y0, c.z1 + oz], C = [c.x1 + ox, c.y1, c.z1 + oz], D = [c.x0 + ox, c.y1, c.z0 + oz];
        [A, B, C, A, C, D].forEach((p) => pos.push(p[0], p[1], p[2]));
        uv.push(0, 0, u, 0, u, v, 0, 0, u, v, 0, v);
      });
      if (!pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const t = tex.clone(); t.needsUpdate = true;
      const m = new THREE.MeshBasicMaterial({ map: t, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 3; mesh.frustumCulled = false; mesh.userData.dynamic = true; parent.add(mesh);
      this.sets.push({ m, t, s });
    }
  }
  update(t, palette, lv, pulse, reduce) {
    this.sets.forEach(({ m, t: tx, s }) => {
      const k = (lv.festive ?? 1) * (1.7 + 0.35 * pulse) * (reduce ? 1 : 0.88 + 0.12 * Math.sin(t * 1.1 + s * 2.1));
      m.color.copy(col(palette[[1, 2, 4][s] % palette.length])).multiplyScalar(k);
      if (!reduce) tx.offset.y = (t * (0.16 + s * 0.04)) % 1;
    });
  }
}

/* ---------- pools of light on the ground and halos in the air ---------- */
// Additive soft discs: the cheap way to show dozens of lamps lighting the ground without dozens of real lights
export class Pools {
  constructor() { this.list = []; }
  add(x, y, z, rx, rz, hex, k = 1, opts = {}) {
    const vertical = !!opts.vertical;
    // A pool lying on the ground, and not one that moves, is painted into the ground's light maps instead of drawn
    const layer = opts.layer || 'practical';
    this.list.push({ x, y, z, rx, rz, hex, k, vertical, ry: opts.ry || 0, theme: opts.theme || false, layer, ground: !vertical && y < 0.1 && !opts.live, falloff: opts.falloff || (layer === 'flame' ? 'tight' : 'soft'), ph: x * 3.7 + z * 1.3 });
  }
  build(parent) {
    // Pools baked into the ground aren't drawn again
    if (this.bakedGround) this.list = this.list.filter((p) => !p.ground);
    const n = this.list.length;
    if (!n) return null;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const q = new THREE.Quaternion(), e = new THREE.Euler(), mx = new THREE.Matrix4();
    this.list.forEach((p, i) => {
      e.set(p.vertical ? 0 : -Math.PI / 2, p.ry, 0, 'YXZ'); q.setFromEuler(e);
      m.setMatrixAt(i, mx.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.rx * 2, p.rz * 2, 1)));
    });
    m.frustumCulled = false;
    m.renderOrder = 2;
    parent.add(m);
    this.mesh = m;
    return m;
  }
  // A flame's pool breathes with its own flame
  update(lv, glowHex, t = 0, reduce = false) {
    if (!this.mesh) return;
    const a = this.mesh.instanceColor.array;
    this.list.forEach((p, i) => { const c = col(p.theme ? glowHex : p.hex), k = p.k * (lv[p.layer] ?? 1) * (p.layer === 'flame' && !reduce ? flicker(t, p.ph) : 1); a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k; });
    this.mesh.instanceColor.needsUpdate = true;
  }
}

/* ---------- flames: every diya in a venue ----------
   A clay (or brass) bowl, and a flame in two parts: an orange body and a pale core. Each flame keeps its own phase, so
   it leans, stretches and dims on its own; the light it throws on the ground is painted into the flame layer's map
   (tight round the bowl, as a flame lights only what's close), and a flame up on a step or a table gets a live pool. */
function flameGeometry() {
  const pts = [[0, 0], [0.42, 0.1], [0.55, 0.3], [0.48, 0.55], [0.3, 0.8], [0.12, 0.98], [0, 1.1]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 6);
}
function bowlGeometry() {
  const pts = [[0, 0], [0.55, 0.02], [0.9, 0.25], [1, 0.55], [0.92, 0.6], [0.8, 0.4], [0, 0.35]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 8);
}
export class Flames {
  constructor() { this.list = []; }
  // s: the bowl's radius in metres (a small diya is about 0.045); bowl: 'clay', 'brass' or null (a wick in a lamp);
  // pool: false when the lamp's own light is laid some other way (a tower of lamps, whose pools would stack up it)
  add(x, y, z, opts = {}) {
    const s = opts.s || 0.045;
    this.list.push({ x, y, z, s, bowl: opts.bowl === undefined ? 'clay' : opts.bowl, layer: opts.layer || 'flame', ph: opts.ph != null ? opts.ph : x * 5.3 + z * 2.9 + y * 7.1, k: opts.k || 1, pool: opts.pool !== false });
  }
  build(parent, kit) {
    const n = this.list.length;
    if (!n) return;
    const mx = new THREE.Matrix4();
    const bowls = this.list.filter((f) => f.bowl);
    if (bowls.length) {
      const m = new THREE.InstancedMesh(bowlGeometry(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0.2 }), bowls.length);
      const cc = new THREE.Color();
      bowls.forEach((f, i) => { m.setMatrixAt(i, mx.makeScale(f.s, f.s * 0.8, f.s).setPosition(f.x, f.y, f.z)); m.setColorAt(i, cc.set(f.bowl === 'brass' ? '#c9953a' : '#8a3f1e')); });
      parent.add(m);
    }
    const geo = flameGeometry();
    const body = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), n);
    const core = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), n);
    [body, core].forEach((m) => { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.frustumCulled = false; parent.add(m); });
    this.body = body; this.core = core;
    this.update(0, { flame: 1, garbo: 1 }, true);
  }
  // Each flame lights the ground or the step it stands on (added before the ground's light maps are painted)
  lightPools(kit) {
    // (a pool off the ground is drawn every frame, so a row of diyas on a step shares one: the first in each 0.9 m
    // cell lights it, a little brighter and wider for the others)
    const taken = new Map();
    this.list.forEach((f) => {
      if (!f.pool) return;
      const r = f.s * 20, live = f.y >= 0.1;
      if (live) {
        const key = Math.round(f.x / 0.9) + ',' + Math.round(f.y * 4) + ',' + Math.round(f.z / 0.9);
        if (taken.has(key)) { taken.get(key).k += 0.06 * f.k; return; }
        kit.pools.add(f.x, f.y + 0.01, f.z, r * 1.25, r * 1.25, LIGHT.flame, 0.24 * f.k, { layer: f.layer, live: true });
        taken.set(key, kit.pools.list[kit.pools.list.length - 1]);
        return;
      }
      kit.pools.add(f.x, 0.02, f.z, r, r, LIGHT.flame, 0.24 * f.k, { layer: f.layer, live: false });
    });
  }
  update(t, lv, reduce) {
    if (!this.body) return;
    const cb = col(LIGHT.flame), cc = col(LIGHT.flameCore), ab = this.body.instanceColor.array, ac = this.core.instanceColor.array;
    const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), mx = new THREE.Matrix4();
    this.list.forEach((f, i) => {
      const fl = reduce ? 0.9 : flicker(t, f.ph), lvl = lv[f.layer] ?? 1, h = f.s * 1.5 * (0.75 + 0.35 * fl) * Math.min(1.2, lvl);
      const lean = reduce ? 0 : 0.12 * Math.sin(t * 2.3 + f.ph) + 0.05 * Math.sin(t * 7 + f.ph * 2);
      e.set(0, 0, lean); q.setFromEuler(e); p.set(f.x, f.y + f.s * 0.3, f.z);
      s.set(f.s * 0.42, h, f.s * 0.42); this.body.setMatrixAt(i, mx.compose(p, q, s));
      s.set(f.s * 0.2, h * 0.55, f.s * 0.2); this.core.setMatrixAt(i, mx.compose(p, q, s));
      const k = f.k * lvl * (0.7 + 0.45 * fl);
      ab[i * 3] = cb.r * 3.2 * k; ab[i * 3 + 1] = cb.g * 3.2 * k; ab[i * 3 + 2] = cb.b * 3.2 * k;
      ac[i * 3] = cc.r * 5 * k; ac[i * 3 + 1] = cc.g * 5 * k; ac[i * 3 + 2] = cc.b * 5 * k;
    });
    this.body.instanceMatrix.needsUpdate = this.core.instanceMatrix.needsUpdate = true;
    this.body.instanceColor.needsUpdate = this.core.instanceColor.needsUpdate = true;
  }
}

/* ---------- beams of light: a cone that fades from its lamp outward ---------- */
const beamGeo = (() => {
  const g = new THREE.CylinderGeometry(0.04, 1, 1, 20, 1, true);
  g.translate(0, -0.5, 0); // apex at the origin, opening down -Y
  return g;
})();
export function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color('#ffffff') }, opacity: { value: 0.2 } },
    vertexShader: 'varying float vK; varying vec3 vN; varying vec3 vV; void main(){ vK = -position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    // Brightest near the lamp, fading along the beam, and soft at the cone's edges seen side-on
    fragmentShader: 'uniform vec3 color; uniform float opacity; varying float vK; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.4); float a = opacity * pow(1.0 - clamp(vK,0.0,1.0), 1.6) * edge; gl_FragColor = vec4(color * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
}
export class Beam {
  constructor(parent, hex, length = 10, spread = 1.2, opacity = 0.18) {
    this.mesh = new THREE.Mesh(beamGeo, beamMaterial());
    this.mesh.material.uniforms.color.value.set(hex);
    this.mesh.material.uniforms.opacity.value = opacity;
    this.mesh.renderOrder = 3;
    this.mesh.frustumCulled = false;
    this.length = length; this.spread = spread; this.base = opacity;
    parent.add(this.mesh);
    this._up = new THREE.Vector3(0, -1, 0);
  }
  // Point the beam from `from` at `to`, reaching that far
  aim(from, to) {
    const d = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]), len = d.length();
    this.mesh.position.set(from[0], from[1], from[2]);
    this.mesh.quaternion.setFromUnitVectors(this._up, d.normalize());
    const r = Math.tan(this.spread * 0.5) * len;
    this.mesh.scale.set(r, len, r);
  }
  set(hex, k) { this.mesh.material.uniforms.color.value.set(hex); this.mesh.material.uniforms.opacity.value = this.base * k; this.mesh.visible = k > 0.01; }
}

/* ---------- one kit per venue ---------- */
export function newKit() {
  const kit = { bulbs: new Bulbs(0.07, 8), bigBulbs: new Bulbs(0.13, 8), flags: new Flags(), wires: new Wires(), pools: new Pools(), flames: new Flames(), curtains: new Curtains(), beams: [], updaters: [], lit: [] };
  // A surface that gives off light (a lantern's paper, a lit panel, a window), dimmed and raised with its layer
  // (shared by colour, strength and layer, so twenty lanterns are one material and bake into one draw)
  const glows = new Map();
  kit.glow = (hex, k = 1, layer = 'practical') => {
    const key = hex + '|' + k + '|' + layer;
    if (!glows.has(key)) { const m = glowMat(hex, k); kit.lit.push({ mat: m, base: m.color.clone(), layer }); glows.set(key, m); }
    return glows.get(key);
  };
  // A surface lit by lamps on it or right beside it (a stall's counter under its bulbs, its striped valance): it takes
  // a little of their light as its own glow, so it reads at night, rising and falling with that layer
  kit.selfLit = (mat, k, layer = 'practical') => {
    if (mat.map && !mat.emissiveMap) { mat.emissiveMap = mat.map; mat.emissive.set('#ffffff'); } else if (mat.emissive.getHex() === 0) mat.emissive.set('#ffffff');
    kit.lit.push({ mat, emissive: k, layer });
    return mat;
  };
  // A lit picture (a sign board, a laptop's lid, a neon sign): its texture, raised and dimmed with its layer
  kit.litMap = (map, k = 1, layer = 'practical', extra) => {
    const m = new THREE.MeshBasicMaterial(Object.assign({ map, color: new THREE.Color(k, k, k) }, extra || {}));
    kit.lit.push({ mat: m, base: m.color.clone(), layer });
    return m;
  };
  return kit;
}
// Set every layer-controlled surface to its layer's level
export function updateLit(kit, lv) { kit.lit.forEach((e) => { const l = lv[e.layer] ?? 1; if (e.emissive != null) e.mat.emissiveIntensity = e.emissive * l; else e.mat.color.copy(e.base).multiplyScalar(l); }); }
export function buildKit(kit, parent) {
  kit.flames.build(parent, kit); kit.curtains.build(parent);
  kit.bulbs.build(parent); kit.bigBulbs.build(parent); kit.flags.build(parent); kit.wires.build(parent); kit.pools.build(parent);
}
