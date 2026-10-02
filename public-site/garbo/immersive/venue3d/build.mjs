// Builds venue3d.js, the module the player loads, and its chunks from src/ and three.js.
//
// The bundle is committed, so the site needs no build step. To rebuild after changing src/, install the two build
// tools anywhere outside the repository and point this script at that folder:
//
//   mkdir -p /tmp/venue3d-tools && cd /tmp/venue3d-tools && npm init -y && npm i esbuild@0.25.10 three@0.186.1
//   node public-site/garbo/immersive/venue3d/build.mjs /tmp/venue3d-tools
//
// It's split: venue3d.js and a shared chunk (three.js, the kit, the lighting, the backdrop) load with the page, and
// each venue (src/venues/<id>.js) becomes its own chunk, fetched only when that venue is first wanted. Chunk names
// carry a hash of their content, so a changed venue is fetched fresh and an unchanged one stays cached. Old chunks are
// cleared before each build.
import path from 'node:path';
import { readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tools = path.resolve(process.argv[2] || process.env.VENUE3D_TOOLS || '');
const require = createRequire(path.join(tools, 'package.json'));
const esbuild = require('esbuild');
const three = JSON.parse(readFileSync(path.join(tools, 'node_modules/three/package.json'), 'utf8')).version;
if (three !== '0.186.1') throw new Error(`Expected three@0.186.1, found ${three}`);

rmSync(path.join(here, 'chunks'), { recursive: true, force: true });
await esbuild.build({
  entryPoints: { venue3d: path.join(here, 'src/main.js') },
  outdir: here,
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  target: 'es2020',
  nodePaths: [path.join(tools, 'node_modules')],
  legalComments: 'eof',
  banner: { js: `/* PlayGarba 3D venues (source: venue3d/src). Bundles three.js r${three.split('.')[1]} (MIT, (c) 2010-2025 three.js authors). */` },
  logLevel: 'info'
});
