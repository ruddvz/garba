// PANDORA: an open basin of black stone on another world, built from the owner's approved "Obsidian Fern Basin"
// references (research/venue-reference-pack, #2112), as the scene views show it (zip-077, zip-113, zip-147 and the
// concept boards): a round floor of polished black stone inlaid with glowing gold (a crescent band round its rim, rings,
// a chain of circles, a star mandala under a bare garbo); a rocky border all round it, amber crystals standing on
// pillars of basalt and among the rocks, silver ferns rising out of them, violet flora with points of light; stone
// terraces stepping up behind on every side but the far diagonals, kept low so the valley and the mountains show over
// them, candles and brass lanterns along the steps, a gold light under every step's edge; a grand stair up on the
// left to a gate of glyph-carved monoliths with banners of light; the band on a stone platform set into the far
// terraces, framed by crystals and ferns; a lounge and two glass-fronted pods in the rock; spires behind; and an open
// sky: dusk violet over an ember horizon, a ringed planet and its small moons.
//
// The 2D scene (venue-scene.js) has the same plan (PANDORA there): where the floor ends, where each step is, the
// band's platform and the DJ, so the people it draws stand and sit exactly on what's built here.

import * as THREE from 'three';
import { TAU, lerp, seeded, canvasTexture, face, faceTo, merged, BAND } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, wrap, normalMap, tex } from '../floors.js';
import { ground } from './common.js';

/* ---------- the plan ---------- */
// floor: the dance floor's radius. The terraces are a ring of `sides` straight sides, each step's front `a0 + k ×
// tread` from the centre (along the side's normal) and `rise` higher than the last, the top step running on as the
// promenade to `top`. The stage side gives its first three steps to the band's platform; the `low` sides keep only
// `lowTiers` steps; the `stairs` sides have a stair cut up through the steps.
export const PANDORA = {
  floor: 19, sides: 16, a0: 21.8, tread: 1.3, rise: 0.45, tiers: 5, top: 31.5, stageSide: 8, low: [6, 10], lowTiers: 2, stairs: [5, 11],
  stage: { x0: -4.6, x1: 4.6, z: 20.4, h: 0.9, depth: 5.3 }, dj: { x: 8.6, z: 19.6 }
};
const P0 = PANDORA, SEG = TAU / P0.sides, HALF = Math.tan(SEG / 2), STAIR = 2.1;
const tiersOf = (j) => (P0.low.includes(j) ? P0.lowTiers : P0.tiers), firstTier = (j) => (j === P0.stageSide ? 3 : 0);
// A side's direction out from the centre, and a point on it: a along its normal, t along it
function side(j) { const p = -Math.PI / 2 + j * SEG; return { n: [Math.cos(p), Math.sin(p)], u: [-Math.sin(p), Math.cos(p)] }; }
function onSide(j, a, t) { const s = side(j); return [s.n[0] * a + s.u[0] * t, s.n[1] * a + s.u[1] * t]; }
const front = (k) => P0.a0 + k * P0.tread, stepTop = (k) => (k + 1) * P0.rise;
const topOf = (j) => (P0.low.includes(j) ? front(P0.lowTiers) + 3.2 : P0.top);

// The night's own palette here: ember gold, violet and a cold silver
const EMBER = '#ffa245', VIOLET = '#a46bff', SILVER = '#d9ccff';

/* ---------- small helpers ---------- */
function hash(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const c = (a, b, d) => hash(xi + a, yi + b, zi + d);
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v), lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

// Flat-shaded faces written straight into arrays, in the venue's own coordinates. Each quad is turned to face `out`,
// and split into cells so the light baked into its corners (glow, below) falls smoothly across it.
class Shape {
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
const topUV = (p) => [p[0] / 2.6, p[2] / 2.6];
const faceUV = (dir) => (p) => [(p[0] * dir[0] + p[2] * dir[1]) / 2.6, p[1] / 2.6];

/* ---------- light from the crystals, flora, ferns and lanterns, baked into the stone ----------
   Hundreds of small lights can't each be a real light. Their glow on the basalt round them is worked out once, at
   every corner of the stone, and kept in the stone's vertex colours, which its material adds as light of its own,
   rising and falling with the practical layer. */
function glowInto(geo, sources) {
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
function rockMaterial(t, glow) {
  const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.84, metalness: 0.02, vertexColors: true });
  m.userData.env = 0.32;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlow;').replace('#include <color_fragment>', '')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * uGlow;');
  };
  m.customProgramCacheKey = () => 'pandora-basalt-1';
  return m;
}

