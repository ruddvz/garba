// The band's fixed gear, built in 3D where the 2D scene places each player (BAND in util.js mirrors the plan in
// venue-scene.js): the drum kit on its own riser, the keyboard on an X-stand (two tiers on a big stage) with the
// octapad beside it that every Garba band plays and a tablet of lyrics on a gooseneck, the tabla on a gaddi with its
// bolster, the guitar and bass amps, a mic on a boom for the dhol, a monitor wedge before each standing player and
// before the singers, a spare guitar on a stand, a bottle of water and a taped set list by each player; on a stage
// that says where its back is, the cables run across the boards to a stage box there and par cans light the back.
// What the players hold (the dhol, the guitars, the sticks) is drawn by the 2D scene with them.
//
// Each instrument that stands between you and its player (the kit, the keyboard, the tabla) leaves its outline, by
// role, for the 2D scene to cut out of the player once it has drawn them.

import * as THREE from 'three';
import { TAU, canvasTexture, face, solidOf, boxSolid } from './util.js';
import { std } from './kit.js';

function mesh(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m; }
const box = (parent, w, h, d, x, y, z, mat, rx, ry, rz) => mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
const cyl = (parent, r0, r1, h, x, y, z, mat, seg = 16, rx, ry, rz) => mesh(parent, new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z, rx, ry, rz);

const M = {
  shell: () => std('#6b1420', 0.35, 0.3), chrome: () => std('#b9bcc2', 0.3, 0.85), brass: () => std('#b88a34', 0.42, 0.8),
  head: () => std('#cfc4ad', 0.6), black: () => std('#141416', 0.5, 0.3), wood: () => std('#7a3f1c', 0.45, 0.1)
};

let kickTex = null;
function kickHead() {
  if (kickTex) return kickTex;
  kickTex = canvasTexture(256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#c9bda4'; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
    g.strokeStyle = '#8e1b2c'; g.lineWidth = 14; g.beginPath(); g.arc(c, c, c - 10, 0, TAU); g.stroke();
    g.translate(c, c);
    for (let k = 0; k < 12; k++) { g.save(); g.rotate(k / 12 * TAU); g.fillStyle = k % 2 ? '#c9963f' : '#8e1b2c'; g.beginPath(); g.ellipse(52, 0, 30, 11, 0, 0, TAU); g.fill(); g.restore(); }
    g.fillStyle = '#c9963f'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
  });
  return kickTex;
}
let keysTex = null;
function keysTop() {
  if (keysTex) return keysTex;
  keysTex = canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#16161a'; g.fillRect(0, 0, w, h);
    // Panel: a lit screen and knobs at the back, the keys along the front (the player's side)
    g.fillStyle = '#7fd0ff'; g.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.18);
    g.fillStyle = '#8c8f96'; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(w * (0.08 + k * 0.03), h * 0.2, 4, 0, TAU); g.fill(); g.beginPath(); g.arc(w * (0.66 + k * 0.03), h * 0.2, 4, 0, TAU); g.fill(); }
    const k0 = h * 0.45, n = 52;
    g.fillStyle = '#f2efe6'; g.fillRect(w * 0.02, k0, w * 0.96, h * 0.5);
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 1; k < n; k++) g.fillRect(w * 0.02 + w * 0.96 * k / n, k0, 1, h * 0.5);
    g.fillStyle = '#111'; for (let k = 0; k < n; k++) if ([0, 1, 3, 4, 5].indexOf(k % 7) >= 0) g.fillRect(w * 0.02 + w * 0.96 * (k + 0.68) / n, k0, w * 0.96 / n * 0.6, h * 0.3);
  });
  return keysTex;
}
let padT = null;
// The octapad's top: eight rubber pads in two rows, each rimmed in its colour, and the little lit display
function padTop() {
  if (padT) return padT;
  padT = canvasTexture(256, 160, (g, w, h) => {
    g.fillStyle = '#18181c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff8a3a'; g.fillRect(w * 0.4, h * 0.05, w * 0.2, h * 0.11);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const x = w * (0.05 + c * 0.23), y = h * (0.24 + r * 0.38), pw = w * 0.21, ph = h * 0.33;
      g.fillStyle = '#2e2e34'; g.fillRect(x, y, pw, ph);
      g.strokeStyle = ['#e8b04b', '#d8453a', '#3a8fe0', '#3cbf7a'][c]; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, pw - 6, ph - 6);
    }
  });
  return padT;
}
let lyricT = null;
// The keys player's tablet: the song's words, a line lit as it's sung
function lyricScreen() {
  if (lyricT) return lyricT;
  lyricT = canvasTexture(128, 96, (g, w, h) => {
    g.fillStyle = '#0c1018'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd08a'; g.fillRect(10, 10, 56, 6);
    for (let y = 26, i = 0; y < h - 8; y += 11, i++) { g.fillStyle = i === 2 ? '#ffffff' : 'rgba(200,210,235,.6)'; g.fillRect(10, y, 34 + ((i * 41) % 66), 5); }
  });
  return lyricT;
}
let grilleT = null;
const grille = () => grilleT || (grilleT = new THREE.MeshStandardMaterial({ roughness: 0.85, map: canvasTexture(128, 128, (g, w, h) => {
  g.fillStyle = '#141313'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 5; y < h - 5; y += 5) for (let x = 5; x < w - 5; x += 5) g.fillRect(x, y, 1.5, 1.5);
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h * 0.58, w * 0.3, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(232,176,75,.7)'; g.fillRect(w * 0.38, h * 0.08, w * 0.24, 5);
}) }));

