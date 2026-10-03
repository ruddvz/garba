// The things people use, built in 3D where the 2D scene used to paint them: the food stalls and the society's pani
// puri cart, the DJ's booth with its whole rig, chairs and benches, the stadium's steps, parked scooters, bikes and the
// van, tulsi planters with their diyas, and the tents beyond the kanat. The people at them stay in the 2D scene.
//
// The 2D scene hands over its own layout objects (where each stall, chair and scooter is), so both renderers agree on
// every position. Each piece leaves its outline on its layout object as hole3d (see solidOf in util.js):
//   back   everything solid about it: cut out of whatever the 2D scene drew behind it, before the person at it is drawn
//   front  the parts between you and that person (a counter, the DJ's table, a chair's back): cut again after them
//   sides  side walls, cut only when they face you
//   vendor where the person at it stands, when that isn't where the 2D scene would put them

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, sag, face, LIGHT, solidOf, boxSolid, THEMES, glowTexture, hsl } from './util.js';
import { std, Beam } from './kit.js';
import { latticeMat } from './stage.js';

const GU_FONT = '"Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, "Anek Gujarati", system-ui, sans-serif';

/* ---------- small builders ---------- */
function box(parent, w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}
function cyl(parent, r0, r1, h, x, y, z, mat, seg = 10, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m;
}
function lathe(parent, prof, x, y, z, mat, seg = 16) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat); m.position.set(x, y, z); parent.add(m); return m;
}
// A plane facing -Z (towards you) in its group's frame, its picture reading the right way round
function panel(parent, w, h, x, y, z, mat) { const m = face(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)); m.position.set(x, y, z); parent.add(m); return m; }
// A textured surface (not shared through std's cache, which keys on its options)
const textured = (map, rough = 0.85, metal = 0, extra) => new THREE.MeshStandardMaterial(Object.assign({ map, roughness: rough, metalness: metal }, extra || {}));
// A group standing at (x, z), turned so its local -Z faces the direction the 2D scene's V vector points away from
function placed(root, x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); g.updateMatrixWorld(true); return g; }

// Marigold beads, bottle caps and the like: one instanced mesh for every small bead in a venue
class Beads {
  constructor() { this.list = []; }
  add(x, y, z, hex, r = 0.035) { this.list.push([x, y, z, hex, r]); }
  // local points in a group's frame, taken into the venue's
  addIn(grp, x, y, z, hex, r) { const v = new THREE.Vector3(x, y, z).applyMatrix4(grp.matrixWorld); this.add(v.x, v.y, v.z, hex, r); }
  build(parent) {
    if (!this.list.length) return;
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), std('#ffffff', 0.85), this.list.length), mx = new THREE.Matrix4(), c = new THREE.Color();
    this.list.forEach(([x, y, z, hex, r], i) => { m.setMatrixAt(i, mx.makeScale(r, r, r).setPosition(x, y, z)); m.setColorAt(i, c.set(hex)); });
    parent.add(m);
  }
}
const MARIGOLD = ['#f08a24', '#f08a24', '#f6c342'];

/* ---------- textures ---------- */
function counterTexture(hex) {
  return canvasTexture(512, 160, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    // Planks, with a little grain, then the brass trim and the scuffed kick strip
    for (let k = 0; k < 9; k++) { const x = k / 9 * w; g.fillStyle = `rgba(0,0,0,${0.05 + (k % 3) * 0.03})`; g.fillRect(x, 0, w / 9, h); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 2, h); }
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 160; i++) g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 14, 1);
    g.fillStyle = '#e8b04b'; g.fillRect(0, h * 0.1, w, h * 0.08);
    g.fillStyle = 'rgba(255,240,200,.5)'; g.fillRect(0, h * 0.1, w, 2);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * 0.86, w, h * 0.06);
  });
}
function valanceTexture(hex, n) {
  return canvasTexture(512, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const sw = w / n, band = h * 0.72;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? '#efe2c8' : hex; g.fillRect(i * sw, 0, sw + 1, band);
      g.fillStyle = i % 2 ? hex : '#efe2c8'; g.beginPath(); g.moveTo(i * sw, band); g.quadraticCurveTo((i + 0.5) * sw, h * 1.05, (i + 1) * sw, band); g.closePath(); g.fill();
      g.fillStyle = '#e8b04b'; g.beginPath(); g.arc((i + 0.5) * sw, h * 0.9, 4, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w, 5);
    g.fillStyle = '#e8b04b'; g.fillRect(0, band - 3, w, 3);
  });
}
function signTexture(sign, en, hex) {
  const t = canvasTexture(512, 176, () => {});
  const draw = () => {
    const c = t.image, g = c.getContext('2d'), w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#180c06'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 22); g.fill();
    g.strokeStyle = hex; g.lineWidth = 7; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd58a'; g.font = `700 78px ${GU_FONT}`; g.fillText(sign, w / 2, h * 0.42);
    g.fillStyle = 'rgba(255,230,190,.78)'; g.font = '600 34px system-ui, sans-serif'; g.fillText(en, w / 2, h * 0.8);
    t.needsUpdate = true;
  };
  draw();
  // The Gujarati face may still be loading: draw the sign again once it has
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  return t;
}
let bandhaniTex = null;
function bandhaniTexture() {
  if (bandhaniTex) return bandhaniTex;
  bandhaniTex = canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = '#8e1b2c'; g.fillRect(0, 0, w, h);
    // Tie-dye dots in white and yellow, in rows, leaving the middle clear for the sign
    for (let r = 0; r < 9; r++) for (let c = 0; c < 44; c++) {
      const x = (c + (r % 2) * 0.5 + 0.5) / 44.5 * w, y = h * (0.28 + r * 0.075);
      if (Math.abs(x / w - 0.5) < 0.19 && r > 1 && r < 8) continue;
      g.fillStyle = (r + c) % 3 ? 'rgba(255,246,230,.85)' : 'rgba(246,195,66,.9)'; g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
    }
    // Gold borders top and bottom, and the mirror-work triangles hanging from the top one
    g.fillStyle = '#e8b04b'; g.fillRect(0, 0, w, h * 0.16); g.fillRect(0, h * 0.9, w, h * 0.1);
    g.fillStyle = 'rgba(120,70,10,.5)'; for (let x = 0; x < w; x += 12) g.fillRect(x, h * 0.05, 6, h * 0.06);
    for (let k = 0; k < 16; k++) {
      const x0 = k / 16 * w, x1 = (k + 1) / 16 * w;
      g.fillStyle = k % 2 ? '#2f8f5b' : '#c2185b'; g.beginPath(); g.moveTo(x0, h * 0.16); g.lineTo(x1, h * 0.16); g.lineTo((x0 + x1) / 2, h * 0.34); g.closePath(); g.fill();
      g.fillStyle = 'rgba(235,245,255,.95)'; g.beginPath(); g.arc((x0 + x1) / 2, h * 0.22, 3.5, 0, TAU); g.fill();
    }
  });
  return bandhaniTex;
}
function djSignTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#140c0a'; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 18); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 84px system-ui, sans-serif';
    g.shadowColor = '#ff78be'; g.shadowBlur = 18; g.fillStyle = '#f6e8d2'; g.fillText('DJ', w / 2, h * 0.54);
  });
}
// The laptop's logo: a pineapple with a bite out of its side, as a certain fruit has. A crown of five leaves, the body
// with its criss-cross skin, and the bite cut clean out of the right, so the lid shows through it.
function pineappleLogo(s, fill, skin) {
  const c = document.createElement('canvas'); c.width = Math.ceil(s * 1.3); c.height = Math.ceil(s * 2.05);
  const g = c.getContext('2d'), cx = c.width / 2, cy = c.height - s * 0.6;
  g.fillStyle = fill;
  [[-0.62, 0.62], [-0.3, 0.86], [0, 1], [0.3, 0.86], [0.62, 0.62]].forEach(([a, l]) => {
    g.save(); g.translate(cx, cy - s * 0.5); g.rotate(a); g.beginPath(); g.moveTo(-s * 0.075, 0); g.quadraticCurveTo(-s * 0.06, -s * l * 0.5, 0, -s * l * 0.72); g.quadraticCurveTo(s * 0.06, -s * l * 0.5, s * 0.075, 0); g.closePath(); g.fill(); g.restore();
  });
  g.beginPath(); g.ellipse(cx, cy, s * 0.4, s * 0.55, 0, 0, TAU); g.fill();
  g.save(); g.clip(); g.strokeStyle = skin; g.lineWidth = Math.max(1, s * 0.04);
  for (let k = -5; k <= 5; k++) { const o = k * s * 0.19; g.beginPath(); g.moveTo(cx + o - s, cy - s); g.lineTo(cx + o + s, cy + s); g.moveTo(cx + o + s, cy - s); g.lineTo(cx + o - s, cy + s); g.stroke(); }
  g.restore();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx + s * 0.47, cy - s * 0.14, s * 0.25, 0, TAU); g.fill();
  return c;
}
function drawLogo(g, w, h, fill, skin) { const s = 46, logo = pineappleLogo(s, fill, skin); g.drawImage(logo, w * 0.5 - logo.width / 2, h * 0.5 - logo.height * 0.52); }
function lidTexture() {
  return canvasTexture(256, 168, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#c5c9cf'); gr.addColorStop(0.55, '#9da2a9'); gr.addColorStop(1, '#7d8289');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // The logo, lit through the lid
    drawLogo(g, w, h, '#fff8e8', 'rgba(150,120,60,.35)');
    // Stickers: ગરબા on a yellow tag, a green star
    g.save(); g.translate(w * 0.12, h * 0.16); g.rotate(-0.25); g.fillStyle = '#f6c342'; g.beginPath(); g.roundRect(0, 0, 64, 28, 6); g.fill(); g.fillStyle = '#8e1b2c'; g.font = `700 18px ${GU_FONT}`; g.textBaseline = 'middle'; g.fillText('ગરબા', 6, 15); g.restore();
    g.fillStyle = '#2f8f5b'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, r = k % 2 ? 7 : 15; g.lineTo(w * 0.8 + Math.cos(a) * r, h * 0.78 + Math.sin(a) * r); } g.closePath(); g.fill();
  });
}
function lidGlowTexture() {
  return canvasTexture(256, 168, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    drawLogo(g, w, h, '#ffffff', 'rgba(0,0,0,.4)');
  });
}
function controllerTexture() {
  return canvasTexture(256, 144, (g, w, h) => {
    g.fillStyle = '#16161a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
    // The mixer in the middle: channel faders, a crossfader, knobs
    for (let f = 0; f < 3; f++) { const x = w * (0.43 + f * 0.07); g.fillStyle = '#000'; g.fillRect(x - 1, h * 0.2, 3, h * 0.5); g.fillStyle = '#d9d9de'; g.fillRect(x - 5, h * (0.3 + f * 0.12), 10, 4); }
    g.fillStyle = '#000'; g.fillRect(w * 0.42, h * 0.8, w * 0.16, 3); g.fillStyle = '#d9d9de'; g.fillRect(w * 0.49, h * 0.78, 6, 8);
    g.fillStyle = '#8c8f96'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(w * (0.4 + (k % 4) * 0.066), h * (k < 4 ? 0.1 : 0.9), 3.5, 0, TAU); g.fill(); }
    // Pitch sliders beside each deck
    [0.04, 0.96].forEach((u) => { g.fillStyle = '#000'; g.fillRect(w * u - 1, h * 0.15, 3, h * 0.6); g.fillStyle = '#d9d9de'; g.fillRect(w * u - 4, h * 0.42, 8, 4); });
  });
}
function cabinetTexture() {
  return canvasTexture(128, 192, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#151414'); gr.addColorStop(0.5, '#232121'); gr.addColorStop(1, '#121111');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 6; y < h - 6; y += 5) for (let x = 6; x < w - 6; x += 5) g.fillRect(x, y, 1.5, 1.5);
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h * 0.62, w * 0.36, 0, TAU); g.stroke();
    g.fillStyle = '#0b0a0a'; g.beginPath(); g.arc(w / 2, h * 0.62, w * 0.29, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(w / 2, h * 0.62, w * 0.08, 0, TAU); g.fill();
    g.fillStyle = '#0b0a0a'; g.beginPath(); g.moveTo(w * 0.3, h * 0.12); g.lineTo(w * 0.7, h * 0.12); g.lineTo(w * 0.62, h * 0.28); g.lineTo(w * 0.38, h * 0.28); g.closePath(); g.fill();
    g.fillStyle = 'rgba(232,176,75,.6)'; g.fillRect(w * 0.36, h * 0.92, w * 0.28, 3);
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  });
}
let cabTex = null;
const cabMat = () => (cabTex || (cabTex = textured(cabinetTexture(), 0.8)));

