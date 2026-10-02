// The 3D venue backdrop. The 2D venue scene keeps drawing everything that lives and moves (people, band, garbo,
// stalls, screens' pictures, effects) on its own canvas; this draws the venue under it, in WebGL, through the 2D
// scene's own camera. Each frame the 2D scene calls draw(view, state):
//   view  — where its camera stands (x, y, z in its metres, yaw) and how it projects (F: pixels per unit at a distance
//           of one metre, cx/cy: where straight ahead lands on the canvas, W/H: the canvas in CSS pixels);
//   state — the venue, theme and the night's light (on, lit, bright, pulse, beat), time, and the listener.
// draw returns true when it drew the venue, 'wait' while that venue is still being built and compiled (off the main
// thread; the 2D scene holds a dark frame rather than show its own venue first), and false when it can't draw at all
// (the context is lost), when the 2D scene draws its own venue instead.
//
// opts.furnish(id) gives the 2D scene's layout for a venue (stalls, props, seats, the DJ), so the stalls, chairs and
// vehicles built here stand exactly where the 2D scene puts the people at them. Each venue's code is its own file,
// fetched when that venue is first wanted. Once the first venue is up, its neighbours in the venue list are built in
// the background, up to what the device can hold (KEEP); past that, the venue left longest ago is let go.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp, THEMES } from './util.js';
import { buildVenue, venueModule, venueFailed, knownVenue, VENUE_IDS } from './venue.js';
import { Levels } from './lighting.js';
import { updateLit } from './kit.js';
import { buildDrone, aimFeed, aimClose } from './drone.js';

// What the device can afford: a pixel budget, real-time shadows, how finely the bloom is drawn, and how many lights
// (keep: how many venues it holds built at once, the one you're in included)
const TIERS = {
  phone: { name: 'phone', pixels: 0.9e6, shadows: false, shadowSize: 0, bloomScale: 0.35, spots: 0, points: 2, samples: 0, keep: 1 },
  tablet: { name: 'tablet', pixels: 1.6e6, shadows: false, shadowSize: 0, bloomScale: 0.45, spots: 2, points: 4, samples: 2, keep: 2 },
  desktop: { name: 'desktop', pixels: 1.8e6, shadows: true, shadowSize: 2048, bloomScale: 0.5, spots: 2, points: 5, samples: 2, keep: 3 }
};

export function supported() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

