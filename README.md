# GARBA

An immersive, responsive and installable Gujarati Garba music player built around one transforming courtyard. The same camera and architecture persist while six genre worlds change atmosphere around a stable player.

## Current UI/PWA slice

- Desktop, compact desktop, iPad/tablet, phone and short-landscape layouts
- Six world states: Traditional, Dandiya, Devotional, Folk, Sanedo, Fusion
- Optimised WebP backgrounds: all six production worlds total well under 1 MB
- Background preloading and ~900 ms world crossfade
- Clean sequential track-title transition with no overlapping old/new text
- Responsive Browse Songs panel
- Mobile draggable sheet: collapsed / medium / full
- Search, favourites and automatic Up Next view
- Persistent favourites and last listening state
- URL state for `?genre=` and `?song=`
- Media Session controls for supported lock screens / OS media surfaces
- Keyboard controls: Space, Left/Right, F, Escape
- PWA manifest, regular/maskable icons and iOS metadata
- Install prompt UX plus iOS Add to Home Screen guidance
- Service-worker caching and offline shell
- Network-first song/genre JSON so catalogue updates stay fresh
- Automatic catalogue refresh after reconnect and when returning to a stale open tab
- Long-title typography safeguards for real catalogue data across phone, tablet and desktop
- Reduced-motion and focus-visible accessibility support
- Browser Back closes the transient song browser without losing the active track

The song catalogue is deliberately isolated because another agent is collecting and verifying songs. See `docs/SONG-CATALOG-CONTRACT.md` before changing `data/songs.json`.

## Run locally

```bash
npm run check
npm run serve
```

Open `http://localhost:4173` in a normal browser. PWA installation requires a secure production origin (HTTPS) or a browser-recognised local development origin.

## Catalogue row

```json
{
  "id": "stable-song-id",
  "title": "Verified song title",
  "artist": "Verified artist",
  "genre": "traditional",
  "durationSeconds": 270,
  "audioUrl": "https://example.com/approved-track.mp3",
  "youtubeId": null,
  "placeholder": false
}
```

Only use audio the site has permission to stream. The UI layer does not invent or silently promote placeholder metadata.

## Project docs

- `docs/DESIGN-SYSTEM.md` - locked visual and motion direction
- `docs/RESPONSIVE-PWA.md` - responsive, bottom-sheet and install behaviour
- `docs/SONG-CATALOG-CONTRACT.md` - collision-safe handoff contract for the song agent
- `docs/CONTENT-SOURCES.md` - content/source notes
- `docs/ROADMAP.md` - remaining integration work
