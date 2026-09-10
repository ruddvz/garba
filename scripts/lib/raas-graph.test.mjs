import assert from 'node:assert/strict';
import {
  PROVENANCE,
  assertGraphFresh,
  buildGraph,
  checkFreshness,
  classifyPath,
  compileContextPacket,
  edgeCanHardGate,
  impactForSeeds,
} from './raas-graph.mjs';

const base = {
  repository: 'ruddvz/garba',
  baseSha: 'abc123',
  indexedSha: 'abc123',
  branch: 'feature/test',
  workspace: 'worktree-a',
  sourceStateDigest: 'source-a',
  declarationsDigest: 'decl-a',
};

const nodes = [
  { id: 'catalogue:track:t1', kind: 'catalogue-track', domains: ['catalogue'], data: { canonical: true } },
  { id: 'catalogue:playback-route:r1', kind: 'catalogue-playback-route', domains: ['catalogue', 'player'] },
  { id: 'file:youtube-player-runtime.js', kind: 'file', path: 'youtube-player-runtime.js' },
  { id: 'file:player-continuity.js', kind: 'file', path: 'player-continuity.js' },
  { id: 'file:src/catalogue/catalogue.js', kind: 'file', path: 'src/catalogue/catalogue.js' },
  { id: 'file:sw.js', kind: 'file', path: 'sw.js' },
  { id: 'file:simple-runtime.js', kind: 'file', path: 'simple-runtime.js' },
  { id: 'catalogue:track:t2', kind: 'catalogue-track', domains: ['catalogue'], data: { canonical: true } },
];

const declaredEdges = [
  { from: 'catalogue:playback-route:r1', to: 'catalogue:track:t1', type: 'ROUTED_BY', provenance: PROVENANCE.DETERMINISTIC },
  { from: 'file:youtube-player-runtime.js', to: 'catalogue:playback-route:r1', type: 'READS_FROM', provenance: PROVENANCE.DECLARED },
  { from: 'file:player-continuity.js', to: 'file:youtube-player-runtime.js', type: 'DEPENDS_ON', provenance: PROVENANCE.DECLARED },
  { from: 'file:src/catalogue/catalogue.js', to: 'catalogue:track:t1', type: 'PRESENTS_CANONICAL', provenance: PROVENANCE.DETERMINISTIC },
  { from: 'file:sw.js', to: 'file:simple-runtime.js', type: 'PACKAGES', provenance: PROVENANCE.DECLARED },
  { from: 'catalogue:track:t2', to: 'catalogue:track:t1', type: 'MAYBE_RELATED', provenance: PROVENANCE.INFERRED },
];

const graph = buildGraph({ ...base, nodes, declaredEdges });

assert.deepEqual(classifyPath('src/catalogue/catalogue.js'), ['explore']);
assert.deepEqual(classifyPath('youtube-player-runtime.js'), ['player']);
assert.deepEqual(classifyPath('sw.js'), ['pwa']);
assert.deepEqual(classifyPath('scripts/lib/validate-truthful-seek-runtime.mjs'), ['validation']);
assert.equal(edgeCanHardGate({ provenance: PROVENANCE.INFERRED }), false);
assert.equal(edgeCanHardGate({ provenance: PROVENANCE.DECLARED }), true);
assert.equal(edgeCanHardGate({ provenance: PROVENANCE.OBSERVED, data: { current: false } }), false);
assert.equal(edgeCanHardGate({ provenance: PROVENANCE.OBSERVED, data: { current: true } }), true);

const reordered = buildGraph({ ...base, nodes: [...nodes].reverse(), declaredEdges: [...declaredEdges].reverse() });
assert.equal(graph.metadata.fingerprint, reordered.metadata.fingerprint, 'fingerprint must be input-order independent');

const fresh = checkFreshness(graph, base);
assert.equal(fresh.fresh, true);
assert.equal(checkFreshness(graph, { ...base, baseSha: 'new-main' }).fresh, false);
assert.throws(() => assertGraphFresh(graph, { ...base, sourceStateDigest: 'dirty-worktree' }), /stale RAAS graph/);

const impact = impactForSeeds(graph, ['catalogue:track:t1'], { budget: { maxDepth: 4, maxNodes: 20, maxEdges: 30 } });
const hardIds = impact.hard.map((entry) => entry.node.id);
const advisoryIds = impact.advisory.map((entry) => entry.node.id);
assert(hardIds.includes('catalogue:playback-route:r1'), 'track change must reach its explicit playback route');
assert(hardIds.includes('file:youtube-player-runtime.js'), 'route impact must reach player transport');
assert(hardIds.includes('file:player-continuity.js'), 'player transport impact must reach continuity');
assert(hardIds.includes('file:src/catalogue/catalogue.js'), 'canonical track impact must reach Explore presentation');
assert(advisoryIds.includes('catalogue:track:t2'), 'inferred neighbouring identity must remain advisory');
assert(!hardIds.includes('catalogue:track:t2'), 'inferred relationship must never become hard impact');

const pwaImpact = impactForSeeds(graph, ['file:simple-runtime.js'], { budget: { maxDepth: 2 } });
assert(pwaImpact.hard.some((entry) => entry.node.id === 'file:sw.js'), 'runtime packaging impact must reach PWA service worker');

const cycleGraph = buildGraph({
  ...base,
  nodes: [
    { id: 'file:a.js', kind: 'file', path: 'a.js' },
    { id: 'file:b.js', kind: 'file', path: 'b.js' },
  ],
  declaredEdges: [
    { from: 'file:a.js', to: 'file:b.js', type: 'DEPENDS_ON', provenance: PROVENANCE.DECLARED },
    { from: 'file:b.js', to: 'file:a.js', type: 'DEPENDS_ON', provenance: PROVENANCE.DECLARED },
  ],
});
const cyclePacket = compileContextPacket(cycleGraph, ['file:a.js'], { budget: { maxDepth: 8, maxNodes: 8, maxEdges: 8 } });
assert.equal(cyclePacket.selected.length, 2, 'cycle traversal must terminate without duplicate nodes');

