// What more than one venue builds the same way: the ground, light on it from lamps built elsewhere, the sponsors'
// places, and an uplight washing a wall.

import * as THREE from 'three';
import { LIGHT, sponsorTexture, creative } from '../util.js';
import { std } from '../kit.js';

/* ---------- ground surfaces (floors.js) ---------- */
export function ground(root, fl, w, d, cz, receive) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: fl.map, normalMap: fl.normalMap, normalScale: new THREE.Vector2(fl.normalScale, fl.normalScale), roughness: fl.roughness, metalness: 0 }));
  m.userData.decal = { canvas: fl.decal, rect: fl.decalRect };
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0, cz); m.receiveShadow = !!receive;
  // The ground's light maps (lighting.js) cover it edge to edge
  m.userData.rect = { w, d, cx: 0, cz };
  root.add(m);
  return m;
}
// Light on the ground from lamps whose source isn't built here (the DJ's laptop, lit by the 2D scene)
export function practicalPools(kit, list) { list.forEach(([x, z, r, hex, k, layer]) => kit.pools.add(x, 0.02, z, r, r, hex, k, { layer: layer || 'practical' })); }

/* ---------- the sponsors' places ---------- */
// A creative as a corner screen shows it and as a board carries it (each edge to edge)
export const cornerCreative = (url) => creative(url, 'corner', (u) => sponsorTexture(u, 1024, 358));
export const boardCreative = (url) => creative(url, 'board', (u) => sponsorTexture(u, 768, Math.round(768 / 2.34)));
// Each place shows the creative the 2D scene's sponsor plan gives it, dimming through black as it changes (fade)
export function showCreatives(meshes, plan, all, make, fade) {
  if (!plan || !all) return;
  meshes.forEach((m, i) => {
    const q = plan[i]; if (!q || q.k < 0) return;
    const tex = make(all.urls[q.k]); if (m.material.map !== tex) m.material.map = tex;
    fade(m, q.a);
  });
}

/* ---------- architectural and household light ---------- */
// An uplight on the ground by a wall: a small fixture, its wash up the wall and a little light on the ground at its foot.
// ry turns the wash to lie along the wall; (tx, tz) points from the fixture to the wall.
export function uplight(kit, root, x, z, ry, h, tx, tz) {
  const fx = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), std('#15110d', 0.6, 0.4)); fx.position.set(x, 0.06, z); fx.rotation.y = ry; root.add(fx);
  kit.bigBulbs.add(x, 0.14, z, 0, { color: LIGHT.amber, k: 0.9, s: 0.45, twinkle: 0, layer: 'architectural' });
  kit.pools.add(x + tx * 0.24, h * 0.42, z + tz * 0.24, 1.1, h * 0.75, LIGHT.amber, 0.24, { vertical: true, ry, layer: 'architectural' });
  kit.pools.add(x, 0.02, z, 1.3, 1.3, LIGHT.amber, 0.1, { layer: 'architectural' });
}