/* ---------- a moulded plastic chair ----------
   Built facing -Z (its sitter looks towards -Z, its back at +Z), seat at 0.45 m, arms, splayed legs. Every chair in a
   venue is one instance of it, coloured per chair. */
let chairGeo = null;
function chairGeometry() {
  if (chairGeo) return chairGeo;
  const parts = [];
  const add = (geo, x, y, z, rx = 0, rz = 0) => { geo.rotateX(rx); geo.rotateZ(rz); geo.translate(x, y, z); parts.push(geo.index ? geo.toNonIndexed() : geo); };
  add(new THREE.BoxGeometry(0.44, 0.035, 0.4), 0, 0.45, 0);
  add(new THREE.BoxGeometry(0.42, 0.44, 0.03), 0, 0.69, 0.22, 0.09);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(new THREE.CylinderGeometry(0.016, 0.02, 0.46, 5, 1, true), sx * 0.21, 0.225, sz * 0.19, -sz * 0.07, sx * 0.07));
  [-1, 1].forEach((sx) => { add(new THREE.BoxGeometry(0.04, 0.03, 0.38), sx * 0.22, 0.64, 0.02); add(new THREE.BoxGeometry(0.03, 0.18, 0.03), sx * 0.22, 0.55, -0.16); });
  let count = 0; parts.forEach((p) => (count += p.attributes.position.count));
  const out = new THREE.BufferGeometry();
  ['position', 'normal', 'uv'].forEach((a) => { const size = parts[0].attributes[a].itemSize, arr = new Float32Array(count * size); let o = 0; parts.forEach((p) => { arr.set(p.attributes[a].array, o); o += p.attributes[a].array.length; }); out.setAttribute(a, new THREE.BufferAttribute(arr, size)); });
  chairGeo = out;
  return out;
}
class Chairs {
  constructor() { this.list = []; }
  // ry: which way its sitter faces, as the rotation that takes -Z there; lift raises it (a stack)
  add(x, z, ry, hex, lift = 0) {
    this.list.push({ x, z, ry, hex, lift });
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, lift, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    // The seat and legs, and the back, as the 2D scene's outlines
    const tf = (arr) => { const v = new THREE.Vector3(), out = []; for (let i = 0; i < arr.length; i += 3) { v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(m); out.push(Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000); } return out; };
    return { seat: tf(boxSolid(-0.25, 0, -0.22, 0.25, 0.47, 0.22)), back: tf(boxSolid(-0.23, 0.45, 0.18, 0.23, 0.92, 0.27)), arms: tf(boxSolid(-0.25, 0.47, -0.18, 0.25, 0.66, 0.2)) };
  }
  build(parent) {
    if (!this.list.length) return;
    const m = new THREE.InstancedMesh(chairGeometry(), std('#ffffff', 0.45, 0), this.list.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    this.list.forEach((ch, i) => { e.set(0, ch.ry, 0); q.setFromEuler(e); m.setMatrixAt(i, mx.compose(new THREE.Vector3(ch.x, ch.lift, ch.z), q, new THREE.Vector3(1, 1, 1))); m.setColorAt(i, c.set(ch.hex).multiplyScalar(0.9)); });
    m.castShadow = true;
    parent.add(m);
  }
}

/* ---------- two-wheelers ----------
   An Activa-style scooter and a motorbike, built side-on with the front towards +X, in two parts: the painted body
   (coloured per vehicle) and the rest (tyres, seat, chrome), each one instanced mesh for all of a venue's. */
function mergeParts(parts) {
  let count = 0; parts.forEach((p) => (count += p.attributes.position.count));
  const out = new THREE.BufferGeometry();
  ['position', 'normal', 'color'].forEach((a) => { const size = parts[0].attributes[a].itemSize, arr = new Float32Array(count * size); let o = 0; parts.forEach((p) => { arr.set(p.attributes[a].array, o); o += p.attributes[a].array.length; }); out.setAttribute(a, new THREE.BufferAttribute(arr, size)); });
  return out;
}
function piece(geo, hex, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  geo.scale(sx, sy, sz); geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z);
  const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv');
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const wheel = (x, r, w) => [piece(new THREE.CylinderGeometry(r, r, w, 12), '#141414', x, r, 0, Math.PI / 2), piece(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.01, 8), '#9ca0a5', x, r, 0, Math.PI / 2)];
const RIDES = {
  scooter: {
    paint: () => [piece(new THREE.BoxGeometry(0.1, 0.62, 0.42), '#fff', 0.44, 0.62, 0, 0, 0, 0.22), piece(new THREE.SphereGeometry(0.5, 10, 6), '#fff', -0.36, 0.56, 0, 0, 0, 0, 0.82, 0.42, 0.4), piece(new THREE.BoxGeometry(0.28, 0.07, 0.15), '#fff', 0.6, 0.5, 0), piece(new THREE.BoxGeometry(0.16, 0.12, 0.2), '#fff', 0.52, 1.02, 0)],
    trim: () => [...wheel(0.62, 0.23, 0.1), ...wheel(-0.6, 0.23, 0.1), piece(new THREE.BoxGeometry(0.55, 0.05, 0.3), '#2a2a2d', 0, 0.3, 0), piece(new THREE.BoxGeometry(0.62, 0.09, 0.3), '#161616', -0.32, 0.8, 0), piece(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 6), '#2a2a2a', 0.5, 0.86, 0, 0, 0, 0.25), piece(new THREE.BoxGeometry(0.05, 0.04, 0.64), '#1c1c1c', 0.46, 1.1, 0), piece(new THREE.SphereGeometry(0.055, 6, 4), '#f4f1e6', 0.61, 1.02, 0), piece(new THREE.BoxGeometry(0.03, 0.06, 0.16), '#a51d1a', -0.78, 0.6, 0)],
    solids: [[-0.84, 0, -0.22, 0.76, 0.86, 0.22], [0.36, 0.86, -0.33, 0.66, 1.16, 0.33]]
  },
  bike: {
    paint: () => [piece(new THREE.SphereGeometry(0.5, 10, 6), '#fff', 0.2, 0.92, 0, 0, 0, 0, 0.5, 0.22, 0.3), piece(new THREE.BoxGeometry(0.34, 0.06, 0.14), '#fff', 0.68, 0.72, 0), piece(new THREE.BoxGeometry(0.34, 0.22, 0.26), '#fff', -0.22, 0.68, 0), piece(new THREE.BoxGeometry(0.42, 0.05, 0.14), '#fff', -0.62, 0.7, 0, 0, 0, 0.25), piece(new THREE.BoxGeometry(0.2, 0.16, 0.3), '#fff', 0.56, 0.98, 0)],
    trim: () => [...wheel(0.66, 0.31, 0.1), ...wheel(-0.66, 0.31, 0.12), piece(new THREE.BoxGeometry(0.36, 0.3, 0.26), '#2b2b2e', 0.05, 0.47, 0), piece(new THREE.BoxGeometry(0.55, 0.08, 0.26), '#161616', -0.27, 0.9, 0), piece(new THREE.CylinderGeometry(0.035, 0.03, 0.7, 8), '#c9ccd1', -0.3, 0.4, 0.16, 0, 0, Math.PI / 2 - 0.12), piece(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6), '#2b2b2e', 0.58, 0.72, 0, 0, 0, 0.35), piece(new THREE.BoxGeometry(0.04, 0.04, 0.7), '#1b1b1b', 0.5, 1.08, 0), piece(new THREE.SphereGeometry(0.075, 10, 8), '#f4f1e6', 0.66, 0.98, 0), piece(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), '#2b2b2e', -0.2, 0.62, 0, 0, 0, 1.1),
      // the front fork down to the axle, and the swingarm back to the rear wheel
      ...[-1, 1].map((sd) => piece(new THREE.CylinderGeometry(0.022, 0.022, 0.75, 6), '#c9ccd1', 0.58, 0.67, sd * 0.07, 0, 0, 0.22)),
      ...[-1, 1].map((sd) => piece(new THREE.BoxGeometry(0.68, 0.05, 0.04), '#2b2b2e', -0.33, 0.38, sd * 0.08, 0, 0, 0.2))],
    solids: [[-0.98, 0, -0.2, 0.98, 1.0, 0.2], [0.42, 0.9, -0.38, 0.72, 1.14, 0.38]]
  }
};
class Rides {
  constructor() { this.list = { scooter: [], bike: [] }; }
  add(kind, x, z, frontX, hex) {
    const ry = frontX > 0 ? 0 : Math.PI;
    this.list[kind].push({ x, z, ry, hex });
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    return RIDES[kind].solids.map((b) => { const s = boxSolid(...b), v = new THREE.Vector3(), out = []; for (let i = 0; i < s.length; i += 3) { v.set(s[i], s[i + 1], s[i + 2]).applyMatrix4(m); out.push(Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000); } return out; });
  }
  build(parent) {
    Object.keys(this.list).forEach((kind) => {
      const L = this.list[kind]; if (!L.length) return;
      const paint = new THREE.InstancedMesh(mergeParts(RIDES[kind].paint()), std('#ffffff', 0.35, 0.25, { vertexColors: true }), L.length);
      const trim = new THREE.InstancedMesh(mergeParts(RIDES[kind].trim()), std('#ffffff', 0.55, 0.3, { vertexColors: true }), L.length);
      const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      L.forEach((r, i) => { e.set(0, r.ry, 0); q.setFromEuler(e); mx.compose(new THREE.Vector3(r.x, 0, r.z), q, new THREE.Vector3(1, 1, 1)); paint.setMatrixAt(i, mx); trim.setMatrixAt(i, mx); paint.setColorAt(i, c.set(r.hex)); });
      paint.castShadow = trim.castShadow = true;
      parent.add(paint); parent.add(trim);
    });
  }
}

