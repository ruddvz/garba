import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const helperSource = fs.readFileSync('assets/runtime/route-readiness.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const simple = fs.readFileSync('simple-runtime.js', 'utf8');
const continuity = fs.readFileSync('player-continuity.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const songs = JSON.parse(fs.readFileSync('data/songs.json', 'utf8'));

const context = { window: {}, URL };
vm.createContext(context);
vm.runInContext(helperSource, context);
const contract = context.window.GARBA_ROUTE_READINESS;
assert.ok(contract, 'shared readiness contract must expose itself');

const exact = { playbackProvider: 'youtube', youtubeId: 'abc123', playbackSourceUrl: 'https://www.youtube.com/watch?v=abc123' };
assert.equal(contract.routeReadiness(exact).status, 'exact-mapped');
assert.equal(contract.canExecuteSong(exact), true);
assert.equal(contract.routeReadiness({ ...exact, playbackSearchOnly: true }).status, 'reference-only');
assert.equal(contract.routeReadiness({ ...exact, playbackSourceType: 'verified-unchaptered-youtube-release' }).status, 'reference-only');
assert.equal(contract.routeReadiness({ playbackProvider: 'apple-music', playbackSourceUrl: 'https://music.apple.com/x' }).status, 'missing');
assert.equal(contract.routeReadiness(exact, { temporarilyFailed: true }).status, 'temporary-failure');
assert.equal(contract.routeReadiness({ ...exact, audioUrl: '/audio.mp3' }).status, 'blocked-policy');

const readySongs = songs.filter((song) => contract.canExecuteSong(song));
const unavailableSongs = songs.filter((song) => !contract.canExecuteSong(song));
assert.ok(readySongs.length > 0, 'catalogue must have executable YouTube songs');
assert.ok(unavailableSongs.length > 0, 'catalogue should retain non-executable discovery identities while migration continues');

const checks = [
  [app, /^import '\.\/assets\/runtime\/route-readiness\.js';/m, 'app loads shared route readiness'],
  [app, /match\.ordered\.slice\(index \+ 1\).*canExecuteSong\(song\)/s, 'release continuation skips unavailable tracks'],
  [app, /excluded\.has\(song\.id\).*canExecuteSong\(song\)/s, 'genre continuation skips unavailable tracks'],
  [app, /!song \|\| !canExecuteSong\(song\).*seen\.has\(id\)/s, 'stored manual queue is sanitised by readiness'],
  [app, /if \(!canExecuteSong\(queuedSong\)\)/, 'Play next rejects unavailable songs'],
  [app, /songsForGenre\(genreId\)\.filter\(canExecuteSong\)/, 'Next uses only executable genre songs'],
  [app, /playbackReady = String\(readiness\.executable\)/, 'player publishes truthful readiness state'],
  [app, /button\.disabled = !readiness\.executable/, 'explicit unavailable selection disables Play'],
  [app, /preserveRequestedIdentity/, 'explicit unavailable deep links preserve requested identity'],
  [app, /preserveRestoredIdentity/, 'restored unavailable sessions preserve saved identity'],
  [app, /state\.songs\.find\(\(entry\) => entry\.genre === genre\.id && canExecuteSong\(entry\)\)/, 'cold fallback prefers a playable song'],
  [simple, /playbackReady: Boolean\(/, 'fast boot marks route truth instead of claiming every seed ready'],
  [continuity, /GARBA_ROUTE_READINESS\?\.canExecuteSong/, 'continuity does not synthesize play for unavailable selection'],
];
for (const [source, pattern, message] of checks) assert.match(source, pattern, message);

assert.equal(pkg.scripts['playable:continuation:validate'], 'node scripts/lib/validate-playable-continuation.mjs');
assert.match(pkg.scripts.check, /npm run playable:continuation:validate/);
assert.match(pkg.scripts['check:modules'], /assets\/runtime\/route-readiness\.js/);
assert.match(pkg.scripts['check:modules'], /validate-playable-continuation\.mjs/);

console.log(`Playable continuation validated: ${readySongs.length} executable, ${unavailableSongs.length} discovery-only/unavailable catalogue rows.`);
