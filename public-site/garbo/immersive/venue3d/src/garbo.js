// The garbo at the centre of the circle, in 3D: a perforated clay pot on a draped stand with a diya burning on its
// mouth and light spilling out through the holes; the rangoli under it and a ring of diyas; and the mandvi (the
// carved canopy) over it. The pot is scaled up a little (as the 2D scene draws it) so it reads as the lamp at the
// heart of the dance from where you stand; the mandvi is at real size. A venue can ask for it bare (Pandora): the
// lit pot on its stand and a ring of diyas only, no rangoli and no mandvi, the floor's own inlay round it.
//
// The first three venues keep this garbo as it is. Every newer venue has its own (GARBO_LOOKS, by venue id): the same
// pot and the same size of stand, so the 2D scene's outline of it still fits, made of that venue's stuff — an
// obsidian pot among amber crystals, a folk-painted one on a teak chowki, a steel lantern on a truss, a moonstone one
// on a marble lotus in a dish of water, brass with peacock-feather holes under a sandstone chhatri, a pot painted
// with tulips on a rattan drum, a pearl one on a lotus of light, smoked glass with neon on a hex of LED, brass on
// stepped stone among tiers of diyas, sea glass on marble ringed with pearls.
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
// The holes, in the shape the look asks for: rounds and triangles (the clay pot), teardrops (peacock feathers),
// petals (lotus), tulips, squares (steel and LED), diamonds, waves
function holeShape(g, x, y, r, tri, shape) {
  g.beginPath();
  if (shape === 'feather') { g.ellipse(x, y, r * 0.75, r * 1.5, 0, 0, TAU); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(x, y + r * 0.3, r * 0.35, 0, TAU); }
  else if (shape === 'petal') { g.moveTo(x, y - r * 1.6); g.quadraticCurveTo(x + r * 1.2, y, x, y + r * 1.2); g.quadraticCurveTo(x - r * 1.2, y, x, y - r * 1.6); }
  else if (shape === 'tulip') { g.moveTo(x - r, y - r); g.lineTo(x - r * 0.4, y - r * 0.3); g.lineTo(x, y - r * 1.2); g.lineTo(x + r * 0.4, y - r * 0.3); g.lineTo(x + r, y - r); g.quadraticCurveTo(x + r, y + r * 1.1, x, y + r * 1.1); g.quadraticCurveTo(x - r, y + r * 1.1, x - r, y - r); }
  else if (shape === 'square') { g.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); }
  else if (shape === 'diamond') { g.moveTo(x, y - r * 1.4); g.lineTo(x + r, y); g.lineTo(x, y + r * 1.4); g.lineTo(x - r, y); g.closePath(); }
  else if (shape === 'wave') { g.ellipse(x, y, r * 1.5, r * 0.6, tri ? 0.35 : -0.35, 0, TAU); }
  else if (tri) { g.moveTo(x, y - r * 1.3); g.lineTo(x + r * 1.1, y + r * 0.8); g.lineTo(x - r * 1.1, y + r * 0.8); g.closePath(); } else g.arc(x, y, r, 0, TAU);
  g.fill();
}
function drawHoles(g, w, h, fill, shape) {
  HOLE_ROWS.forEach(([v, n, tri]) => {
    for (let j = 0; j < n; j++) {
      g.fillStyle = fill;
      const x = (j + 0.5 + (tri ? 0.5 : 0)) / n * w, y = v * h, r = 5.5;
      holeShape(g, x, y, r, tri, shape);
    }
  });
}
function potTextures(look) {
  if (look) return lookTextures(look);
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

/* ---------- each newer venue's own garbo ----------
   clay: the pot's body, top to bottom; bands: its painted colours; glow: the light through its holes; motif: what's
   painted on it (and the holes' shape); stand, ground: what it stands on and what lies round it; diyas: how many
   round it; metal, glass: brass and steel, or glass lit right through; canopy: a chhatri over it */
export const GARBO_LOOKS = {
  pandora: { clay: ['#1a1520', '#2c2432', '#0d0b12'], bands: ['#e8a24a', '#ffd28a'], glow: '#ffa245', motif: 'chevron', holes: 'diamond', stand: 'basalt', ground: 'crystals', diyas: 8, rough: 0.28, metal: 0.35 },
  chitra: { clay: ['#c8784a', '#e0a070', '#a05a34'], bands: ['#f6efe0', '#1e2a5a', '#c0392b', '#2a7a4a', '#e8b04b'], glow: '#ffc070', motif: 'folk', holes: 'round', stand: 'chowki', ground: 'mandana', diyas: 10 },
  voltage: { clay: ['#4a505c', '#6a7280', '#30343c'], bands: ['#38d8ff', '#ff3ad0'], glow: '#bdf2ff', motif: 'rivets', holes: 'square', stand: 'truss', ground: 'ledring', diyas: 0, rough: 0.35, metal: 0.85, led: ['#38d8ff', '#ff3ad0'] },
  chandra: { clay: ['#e8eef2', '#ffffff', '#c2ccd6'], bands: ['#8ad8c8', '#c8b0ff'], glow: '#dff6ff', motif: 'vine', holes: 'petal', stand: 'lotus', ground: 'water', diyas: 8, rough: 0.3, metal: 0.05 },
  vrindavan: { clay: ['#a87a22', '#e0b04a', '#7a5214'], bands: ['#1e5a8a', '#2a8a5a', '#c0392b'], glow: '#ffb050', motif: 'feather', holes: 'feather', stand: 'stone', ground: 'kolam', diyas: 12, rough: 0.32, metal: 0.75, canopy: 'chhatri' },
  tulip: { clay: ['#7a4a32', '#a86a44', '#5a3020'], bands: ['#c080ff', '#ff6aa0', '#ffd24a', '#f6efe0'], glow: '#ffc890', motif: 'tulip', holes: 'tulip', stand: 'rattan', ground: 'petals', diyas: 8 },
  lotus: { clay: ['#efe8f4', '#ffffff', '#d4c4e0'], bands: ['#40e4ff', '#ff5ad8'], glow: '#bff6ff', motif: 'lotus', holes: 'petal', stand: 'lotus', ground: 'none', diyas: 8, rough: 0.35 },
  vadodara: { clay: ['#1e1630', '#2e2248', '#120c1e'], bands: ['#ff3ad0', '#38e8ff'], glow: '#ff8ae8', motif: 'circuit', holes: 'square', stand: 'hex', ground: 'ledring', diyas: 0, rough: 0.12, metal: 0.2, glass: true, led: ['#ff3ad0', '#38e8ff'] },
  jyot: { clay: ['#a87a22', '#e8b850', '#7a5214'], bands: ['#7a1414', '#1e6a6a', '#f6efe0'], glow: '#ffb040', motif: 'bands', holes: 'round', stand: 'steps', ground: 'none', diyas: 14, rough: 0.3, metal: 0.8 },
  tideglass: { clay: ['#2a8a9a', '#6ad0d8', '#165060'], bands: ['#f0f8ff', '#ffd8a0'], glow: '#a8f4ff', motif: 'waves', holes: 'wave', stand: 'marble', ground: 'pearls', diyas: 8, rough: 0.1, metal: 0.1, glass: true }
};
function lookTextures(L) {
  const holes = canvasTexture(512, 256, (g, w, h) => { g.fillStyle = L.glass ? '#2a2a3a' : '#0c0603'; g.fillRect(0, 0, w, h); drawHoles(g, w, h, '#fff', L.holes); });
  const clay = canvasTexture(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, L.clay[0]); gr.addColorStop(0.5, L.clay[1]); gr.addColorStop(1, L.clay[2]);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const B = L.bands, band = (v, c, t = 3) => { g.fillStyle = c; g.fillRect(0, v * h, w, t); };
    if (L.motif === 'chevron') { band(0.2, B[0], 2); band(0.82, B[0], 2); g.strokeStyle = B[1]; g.lineWidth = 2; for (let k = 0; k < 32; k++) { const x = k / 32 * w; g.beginPath(); g.moveTo(x, 0.12 * h); g.lineTo(x + w / 64, 0.17 * h); g.lineTo(x + w / 32, 0.12 * h); g.stroke(); g.beginPath(); g.moveTo(x, 0.86 * h); g.lineTo(x + w / 64, 0.91 * h); g.lineTo(x + w / 32, 0.86 * h); g.stroke(); } }
    else if (L.motif === 'folk') {
      // lippan and block-print: white bands, a row of painted flowers in jewel colours, small mirrors
      band(0.18, B[0], 6); band(0.8, B[0], 6);
      for (let k = 0; k < 16; k++) { const x = (k + 0.5) / 16 * w, c = B[1 + (k % 4)]; g.fillStyle = c; for (let p = 0; p < 6; p++) { const a = p / 6 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 6, 0.11 * h + Math.sin(a) * 6, 4, 2.5, a, 0, TAU); g.fill(); } g.fillStyle = '#f6efe0'; g.beginPath(); g.arc(x, 0.11 * h, 2.5, 0, TAU); g.fill(); }
      for (let k = 0; k < 24; k++) { const x = (k + 0.5) / 24 * w; g.fillStyle = '#e8eef4'; g.beginPath(); g.arc(x, 0.88 * h, 3.5, 0, TAU); g.fill(); g.strokeStyle = B[1]; g.lineWidth = 1.5; g.stroke(); }
    } else if (L.motif === 'rivets') { band(0.16, '#22262e', 5); band(0.84, '#22262e', 5); g.fillStyle = '#9aa2ae'; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc((k + 0.5) / 40 * w, 0.175 * h, 2, 0, TAU); g.fill(); g.beginPath(); g.arc((k + 0.5) / 40 * w, 0.855 * h, 2, 0, TAU); g.fill(); } }
    else if (L.motif === 'vine') { g.strokeStyle = B[0]; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, 0.12 * h + Math.sin(x / w * TAU * 6) * 6); g.stroke(); g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, 0.88 * h + Math.sin(x / w * TAU * 6 + 1) * 6); g.stroke(); band(0.2, B[1], 1); band(0.8, B[1], 1); }
    else if (L.motif === 'feather') { band(0.15, B[2], 3); band(0.85, B[2], 3); for (let k = 0; k < 12; k++) { const x = (k + 0.5) / 12 * w; g.fillStyle = B[1]; g.beginPath(); g.ellipse(x, 0.1 * h, 7, 11, 0, 0, TAU); g.fill(); g.fillStyle = B[0]; g.beginPath(); g.ellipse(x, 0.1 * h + 2, 4, 6, 0, 0, TAU); g.fill(); g.fillStyle = '#1a1a3a'; g.beginPath(); g.arc(x, 0.1 * h + 3, 2.2, 0, TAU); g.fill(); } }
    else if (L.motif === 'tulip') { band(0.19, B[3], 3); band(0.81, B[3], 3); for (let k = 0; k < 14; k++) { const x = (k + 0.5) / 14 * w, c = B[k % 3]; g.fillStyle = '#3a7a2a'; g.fillRect(x - 1, 0.1 * h, 2, 12); g.fillStyle = c; g.beginPath(); g.moveTo(x - 6, 0.05 * h); g.lineTo(x - 3, 0.08 * h); g.lineTo(x, 0.04 * h); g.lineTo(x + 3, 0.08 * h); g.lineTo(x + 6, 0.05 * h); g.quadraticCurveTo(x + 6, 0.12 * h, x, 0.12 * h); g.quadraticCurveTo(x - 6, 0.12 * h, x - 6, 0.05 * h); g.fill(); } }
    else if (L.motif === 'lotus') { for (let k = 0; k < 16; k++) { const x = (k + 0.5) / 16 * w; g.fillStyle = k % 2 ? B[1] : B[0]; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(x, 0.04 * h); g.quadraticCurveTo(x + 9, 0.11 * h, x, 0.16 * h); g.quadraticCurveTo(x - 9, 0.11 * h, x, 0.04 * h); g.fill(); g.globalAlpha = 1; } band(0.84, B[0], 2); }
    else if (L.motif === 'circuit') { g.strokeStyle = B[0]; g.lineWidth = 1.5; for (let k = 0; k < 18; k++) { const x = (k + 0.5) / 18 * w; g.beginPath(); g.moveTo(x, 0.05 * h); g.lineTo(x, 0.12 * h); g.lineTo(x + 8, 0.16 * h); g.stroke(); g.fillStyle = B[1]; g.fillRect(x + 7, 0.155 * h, 3, 3); } band(0.86, B[1], 2); }
    else if (L.motif === 'waves') { g.strokeStyle = B[0]; g.lineWidth = 2; for (let r0 = 0; r0 < 2; r0++) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, (0.1 + r0 * 0.06) * h + Math.sin(x / w * TAU * 8 + r0) * 4); g.stroke(); } band(0.86, B[1], 2); }
    else { [[0.18, B[2]], [0.21, B[0]], [0.79, B[0]], [0.82, B[2]]].forEach(([v, c]) => band(v, c, 4)); g.fillStyle = B[1]; for (let k = 0; k < 28; k++) { g.beginPath(); g.arc((k + 0.5) / 28 * w, 0.12 * h, 3, 0, TAU); g.fill(); } }
    drawHoles(g, w, h, L.glass ? 'rgba(255,255,255,.18)' : 'rgba(20,8,4,.9)', L.holes);
  });
  return { holes, clay };
}
// The stand, in the garbo's own (scaled) space: it fills the same footprint as the draped stand, 0.5 across and up to
// 0.575 where the pot sits
function lookStand(kit, g, L) {
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  // (an LED ring has a material of its own, which the garbo's update colours on the beat; an amber one is the kit's)
  const glowRing = (r, y, hex, k, own) => { const t = add(new THREE.TorusGeometry(r, 0.012, 6, 40), own ? new THREE.MeshBasicMaterial({ color: hex }) : kit.glow(hex, k, 'garbo'), 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
  const L0 = [];
  if (L.stand === 'basalt') {
    add(new THREE.CylinderGeometry(0.44, 0.5, 0.575, 8), std('#1c1820', 0.55, 0.15), 0, 0.2875, 0);
    glowRing(0.445, 0.52, '#ffa245', 1.6); glowRing(0.49, 0.06, '#ffa245', 1.0);
  } else if (L.stand === 'chowki') {
    const teak = std('#6a4424', 0.6, 0.05);
    [[-0.32, -0.32], [0.32, -0.32], [0.32, 0.32], [-0.32, 0.32]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 8), teak, x, 0.21, z); add(new THREE.SphereGeometry(0.05, 8, 6), teak, x, 0.03, z); });
    add(new THREE.BoxGeometry(0.82, 0.06, 0.82), teak, 0, 0.45, 0);
    const cloth = canvasTexture(256, 64, (c, w, h) => { c.fillStyle = '#1e2a5a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8a86a'; c.lineWidth = 2; for (let x = 8; x < w; x += 22) { c.beginPath(); c.arc(x, h / 2, 6, 0, TAU); c.stroke(); } c.fillStyle = '#c0392b'; c.fillRect(0, h - 8, w, 4); });
    add(new THREE.BoxGeometry(0.86, 0.1, 0.86), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.9 }), 0, 0.53, 0);
  } else if (L.stand === 'truss') {
    const alu = std('#a7acb3', 0.35, 0.8);
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; add(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 6), alu, Math.cos(a) * 0.3, 0.28, Math.sin(a) * 0.3); }
    [0.04, 0.3, 0.55].forEach((y) => { const t = add(new THREE.TorusGeometry(0.3, 0.012, 4, 3), alu, 0, y, 0); t.rotation.x = Math.PI / 2; });
    add(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 24), std('#16161a', 0.4, 0.5), 0, 0.56, 0);
    L0.push(glowRing(0.4, 0.545, L.led[0], 2.2, true), glowRing(0.34, 0.02, L.led[1], 2.0, true));
  } else if (L.stand === 'lotus') {
    const marble = std(L.clay[1] === '#ffffff' ? '#f2f0ee' : L.clay[1], 0.3, 0.05);
    add(new THREE.LatheGeometry([[0, 0], [0.32, 0], [0.34, 0.06], [0.18, 0.16], [0.14, 0.4], [0.26, 0.5], [0.36, 0.575], [0, 0.575]].map(([a, b]) => new THREE.Vector2(a, b)), 32), marble, 0, 0, 0);
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, p = add(new THREE.SphereGeometry(0.11, 10, 6), std(L.bands[0], 0.4, 0.05, { emissive: L.bands[0], emissiveIntensity: 0.5 }), Math.cos(a) * 0.36, 0.52, Math.sin(a) * 0.36); p.scale.set(0.55, 0.35, 1.3); p.rotation.y = -a; p.rotation.z = 0.5; }
  } else if (L.stand === 'stone') {
    const sand = std('#c8a070', 0.85), dark = std('#a07a50', 0.85);
    add(new THREE.BoxGeometry(0.98, 0.16, 0.98), dark, 0, 0.08, 0); add(new THREE.BoxGeometry(0.8, 0.22, 0.8), sand, 0, 0.27, 0); add(new THREE.BoxGeometry(0.66, 0.2, 0.66), dark, 0, 0.48, 0);
    add(new THREE.BoxGeometry(0.82, 0.03, 0.82), std('#e8b04b', 0.35, 0.7), 0, 0.385, 0);
  } else if (L.stand === 'rattan') {
    const weave = canvasTexture(128, 64, (c, w, h) => { c.fillStyle = '#7a5530'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c89a5a'; c.lineWidth = 3; for (let k = -h; k < w; k += 10) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h, h); c.stroke(); c.beginPath(); c.moveTo(k + h, 0); c.lineTo(k, h); c.stroke(); } });
    weave.wrapS = THREE.RepeatWrapping; weave.repeat.set(4, 1);
    add(new THREE.CylinderGeometry(0.4, 0.48, 0.55, 24, 1, true), new THREE.MeshStandardMaterial({ map: weave, roughness: 0.9, side: THREE.DoubleSide }), 0, 0.275, 0);
    [0.02, 0.55].forEach((y, i) => { const t = add(new THREE.TorusGeometry(i ? 0.4 : 0.48, 0.022, 6, 32), std('#5a3a1e', 0.8), 0, y, 0); t.rotation.x = Math.PI / 2; });
    add(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 24), std('#5a3a1e', 0.8), 0, 0.56, 0);
  } else if (L.stand === 'hex') {
    add(new THREE.CylinderGeometry(0.44, 0.5, 0.575, 6), std('#120e1a', 0.2, 0.6), 0, 0.2875, 0);
    // LED down each edge and round its top and foot, in the night's neon, breathing on the beat
    const ledA = new THREE.MeshBasicMaterial({ color: L.led[0] }), ledB = new THREE.MeshBasicMaterial({ color: L.led[1] });
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, bar = add(new THREE.BoxGeometry(0.022, 0.58, 0.022), ledA, Math.cos(a) * 0.475, 0.29, Math.sin(a) * 0.475); bar.rotation.y = -a; bar.rotation.z = 0.1 * Math.cos(a); }
    [[0.445, 0.575, ledB], [0.505, 0.01, ledB]].forEach(([r0, y, m]) => { const t = add(new THREE.TorusGeometry(r0, 0.014, 4, 6), m, 0, y, 0); t.rotation.x = Math.PI / 2; t.rotation.z = Math.PI / 6; });
    L0.push({ material: ledA }, { material: ledB });
  } else if (L.stand === 'steps') {
    const stone = std('#d8c4a0', 0.8), brass = std('#c9963f', 0.3, 0.8);
    [[0.5, 0.0, 0.14], [0.42, 0.14, 0.14], [0.34, 0.28, 0.14], [0.27, 0.42, 0.155]].forEach(([r, y, h], i) => { add(new THREE.CylinderGeometry(r, r, h, 24), i % 2 ? brass : stone, 0, y + h / 2, 0); });
  } else if (L.stand === 'marble') {
    add(new THREE.LatheGeometry([[0, 0], [0.46, 0], [0.46, 0.06], [0.3, 0.12], [0.26, 0.44], [0.38, 0.52], [0.4, 0.575], [0, 0.575]].map(([a, b]) => new THREE.Vector2(a, b)), 32), std('#f2eee8', 0.25, 0.05), 0, 0, 0);
    const band2 = add(new THREE.TorusGeometry(0.27, 0.012, 6, 32), std('#e8c070', 0.3, 0.8), 0, 0.3, 0); band2.rotation.x = Math.PI / 2;
  }
  return L0;
}
// What lies round it on the ground (in the garbo's root, at real size)
function lookGround(kit, root, L, live) {
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); return m; };
  if (L.ground === 'crystals') {
    // five clusters of amber crystal round the plinth, each a few faceted shards leaning out from a common root
    const amber = kit.glow('#ffa245', 1.5, 'garbo'), deep = kit.glow('#e8701a', 1.2, 'garbo'), shard = new THREE.OctahedronGeometry(1, 0);
    for (let c = 0; c < 5; c++) {
      const a0 = (c + 0.15) / 5 * TAU, d0 = 1.05 + (c % 2) * 0.25, cx = Math.cos(a0) * d0, cz = Math.sin(a0) * d0;
      for (let k = 0; k < 5; k++) {
        const h = 0.22 + ((c * 7 + k * 3) % 5) * 0.07, w = 0.045 + (k % 2) * 0.02, lean = 0.25 + (k % 3) * 0.12, dir = a0 + (k - 2) * 0.5;
        const m = add(shard, k % 2 ? deep : amber, cx + Math.cos(dir) * 0.06 * k, h * 0.42, cz + Math.sin(dir) * 0.06 * k);
        m.scale.set(w, h * 0.55, w); m.rotation.set(Math.sin(dir) * lean, k * 0.7, -Math.cos(dir) * lean);
      }
      kit.pools.add(cx, 0.02, cz, 0.6, 0.6, '#ffa245', 0.16, { layer: 'garbo', live: true });
    }
    kit.pools.add(0, 0.02, 0, 2.1, 2.1, '#ffa245', 0.12, { layer: 'garbo', live: true });
  } else if (L.ground === 'mandana') {
    const t = canvasTexture(512, 512, (c, w) => { c.translate(w / 2, w / 2); c.strokeStyle = 'rgba(250,246,236,.92)'; c.lineWidth = 5; for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(0, 0, w * (0.2 + r * 0.1), 0, TAU); c.stroke(); } for (let k = 0; k < 16; k++) { c.save(); c.rotate(k / 16 * TAU); c.beginPath(); c.moveTo(w * 0.2, 0); c.quadraticCurveTo(w * 0.33, w * 0.06, w * 0.46, 0); c.quadraticCurveTo(w * 0.33, -w * 0.06, w * 0.2, 0); c.stroke(); c.fillStyle = 'rgba(250,246,236,.9)'; c.beginPath(); c.arc(w * 0.48, 0, 6, 0, TAU); c.fill(); c.restore(); } });
    const m = add(new THREE.CircleGeometry(2.0, 48), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0.012, 0); m.rotation.x = -Math.PI / 2;
  } else if (L.ground === 'ledring') {
    [[1.55, L.led[0]], [1.85, L.led[1]]].forEach(([r, hex]) => { const t = add(new THREE.TorusGeometry(r, 0.025, 4, 96), new THREE.MeshBasicMaterial({ color: hex }), 0, 0.015, 0); t.rotation.x = Math.PI / 2; live.push(t); });
  } else if (L.ground === 'water') {
    const rim = add(new THREE.TorusGeometry(1.2, 0.07, 8, 64), std('#e8ecf0', 0.3), 0, 0.05, 0); rim.rotation.x = Math.PI / 2;
    const water = add(new THREE.CircleGeometry(1.18, 64), new THREE.MeshStandardMaterial({ color: '#0a2a3a', roughness: 0.05, metalness: 0.6, emissive: '#0a3a4a', emissiveIntensity: 0.4 }), 0, 0.04, 0); water.rotation.x = -Math.PI / 2;
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.3, d = 0.85, x = Math.cos(a) * d, z = Math.sin(a) * d; for (let p = 0; p < 6; p++) { const b = p / 6 * TAU, petal = add(new THREE.SphereGeometry(0.05, 8, 5), std('#f4c4e0', 0.6, 0, { emissive: '#ff9ad0', emissiveIntensity: 0.25 }), x + Math.cos(b) * 0.05, 0.06, z + Math.sin(b) * 0.05); petal.scale.set(1, 0.5, 1.8); petal.rotation.y = -b; } kit.flames.add(x, 0.07, z, { s: 0.035, k: 0.25 }); }
  } else if (L.ground === 'kolam') {
    const t = canvasTexture(512, 512, (c, w) => { c.translate(w / 2, w / 2); const cols = ['#f08a24', '#f6c342', '#c0392b', '#f6efe0']; for (let r = 0; r < 4; r++) for (let k = 0; k < 24 + r * 8; k++) { const a = k / (24 + r * 8) * TAU; c.fillStyle = cols[(k + r) % 4]; c.beginPath(); c.arc(Math.cos(a) * w * (0.24 + r * 0.06), Math.sin(a) * w * (0.24 + r * 0.06), 5 - r * 0.5, 0, TAU); c.fill(); } });
    const m = add(new THREE.CircleGeometry(1.7, 48), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0.012, 0); m.rotation.x = -Math.PI / 2;
  } else if (L.ground === 'petals') {
    const cols = ['#c080ff', '#ff6aa0', '#ffd24a', '#ff8a4a'], pm = new THREE.InstancedMesh(new THREE.CircleGeometry(0.045, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide }), 90), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    for (let k = 0; k < 90; k++) { const a = k * 2.399, d = 0.9 + ((k * 37) % 100) / 100 * 0.9; pm.setMatrixAt(k, mx.compose(new THREE.Vector3(Math.cos(a) * d, 0.012, Math.sin(a) * d), q.setFromEuler(e.set(-Math.PI / 2, 0, a)), new THREE.Vector3(1, 1.6, 1))); pm.setColorAt(k, c.set(cols[k % 4])); }
    root.add(pm);
  } else if (L.ground === 'pearls') {
    const pm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), std('#f4f0ea', 0.15, 0.3), 72), mx = new THREE.Matrix4();
    for (let k = 0; k < 72; k++) { const a = k / 72 * TAU, d = 1.3 + 0.05 * Math.sin(a * 6); pm.setMatrixAt(k, mx.makeTranslation(Math.cos(a) * d, 0.035, Math.sin(a) * d)); }
    root.add(pm);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.26, sh = add(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI), std('#f6e0d0', 0.4), Math.cos(a) * 1.55, 0.02, Math.sin(a) * 1.55); sh.rotation.x = -Math.PI / 2; sh.scale.set(1, 1, 0.4); }
  }
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