/* ---------- a food stall ----------
   Local frame: u along the counter (X), v into the stall (Z); the counter's face at v = 0 faces -Z, towards the
   customers. A back wall and sides of printed board, a planked counter in the stall's colour with a brass trim, a
   sloping roof on bamboo poles, a striped scalloped valance with a bulb at every scallop, the painted sign on top, and
   what it sells on the counter. Inside, a tube light (cold) or a bulb (warm) lights the counter and the ground in front. */
function stall(ctx, sl) {
  const { kit, root, beads } = ctx;
  if (sl.cart) return cart(ctx, sl);
  const grp = placed(root, sl.x, sl.z, Math.atan2(sl.V[0], sl.V[1])), hw = sl.w / 2, D = sl.depth;
  const toVenue = (u, y, v) => new THREE.Vector3(u, y, v).applyMatrix4(grp.matrixWorld);
  const back = [], front = [], sides = [];
  const hold = (m, list) => { const s = solidOf(m); back.push(s); if (list) list.push(s); return m; };

  // The shell: back wall (lit inside), side walls, floor boards
  hold(box(grp, sl.w, 2.4, 0.06, 0, 1.2, D + 0.03, kit.selfLit(new THREE.MeshStandardMaterial({ color: '#6a381c', emissive: '#ff9a50', roughness: 0.9 }), 0.1)));
  [-1, 1].forEach((sd) => { const w = box(grp, 0.05, 2.4, D, sd * hw, 1.2, D / 2, std('#34210f', 0.9)); const s = solidOf(w); back.push(s); const c = toVenue(sd * hw, 0, D / 2), n = toVenue(sd * (hw + 1), 0, D / 2).sub(c); sides.push({ s, c: [c.x, c.z], n: [n.x, n.z] }); });
  box(grp, sl.w, 0.04, D, 0, 0.02, D / 2, std('#3a2616', 0.95));
  // A shelf on the back wall with jars and tins
  box(grp, sl.w * 0.8, 0.04, 0.25, 0, 1.55, D - 0.12, std('#6b4424', 0.8));
  for (let k = 0; k < 7; k++) cyl(grp, 0.06, 0.06, 0.16, lerp(-hw * 0.7, hw * 0.7, k / 6), 1.65, D - 0.12, std(['#c9a37a', '#b5651d', '#e8d5b0', '#8e1b2c', '#2f6fa8', '#e8b04b', '#d9d2c5'][k], 0.4, 0.2), 8);
  // The counter: body, planked face with its brass trim, and the light wooden top that overhangs it
  const body = hold(box(grp, sl.w, 0.97, 0.45, 0, 0.485, 0.225, std('#3a2012', 0.9)), front);
  panel(grp, sl.w, 0.97, 0, 0.485, -0.004, kit.selfLit(textured(counterTexture(sl.col), 0.8), 0.22));
  hold(box(grp, sl.w + 0.04, 0.06, 0.72, 0, 1.0, 0.1, std('#d9c3a0', 0.6)), front);
  // Bamboo poles at the front corners, the sloping roof, and the valance hung from its front edge
  [-hw - 0.25, hw + 0.25].forEach((u) => {
    hold(cyl(grp, 0.045, 0.05, 2.78, u, 1.39, -0.5, std('#8a6a3a', 0.8), 7), front);
    for (let k = 1; k < 5; k++) cyl(grp, 0.055, 0.055, 0.03, u, k * 0.55, -0.5, std('#5a4020', 0.9), 7);
    for (let k = 0; k < 16; k++) { const a = k * 1.1; beads.addIn(grp, u + Math.cos(a) * 0.06, 2.6 - k * 0.12, -0.5 + Math.sin(a) * 0.06, MARIGOLD[k % 3], 0.03); }
  });
  const roofLen = Math.hypot(D + 0.5, 0.2);
  hold(box(grp, sl.w + 0.6, 0.06, roofLen, 0, 2.85, (D - 0.5) / 2, std('#2a1a10', 0.9), -Math.atan2(0.2, D + 0.5)), front);
  panel(grp, sl.w + 0.6, 0.62, 0, 2.44, -0.52, kit.selfLit(textured(valanceTexture(sl.col, 8), 0.85, 0, { alphaTest: 0.35, side: THREE.DoubleSide }), 0.3, 'festive'));
  front.push(boxSolidIn(grp, -hw - 0.3, 2.3, -0.54, hw + 0.3, 2.75, -0.5)); back.push(front[front.length - 1]);
  for (let k = 0; k <= 7; k++) { const q = toVenue(lerp(-hw - 0.3, hw + 0.3, (k + 0.5) / 8.5), 2.15, -0.56); kit.bulbs.add(q.x, q.y, q.z, k, { ph: k * 1.3 + sl.x, s: 0.9 }); }
  // The painted sign on two posts over the roof, lit by its own lamp
  [-0.6, 0.6].forEach((u) => cyl(grp, 0.02, 0.02, 0.3, u, 2.9, -0.48, std('#2a1a10', 0.8), 5));
  hold(box(grp, 1.72, 0.64, 0.05, 0, 3.32, -0.46, std('#1a0e08', 0.9)), front);
  panel(grp, 1.68, 0.6, 0, 3.32, -0.49, kit.litMap(signTexture(sl.sign, sl.en, sl.col), 1.05, 'practical'));
  // The stall's own lamp: a tube light for the fried and the cold, a warm bulb for tea
  const tube = sl.en === 'Chai' || sl.en === 'Snacks' ? false : true, hex = tube ? LIGHT.tube : LIGHT.tungsten;
  if (tube) cyl(grp, 0.018, 0.018, Math.min(1.2, sl.w * 0.5), 0, 2.4, 0.15, kit.glow(LIGHT.tube, 2.4, 'practical'), 6, 0, 0, Math.PI / 2);
  else { const q = toVenue(0, 2.3, 0.4); kit.bigBulbs.add(q.x, q.y, q.z, 0, { color: LIGHT.tungsten, k: 1.3, s: 0.7, layer: 'practical', twinkle: 0.02 }); }
  const inside = toVenue(0, 1.5, D - 0.05), ground = toVenue(0, 0, -1.3), counter = toVenue(0, 1.06, 0.1);
  kit.pools.add(inside.x, inside.y, inside.z, hw * 1.1, 1.1, hex, 0.42, { vertical: true, ry: grp.rotation.y, layer: 'practical' });
  kit.pools.add(counter.x, counter.y, counter.z, hw * 0.9, 0.5, hex, 0.18, { ry: grp.rotation.y, layer: 'practical', live: true });
  kit.pools.add(ground.x, 0.02, ground.z, 2.8, 2.8, hex, tube ? 0.26 : 0.3, { layer: 'practical' });
  wares(ctx, grp, sl, hw, front, back);
  sl.hole3d = { back, front, sides };
}
// A box's solid in a group's frame, taken into the venue's
function boxSolidIn(grp, x0, y0, z0, x1, y1, z1) {
  const s = boxSolid(x0, y0, z0, x1, y1, z1), v = new THREE.Vector3(), out = [];
  for (let i = 0; i < s.length; i += 3) { v.set(s[i], s[i + 1], s[i + 2]).applyMatrix4(grp.matrixWorld); out.push(Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000); }
  return out;
}