// A cabinet (amp, cab, wedge) facing the audience (-Z), its grille on the front
function cabinet(parent, w, h, d, x, y, z, rx = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx; parent.add(g);
  box(g, w, h, d, 0, h / 2, 0, std('#1a1818', 0.75));
  face(mesh(g, new THREE.PlaneGeometry(w * 0.92, h * 0.88), grille(), 0, h / 2, -d / 2 - 0.003));
  return g;
}

/* ---------- each player's gear ---------- */
function drums(ctx, x, z) {
  const { kit, root, floor } = ctx, out = [], hold = (m) => { out.push(solidOf(m)); return m; };
  const yb = floor + 0.3, shell = M.shell(), chrome = M.chrome(), brass = M.brass();
  // The drum riser, carpeted, with a line of light along its front
  box(root, 2.3, 0.3, 2.0, x, floor + 0.15, z - 0.5, std('#1c1414', 0.8));
  box(root, 2.2, 0.01, 1.9, x, yb + 0.005, z - 0.5, std('#4a1420', 0.95));
  const strip = mesh(root, new THREE.PlaneGeometry(2.3, 0.03), kit.glow('#ffb46a', 1.2, 'show'), x, floor + 0.26, z - 1.505); face(strip);
  // Throne
  cyl(root, 0.17, 0.16, 0.08, x, yb + 0.52, z + 0.05, M.black(), 16); cyl(root, 0.025, 0.025, 0.5, x, yb + 0.25, z + 0.05, chrome, 6);
  // Kick drum, its printed front head and hoops
  hold(cyl(root, 0.28, 0.28, 0.42, x, yb + 0.29, z - 0.72, shell, 24, Math.PI / 2));
  face(mesh(root, new THREE.CircleGeometry(0.27, 28), new THREE.MeshStandardMaterial({ map: kickHead(), roughness: 0.6 }), x, yb + 0.29, z - 0.935));
  [-0.935, -0.505].forEach((dz) => { const h = mesh(root, new THREE.TorusGeometry(0.285, 0.014, 5, 24), chrome, x, yb + 0.29, z + dz); h.rotation.set(0, 0, 0); });
  // Rack toms on the kick, tilted to the drummer; the snare and floor tom on their stands
  [[-0.17, 0.13], [0.17, 0.12]].forEach(([dx, r]) => { const t = hold(cyl(root, r, r, 0.2, x + dx, yb + 0.8, z - 0.6, shell, 18, 0.35)); cyl(root, r * 1.02, r * 1.02, 0.012, x + dx, yb + 0.8 + 0.1 * Math.cos(0.35), z - 0.6 + 0.1 * Math.sin(0.35), M.head(), 18, 0.35); cyl(root, 0.012, 0.012, 0.25, x + dx * 0.5, yb + 0.62, z - 0.66, chrome, 5); });
  hold(cyl(root, 0.18, 0.18, 0.13, x - 0.42, yb + 0.62, z - 0.3, chrome, 20, 0.1)); cyl(root, 0.18, 0.18, 0.01, x - 0.42, yb + 0.69, z - 0.29, M.head(), 20, 0.1);
  [0, 1, 2].forEach((k) => { const a = k / 3 * TAU; cyl(root, 0.01, 0.01, 0.6, x - 0.42 + Math.cos(a) * 0.1, yb + 0.28, z - 0.3 + Math.sin(a) * 0.1, chrome, 4, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); });
  hold(cyl(root, 0.2, 0.2, 0.38, x + 0.45, yb + 0.42, z - 0.28, shell, 20)); cyl(root, 0.2, 0.2, 0.01, x + 0.45, yb + 0.615, z - 0.28, M.head(), 20);
  [0, 1, 2].forEach((k) => { const a = k / 3 * TAU + 0.5; cyl(root, 0.01, 0.01, 0.3, x + 0.45 + Math.cos(a) * 0.2, yb + 0.15, z - 0.28 + Math.sin(a) * 0.2, chrome, 4); });
  // Hi-hat, crash and ride on their stands
  cyl(root, 0.012, 0.012, 0.95, x - 0.74, yb + 0.47, z - 0.22, chrome, 5);
  hold(cyl(root, 0.17, 0.17, 0.012, x - 0.74, yb + 0.93, z - 0.22, brass, 22)); cyl(root, 0.17, 0.17, 0.012, x - 0.74, yb + 0.96, z - 0.22, brass, 22);
  cyl(root, 0.012, 0.012, 1.4, x - 0.66, yb + 0.7, z - 0.8, chrome, 5);
  hold(cyl(root, 0.24, 0.24, 0.01, x - 0.62, yb + 1.45, z - 0.74, brass, 24, 0.3, 0, 0.2));
  cyl(root, 0.012, 0.012, 1.2, x + 0.7, yb + 0.6, z - 0.66, chrome, 5);
  hold(cyl(root, 0.27, 0.27, 0.01, x + 0.66, yb + 1.25, z - 0.62, brass, 24, 0.3, 0, -0.2));
  // A mic on the kick and one over the kit
  cyl(root, 0.03, 0.02, 0.15, x + 0.1, yb + 0.15, z - 1.02, M.black(), 8, Math.PI / 2);
  return out;
}
function keys(ctx, x, z) {
  const { root, floor } = ctx, out = [], kz = z - 0.36, ky = floor + 0.92, black = M.black();
  // The X-stand: a pair of crossed bars at each end, and the keyboard on it
  [-0.45, 0.45].forEach((dx) => { [0.5, -0.5].forEach((a) => out.push(solidOf(box(root, 0.035, 1.02, 0.035, x + dx, floor + 0.44, kz, black, a)))); box(root, 0.04, 0.03, 0.62, x + dx, floor + 0.015, kz, black); });
  const body = box(root, 1.28, 0.1, 0.36, x, ky, kz, black);
  // A brushed strip along its front with the maker's badge
  face(mesh(root, new THREE.PlaneGeometry(1.2, 0.05), std('#5a5d66', 0.35, 0.8), x, ky - 0.01, kz - 0.182));
  const top = mesh(root, new THREE.PlaneGeometry(1.26, 0.34), new THREE.MeshStandardMaterial({ map: keysTop(), roughness: 0.5 }), x, ky + 0.051, kz);
  top.rotation.x = -Math.PI / 2;
  out.push(solidOf(body));
  // On a big stage a second keyboard over the first, on the stand's upper arms, tipped towards the player
  if (!ctx.small) {
    [-0.45, 0.45].forEach((dx) => box(root, 0.03, 0.34, 0.03, x + dx, ky + 0.2, kz + 0.06, black));
    const up = box(root, 1.04, 0.07, 0.28, x, ky + 0.38, kz + 0.06, black, 0.18);
    const ut = mesh(root, new THREE.PlaneGeometry(1.0, 0.26), new THREE.MeshStandardMaterial({ map: keysTop(), roughness: 0.5 }), x, ky + 0.38 + 0.036 * Math.cos(0.18), kz + 0.06 + 0.036 * Math.sin(0.18));
    ut.rotation.x = -Math.PI / 2 + 0.18;
    out.push(solidOf(up));
  }
  // The octapad beside the keyboard on its own post, its pads tipped up to the player
  const px = Math.min(x + 0.88, ctx.x1 - 0.28), chrome = M.chrome(), py = floor + 0.96;
  cyl(root, 0.014, 0.014, 0.92, px, floor + 0.46, kz + 0.1, chrome, 6);
  [0, 1, 2].forEach((k) => { const a = k / 3 * TAU + 0.4; cyl(root, 0.008, 0.008, 0.32, px + Math.cos(a) * 0.11, floor + 0.12, kz + 0.1 + Math.sin(a) * 0.11, chrome, 4, Math.sin(a) * 0.85, 0, -Math.cos(a) * 0.85); });
  const pad = new THREE.Group(); pad.position.set(px, py, kz + 0.1); pad.rotation.x = 0.38; root.add(pad);
  out.push(solidOf(box(pad, 0.44, 0.05, 0.3, 0, 0, 0, black)));
  const pt = mesh(pad, new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshStandardMaterial({ map: padTop(), roughness: 0.7 }), 0, 0.026, 0); pt.rotation.x = -Math.PI / 2;
  // The tablet of lyrics on a gooseneck from the stand, lit, facing the player
  cyl(root, 0.006, 0.006, 0.3, x - 0.52, ky + 0.2, kz - 0.06, black, 4, 0.25);
  const tab = new THREE.Group(); tab.position.set(x - 0.52, ky + 0.42, kz - 0.02); tab.rotation.x = -0.3; root.add(tab);
  box(tab, 0.21, 0.15, 0.012, 0, 0, 0, black);
  mesh(tab, new THREE.PlaneGeometry(0.19, 0.13), ctx.kit.litMap(lyricScreen(), 0.9, 'practical'), 0, 0, 0.0065);
  // The sustain pedal at his right foot, its lead back to the keyboard
  box(root, 0.09, 0.03, 0.2, x + 0.22, floor + 0.015, z - 0.05, black, 0.08);
  return out;
}
function tabla(ctx, x, z) {
  const { root, floor } = ctx, out = [];
  // The gaddi: a white mattress with a maroon edge, and the round bolster behind
  box(root, 1.2, 0.1, 1.1, x, floor + 0.05, z + 0.05, std('#ece6d6', 0.95));
  box(root, 1.22, 0.02, 1.12, x, floor + 0.01, z + 0.05, std('#7e1827', 0.9));
  cyl(root, 0.13, 0.13, 0.9, x, floor + 0.23, z + 0.52, std('#b8312b', 0.85), 14, 0, 0, Math.PI / 2);
  // The bayan (metal, on the left) and the dayan (wood, on the right) on their cloth rings, heads cream with black
  const bz = z - 0.32, top = floor + 0.1;
  [[-0.16, 0.1], [0.14, 0.075]].forEach(([dx, r]) => { const ring = mesh(root, new THREE.TorusGeometry(r * 0.9, 0.025, 5, 16), std('#7e1827', 0.9), x + dx, top + 0.02, bz); ring.rotation.x = Math.PI / 2; });
  const bayan = mesh(root, new THREE.LatheGeometry([[0, 0], [0.07, 0.01], [0.12, 0.07], [0.12, 0.14], [0.1, 0.2]].map(([a, b]) => new THREE.Vector2(a, b)), 18), std('#9aa0a6', 0.25, 0.85), x - 0.16, top + 0.02, bz);
  const dayan = cyl(root, 0.075, 0.085, 0.25, x + 0.14, top + 0.145, bz, M.wood(), 16);
  cyl(root, 0.1, 0.1, 0.008, x - 0.16, top + 0.225, bz, M.head(), 18); cyl(root, 0.075, 0.075, 0.008, x + 0.14, top + 0.272, bz, M.head(), 16);
  cyl(root, 0.035, 0.035, 0.01, x - 0.19, top + 0.229, bz, M.black(), 12); cyl(root, 0.028, 0.028, 0.01, x + 0.14, top + 0.276, bz, M.black(), 12);
  out.push(solidOf(bayan), solidOf(dayan));
  // A mic on a short boom over them
  cyl(root, 0.012, 0.012, 0.75, x + 0.42, top + 0.37, bz + 0.1, M.black(), 5);
  cyl(root, 0.01, 0.01, 0.4, x + 0.25, top + 0.72, bz, M.black(), 5, 0, 0, Math.PI / 2 - 0.3);
  return out;
}
// A monitor wedge on the floor before a player: tall on the audience's side, its face sloping down towards him with
// the grille on it
let wedgeG = null, wedgeM = null;
const WEDGE_TILT = Math.atan2(0.21, 0.34);
// (s scales it: 1 is a small wedge, 0.46 m wide; the big stages' are 1.3)
export function monitorWedge(root, x, y, z, s = 1) {
  if (!wedgeG) { const sh = new THREE.Shape([[-0.17, 0], [0.17, 0], [0.17, 0.09], [-0.17, 0.3]].map(([u, v]) => new THREE.Vector2(u, v))); wedgeG = new THREE.ExtrudeGeometry(sh, { depth: 0.46, bevelEnabled: false }); wedgeG.rotateY(-Math.PI / 2); wedgeG.translate(0.23, 0, 0); wedgeM = std('#26262c', 0.45, 0.35); }
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); root.add(g);
  const w = mesh(g, wedgeG, wedgeM, 0, 0, 0);
  const gr = mesh(g, new THREE.PlaneGeometry(0.4, 0.34), grille(), 0, 0.195 + 0.004 * Math.cos(WEDGE_TILT), 0.004 * Math.sin(WEDGE_TILT));
  gr.rotation.x = -(Math.PI / 2 - WEDGE_TILT);
  return w;
}
function wedge(ctx, x, z) {
  ctx.kit.bulbs.add(x + 0.16, ctx.floor + 0.25, z - 0.176, 0, { color: '#5aa8ff', k: 0.5, s: 0.12, twinkle: 0, layer: 'show' });
  return solidOf(monitorWedge(ctx.root, x, ctx.floor, z));
}
// A mic on a boom stand, its head at (hx, hy, hz), its base at (x, z)
function boomMic(ctx, x, z, hx, hy, hz) {
  const { root, floor } = ctx, black = M.black(), H = hy - floor + 0.12;
  [0, 1, 2].forEach((k) => { const a = k / 3 * TAU + 0.2; cyl(root, 0.008, 0.008, 0.3, x + Math.cos(a) * 0.1, floor + 0.1, z + Math.sin(a) * 0.1, black, 4, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); });
  cyl(root, 0.012, 0.012, H, x, floor + H / 2, z, black, 6);
  const top = new THREE.Vector3(x, floor + H, z), head = new THREE.Vector3(hx, hy, hz), d = head.clone().sub(top), L = d.length();
  const boom = cyl(root, 0.008, 0.008, L, (x + hx) / 2, (top.y + hy) / 2, (z + hz) / 2, black, 5);
  boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  cyl(root, 0.022, 0.016, 0.12, hx, hy, hz, M.black(), 8).quaternion.copy(boom.quaternion);
}
// A bottle of water and a set list taped down by a player
function bottle(ctx, x, z) {
  cyl(ctx.root, 0.032, 0.032, 0.2, x, ctx.floor + 0.1, z, ctx.water, 10);
  cyl(ctx.root, 0.016, 0.016, 0.03, x, ctx.floor + 0.215, z, ctx.cap, 8);
}
function setList(ctx, x, z, a) { const m = mesh(ctx.root, new THREE.PlaneGeometry(0.21, 0.3), ctx.paper, x, ctx.floor + 0.004, z); m.rotation.set(-Math.PI / 2, 0, a); }
// A cable lying on the boards through the given [x, z] points
function cable(ctx, pts) {
  const v = pts.map(([x, z]) => new THREE.Vector3(x, ctx.floor + 0.011, z));
  mesh(ctx.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), pts.length * 5, 0.011, 4, false), ctx.cableM, 0, 0, 0);
}
function guitarOnStand(ctx, x, z) {
  const { root, floor } = ctx, g = new THREE.Group(); g.position.set(x, floor, z); g.rotation.x = 0.22; root.add(g);
  const body = std('#c46a2a', 0.3, 0.1), neck = std('#3a2412', 0.5);
  cyl(g, 0.19, 0.19, 0.1, 0, 0.3, 0, body, 22, Math.PI / 2); cyl(g, 0.15, 0.15, 0.1, 0, 0.58, 0, body, 20, Math.PI / 2);
  face(mesh(g, new THREE.CircleGeometry(0.05, 16), M.black(), 0, 0.46, -0.051));
  box(g, 0.05, 0.5, 0.03, 0, 0.92, -0.02, neck); box(g, 0.08, 0.14, 0.03, 0, 1.22, -0.02, std('#1b120b', 0.5));
  [-0.12, 0.12].forEach((dx) => box(root, 0.02, 0.5, 0.02, x + dx, floor + 0.24, z + 0.12, M.black(), -0.3));
}

