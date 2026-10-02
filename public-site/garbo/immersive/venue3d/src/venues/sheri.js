// SHERI: a society lane: house fronts on both sides lit with bulb curtains, otlas to sit out on, chandarvo canopies
// and wires across, street lamps, a mandap for the band and a temple spire beyond.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, sag, face, faceTo, LIGHT, BAND, SPONSORS, boxSolid } from '../util.js';
import { std, strand } from '../kit.js';
import { kandil, speakerPole } from '../props.js';
import { buildBand } from '../band.js';
import { floorFor } from '../floors.js';
import { feedMaterial } from '../drone.js';
import { ground, practicalPools, boardCreative, showCreatives, uplight } from './common.js';

/* ---------- SHERI ---------- */
// A house front, painted: plaster in the house's colour with a plinth, mouldings between the floors and a jali parapet;
// arched windows in painted frames with sills (lit ones glowing through coloured curtains and grilles, the rest dark
// with a little sky in the glass), shutters open on the upper floors; the door carved in two leaves under a toran of
// mango leaves and marigolds, શુભ and લાભ either side of it. A second picture holds only what gives off light (the lit
// windows, their curtains glowing in their colour, and a little of their light on the wall round them).
const WOODS = ['#2f5d4a', '#3a4f7a', '#6b3a1c', '#7a2a2a', '#2c6a6a', '#5a3a6a'], CURTAINS = ['#b8312b', '#2f8f5b', '#d6a24a', '#8e44ad', '#c2185b', '#3b4cc0'];
export function housePlan(h) {
  const W = h.z2 - h.z1, cols = Math.max(2, Math.round(W / 2.2)), out = [];
  for (let f = 0; f < h.floors; f++) for (let c = 0; c < cols; c++) {
    const door = f === 0 && c === Math.floor(cols / 2);
    out.push({ f, c, door, u: W * (c + 0.5) / cols, ww: door ? 0.75 : 0.5, wh: door ? 2.3 : 1.5, yb: door ? 0 : 0.9 + f * 3.1, lit: !door && ((h.lit * 10 + f * 3 + c) % 3) < 1.6, cur: CURTAINS[(f * 7 + c * 3 + h.hue) % CURTAINS.length], open: (f + c + h.hue) % 3 });
  }
  return { W, cols, wins: out };
}
function houseTexture(h, r) {
  const { W, wins } = housePlan(h), pxm = 30, cw = Math.round(W * pxm), chh = Math.round(h.h * pxm), wood = WOODS[h.hue % WOODS.length];
  const X = (m) => m * pxm, Y = (m) => chh - m * pxm;
  const arch = (g, x, yb, hw, wh, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(X(x - hw), Y(yb)); g.lineTo(X(x - hw), Y(yb + wh * 0.7)); g.quadraticCurveTo(X(x), Y(yb + wh * 1.12) - 6, X(x + hw), Y(yb + wh * 0.7)); g.lineTo(X(x + hw), Y(yb)); g.closePath(); g.fill(); };
  const clipArch = (g, x, yb, hw, wh) => { g.beginPath(); g.moveTo(X(x - hw), Y(yb)); g.lineTo(X(x - hw), Y(yb + wh * 0.7)); g.quadraticCurveTo(X(x), Y(yb + wh * 1.12) - 6, X(x + hw), Y(yb + wh * 0.7)); g.lineTo(X(x + hw), Y(yb)); g.closePath(); g.clip(); };
  // The room behind a lit window: warm light, brightest low in the middle, and curtains drawn part way in their colour
  const room = (g, w, glow) => {
    const x = w.u, gr = g.createRadialGradient(X(x), Y(w.yb + w.wh * 0.35), 2, X(x), Y(w.yb + w.wh * 0.5), w.wh * pxm * 0.8);
    gr.addColorStop(0, glow ? '#fff0c8' : '#ffe2a8'); gr.addColorStop(0.55, glow ? '#ffc070' : '#f7b566'); gr.addColorStop(1, glow ? '#d87a30' : '#c9772f');
    g.save(); clipArch(g, x, w.yb, w.ww, w.wh); g.fillStyle = gr; g.fillRect(X(x - w.ww), Y(w.yb + w.wh * 1.2), X(w.ww * 2), w.wh * 1.2 * pxm);
    // curtains: two panels gathered to the sides, and a valance across the top
    const cp = [0.42, 0.3, 0.55][w.open], cc = new THREE.Color(w.cur), dim = glow ? 0.55 : 1;
    g.fillStyle = `rgba(${Math.round(cc.r * 255 * dim)},${Math.round(cc.g * 255 * dim)},${Math.round(cc.b * 255 * dim)},${glow ? 0.9 : 0.92})`;
    [-1, 1].forEach((sd) => { g.beginPath(); const x0 = x + sd * w.ww, x1 = x + sd * w.ww * (1 - cp * 2); g.moveTo(X(x0), Y(w.yb + w.wh * 1.2)); g.lineTo(X(x1), Y(w.yb + w.wh * 1.2)); g.quadraticCurveTo(X(x1 + sd * w.ww * 0.12), Y(w.yb + w.wh * 0.45), X(x1 + sd * w.ww * 0.3), Y(w.yb)); g.lineTo(X(x0), Y(w.yb)); g.closePath(); g.fill(); });
    g.fillRect(X(x - w.ww), Y(w.yb + w.wh * 0.95), X(w.ww * 2), w.wh * 0.14 * pxm);
    g.restore();
  };
  // An open door on a festival night: both leaves swung in against the jambs, and the lit front room beyond (its back
  // wall, a framed picture of Maa, a bulb hanging in the middle and the floor running in); in the glow pass only the
  // room gives off light, the leaves stay dark
  const doorway = (g, w, glow) => {
    const x = w.u, hw = w.ww, wh = w.wh;
    g.save(); clipArch(g, x, 0, hw, wh);
    const gr = g.createRadialGradient(X(x), Y(wh * 0.62), 2, X(x), Y(wh * 0.5), wh * pxm * 0.95);
    gr.addColorStop(0, glow ? '#fff1cf' : '#ffe0a6'); gr.addColorStop(0.5, glow ? '#ffbe6a' : '#f0aa58'); gr.addColorStop(1, glow ? '#c4682a' : '#a85a26');
    g.fillStyle = gr; g.fillRect(X(x - hw), Y(wh * 1.2), X(hw * 2), wh * 1.2 * pxm);
    // the floor running into the room, darker, with the joints of its tiles converging
    const fl = 0.42; g.fillStyle = glow ? 'rgba(150,80,30,.55)' : 'rgba(96,52,24,.85)'; g.fillRect(X(x - hw), Y(fl), X(hw * 2), fl * pxm);
    if (!glow) { g.strokeStyle = 'rgba(40,20,10,.35)'; g.lineWidth = 1; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(X(x + k * hw * 0.12), Y(fl)); g.lineTo(X(x + k * hw * 0.42), Y(0)); g.stroke(); } }
    // the framed picture on the back wall, and the bulb hanging over the room
    if (!glow) { g.fillStyle = '#c9963f'; g.fillRect(X(x - 0.2), Y(1.72), 0.4 * pxm, 0.5 * pxm); g.fillStyle = '#8e1f1a'; g.fillRect(X(x - 0.16), Y(1.68), 0.32 * pxm, 0.42 * pxm); g.fillStyle = 'rgba(255,214,120,.8)'; g.beginPath(); g.arc(X(x), Y(1.47), 0.07 * pxm, 0, TAU); g.fill(); }
    g.fillStyle = glow ? '#fffbe8' : '#fff4d6'; g.beginPath(); g.arc(X(x), Y(wh * 0.9), (glow ? 0.09 : 0.06) * pxm, 0, TAU); g.fill();
    // the leaves, swung in and seen edge-on against each jamb, in the house's wood with their carved panels
    [-1, 1].forEach((sd) => {
      const xo = x + sd * hw, xi = x + sd * hw * 0.62;
      g.fillStyle = glow ? '#000' : wood; g.beginPath(); g.moveTo(X(xo), Y(0)); g.lineTo(X(xi), Y(0.12)); g.lineTo(X(xi), Y(wh * 0.86)); g.lineTo(X(xo), Y(wh * 0.98)); g.closePath(); g.fill();
      if (!glow) { g.strokeStyle = 'rgba(214,166,74,.55)'; g.lineWidth = 1.5; [0.35, 1.0, 1.6].forEach((py) => { g.beginPath(); g.moveTo(X(xo + (xi - xo) * 0.2), Y(py + 0.08)); g.lineTo(X(xo + (xi - xo) * 0.8), Y(py + 0.12)); g.lineTo(X(xo + (xi - xo) * 0.8), Y(py + 0.5)); g.lineTo(X(xo + (xi - xo) * 0.2), Y(py + 0.52)); g.closePath(); g.stroke(); }); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(Math.min(X(xi), X(xi) - sd * 2), Y(wh * 0.86), 2, wh * 0.74 * pxm); }
    });
    g.restore();
  };
  // Grilles on the ground floor; a cross of glazing bars upstairs
  const grille = (g, w, fill) => {
    const x = w.u; g.fillStyle = fill;
    if (w.f === 0) { for (let b = 1; b < 4; b++) g.fillRect(X(x - w.ww + b * w.ww / 2) - 1, Y(w.yb + w.wh * 1.08), 2, w.wh * 1.08 * pxm); g.fillRect(X(x - w.ww), Y(w.yb + w.wh * 0.5), X(w.ww * 2), 2); }
    else { g.fillRect(X(x) - 1, Y(w.yb + w.wh * 1.1), 3, w.wh * 1.1 * pxm); g.fillRect(X(x - w.ww), Y(w.yb + w.wh * 0.62), X(w.ww * 2), 3); }
  };
  const draw = (lightsOnly) => (g) => {
    if (lightsOnly) {
      g.fillStyle = '#000'; g.fillRect(0, 0, cw, chh);
      wins.forEach((w) => {
        if (w.door) {
          const dg = g.createRadialGradient(X(w.u), Y(w.wh * 0.45), 4, X(w.u), Y(w.wh * 0.45), w.wh * pxm * 1.1);
          dg.addColorStop(0, 'rgba(255,170,90,.24)'); dg.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = dg; g.fillRect(0, 0, cw, chh);
          doorway(g, w, true);
          return;
        }
        if (!w.lit) return;
        // a little of the window's light on the plaster round it
        const hg = g.createRadialGradient(X(w.u), Y(w.yb + w.wh * 0.5), 4, X(w.u), Y(w.yb + w.wh * 0.5), w.wh * pxm * 1.05);
        hg.addColorStop(0, 'rgba(255,170,90,.2)'); hg.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = hg; g.fillRect(0, 0, cw, chh);
        room(g, w, true);
        grille(g, w, 'rgba(0,0,0,.85)');
      });
      return;
    }
    // Plaster, weathered, darker towards the ground; a stone plinth
    g.fillStyle = h.col; g.fillRect(0, 0, cw, chh);
    const sh = g.createLinearGradient(0, 0, 0, chh); sh.addColorStop(0, 'rgba(255,235,200,.06)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = sh; g.fillRect(0, 0, cw, chh);
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; g.fillRect(r() * cw, r() * chh * 0.3, 2 + r() * 4, chh * (0.2 + r() * 0.6)); }
    g.fillStyle = 'rgba(0,0,0,.16)'; for (let i = 0; i < 500; i++) g.fillRect(r() * cw, r() * chh, 2, 2);
    g.fillStyle = 'rgba(40,30,28,.55)'; g.fillRect(0, Y(0.5), cw, 0.5 * pxm);
    // Pilasters at the corners, mouldings between floors, the jali parapet
    g.fillStyle = 'rgba(255,236,200,.1)'; g.fillRect(0, 0, 0.35 * pxm, chh); g.fillRect(cw - 0.35 * pxm, 0, 0.35 * pxm, chh);
    for (let f = 1; f < h.floors; f++) { const y = Y(f * 3.1 + 0.55); g.fillStyle = 'rgba(214,176,111,.55)'; g.fillRect(0, y - 5, cw, 5); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, y, cw, 4); }
    g.fillStyle = 'rgba(214,176,111,.35)'; g.fillRect(0, 0, cw, 0.62 * pxm);
    g.fillStyle = 'rgba(0,0,0,.45)'; for (let x = 6; x < cw - 6; x += 14) { g.beginPath(); g.moveTo(x, 0.52 * pxm); g.lineTo(x, 0.26 * pxm); g.quadraticCurveTo(x + 4, 0.1 * pxm, x + 8, 0.26 * pxm); g.lineTo(x + 8, 0.52 * pxm); g.closePath(); g.fill(); }
    wins.forEach((w) => {
      const x = w.u;
      if (w.door) {
        arch(g, x, 0, w.ww + 0.16, w.wh + 0.08, '#c9963f'); arch(g, x, 0, w.ww + 0.1, w.wh + 0.04, wood);
        doorway(g, w, false);
        // The toran: mango leaves and marigolds across the top of the door
        const ty = Y(w.wh * 1.12 + 0.12), tx0 = X(x - w.ww - 0.3), tx1 = X(x + w.ww + 0.3);
        g.strokeStyle = '#6b4a22'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tx0, ty); g.lineTo(tx1, ty); g.stroke();
        for (let k = 0, n = Math.round((tx1 - tx0) / 7); k <= n; k++) { const lx = tx0 + (tx1 - tx0) * k / n; if (k % 2) { g.fillStyle = '#2f7a3a'; g.beginPath(); g.moveTo(lx - 3, ty); g.lineTo(lx + 3, ty); g.lineTo(lx, ty + 11); g.closePath(); g.fill(); } else { g.fillStyle = k % 4 ? '#f6c342' : '#f08a24'; g.beginPath(); g.arc(lx, ty + 3, 3.2, 0, TAU); g.fill(); } }
        // શુભ and લાભ either side of it, in kumkum red, and a swastik above
        g.fillStyle = '#c0392b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(0.34 * pxm)}px "Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, "Anek Gujarati", system-ui, sans-serif`;
        g.fillText('શુભ', X(x - w.ww - 0.55), Y(1.55)); g.fillText('લાભ', X(x + w.ww + 0.55), Y(1.55));
        return;
      }
      // The frame and sill; the glass (a lit room, or dark with a little sky in it); grilles on the ground floor
      arch(g, x, w.yb - 0.02, w.ww + 0.09, w.wh + 0.07, wood);
      g.fillStyle = 'rgba(230,200,150,.65)'; g.fillRect(X(x - w.ww - 0.18), Y(w.yb), X(w.ww * 2 + 0.36), 0.1 * pxm);
      if (w.lit) room(g, w, false);
      else { const gl = g.createLinearGradient(0, Y(w.yb + w.wh * 1.1), 0, Y(w.yb)); gl.addColorStop(0, '#2a2640'); gl.addColorStop(1, '#0e0b18'); arch(g, x, w.yb, w.ww, w.wh, gl); g.fillStyle = 'rgba(160,170,220,.12)'; g.beginPath(); g.moveTo(X(x - w.ww * 0.6), Y(w.yb + w.wh * 0.2)); g.lineTo(X(x - w.ww * 0.2), Y(w.yb + w.wh * 0.9)); g.lineTo(X(x), Y(w.yb + w.wh * 0.9)); g.lineTo(X(x - w.ww * 0.4), Y(w.yb + w.wh * 0.2)); g.closePath(); g.fill(); }
      grille(g, w, 'rgba(20,12,8,.85)');
      if (w.f > 0) { g.fillStyle = wood; g.fillRect(X(x - w.ww - 0.36), Y(w.yb + w.wh * 0.72), 0.3 * pxm, w.wh * 0.72 * pxm); g.fillRect(X(x + w.ww + 0.06), Y(w.yb + w.wh * 0.72), 0.3 * pxm, w.wh * 0.72 * pxm); g.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 1; k < 6; k++) { g.fillRect(X(x - w.ww - 0.36), Y(w.yb + w.wh * 0.72 * k / 6), 0.3 * pxm, 1.5); g.fillRect(X(x + w.ww + 0.06), Y(w.yb + w.wh * 0.72 * k / 6), 0.3 * pxm, 1.5); } }
    });
    if (h.balcony) { g.fillStyle = 'rgba(120,80,50,.7)'; g.fillRect(0.6 * pxm, Y(0.9 + 3.1 + 0.7), cw - 1.2 * pxm, 0.9 * pxm); }
    if (h.hue === 3 && W > 5.5) {
      g.fillStyle = '#b8312b'; const zm = W / 2 + 1.4; g.fillRect(X(zm - 1.3), Y(3.15), 2.6 * pxm, 0.6 * pxm);
      g.fillStyle = '#ffe9b8'; g.font = `700 ${Math.round(0.42 * pxm)}px "Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, "Anek Gujarati", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText('કરિયાણા', X(zm), Y(2.7));
    }
  };
  const map = canvasTexture(cw, chh, draw(false)), em = canvasTexture(cw, chh, draw(true));
  return { map, em };
}
function sheri(kit, root, tier, TH, r, data) {
  const floorMesh = ground(root, floorFor('sheri', TH, data && data.circles, tier), 14.4, 124, 16, tier.shadows);
  practicalPools(kit, [[4.4, 60.6, 2.2, '#9fb8ff', 0.2, 'show']]);
  // Kerbs and the gutter either side of the lane
  [-1, 1].forEach((sd) => { const k = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 124), std('#3a3040', 0.9)); k.position.set(sd * 7.3, 0.225, 16); root.add(k); });
  // House fronts on both sides, with bulb curtains and a string along the parapet
  const houses = [], cols = ['#3a4468', '#5e4526', '#5c3040', '#28524f', '#5b5241', '#4a3a5e'];
  const facades = [];
  [-1, 1].forEach((side) => { for (let z = -48; z < 70;) { const w = 5 + r() * 3.5, h = 6.8 + r() * 4.5; houses.push({ side, z1: z, z2: z + w, h, col: cols[Math.floor(r() * cols.length)], floors: h > 9.5 ? 3 : 2, lit: r(), balcony: r() < 0.5, bulbs: r() < 0.6, hue: Math.floor(r() * 6) }); z += w + 0.15; } });
  const right = houses.find((h) => h.side > 0 && h.z1 <= 1.5 && h.z2 >= 1.5); if (right) right.col = '#7a4f9e';
  houses.forEach((h) => {
    const W = h.z2 - h.z1, X = h.side * 8, zc = (h.z1 + h.z2) / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, h.h, W), std(h.col, 0.95)); body.position.set(X + h.side * 3, h.h / 2, zc); root.add(body);
    const tx = houseTexture(h, r);
    const facadeMat = new THREE.MeshStandardMaterial({ map: tx.map, emissiveMap: tx.em, emissive: '#ffffff', emissiveIntensity: 1.2, roughness: 0.9 });
    facades.push(facadeMat);
    const front = faceTo(new THREE.Mesh(new THREE.PlaneGeometry(W, h.h), facadeMat), -h.side * Math.PI / 2);
    front.position.set(X - h.side * 0.01, h.h / 2, zc); root.add(front);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, W), std('#d6b06f', 0.8)); cornice.position.set(X - h.side * 0.1, h.h - 0.15, zc); root.add(cornice);
    if (h.balcony) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, W - 1.2), std('#5a3a22', 0.8)); b.position.set(X - h.side * 0.35, 3.8, zc); root.add(b); const rl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, W - 1.2), std('#78503a', 0.7, 0.2)); rl.position.set(X - h.side * 0.7, 4.2, zc); root.add(rl); }
    // Curtain lights down most house fronts (above the doors and the lamps by them), and a string along every parapet
    if (h.bulbs) kit.curtains.add(X - h.side * 0.12, h.z1 + 0.35, X - h.side * 0.12, h.z2 - 0.35, 2.95, h.h - 0.45, -h.side, 0, h.hue);
    for (let q = h.z1 + 0.25; q < h.z2; q += 0.45) kit.bulbs.add(X - h.side * 0.12, h.h - 0.1, q, h.hue + Math.round(q * 2), { ph: q, s: 0.8 });
    // A water tank on some roofs, an antenna on others
    if (h.hue % 2 === 0) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12), std('#1f1d24', 0.8)); tk.position.set(X + h.side * 1.4, h.h + 0.6, zc); root.add(tk); }
    doorstep(kit, root, h, r);
  });
  // The house at the end of the lane: the society's haveli, with its shrine, and the projector screen tied up over it
  facades.push(haveli(kit, root, r));
  const shrine = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1), std('#7a1a14', 0.7)); shrine.position.set(0, 1.6, 71.6); root.add(shrine);
  const archM = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 6, 20, Math.PI), std('#e8b04b', 0.35, 0.7)); archM.position.set(0, 2.2, 71.05); root.add(archM);
  // Its diyas, burning on the step, and their light on the shrine's face
  for (let d = 0; d < 5; d++) kit.flames.add((d - 2) * 0.45, 0.02, 70.9, { s: 0.05, k: 0.8 });
  kit.pools.add(0, 1.6, 71.05, 1.8, 1.8, LIGHT.flame, 0.35, { vertical: true, layer: 'flame' });
  // The society's projector screen tied up over the shrine: its frame here, its picture drawn live over it
  const scrFrame = new THREE.Mesh(new THREE.BoxGeometry(6.9, 3.1, 0.1), std('#14100c', 0.7)); scrFrame.position.set(0, 7.4, 71.85); root.add(scrFrame);
  const feedScreen = face(new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.9), feedMaterial(1.2))); feedScreen.position.set(0, 7.4, 71.7); feedScreen.visible = false; feedScreen.userData.dynamic = true; root.add(feedScreen);
  // A temple spire behind the end of the lane, outlined in bulbs, a flag at the top
  const spire = new THREE.Mesh(new THREE.LatheGeometry([[3.2, 0], [3.0, 3], [2.2, 6], [1.2, 8.5], [0.2, 10]].map(([a, b]) => new THREE.Vector2(a, b)), 12), std('#231a2c', 0.9));
  spire.position.set(0, 12, 80); root.add(spire);
  for (let tb = 0; tb <= 20; tb++) { const u = tb / 20, a = u * Math.PI, x = -3.2 * Math.cos(a), yy = 12 + Math.sin(a) * 10 * Math.pow(Math.sin(a), 0.4); kit.bulbs.add(x * (1 - 0.7 * Math.sin(a) * 0.9), yy, 77.2, tb, { ph: tb }); }
  // Architecture: the spire washed from below, and the end house's front
  kit.pools.add(0, 15, 76.8, 4.2, 6, LIGHT.amber, 0.16, { vertical: true, layer: 'architectural' });
  kit.pools.add(0, 3.5, 71.95, 7, 3.5, LIGHT.amber, 0.08, { vertical: true, layer: 'architectural' });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), std('#d8453a', 0.8, 0, { side: THREE.DoubleSide })); flag.position.set(0.6, 23.2, 80); flag.userData.dynamic = true; root.add(flag);
  // Street lamps on brackets, each throwing a pool of warm light
  for (let lz = 62; lz >= -20; lz -= 14) [-1, 1].forEach((sd, k) => {
    const z0 = lz + k * 7, arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), std('#1b1510', 0.8)); arm.position.set(sd * 7.3, 5.2, z0); root.add(arm);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.14, 10), std('#1b1510', 0.6, 0.4)); hood.position.set(sd * 6.6, 5.16, z0); root.add(hood);
    kit.bigBulbs.add(sd * 6.6, 5.05, z0, 0, { color: LIGHT.sodium, k: 0.62, s: 0.6, layer: 'practical', twinkle: 0.03 });
    kit.pools.add(sd * 5.8, 0.02, z0, 4.4, 4.4, LIGHT.sodium, 0.15);
    kit.pools.add(sd * 7.9, 3.4, z0, 2.4, 2.4, LIGHT.sodium, 0.09, { vertical: true, ry: sd * Math.PI / 2 });
  });
  // Boards on the house fronts carrying the sponsors' creatives, changing turn by turn (see update), each lit by a little
  // lamp over it
  const boards = [];
  [[-1, 3.5, 8.5, 2], [1, 5, 10, 3], [-1, 34, 38.5, 4], [1, 36, 40.5, 0]].forEach(([sd, z0, z1, k]) => {
    const w = z1 - z0, h = w / 2.34, b = faceTo(new THREE.Mesh(new THREE.PlaneGeometry(w, h), kit.selfLit(new THREE.MeshStandardMaterial({ map: boardCreative(SPONSORS[k]), roughness: 0.8 }), 0.35)), -sd * Math.PI / 2);
    b.position.set(sd * 7.94, 3.1, (z0 + z1) / 2); b.userData.dynamic = true; root.add(b); boards.push(b);
    kit.bigBulbs.add(sd * 7.6, 3.1 + h / 2 + 0.15, (z0 + z1) / 2, 0, { color: LIGHT.warm, k: 0.8, s: 0.4, twinkle: 0, layer: 'practical' });
    kit.pools.add(sd * 7.9, 3.1, (z0 + z1) / 2, w * 0.55, h * 0.7, LIGHT.warm, 0.1, { vertical: true, ry: sd * Math.PI / 2, layer: 'practical' });
  });
  // Otlas: the raised platforms in front of the houses, where people sit out
  [-1, 1].forEach((sd) => { const o = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 124), std('#4a3a34', 0.9)); o.position.set(sd * 7.4, 0.225, 16); root.add(o); });
  // The musicians' takht under a small mandap by the shrine, speakers either side
  const takht = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.6, 2.1), std('#6b3f1f', 0.8)); takht.position.set(0, 0.3, 64.95); root.add(takht);
  const durrie = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 64, (g, w, h) => { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#c2721e' : '#7e1827'; g.fillRect(0, i / 7 * h, w, h / 7 + 1); } }), roughness: 1 }));
  durrie.rotation.x = -Math.PI / 2; durrie.position.set(0, 0.605, 64.95); root.add(durrie);
  [-4.6, 4.6].forEach((x) => speakerPole(root, x, 64, 1.8));
  // The band's gear on the takht: the tabla on its gaddi, the keyboard on its stand, a small guitar amp
  const bandHoles = buildBand(kit, root, BAND.sheri, { x0: -3.2, x1: 3.2, front: 63.9, floor: 0.6, small: true });
  const mandapHoles = sheriMandap(kit, root, TH);
  // Chandarvo canopies of printed cloth across the lane, wires, strings of bulbs and bunting, and lanterns
  [12, 21, 34].forEach((z, ci) => {
    const pos = [], colr = [], cc = new THREE.Color(), colsC = [TH.flags[ci % TH.flags.length], '#f6c342', '#2f8f5b', '#b8312b'];
    for (let k = 0; k < 10; k++) {
      const a = sag([-8, 7.6, z], [8, 7.6, z], 0.9, k / 10), b = sag([-8, 7.6, z], [8, 7.6, z], 0.9, (k + 1) / 10);
      const q = [[a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1] - 0.2, b[2] + 1.6], [a[0], a[1] - 0.2, a[2] + 1.6]];
      cc.set(colsC[k % colsC.length]);
      [q[0], q[1], q[2], q[0], q[2], q[3]].forEach((p) => { pos.push(p[0], p[1], p[2]); colr.push(cc.r, cc.g, cc.b); });
      kit.flags.add((a[0] + b[0]) / 2, a[1] - 0.05, a[2], Math.PI / 2 + Math.PI / 2, 0.22, k + 1);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); geo.computeVertexNormals();
    root.add(new THREE.Mesh(geo, std('#ffffff', 0.9, 0, { vertexColors: true, side: THREE.DoubleSide, emissive: '#1a0c06' })));
  });
  [[-8, 9, 6, 8, 8.5, 20], [-8, 8.2, 26, 8, 9, 14], [-8, 9.2, 40, 8, 8, 48], [-8, 8.6, 2, 8, 8.8, -4], [-7.8, 9.4, -6, -7.8, 9.4, 60], [7.8, 9, -6, 7.8, 9, 60]].forEach((w) => kit.wires.cable([w[0], w[1], w[2]], [w[3], w[4], w[5]], 0.6));
  const lc = ['#ff9f5a', '#ff6fa3', '#7fe0a0', '#ffd58a', '#8fc7ff'];
  [60, 50, 41, 32, 24, 16, 8, 0, -8].forEach((z, i) => {
    if (i % 3 === 0) { strand(kit, [-8, 6.8, z], [8, 6.8, z + 2], 1.1, 'bulbs', i, { gap: 0.55 }); strand(kit, [-8, 6.8, z + 2], [8, 6.8, z], 1.1, 'bulbs', i + 3, { gap: 0.55, pools: false }); }
    else strand(kit, [-8, 6.4, z], [8, 6.4, z], 1.3, i % 3 === 1 ? 'flags' : 'bulbs', i, { gap: 0.55 });
    // Star lanterns, one side of the lane then the other
    kandil(kit, root, i % 2 ? -2.6 : 2.6, 5.15 + (i % 3) * 0.25, z + 0.8, lc[i % lc.length], i % 3 === 0 ? 6.3 : 6.1);
  });
  // Over the mandap, a canopy of lights: strings from a star at the middle out to the parapets on both sides and the
  // haveli's roof, the way a society dresses the end of its lane for the nine nights
  const hub = [0, 10.4, 58.5];
  [50, 54, 58, 62, 66, 70].forEach((z, k) => [-1, 1].forEach((sd) => strand(kit, hub, [sd * 7.9, 7.3 + (k % 2) * 0.4, z], 0.5, 'bulbs', k * 2 + (sd > 0 ? 1 : 0), { gap: 0.42, pools: false, s: 0.85 })));
  [-5.5, -1.8, 1.8, 5.5].forEach((x, k) => strand(kit, hub, [x, 11.8, 71.9], 0.4, 'bulbs', 20 + k, { gap: 0.42, pools: false, s: 0.85 }));
  kandil(kit, root, hub[0], hub[1] - 0.9, hub[2], '#ff6fa3', hub[1]);
  kandil(kit, root, -2.2, 6.9, 61.8, '#ffd58a', 8.2); kandil(kit, root, 2.2, 7.1, 62.2, '#7fe0a0', 8.3);
  kit.pools.add(0, 0.02, 60.5, 6.5, 5.5, '#ffd58a', 0.09, { layer: 'festive', theme: true });
  const rig = {
    hemi: ['#3f3a6c', '#1f1612', 0.5, 0.72], moon: 1,
    // A lamp high on a house front over the circle (it throws the shadows), and a light on the musicians
    spots: [{ pos: [-6.5, 9, -3], to: [0, 0, 1], color: '#ffd9ae', base: 70, distance: 30, angle: 0.7, layer: 'key' }, { pos: [0, 3.0, 58.6], to: [0, 1.7, 65.2], color: '#ffe4c4', base: 52, distance: 14, angle: 0.5, layer: 'show' }],
    // The street lamps' sodium on the lane and the house fronts
    points: [[-5.8, 5, -6], [5.8, 5, 8], [-5.8, 5, 22], [5.8, 5, 50]].map((p) => ({ pos: p, color: LIGHT.sodium, base: 32, distance: 22, layer: 'practical' }))
  };
  return {
    rig, bandHoles, mandapHoles, feedScreen, floor: floorMesh, fog: new THREE.FogExp2('#140d18', 0.011), exposure: 0.95,
    update(t, ctx) {
      // Lit windows are practical lights
      facades.forEach((m) => (m.emissiveIntensity = 1.05 * ctx.lv.practical));
      showCreatives(boards, ctx.sponsors && ctx.sponsors.boards, ctx.sponsors, boardCreative, (m, a) => { m.material.color.setScalar(a); m.material.emissiveIntensity *= a; });
      flag.rotation.y = ctx.reduce ? 0 : Math.sin(t * 3) * 0.3;
    }
  };
}

/* ---------- the sheri's mandap ----------
   Over the musicians' takht: four turned pillars painted red with gold bands and marigolds wound down the front two, a
   canopy of striped cloth sloping back with scalloped valances and a fringe of bulbs, the society's banner over the
   front, a painted cloth hung behind the band, and a warm lamp on each front pillar for the players. */
function sheriMandap(kit, root, TH) {
  const z0 = 63.9, z1 = 66, y0 = 0.6, top = 3.45;
  const bands = canvasTexture(64, 256, (g, w, h) => { g.fillStyle = '#a81e1e'; g.fillRect(0, 0, w, h); [0.05, 0.12, 0.45, 0.52, 0.88, 0.95].forEach((v) => { g.fillStyle = '#d6a64a'; g.fillRect(0, v * h, w, h * 0.025); }); g.fillStyle = 'rgba(255,230,170,.45)'; for (let y = 0.2; y < 0.42; y += 0.04) for (let x = 4; x < w; x += 12) g.fillRect(x, y * h, 4, 3); });
  const pillar = new THREE.LatheGeometry([[0.12, 0], [0.13, 0.08], [0.085, 0.16], [0.075, 1.1], [0.11, 1.2], [0.075, 1.3], [0.07, 2.55], [0.11, 2.66], [0.14, 2.78], [0.1, 2.85]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
  const pm = new THREE.MeshStandardMaterial({ map: bands, roughness: 0.45, metalness: 0.2 });
  [[-3.35, z0], [3.35, z0], [-3.35, z1], [3.35, z1]].forEach(([x, z], i) => {
    const p = new THREE.Mesh(pillar, pm); p.position.set(x, y0, z); root.add(p);
    if (i < 2) for (let k = 0; k < 26; k++) { const a = k * 0.9; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), std(k % 3 ? '#f08a24' : '#f6c342', 0.85)); m.position.set(x + Math.cos(a) * 0.1, y0 + 2.7 - k * 0.1, z + Math.sin(a) * 0.1); root.add(m); }
  });
  // The canopy, sloping back, in saffron, maroon and cream stripes
  const stripes = canvasTexture(256, 64, (g, w, h) => { const c = ['#c8641a', '#6e1422', '#c9b48e', '#6e1422']; for (let i = 0; i < 16; i++) { g.fillStyle = c[i % 4]; g.fillRect(i / 16 * w, 0, w / 16 + 1, h); } });
  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(7.3, Math.hypot(z1 - z0 + 0.5, 0.4)), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9, side: THREE.DoubleSide }));
  canopy.rotation.x = -Math.PI / 2 - Math.atan2(0.4, z1 - z0 + 0.5); canopy.position.set(0, top + 0.2, (z0 + z1) / 2); root.add(canopy);
  const scallop = (n, hex) => canvasTexture(512, 96, (g, w, h) => { g.clearRect(0, 0, w, h); const sw = w / n; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? hex : '#f3e6d0'; g.fillRect(i * sw, 0, sw + 1, h * 0.6); g.beginPath(); g.moveTo(i * sw, h * 0.6); g.quadraticCurveTo((i + 0.5) * sw, h * 1.02, (i + 1) * sw, h * 0.6); g.closePath(); g.fill(); g.fillStyle = '#d6a64a'; g.beginPath(); g.arc((i + 0.5) * sw, h * 0.88, 5, 0, TAU); g.fill(); } g.fillStyle = '#d6a64a'; g.fillRect(0, h * 0.58, w, 4); });
  const val = new THREE.MeshStandardMaterial({ map: scallop(12, '#7e1827'), roughness: 0.9, alphaTest: 0.35, side: THREE.DoubleSide }), sideVal = new THREE.MeshStandardMaterial({ map: scallop(5, '#7e1827'), roughness: 0.9, alphaTest: 0.35, side: THREE.DoubleSide });
  const front = face(new THREE.Mesh(new THREE.PlaneGeometry(7.3, 0.5), val)); front.position.set(0, top - 0.02, z0 - 0.26); root.add(front);
  [-1, 1].forEach((sd) => { const v = faceTo(new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 + 0.5, 0.5), sideVal), -sd * Math.PI / 2); v.position.set(sd * 3.65, top + 0.1, (z0 + z1) / 2); root.add(v); });
  for (let k = 0; k <= 18; k++) kit.bulbs.add(lerp(-3.6, 3.6, k / 18), top - 0.3, z0 - 0.28, k, { ph: k * 1.1, s: 0.8 });
  for (let k = 0; k <= 28; k++) kit.flags.add(lerp(-3.4, 3.4, k / 28), top - 0.34, z0 - 0.2, Math.PI, 0.1, k);
  // The society's banner over the front
  const banner = canvasTexture(512, 96, () => {});
  const drawBanner = () => { const g = banner.image.getContext('2d'), w = 512, h = 96; g.fillStyle = '#6b1020'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d6a64a'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#ffe6a8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 50px "Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, system-ui, sans-serif'; g.fillText('નવરાત્રી મહોત્સવ', w / 2, h * 0.54); banner.needsUpdate = true; };
  drawBanner(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawBanner);
  const bn = face(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.64), kit.litMap(banner, 1.0, 'practical'))); bn.position.set(0, top + 0.5, z0 - 0.28); root.add(bn);
  const holes = [boxSolid(-1.8, top + 0.18, z0 - 0.3, 1.8, top + 0.82, z0 - 0.26), boxSolid(-3.65, top - 0.27, z0 - 0.3, 3.65, top + 0.4, z1 + 0.3)];
  [-1.4, 1.4].forEach((x) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5), std('#2a1a10', 0.7)); post.position.set(x, top + 0.22, z0 - 0.26); root.add(post); });
  // The painted cloth behind the band: a mandala in gold on red, and જય અંબે across it
  const cloth = canvasTexture(512, 208, () => {});
  const drawCloth = () => { const g = cloth.image.getContext('2d'), w = 512, h = 208; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a0c16'); gr.addColorStop(1, '#8e1b2c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d6a64a'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
    g.save(); g.translate(w / 2, h * 0.46); for (let i = 0; i < 16; i++) { g.save(); g.rotate(i / 16 * TAU); g.fillStyle = i % 2 ? 'rgba(214,166,74,.8)' : 'rgba(240,138,36,.7)'; g.beginPath(); g.ellipse(34, 0, 26, 8, 0, 0, TAU); g.fill(); g.restore(); } g.fillStyle = '#d6a64a'; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.restore();
    g.fillStyle = '#ffe6a8'; g.textAlign = 'center'; g.font = '700 30px "Noto Sans Gujarati", "Gujarati Sangam MN", Shruti, system-ui, sans-serif'; g.fillText('જય અંબે', w / 2, h * 0.9); cloth.needsUpdate = true; };
  drawCloth(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCloth);
  const bc = face(new THREE.Mesh(new THREE.PlaneGeometry(6.5, 2.65), kit.selfLit(new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.95 }), 0.05))); bc.position.set(0, y0 + 1.4, z1 - 0.06); root.add(bc);
  // A warm lamp on each front pillar, turned on the band
  [-1, 1].forEach((sd) => {
    const fx = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.18, 10), std('#1a1714', 0.5, 0.4)); fx.position.set(sd * 3.2, top - 0.35, z0 + 0.05); fx.rotation.z = sd * 0.7; root.add(fx);
    kit.bigBulbs.add(sd * 3.12, top - 0.42, z0 + 0.08, 0, { color: LIGHT.warm, k: 0.55, s: 0.32, twinkle: 0, layer: 'show' });
    kit.pools.add(sd * 1.6, y0 + 1.3, z1 - 0.1, 2.2, 1.4, LIGHT.warm, 0.06, { vertical: true, layer: 'show' });
  });
  kit.pools.add(0, 0.02, z0 - 1.2, 3.6, 1.6, LIGHT.warm, 0.06, { layer: 'show' });
  return holes;
}

/* ---------- the haveli at the end of the sheri ----------
   Three storeys in deep rose plaster, painted like the lane's houses (lit windows, curtains, the carved door behind the
   shrine), with two jharokhas on the first floor under gilded domes, marigold swags along the first-floor moulding,
   curtain lights down its front round the projector screen, bulbs along its parapet, and warm uplights washing it. */
function haveli(kit, root, r) {
  const h = { side: 0, z1: -8.2, z2: 8.2, h: 12, col: '#6a3446', floors: 3, lit: 0.37, balcony: false, hue: 4 }, zf = 71.99;
  const body = new THREE.Mesh(new THREE.BoxGeometry(16.4, 12, 3), std('#3a2433', 0.95)); body.position.set(0, 6, 73.5); root.add(body);
  const tx = houseTexture(h, r), mat = new THREE.MeshStandardMaterial({ map: tx.map, emissiveMap: tx.em, emissive: '#ffffff', emissiveIntensity: 1.05, roughness: 0.9 });
  const front = face(new THREE.Mesh(new THREE.PlaneGeometry(16.4, 12), mat)); front.position.set(0, 6, zf); root.add(front);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.3, 0.5), std('#d6b06f', 0.8)); cornice.position.set(0, 11.85, zf - 0.15); root.add(cornice);
  // Jharokhas: a balcony on brackets, a gilded rail, slim pillars and a dome, bulbs round the dome's rim
  const gold = std('#c9963f', 0.4, 0.6), wood = std('#5a2e16', 0.8);
  [-4.69, 4.69].forEach((x) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.9), wood); base.position.set(x, 3.85, zf - 0.45); root.add(base);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 0.05), gold); rail.position.set(x, 4.25, zf - 0.88); root.add(rail);
    [-0.85, 0.85].forEach((dx) => { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.0, 8), gold); pl.position.set(x + dx, 4.95, zf - 0.82); root.add(pl); });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 6, 0, TAU, 0, Math.PI / 2), std('#b8863a', 0.45, 0.5)); dome.scale.set(1.05, 0.6, 0.55); dome.position.set(x, 6.02, zf - 0.45); root.add(dome);
    const eave = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.0), wood); eave.position.set(x, 5.98, zf - 0.45); root.add(eave);
    for (let k = 0; k <= 10; k++) kit.bulbs.add(x - 1.05 + k * 0.21, 5.9, zf - 0.97, k, { ph: k, s: 0.8 });
    kit.pools.add(x, 4.9, zf - 0.02, 1.1, 1.2, LIGHT.tungsten, 0.3, { vertical: true, layer: 'practical' });
  });
  // Marigold swags along the first-floor moulding
  const beads = [];
  for (let sI = 0; sI < 8; sI++) { const A = [lerp(-8, 8, sI / 8), 3.72, zf - 0.08], B = [lerp(-8, 8, (sI + 1) / 8), 3.72, zf - 0.08]; for (let k = 1; k < 16; k++) beads.push(sag(A, B, 0.4, k / 16)); }
  const garl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, emissive: '#3a1800' }), beads.length), mx = new THREE.Matrix4(), cA = new THREE.Color('#f29a2e'), cB = new THREE.Color('#f6c342');
  garl.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(beads.length * 3), 3);
  beads.forEach((q, i) => { garl.setMatrixAt(i, mx.makeTranslation(q[0], q[1], q[2])); const c = i % 3 ? cA : cB; garl.instanceColor.setXYZ(i, c.r, c.g, c.b); });
  root.add(garl);
  // Curtain lights round the projector screen, and a string of bulbs along the parapet
  kit.curtains.add(-8.0, zf - 0.06, -3.75, zf - 0.06, 2.7, 11.5, 0, -1, 0);
  kit.curtains.add(3.75, zf - 0.06, 8.0, zf - 0.06, 2.7, 11.5, 0, -1, 1);
  kit.curtains.add(-3.55, zf - 0.06, 3.55, zf - 0.06, 9.2, 11.5, 0, -1, 2);
  for (let x = -8.1; x <= 8.1; x += 0.36) kit.bulbs.add(x, 12.08, zf - 0.32, Math.round(x * 3), { ph: x, s: 0.85 });
  // Warm uplights washing it from the foot of the wall
  [-7.2, -2.2, 2.2, 7.2].forEach((x) => uplight(kit, root, x, zf - 0.45, 0, 12, 0, 1));
  return mat;
}


// A small rangoli for a doorstep, three patterns in the night's colours
const doorRangolis = [];
function doorRangoli(i) {
  if (doorRangolis[i]) return doorRangolis[i];
  const pal = [['#c2185b', '#f6c342', '#2a9d8f', '#fff3d6'], ['#f08a24', '#3b4cc0', '#e9c46a', '#fff3d6'], ['#2f8f5b', '#d8453a', '#f6c342', '#fff3d6']][i];
  const t = canvasTexture(128, 128, (g, w) => {
    g.clearRect(0, 0, w, w); g.translate(w / 2, w / 2);
    for (let k = 0; k < 8; k++) { g.save(); g.rotate(k / 8 * TAU); g.fillStyle = pal[k % 2]; g.beginPath(); g.ellipse(w * 0.26, 0, w * 0.15, w * 0.07, 0, 0, TAU); g.fill(); g.restore(); }
    g.fillStyle = pal[2]; g.beginPath(); g.arc(0, 0, w * 0.14, 0, TAU); g.fill();
    g.fillStyle = pal[3]; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; g.beginPath(); g.arc(Math.cos(a) * w * 0.44, Math.sin(a) * w * 0.44, 3, 0, TAU); g.fill(); }
  });
  doorRangolis[i] = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.2, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  return doorRangolis[i];
}
// A house's doorstep for the festival: most doors have a lamp on a bracket beside them; some have a row of diyas on the
// otla and a rangoli on the lane in front; lit windows on the ground floor spill a little light onto the lane.
function doorstep(kit, root, h, r) {
  const W = h.z2 - h.z1, X = h.side * 8, cols = Math.max(2, Math.round(W / 2.2)), dz = h.z1 + W * (Math.floor(cols / 2) + 0.5) / cols;
  if (h.z2 < -24 || h.z1 > 68) return;
  // The open door's light spilling out across the doorstep and onto the lane
  kit.pools.add(h.side * 6.3, 0.02, dz, 2.0, 1.6, LIGHT.tungsten, 0.2, { layer: 'practical' });
  if (h.lit > 0.3) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), std('#1b1510', 0.7)); br.position.set(X - h.side * 0.15, 2.72, dz + 0.62); root.add(br);
    kit.bigBulbs.add(X - h.side * 0.28, 2.64, dz + 0.62, 0, { color: LIGHT.tungsten, k: 1.2, s: 0.5, twinkle: 0.02, layer: 'practical' });
    kit.pools.add(X - h.side * 0.03, 2.5, dz + 0.62, 0.9, 1.2, LIGHT.tungsten, 0.22, { vertical: true, ry: h.side * Math.PI / 2, layer: 'practical' });
    kit.pools.add(h.side * 6.4, 0.02, dz + 0.4, 1.8, 1.8, LIGHT.tungsten, 0.12, { layer: 'practical' });
  }
  if (r() < 0.55) {
    for (let k = 0; k < 5; k++) kit.flames.add(h.side * 6.98, 0.45, dz + (k - 2) * 0.24, { s: 0.038, k: 0.55 });
    kit.pools.add(h.side * 6.5, 0.02, dz, 1.4, 1.6, LIGHT.flame, 0.16, { layer: 'flame' });
    kit.pools.add(h.side * 6.84, 0.24, dz, 1.3, 0.3, LIGHT.flame, 0.2, { vertical: true, ry: h.side * Math.PI / 2, layer: 'flame' });
    const rg = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), doorRangoli(Math.floor(r() * 3))); rg.rotation.x = -Math.PI / 2; rg.position.set(h.side * 6.2, 0.01, dz); root.add(rg);
  }
  for (let c = 0; c < cols; c++) {
    if (c === Math.floor(cols / 2) || ((h.lit * 10 + c) % 3) >= 1.6) continue;
    kit.pools.add(h.side * 6.45, 0.02, h.z1 + W * (c + 0.5) / cols, 1.1, 1.3, LIGHT.tungsten, 0.08, { layer: 'practical' });
  }
}


export default { seed: 303, sky: true, small: true, garboK: 10, build: sheri };