// What each stall sells, on its counter (y 1.03, v from -0.2 to 0.4)
function wares(ctx, grp, sl, hw, front, back) {
  const { kit, beads } = ctx, top = 1.03, steel = std('#c9ccd1', 0.28, 0.9), en = sl.en;
  const hold = (m) => { const s = solidOf(m); front.push(s); back.push(s); return m; };
  if (en === 'Chai') {
    // A gas stove with its blue ring of flame, the kettle on it, and a row of glasses of tea
    const sx = -hw * 0.45;
    box(grp, 0.44, 0.08, 0.3, sx, top + 0.04, 0.05, std('#2a2a2e', 0.5, 0.4));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 16), kit.glow('#4aa8ff', 2.2, 'practical')); ring.rotation.x = Math.PI / 2; ring.position.set(sx, top + 0.085, 0.05); grp.add(ring);
    hold(lathe(grp, [[0, 0], [0.16, 0.01], [0.19, 0.08], [0.17, 0.2], [0.1, 0.25], [0.02, 0.28]], sx, top + 0.09, 0.05, steel));
    cyl(grp, 0.015, 0.02, 0.22, sx + 0.2, top + 0.24, 0.05, steel, 6, 0, 0, -0.7);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 4, 12, Math.PI), steel); handle.position.set(sx, top + 0.36, 0.05); grp.add(handle);
    for (let k = 0; k < 6; k++) { const u = hw * (0.05 + k * 0.13); cyl(grp, 0.03, 0.026, 0.065, u, top + 0.033, -0.08, std('#b8753a', 0.3), 8); cyl(grp, 0.032, 0.032, 0.03, u, top + 0.08, -0.08, std('#dfe6ea', 0.15, 0.1), 8); }
  } else if (en === 'Pani puri' || en === 'Dabeli') {
    // A glass case lit from inside, puris (or buns) piled in it, and for pani puri the bowl of green pani
    const x0 = -hw * 0.7, x1 = hw * 0.7, cw = x1 - x0;
    [[x0, 0], [x1, 0], [x0, 0.3], [x1, 0.3]].forEach(([u, v]) => box(grp, 0.02, 0.5, 0.02, u, top + 0.25, v - 0.1, steel));
    box(grp, cw, 0.02, 0.42, 0, top + 0.5, 0.05, steel);
    hold(box(grp, cw, 0.5, 0.4, 0, top + 0.25, 0.05, new THREE.MeshStandardMaterial({ color: '#dff2ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false })));
    cyl(grp, 0.012, 0.012, cw * 0.9, 0, top + 0.47, 0.05, kit.glow(LIGHT.warm, 2, 'practical'), 6, 0, 0, Math.PI / 2);
    const tone = en === 'Dabeli' ? '#c98f45' : '#dcae62';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 11; c++) beads.addIn(grp, lerp(x0 + 0.08, x1 - 0.08, (c + (r % 2) * 0.5) / 11), top + 0.06 + r * 0.07, 0.05 + (r % 2 ? 0.08 : -0.05), tone, en === 'Dabeli' ? 0.05 : 0.04);
    if (en === 'Pani puri') { lathe(grp, [[0, 0], [0.13, 0.01], [0.16, 0.1], [0.155, 0.12]], hw * 0.85, top, -0.02, steel); cyl(grp, 0.15, 0.15, 0.01, hw * 0.85, top + 0.1, -0.02, std('#6aa84f', 0.2), 14); }
  } else if (en === 'Water') {
    // Blue 20-litre jars in a row, capped white
    for (let k = 0; k < 5; k++) { const u = -hw * 0.75 + k * hw * 0.37; hold(lathe(grp, [[0, 0], [0.13, 0.005], [0.14, 0.05], [0.14, 0.26], [0.1, 0.32], [0.04, 0.35], [0.04, 0.38]], u, top, -0.02, std('#2f7fc4', 0.15, 0.1))); cyl(grp, 0.045, 0.045, 0.04, u, top + 0.39, -0.02, std('#e8eef4', 0.5), 8); }
  } else if (en === 'Ice cream') {
    // A chest freezer with a sliding glass lid, and kulfi on sticks beside it
    hold(box(grp, hw * 1.0, 0.36, 0.45, -hw * 0.3, top + 0.18, 0.08, std('#f2f4f6', 0.4)));
    box(grp, hw * 1.0 + 0.005, 0.07, 0.455, -hw * 0.3, top + 0.2, 0.08, std('#3b8fd4', 0.4));
    box(grp, hw * 0.96, 0.01, 0.42, -hw * 0.3, top + 0.365, 0.08, std('#a9c8dc', 0.1, 0.2));
    ['#f6d27a', '#f0a0b8', '#e9e0c8', '#9ad08c'].forEach((hex, k) => { const u = hw * (0.35 + k * 0.15); cyl(grp, 0.006, 0.006, 0.1, u, top + 0.05, -0.08, std('#d9c3a0', 0.8), 4); const kf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), std(hex, 0.5)); kf.scale.set(1, 2.2, 1); kf.position.set(u, top + 0.17, -0.08); grp.add(kf); });
  } else {
    // Steel trays of fafda, jalebi and ganthiya
    [[-0.55, '#e6c35a'], [0.05, '#f08a24'], [0.6, '#d9a35a']].forEach(([f, hex], ti) => {
      const u = hw * f; cyl(grp, 0.26, 0.24, 0.03, u, top + 0.015, 0.02, steel, 18);
      for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 0.05 + (k % 5) * 0.035; if (ti === 1) { const j = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 4, 10), std(hex, 0.35)); j.rotation.x = Math.PI / 2 - 0.4; j.position.set(u + Math.cos(a) * r, top + 0.05 + (k % 3) * 0.02, 0.02 + Math.sin(a) * r); grp.add(j); } else box(grp, 0.14, 0.02, 0.025, u + Math.cos(a) * r, top + 0.045 + (k % 3) * 0.018, 0.02 + Math.sin(a) * r, std(hex, 0.7), 0, a, 0); }
    });
  }
  if (en === 'Snacks' || en === 'Water') {
    // Packets hung in strips from the roof
    const cols = ['#f6c342', '#d8453a', '#2f8f5b', '#3b4cc0', '#f08a24'];
    for (let hp = 0; hp < 7; hp++) for (let hk = 0; hk < 3; hk++) box(grp, 0.13, 0.17, 0.02, -hw + 0.3 + (sl.w - 0.6) * hp / 6, 2.05 - hk * 0.2, -0.42, std(cols[(hp + hk) % 5], 0.35, 0.3));
  }
}

/* ---------- the pani puri cart in the sheri ----------
   A wooden lari on four wheels along the lane's edge, a glass case of puris on top and a striped canopy on thin poles
   with its sign. The vendor stands at the end of it, on the lane. */
