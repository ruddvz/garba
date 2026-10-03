// The venues, built in 3D from the shared kit. Each venue lives in its own module (venues/<id>.js), which the page
// downloads only when that venue is wanted, so adding a venue never makes the others heavier to load:
//   outdoors — an open ground under the night sky, a big stage, chhatris, food stalls, the city beyond;
//   stadium  — an indoor hall with tiered stands, a shamiana under a steel roof, jhummars and moving heads;
//   sheri    — a society lane between lit house fronts, a mandap for the band and a temple spire beyond;
//   pandora  — an open basin of black stone on another world: an obsidian floor inlaid with gold, terraces of basalt,
//              amber crystals, luminous ferns and violet flora, under a ringed planet;
//   resham   — a full-span canopy of red and gold ribbons radiating from a lacquered mast, embroidered panels and bells;
//   chitra   — a garden courtyard of great trees hung with lights, a wall of painted devotional panels;
//   voltage  — an industrial hall: steel, brick and sawtooth roof, neon, LED towers and an LED dance floor;
//   chandra  — a moonlit jungle garden: twig arches hung with lanterns, glowing leaves, a lotus channel round the floor;
//   vrindavan — an old sandstone courtyard: cusped arcades, torches and diyas, a temple's spire beyond the band;
//   tulip    — a garden clearing among violet-lit trees, hundreds of glowing tulip lamps strung over the floor;
//   lotus    — an open amphitheatre: eight stone tiers lit cyan, a lotus of light on the floor, jali screens round the top;
//   vadodara — Vadodara in 2047: a plaza among neon towers, a turning LED mandala, an elevated metro passing behind;
//   jyot     — a courtyard of cream stone: diyas on every ledge, round mandala lanterns strung over it, a tower of lamps;
//   tideglass — a terrace over the moonlit sea: a pool ring glowing turquoise, waterfalls, glass flowers, cabanas;
//   shikhar  — an open plaza round a tower of pierced metal cones whose light throws a mandala across the floor;
//   kutch    — a circle out on the white salt: an ivory platform, a pierced terracotta lamp, clay panels, bhungas.
// A venue's module exports { seed, sky, small, garbo ('full', 'bare' or 'none'), garboK, build }: build(kit, root, tier, TH, r, data) puts its own
// structure under root and returns its light rig, floor, fog and exposure (and a stage, screens and an update). This
// file adds what every venue shares: the sky, the garbo at the centre, and (furnish.js) the stalls, the DJ's rig,
// chairs, benches, parked vehicles and planters where the 2D scene's layout puts them. The people, the band and the
// pictures on the screens are drawn live by the 2D scene over this, through the same camera.
//
// Each venue is lit in layers (lighting.js), and each kind of source has its own colour of light (LIGHT in util.js).
//
// To add a venue: write venues/<id>.js and add its loader below, and give the 2D scene its spec (venues2d/<id>.js,
// loaded by index.html), which is handed to the 3D build as data.spec.

import * as THREE from 'three';
import { seeded, THEMES } from './util.js';
import { newKit, buildKit } from './kit.js';
import { groundLayers } from './lighting.js';
import { buildSky } from './sky.js';
import { bake } from './bake.js';
import { buildGarbo, GARBO_LOOKS } from './garbo.js';
import { buildFurnish } from './furnish.js';