const bounded = compileContextPacket(graph, ['catalogue:track:t1'], { budget: { maxDepth: 8, maxNodes: 2, maxEdges: 2 } });
assert.equal(bounded.truncated, true, 'budget overflow must be explicit');
assert(bounded.selected.length <= 2);
assert(bounded.edges.length <= 2);

const unresolved = compileContextPacket(graph, ['track:t1', 'catalogue:track:t1']);
assert(unresolved.unresolved.some((item) => item.seed === 'track:t1' && item.reason === 'exact-seed-not-found'));
assert(unresolved.selected.some((entry) => entry.node.id === 'catalogue:track:t1'));

const graphOtherWorktree = buildGraph({ ...base, workspace: 'worktree-b', sourceStateDigest: 'source-b', nodes, declaredEdges });
assert.notEqual(graph.metadata.fingerprint, graphOtherWorktree.metadata.fingerprint, 'worktree/source-state changes require a distinct fingerprint');
assert.equal(graph.metadata.workspace, 'worktree-a');
assert.equal(graphOtherWorktree.metadata.workspace, 'worktree-b');

const explicitCatalogue = buildGraph({
  ...base,
  catalogueRecords: [
    {
      id: 'release-1',
      kind: 'release',
      sourcePath: 'data/catalogue/releases/releases-01.json',
      links: [],
    },
    {
      id: 'track-1',
      kind: 'track',
      sourcePath: 'data/catalogue/songs/songs-01.json',
      links: [
        {
          type: 'BELONGS_TO_RELEASE',
          to: 'catalogue:release:release-1',
          provenance: PROVENANCE.DETERMINISTIC,
        },
      ],
    },
  ],
});
assert(explicitCatalogue.edges.some((edge) => edge.type === 'BELONGS_TO_RELEASE'));
assert.throws(
  () => buildGraph({
    ...base,
    catalogueRecords: [{ id: 'track-x', kind: 'track', links: [{ type: 'MAYBE', to: 'release-guess' }] }],
  }),
  /must target an explicit catalogue node id/,
  'catalogue relationships must never be created from ambiguous shorthand',
);

const authorityUpgradeGraph = buildGraph({
  ...base,
  nodes: [
    { id: 'file:seed.js', kind: 'file', path: 'seed.js' },
    { id: 'file:bridge.js', kind: 'file', path: 'bridge.js' },
    { id: 'file:downstream.js', kind: 'file', path: 'downstream.js' },
    { id: 'file:advisory-first.js', kind: 'file', path: 'advisory-first.js' },
  ],
  declaredEdges: [
    { from: 'file:advisory-first.js', to: 'file:seed.js', type: 'MAYBE_DEPENDS_ON', provenance: PROVENANCE.INFERRED },
    { from: 'file:bridge.js', to: 'file:seed.js', type: 'DEPENDS_ON', provenance: PROVENANCE.DECLARED },
    { from: 'file:downstream.js', to: 'file:bridge.js', type: 'DEPENDS_ON', provenance: PROVENANCE.DECLARED },
    { from: 'file:downstream.js', to: 'file:advisory-first.js', type: 'MAYBE_DEPENDS_ON', provenance: PROVENANCE.INFERRED },
  ],
});
const upgradedImpact = impactForSeeds(authorityUpgradeGraph, ['file:seed.js'], { budget: { maxDepth: 4, maxNodes: 10, maxEdges: 20 } });
assert(upgradedImpact.hard.some((entry) => entry.node.id === 'file:downstream.js'), 'a later hard route must upgrade and propagate authority through descendants');

const unresolvedHeavyGraph = buildGraph({
  ...base,
  files: Array.from({ length: 8 }, (_, index) => ({ path: `src/u${index}.js`, imports: [`./missing-${index}.js`] })),
});
const boundedUnresolved = compileContextPacket(unresolvedHeavyGraph, ['file:src/u0.js'], { budget: { maxNodes: 3, maxEdges: 3, maxDepth: 1 } });
assert.equal(boundedUnresolved.unresolved.length, 3, 'context packets must bound unresolved output');
assert.equal(boundedUnresolved.truncated, true, 'unresolved truncation must be explicit');

assert.throws(
  () => buildGraph({ ...base, nodes: [{ id: 'bad', provenance: 'guessed' }] }),
  /unsupported node provenance/,
  'unknown provenance must fail closed',
);

const filesA = [
  { path: 'src/feature/a.js', imports: ['./b.js'] },
  { path: 'src/feature/b.js', imports: [] },
];
const filesB = [...filesA].reverse();
const importGraphA = buildGraph({ ...base, files: filesA });
const importGraphB = buildGraph({ ...base, files: filesB });
assert.equal(importGraphA.metadata.fingerprint, importGraphB.metadata.fingerprint);
assert(importGraphA.edges.some((edge) => edge.type === 'IMPORTS' && edge.from === 'file:src/feature/a.js' && edge.to === 'file:src/feature/b.js'));

console.log('✓ RAAS graph core: deterministic fingerprints');
console.log('✓ RAAS graph core: strict freshness and worktree isolation');
console.log('✓ RAAS graph core: bounded cycle-safe context');
console.log('✓ RAAS graph core: provider/player/Explore/PWA impact');
console.log('✓ RAAS graph core: source-first catalogue and advisory inference boundaries');
