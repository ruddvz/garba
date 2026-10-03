// CHITRA AANGAN, built from the owner's starred references (research/venue-reference-pack, priority 3: zip-117,
// zip-130 and the art-garden board): a garden courtyard where a round floor of pale lime plaster lies in a ring of white
// gravel; great trees spread over it with strings of lights hanging straight down from their branches, a small glass
// lantern at the end of each; a curved wall of tall panels on the right for the owner's artwork, each lit from below
// with marigolds at its foot; the musicians on a low wooden platform at the far left with speakers on stands; benches and
// sofas with red cushions round the gravel, rugs, brass lanterns, palms and beds of broad-leaved plants; low cream walls
// behind, a lamp on them here and there.
//
// The plan is the 2D scene's (venues2d/chitra.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, wrap, normalMap, tex } from '../floors.js';
import { ground, Shape } from './common.js';
import { newDecor, rugTexture, newWoods, barkTexture, leafTexture } from './decor.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

/* ---------- the ground: soil and grass, with the lime floor, its curb and the gravel ring painted on ---------- */
function soil(res) {
  const r = seeded(21), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#1e2414'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  for (let i = 0; i < 24000; i++) { const x = r() * res, y = r() * res, l = r(); g.fillStyle = l < 0.5 ? `rgba(60,80,36,${0.2 + r() * 0.3})` : `rgba(10,12,6,${0.2 + r() * 0.3})`; g.fillRect(x, y, 1.5, 3); hg.fillStyle = l < 0.5 ? '#9a9a9a' : '#606060'; hg.fillRect(x, y, 1.5, 3); }
  return { map: tex(c, [30, 30]), normal: tex(normalMap(hc, 2), [30, 30], true) };
}
function floorDecal(rect, res, CA) {
  const r = seeded(9), c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  // white gravel round the floor, pebbles in greys and creams, and stepping stones across it to the seats
  const gr = g.createRadialGradient(0, 0, CA.floor, 0, 0, CA.gravel); gr.addColorStop(0, '#a8a296'); gr.addColorStop(0.9, '#8e897e'); gr.addColorStop(1, 'rgba(142,137,126,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, CA.gravel + 0.4, 0, TAU); g.fill();
  for (let i = 0; i < 26000; i++) { const a = r() * TAU, d = CA.floor + r() * (CA.gravel - CA.floor + 0.4), s = 0.02 + r() * 0.035, t = 150 + r() * 90; g.fillStyle = `rgba(${t},${t * 0.97},${t * 0.92},${0.5 + r() * 0.5})`; g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d, s, s * 0.75, r() * 3, 0, TAU); g.fill(); }
  [[-90, 4], [113, 3], [200, 3]].forEach(([deg, n]) => { const a = deg * Math.PI / 180; for (let i = 0; i < n; i++) { const d = CA.floor + 0.8 + i * 1.05; g.fillStyle = '#9a8a72'; g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.rotate(a); g.fillRect(-0.32, -0.55, 0.64, 1.1); g.restore(); } });
  // the floor: lime plaster, warm cream, smoothed in broad arcs by the trowel, a little darker where feet have worn it
  g.fillStyle = '#cbbd9c'; g.beginPath(); g.arc(0, 0, CA.floor, 0, TAU); g.fill();
  for (let i = 0; i < 260; i++) { const rr = r() * CA.floor, a0 = r() * TAU; g.strokeStyle = r() < 0.5 ? 'rgba(255,248,230,.08)' : 'rgba(120,100,70,.06)'; g.lineWidth = 0.2 + r() * 0.5; g.beginPath(); g.arc(0, 0, rr, a0, a0 + 0.3 + r() * 0.8); g.stroke(); }
  const wear = g.createRadialGradient(0, 0, 3, 0, 0, CA.floor); wear.addColorStop(0, 'rgba(150,120,80,.05)'); wear.addColorStop(0.55, 'rgba(150,120,80,.14)'); wear.addColorStop(0.9, 'rgba(150,120,80,.06)'); wear.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = wear; g.beginPath(); g.arc(0, 0, CA.floor, 0, TAU); g.fill();
  // its curb of stone
  g.strokeStyle = '#a8957a'; g.lineWidth = 0.28; g.beginPath(); g.arc(0, 0, CA.floor + 0.12, 0, TAU); g.stroke();
  g.restore();
  return c;
}

/* ---------- the panels ----------
   The owner's own artwork goes on these panels: images listed in venue-art/chitra/panels.json (beside the player's
   page), one per panel in order, are loaded onto them as they arrive. Until then each is painted in a folk tradition
   (folkPanel, below); patternPanel's plain textiles are kept for a venue that wants them. */
