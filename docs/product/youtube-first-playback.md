# YouTube-only playback

Status: executable source policy is production-stable; primary Play/stage interaction is owned by #408  
Updated: 8 September 2026

For the exact deployed revision and catalogue/playback counts, read:

```text
https://playgarba.com/build-info.json
```

PlayGarba uses YouTube as its only executable music playback source.

Apple Music, Spotify, Amazon Music, SoundCloud, Bandcamp, Qobuz, direct-audio entries and other provider URLs may remain in catalogue provenance while migration is in progress, but the website must not execute those routes. They are research/migration evidence until an exact verified YouTube route replaces them.

## Stable playback-source policy

A song is executable only when PlayGarba has an exact YouTube video identity that is safe for the selected recording.

Accepted exact YouTube routes include:

- an exact verified YouTube video for the selected song;
- a verified YouTube performance/release chapter with an exact `youtubeStartSeconds`;
- another exact YouTube route whose source type and recording identity pass route-truth validation.

Not executable:

- Apple Music;
- Spotify;
- Amazon Music;
- SoundCloud;
- Bandcamp;
- Qobuz;
- GARBA-hosted/direct audio under the current product policy;
- release/reference pages that do not prove the selected recording;
- YouTube search-only evidence;
- track-shaped provider references reused across a multi-song release;
- unchaptered multi-song YouTube releases when the selected song boundary is not verified.

`provider-runtime.js` is the YouTube-only execution-policy layer. It may retain the original provider/source fields as migration evidence while preventing those fields from becoming a playback bypass.

## Interaction contract

The source policy above is independent from the exact control choreography.

The approved product direction is one deliberate primary Play action for an exact verified YouTube route, using a visible integrated YouTube performance stage. #408 owns that implementation and its regression tests. While #408 is active, other agents must not create a competing “press Play, then press a separate YouTube button” contract in runtime code or documentation.

The interaction invariants are stable even while the stage implementation is being refined:

1. The selected recording identity is preserved; PlayGarba never silently substitutes another song or performer.
2. Executable playback uses the documented visible YouTube IFrame player.
3. The YouTube stage is visible whenever scripted YouTube playback is active; there is no hidden audio backend.
4. Play/pause, previous, next and seek operate the same active YouTube player when the selected route supports those actions.
5. Closing/stopping the stage has explicit truthful semantics; it must not leave hidden playback running.
6. An unavailable or migration-only recording remains identifiable and must not expose a fake playable state.
7. The secondary YouTube affordance may remain for provider identity/open-stage utility, but it is not a mandatory second authorization step for a ready primary Play action once #408 lands.

Do not infer deployed interaction behavior from this document alone. `/build-info.json` identifies the deployed revision; the relevant runtime/browser tests determine whether the #408 interaction has shipped on that revision.

## YouTube compliance contract

The implementation uses the documented YouTube IFrame Player API.

The embedded player:

- remains visible while scripted YouTube playback is active;
- keeps at least a 200 × 200 viewport;
- uses YouTube's player rather than extracting media;
- does not separate audio from video;
- does not suppress or remove YouTube-served advertising;
- does not use background playback;
- does not use raw `googlevideo` / `videoplayback` URLs;
- does not use yt-dlp, youtube-dl or equivalent extraction logic;
- does not parse YouTube signature ciphers.

## Route-truth safety

The current runtime layers preserve this ordering contract:

```text
provider-runtime.js
→ player-continuity.js
→ youtube-player-runtime.js
```

The first layer enforces YouTube-only execution. `player-continuity.js` applies route-truth/selection safeguards before `youtube-player-runtime.js` controls the visible player.

A route marked `playbackSearchOnly`, `verified-release-track-reference`, or `verified-unchaptered-youtube-release` is not an exact selected-song route.

No non-YouTube source becomes executable merely because a provider URL exists.

## Catalogue migration rule

Every active non-YouTube route is migration work, not a fallback playback option.

For each affected song or release cluster:

1. find the exact recording on YouTube, preferring official artist, label or distributor uploads;
2. verify title, performer/edition and recording identity;
3. for multi-song videos, use only directly verified source-published chapter starts;
4. add the exact YouTube video/URL and truthful source type;
5. add `youtubeStartSeconds` when a verified chapter boundary exists;
6. preserve stronger existing exact routes;
7. retain old provider URLs only as provenance when useful;
8. keep ambiguous material non-executable rather than guessing.

Never calculate chapter starts from neighbouring durations. Never replace one artist's recording with another simply because a traditional title matches.

## Build-time coverage vs current-session playability

Run:

```bash
npm run youtube:coverage
```

That report classifies the exact source revision:

- `youtubePlayable`: exact controllable YouTube routes accepted at build time;
- chaptered vs untimestamped exact YouTube routes;
- provider/direct-source migration backlog;
- YouTube reference/manual backlog;
- no-route backlog.

These are build/catalogue facts. They are not a promise that every accepted route can play in the current browser session. Connectivity, YouTube API loading, embed restrictions, autoplay/user-gesture state and transient runtime failures are session facts.

For that reason `/build-info.json` reports `sessionPlayableCount: null` rather than converting build-time coverage into a fake live-session number.

## PWA and deployment

`provider-runtime.js`, `player-continuity.js` and `youtube-player-runtime.js` are part of the single GitHub Pages production artifact.

The YouTube IFrame API loads from YouTube at runtime and requires connectivity. PlayGarba does not cache YouTube media for offline playback.

GitHub Pages assembles some production files from several source modules. Source and deployed file bytes therefore need not be identical. `/build-info.json` records the deployed Git revision, catalogue version and SHA-256 digests of key assembled files so future audits do not use byte difference alone as evidence of staleness.
