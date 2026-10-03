// A Garba stage, built to the same plan as the 2D scene's: a deck deep enough for the band (singers at the front,
// players on a riser behind), an LED screen at the back with a mandala that breathes on the beat, truss towers and a
// top beam carrying moving heads, velvet wings and a scalloped valance framing it, hung line arrays, bulbs along the
// front edge with marigold swags, and beams of coloured light.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, sag, hsl, seeded, face, solidOf, LIGHT, creative, sharpCreative } from './util.js';
import { std, glowMat, Beam } from './kit.js';
import { buildBand, monitorWedge } from './band.js';
import { feedMaterial } from './drone.js';

let latticeTex = null;
function lattice() {
  if (latticeTex) return latticeTex;
  latticeTex = canvasTexture(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#9a96a6'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(3, 0); g.lineTo(3, h); g.moveTo(w - 3, 0); g.lineTo(w - 3, h); g.stroke();
    g.lineWidth = 3; g.beginPath();
    for (let y = 0; y < h; y += 32) { g.moveTo(3, y); g.lineTo(w - 3, y + 16); g.lineTo(3, y + 32); }
    g.stroke();
  });
  latticeTex.wrapS = latticeTex.wrapT = THREE.RepeatWrapping;
  return latticeTex;
}
const latticeMats = new Map();
export function latticeMat(repeatY) {
  if (!latticeMats.has(repeatY)) {
    const t = lattice().clone(); t.needsUpdate = true; t.repeat.set(1, repeatY);
    latticeMats.set(repeatY, new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.7, roughness: 0.4 }));
  }
  return latticeMats.get(repeatY);
}
// A persian rug for the riser, in maroon and indigo with a border
function rugTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#6b1420'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f2a5a'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#7e1827'; g.fillRect(18, 18, w - 36, h - 36);
    g.strokeStyle = '#d6a64a'; g.lineWidth = 2; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#d6a64a'; g.beginPath(); g.ellipse(w / 2, h / 2, 34, 22, 0, 0, TAU); g.fill();
    g.fillStyle = '#1f2a5a'; g.beginPath(); g.ellipse(w / 2, h / 2, 24, 14, 0, 0, TAU); g.fill();
    for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? '#d6a64a' : '#e9dcc0'; g.beginPath(); g.arc(28 + k * 15.4, 26, 3, 0, TAU); g.arc(28 + k * 15.4, h - 26, 3, 0, TAU); g.fill(); }
  });
}
// A box truss: four lattice faces round a square
function truss(len, w, repeat) {
  const g = new THREE.Group(), mat = latticeMat(repeat);
  for (let k = 0; k < 4; k++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
    const a = k / 4 * TAU; p.position.set(Math.sin(a) * w / 2, 0, Math.cos(a) * w / 2); p.rotation.y = a;
    g.add(p);
  }
  return g;
}

let velvetTex = null;
function velvet() {
  if (velvetTex) return velvetTex;
  velvetTex = canvasTexture(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x++) { const k = 0.5 + 0.5 * Math.sin(x / w * TAU * 6); g.fillStyle = `rgb(${Math.round(26 + 40 * k)},${Math.round(5 + 8 * k)},${Math.round(11 + 16 * k)})`; g.fillRect(x, 0, 1, h); }
  });
  velvetTex.wrapS = THREE.RepeatWrapping;
  return velvetTex;
}
function valanceTexture(n) {
  return canvasTexture(512, 64, (g, w, h) => {
    const sw = w / n;
    g.fillStyle = '#4a1020'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0);
    for (let k = n; k > 0; k--) { const xr = k * sw, xl = xr - sw; g.lineTo(xr, h * 0.45); g.quadraticCurveTo((xl + xr) / 2, h * 1.05, xl, h * 0.45); }
    g.closePath(); g.fill();
    g.strokeStyle = '#d6a64a'; g.lineWidth = 3; g.beginPath();
    for (let k = 0; k < n; k++) { const xl = k * sw; g.moveTo(xl, h * 0.45); g.quadraticCurveTo(xl + sw / 2, h * 1.02, xl + sw, h * 0.45); }
    g.stroke();
    g.fillStyle = '#d6a64a'; g.fillRect(0, 2, w, 3);
  });
}
function pleatTexture() {
  return canvasTexture(512, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i < 40; i++) { gr.addColorStop(i / 40, '#1c070b'); gr.addColorStop((i + 0.45) / 40, '#4a1420'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9963f'; g.fillRect(0, 0, w, 4);
  });
}

