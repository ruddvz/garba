// The venues, built in 3D from the shared kit. Each venue lives in its own module (venues/<id>.js), which the page
// downloads only when that venue is wanted, so adding a venue never makes the others heavier to load:
//   outdoors — an open ground under the night sky, a big stage, chhatris, food stalls, the city beyond;
//   stadium  — an indoor hall with tiered stands, a shamiana under a steel roof, jhummars and moving heads;
//   sheri    — a society lane between lit house fronts, a mandap for the band and a temple spire beyond;
//   pandora  — an open basin of black stone on another world: an obsidian floor inlaid with gold, terraces of basalt,
//              amber crystals, luminous ferns and violet flora, under a ringed planet.
// A venue's module exports { seed, sky, small, bareGarbo, garboK, build }: build(kit, root, tier, TH, r, data) puts its own
// structure under root and returns its light rig, floor, fog and exposure (and a stage, screens and an update). This
// file adds what every venue shares: the sky, the garbo at the centre, and (furnish.js) the stalls, the DJ's rig,
// chairs, benches, parked vehicles and planters where the 2D scene's layout puts them. The people, the band and the
// pictures on the screens are drawn live by the 2D scene over this, through the same camera.
//
// Each venue is lit in layers (lighting.js), and each kind of source has its own colour of light (LIGHT in util.js).
//
// To add a venue: write venues/<id>.js, add its loader below, and give the 2D scene (venue-scene.js) its layout.

import * as THREE from 'three';
import { seeded, THEMES } from './util.js';
import { newKit, buildKit } from './kit.js';
import { groundLayers } from './lighting.js';
import { buildSky } from './sky.js';
import { bake } from './bake.js';
import { buildGarbo } from './garbo.js';
import { buildFurnish } from './furnish.js';

// Each venue's module, fetched the first time it's wanted (the build splits each into its own file)
const LOADERS = {
  outdoors: () => import('./venues/outdoors.js'),
  stadium: () => import('./venues/stadium.js'),
  sheri: () => import('./venues/sheri.js'),
  pandora: () => import('./venues/pandora.js')
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
  // The stalls, the DJ's rig, chairs and the rest, where the 2D scene's layout puts them
  const furnish = furnishData ? buildFurnish(kit, root, id, furnishData) : null;
  if (furnishData && furnishData.stage) furnishData.stage.hole3d = { front: built.stage ? built.stage.stageFront : [], band: built.stage ? built.stage.bandHoles : built.bandHoles, mandap: built.mandapHoles || [] };
  // The garbo at the centre of the circle, and the warm pool its lamp throws on the ground round it
  const small = !!mod.small, garbo = buildGarbo(kit, { small, flags: TH.flags, bare: !!mod.bareGarbo });
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
