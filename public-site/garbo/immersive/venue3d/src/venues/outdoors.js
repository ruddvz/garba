// OUTDOORS: an open ground under the night sky: light towers, a big stage with side screens, chhatris over the
// circle, bulb strings and bunting on poles, food stalls, neem trees in fairy lights, the city beyond.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, LIGHT, BAND } from '../util.js';
import { std, strand, Beam } from '../kit.js';
import { buildStage, latticeMat } from '../stage.js';
import { buildSkyline } from '../sky.js';
import { chhatri, trees, speakerPole } from '../props.js';
import { floorFor } from '../floors.js';
import { ground, practicalPools, uplight } from './common.js';

/* ---------- trees round the open ground (the 2D scene's plan, with this renderer's own draw) ---------- */
function treesFor(r) {
  const out = [];
  const tree = (x, z, big) => {
    const n = 5 + Math.floor(r() * 3), blobs = [];
    for (let i = 0; i < n; i++) blobs.push([(r() - 0.5) * 4.2, 5 + r() * 3.2, (r() - 0.5) * 1.5, 1.8 + r() * 1.6]);
    out.push({ x, z, s: big ? 1.25 : 0.8 + r() * 0.4, blobs, fairy: r() < 0.55, hue: Math.floor(r() * 6), tone: Math.floor(r() * 3) });
  };
  for (let x = -48; x <= 48; x += 6 + r() * 4) tree(x, 58 + r() * 12, r() < 0.3);
  [-1, 1].forEach((sd) => { for (let z = -14; z < 56; z += 7 + r() * 5) tree(sd * (35 + r() * 8), z, r() < 0.3); });
  tree(-29.5, -7, true); tree(30.5, -9.5, true);
  return out;
}

// Kanat: the printed cloth walls that close off a Garba ground, red and cream panels on bamboo posts
function kanatTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#b3261e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f1e2c4'; g.fillRect(0, h * 0.18, w, h * 0.64);
    g.fillStyle = '#b3261e';
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, h * 0.18); g.lineTo(x + 16, h * 0.34); g.lineTo(x + 32, h * 0.18); g.fill(); g.beginPath(); g.moveTo(x, h * 0.82); g.lineTo(x + 16, h * 0.66); g.lineTo(x + 32, h * 0.82); g.fill(); }
    g.fillStyle = '#2f6b3a'; for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, h * 0.5, 9, 0, TAU); g.fill(); g.fillStyle = '#e8b04b'; g.beginPath(); g.arc(x, h * 0.5, 4, 0, TAU); g.fill(); g.fillStyle = '#2f6b3a'; }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 3, h);
  }, { repeat: [1, 1] });
}
// (one texture and material for every wall: each wall's length is in its UVs, so they all bake into one draw)
let kanatMat = null;
function kanat(root, x0, z0, x1, z1, h) {
  if (!kanatMat) { const t = kanatTexture(); t.wrapS = THREE.RepeatWrapping; kanatMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide }); }
  const len = Math.hypot(x1 - x0, z1 - z0), geo = new THREE.PlaneGeometry(len, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 3);
  const wall = new THREE.Mesh(geo, kanatMat);
  wall.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); wall.rotation.y = Math.atan2(x1 - x0, z1 - z0) - Math.PI / 2; root.add(wall);
  const posts = Math.round(len / 3);
  for (let k = 0; k <= posts; k++) { const u = k / posts, p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h + 0.3, 5), std('#8a6a3a', 0.9)); p.position.set(lerp(x0, x1, u), (h + 0.3) / 2, lerp(z0, z1, u)); root.add(p); }
}