/* ---------- the band ---------- */
// plan: BAND.big or BAND.sheri; frame: { x0, x1, front (z of the riser's front), floor (y of its top) }
// frame.back (optional): z of the stage's back edge, where the stage box and the par cans stand; frame.singers
// false: no wedges at the front (a stage whose 2D side draws its own); frame.wash: the par cans' colour
export function buildBand(kit, root, plan, frame) {
  const ctx = { kit, root, floor: frame.floor, small: !!frame.small, x1: frame.x1, water: std('#bfe0f4', 0.12, 0.05), cap: std('#f4f4f4', 0.5), paper: std('#ece8dc', 0.9), cableM: std('#0c0c0e', 0.55, 0.2) }, holes = {}, W = frame.x1 - frame.x0;
  const add = (role, list) => { holes[role] = (holes[role] || []).concat(list); };
  const ends = [];
  plan.forEach((m, i) => {
    const x = frame.x0 + W * m.u, z = frame.front + m.d, wz = z - (frame.small ? 0.7 : 0.95);
    if (m.role === 'drums') { add('drums', drums(ctx, x, z)); ends.push([x + 0.3, z + 0.5]); }
    else if (m.role === 'keys') { add('keys', keys(ctx, x, z)); add('keys', [wedge(ctx, x, wz)]); ends.push([x, z - 0.3]); }
    else if (m.role === 'tabla') { add('tabla', tabla(ctx, x, z)); ends.push([x + 0.42, z - 0.2]); }
    else if (m.role === 'guitar') { cabinet(root, 0.6, 0.48, 0.28, x - 0.55, frame.floor, z + 0.55); if (!frame.small) guitarOnStand(ctx, x + 0.62, z + 0.35); add('guitar', [wedge(ctx, x, wz)]); ends.push([x - 0.55, z + 0.55]); }
    else if (m.role === 'bass') { cabinet(root, 0.62, 0.9, 0.42, x + 0.5, frame.floor, z + 0.62); cabinet(root, 0.62, 0.2, 0.34, x + 0.5, frame.floor + 0.9, z + 0.6); add('bass', [wedge(ctx, x, wz)]); ends.push([x + 0.5, z + 0.62]); }
    else if (m.role === 'dhol') { add('dhol', [wedge(ctx, x, wz)]); boomMic(ctx, x - 0.5, z - 0.25, x - 0.2, frame.floor + 0.92, z - 0.32); ends.push([x - 0.5, z - 0.25]); }
    if (m.role !== 'drums') { bottle(ctx, x + 0.34, z + 0.32); setList(ctx, x + 0.36, wz + 0.02, 0.15 - (i % 3) * 0.12); }
    // each player in a soft pool of stage light, which goes down with the show between songs
    kit.pools.add(x, frame.floor + (m.role === 'drums' ? 0.32 : 0.02), z - 0.1, 1.0, 0.85, '#ffd8a8', 0.1, { layer: 'show', live: true });
  });
  kit.pools.add(frame.x0 + W / 2, frame.floor + 0.02, frame.front - 0.3, W * 0.24, 0.95, '#fff0dc', 0.11, { layer: 'show', live: true });
  // The singers' wedges along the front, cut out of the singers who stand behind them
  if (frame.singers !== false) add('singer', [0.4, 0.6].map((u) => wedge(ctx, frame.x0 + W * u, frame.front - 0.5)));
  if (frame.back != null) {
    // The stage box at the back, its little lights, and a cable from each player's gear across the boards to it
    const bx = frame.x0 + W * (frame.small ? 0.5 : 0.42), bz = frame.back - 0.3;
    box(root, 0.36, 0.2, 0.22, bx, frame.floor + 0.1, bz, std('#16161a', 0.5, 0.4));
    for (let k = 0; k < 6; k++) kit.bulbs.add(bx - 0.12 + k * 0.048, frame.floor + 0.15, bz - 0.112, 0, { color: k % 3 ? '#6dff9a' : '#ff5a3a', k: 0.5, s: 0.1, twinkle: 0, layer: 'show' });
    ends.forEach(([ex, ez], i) => { const s = Math.sign(bx - ex) || 1; cable(ctx, [[ex, ez], [ex + (bx - ex) * 0.35, (ez + bz) / 2 + 0.12 * Math.sin(i * 2.1)], [bx - s * 0.12 * (1 + (i % 2)), bz - 0.25], [bx - 0.1 + i * 0.04, bz - 0.11]]); });
    // Par cans at the back, tipped up to wash the backdrop behind the band
    const wash = frame.wash || '#ffb46a', lens = kit.glow(wash, 1.6, 'show'), can = std('#141416', 0.5, 0.4);
    (frame.small ? [0.04, 0.96] : [0.04, 0.3, 0.7, 0.96]).forEach((u) => {
      const cx = frame.x0 + W * u, cz = frame.back - 0.22, g = new THREE.Group(); g.position.set(cx, frame.floor + 0.14, cz); g.rotation.x = -0.6; root.add(g);
      cyl(g, 0.1, 0.09, 0.24, 0, 0, 0, can, 12);
      const l = mesh(g, new THREE.CircleGeometry(0.085, 14), lens, 0, 0.121, 0); l.rotation.x = -Math.PI / 2;
      box(root, 0.24, 0.02, 0.14, cx, frame.floor + 0.01, cz, can);
    });
  }
  return holes;
}