export function create(canvas, opts = {}) {
  const TIER = TIERS[opts.tier] || TIERS.desktop;

  const gl = document.createElement('canvas');
  gl.setAttribute('aria-hidden', 'true');
  gl.className = 'venue-backdrop';
  gl.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;';
  canvas.parentNode.insertBefore(gl, canvas);

  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  // Neutral keeps each light's colour and rolls its highlights off softly (filmic tone mapping clipped them hard, so
  // lamps and lit ground read harsh)
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = TIER.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // the venue doesn't move: shadows are drawn once per venue
  renderer.setClearColor('#07060d');

  const scene = new THREE.Scene();
  // World space is the 2D scene's (X right, Y up, Z away from you); mirroring Z maps it into three.js's space
  const world = new THREE.Group(); world.scale.z = -1; scene.add(world);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 1400);
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: TIER.samples });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- one light rig for every venue (a fixed count, so shaders compile once) ---------- */
  const rig = { spots: [], points: [] };
  rig.hemi = new THREE.HemisphereLight('#4a4470', '#3a2415', 0.6); world.add(rig.hemi);
  rig.moon = new THREE.DirectionalLight('#9fb0e0', 0); world.add(rig.moon); world.add(rig.moon.target);
  for (let i = 0; i < TIER.spots; i++) {
    const sp = new THREE.SpotLight('#ffe6c4', 0, 60, 0.7, 0.7, 1.1);
    if (i === 0 && TIER.shadows) { sp.castShadow = true; sp.shadow.mapSize.set(TIER.shadowSize, TIER.shadowSize); sp.shadow.bias = -0.0006; sp.shadow.normalBias = 0.02; sp.shadow.camera.near = 3; sp.shadow.camera.far = 80; }
    world.add(sp); world.add(sp.target); rig.spots.push({ light: sp, base: 0 });
  }
  for (let i = 0; i < TIER.points; i++) { const p = new THREE.PointLight('#ffc890', 0, 20, 1.4); world.add(p); rig.points.push({ light: p, base: 0 }); }
  function applyRig(v) {
    const R = v.rig;
    rig.hemi.color.set(R.hemi[0]); rig.hemi.groundColor.set(R.hemi[1]);
    // Without the spotlights a phone lights the venue a little more from the sky
    rig.hemi.userData.base = TIER.spots ? R.hemi[2] : R.hemi[3];
    rig.moon.userData.base = v.sky && R.moon ? v.sky.moonLight.intensity : 0;
    if (v.sky) rig.moon.position.copy(v.sky.moonLight.dir).multiplyScalar(80);
    rig.spots.forEach((s, i) => {
      const c = R.spots[i]; s.base = c ? c.base : 0; s.layer = c && c.layer || 'key';
      if (!c) return;
      s.light.position.set(c.pos[0], c.pos[1], c.pos[2]); s.light.target.position.set(c.to[0], c.to[1], c.to[2]);
      s.light.color.set(c.color); s.light.distance = c.distance; s.light.angle = c.angle;
    });
    // The first point light is the garbo's lamp, lighting the ground round the circle
    rig.points.forEach((p, i) => {
      const c = i === 0 ? v.garboLight : R.points[i - 1]; p.base = c && i > 0 ? c.base : 0; p.layer = i === 0 ? 'garbo' : c && c.layer || 'practical';
      if (!c) return;
      p.light.position.set(c.pos[0], c.pos[1], c.pos[2]); p.light.color.set(c.color); p.light.distance = c.distance;
    });
    renderer.shadowMap.needsUpdate = true;
  }

  /* ---------- the drone and its picture ----------
     The drone flies where the 2D scene puts it. Its aerial picture of the venue is drawn into a small target, only
     when the 2D scene's shot changes (the 2D scene draws the shot's people over it at the same moment), and shown on
     the venue's LED screen. Phones keep the 2D scene's own drawn map instead. */
  // Close shots (a child running through, the two of you, the lead singer) are filmed at ground level into a much
  // smaller picture: shown on the big screen it's soft, as the background of a shot focused on its subject is
  const drone = buildDrone(world), feedCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 5, 200), closeCam = new THREE.PerspectiveCamera(40, 1.8, 0.3, 400), aerialOK = TIER.name !== 'phone';
  const targets = {};
  let feedN = -1;
  function feedTarget(key, w, h) {
    const t = targets[key];
    if (t && t.width === w && t.height === h) return t;
    if (t) t.dispose();
    return (targets[key] = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }));
  }
  function feed(v, a, alt) {
    const fs = v.feedScreen;
    if (!fs) return;
    if (!aerialOK || !a) { fs.visible = false; return; }
    const top = a.close ? 320 : TIER.name === 'desktop' ? 640 : 480, fw = Math.max(128, Math.min(top, Math.round((a.px || top) / 64) * 64)), rt = feedTarget(a.close ? 'close' : 'aerial', fw, Math.max(64, Math.min(400, Math.round(fw / a.aspect)))), u = fs.material.uniforms;
    if (u.map.value !== rt.texture) { u.map.value = rt.texture; u.texel.value.set(1 / rt.width, 1 / rt.height); feedN = -1; }
    u.blur.value = a.close ? 1.8 : 0;
    if (a.n !== feedN) {
      feedN = a.n;
      const cam = a.close ? closeCam : feedCam;
      if (a.close) aimClose(closeCam, a); else aimFeed(feedCam, a, alt);
      const fog = scene.fog, dv = drone.group.visible, skyAt = v.sky ? v.sky.root.position.clone() : null; fs.visible = false;
      // From above, no fog and no sky dome; at ground level, the night as you'd see it
      if (!a.close) { scene.fog = null; drone.group.visible = false; if (v.sky) v.sky.root.visible = false; }
      else if (v.sky) v.sky.root.position.set(a.eye[0], 0, a.eye[2]);
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null);
      scene.fog = fog; drone.group.visible = dv; if (v.sky) { v.sky.root.visible = true; v.sky.root.position.copy(skyAt); }
    }
    fs.visible = true;
  }
  // In an aarti the recording plays behind the scene through the stage screen: this canvas is opened over it
  let holeKey = '';
  function hole(r) {
    const k = r ? [r.x, r.y, r.w, r.h].map(Math.round).join(',') : '';
    if (k === holeKey) return; holeKey = k;
    gl.style.clipPath = r ? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${r.x}px ${r.y}px, ${r.x + r.w}px ${r.y}px, ${r.x + r.w}px ${r.y + r.h}px, ${r.x}px ${r.y + r.h}px, ${r.x}px ${r.y}px)` : '';
  }

  /* ---------- venues: fetched and built on first visit, compiled off the main thread ---------- */
  // (WAITING stands for a venue whose code is still on its way; a venue whose code can't be had isn't drawn at all, so
  // the 2D scene draws its own instead)
  const venues = {}, broken = {}, WAITING = { ready: false };
  let V = null, themeApplied = null, W = 1, H = 1, QP = 1, cropKey = '', lastTheme = 'traditional', stamp = 0;
  function venue(id, theme) {
    if (!knownVenue(id)) return null;
    if (!venues[id]) {
      const mod = venueModule(id, () => settle());
      if (mod === false || broken[id]) return null;
      if (!mod) return WAITING;
      // (a venue that fails to build is never tried again, and never takes the others down with it)
      let v; const t0 = performance.now();
      try { v = buildVenue(id, mod, TIER, theme, opts.furnish ? opts.furnish(id) : null); } catch (e) { broken[id] = true; if (window.console) console.error('3D venue ' + id + ' failed to build', e); return null; }
      v.buildMs = Math.round(performance.now() - t0);
      reflections(v);
      v.ready = false; v.root.visible = false; world.add(v.root);
      const done = () => { v.ready = true; settle(); warmNext(); };
      settle();
      (renderer.compileAsync ? renderer.compileAsync(v.root, camera, scene) : Promise.resolve(renderer.compile(v.root, camera, scene))).then(done, done);
      venues[id] = v;
    }
    venues[id].used = ++stamp;
    return venues[id];
  }
  // The venues next to yours in the list, built one at a time when the page is idle, so switching to them is instant;
  // never more than the device can hold (a phone holds only the venue you're in: a switch fades through a moment's
  // wait instead)
  let warming = false;
  function warmNext() {
    if (warming || lost || !V || Object.keys(venues).length >= TIER.keep) return;
    const at = VENUE_IDS.indexOf(V.id), n = VENUE_IDS.length;
    let next = null;
    for (let d = 1; d < n && !next; d++) [at + d, at - d].forEach((i) => { const id = VENUE_IDS[(i % n + n) % n]; if (!next && !venues[id] && !broken[id] && !venueFailed(id)) next = id; });
    if (!next) return;
    warming = true;
    // (its code is fetched first, if it hasn't come yet; then it's built when the page is next idle)
    const go = () => {
      if (lost || venues[next]) { warming = false; return; }
      const mod = venueModule(next, () => { warming = false; warmNext(); });
      if (mod === null) return;
      warming = false; settle(); if (mod) venue(next, lastTheme);
      if (broken[next]) warmNext();
    };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 600);
  }
  // What a polished surface reflects: a venue can give a small scene of its own surroundings (envScene), which is
  // turned into a blurred environment once, and given to the materials it marked (userData.env: how strongly each
  // reflects), before its shaders are compiled. Only those: materials shared with other venues are left as they are.
  function reflections(v) {
    if (!v.envScene) return;
    const pm = new THREE.PMREMGenerator(renderer);
    v.environment = pm.fromScene(v.envScene, 0.04).texture; pm.dispose();
    v.root.traverse((o) => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => {
      if (m.userData.env == null || m.envMap === v.environment) return;
      m.envMap = v.environment; m.envMapIntensity = m.userData.env; m.needsUpdate = true;
    }));
  }
  // A venue let go: out of the scene, its buffers and pictures freed (shared ones are uploaded again when next used)
  function drop(id) {
    const v = venues[id]; if (!v) return;
    world.remove(v.root); delete venues[id];
    if (v.environment) v.environment.dispose();
    v.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => ['map', 'emissiveMap', 'normalMap', 'alphaMap'].forEach((k) => m[k] && m[k].dispose()));
    });
    if (v.lightMaps && v.lightMaps.dispose) v.lightMaps.dispose();
  }
  // Past what the device can hold, the venues left longest ago are let go (once the switch has faded through)
  function trim() {
    const held = Object.keys(venues).map((id) => venues[id]).filter((v) => v !== V && v.ready).sort((a, b) => a.used - b.used);
    while (held.length && Object.keys(venues).length > TIER.keep) drop(held.shift().id);
  }
  function show(v) {
    settle(1500);
    if (V) V.root.visible = false;
    V = v; V.root.visible = true;
    setTimeout(trim, 1200);
    scene.fog = V.fog; V.fogBase = V.fog.density;
    applyRig(V);
    themeApplied = null;
  }

  /* ---------- the camera: the 2D scene's, exactly ---------- */
  function place(view) {
    camera.position.set(view.x, view.y, -view.z);
    camera.rotation.set(0, -(view.yaw || 0), 0);
    camera.updateMatrixWorld();
    const n = camera.near, f = camera.far, F = view.F;
    camera.projectionMatrix.makePerspective(-view.cx * n / F, (view.W - view.cx) * n / F, view.cy * n / F, -(view.H - view.cy) * n / F, n, f);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const dpr = clamp(Math.sqrt(TIER.pixels * QP * QP / (W * H)), 0.5, Math.min(2, window.devicePixelRatio || 1));
    // The 2D canvas can be cropped to stop where the player's controls begin; this one follows it
    gl.style.width = canvas.style.width || '100%'; gl.style.height = canvas.style.height || '100%';
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr); composer.setSize(W, H);
    bloom.resolution.set(Math.max(64, Math.round(W * dpr * TIER.bloomScale)), Math.max(64, Math.round(H * dpr * TIER.bloomScale)));
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
  resize();

  /* ---------- adaptive quality ----------
     The 2D scene steps its own quality down when frames run slow; this does the same for its part: fewer pixels,
     then no bloom, then drawing the (still) venue on every other frame. Building a venue or compiling its shaders,
     switching venues and coming back to the tab all stall a frame or two, so those moments don't count; and after
     several seconds of smooth frames it steps back up, a notch at a time, so one bad moment isn't kept for good. */
  let lastMs = 0, frameMs = 16, slowFor = 0, fastFor = 0, every = 1, count = 0, lastKey = '', graceUntil = 0;
  const settle = (ms = 2500) => { graceUntil = Math.max(graceUntil, performance.now() + ms); };
  const busy = () => warming || performance.now() < graceUntil || Object.keys(venues).some((k) => !venues[k].ready);
  function pace(ms) {
    if (lastMs && !document.hidden) {
      const gap = ms - lastMs; if (gap < 250) frameMs += (gap - frameMs) * 0.05;
      if (gap >= 250 || busy()) { slowFor = 0; fastFor = 0; }
      else {
        slowFor = frameMs > 30 ? slowFor + gap : 0;
        fastFor = frameMs < 19 ? fastFor + gap : 0;
        if (slowFor > (TIER.name === 'desktop' ? 2500 : 1400)) {
          if (QP > 0.6) { QP = Math.max(0.6, QP - 0.2); resize(); }
          else if (bloom.enabled) bloom.enabled = false;
          else every = 2;
          slowFor = 0; fastFor = 0; frameMs = 20;
        } else if (fastFor > 8000 && (every > 1 || !bloom.enabled || QP < 1)) {
          if (every > 1) every = 1;
          else if (!bloom.enabled) bloom.enabled = true;
          else { QP = Math.min(1, QP + 0.2); resize(); }
          fastFor = 0; frameMs = 18;
        }
      }
    }
    lastMs = ms;
  }

  const levels = new Levels();
  let lastT = 0, lost = false;
  gl.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  gl.addEventListener('webglcontextrestored', () => { lost = false; Object.keys(venues).forEach((k) => delete venues[k]); V = null; });

  function draw(view, s) {
    if (lost) return false;
    lastTheme = s.theme;
    const want = venue(s.venue, s.theme);
    if (!want) return false;
    if (!want.ready) { if (!V) { renderer.setRenderTarget(null); renderer.clear(); } return 'wait'; }
    if (V !== want) { show(want); warmNext(); }
    const ck = (canvas.style.width || '') + '|' + (canvas.style.height || '');
    if (ck !== cropKey) { cropKey = ck; resize(); }
    pace(performance.now());
    const TH = THEMES[s.theme] || THEMES.traditional;
    if (themeApplied !== s.theme) { V.kit.flags.setPalette(TH.flags); if (themeApplied) { V.lightMaps.repaint(TH); V.garbo.setTheme(TH); } themeApplied = s.theme; }
    // The lighting layers ease towards what the night calls for, every frame, drawn or not
    // (in the scene's own animation time, which stands still when motion is reduced)
    const dt = lastT ? Math.min(0.1, Math.max(0, s.T - lastT)) : 0.016; lastT = s.T;
    const lv = levels.update(dt, s);
    // A still camera on a still night needs no new frame: skip it when slowing down, or when motion is reduced
    const key = [view.x, view.y, view.z, view.yaw, view.F, view.cx, view.cy, view.W, view.H].map((v) => Math.round(v * 100)).join(',');
    const moved = key !== lastKey; lastKey = key;
    count++;
    if (!moved && (every > 1 && count % every) && !s.reduce) return true;
    if (!moved && s.reduce && V._drawn) return true;
    place(view);
    const pulse = s.reduce ? 0 : s.pulse || 0;
    // The garbo's layer burns as brightly as the lamp is lit, with its flicker
    const fl = s.reduce ? 1 : 0.85 + 0.1 * Math.sin(s.t * 11) * Math.sin(s.t * 7.3) + 0.05 * Math.sin(s.t * 23);
    const L = { ...lv, garbo: lv.garbo * levels.garboLit * fl };
    // (sponsors: what each sponsor place shows, from the 2D scene's plan)
    const ctx = { TH, pulse, lv: L, on: s.on, reduce: s.reduce, close: s.listener === 'stage' || s.dj, sponsors: s.sponsors || null };
    if (V.sky) V.sky.root.position.set(view.x, 0, view.z);
    // Layer by layer: the lamps and bulbs, the light they throw, the glowing surfaces, the ground's light maps
    V.kit.bulbs.update(s.t, TH.bulbs, L, pulse, s.reduce, [1, 1, s.on ? 1 : 0]);
    V.kit.bigBulbs.update(s.t, TH.bulbs, L, pulse, s.reduce, [1, 1, 1]);
    V.kit.curtains.update(s.t, TH.bulbs, L, pulse, s.reduce);
    V.kit.pools.update(L, TH.glow, s.t, s.reduce);
    V.kit.flames.update(s.t, L, s.reduce);
    updateLit(V.kit, L);
    V.lightMaps.set(L, s.reduce ? 0 : s.t);
    if (!s.reduce) V.kit.flags.pose(s.T);
    V.kit.beams.forEach((b) => { b.beam.aim(b.from, b.to); b.beam.set(b.hex || '#fff0d8', 0.6 * L[b.layer || 'key']); });
    (V.umbrellas || []).forEach((u, i) => u.update(s.T, s.reduce, i));
    // The garbo burns with its layer; it steps out of the picture when you walk right past it, as the 2D one did
    V.garbo.update(s.t, L.garbo, s.reduce, s.garboA == null || s.garboA > 0.3);
    if (V.stage) V.stage.update(s.T, ctx);
    if (V.update) V.update(s.T, ctx);
    if (V.furnish) V.furnish.update(s.T, { ...ctx, beat: s.beat || 0 });
    drone.update(s.drone, s.T, s.reduce);
    feed(V, s.aerial, s.drone ? s.drone.y : 10);
    rig.points.forEach((l, i) => { l.light.intensity = i === 0 ? V.garboK * L.garbo : l.base * L[l.layer]; });
    rig.spots.forEach((l) => { l.light.intensity = l.base * L[l.layer]; });
    rig.hemi.intensity = rig.hemi.userData.base * L.ambient;
    rig.moon.intensity = rig.moon.userData.base * L.ambient;
    // The air: a little more haze in an aarti, when the lamp's smoke hangs over the ground
    if (V.fog) V.fog.density = V.fogBase * (1 + 0.3 * (s.aarti || 0));
    renderer.toneMappingExposure = V.exposure * (1 - 0.15 * (s.aarti || 0));
    bloom.strength = 0.6 + 0.16 * pulse * L.show;
    composer.render();
    V._drawn = true;
    return true;
  }

  // The venue as it stands, drawn into a 2D canvas (the 2D scene's fade from one venue to the next)
  function snapshot(g2, w, h) {
    if (!V || lost || !V._drawn) return false;
    composer.render();
    g2.drawImage(gl, 0, 0, w, h);
    return true;
  }

  return { draw, resize, snapshot, hole, aerial: aerialOK, tier: TIER.name, renderer, busy, debug: () => ({ V, scene, camera, QP, every, bloom: bloom.enabled, frameMs, venues: Object.keys(venues), ready: Object.keys(venues).filter((k) => venues[k].ready), buildMs: Object.fromEntries(Object.keys(venues).map((k) => [k, venues[k].buildMs])) }) };
}
