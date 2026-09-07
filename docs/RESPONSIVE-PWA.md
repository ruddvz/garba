# Responsive and PWA behaviour

This document is the implementation contract for the player shell. Catalogue collection remains separate so song/release work can continue without colliding with UI changes.

## Breakpoint strategy

The interface is fluid first. Breakpoints only change behaviour when the interaction model needs to change.

### Desktop: above 1100 px

- Full courtyard composition.
- Player stays centred in the dark architectural opening.
- Search, share, favourites, queue and Nonstop remain compact utilities rather than a second navigation bar.
- Song browser is a centred translucent panel, capped so rows remain readable on wide monitors.
- Genre labels are text-led, never card-led.

### Tablet / compact desktop: 701–1100 px

- Player remains the same product, not a stretched mobile layout.
- Typography and control sizes reduce via `clamp()`.
- Song browser expands to use more of the available width.
- Portrait tablets use a higher background crop and narrower player measure.
- iPad portrait and landscape are first-class layouts.

### Phone: 700 px and below

- Brand and essential utilities remain reachable at the top edge.
- Favourite stays with the current-track identity.
- Track typography is art-directed for the dark central architecture and constrained for long verified titles.
- Genre navigation scrolls horizontally instead of squeezing six labels into one phone width.
- Browse Songs becomes a draggable bottom sheet.
- Provider playback opens as a bottom-aligned modal surface with safe-area spacing.

### Short landscape screens

A height-based query handles phones rotated to landscape and short browser windows:

- Track title and controls become compact.
- Genre strip remains reachable.
- Browse/Nonstop actions move away from the centre player.
- The sheet uses taller snap heights to preserve useful list space.

## Mobile sheet states

The mobile browser has four runtime states:

- `closed`: completely off-screen.
- `collapsed`: compact mini-player only.
- `medium`: default browsing state.
- `full`: expanded search/browse state.

The drag handle supports upward/downward movement between those states. The song list itself is not the drag target, preventing scroll/drag conflicts.

When the sheet acts as a mobile modal:

- background player controls become inert;
- keyboard focus stays inside the sheet;
- closing restores focus to the control that opened it;
- Escape clears an active search first, then closes the sheet.

## Safe areas

Major edge controls use `env(safe-area-inset-*)`. This matters for:

- iPhones with Dynamic Island/notches;
- home-indicator spacing;
- standalone PWA mode;
- landscape cut-outs.

## Motion

- World changes use restrained crossfades rather than moving the whole interface.
- Track text exits before incoming text appears, preventing overlapping titles.
- Playback controls stay geometrically stable during song/genre changes.
- `prefers-reduced-motion` removes non-essential animation.
- Decorative work pauses when the page is hidden.

## 2K courtyard loading

The deployed Pages artifact contains the approved 15-image 2K WebP visual pack, while lightweight SVG worlds remain bundled as safe fallbacks.

`visual-library.js` deliberately does **not** preload every 2K world at startup:

- only the currently visible genre is promoted to its 2K WebP during initial catalogue bootstrap;
- other genre records keep lightweight SVG backgrounds until the listener enters that world;
- on genre change, the appropriate approved 2K image is decoded on demand and then replaces the visible fallback;
- deterministic song URLs may select an approved alternate from the same genre bucket;
- Save-Data and 2G-class connections keep the lightweight fallback instead of forcing multi-megabyte artwork downloads.

This preserves the visual quality of the supplied courtyard library without turning first load into a six-background download.

## PWA

`manifest.webmanifest` provides:

- standalone display;
- native PNG, scalable SVG and maskable launcher artwork;
- home-screen shortcuts for Traditional, Dandiya and Browse Songs;
- dark startup/background colours;
- focus-existing launch behaviour where supported.

The service worker separates content by update sensitivity:

- catalogue/discovery JSON: network-first so new collection work is visible quickly;
- JavaScript, CSS and the manifest: network-first so fixes reach installed PWAs without waiting for a cache cycle;
- immutable artwork/icons: cache-first after first use;
- lightweight SVG visual fallbacks: precached with the shell;
- 2K WebPs: cached only when actually requested, not during PWA installation.

Navigation falls back to the cached app shell/offline page when the network is unavailable. External provider audio/video is never silently downloaded for offline use.

## Installation UX

- Chromium-family browsers use `beforeinstallprompt` when available.
- iOS Safari receives concise Add to Home Screen guidance.
- Installation nudges are suppressed after dismissal.
- Install prompts do not compete with an open song browser.

## Playback and OS media controls

Pointer, touch, keyboard Space and supported Media Session Play actions all route through the same Play control. This is important because the playback bridge may resolve a catalogue record to local audio, an approved YouTube source, Spotify, another cited provider, a verified performance inside a nonstop set, or a provider-search fallback.

Media Session support includes the actions browsers expose from:

- play / pause;
- previous / next;
- seek backward / forward / to position;
- lock-screen/control-centre metadata and GARBA artwork.

Unknown catalogue durations stay unknown in the UI rather than being presented as `0:00`.

## Catalogue and discovery resilience

The catalogue remains source-driven. Search begins with exact title/artist matching and can fall back to taxonomy-aware discovery across Garba categories, styles and aliases when ordinary matching returns nothing.

The app refreshes catalogue data after reconnecting and when a previously open tab becomes visible after its catalogue has gone stale. A loading failure becomes an explicit retry state instead of an indefinite spinner.

## QA matrix before calling the product complete

Static CI covers document/runtime integrity, imported modules, service-worker coverage, catalogue generation, discovery data and Pages artifact construction. Real-device visual/interaction QA is still a separate release gate and should include:

- small and large iPhones in Safari;
- installed iOS PWA behavior;
- Android Chrome and installed PWA behavior;
- iPad portrait and landscape;
- desktop Safari/Chrome/Firefox-class browsers;
- keyboard-only navigation and provider modals;
- reduced-motion and increased-contrast preferences;
- offline, reconnect and stale-cache scenarios;
- Save-Data/slow-network behavior;
- YouTube, Spotify, external-source and Nonstop playback paths.

Do not mark those browser/device scenarios as verified until they have actually been exercised on the relevant environments.