/* ---------- textures ---------- */
// Basalt: near-black with a violet cast, pitted with vesicles, cut by the joints that split it into columns
function basalt(res) {
  const r = seeded(83), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d'), s = res / 512;
  g.fillStyle = '#2a2730'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  for (let i = 0; i < 60; i++) { const x = r() * res, y = r() * res, rr = (30 + r() * 90) * s, tone = r(); wrap(res, res, x, y, rr, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, tone < 0.4 ? 'rgba(10,8,14,.22)' : tone < 0.75 ? 'rgba(70,58,82,.14)' : 'rgba(78,60,48,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2); }); }
  for (let i = 0; i < 9000; i++) { const x = r() * res, y = r() * res, sz = (0.6 + r() * 1.6) * s, l = r(); g.fillStyle = l < 0.5 ? `rgba(0,0,0,${0.1 + r() * 0.15})` : `rgba(150,140,170,${0.04 + r() * 0.06})`; g.fillRect(x, y, sz, sz); hg.fillStyle = l < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.08)'; hg.fillRect(x, y, sz, sz); }
  // Vesicles: the small round holes gas left in the lava
  for (let i = 0; i < 260; i++) { const x = r() * res, y = r() * res, rr = (0.8 + r() * 2.6) * s; wrap(res, res, x, y, rr * 2, (px, py) => { g.fillStyle = 'rgba(6,5,9,.75)'; g.beginPath(); g.arc(px, py, rr, 0, TAU); g.fill(); g.strokeStyle = 'rgba(120,110,140,.18)'; g.lineWidth = s * 0.6; g.stroke(); hg.fillStyle = '#202020'; hg.beginPath(); hg.arc(px, py, rr, 0, TAU); hg.fill(); }); }
  // Joints: cracks wandering across, darker and sunk
  g.lineCap = hg.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    let x = r() * res, y = r() * res, a = r() * TAU; const n = 6 + Math.floor(r() * 8), w = (0.8 + r() * 1.6) * s;
    for (let k = 0; k < n; k++) { const nx = x + Math.cos(a) * 26 * s, ny = y + Math.sin(a) * 26 * s; wrap(res, res, x, y, 40 * s, (px, py) => { const ox = px - x, oy = py - y; g.strokeStyle = 'rgba(4,3,6,.8)'; g.lineWidth = w; g.beginPath(); g.moveTo(px, py); g.lineTo(nx + ox, ny + oy); g.stroke(); hg.strokeStyle = '#101010'; hg.lineWidth = w * 1.6; hg.beginPath(); hg.moveTo(px, py); hg.lineTo(nx + ox, ny + oy); hg.stroke(); }); x = nx; y = ny; a += (r() - 0.5) * 1.3; }
  }
  return { map: tex(c, [1, 1]), normal: tex(normalMap(hc, 3.2), [1, 1], true) };
}
// Obsidian: black glass in big slabs, each a shade apart, with faint smoky veins and a glitter of tiny inclusions
function obsidian(res) {
  const r = seeded(29), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d'), s = res / 1024;
  g.fillStyle = '#0c0b11'; g.fillRect(0, 0, res, res); hg.fillStyle = '#909090'; hg.fillRect(0, 0, res, res);
  // Slabs on a jittered grid: four across the tile, their joints sunk
  const N = 4, cw = res / N, pts = [];
  for (let i = 0; i <= N; i++) for (let k = 0; k <= N; k++) pts.push([(i + (i % N ? (r() - 0.5) * 0.35 : 0)) * cw, (k + (k % N ? (r() - 0.5) * 0.35 : 0)) * cw]);
  const P = (i, k) => pts[(i % (N + 1)) * (N + 1) + (k % (N + 1))];
  for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
    const q = [P(i, k), P(i + 1, k), P(i + 1, k + 1), P(i, k + 1)], tone = 9 + r() * 8;
    g.fillStyle = `rgb(${tone},${tone * 0.95},${tone * 1.3})`; g.beginPath(); q.forEach((p, n) => (n ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 3 * s; g.stroke(); hg.strokeStyle = '#303030'; hg.lineWidth = 5 * s; hg.beginPath(); q.forEach((p, n) => (n ? hg.lineTo(p[0], p[1]) : hg.moveTo(p[0], p[1]))); hg.closePath(); hg.stroke();
  }
  // Smoky veins
  for (let i = 0; i < 26; i++) {
    let x = r() * res, y = r() * res, a = r() * TAU; const n = 10 + Math.floor(r() * 14);
    g.strokeStyle = `rgba(170,165,200,${0.04 + r() * 0.06})`; g.lineWidth = (0.6 + r() * 1.4) * s; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < n; k++) { x += Math.cos(a) * 18 * s; y += Math.sin(a) * 18 * s; a += (r() - 0.5) * 0.7; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${200 + r() * 55},${190 + r() * 50},255,${0.08 + r() * 0.2})`; g.fillRect(r() * res, r() * res, s * 1.2, s * 1.2); }
  return { map: tex(c, [96 / 4.2, 96 / 4.2]), normal: tex(normalMap(hc, 1.6), [96 / 4.2, 96 / 4.2], true) };
}

/* ---------- the floor's gold inlay ----------
   One drawing, used twice: as the gold set into the stone (the floor's painted layer) and as the light running in it
   (a glowing layer laid over the floor). In metres, the floor's centre at the origin, +y on the canvas along +z. */
function crescent() {
  // The crescent band round the rim, thick towards the far left (as the plan has it) and thinning to its tips
  const th = 150 / 180 * Math.PI, R1 = 17.7, R2 = 16.15, off = 2.25, c = [Math.cos(th + Math.PI) * off, Math.sin(th + Math.PI) * off];
  // Where the inner circle cuts the outer, on the outer circle's angle
  const tips = []; for (let i = 0; i < 3600; i++) { const a = i / 3600 * TAU, p = [Math.cos(a) * R1 - c[0], Math.sin(a) * R1 - c[1]], d = Math.hypot(p[0], p[1]); tips.push([a, d - R2]); }
  const cross = []; for (let i = 0; i < tips.length; i++) { const n = tips[(i + 1) % tips.length]; if ((tips[i][1] < 0) !== (n[1] < 0)) cross.push(tips[i][0]); }
  let a0 = cross[0], a1 = cross[1]; const mid = (a0 + a1) / 2; if (Math.cos(mid - th) < 0) a0 += TAU;
  // The inner edge's radius along a ray from the centre at angle a
  const inner = (a) => { const d = [Math.cos(a), Math.sin(a)], b = d[0] * c[0] + d[1] * c[1], q = c[0] * c[0] + c[1] * c[1] - R2 * R2; return b + Math.sqrt(Math.max(0, b * b - q)); };
  return { R1, R2, c, a0: Math.min(a0, a1), a1: Math.max(a0, a1), inner, th };
}
function inlay(g, k, cx, cz, glow) {
  const C = crescent();
  g.save(); g.translate(cx, cz); g.scale(k, k); g.lineCap = 'round'; g.lineJoin = 'round';
  const stroke = (w) => { if (glow) { g.lineWidth = w * 2.6; g.strokeStyle = 'rgba(255,160,70,.14)'; g.stroke(); g.lineWidth = w * 1.1; g.strokeStyle = 'rgba(255,200,120,.5)'; g.stroke(); g.lineWidth = w * 0.5; g.strokeStyle = 'rgba(255,236,196,1)'; g.stroke(); } else { g.lineWidth = w * 1.2; g.strokeStyle = 'rgba(166,122,52,.95)'; g.stroke(); } };
  const ring = (r, w) => { g.beginPath(); g.arc(0, 0, r, 0, TAU); stroke(w); };
  ring(18.85, 0.07); ring(18.45, 0.04);
  // The crescent: its two edges, and the oval stones set along it
  g.beginPath(); g.arc(0, 0, C.R1, C.a0, C.a1); stroke(0.06);
  g.beginPath(); for (let i = 0; i <= 120; i++) { const a = lerp(C.a0, C.a1, i / 120), r = C.inner(a); if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } stroke(0.06);
  for (let a = C.a0 + 0.05; a < C.a1 - 0.05;) {
    const ri = C.inner(a), w = C.R1 - ri; if (w < 0.55) { a += 0.02; continue; }
    const rm = (C.R1 + ri) / 2, len = w * 0.62;
    g.save(); g.rotate(a); g.beginPath(); g.ellipse(rm, 0, w * 0.34, len * 0.5 / rm * rm * 0.92, 0, 0, TAU); g.restore(); stroke(0.035);
    a += (len + 0.22) / rm;
  }
  // Rings between the dance circles; a chain of interlaced circles; a band of scallops; the star mandala at the centre
  ring(15.2, 0.05); ring(11.3, 0.05); ring(7.5, 0.06); ring(3.05, 0.045); ring(1.75, 0.05);
  for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; g.beginPath(); g.arc(Math.cos(a) * 13.25, Math.sin(a) * 13.25, 1.95, 0, TAU); stroke(0.028); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, a2 = (i + 1) / 24 * TAU, m = (a + a2) / 2; g.beginPath(); g.arc(Math.cos(m) * 7.5, Math.sin(m) * 7.5, 0.98, m - Math.PI / 2, m + Math.PI / 2); stroke(0.03); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.arc(Math.cos(a) * 3.6, Math.sin(a) * 3.6, 3.6, 0, TAU); stroke(0.03); }
  [0, Math.PI / 4].forEach((rot) => { g.beginPath(); for (let i = 0; i <= 4; i++) { const a = rot + i / 4 * TAU; if (i) g.lineTo(Math.cos(a) * 7.2, Math.sin(a) * 7.2); else g.moveTo(Math.cos(a) * 7.2, Math.sin(a) * 7.2); } stroke(0.04); });
  // Rays from the rings out to the rim, clear of the crescent
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * TAU, inC = ((a - C.a0) % TAU + TAU) % TAU < C.a1 - C.a0;
    g.beginPath(); g.moveTo(Math.cos(a) * 15.45, Math.sin(a) * 15.45); g.lineTo(Math.cos(a) * (inC ? C.inner(a) - 0.25 : 18.2), Math.sin(a) * (inC ? C.inner(a) - 0.25 : 18.2)); stroke(0.022);
  }
  g.restore();
}
function floorDecal(rect, res) {
  const c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k;
  // Round the obsidian, the stone of the basin itself: dark basalt grey
  g.fillStyle = 'rgba(30,27,36,.9)'; g.fillRect(0, 0, res, res);
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx, cz, P0.floor * k, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
  inlay(g, k, cx, cz, false);
  return c;
}
function inlayGlow(res) {
  const W = 39.2, c = canvas(res, res), g = c.getContext('2d'), k = res / W;
  g.fillStyle = '#000'; g.fillRect(0, 0, res, res);
  inlay(g, k, res / 2, res / 2, true);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { t, W };
}
// A crystal's light from within: hottest low in its body, cooler towards the point, with fractures catching it
function crystalTexture(hot, mid, tip, seed) {
  const r = seeded(seed);
  return canvasTexture(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, hot); gr.addColorStop(0.25, hot); gr.addColorStop(0.5, mid); gr.addColorStop(0.82, tip); gr.addColorStop(1, '#1a0c04'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const y = h * (0.25 + r() * 0.5), x = r() * w; g.strokeStyle = `rgba(255,248,225,${0.25 + r() * 0.45})`; g.lineWidth = 0.7 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 26, y + (r() - 0.5) * 30); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 50); g.stroke(); }
    // the edges between its faces, darker
    for (let k = 0; k < 6; k++) { const x = k / 6 * w; g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - 0.8, 0, 1.6, h); }
  });
}
// A fern's frond: a pale rachis with pinnae on both sides, each cut into lobes, silver-white to violet at the edges
function frondTexture() {
  return canvasTexture(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); const cx = w / 2;
    g.shadowColor = 'rgba(190,160,255,.9)'; g.shadowBlur = 7;
    const n = 30;
    for (let i = 1; i < n; i++) {
      const v = i / n, y = h * (1 - v * 0.97), L = w * 0.47 * Math.sin(Math.min(1, v * 1.25) * Math.PI) * (1 - v * 0.25), up = 0.5 + v * 0.35;
      [-1, 1].forEach((sd) => {
        const tipx = cx + sd * L * Math.cos(up * 0.6), tipy = y - L * Math.sin(up * 0.6);
        const lobes = Math.max(3, Math.round(L / 9));
        for (let k = 0; k < lobes; k++) {
          const u = (k + 0.5) / lobes, x = lerp(cx, tipx, u), yy = lerp(y, tipy, u), rr = Math.max(1.4, (1 - u * 0.8) * h / n * 0.42);
          const gr = g.createRadialGradient(x, yy, 0, x, yy, rr * 1.5); gr.addColorStop(0, 'rgba(250,246,255,1)'); gr.addColorStop(0.6, 'rgba(214,196,255,.95)'); gr.addColorStop(1, 'rgba(150,110,240,.9)');
          g.fillStyle = gr; g.beginPath(); g.ellipse(x, yy, rr * 1.35, rr, Math.atan2(tipy - y, tipx - cx), 0, TAU); g.fill();
        }
        g.strokeStyle = 'rgba(245,240,255,.95)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, y); g.lineTo(tipx, tipy); g.stroke();
      });
    }
    g.shadowBlur = 4; g.strokeStyle = '#fbf8ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, h); g.lineTo(cx, h * 0.02); g.stroke();
  });
}
// An alien leaf: deep violet with glowing veins in pink and a cold blue, a pale rim
function leafTexture() {
  const r = seeded(61);
  return canvasTexture(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const shape = () => { g.beginPath(); g.moveTo(w / 2, h); g.bezierCurveTo(w * 0.02, h * 0.68, w * 0.12, h * 0.2, w / 2, 0); g.bezierCurveTo(w * 0.88, h * 0.2, w * 0.98, h * 0.68, w / 2, h); g.closePath(); };
    shape(); const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#3a1460'); gr.addColorStop(0.6, '#6a2aa8'); gr.addColorStop(1, '#8e4fd0'); g.fillStyle = gr; g.fill();
    g.save(); shape(); g.clip();
    g.shadowColor = 'rgba(255,140,230,.9)'; g.shadowBlur = 5; g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,170,240,.95)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, h * 0.05); g.stroke();
    for (let i = 1; i < 9; i++) { const y = h * (1 - i / 9.5); [-1, 1].forEach((sd) => { g.strokeStyle = i % 2 ? 'rgba(255,160,235,.85)' : 'rgba(130,210,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + sd * w * 0.22, y - h * 0.05, w / 2 + sd * w * 0.4, y - h * 0.12); g.stroke(); }); }
    g.shadowBlur = 0; for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,190,245,${0.2 + r() * 0.4})`; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 1.6, 0, TAU); g.fill(); }
    g.restore();
    shape(); g.strokeStyle = 'rgba(220,180,255,.9)'; g.lineWidth = 2; g.stroke();
  });
}
// The glyphs cut in the monoliths: a column of signs in a script of this world (no real one), and a sun disc above
function glyphTexture(seed) {
  const r = seeded(seed);
  return canvasTexture(64, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd08a'; g.fillStyle = '#ffd08a'; g.lineWidth = 3; g.lineCap = 'round';
    g.shadowColor = 'rgba(255,170,70,.9)'; g.shadowBlur = 6;
    g.beginPath(); g.arc(w / 2, 34, 15, 0, TAU); g.stroke(); g.beginPath(); g.arc(w / 2, 34, 5, 0, TAU); g.fill();
    for (let y = 80; y < h - 30; y += 42) {
      const k = Math.floor(r() * 5), x = w / 2; g.beginPath();
      if (k === 0) { g.moveTo(x - 12, y - 12); g.lineTo(x + 12, y - 12); g.lineTo(x, y + 12); g.closePath(); }
      else if (k === 1) { g.moveTo(x - 12, y); g.lineTo(x + 12, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.moveTo(x - 8, y - 10); g.lineTo(x + 8, y + 10); }
      else if (k === 2) { g.arc(x, y, 11, Math.PI * 0.15, Math.PI * 1.85); g.moveTo(x + 4, y); g.lineTo(x + 14, y); }
      else if (k === 3) { g.moveTo(x - 12, y + 12); g.lineTo(x - 12, y - 12); g.lineTo(x + 12, y + 12); g.lineTo(x + 12, y - 12); }
      else { g.moveTo(x, y - 14); g.lineTo(x + 12, y); g.lineTo(x, y + 14); g.lineTo(x - 12, y); g.closePath(); g.moveTo(x, y - 5); g.lineTo(x, y + 5); }
      g.stroke();
    }
  });
}
// A hologram banner: a dancer and her partner in light, with a border of signs, over a faint grid
function bannerTexture(seed) {
  const r = seeded(seed);
  return canvasTexture(256, 384, (g, w, h) => {
    g.fillStyle = 'rgba(40,20,90,.55)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,230,255,.25)'; g.lineWidth = 1; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.shadowColor = 'rgba(160,220,255,1)'; g.shadowBlur = 10; g.strokeStyle = '#bfefff'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
    // two figures: her in a flared chaniya, a dandiya raised; him beside her
    const fig = (x, y, s, skirt, dir) => {
      g.fillStyle = skirt; g.beginPath(); g.moveTo(x - 10 * s, y); g.quadraticCurveTo(x - 46 * s, y + 70 * s, x - 52 * s * dir, y + 92 * s); g.lineTo(x + 52 * s, y + 92 * s); g.quadraticCurveTo(x + 46 * s, y + 70 * s, x + 10 * s, y); g.closePath(); g.fill();
      g.fillStyle = '#e8f8ff'; g.fillRect(x - 9 * s, y - 34 * s, 18 * s, 36 * s); g.beginPath(); g.arc(x, y - 46 * s, 11 * s, 0, TAU); g.fill();
      g.strokeStyle = '#e8f8ff'; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x - 8 * s, y - 28 * s); g.lineTo(x - 30 * s, y - 62 * s * dir); g.moveTo(x + 8 * s, y - 28 * s); g.lineTo(x + 28 * s, y - 40 * s); g.stroke();
    };
    fig(w * 0.38, h * 0.42, 1, 'rgba(255,120,210,.95)', 1); fig(w * 0.66, h * 0.4, 0.9, 'rgba(120,210,255,.9)', -1);
    g.fillStyle = '#bfefff'; for (let i = 0; i < 9; i++) { const x = 28 + i * 25; g.fillRect(x, h - 46, 4 + r() * 10, 4); g.fillRect(x + 4, h - 38, 4, 4 + r() * 8); }
  });
}

