// STADIUM: an indoor hall: tiered stands full of people, a steel roof with a pleated shamiana under it, brass
// jhummars, lanterns, banners, moving-head beams, a stage at the far end.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, merged, tinted, at, face, faceTo, hsl, glowTexture, LIGHT, BAND, SPONSORS, NSTAND, nstandSeats } from '../util.js';
import { std, strand, Beam } from '../kit.js';
import { buildStage, latticeMat } from '../stage.js';
import { chhatri, lantern, jhummar } from '../props.js';
import { floorFor } from '../floors.js';
import { ground, practicalPools, cornerCreative, showCreatives } from './common.js';

/* ---------- STADIUM ---------- */
// The stands' aisles: across the far stand, and along the side stands
const STAND_AISLES = { x: [-14, 0, 14], z: [-16, 4, 24] };
const SEAT_COLS = ['#c9a37a', '#b76b5a', '#8f7aa8', '#d4b58c', '#6c8fa3', '#caa0b8', '#d98c5f', '#7fa37a'];
function standCrowd(kit, root, density, r) {
  const spots = [];
  // (leaving the aisles clear)
  for (let row = 0; row < 11; row++) for (let x = -27; x <= 27; x += 0.72) if (!STAND_AISLES.x.some((a) => Math.abs(x - a) < 0.55)) spots.push([x + (r() - 0.5) * 0.15, 1.3 + row * 0.95, 42 + row * 1.5 + 0.55, 0]);
  [-1, 1].forEach((sd) => { for (let row = 0; row < 9; row++) for (let z = -30; z <= 40.5; z += 0.8) if (!STAND_AISLES.z.some((a) => Math.abs(z - a) < 0.6)) spots.push([sd * (25 + row * 1.5 + 0.55), 1.3 + row * 0.95, z + (r() - 0.5) * 0.15, sd]); });
  // The near stand: out past its aisles, and the rows behind where you sit (the 2D scene seats the people in front of you)
  const N = NSTAND, seats = nstandSeats();
  for (let row = 0; row < N.rows; row++) seats.forEach((x) => { if (Math.abs(x) > N.aisle || row > N.cam) spots.push([x, N.y0 + row * N.rise + 0.07, N.z0 - row * N.tread - 0.95, 'n']); });
  const keep = spots.filter(() => r() < 0.55 + 0.4 * density);
  const body = merged([[new THREE.CylinderGeometry(0.17, 0.22, 0.8, 6), at(0, 0.45, 0)], [new THREE.IcosahedronGeometry(0.12, 0), at(0, 0.98, 0)]]);
  // (lit by the stands' wash as well as the hall, so the crowd reads from across the floor)
  const m = new THREE.InstancedMesh(body, kit.selfLit(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, emissive: '#2a2238' }), 0.55, 'architectural'), keep.length), mx = new THREE.Matrix4(), c = new THREE.Color();
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(keep.length * 3), 3);
  keep.forEach((s, i) => {
    const hh = 0.85 + r() * 0.25;
    m.setMatrixAt(i, mx.makeScale(1, hh, 1).setPosition(s[0], s[1], s[2]));
    c.set(SEAT_COLS[Math.floor(r() * SEAT_COLS.length)]); m.setColorAt(i, c);
    // Phones held up, lit, here and there
    if (r() < 0.05) kit.bulbs.add(s[0] + (r() - 0.5) * 0.2, s[1] + 1.35, s[3] === 'n' ? s[2] + 0.2 : s[2] - (s[3] ? 0 : 0.2) - s[3] * 0.2, 0, { color: '#f4f7ff', group: 2, layer: 'show', twinkle: 0.9, ph: r() * TAU, s: 0.9 });
  });
  root.add(m);
}
/* The stadium's near stand, behind the floor's near end: eleven rows rising to the back wall, a coloured seat pad at every
   place (the rows in front of where you sit, and their people, are what you see from far off), an aisle either side with
   a light at every step, a lavender wash on the treads from fixtures under the roof's edge, as the other stands have. */
