// TIDEGLASS TERRACE, built from the owner's starred references (research/venue-reference-pack, priority 11: the plan
// zip-061, zip-072, zip-085, zip-086, zip-099, zip-102, zip-115, zip-119, zip-136, zip-149 and the concept board): a
// terrace over the sea at night under a huge low moon. A round floor of white marble inlaid with a gold mandala; round it
// a ring of pool water glowing turquoise, candles floating on it, four crossings over it; beyond, the sea to the
// horizon, the moon's gold path on it, an island and a far coast with its lights; the band on a deck under carved
// wooden arches hung with flowers, the sea behind them; on the left a wall of glowing waterfalls over greenery; white
// cabanas with curtains and sofas round the terrace; great sculptures of glass petals, iridescent, between beds of
// glowing pink and blue flowers and little glowing mushrooms; lanterns and candles everywhere, lit paths.
//
// The plan is the 2D scene's (venues2d/tideglass.js), handed in as data.spec.

import * as THREE from 'three';
import { TAU, lerp, canvasTexture, seeded, BAND, LIGHT } from '../util.js';
import { std } from '../kit.js';
import { buildBand } from '../band.js';
import { canvas, normalMap, tex } from '../floors.js';
import { ground, Shape } from './common.js';
import { newDecor, rugTexture } from './decor.js';
import { forestBelt, townBelt, horizonRidge } from './surround.js';

const AQUA = '#3ae0e8';

