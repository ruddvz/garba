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
  const mg = g.createRadialGradient(0, 0, R, 0, 0, 25); mg.addColorStop(0, '#e9ddc8'); mg.addColorStop(0.62, '#ddcfb8'); mg.addColorStop(0.7, '#3a2a24'); mg.addColorStop(0.98, '#2a201c'); mg.addColorStop(1, 'rgba(42,32,28,0)');
  g.fillStyle = mg; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(120,96,70,.35)'; g.lineWidth = 0.03;
  for (let a = 0; a < 48; a++) { const an = a / 48 * TAU; g.beginPath(); g.moveTo(Math.cos(an) * R, Math.sin(an) * R); g.lineTo(Math.cos(an) * 21.6, Math.sin(an) * 21.6); g.stroke(); }
  [17.8, 19.7, 21.6].forEach((rr) => { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); });
  for (let i = 0; i < 140; i++) { const a = r() * TAU, d = R + r() * 5.4; g.strokeStyle = `rgba(150,130,110,${0.08 + r() * 0.1})`; g.lineWidth = 0.02; g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d); g.quadraticCurveTo(Math.cos(a + 0.03) * (d + 0.6), Math.sin(a + 0.03) * (d + 0.6), Math.cos(a + 0.07) * (d + 0.2), Math.sin(a + 0.07) * (d + 0.2)); g.stroke(); }
  // the mandala: a maroon ground, a gold border with a running vine, a ring of large lotus petals, a band of small ones,
  // dots, and a medallion of orange and gold at the heart
  g.fillStyle = '#4e0d16'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  const gold = '#d6a64a', red = '#8e1b2c', deep = '#3a0810', orange = '#d8641e';
  const ring = (rr, w, col) => { g.strokeStyle = col || gold; g.lineWidth = w; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); };
  ring(R - 0.08, 0.1); ring(R - 0.55, 0.05);
  for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; g.strokeStyle = gold; g.lineWidth = 0.035; g.beginPath(); g.arc(Math.cos(a) * (R - 0.32), Math.sin(a) * (R - 0.32), 0.2, a, a + Math.PI); g.stroke(); }
  g.fillStyle = deep; g.beginPath(); g.arc(0, 0, R - 0.6, 0, TAU); g.fill();
  const petal = (n, r0, r1, w, fill, edge, rot = 0) => { for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; g.save(); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, w, r0 + (r1 - r0) * 0.75, w * 0.7, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.75, -w * 0.7, r0 + (r1 - r0) * 0.3, -w, r0, 0); g.fillStyle = fill; g.fill(); g.strokeStyle = edge; g.lineWidth = 0.05; g.stroke(); g.restore(); } };
  petal(24, 8.8, 15.0, 1.7, '#6a1222', gold);
  petal(24, 9.6, 13.4, 0.7, deep, gold, TAU / 48);
  ring(8.8, 0.06);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.fillStyle = i % 2 ? gold : '#f3e6d0'; g.beginPath(); g.arc(Math.cos(a) * 8.3, Math.sin(a) * 8.3, 0.12, 0, TAU); g.fill(); }
  g.fillStyle = '#5e101c'; g.beginPath(); g.arc(0, 0, 7.7, 0, TAU); g.fill();
  petal(16, 3.4, 7.4, 1.3, '#6a1222', gold);
  petal(16, 3.4, 6.2, 0.6, '#9a3a14', gold, TAU / 32);
  ring(3.4, 0.06); ring(7.7, 0.05);
  g.fillStyle = '#1e2a5a'; g.beginPath(); g.arc(0, 0, 3.2, 0, TAU); g.fill();
  petal(12, 1.4, 3.0, 0.75, orange, gold); petal(12, 1.4, 2.6, 0.4, '#f0b030', gold, TAU / 24);
  g.fillStyle = gold; g.beginPath(); g.arc(0, 0, 1.4, 0, TAU); g.fill();
  // feet have worn the middle a little
  g.globalCompositeOperation = 'source-atop';
  const wear = g.createRadialGradient(0, 0, 2, 0, 0, R); wear.addColorStop(0, 'rgba(255,230,200,.04)'); wear.addColorStop(0.6, 'rgba(255,230,200,.08)'); wear.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = wear; g.fillRect(-R, -R, 2 * R, 2 * R); g.globalCompositeOperation = 'source-over';
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
    kit.pools.add(x * 0.92, 0.02, z * 0.92, 4, 4, '#ff3040', 0.06, { layer: 'show' });
    kit.pools.add(x - Math.cos(a) * 0.25, TH0 * 0.5, z - Math.sin(a) * 0.25, 0.5, TH0 * 0.5, '#ff3a3a', 0.1, { vertical: true, ry: Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI / 2, layer: 'show' });
  }
  for (let i = 0; i < N; i++) { const p = towers[i], q = towers[(i + 1) % N]; trussRun(root, [p[0], TH0, p[1]], [q[0], TH0, q[1]]); }

  /* the canopy: strands from the mast's crown out to the ring, ribbons hanging from them all along, bulbs on them */
  const NS = phone ? 64 : 128, ribbons = [[], []], panels = [[], []], gap = phone ? 0.36 : 0.26;
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
    const m = kit.selfLit(new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.42, metalness: 0.2, emissive: '#ffffff', emissiveMap: map }), k, 'festive');
    // a slow breath of air through them: the lower end of each swings a little, each to its own time
    m.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.53;\ntransformed.x += sin(uT * 0.7 + ph) * 0.09 * (-position.y);\ntransformed.z += cos(uT * 0.5 + ph * 1.3) * 0.05 * (-position.y);\n#endif'); };
    m.customProgramCacheKey = () => 'resham-ribbon';
    const im = new THREE.InstancedMesh(geo, m, list.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    list.forEach(([x, y, z, ry, L, v], i) => { e.set(0, ry, 0); q.setFromEuler(e); im.setMatrixAt(i, mx.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(list === panels[0] || list === panels[1] ? 0.5 : 0.13, L, 1))); im.setColorAt(i, c.setScalar(v == null ? 1 : 0.7 + v * 0.3)); });
    im.frustumCulled = false; root.add(im); return im;
  };
  hang(ribbons[0], ribbonTexture(['#5a0610', '#c8162e'], '#b8862e'), 0.46);
  hang(ribbons[1], ribbonTexture(['#6a3a0c', '#d89a3a'], '#ffe0a0'), 0.45);
  // the red light the canopy throws down over everything
  kit.pools.add(0, 0.02, 0, 22, 22, '#ff3a4a', 0.025, { layer: 'festive' });

  /* the brass chandelier round the mast: two rings of candle bulbs, bells hanging from them, chains up to the crown */
  [[9.2, 1.45, 22], [10.5, 0.95, 14]].forEach(([y, rr, n]) => {
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.045, 6, 48), std('#c9963f', 0.28, 0.9)); ringM.rotation.x = Math.PI / 2; ringM.position.y = y; root.add(ringM);
    for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rr, z = Math.sin(a) * rr; kit.bigBulbs.add(x, y + 0.12, z, 0, { color: LIGHT.tungsten, k: 1.1, s: 0.42, twinkle: 0.06, layer: 'practical' }); if (i % 2) D.bell(x, y - 0.06, z, 0.8); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; kit.wires.line([Math.cos(a) * rr, y, Math.sin(a) * rr], [Math.cos(a) * 0.4, y + 2.2, Math.sin(a) * 0.4]); }
  });

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

  /* the gate on the near side, past the lounges (the storyboards' entrance): carved posts of dark wood and a lintel,
     a row of the embroidered panels under it with bells, marigold strings down the posts, lanterns and palms at its feet */
  { const zG = -RS.towers - 1.6, hw = 3.2, H = 5.6, wood = new THREE.MeshStandardMaterial({ map: carvedTexture(), roughness: 0.62, metalness: 0.05 });
    [-1, 1].forEach((sd) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, H, 0.7), wood); post.position.set(sd * hw, H / 2, zG); post.castShadow = !phone; root.add(post);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), std('#2a160c', 0.55)); cap.position.set(sd * hw, H + 0.15, zG); root.add(cap);
      for (let k = 0; k < 3; k++) marigolds.push([sd * hw + (k - 1) * 0.22, H - 0.1, zG + 0.38, H * (0.62 + k * 0.08)]);
      D.lantern(sd * (hw + 0.9), 0, zG + 0.6); D.lantern(sd * (hw - 0.8), 0, zG + 1.4, 0.8); D.palm(sd * (hw + 1.9), zG + 0.4, 1.0); D.urn(sd * (hw + 1.0), zG - 0.6);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 1.4, 0.75, 0.8), wood); lintel.position.set(0, H + 0.6, zG); root.add(lintel);
    for (let x = -hw + 0.55, i = 0; x < hw - 0.3; x += 0.56, i++) { const L = 1.2 + (i % 2) * 0.35; panels[(i + 1) % 2].push([x, H + 0.22, zG + 0.05, 0, L]); D.bell(x, H + 0.22 - L - 0.12, zG + 0.05, 1.2); }
    for (let i = 0; i < 9; i++) { const x = lerp(-hw + 0.3, hw - 0.3, i / 8); kit.bigBulbs.add(x, H + 0.15, zG - 0.3, 0, { color: LIGHT.tungsten, k: 0.9, s: 0.35, twinkle: 0.1, layer: 'practical' }); }
    kit.pools.add(0, 0.02, zG + 1.4, 4.4, 3.2, '#ffb070', 0.12, { layer: 'practical' });
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
    kit.pools.add(sf.x + fx * 0.8, 0.02, sf.z + fz * 0.8, sf.len * 0.75 + 1, 2.4, '#ffb070', 0.1, { layer: 'practical' });
    if (!sf.near) {
      D.rug(sf.x + fx * 0.9, sf.z + fz * 0.9, sf.len + 1.4, 2.2, -sf.ry, i % 2 ? rugA : rugB);
      [-1, 1].forEach((sd) => { D.table(sf.x + tx * sd * (sf.len / 2 + 0.55), sf.z + tz * sd * (sf.len / 2 + 0.55), 0.6, 0.6, { candles: 1 }); });
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
    for (let k = 0; k < n; k++) blobs.push([(r() - 0.5) * 4.2, 5 + r() * 3.2, (r() - 0.5) * 1.5, 1.8 + r() * 1.6]);
    tl.push({ x, z, s: 0.9 + r() * 0.5, blobs, fairy: r() < 0.6, hue: Math.floor(r() * 6), tone: Math.floor(r() * 3) });
  }
  trees(kit, root, tl);
  // the lawn lit: a warm pool under each tree in fairy lights, and a ring of low lanterns along the lawn's path
  tl.forEach((t) => { if (t.fairy) kit.pools.add(t.x, 0.03, t.z, 3.4 * t.s, 3.4 * t.s, '#ffc890', 0.08, { layer: 'festive', live: true }); });
  for (let i = 0; i < (phone ? 20 : 30); i++) { const a = (i + 0.5) / (phone ? 20 : 30) * TAU, x = Math.cos(a) * 27, z = Math.sin(a) * 27; if (Math.abs(x) < 4 && z < 0) continue; D.lantern(x, 0, z, 0.85); kit.pools.add(x, 0.03, z, 2.4, 2.4, '#ffb070', 0.09, { layer: 'practical', live: true }); }
  /* beyond the lawn: trees in a deep belt, a town's lights further off, a treeline at the horizon */
  forestBelt(kit, root, { r0: 47, r1: 120, n: phone ? 350 : 750, h: [8, 15], seed: 51, tones: ['#162a16', '#1a3018', '#203820', '#122412'] });
  townBelt(kit, root, { r0: 125, r1: 200, n: phone ? 60 : 130, style: 'old', seed: 53 });
  horizonRidge(root, { radius: 320, base: -4, height: 24, tree: true, seed: 11, cols: ['#06060a', '#10120e'] });
  D.finish();

  // two screens of clear glass, each carried by a pair of drones, over the lounges either side, under the ribbons
  const drones = [25, 155].map((deg, i) => { const a = deg * Math.PI / 180, x = Math.cos(a) * 20.5, z = Math.sin(a) * 20.5; return droneScreen(kit, root, { x, y: 5.0, z, ry: Math.atan2(-x, -z), w: 5.2, i }); });

  const rig = {
    hemi: ['#4a2a3a', '#200a08', 0.36, 0.56], moon: 1,
    spots: [{ pos: [8, 15, -10], to: [0, 0, 4], color: '#ffd8c0', base: 70, distance: 50, angle: 0.62, layer: 'key' }, { pos: [0, 8, S.z - 6], to: [0, S.h + 1.3, S.z + 2], color: '#ffd0b0', base: 110, distance: 22, angle: 0.55, layer: 'show' }],
    points: [{ pos: [0, 9.6, 0], color: LIGHT.tungsten, base: 60, distance: 20, layer: 'practical' }, { pos: [-14, 6, 6], color: '#ff4040', base: 26, distance: 22, layer: 'show' }, { pos: [14, 6, 6], color: '#ff4040', base: 26, distance: 22, layer: 'show' }, { pos: [0, 6, -12], color: '#ff5a48', base: 22, distance: 20, layer: 'festive' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#24080c', 0.011), exposure: 0.98,
    update(t, ctx) { uT.value = ctx.reduce ? 0 : t; drones.forEach((d) => d.update(t, ctx)); }
  };
}

export default { seed: 505, sky: true, garbo: 'none', garboK: 9, build: resham };