const PANEL_PALS = [['#7a1424', '#e8b04b', '#f3e6d0'], ['#1e3a6a', '#e8b04b', '#c2185b'], ['#4a1a5a', '#f0c24b', '#2f8f5b'], ['#8a3a14', '#f3e6d0', '#1e5a6a'], ['#183a2a', '#e8b04b', '#b8312b']];
function patternPanel(i, res) {
  const W = res, H = res * 2, pal = PANEL_PALS[i % PANEL_PALS.length], kind = i % 3;
  return canvasTexture(W, H, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, pal[0]); bg.addColorStop(1, '#140a08'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = pal[1]; g.lineWidth = W * 0.03; g.strokeRect(W * 0.04, W * 0.04, W * 0.92, H - W * 0.08);
    const u = W / 8;
    for (let y = u; y < H - u * 0.8; y += u) for (let x = u; x < W - u * 0.8; x += u) {
      g.save(); g.translate(x, y);
      if (kind === 0) { g.fillStyle = (Math.round(x / u) + Math.round(y / u)) % 2 ? pal[1] : pal[2]; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; g.beginPath(); g.arc(Math.cos(a) * u * 0.18, Math.sin(a) * u * 0.18, u * 0.07, 0, TAU); g.fill(); } }
      else if (kind === 1) { g.fillStyle = pal[2]; g.beginPath(); g.moveTo(0, -u * 0.35); g.lineTo(u * 0.3, 0); g.lineTo(0, u * 0.35); g.lineTo(-u * 0.3, 0); g.closePath(); g.fill(); g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(0, 0, u * 0.09, 0, TAU); g.fill(); }
      else { g.strokeStyle = pal[1]; g.lineWidth = u * 0.05; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.beginPath(); g.ellipse(Math.cos(a) * u * 0.2, Math.sin(a) * u * 0.2, u * 0.16, u * 0.07, a, 0, TAU); g.stroke(); } g.fillStyle = pal[2]; g.beginPath(); g.arc(0, 0, u * 0.08, 0, TAU); g.fill(); }
      g.restore();
    }
  });
}
// Until the owner's artwork arrives, each panel is painted in one of the folk traditions the courtyard draws on, with
// no deity on it (those are for the owner's own art): a Warli garba circle, a Madhubani peacock, a Pichwai lotus pond
// with a cow, a tiger in the Pattachitra manner, a Kalamkari tree of life with birds, a sun and moon in the colours of
// a Mata ni Pachedi. Each has its painted border and a little age on it.
function folkPanel(i, res) {
  const W = res, H = res * 2, kind = i % 6, u = W / 512;
  return canvasTexture(W, H, (g) => {
    const rnd = seeded(91 + i * 13);
    const border = (bg, line, accent) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.strokeStyle = line; g.lineWidth = 10 * u; g.strokeRect(14 * u, 14 * u, W - 28 * u, H - 28 * u);
      g.lineWidth = 3 * u; g.strokeRect(34 * u, 34 * u, W - 68 * u, H - 68 * u);
      g.fillStyle = accent; for (let y = 44 * u; y < H - 40 * u; y += 22 * u) { g.beginPath(); g.moveTo(24 * u, y); g.lineTo(30 * u, y + 8 * u); g.lineTo(24 * u, y + 16 * u); g.fill(); g.beginPath(); g.moveTo(W - 24 * u, y); g.lineTo(W - 30 * u, y + 8 * u); g.lineTo(W - 24 * u, y + 16 * u); g.fill(); }
    };
    const stick = (x, y, s, col, arms) => {
      // a Warli figure: two triangles meeting at the waist, a round head, stick limbs
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 3 * u * s;
      g.beginPath(); g.moveTo(x - 9 * u * s, y - 22 * u * s); g.lineTo(x + 9 * u * s, y - 22 * u * s); g.lineTo(x, y - 8 * u * s); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x - 9 * u * s, y + 6 * u * s); g.lineTo(x + 9 * u * s, y + 6 * u * s); g.lineTo(x, y - 8 * u * s); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, y - 29 * u * s, 6 * u * s, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(x - 5 * u * s, y + 6 * u * s); g.lineTo(x - 9 * u * s, y + 20 * u * s); g.moveTo(x + 5 * u * s, y + 6 * u * s); g.lineTo(x + 9 * u * s, y + 20 * u * s);
      g.moveTo(x - 8 * u * s, y - 20 * u * s); g.lineTo(x - 18 * u * s, y - (arms ? 30 : 10) * u * s); g.moveTo(x + 8 * u * s, y - 20 * u * s); g.lineTo(x + 18 * u * s, y - (arms ? 30 : 10) * u * s); g.stroke();
    };
    if (kind === 0) {
      // Warli: a garba circle of dancers on terracotta round a drummer, the sun and moon over them, trees below
      border('#8e3a1c', '#f3e6d0', '#f3e6d0');
      const cx = W / 2, cy = H * 0.5;
      [[150, 18], [100, 13]].forEach(([R, n], ring) => { for (let k = 0; k < n; k++) { const a = k / n * TAU; stick(cx + Math.cos(a) * R * u, cy + Math.sin(a) * R * u * 1.05, ring ? 0.8 : 1, '#f6efe0', true); } });
      stick(cx, cy + 12 * u, 1.1, '#f6efe0', false); g.strokeStyle = '#f6efe0'; g.lineWidth = 3 * u; g.beginPath(); g.ellipse(cx, cy + 4 * u, 14 * u, 8 * u, 0, 0, TAU); g.stroke();
      g.fillStyle = '#f6efe0'; g.beginPath(); g.arc(W * 0.3, H * 0.14, 34 * u, 0, TAU); g.fill(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; g.fillRect(W * 0.3 + Math.cos(a) * 46 * u - 3 * u, H * 0.14 + Math.sin(a) * 46 * u - 3 * u, 6 * u, 6 * u); }
      g.beginPath(); g.arc(W * 0.72, H * 0.14, 28 * u, 0, TAU); g.fill(); g.fillStyle = '#8e3a1c'; g.beginPath(); g.arc(W * 0.76, H * 0.13, 25 * u, 0, TAU); g.fill();
      g.fillStyle = '#f6efe0'; g.strokeStyle = '#f6efe0';
      for (let t = 0; t < 5; t++) { const x = W * (0.16 + t * 0.17), y0 = H * 0.92, h = 120 * u; g.lineWidth = 4 * u; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 - h); g.stroke(); for (let b = 0; b < 7; b++) { const yy = y0 - h * 0.25 - b * 12 * u; g.beginPath(); g.moveTo(x, yy); g.lineTo(x - (22 - b * 2) * u, yy + 10 * u); g.lineTo(x + (22 - b * 2) * u, yy + 10 * u); g.closePath(); g.fill(); } }
    } else if (kind === 1) {
      // Madhubani: a peacock in double black outline, its fan of eyes filling the panel, a border of hatching and fish
      border('#f2e4c4', '#1a1410', '#c0392b');
      const cx = W / 2, cy = H * 0.62;
      for (let k = 0; k < 15; k++) { const a = -Math.PI * 0.95 + k / 14 * Math.PI * 0.9, L = 260 * u; const x = cx + Math.cos(a) * L, y = cy - 60 * u + Math.sin(a) * L * 1.15;
        g.strokeStyle = '#1a1410'; g.lineWidth = 2.5 * u; g.beginPath(); g.moveTo(cx, cy - 40 * u); g.lineTo(x, y); g.stroke();
        g.fillStyle = '#2a8a5a'; g.beginPath(); g.ellipse(x, y, 30 * u, 42 * u, a + Math.PI / 2, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#1e5aa8'; g.beginPath(); g.ellipse(x, y, 17 * u, 24 * u, a + Math.PI / 2, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#e8b04b'; g.beginPath(); g.arc(x, y, 7 * u, 0, TAU); g.fill(); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(x, y, 3.5 * u, 0, TAU); g.fill(); }
      g.fillStyle = '#1e5aa8'; g.strokeStyle = '#1a1410'; g.lineWidth = 4 * u;
      g.beginPath(); g.ellipse(cx, cy + 20 * u, 62 * u, 90 * u, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - 14 * u, cy - 60 * u); g.quadraticCurveTo(cx - 40 * u, cy - 160 * u, cx - 6 * u, cy - 210 * u); g.lineTo(cx + 14 * u, cy - 200 * u); g.quadraticCurveTo(cx - 10 * u, cy - 150 * u, cx + 18 * u, cy - 60 * u); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#f2e4c4'; g.beginPath(); g.arc(cx, cy - 196 * u, 5 * u, 0, TAU); g.fill(); g.fillStyle = '#e8b04b'; g.beginPath(); g.moveTo(cx + 12 * u, cy - 200 * u); g.lineTo(cx + 34 * u, cy - 192 * u); g.lineTo(cx + 12 * u, cy - 188 * u); g.fill();
      for (let k = 0; k < 3; k++) { g.strokeStyle = '#1a1410'; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(cx - 4 * u + k * 6 * u, cy - 212 * u); g.lineTo(cx - 10 * u + k * 8 * u, cy - 236 * u); g.stroke(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(cx - 10 * u + k * 8 * u, cy - 238 * u, 4 * u, 0, TAU); g.fill(); }
      g.strokeStyle = '#c0392b'; g.lineWidth = 2 * u; for (let y = cy + 20 * u; y < cy + 100 * u; y += 10 * u) { g.beginPath(); g.moveTo(cx - 50 * u, y); g.lineTo(cx + 50 * u, y); g.stroke(); }
      g.strokeStyle = '#1a1410'; g.lineWidth = 4 * u; g.beginPath(); g.moveTo(cx - 20 * u, cy + 108 * u); g.lineTo(cx - 28 * u, cy + 160 * u); g.moveTo(cx + 20 * u, cy + 108 * u); g.lineTo(cx + 28 * u, cy + 160 * u); g.stroke();
      for (let x = 60 * u; x < W - 60 * u; x += 40 * u) { g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(x, H - 70 * u, 14 * u, 7 * u, 0, 0, TAU); g.fill(); g.fillStyle = '#1a1410'; g.beginPath(); g.arc(x + 7 * u, H - 71 * u, 2 * u, 0, TAU); g.fill(); }
    } else if (kind === 2) {
      // Pichwai: night-blue water thick with pink lotuses and round leaves, a white cow among them, a toran of flowers
      border('#14244a', '#e8b04b', '#e8b04b');
      for (let k = 0; k < 14; k++) { const x = (60 + (k * 97) % 400) * u, y = H * 0.12 + (k % 2) * 16 * u; g.fillStyle = k % 2 ? '#f08a24' : '#f6efe0'; g.beginPath(); g.arc(x, y, 9 * u, 0, TAU); g.fill(); }
      for (let k = 0; k < 46; k++) { const x = (50 + rnd() * 412) * u, y = H * (0.5 + rnd() * 0.42); g.fillStyle = rnd() < 0.5 ? '#2a6a3a' : '#1e5a32'; g.beginPath(); g.ellipse(x, y, 30 * u, 13 * u, 0, 0, TAU); g.fill(); g.strokeStyle = '#4a9a5a'; g.lineWidth = 1.5 * u; g.stroke(); }
      for (let k = 0; k < 18; k++) { const x = (60 + rnd() * 392) * u, y = H * (0.48 + rnd() * 0.44); for (let p = 0; p < 7; p++) { const a = -Math.PI / 2 + (p - 3) * 0.32; g.fillStyle = p % 2 ? '#f39ac0' : '#e8609a'; g.beginPath(); g.ellipse(x + Math.cos(a) * 12 * u, y + Math.sin(a) * 12 * u, 6 * u, 15 * u, a + Math.PI / 2, 0, TAU); g.fill(); } g.fillStyle = '#e8b04b'; g.beginPath(); g.arc(x, y, 4 * u, 0, TAU); g.fill(); }
      const cx = W * 0.5, cy = H * 0.4; g.fillStyle = '#f6efe0'; g.strokeStyle = '#2a2018'; g.lineWidth = 3 * u;
      g.beginPath(); g.ellipse(cx, cy, 110 * u, 52 * u, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(cx - 118 * u, cy - 38 * u, 34 * u, 26 * u, -0.4, 0, TAU); g.fill(); g.stroke();
      [[-70, 0], [-40, 0], [50, 0], [80, 0]].forEach(([dx]) => { g.beginPath(); g.rect(cx + dx * u - 6 * u, cy + 40 * u, 12 * u, 70 * u); g.fill(); g.stroke(); });
      g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(cx - 20 * u, cy - 6 * u, 40 * u, 18 * u, 0, 0, TAU); g.fill(); g.fillStyle = '#e8b04b'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(cx - 50 * u + k * 12 * u, cy + 8 * u, 3 * u, 0, TAU); g.fill(); }
      g.strokeStyle = '#2a2018'; g.beginPath(); g.moveTo(cx - 132 * u, cy - 60 * u); g.lineTo(cx - 146 * u, cy - 84 * u); g.moveTo(cx - 108 * u, cy - 62 * u); g.lineTo(cx - 100 * u, cy - 86 * u); g.stroke();
    } else if (kind === 3) {
      // a tiger in the Pattachitra manner: an orange face filling an ochre ground, black stripes, a white muzzle, red border
      border('#d8a040', '#7a1414', '#7a1414');
      const cx = W / 2, cy = H * 0.46, R = 190 * u;
      g.fillStyle = '#e8701a'; g.strokeStyle = '#1a1008'; g.lineWidth = 5 * u;
      [[-1], [1]].forEach(([sd]) => { g.beginPath(); g.arc(cx + sd * R * 0.72, cy - R * 0.82, 44 * u, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#f6efe0'; g.beginPath(); g.arc(cx + sd * R * 0.72, cy - R * 0.82, 22 * u, 0, TAU); g.fill(); g.fillStyle = '#e8701a'; });
      g.beginPath(); g.ellipse(cx, cy, R, R * 1.05, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#1a1008'; for (let k = 0; k < 7; k++) { const y = cy - R * 0.85 + k * 18 * u; g.beginPath(); g.moveTo(cx - 6 * u, y); g.lineTo(cx, y + 30 * u); g.lineTo(cx + 6 * u, y); g.fill(); }
      [-1, 1].forEach((sd) => { for (let k = 0; k < 5; k++) { const y = cy - R * 0.4 + k * 40 * u; g.beginPath(); g.moveTo(cx + sd * R * 0.98, y); g.quadraticCurveTo(cx + sd * R * 0.6, y + 8 * u, cx + sd * R * 0.45, y + 22 * u); g.lineTo(cx + sd * R * 0.65, y + 6 * u); g.closePath(); g.fill(); } });
      g.fillStyle = '#f6efe0'; g.beginPath(); g.ellipse(cx, cy + R * 0.45, R * 0.55, R * 0.4, 0, 0, TAU); g.fill(); g.stroke();
      [-1, 1].forEach((sd) => { g.fillStyle = '#f6e04a'; g.beginPath(); g.ellipse(cx + sd * R * 0.38, cy - R * 0.12, 34 * u, 22 * u, sd * 0.2, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#1a1008'; g.beginPath(); g.ellipse(cx + sd * R * 0.38, cy - R * 0.12, 8 * u, 18 * u, 0, 0, TAU); g.fill(); });
      g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(cx - 30 * u, cy + R * 0.2); g.lineTo(cx + 30 * u, cy + R * 0.2); g.lineTo(cx, cy + R * 0.38); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#1a1008'; g.lineWidth = 3 * u; [-1, 1].forEach((sd) => { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx + sd * 40 * u, cy + R * 0.48 + k * 12 * u); g.lineTo(cx + sd * 150 * u, cy + R * 0.4 + k * 22 * u); g.stroke(); } });
      for (let x = 70 * u; x < W - 60 * u; x += 46 * u) { g.fillStyle = '#7a1414'; for (let p = 0; p < 6; p++) { const a = p / 6 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 9 * u, H * 0.86 + Math.sin(a) * 9 * u, 5 * u, 0, TAU); g.fill(); } }
    } else if (kind === 4) {
      // Kalamkari: a tree of life from a pot, its branches curling with leaves and flowers in madder, indigo and ochre, birds
      border('#efe0c0', '#5a2a14', '#2a3a6a');
      const cx = W / 2; g.strokeStyle = '#5a3a1e'; g.lineCap = 'round';
      const branch = (x, y, a, L, w, d) => { if (d > 6 || L < 14 * u) return; const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + Math.sin(a) * L * 0.2, (y + y2) / 2, x2, y2); g.stroke();
        if (d > 2) { const c = ['#a8201e', '#2a3a6a', '#d8902a', '#3a6a3a'][(d + Math.round(x2)) % 4]; g.fillStyle = c; g.beginPath(); g.ellipse(x2, y2, 10 * u, 5 * u, a, 0, TAU); g.fill(); }
        branch(x2, y2, a - 0.45 - rnd() * 0.2, L * 0.74, w * 0.66, d + 1); branch(x2, y2, a + 0.45 + rnd() * 0.2, L * 0.74, w * 0.66, d + 1); };
      branch(cx, H * 0.8, -Math.PI / 2, 180 * u, 26 * u, 0);
      for (let k = 0; k < 12; k++) { const x = (90 + rnd() * 330) * u, y = H * (0.12 + rnd() * 0.45); g.fillStyle = '#a8201e'; for (let p = 0; p < 8; p++) { const a = p / 8 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 9 * u, y + Math.sin(a) * 9 * u, 6 * u, 3 * u, a, 0, TAU); g.fill(); } g.fillStyle = '#d8902a'; g.beginPath(); g.arc(x, y, 5 * u, 0, TAU); g.fill(); }
      [[0.28, 0.3, 1], [0.7, 0.24, -1], [0.62, 0.5, -1], [0.33, 0.55, 1]].forEach(([fx, fy, sd]) => { const x = W * fx, y = H * fy; g.fillStyle = '#2a3a6a'; g.beginPath(); g.ellipse(x, y, 22 * u, 13 * u, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(x + sd * 20 * u, y - 10 * u, 9 * u, 0, TAU); g.fill(); g.fillStyle = '#d8902a'; g.beginPath(); g.moveTo(x + sd * 28 * u, y - 11 * u); g.lineTo(x + sd * 40 * u, y - 8 * u); g.lineTo(x + sd * 28 * u, y - 6 * u); g.fill(); g.fillStyle = '#a8201e'; g.beginPath(); g.moveTo(x - sd * 20 * u, y); g.lineTo(x - sd * 44 * u, y - 10 * u); g.lineTo(x - sd * 40 * u, y + 8 * u); g.fill(); });
      g.fillStyle = '#a8201e'; g.strokeStyle = '#5a2a14'; g.lineWidth = 4 * u; g.beginPath(); g.moveTo(cx - 60 * u, H * 0.8); g.quadraticCurveTo(cx - 90 * u, H * 0.88, cx - 40 * u, H * 0.92); g.lineTo(cx + 40 * u, H * 0.92); g.quadraticCurveTo(cx + 90 * u, H * 0.88, cx + 60 * u, H * 0.8); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#d8902a'; g.fillRect(cx - 50 * u, H * 0.835, 100 * u, 8 * u);
    } else {
      // a sun and a moon in the colours of a Mata ni Pachedi: maroon and black on white, rows of small figures-free motifs
      border('#f4ecdc', '#3a0a0e', '#3a0a0e');
      const cx = W / 2; g.fillStyle = '#7a1414';
      g.beginPath(); g.arc(cx, H * 0.3, 120 * u, 0, TAU); g.fill();
      for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * 128 * u, H * 0.3 + Math.sin(a) * 128 * u); g.lineTo(cx + Math.cos(a + 0.08) * 168 * u, H * 0.3 + Math.sin(a + 0.08) * 168 * u); g.lineTo(cx + Math.cos(a + 0.16) * 128 * u, H * 0.3 + Math.sin(a + 0.16) * 128 * u); g.fill(); }
      g.fillStyle = '#f4ecdc'; g.beginPath(); g.arc(cx, H * 0.3, 92 * u, 0, TAU); g.fill(); g.fillStyle = '#1a0a0a'; for (let r0 = 0; r0 < 3; r0++) for (let k = 0; k < 12 + r0 * 6; k++) { const a = k / (12 + r0 * 6) * TAU; g.beginPath(); g.arc(cx + Math.cos(a) * (30 + r0 * 22) * u, H * 0.3 + Math.sin(a) * (30 + r0 * 22) * u, 4 * u, 0, TAU); g.fill(); }
      g.fillStyle = '#1a0a0a'; g.beginPath(); g.arc(cx, H * 0.68, 90 * u, 0, TAU); g.fill(); g.fillStyle = '#f4ecdc'; g.beginPath(); g.arc(cx + 34 * u, H * 0.66, 82 * u, 0, TAU); g.fill();
      for (let y = H * 0.84; y < H * 0.92; y += 26 * u) for (let x = 70 * u; x < W - 60 * u; x += 34 * u) { g.fillStyle = '#7a1414'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12 * u, y + 18 * u); g.lineTo(x - 12 * u, y + 18 * u); g.closePath(); g.fill(); }
    }
    // age: a fine grain and a soft darkening at the edges, as paint on cloth
    for (let k = 0; k < 1400 * u * u; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; g.fillRect(rnd() * W, rnd() * H, 2 * u, 2 * u); }
    const vg = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, H * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,20,10,.35)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  });
}
// The owner's artwork, when it's there: loaded panel by panel onto the materials
function loadArt(mats) {
  if (typeof fetch !== 'function') return;
  fetch('venue-art/chitra/panels.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((list) => {
    const files = list && Array.isArray(list.panels) ? list.panels : [];
    const loader = new THREE.TextureLoader();
    files.slice(0, mats.length).forEach((f, i) => loader.load('venue-art/chitra/' + f, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mats[i].map = t; mats[i].emissiveMap = t; mats[i].needsUpdate = true; }));
  }).catch(() => {});
}