function nearStand(kit, root, parts) {
  const N = NSTAND, seats = nstandSeats(), pads = [];
  for (let row = 0; row < N.rows; row++) {
    const zf = N.z0 - row * N.tread, y = N.y0 + row * N.rise;
    parts.push([tinted(new THREE.BoxGeometry(48.6, y, N.tread), `rgb(${36 + row * 2},${30 + row * 2},${46 + row * 2})`), at(0, y / 2, zf - N.tread / 2)]);
    // a pale nosing along each step's edge, so the rows read
    parts.push([tinted(new THREE.BoxGeometry(48.6, 0.03, 0.06), '#8a7a5a'), at(0, y + 0.006, zf - 0.03)]);
    seats.forEach((x, i) => pads.push([x, y, zf - 0.95, (row * 3 + Math.floor((x + 24) / 4.96)) % SEAT_PADS.length]));
    [-N.aisle, N.aisle].forEach((x) => kit.bulbs.add(x, y - 0.12, zf + 0.02, 0, { color: LIGHT.amber, k: 0.7, s: 0.5, twinkle: 0, layer: 'architectural' }));
    if (row % 2 === 0) for (let x = -20; x <= 20; x += 10) kit.pools.add(x, y + 0.012, zf - 0.75, 5, 1.6, '#a898ff', 0.07, { layer: 'architectural' });
  }
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.07, 0.42), kit.selfLit(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#2a2238' }), 0.3, 'architectural'), pads.length), mx = new THREE.Matrix4(), c = new THREE.Color();
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pads.length * 3), 3);
  pads.forEach((p, i) => { m.setMatrixAt(i, mx.makeTranslation(p[0], p[1] + 0.035, p[2])); c.set(SEAT_PADS[p[3]]); m.setColorAt(i, c); });
  root.add(m);
  for (let x = -24; x <= 24; x += 8) { kit.bigBulbs.add(x, 15.78, N.z0 - N.rows * N.tread - 1.5, 0, { color: '#a898ff', k: 1.1, s: 0.55, twinkle: 0, layer: 'architectural' }); }
}
const SEAT_PADS = ['#8e1b2c', '#c2641a', '#7a2a5a', '#b8312b', '#d08a2a'];
function shamiana(root, CEIL) {
  const edge = [], per = 12, c = CEIL;
  for (let k = 0; k < per; k++) edge.push([lerp(c.x0, c.x1, k / per), c.edge, c.z1]);
  for (let k = 0; k < per; k++) edge.push([c.x1, c.edge, lerp(c.z1, c.z0, k / per)]);
  for (let k = 0; k < per; k++) edge.push([lerp(c.x1, c.x0, k / per), c.edge, c.z0]);
  for (let k = 0; k < per; k++) edge.push([c.x0, c.edge, lerp(c.z0, c.z1, k / per)]);
  const A = c.apex, cols = ['#c85a17', '#d8c49c', '#7e1827', '#d8c49c'], pos = [], colr = [], cc = new THREE.Color();
  const tri = (a, b, d, hex) => { cc.set(hex); [a, b, d].forEach((p) => { pos.push(p[0], p[1], p[2]); colr.push(cc.r, cc.g, cc.b); }); };
  for (let k = 0; k < edge.length; k++) {
    const e0 = edge[k], e1 = edge[(k + 1) % edge.length];
    const m0 = [lerp(A[0], e0[0], 0.55), lerp(A[1], c.edge, 0.55) - 0.35, lerp(A[2], e0[2], 0.55)], m1 = [lerp(A[0], e1[0], 0.55), lerp(A[1], c.edge, 0.55) - 0.35, lerp(A[2], e1[2], 0.55)];
    const hex = cols[k % cols.length];
    tri(A, m1, m0, hex); tri(m0, m1, e1, hex); tri(m0, e1, e0, hex);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  geo.computeVertexNormals();
  // The cloth glows with the jhummars' light caught in it (its emissive follows the practical layer)
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, vertexColors: true, side: THREE.DoubleSide, emissive: '#3a1a0a', emissiveIntensity: 0.8 }));
  root.add(cloth);
  // The jhalar round the edge: maroon scallops with a gold fringe
  const jt = canvasTexture(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#6b1020';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); for (let k = 4; k > 0; k--) { const xr = k * w / 4, xl = xr - w / 4; g.lineTo(xr, h * 0.5); g.quadraticCurveTo((xl + xr) / 2, h * 1.05, xl, h * 0.5); } g.closePath(); g.fill();
    g.strokeStyle = '#d6a64a'; g.lineWidth = 4; g.beginPath(); for (let k = 0; k < 4; k++) { const xl = k * w / 4; g.moveTo(xl, h * 0.5); g.quadraticCurveTo(xl + w / 8, h * 1.02, xl + w / 4, h * 0.5); } g.stroke();
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(235,245,255,.9)'; g.beginPath(); g.arc((k + 0.5) * w / 4, h * 0.35, 5, 0, TAU); g.fill(); }
  });
  jt.wrapS = THREE.RepeatWrapping;
  [[(c.x0 + c.x1) / 2, c.z1, c.x1 - c.x0, 0], [(c.x0 + c.x1) / 2, c.z0, c.x1 - c.x0, Math.PI], [c.x1, (c.z0 + c.z1) / 2, c.z1 - c.z0, Math.PI / 2], [c.x0, (c.z0 + c.z1) / 2, c.z1 - c.z0, -Math.PI / 2]].forEach(([x, z, len, ry]) => {
    const t = jt.clone(); t.needsUpdate = true; t.repeat.set(len / 3.2, 1);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.8), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9, emissive: '#2a0a0a' }));
    p.position.set(x, c.edge - 0.4, z); p.rotation.y = ry; root.add(p);
  });
  return cloth.material;
}
function stadium(kit, root, tier, TH, r, data) {
  const floorMesh = ground(root, floorFor('stadium', TH, data && data.circles, tier), 64, 92, 10, tier.shadows);
  // The warm light the shamiana's cloth throws back down onto the floor, and the stalls' and DJ's lamps
  practicalPools(kit, [[0, 10, 22, LIGHT.tungsten, 0.07], [15.5, 16.4, 2.2, '#9fb8ff', 0.2, 'show']]);
  // The concourse beyond the floor, darker
  const conc = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), std('#140e0a', 0.95)); conc.rotation.x = -Math.PI / 2; conc.position.set(0, -0.01, 10); root.add(conc);
  // Stands: risers along the far end and both sides, coloured row by row
  const parts = [];
  for (let row = 0; row <= 10; row++) { const zf = 42 + row * 1.5, yf = 1.3 + row * 0.95; parts.push([tinted(new THREE.BoxGeometry(58, yf, 1.5), `rgb(${36 + row * 2},${30 + row * 2},${44 + row * 2})`), at(0, yf / 2, zf + 0.75)]); }
  [-1, 1].forEach((sd) => { for (let row = 0; row <= 8; row++) { const xr = sd * (25 + row * 1.5), y = 1.3 + row * 0.95; parts.push([tinted(new THREE.BoxGeometry(1.5, y, 76), `rgb(${30 + row * 2},${26 + row * 2},${40 + row * 2})`), at(xr + sd * 0.75, y / 2, 4)]); } });
  nearStand(kit, root, parts);
  // The stands take a cool lavender wash from fixtures along the roof edge: a different light from the warm hall, so
  // the seating either side reads without competing with the floor
  root.add(new THREE.Mesh(merged(parts), kit.selfLit(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, vertexColors: true, emissive: '#3a3252' }), 0.38, 'architectural')));
  standCrowd(kit, root, tier.density, r);
  const WASH = '#a898ff';
  [-1, 1].forEach((sd) => { for (let z = -28; z <= 40; z += 8) {
    const fx = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 1.2), std('#16131c', 0.5, 0.4)); fx.position.set(sd * 30.5, 15.9, z); root.add(fx);
    kit.bigBulbs.add(sd * 30.5, 15.78, z, 0, { color: WASH, k: 1.1, s: 0.55, twinkle: 0, layer: 'architectural' });
    kit.pools.add(sd * 28.6, 5.4, z, 4.2, 3.6, WASH, 0.09, { vertical: true, ry: Math.PI / 2, layer: 'architectural' });
  } });
  for (let x = -24; x <= 24; x += 8) { kit.bigBulbs.add(x, 15.78, 47.5, 0, { color: WASH, k: 1.1, s: 0.55, twinkle: 0, layer: 'architectural' }); kit.pools.add(x, 6, 48.5, 4.2, 3.8, WASH, 0.08, { vertical: true, layer: 'architectural' }); }
  // LED boards along the front of the stands: dandiya, diyas and dots scrolling past in the night's colours
  const ledTex = canvasTexture(512, 64, (g, w, h) => {
    g.fillStyle = '#0a0608'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 8; k++) {
      const x = (k + 0.5) / 8 * w;
      g.fillStyle = '#fff';
      if (k % 3 === 0) { for (let p = 0; p < 8; p++) { const a = p / 8 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 13, h / 2 + Math.sin(a) * 13, 8, 4, a, 0, TAU); g.fill(); } g.beginPath(); g.arc(x, h / 2, 6, 0, TAU); g.fill(); }
      else if (k % 3 === 1) { g.save(); g.translate(x, h / 2); [-0.6, 0.6].forEach((r) => { g.save(); g.rotate(r); g.fillRect(-2.5, -22, 5, 44); g.restore(); }); g.restore(); }
      else { g.beginPath(); g.ellipse(x, h * 0.66, 14, 6, 0, 0, Math.PI); g.fill(); g.beginPath(); g.moveTo(x, h * 0.2); g.quadraticCurveTo(x + 7, h * 0.5, x, h * 0.62); g.quadraticCurveTo(x - 7, h * 0.5, x, h * 0.2); g.fill(); }
    }
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 4; x < w; x += 8) { g.fillRect(x, 4, 2, 2); g.fillRect(x, h - 6, 2, 2); }
  });
  ledTex.wrapS = THREE.RepeatWrapping;
  const ribbons = [[0, 41.9, 56, 0], [-24.9, 4, 76, Math.PI / 2], [24.9, 4, 76, Math.PI / 2], [0, NSTAND.z0 + 0.1, 48.6, 0]].map(([x, z, len, ry]) => {
    const t = ledTex.clone(); t.needsUpdate = true; t.repeat.set(len / 7, 1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff', map: t })); m.position.set(x, 0.65, z); m.rotation.y = ry; m.userData.dynamic = true; root.add(m); return m;
  });
  // The roof, the walls above the stands and the girders
  const CEIL = { roof: 17, apex: [0, 13.4, 10], edge: 11.2, x0: -24, x1: 24, z0: -14, z1: 34 };
  const roof = new THREE.Mesh(new THREE.BoxGeometry(80, 0.3, 100), std('#130e19', 0.9)); roof.position.set(0, CEIL.roof + 0.15, 10); root.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(80, 17, 0.4), std('#191320', 0.9)); back.position.set(0, 8.5, 59); root.add(back);
  const front = new THREE.Mesh(new THREE.BoxGeometry(80, 17, 0.4), std('#191320', 0.9)); front.position.set(0, 8.5, -40); root.add(front);
  [-1, 1].forEach((sd) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 17, 100), std('#161120', 0.9)); w.position.set(sd * 39, 8.5, 10); root.add(w); });
  // Architecture: wall washers along the top of every wall, grazing it with amber light, a fixture for each
  for (let k = 0; k < 9; k++) { kit.pools.add(-32 + k * 8, 14.2, 58.7, 2.4, 2.6, LIGHT.amber, 0.3, { vertical: true, layer: 'architectural' }); kit.bigBulbs.add(-32 + k * 8, 16.4, 58.5, 0, { color: LIGHT.amber, k: 1, s: 0.6, twinkle: 0, layer: 'architectural' }); }
  [-1, 1].forEach((sd) => { for (let z = -30; z <= 54; z += 8) { kit.pools.add(sd * 38.7, 14.2, z, 2.4, 2.6, LIGHT.amber, 0.26, { vertical: true, ry: Math.PI / 2, layer: 'architectural' }); kit.bigBulbs.add(sd * 38.5, 16.4, z, 0, { color: LIGHT.amber, k: 1, s: 0.6, twinkle: 0, layer: 'architectural' }); } });
  // Aisle lights on the risers, so the steps read in the dark, and house lights in the roof over the stands
  STAND_AISLES.x.forEach((x) => { for (let row = 0; row <= 10; row++) kit.bulbs.add(x, 1.3 + row * 0.95 - 0.12, 42 + row * 1.5 - 0.02, 0, { color: LIGHT.amber, k: 0.7, s: 0.5, twinkle: 0, layer: 'architectural' }); });
  [-1, 1].forEach((sd) => STAND_AISLES.z.forEach((z) => { for (let row = 0; row <= 8; row++) kit.bulbs.add(sd * (25 + row * 1.5) - sd * 0.02, 1.3 + row * 0.95 - 0.12, z, 0, { color: LIGHT.amber, k: 0.7, s: 0.5, twinkle: 0, layer: 'architectural' }); }));
  for (let x = -24; x <= 24; x += 8) kit.bigBulbs.add(x, 16.6, 50, 0, { color: LIGHT.warm, k: 1.1, s: 0.7, twinkle: 0, layer: 'practical' });
  [-1, 1].forEach((sd) => { for (let z = -24; z <= 40; z += 8) kit.bigBulbs.add(sd * 31, 16.6, z, 0, { color: LIGHT.warm, k: 1.1, s: 0.7, twinkle: 0, layer: 'practical' }); });
  for (let z = -30; z <= 57; z += 6) { const gd = new THREE.Mesh(new THREE.PlaneGeometry(78, 0.9), latticeMat(1)); gd.material.map.repeat.set(1, 1); gd.rotation.z = Math.PI / 2; gd.position.set(0, CEIL.roof - 0.45, z); gd.rotation.set(0, 0, 0); root.add(gd); }
  const clothMat = shamiana(root, CEIL);
  // Jhummars, chhatris, marigold curtains, bunting and lanterns
  [[-12, 2], [12, 2], [-12, 20], [12, 20], [0, 26]].forEach(([x, z]) => jhummar(kit, root, x, z, CEIL.edge + 1.2));
  const umbrellas = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; umbrellas.push(chhatri(kit, root, Math.cos(a) * 8.5, 8.2, 4 + Math.sin(a) * 8.5, 12.1, TH.flags)); }
  const beads = [];
  [-1, 1].forEach((sd) => { for (let k = 0; k < 6; k++) { const x = sd * (9.2 + k * 0.35); for (let y = 8.2; y > 2.4; y -= 0.14) beads.push([x, y, 35.2 - k * 0.05, Math.round(y / 0.14) % 2]); } });
  const mc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), std('#ffffff', 0.9), beads.length), mx = new THREE.Matrix4();
  mc.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(beads.length * 3), 3);
  const cA = new THREE.Color('#f29a2e'), cB = new THREE.Color('#f6c342');
  beads.forEach((b, i) => { mc.setMatrixAt(i, mx.makeTranslation(b[0], b[1], b[2])); const cc = b[3] ? cA : cB; mc.setColorAt(i, cc); });
  root.add(mc);
  [2, 18, 32].forEach((z, i) => strand(kit, [-24, 11, z], [24, 11, z], 1.6, 'flags', i * 3));
  const lc = ['#ff9f5a', '#ff6fa3', '#7fe0a0', '#ffd58a'];
  let n = 0;
  [34, 22, 10, -2].forEach((z) => [-15, -5, 5, 15].forEach((x) => { lantern(kit, root, x, 9.5 + (n % 2) * 0.8, z, lc[n % 4], 11.6); n++; }));
  // Banners over the stands, exit signs, and the corner screens
  const corners = [];
  [-1, 1].forEach((sd) => {
    for (let bz = -24; bz <= 36; bz += 10) {
      const hex = TH.flags[((bz + 40) / 10 + (sd > 0 ? 1 : 0)) % TH.flags.length];
      const ban = faceTo(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.3), std(hex, 0.8, 0, { side: THREE.DoubleSide })), -sd * Math.PI / 2); ban.position.set(sd * 25.05, 3.95, bz); root.add(ban);
      const ex = faceTo(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), kit.glow('#1f8f4b', 1.6, 'practical')), -sd * Math.PI / 2); ex.position.set(sd * 25.02, 1.9, bz + 5); root.add(ex);
    }
    // The corner screens carry the sponsors' creatives, changing turn by turn (see update)
    const scr = face(new THREE.Mesh(new THREE.PlaneGeometry(10, 3.5), kit.litMap(cornerCreative(SPONSORS[sd < 0 ? 0 : 3]), 0.9, 'practical'))); scr.position.set(sd * 28, 9.15, 40); scr.userData.dynamic = true; root.add(scr); corners.push(scr);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3.9, 0.2), std('#0d0b10', 0.6)); fr.position.set(sd * 28, 9.15, 40.15); root.add(fr);
  });
  // Barrier rails in front of the stands, and the watchers at them
  [-1, 1].forEach((sd) => { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 40), std('#8a8a92', 0.4, 0.7)); rail.position.set(sd * 24.4, 0.55, 13); root.add(rail); });
  const stage = buildStage(kit, { x0: -8.5, x1: 8.5, z: 35.5, h: 1.4, depth: 4.4, screenBottom: 1.8, screenTop: 8.3, truss: 9.6, arrays: 10.5, band: BAND.big });
  root.add(stage.root);
  // Moving heads in the roof sweeping pools of colour across the floor
  const heads = [[-18, 0], [-6, 0], [6, 0], [18, 0], [-12, 22], [12, 22]].map(([x, z], i) => {
    const fix = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 10), std('#1b1920', 0.5, 0.4)); fix.position.set(x, 15.6, z); root.add(fix);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    spot.rotation.x = -Math.PI / 2; spot.renderOrder = 2; root.add(spot);
    return { x, z, i, beam: new Beam(root, '#ffffff', 16, 0.2, 0.2), spot, layer: 'show' };
  });
  const rig = {
    hemi: ['#5e4436', '#24170e', 0.55, 0.8], moon: 0,
    // A key light from the roof over the circle (it throws the shadows), and a wash on the band
    spots: [{ pos: [4, 15.5, -2], to: [0, 0, 6], color: LIGHT.warm, base: 100, distance: 40, angle: 0.6, layer: 'key' }, { pos: stage.wash.pos, to: stage.wash.to, color: '#ffe4c4', base: 130, distance: 28, angle: 0.55, layer: 'show' }],
    // The jhummars' light, warm and from overhead
    points: [[-10, 9.5, 2], [10, 9.5, 2], [-10, 9.5, 20], [10, 9.5, 20]].map((p) => ({ pos: p, color: LIGHT.tungsten, base: 58, distance: 34, layer: 'practical' }))
  };
  return {
    rig, stage, umbrellas, feedScreen: stage.feedScreen, floor: floorMesh, fog: new THREE.FogExp2('#140c10', 0.009), exposure: 0.92,
    update(t, ctx) {
      const { TH, pulse, reduce, lv } = ctx;
      clothMat.emissiveIntensity = 0.5 * lv.practical;
      showCreatives(corners, ctx.sponsors && ctx.sponsors.corners, ctx.sponsors, cornerCreative, (m, a) => m.material.color.multiplyScalar(a));
      ribbons.forEach((m, si) => { m.material.color.copy(hsl(TH.hues[si % TH.hues.length] + 20 * Math.sin(t * TH.speed + si), TH.sat, 52 + 8 * pulse)).multiplyScalar(1.15 * lv.festive); if (!reduce) m.material.map.offset.x = (t * 0.08 * (si ? -1 : 1)) % 1; });
      heads.forEach((h) => {
        const tt = reduce ? 0 : t * TH.speed / 0.3, tx = h.x * 0.4 + Math.sin(tt * 0.35 + h.i * 1.9) * 9, tz = h.z + Math.cos(tt * 0.27 + h.i) * 9, hex = TH.beams[h.i % TH.beams.length];
        h.beam.aim([h.x, 15.4, h.z], [tx, 0, tz]); h.beam.set(hex, lv.show * (0.8 + 0.4 * pulse));
        h.spot.position.set(tx, 0.03, tz); h.spot.scale.setScalar(2.6); h.spot.material.color.set(hex); h.spot.material.opacity = 0.5 * lv.show;
      });
    }
  };
}


export default { seed: 202, sky: false, garboK: 6.5, build: stadium };