/* ---------- textures and shaders ---------- */
// The terrace: pale travertine in long slabs
function travertine(res) {
  const r = seeded(19), c = canvas(res, res), hc = canvas(res, res), g = c.getContext('2d'), hg = hc.getContext('2d');
  g.fillStyle = '#a89e8c'; g.fillRect(0, 0, res, res); hg.fillStyle = '#808080'; hg.fillRect(0, 0, res, res);
  const rows = 4, rh = res / rows;
  for (let row = 0; row < rows; row++) { let x = -r() * res * 0.3; while (x < res) { const w = res * (0.3 + r() * 0.3), t = r(); g.fillStyle = `rgb(${Math.round(196 + t * 20)},${Math.round(186 + t * 18)},${Math.round(168 + t * 16)})`; g.fillRect(x + 1.5, row * rh + 1.5, w - 3, rh - 3); hg.fillStyle = '#9a9a9a'; hg.fillRect(x + 1.5, row * rh + 1.5, w - 3, rh - 3); x += w; } }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,100,70,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * res, r() * res, 1 + r() * 3, 0.6 + r(), r() * 3, 0, TAU); g.fill(); }
  return { map: tex(c, [110 / 4.8, 110 / 4.8]), normal: tex(normalMap(hc, 1.0), [110 / 4.8, 110 / 4.8], true) };
}
// The dance floor: white marble with grey veins and the gold mandala of the plan (a lotus of pointed petals, rings, a
// band of scallops), and the floor's gold rim
function floorDecal(rect, res, TG) {
  const r = seeded(7), c = canvas(res, res), g = c.getContext('2d'), k = res / rect.w, cx = (0 - (rect.cx - rect.w / 2)) * k, cz = (0 - (rect.cz - rect.d / 2)) * k, R = TG.floor;
  g.save(); g.translate(cx, cz); g.scale(k, k);
  g.fillStyle = '#ece8e0'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  for (let i = 0; i < 50; i++) { let x = (r() - 0.5) * 2 * R, y = (r() - 0.5) * 2 * R, a = r() * TAU; g.strokeStyle = `rgba(130,128,124,${0.1 + r() * 0.14})`; g.lineWidth = 0.02 + r() * 0.04; g.beginPath(); g.moveTo(x, y); for (let n = 0; n < 14; n++) { x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5; a += (r() - 0.5) * 0.8; g.lineTo(x, y); } g.stroke(); }
  g.restore();
  const gold = 'rgba(196,150,60,.95)', ring = (rr, w) => { g.strokeStyle = gold; g.lineWidth = w; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); };
  ring(R - 0.15, 0.12); ring(R - 0.6, 0.05); ring(8.2, 0.05); ring(3.4, 0.05); ring(1.6, 0.05);
  const petals = (n, r0, r1, w, rot = 0) => { for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; g.save(); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, w, r0 + (r1 - r0) * 0.75, w * 0.5, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.75, -w * 0.5, r0 + (r1 - r0) * 0.3, -w, r0, 0); g.strokeStyle = gold; g.lineWidth = 0.05; g.stroke(); g.restore(); } };
  petals(24, 3.4, 8.2, 1.1); petals(24, 4.2, 7.0, 0.5, TAU / 48); petals(12, 1.6, 3.3, 0.6);
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; g.beginPath(); g.arc(Math.cos(a) * (R - 1.3), Math.sin(a) * (R - 1.3), 0.5, a + Math.PI / 2, a - Math.PI / 2); g.strokeStyle = gold; g.lineWidth = 0.04; g.stroke(); }
  g.restore();
  return c;
}
// Water lit from below: turquoise, its ripples' caustics moving
function poolMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 } }, transparent: true,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT; uniform float uK; varying vec3 vW;
      void main(){
        vec2 p = vW.xz * 1.4; float c = 0.0;
        for (int i = 0; i < 3; i++) { float fi = float(i); c += abs(sin(p.x * (1.0 + fi * 0.7) + uT * (0.6 + fi * 0.2) + sin(p.y * 1.3 + uT * 0.5)) * sin(p.y * (1.1 + fi * 0.6) - uT * 0.4 + sin(p.x * 0.9)));
        }
        c = pow(c / 3.0, 3.0);
        vec3 col = mix(vec3(0.02, 0.32, 0.42), vec3(0.15, 0.85, 0.92), 0.55) + vec3(0.6, 1.0, 1.0) * c * 0.9;
        gl_FragColor = vec4(col * uK, 0.92);
      }`
  });
}
// The sea: deep blue, darker far off, the moon's path a broken band of gold glints towards it, the swell moving
function seaMaterial(moonX, moonZ) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uMoon: { value: new THREE.Vector2(moonX, moonZ) } }, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT; uniform vec2 uMoon; varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        float d = length(vW.xz); vec3 col = mix(vec3(0.03, 0.08, 0.17), vec3(0.06, 0.12, 0.24), smoothstep(40.0, 600.0, d));
        // the moon's path: within a narrowing band towards the moon, glints that come and go with the swell
        vec2 dir = normalize(uMoon); float along = dot(vW.xz, dir), across = abs(dot(vW.xz, vec2(-dir.y, dir.x)));
        float band = smoothstep(4.0 + along * 0.11, 0.0, across) * step(0.0, along);
        vec2 cell = floor(vW.xz * vec2(1.6, 0.6)); float g = h(cell + floor(uT * 1.7)); float glint = step(0.62, g) * band;
        float swell = 0.5 + 0.5 * sin(vW.x * 0.35 + uT * 0.6) * sin(vW.z * 0.22 - uT * 0.5);
        col += vec3(1.0, 0.82, 0.55) * (glint * (0.6 + 0.6 * swell) + band * 0.12);
        col += vec3(0.05, 0.08, 0.12) * swell * 0.4;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
}
// A falling sheet of water, lit from below: streaks running down, brighter at the foot where it hits
function fallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uT; uniform float uK; varying vec2 vUv;
      float h(float x) { return fract(sin(x * 91.7) * 4375.85); }
      void main(){
        float col = floor(vUv.x * 90.0), sp = 0.6 + h(col) * 0.8, s = fract(vUv.y * 3.0 + uT * sp + h(col + 3.0));
        float streak = smoothstep(0.0, 0.4, s) * smoothstep(1.0, 0.6, s) * (0.4 + 0.6 * h(col + 7.0));
        float foot = smoothstep(0.35, 0.0, vUv.y);
        vec3 c = vec3(0.45, 0.85, 1.0) * (0.25 + 0.75 * streak) + vec3(0.8, 0.95, 1.0) * foot * 0.6;
        gl_FragColor = vec4(c * uK, (0.55 + 0.35 * streak) * smoothstep(1.0, 0.94, vUv.y));
      }`
  });
}
// A glass petal: clear in the middle, iridescent towards the edges (cyan to pink to violet), fine veins, a bright rim
function glassPetal() {
  return canvasTexture(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const shape = () => { g.beginPath(); g.moveTo(w / 2, h); g.bezierCurveTo(w * 0.02, h * 0.66, w * 0.08, h * 0.18, w / 2, 2); g.bezierCurveTo(w * 0.92, h * 0.18, w * 0.98, h * 0.66, w / 2, h); g.closePath(); };
    shape(); const gr = g.createLinearGradient(0, h, w, 0); gr.addColorStop(0, 'rgba(120,230,255,.55)'); gr.addColorStop(0.45, 'rgba(255,200,240,.4)'); gr.addColorStop(0.8, 'rgba(170,150,255,.5)'); gr.addColorStop(1, 'rgba(255,240,200,.6)'); g.fillStyle = gr; g.fill();
    g.save(); shape(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 8); g.stroke();
    for (let i = 1; i < 9; i++) { const y = h * (1 - i / 9.5); [-1, 1].forEach((sd) => { g.lineWidth = 0.8; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + sd * w * 0.22, y - h * 0.05, w / 2 + sd * w * 0.42, y - h * 0.12); g.stroke(); }); }
    g.restore(); shape(); g.strokeStyle = 'rgba(230,250,255,.95)'; g.lineWidth = 2.5; g.stroke();
  });
}
function moonTexture() {
  const r = seeded(4);
  return canvasTexture(512, 512, (g, w) => {
    const cx = w / 2, R = w * 0.4;
    const halo = g.createRadialGradient(cx, cx, R * 0.9, cx, cx, w / 2); halo.addColorStop(0, 'rgba(255,230,180,.5)'); halo.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = halo; g.fillRect(0, 0, w, w);
    const f = g.createRadialGradient(cx - R * 0.25, cx - R * 0.25, R * 0.1, cx, cx, R); f.addColorStop(0, '#fff6e0'); f.addColorStop(0.7, '#f4dcaa'); f.addColorStop(1, '#d8b47a'); g.fillStyle = f; g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.clip();
    for (let i = 0; i < 16; i++) { const x = cx + (r() - 0.5) * R * 1.6, y = cx + (r() - 0.5) * R * 1.6, rr = R * (0.06 + r() * 0.2); g.fillStyle = `rgba(170,130,80,${0.12 + r() * 0.16})`; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, r() * 3, 0, TAU); g.fill(); }
    g.restore();
  });
}
// The sky: night blue, a little warmer at the horizon, stars; the moon huge and low over the sea, beyond the band
function seaSky(tier) {
  const root = new THREE.Group(), phone = tier.name === 'phone';
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { c0: { value: new THREE.Color('#06101e') }, c1: { value: new THREE.Color('#2a3a5e') }, c2: { value: new THREE.Color('#14224a') }, c3: { value: new THREE.Color('#050a20') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h < 0.0 ? c0 : h < 0.1 ? mix(c1, c2, h / 0.1) : mix(c2, c3, clamp((h - 0.1) / 0.6, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }'
  }));
  dome.renderOrder = -10; root.add(dome);
  const r = seeded(29), n = phone ? 600 : 1100, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = r() * TAU, el = Math.asin(0.14 + Math.pow(r(), 0.7) * 0.86), R = 800, k = 0.3 + r() * 0.7; pos[i * 3] = Math.cos(a) * Math.cos(el) * R; pos[i * 3 + 1] = Math.sin(el) * R; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * R; col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  root.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true })));
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), fog: false, depthWrite: false, transparent: true }));
  const az = 0.08, el = 0.075, R = 700; moon.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, Math.cos(az) * Math.cos(el) * R); moon.scale.setScalar(R * 0.24); root.add(moon);
  return { root, moonLight: { dir: moon.position.clone().normalize(), intensity: 0.45 }, info: { moonAz: az } };
}

