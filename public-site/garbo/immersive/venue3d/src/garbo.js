// The garbo at the centre of the circle, in 3D: a perforated clay pot on a draped stand with a diya burning on its
// mouth and light spilling out through the holes; the rangoli under it and a ring of diyas; and the mandvi (the
// carved canopy) over it. The pot is scaled up a little (as the 2D scene draws it) so it reads as the lamp at the
// heart of the dance from where you stand; the mandvi is at real size. A venue can ask for it bare (Pandora): the
// lit pot on its stand and a ring of diyas only, no rangoli and no mandvi, the floor's own inlay round it.
//
// Its shape is mirrored in venue-scene.js (garboHole), which cuts the garbo's outline out of the dancers drawn behind
// it, so the far side of the circle passes behind the pot and pillars. Keep the two in step when changing sizes here.

import * as THREE from 'three';
import { TAU, canvasTexture, sag } from './util.js';
import { std, glowMat } from './kit.js';
import { bake } from './bake.js';

export const GARBO = {
  // The mandvi: pillar half-spacing and height, for the Sheri's smaller one and the others
  mandvi: (small) => ({ r: small ? 0.78 : 1.0, top: small ? 2.4 : 2.85 }),
  potScale: 1.35
};

const HOLE_ROWS = [[0.3, 18, 0], [0.43, 24, 1], [0.56, 24, 0], [0.69, 18, 1]];
function drawHoles(g, w, h, fill) {
  g.fillStyle = fill;
  HOLE_ROWS.forEach(([v, n, tri]) => {
    for (let j = 0; j < n; j++) {
      const x = (j + 0.5 + (tri ? 0.5 : 0)) / n * w, y = v * h, r = 5.5;
      g.beginPath();
      if (tri) { g.moveTo(x, y - r * 1.3); g.lineTo(x + r * 1.1, y + r * 0.8); g.lineTo(x - r * 1.1, y + r * 0.8); g.closePath(); } else g.arc(x, y, r, 0, TAU);
      g.fill();
    }
  });
}
function potTextures() {
  // The perforations are the pot's emissive map, so the light inside shows only through the holes
  // (with a faint warm fill over the clay, brighter low down where the diyas round it light it)
  const holes = canvasTexture(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0c0603'); gr.addColorStop(1, '#3a200e'); g.fillStyle = gr; g.fillRect(0, 0, w, h); drawHoles(g, w, h, '#fff'); });
  const clay = canvasTexture(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8a3f1e'); gr.addColorStop(0.5, '#b0592b'); gr.addColorStop(1, '#6d2f16');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // Painted bands in white and ochre, the way garbos are decorated
    [[0.22, '#f3e6d0'], [0.25, '#c9963f'], [0.77, '#c9963f'], [0.8, '#f3e6d0']].forEach(([v, c]) => { g.fillStyle = c; g.fillRect(0, v * h, w, 3); });
    g.strokeStyle = 'rgba(243,230,208,.8)'; g.lineWidth = 2;
    for (let k = 0; k < 24; k++) { const x = k / 24 * w; g.beginPath(); g.moveTo(x, 0.84 * h); g.lineTo(x + w / 48, 0.9 * h); g.lineTo(x + w / 24, 0.84 * h); g.stroke(); }
    drawHoles(g, w, h, 'rgba(30,10,4,.9)');
  });
  return { holes, clay };
}

function paintRangoli(g, w, flags) {
  const c = w / 2, R = w / 2;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, w); g.translate(c, c);
  g.fillStyle = 'rgba(58,29,18,.85)'; g.beginPath(); g.arc(0, 0, R * 0.86, 0, TAU); g.fill();
  const cols = [flags[0], '#f4a261', '#2a9d8f', flags[2 % flags.length], '#e9c46a', '#c2185b'];
  // Two rings of petals, a ring of dots and a bright centre
  for (let ring = 0; ring < 2; ring++) {
    const n = ring ? 16 : 8, pr = ring ? R * 0.68 : R * 0.42, len = ring ? R * 0.14 : R * 0.3, wid = ring ? R * 0.07 : R * 0.13;
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate(i / n * TAU + (ring ? Math.PI / 16 : 0)); g.fillStyle = cols[(i + ring) % cols.length];
      g.beginPath(); g.ellipse(pr, 0, len, wid, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,243,214,.8)'; g.beginPath(); g.ellipse(pr, 0, len * 0.35, wid * 0.3, 0, 0, TAU); g.fill();
      g.restore();
    }
  }
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8, 4, 0, TAU); g.fill(); }
  g.fillStyle = '#f6c342'; g.beginPath(); g.arc(0, 0, R * 0.2, 0, TAU); g.fill();
  g.fillStyle = '#c0392b'; g.beginPath(); g.arc(0, 0, R * 0.1, 0, TAU); g.fill();
}