function cart(ctx, sl) {
  const { kit, root, beads } = ctx;
  const grp = placed(root, sl.x, sl.z, Math.atan2(sl.V[0], sl.V[1])), hw = sl.w / 2, D = sl.depth;
  const toVenue = (u, y, v) => new THREE.Vector3(u, y, v).applyMatrix4(grp.matrixWorld);
  const back = [], front = [];
  const hold = (m) => { back.push(solidOf(m)); return m; };
  const wood = std('#5a3218', 0.8), steel = std('#c9ccd1', 0.28, 0.9);
  hold(box(grp, sl.w, 0.46, D, 0, 0.8, D / 2, wood));
  panel(grp, sl.w, 0.46, 0, 0.8, -0.004, kit.selfLit(textured(counterTexture(sl.col), 0.8), 0.22));
  box(grp, sl.w + 0.06, 0.04, D + 0.06, 0, 1.05, D / 2, std('#d9c3a0', 0.6));
  [[-hw + 0.3, 0.02], [hw - 0.3, 0.02], [-hw + 0.3, D - 0.02], [hw - 0.3, D - 0.02]].forEach(([u, v]) => { hold(cyl(grp, 0.28, 0.28, 0.05, u, 0.3, v, std('#1a1512', 0.8), 14, Math.PI / 2)); cyl(grp, 0.05, 0.05, 0.07, u, 0.3, v, steel, 8, Math.PI / 2); });
  [-hw + 0.3, hw - 0.3].forEach((u) => box(grp, 0.04, 0.04, D, u, 0.3, D / 2, std('#2a2522', 0.6, 0.5)));
  // Glass case, puris, the pani matka and its steel vessel
  const x0 = -hw * 0.75, x1 = hw * 0.4;
  hold(box(grp, x1 - x0, 0.42, D * 0.6, (x0 + x1) / 2, 1.28, D * 0.45, new THREE.MeshStandardMaterial({ color: '#dff2ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false })));
  box(grp, x1 - x0, 0.02, D * 0.6, (x0 + x1) / 2, 1.5, D * 0.45, steel);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) beads.addIn(grp, lerp(x0 + 0.06, x1 - 0.06, (c + (r % 2) * 0.5) / 8), 1.11 + r * 0.07, D * 0.45 + (r % 2 ? 0.07 : -0.06), '#dcae62', 0.04);
  hold(lathe(grp, [[0, 0], [0.12, 0.02], [0.17, 0.12], [0.15, 0.24], [0.08, 0.3], [0.08, 0.33]], hw * 0.68, 1.07, D * 0.4, std('#9a4a22', 0.85)));
  cyl(grp, 0.11, 0.09, 0.12, hw * 0.68, 1.13, D * 0.8, steel, 12);
  // Canopy on four poles, a scalloped edge, bulbs, a tube light and the sign
  [[-hw, 0], [hw, 0], [-hw, D], [hw, D]].forEach(([u, v]) => hold(cyl(grp, 0.018, 0.018, 1.2, u, 1.65, v, steel, 5)));
  hold(box(grp, sl.w + 0.3, 0.04, D + 0.4, 0, 2.27, D / 2, std(sl.col, 0.8), -0.08));
  panel(grp, sl.w + 0.3, 0.3, 0, 2.12, -0.21, kit.selfLit(textured(valanceTexture(sl.col, 6), 0.85, 0, { alphaTest: 0.35, side: THREE.DoubleSide }), 0.3, 'festive'));
  for (let k = 0; k <= 5; k++) { const q = toVenue(lerp(-hw - 0.1, hw + 0.1, (k + 0.5) / 6.5), 2.0, -0.23); kit.bulbs.add(q.x, q.y, q.z, k, { ph: k * 1.3, s: 0.8 }); }
  cyl(grp, 0.015, 0.015, sl.w * 0.6, 0, 2.18, D * 0.4, kit.glow(LIGHT.tube, 2.4, 'practical'), 6, 0, 0, Math.PI / 2);
  hold(box(grp, 1.2, 0.42, 0.04, 0, 2.55, D * 0.3, std('#1a0e08', 0.9)));
  panel(grp, 1.16, 0.4, 0, 2.55, D * 0.3 - 0.03, kit.litMap(signTexture(sl.sign, sl.en, sl.col), 1.05, 'practical'));
  const g0 = toVenue(0, 0, -1.0), top = toVenue(0, 1.12, D * 0.45);
  kit.pools.add(g0.x, 0.02, g0.z, 2.2, 2.2, LIGHT.tube, 0.2, { layer: 'practical' });
  kit.pools.add(top.x, top.y, top.z, hw, 0.5, LIGHT.tube, 0.16, { ry: grp.rotation.y, layer: 'practical', live: true });
  const vendor = toVenue(-hw - 0.4, 0, D * 0.4);
  sl.hole3d = { back, front: back, sides: [], vendor: [vendor.x, vendor.z] };
}

/* ---------- the DJ's booth ----------
   Local frame at the booth, facing -Z. A table under a maroon bandhani cloth with mirror-work and a marigold scallop,
   the lit DJ sign, a laptop, a controller whose jog wheels turn and pads flash on the beat, a brass diya, a steel jug of
   chhas and a stack of paper cups; speakers on tripods either side; bamboo poles and a crossbar behind with a toran,
   marigolds wound down the poles and a sagging string of bulbs; a stool for the DJ. */
// Each venue dresses the DJ's table in its own way: the cloth on the front, the table's top, and the frame over it
// (bamboo with a toran and marigolds; basalt with crystals; red lacquer with ribbons and bells; teak hung with lights;
// truss with a neon tube; an arch of branches hung with paper lanterns)
const DJ_STYLE = {
  pandora: { frame: 'basalt', cloth: () => clothTexture(['#141019', '#1c1622'], '#ffa245', 'glyph'), top: '#1a1620', table: '#121016', marigolds: false },
  resham: { frame: 'lacquer', cloth: () => clothTexture(['#6e0a14', '#8e1424'], '#d6a64a', 'embroidery'), top: '#3a1a10', table: '#5a0c14', marigolds: false },
  chitra: { frame: 'teak', cloth: () => clothTexture(['#1e2a5a', '#24346a'], '#e8a86a', 'block'), top: '#5a3a20', table: '#2a2a5a', marigolds: true },
  voltage: { frame: 'truss', cloth: () => clothTexture(['#0e0e12', '#16161c'], '#38d8ff', 'led'), top: '#1a1a20', table: '#0e0e12', marigolds: false },
  chandra: { frame: 'twig', cloth: () => clothTexture(['#0c3a3a', '#124848'], '#9affe8', 'leaf'), top: '#3a2a1a', table: '#0c2a2a', marigolds: false },
  vrindavan: { frame: 'teak', cloth: () => clothTexture(['#7a2a14', '#8a3418'], '#e8b04b', 'block'), top: '#6a4424', table: '#5a2a14', marigolds: true },
  tulip: { frame: 'twig', cloth: () => clothTexture(['#2a1a4a', '#3a2460'], '#e8b870', 'leaf'), top: '#5a4030', table: '#2a1a3a', marigolds: false },
  lotus: { frame: 'truss', cloth: () => clothTexture(['#10141e', '#161c2a'], '#40e4ff', 'led'), top: '#1a1e28', table: '#10141e', marigolds: false },
  vadodara: { frame: 'truss', cloth: () => clothTexture(['#120a1a', '#1a0e24'], '#ff3ad0', 'led'), top: '#16121c', table: '#0e0a14', marigolds: false },
  jyot: { frame: 'lacquer', cloth: () => clothTexture(['#7a1414', '#8e1a1a'], '#ffd04a', 'embroidery'), top: '#4a2a14', table: '#6a1010', marigolds: true },
  tideglass: { frame: 'teak', cloth: () => clothTexture(['#0e3a4a', '#124a5a'], '#ffd8a0', 'leaf'), top: '#7a5434', table: '#e8e2d8', marigolds: false },
  shikhar: { frame: 'truss', cloth: () => clothTexture(['#141210', '#1c1814'], '#ffc46a', 'glyph'), top: '#2a2420', table: '#141210', marigolds: false },
  kutch: { frame: 'teak', cloth: () => clothTexture(['#1e2a6a', '#24326e'], '#f0e8d8', 'block'), top: '#d8ccb6', table: '#1e2a6a', marigolds: false }
};
const clothCache = {};
function clothTexture(bg, ink, kind) {
  const key = bg.join() + ink + kind; if (clothCache[key]) return clothCache[key];
  clothCache[key] = canvasTexture(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 2;
    if (kind === 'glyph') { g.fillRect(0, h * 0.46, w, 3); for (let x = 12; x < w; x += 22) { g.beginPath(); g.moveTo(x, h * 0.3); g.lineTo(x + 6, h * 0.38); g.lineTo(x, h * 0.46); g.stroke(); } }
    else if (kind === 'embroidery') { g.strokeRect(6, 6, w - 12, h - 12); for (let x = 16; x < w; x += 20) for (let y = 22; y < h - 12; y += 22) { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fill(); g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(x + 10, y + 10, 2, 0, TAU); g.fill(); g.fillStyle = ink; } }
    else if (kind === 'block') { for (let x = 10; x < w; x += 24) for (let y = 12; y < h; y += 24) { g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); } g.stroke(); g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); } g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4); }
    else if (kind === 'led') { for (let x = 4; x < w; x += 8) for (let y = 4; y < h; y += 8) { g.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(x * 0.05 + y * 0.08)); g.fillRect(x, y, 3, 3); } g.globalAlpha = 1; }
    else if (kind === 'leaf') { for (let i = 0; i < 18; i++) { const x = (i * 53) % w, y = (i * 37) % h; g.save(); g.translate(x, y); g.rotate(i); g.beginPath(); g.ellipse(0, 0, 14, 6, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke(); g.restore(); } }
  });
  return clothCache[key];
}
// The frame over the booth, in the venue's style, from u = -1.15 to 1.15 across, pz back, ph0 high
function djFrame(ctx, grp, style, toVenue, hold, pz, ph0) {
  const { kit, beads } = ctx;
  if (style === 'basalt') {
    const rock = std('#24202c', 0.85, 0.05), amber = kit.glow('#ffa245', 1.6, 'practical');
    [-1.15, 1.15].forEach((u) => { hold(cyl(grp, 0.16, 0.2, ph0, u, ph0 / 2, pz, rock, 6), false); const c = cyl(grp, 0.001, 0.09, 0.45, u, ph0 + 0.22, pz, amber, 6); c.rotation.z = u * 0.08; const q = toVenue(u, ph0 + 0.2, pz); kit.pools.add(q.x, 0.02, q.z, 1.2, 1.2, '#ffa245', 0.1, { layer: 'practical' }); });
    for (let k = 0; k <= 12; k++) { const u = k / 12, q = toVenue(lerp(-1.15, 1.15, u), ph0 - 0.2 - Math.sin(u * Math.PI) * 0.22, pz - 0.03); kit.bulbs.add(q.x, q.y, q.z, 0, { color: '#ffb25a', k: 0.8, s: 0.8, twinkle: 0.3, ph: k, layer: 'festive' }); }
    kit.wires.cable(toVenue(-1.15, ph0 - 0.2, pz - 0.03).toArray(), toVenue(1.15, ph0 - 0.2, pz - 0.03).toArray(), 0.22);
    return;
  }
  if (style === 'lacquer') {
    const red = std('#8a1424', 0.4, 0.15), gold = std('#c9963f', 0.3, 0.85);
    [-1.15, 1.15].forEach((u) => { hold(cyl(grp, 0.05, 0.06, ph0, u, ph0 / 2, pz, red, 10), false); [0.4, 1.2, 2.0].forEach((y) => cyl(grp, 0.065, 0.065, 0.04, u, y, pz, gold, 10)); });
    hold(cyl(grp, 0.04, 0.04, 2.5, 0, ph0, pz, red, 10, 0, 0, Math.PI / 2), false);
    for (let k = 0; k < 22; k++) { const u = lerp(-1.1, 1.1, (k + 0.5) / 22), L = 0.5 + 0.35 * Math.sin(k * 1.7) ** 2; box(grp, 0.05, L, 0.004, u, ph0 - L / 2 - 0.04, pz - 0.02, std(k % 4 === 0 ? '#d6a64a' : '#b8182c', 0.45, 0.2)); if (k % 3 === 1) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.06, 10), gold); b.position.set(u, ph0 - L - 0.08, pz - 0.02); grp.add(b); } }
    for (let k = 0; k <= 10; k++) { const q = toVenue(lerp(-1.15, 1.15, k / 10), ph0 + 0.04, pz - 0.05); kit.bulbs.add(q.x, q.y, q.z, 0, { color: '#ff6a4a', k: 0.7, s: 0.7, twinkle: 0.2, ph: k, layer: 'festive' }); }
    return;
  }
  if (style === 'teak') {
    const teak = std('#6a4424', 0.6, 0.05);
    [-1.15, 1.15].forEach((u) => hold(box(grp, 0.08, ph0, 0.08, u, ph0 / 2, pz, teak), false));
    hold(box(grp, 2.5, 0.08, 0.1, 0, ph0, pz, teak), false);
    for (let k = 0; k < 9; k++) { const u = lerp(-1, 1, (k + 0.5) / 9), L = 0.6 + (k % 3) * 0.25; kit.wires.line(toVenue(u, ph0, pz - 0.04).toArray(), toVenue(u, ph0 - L, pz - 0.04).toArray()); for (let y = ph0 - 0.1; y > ph0 - L; y -= 0.12) { const q = toVenue(u, y, pz - 0.04); kit.bulbs.add(q.x, q.y, q.z, 0, { color: '#ffd08a', k: 0.6, s: 0.55, twinkle: 0.4, ph: k + y * 3, layer: 'festive' }); } }
    for (let k = 0; k < 18; k++) { const a = k * 1.2; beads.addIn(grp, -1.15 + Math.cos(a) * 0.05, ph0 - 0.1 - k * 0.1, pz + Math.sin(a) * 0.05, MARIGOLD[k % 3], 0.028); beads.addIn(grp, 1.15 + Math.cos(a) * 0.05, ph0 - 0.1 - k * 0.1, pz + Math.sin(a) * 0.05, MARIGOLD[k % 3], 0.028); }
    return;
  }
  if (style === 'truss') {
    const alu = latticeMat(Math.round(ph0 / 1.1));
    [-1.15, 1.15].forEach((u) => { for (let k = 0; k < 2; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, ph0), alu); p.position.set(u, ph0 / 2, pz); p.rotation.y = k * Math.PI / 2; grp.add(p); } });
    const tube = box(grp, 2.4, 0.05, 0.05, 0, ph0 - 0.05, pz - 0.05, kit.glow('#ff3ad0', 2.2, 'show'));
    const tube2 = box(grp, 0.05, ph0 - 0.3, 0.05, -1.15, ph0 / 2, pz - 0.18, kit.glow('#38d8ff', 2.0, 'show')), tube3 = box(grp, 0.05, ph0 - 0.3, 0.05, 1.15, ph0 / 2, pz - 0.18, kit.glow('#38d8ff', 2.0, 'show'));
    const q = toVenue(0, ph0, pz - 0.2); kit.pools.add(q.x, 0.02, q.z, 2.2, 1.6, '#c040ff', 0.12, { layer: 'show' });
    return;
  }
  if (style === 'twig') {
    const bark = std('#3a2c20', 0.9), lantern = kit.glow('#ffbe6a', 1.3, 'practical');
    for (let s = 0; s < 3; s++) { let prev = null; for (let i = 0; i <= 12; i++) { const t = i / 12, u = lerp(-1.2, 1.2, t), y = Math.sin(t * Math.PI) * ph0 * 1.05 + 0.08 * Math.sin(t * 9 + s * 2), zz = pz + 0.06 * Math.cos(t * 9 + s * 2); if (prev) { const len = Math.hypot(u - prev[0], y - prev[1]), m = cyl(grp, 0.03, 0.035, len + 0.02, (u + prev[0]) / 2, (y + prev[1]) / 2, zz, bark, 5); m.rotation.z = Math.atan2(u - prev[0], y - prev[1]) * -1 + Math.PI; } prev = [u, y]; } }
    [-0.6, 0, 0.6].forEach((u, i) => { const y = ph0 * 0.95 - Math.abs(u) * 0.5 - 0.5, l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lantern); l.scale.y = 1.35; l.position.set(u, y, pz - 0.02); grp.add(l); kit.wires.line(toVenue(u, y + 0.18, pz - 0.02).toArray(), toVenue(u, y + 0.5, pz - 0.02).toArray()); const q = toVenue(u, 0, pz - 0.4); kit.pools.add(q.x, 0.02, q.z, 1.2, 1.2, '#ffbe6a', 0.08, { layer: 'practical' }); });
    return;
  }
}
function djBooth(ctx, holder) {
  const { kit, root, beads } = ctx;
  const grp = placed(root, holder.x, holder.z, 0), th = 0.74, tw = 0.8, td = 0.34;
  const toVenue = (u, y, v) => new THREE.Vector3(u, y, v).applyMatrix4(grp.matrixWorld);
  const back = [], front = [];
  const hold = (m, both = true) => { const s = solidOf(m); back.push(s); if (both) front.push(s); return m; };
  const steel = std('#c9ccd1', 0.25, 0.9), alu = std('#a7acb3', 0.35, 0.8), bamboo = std('#9b7a45', 0.8), DS = DJ_STYLE[ctx.id] || null;
  // The table and its cloth (each venue's own, or a bandhani on the red table with marigolds along its edge)
  hold(box(grp, tw * 2, th - 0.03, td * 2, 0, (th - 0.03) / 2, 0, std(DS ? DS.table : '#8e1b2c', 0.9)));
  panel(grp, tw * 2, th - 0.03, 0, (th - 0.03) / 2, -td - 0.004, kit.selfLit(textured(DS ? DS.cloth() : bandhaniTexture(), 0.85), DS && DS.frame === 'truss' ? 0.3 : 0.12, 'festive'));
  hold(box(grp, tw * 2 + 0.04, 0.03, td * 2 + 0.04, 0, th - 0.015, 0, std(DS ? DS.top : '#4a2e1b', 0.6)));
  box(grp, tw * 2 + 0.05, 0.012, 0.012, 0, th - 0.03, -td - 0.02, std('#9a6a3a', 0.4));
  if (!DS || DS.marigolds) for (let k = 0; k <= 24; k++) { const u = k / 24; beads.addIn(grp, lerp(-tw, tw, u), th - 0.05 - Math.abs(Math.sin(u * Math.PI * 4)) * 0.06, -td - 0.025, MARIGOLD[k % 3], 0.028); }
  for (let k = 0; k < 16; k++) { const q = toVenue(lerp(-tw, tw, (k + 0.5) / 16), th - 0.12, -td - 0.012); kit.bulbs.add(q.x, q.y, q.z, 0, { color: '#f4f8ff', k: 0.35, s: 0.28, twinkle: 0.8, ph: k * 2.1, layer: 'festive' }); }
  // The DJ sign, and its ring of marquee bulbs
  panel(grp, 0.5, 0.25, 0, 0.34, -td - 0.018, kit.litMap(djSignTexture(), 0.78, 'show'));
  for (let k = 0; k < 16; k++) {
    const per = k / 16 * 1.5, u = per < 0.5 ? -0.25 + per : per < 0.75 ? 0.25 : per < 1.25 ? 0.25 - (per - 0.75) : -0.25, y = per < 0.5 ? 0.465 : per < 0.75 ? 0.465 - (per - 0.5) : per < 1.25 ? 0.215 : 0.215 + (per - 1.25);
    const q = toVenue(u, y, -td - 0.02); kit.bulbs.add(q.x, q.y, q.z, k, { ph: (k % 2) * Math.PI, twinkle: 0.55, s: 0.26, k: 0.42, layer: 'show' });
  }
  // Laptop: open towards the DJ, its lid's back (and lit logo) towards you
  hold(box(grp, 0.46, 0.014, 0.32, -0.13, th + 0.007, 0.12, alu));
  const lid = new THREE.Group(); lid.position.set(-0.13, th + 0.014, -0.04); lid.rotation.x = -0.26; grp.add(lid);
  box(lid, 0.46, 0.3, 0.008, 0, 0.15, 0, alu);
  const lidFace = face(new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshStandardMaterial({ map: lidTexture(), emissiveMap: lidGlowTexture(), emissive: '#ffffff', emissiveIntensity: 0.62, roughness: 0.35, metalness: 0.6 }))); lidFace.position.set(0, 0.15, -0.005); lid.add(lidFace);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), kit.glow('#bcd4ff', 1.1, 'practical')); scr.position.set(0, 0.15, 0.005); lid.add(scr);
  lid.updateMatrixWorld(true);
  back.push(boxSolidIn(lid, -0.23, 0, -0.01, 0.23, 0.3, 0.01)); front.push(back[back.length - 1]);
  // Controller: body with its mixer printed on top, two jog wheels, eight pads
  hold(box(grp, 0.54, 0.045, 0.3, 0.43, th + 0.0225, -0.05, std('#16161a', 0.5, 0.3)));
  const ctop = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.3), textured(controllerTexture(), 0.5, 0.2)); ctop.rotation.x = -Math.PI / 2; ctop.position.set(0.43, th + 0.046, -0.05); grp.add(ctop);
  const jogs = [0.27, 0.59].map((u, i) => {
    const j = new THREE.Group(); j.position.set(u, th + 0.052, -0.07); j.userData.dynamic = true; grp.add(j);
    cyl(j, 0.075, 0.075, 0.012, 0, 0, 0, std('#2a2b31', 0.3, 0.6), 20);
    box(j, 0.004, 0.004, 0.06, 0, 0.008, 0.03, std('#ffffff', 0.4));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.004, 4, 24), kit.glow(THEMES.traditional.beams[i], 1.6, 'show')); ring.rotation.x = Math.PI / 2; j.add(ring);
    return j;
  });
  const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.032, 0.006, 0.032), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 8), mx = new THREE.Matrix4();
  for (let k = 0; k < 8; k++) pads.setMatrixAt(k, mx.makeTranslation(0.43 - 0.27 + (k < 4 ? 0.2 : 0.8) * 0.54 - 0.06 + (k % 4) * 0.04, th + 0.048, -0.17));
  pads.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(24), 3); grp.add(pads);
  // Diya, jug of chhas, paper cups
  const dy = toVenue(0.72, th, 0.12); kit.flames.add(dy.x, dy.y, dy.z, { s: 0.04, bowl: 'brass' });
  hold(lathe(grp, [[0, 0], [0.065, 0.005], [0.07, 0.04], [0.058, 0.16], [0.05, 0.19], [0.056, 0.205]], -0.62, th, -0.05, steel));
  const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 4, 10, Math.PI), steel); hdl.position.set(-0.55, th + 0.11, -0.05); hdl.rotation.z = -Math.PI / 2; grp.add(hdl);
  hold(cyl(grp, 0.045, 0.034, 0.14, -0.45, th + 0.07, -0.18, std('#f4efe4', 0.7), 10));
  // Headphones put down by the controller, a mic by the laptop, a flight case behind, and the speakers' leads down
  // their stands and across to the table
  const hpM = std('#141418', 0.45, 0.4);
  const hb = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 6, 18, Math.PI), hpM); hb.rotation.x = -Math.PI / 2; hb.position.set(0.3, th + 0.012, 0.21); grp.add(hb);
  [-1, 1].forEach((sd) => { cyl(grp, 0.042, 0.042, 0.03, 0.3 + sd * 0.075, th + 0.015, 0.21, hpM, 14); cyl(grp, 0.034, 0.034, 0.004, 0.3 + sd * 0.075, th + 0.032, 0.21, std('#3a3a40', 0.8), 14); });
  const mic = new THREE.Group(); mic.position.set(-0.56, th + 0.018, 0.2); mic.rotation.y = 0.5; grp.add(mic);
  cyl(mic, 0.016, 0.012, 0.16, 0, 0, 0, hpM, 10, 0, 0, Math.PI / 2);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), std('#9aa0a6', 0.4, 0.8)); ball.position.set(-0.1, 0.004, 0); mic.add(ball);
  const caseM = std('#1a1a1e', 0.6, 0.2), edge = std('#a7acb3', 0.35, 0.8);
  box(grp, 0.5, 0.42, 0.4, -0.78, 0.21, 0.74, caseM);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => box(grp, 0.02, 0.43, 0.02, -0.78 + sx * 0.25, 0.215, 0.74 + sz * 0.2, edge));
  box(grp, 0.52, 0.02, 0.42, -0.78, 0.425, 0.74, edge);
  const leadM = std('#0c0c0e', 0.55, 0.2);
  [-1, 1].forEach((sd) => { const pts = [[sd * 1.28, 1.2, 0.38], [sd * 1.27, 0.6, 0.38], [sd * 1.25, 0.03, 0.42], [sd * 1.0, 0.012, 0.42], [sd * 0.78, 0.012, 0.3], [sd * 0.74, 0.3, 0.3]].map(([a, b, c]) => new THREE.Vector3(a, b, c)); grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.009, 4, false), leadM)); });
  // The stool
  cyl(grp, 0.17, 0.16, 0.04, 0, 0.62, 0.55, std('#3a2a1c', 0.7), 14);
  [0, 1, 2].forEach((k) => { const a = k / 3 * TAU + 0.5; cyl(grp, 0.015, 0.018, 0.64, Math.cos(a) * 0.12, 0.31, 0.55 + Math.sin(a) * 0.12, std('#2a1e14', 0.6, 0.3), 5, Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); });
  // Speakers on tripods
  const woofers = [];
  [-1, 1].forEach((sd) => {
    const x = sd * 1.28, z = 0.2;
    [0, 1, 2].forEach((k) => { const a = k / 3 * TAU + 0.3; cyl(grp, 0.012, 0.012, 1.1, x + Math.cos(a) * 0.14, 0.52, z + Math.sin(a) * 0.14, std('#1b1814', 0.6, 0.4), 5, Math.sin(a) * 0.27, 0, -Math.cos(a) * 0.27); });
    hold(cyl(grp, 0.02, 0.02, 1.25, x, 0.62, z, std('#1b1814', 0.6, 0.4), 6), false);
    hold(box(grp, 0.44, 0.66, 0.34, x, 1.53, z, std('#161414', 0.75)));
    panel(grp, 0.44, 0.66, x, 1.53, z - 0.172, cabMat());
    const w = cyl(grp, 0.12, 0.12, 0.02, x, 1.53 - 0.66 * 0.12, z - 0.17, std('#0b0a0a', 0.6), 16, Math.PI / 2); w.userData.dynamic = true; woofers.push(w);
    const led = toVenue(x + 0.17, 1.83, z - 0.18); kit.bulbs.add(led.x, led.y, led.z, 0, { color: '#6dff9a', k: 0.6, s: 0.18, twinkle: 0, layer: 'show' });
  });
  // The DJ's own lights. A small moving head on each speaker, sweeping a coloured beam over the ground in front, with
  // its spot where it lands; an LED strip under the table's front edge washing the bandhani; uplights at the foot of
  // the bamboo poles. All in the night's colours, and with the show (dark when the music stops).
  const heads = [-1, 1].map((sd) => {
    const x = sd * 1.28, z = 0.2;
    box(grp, 0.22, 0.05, 0.18, x, 1.885, z, std('#141217', 0.5, 0.4));
    const yoke = new THREE.Group(); yoke.position.set(x, 1.91, z); yoke.userData.dynamic = true; grp.add(yoke);
    [-1, 1].forEach((s2) => box(yoke, 0.025, 0.13, 0.12, s2 * 0.085, 0.07, 0, std('#1b1920', 0.5, 0.4)));
    const hd = new THREE.Group(); hd.position.y = 0.09; yoke.add(hd);
    cyl(hd, 0.06, 0.07, 0.13, 0, 0, 0, std('#232027', 0.45, 0.4), 12, Math.PI / 2);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), new THREE.MeshBasicMaterial({ color: '#ffffff' })); lens.position.z = -0.066; lens.rotation.y = Math.PI; hd.add(lens);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2; spot.renderOrder = 2; spot.userData.dynamic = true; root.add(spot);
    return { sd, x, z, yoke, hd, lens, spot, beam: new Beam(root, '#ffffff', 6, 0.2, 0.22), from: toVenue(x, 2.0, z) };
  });
  const strip = box(grp, tw * 2 - 0.04, 0.018, 0.012, 0, th - 0.055, -td - 0.03, new THREE.MeshBasicMaterial({ color: '#ffffff' })); strip.userData.dynamic = true;
  const cloth = toVenue(0, th * 0.45, -td - 0.04); kit.pools.add(cloth.x, cloth.y, cloth.z, tw * 1.1, th * 0.6, '#ffffff', 0.22, { vertical: true, theme: true, layer: 'show' });
  [-1.15, 1.15].forEach((u) => {
    box(grp, 0.14, 0.08, 0.12, u, 0.04, 0.95 - 0.16, std('#141217', 0.5, 0.4));
    const q = toVenue(u, 0.09, 0.95 - 0.22); kit.bigBulbs.add(q.x, q.y, q.z, 0, { k: 0.6, s: 0.3, twinkle: 0, layer: 'show' });
    const w = toVenue(u, 1.3, 0.95 - 0.06); kit.pools.add(w.x, w.y, w.z, 0.35, 1.2, '#ffffff', 0.3, { vertical: true, theme: true, layer: 'show' });
  });
  // Bamboo poles, crossbar, toran, marigolds and the bulbs (or the venue's own frame)
  const pz = 0.95, ph0 = 2.45;
  if (DS) djFrame(ctx, grp, DS.frame, toVenue, hold, pz, ph0);
  else [-1.15, 1.15].forEach((u, pi) => {
    hold(cyl(grp, 0.035, 0.04, ph0, u, ph0 / 2, pz, bamboo, 7), false);
    for (let k = 1; k < 5; k++) cyl(grp, 0.045, 0.045, 0.025, u, k * ph0 / 5, pz, std('#6b5028', 0.9), 7);
    for (let k = 0; k < 18; k++) { const a = k * 1.2 + pi; beads.addIn(grp, u + Math.cos(a) * 0.05, ph0 - 0.1 - k * 0.1, pz + Math.sin(a) * 0.05, MARIGOLD[k % 3], 0.028); }
  });
  if (!DS) {
    hold(cyl(grp, 0.03, 0.03, 2.4, 0, ph0, pz, bamboo, 7, 0, 0, Math.PI / 2), false);
    for (let k = 0; k < 13; k++) { const q = toVenue(lerp(-1.15, 1.15, (k + 0.5) / 13), ph0 - 0.01, pz - 0.02); kit.flags.add(q.x, q.y, q.z, 0, 0.14, k); }
    for (let k = 0; k <= 10; k++) { const u = k / 10, q = toVenue(lerp(-1.15, 1.15, u), ph0 - 0.35 - Math.sin(u * Math.PI) * 0.28, pz - 0.03); kit.bulbs.add(q.x, q.y, q.z, k, { ph: k * 1.7, s: 1.0 }); }
    kit.wires.cable(toVenue(-1.15, ph0 - 0.32, pz - 0.03).toArray(), toVenue(1.15, ph0 - 0.32, pz - 0.03).toArray(), 0.28);
  }
  // The warm light of the bulbs on the ground round the booth
  const gp = toVenue(0, 0, 0.4); kit.pools.add(gp.x, 0.02, gp.z, 2.4, 2.0, LIGHT.tungsten, 0.16, { layer: 'festive' });
  holder.hole3d = { back, front };
  return {
    update(t, c) {
      const { reduce, beat, lv, TH, pulse } = c;
      jogs.forEach((j, i) => { j.rotation.y = reduce ? 0 : t * 3 * (i ? -1 : 1); });
      const a = pads.instanceColor.array, off = new THREE.Color('#2a2a30');
      for (let k = 0; k < 8; k++) { const on = (Math.floor(beat * 2) + k) % 4 === 0, cc = on ? new THREE.Color(TH.beams[k % TH.beams.length]).multiplyScalar(2.2 * lv.show) : off; a[k * 3] = cc.r; a[k * 3 + 1] = cc.g; a[k * 3 + 2] = cc.b; }
      pads.instanceColor.needsUpdate = true;
      woofers.forEach((w) => { const s = 1 + (reduce ? 0 : 0.08 * pulse); w.scale.set(s, 1, s); });
      strip.material.color.copy(hsl(TH.hues[Math.floor(t * 0.7) % TH.hues.length] + 25 * Math.sin(t * TH.speed), TH.sat, 50)).multiplyScalar((1.1 + 0.6 * pulse) * lv.show);
      heads.forEach((h, i) => {
        const tt = reduce ? 0.6 : t * (0.45 + TH.speed * 0.5), sw = Math.sin(tt + i * 2.4), sv = Math.sin(tt * 0.7 + i), to = toVenue(h.sd * (3.2 + 1.6 * sw), 0.02, -1.2 - 2.2 * (0.5 + 0.5 * sv));
        h.yoke.rotation.y = -h.sd * (0.9 + 0.35 * sw); h.hd.rotation.x = -0.55 - sv * 0.2;
        const hex = TH.beams[(i + Math.floor(t / 6)) % TH.beams.length], k = lv.show * (0.85 + 0.4 * pulse);
        h.beam.aim(h.from.toArray(), [to.x, to.y, to.z]); h.beam.set(hex, k);
        h.lens.material.color.set(hex).multiplyScalar(2.2 * lv.show);
        h.spot.position.set(to.x, 0.025, to.z); h.spot.scale.setScalar(0.75); h.spot.material.color.set(hex); h.spot.material.opacity = 0.32 * k; h.spot.visible = k > 0.02;
      });
    }
  };
}