// Each venue's module, fetched the first time it's wanted (the build splits each into its own file)
const LOADERS = {
  outdoors: () => import('./venues/outdoors.js'),
  stadium: () => import('./venues/stadium.js'),
  sheri: () => import('./venues/sheri.js'),
  pandora: () => import('./venues/pandora.js'),
  resham: () => import('./venues/resham.js'),
  chitra: () => import('./venues/chitra.js'),
  voltage: () => import('./venues/voltage.js'),
  chandra: () => import('./venues/chandra.js'),
  vrindavan: () => import('./venues/vrindavan.js'),
  tulip: () => import('./venues/tulip.js'),
  lotus: () => import('./venues/lotus.js'),
  vadodara: () => import('./venues/vadodara.js'),
  jyot: () => import('./venues/jyot.js'),
  tideglass: () => import('./venues/tideglass.js'),
  shikhar: () => import('./venues/shikhar.js'),
  kutch: () => import('./venues/kutch.js')
};
export const VENUE_IDS = Object.keys(LOADERS);
const modules = {}, loading = {};
// The venue's module; null while it's still on its way (then is called once it has come), false if it can't be had
export function venueModule(id, then) {
  if (modules[id]) return modules[id];
  if (!LOADERS[id]) return false;
  if (!loading[id]) loading[id] = LOADERS[id]().then((m) => { modules[id] = m.default; }, () => { modules[id] = false; });
  if (then) loading[id].then(then);
  return modules[id] === false ? false : null;
}
export function knownVenue(id) { return !!LOADERS[id]; }
export function venueFailed(id) { return modules[id] === false; }

/* ---------- a venue, ready to render ---------- */
export function buildVenue(id, mod, tier, themeName, furnishData) {
  const TH = THEMES[themeName] || THEMES.traditional;
  const r = seeded(mod.seed);
  const root = new THREE.Group(), kit = newKit();
  const sky = typeof mod.sky === 'function' ? mod.sky(tier) : mod.sky ? buildSky(id) : null;
  if (sky) root.add(sky.root);
  const built = mod.build(kit, root, tier, TH, r, furnishData);
  // The land beyond the venue's own ground, out to the horizon, in the venue's own haze, so from the air (and from a
  // high seat) the ground never ends in an edge
  if (built.fog && !mod.indoor && mod.land !== false) {
    const land = new THREE.Mesh(new THREE.CircleGeometry(1400, 48), new THREE.MeshBasicMaterial({ color: built.fog.color.clone().multiplyScalar(0.45) }));
    land.rotation.x = -Math.PI / 2; land.position.y = -0.06; land.renderOrder = -5; root.add(land);
  }
  // The stalls, the DJ's rig, chairs and the rest, where the 2D scene's layout puts them
  const furnish = furnishData ? buildFurnish(kit, root, id, furnishData) : null;
  if (furnishData && furnishData.stage) furnishData.stage.hole3d = { front: built.stage ? built.stage.stageFront : [], band: built.stage ? built.stage.bandHoles : built.bandHoles, mandap: built.mandapHoles || [] };
  // The garbo at the centre of the circle, and the warm pool its lamp throws on the ground round it
  // (a venue can have the garbo bare, or none: Resham's mast stands where it would, with its own diyas round it; each
  // newer venue has its own look of it, GARBO_LOOKS in garbo.js)
  const small = !!mod.small, kind = mod.garbo || 'full';
  const garbo = kind === 'none' ? { root: new THREE.Group(), update() {}, setTheme() {} } : buildGarbo(kit, { small, flags: TH.flags, bare: kind === 'bare', look: GARBO_LOOKS[id] });
  root.add(garbo.root);
  kit.pools.add(0, 0.02, 0, small ? 3.6 : 4.4, small ? 3.6 : 4.4, '#ffae5c', 0.2, { layer: 'garbo', live: true });
  // Paint every lamp's light on the ground into the ground's light maps, one per layer (the flames' too)
  kit.flames.lightPools(kit);
  const lightMaps = groundLayers(built.floor, built.floor.userData.rect, kit.pools.list, TH, tier.name === 'phone' ? 512 : 1024, built.floor.userData.decal);
  kit.pools.bakedGround = true;
  buildKit(kit, root);
  bake(root, new Set(kit.lit.map((e) => e.mat)));
  return Object.assign({ id, root, kit, sky, TH, lightMaps, garbo, furnish, garboK: mod.garboK || 13, // The lamp's light, as it spreads from under the canopy over the circle
    garboLight: { pos: [0, small ? 1.3 : 1.45, 0], distance: small ? 12 : 15, color: '#ffae5c' } }, built);
}