/* ---------- the venue ---------- */
function tideglass(kit, root, tier, TH, r, data) {
  const phone = tier.name === 'phone', sp = data.spec, TG = sp.plan, S = sp.stage, D = newDecor(kit, root), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const tv = travertine(phone ? 512 : 1024), decalRect = { cx: 0, cz: 0, w: 24, d: 24 };
  const floorMesh = ground(root, { map: tv.map, normalMap: tv.normal, normalScale: 0.35, roughness: 0.45, decal: floorDecal(decalRect, phone ? 1024 : 2048, TG), decalRect }, 56, 50, -2, tier.shadows);
  floorMesh.material.userData.env = 0.8;
  const animated = [];

  /* the sea, beyond the terrace and below it, out to the horizon; an island and a far coast with its lights */
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), seaMaterial(Math.sin(0.08), Math.cos(0.08))); sea.rotation.x = -Math.PI / 2; sea.position.y = -3.2; sea.userData.dynamic = true; root.add(sea); animated.push(sea.material);
  // the terrace stands on a wall down to the sea
  const cliff = std('#6a6258', 0.85, 0.05);
  [[0, TG.edgeZ + 0.3, 56, 0.6, 0], [-28.2, -2, 0.6, 50, 0], [28.2, -2, 0.6, 50, 0]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.6, d), cliff); m.position.set(x, -1.6, z); root.add(m); });
  const isl = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 8, 0, TAU, 0, Math.PI / 2), std('#0a1018', 0.95)); isl.scale.set(2.2, 0.35, 1); isl.position.set(150, -3.2, 420); root.add(isl);
  const coast = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 8, 0, TAU, 0, Math.PI / 2), std('#080c14', 0.95)); coast.scale.set(3.4, 0.4, 1); coast.position.set(-480, -3.2, 520); root.add(coast);
  for (let i = 0; i < (phone ? 40 : 90); i++) { const t = r(); kit.bulbs.add(lerp(-620, -300, t), -1 + r() * 18 * (1 - Math.abs(t - 0.5)), 440 + r() * 60, i, { color: r() < 0.7 ? '#ffd8a0' : '#cfe0ff', k: 0.7, s: 1.6, twinkle: 0.2, layer: 'ambient' }); }

  /* the pool ring round the floor: water lit from below, a stone coping either side, candles floating, four crossings */
  const pool = new THREE.Mesh(new THREE.RingGeometry(TG.pool[0], TG.pool[1], 128), poolMaterial()); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.02; pool.userData.dynamic = true; root.add(pool); animated.push(pool.material);
  [TG.pool[0] - 0.08, TG.pool[1] + 0.08].forEach((rr) => { const cp = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.12, 4, 128), std('#e8e2d6', 0.5)); cp.rotation.x = Math.PI / 2; cp.scale.z = 0.4; cp.position.y = 0.04; root.add(cp); });
  [0, 90, 180, 270].forEach((d) => { const a = d * Math.PI / 180, mid = (TG.pool[0] + TG.pool[1]) / 2, br = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, TG.pool[1] - TG.pool[0] + 0.5), std('#e8e2d6', 0.45)); br.position.set(Math.cos(a) * mid, 0.07, Math.sin(a) * mid); br.rotation.y = Math.PI / 2 - a; root.add(br); });
  for (let i = 0; i < (phone ? 20 : 40); i++) { const a = r() * TAU, d = lerp(TG.pool[0] + 0.25, TG.pool[1] - 0.25, r()); if ([0, 90, 180, 270].some((dd) => Math.abs(((a * 180 / Math.PI - dd + 540) % 360) - 180) < 9)) continue; kit.flames.add(Math.cos(a) * d, 0.06, Math.sin(a) * d, { bowl: 'clay', s: 0.04, k: 0.8 }); }
  // (the pool's light reaches only a little way onto the marble either side of it)
  for (let i = 0; i < 24; i++) { const a = (i + 0.5) / 24 * TAU, rr = (TG.pool[0] + TG.pool[1]) / 2; kit.pools.add(Math.cos(a) * rr, 0.02, Math.sin(a) * rr, 1.8, 1.8, AQUA, 0.05, { layer: 'architectural' }); }
  // the floor's gold rim, lit
  const rim = new THREE.Mesh(new THREE.TorusGeometry(TG.floor + 0.05, 0.05, 6, 128), kit.glow('#ffc870', 1.5, 'architectural')); rim.rotation.x = Math.PI / 2; rim.position.y = 0.03; root.add(rim);
  // an infinity pool along the terrace's edge over the sea, its far lip lost against the water
  const edgePool = new THREE.Mesh(new THREE.PlaneGeometry(52, 3.2), poolMaterial()); edgePool.rotation.x = -Math.PI / 2; edgePool.position.set(0, 0.015, TG.edgeZ - 1.4); edgePool.userData.dynamic = true; root.add(edgePool); animated.push(edgePool.material);

  /* the waterfall wall on the left: a wall of stone with greenery on top, three falls of water lit blue */
  const wallZ0 = -12, wallZ1 = 12, X = TG.falls;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6, wallZ1 - wallZ0), std('#8a8274', 0.75)); wall.position.set(X - 0.8, 3, 0); root.add(wall);
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(2.6, wallZ1 - wallZ0), poolMaterial()); basin.rotation.set(-Math.PI / 2, 0, Math.PI / 2); basin.position.set(X + 1.3, 0.025, 0); basin.userData.dynamic = true; root.add(basin); animated.push(basin.material);
  [-7, 0, 7].forEach((z) => { const fm = fallMaterial(), f = new THREE.Mesh(new THREE.PlaneGeometry(5, 5.8), fm); f.position.set(X + 0.05, 2.9, z); f.rotation.y = Math.PI / 2; f.userData.dynamic = true; root.add(f); animated.push(fm); kit.pools.add(X + 0.1, 2.9, z, 2.6, 2.9, '#6ad8ff', 0.18, { vertical: true, ry: Math.PI / 2, layer: 'architectural' }); kit.pools.add(X + 1.6, 0.03, z, 2.6, 2.2, AQUA, 0.14, { layer: 'architectural' }); });
  for (let z = wallZ0 + 1; z < wallZ1; z += 1.6) D.palm(X - 0.8, z, 0.7 + (z % 3) * 0.08, 6);

  /* glass flower sculptures between the beds: fans of iridescent petals, lit from within */
  const petals = [], petalGeo = new THREE.PlaneGeometry(1, 1); petalGeo.translate(0, 0.5, 0);
  const sculpture = (x, z, s) => {
    for (let k = 0; k < 9; k++) { const az = k / 9 * TAU + r() * 0.3, tilt = 0.35 + (k % 3) * 0.18; petals.push(mx.compose(new THREE.Vector3(x, 0.4, z), q.setFromEuler(e.set(tilt, az, 0, 'YXZ')), new THREE.Vector3(1.1 * s, 2.6 * s, 1)).clone()); }
    for (let k = 0; k < 5; k++) { const az = k / 5 * TAU + 0.4; petals.push(mx.compose(new THREE.Vector3(x, 0.4, z), q.setFromEuler(e.set(0.12, az, 0, 'YXZ')), new THREE.Vector3(0.8 * s, 3.2 * s, 1)).clone()); }
    kit.bigBulbs.add(x, 0.9 * s, z, 0, { color: '#c8f0ff', k: 1.0, s: 0.5, twinkle: 0.1, layer: 'architectural' }); kit.pools.add(x, 0.02, z, 2.4 * s, 2.4 * s, '#8ae0ff', 0.12, { layer: 'architectural' });
  };
  [[-14.5, 9], [14.5, 9], [-15.5, -4], [15.5, -4], [-9.5, 16], [9.5, 16.2], [-6.5, -16], [6.5, -16]].forEach(([x, z], i) => sculpture(x, z, 1 + (i % 3) * 0.18));
  const glassMat = kit.litMap(glassPetal(), 1.3, 'architectural', { transparent: true, depthWrite: false, side: THREE.DoubleSide });
  { const im = new THREE.InstancedMesh(petalGeo, glassMat, petals.length); petals.forEach((m, i) => im.setMatrixAt(i, m)); root.add(im); }

  /* beds of glowing flora round the terrace: leaves, pink and blue flowers, little glowing mushrooms; lanterns */
  const beds = new Shape(), flowers = [[], []], caps = [];
  const bed = (x, z, s) => {
    const a0 = r() * TAU;
    for (let i = 0; i < 7; i++) { const az = a0 + i / 7 * TAU, L = s * (0.7 + r() * 0.5), W = L * 0.5, el = 0.5 + r() * 0.6, hor = [Math.cos(az), Math.sin(az)], sv = [Math.cos(az + Math.PI / 2), Math.sin(az + Math.PI / 2)];
      const mid = [x + hor[0] * Math.cos(el) * L * 0.5, Math.sin(el) * L * 0.55, z + hor[1] * Math.cos(el) * L * 0.5], tip = [x + hor[0] * L * 0.9, Math.sin(el) * L * 0.6, z + hor[1] * L * 0.9];
      const b0 = [x - sv[0] * 0.03, 0.03, z - sv[1] * 0.03], b1 = [x + sv[0] * 0.03, 0.03, z + sv[1] * 0.03], m0 = [mid[0] - sv[0] * W / 2, mid[1], mid[2] - sv[1] * W / 2], m1 = [mid[0] + sv[0] * W / 2, mid[1], mid[2] + sv[1] * W / 2];
      beds.tri(b0, b1, m1, [0.45, 0], [0.55, 0], [1, 0.5]); beds.tri(b0, m1, m0, [0.45, 0], [1, 0.5], [0, 0.5]); beds.tri(m0, m1, tip, [0, 0.5], [1, 0.5], [0.5, 1]); }
    for (let k = 0; k < 10; k++) flowers[k % 2].push([x + (r() - 0.5) * s * 1.8, 0.2 + r() * 0.5, z + (r() - 0.5) * s * 1.8]);
    if (r() < 0.5) for (let k = 0; k < 3; k++) caps.push([x + (r() - 0.5) * s, z + (r() - 0.5) * s, 0.08 + r() * 0.08]);
  };
  for (let i = 0; i < (phone ? 22 : 40); i++) { const a = (i + r() * 0.5) / (phone ? 22 : 40) * TAU, d = TG.pool[1] + 1.4 + r() * 1.2, x = Math.cos(a) * d, z = Math.sin(a) * d; if ([0, 90, 180, 270].some((dd) => Math.abs(((a * 180 / Math.PI - dd + 540) % 360) - 180) < 12)) continue; if (Math.abs(x) < 6 && z > 12) continue; bed(x, z, 0.9 + r() * 0.5); }
  const shrub = canvasTexture(64, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, h); g.bezierCurveTo(0, h * 0.6, w * 0.1, h * 0.15, w / 2, 0); g.bezierCurveTo(w * 0.9, h * 0.15, w, h * 0.6, w / 2, h); const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#0e2a1e'); gr.addColorStop(1, '#2a6a4a'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(160,240,200,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 4); g.stroke(); });
  root.add(new THREE.Mesh(beds.geometry(), kit.selfLit(new THREE.MeshStandardMaterial({ map: shrub, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }), 0.1, 'architectural')));
  ['#ff7ac8', '#6ac8ff'].forEach((c, k) => { if (!flowers[k].length) return; const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), kit.glow(c, 1.3, 'architectural'), flowers[k].length); flowers[k].forEach(([x, y, z], i) => fm.setMatrixAt(i, mx.makeTranslation(x, y, z))); root.add(fm); });
  if (caps.length) { const cm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 5, 0, TAU, 0, Math.PI / 2), kit.glow('#ffc88a', 1.0, 'architectural'), caps.length); caps.forEach(([x, z, s], i) => cm.setMatrixAt(i, mx.compose(new THREE.Vector3(x, s * 1.6, z), q.identity(), new THREE.Vector3(s, s * 0.5, s)))); root.add(cm); }
  // lanterns along the floor's edge and the paths, candles on the steps
  for (let i = 0; i < 28; i++) { const a = (i + 0.5) / 28 * TAU; if ([0, 90, 180, 270].some((dd) => Math.abs(((a * 180 / Math.PI - dd + 540) % 360) - 180) < 8)) continue; D.lantern(Math.cos(a) * (TG.pool[1] + 0.6), 0, Math.sin(a) * (TG.pool[1] + 0.6), 0.9); }
  for (let x = -24; x <= 24; x += 2) if (Math.abs(x) > 6) D.lantern(x, 0, TG.edgeZ - 3.4, 0.8);

  /* the cabanas: white curtains on a frame, a flat canopy hung with lights, a white sofa and a low table inside */
  const curtain = new THREE.MeshStandardMaterial({ color: '#f4f0ea', roughness: 0.9, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const curtGeo = (() => { const g2 = new THREE.PlaneGeometry(1.2, 2.8, 12, 1), p = g2.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.08 * Math.sin(p.getX(i) * 9)); g2.computeVertexNormals(); return g2; })();
  TG.cabanas.forEach(([x, z, ry]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 3.4), std('#d8d0c4', 0.6)); base.position.y = 0.1; g.add(base);
    [[-1.9, -1.6], [1.9, -1.6], [-1.9, 1.6], [1.9, 1.6]].forEach(([px, pz]) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3, 0.12), std('#e8e2d8', 0.5)); post.position.set(px, 1.6, pz); g.add(post); });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.18, 3.7), std('#f0ece4', 0.6)); roof.position.y = 3.15; g.add(roof);
    // curtains gathered at the posts, a back drape
    [[-1.7, 1.6], [1.7, 1.6], [-1.7, -1.6], [1.7, -1.6]].forEach(([px, pz]) => { const c = new THREE.Mesh(curtGeo, curtain); c.position.set(px, 1.6, pz); c.scale.x = 0.45; g.add(c); });
    const backD = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.8, 24, 1), curtain); backD.position.set(0, 1.6, -1.65); g.add(backD);
    const wx = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, 0, z));
    for (let k = 0; k < 9; k++) { const p = wx(lerp(-2, 2, k / 8), 1.75); kit.bulbs.add(p.x, 3.0, p.z, k, { color: '#ffe0b0', k: 0.7, s: 0.6, twinkle: 0.3, layer: 'festive' }); }
    const sofaAt = wx(0, -0.9); D.sofa(sofaAt.x, sofaAt.z, ry, 2.8, { y: 0.2, wood: '#e8e2d8', seat: '#f4f0ea', cushions: ['#d8c8e8', '#a8d8e8', '#f4e0c8'] });
    const tAt = wx(0, 0.4); D.table(tAt.x, tAt.z, 1.0, 0.6, { y: 0.2, candles: 1, wood: '#7a5a3a' });
    kit.pools.add(x, 0.25, z, 2.2, 2.0, '#ffd8a8', 0.14, { layer: 'practical', live: true });
  });

  /* the band's deck by the sea: carved wooden arches either side and across the back, flowers twined up them */
  const st = new THREE.Group(); root.add(st);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0 + 1, S.h, S.depth + 0.6), std('#7a5434', 0.55, 0.05)); deck.position.set(0, S.h / 2, S.z + S.depth / 2); st.add(deck);
  [0.2, 0.4].forEach((h, k) => { const step = new THREE.Mesh(new THREE.BoxGeometry(4, h, 0.4), std('#6a4428', 0.6)); step.position.set(0, h / 2, S.z - 0.2 - k * 0.4); st.add(step); });
  D.rug(0, S.z + 1.6, S.x1 - S.x0 - 0.6, 2.4, 0, rugTexture('persian', ['#7a1424', '#1c3a6a', '#d6a64a', '#f3e6d0']), S.h + 0.006);
  const bandHoles = buildBand(kit, st, BAND.sheri, { x0: S.x0, x1: S.x1, front: S.bandFront, floor: S.h, small: true, back: S.z + S.depth, wash: '#7fe8ff' });
  const carved = std('#5a3a20', 0.55, 0.05), archShape = (w, h) => { const s2 = new THREE.Shape(); s2.moveTo(-w / 2 - 0.4, 0); s2.lineTo(w / 2 + 0.4, 0); s2.lineTo(w / 2 + 0.4, h + 0.6); s2.lineTo(-w / 2 - 0.4, h + 0.6); s2.closePath(); const hole = new THREE.Path(); hole.moveTo(w / 2, 0); hole.lineTo(w / 2, h - w / 2); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI, rr = w / 2 * (1 - 0.06 * Math.abs(Math.sin(a * 7))); hole.lineTo(Math.cos(a) * rr, h - w / 2 + Math.sin(a) * rr); } hole.lineTo(-w / 2, 0); hole.closePath(); s2.holes.push(hole); const geo = new THREE.ExtrudeGeometry(s2, { depth: 0.3, bevelEnabled: false }); geo.translate(0, 0, -0.15); return geo; };
  [[-S.x1 - 0.6, S.z + 1.6, Math.PI / 2, 3.0], [S.x1 + 0.6, S.z + 1.6, Math.PI / 2, 3.0], [-3.2, S.z + S.depth + 0.2, 0, 3.0], [3.2, S.z + S.depth + 0.2, 0, 3.0]].forEach(([x, z, ry, w]) => { const m = new THREE.Mesh(archShape(w, 3.4), carved); m.position.set(x, S.h, z); m.rotation.y = ry; st.add(m); });
  const garland = [];
  [[-S.x1 - 0.6, S.z + 0.2], [S.x1 + 0.6, S.z + 0.2], [-S.x1 - 0.6, S.z + 3.0], [S.x1 + 0.6, S.z + 3.0]].forEach(([x, z]) => { for (let y = 0.3; y < 4.0; y += 0.12) garland.push([x + 0.2 * Math.sin(y * 4), S.h + y, z + 0.2 * Math.cos(y * 4)]); });
  { const gm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), std('#ffffff', 0.85), garland.length), c = new THREE.Color(); garland.forEach(([x, y, z], i) => { gm.setMatrixAt(i, mx.makeTranslation(x, y, z)); gm.setColorAt(i, c.set(['#ff7ab0', '#fff0f0', '#ffb84a', '#3a8a3a'][i % 4])); }); root.add(gm); }
  [S.x0 - 0.2, S.x1 + 0.2].forEach((x) => { D.lantern(x, S.h, S.z + 0.2, 1); D.lantern(x * 0.6, 0, S.z - 1.0, 0.9); });
  kit.pools.add(0, 0.02, S.z - 1.6, 4.5, 2.4, LIGHT.warm, 0.14, { layer: 'show' });

  /* sofas round the pool ring, palms along the terrace's sides */
  (TG.seats || []).forEach((sf) => {
    D.sofa(sf.x, sf.z, sf.ry, sf.len, { wood: '#d8d0c4', seat: '#f4f0ea', cushions: ['#a8d8e8', '#d8c8e8', '#f4e0c8', '#3ab0c0'] });
    if (!sf.near) D.lantern(sf.x + Math.sin(sf.ry) * 1.1, 0, sf.z + Math.cos(sf.ry) * 1.1, 0.8);
  });
  [[-25, -14], [-25, 14], [25, -14], [25, 14], [24, 0], [-12, 20], [12, 20]].forEach(([x, z]) => D.palm(x, z, 1.25));
  /* inland, behind the terrace: wooded hills climbing away, villas lit among them; the coast's hills on the horizon */
  const land = [Math.PI + 0.05, TAU - 0.05], onTerrace = (x, z) => Math.abs(x) < 31 && z > -30;
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(1400, 700), std('#0c1814', 0.95)); shore.rotation.x = -Math.PI / 2; shore.position.set(0, -0.08, -27.4 - 350); root.add(shore);
  forestBelt(kit, root, { r0: 31, r1: 120, n: phone ? 260 : 560, h: [8, 16], seed: 121, arc: land, round: false, tones: ['#0e2420', '#12302a', '#0c1e1a'], skip: onTerrace });
  townBelt(kit, root, { r0: 45, r1: 120, n: phone ? 30 : 60, style: 'old', seed: 123, arc: land, skip: onTerrace, wall: '#d8d0c4', h: [4, 8] });
  horizonRidge(root, { radius: 160, base: -4, height: 30, seed: 21, arc: land, cols: ['#060c14', '#0e1a26'] });
  D.finish();

  // what the marble, the water and the glass reflect: the moonlit sea and the pool's light
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: '#0a1428', side: THREE.BackSide })));
  const em = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe8c0').multiplyScalar(2.6) })); em.position.set(3, 6, 45); env.add(em);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 3 ? '#ffc88a' : AQUA).multiplyScalar(2.6) })); m.position.set(Math.cos(a) * 18, 1, Math.sin(a) * 18); env.add(m); }

  const rig = {
    hemi: ['#3a5080', '#1a1a18', 0.5, 0.74], moon: 1,
    spots: [{ pos: [4, 22, 60], to: [0, 0, 0], color: '#ffe8c8', base: 50, distance: 100, angle: 0.5, layer: 'key' }, { pos: [0, 5.5, S.z - 4.5], to: [0, S.h + 1.1, S.z + 1.6], color: '#ffe0b8', base: 70, distance: 14, angle: 0.6, layer: 'show' }],
    points: [{ pos: [0, 5, 0], color: '#fff0dc', base: 22, distance: 16, layer: 'practical' }, { pos: [-16, 3, 0], color: '#6ad8ff', base: 30, distance: 14, layer: 'architectural' }, { pos: [16, 3, 2], color: '#ffc88a', base: 26, distance: 14, layer: 'practical' }, { pos: [0, 3, -14], color: '#ffc88a', base: 22, distance: 12, layer: 'practical' }]
  };
  return {
    rig, bandHoles, floor: floorMesh, fog: new THREE.FogExp2('#0e1a30', 0.0042), exposure: 1.02, envScene: env,
    update(t, ctx) { const tt = ctx.reduce ? 0 : t, k = 0.55 + 0.45 * (ctx.lv.architectural || 0); animated.forEach((m) => { m.uniforms.uT.value = tt; if (m.uniforms.uK) m.uniforms.uK.value = k; }); }
  };
}

export default { seed: 1515, sky: seaSky, garbo: 'bare', garboK: 7, land: false, build: tideglass };
