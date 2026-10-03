// RESHAM PAVILION, built from the owner's starred references (research/venue-reference-pack, priority 2): the corrected
// full-span canopy (a tall lacquered mast at the centre and, from its crown out to a ring of truss towers lit red,
// hundreds of deep red ribbons, a few of antique gold, hung along strands radiating from the crown, so from under it
// they draw a sunburst round the mast), the embroidered red-and-black panels with brass bells, the brass chandelier,
// the maroon mandala floor in cream marble, red lounges round it in candle light with carved tables, rugs, brass
// lanterns, urns of dandiya sticks and palms, a band stage backed by a wall of the embroidered panels, a gate of carved
// wood hung with panels, bells and marigolds on the near side, and trees in fairy lights round the lawn.
//
// The plan (where the floor ends, the towers, the sofas, the stage) is the 2D scene's (venues2d/resham.js), handed in
// as data.spec, so the people it seats sit on the sofas built here.

import * as THREE from 'three';
import { TAU, lerp, sag, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { trees } from '../props.js';
import { canvas, wrap, normalMap, tex } from '../floors.js';
import { ground, droneScreen } from './common.js';
import { newDecor, rugTexture, trussTower, trussRun, bandPlatform } from './decor.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

/* ---------- textures ---------- */
function lawn(res) {
  const r = seeded(12), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#1c2a14'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  for (let i = 0; i < 40; i++) { const x = r() * res, y = r() * res, rr = 40 + r() * 120; wrap(res, res, x, y, rr, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, r() < 0.5 ? 'rgba(40,58,24,.25)' : 'rgba(10,18,8,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2); }); }
  for (let i = 0; i < 30000; i++) { const x = r() * res, y = r() * res, l = r(); g.strokeStyle = l < 0.5 ? `rgba(70,96,40,${0.15 + r() * 0.25})` : `rgba(8,16,6,${0.2 + r() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4); g.stroke(); hg.fillStyle = l < 0.5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)'; hg.fillRect(x, y, 1, 3); }
  return { map: tex(c, [40, 40]), normal: tex(normalMap(hc, 2), [40, 40], true) };
}
// The floor's painted layer: the maroon mandala (zip-142), the cream marble round it, the stone under the lounges
function floorDecal(rect, res, R) {
  const r = seeded(31), c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  // cream marble in big slabs round the mandala, out to the lounges, and dark stone under them
  const mg = g.createRadialGradient(0, 0, 0, 0, 0, 25); mg.addColorStop(0, '#efe4d2'); mg.addColorStop(0.62, '#e2d4be'); mg.addColorStop(0.7, '#3a2a24'); mg.addColorStop(0.98, '#2a201c'); mg.addColorStop(1, 'rgba(42,32,28,0)');
  g.fillStyle = mg; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(120,96,70,.35)'; g.lineWidth = 0.03;
  for (let a = 0; a < 48; a++) { const an = a / 48 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * R, Math.sin(an) * R); g.lineTo(Math.cos(an) * 21.6, Math.sin(an) * 21.6); g.stroke(); }
  [17.8, 19.7, 21.6].forEach((rr) => { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); });
  // the dance floor is marble too, out from the mandala: veins, and slab joints in rings and spokes
  g.strokeStyle = 'rgba(150,126,100,.22)'; g.lineWidth = 0.025; for (let a = 0; a < 32; a++) { const an = a / 32 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * 8.2, Math.sin(an) * 8.2); g.lineTo(Math.cos(an) * R, Math.sin(an) * R); g.stroke(); } [10.8, 13.4].forEach((rr) => { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); });
  for (let i = 0; i < 420; i++) { const a = r() * TAU, d = 8 + r() * (R - 8 + 5.4); g.strokeStyle = `rgba(150,130,110,${0.08 + r() * 0.1})`; g.lineWidth = 0.02; g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d); g.quadraticCurveTo(Math.cos(a + 0.03) * (d + 0.6), Math.sin(a + 0.03) * (d + 0.6), Math.cos(a + 0.07) * (d + 0.2), Math.sin(a + 0.07) * (d + 0.2)); g.stroke(); }
  // brass inlay where the marble meets the lounges' stone, and slab joints in the marble
  g.strokeStyle = '#c9963f'; g.lineWidth = 0.08; g.beginPath(); g.arc(0, 0, R + 0.1, 0, TAU); g.stroke();
  // the mandala (zip-142): a carpet medallion of maroon, navy and gold in the middle of the cream floor, not the whole
  // floor, so the dance is on marble round a red heart, as the reference has it
  const M = Math.min(8.2, R * 0.52), gold = '#d6a64a', cream = '#f3e6d0', red = '#8e1b2c', deep = '#4a0a14', navy = '#1c2a5a', orange = '#c0401e';
  const ring = (rr, w, col) => { g.strokeStyle = col || gold; g.lineWidth = w; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); };
  const disc = (rr, col) => { g.fillStyle = col; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill(); };
  const petal = (n, r0, r1, w, fill, edge, rot = 0, lw = 0.04) => { for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; g.save(); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, w, r0 + (r1 - r0) * 0.75, w * 0.7, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.75, -w * 0.7, r0 + (r1 - r0) * 0.3, -w, r0, 0); g.fillStyle = fill; g.fill(); if (edge) { g.strokeStyle = edge; g.lineWidth = lw; g.stroke(); } g.restore(); } };
  // the border: navy, a gold vine of scallops and buds on it, gold rules each side
  disc(M, navy); ring(M - 0.05, 0.08); ring(M - 0.62, 0.05);
  for (let i = 0; i < 56; i++) { const a = i / 56 * TAU, x = Math.cos(a) * (M - 0.33), z = Math.sin(a) * (M - 0.33); g.strokeStyle = gold; g.lineWidth = 0.035; g.beginPath(); g.arc(x, z, 0.17, a + Math.PI * 0.5, a + Math.PI * 1.5); g.stroke(); g.fillStyle = i % 2 ? cream : '#c2183a'; g.beginPath(); g.arc(Math.cos(a + TAU / 112) * (M - 0.33), Math.sin(a + TAU / 112) * (M - 0.33), 0.05, 0, TAU); g.fill(); }
  // the field: maroon with sixteen ogee petals in red edged in gold, each with a cream filigree spine and a gold bud
  disc(M - 0.64, deep);
  petal(16, M * 0.38, M - 0.78, M * 0.13, red, gold, 0, 0.05);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.save(); g.rotate(a); g.strokeStyle = cream; g.lineWidth = 0.025; g.beginPath(); g.moveTo(M * 0.45, 0); g.lineTo(M - 0.95, 0); g.stroke(); for (let k = 1; k < 5; k++) { const x = M * 0.45 + (M - 1.4 - M * 0.45) * k / 5; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 0.25, 0.22, x + 0.45, 0.12); g.moveTo(x, 0); g.quadraticCurveTo(x + 0.25, -0.22, x + 0.45, -0.12); g.stroke(); } g.fillStyle = gold; g.beginPath(); g.arc(M - 0.9, 0, 0.1, 0, TAU); g.fill(); g.restore(); }
  petal(16, M * 0.42, M * 0.78, M * 0.05, '#a8301e', null, TAU / 32);
  // an eight-pointed star in gold line, and a ring of cream and gold beads
  g.strokeStyle = gold; g.lineWidth = 0.05; g.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? M * 0.3 : M * 0.4; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke();
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; g.fillStyle = i % 2 ? gold : cream; g.beginPath(); g.arc(Math.cos(a) * M * 0.36, Math.sin(a) * M * 0.36, 0.06, 0, TAU); g.fill(); }
  // the medallion at the heart (the mast's plinth stands on it): navy, then petals of orange and gold
  disc(M * 0.27, navy); ring(M * 0.27, 0.05);
  petal(12, 1.4, M * 0.26, 0.55, orange, gold); petal(12, 1.4, M * 0.22, 0.3, '#f0b030', gold, TAU / 24);
  disc(1.42, gold);
  // feet have worn the middle a little
  g.globalCompositeOperation = 'source-atop';
  const wear = g.createRadialGradient(0, 0, 2, 0, 0, M); wear.addColorStop(0, 'rgba(255,230,200,.04)'); wear.addColorStop(0.6, 'rgba(255,230,200,.08)'); wear.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = wear; g.fillRect(-M, -M, 2 * M, 2 * M); g.globalCompositeOperation = 'source-over';
  g.restore();
  return c;
}
function mastTexture() {
  return canvasTexture(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#3a0610'); gr.addColorStop(0.45, '#8a1424'); gr.addColorStop(0.6, '#a01c2c'); gr.addColorStop(1, '#3a0610');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 30; y < h; y += 58) { g.fillStyle = '#c9963f'; g.fillRect(0, y, w, 5); g.fillRect(0, y + 9, w, 2); }
  });
}
// A ribbon of satin: a sheen down its middle and a thin gold edge
function ribbonTexture(base, edge) {
  return canvasTexture(32, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, base[0]); gr.addColorStop(0.5, base[1]); gr.addColorStop(1, base[0]);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = edge; g.fillRect(0, 0, 2, h); g.fillRect(w - 2, 0, 2, h);
    for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y, w, 6); }
  });
}
// A strip of the canopy (zip-094, zip-101): satin with a sheen, gold borders, a column of embroidered diamonds and
// round mirrors down it, and a fringe of threads at its foot
function stripTexture(base, gold, ink) {
  return canvasTexture(48, 384, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, base[0]); gr.addColorStop(0.5, base[1]); gr.addColorStop(1, base[0]);
    g.fillStyle = gr; g.fillRect(0, 0, w, h - 26);
    g.fillStyle = gold; g.fillRect(2, 0, 3, h - 26); g.fillRect(w - 5, 0, 3, h - 26);
    for (let y = 18, k = 0; y < h - 40; y += 30, k++) {
      g.save(); g.translate(w / 2, y);
      if (k % 2) { g.fillStyle = '#eef2ff'; g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); g.fill(); g.strokeStyle = gold; g.lineWidth = 2; g.stroke(); }
      else { g.fillStyle = ink; g.beginPath(); g.moveTo(0, -11); g.lineTo(9, 0); g.lineTo(0, 11); g.lineTo(-9, 0); g.closePath(); g.fill(); g.strokeStyle = gold; g.lineWidth = 1.6; g.stroke(); g.fillStyle = gold; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); }
      g.restore();
    }
    g.fillStyle = gold; g.fillRect(0, h - 28, w, 3);
    for (let x = 2; x < w; x += 4) { g.fillStyle = x % 8 ? gold : base[1]; g.fillRect(x, h - 25, 2, 22 - (x % 6)); }
  });
}
// An embroidered panel: red or black ground, rows of mirrors and diamonds in gold and red thread, a fringe
function panelTexture(dark, seed) {
  const r = seeded(seed);
  return canvasTexture(96, 448, (g, w, h) => {
    g.fillStyle = dark ? '#1a0a0e' : '#9a1424'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d6a64a'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 30);
    for (let y = 24; y < h - 40; y += 28) {
      for (let x = 16; x < w - 8; x += 22) {
        const k = (Math.round(y / 28) + Math.round(x / 22)) % 3;
        g.save(); g.translate(x, y);
        if (k === 0) { g.fillStyle = dark ? '#c2183a' : '#f0c24b'; g.beginPath(); g.moveTo(0, -9); g.lineTo(8, 0); g.lineTo(0, 9); g.lineTo(-8, 0); g.closePath(); g.fill(); }
        else if (k === 1) { g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill(); g.strokeStyle = '#d6a64a'; g.lineWidth = 1.5; g.stroke(); }
        else { g.fillStyle = dark ? '#d6a64a' : '#1a0a0e'; g.fillRect(-4, -4, 8, 8); }
        g.restore();
      }
    }
    for (let x = 4; x < w; x += 6) { g.fillStyle = r() < 0.5 ? '#d6a64a' : '#c2183a'; g.fillRect(x, h - 24, 3, 22); }
  });
}

// Dark carved wood: panels of a running vine and rosettes cut into it, the cuts darker
function carvedTexture() {
  return canvasTexture(128, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2a1608'); gr.addColorStop(0.5, '#4a2a14'); gr.addColorStop(1, '#2a1608'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(10,4,2,.85)'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20); g.strokeRect(18, 18, w - 36, h - 36);
    for (let y = 60; y < h - 40; y += 84) { g.beginPath(); g.arc(w / 2, y, 22, 0, TAU); g.stroke(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * 12, y + Math.sin(a) * 12, 8, 3.5, a, 0, TAU); g.stroke(); } }
    g.strokeStyle = 'rgba(214,166,74,.25)'; g.lineWidth = 1.2; for (let y = 102; y < h - 40; y += 84) { g.beginPath(); g.moveTo(26, y); g.bezierCurveTo(w / 2 - 10, y - 18, w / 2 + 10, y + 18, w - 26, y); g.stroke(); }
  });
}

/* ---------- the venue ---------- */
function resham(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data && data.spec, RS = sp ? sp.plan : { floor: 16, towers: 25, nTowers: 16, towerH: 10.5, mastH: 19, crownY: 18.3, sofas: [] }, S = sp ? sp.stage : { x0: -6.5, x1: 6.5, z: 19.2, h: 1, depth: 4.4, bandFront: 20.1 };
  const D = newDecor(kit, root), uT = { value: 0 }, marigolds = [];

  /* the ground: lawn, with the marble, the mandala and the lounges' stone painted on it */
  const lw = lawn(phone ? 512 : 1024), decalRect = { cx: 0, cz: 0, w: 52, d: 52 };
  const floorMesh = ground(root, { map: lw.map, normalMap: lw.normal, normalScale: 0.5, roughness: 0.92, decal: floorDecal(decalRect, phone ? 1024 : 2048, RS.floor), decalRect }, 140, 140, 4, tier.shadows);

  /* the mast at the centre: lacquered red with gold bands on a marble plinth, diyas round its foot, a brass crown */
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, RS.mastH, 16), new THREE.MeshStandardMaterial({ map: mastTexture(), roughness: 0.38, metalness: 0.15 }));
  mast.position.y = RS.mastH / 2; mast.castShadow = !phone; root.add(mast);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.36, 0.45, 32), std('#e3d6c2', 0.35, 0.05)); plinth.position.y = 0.225; root.add(plinth);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(1.31, 0.03, 6, 48), std('#c9963f', 0.3, 0.85)); trim.rotation.x = Math.PI / 2; trim.position.y = 0.45; root.add(trim);
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * TAU; kit.flames.add(Math.cos(a) * 1.12, 0.45, Math.sin(a) * 1.12, { s: 0.05, k: 0.5, bowl: 'brass' }); }
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 32), std('#c9963f', 0.3, 0.85)); crown.rotation.x = Math.PI / 2; crown.position.y = RS.crownY; root.add(crown);
  const kalash = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), std('#d6a64a', 0.3, 0.85)); kalash.position.y = RS.mastH + 0.2; root.add(kalash);

  /* the towers round the edge, a ring of truss across their tops, red lights on each */
  const towers = [], N = RS.nTowers, RT = RS.towers, TH0 = RS.towerH;
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * TAU, x = Math.cos(a) * RT, z = Math.sin(a) * RT; towers.push([x, z, a]);
    trussTower(root, x, z, TH0, 0.42);
    [TH0 - 0.4, TH0 * 0.55].forEach((y, k) => kit.bigBulbs.add(x - Math.cos(a) * 0.3, y, z - Math.sin(a) * 0.3, 0, { color: k ? '#ff2a3a' : '#ff4a3a', k: 1.3, s: 0.55, twinkle: 0.04, layer: 'show' }));
    kit.pools.add(x * 0.92, 0.02, z * 0.92, 4, 4, '#ff3040', 0.035, { layer: 'show' });
    kit.pools.add(x - Math.cos(a) * 0.25, TH0 * 0.5, z - Math.sin(a) * 0.25, 0.5, TH0 * 0.5, '#ff3a3a', 0.1, { vertical: true, ry: Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI / 2, layer: 'show' });
  }
  for (let i = 0; i < N; i++) { const p = towers[i], q = towers[(i + 1) % N]; trussRun(root, [p[0], TH0, p[1]], [q[0], TH0, q[1]]); }

  /* the canopy: strands from the mast's crown out to the ring, ribbons hanging from them all along, bulbs on them */
  const NS = phone ? 64 : 112, ribbons = [[], []], panels = [[], []], gap = phone ? 0.42 : 0.34;
  for (let s = 0; s < NS; s++) {
    const a = s / NS * TAU, A = [Math.cos(a) * 0.62, RS.crownY, Math.sin(a) * 0.62], B = [Math.cos(a) * RT, TH0, Math.sin(a) * RT];
    kit.wires.cable(A, B, 1.1, 14);
    const len = Math.hypot(B[0] - A[0], B[2] - A[2]), n = Math.floor(len / gap);
    for (let k = 2; k < n - 1; k++) {
      const u = k / n, p = sag(A, B, 1.1, u), mid = Math.sin(u * Math.PI);
      // short by the crown and longer out towards the towers, so each strand reads as a line of red radiating from the
      // mast (the sunburst the approved canopy shows from under it), the dark between strands showing; never low
      // enough to reach you
      const L = Math.min(p[1] - 5.9, lerp(0.7, 2.9, Math.pow(u, 0.8)) * (0.75 + r() * 0.5) + 0.4 * mid);
      if (L < 0.4) continue;
      ribbons[r() < 0.08 ? 1 : 0].push([p[0], p[1], p[2], a + Math.PI / 2 + (r() - 0.5) * 0.6, L, r()]);
      if (k % 6 === 3) kit.bulbs.add(p[0], p[1] - 0.05, p[2], s + k, { color: r() < 0.6 ? '#ff5a4a' : '#ffd08a', k: 0.8, s: 0.7, twinkle: 0.3, layer: 'festive' });
    }
    // the embroidered panels on every third strand, over the floor, each with a tassel and a brass bell below it
    if (s % 2 === 0) for (let u = 0.22 + (s % 4) * 0.04; u < 0.9; u += 0.16 + r() * 0.05) {
      const p = sag(A, B, 1.1, u), L = Math.min(p[1] - 6.2, 1.6 + r() * 0.8);
      panels[r() < 0.45 ? 1 : 0].push([p[0], p[1], p[2], a + Math.PI / 2, L]);
      D.bell(p[0], p[1] - L - 0.18, p[2], 1.1);
    }
  }
  const hang = (list, map, k) => {
    if (!list.length) return null;
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, -0.5, 0);
    const m = kit.selfLit(new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.42, metalness: 0.2, emissive: '#ffffff', emissiveMap: map, alphaTest: 0.4 }), k, 'festive');
    // a slow breath of air through them: the lower end of each swings a little, each to its own time
    m.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.53;\ntransformed.x += sin(uT * 0.7 + ph) * 0.09 * (-position.y);\ntransformed.z += cos(uT * 0.5 + ph * 1.3) * 0.05 * (-position.y);\n#endif'); };
    m.customProgramCacheKey = () => 'resham-ribbon';
    const im = new THREE.InstancedMesh(geo, m, list.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    list.forEach(([x, y, z, ry, L, v], i) => { e.set(0, ry, 0); q.setFromEuler(e); im.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(list === panels[0] || list === panels[1] ? 0.5 : 0.21, L, 1))); im.setColorAt(i, c.setScalar(v == null ? 1 : 0.7 + v * 0.3)); });
    im.frustumCulled = false; root.add(im); return im;
  };
  hang(ribbons[0], stripTexture(['#5a0610', '#c8162e'], '#d6a64a', '#1a0a0e'), 0.46);
  hang(ribbons[1], stripTexture(['#1a0a0e', '#3a1418'], '#d6a64a', '#c2183a'), 0.42);
  // the red light the canopy throws down over everything
  kit.pools.add(0, 0.02, 0, 22, 22, '#ff3a4a', 0.012, { layer: 'festive' });

  /* the brass chandelier round the mast: two rings of candle bulbs, bells hanging from them, chains up to the crown */
  [[9.2, 1.45, 22], [10.5, 0.95, 14]].forEach(([y, rr, n]) => {
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.045, 6, 48), std('#c9963f', 0.28, 0.9)); ringM.rotation.x = Math.PI / 2; ringM.position.y = y; root.add(ringM);
    for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rr, z = Math.sin(a) * rr; kit.bigBulbs.add(x, y + 0.12, z, 0, { color: LIGHT.tungsten, k: 1.1, s: 0.42, twinkle: 0.06, layer: 'practical' }); if (i % 2) D.bell(x, y - 0.06, z, 0.8); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; kit.wires.line([Math.cos(a) * rr, y, Math.sin(a) * rr], [Math.cos(a) * 0.4, y + 2.2, Math.sin(a) * 0.4]); }
  });

  /* six more brass chandeliers between the strands round the floor (zip-093, zip-142): three tiers of candle bulbs and
     crystal drops on a chain from the canopy, each pooling warm light on the marble below */
  for (let c = 0; c < 6; c++) {
    const a = (c + 0.5) / 6 * TAU + TAU / 24, d = 9.5, x = Math.cos(a) * d, z = Math.sin(a) * d, y = 9.6, brass = std('#c9963f', 0.28, 0.9);
    [[0.62, 0, 12], [0.4, 0.42, 8], [0.2, 0.78, 5]].forEach(([rr, dy, n]) => {
      const ringM = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.03, 6, 32), brass); ringM.rotation.x = Math.PI / 2; ringM.position.set(x, y + dy, z); root.add(ringM);
      for (let i = 0; i < n; i++) { const b = i / n * TAU, bx = x + Math.cos(b) * rr, bz = z + Math.sin(b) * rr; kit.bigBulbs.add(bx, y + dy + 0.1, bz, 0, { color: LIGHT.tungsten, k: 1.0, s: 0.32, twinkle: 0.08, layer: 'practical' }); kit.bulbs.add(bx, y + dy - 0.16, bz, i, { color: '#fff4e0', k: 0.6, s: 0.4, twinkle: 0.5, layer: 'practical' }); }
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), brass); stem.position.set(x, y + 0.45, z); root.add(stem);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), std('#d6a64a', 0.3, 0.85)); finial.position.set(x, y - 0.22, z); root.add(finial);
    kit.wires.line([x, y + 0.9, z], [x, 14.2, z]);
    kit.pools.add(x, 0.02, z, 3.4, 3.4, '#ffc890', 0.1, { layer: 'practical' });
  }

  /* the band's stage: a low wooden deck, a black drape behind, a frame of truss with red pars, speakers */
  const st = new THREE.Group(); root.add(st);
  const zB = S.z + S.depth;
  bandPlatform(kit, st, S, { body: std('#1c120c', 0.8), top: std('#2a1a10', 0.65, 0.05), skirt: new THREE.MeshStandardMaterial({ color: '#2a060c', roughness: 0.9 }) });
  const drape = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0 + 1.2, 6.2), new THREE.MeshStandardMaterial({ map: canvasTexture(256, 64, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 10 + 8 * Math.sin(x * 0.4) + 4 * Math.sin(x * 1.3); g.fillStyle = `rgb(${v},${v * 0.8},${v})`; g.fillRect(x, 0, 1, h); } }), roughness: 1 }));
  drape.position.set(0, S.h + 3.1, zB + 0.3); st.add(drape);
  for (let x = S.x0 - 0.3, i = 0; x <= S.x1 + 0.3; x += 0.58, i++) panels[i % 2].push([x, 8.2, zB + 0.12, 0, 5.4 + (i % 3) * 0.25]);
  [S.x0 - 0.7, S.x1 + 0.7].forEach((x) => trussTower(st, x, S.z + 0.4, 8.6, 0.4));
  trussRun(st, [S.x0 - 0.7, 8.6, S.z + 0.4], [S.x1 + 0.7, 8.6, S.z + 0.4]);
  for (let i = 0; i < 9; i++) { const x = lerp(S.x0, S.x1, (i + 0.5) / 9); kit.bigBulbs.add(x, 8.3, S.z + 0.3, 0, { color: i % 3 === 1 ? '#ffb070' : '#ff3040', k: 1.2, s: 0.5, twinkle: 0.05, layer: 'show' }); }
  kit.pools.add(0, S.h + 3, zB - 0.02, (S.x1 - S.x0) * 0.5, 3, '#ff3a40', 0.12, { vertical: true, layer: 'show' });
  kit.pools.add(0, 0.02, S.z - 2.5, 8, 4, '#ff6a50', 0.1, { layer: 'show' });
  [-1, 1].forEach((sd) => { [0, 0.62].forEach((y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), std('#0e0c0c', 0.7)); b.position.set(sd * (S.x1 + 1.6), y + 0.3, S.z + 0.6); st.add(b); }); });
  const bandHoles = buildBand(kit, st, BAND.big, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, back: S.z + S.depth, wash: '#ff5a4a' });

  /* the gate on the near side, past the lounges (zip-131): three pointed arches in a wall of roses and marigolds,
     trimmed in gold, red velvet drawn back in each opening under a swagged valance, lanterns hanging in the middle one;
     a red runner from it to the floor, candle lanterns, palms and brass urns along it, warm light up its face */
  { const zG = -RS.towers - 1.6, DEP = 0.9, gold = std('#d6a64a', 0.3, 0.85);
    const OPEN = [[0, 2.4, 5.4], [-5.4, 1.25, 3.3], [5.4, 1.25, 3.3]];          // [centre x, half width, spring height]
    const archY = (dx, w, hs) => hs + w * 1.25 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(dx) / w, 1.8)), 0.62);
    const inOpening = (x, y) => OPEN.some(([cx, w, hs]) => Math.abs(x - cx) < w && y < archY(x - cx, w, hs));
    const outerTop = (x) => Math.abs(x) <= 3.7 ? 7.6 + 2.2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / 3.7, 1.6)), 0.7) : 5.8;
    const inOuter = (x, y) => Math.abs(x) < 7.8 && y > 0 && y < outerTop(x);
    // the frame: its outline cut through with the three arches, extruded, in deep red velvet
    const sh = new THREE.Shape(); const steps = 40;
    sh.moveTo(-7.8, 0); sh.lineTo(-7.8, 5.8); sh.lineTo(-3.7, 5.8); for (let i = 0; i <= steps; i++) { const x = -3.7 + 7.4 * i / steps; sh.lineTo(x, outerTop(x)); } sh.lineTo(3.7, 5.8); sh.lineTo(7.8, 5.8); sh.lineTo(7.8, 0); sh.lineTo(-7.8, 0);
    OPEN.forEach(([cx, w, hs]) => { const h = new THREE.Path(); h.moveTo(cx - w, 0); h.lineTo(cx - w, hs); for (let i = 1; i <= steps; i++) { const x = -w + 2 * w * i / steps; h.lineTo(cx + x, archY(x, w, hs)); } h.lineTo(cx + w, 0); h.lineTo(cx - w, 0); sh.holes.push(h); });
    const frameG = new THREE.ExtrudeGeometry(sh, { depth: DEP, bevelEnabled: false, curveSegments: 4 }); frameG.translate(0, 0, -DEP / 2);
    const velvetFrame = new THREE.MeshPhysicalMaterial({ color: '#5a0814', roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#ff5a6a'), sheenRoughness: 0.5 });
    const frame = new THREE.Mesh(frameG, velvetFrame); frame.position.set(0, 0, zG); frame.castShadow = !phone; root.add(frame);
    // gold trim round each arch, both faces
    OPEN.forEach(([cx, w, hs]) => { const pts = [new THREE.Vector3(cx - w, 0, 0), new THREE.Vector3(cx - w, hs, 0)]; for (let i = 1; i <= 24; i++) { const x = -w + 2 * w * i / 24; pts.push(new THREE.Vector3(cx + x, archY(x, w, hs), 0)); } pts.push(new THREE.Vector3(cx + w, 0, 0)); const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 80, 0.06, 6, false); [-1, 1].forEach((sd) => { const t = new THREE.Mesh(tg, gold); t.position.set(0, 0, zG + sd * (DEP / 2 + 0.02)); root.add(t); }); });
    // the wall of flowers over both faces: roses in reds, pink and cream, marigolds, a few leaves
    const N = phone ? 1500 : 3400, fl = [], rr = seeded(77);
    for (let i = 0; i < N * 3 && fl.length < N; i++) { const x = (rr() * 2 - 1) * 7.85, y = rr() * 10, edge = OPEN.some(([cx, w, hs]) => Math.abs(Math.abs(x - cx) - w) < 0.5 && y < archY(Math.min(w, Math.abs(x - cx)), w, hs) + 0.5); if (!inOuter(x, y) || inOpening(x, y)) continue; const face = rr() < 0.62 ? -1 : 1; fl.push([x, y, zG + face * (DEP / 2 + 0.06 + rr() * 0.05), 0.08 + rr() * 0.05 + (edge ? 0.02 : 0)]); }
    const COLS = ['#b0102a', '#d81e3c', '#8a0a1e', '#e85a8a', '#f3e6d0', '#c8102e', '#f08a1a', '#ffc23a', '#2a5a2a'];
    // (the flowers hold a little of the fairy lights' glow, so the wall reads at night)
    const flowerM = kit.selfLit(std('#ffffff', 0.75), 0.22, 'practical');
    flowerM.onBeforeCompile = (sh0) => { sh0.fragmentShader = sh0.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;'); };
    flowerM.customProgramCacheKey = () => 'resham-flowers';
    const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), flowerM, fl.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    fl.forEach(([x, y, z, sz], i) => { fm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q.set(rr(), rr(), rr(), 1).normalize(), new THREE.Vector3(sz, sz * 0.8, sz))); const k = rr(); fm.setColorAt(i, c.set(COLS[k < 0.5 ? Math.floor(rr() * 3) : k < 0.65 ? 3 : k < 0.75 ? 4 : k < 0.85 ? 5 + Math.floor(rr() * 2) : k < 0.95 ? 7 : 8])); });
    root.add(fm);
    // fairy lights threaded through the flowers, warm and twinkling
    for (let i = 0; i < fl.length; i += phone ? 28 : 18) { const [x, y, z] = fl[i]; kit.bulbs.add(x, y, z + Math.sign(z - zG) * 0.08, i, { color: i % 3 ? '#ffd8a0' : '#fff2d8', k: 0.75, s: 0.55, twinkle: 0.6, layer: 'festive' }); }
    // red velvet in each opening, drawn back to the sides in deep folds, a swagged valance over it with a gold fringe
    const velvet = new THREE.MeshPhysicalMaterial({ color: '#8a0c1e', roughness: 0.62, sheen: 1, sheenColor: new THREE.Color('#ff6a7a'), sheenRoughness: 0.45, side: THREE.DoubleSide });
    OPEN.forEach(([cx, w, hs]) => {
      [-1, 1].forEach((sd) => {
        const cw = w * 0.42, ch = hs + w * 0.4, g0 = new THREE.PlaneGeometry(cw, ch, 18, 10), P0 = g0.attributes.position;
        for (let i = 0; i < P0.count; i++) { const x = P0.getX(i), y = P0.getY(i), v = (y + ch / 2) / ch, tie = Math.max(0, 1 - Math.abs(v - 0.38) / 0.38); P0.setX(i, x * (1 - 0.55 * tie) - sd * cw * 0.25 * tie); P0.setZ(i, 0.07 * Math.sin((x / cw + 0.5) * 9 * Math.PI) * (0.5 + 0.5 * v)); }
        g0.computeVertexNormals();
        const cur = new THREE.Mesh(g0, velvet); cur.position.set(cx + sd * (w - cw / 2 - 0.02), ch / 2, zG - DEP / 2 + 0.12); root.add(cur);
        const tieB = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 16), gold); tieB.position.set(cx + sd * (w - cw * 0.6), ch * 0.38, zG - DEP / 2 + 0.2); root.add(tieB);
      });
      const sw = new THREE.PlaneGeometry(2 * w, 0.7, 24, 4), SP = sw.attributes.position;
      for (let i = 0; i < SP.count; i++) { const x = SP.getX(i), y = SP.getY(i), u = (x / w + 1) / 2, sagY = -0.32 * Math.sin(u * Math.PI * 3) ** 2; SP.setY(i, y + sagY * (0.5 - y / 0.7)); SP.setZ(i, 0.05 * Math.sin(u * TAU * 6)); }
      sw.computeVertexNormals();
      const swag = new THREE.Mesh(sw, velvet); swag.position.set(cx, hs - 0.05, zG - DEP / 2 + 0.1); root.add(swag);
      for (let i = 0; i <= 18; i++) { const x = cx - w + 2 * w * i / 18, u = i / 18; kit.bigBulbs.add(x, archY(x - cx, w, hs) - 0.15, zG - DEP / 2 - 0.08, i, { color: LIGHT.tungsten, k: 0.9, s: 0.3, twinkle: 0.15, layer: 'practical' }); void u; }
    });
    // lanterns hanging in the middle arch
    [-1.2, 0, 1.2].forEach((x, i) => { const y = 5.6 - (i === 1 ? 0.5 : 0); kit.wires.line([x, y + 0.3, zG], [x, archY(x, 2.4, 5.4) - 0.1, zG]); const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.42, 8), kit.glow('#ffc070', 1.4, 'practical')); lb.position.set(x, y, zG); root.add(lb); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 8), gold); cap.position.set(x, y + 0.29, zG); root.add(cap); });
    // warm light up its face, and on the ground before it
    [-5.4, 0, 5.4].forEach((x) => [-1, 1].forEach((sd) => kit.pools.add(x, 3.6, zG + sd * (DEP / 2 + 0.14), x ? 2.4 : 3.8, 3.8, '#ffb070', 0.2, { vertical: true, layer: 'practical', live: true })));
    kit.pools.add(0, 0.02, zG - 2.4, 7, 3.4, '#ffb070', 0.14, { layer: 'practical' }); kit.pools.add(0, 0.02, zG + 2.4, 5, 3, '#ffb070', 0.1, { layer: 'practical' });
    // the red runner from the gate in to the floor's edge
    const runZ0 = zG - 5, runZ1 = -RS.floor - 0.6, runner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, runZ1 - runZ0), new THREE.MeshStandardMaterial({ map: rugTexture('stripe', ['#7a0a1a', '#d6a64a', '#5a0610', '#f3e6d0']), roughness: 0.95 }));
    runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.02, (runZ0 + runZ1) / 2); root.add(runner);
    // candle lanterns down both sides of the runner, palms and brass urns flanking the gate
    for (let z = zG - 4.6; z < runZ1 - 0.5; z += 2.2) [-1, 1].forEach((sd) => { if (Math.abs(z - zG) < 1.2) return; D.lantern(sd * 1.7, 0, z, 0.9); });
    [-1, 1].forEach((sd) => { D.palm(sd * 8.6, zG - 0.6, 1.2); D.palm(sd * 3.2, zG - 2.2, 0.9); D.urn(sd * 2.9, zG - 1.2); D.urn(sd * 7.9, zG - 1.6); });
  }
  hang(panels[0], panelTexture(false, 3), 0.45);
  hang(panels[1], panelTexture(true, 5), 0.4);
  if (marigolds.length) {
    // strings of marigolds: orange and yellow flowers threaded close, down the gate's posts
    const pts = []; marigolds.forEach(([x, y, z, L]) => { for (let d = 0; d < L; d += 0.085) pts.push([x, y - d, z]); });
    const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), std('#ffffff', 0.85), pts.length), mx = new THREE.Matrix4(), c = new THREE.Color();
    pts.forEach(([x, y, z], i) => { fm.setMatrixAt(i, mx.makeTranslation(x, y, z)); fm.setColorAt(i, c.set(i % 7 === 3 ? '#ffd24a' : '#f08a1a')); }); root.add(fm);
  }
  D.palm(S.x0 - 1.6, S.z - 0.6, 1.1); D.palm(S.x1 + 1.6, S.z - 0.6, 1.1);

  /* the lounges: red sofas round the floor with tables, rugs, lanterns, urns of dandiya sticks and palms */
  const rugA = rugTexture('persian', ['#7a1424', '#1c2a5a', '#d6a64a', '#f3e6d0']), rugB = rugTexture('stripe', ['#5a0e18', '#c2641a', '#d6a64a', '#2a3a6a']);
  (RS.sofas || []).forEach((sf, i) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, { seat: '#8e1b2c', cushions: ['#a0175a', '#c2641a', '#6a1020', '#d6a64a'] });
    const fx = Math.sin(sf.ry), fz = Math.cos(sf.ry), tx = Math.cos(sf.ry), tz = -Math.sin(sf.ry);
    kit.pools.add(sf.x + fx * 0.8, 0.02, sf.z + fz * 0.8, sf.len * 0.75 + 1.4, 2.8, '#ffb070', 0.22, { layer: 'practical' });
    // candlelight up the sofa's back and its cushions (zip-129's lounges glow)
    kit.pools.add(sf.x - fx * 0.3, 0.75, sf.z - fz * 0.3, sf.len * 0.6, 0.8, '#ffc890', 0.16, { vertical: true, ry: sf.ry, layer: 'practical', live: true });
    if (!sf.near) {
      D.rug(sf.x + fx * 0.9, sf.z + fz * 0.9, sf.len + 1.4, 2.2, -sf.ry, i % 2 ? rugA : rugB);
      [-1, 1].forEach((sd) => { D.table(sf.x + tx * sd * (sf.len / 2 + 0.55), sf.z + tz * sd * (sf.len / 2 + 0.55), 0.6, 0.6, { candles: 1 }); });
      // a low carved table before the sofa with a brass lantern and candles on it
      D.table(sf.x + fx * 1.25, sf.z + fz * 1.25, 0.72, 0.72, { candles: 1 }); D.lantern(sf.x + fx * 1.25 + tx * 0.18, 0.46, sf.z + fz * 1.25 + tz * 0.18, 0.55);
      D.lantern(sf.x + fx * 1.6 + tx * 1.4, 0, sf.z + fz * 1.6 + tz * 1.4);
      D.urn(sf.x - fx * 0.9 + tx * (sf.len / 2 + 0.2), sf.z - fz * 0.9 + tz * (sf.len / 2 + 0.2));
      D.palm(sf.x - fx * 1.1 - tx * (sf.len / 2 + 0.3), sf.z - fz * 1.1 - tz * (sf.len / 2 + 0.3), 0.9 + r() * 0.3);
    } else if (sf.near === 'a') D.rug(sf.x, sf.z + 1.0, sf.len, 1.4, 0, rugA);
  });
  [[-4.4, -18.2], [4.4, -18.2], [-4.6, -20.2], [4.6, -20.2]].forEach(([x, z]) => D.lantern(x, 0, z));
  // brass lanterns round the floor's edge, a candle in each
  for (let i = 0; i < 36; i++) { const a = (i + 0.5) / 36 * TAU, x = Math.cos(a) * (RS.floor + 0.5), z = Math.sin(a) * (RS.floor + 0.5); if (Math.abs(x) < 7 && z > 0) continue; D.lantern(x, 0, z, 0.9); }

  /* trees round the lawn, some in fairy lights */
  const tl = [];
  for (let i = 0; i < (phone ? 22 : 36); i++) {
    const a = r() * TAU, d = 31 + r() * 14, x = Math.cos(a) * d, z = Math.sin(a) * d, n = 5 + Math.floor(r() * 3), blobs = [];
    // (none in the way in: the gate and its path keep a clear corridor out to the lawn's edge)
    if (Math.abs(x) < 10 && z < -20) continue;
    for (let k = 0; k < n; k++) blobs.push([(r() - 0.5) * 4.2, 5 + r() * 3.2, (r() - 0.5) * 1.5, 1.8 + r() * 1.6]);
    tl.push({ x, z, s: 0.9 + r() * 0.5, blobs, fairy: r() < 0.6, hue: Math.floor(r() * 6), tone: Math.floor(r() * 3) });
  }
  trees(kit, root, tl);
  // the lawn lit: a warm pool under each tree in fairy lights, and a ring of low lanterns along the lawn's path
  tl.forEach((t) => { if (t.fairy) kit.pools.add(t.x, 0.03, t.z, 3.4 * t.s, 3.4 * t.s, '#ffc890', 0.08, { layer: 'festive', live: true }); });
  for (let i = 0; i < (phone ? 20 : 30); i++) { const a = (i + 0.5) / (phone ? 20 : 30) * TAU, x = Math.cos(a) * 27, z = Math.sin(a) * 27; if (Math.abs(x) < 4 && z < 0) continue; D.lantern(x, 0, z, 0.85); kit.pools.add(x, 0.03, z, 2.4, 2.4, '#ffb070', 0.09, { layer: 'practical', live: true }); }
  /* beyond the lawn: trees in a deep belt, a town's lights further off, a treeline at the horizon */
  forestBelt(kit, root, { r0: 47, r1: 120, n: phone ? 350 : 750, h: [8, 15], seed: 51, tones: ['#162a16', '#1a3018', '#203820', '#122412'], skip: (x, z) => Math.abs(x) < 9 && z < 0 });
  townBelt(kit, root, { r0: 125, r1: 200, n: phone ? 60 : 130, style: 'old', seed: 53 });
  horizonRidge(root, { radius: 320, base: -4, height: 24, tree: true, seed: 11, cols: ['#06060a', '#10120e'] });
  D.finish();

  // two screens of clear glass, each carried by a pair of drones, over the lounges either side, under the ribbons
  const drones = [25, 155].map((deg, i) => { const a = deg * Math.PI / 180, x = Math.cos(a) * 20.5, z = Math.sin(a) * 20.5; return droneScreen(kit, root, { x, y: 5.0, z, ry: Math.atan2(-x, -z), w: 5.2, i }); });

  const rig = {
    hemi: ['#5a3a42', '#2a120c', 0.42, 0.62], moon: 1,
    spots: [{ pos: [8, 15, -10], to: [0, 0, 4], color: '#ffd8c0', base: 70, distance: 50, angle: 0.62, layer: 'key' }, { pos: [0, 8, S.z - 6], to: [0, S.h + 1.3, S.z + 2], color: '#ffd0b0', base: 110, distance: 22, angle: 0.55, layer: 'show' }],
    points: [{ pos: [0, 9.6, 0], color: LIGHT.tungsten, base: 60, distance: 20, layer: 'practical' }, { pos: [-14, 6, 6], color: '#ff4040', base: 26, distance: 22, layer: 'show' }, { pos: [14, 6, 6], color: '#ff4040', base: 26, distance: 22, layer: 'show' }, { pos: [0, 6, -12], color: '#ff5a48', base: 22, distance: 20, layer: 'festive' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#24080c', 0.011), exposure: 1.04,
    update(t, ctx) { uT.value = ctx.reduce ? 0 : t; drones.forEach((d) => d.update(t, ctx)); }
  };
}

export default { seed: 505, sky: true, garbo: 'none', garboK: 9, build: resham };
