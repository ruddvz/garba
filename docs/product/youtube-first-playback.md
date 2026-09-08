# YouTube-first playback

Status: production architecture, 2026-09-07

GARBA uses a simple player surface — play/pause, previous, next and seek — while choosing the safest available playback engine behind those controls.

## Source priority

1. **GARBA direct audio** — only when the exact recording has the required redistribution/direct-streaming rights and a validated direct-audio entry.
2. **Exact YouTube playback** — an exact verified video or a verified chapter/timestamp, controlled through the official YouTube IFrame Player API.
3. **Provider fallback** — Apple Music, Spotify, SoundCloud or another verified provider route when no safe exact YouTube route is mapped.
4. **Catalogue/reference only** — GARBA does not pretend that a release page, search result or unchaptered multi-song upload is the exact selected recording.

Direct audio remains the long-term highest-control path. YouTube-first makes the existing catalogue substantially easier to play without waiting for every commercial master to be licensed.

## User experience

For an exact YouTube route, the main GARBA controls operate the embedded YouTube player:

- Play / pause uses `playVideo()` and `pauseVideo()`.
- Previous / next changes the GARBA song and starts the next exact YouTube route when available.
- The GARBA progress bar follows YouTube playback time.
- Seeking uses `seekTo()`.
- Verified chapters map GARBA's logical `0:00` to the stored `youtubeStartSeconds` within the source video.
- When a verified chapter has `durationSeconds`, GARBA treats that chapter duration as the selected track boundary and advances to the next song at the boundary.
- Media Session actions are mapped to the same engine where supported by the browser.
- If autoplay is blocked, GARBA keeps the player visible and asks for another Play tap rather than trying to bypass the browser restriction.

## Visible embedded player

The official YouTube player remains visible in the provider dock. GARBA's provider-media CSS maintains a minimum 200 × 200 player viewport. The player is not converted into a hidden audio backend.

GARBA can hide YouTube's standard transport controls with the documented IFrame player option and provide its own play/pause/seek buttons through the documented JavaScript API. The actual YouTube player remains present and visible.

## What GARBA does not do

The YouTube runtime must not:

- extract an audio stream from a YouTube video;
- discover or use raw `googlevideo` / `videoplayback` URLs;
- use yt-dlp, youtube-dl or equivalent stream-extraction logic;
- parse YouTube signature ciphers;
- download or cache YouTube audiovisual content as GARBA media;
- hide the YouTube player as a background audio engine;
- suppress, skip or remove YouTube-served advertising;
- autoplay a release/reference URL while claiming it is the selected song when exact identity is not verified.

`scripts/validate-youtube-player-runtime.mjs` enforces the most important architectural invariants in CI.

## Route-truth safety

`player-continuity.js` sanitises catalogue routes before `youtube-player-runtime.js` makes playback decisions. The load order is intentionally:

```text
provider-runtime.js
→ player-continuity.js
→ youtube-player-runtime.js
```

A route marked `playbackSearchOnly`, a `verified-release-track-reference`, or a `verified-unchaptered-youtube-release` is not treated as exact one-tap YouTube playback.

This prevents a convenient player from becoming a mechanism that silently plays the wrong recording.

## PWA and deployment

`youtube-player-runtime.js` is part of the GitHub Pages production artifact and the installed PWA core shell. It is network-first like the other player runtimes, so installed apps receive playback fixes rather than remaining pinned to an old cached engine.

The IFrame API itself is loaded from YouTube at runtime and therefore requires connectivity. GARBA does not cache YouTube media for offline playback.

## Measuring coverage

Run:

```bash
npm run youtube:coverage
```

The report separates:

- rights-cleared direct audio;
- exact controllable YouTube routes;
- verified YouTube chapters;
- unchaptered/manual YouTube releases;
- reference-only YouTube evidence;
- other provider fallbacks;
- tracks with no playback route.

The next catalogue phase should improve **exact verified YouTube coverage**, not merely add more links. A new route should include the correct video identity and, for multi-song performances/releases, a verified start timestamp and track duration when possible.