export function buildGarbo(kit, { small, flags, bare, look }) {
  const root = new THREE.Group(), S = GARBO.potScale, { r, top } = GARBO.mandvi(small), L = look || null;
  const tex = potTextures(L), live = [];

  // The rangoli on the ground, and a ring of diyas round it
  const rCanvas = document.createElement('canvas'); rCanvas.width = rCanvas.height = 512;
  paintRangoli(rCanvas.getContext('2d'), 512, flags);
  const rTex = new THREE.CanvasTexture(rCanvas); rTex.colorSpace = THREE.SRGBColorSpace; rTex.anisotropy = 4;
  const rangoli = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.95, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
  rangoli.rotation.x = -Math.PI / 2; rangoli.position.y = 0.012; rangoli.receiveShadow = true;
  if (!bare && !L) root.add(rangoli);
  if (L) lookGround(kit, root, L, live);
  // (real flames: each flickers on its own, and lights the ground round it in the flame layer)
  const nd = L ? L.diyas : bare ? 8 : 12, rd = L ? (L.ground === 'water' ? 1.4 : L.ground === 'pearls' ? 1.75 : 1.95) : bare ? 1.75 : 1.95;
  for (let i = 0; i < nd; i++) { const a = (i + 0.5) / nd * TAU; kit.flames.add(Math.cos(a) * rd, 0.012, Math.sin(a) * rd, { s: 0.06, k: 0.32, bowl: L && L.metal > 0.5 ? 'brass' : 'clay' }); }
  // brass on stepped stone: a second ring of diyas on the stand's steps, a deepmala
  if (L && L.stand === 'steps') for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * TAU; kit.flames.add(Math.cos(a) * 0.46 * S, 0.14 * S, Math.sin(a) * 0.46 * S, { s: 0.045, k: 0.25, bowl: 'brass' }); }

  // The garbo itself, scaled as one
  const g = new THREE.Group(); g.scale.setScalar(S); root.add(g);
  let standLive = [];
  if (L) standLive = lookStand(kit, g, L);
  else {
  // A low wooden stand draped in red cloth with a gold border
  [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]].forEach(([x, z]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), std('#3b2213', 0.8)); leg.position.set(x, 0.25, z); g.add(leg); });
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.28, 16, 1, true), kit.selfLit(new THREE.MeshStandardMaterial({ color: '#9b1f1a', roughness: 0.85, side: THREE.DoubleSide, emissive: '#7a2412' }), 0.55, 'flame')); cloth.position.y = 0.42; g.add(cloth);
  const clothTop = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 16), std('#4a0c0a', 0.9)); clothTop.position.y = 0.56; g.add(clothTop);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 4, 32), std('#e8b04b', 0.35, 0.7)); trim.rotation.x = Math.PI / 2; trim.position.y = 0.285; g.add(trim);
  }
  // The pot: a lathe from the base up through the shoulder to the neck
  const prof = GARBO_POT.map(([rr, y]) => new THREE.Vector2(rr, y));
  const potMat = new THREE.MeshStandardMaterial({ map: tex.clay, emissiveMap: tex.holes, emissive: L ? L.glow : '#ffb45a', emissiveIntensity: 0, roughness: L && L.rough != null ? L.rough : 0.82, metalness: L && L.metal ? L.metal : 0, transparent: !!(L && L.glass), opacity: L && L.glass ? 0.92 : 1 });
  const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), potMat); pot.position.y = 0.575; pot.castShadow = true; g.add(pot);
  const neckBeads = []; for (let i = 0; i < 22; i++) { const a = i / 22 * TAU; neckBeads.push([Math.cos(a) * 0.19, 0.575 + 0.47 + 0.03 * Math.cos(a), Math.sin(a) * 0.19]); }
  beads(g, neckBeads, 0.028);
  // The diya on the mouth and its flame
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.05, 14), std('#6a2c14', 0.85)); bowl.position.y = 0.575 + 0.62; g.add(bowl);
  const flameGeo = new THREE.SphereGeometry(0.045, 10, 8); flameGeo.scale(1, 2.4, 1); flameGeo.translate(0, 0.1, 0);
  const flame = new THREE.Mesh(flameGeo, glowMat('#ffd27a', 4)); flame.position.y = 0.575 + 0.63; flame.userData.dynamic = true; g.add(flame);
  const flameCore = new THREE.Mesh(flameGeo, glowMat('#fff4d0', 7)); flameCore.scale.setScalar(0.5); flameCore.position.y = 0.575 + 0.64; flameCore.userData.dynamic = true; g.add(flameCore);

  let flag = null;
  const chhatri = L && L.canopy === 'chhatri';
  if (!bare && (!L || chhatri)) {
  // The mandvi: four carved pillars, a scalloped dome with a smaller one above, a kalash and a flag (a sandstone
  // chhatri, carved and lamplit, where the venue is of stone)
  const pillar = chhatri ? new THREE.CylinderGeometry(0.08, 0.095, top, 8) : new THREE.CylinderGeometry(0.06, 0.075, top, 10), pMat = chhatri ? kit.selfLit(std('#d0a46a', 0.85), 0.04, 'flame') : kit.selfLit(new THREE.MeshStandardMaterial({ map: pillarTexture(), roughness: 0.6, metalness: 0.15 }), 0.28, 'flame');
  [[-r, -r], [r, -r], [r, r], [-r, r]].forEach(([x, z]) => {
    const p = new THREE.Mesh(pillar, pMat); p.position.set(x, top / 2, z); p.castShadow = true; root.add(p);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), chhatri ? std('#a8804e', 0.85) : std('#5a1510', 0.7)); base.position.set(x, 0.06, z); root.add(base);
    // a chhatri's pillar: a carved bracket capital under the ledge
    if (chhatri) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.16, 8), std('#c89a62', 0.85)); cap.position.set(x, top - 0.08, z); root.add(cap); }
  });
  // Lacquered red, catching the bulbs round its rim
  const dome = new THREE.Mesh(new THREE.LatheGeometry(MANDVI_DOME.map(([a, b]) => new THREE.Vector2(a * r, b)), 32), chhatri ? std('#d4ac78', 0.8, 0, { side: THREE.DoubleSide, emissive: '#5a3a18', emissiveIntensity: 0.5 }) : std('#a8141a', 0.32, 0.25, { side: THREE.DoubleSide, emissive: '#8a1410', emissiveIntensity: 0.9 }));
  dome.position.y = top; root.add(dome);
  const ribs = new THREE.Mesh(new THREE.LatheGeometry(MANDVI_DOME.slice(0, 5).map(([a, b]) => new THREE.Vector2(a * r + 0.01, b)), 12), new THREE.MeshStandardMaterial({ color: '#f0c24b', wireframe: true, metalness: 0.6, roughness: 0.4 }));
  ribs.position.y = top; root.add(ribs);
  const dome2 = new THREE.Mesh(new THREE.LatheGeometry(MANDVI_DOME2.map(([a, b]) => new THREE.Vector2(a * r, b)), 20), chhatri ? std('#c8a070', 0.8, 0, { emissive: '#4a3010', emissiveIntensity: 0.5 }) : std('#f0c24b', 0.35, 0.6, { emissive: '#5a3a08', emissiveIntensity: 0.6 })); dome2.position.y = top + 0.8; root.add(dome2);
  const kalash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), std('#e8b04b', 0.3, 0.8)); kalash.position.y = top + 1.36; root.add(kalash);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8), std('#3a2413')); mast.position.y = top + 1.8; root.add(mast);
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.55, -0.12, 0, 0, -0.3, 0], 3)); flagGeo.computeVertexNormals();
  flag = new THREE.Mesh(flagGeo, std(chhatri ? '#f08a24' : '#d8453a', 0.8, 0, { side: THREE.DoubleSide })); flag.position.y = top + 2.18; flag.userData.dynamic = true; root.add(flag);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.32, r * 1.32, 0.08, chhatri ? 8 : 32), chhatri ? std('#b08a5a', 0.8) : std('#e8b04b', 0.35, 0.7, { emissive: '#3a2406', emissiveIntensity: 0.5 })); slab.position.y = top; root.add(slab);
  // Bulbs round the scalloped edge (festive), and a toran of flags in the night's colours (a chhatri: diyas on its
  // ledge and a few peacock feathers tucked at its corners instead)
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * TAU, x = Math.cos(a) * r * 1.33, z = Math.sin(a) * r * 1.33;
    if (chhatri) { if (k % 2 === 0) kit.flames.add(x * 0.97, top + 0.05, z * 0.97, { s: 0.04, k: 0.22, bowl: 'clay' }); continue; }
    kit.bulbs.add(x, top - 0.06, z, k, { ph: k, s: 1.2 });
    kit.flags.add(x, top - 0.04, z, -a + Math.PI / 2, 0.2, k);
  }
  if (chhatri) [[-r, -r], [r, -r], [r, r], [-r, r]].forEach(([x, z], i) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), std('#c8b070', 0.6)); stem.position.set(x * 1.05, top - 0.4, z * 1.05); stem.rotation.z = (i % 2 ? 1 : -1) * 0.3; root.add(stem);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std('#1e5a8a', 0.5, 0.2, { emissive: '#0e3a5a', emissiveIntensity: 0.4 })); eye.scale.set(0.8, 1.3, 0.25); eye.position.set(x * 1.05 + (i % 2 ? -0.1 : 0.1), top - 0.08, z * 1.05); root.add(eye);
  });
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
  const ledCol = new THREE.Color();
  return {
    root,
    setTheme(TH) { paintRangoli(rCanvas.getContext('2d'), 512, TH.flags); rTex.needsUpdate = true; },
    // level: the garbo layer's level with the lamp's lit value and flicker already in it; shown: false when you're
    // right on top of it (the 2D scene fades it there)
    update(t, level, reduce, shown) {
      root.visible = shown;
      potMat.emissiveIntensity = (L && L.glass ? 2.2 : 3.2) * level;
      // LED rings (steel and neon garbos) breathe in their own colours, brighter on the beat
      if (L && L.led) { const k = 0.65 + 0.35 * (reduce ? 1 : Math.sin(t * 2.2) * 0.5 + 0.5); standLive.concat(live).forEach((m, i) => { if (!m.material || !m.material.color) return; ledCol.set(L.led[i % L.led.length]).multiplyScalar(k * 2.2 * Math.max(0.3, level)); m.material.color.copy(ledCol); }); }
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