/* ---------- round the DJ: the cooler, crates of cold drinks, stacked chairs, a chair and some stones ---------- */
function djProp(ctx, o) {
  const { root, chairs, beads } = ctx, back = [];
  const hold = (m) => { back.push(solidOf(m)); return m; };
  if (o.kind === 'cooler') {
    hold(box(root, 0.5, 0.5, 0.42, o.x, 0.25, o.z + 0.2, std('#3a2a1c', 0.85)));
    hold(cyl(root, 0.25, 0.25, 0.58, o.x, 0.79, o.z + 0.2, std('#2f6fb4', 0.35, 0.05), 18));
    [0.62, 0.96].forEach((y) => cyl(root, 0.255, 0.255, 0.02, o.x, y, o.z + 0.2, std('#23548a', 0.4), 18));
    cyl(root, 0.012, 0.012, 0.08, o.x, 0.6, o.z - 0.07, std('#c9ccd1', 0.25, 0.9), 6, Math.PI / 2);
    cyl(root, 0.035, 0.03, 0.08, o.x + 0.12, 0.54, o.z - 0.05, std('#c9ccd1', 0.25, 0.9), 8);
  } else if (o.kind === 'crates') {
    [0, 1].forEach((cr) => {
      const y0 = cr * 0.28, xo = cr * 0.04;
      hold(box(root, 0.6, 0.27, 0.4, o.x + xo, y0 + 0.135, o.z + 0.2, std(cr ? '#a8201a' : '#8c1a15', 0.6)));
      for (let k = 0; k < 12; k++) beads.add(o.x + xo - 0.24 + (k % 6) * 0.095, y0 + 0.28, o.z + 0.08 + Math.floor(k / 6) * 0.22, k % 2 ? '#e8b04b' : '#d8453a', 0.022);
    });
  } else if (o.kind === 'chairs') {
    for (let k = 0; k < 5; k++) { const s = chairs.add(o.x, o.z, 0, '#ece6da', k * 0.09); back.push(s.seat, s.back); }
  } else if (o.kind === 'plasticChair') {
    const s = chairs.add(o.x, o.z, 0, o.col); back.push(s.seat, s.back);
  } else if (o.kind === 'stone') {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(o.r, 0), std('#6d6259', 0.95)); m.scale.set(1, 0.6, 0.85); m.position.set(o.x, o.r * 0.3, o.z); m.rotation.y = o.x * 3; root.add(m); back.push(solidOf(m));
  }
  o.hole3d = { back };
}

