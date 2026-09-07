# Responsive and PWA behaviour

This document is the implementation contract for the player shell. The song catalogue is intentionally separate so another agent can update song data without touching UI code.

## Breakpoint strategy

The interface is fluid first. Breakpoints only change behaviour when the interaction model needs to change.

### Desktop: above 1100 px

- Full courtyard composition.
- Player stays centred in the dark architectural opening.
- Search, favourites and queue remain in the top-right utility group.
- Song browser is a centred 74vw translucent panel, capped at 1120 px.
- Genre labels are text-led, never card-led.

### Tablet / compact desktop: 701–1100 px

- Player remains the same product, not a stretched mobile layout.
- Typography and control sizes reduce via `clamp()`.
- Song browser expands to about 88–92vw.
- Portrait tablets use a slightly higher background crop and a narrower player measure.
- iPad portrait and landscape are both first-class layouts.

### Phone: 700 px and below

- Brand stays top-left. Search and queue stay top-right.
- Favourite moves into the track block.
- Track title is art-directed for the dark arch and capped to avoid dominating the screen.
- Genre navigation is intentionally horizontally scrollable. It must not squeeze six labels into one phone width.
- Browse Songs becomes a draggable bottom sheet.

### Short landscape screens

A height-based query handles phones rotated to landscape and short browser windows:

- Track title and controls become compact.
- Genre strip remains reachable.
- Browse Songs moves to a fixed low-priority action near the lower-right safe area.
- The sheet uses taller snap heights to preserve useful list space.

## Mobile sheet states

The mobile browser has four runtime states:

- `closed`: completely off-screen.
- `collapsed`: compact mini-player only.
- `medium`: 56dvh, the default Browse Songs state.
- `full`: 82dvh for search or deliberate expansion.

The drag handle supports:

- swipe up: collapsed → medium → full;
- swipe down: full → medium → collapsed → closed;
- tap: cycles between useful open states.

The song list itself is not used as the drag target, preventing scroll/drag conflicts.

## Safe areas

All major edge controls use `env(safe-area-inset-*)` through shared variables. This matters for:

- iPhones with Dynamic Island/notches;
- home-indicator spacing;
- standalone PWA mode;
- landscape device cut-outs.

## Motion

- World changes crossfade in about 900 ms.
- Track text exits upward, is replaced once, then enters from below. Outgoing and incoming titles never overlap.
- Playback controls stay geometrically stable during a genre change.
- `prefers-reduced-motion` collapses transitions to effectively instant state changes.

## PWA

`manifest.webmanifest` provides:

- standalone display;
- maskable and regular icons;
- home-screen shortcuts for Traditional, Dandiya and Browse Songs;
- dark startup/background colours.

`sw.js` uses two policies:

- app shell, UI and background worlds: cache-first after install;
- `data/songs.json` and `data/genres.json`: network-first so catalogue updates from the song agent are not trapped behind an old service-worker cache.

If the network is unavailable, the shell, cached catalogue and visual worlds remain available. External streaming audio is not forcibly downloaded for offline use.

## Installation UX

- Chromium-family browsers use `beforeinstallprompt` and show a restrained install banner after a delay.
- iOS Safari receives a concise Add to Home Screen instruction because iOS does not expose the same programmatic prompt.
- Installation nudges are suppressed for seven days after dismissal.
- No install prompt is shown while the song browser is open.

## OS media controls

The Media Session API is wired for browsers that support it:

- play / pause;
- previous / next;
- seek backward / forward / to position;
- lock-screen/control-centre metadata.

Metadata comes only from the current catalogue row. The UI layer does not invent song facts.

## Catalogue resilience

The app refreshes the song and genre JSON when connectivity returns and when a previously open tab becomes visible after the catalogue has been stale for more than five minutes. A changed catalogue is adopted without forcing the current playing source to restart.

Long song titles receive compact typography classes automatically. This keeps verified real-world titles from breaking the dark-arch composition on narrow phones or compact tablets.

## QA matrix before production release

The responsive CSS explicitly covers these classes of viewport. They remain release-gate targets for real-device/browser QA after deployment to an HTTPS origin:

- 360–390 px phones and larger modern phones;
- iPhone portrait and short landscape with safe areas;
- iPad Mini / standard iPad portrait and landscape;
- 1024–1100 px compact desktop/tablet windows;
- common 1366, 1440, 1920 and wider desktop widths;
- standalone PWA display mode;
- reduced-motion mode and keyboard navigation.

The current environment can statically validate the responsive/PWA contract, but its managed browser blocks local origins. Do not mark visual browser/device QA complete until the app is available on a real HTTPS preview or production origin.