// The skirt's LED panels: maroon with a double gold border (the mandalas turn over it, drawn separately)
function panelTexture(aspect) {
  const h = 160, w = Math.round(h * aspect);
  return canvasTexture(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a1320'); gr.addColorStop(1, '#2e0810');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d6a64a'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16); g.lineWidth = 2; g.strokeRect(18, 18, w - 36, h - 36);
    g.fillStyle = 'rgba(214,166,74,.35)'; for (let x = 34; x < w - 30; x += 22) { g.beginPath(); g.arc(x, 26, 2.2, 0, TAU); g.arc(x, h - 26, 2.2, 0, TAU); g.fill(); }
  });
}
function mandalaTexture() {
  return canvasTexture(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w); g.translate(w / 2, w / 2);
    [[12, 0.38, 0.14, 'rgba(240,138,36,.9)'], [12, 0.26, 0.1, 'rgba(214,166,74,.95)'], [8, 0.15, 0.07, 'rgba(255,214,120,1)']].forEach(([n, r, e, c], ti) => {
      for (let k = 0; k < n; k++) { g.save(); g.rotate((k + ti * 0.5) / n * TAU); g.fillStyle = c; g.beginPath(); g.ellipse(r * w * 0.95, 0, e * w, e * w * 0.36, 0, 0, TAU); g.fill(); g.restore(); }
    });
    g.fillStyle = '#ffe6a8'; g.beginPath(); g.arc(0, 0, w * 0.06, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(214,166,74,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, w * 0.47, 0, TAU); g.stroke();
  });
}
// A sponsor's creative for a skirt panel: its white margin trimmed off, as large as the panel allows in its middle, with
// a soft shadow under it, the rest clear so the panel's maroon shows round it (drawn when the picture has loaded)
function framedCreative(url, aspect) {
  const h = 512, w = Math.round(h * aspect), t = canvasTexture(w, h, (g) => g.clearRect(0, 0, w, h), { anisotropy: 8 }), img = new Image();
  img.onload = () => {
    const g = t.image.getContext('2d'), sh = sharpCreative(img), k = Math.min(w * 0.94 / sh.width, h * 0.9 / sh.height), iw = sh.width * k, ih = sh.height * k, x = (w - iw) / 2, y = (h - ih) / 2;
    g.clearRect(0, 0, w, h);
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 24; g.shadowOffsetY = 4; g.fillStyle = '#000'; g.fillRect(x + 2, y + 2, iw - 4, ih - 4); g.restore();
    g.imageSmoothingQuality = 'high'; g.drawImage(sh, x, y, iw, ih);
    t.needsUpdate = true;
  };
  img.src = url;
  return t;
}
// The fine dark grid between an LED wall's pixels, laid over what it shows
function ledGrid(wm, hm) {
  const t = canvasTexture(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.fillStyle = 'rgba(0,0,0,.42)'; for (let k = 0; k < w; k += 8) { g.fillRect(k, 0, 2, w); g.fillRect(0, k, w, 2); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(wm / 0.2, hm / 0.2);
  return t;
}

export function buildStage(kit, o) {
  const root = new THREE.Group();
  const zF = o.z, depth = o.depth || 3.2, zB = zF + depth, W = o.x1 - o.x0, cx = (o.x0 + o.x1) / 2, rH = 0.4, rz0 = zF + depth * 0.45;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); return m; };

  // The deck: a pleated maroon skirt with a gold edge, and the dark glossy top
  const skirt = add(new THREE.PlaneGeometry(W, o.h), new THREE.MeshStandardMaterial({ map: pleatTexture(), roughness: 0.9 }), cx, o.h / 2, zF);
  face(skirt);
  add(new THREE.BoxGeometry(W, o.h, depth), std('#1a0e0a', 0.9), cx, o.h / 2 - 0.005, zF + depth / 2 + 0.01);
  add(new THREE.BoxGeometry(W + 0.02, 0.02, depth + 0.02), std('#2a1a12', 0.78, 0.05), cx, o.h + 0.01, zF + depth / 2).receiveShadow = true;
  add(new THREE.BoxGeometry(W + 0.04, 0.05, 0.05), std('#c9963f', 0.35, 0.7), cx, o.h, zF - 0.02);
  // LED panels set into the skirt. Most of the time each shows the stage's mandala on maroon (the big one turning slowly,
  // two small ones turning the other way, all brightening on the beat). When the 2D scene's sponsor plan says so (five
  // seconds in every thirty, every other panel, each a different creative), a panel shows its creative instead: the
  // mandalas step aside for it, and the LED grid clears over it.
  const panels = [];
  let mandalas = null, aspect = 1;
  if (o.sponsors) {
    const spx0 = o.x0 + 2.9, spx1 = o.x1 - 2.9, gap = o.sponsors > 3 ? 0.45 : 0.7, spw = (spx1 - spx0 - gap * (o.sponsors - 1)) / o.sponsors, ph = o.h * 0.7, py = o.h * 0.49, bg = kit.litMap(panelTexture(spw / ph), 0.9, 'practical'), grid = new THREE.MeshBasicMaterial({ map: ledGrid(spw, ph), transparent: true, depthWrite: false });
    const spots = [];
    aspect = spw / ph;
    for (let s = 0; s < o.sponsors; s++) {
      const x = spx0 + s * (spw + gap) + spw / 2;
      add(new THREE.BoxGeometry(spw + 0.14, ph + 0.14, 0.1), std('#0c0a0e', 0.5, 0.3), x, py, zF - 0.02);
      face(add(new THREE.PlaneGeometry(spw, ph), bg, x, py, zF - 0.075));
      [[0, 0.42, 1], [-0.33, 0.24, -1], [0.33, 0.24, -1]].forEach(([u, r, dir]) => spots.push({ x: x + u * spw, y: py, z: zF - 0.08, r: ph * r * 2, dir, k: spots.length }));
      const sp = face(add(new THREE.PlaneGeometry(spw, ph), kit.litMap(null, 0.92, 'practical', { transparent: true, opacity: 0, depthWrite: false }), x, py, zF - 0.09));
      sp.visible = false; sp.userData.dynamic = true; sp.renderOrder = 2;
      const gm = grid.clone(), gl = face(add(new THREE.PlaneGeometry(spw, ph), gm, x, py, zF - 0.1)); gl.renderOrder = 3; gl.userData.dynamic = true;
      panels.push({ sp, grid: gm, a: 0 });
    }
    mandalas = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: mandalaTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }), spots.length);
    mandalas.userData = { spots, dynamic: true }; mandalas.renderOrder = 1; mandalas.frustumCulled = false; root.add(mandalas);
  }
  // A flight of steps at each end, with gold nosing
  [-1, 1].forEach((sd) => {
    const ax = sd < 0 ? o.x0 + 0.5 : o.x1 - 2.3, n = 4, tread = 0.9 / n;
    for (let s = 0; s < n; s++) {
      const hgt = o.h * (s + 1) / n;
      add(new THREE.BoxGeometry(1.8, hgt, tread), std(s % 2 ? '#3a1a14' : '#44201a', 0.85), ax + 0.9, hgt / 2, zF - 0.9 + s * tread + tread / 2);
      add(new THREE.BoxGeometry(1.8, 0.02, 0.03), std('#d6a64a', 0.35, 0.7), ax + 0.9, hgt, zF - 0.9 + s * tread);
    }
    const inner = sd < 0 ? ax + 1.8 : ax;
    const rail = add(new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(0.95, o.h)), std('#c9963f', 0.35, 0.7), inner, o.h / 2 + 0.95, zF - 0.47);
    rail.rotation.x = Math.atan2(0.95, o.h);
  });

  // The screen at the back: its frame and a dark panel; the picture on it is drawn live over the 3D stage
  // It's raised over the band (screenBottom), so the players stand in front of a dark star-cloth, not the picture
  const sx0 = o.x0 + 1, sx1 = o.x1 - 1, sw = sx1 - sx0, sb = o.screenBottom || o.h, sh = o.screenTop - sb;
  add(new THREE.BoxGeometry(sw + 0.3, sh + 0.3, 0.2), std('#0d0b10', 0.6), cx, sb + sh / 2, zB + 0.12);
  kit.pools.add(cx, sb + sh * 0.5, zB - 0.05, sw * 0.75, sh * 0.9, '#ffffff', 0.1, { vertical: true, theme: true, layer: 'show' });
  // The LED wall's face: the drone's live picture of the venue goes here (backdrop.js), under the 2D scene's people
  const feedScreen = face(add(new THREE.PlaneGeometry(sw, sh), feedMaterial(1.3), cx, sb + sh / 2, zB));
  feedScreen.visible = false; feedScreen.userData.dynamic = true;
  if (sb > o.h + rH + 0.5) {
    const cloth = add(new THREE.PlaneGeometry(sw + 0.3, sb - o.h - rH + 0.15), std('#0b0810', 0.95), cx, (o.h + rH + sb) / 2, zB + 0.01);
    face(cloth);
    const r = seeded(7);
    for (let k = 0; k < Math.round(sw * 4); k++) kit.bulbs.add(sx0 + r() * sw, o.h + rH + 0.2 + r() * (sb - o.h - rH - 0.3), zB - 0.005, 0, { color: '#fff4e0', k: 0.45, s: 0.22, twinkle: 0.85, ph: r() * TAU, layer: 'festive' });
  }
  // The stage's light spilling onto the ground in front of it, in the night's colour
  kit.pools.add(cx, 0.02, zF - 3, W * 0.55, 4.5, '#ffffff', 0.14, { theme: true, layer: 'show' });
  kit.pools.add(cx, 0.02, zF - 9, W * 0.8, 7, '#ffffff', 0.05, { theme: true, layer: 'show' });

  // The riser for the players, lined with a strip of LEDs
  add(new THREE.BoxGeometry(W - 2.8, rH, zB - rz0), std('#2b1c14', 0.8), cx, o.h + rH / 2, (rz0 + zB) / 2);
  const led = add(new THREE.PlaneGeometry(W - 2.8, 0.035), new THREE.MeshBasicMaterial({ color: '#ffffff' }), cx, o.h + rH * 0.5, rz0 - 0.01);
  face(led);

  // Truss towers, the top beam, velvet wings and the valance
  const tw = 0.4;
  [o.x0 - 0.4, o.x1 + 0.4].forEach((x) => { const tt = truss(o.truss, tw, Math.round(o.truss / 1.2)); tt.position.set(x, o.truss / 2, zF); root.add(tt); });
  const beam = truss(W + 0.8 + tw, tw, Math.round((W + 1) / 1.2)); beam.rotation.z = Math.PI / 2; beam.position.set(cx, o.truss, zF); root.add(beam);
  // Uplights at the foot of each truss tower and wing, washing them in the night's colour, so the stage's frame reads
  // against the dark instead of the band floating in it; and a warm wash on the skirt from footlights on the ground
  [o.x0 - 0.4, o.x1 + 0.4].forEach((x) => {
    add(new THREE.BoxGeometry(0.28, 0.16, 0.22), std('#141217', 0.5, 0.4), x, 0.08, zF - 0.45);
    kit.bigBulbs.add(x, 0.18, zF - 0.45, 0, { color: '#ffffff', k: 0.8, s: 0.45, twinkle: 0, layer: 'show' });
    kit.pools.add(x, o.truss * 0.42, zF - 0.24, 0.55, o.truss * 0.48, '#ffffff', 0.2, { vertical: true, theme: true, layer: 'show' });
    kit.pools.add(x, 0.02, zF - 0.6, 1.4, 1.4, '#ffffff', 0.12, { theme: true, layer: 'show' });
  });
  [-1, 1].forEach((sd) => kit.pools.add(sd < 0 ? o.x0 + 0.25 : o.x1 - 0.25, o.h + (o.truss - o.h) * 0.4, zF + 0.1, 0.5, (o.truss - o.h) * 0.45, '#ffffff', 0.14, { vertical: true, theme: true, layer: 'show' }));
  for (let k = 0; k < 6; k++) {
    const x = lerp(o.x0 + 1.5, o.x1 - 1.5, (k + 0.5) / 6);
    add(new THREE.BoxGeometry(0.22, 0.1, 0.16), std('#141217', 0.5, 0.4), x, 0.05, zF - 0.55);
    kit.pools.add(x, o.h * 0.45, zF - 0.03, 1.2, o.h * 0.5, LIGHT.warm, 0.05, { vertical: true, layer: 'show' });
  }
  [-1, 1].forEach((sd) => {
    const t = velvet().clone(); t.needsUpdate = true; t.repeat.set(0.3, 1);
    const wing = add(new THREE.PlaneGeometry(0.9, o.truss - 0.3 - o.h), new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide }), sd < 0 ? o.x0 + 0.25 : o.x1 - 0.25, o.h + (o.truss - 0.3 - o.h) / 2, zF + 0.15);
    face(wing);
  });
  const val = add(new THREE.PlaneGeometry(W + 0.4, 0.95), new THREE.MeshStandardMaterial({ map: valanceTexture(Math.max(4, Math.round(W / 2.2))), transparent: true, alphaTest: 0.3, roughness: 1, side: THREE.DoubleSide }), cx, o.truss - 0.6, zF + 0.1);
  face(val);

  // Moving heads under the beam; par cans between them
  const heads = [];
  for (let k = 0; k < 10; k++) {
    const x = lerp(o.x0, o.x1, (k + 0.5) / 10), y = o.truss - 0.35;
    if (k % 2) {
      const yoke = add(new THREE.BoxGeometry(0.34, 0.12, 0.3), std('#18161b', 0.5, 0.3), x, y + 0.12, zF);
      const hd = add(new THREE.CylinderGeometry(0.13, 0.16, 0.34, 12), std('#232027', 0.45, 0.4), x, y - 0.08, zF);
      hd.userData.dynamic = true; heads.push({ x, y: y - 0.2, mesh: hd, i: k });
      yoke.castShadow = false;
    }
    kit.bigBulbs.add(x, y - 0.28, zF - 0.02, k, { ph: k, twinkle: 0.1, layer: 'show' });
  }
  // Beams: down from the moving heads onto the crowd, and a fan rising from behind the band
  const downBeams = heads.map((h, i) => new Beam(root, '#ffffff', 10, 0.32, 0.12));
  const fan = [];
  for (let k = 0; k < 5; k++) fan.push(new Beam(root, '#ffffff', 8, 0.3, 0.16));

  // Line arrays hung either side, and subs on the ground under them
  [-1, 1].forEach((sd) => {
    const x = cx + sd * o.arrays;
    for (let k = 0; k < 6; k++) {
      const box = add(new THREE.BoxGeometry(1.4, 0.55, 0.8), std('#0b0909', 0.7), x, o.truss - 1.3 - k * 0.6, zF - 0.4 - k * k * 0.03);
      box.rotation.x = -k * 0.04;
    }
    [[-0.4, 0.55, 0.78, 1.1], [0.4, 0.55, 0.78, 1.1], [0, 1.38, 0.7, 0.55]].forEach(([dx, y, w, h]) => add(new THREE.BoxGeometry(w, h, 0.8), std('#0e0c0c', 0.75), x + dx, y, zF - 0.4));
  });

  // The front edge: a line of bulbs and marigold swags between them
  for (let k = 0; k <= 16; k++) kit.bulbs.add(lerp(o.x0, o.x1, k / 16), o.h - 0.03, zF - 0.05, k, { ph: k * 0.7, s: 0.75, k: 0.55, twinkle: 0.15 });
  const beads = [];
  for (let s = 0; s < 8; s++) {
    const A = [lerp(o.x0, o.x1, s / 8), o.h - 0.06, zF - 0.06], B = [lerp(o.x0, o.x1, (s + 1) / 8), o.h - 0.06, zF - 0.06];
    for (let k = 1; k < 14; k++) beads.push(sag(A, B, 0.35, k / 14));
  }
  const garl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), beads.length);
  garl.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(beads.length * 3), 3);
  const mx = new THREE.Matrix4(), cA = new THREE.Color('#f29a2e'), cB = new THREE.Color('#f6c342');
  beads.forEach((q, i) => { garl.setMatrixAt(i, mx.makeTranslation(q[0], q[1], q[2])); const c = i % 3 ? cA : cB; garl.instanceColor.setXYZ(i, c.r, c.g, c.b); });
  root.add(garl);

  // Gear on the deck. Wedge monitors along the front, angled up at the singers, with their cables taped back across
  // the deck; the band's amps at the back of the riser on a rug. The wedges stand between you and the singers' feet,
  // so they leave the 2D scene their outlines (stageFront) to cut after it draws the band.
  const stageFront = [], tape = std('#0b0b0c', 0.9);
  [-0.34, -0.12, 0.12, 0.34].forEach((f) => {
    const x = cx + f * W, wg = monitorWedge(root, x, o.h, zF + 0.2, 1.3);
    stageFront.push(solidOf(wg));
    add(new THREE.BoxGeometry(0.03, 0.01, depth * 0.55), tape, x + 0.22, o.h + 0.025, zF + 0.4 + depth * 0.275);
    kit.bulbs.add(x + 0.22, o.h + 0.1, zF - 0.02, 0, { color: '#5aa8ff', k: 0.5, s: 0.25, twinkle: 0, layer: 'show' });
  });
  // The band's own gear at each player's place (band.js), on rugs laid along the riser
  let bandHoles = null;
  if (o.band) {
    [0.2, 0.8].forEach((u) => { const rug = add(new THREE.PlaneGeometry(W * 0.3, (zB - rz0) * 0.7), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }), o.x0 + W * u, o.h + rH + 0.006, rz0 + (zB - rz0) * 0.45); rug.rotation.x = -Math.PI / 2; });
    bandHoles = buildBand(kit, root, o.band, { x0: o.x0, x1: o.x1, front: rz0, back: zB, floor: o.h + rH, singers: false });
  }
  // Par cans hung between the moving heads on the front beam, their lenses the bulbs under the beam
  for (let k = 0; k < 10; k += 2) {
    const x = lerp(o.x0, o.x1, (k + 0.5) / 10), can = add(new THREE.CylinderGeometry(0.12, 0.1, 0.3, 10), std('#141217', 0.45, 0.5), x, o.truss - 0.5, zF - 0.02);
    can.rotation.x = 0.5;
    add(new THREE.BoxGeometry(0.28, 0.03, 0.03), std('#141217', 0.5, 0.5), x, o.truss - 0.32, zF - 0.02);
  }
  // The side screens on lattice legs either side of the stage (their pictures are drawn live over the frames)
  if (o.sideScreens) [-1, 1].forEach((sd) => {
    const xa = Math.min(sd * 14.6, sd * 24.2), xb = Math.max(sd * 14.6, sd * 24.2), y0 = 4.4, y1 = 9.8, z = zF + 0.3;
    [xa + 0.7, xb - 0.7].forEach((lx) => { const leg = truss(y0, 0.32, Math.round(y0 / 1.1)); leg.position.set(lx, y0 / 2, z + 0.25); root.add(leg); });
    add(new THREE.BoxGeometry(xb - xa + 0.5, y1 - y0 + 0.5, 0.2), std('#0b0a0d', 0.6), (xa + xb) / 2, (y0 + y1) / 2, z + 0.12);
    add(new THREE.BoxGeometry(xb - xa, 0.12, 0.5), std('#15131a', 0.6, 0.3), (xa + xb) / 2, y0 - 0.3, z + 0.3);
    kit.pools.add((xa + xb) / 2, 0.02, z - 3, (xb - xa) * 0.6, 4, '#ffffff', 0.12, { theme: true, layer: 'show' });
  });

  return {
    root, stageFront, bandHoles, feedScreen,
    front: { x: cx, y: o.h, z: zF },
    // Where a light on the band should stand and aim
    wash: { pos: [cx, o.truss - 0.4, zF - 4], to: [cx, o.h + rH + 1.3, zF + depth * 0.62] },
    update(t, ctx) {
      const { TH, pulse, reduce, close, lv } = ctx, show = lv.show, on = lv.show > 0.5;
      if (mandalas) {
        const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
        // Each panel shows what the sponsor plan gives it
        const plan = ctx.sponsors;
        panels.forEach((p, i) => {
          const q = plan && plan.panels && plan.panels[i], url = q && q.k >= 0 ? plan.urls[q.k] : null;
          p.a = url ? q.a : 0;
          if (url && p.a > 0.01) { const tex = creative(url, 'panel' + aspect.toFixed(2), (u) => framedCreative(u, aspect)); if (p.sp.material.map !== tex) { const had = !!p.sp.material.map; p.sp.material.map = tex; if (!had) p.sp.material.needsUpdate = true; } }
          p.sp.visible = p.a > 0.01; p.sp.material.opacity = p.a; p.grid.opacity = 1 - p.a;
        });
        mandalas.userData.spots.forEach((m, i) => {
          const r = m.r * (1 + 0.04 * pulse) * (1 - (panels[Math.floor(i / 3)] || { a: 0 }).a); e.set(0, Math.PI, reduce ? 0 : m.dir * t * 0.25 + i); q.setFromEuler(e);
          mandalas.setMatrixAt(i, mx.compose(ps.set(m.x, m.y, m.z), q, sc.set(-r, r, 1)));
        });
        mandalas.instanceMatrix.needsUpdate = true;
        mandalas.material.color.setScalar((0.9 + 0.35 * pulse * lv.show) * lv.practical);
      }
      led.material.color.copy(hsl(TH.hues[Math.floor(t * 0.5) % TH.hues.length] + 20 * Math.sin(t * TH.speed), TH.sat, 45)).multiplyScalar((0.4 + 0.3 * pulse) * show);
      heads.forEach((h, i) => {
        const tt = reduce ? 0 : t * (0.4 + TH.speed), sw = Math.sin(tt + i * 1.3) * 3.5;
        const to = [h.x + sw, 0, zF - 5 - (close ? 0 : 2 + 2 * Math.sin(tt * 0.7 + i))];
        h.mesh.rotation.x = -0.4 + Math.sin(tt + i) * 0.2; h.mesh.rotation.z = Math.sin(tt + i * 1.3) * 0.3;
        downBeams[i].aim([h.x, h.y, zF], to);
        downBeams[i].set(TH.beams[i % TH.beams.length], show * (0.8 + 0.5 * pulse));
      });
      fan.forEach((b, k) => {
        const bx = lerp(o.x0 + 1.9, o.x1 - 1.9, (k + 0.5) / 5), sweep = reduce ? 0 : Math.sin(t * (0.5 + TH.speed * 0.6) + k * 1.7) * 2.2;
        b.aim([bx, o.h + rH, zB - 0.2], [bx + sweep, o.screenTop + 3, zB - 1.4]);
        b.set(TH.beams[(k + 1) % TH.beams.length], Math.max(0, show - 0.3) / 0.7 * (0.9 + 0.5 * pulse));
      });
    }
  };
}
