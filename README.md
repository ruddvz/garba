# GARBA

An immersive, responsive and installable Gujarati Garba music player built around one transforming courtyard. The same camera and architecture persist while six genre worlds change atmosphere around a stable player.

## Current UI/PWA slice

- Desktop, compact desktop, iPad/tablet, phone and short-landscape layouts
- Six world states: Traditional, Dandiya, Devotional, Folk, Sanedo, Fusion
- Background preloading and smooth world crossfades
- Clean sequential track-title transition with no overlapping old/new text
- Responsive Browse Songs panel
- Mobile draggable sheet: collapsed / medium / full
- Search, favourites and automatic Up Next view
- Persistent favourites and last listening state
- URL state for `?genre=` and `?song=`
- Media Session controls for supported lock screens / OS media surfaces
- Keyboard controls: Space, Left/Right, F, Escape
- PWA manifest and installable app shell
- Service-worker caching and offline shell
- Network-first song/genre JSON so catalogue updates stay fresh
- Automatic catalogue refresh after reconnect and when returning to a stale open tab
- Long-title typography safeguards for real catalogue data across phone, tablet and desktop
- Reduced-motion and focus-visible accessibility support
- Browser Back closes the transient song browser without losing the active track
- GitHub Pages deployment workflow from `main`

The verified catalogue and its rights/source metadata live under `data/` and `docs/catalogue/`. The UI reads `data/songs.json` and `data/genres.json` without owning the underlying catalogue collection process.

## Run locally

```bash
npm run check
npm run serve
```

Open `http://localhost:4173` in a normal browser. PWA installation requires a secure production origin (HTTPS) or a browser-recognised local development origin.

## Project docs

- `docs/DESIGN-SYSTEM.md` - locked visual and motion direction
- `docs/RESPONSIVE-PWA.md` - responsive, bottom-sheet and install behaviour
- `docs/SONG-CATALOG-CONTRACT.md` - collision-safe UI/catalogue handoff contract
- `docs/catalogue/SCHEMA.md` - canonical catalogue schema
- `docs/catalogue/RIGHTS.md` - rights and acquisition rules
- `docs/catalogue/STATUS.md` - catalogue status
- `docs/ROADMAP.md` - remaining integration work