// A broad leaf for the beds of plants round the courtyard (elephant ears, banana): deep green, lighter at the edge the
// lamps catch, a pale midrib and veins
function broadLeaf() {
  return canvasTexture(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const shape = () => { g.beginPath(); g.moveTo(w / 2, h); g.bezierCurveTo(w * 0.0, h * 0.72, w * 0.04, h * 0.18, w / 2, 0); g.bezierCurveTo(w * 0.96, h * 0.18, w * 1.0, h * 0.72, w / 2, h); g.closePath(); };
    shape(); const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#16341a'); gr.addColorStop(0.55, '#2c5a26'); gr.addColorStop(1, '#4a7a30'); g.fillStyle = gr; g.fill();
    g.save(); shape(); g.clip();
    g.strokeStyle = 'rgba(190,220,150,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, h * 0.04); g.stroke();
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(170,210,130,.35)';
    for (let i = 1; i < 12; i++) { const y = h * (1 - i / 12.5); [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + sd * w * 0.25, y - h * 0.03, w / 2 + sd * w * 0.48, y - h * 0.08); g.stroke(); }); }
    g.restore();
  });
}

// The painted band along the wall's inner face: a maroon ground between ochre rules, block-printed rosettes and buds in
// cream and indigo, a row of dots above and below (the courtyard's own pattern, no figures)
function wallBand() {
  return canvasTexture(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#7a2418'; g.fillRect(0, 8, w, h - 16);
    g.fillStyle = '#d8a040'; g.fillRect(0, 6, w, 4); g.fillRect(0, h - 10, w, 4);
    g.fillStyle = '#f3e6d0'; for (let x = 6; x < w; x += 12) { g.beginPath(); g.arc(x, 3, 2, 0, TAU); g.fill(); g.beginPath(); g.arc(x, h - 3, 2, 0, TAU); g.fill(); }
    for (let x = 32; x < w; x += 64) {
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.fillStyle = k % 2 ? '#f3e6d0' : '#e8b04b'; g.beginPath(); g.ellipse(x + Math.cos(a) * 9, h / 2 + Math.sin(a) * 9, 7, 3.5, a, 0, TAU); g.fill(); }
      g.fillStyle = '#1e3a6a'; g.beginPath(); g.arc(x, h / 2, 5, 0, TAU); g.fill();
      g.fillStyle = '#e8b04b'; g.beginPath(); g.moveTo(x + 32, h / 2 - 9); g.quadraticCurveTo(x + 40, h / 2, x + 32, h / 2 + 9); g.quadraticCurveTo(x + 24, h / 2, x + 32, h / 2 - 9); g.fill();
    }
  });
}
// An arched niche in the wall: the recess dark, its arch outlined in ochre, a little soot over where the diya stands
function nicheTexture() {
  return canvasTexture(64, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const arch = () => { g.beginPath(); g.moveTo(8, h - 4); g.lineTo(8, 34); g.quadraticCurveTo(8, 6, w / 2, 4); g.quadraticCurveTo(w - 8, 6, w - 8, 34); g.lineTo(w - 8, h - 4); g.closePath(); };
    arch(); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1a10'); gr.addColorStop(0.7, '#5a3418'); gr.addColorStop(1, '#8a5a2a'); g.fillStyle = gr; g.fill();
    g.strokeStyle = '#c8902a'; g.lineWidth = 3; arch(); g.stroke();
  });
}

