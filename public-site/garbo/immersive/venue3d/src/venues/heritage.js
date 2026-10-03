// Carved stone that more than one venue uses (Vrindavan's courtyard, Deep-Jyot Chowk): sandstone in courses of blocks,
// an arcade of cusped arches on carved pillars under a chhajja and a parapet, a nagara temple's curving spire
// (shikhara) with its smaller spires, amalaka and kalash, torches on iron stands and fire in brass bowls on tripods.
// Each builder adds its stone to a list the venue merges into one mesh.

import * as THREE from 'three';
import { TAU, lerp, seeded, canvasTexture } from '../util.js';
import { std } from '../kit.js';

/* ---------- sandstone ---------- */
// Ashlar in courses, each block a shade apart, a fine grain, darker where rain has run down; tint: [light, dark]
export function sandstoneTexture(tint = ['#d2a26a', '#a8743e'], seed = 3, carved = false) {
  const r = seeded(seed);
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = tint[1]; g.fillRect(0, 0, w, h);
    const rows = 6, bh = h / rows;
    for (let row = 0; row < rows; row++) {
      const n = 2 + (row % 2), bw = w / n, off = (row % 2) * bw / 2;
      for (let k = -1; k <= n; k++) {
        const x = k * bw + off, c0 = new THREE.Color(tint[0]).lerp(new THREE.Color(tint[1]), r() * 0.55);
        g.fillStyle = '#' + c0.getHexString(); g.fillRect(x + 1.5, row * bh + 1.5, bw - 3, bh - 3);
      }
    }
    for (let i = 0; i < 5000; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,236,200,${0.05 + r() * 0.08})` : `rgba(60,30,10,${0.05 + r() * 0.09})`; g.fillRect(r() * w, r() * h, 1.2, 1.2); }
    for (let i = 0; i < 14; i++) { const x = r() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(60,32,14,.18)'); gr.addColorStop(1, 'rgba(60,32,14,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + r() * 6, h * (0.3 + r() * 0.7)); }
    if (carved) {
      // a carved band of lotus scrolls along each course's top
      g.strokeStyle = 'rgba(70,36,14,.55)'; g.lineWidth = 2;
      for (let row = 0; row < rows; row += 2) { const y = row * bh + 6; for (let x = 6; x < w; x += 22) { g.beginPath(); g.arc(x + 8, y + 6, 6, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(x + 8, y + 6, 2.5, 0, TAU); g.stroke(); } }
    }
  }, { repeat: [1, 1] });
}
export function sandstoneMat(tint, seed, carved, rough = 0.86) {
  const t = sandstoneTexture(tint, seed, carved); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: t, roughness: rough, metalness: 0.02 });
}
// Box UVs in metres, so the stone's courses keep their size however big the block (s: metres per repeat)
export function metreUV(geo, s = 2.4) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay > ax && ay > az ? [p.getX(i), p.getZ(i)] : ax > az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / s; uv[i * 2 + 1] = v / s;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/* ---------- arches and pillars ---------- */
// A cusped (multifoil) arch's opening: a pointed arch whose edge swells into lobes, w wide, springing at hs, rising rise
function cuspedOpening(w, hs, rise, lobes = 7) {
  const pts = [], n = 64;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * (1 - t), bx = Math.cos(a) * w / 2, by = hs + Math.sin(a) * rise;
    // pull the edge in between lobes, toward the arch's middle
    const lobe = Math.pow(Math.abs(Math.sin(t * Math.PI * lobes)), 0.6) * 0.07 * w, d = Math.hypot(bx, by - hs) || 1;
    pts.push(new THREE.Vector2(bx - bx / d * lobe, by - (by - hs) / d * lobe));
  }
  return pts;
}
// One bay's arch screen: a slab pw wide and ph tall with the cusped opening cut through it, d deep
export function archPanel(pw, ph, w, hs, rise, d = 0.45, lobes = 7) {
  const sh = new THREE.Shape(); sh.moveTo(-pw / 2, 0); sh.lineTo(pw / 2, 0); sh.lineTo(pw / 2, ph); sh.lineTo(-pw / 2, ph); sh.closePath();
  const hole = new THREE.Path(), op = cuspedOpening(w, hs, rise, lobes);
  hole.moveTo(w / 2, 0); hole.lineTo(w / 2, hs); op.slice().reverse().forEach((p) => hole.lineTo(p.x, p.y)); hole.lineTo(-w / 2, 0); hole.closePath();
  sh.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 4 }); geo.translate(0, 0, -d / 2);
  return metreUV(geo, 2.4);
}
// A carved pillar: a square base, a shaft of sixteen flutes, a bell capital and a bracket
export function pillarGeo(h, r = 0.22) {
  const prof = [[0, 0], [r * 1.5, 0], [r * 1.5, h * 0.08], [r * 1.25, h * 0.1], [r * 1.05, h * 0.13], [r, h * 0.16], [r * 0.92, h * 0.78], [r * 1.12, h * 0.8], [r * 1.35, h * 0.86], [r * 1.05, h * 0.9], [r * 1.5, h * 0.94], [r * 1.5, h], [0, h]];
  const geo = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 16), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > h * 0.17 && y < h * 0.77) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 - 0.06 * Math.pow(Math.abs(Math.cos(a * 8)), 3); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } }
  return metreUV(geo, 2.4);
}
// An arcade from p0 to p1 (x, z) with n bays: pillars, arch screens, the chhajja (a thin sloping eave) and a parapet,
// a back wall (back: metres behind, or 0 for none) and a floor raised plinth. Pushes geometry into `stone`; returns the
// bays' middles (x, z, ry) for lamps and the outward normal.
export function arcade(stone, p0, p1, n, o = {}) {
  const H = o.h || 4.2, hs = o.spring || 2.4, rise = o.rise || 1.2, d = o.depth || 0.45, back = o.back == null ? 3 : o.back, plinth = o.plinth || 0.35;
  const dx = p1[0] - p0[0], dz = p1[1] - p0[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, nx = -uz, nz = ux, ry = Math.atan2(ux, uz) - Math.PI / 2;
  const bw = len / n, M = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  const add = (geo, m) => { const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(m); g.deleteAttribute('color'); stone.push(g); };
  const bays = [];
  // the raised floor of the arcade
  add(metreUV(new THREE.BoxGeometry(len + 0.6, plinth, back + d + 0.6), 2.4), M(p0[0] + dx / 2 + nx * (back / 2), plinth / 2, p0[1] + dz / 2 + nz * (back / 2)));
  for (let i = 0; i < n; i++) {
    const cx = p0[0] + ux * bw * (i + 0.5), cz = p0[1] + uz * bw * (i + 0.5);
    add(archPanel(bw, H - plinth, bw - 0.5, hs, rise, d, o.lobes || 7), M(cx, plinth, cz));
    bays.push({ x: cx, z: cz, ry, nx, nz });
  }
  const pg = pillarGeo(hs - 0.05, o.pillar || 0.2);
  for (let i = 0; i <= n; i++) { const px = p0[0] + ux * bw * i, pz = p0[1] + uz * bw * i; add(pg.clone(), M(px - nx * (d / 2 + 0.24), plinth, pz - nz * (d / 2 + 0.24))); }
  // chhajja and parapet
  add(metreUV(new THREE.BoxGeometry(len + 0.4, 0.16, d + 1.0), 2.4), M(p0[0] + dx / 2 - nx * 0.4, H + 0.05, p0[1] + dz / 2 - nz * 0.4));
  add(metreUV(new THREE.BoxGeometry(len + 0.4, 0.7, d), 2.4), M(p0[0] + dx / 2, H + 0.5, p0[1] + dz / 2));
  for (let i = 0; i < Math.round(len / 0.9); i++) { const t = (i + 0.5) / Math.round(len / 0.9); add(new THREE.ConeGeometry(0.16, 0.36, 4), M(p0[0] + dx * t, H + 1.03, p0[1] + dz * t)); }
  if (back) {
    add(metreUV(new THREE.BoxGeometry(len + 0.6, H + 0.9, 0.4), 2.4), M(p0[0] + dx / 2 + nx * (back + d / 2), (H + 0.9) / 2, p0[1] + dz / 2 + nz * (back + d / 2)));
    add(metreUV(new THREE.BoxGeometry(len + 0.6, 0.25, back + 0.2), 2.4), M(p0[0] + dx / 2 + nx * (back / 2 + d / 2), H - 0.1, p0[1] + dz / 2 + nz * (back / 2 + d / 2)));
  }
  return { bays, n: [nx, nz], u: [ux, uz], ry };
}

/* ---------- the temple's spire ---------- */
// A nagara shikhara: a curving tower on a cross-shaped plan, banded in storeys (bhumis), an amalaka and a kalash on
// top; smaller spires (urushringas) clustered round it lower down; on a stepped plinth (jagati) with a porch (mandapa)
// in front, its own lower roof stepped up. at: [x, z], facing ry (towards the dance floor); s scales all of it.
// Pushes stone into `stone`; returns the points to light it from and a door's place.
export function shikhara(stone, at, ry, s = 1, o = {}) {
  const Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), base = new THREE.Vector3(at[0], 0, at[1]);
  const place = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => { const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z).applyQuaternion(Q).add(base), Q, new THREE.Vector3(sx, sy, sz))); g.deleteAttribute('color'); stone.push(g); };
  const tower = (R, H, storeys) => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 48, storeys * 4, false); geo.translate(0, 0.5, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i)), band = (v * storeys) % 1;
      const curve = Math.pow(1 - Math.pow(v, 1.5), 0.85) * 0.92 + 0.08, plan = 1 + 0.16 * Math.pow(Math.abs(Math.cos(2 * a)), 4) - 0.06 * Math.pow(Math.abs(Math.sin(4 * a)), 2), ledge = band < 0.18 ? 1.05 : 1;
      p.setXYZ(i, p.getX(i) * R * curve * plan * ledge, v * H, p.getZ(i) * R * curve * plan * ledge);
    }
    return metreUV(geo, 2.4);
  };
  const amalaka = (R) => { const g = new THREE.SphereGeometry(R, 24, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 - 0.1 * Math.pow(Math.abs(Math.sin(a * 12)), 2); p.setXYZ(i, p.getX(i) * k, p.getY(i) * 0.45, p.getZ(i) * k); } return metreUV(g, 1); };
  const kalash = (h) => new THREE.LatheGeometry([[0, 0], [h * 0.22, h * 0.05], [h * 0.3, h * 0.3], [h * 0.18, h * 0.55], [h * 0.12, h * 0.62], [h * 0.16, h * 0.7], [h * 0.04, h * 0.9], [0, h]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
  const R = 3.4 * s, H = 13 * s, J = 1.6 * s;
  // the jagati: three steps up
  [[11, 0.5], [9.6, 1.0], [8.4, J]].forEach(([w, y], k) => place(metreUV(new THREE.BoxGeometry(w * s, y, w * s * 1.35), 2.4), 0, y / 2, -k * 0.2 * s));
  // the sanctum's walls and the main spire on them
  place(metreUV(new THREE.BoxGeometry(6.4 * s, 3.6 * s, 6.4 * s), 2.4), 0, J + 1.8 * s, -1.2 * s);
  place(tower(R, H, 9), 0, J + 3.6 * s, -1.2 * s);
  place(amalaka(1.15 * s), 0, J + 3.6 * s + H * 0.985, -1.2 * s);
  place(kalash(1.6 * s), 0, J + 3.6 * s + H * 1.02, -1.2 * s);
  // the urushringas: half-height spires against its faces, and quarter-height ones at its corners
  [[0, 2.6], [2.6, 0], [-2.6, 0]].forEach(([x, z]) => { place(tower(R * 0.55, H * 0.55, 5), x * s, J + 3.6 * s, -1.2 * s + z * s); place(amalaka(0.62 * s), x * s, J + 3.6 * s + H * 0.55 * 0.985, -1.2 * s + z * s); });
  [[2.6, 2.6], [-2.6, 2.6], [2.6, -2.6], [-2.6, -2.6]].forEach(([x, z]) => { place(tower(R * 0.36, H * 0.32, 3), x * s, J + 3.6 * s, -1.2 * s + z * s); place(amalaka(0.4 * s), x * s, J + 3.6 * s + H * 0.32 * 0.985, -1.2 * s + z * s); });
  // the mandapa in front: pillars, a lintel and a stepped pyramid of a roof
  const pg = pillarGeo(3.2 * s, 0.22 * s);
  [-2.2, -0.75, 0.75, 2.2].forEach((x) => [3.2, 5.6].forEach((z) => place(pg.clone(), x * s, J, z * s)));
  place(metreUV(new THREE.BoxGeometry(5.6 * s, 0.5 * s, 3.6 * s), 2.4), 0, J + 3.45 * s, 4.4 * s);
  for (let k = 0; k < 5; k++) place(metreUV(new THREE.BoxGeometry((5 - k * 0.85) * s, 0.45 * s, (3.2 - k * 0.5) * s), 2.4), 0, J + (3.95 + k * 0.45) * s, 4.4 * s);
  place(kalash(0.9 * s), 0, J + 6.2 * s, 4.4 * s);
  // the steps up the jagati's front
  for (let k = 0; k < 6; k++) place(metreUV(new THREE.BoxGeometry(3 * s, J / 6 * (k + 1), 0.45 * s), 2.4), 0, J / 12 * (k + 1), (7.45 - k * 0.42) * s);
  const w = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(Q).add(base);
  return { door: w(0, J, 2.0 * s), top: w(0, J + 3.6 * s + H * 1.05, -1.2 * s), faces: [w(0, J + 6 * s, 4.6 * s), w(3.6 * s, J + 6 * s, -1.2 * s), w(-3.6 * s, J + 6 * s, -1.2 * s)], front: w(0, 0, 8 * s), J };
}

/* ---------- fire ---------- */
// A torch (mashaal) on an iron stand: a pole, a cup of rags, a tall flame
export function torch(kit, root, iron, x, z, h = 1.9, y = 0) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, h, 6), iron); pole.position.set(x, y + h / 2, z); root.add(pole);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.22, 8), std('#2a1a10', 0.9)); cup.position.set(x, y + h + 0.08, z); root.add(cup);
  kit.flames.add(x, y + h + 0.2, z, { bowl: null, s: 0.13, k: 1.15 });
}
// Fire in a brass bowl on a tripod (the gate's agni-patra)
export function fireBowl(kit, root, x, z, h = 1.1) {
  const brass = std('#c9953a', 0.35, 0.85);
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, h * 1.05, 6), brass); leg.position.set(x + Math.cos(a) * 0.16, h / 2, z + Math.sin(a) * 0.16); leg.rotation.set(Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16); root.add(leg); }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2), brass); bowl.position.set(x, h + 0.28, z); root.add(bowl);
  kit.flames.add(x, h + 0.3, z, { bowl: null, s: 0.2, k: 1.3 });
}
// Diyas in a row from a to b (x, y, z), spaced about `gap`
export function diyaRow(kit, a, b, gap = 0.45, s = 0.045) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / gap));
  for (let i = 0; i <= n; i++) { const t = i / n; kit.flames.add(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), { s, k: 0.8 }); }
}

/* ---------- the night over an old courtyard: a deep blue sky, warm at the horizon, and the Milky Way ---------- */
export function nightSky(tier) {
  const root = new THREE.Group(), phone = tier.name === 'phone';
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { c0: { value: new THREE.Color('#1a120c') }, c1: { value: new THREE.Color('#4a3424') }, c2: { value: new THREE.Color('#14203e') }, c3: { value: new THREE.Color('#03050f') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h < 0.0 ? c0 : h < 0.08 ? mix(c1, c2, h / 0.08) : mix(c2, c3, clamp((h - 0.08) / 0.6, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }'
  }));
  dome.renderOrder = -10; root.add(dome);
  // stars, thick along a band of the Milky Way over the temple
  const r = seeded(47), n = phone ? 1000 : 2000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const band = i < n * 0.45; let a = r() * TAU, el = Math.asin(0.12 + Math.pow(r(), 0.7) * 0.88);
    if (band) { const t = r(); a = lerp(-0.4, 2.4, t) + (r() - 0.5) * 0.25; el = Math.asin(Math.min(0.98, 0.15 + Math.sin(t * Math.PI) * 0.8 + (r() - 0.5) * 0.12)); }
    const R = 800, k = (0.3 + r() * 0.7) * (band ? 0.8 : 1);
    pos[i * 3] = Math.sin(a) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = Math.cos(a) * Math.cos(el) * R;
    col[i * 3] = k; col[i * 3 + 1] = k * 0.95; col[i * 3 + 2] = k * (band ? 0.9 : 1);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  root.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true })));
  return { root, moonLight: { dir: new THREE.Vector3(-0.3, 0.8, 0.5).normalize(), intensity: 0.25 }, info: null };
}

// Merge stone pieces (position, normal, uv) into one geometry
export function mergeAll(list) {
  let count = 0; list.forEach((g) => (count += g.attributes.position.count));
  const out = new THREE.BufferGeometry();
  ['position', 'normal', 'uv'].forEach((name) => {
    const size = name === 'uv' ? 2 : 3, arr = new Float32Array(count * size); let o = 0;
    list.forEach((g) => { const a = g.attributes[name]; if (a) arr.set(a.array, o); o += g.attributes.position.count * size; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  });
  list.forEach((g) => g.dispose());
  return out;
}

/* ---------- a gate ----------
   A carved portal at z (its inside towards +z) between piers hw from the middle, H tall: a lintel, an arched opening,
   studded doors of dark wood standing open, fire in brass bowls on tripods either side; with marigolds, strings of them
   hung close across the opening's head and down its sides. Stone goes through add(geo, matrix); returns the fires. */
export function portal(kit, root, add, M, z, hw, H, o = {}) {
  const w = hw * 2;
  [-1, 1].forEach((sd) => { add(metreUV(new THREE.BoxGeometry(1.4, H, 1.6), 2.4), M(sd * (hw - 0.7), H / 2, z)); add(metreUV(new THREE.BoxGeometry(1.7, 0.5, 1.9), 2.4), M(sd * (hw - 0.7), H + 0.25, z)); });
  add(metreUV(new THREE.BoxGeometry(w + 0.4, 1.6, 1.6), 2.4), M(0, H - 0.8, z));
  const ow = w - 3.2, hs = Math.min(3.6, H - 1.6 - ow / 2 - 0.3), sh = new THREE.Shape();
  sh.moveTo(-hw + 1.4, 0); sh.lineTo(hw - 1.4, 0); sh.lineTo(hw - 1.4, H - 1.6); sh.lineTo(-hw + 1.4, H - 1.6); sh.closePath();
  const hole = new THREE.Path(); hole.moveTo(ow / 2, 0); hole.lineTo(ow / 2, hs); hole.absarc(0, hs, ow / 2, 0, Math.PI, false); hole.lineTo(-ow / 2, 0); hole.closePath(); sh.holes.push(hole);
  const tymp = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 12 }); tymp.translate(0, 0, -0.3); add(metreUV(tymp, 2.4), M(0, 0, z));
  const door = new THREE.MeshStandardMaterial({ map: canvasTexture(128, 256, (g, ww, hh) => { g.fillStyle = '#3a2210'; g.fillRect(0, 0, ww, hh); g.strokeStyle = '#1a0e06'; g.lineWidth = 4; for (let y = 16; y < hh; y += 48) g.strokeRect(10, y, ww - 20, 38); g.fillStyle = '#c9953a'; for (let y = 10; y < hh; y += 16) for (let x = 12; x < ww; x += 20) { g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); } }), roughness: 0.6, metalness: 0.2 });
  [-1, 1].forEach((sd) => { const d = new THREE.Mesh(new THREE.BoxGeometry(ow / 2, hs + 0.6, 0.14), door); d.geometry.translate(-sd * ow / 4, 0, 0); d.position.set(sd * ow / 2, (hs + 0.6) / 2, z + 0.4); d.rotation.y = sd * 1.25; root.add(d); });
  const fires = [];
  [-1, 1].forEach((sd) => { fireBowl(kit, root, sd * (hw + 0.9), z + 1.3); fires.push([sd * (hw + 0.9), 1.6, z + 1.3]); });
  kit.pools.add(0, 0.02, z + 2, 5, 3, '#ff9a4a', 0.12, { layer: 'flame' });
  if (o.marigolds) {
    // strings of marigolds, orange and yellow, close across the head of the opening and down both sides
    const pts = [], top = hs + ow / 2 - 0.1;
    for (let x = -ow / 2 + 0.1; x <= ow / 2 - 0.1; x += 0.16) { const L = 0.6 + 0.5 * Math.pow(Math.abs(x) / (ow / 2), 2) + (Math.round(x * 10) % 3) * 0.12; for (let d = 0; d < L; d += 0.085) pts.push([x, top - d * (1 + Math.abs(x) / ow), z - 0.1]); }
    [-1, 1].forEach((sd) => { for (let k = 0; k < 4; k++) { const x = sd * (ow / 2 + 0.05 + k * 0.14); for (let y = 0.3; y < top; y += 0.085) pts.push([x, y, z - 0.35]); } });
    // (they hold a little of the fires' glow in their own colours, so they read against the night beyond the gate)
    const fmM = kit.selfLit(std('#ffffff', 0.85), 0.32, 'flame');
    fmM.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;'); };
    fmM.customProgramCacheKey = () => 'marigolds';
    const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), fmM, pts.length), mx = new THREE.Matrix4(), c = new THREE.Color();
    pts.forEach(([x, y, zz], i) => { fm.setMatrixAt(i, mx.makeTranslation(x, y, zz)); fm.setColorAt(i, c.set(i % 5 === 2 ? '#ffd24a' : i % 9 === 4 ? '#fff4e0' : '#f08a1a')); }); root.add(fm);
  }
  return fires;
}
