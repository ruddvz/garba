# YouTube-only playback

Status: production policy, 2026-09-08

PlayGarba uses YouTube as its only executable music playback source.

Apple Music, Spotify, Amazon Music, SoundCloud, Bandcamp, Qobuz, direct-audio entries and other provider URLs may remain in catalogue provenance while migration is in progress, but the website must not execute those routes. They are research references only until an exact verified YouTube route replaces them.

## Playback source policy

A song is playable only when PlayGarba has an exact YouTube video identity that is safe for the selected recording.

Accepted one-tap YouTube routes include:

- an exact verified YouTube video for the selected song;
- a verified YouTube performance/release chapter with an exact `youtubeStartSeconds`;
- an exact YouTube route already represented by a verified `youtubeId`.

Not one-tap playable:

- Apple Music;
- Spotify;
- Amazon Music;
- SoundCloud;
- Bandcamp;
- Qobuz;
- GARBA-hosted/direct audio;
- release/reference pages that do not prove the selected recording;
- YouTube search-only evidence;
- unchaptered multi-song YouTube releases when the selected song boundary is not verified.

`provider-runtime.js` is now a YouTube-only policy layer. It strips executable non-YouTube routes from the runtime catalogue while retaining the original URL/provider as migration evidence.

## User experience

The YouTube player is collapsed by default. PlayGarba does not create or play a hidden YouTube audio backend.

A compact YouTube-logo button is fixed to the safe bottom-right area of the player. For a song with an exact YouTube route:

1. the user clicks the YouTube button;
2. the visible YouTube player dock opens;
3. YouTube playback starts or cues according to browser autoplay rules;
4. PlayGarba play/pause, previous, next and seek controls operate the same visible YouTube player;
5. closing the YouTube dock stops and destroys the active YouTube player.

If the current song has not yet been migrated to an exact YouTube route, the YouTube button remains present but subdued and explains that the source is not mapped yet.

The normal Play control does not silently open a provider or create hidden playback. If the visible YouTube player has not been opened yet, the UI asks the user to use the YouTube button.

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

Load order remains:

```text
provider-runtime.js
→ player-continuity.js
→ youtube-player-runtime.js
```

The first layer enforces the YouTube-only execution policy. `player-continuity.js` then applies route-truth protections before `youtube-player-runtime.js` makes playback decisions.

A route marked `playbackSearchOnly`, a `verified-release-track-reference`, or a `verified-unchaptered-youtube-release` is not treated as an exact playable selection.

No provider fallback is allowed to become executable merely because an external provider URL exists.

## Catalogue migration rule

Every non-YouTube route is migration work.

For each affected song or release cluster:

1. find the exact recording on YouTube, preferring official artist, label or distributor uploads;
2. verify title, artist/edition and recording identity;
3. for multi-song videos, verify the exact start timestamp rather than deriving it from neighbouring durations;
4. add `youtubeId`, `playbackProvider: "youtube"`, the exact YouTube URL and the truthful source type;
5. add `youtubeStartSeconds` and `durationSeconds` when a verified chapter boundary is available;
6. keep ambiguous material non-playable rather than guessing.

Do not replace one artist's recording with another recording merely because the song title is traditional or identical.

## PWA and deployment

`provider-runtime.js`, `player-continuity.js` and `youtube-player-runtime.js` are part of the GitHub Pages/PWA runtime shell.

The YouTube IFrame API loads from YouTube at runtime and requires connectivity. PlayGarba does not cache YouTube media for offline playback.

## Measuring migration progress

Run:

```bash
npm run youtube:coverage
```

The report should be read as a migration report:

- exact controllable YouTube routes are playable coverage;
- YouTube reference/manual routes still require route-truth work;
- Apple Music, Spotify, Amazon Music and other provider routes are migration backlog;
- direct audio is not an executable fallback under the YouTube-only product policy;
- tracks with no route also remain migration backlog.

The target is 100% truthful YouTube playback coverage without weakening exact-recording verification.
