from pathlib import Path
import json
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, found {count}')
    p.write_text(text.replace(old, new, 1))


app = Path('app.js')
text = app.read_text()
if not text.startswith("import './assets/runtime/route-readiness.js';"):
    text = "import './assets/runtime/route-readiness.js';\nconst { routeReadiness, canExecuteSong } = window.GARBA_ROUTE_READINESS;\n\n" + text
app.write_text(text)

replace_once('app.js',
"""  const remaining = index >= 0
    ? match.ordered.slice(index + 1).filter((song) => !state.releaseContextConsumedIds.has(song.id))
    : [];
""",
"""  const remaining = index >= 0
    ? match.ordered.slice(index + 1).filter((song) => (
      !state.releaseContextConsumedIds.has(song.id) && canExecuteSong(song)
    ))
    : [];
""")

replace_once('app.js',
"""    if (!song?.id || song.id === state.songId || excluded.has(song.id) || seen.has(song.id)) continue;
""",
"""    if (!song?.id || song.id === state.songId || excluded.has(song.id) || seen.has(song.id) || !canExecuteSong(song)) continue;
""")

replace_once('app.js',
"""    if (!song?.youtubeId || id === state.songId || seen.has(id)) continue;
""",
"""    if (!song || !canExecuteSong(song) || id === state.songId || seen.has(id)) continue;
""")

replace_once('app.js',
"""  els.durationTime.textContent = formatDuration(state.duration || song.durationSeconds);
  els.elapsedTime.textContent = formatTime(state.elapsed);

  const ratio = state.duration ? Math.min(1, Math.max(0, state.elapsed / state.duration)) : 0;
""",
"""  els.durationTime.textContent = formatDuration(state.duration || song.durationSeconds);
  els.elapsedTime.textContent = formatTime(state.elapsed);

  const readiness = routeReadiness(song);
  els.app.dataset.playbackReady = String(readiness.executable);
  for (const button of [els.playButton, els.miniPlay]) {
    button.disabled = !readiness.executable;
    button.setAttribute('aria-disabled', String(!readiness.executable));
    if (!readiness.executable) button.title = 'This recording is not available to play yet';
    else if (!state.playing) button.title = 'Play';
  }

  const ratio = state.duration ? Math.min(1, Math.max(0, state.elapsed / state.duration)) : 0;
""")

replace_once('app.js',
"""  if (!queuedSong.youtubeId) {
    showToast('This song is not YouTube-ready yet.');
    return;
  }
""",
"""  if (!canExecuteSong(queuedSong)) {
    showToast('This recording is not available to play yet.');
    return;
  }
""")

replace_once('app.js',
"""  const list = songsForGenre(genreId);
  if (!list.length) return;
  const anchorId = state.playContextSongId || state.songId;
""",
"""  const list = songsForGenre(genreId).filter(canExecuteSong);
  if (!list.length) return;
  const anchorId = state.playContextSongId || state.songId;
""")

old_initial = """  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;
  if (!song && !pendingSongId && session.songId) song = state.songs.find((entry) => entry.id === session.songId);

  let genre = requestedGenre ? state.genres.find((entry) => entry.id === requestedGenre) : null;
"""
new_initial = """  let song = requestedSong ? state.songs.find((entry) => entry.id === requestedSong) : null;
  if (!song && !pendingSongId && session.songId) song = state.songs.find((entry) => entry.id === session.songId);
  const preserveRequestedIdentity = Boolean(song && requestedSong && song.id === requestedSong);
  const preserveRestoredIdentity = Boolean(song && !requestedSong && session.songId && song.id === session.songId);

  let genre = requestedGenre ? state.genres.find((entry) => entry.id === requestedGenre) : null;
"""
replace_once('app.js', old_initial, new_initial)

replace_once('app.js',
"""  if (!song || song.genre !== genre.id) song = state.songs.find((entry) => entry.genre === genre.id) || state.songs[0];
""",
"""  if (!song || (!(preserveRequestedIdentity || preserveRestoredIdentity) && song.genre !== genre.id)) {
    song = state.songs.find((entry) => entry.genre === genre.id && canExecuteSong(entry))
      || state.songs.find((entry) => entry.genre === genre.id)
      || state.songs.find(canExecuteSong)
      || state.songs[0];
  }
""")

# Fast boot keeps identity metadata but marks truth explicitly; app decides executability with the shared helper.
simple = Path('simple-runtime.js')
simple_text = simple.read_text()
needle = "];\n  let hydratePromise = null;"
if simple_text.count(needle) != 1:
    raise SystemExit(f'simple-runtime.js: boot song anchor count {simple_text.count(needle)}')
boot_truth = """].map((song) => ({
    ...song,
    playbackReady: Boolean(
      !song.audioUrl
      && !song.playbackSearchOnly
      && song.playbackSourceType !== 'verified-release-track-reference'
      && song.playbackSourceType !== 'verified-unchaptered-youtube-release'
      && song.youtubeId
      && (song.playbackProvider === 'youtube' || /youtu(?:\\.be|be\\.com)/i.test(String(song.playbackSourceUrl || '')))
    ),
  }));
  let hydratePromise = null;"""
simple.write_text(simple_text.replace(needle, boot_truth, 1))

# Continuity must never synthesize a play click for a known non-executable selection.
replace_once('player-continuity.js',
"""      if (shouldStartSelectedSong) closeMobileSongBrowserAfterSelection();
      if (!playButton?.isConnected) return;
      playButton.click();
""",
"""      if (shouldStartSelectedSong) closeMobileSongBrowserAfterSelection();
      if (!playButton?.isConnected) return;
      const selected = currentSafeSong();
      const executable = window.GARBA_ROUTE_READINESS?.canExecuteSong?.(selected)
        ?? Boolean(selected?.youtubeId && !selected?.playbackSearchOnly);
      if (!executable || playButton.disabled) return;
      playButton.click();
""")

validator = r'''import assert from 'node:assert/strict';
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
'''
Path('scripts/lib/validate-playable-continuation.mjs').write_text(validator)

package_path = Path('package.json')
pkg = json.loads(package_path.read_text())
scripts = pkg['scripts']
scripts['playable:continuation:validate'] = 'node scripts/lib/validate-playable-continuation.mjs'
for check in ['node --check assets/runtime/route-readiness.js', 'node --check scripts/lib/validate-playable-continuation.mjs']:
    if check not in scripts['check:modules']:
        scripts['check:modules'] += ' && ' + check
command = 'npm run playable:continuation:validate'
if command not in scripts['check']:
    anchor = 'npm run release:context:validate && '
    if anchor not in scripts['check']:
        raise SystemExit('package.json: release-context validation anchor missing')
    scripts['check'] = scripts['check'].replace(anchor, anchor + command + ' && ', 1)
package_path.write_text(json.dumps(pkg, indent=2) + '\n')
