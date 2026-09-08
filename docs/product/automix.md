# Garba AutoMix

Garba AutoMix blends one directly hosted Garba track into the next without waiting for the first file to end completely.

## Scope

AutoMix only runs when both consecutive catalogue entries have an authorised `audioUrl` that Garba can control directly.

Provider-backed playback such as YouTube, Apple Music, Spotify, Amazon Music, SoundCloud and similar embeds does not use AutoMix. Those providers do not expose the sample-accurate playback control needed for a reliable in-page DJ transition.

## Current transition behaviour

When AutoMix is enabled and the current direct-audio song approaches its end:

1. Garba identifies the next song in the active genre queue.
2. A hidden second audio deck preloads the incoming file.
3. The incoming deck starts at its configured mix-in point, or at the start of the file when no mix point exists.
4. The outgoing and incoming decks follow an equal-power crossfade curve.
5. If compatible BPM metadata exists, the incoming track can start with a small tempo correction and settle back to its original speed during the transition.
6. At the end of the overlap, the normal Garba Next action updates player state, URL, artwork and queue state.
7. Playback is handed back to the primary audio element at the matching incoming position.

The default overlap is 7.5 seconds. When BPM metadata exists, the engine prefers a four-bar transition and clamps the overlap to 4 to 10 seconds. Data Saver uses the shorter 4-second transition.

## Catalogue metadata hooks

AutoMix works without extra metadata, but direct tracks can later add:

```json
{
  "bpm": 120,
  "mixInSeconds": 8.0,
  "mixOutSeconds": 176.5,
  "transitionSeconds": 8.0,
  "introSilenceSeconds": 0.35
}
```

- `bpm`: tempo used for phrase length and small compatible tempo adjustments.
- `mixInSeconds`: preferred point at which the incoming recording should enter.
- `mixOutSeconds`: preferred musical exit point in the outgoing recording.
- `transitionSeconds`: optional per-track transition duration override.
- `introSilenceSeconds`: optional silence-trim hint when no explicit mix-in point is present.

A later audio-analysis pipeline can generate these values offline. Runtime code should not guess BPM or phrase boundaries from incomplete information.

## Safety and fallback behaviour

AutoMix cancels immediately when the listener seeks, chooses another song, or uses Previous or Next manually.

If the incoming file cannot preload or browser autoplay policy blocks the second deck, the transition is abandoned and the existing single-track playback path remains in control.

The feature is enabled by default and can be switched off from the Up next sheet. The preference is stored locally in the browser.

## Current catalogue limitation

`data/direct-audio.json` currently contains no authorised direct tracks. The engine is therefore installed and ready, but real transition listening tests require at least two consecutive authorised direct-audio songs in the same genre.

Do not add provider streams, purchased downloads, or merely free-to-listen files to `audioUrl`. Direct hosting requires explicit redistribution rights.
