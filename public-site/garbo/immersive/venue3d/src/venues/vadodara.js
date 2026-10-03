// VADODARA VISION 2047, built from the owner's starred references (research/venue-reference-pack, priority 9, "Cyberpunk
// City Plaza": the hero shot zip-132, the facades zip-068 and zip-067, the plan zip-100, zip-120, zip-126, zip-139 and the
// twelve-view board), named by the owner on 2026-10-02. A plaza in the heart of a city at night, laid out as the plan
// draws it: a square of wet dark tiles holding every light; in the middle a round LED floor in concentric rings of pink,
// violet and cyan round a lotus, and a rosette of light on each diagonal; the stage at the north, low and wide, its
// screen between tall LED panels of nested diamonds and magenta neon pillars, a lotus drawn in neon over it, searchlights
// fanning up behind; an elevated metro on its viaduct running behind the stage, a train gliding along it; down both sides
// podium blocks whose fronts are giant LED panels of diamonds and chevrons, palms on their roofs, warm glass shopfronts at
// their feet, digital booths before them; freestanding LED totems round the plaza; palms in lit planters, warm cube
// bollards; towers all round, dark glass traced in LED strips and crowned with diamonds. Screens and facades carry
// pattern, never figures.
//
// The plan is the 2D scene's (venues2d/vadodara.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std, Beam } from '../kit.js';
import { buildStage } from '../stage.js';
import { canvas, normalMap, tex } from '../floors.js';
import { ground } from './common.js';
import { newDecor } from './decor.js';

const MAG = '#ff3ad0', CYA = '#38e0ff', VIO = '#9a5aff', LIME = '#7aff6a', PINK = '#ff5aa8';
const PALETTES = [[MAG, CYA, VIO], [CYA, MAG, LIME], [VIO, PINK, CYA], [LIME, CYA, MAG], [PINK, VIO, CYA]];