/* ---------- props at the edges ---------- */
function prop(ctx, o) {
  const { kit, root, rides, beads } = ctx;
  if (o.kind === 'scooter' || o.kind === 'activa' || o.kind === 'bike') {
    const solids = rides.add(o.kind === 'bike' ? 'bike' : 'scooter', o.x, o.z, -o.side, o.col);
    // Beyond the walkway (the ground's scooters stand outside it), nothing of the 2D scene is ever behind one
    o.hole3d = { back: ctx.id === 'outdoors' ? [] : solids };
    return;
  }
  if (o.kind === 'van') { o.hole3d = { back: van(ctx, o) }; return; }
  if (o.kind === 'tulsi') {
    // A painted planter up on the otla, the tulsi in it, and the evening's diya beside it
    const sd = Math.sign(o.x) || 1, y = 0.45, back = [];
    back.push(solidOf(box(root, 0.42, 0.5, 0.42, o.x, y + 0.25, o.z, std('#9a5328', 0.85))));
    box(root, 0.43, 0.05, 0.43, o.x, y + 0.4, o.z, std('#e8b04b', 0.6));
    box(root, 0.46, 0.04, 0.46, o.x, y + 0.52, o.z, std('#7a3e1c', 0.85));
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, r = k ? 0.13 : 0; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(k ? 0.13 : 0.17, 1), std(k % 2 ? '#2f6b33' : '#24552a', 0.9, 0, { flatShading: true })); m.position.set(o.x + Math.cos(a) * r, y + 0.72 + (k ? 0 : 0.1), o.z + Math.sin(a) * r); root.add(m); }
    back.push(boxSolid(o.x - 0.3, y + 0.5, o.z - 0.3, o.x + 0.3, y + 0.98, o.z + 0.3));
    kit.flames.add(o.x - sd * 0.3, y, o.z - 0.1, { s: 0.04 });
    o.hole3d = { back };
    return;
  }
  if (o.kind === 'tent') { tent(ctx, o); o.hole3d = { back: [] }; }
}
function van(ctx, o) {
  const { kit, root } = ctx, x0 = o.x - 0.72, x1 = o.x + 0.72, z0 = o.z - 1.9, z1 = o.z + 1.9, b = 0.28, top = 1.9, back = [];
  // An Eeco-style family van in a soft silver-white (not a glaring white box), with a maroon band along its sides
  const paint = std('#c9ccc8', 0.38, 0.35), glass = std('#1f2730', 0.08, 0.6), grp = placed(root, 0, 0, 0);
  back.push(solidOf(box(grp, x1 - x0, top - b, z1 - 0.45 - z0, o.x, (top + b) / 2, (z0 + z1 - 0.45) / 2, paint)));
  back.push(solidOf(box(grp, x1 - x0, 1.05 - b, 0.45, o.x, (1.05 + b) / 2, z1 - 0.225, paint)));
  // The windscreen sloping from the bonnet up to the roof
  box(grp, x1 - x0 - 0.04, Math.hypot(0.45, 0.85), 0.04, o.x, 1.475, z1 - 0.225, glass, -Math.atan2(0.45, 0.85));
  back.push(boxSolid(x0, 1.05, z1 - 0.45, x1, top, z1));
  // Side windows, the back window, tail lights, the plate and the bumpers
  [-1, 1].forEach((sd) => { const x = sd < 0 ? x0 - 0.003 : x1 + 0.003; box(grp, 0.004, 0.57, z1 - 0.9 - z0 - 0.25, x, 1.435, (z0 + 0.25 + z1 - 0.9) / 2, glass); box(grp, 0.006, 0.14, z1 - z0, x, b + 0.07, o.z, std('#9a9c98', 0.6)); });
  box(grp, x1 - x0 - 0.28, 0.6, 0.004, o.x, 1.45, z0 - 0.003, glass);
  [x0 + 0.13, x1 - 0.13].forEach((lx) => box(grp, 0.14, 0.33, 0.01, lx, 0.785, z0 - 0.005, std('#a51d1a', 0.3)));
  box(grp, 0.48, 0.12, 0.01, o.x, 0.56, z0 - 0.006, std('#f2cf3e', 0.5));
  box(grp, x1 - x0 + 0.04, 0.17, 0.08, o.x, 0.37, z0 - 0.03, std('#3a3b3d', 0.7));
  box(grp, x1 - x0 + 0.04, 0.17, 0.08, o.x, 0.37, z1 + 0.03, std('#3a3b3d', 0.7));
  [[z0 + 0.65], [z1 - 0.7]].forEach(([wz]) => [x0 + 0.02, x1 - 0.02].forEach((wx) => { back.push(solidOf(cyl(grp, 0.3, 0.3, 0.18, wx, 0.3, wz, std('#141414', 0.8), 16, 0, 0, Math.PI / 2))); cyl(grp, 0.15, 0.15, 0.19, wx, 0.3, wz, std('#8f9398', 0.4, 0.6), 10, 0, 0, Math.PI / 2); }));
  // Its band, the seams of the doors (the sliding door's rail), handles and mirrors
  const dark = std('#1c1d20', 0.6), chrome = std('#b9bdc2', 0.25, 0.8), band = std('#7a2a2a', 0.45, 0.2);
  [-1, 1].forEach((sd) => {
    const x = sd < 0 ? x0 - 0.004 : x1 + 0.004;
    box(grp, 0.006, 0.09, z1 - z0 - 0.1, x, 0.86, o.z, band);
    [z1 - 0.95, o.z - 0.25].forEach((sz) => box(grp, 0.006, 1.2, 0.012, x, 0.95, sz, dark));
    box(grp, 0.006, 0.012, z1 - 0.95 - (o.z - 0.25), x, 1.62, (z1 - 0.95 + o.z - 0.25) / 2, dark);
    [z1 - 1.05, o.z - 0.12].forEach((hz) => box(grp, 0.02, 0.03, 0.12, x + sd * 0.01, 1.08, hz, chrome));
    box(grp, 0.12, 0.1, 0.05, x + sd * 0.07, 1.3, z1 - 0.48, dark);
  });
  // The front: grille, headlights, indicator lamps and its plate
  box(grp, x1 - x0 - 0.5, 0.16, 0.012, o.x, 0.72, z1 + 0.006, dark);
  [x0 + 0.17, x1 - 0.17].forEach((lx) => { box(grp, 0.22, 0.14, 0.012, lx, 0.74, z1 + 0.007, std('#e9ecef', 0.15, 0.4, { emissive: '#fff4d6', emissiveIntensity: 0.15 })); box(grp, 0.08, 0.06, 0.012, lx, 0.6, z1 + 0.007, std('#e88a2a', 0.3)); });
  box(grp, 0.48, 0.12, 0.01, o.x, 0.5, z1 + 0.012, std('#f2f2ee', 0.5));
  // A roof rack, with a bundle tied under a blue tarp
  [z0 + 0.4, o.z, z1 - 0.7].forEach((rz) => box(grp, x1 - x0 - 0.1, 0.03, 0.04, o.x, top + 0.06, rz, dark));
  [-1, 1].forEach((sd) => box(grp, 0.03, 0.03, z1 - 0.7 - (z0 + 0.4), o.x + sd * (x1 - x0 - 0.14) / 2, top + 0.09, (z0 + 0.4 + z1 - 0.7) / 2, dark));
  box(grp, x1 - x0 - 0.4, 0.26, 1.1, o.x, top + 0.22, o.z - 0.3, std('#2c5d9b', 0.85));
  // A street lamp's light catches its roof
  kit.pools.add(o.x, top + 0.01, o.z, 0.9, 1.8, LIGHT.sodium, 0.08, { layer: 'practical', live: true });
  return back;
}
function tent(ctx, o) {
  const { kit, root } = ctx, grp = placed(root, o.x, o.z, 0), w = 8, d = 5, h = 3.2, apex = 4.6;
  const stripes = canvasTexture(256, 64, (g, W, H) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#f3e6d0' : o.col; g.fillRect(k / 8 * W, 0, W / 8 + 1, H); } });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2, apex - h, 4, 1, true), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9, side: THREE.DoubleSide }));
  roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.hypot(w, d), 1, d / Math.hypot(w, d)); roof.position.set(0, (apex + h) / 2, d / 2); grp.add(roof);
  box(grp, w, h, 0.05, 0, h / 2, d, std('#e9dcc2', 0.9, 0, { emissive: '#ffb870', emissiveIntensity: 0.25 }));
  [-1, 1].forEach((sd) => box(grp, 0.05, h, d, sd * w / 2, h / 2, d / 2, std('#e9dcc2', 0.9)));
  [[-w / 2, 0], [w / 2, 0], [-w / 2, d], [w / 2, d]].forEach(([u, v]) => cyl(grp, 0.05, 0.05, h, u, h / 2, v, std('#2a1a10', 0.8), 6));
  for (let k = 0; k <= 8; k++) { const q = new THREE.Vector3(lerp(-w / 2, w / 2, k / 8), h - 0.05, -0.05).applyMatrix4(grp.matrixWorld); kit.bulbs.add(q.x, q.y, q.z, k, { ph: k }); }
  const inside = new THREE.Vector3(0, 1.6, d - 0.1).applyMatrix4(grp.matrixWorld);
  kit.pools.add(inside.x, inside.y, inside.z, w * 0.45, 1.8, LIGHT.tungsten, 0.3, { vertical: true, layer: 'practical' });
  kit.pools.add(o.x, 0.02, o.z + d / 2, w * 0.6, d, LIGHT.tungsten, 0.2, { layer: 'practical' });
}