let pillarTex = null;
function pillarTexture() {
  if (pillarTex) return pillarTex;
  pillarTex = canvasTexture(64, 256, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#e8b04b' : '#8e1b1b'; g.fillRect(0, i / 12 * h, w, h / 12 + 1); }
    g.fillStyle = 'rgba(255,230,170,.5)'; for (let i = 0; i < 12; i += 2) for (let x = 0; x < w; x += 8) g.fillRect(x + 2, (i + 0.4) / 12 * h, 3, 3);
  });
  return pillarTex;
}
function beads(parent, pts, radius) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), pts.length);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pts.length * 3), 3);
  const mx = new THREE.Matrix4(), cA = new THREE.Color('#f29a2e'), cB = new THREE.Color('#f6c342');
  pts.forEach((q, i) => { m.setMatrixAt(i, mx.makeTranslation(q[0], q[1], q[2])); m.setColorAt(i, i % 2 ? cA : cB); });
  parent.add(m);
  return m;
}

export function buildGarbo(kit, { small, flags, bare }) {
  const root = new THREE.Group(), S = GARBO.potScale, { r, top } = GARBO.mandvi(small);
  const tex = potTextures();

  // The rangoli on the ground, and a ring of diyas round it
  const rCanvas = document.createElement('canvas'); rCanvas.width = rCanvas.height = 512;
  paintRangoli(rCanvas.getContext('2d'), 512, flags);
  const rTex = new THREE.CanvasTexture(rCanvas); rTex.colorSpace = THREE.SRGBColorSpace; rTex.anisotropy = 4;
  const rangoli = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.95, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
  rangoli.rotation.x = -Math.PI / 2; rangoli.position.y = 0.012; rangoli.receiveShadow = true;
  if (!bare) root.add(rangoli);
  // (real flames: each flickers on its own, and lights the ground round it in the flame layer)
  const nd = bare ? 8 : 12, rd = bare ? 1.75 : 1.95;
  for (let i = 0; i < nd; i++) { const a = (i + 0.5) / nd * TAU; kit.flames.add(Math.cos(a) * rd, 0.012, Math.sin(a) * rd, { s: 0.06, k: 0.32 }); }

  // The garbo itself, scaled as one
  const g = new THREE.Group(); g.scale.setScalar(S); root.add(g);
  // A low wooden stand draped in red cloth with a gold border
  [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]].forEach(([x, z]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), std('#3b2213', 0.8)); leg.position.set(x, 0.25, z); g.add(leg); });
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.28, 16, 1, true), kit.selfLit(new THREE.MeshStandardMaterial({ color: '#9b1f1a', roughness: 0.85, side: THREE.DoubleSide, emissive: '#7a2412' }), 0.55, 'flame')); cloth.position.y = 0.42; g.add(cloth);
  const clothTop = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 16), std('#4a0c0a', 0.9)); clothTop.position.y = 0.56; g.add(clothTop);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 4, 32), std('#e8b04b', 0.35, 0.7)); trim.rotation.x = Math.PI / 2; trim.position.y = 0.285; g.add(trim);
  // The pot: a lathe from the base up through the shoulder to the neck
  const prof = GARBO_POT.map(([rr, y]) => new THREE.Vector2(rr, y));
  const potMat = new THREE.MeshStandardMaterial({ map: tex.clay, emissiveMap: tex.holes, emissive: '#ffb45a', emissiveIntensity: 0, roughness: 0.82 });
  const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), potMat); pot.position.y = 0.575; pot.castShadow = true; g.add(pot);
  const neckBeads = []; for (let i = 0; i < 22; i++) { const a = i / 22 * TAU; neckBeads.push([Math.cos(a) * 0.19, 0.575 + 0.47 + 0.03 * Math.cos(a), Math.sin(a) * 0.19]); }
  beads(g, neckBeads, 0.028);
  // The diya on the mouth and its flame
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.05, 14), std('#6a2c14', 0.85)); bowl.position.y = 0.575 + 0.62; g.add(bowl);
  const flameGeo = new THREE.SphereGeometry(0.045, 10, 8); flameGeo.scale(1, 2.4, 1); flameGeo.translate(0, 0.1, 0);
  const flame = new THREE.Mesh(flameGeo, glowMat('#ffd27a', 4)); flame.position.y = 0.575 + 0.63; flame.userData.dynamic = true; g.add(flame);
  const flameCore = new THREE.Mesh(flameGeo, glowMat('#fff4d0', 7)); flameCore.scale.setScalar(0.5); flameCore.position.y = 0.575 + 0.64; flameCore.userData.dynamic = true; g.add(flameCore);

  let flag = null;
  if (!bare) {
  // The mandvi: four carved pillars, a scalloped dome with a smaller one above, a kalash and a flag
  const pillar = new THREE.CylinderGeometry(0.06, 0.075, top, 10), pMat = kit.selfLit(new THREE.MeshStandardMaterial({ map: pillarTexture(), roughness: 0.6, metalness: 0.15 }), 0.28, 'flame');
  [[-r, -r], [r, -r], [r, r], [-r, r]].forEach(([x, z]) => {
    const p = new THREE.Mesh(pillar, pMat); p.position.set(x, top / 2, z); p.castShadow = true; root.add(p);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), std('#5a1510', 0.7)); base.position.set(x, 0.06, z); root.add(base);
  });
  // Lacquered red, catching the bulbs round its rim
  const dome = new THREE.Mesh(new THREE.LatheGeometry(MANDVI_DOME.map(([a, b]) => new THREE.Vector2(a * r, b)), 32), std('#a8141a', 0.32, 0.25, { side: THREE.DoubleSide, emissive: '#8a1410', emissiveIntensity: 0.9 }));
  dome.position.y = top; root.add(dome);
  const ribs = new THREE.Mesh(new THREE.LatheGeometry(MANDVI_DOME.slice(0, 5).map(([a, b]) => new THREE.Vector2(a * r + 0.01, b)), 12), new THREE.MeshStandardMaterial({ color: '#f0c24b', wireframe: true, metalness: 0.6, roughness: 0.4 }));
  ribs.position.y = top; root.add(ribs);
  const dome2 = new THREE.Mesh(new THREE.LatheGeometry(MANDVI_DOME2.map(([a, b]) => new THREE.Vector2(a * r, b)), 20), std('#f0c24b', 0.35, 0.6, { emissive: '#5a3a08', emissiveIntensity: 0.6 })); dome2.position.y = top + 0.8; root.add(dome2);
  const kalash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), std('#e8b04b', 0.3, 0.8)); kalash.position.y = top + 1.36; root.add(kalash);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8), std('#3a2413')); mast.position.y = top + 1.8; root.add(mast);
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.55, -0.12, 0, 0, -0.3, 0], 3)); flagGeo.computeVertexNormals();
  flag = new THREE.Mesh(flagGeo, std('#d8453a', 0.8, 0, { side: THREE.DoubleSide })); flag.position.y = top + 2.18; flag.userData.dynamic = true; root.add(flag);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.32, r * 1.32, 0.08, 32), std('#e8b04b', 0.35, 0.7, { emissive: '#3a2406', emissiveIntensity: 0.5 })); slab.position.y = top; root.add(slab);
  // Bulbs round the scalloped edge (festive), and a toran of flags in the night's colours
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * TAU, x = Math.cos(a) * r * 1.33, z = Math.sin(a) * r * 1.33;
    kit.bulbs.add(x, top - 0.06, z, k, { ph: k, s: 1.2 });
    kit.flags.add(x, top - 0.04, z, -a + Math.PI / 2, 0.2, k);
  }
  // Marigold garlands swinging between the pillars
  const garland = [];
  [[[-r, -r], [r, -r]], [[-r, -r], [-r, r]], [[r, -r], [r, r]], [[-r, r], [r, r]]].forEach(([a, b]) => {
    for (let k = 0; k <= 16; k++) garland.push(sag([a[0], top - 0.1, a[1]], [b[0], top - 0.1, b[1]], 0.5, k / 16));
  });
  beads(root, garland, 0.045);
  }

  // It can be faded out as you walk right past it, so it isn't baked with the venue; its still parts are baked
  // together within it instead (the flame and the flag keep moving)
  bake(root, new Set([potMat]));
  root.userData.dynamic = true;
  return {
    root,
    setTheme(TH) { paintRangoli(rCanvas.getContext('2d'), 512, TH.flags); rTex.needsUpdate = true; },
    // level: the garbo layer's level with the lamp's lit value and flicker already in it; shown: false when you're
    // right on top of it (the 2D scene fades it there)
    update(t, level, reduce, shown) {
      root.visible = shown;
      potMat.emissiveIntensity = 3.2 * level;
      const f = Math.max(0, (level - 0.2) / 0.8);
      flame.visible = flameCore.visible = f > 0.01;
      flame.scale.set(1 + (reduce ? 0 : 0.06 * Math.sin(t * 17)), f * (0.85 + (reduce ? 0 : 0.15 * Math.sin(t * 9))), 1);
      flame.rotation.z = reduce ? 0 : Math.sin(t * 5) * 0.08;
      flameCore.scale.set(0.5, 0.5 * f, 0.5);
      if (flag) flag.rotation.y = reduce ? 0 : Math.sin(t * 2.2) * 0.35;
    }
  };
}

// Shapes shared with the 2D scene's outline of the garbo (venue-scene.js, garboHole): [radius, height] profiles
export const GARBO_POT = [[0.0, 0], [0.12, 0.005], [0.2, 0.04], [0.27, 0.12], [0.3, 0.24], [0.29, 0.34], [0.24, 0.44], [0.16, 0.51], [0.12, 0.54], [0.125, 0.58], [0.15, 0.6]];
export const MANDVI_DOME = [[1.3, 0], [1.2, 0.18], [0.95, 0.42], [0.6, 0.7], [0.25, 0.86], [0.06, 0.92]];
export const MANDVI_DOME2 = [[0.42, 0], [0.36, 0.2], [0.2, 0.42], [0.03, 0.52]];