/* ---------- textures ---------- */
// Wet tiles: a grid of dark slabs, the joints a shade lighter, a sheen where water lies
function wetTiles(res) {
  const r = seeded(9), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#3a3646'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  const n = 4, w = res / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const t = 26 + r() * 10; g.fillStyle = `rgb(${t},${t - 2},${t + 10})`; g.fillRect(i * w + 2, k * w + 2, w - 4, w - 4); hg.fillStyle = '#909090'; hg.fillRect(i * w + 2, k * w + 2, w - 4, w - 4); }
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(210,200,240,.04)' : 'rgba(0,0,0,.08)'; g.fillRect(r() * res, r() * res, 1.4, 1.4); }
  return { map: tex(c, [120 / 4.8, 120 / 4.8]), normal: tex(normalMap(hc, 0.7), [120 / 4.8, 120 / 4.8], true) };
}
// An LED panel, as the facades and totems carry them: a dark face of LED pixels, a bright edge, and on it glowing line art
// (nested diamonds stacked up its height, chevrons, or a lotus), each line drawn with a halo, then the pixel grid laid
// over all of it so it reads as an LED wall
function ledPanel(kind, pal, w = 256, h = 768, seed = 1) {
  const r = seeded(seed);
  return canvasTexture(w, h, (g) => {
    g.fillStyle = '#07060c'; g.fillRect(0, 0, w, h);
    const glowLine = (draw, col, lw) => { g.save(); g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = lw * 3; g.lineWidth = lw; draw(); g.stroke(); g.restore(); };
    const diamond = (cx, cy, rw, rh) => () => { g.beginPath(); g.moveTo(cx, cy - rh); g.lineTo(cx + rw, cy); g.lineTo(cx, cy + rh); g.lineTo(cx - rw, cy); g.closePath(); };
    if (kind === 'diamond') {
      const n = Math.max(1, Math.round(h / w / 1.2)), ch = h / n;
      for (let i = 0; i < n; i++) {
        const cx = w / 2, cy = ch * (i + 0.5);
        for (let k = 0; k < 4; k++) { const s = 1 - k * 0.22; glowLine(diamond(cx, cy, w * 0.44 * s, ch * 0.44 * s), pal[k % pal.length], k ? 4 : 6); }
        g.fillStyle = pal[1]; g.shadowColor = pal[1]; g.shadowBlur = 14; diamond(cx, cy, w * 0.08, ch * 0.08)(); g.fill(); g.shadowBlur = 0;
        // small diamonds in the corners of each motif
        [[0.12, 0.1], [0.88, 0.1], [0.12, 0.9], [0.88, 0.9]].forEach(([u, v]) => glowLine(diamond(w * u, ch * i + ch * v, w * 0.05, ch * 0.05), pal[2], 3));
      }
    } else if (kind === 'chevron') {
      for (let y = -w; y < h + w; y += w * 0.42) { const col = pal[Math.abs(Math.round(y / (w * 0.42))) % pal.length]; glowLine(() => { g.beginPath(); g.moveTo(w * 0.08, y + w * 0.3); g.lineTo(w / 2, y); g.lineTo(w * 0.92, y + w * 0.3); }, col, 7); }
      glowLine(() => { g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); }, pal[2], 2);
    } else if (kind === 'lotus') {
      const cx = w / 2, cy = h * 0.55, R = Math.min(w, h) * 0.42;
      const petal = (a, r0, r1, wd) => () => { g.beginPath(); g.save(); g.translate(cx, cy); g.rotate(a); g.moveTo(0, -r0); g.bezierCurveTo(wd, -r0 - (r1 - r0) * 0.3, wd * 0.8, -r1 * 0.85, 0, -r1); g.bezierCurveTo(-wd * 0.8, -r1 * 0.85, -wd, -r0 - (r1 - r0) * 0.3, 0, -r0); g.restore(); };
      for (let i = -3; i <= 3; i++) glowLine(petal(i * 0.36, R * 0.15, R * (1 - Math.abs(i) * 0.12), R * 0.22), i % 2 ? pal[0] : pal[1], 5);
      for (let i = -2; i <= 2; i++) glowLine(petal(i * 0.5, R * 0.1, R * 0.55, R * 0.16), pal[2], 3);
      glowLine(() => { g.beginPath(); g.moveTo(cx - R, cy + R * 0.08); g.quadraticCurveTo(cx, cy + R * 0.3, cx + R, cy + R * 0.08); }, pal[1], 4);
      for (let i = 0; i < 26; i++) { const a = Math.PI + i / 25 * Math.PI, rr = R * 1.15; g.fillStyle = pal[i % 3]; g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9, 4, 0, TAU); g.fill(); }
    }
    // a little sparkle, the pixel grid, and the bright edge
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.3})`; g.fillRect(r() * w, r() * h, 3, 3); }
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.strokeStyle = pal[0]; g.lineWidth = 6; g.shadowColor = pal[0]; g.shadowBlur = 10; g.strokeRect(3, 3, w - 6, h - 6);
  }, { anisotropy: 8 });
}
// The LED floor (zip-132): rings of pink, violet and cyan, rows of dots between, a lotus of petals in the middle; and the
// rosettes on the diagonals: an eight-point flower of light
function floorMaterial(kind) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT; uniform float uK; uniform float uPulse; varying vec2 vUv;
      vec3 MAG = vec3(1.0, 0.2, 0.82), CYA = vec3(0.22, 0.88, 1.0), VIO = vec3(0.6, 0.36, 1.0), PNK = vec3(1.0, 0.36, 0.66);
      float ring(float r, float at, float w) { return smoothstep(w, 0.0, abs(r - at)); }
      void main(){
        vec2 p = (vUv - 0.5) * 2.0; float r = length(p), a = atan(p.y, p.x); vec3 col = vec3(0.0);
        ${kind === 'rosette' ? `
        float pet = 0.55 + 0.35 * abs(cos(a * 4.0)); col += MAG * ring(r, pet, 0.035) * 1.3 + PNK * smoothstep(pet, pet - 0.15, r) * 0.25;
        float pet2 = 0.3 + 0.18 * abs(cos(a * 4.0 + 0.785)); col += CYA * ring(r, pet2, 0.03) * 1.2;
        col += VIO * smoothstep(0.12, 0.0, r) * 1.2 + CYA * ring(r, 0.95, 0.02) * 0.9;
        col *= step(r, 1.0);` : `
        // the rim: a ring of pink, dots in a ring inside it
        col += PNK * ring(r, 0.975, 0.018) * 1.6 + MAG * ring(r, 0.93, 0.01);
        float dots = smoothstep(0.32, 0.0, length(vec2(fract(a / 6.2832 * 96.0) - 0.5, (r - 0.89) * 70.0))); col += CYA * dots * 1.0;
        // a band of violet petals turning slowly, cyan dots in rows
        float ang = a * 24.0 + uT * 0.3; float pb = 0.72 + 0.1 * abs(cos(ang * 0.5)); col += VIO * ring(r, pb, 0.022) * 1.2 + MAG * smoothstep(pb, pb - 0.08, r) * step(0.62, r) * 0.18;
        col += CYA * ring(r, 0.6, 0.012) * 1.3;
        float d2 = smoothstep(0.3, 0.0, length(vec2(fract(a / 6.2832 * 48.0 - uT * 0.02) - 0.5, (r - 0.53) * 40.0))); col += PNK * d2;
        // the lotus: sixteen petals, eight inside them
        float l1 = 0.25 + 0.2 * abs(cos(a * 8.0 - uT * 0.15)); col += MAG * ring(r, l1, 0.02) * 1.4 + PNK * smoothstep(l1, 0.0, r) * 0.14;
        float l2 = 0.1 + 0.12 * abs(cos(a * 4.0 + uT * 0.2)); col += CYA * ring(r, l2, 0.016) * 1.4;
        col += vec3(1.0, 0.85, 1.0) * smoothstep(0.05, 0.0, r);
        col += VIO * 0.05; col *= step(r, 1.0);`}
        gl_FragColor = vec4(col * uK * (0.85 + 0.3 * uPulse), 1.0);
      }`
  });
}
// A tower's windows: a grid of panes, a few lit, the rest dark glass
function windowsTexture(seed) {
  const r = seeded(seed);
  return canvasTexture(64, 256, (g, w, h) => {
    g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 6) for (let x = 2; x < w; x += 5) { const l = r(); if (l < 0.18) { g.fillStyle = l < 0.06 ? 'rgba(255,214,160,.7)' : 'rgba(150,180,255,.45)'; g.fillRect(x, y, 3, 3); } }
  });
}
// A shopfront: tall panes of warm light, mullions, a few shapes of shelves and people inside
function shopTexture(seed) {
  const r = seeded(seed);
  return canvasTexture(256, 96, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffcf8a'); gr.addColorStop(1, '#c87a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(80,40,20,${0.2 + r() * 0.3})`; g.fillRect(r() * w, h * (0.35 + r() * 0.4), 6 + r() * 20, h * 0.3); }
    g.fillStyle = '#1a1420'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); g.fillRect(0, 0, w, 6); g.fillRect(0, h * 0.62, w, 2);
  });
}
function citySky() {
  const root = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { c0: { value: new THREE.Color('#0a0610') }, c1: { value: new THREE.Color('#4a1a6a') }, c2: { value: new THREE.Color('#1a0e3a') }, c3: { value: new THREE.Color('#06041a') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h < 0.0 ? c0 : h < 0.14 ? mix(c1, c2, h / 0.14) : mix(c2, c3, clamp((h - 0.14) / 0.5, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }'
  }));
  dome.renderOrder = -10; root.add(dome);
  return { root, moonLight: { dir: new THREE.Vector3(0.2, 0.9, 0.3).normalize(), intensity: 0.12 }, info: null };
}

