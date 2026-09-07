# GARBA product polish pass

Date: 7 September 2026

This pass focuses on interaction quality, accessibility, first paint, PWA behaviour, provider playback consistency and community contribution UX. It does not change canonical catalogue facts or overwrite the active song-discovery work.

## Problems found and addressed

### 1. Demo metadata flashed before the catalogue loaded

The shell previously rendered `Traditional demo 01`, `Add artist` and a fake 4:30 duration before real catalogue data arrived. That looked like broken or fabricated content.

The app now starts in an explicit loading state with a restrained skeleton. Initial visible copy is truthful (`Loading Garba…`, `Preparing the collection`) and is replaced as soon as the real catalogue renders.

### 2. Nonstop Garba and Browse Songs could collide

The provider bridge dynamically inserted a second `.browse-button` immediately before the existing Browse Songs button. Both inherited the same CSS grid row, so they could occupy the same grid cell and visually overlap.

Both actions now share a `browse-actions` wrapper. The dynamically inserted Nonstop Garba action automatically lands in that wrapper and the pair uses a responsive flex layout.

### 3. Current-song favourite was effectively mobile-only

The heart beside the current track was hidden on larger screens. Desktop users could open the favourites collection but did not have an equally direct current-track action.

The current-track heart is now available beside the artist across responsive sizes while the top utility still opens the saved collection.

### 4. Playback-provider UI felt disconnected from the player

YouTube/Spotify/nonstop playback used a separate injected visual style. The overlay is now brought back into the GARBA glass/ivory/accent system through the final polish stylesheet.

Keyboard/focus handling is also strengthened: when a provider dialog opens, background controls become inert, focus moves into the dialog, Tab remains contained inside it, and focus returns to the originating control when it closes.

### 5. Provider provenance was not visible until playback

A subtle source badge is now attached to the current track when a verified playback mapping is available, e.g. `YouTube source` or `Spotify source`. This gives listeners a clearer expectation about what the Play button will do.

### 6. Sharing a specific track was unnecessarily awkward

The top utility bar now includes Share. On supported devices it uses the native share sheet; otherwise it copies the deep link. The current `genre` + `song` state is preserved so the recipient can open the same track.

Keyboard shortcut: `Shift+S`.

### 7. Search had no discoverable keyboard shortcut

Pressing `/` outside a text field now opens the existing search interface. The search field wording is clearer: `Search songs or artists`.

### 8. Song-browser result volume was unclear

The sheet now reports the number of currently rendered results next to its title. Song rows also use `content-visibility` where supported to reduce rendering cost for large result sets.

### 9. Offline state was only communicated after a transition

A compact Offline indicator now appears in the utility area whenever the browser reports loss of connectivity. Existing offline/back-online toasts still provide transition feedback.

### 10. The first screen needed stronger readability without hiding the artwork

The player remains artwork-first. Instead of adding an opaque card, a localized radial scrim sits behind track metadata. Controls receive restrained glass treatment and the progress control has a larger interactive thumb.

### 11. SEO/share metadata was too generic

The static page now describes GARBA as an open community-built catalogue and includes canonical/Open Graph/Twitter metadata plus minimal WebApplication structured data.

When a real track is selected, page title and metadata update to the track and artist for better history, tab identification and sharing context.

### 12. PWA polish

The service-worker shell version was bumped so existing installations receive the new UI assets. The new polish JS/CSS are precached. Navigation fallback now ignores query-string differences when matching the cached shell.

The manifest now has a stronger description and launch handling that prefers focusing an existing installed app window where supported.

### 13. Open-source contribution UX was incomplete

The repository mission says everyone should be able to help find missing Garba, but there was no dedicated contributor path.

This pass adds:

- `CONTRIBUTING.md`;
- a Missing song / release issue form;
- a Player / website bug form;
- issue-template links to catalogue status and the rights policy.

Non-code contributions such as old track lists, regional artist information, Gujarati spelling corrections and live-set timestamps are explicitly welcomed.

## Important remaining visual blocker

The current production `data/genres.json` still points to the lightweight SVG courtyard worlds. The 15 supplied 2752 × 1536 source images have been curated and lossless WebP masters were prepared separately, but those large binary masters are not yet present on this GitHub branch.

Do **not** point production genre JSON at missing WebP paths. The site should keep working with the current SVG worlds until the actual WebP files are committed.

Once the binaries are present, the correct follow-up is:

1. keep the 15 highest-quality masters as source/archive assets;
2. derive separate web-delivery variants rather than forcing multi-megabyte masters into first load;
3. art-direct mobile crops or `object-position`/background positions per image;
4. preload only the first critical world and stage the others after first interaction/idle time;
5. update service-worker version and validation together with the asset mapping;
6. verify visual contrast against every selected world on phone, tablet and desktop.

## Validation expectations

`npm run check` remains the source-controlled validation entry point. This pass extends static checks so the polish layer, Browse/Nonstop wrapper, Share control and provider focus helper cannot silently disappear in a future refactor.

Static validation is not a substitute for real device testing. Before calling the product visually complete, test the HTTPS deployment on at least:

- iPhone Safari portrait;
- iPhone Safari short landscape;
- installed iOS Add to Home Screen;
- iPad portrait and landscape;
- Android Chrome;
- desktop Chrome/Edge;
- desktop Safari;
- keyboard-only navigation;
- reduced-motion mode;
- offline/reconnect;
- YouTube provider playback;
- Spotify provider playback;
- Nonstop set and chapter playback.
