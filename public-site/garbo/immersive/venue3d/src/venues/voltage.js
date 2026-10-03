// VOLTAGE YARD, built from the owner's starred references (research/venue-reference-pack, priority 4: zip-022, zip-092,
// zip-025, zip-110, zip-111, zip-122, zip-159 and the concept boards): an industrial hall of brick walls with tall
// arched windows and steel columns, a sawtooth roof of trusses and skylights strung with neon tubes in cyan, magenta and
// violet; a mezzanine on both sides and across the near end, glass-railed, with leather lounges and pendant lights on
// it and backlit bars under it; polished concrete, and in the middle a round LED floor where a mandala turns and
// breathes on the beat; the stage at the far end, its LED wall behind the band and LED towers either side; moving heads
// sweeping beams through the haze, and lasers fanning from the stage; a ring of white light round the floor, warm light
// washed up the brick and the columns.
//
// The plan is the 2D scene's (venues2d/voltage.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT, hsl } from '../util.js';
import { std, Beam } from '../kit.js';
import { buildStage, latticeMat } from '../stage.js';
import { canvas, normalMap, tex } from '../floors.js';
import { ground } from './common.js';
import { newDecor, trussTower } from './decor.js';

const NEON = ['#38d8ff', '#ff3ad0', '#9a5aff'];

