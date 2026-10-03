// JYOT SHIKHAR, built from the owner's starred references (research/venue-reference-pack, priority 12: zip-051, zip-052,
// zip-076, zip-081, zip-097, zip-106 and the concept board): one great light sculpture in an open plaza. A tower of
// blackened metal stands in the middle of the dance circle: a drum of brushed steel on a round plinth, then four
// cones stacked one above another, each wider than the one it carries, pierced all over with holes and with trishuls
// and diamonds, a ring of gold light under each cone's rim; a crown of panels with paisleys and leaves; a finial. The
// light through the holes throws a mandala across the floor: rings of dots, trishuls and diamonds round the tower. Haze
// drifts round its foot. Round the plaza, low pavilions of glass, stone and wood glow warm, trees between them,
// floodlights on tall masts at the corners; the band plays in the far pavilion. (Elephants aren't this venue's motif.)
//
// The plan is the 2D scene's (venues2d/shikhar.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, normalMap, tex } from '../floors.js';
import { trees } from '../props.js';
import { ground } from './common.js';
import { newDecor, rugTexture } from './decor.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const GOLD = '#ffc46a';

/* ---------- textures ---------- */
// The plaza: dark polished stone in big slabs
function plazaStone(res) {
  const r = seeded(15), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#1e1c1a'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  const n = 3, w = res / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const t = 40 + r() * 14; g.fillStyle = `rgb(${t},${t - 3},${t - 7})`; g.fillRect(i * w + 2, k * w + 2, w - 4, w - 4); hg.fillStyle = '#9a9a9a'; hg.fillRect(i * w + 2, k * w + 2, w - 4, w - 4); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(220,210,190,.04)' : 'rgba(0,0,0,.08)'; g.fillRect(r() * res, r() * res, 1.5, 1.5); }
  return { map: tex(c, [120 / 4.5, 120 / 4.5]), normal: tex(normalMap(hc, 0.8), [120 / 4.5, 120 / 4.5], true) };
}
// The floor's own marks: a dark band round the dance circle, a fine gold line inside it
function floorDecal(rect, res, R) {
  const c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  g.strokeStyle = 'rgba(14,12,10,.85)'; g.lineWidth = 1.1; g.beginPath(); g.arc(0, 0, R + 0.4, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(200,160,90,.55)'; g.lineWidth = 0.06; g.beginPath(); g.arc(0, 0, R - 0.3, 0, TAU); g.stroke();
  g.restore();
  return c;
}
// A trishul, drawn about (0, 0), standing up, s tall
function trishul(g, s) {
  g.beginPath(); g.moveTo(0, s * 0.5); g.lineTo(0, -s * 0.38);
  g.moveTo(-s * 0.26, -s * 0.12); g.quadraticCurveTo(-s * 0.26, s * 0.08, 0, s * 0.1); g.quadraticCurveTo(s * 0.26, s * 0.08, s * 0.26, -s * 0.12);
  g.moveTo(-s * 0.26, -s * 0.12); g.lineTo(-s * 0.3, -s * 0.36); g.moveTo(s * 0.26, -s * 0.12); g.lineTo(s * 0.3, -s * 0.36);
  g.moveTo(-s * 0.06, -s * 0.38); g.lineTo(0, -s * 0.52); g.lineTo(s * 0.06, -s * 0.38);
  g.moveTo(-s * 0.12, s * 0.28); g.lineTo(s * 0.12, s * 0.28);
}
function diamondAt(g, x, y, s) { g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath(); g.moveTo(x, y - s * 0.45); g.lineTo(x + s * 0.45, y); g.lineTo(x, y + s * 0.45); g.lineTo(x - s * 0.45, y); g.closePath(); }
// A cone's skin: blackened metal, brushed and scratched, seams between its panels, and the pierced pattern: rows of
// holes, a trishul or a diamond in each panel. The map is the metal; the emissive map is only the holes, so the light
// from inside shows through them
function skin(rows, seed, motif = true) {
  const r = seeded(seed), W = 1024, H = 256, metal = canvas(W, H), light = canvas(W, H), g = metal.getContext('2d'), l = light.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a2622'); gr.addColorStop(1, '#16130f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '200,180,150' : '0,0,0'},${0.04 + r() * 0.06})`; g.lineWidth = 0.8; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 6); g.stroke(); }
  l.fillStyle = '#000'; l.fillRect(0, 0, W, H);
  const panels = 8, pw = W / panels;
  for (let p = 0; p < panels; p++) {
    const x0 = p * pw; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x0, 0, 3, H); g.fillStyle = 'rgba(210,180,120,.25)'; g.fillRect(x0 + 3, 0, 2, H);
    const mid = x0 + pw / 2, hasMotif = motif && p % 2 === 0;
    for (let row = 0; row < rows; row++) {
      const y = H * (0.14 + 0.72 * row / Math.max(1, rows - 1)), n = 7 - (row % 2), rad = 4.5 + (row % 3) * 1.6;
      for (let k = 0; k < n; k++) {
        const x = x0 + pw * (k + 0.5 + (row % 2) * 0.5) / (n + (row % 2) * 0.5);
        if (hasMotif && Math.abs(x - mid) < pw * 0.2 && Math.abs(y - H / 2) < H * 0.3) continue;
        l.fillStyle = '#fff'; l.beginPath(); l.arc(x, y, rad, 0, TAU); l.fill(); g.fillStyle = '#0a0806'; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
      }
    }
    if (hasMotif) {
      l.save(); l.translate(mid, H / 2); l.strokeStyle = '#fff'; l.lineWidth = 7; l.lineCap = 'round'; l.beginPath(); if ((p / 2) % 2 === 0) trishul(l, H * 0.5); else diamondAt(l, 0, 0, H * 0.18); l.stroke(); l.restore();
    }
  }
  const map = new THREE.CanvasTexture(metal), em = new THREE.CanvasTexture(light);
  [map, em].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); });
  return { map, em };
}
// The crown's panels: paisleys and leaves in gold line on black
function crownSkin() {
  const W = 1024, H = 256, metal = canvas(W, H), light = canvas(W, H), g = metal.getContext('2d'), l = light.getContext('2d');
  g.fillStyle = '#1a1612'; g.fillRect(0, 0, W, H); l.fillStyle = '#000'; l.fillRect(0, 0, W, H);
  for (let p = 0; p < 8; p++) {
    const x = (p + 0.5) * W / 8; g.fillStyle = 'rgba(210,180,120,.3)'; g.fillRect(p * W / 8, 0, 3, H);
    [g, l].forEach((c, i) => { c.save(); c.translate(x, H / 2); c.strokeStyle = i ? '#fff' : '#c8a060'; c.lineWidth = i ? 5 : 3; c.beginPath();
      if (p % 2) { c.moveTo(0, H * 0.38); c.bezierCurveTo(-H * 0.3, H * 0.05, -H * 0.12, -H * 0.36, 0, -H * 0.4); c.bezierCurveTo(H * 0.12, -H * 0.36, H * 0.3, H * 0.05, 0, H * 0.38); c.moveTo(0, H * 0.38); c.lineTo(0, -H * 0.3); for (let k = -3; k <= 3; k++) { c.moveTo(0, k * H * 0.08); c.lineTo(Math.sign(k || 1) * H * 0.1, k * H * 0.08 - H * 0.06); } }
      else { c.ellipse(0, 0, H * 0.13, H * 0.3, 0, 0, TAU); c.moveTo(0, -H * 0.3); c.quadraticCurveTo(H * 0.2, -H * 0.42, H * 0.12, -H * 0.2); c.moveTo(0, -H * 0.1); c.arc(0, 0, H * 0.08, 0, TAU); }
      c.stroke(); c.restore(); });
  }
  const map = new THREE.CanvasTexture(metal), em = new THREE.CanvasTexture(light);
  [map, em].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; });
  return { map, em };
}
// The light the tower throws on the floor: rings of dots growing outward, trishuls and diamonds between them, faint
// rays (laid over the floor, added to it)
function lightCast(res, R) {
  const W = 2 * R, c = canvas(res, res), g = c.getContext('2d'), k = res / W;
  g.fillStyle = '#000'; g.fillRect(0, 0, res, res); g.translate(res / 2, res / 2); g.scale(k, k);
  const dot = (x, y, s, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(255,225,170,${a})`); gr.addColorStop(0.7, `rgba(255,200,120,${a * 0.6})`); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); };
  const rings = [[4.6, 40, 0.14, 0.95], [5.6, 48, 0.17, 0.9], [7.0, 56, 0.21, 0.8], [8.6, 64, 0.26, 0.7], [10.4, 72, 0.3, 0.6], [12.4, 80, 0.34, 0.45]];
  rings.forEach(([rr, n, s, a], ri) => { for (let i = 0; i < n; i++) { const t = (i + (ri % 2) * 0.5) / n * TAU; dot(Math.cos(t) * rr, Math.sin(t) * rr, s, a); } });
  // trishuls and diamonds in the band between, pointing out from the tower
  g.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const t = (i + 0.5) / 16 * TAU, rr = 7.8; g.save(); g.translate(Math.cos(t) * rr, Math.sin(t) * rr); g.rotate(t + Math.PI / 2);
    g.strokeStyle = 'rgba(255,215,150,.85)'; g.lineWidth = 0.12; g.shadowColor = 'rgba(255,200,120,.9)'; g.shadowBlur = 0.4 * k; g.beginPath();
    if (i % 2) trishul(g, 1.3); else diamondAt(g, 0, 0, 0.42); g.stroke(); g.restore();
  }
  for (let i = 0; i < 48; i++) { const t = i / 48 * TAU; const gr = g.createLinearGradient(Math.cos(t) * 4, Math.sin(t) * 4, Math.cos(t) * R, Math.sin(t) * R); gr.addColorStop(0, 'rgba(255,210,150,.1)'); gr.addColorStop(1, 'rgba(255,210,150,0)'); g.strokeStyle = gr; g.lineWidth = 0.18; g.beginPath(); g.moveTo(Math.cos(t) * 4, Math.sin(t) * 4); g.lineTo(Math.cos(t) * R, Math.sin(t) * R); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { t, W };
}
function hazeTexture() {
  return canvasTexture(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,220,.55)'); gr.addColorStop(0.5, 'rgba(255,230,200,.2)'); gr.addColorStop(1, 'rgba(255,230,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
}

/* ---------- the venue ---------- */
function shikhar(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, SH = sp.plan, S = sp.stage, D = newDecor(kit, root), mx = new THREE.Matrix4();
  const ps = plazaStone(phone ? 512 : 1024), decalRect = { cx: 0, cz: 0, w: 32, d: 32 };
  const floorMesh = ground(root, { map: ps.map, normalMap: ps.normal, normalScale: 0.3, roughness: 0.3, decal: floorDecal(decalRect, phone ? 1024 : 2048, SH.floor), decalRect }, 120, 120, 0, tier.shadows);
  floorMesh.material.userData.env = 0.9;

  /* the tower */
  const T = new THREE.Group(); root.add(T);
  const steel = std('#8a8a8e', 0.32, 0.85), blackened = std('#1a1714', 0.5, 0.75);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(SH.tower.plinth, SH.tower.plinth + 0.1, SH.tower.plinthH, 64), std('#2a2724', 0.4, 0.4)); plinth.position.y = SH.tower.plinthH / 2; T.add(plinth);
  for (let i = 0; i < 28; i++) { const a = (i + 0.5) / 28 * TAU; kit.bigBulbs.add(Math.cos(a) * (SH.tower.plinth - 0.12), SH.tower.plinthH + 0.03, Math.sin(a) * (SH.tower.plinth - 0.12), 0, { color: GOLD, k: 1.1, s: 0.3, twinkle: 0, layer: 'architectural' }); }
  const y0 = SH.tower.plinthH, drumH = 1.7;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.45, drumH, 48), steel); drum.position.y = y0 + drumH / 2; T.add(drum);
  [0.15, drumH - 0.15].forEach((y) => { const band = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.05, 6, 64), kit.glow(GOLD, 1.4, 'architectural')); band.rotation.x = Math.PI / 2; band.position.y = y0 + y; T.add(band); });
  // the cones: [bottom radius, top radius, height]; each sits a little inside the rim of the one below
  const tiers = [[4.0, 2.7, 2.5], [3.4, 2.2, 2.2], [2.9, 1.8, 2.0], [2.4, 1.4, 1.8]], skins = [skin(4, 3), skin(4, 5), skin(3, 7), skin(3, 9)], coneMats = [];
  let y = y0 + drumH - 0.15;
  tiers.forEach(([rb, rt, h], i) => {
    const sk = skins[i], m = new THREE.MeshStandardMaterial({ map: sk.map, emissiveMap: sk.em, emissive: new THREE.Color(GOLD), emissiveIntensity: 1.2, roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide }); coneMats.push(m);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 64, 1, true), m); cone.position.y = y + h / 2; T.add(cone);
    // the rim's ring of gold light, and the light inside falling on the cone below
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rb - 0.05, 0.06, 8, 96), kit.glow(GOLD, 1.3, 'architectural')); ring.rotation.x = Math.PI / 2; ring.position.y = y + 0.02; T.add(ring);
    const under = new THREE.Mesh(new THREE.RingGeometry(rt * 0.95, rb - 0.06, 64), kit.glow('#ffd690', 0.3, 'architectural', { side: THREE.DoubleSide })); under.rotation.x = Math.PI / 2; under.position.y = y + 0.03; T.add(under);
    y += h * 0.72;
  });
  // the inner mast you see through the holes: a lattice column and rings of light
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, y - y0, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#3a3430', wireframe: true })); mast.position.y = (y + y0) / 2; T.add(mast);
  // the crown: a waisted drum of paisley panels, a gold ring above and below, a dome, a finial
  const cs = crownSkin(), crownM = new THREE.MeshStandardMaterial({ map: cs.map, emissiveMap: cs.em, emissive: new THREE.Color(GOLD), emissiveIntensity: 1.8, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }); coneMats.push(crownM);
  const crown = new THREE.Mesh(new THREE.LatheGeometry([[1.25, 0], [1.05, 0.5], [1.1, 1.1], [1.3, 1.7]].map(([a, b]) => new THREE.Vector2(a, b)), 48), crownM); crown.position.y = y + 0.4; T.add(crown);
  [y + 0.4, y + 2.1].forEach((yy, i) => { const rg = new THREE.Mesh(new THREE.TorusGeometry(i ? 1.3 : 1.25, 0.06, 8, 64), kit.glow(GOLD, 2.0, 'architectural')); rg.rotation.x = Math.PI / 2; rg.position.y = yy; T.add(rg); });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 12, 0, TAU, 0, Math.PI / 2), blackened); dome.scale.y = 0.45; dome.position.y = y + 2.1; T.add(dome);
  const fin = new THREE.Mesh(new THREE.LatheGeometry([[0.22, 0], [0.12, 0.3], [0.2, 0.55], [0.06, 0.9], [0.1, 1.1], [0.02, 1.8], [0, 2.0]].map(([a, b]) => new THREE.Vector2(a, b)), 16), std('#c9a050', 0.3, 0.9)); fin.position.y = y + 2.6; T.add(fin);
  kit.bigBulbs.add(0, y + 4.7, 0, 0, { color: GOLD, k: 1.4, s: 0.5, twinkle: 0.1, layer: 'architectural' });
  // the light the tower throws, and the warm pool round its foot
  const lc = lightCast(phone ? 1024 : 2048, SH.floor + 1), castMat = kit.litMap(lc.t, 0.95, 'architectural', { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), cast = new THREE.Mesh(new THREE.PlaneGeometry(lc.W, lc.W), castMat);
  cast.rotation.x = -Math.PI / 2; cast.position.y = 0.01; cast.renderOrder = 1; root.add(cast);
  kit.pools.add(0, 0.02, 0, 8, 8, GOLD, 0.16, { layer: 'architectural' });
  // haze drifting round its foot
  const hz = hazeTexture(), hazes = [];
  for (let i = 0; i < (phone ? 6 : 12); i++) { const a = i / (phone ? 6 : 12) * TAU, s = new THREE.Sprite(new THREE.SpriteMaterial({ map: hz, transparent: true, opacity: 0.22, depthWrite: false, fog: false })); s.scale.set(7, 4, 1); s.position.set(Math.cos(a) * 5.5, 1.6 + (i % 3) * 0.8, Math.sin(a) * 5.5); s.userData = { a, r: 5.5, y: s.position.y, dynamic: true }; root.add(s); hazes.push(s); }

  /* the pavilions round the plaza: a stone base, glass walls lit warm, a thin flat roof on slender columns, wood slats */
  const stone = std('#5a524a', 0.7, 0.05), roofM = std('#2a2622', 0.6, 0.3), slat = std('#7a5a3a', 0.6), glassM = kit.litMap(canvasTexture(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd08a'); gr.addColorStop(1, '#c8803a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2018'; for (let x = 0; x < w; x += 36) g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(80,50,20,.35)'; for (let i = 0; i < 12; i++) g.fillRect(r() * w, h * 0.5, 10, h * 0.4); }), 0.95, 'practical');
  const pavilion = (x, z, ry, w, d, open) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), stone); base.position.y = 0.3; g.add(base);
    if (!open) { const front = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, 2.8), glassM); front.position.set(0, 2.0, d / 2 - 0.4); g.add(front); const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 3, 0.3), stone); back.position.set(0, 2.1, -d / 2 + 0.4); g.add(back); }
    if (open) {
      // the band's pavilion: a back wall of teak slats lit warm from behind, brightest behind the band
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 3.1, 0.25), std('#3a2a1c', 0.7)); wall.position.set(0, 2.15, -d / 2 + 0.35); g.add(wall);
      const slats = canvasTexture(512, 128, (c, cw, ch) => {
        const gr = c.createRadialGradient(cw / 2, ch * 0.55, 10, cw / 2, ch * 0.55, cw * 0.55); gr.addColorStop(0, '#ffd89a'); gr.addColorStop(0.6, '#e09a4a'); gr.addColorStop(1, '#6a3a18');
        c.fillStyle = gr; c.fillRect(0, 0, cw, ch); c.fillStyle = '#2a1a0e'; for (let x = 0; x < cw; x += 14) c.fillRect(x, 0, 6, ch); c.fillRect(0, 0, cw, 5); c.fillRect(0, ch - 5, cw, 5);
      });
      const glowWall = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.8, 2.8), kit.litMap(slats, 0.85, 'architectural')); glowWall.position.set(0, 2.1, -d / 2 + 0.48); g.add(glowWall);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.35, d + 2), roofM); roof.position.y = 3.9; g.add(roof);
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(w + 2.05, 0.06, 0.06), kit.glow(GOLD, 1.3, 'architectural')); fascia.position.set(0, 3.7, d / 2 + 1.0); g.add(fascia);
    // (the band's pavilion keeps only its corner columns on the side towards the circle, so none stands before a singer)
    const nCol = Math.round(w / 2.4);
    for (let k = 0; k < nCol + 1; k++) { const cx = -w / 2 + k * w / nCol; [-1, 1].forEach((s2) => { if (open && s2 > 0 && k > 0 && k < nCol) return; const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.3, 8), std('#c8c0b4', 0.4, 0.4)); col.position.set(cx, 2.25, s2 * (d / 2 + 0.6)); g.add(col); }); }
    for (let k = 0; k < Math.round(w * 2.5); k++) { const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, d + 1.6), slat); s3.position.set(-w / 2 - 0.5 + k * (w + 1) / Math.round(w * 2.5), 3.48, 0); g.add(s3); }
    kit.pools.add(x + Math.sin(ry) * (d / 2 + 2), 0.02, z + Math.cos(ry) * (d / 2 + 2), w * 0.6, 3, '#ffc88a', 0.12, { layer: 'practical' });
    return g;
  };
  SH.pavilions.forEach(([x, z, ry]) => pavilion(x, z, ry, 7.2, 5.2, false));
  // the band's pavilion at the far side, open towards the circle
  pavilion(0, S.z + S.depth / 2, Math.PI, S.x1 - S.x0 + 3, S.depth + 2.4, true);
  // pendant lamps over the band, each a brass shade on its cord, their light on the boards
  const shade = kit.glow('#ffc070', 1.5, 'practical');
  [-4.2, -1.6, 1.6, 4.2].forEach((x) => {
    const zz = S.z + S.depth * 0.55, lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 0.24, 16, 1, true), std('#8a6a3a', 0.35, 0.8, { side: THREE.DoubleSide })); lamp.position.set(x, 3.05, zz); root.add(lamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), shade); bulb.position.set(x, 2.96, zz); root.add(bulb);
    kit.wires.line([x, 3.17, zz], [x, 3.72, zz]);
    kit.pools.add(x, S.h + 0.03, zz, 1.4, 1.4, '#ffc070', 0.12, { layer: 'practical', live: true });
  });
  const st = new THREE.Group(); root.add(st);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0, S.h, S.depth), std('#4a3a2a', 0.6, 0.05)); deck.position.set(0, S.h / 2 + 0.01, S.z + S.depth / 2); st.add(deck);
  D.rug(0, S.z + 1.6, S.x1 - S.x0 - 0.6, 2.4, 0, rugTexture('stripe', ['#2a1a10', '#c89a4a', '#7a3a1a', '#f0e0c0']), S.h + 0.012);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#ffc46a' });
  kit.pools.add(0, 0.02, S.z - 1.6, 5, 2.6, LIGHT.warm, 0.12, { layer: 'show' });

  /* trees in round stone planters between the pavilions, uplit; floodlights on tall masts at the corners */
  const tl = [];
  [[-24, 2], [24, 2], [-14, 20], [14, 20], [-15, -21], [15, -21], [-25, 18], [25, 18], [-26, -16], [26, -16]].forEach(([x, z]) => {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.6, 24), stone); pl.position.set(x, 0.3, z); root.add(pl);
    const n = 5, blobs = []; for (let k = 0; k < n; k++) blobs.push([(r() - 0.5) * 3, 4 + r() * 2, (r() - 0.5) * 1.4, 1.6 + r() * 1.2]);
    tl.push({ x, z, s: 1, blobs, fairy: false, hue: 0, tone: Math.floor(r() * 3) });
    kit.pools.add(x, 2.2, z, 1.6, 2.4, '#ffd8a0', 0.12, { vertical: true, ry: Math.atan2(-x, -z), layer: 'architectural' });
  });
  trees(kit, root, tl);
  const flood = [];
  [[-30, -24], [30, -24], [-30, 26], [30, 26]].forEach(([x, z]) => {
    const mastM = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 18, 8), std('#3a3a40', 0.5, 0.6)); mastM.position.set(x, 9, z); root.add(mastM);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.3), std('#202024', 0.5, 0.5)); head.position.set(x, 18.2, z); head.lookAt(0, 0, 0); root.add(head);
    for (let k = 0; k < 6; k++) kit.bigBulbs.add(x + (k % 3 - 1) * 0.7 * Math.sign(-z), 18.4 - Math.floor(k / 3) * 0.4, z * 0.995, 0, { color: '#fff4e6', k: 1.6, s: 0.5, twinkle: 0, layer: 'key' });
    flood.push([x, z]);
    kit.pools.add(x * 0.6, 0.02, z * 0.6, 11, 11, '#fff0dc', 0.06, { layer: 'key' });
  });
  // low bollards round the plaza's edge, each lighting its patch of stone
  const post = std('#2a2826', 0.5, 0.5);
  for (let k = -30; k <= 30; k += 5) [[k, -31], [k, 31], [-31, k], [31, k]].forEach(([x, z]) => {
    if (Math.abs(x) < 4 && z < 0) return;
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), post); pm.position.set(x, 0.35, z); root.add(pm);
    kit.bigBulbs.add(x, 0.74, z, 0, { color: '#ffd8a0', k: 1, s: 0.2, twinkle: 0, layer: 'architectural' });
    kit.pools.add(x, 0.02, z, 1.8, 1.8, '#ffc88a', 0.1, { layer: 'architectural' });
  });

  /* low seating round the circle, lanterns along its edge */
  (SH.seats || []).forEach((sf) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, sf.kind === 'bench' ? { wood: '#3a3028', seat: '#4a3a2a', cushions: ['#c89a4a', '#7a3a1a', '#2a1a10'] } : { wood: '#3a3028', seat: '#e8dcc8', cushions: ['#c89a4a', '#7a3a1a', '#1e3a5a'] });
  });
  for (let i = 0; i < 32; i++) { const a = (i + 0.5) / 32 * TAU, x = Math.cos(a) * (SH.floor + 0.9), z = Math.sin(a) * (SH.floor + 0.9); if (Math.abs(x) < 3.6 && z < -12) continue; D.lantern(x, 0, z, 0.8); }
  /* beyond the plaza: trees, then the city's towers and lights, a low skyline at the horizon */
  const inPlaza = (x, z) => Math.abs(x) < 32 && z > -32 && z < 32;
  forestBelt(kit, root, { r0: 34, r1: 75, n: phone ? 180 : 380, h: [7, 13], seed: 111, tones: ['#18281a', '#1e301e', '#142214'], skip: inPlaza });
  townBelt(kit, root, { r0: 85, r1: 190, n: phone ? 110 : 220, style: 'modern', h: [12, 48], seed: 113 });
  horizonRidge(root, { radius: 320, base: -4, height: 16, seed: 19, cols: ['#06060a', '#100e10'] });
  D.finish();

  const rig = {
    hemi: ['#2a2a38', '#1a1410', 0.36, 0.56], moon: 1,
    spots: flood.slice(0, 2).map(([x, z]) => ({ pos: [x, 18, z], to: [0, 0, 2], color: '#fff0e0', base: 60, distance: 70, angle: 0.5, layer: 'key' })).concat([{ pos: [0, 5.5, S.z - 4.5], to: [0, S.h + 1.1, S.z + 1.6], color: '#ffe0b8', base: 70, distance: 14, angle: 0.6, layer: 'show' }]),
    points: [{ pos: [0, 3, 0], color: GOLD, base: 70, distance: 18, layer: 'architectural' }, { pos: [0, 8, 0], color: GOLD, base: 40, distance: 16, layer: 'architectural' }, { pos: [-20, 3, 4], color: '#ffc88a', base: 22, distance: 12, layer: 'practical' }, { pos: [20, 3, 4], color: '#ffc88a', base: 22, distance: 12, layer: 'practical' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#1a1612', 0.011), exposure: 1.0,
    update(t, ctx) {
      const tt = ctx.reduce ? 0 : t, lv = ctx.lv.architectural || 0;
      coneMats.forEach((m, i) => { m.emissiveIntensity = (0.7 + 0.7 * lv) * (1 + (ctx.reduce ? 0 : 0.05 * Math.sin(tt * 2 + i))) * (1 + 0.08 * (ctx.pulse || 0)); });
      castMat.color.setScalar((0.5 + 0.55 * lv) * (1 + 0.06 * (ctx.pulse || 0)));
      hazes.forEach((s, i) => { const a = s.userData.a + tt * 0.04; s.position.set(Math.cos(a) * s.userData.r, s.userData.y + 0.3 * Math.sin(tt * 0.3 + i), Math.sin(a) * s.userData.r); });
    }
  };
}

export default { seed: 1414, sky: true, garbo: 'none', garboK: 6, build: shikhar };