/* ---------- chairs, benches and steps where people sit and stand ---------- */
function seat(ctx, se) {
  if (se.kind) return; // otlas are the houses', and the ground is the ground
  const s = ctx.chairs.add(se.x, se.z, se.side * Math.PI / 2, se.col);
  se.hole3d = { back: [s.seat, s.back, s.arms] };
}
function galleryItem(ctx, ga) {
  const { root, chairs } = ctx;
  if (ga.kind === 'chair') {
    // Rows facing the stage: the chair's back is between you and its sitter
    const s = chairs.add(ga.x, ga.z, Math.PI, ga.col);
    ga.hole3d = { back: [s.seat, s.back, s.arms], front: [s.back] };
  } else if (ga.kind === 'benchPlank') {
    const wood = std('#6b3f1f', 0.8), back = [];
    back.push(solidOf(box(root, ga.w + 0.4, 0.05, 0.44, ga.x, 0.425, ga.z, wood)));
    [-1, 1].forEach((sd) => back.push(solidOf(box(root, 0.06, 0.42, 0.4, ga.x + sd * ga.w / 2, 0.21, ga.z, std('#3b2213', 0.8)))));
    ga.hole3d = { back };
  } else if (ga.kind === 'step') {
    // A concrete step, its yellow nosing and joints; the steps below it hide its foot. Step lights at the aisles and
    // both ends light each tread, and the concrete keeps a little of the hall's light, so the stand reads in the dark.
    const { kit } = ctx;
    box(root, ga.w * 2, ga.y, 1.12, ga.x, ga.y / 2, ga.z - 0.44, stepMat(kit));
    box(root, ga.w * 2, 0.006, 0.05, ga.x, ga.y + 0.003, ga.z + 0.05, nosingMat(kit));
    for (let jx = -ga.w + 2.4; jx < ga.w; jx += 2.4) box(root, 0.02, 0.004, 1.1, ga.x + jx, ga.y + 0.002, ga.z - 0.45, std('#17131b', 0.95));
    [-ga.w + 0.3, 0, ga.w - 0.3].forEach((x) => {
      kit.bulbs.add(ga.x + x, ga.y - 0.1, ga.z + 0.125, 0, { color: LIGHT.amber, k: 0.8, s: 0.5, twinkle: 0, layer: 'architectural' });
      kit.pools.add(ga.x + x, ga.y + 0.008, ga.z + 0.6, 1.3, 0.55, LIGHT.amber, 0.22, { layer: 'architectural', live: true });
    });
    ga.hole3d = { back: [] };
  }
}

// (one of each per venue, so each venue's kit dims its own)
const stepMat = (kit) => kit.stepMat || (kit.stepMat = kit.selfLit(new THREE.MeshStandardMaterial({ color: '#2c2734', emissive: '#2c2734', roughness: 0.92 }), 0.55, 'architectural'));
const nosingMat = (kit) => kit.nosingMat || (kit.nosingMat = kit.selfLit(new THREE.MeshStandardMaterial({ color: '#8a6f2c', emissive: '#8a6f2c', roughness: 0.8 }), 0.12, 'architectural'));

/* ---------- everything, for one venue ---------- */
// data: the 2D scene's layout objects (stalls, props, seats, gallery, dj with its props, stage holder)
export function buildFurnish(kit, root, id, data) {
  const ctx = { kit, root, id, beads: new Beads(), chairs: new Chairs(), rides: new Rides() };
  const updaters = [];
  (data.stalls || []).forEach((sl) => stall(ctx, sl));
  if (data.dj) { updaters.push(djBooth(ctx, data.dj)); (data.dj.life || []).forEach((o) => djProp(ctx, o)); }
  (data.props || []).forEach((o) => prop(ctx, o));
  (data.seats || []).forEach((se) => seat(ctx, se));
  (data.gallery || []).forEach((ga) => galleryItem(ctx, ga));
  ctx.beads.build(root); ctx.chairs.build(root); ctx.rides.build(root);
  return { update(t, c) { updaters.forEach((u) => u.update(t, c)); } };
}