/* ---------- textures ---------- */
function concrete(res) {
  const r = seeded(44), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#4c4c55'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  for (let i = 0; i < 50; i++) { const x = r() * res, y = r() * res, rr = 30 + r() * 140, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, r() < 0.5 ? 'rgba(20,20,24,.18)' : 'rgba(90,90,100,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '200,200,210' : '0,0,0'},${0.03 + r() * 0.05})`; g.fillRect(r() * res, r() * res, 1.5, 1.5); }
  // saw-cut joints every tile
  g.strokeStyle = 'rgba(10,10,12,.7)'; g.lineWidth = 2; g.strokeRect(0, 0, res, res); hg.strokeStyle = '#303030'; hg.lineWidth = 3; hg.strokeRect(0, 0, res, res);
  return { map: tex(c, [96 / 4, 96 / 4]), normal: tex(normalMap(hc, 1.2), [96 / 4, 96 / 4], true) };
}
function brick(res) {
  const r = seeded(51);
  return canvasTexture(res, res, (g, w, h) => {
    g.fillStyle = '#3a2620'; g.fillRect(0, 0, w, h);
    const bh = h / 16, bw = w / 6;
    for (let row = 0; row < 16; row++) for (let k = -1; k < 7; k++) { const x = k * bw + (row % 2) * bw / 2, t = 92 + r() * 56; g.fillStyle = `rgb(${t},${t * 0.48},${t * 0.36})`; g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4); g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4); }
  }, { repeat: [1, 1] });
}
function cityWindow() {
  const r = seeded(8);
  return canvasTexture(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a1a4a'); gr.addColorStop(0.55, '#3a2a6a'); gr.addColorStop(1, '#5a3a7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#120e28'; for (let x = 0; x < w; x += 10) { const bh0 = h * (0.25 + r() * 0.4); g.fillRect(x, h - bh0, 9, bh0); }
    for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.6 ? 'rgba(255,200,120,.75)' : 'rgba(150,200,255,.6)'; g.fillRect(r() * w, h * 0.45 + r() * h * 0.55, 2 + r() * 3, 2 + r() * 4); }
    g.strokeStyle = '#141018'; g.lineWidth = 5; g.strokeRect(0, 0, w, h); for (let x = w / 3; x < w; x += w / 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = h / 6; y < h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}
// The LED mandala (zip-092, zip-122): rings of petals turning against each other in magenta, cyan and violet with a
// little gold, on the beat; the colours the references use, whatever the night's theme
function ledMaterial(kind) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 }, uPulse: { value: 0 }, uHue: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT; uniform float uK; uniform float uPulse; uniform float uHue; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * ${kind === 'floor' ? '2.0' : 'vec2(1.0, 3.0)'};
        float r = length(p), a = atan(p.y, p.x);
        vec3 MAG = vec3(1.0, 0.16, 0.78), CYA = vec3(0.16, 0.82, 1.0), VIO = vec3(0.55, 0.3, 1.0), GOLD = vec3(1.0, 0.7, 0.25);
        vec3 col = VIO * 0.06;
        for (int i = 0; i < 5; i++) {
          float fi = float(i), n = 6.0 + fi * 4.0, rr = 0.16 + fi * 0.17, sp = (mod(fi, 2.0) < 1.0 ? 1.0 : -1.0) * (0.06 + fi * 0.015);
          float ang = a * n + uT * sp * n;
          float shape = rr + 0.07 * cos(ang);
          float edge = smoothstep(0.02, 0.0, abs(r - shape));
          float fill = smoothstep(0.05, 0.0, abs(r - shape) - 0.03) * (0.5 + 0.5 * cos(ang));
          vec3 ci = mod(fi, 3.0) < 1.0 ? MAG : mod(fi, 3.0) < 2.0 ? CYA : VIO;
          vec3 ce = mod(fi, 3.0) < 1.0 ? CYA : mod(fi, 3.0) < 2.0 ? MAG : GOLD;
          col += ci * fill * 0.5 + ce * edge * 0.9;
        }
        float rings = smoothstep(0.01, 0.0, abs(fract(r * 7.0 - uT * 0.12) - 0.5) - 0.47);
        col += GOLD * rings * 0.12;
        ${kind === 'floor' ? 'col *= smoothstep(1.0, 0.95, r); col += MAG * smoothstep(0.025, 0.0, abs(r - 0.985)) * 1.4;' : ''}
        gl_FragColor = vec4(col * uK * (0.85 + 0.3 * uPulse), 1.0);
      }`
  });
}

/* ---------- the venue ---------- */
function voltage(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, VY = sp.plan, S = sp.stage, D = newDecor(kit, root);
  const X = VY.x, Z0 = VY.z0, Z1 = VY.z1, ROOF = VY.roof, M = VY.mezz, DK = VY.deck;
  const cc = concrete(phone ? 512 : 1024);
  const floorMesh = ground(root, { map: cc.map, normalMap: cc.normal, normalScale: 0.3, roughness: 0.32, decal: null, decalRect: null }, 2 * X, Z1 - Z0, (Z0 + Z1) / 2, tier.shadows);
  floorMesh.material.userData.env = 0.9;
  const leds = [], neon = [];

  /* the LED floor, flush in the concrete, a lit rim round it */
  const lf = ledMaterial('floor'), ledFloor = new THREE.Mesh(new THREE.CircleGeometry(VY.floor, 96), lf);
  ledFloor.rotation.x = -Math.PI / 2; ledFloor.position.y = 0.012; ledFloor.userData.dynamic = true; root.add(ledFloor); leds.push({ m: lf, k: 0.62 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(VY.floor + 0.15, 0.08, 6, 160), new THREE.MeshBasicMaterial({ color: '#ffffff' })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.05; rim.userData.dynamic = true; root.add(rim);
  kit.pools.add(0, 0.02, 0, VY.floor + 1.2, VY.floor + 1.2, '#f0e4ff', 0.05, { layer: 'show' });
  kit.pools.add(0, 0.02, 0, VY.floor + 3, VY.floor + 3, '#c040ff', 0.07, { layer: 'show' });

  /* the walls: brick with tall arched windows on two floors, the city's lights beyond */
  const bt = brick(phone ? 256 : 512), bm = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.92 }); bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
  const wall = (x0, z0, x1, z1, h) => { const len = Math.hypot(x1 - x0, z1 - z0), t = bt.clone(); t.needsUpdate = true; t.repeat.set(len / 3, h / 3); const w = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, side: THREE.DoubleSide })); w.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); w.rotation.y = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2; root.add(w); return w; };
  [-1, 1].forEach((sd) => wall(sd * X, Z0, sd * X, Z1, ROOF));
  wall(-X, Z1, X, Z1, ROOF); wall(-X, Z0, X, Z0, ROOF);
  const winMat = kit.litMap(cityWindow(), 1.15, 'ambient', { side: THREE.DoubleSide });
  const arch = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, 0); const geo = new THREE.ShapeGeometry(sh, 12); const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h); return geo; };
  [-1, 1].forEach((sd) => { for (let z = Z0 + 5; z < Z1 - 3; z += 6) { [[0.8, 3.6, 2.4], [6.6, 7.4, 3.0]].forEach(([y, h, w]) => { const m = new THREE.Mesh(arch(w, h), winMat); m.position.set(sd * (X - 0.03), y, z + 3); m.rotation.y = -sd * Math.PI / 2; root.add(m); const fr = new THREE.Mesh(new THREE.BoxGeometry(0.2, h + 0.3, w + 0.3), std('#16121a', 0.6, 0.4)); fr.position.set(sd * (X - 0.06), y + h / 2, z + 3); root.add(fr); }); } });

  [-1, 1].forEach((sd) => { for (let z = Z0 + 3; z <= Z1 - 2; z += 6) {
    kit.pools.add(sd * (X - 0.08), ROOF * 0.42, z, 2.4, ROOF * 0.45, LIGHT.amber, 0.6, { vertical: true, ry: -sd * Math.PI / 2, layer: 'architectural' });
    kit.pools.add(sd * (X - 0.1), ROOF * 0.78, z + 3, 2.8, ROOF * 0.24, NEON[(Math.round((z - Z0) / 6) + (sd > 0 ? 1 : 0)) % 2 ? 1 : 0], 0.32, { vertical: true, ry: -sd * Math.PI / 2, layer: 'show' });
    kit.bigBulbs.add(sd * (X - 0.35), 0.25, z, 0, { color: LIGHT.amber, k: 0.9, s: 0.35, twinkle: 0, layer: 'architectural' });
  } });
  for (let x = -X + 4; x < X - 2; x += 6) kit.pools.add(x, ROOF * 0.4, Z1 - 0.08, 1.6, ROOF * 0.4, LIGHT.amber, 0.45, { vertical: true, ry: Math.PI, layer: 'architectural' });

  /* steel: columns along the mezzanines and the walls, the mezzanine decks, glass rails, LED under their edges */
  const steel = std('#1c1a22', 0.5, 0.7), ibeam = (x, z, h) => { [[0.42, 0.04, 0], [0.04, 0.4, 0]].forEach(([w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d + 0.04), steel); m.position.set(x, h / 2, z); root.add(m); }); [-0.2, 0.2].forEach((dz) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, 0.04), steel); f.position.set(x, h / 2, z + dz); root.add(f); }); };
  [-1, 1].forEach((sd) => {
    for (let z = Z0 + 3; z <= Z1 - 2; z += 6) { ibeam(sd * M, z, ROOF); ibeam(sd * (X - 0.4), z, ROOF); const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, ROOF - 0.5, 0.04), new THREE.MeshBasicMaterial({ color: '#ffffff' })); strip.position.set(sd * (M - 0.24), ROOF / 2, z - 0.24); strip.userData.dynamic = true; root.add(strip); neon.push({ m: strip.material, c: 0, k: 1.3 }); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(X - M, 0.3, Z1 - Z0 - 6), std('#22202a', 0.6, 0.3)); deck.position.set(sd * (M + X) / 2, DK - 0.15, (Z0 + Z1) / 2 - 3); root.add(deck);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, Z1 - Z0 - 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); edge.position.set(sd * M, DK - 0.32, (Z0 + Z1) / 2 - 3); edge.userData.dynamic = true; root.add(edge); neon.push({ m: edge.material, c: 1 - (sd > 0 ? 0 : -1), k: 1.5 });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0 - 6, 1.05), new THREE.MeshStandardMaterial({ color: '#a8c8ff', roughness: 0.05, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); glass.material.userData.env = 1; glass.position.set(sd * M, DK + 0.55, (Z0 + Z1) / 2 - 3); glass.rotation.y = Math.PI / 2; root.add(glass);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, Z1 - Z0 - 6), std('#9a9aa8', 0.3, 0.9)); rail.position.set(sd * M, DK + 1.1, (Z0 + Z1) / 2 - 3); root.add(rail);
    // pendant lights over the mezzanine lounges, and the warm glow of the bars under them
    for (let z = Z0 + 8; z < Z1 - 6; z += 3.25) { kit.wires.line([sd * 20.6, ROOF, z], [sd * 20.6, DK + 2.6, z]); kit.bigBulbs.add(sd * 20.6, DK + 2.5, z, 0, { color: LIGHT.tungsten, k: 1.1, s: 0.55, twinkle: 0.02, layer: 'practical' }); kit.pools.add(sd * 20.6, DK + 0.01, z, 1.6, 1.6, LIGHT.tungsten, 0.08, { layer: 'practical', live: true }); }
    for (let z = Z0 + 10; z < Z1 - 8; z += 14) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 5), std('#3a2418', 0.5, 0.2)); bar.position.set(sd * (X - 2.6), 0.55, z); root.add(bar);
      const shelf = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6), kit.litMap(canvasTexture(256, 112, (g, w, h) => { g.fillStyle = '#1a0e08'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 34) { g.fillStyle = '#ffb060'; g.fillRect(0, y + 26, w, 3); for (let x = 6; x < w; x += 9) { g.fillStyle = ['#7a3a1a', '#3a6a3a', '#c09040', '#9a2a1a'][(x + y) % 4]; g.fillRect(x, y + 6, 6, 20); } } }), 0.9, 'practical', { side: THREE.DoubleSide }));
      shelf.position.set(sd * (X - 0.1), 2.0, z); shelf.rotation.y = -sd * Math.PI / 2; shelf.scale.x = -1; root.add(shelf);
      kit.pools.add(sd * (X - 2.4), 0.02, z, 2.6, 3.4, LIGHT.tungsten, 0.12, { layer: 'practical' });
    }
  });
  // the balcony across the near end, where you stand from far off
  const bal = new THREE.Mesh(new THREE.BoxGeometry(2 * M, 0.3, VY.balcony - Z0), std('#22202a', 0.6, 0.3)); bal.position.set(0, DK - 0.15, (Z0 + VY.balcony) / 2); root.add(bal);
  const bglass = new THREE.Mesh(new THREE.PlaneGeometry(2 * M, 1.05), new THREE.MeshStandardMaterial({ color: '#a8c8ff', roughness: 0.05, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); bglass.position.set(0, DK + 0.55, VY.balcony); root.add(bglass);
  const brail = new THREE.Mesh(new THREE.BoxGeometry(2 * M, 0.06, 0.06), std('#9a9aa8', 0.3, 0.9)); brail.position.set(0, DK + 1.1, VY.balcony); root.add(brail);
  const bled = new THREE.Mesh(new THREE.BoxGeometry(2 * M, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: '#ffffff' })); bled.position.set(0, DK - 0.32, VY.balcony); bled.userData.dynamic = true; root.add(bled); neon.push({ m: bled.material, c: 0, k: 1.5 });

  /* the roof: trusses across the hall, sawtooth bays with their skylights, neon tubes along every truss */
  // (its own copy of the lattice, stretched across the hall, so the stadium's girders keep theirs)
  const lattice = latticeMat(1).clone(); lattice.map = lattice.map.clone(); lattice.map.needsUpdate = true; lattice.map.repeat.set(30, 1);
  for (let z = Z0 + 3; z <= Z1 - 2; z += 6) {
    const tr = new THREE.Mesh(new THREE.PlaneGeometry(2 * X, 1.6), lattice); tr.position.set(0, ROOF - 0.8, z); root.add(tr);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(2 * X - 4, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: '#ffffff' })); tube.position.set(0, ROOF - 1.7, z); tube.userData.dynamic = true; root.add(tube); neon.push({ m: tube.material, c: Math.round((z - Z0) / 6) % 3, k: 1.4 });
    // the sawtooth: a sloping roof panel, then a wall of glass facing the far end
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(2 * X, Math.hypot(6, 2.6)), std('#16141c', 0.8, 0.3, { side: THREE.DoubleSide })); slope.position.set(0, ROOF + 1.3, z + 3); slope.rotation.x = -Math.PI / 2 + Math.atan2(2.6, 6); root.add(slope);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2 * X, 2.6), kit.litMap(canvasTexture(64, 32, (g, w, h) => { g.fillStyle = '#0c1630'; g.fillRect(0, 0, w, h); g.fillStyle = '#16244a'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 6, h); }), 0.6, 'ambient', { side: THREE.DoubleSide })); sky.position.set(0, ROOF + 1.3, z + 6); root.add(sky);
  }
  // long tubes down the length of the hall, drawing the eye to the stage (zip-024, zip-030)
  [[-12, 0], [-6, 1], [6, 1], [12, 0]].forEach(([x, c]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, Z1 - Z0 - 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.position.set(x, ROOF - 2.0, (Z0 + Z1) / 2 + 1); m.userData.dynamic = true; root.add(m); neon.push({ m: m.material, c, k: 1.6 }); });
  // long diagonal tubes across the ceiling, as the references hang them
  [[-18, -10, 14, 30, 2], [18, -6, -12, 34, 1], [-20, 14, 20, 20, 0]].forEach(([x0, z0, x1, z1, c]) => { const len = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.position.set((x0 + x1) / 2, ROOF - 2.4, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.userData.dynamic = true; root.add(m); neon.push({ m: m.material, c, k: 1.5 }); });

  /* the stage, its LED towers either side and big screens high on the side walls */
  const stage = buildStage(kit, { x0: S.x0, x1: S.x1, z: S.z, h: S.h, depth: S.depth, screenBottom: S.screenBottom, screenTop: S.screenTop, truss: S.truss, arrays: S.arrays, band: BAND.big });
  root.add(stage.root);
  const tower = (x, z, w, h, y0) => { const lm = ledMaterial('tower'); leds.push({ m: lm, k: 0.75 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lm); m.position.set(x, y0 + h / 2, z); m.rotation.y = Math.PI; m.userData.dynamic = true; root.add(m); const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.3), std('#0c0a10', 0.6, 0.4)); fr.position.set(x, y0 + h / 2, z + 0.2); root.add(fr); return m; };
  [-1, 1].forEach((sd) => { tower(sd * 12.6, S.z + 1.2, 2.6, 9.2, 0.6); tower(sd * 16.2, S.z + 2.4, 2.6, 8, 0.6); trussTower(root, sd * 14.4, S.z + 1.8, 11, 0.4); });
  [-1, 1].forEach((sd) => [6, 20].forEach((z) => { const lm = ledMaterial('tower'); leds.push({ m: lm, k: 0.6 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2), lm); m.position.set(sd * (X - 0.15), 10.2, z); m.rotation.y = -sd * Math.PI / 2; m.userData.dynamic = true; root.add(m); }));

  /* moving heads in the roof and lasers from the stage */
  const heads = [[-12, 0], [-4, 0], [4, 0], [12, 0], [-12, 16], [12, 16], [-6, 24], [6, 24]].map(([x, z], i) => {
    const fix = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 10), std('#1b1920', 0.5, 0.4)); fix.position.set(x, ROOF - 2.1, z); root.add(fix);
    return { x, z, i, beam: new Beam(root, '#ffffff', 16, 0.18, 0.16) };
  });
  const lasers = []; for (let i = 0; i < (phone ? 4 : 8); i++) lasers.push({ i, beam: new Beam(root, NEON[i % 3], 40, 0.012, 0.6) });

  /* lounges on the mezzanines and under them: leather sofas, low tables, lamps */
  (VY.seats || []).forEach((sf) => { D.sofa(sf.x, sf.z, sf.ry, sf.len, { y: sf.y, wood: '#2a1810', seat: '#6a3a22', cushions: ['#8a4a2a', '#5a2a1a', '#c08040'] }); D.table(sf.x + Math.sin(sf.ry) * 1.1, sf.z + Math.cos(sf.ry) * 1.1, 0.9, 0.6, { y: sf.y, wood: '#1a1210', candles: 1 }); });
  D.finish();

  // what the polished concrete and the glass reflect: the neon over the hall
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#0a0812', side: THREE.BackSide })));
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(40, 0.6, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(NEON[i % 3]).multiplyScalar(3) })); m.position.set(0, 14, -24 + i * 6); env.add(m); }
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(20, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color('#c060ff').multiplyScalar(2) })); scr.position.set(0, 6, 32); scr.rotation.y = Math.PI; env.add(scr);

  const rig = {
    hemi: ['#5a4a8a', '#2a1a2a', 0.72, 1.0], moon: 0,
    spots: [{ pos: [0, ROOF - 1, -4], to: [0, 0, 6], color: '#e8d8ff', base: 80, distance: 40, angle: 0.62, layer: 'key' }, { pos: stage.wash.pos, to: stage.wash.to, color: '#ffe4c4', base: 130, distance: 28, angle: 0.55, layer: 'show' }],
    points: [{ pos: [-14, 8, 6], color: '#ff3ad0', base: 46, distance: 26, layer: 'show' }, { pos: [14, 8, 6], color: '#38d8ff', base: 46, distance: 26, layer: 'show' }, { pos: [0, 3, 0], color: '#c060ff', base: 30, distance: 18, layer: 'show' }, { pos: [0, 9, -18], color: LIGHT.tungsten, base: 30, distance: 16, layer: 'practical' }]
  };
  return {
    rig, stage, feedScreen: stage.feedScreen, floor: floorMesh, fog: new THREE.FogExp2('#2a1642', 0.011), exposure: 1.18, envScene: env,
    update(t, ctx) {
      const { TH, pulse, reduce, lv } = ctx, tt = reduce ? 0 : t;
      leds.forEach((l) => { l.m.uniforms.uT.value = tt; l.m.uniforms.uK.value = l.k * (0.35 + 0.65 * lv.show); l.m.uniforms.uPulse.value = pulse; l.m.uniforms.uHue.value = (TH.hues[0] || 0) / 360 * 0.2; });
      neon.forEach((n, i) => n.m.color.set(NEON[(n.c + 3) % 3]).multiplyScalar(n.k * (0.55 + 0.45 * lv.festive) * (1 + 0.15 * pulse)));
      rim.material.color.set('#f4ecff').multiplyScalar(1.7 * (0.6 + 0.4 * lv.show) * (1 + 0.12 * pulse));
      heads.forEach((h) => {
        const s = tt * TH.speed / 0.3, tx = h.x * 0.5 + Math.sin(s * 0.35 + h.i * 1.9) * 9, tz = h.z * 0.6 + Math.cos(s * 0.27 + h.i) * 9, hex = TH.beams[h.i % TH.beams.length];
        h.beam.aim([h.x, ROOF - 2.3, h.z], [tx, 0, tz]); h.beam.set(hex, lv.show * (0.7 + 0.4 * pulse));
      });
      lasers.forEach((l) => { const a = (l.i / (lasers.length - 1) - 0.5) * 1.6 + 0.25 * Math.sin(tt * 0.6 + l.i); l.beam.aim([0, S.truss - 0.6, S.z + 0.2], [Math.sin(a) * 40, 2 + 6 * (0.5 + 0.5 * Math.sin(tt * 0.9 + l.i * 2)), S.z - Math.cos(a) * 40]); l.beam.set(NEON[l.i % 3], lv.show > 0.5 ? lv.show * (0.6 + 0.4 * pulse) : 0); });
    }
  };
}

export default { seed: 707, indoor: true, sky: false, garbo: 'bare', garboK: 7, build: voltage };