/* ---------- the ringed planet, its moons, the far mountains ---------- */
function planetTexture(res) {
  const c = canvas(res, res), g = c.getContext('2d'), W = res, cx = W / 2, cy = W / 2, R = W * 0.27, tilt = -0.24;
  const ringBand = (front) => {
    g.save(); g.translate(cx, cy); g.rotate(tilt); g.scale(1, 0.27);
    g.beginPath(); g.rect(-W, front ? 0 : -W, 2 * W, W); g.clip();
    // bands of the ring, lavender to white, with a dark gap
    const bands = [[1.24, 1.34, 0.32], [1.34, 1.52, 0.6], [1.52, 1.55, 0.05], [1.55, 1.7, 0.5], [1.7, 1.78, 0.22]];
    bands.forEach(([a, b, al]) => { const gr = g.createRadialGradient(0, 0, a * R, 0, 0, b * R); gr.addColorStop(0, `rgba(226,214,255,${al})`); gr.addColorStop(0.5, `rgba(246,240,255,${al * 1.1})`); gr.addColorStop(1, `rgba(200,186,240,${al * 0.9})`); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, b * R, 0, TAU); g.arc(0, 0, a * R, 0, TAU, true); g.fill('evenodd'); });
    g.restore();
  };
  // a faint halo of the planet's air
  const halo = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.25); halo.addColorStop(0, 'rgba(140,220,240,.35)'); halo.addColorStop(1, 'rgba(140,220,240,0)'); g.fillStyle = halo; g.fillRect(0, 0, W, W);
  ringBand(false);
  // The planet: teal-blue bands, lit from the upper left, the night side towards the lower right
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  g.translate(cx, cy); g.rotate(tilt);
  const base = g.createLinearGradient(0, -R, 0, R); base.addColorStop(0, '#9fe0e6'); base.addColorStop(0.3, '#5fb3c4'); base.addColorStop(0.55, '#7cc9cf'); base.addColorStop(0.75, '#3f8ea8'); base.addColorStop(1, '#2c6b8e'); g.fillStyle = base; g.fillRect(-R, -R, 2 * R, 2 * R);
  const rr = seeded(5);
  for (let i = 0; i < 26; i++) { const y = -R + rr() * 2 * R, hgt = R * (0.015 + rr() * 0.07); g.fillStyle = rr() < 0.5 ? `rgba(220,250,255,${0.06 + rr() * 0.12})` : `rgba(20,70,100,${0.06 + rr() * 0.14})`; g.fillRect(-R, y, 2 * R, hgt); }
  g.rotate(-tilt); g.translate(-cx, -cy);
  const shade = g.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.1, cx - R * 0.1, cy - R * 0.1, R * 1.45);
  shade.addColorStop(0, 'rgba(255,255,255,.18)'); shade.addColorStop(0.45, 'rgba(0,0,0,0)'); shade.addColorStop(0.78, 'rgba(6,10,30,.55)'); shade.addColorStop(1, 'rgba(4,6,20,.88)');
  g.fillStyle = shade; g.fillRect(0, 0, W, W);
  // the ring's shadow across it
  g.save(); g.translate(cx, cy); g.rotate(tilt); g.fillStyle = 'rgba(10,20,40,.35)'; g.fillRect(-R, R * 0.1, 2 * R, R * 0.07); g.restore();
  g.restore();
  // rim light from the air on the lit edge
  g.strokeStyle = 'rgba(190,245,255,.35)'; g.lineWidth = W * 0.004; g.beginPath(); g.arc(cx, cy, R, Math.PI * 0.75, Math.PI * 1.55); g.stroke();
  ringBand(true);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function moonTexture(lit) {
  return canvasTexture(128, 128, (g, w) => {
    const r = w * 0.34, x = w / 2, y = w / 2;
    g.fillStyle = 'rgba(120,110,160,.35)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.fillStyle = lit; g.beginPath(); g.arc(x - r * 0.42, y - r * 0.32, r * 1.05, 0, TAU); g.fill(); g.restore();
  });
}
function ridge(radius, base, height, cols, seed, spiky, gap) {
  const n = 180, pos = [], col = [], c0 = new THREE.Color(cols[0]), c1 = new THREE.Color(cols[1]), r = seeded(seed);
  const tops = [];
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, f = noise(Math.cos(a) * 3 + seed, Math.sin(a) * 3, 0.5) * 0.65 + noise(Math.cos(a) * 9, Math.sin(a) * 9 + seed, 1.5) * 0.35;
    let h = height * (0.25 + 0.85 * f);
    if (spiky && r() < 0.12) h += height * (0.4 + r() * 0.8);
    if (gap) h *= gap(a);
    tops.push(h);
  }
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, p = (a, y) => [Math.sin(a) * radius, y, Math.cos(a) * radius];
    const A = p(a0, base), B = p(a1, base), C = p(a1, base + tops[i + 1]), D = p(a0, base + tops[i]);
    [A, B, C, A, C, D].forEach((q, k) => { pos.push(q[0], q[1], q[2]); const cc = [0, 1, 4].includes(k) ? c0 : c1; col.push(cc.r, cc.g, cc.b); });
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
}
function sky(tier) {
  const root = new THREE.Group(), phone = tier.name === 'phone';
  // The dome: ember at the horizon, rose, then violet, deepening to night overhead
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { c0: { value: new THREE.Color('#1c1430') }, c1: { value: new THREE.Color('#f08a5a') }, c2: { value: new THREE.Color('#b8507a') }, c3: { value: new THREE.Color('#3a2466') }, c4: { value: new THREE.Color('#130f33') }, c5: { value: new THREE.Color('#04051a') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 c4; uniform vec3 c5; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h < 0.0 ? c0 : h < 0.035 ? mix(c1, c2, h / 0.035) : h < 0.15 ? mix(c2, c3, (h - 0.035) / 0.115) : h < 0.5 ? mix(c3, c4, (h - 0.15) / 0.35) : mix(c4, c5, (h - 0.5) / 0.5); gl_FragColor = vec4(c, 1.0); }'
  }));
  dome.renderOrder = -10; root.add(dome);
  // Stars, many: there's no city here to wash them out
  const r = seeded(77), n = phone ? 900 : 1600, pos = new Float32Array(n * 3), colr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, el = Math.asin(0.08 + Math.pow(r(), 0.7) * 0.92), R = 800, k = (0.3 + r() * 0.7) * Math.min(1, (el - 0.08) * 4 + 0.25), hue = r();
    pos[i * 3] = Math.cos(a) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * R;
    colr[i * 3] = k * (hue < 0.3 ? 0.8 : 1); colr[i * 3 + 1] = k * 0.92; colr[i * 3 + 2] = k * (hue > 0.7 ? 0.8 : 1);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  root.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true })));
  // The ringed planet, high over the stage and a little left, as the references keep it; its small moons about it
  const place = (s, az, el, R, size) => { s.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, Math.cos(az) * Math.cos(el) * R); s.scale.setScalar(size); root.add(s); return s; };
  const planet = place(new THREE.Sprite(new THREE.SpriteMaterial({ map: planetTexture(phone ? 512 : 1024), fog: false, depthWrite: false, transparent: true })), 0.36, 0.22, 700, 400);
  [[0.62, 0.46, 15, '#efe8ff'], [-0.78, 0.52, 11, '#d8e8ff'], [0.98, 0.25, 9, '#ffe9df']].forEach(([az, el, s, c]) => place(new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(c), fog: false, depthWrite: false, transparent: true })), az, el, 690, s));
  // Mountains round the horizon, nearest darkest, the far ones lost in violet haze; spires on the near range. Behind
  // the stage the ranges dip, so the glow at the horizon shows under the planet.
  const dip = (a) => 0.55 + 0.45 * Math.min(1, Math.abs(Math.atan2(Math.sin(a - 0.3), Math.cos(a - 0.3))) / 0.7);
  root.add(ridge(640, -60, 120, ['#3a2a52', '#6a4a78'], 3, false, dip));
  root.add(ridge(420, -60, 92, ['#251b38', '#46325e'], 7, false, dip));
  root.add(ridge(240, -60, 70, ['#161022', '#2a1f3a'], 11, true));
  // The valley floor far below the basin, under the haze
  const valley = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshBasicMaterial({ color: '#1a1328', fog: false }));
  valley.rotation.x = -Math.PI / 2; valley.position.y = -62; root.add(valley);
  return { root, moonLight: { dir: planet.position.clone().normalize(), intensity: 0.3 }, info: null };
}