/* ---------- the venue ---------- */
function chitra(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data && data.spec, CA = sp.plan, S = sp.stage, D = newDecor(kit, root), woods = newWoods();
  const sl = soil(phone ? 512 : 1024), decalRect = { cx: 0, cz: 0, w: 36, d: 36 }, beds = new Shape();
  // A bed of broad-leaved plants: leaves rising from the ground and arching out, all round
  const bed = (x, z, size, n = 7) => {
    const a0 = r() * TAU;
    for (let i = 0; i < n; i++) {
      const az = a0 + i / n * TAU + (r() - 0.5) * 0.6, L = size * (0.75 + r() * 0.5), W = L * 0.55, e = 0.75 + r() * 0.6, hor = [Math.cos(az), Math.sin(az)], sv = [Math.cos(az + Math.PI / 2), Math.sin(az + Math.PI / 2)];
      const mid = [x + hor[0] * Math.cos(e) * L * 0.5, Math.sin(e) * L * 0.55, z + hor[1] * Math.cos(e) * L * 0.5], tip = [x + hor[0] * L * 0.9, Math.sin(e) * L * 0.6, z + hor[1] * L * 0.9];
      const b0 = [x - sv[0] * 0.03, 0.03, z - sv[1] * 0.03], b1 = [x + sv[0] * 0.03, 0.03, z + sv[1] * 0.03], m0 = [mid[0] - sv[0] * W / 2, mid[1], mid[2] - sv[1] * W / 2], m1 = [mid[0] + sv[0] * W / 2, mid[1], mid[2] + sv[1] * W / 2];
      beds.tri(b0, b1, m1, [0.45, 0], [0.55, 0], [1, 0.5]); beds.tri(b0, m1, m0, [0.45, 0], [1, 0.5], [0, 0.5]); beds.tri(m0, m1, tip, [0, 0.5], [1, 0.5], [0.5, 1]);
    }
  };
  const floorMesh = ground(root, { map: sl.map, normalMap: sl.normal, normalScale: 0.4, roughness: 0.9, decal: floorDecal(decalRect, phone ? 1024 : 2048, CA), decalRect }, 90, 90, 4, tier.shadows);
  // the curb round the floor, a hand's height of stone
  const curb = new THREE.Mesh(new THREE.TorusGeometry(CA.floor + 0.12, 0.13, 4, 96), std('#b8a486', 0.85)); curb.rotation.x = Math.PI / 2; curb.scale.z = 0.5; curb.position.y = 0.04; root.add(curb);

  /* the wall of panels, each lit from below, marigolds and plants at its foot */
  const n = CA.panels, frame = std('#2a1a10', 0.7), artMats = [];
  for (let i = 0; i < n; i++) {
    const deg = CA.wallFrom + (i + 0.5) * (CA.wallTo - CA.wallFrom) / n, a = deg * Math.PI / 180, x = Math.cos(a) * CA.wall, z = Math.sin(a) * CA.wall, ry = Math.atan2(-Math.cos(a), -Math.sin(a));
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    // (tall, as the references' panels are: 4 m of painting on a 4.3 m board)
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.88, 4.3, 0.12), frame); back.position.set(0, 2.41, -0.07); g.add(back);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.26, 0.5), std('#cbbd9e', 0.9)); plinth.position.set(0, 0.13, 0.05); g.add(plinth);
    const artMat = kit.selfLit(new THREE.MeshStandardMaterial({ map: folkPanel(i, phone ? 256 : 512), roughness: 0.85 }), 0.16, 'architectural'); artMats.push(artMat);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 3.96), artMat);
    art.position.set(0, 2.41, 0.001); art.scale.x = -1; art.rotation.y = 0; g.add(art);
    // (the plane faces +z in its group, towards the floor; mirrored so it reads the right way round)
    const ux = Math.sin(ry), uz = Math.cos(ry);
    kit.bigBulbs.add(x + ux * 0.45, 0.32, z + uz * 0.45, 0, { color: LIGHT.amber, k: 0.8, s: 0.35, twinkle: 0, layer: 'architectural' });
    kit.pools.add(x + ux * 0.08, 2.1, z + uz * 0.08, 1.0, 2.3, LIGHT.amber, 0.24, { vertical: true, ry: ry + Math.PI, layer: 'architectural' });
    kit.pools.add(x + ux * 0.8, 0.02, z + uz * 0.8, 1.2, 0.9, LIGHT.amber, 0.12, { layer: 'architectural' });
    for (let k = 0; k < 18; k++) { const t = (k / 17 - 0.5) * 1.7; kit.bulbs.add(x + Math.cos(ry) * t + ux * 0.32, 0.32 + Math.abs(Math.sin(k)) * 0.08, z - Math.sin(ry) * t + uz * 0.32, 0, { color: k % 3 ? '#f08a24' : '#f6c342', k: 0.18, s: 0.9, twinkle: 0, layer: 'architectural' }); }
    if (i % 3 === 1) D.palm(x + ux * 0.9 + Math.cos(ry) * 1.0, z + uz * 0.9 - Math.sin(ry) * 1.0, 0.8);
    else bed(x + ux * 0.75 + Math.cos(ry) * 0.95, z + uz * 0.75 - Math.sin(ry) * 0.95, 0.9 + r() * 0.3, 6);
  }

  loadArt(artMats);

  /* the great trees, and the lights hanging from them over the floor */
  const tips = [];
  [[-15.5, 5, 7.2, 15, -0.25], [14.5, 17.5, 7.8, 16, -2.3], [-12.5, -14.5, 6.6, 12, 0.95], [16.5, -10, 6.4, 11, 2.4], [-3, 24, 7, 12, -1.6]].forEach(([x, z, h, spread, dir], i) => {
    woods.tree(r, x, z, h, spread, dir, { trunk: 0.7 + i * 0.03, branches: phone ? 6 : 9, leaves: phone ? 5 : 8, rise: 1.8 }).forEach((p) => tips.push(p));
  });
  // strings hang from the branches over the floor, the gravel and the seats (the references' curtain of lights)
  const strands = tips.filter((p) => Math.hypot(p[0], p[2]) < CA.floor + 6 && p[1] > 5.4);
  let nS = 0;
  strands.forEach((p, i) => {
    if (nS > (phone ? 60 : 170) || (i % 2 && phone)) return;
    nS++;
    const L = Math.min(p[1] - 3.2, 1.6 + r() * 3.8), x = p[0] + (r() - 0.5) * 1.2, z = p[2] + (r() - 0.5) * 1.2;
    kit.wires.line([x, p[1], z], [x, p[1] - L, z]);
    for (let y = p[1] - 0.2; y > p[1] - L; y -= 0.24) kit.bulbs.add(x, y, z, 0, { color: '#ffd08a', k: 0.7, s: 0.55, twinkle: 0.35, layer: 'festive' });
    kit.bigBulbs.add(x, p[1] - L - 0.12, z, 0, { color: '#ffc47a', k: 1.0, s: 0.7, twinkle: 0.12, layer: 'festive' });
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 6, 1, true), std('#3a2a1a', 0.5, 0.6, { side: THREE.DoubleSide, wireframe: true })); cage.position.set(x, p[1] - L - 0.12, z); root.add(cage);
  });
  // and strings along the branches themselves
  tips.forEach((p, i) => { if (i % 2) kit.bulbs.add(p[0], p[1] - 0.15, p[2], 0, { color: '#ffd8a0', k: 0.6, s: 0.55, twinkle: 0.4, layer: 'festive' }); });
  const leafMat = kit.selfLit(new THREE.MeshStandardMaterial({ map: leafTexture(['#24461e', '#365a26', '#4c7430', '#1c3a1c', '#5a7e34'], 11), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }), 0.2, 'festive');
  woods.build(root, new THREE.MeshStandardMaterial({ map: barkTexture(5, ['#3a2e24', '#5e4a3a']), roughness: 0.92 }), leafMat, ['#c8d8a8', '#ffe8b0']);
  kit.pools.add(0, 0.02, 0, 15, 15, '#ffd08a', 0.055, { layer: 'festive' });

  /* the musicians' platform: teak boards on a low frame, a durrie, speakers on stands either side, a palm and lanterns */
  const st = new THREE.Group(); root.add(st);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0, S.h, S.depth), std('#6a4424', 0.6, 0.05)); deck.position.set((S.x0 + S.x1) / 2, S.h / 2, S.z + S.depth / 2); st.add(deck);
  D.rug((S.x0 + S.x1) / 2, S.z + 1.5, S.x1 - S.x0 - 0.5, 2.2, 0, rugTexture('stripe', ['#7a1424', '#1e5a6a', '#d6a64a', '#f3e6d0']), S.h + 0.006);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#ffc890' });
  [S.x0 - 0.8, S.x1 + 0.8].forEach((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 6), std('#1a1a1c', 0.5, 0.6)); pole.position.set(x, 0.85, S.z + 0.4); st.add(pole);
    const spk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.36), std('#0e0e10', 0.6)); spk.position.set(x, 1.95, S.z + 0.4); st.add(spk);
    D.lantern(x, 0, S.z - 0.5);
  });
  kit.pools.add((S.x0 + S.x1) / 2, 0.02, S.z - 1.6, 4, 2.4, LIGHT.warm, 0.12, { layer: 'show' });
  D.palm(S.x0 - 1.8, S.z + 1.6, 1.1); D.palm(S.x1 + 2.0, S.z + 2.2, 1.0);
  bed(S.x0 - 1.2, S.z - 0.3, 1.1, 8); bed(S.x1 + 1.3, S.z - 0.1, 1.0, 8); bed(S.x0 - 2.6, S.z + 0.6, 1.3, 9);

  /* the seats round the gravel, rugs and tables by them, lanterns on the gravel */
  (CA.seats || []).forEach((sf, i) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, sf.kind === 'bench' ? { wood: '#6a4424', seat: '#7a1424', cushions: ['#a0175a', '#c2641a', '#d6a64a'] } : { wood: '#6a4424', seat: '#efe4d0', cushions: ['#b8312b', '#c2185b', '#d6a64a'] });
    const fx = Math.sin(sf.ry), fz = Math.cos(sf.ry), tx = Math.cos(sf.ry), tz = -Math.sin(sf.ry);
    if (!sf.near && r() < 0.7) bed(sf.x - fx * 1.25 + tx * (r() - 0.5) * sf.len, sf.z - fz * 1.25 + tz * (r() - 0.5) * sf.len, 1.0 + r() * 0.4, 7);
    if (!sf.near) { D.rug(sf.x + fx * 0.9, sf.z + fz * 0.9, sf.len + 0.6, 1.4, -sf.ry, rugTexture('persian', ['#8e1b2c', '#1c2a5a', '#d6a64a', '#f3e6d0'])); D.table(sf.x + tx * (sf.len / 2 + 0.5), sf.z + tz * (sf.len / 2 + 0.5), 0.5, 0.5, { candles: 1 }); D.lantern(sf.x + fx * 1.4 - tx * (sf.len / 2), 0, sf.z + fz * 1.4 - tz * (sf.len / 2)); }
  });
  for (let i = 0; i < 22; i++) { const a = (i + 0.5) / 22 * TAU, x = Math.cos(a) * (CA.floor + 0.7), z = Math.sin(a) * (CA.floor + 0.7); if ((x < -1.5 && z > 11) || (sp.dj && Math.hypot(x - sp.dj.x, z - sp.dj.z + 1.2) < 2.6)) continue; D.lantern(x, 0, z, 0.85); }
  // marigold garlands in brass pots by the stepping stones
  [[-0.9, -12.6], [0.9, -12.6]].forEach(([x, z]) => { D.urn(x, z); });

  /* low cream walls round the back of the courtyard, palms and shrubs along them; on their inner face a painted band of
     block-print motifs, an arched niche with a diya in every third length, and along the top a toran of marigolds and
     mango leaves */
  const wallMat = std('#d9ccb2', 0.9), capMat = std('#b8a88c', 0.8), paint = kit.selfLit(new THREE.MeshStandardMaterial({ map: wallBand(), transparent: true, roughness: 0.9 }), 0.06, 'architectural');
  const nicheMat = kit.selfLit(new THREE.MeshStandardMaterial({ map: nicheTexture(), transparent: true, roughness: 0.9 }), 0.1, 'flame'), toran = [], leaves = [];
  for (let a = 1.75; a < 5.55; a += 0.16) {
    const a2 = a + 0.16, p0 = [Math.cos(a) * CA.boundary, Math.sin(a) * CA.boundary], p1 = [Math.cos(a2) * CA.boundary, Math.sin(a2) * CA.boundary], len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (a > 4.55 && a < 4.85) continue; // the way in, behind the near seats
    const w = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 2.5, 0.3), wallMat); w.position.set((p0[0] + p1[0]) / 2, 1.25, (p0[1] + p1[1]) / 2); w.rotation.y = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]) + Math.PI / 2; root.add(w);
    const c = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.1, 0.42), capMat); c.position.set(w.position.x, 2.55, w.position.z); c.rotation.y = w.rotation.y; root.add(c);
    // the inner face (towards the courtyard): the painted band, a niche in every third length, the toran over it all
    const am = a + 0.08, ix = -Math.cos(am), iz = -Math.sin(am), mx0 = w.position.x + ix * 0.16, mz0 = w.position.z + iz * 0.16, face = Math.atan2(ix, iz);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.02, 0.62), paint); band.position.set(mx0, 2.02, mz0); band.rotation.y = face; root.add(band);
    if (Math.round(a / 0.16) % 3 === 0) {
      const ni = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.92), nicheMat); ni.position.set(mx0 + ix * 0.005, 1.05, mz0 + iz * 0.005); ni.rotation.y = face; root.add(ni);
      kit.flames.add(mx0 + ix * 0.09, 0.66, mz0 + iz * 0.09, { s: 0.04, k: 0.85 });
    }
    for (let k = 0; k <= 10; k++) { const u = k / 10, sagY = 0.22 * 4 * u * (1 - u), px = p0[0] + (p1[0] - p0[0]) * u + ix * 0.24, pz = p0[1] + (p1[1] - p0[1]) * u + iz * 0.24; toran.push([px, 2.5 - sagY, pz]); if (k % 2) leaves.push([px, 2.38 - sagY, pz, face]); }
    if (r() < 0.45) D.palm(Math.cos(a + 0.08) * (CA.boundary - 1.2), Math.sin(a + 0.08) * (CA.boundary - 1.2), 0.9 + r() * 0.4);
    else bed(Math.cos(a + 0.08) * (CA.boundary - 1.0), Math.sin(a + 0.08) * (CA.boundary - 1.0), 1.1 + r() * 0.5, 8);
    kit.pools.add(Math.cos(a + 0.08) * (CA.boundary - 0.2), 1.3, Math.sin(a + 0.08) * (CA.boundary - 0.2), 1.6, 1.4, LIGHT.amber, 0.09, { vertical: true, ry: -(a + 0.08) + Math.PI / 2, layer: 'architectural' });
    // a lamp on the wall every few lengths
    if (Math.round(a / 0.16) % 3 === 0) kit.bigBulbs.add(Math.cos(a + 0.08) * (CA.boundary - 0.25), 2.1, Math.sin(a + 0.08) * (CA.boundary - 0.25), 0, { color: LIGHT.tungsten, k: 0.8, s: 0.4, twinkle: 0.05, layer: 'architectural' });
  }
  if (toran.length) {
    const tm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), std('#ffffff', 0.85), toran.length), mt = new THREE.Matrix4(), tc = new THREE.Color();
    toran.forEach(([x, y, z], i) => { tm.setMatrixAt(i, mt.makeTranslation(x, y, z)); tm.setColorAt(i, tc.set(i % 3 === 1 ? '#ffd24a' : '#f08a1a')); }); root.add(tm);
    const lg = new THREE.PlaneGeometry(0.09, 0.2); lg.translate(0, -0.1, 0);
    const lm = new THREE.InstancedMesh(lg, std('#3a6a24', 0.7, 0, { side: THREE.DoubleSide }), leaves.length), q = new THREE.Quaternion(), e = new THREE.Euler();
    leaves.forEach(([x, y, z, f], i) => lm.setMatrixAt(i, mt.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, f, 0)), new THREE.Vector3(1, 1, 1)))); root.add(lm);
  }
  /* beyond the walls: the garden's trees go on, a town's lit windows further off, a treeline at the horizon */
  forestBelt(kit, root, { r0: 23, r1: 85, n: phone ? 300 : 650, h: [7, 14], seed: 61, tones: ['#18301c', '#1e3a22', '#24442a', '#142a18'], lights: [0.08, '#ffd8a0'] });
  townBelt(kit, root, { r0: 95, r1: 170, n: phone ? 50 : 110, style: 'old', seed: 63 });
  horizonRidge(root, { radius: 300, base: -4, height: 24, tree: true, seed: 7, cols: ['#06080a', '#10160e'] });
  D.finish();
  root.add(new THREE.Mesh(beds.geometry(), kit.selfLit(new THREE.MeshStandardMaterial({ map: broadLeaf(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }), 0.1, 'festive')));

  const rig = {
    hemi: ['#3a3a48', '#2a1a0c', 0.36, 0.58], moon: 1,
    spots: [{ pos: [-6, 12, -6], to: [0, 0, 3], color: '#ffe0b8', base: 30, distance: 40, angle: 0.6, layer: 'key' }, { pos: [(S.x0 + S.x1) / 2, 5.5, S.z - 4], to: [(S.x0 + S.x1) / 2, S.h + 1.1, S.z + 1.5], color: '#ffe4c4', base: 70, distance: 14, angle: 0.55, layer: 'show' }],
    points: [{ pos: [0, 6.5, 2], color: '#ffd08a', base: 24, distance: 18, layer: 'festive' }, { pos: [6.2, 4.2, 5.8], color: LIGHT.amber, base: 16, distance: 16, layer: 'architectural' }, { pos: [-8, 3.5, -8], color: '#ffd08a', base: 26, distance: 14, layer: 'festive' }, { pos: [0, 2, -13], color: LIGHT.tungsten, base: 18, distance: 10, layer: 'flame' }]
  };
  return { rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#0c0c0a', 0.012), exposure: 0.98 };
}

export default { seed: 606, sky: true, garbo: 'bare', garboK: 5.5, build: chitra };