/* ---------- OUTDOORS ---------- */
function outdoors(kit, root, tier, TH, r, data) {
  const floorMesh = ground(root, floorFor('outdoors', TH, data && data.circles, tier), 320, 320, 20, tier.shadows);
  practicalPools(kit, [[19.5, 21.4, 2.2, '#9fb8ff', 0.2, 'show']]);
  root.add(buildSkyline(175));
  // (the dance floor, trodden pale where each circle goes round, is painted into the ground: floors.js)
  // Lamps on two poles over the chairs at the back, warm LED heads angled down at the seats
  [-1, 1].forEach((sd) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.2, 6), std('#22180f', 0.8)); pole.position.set(sd * 6.9, 2.6, -19.6); root.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), std('#16110e', 0.6, 0.3)); head.position.set(sd * 6.7, 5.2, -19.4); head.rotation.z = sd * 0.5; root.add(head);
    kit.bigBulbs.add(sd * 6.62, 5.12, -19.4, 0, { color: LIGHT.warm, k: 1.5, s: 0.9, twinkle: 0, layer: 'practical' });
  });
  kit.pools.add(0, 0.02, -17.6, 8.5, 4.2, LIGHT.warm, 0.2, { layer: 'practical' });
  // Kanat walls round the ground, behind the stalls, and on either side of the stage
  kanat(root, -32.5, -16, -32.5, 58, 2.4); kanat(root, 32.5, -16, 32.5, 58, 2.4);
  kanat(root, -32.5, 58, -14, 58, 2.4); kanat(root, 14, 58, 32.5, 58, 2.4);
  // Architecture: an uplight at the foot of the kanat every six metres, washing the cloth amber from below
  const up = [];
  for (let z = -13; z <= 56; z += 6) [-1, 1].forEach((sd) => up.push([sd * 32.2, z, Math.PI / 2, sd, 0]));
  [[-29, -17], [17, 29]].forEach(([a, b]) => { for (let x = a; x <= b; x += 6) up.push([x, 57.7, 0, 0, 1]); });
  up.forEach(([x, z, ry, tx, tz]) => uplight(kit, root, x, z, ry, 2.2, tx, tz));
  // Light towers of lattice truss with floodlights, and the pools of light they throw
  [-31, 31].forEach((x) => {
    const pole = truss3(11); pole.position.set(x, 5.5, 16); root.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.4), std('#16110e', 0.6)); head.position.set(x, 11.6, 16); head.rotation.y = -Math.sign(x) * 0.5; head.rotation.x = 0.4; root.add(head);
    for (let k = 0; k < 4; k++) kit.bigBulbs.add(x + (k % 2 ? 0.5 : -0.5) * Math.cos(0.5), 11.3 + (k < 2 ? 0.3 : -0.2), 16 - 0.25 + (k % 2 ? 0.2 : -0.2) * Math.sign(x), 0, { color: LIGHT.flood, k: 2.4, s: 1.3, twinkle: 0, layer: 'key' });
    kit.pools.add(x * 0.55, 0.02, 14, 14, 11, LIGHT.flood, 0.19, { layer: 'key' });
    kit.beams.push({ from: [x, 11.2, 16], to: [x * 0.45, 0, 14], beam: new Beam(root, LIGHT.flood, 20, 0.55, 0.05), layer: 'key', hex: LIGHT.flood });
  });
  const tl = treesFor(r);
  trees(kit, root, tl);
  // The trees nearest the ground are lit from below too, so their canopies read against the sky
  tl.filter((t) => t.fairy && t.z < 58 && Math.abs(t.x) < 40).forEach((t) => {
    kit.pools.add(t.x, 4.6 * t.s, t.z - 1.2 * t.s, 3 * t.s, 3.4 * t.s, LIGHT.amber, 0.1, { vertical: true, layer: 'architectural' });
    kit.pools.add(t.x, 0.02, t.z, 1.6, 1.6, LIGHT.amber, 0.12, { layer: 'architectural' });
    kit.bigBulbs.add(t.x - 0.6, 0.12, t.z - 0.6, 0, { color: LIGHT.amber, k: 0.9, s: 0.5, twinkle: 0, layer: 'architectural' });
  });
  const stage = buildStage(kit, { x0: -11.5, x1: 11.5, z: 46, h: 1.6, depth: 4.4, screenBottom: 2.0, screenTop: 9.9, truss: 12.0, arrays: 13.5, sponsors: 5, sideScreens: true, band: BAND.big });
  root.add(stage.root);
  [-21, 21].forEach((x) => speakerPole(root, x, 16, 6));
  // Chhatris hung from a ring of cable over the circle, guyed out to the light towers and the stage truss
  const ringY = 10, ring = [];
  for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU + 0.3; ring.push([Math.cos(a) * 8.5, ringY - 0.25 * (1 - Math.abs(Math.sin(a * 3))), 4 + Math.sin(a) * 8.5]); }
  for (let k = 0; k < 24; k++) kit.wires.line(ring[k], ring[k + 1]);
  // Four masts carry the ring, so the chhatris hang from something you can see, and bulbs run along the ring itself so
  // it reads against the night sky instead of leaving the chhatris floating
  const mastMat = std('#2a2018', 0.85);
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * TAU + 0.3 + TAU / 8, mx = Math.cos(a) * 8.5, mz = 4 + Math.sin(a) * 8.5;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, ringY + 0.6, 8), mastMat); mast.position.set(mx, (ringY + 0.6) / 2, mz); root.add(mast);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), std('#e8b04b', 0.4, 0.6)); cap.position.set(mx, ringY + 0.68, mz); root.add(cap);
  }
  for (let k = 0; k < 24; k++) strand(kit, ring[k], ring[k + 1], 0.12, 'bulbs', k * 3, { gap: 0.55, pools: false });
  [[[-31, 11, 16], [-8.5, ringY, 4]], [[31, 11, 16], [8.5, ringY, 4]], [[0, 10.5, 46], [0, ringY, 12.5]]].forEach(([a, b]) => kit.wires.cable(a, b, 0.5));
  const umbrellas = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; umbrellas.push(chhatri(kit, root, Math.cos(a) * 8.5, 7.2, 4 + Math.sin(a) * 8.5, ringY, TH.flags)); }
  // Poles with strings of bulbs and bunting crossing the ground (the first over the main circle, clear of where you
  // stand in it, so no string hangs right over your head)
  const zs = [-4, 10, 24, 38], X = 24, h = 7.4;
  zs.forEach((z) => [-X, X].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 6), std('#22180f', 0.9)); p.position.set(x, h / 2, z); root.add(p); }));
  zs.forEach((z, i) => {
    strand(kit, [-X, h, z], [X, h, z], 1.5, i % 2 ? 'flags' : 'bulbs', i * 5);
    if (i < zs.length - 1) { strand(kit, [-X, h, z], [X, h, zs[i + 1]], 1.5, 'bulbs', i * 7); strand(kit, [X, h, z], [-X, h, zs[i + 1]], 1.5, 'bulbs', i * 11); }
  });
  const rig = {
    hemi: ['#36355f', '#2a1c12', 0.37, 0.58], moon: 1,
    // The two floodlights on the towers, a cool white; the right one throws the crowd's shadows
    spots: [{ pos: [31, 11.2, 16], to: [12, 0, 20], color: '#eeeeff', base: 105, distance: 60, angle: 0.5, layer: 'key' }, { pos: stage.wash.pos, to: stage.wash.to, color: '#ffe4c4', base: 150, distance: 32, angle: 0.55, layer: 'show' }],
    // The stage's wash on the band and truss, and the warm light the bulb strings throw up under the chhatris
    points: [{ pos: [0, 5.2, 44.2], color: '#ffe0b8', base: 80, distance: 15, layer: 'show' }, { pos: [0, 5.5, 4], color: '#ffc47a', base: 48, distance: 16, layer: 'festive' }, { pos: [0, 6.5, 22], color: '#ffc47a', base: 42, distance: 18, layer: 'festive' },
      // the lamps over the chairs (desktop only: a fourth light the smaller tiers leave out)
      { pos: [0, 5, -19.2], color: LIGHT.warm, base: 34, distance: 13, layer: 'practical' }]
  };
  return { rig, stage, umbrellas, feedScreen: stage.feedScreen, floor: floorMesh, fog: new THREE.FogExp2('#150d12', 0.0105), exposure: 0.98 };
}


/* ---------- a lattice tower: a truss standing on the ground ---------- */
function truss3(h) {
  const g = new THREE.Group(), mat = latticeMat(Math.round(h / 1.1)), w = 0.6;
  for (let k = 0; k < 3; k++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), a = k / 3 * TAU;
    p.position.set(Math.sin(a) * w * 0.29, 0, Math.cos(a) * w * 0.29); p.rotation.y = a; g.add(p);
  }
  return g;
}

export default { seed: 101, sky: true, build: outdoors };