/* ---------- the venue ---------- */
function vadodara(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, CY = sp.plan, S = sp.stage, D = newDecor(kit, root), leds = [], mx = new THREE.Matrix4();
  const panelMats = {}, panelMat = (kind, pi, w, h) => { const key = kind + pi + w + 'x' + h; if (!panelMats[key]) { const m = new THREE.MeshBasicMaterial({ map: ledPanel(kind, PALETTES[pi % PALETTES.length], w, h, pi + 3), fog: false }); m.color.setScalar(1.25); panelMats[key] = m; } return panelMats[key]; };
  const glowM = (hex, k) => kit.glow(hex, k, 'show');

  /* the plaza: wet tiles */
  const wt = wetTiles(phone ? 512 : 1024);
  const floorMesh = ground(root, { map: wt.map, normalMap: wt.normal, normalScale: 0.2, roughness: 0.16, decal: null, decalRect: null }, 140, 140, 6, tier.shadows);
  floorMesh.material.userData.env = 1.35;

  /* the LED floor and the rosettes on its diagonals */
  const lf = floorMaterial('floor'), ledFloor = new THREE.Mesh(new THREE.CircleGeometry(CY.floor, 96), lf);
  ledFloor.rotation.x = -Math.PI / 2; ledFloor.position.y = 0.012; ledFloor.userData.dynamic = true; root.add(ledFloor); leds.push({ m: lf, k: 0.8 });
  const rm = floorMaterial('rosette');
  [45, 135, 225, 315].forEach((d) => { const a = d * Math.PI / 180, m = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), rm); m.rotation.x = -Math.PI / 2; m.position.set(Math.cos(a) * CY.diamonds, 0.012, Math.sin(a) * CY.diamonds); m.userData.dynamic = true; root.add(m); });
  leds.push({ m: rm, k: 0.75 });
  kit.pools.add(0, 0.02, 0, CY.floor + 5, CY.floor + 5, '#c040ff', 0.09, { layer: 'show' });

  /* podium blocks down both sides: LED panels across their fronts, palms on their roofs, warm shopfronts at their feet */
  const dark = std('#14121a', 0.55, 0.4), concrete = std('#24222c', 0.8, 0.1), shopMats = [shopTexture(3), shopTexture(7)].map((t) => kit.litMap(t, 0.95, 'practical'));
  [-1, 1].forEach((sd) => {
    [[-18, 12, 16], [-4, 14, 20], [11, 14, 15], [24, 10, 18]].forEach(([z0, len, h], i) => {
      const x = sd * (CY.x + 6), zc = z0 + len / 2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(12, h, len), dark); block.position.set(x, h / 2, zc); root.add(block);
      // the shopfront on the ground floor, its canopy, a cyan line along the canopy's edge
      const shop = new THREE.Mesh(new THREE.PlaneGeometry(len - 1, 3.2), shopMats[i % 2]); shop.position.set(x - sd * 6.02, 1.8, zc); shop.rotation.y = -sd * Math.PI / 2; root.add(shop);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, len), concrete); canopy.position.set(x - sd * 7, 3.6, zc); root.add(canopy);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), glowM(CYA, 1.6)); line.position.set(x - sd * 8.1, 3.6, zc); root.add(line);
      kit.pools.add(x - sd * 8, 0.02, zc, 2.6, len * 0.5, '#ffbf7a', 0.12, { layer: 'practical' });
      // the facade: two or three tall LED panels side by side, diamonds and chevrons, a terrace between them and the roof
      const n = len > 13 ? 3 : 2, pw = (len - 1.6) / n;
      for (let k = 0; k < n; k++) {
        const kind = (i + k) % 3 === 1 ? 'chevron' : 'diamond', ph = h - 6.2, m = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.5, ph), panelMat(kind, i * 3 + k + (sd > 0 ? 1 : 0), 256, Math.round(256 * ph / (pw - 0.5))));
        m.position.set(x - sd * 6.03, 4.4 + ph / 2, z0 + 0.8 + pw * (k + 0.5)); m.rotation.y = -sd * Math.PI / 2; root.add(m);
        kit.pools.add(x - sd * 9, 0.02, m.position.z, pw * 0.5, 3.5, PALETTES[(i * 3 + k) % 5][0], 0.06, { layer: 'show' });
      }
      // roof: a parapet with a line of light, palms in planters
      const par = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len), glowM(MAG, 1.4)); par.position.set(x - sd * 6.05, h + 0.05, zc); root.add(par);
      for (let k = 0; k < Math.round(len / 4); k++) D.palm(x - sd * (4 + (k % 2)), z0 + 1.5 + k * 4, 0.95, h);
    });
  });

  /* digital booths before the blocks: glass kiosks, a screen on the front, a cyan line round the roof */
  for (let z = -12; z <= 20; z += 8) [-1, 1].forEach((sd) => {
    const x = sd * 25.5, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -sd * Math.PI / 2; root.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 2.4), std('#16141c', 0.45, 0.5)); body.position.y = 1.4; g.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), panelMat('diamond', (z + 12) / 8 + (sd > 0 ? 2 : 0), 256, 148)); scr.position.set(0, 1.7, 1.21); g.add(scr);
    const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 2.6), glowM(CYA, 1.5)); roofEdge.position.y = 2.84; g.add(roofEdge);
  });

  /* LED totems round the plaza, as the plan places its holographic pillars */
  CY.pillars.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); root.add(g);
    const H = 8 + (i % 3), body = new THREE.Mesh(new THREE.BoxGeometry(1.7, H, 1.7), std('#0c0c12', 0.5, 0.6)); body.position.y = H / 2; g.add(body);
    const pm = panelMat(i % 2 ? 'diamond' : 'chevron', i, 128, Math.round(128 * (H - 0.6) / 1.5));
    for (let f = 0; f < 4; f++) { const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.5, H - 0.6), pm); scr.position.set(Math.sin(f * Math.PI / 2) * 0.86, H / 2, Math.cos(f * Math.PI / 2) * 0.86); scr.rotation.y = f * Math.PI / 2; g.add(scr); }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 1.9), glowM(PALETTES[i % 5][1], 1.5)); cap.position.y = H + 0.1; g.add(cap);
    kit.pools.add(x, 0.02, z, 3.2, 3.2, PALETTES[i % 5][0], 0.12, { layer: 'show' });
  });

  /* palms in lit planters, warm cube bollards round the dance floor and along the walks */
  for (let i = 0; i < 14; i++) {
    // (none before the stage, nor between the far seats and the floor)
    const a = (i + 0.5) / 14 * TAU, x = Math.cos(a) * 20.5, z = Math.sin(a) * 18 + 2; if ((z > 16 && Math.abs(x) < 12) || (z < -8 && Math.abs(x) < 14)) continue;
    const pl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), std('#1a1a22', 0.4, 0.4)); pl.position.set(x, 0.3, z); root.add(pl);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.05, 2.45), glowM(i % 2 ? CYA : MAG, 1.3)); edge.position.set(x, 0.62, z); root.add(edge);
    D.palm(x, z, 1.2, 0.6); kit.bigBulbs.add(x, 0.75, z, 0, { color: '#ffd0a0', k: 0.8, s: 0.4, twinkle: 0, layer: 'architectural' });
  }
  const bollards = [];
  for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * TAU, rr = CY.floor + 1.6; bollards.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  for (let z = -22; z < -12; z += 2.5) [-3.2, 3.2].forEach((x) => bollards.push([x, z]));
  // (each a post of dark metal with a frosted cap lit warm, and its light on the stone at its foot)
  { const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.46, 0.3), std('#1a1822', 0.35, 0.7), bollards.length), cm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), kit.glow('#ffcf8a', 1.5, 'practical'), bollards.length);
    bollards.forEach(([x, z], i) => { bm.setMatrixAt(i, mx.makeTranslation(x, 0.23, z)); cm.setMatrixAt(i, mx.makeTranslation(x, 0.52, z)); kit.pools.add(x, 0.02, z, 0.9, 0.9, '#ffcf8a', 0.1, { layer: 'practical' }); });
    root.add(bm); root.add(cm); }
  kit.pools.add(0, 0.02, 0, CY.floor + 2.2, CY.floor + 2.2, '#ffcf8a', 0.05, { layer: 'practical' });

  /* the stage: its screen between tall LED panels of nested diamonds, magenta neon pillars, a lotus in neon over it */
  const stage = buildStage(kit, { x0: S.x0, x1: S.x1, z: S.z, h: S.h, depth: S.depth, screenBottom: S.screenBottom, screenTop: S.screenTop, truss: S.truss, arrays: S.arrays, band: BAND.big });
  root.add(stage.root);
  const zB = S.z + S.depth;
  [-1, 1].forEach((sd) => {
    [[S.x1 + 2.0, 10.4, 3.0], [S.x1 + 5.4, 8.6, 2.6]].forEach(([x, h, w], k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), panelMat(k ? 'chevron' : 'diamond', k + (sd > 0 ? 2 : 0), 192, Math.round(192 * h / w))); m.position.set(sd * x, h / 2 + 0.6, zB - 0.4 - k * 0.6); m.rotation.y = Math.PI; root.add(m); });
    [S.x1 + 0.6, S.x1 + 3.7, S.x1 + 7.0].forEach((x) => { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 11, 10), glowM(MAG, 1.7)); tube.position.set(sd * x, 5.5, zB - 0.6); root.add(tube); });
  });
  { const lot = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.6), new THREE.MeshBasicMaterial({ map: ledPanel('lotus', [MAG, CYA, VIO], 512, 262, 31), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); lot.material.color.setScalar(1.5); lot.position.set(0, S.truss + 2.6, zB - 0.8); lot.rotation.y = Math.PI; root.add(lot); }
  const searches = []; for (let i = 0; i < (phone ? 4 : 6); i++) searches.push({ i, x: lerp(-16, 16, i / ((phone ? 4 : 6) - 1)), beam: new Beam(root, [MAG, CYA, VIO][i % 3], 90, 0.05, 0.22) });

  /* the metro: a viaduct behind the stage on round piers, lines of light along it, a train gliding by */
  const MZ = CY.metroZ, MY = CY.metroY;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(280, 1.5, 8), std('#2a2a34', 0.55, 0.35)); deck.position.set(0, MY, MZ); root.add(deck);
  [[-4.05, CYA], [4.05, MAG]].forEach(([dz, c]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(280, 0.14, 0.14), glowM(c, 1.7)); l.position.set(0, MY - 0.55, MZ + dz); root.add(l); });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(280, 0.9, 0.08), new THREE.MeshBasicMaterial({ color: '#8a7aff', transparent: true, opacity: 0.25, depthWrite: false })); rail.position.set(0, MY + 1.2, MZ - 4); root.add(rail);
  for (let x = -126; x <= 126; x += 18) { const p = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, MY - 0.75, 16), std('#2a2a34', 0.6, 0.3)); p.position.set(x, (MY - 0.75) / 2, MZ); root.add(p); const band = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.05, 6, 24), glowM(CYA, 1.4)); band.rotation.x = Math.PI / 2; band.position.set(x, MY - 2, MZ); root.add(band); }
  const train = new THREE.Group(); train.userData.dynamic = true; root.add(train);
  const carBody = std('#c8ccd8', 0.32, 0.6), carWin = kit.glow('#bfe8ff', 1.3, 'practical'), carStripe = kit.glow(MAG, 1.5, 'festive');
  for (let k = 0; k < 5; k++) { const car = new THREE.Mesh(new THREE.BoxGeometry(13.4, 3, 3.2), carBody); car.position.set(k * 14, MY + 2.25, MZ + 1.5); train.add(car); const win = new THREE.Mesh(new THREE.BoxGeometry(12, 0.85, 3.26), carWin); win.position.set(k * 14, MY + 2.6, MZ + 1.5); train.add(win); const stripe = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.14, 3.26), carStripe); stripe.position.set(k * 14, MY + 1.35, MZ + 1.5); train.add(stripe); }

  /* the towers all round: dark glass, a few windows lit, LED strips up their edges, a crown of diamonds on some */
  const r2 = seeded(77), winMats = [0, 1, 2].map((k) => { const t = windowsTexture(40 + k); t.wrapS = t.wrapT = THREE.RepeatWrapping; return kit.litMap(t, 0.55, 'ambient'); });
  for (let i = 0; i < (phone ? 30 : 52); i++) {
    const a = r2() * TAU, d = 75 + r2() * 105, x = Math.cos(a) * d, z = Math.sin(a) * d + 10; if (z < -40 && Math.abs(x) < 40) continue;
    const w = 12 + r2() * 18, dd = 12 + r2() * 16, h = 50 + r2() * (d > 120 ? 170 : 120), c = Math.floor(r2() * 3);
    const geo = new THREE.BoxGeometry(w, h, dd), uv = geo.attributes.uv, p = geo.attributes.position, n = geo.attributes.normal;
    for (let k = 0; k < uv.count; k++) { const side = Math.abs(n.getX(k)) > 0.5 ? dd : w; uv.setXY(k, uv.getX(k) * side / 16, (p.getY(k) + h / 2) / 64); }
    const m = new THREE.Mesh(geo, winMats[c]); m.position.set(x, h / 2 - 10, z); root.add(m);
    const neon = glowM([MAG, CYA, VIO][c], 1.6), face = Math.atan2(-x, -(z - 10));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.6, h, 0.6), neon); e.position.set(x + sx * w / 2, h / 2 - 10, z + sz * dd / 2); root.add(e); });
    if (r2() < 0.55) {
      // a tall LED panel down the face towards the plaza, diamonds on it
      const ph = h * 0.45, pnl = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, ph), panelMat(r2() < 0.5 ? 'diamond' : 'chevron', i, 128, Math.round(128 * ph / (w * 0.6)))); pnl.position.set(x - Math.sin(face) * (dd / 2 + 0.3) * -1, h - 10 - ph / 2 - 4, z - Math.cos(face) * (dd / 2 + 0.3) * -1); pnl.rotation.y = face; root.add(pnl);
    }
    if (r2() < 0.35) { const sp2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 14, 6), neon); sp2.position.set(x, h - 10 + 7, z); root.add(sp2); }
  }

  /* the gates on the near side: open leaves of black metal with brass wheels, LED panels of crossed diamonds either side */
  [-1, 1].forEach((sd) => {
    const leaf = new THREE.Group(); leaf.position.set(sd * 4.2, 0, CY.z0 + 1); leaf.rotation.y = sd * 1.1; root.add(leaf);
    const fr = std('#141418', 0.4, 0.8), brass = std('#c9953a', 0.3, 0.9);
    for (let k = 0; k < 9; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 0.05), fr); bar.position.set(-sd * (0.2 + k * 0.42), 2.1, 0); leaf.add(bar); }
    [0.3, 2.1, 4.1].forEach((y) => { const rl = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.08), fr); rl.position.set(-sd * 1.9, y, 0); leaf.add(rl); });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 24), brass); wheel.position.set(-sd * 1.9, 2.4, 0); leaf.add(wheel);
    const pnl = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), panelMat('diamond', sd > 0 ? 1 : 0, 256, 256)); pnl.position.set(sd * 9.5, 3.4, CY.z0 + 0.6); root.add(pnl);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.6, 0.6), std('#1a1a22', 0.5, 0.5)); post.position.set(sd * 4.4, 2.3, CY.z0 + 1); root.add(post);
  });

  /* sofas round the floor */
  (CY.seats || []).forEach((sf) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#1a1a20', seat: '#2a2a34', cushions: [MAG, CYA, VIO, '#ffd04a'] });
    if (!sf.near) D.table(sf.x + Math.sin(sf.ry) * 1.0, sf.z + Math.cos(sf.ry) * 1.0, 0.9, 0.55, { candles: 1, wood: '#121216' });
  });
  D.finish();

  // what the wet tiles reflect: the LED fronts and the neon
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#0c0614', side: THREE.BackSide })));
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, m = new THREE.Mesh(new THREE.BoxGeometry(4, 12, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTES[i % 5][0]).multiplyScalar(2.6) })); m.position.set(Math.cos(a) * 30, 6, Math.sin(a) * 30); m.lookAt(0, 6, 0); env.add(m); }
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#c060ff').multiplyScalar(2) })); scr.position.set(0, 6, 30); scr.rotation.y = Math.PI; env.add(scr);

  const rig = {
    hemi: ['#5a3a7a', '#221628', 0.55, 0.8], moon: 0,
    spots: [{ pos: [0, 18, -8], to: [0, 0, 6], color: '#e8d8ff', base: 60, distance: 50, angle: 0.62, layer: 'key' }, { pos: stage.wash.pos, to: stage.wash.to, color: '#ffe4c4', base: 120, distance: 26, angle: 0.55, layer: 'show' }],
    points: [{ pos: [-16, 6, 4], color: MAG, base: 46, distance: 26, layer: 'show' }, { pos: [16, 6, 4], color: CYA, base: 46, distance: 26, layer: 'show' }, { pos: [0, 3, 0], color: '#c060ff', base: 30, distance: 18, layer: 'show' }, { pos: [0, 4, -16], color: '#ffcf8a', base: 26, distance: 16, layer: 'practical' }]
  };
  const panelList = Object.values(panelMats);
  return {
    rig, stage, feedScreen: stage.feedScreen, floor: floorMesh, fog: new THREE.FogExp2('#24123a', 0.0055), exposure: 1.05, envScene: env,
    update(t, ctx) {
      const { pulse, reduce, lv } = ctx, tt = reduce ? 0 : t;
      leds.forEach((l) => { l.m.uniforms.uT.value = tt; l.m.uniforms.uK.value = l.k * (0.45 + 0.55 * lv.show); l.m.uniforms.uPulse.value = pulse; });
      panelList.forEach((m, i) => m.color.setScalar((0.95 + 0.3 * lv.show) * (1 + (reduce ? 0 : 0.12 * Math.sin(tt * 1.7 + i * 0.9))) * (1 + 0.1 * pulse)));
      searches.forEach((s) => { const a = 0.5 * Math.sin(tt * 0.3 + s.i * 1.3); s.beam.aim([s.x, 1, S.z + 9], [s.x + Math.sin(a) * 60, 90, S.z + 40 + Math.cos(a) * 20]); s.beam.set([MAG, CYA, VIO][s.i % 3], 0.5 + 0.5 * lv.show); });
      // the train crosses every forty seconds or so, a pause between
      train.position.x = reduce ? -70 : ((tt * 9) % 360) - 200;
    }
  };
}

export default { seed: 1313, sky: citySky, garbo: 'bare', garboK: 7, build: vadodara };