/* ---------- what the polished things reflect: the dusk over the basin and the crystals round it ---------- */
function envScene() {
  const s = new THREE.Scene();
  const t = canvasTexture(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a0a24'); gr.addColorStop(0.35, '#3a2466'); gr.addColorStop(0.47, '#c85a78'); gr.addColorStop(0.5, '#f0965e'); gr.addColorStop(0.53, '#2a1a32'); gr.addColorStop(1, '#0d0a12'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 3 ? EMBER : VIOLET).multiplyScalar(4) })); m.position.set(Math.cos(a) * 18, -1 + (i % 2) * 2, Math.sin(a) * 18); s.add(m); }
  const pl = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fd6e0').multiplyScalar(1.6) })); pl.position.set(14, 18, 38); s.add(pl);
  return s;
}

/* ---------- the venue ---------- */
function pandora(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', dense = phone ? 0.6 : 1, S = P0.stage;
  const glow = { value: 1 }, sources = [], rocks = [], strips = new Shape(), shape = new Shape(), fronds = new Shape(), leaves = new Shape();
  const src = (x, y, z, hex, k, reach) => sources.push({ x, y, z, r: reach, c: new THREE.Color(hex).multiplyScalar(k) });
  const piece = (geo, m) => { const g2 = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g2.applyMatrix4(m); g2.deleteAttribute('color'); rocks.push(g2); };
  const M = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const edge = (p0, p1, y, out, h = 0.035) => { const e = 0.012; strips.grid([p0[0] - out[0] * e, y - h - 0.02, p0[1] - out[2] * e], [p1[0] - out[0] * e, y - h - 0.02, p1[1] - out[2] * e], [p1[0] - out[0] * e, y - 0.02, p1[1] - out[2] * e], [p0[0] - out[0] * e, y - 0.02, p0[1] - out[2] * e], 1, 1, [-out[0], 0, -out[2]], () => [0, 0]); };

  /* the floor: polished black stone, the gold set into it and the light running in the gold */
  const ob = obsidian(phone ? 512 : 1024), decalRect = { cx: 0, cz: 0, w: 40, d: 40 };
  const floorMesh = ground(root, { map: ob.map, normalMap: ob.normal, normalScale: 0.35, roughness: 0.46, decal: floorDecal(decalRect, phone ? 1024 : 2048), decalRect }, 96, 96, 4, tier.shadows);
  floorMesh.material.userData.env = 0.85;
  const ig = inlayGlow(phone ? 1024 : 2048), inl = new THREE.Mesh(new THREE.PlaneGeometry(ig.W, ig.W), kit.litMap(ig.t, 0.9, 'architectural', { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(EMBER).multiplyScalar(0.9) }));
  inl.rotation.x = -Math.PI / 2; inl.position.set(0, 0.006, 0); inl.renderOrder = 1; root.add(inl);

  /* things in the basin */
  const crystals = [], violets = [], lanterns = [];
  const crystal = (x, y, z, h, rad, lean, ry) => { crystals.push({ x, y, z, h, r: rad, lean, ry }); src(x, y + h * 0.4, z, EMBER, 0.4 + h * 0.12, 1.8 + h * 1.1); };
  const cluster = (x, y, z, h, n) => {
    crystal(x, y, z, h, h * 0.16, (r() - 0.5) * 0.12, r() * TAU);
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = h * (0.14 + r() * 0.14), hh = h * (0.35 + r() * 0.35); crystal(x + Math.cos(a) * d, y, z + Math.sin(a) * d, hh, hh * 0.18, 0.25 + r() * 0.3, a); }
    if (y < 0.1) kit.pools.add(x, 0.02, z, 1.4 + h * 0.9, 1.4 + h * 0.9, EMBER, 0.08 + h * 0.015, { layer: 'practical', falloff: 'tight' });
  };
  const fern = (x, y, z, size, n) => {
    const a0 = r() * TAU;
    for (let i = 0; i < n; i++) {
      const az = a0 + i / n * TAU + (r() - 0.5) * 0.5, L = size * (0.7 + r() * 0.45), W = L * 0.36, e0 = 1.25 - r() * 0.25, e1 = -0.15 - r() * 0.35, hor = [Math.cos(az), Math.sin(az)], roll = (r() - 0.5) * 0.5;
      const sw = [Math.cos(az + Math.PI / 2) * Math.cos(roll), Math.sin(roll), Math.sin(az + Math.PI / 2) * Math.cos(roll)];
      let p = [x, y + 0.1, z]; const steps = 9, ds = L / steps;
      for (let s = 0; s < steps; s++) {
        const e = lerp(e0, e1, Math.pow((s + 0.5) / steps, 1.2)), q = [p[0] + hor[0] * Math.cos(e) * ds, p[1] + Math.sin(e) * ds, p[2] + hor[1] * Math.cos(e) * ds];
        const A = p.map((v, i2) => v - sw[i2] * W / 2), B = p.map((v, i2) => v + sw[i2] * W / 2), C = q.map((v, i2) => v + sw[i2] * W / 2), D = q.map((v, i2) => v - sw[i2] * W / 2);
        fronds.tri(A, B, C, [0, s / steps], [1, s / steps], [1, (s + 1) / steps]); fronds.tri(A, C, D, [0, s / steps], [1, (s + 1) / steps], [0, (s + 1) / steps]);
        p = q;
      }
    }
    src(x, y + size * 0.5, z, SILVER, 0.22, size * 1.3);
  };
  const plant = (x, y, z, size) => {
    const n = 5 + Math.floor(r() * 3), a0 = r() * TAU;
    for (let i = 0; i < n; i++) {
      const az = a0 + i / n * TAU, L = size * (0.7 + r() * 0.5), W = L * 0.5, e = 0.5 + r() * 0.5, hor = [Math.cos(az), Math.sin(az)], sv = [Math.cos(az + Math.PI / 2), Math.sin(az + Math.PI / 2)];
      const mid = [x + hor[0] * Math.cos(e) * L * 0.5, y + Math.sin(e) * L * 0.5, z + hor[1] * Math.cos(e) * L * 0.5], tip = [x + hor[0] * L * 0.95, y + Math.sin(e) * L * 0.55, z + hor[1] * L * 0.95];
      const b0 = [x - sv[0] * 0.03, y + 0.02, z - sv[1] * 0.03], b1 = [x + sv[0] * 0.03, y + 0.02, z + sv[1] * 0.03], m0 = [mid[0] - sv[0] * W / 2, mid[1], mid[2] - sv[1] * W / 2], m1 = [mid[0] + sv[0] * W / 2, mid[1], mid[2] + sv[1] * W / 2];
      leaves.tri(b0, b1, m1, [0.45, 0], [0.55, 0], [1, 0.5]); leaves.tri(b0, m1, m0, [0.45, 0], [1, 0.5], [0, 0.5]); leaves.tri(m0, m1, tip, [0, 0.5], [1, 0.5], [0.5, 1]);
    }
  };
  const heather = (x, y, z, n, spread) => { for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * spread; kit.bulbs.add(x + Math.cos(a) * d, y + 0.05 + r() * 0.45, z + Math.sin(a) * d, 0, { color: ['#b77dff', '#d9a0ff', '#8f6bff', '#ff8fd8'][Math.floor(r() * 4)], k: 0.55, s: 0.32 + r() * 0.3, twinkle: 0.35, layer: 'architectural' }); } };
  const bed = (x, y, z, big) => {
    for (let i = 0; i < (big ? 3 : 2); i++) plant(x + (r() - 0.5) * 1.2, y, z + (r() - 0.5) * 1.2, 0.5 + r() * 0.45);
    heather(x, y, z, Math.round((big ? 22 : 12) * dense), big ? 1.1 : 0.7); src(x, y + 0.3, z, VIOLET, 0.3, 2.6);
    if (r() < 0.6) for (let i = 0; i < 3; i++) { const a = r() * TAU; violets.push({ x: x + Math.cos(a) * 0.5, y, z: z + Math.sin(a) * 0.5, h: 0.18 + r() * 0.35, r: 0.04 + r() * 0.05, lean: 0.2 + r() * 0.4, ry: a }); }
  };
  const lantern = (x, y, z) => { lanterns.push([x, y, z]); kit.flames.add(x, y + 0.1, z, { bowl: null, s: 0.026, k: 0.7 }); src(x, y + 0.2, z, '#ffb46a', 0.5, 2.0); };
  const candle = (x, y, z) => { kit.flames.add(x, y, z, { s: 0.03, k: 0.45 }); src(x, y + 0.1, z, '#ffb46a', 0.25, 1.4); };
  const column = (x, y, z, rad, h) => {
    const geo = new THREE.CylinderGeometry(rad * 0.97, rad, h, 6, Math.max(1, Math.round(h / 1.2))), p = geo.attributes.position, tx = (r() - 0.5) * 0.3, tz = (r() - 0.5) * 0.3;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > h / 2 - 0.01) p.setY(i, p.getY(i) + p.getX(i) * tx + p.getZ(i) * tz);
    geo.computeVertexNormals(); piece(geo, M(x, y + h / 2, z, r() * TAU, 1, 1, 1, (r() - 0.5) * 0.06, (r() - 0.5) * 0.06));
  };
  const columns = (x, y, z, n, rad, h0, h1) => {
    const pts = [[0, 0]]; for (let ring = 1; pts.length < n; ring++) for (let i = 0; i < 6 * ring && pts.length < n; i++) { const a = i / (6 * ring) * TAU + ring * 0.3; pts.push([Math.cos(a) * ring * rad * 1.75, Math.sin(a) * ring * rad * 1.75]); }
    pts.forEach(([dx, dz]) => column(x + dx, y, z + dz, rad * (0.85 + r() * 0.3), lerp(h1, h0, Math.min(1, Math.hypot(dx, dz) / (rad * 4))) * (0.75 + r() * 0.4)));
  };
  const boulder = (x, y, z, s, sy) => {
    const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position, sd = r() * 100;
    for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 0.72 + 0.5 * noise(vx * 1.7 + sd, vy * 1.7, vz * 1.7); p.setXYZ(i, vx * k, vy * k, vz * k); }
    geo.computeVertexNormals(); piece(geo, M(x, y + s * sy * 0.45, z, r() * TAU, s * (0.85 + r() * 0.3), s * sy, s * (0.85 + r() * 0.3)));
  };
  const spire = (x, y, z, h, rad) => {
    const geo = new THREE.CylinderGeometry(rad * 0.18, rad, h, 7, 9), p = geo.attributes.position, sd = r() * 100;
    for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 0.75 + 0.55 * noise(vx * 0.9 + sd, vy * 0.35, vz * 0.9); p.setXYZ(i, vx * k + Math.sin(vy * 0.3 + sd) * rad * 0.12, vy, vz * k); }
    geo.computeVertexNormals(); piece(geo, M(x, y + h / 2, z, r() * TAU));
  };
  // A pillar of basalt with a crystal standing on top of it, as the floor's edge has them
  const crystalPillar = (x, z, h) => { const ph = 0.5 + r() * 1.1; column(x, 0, z, 0.36, ph); crystal(x, ph - 0.05, z, h, h * 0.17, (r() - 0.5) * 0.1, r() * TAU); cluster(x + (r() - 0.5) * 0.9, 0, z + (r() - 0.5) * 0.9, h * 0.45, 2); };
  const box = (x0, y0, z0, x1, y1, z1, sides = [1, 1, 1, 1, 1]) => {
    const nu = Math.max(1, Math.round((x1 - x0) / 1.2)), nv = Math.max(1, Math.round((z1 - z0) / 1.2)), nh = Math.max(1, Math.round((y1 - y0) / 1.2));
    if (sides[0]) shape.grid([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], nu, nv, [0, 1, 0], topUV);
    if (sides[1]) shape.grid([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], nu, nh, [0, 0, -1], faceUV([1, 0]));
    if (sides[2]) shape.grid([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], nu, nh, [0, 0, 1], faceUV([1, 0]));
    if (sides[3]) shape.grid([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], nv, nh, [-1, 0, 0], faceUV([0, 1]));
    if (sides[4]) shape.grid([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], nv, nh, [1, 0, 0], faceUV([0, 1]));
  };

  /* the terraces: stone steps round the floor, a gold light under every edge, candles along them */
  const hasTier = (j, k) => k >= firstTier(j) && k < tiersOf(j);
  for (let j = 0; j < P0.sides; j++) {
    const stair = P0.stairs.includes(j), s = side(j), out = [s.n[0], 0, s.n[1]], dir = s.u, nT = tiersOf(j), near = j === 15 || j === 0 || j === 1;
    for (let k = firstTier(j); k < nT; k++) {
      const a = front(k), last = k === nT - 1, b = last ? topOf(j) : front(k + 1), y = stepTop(k), y0 = k ? stepTop(k - 1) : 0;
      const parts = stair ? [{ a0: a, a1: last ? front(k + 1) : b, spans: [[-1, -STAIR], [STAIR, 1]] }].concat(last ? [{ a0: front(k + 1), a1: b, spans: [[-1, 1]] }] : []) : [{ a0: a, a1: b, spans: [[-1, 1]] }];
      parts.forEach((pt, pi) => pt.spans.forEach(([t0, t1]) => {
        const T = (aa, t) => (t === -1 ? -aa * HALF : t === 1 ? aa * HALF : t);
        const fl = onSide(j, pt.a0, T(pt.a0, t0)), fr = onSide(j, pt.a0, T(pt.a0, t1)), br = onSide(j, pt.a1, T(pt.a1, t1)), bl = onSide(j, pt.a1, T(pt.a1, t0));
        const len = Math.hypot(fr[0] - fl[0], fr[1] - fl[1]), nu = Math.max(1, Math.round(len / 1.1)), nv = Math.max(1, Math.round((pt.a1 - pt.a0) / 0.7));
        shape.grid([fl[0], y, fl[1]], [fr[0], y, fr[1]], [br[0], y, br[1]], [bl[0], y, bl[1]], nu, nv, [0, 1, 0], topUV);
        if (pi) return;
        shape.grid([fl[0], y0, fl[1]], [fr[0], y0, fr[1]], [fr[0], y, fr[1]], [fl[0], y, fl[1]], nu, 1, [-out[0], 0, -out[2]], faceUV(dir));
        edge(fl, fr, y, out);
        // walls where a stair is cut, and at an end whose neighbour hasn't this step
        [[t0, -1], [t1, 1]].forEach(([t, sd]) => {
          const cut = stair && Math.abs(t) === STAIR, endN = Math.abs(t) === 1 && !hasTier((j + sd + P0.sides) % P0.sides, k);
          if (!cut && !endN) return;
          const p0 = onSide(j, pt.a0, T(pt.a0, t)), p1 = onSide(j, pt.a1, T(pt.a1, t)), w = cut ? [-s.u[0] * sd, 0, -s.u[1] * sd] : [s.u[0] * sd, 0, s.u[1] * sd];
          shape.grid([p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [p1[0], y, p1[1]], [p0[0], y, p0[1]], Math.max(1, Math.round((pt.a1 - pt.a0) / 0.8)), 2, w, faceUV([w[2], -w[0]]));
        });
        // candles along the step's edge, here and there
        if (!near || k > 3) for (let q = 0.12; q < 0.95; q += 0.22) if (r() < 0.45 * dense) { const tq = lerp(T(a, t0), T(a, t1), q), p = onSide(j, a + 0.18, tq); candle(p[0], y, p[1]); }
      }));
    }
    { const l = onSide(j, topOf(j), -topOf(j) * HALF), rt = onSide(j, topOf(j), topOf(j) * HALF), y = stepTop(nT - 1); shape.grid([l[0], 0, l[1]], [rt[0], 0, rt[1]], [rt[0], y, rt[1]], [l[0], y, l[1]], 6, 2, out, faceUV(dir)); }
    if (stair) for (let i = 0; i < 15; i++) {
      const a0 = P0.a0 + i * P0.tread / 3, a1 = a0 + P0.tread / 3, y = (i + 1) * P0.rise / 3, fl = onSide(j, a0, -STAIR), fr = onSide(j, a0, STAIR), br = onSide(j, a1, STAIR), bl = onSide(j, a1, -STAIR);
      shape.grid([fl[0], y, fl[1]], [fr[0], y, fr[1]], [br[0], y, br[1]], [bl[0], y, bl[1]], 4, 1, [0, 1, 0], topUV);
      shape.grid([fl[0], y - P0.rise / 3, fl[1]], [fr[0], y - P0.rise / 3, fr[1]], [fr[0], y, fr[1]], [fl[0], y, fl[1]], 4, 1, [-out[0], 0, -out[2]], faceUV(dir));
      edge(fl, fr, y, out, 0.025);
      if (i % 4 === 1) [-1, 1].forEach((sd) => { const p = onSide(j, a0 + 0.2, sd * (STAIR + 0.3)); lantern(p[0], Math.ceil((i + 1) / 3) * P0.rise, p[1]); });
    }
    // At each corner of the steps (not in front of the seats you watch from), an outcrop of basalt and a crystal on it
    if (!near && j !== 14 && hasTier(j, 2) && hasTier((j + 1) % P0.sides, 2)) {
      const c = onSide(j, front(1) + 0.4, (front(1) + 0.4) * HALF);
      columns(c[0], stepTop(0), c[1], 3 + Math.floor(r() * 3), 0.4, 1.6, 3.2 + r() * 1.4);
      crystal(c[0], stepTop(0) + 3.2, c[1], 1.4 + r() * 0.8, 0.26, 0.1, r() * TAU); bed(c[0] * 1.02, stepTop(1), c[1] * 1.02, false);
    }
    // The promenade's back: rock, ferns and crystals, and spires rising behind
    const back = topOf(j) - 1.3, len = back * HALF, yT = stepTop(nT - 1), low = P0.low.includes(j);
    for (let t = -len + 1.2; t < len - 0.8; t += 2.2 + r() * 1.8) {
      if ((j === 11 && Math.abs(t) < 4.2) || (low && Math.abs(t) < 3.8)) continue;
      const p = onSide(j, back + r() * 0.9, t), q = r();
      if (q < 0.42) columns(p[0], yT - 0.2, p[1], 3 + Math.floor(r() * 5), 0.42, low ? 0.8 : 1.6, (low ? 2.2 : 4.8) + r() * 3);
      else if (q < 0.75) boulder(p[0], yT - 0.3, p[1], 1.1 + r() * 1.3, 0.8 + r() * 0.5);
      else fern(p[0], yT, p[1], 3 + r() * 1.6, Math.round(8 * dense));
      if (r() < 0.4) { const c = onSide(j, back - 0.6, t + 0.9); cluster(c[0], yT, c[1], 1.6 + r() * 1.6, 1 + Math.floor(r() * 2)); }
      if (r() < 0.55 * dense) { const f = onSide(j, back - 1.1, t - 0.8); fern(f[0], yT, f[1], 2.6 + r() * 1.6, Math.round(8 * dense)); }
      if (r() < 0.5) bed(p[0] * 0.97, yT, p[1] * 0.97, r() < 0.5);
    }
    if (!low && r() < 0.75) { const p = onSide(j, topOf(j) + 3 + r() * 4, (r() - 0.5) * 6), sideways = Math.abs(Math.cos(-Math.PI / 2 + j * SEG)) > 0.6; spire(p[0], -0.5, p[1], 9 + r() * 9 + (sideways ? 8 : 0), 1.6 + r() * 1.3); }
  }

  /* the rocky border round the floor: crystal pillars, outcrops and ferns, flora between, low in front of the seats */
  const gapAt = (th) => [P0.stairs[0], P0.stairs[1]].some((j) => Math.abs(Math.atan2(Math.sin(th - (-Math.PI / 2 + j * SEG)), Math.cos(th - (-Math.PI / 2 + j * SEG)))) < 0.12);
  for (let th = -Math.PI, n = 0; th < Math.PI; th += 2.5 / 20.4 * (0.8 + r() * 0.4), n++) {
    const rad = 19.9 + r() * 1.1, x = Math.cos(th) * rad, z = Math.sin(th) * rad;
    if ((Math.abs(x) < 5.6 && z > 0) || Math.hypot(x - P0.dj.x, z - P0.dj.z) < 3.4 || gapAt(th)) continue;
    const deg = th * 180 / Math.PI, low = deg > -140 && deg < -40;
    if (low) { bed(x, 0, z, false); if (n % 3 === 0) cluster(x, 0, z, 0.6 + r() * 0.4, 1); candle(x * 0.97, 0, z * 0.97); continue; }
    const kind = n % 3;
    if (kind === 0) crystalPillar(x, z, 1.3 + r() * 1.1);
    else if (kind === 1) { columns(x, 0, z, 2 + Math.floor(r() * 4), 0.38, 0.6, 1.4 + r() * 1.4); boulder(x + (r() - 0.5), 0, z + (r() - 0.5), 0.7 + r() * 0.6, 0.7); cluster(x * 0.97, 0, z * 0.97, 1.1 + r() * 1.2, 2); }
    else { boulder(x, 0, z, 0.8 + r() * 0.7, 0.75); fern(x * 1.02, 0.4, z * 1.02, 2.6 + r() * 1.4, Math.round(8 * dense)); }
    bed(x * 0.965, 0, z * 0.965, r() < 0.6);
    if (r() < 0.5) lantern(x * 0.955 + (r() - 0.5), 0, z * 0.955); else candle(x * 0.96, 0, z * 0.96);
  }

  /* the band's platform, set into the far terraces: two steps up, a durrie, crystals, ferns and rock round it */
  const st = new THREE.Group(); root.add(st);
  const W = S.x1 - S.x0, zB = S.z + S.depth;
  box(S.x0, 0, S.z, S.x1, S.h, zB);
  [0.3, 0.6].forEach((h, i) => { const z0 = S.z - 0.8 + i * 0.4; box(S.x0, 0, z0, S.x1, h, z0 + 0.4, [1, 1, 0, 1, 1]); edge([S.x0, z0], [S.x1, z0], h, [0, 0, 1], 0.025); });
  edge([S.x0, S.z], [S.x1, S.z], S.h, [0, 0, 1]);
  const durrie = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, 2.6), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 96, (g, w, h) => { g.fillStyle = '#2a1650'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c99a4a'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12); for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#7a2a6a' : '#1e5a6a'; g.fillRect(18 + i * 19, 24, 12, 48); } }), roughness: 1 }));
  durrie.rotation.x = -Math.PI / 2; durrie.position.set(0, S.h + 0.006, S.z + 1.9); st.add(durrie);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.z + 0.9, floor: S.h, small: true });
  [-1, 1].forEach((sd) => {
    columns(sd * (S.x1 + 0.9), 0, S.z + 1.2, 4, 0.4, 1.4, 2.8); crystal(sd * (S.x1 + 0.9), 2.7, S.z + 1.2, 1.9, 0.32, 0, r() * TAU);
    cluster(sd * (S.x1 + 0.4), 0, S.z - 0.3, 1.8, 3); bed(sd * (S.x1 + 0.9), 0, S.z - 0.6, true);
    fern(sd * (S.x1 + 1.6), 0, S.z + 2.6, 4.2, Math.round(9 * dense));
    columns(sd * (S.x1 - 0.6), S.h, zB - 0.6, 3, 0.36, 1.2, 2.4); cluster(sd * (S.x1 - 1.3), S.h, zB - 0.7, 1.6, 2);
    lantern(sd * (S.x1 - 0.3), S.h, S.z + 0.25); lantern(sd * (S.x1 - 0.3), 0.6, S.z - 0.35);
  });
  cluster(0, S.h, zB - 0.5, 1.2, 3); bed(-1.2, S.h, zB - 0.4, false); bed(1.2, S.h, zB - 0.4, false);
  kit.pools.add(0, 0.02, S.z - 2.6, W * 0.55, 3.6, '#ffffff', 0.1, { theme: true, layer: 'show' });

  /* the gate at the head of the left stair: monoliths, a lintel, glyphs and banners of light */
  const banners = [], glyphs = [];
  { const j = 11, s = side(j), a = P0.top - 1.1, y = stepTop(P0.tiers - 1), ry = Math.atan2(-s.n[0], -s.n[1]);
    [-1, 1].forEach((sd, i) => {
      const p = onSide(j, a, sd * 3.1); piece(new THREE.BoxGeometry(1.7, 9.5, 1.2), M(p[0], y + 4.75, p[1], ry));
      const gl = faceTo(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6.4), kit.litMap(glyphTexture(21 + i), 1.1, 'architectural', { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), ry); gl.position.set(p[0] - s.n[0] * 0.62, y + 4.6, p[1] - s.n[1] * 0.62); root.add(gl); glyphs.push(gl);
      crystal(p[0], y + 9.5, p[1], 1.8, 0.32, 0, 0); src(p[0] - s.n[0] * 1.4, y + 1.5, p[1] - s.n[1] * 1.4, EMBER, 0.45, 3.5);
      const c = onSide(j, a - 1.2, sd * 4.2); cluster(c[0], y, c[1], 2.2, 3); bed(c[0], y, c[1], true);
    });
    const l = onSide(j, a, 0); piece(new THREE.BoxGeometry(8, 1.1, 1.3), M(l[0], y + 9.9, l[1], ry));
    [[0, 6.4, 3.2, 1.9], [-4.8, 7.6, 1.6, 2.6], [4.8, 7.6, 1.6, 2.6]].forEach(([t, h, w, hh], i) => {
      const p = onSide(j, a - 0.9 - (i ? 0.8 : 0), t), b = faceTo(new THREE.Mesh(new THREE.PlaneGeometry(w, hh), kit.litMap(bannerTexture(31 + i), 1.1, 'show', { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), ry);
      b.position.set(p[0], y + h, p[1]); b.userData.dynamic = true; root.add(b); banners.push({ m: b, y: y + h, ph: i * 1.7 });
    });
  }

  /* a lounge on the left diagonal, a glass-fronted pod on the right, both looking over the floor */
  const sofa = (x, y, z, rad, arc, facing, mat) => {
    [[rad, 0.32, 0.75, 0.3], [rad + 0.3, 0.2, 2.2, 0.55]].forEach(([rr, tube, sy, dy]) => { const g2 = new THREE.TorusGeometry(rr, tube, 8, 24, arc); g2.rotateX(Math.PI / 2); g2.rotateY(arc / 2 - facing - Math.PI); g2.scale(1, sy, 1); const m = new THREE.Mesh(g2, mat); m.position.set(x, y + dy, z); root.add(m); });
  };
  const table = (x, y, z) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.42, 20), std('#b88a3e', 0.32, 0.8)); t.position.set(x, y + 0.21, z); root.add(t); crystal(x, y + 0.42, z, 0.45, 0.09, 0, 0.4); };
  { const j = 10, s = side(j), a = front(P0.lowTiers) + 1.5, y = stepTop(P0.lowTiers - 1), c = onSide(j, a, 0), facing = Math.atan2(-s.n[1], -s.n[0]);
    sofa(c[0], y, c[1], 1.7, Math.PI * 1.3, facing, std('#8a6ad0', 0.34, 0.2)); table(c[0], y, c[1]); src(c[0], y + 1, c[1], '#ffb46a', 0.5, 4);
    const lp = onSide(j, a - 1.9, 2.2); lantern(lp[0], y, lp[1]); }
  { const j = 6, s = side(j), a = front(P0.lowTiers) + 1.7, y = stepTop(P0.lowTiers - 1), c = onSide(j, a, 0), facing = Math.atan2(-s.n[1], -s.n[0]), R = 3.2, open = 1.25;
    const shell = new THREE.SphereGeometry(R, 18, 10, 0, TAU - open * 2, 0, Math.PI / 2); shell.rotateY(Math.PI + open - facing); shell.scale(1, 1.15, 1); piece(shell, M(c[0], y, c[1]));
    const inner = new THREE.SphereGeometry(R - 0.25, 18, 10, 0, TAU - open * 2, 0, Math.PI / 2); inner.rotateY(Math.PI + open - facing); inner.scale(1, 1.15, 1);
    const im = new THREE.Mesh(inner, kit.litMap(canvasTexture(16, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1830'); gr.addColorStop(0.5, '#8a5a52'); gr.addColorStop(1, '#ffcf9a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), 0.75, 'practical', { side: THREE.BackSide })); im.position.set(c[0], y, c[1]); root.add(im);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(R - 0.2, 24), std('#d7c9bb', 0.3, 0.05)); fl.rotation.x = -Math.PI / 2; fl.position.set(c[0], y + 0.02, c[1]); root.add(fl);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.1, R - 0.1, 3.2, 20, 1, true, Math.PI / 2 - open - facing, open * 2), new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.04, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    gl.material.userData.env = 1.2; gl.position.set(c[0], y + 1.6, c[1]); root.add(gl);
    const bk = onSide(j, a + 0.9, 0); sofa(bk[0], y, bk[1], 1.6, Math.PI * 0.9, facing, std('#a184e0', 0.3, 0.3)); table(c[0] - s.n[0] * 0.3, y, c[1] - s.n[1] * 0.3);
    for (let k = 0; k < 7; k++) { const a2 = k / 7 * TAU; kit.bigBulbs.add(c[0] + Math.cos(a2) * 0.35, y + 2.9, c[1] + Math.sin(a2) * 0.35, 0, { color: '#ffe2b0', k: 0.9, s: 0.38, twinkle: 0.05, layer: 'practical' }); }
    src(c[0], y + 2, c[1], '#ffc890', 0.8, 5); }

  /* far off: spires on the lower ground beyond the low diagonals and behind the band */
  [[-1, 46, 30], [1, 44, 28], [-1, 60, 42], [1, 58, 40], [-1, 74, 52], [1, 70, 46]].forEach(([sd, d, h], i) => spire(sd * d * 0.62, -8, d * 0.79 + i * 2, h, 4 + i * 0.4));
  for (let a = 0.7; a < Math.PI - 0.7; a += 0.16) if (Math.abs(a - Math.PI / 2) > 0.18) { const rr = 36 + r() * 3; boulder(Math.cos(a) * rr, -0.4, Math.sin(a) * rr, 1.4 + r() * 1.6, 0.9); }

  /* cushions under the people the 2D scene seats on the steps */
  const seatList = ((data && data.seats) || []).filter((se) => se.kind === 'terrace'), cushionCols = ['#1f6f78', '#a0175a', '#e09a2a', '#5b2a86', '#7a1830', '#2e8a6a'];
  if (seatList.length) {
    const cm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), std('#ffffff', 0.85), seatList.length), mx = new THREE.Matrix4(), cc = new THREE.Color();
    seatList.forEach((se, i) => { mx.compose(new THREE.Vector3(se.x, se.y + 0.05, se.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(se.x, se.z), 0)), new THREE.Vector3(0.3, 0.085, 0.24)); cm.setMatrixAt(i, mx); cm.setColorAt(i, cc.set(cushionCols[i % cushionCols.length])); });
    root.add(cm);
  }

  /* the instanced and merged parts */
  const crystalGeo = new THREE.LatheGeometry([[0.001, 0], [1, 0], [1, 0.25], [1, 0.5], [0.97, 0.74], [0, 1]].map(([a, b]) => new THREE.Vector2(a, b)), 6);
  const place = (im, list, k = 1) => { const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); list.forEach((c, i) => { e.set(Math.sin(c.ry) * c.lean, c.ry, Math.cos(c.ry) * c.lean); q.setFromEuler(e); im.setMatrixAt(i, mx.compose(new THREE.Vector3(c.x, c.y - 0.05, c.z), q, new THREE.Vector3(c.r * k, c.h * (k > 1 ? 1.02 : 1), c.r * k))); }); };
  const inst = (list, map, albedo, k, layer) => {
    if (!list.length) return;
    const m = new THREE.MeshStandardMaterial({ color: albedo, roughness: 0.16, metalness: 0.08, flatShading: true, emissive: '#ffffff', emissiveMap: map });
    m.userData.env = 0.9; kit.selfLit(m, k, layer);
    const im = new THREE.InstancedMesh(crystalGeo, m, list.length); place(im, list); root.add(im);
    // a glassy skin over each, catching the sky and the lamps
    const sk = new THREE.MeshStandardMaterial({ color: '#ffe0b0', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.2, flatShading: true, depthWrite: false }); sk.userData.env = 1.4;
    const ims = new THREE.InstancedMesh(crystalGeo, sk, list.length); place(ims, list, 1.1); root.add(ims);
  };
  inst(crystals, crystalTexture('#ffc56a', '#e8761e', '#8a3a10', 3), '#3a1e08', 0.85, 'practical');
  inst(violets, crystalTexture('#f0d8ff', '#b07cff', '#4a2a90', 9), '#2a1a46', 0.9, 'architectural');
  if (lanterns.length) {
    const body = merged([[new THREE.BoxGeometry(0.24, 0.04, 0.24), new THREE.Matrix4().makeTranslation(0, 0.02, 0)], [new THREE.ConeGeometry(0.2, 0.14, 4, 1), new THREE.Matrix4().compose(new THREE.Vector3(0, 0.37, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), new THREE.Vector3(1, 1, 1))], [new THREE.SphereGeometry(0.035, 6, 4), new THREE.Matrix4().makeTranslation(0, 0.47, 0)]]
      .concat([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [new THREE.BoxGeometry(0.02, 0.27, 0.02), new THREE.Matrix4().makeTranslation(a * 0.09, 0.17, b * 0.09)])));
    const bm = new THREE.InstancedMesh(body, std('#b48a42', 0.36, 0.85), lanterns.length), gm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.25, 0.16), kit.glow('#ffc47a', 1.15, 'flame'), lanterns.length), mx = new THREE.Matrix4();
    lanterns.forEach(([x, y, z], i) => { bm.setMatrixAt(i, mx.makeTranslation(x, y, z)); gm.setMatrixAt(i, mx.makeTranslation(x, y + 0.165, z)); });
    root.add(bm); root.add(gm);
  }
  root.add(new THREE.Mesh(fronds.geometry(), kit.litMap(frondTexture(), 1.35, 'architectural', { alphaTest: 0.32, side: THREE.DoubleSide, color: new THREE.Color(SILVER).multiplyScalar(1.35) })));
  root.add(new THREE.Mesh(leaves.geometry(), kit.litMap(leafTexture(), 1.0, 'architectural', { alphaTest: 0.4, side: THREE.DoubleSide })));
  root.add(new THREE.Mesh(strips.geometry(), kit.glow('#ffb04a', 1.8, 'architectural')));
  // All the stone is one mesh, with the light of everything glowing round it baked in
  rocks.unshift(shape.geometry());
  const stone = merged(rocks.map((g2) => [g2, null]));
  glowInto(stone, sources);
  const stoneMesh = new THREE.Mesh(stone, rockMaterial(basalt(phone ? 256 : 512), glow)); stoneMesh.castShadow = !phone; stoneMesh.receiveShadow = !!tier.shadows; root.add(stoneMesh);

  const rig = {
    hemi: ['#6c5aa8', '#2a1406', 0.42, 0.66], moon: 1,
    // planet-light from high over the far side (it throws the shadows), and a warm wash on the band
    spots: [{ pos: [14, 26, 40], to: [0, 0, 4], color: '#cfc8ff', base: 38, distance: 90, angle: 0.55, layer: 'key' }, { pos: [0, 7.5, S.z - 6], to: [0, S.h + 1.2, S.z + 2], color: '#ffe0c0', base: 90, distance: 20, angle: 0.55, layer: 'show' }],
    // the crystals' light on the floor and the stone round it
    points: [{ pos: [-17, 2.4, 8], color: '#ffa44a', base: 36, distance: 15, layer: 'practical' }, { pos: [17, 2.4, 8], color: '#ffa44a', base: 36, distance: 15, layer: 'practical' }, { pos: [0, 3, S.z + 1], color: '#ffb260', base: 30, distance: 12, layer: 'practical' }, { pos: [0, 2.4, -20.5], color: '#ffa44a', base: 26, distance: 14, layer: 'practical' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#221a36', 0.0052), exposure: 0.98, envScene: envScene(),
    update(t, ctx) {
      glow.value = 0.5 * ctx.lv.practical;
      banners.forEach((b, i) => { b.m.position.y = b.y + (ctx.reduce ? 0 : 0.12 * Math.sin(t * 0.8 + b.ph)); b.m.material.color.setScalar((0.85 + 0.15 * Math.sin(t * 3.1 + i * 2)) * ctx.lv.show * 1.1); });
    }
  };
}

export default { seed: 404, sky, bareGarbo: true, build: pandora };
