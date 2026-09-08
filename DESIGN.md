# PlayGarba design contract

This file is the visual and interaction contract for PlayGarba. It exists so future UI work improves one coherent product instead of layering unrelated design ideas over each other.

## Design read

PlayGarba is an immersive Gujarati Garba listening product, not a generic music dashboard and not a marketing template. The interface should feel culturally specific, cinematic and calm enough to disappear behind the music.

The artwork carries most of the visual identity. Controls should feel deliberate and tactile without becoming decorative chrome.

### Working design dials

- Design variance: 6/10. Distinct composition and cultural character, but not experimental at the cost of listening.
- Motion intensity: 4/10. Purposeful state changes and tactile feedback, not constant movement.
- Visual density: 3/10 on the player, 5/10 in Explore. The player stays spacious. Explore can carry more information because discovery is the task.

These values are directional, not implementation constants.

## Product priorities

In order:

1. Playback is obvious and reliable.
2. Song title, artist and current listening context remain readable without layout movement.
3. Genre and Nonstop selection is understandable at a glance.
4. Explore is easy to enter, easy to leave and preserves listening continuity.
5. Mobile PWA use feels intentional, not like a desktop page squeezed into a phone.
6. The visual system feels recognisably Gujarati and recognisably PlayGarba without relying on extra decoration.
7. Supporting pages stay quieter than the player and never compete with it.

## Visual system

### Artwork

- Use the approved current high-resolution courtyard artwork library for the player and the six listening worlds.
- The six worlds are Traditional, Dandiya, Devotional, Folk, Sanedo and Fusion.
- Do not reintroduce retired world artwork as visible first-paint content.
- Do not invent additional visual worlds.
- Editorial imagery may be used for cultural storytelling outside the six listening worlds when it has been explicitly approved.
- Preserve artwork quality. Prefer responsive source selection and adaptive resolution over aggressive compression or unnecessary full-resolution downloads on mobile.
- Avoid overlays that flatten the artwork. Add only as much scrim as required for text and control contrast.

### Colour

- Keep the product on one dark, warm-neutral base with ivory text and one contextual accent.
- Accent colour may shift with the current world, but each screen must still read as one palette rather than a collection of unrelated colours.
- Do not add generic purple-blue AI gradients.
- Use glow sparingly. Glow should communicate selection, playback state or focus, not decorate every element.
- Keep text contrast at WCAG AA or better for functional copy and controls.

### Typography

- The player is a product surface. Use the existing sans system for most controls and metadata.
- Display typography can carry more character on editorial or cultural pages, but do not mix type families simply to make a word feel special.
- Song titles are the primary text element in the player. Long and very long titles must preserve the same vertical anchor as short titles.
- Avoid tiny helper text over detailed imagery unless contrast is guaranteed.
- Keep button labels short and on one line.

### Shape language

- Default to open surfaces and spacing instead of putting every element inside a rounded card.
- Cards are allowed when they communicate a real grouped object, such as a release or collection in Explore.
- Do not nest cards inside cards.
- Pills are reserved for compact filters, tags or states that benefit from that shape. Do not turn ordinary navigation or every control into a pill.
- Main transport controls should read as controls first, not decorative medallions.

## Player

### Hierarchy

The visual order should be:

1. Current song title
2. Artist or performance identity
3. Play/pause
4. Previous and next
5. Progress and time
6. Current genre or Nonstop context
7. Explore and utility actions

Nothing secondary should become more visually dominant than the song and play control.

### Transport controls

- Keep previous, play/pause and next visually open.
- Preserve at least 44px touch targets even when the visible icon is smaller.
- Play/pause is the focal transport control and can be larger than previous/next.
- Avoid enclosing the whole transport in a glass card when spacing and hierarchy can do the job.
- Avoid visible circular button chrome unless it communicates a specific state.
- The progress control should not need a decorative tray. A clear track, readable time and truthful seek behaviour are enough.
- Hover effects must never be required to discover functionality.
- Focus-visible styling must remain obvious on keyboard navigation.

### Genre rail

- Selection must not change item geometry or cause layout movement.
- Keep one selection language. The current dandiya marker is the preferred visual cue.
- Do not stack pill fill, border, glow, underline and marker on the same selected genre.
- Preserve horizontal scrolling on small screens.
- Use the approved genre icon assets consistently, including Folk.

### Explore entry

- Explore should read as a clear directional affordance, not another decorated button competing with transport.
- Its position must remain stable across song changes and runtime initialisation.
- Entering Explore must not stop playback unless the user explicitly chooses another item.
- Returning from Explore should restore the previous player context and scroll/state where practical.

## Explore

Explore is a browsing surface, so it can be denser than the player.

- Keep search, collections, releases, songs, artists and Nonstop understandable without creating duplicate navigation systems.
- Do not manufacture playlist hierarchies when the catalogue already provides the source of truth.
- Use canonical song/release IDs everywhere.
- Every row or card must have one obvious primary action.
- Secondary actions should stay visually quiet until needed, but touch users must still be able to reach them.
- Empty, loading and error states must be designed, not left as blank gaps.
- Back navigation must be explicit inside detail views.
- Preserve listening continuity while browsing.

## Supporting pages

Supporting pages exist to explain PlayGarba, PWA installation and Garba culture. They should be calmer than the player.

- Keep hero copy concise.
- Avoid repeating the same CTA intent under different labels.
- Use images as editorial anchors rather than filling every section with image cards.
- Keep section count low. Remove sections that repeat information already communicated above.
- Prefer editorial lines, whitespace and grouped text over generic three-card feature grids.
- Install instructions must be device-specific and easy to scan.

## Motion

Motion must explain state, continuity or causality.

Use animation when it helps the listener understand:

- a sheet opening from its trigger
- a panel entering or leaving
- a selection changing
- playback state changing
- Explore navigation preserving continuity
- a temporary success/error message appearing

Do not animate simply because an element exists.

### Motion rules

- Entering UI generally uses ease-out behaviour so it arrives quickly and settles naturally.
- Exiting UI can be faster than entering UI.
- Frequent controls should feel nearly immediate.
- Prefer opacity and transform for performant motion.
- Avoid large background transforms that risk revealing empty edges on mobile.
- Interruptible interactions must remain interruptible. Do not trap input behind long animations.
- Respect `prefers-reduced-motion` across player, Explore and supporting pages.
- No perpetual swinging, pulsing or ambient movement unless the motion communicates an active state such as playback.

## Responsive and PWA

Design mobile and desktop as first-class surfaces.

### Mobile

- Use dynamic viewport units where appropriate so iOS browser chrome does not create black strips or layout jumps.
- Respect safe-area insets on every fixed top or bottom control.
- Keep touch targets at least 44px.
- Never rely on hover-only affordances.
- Test 320px to 430px widths and short landscape screens.
- Sheets must always provide an obvious close/back path and should also support backdrop dismissal where the interaction is safe.

### Tablet and desktop

- Do not merely scale the mobile layout up.
- Preserve readable line lengths and intentional negative space.
- Keep primary content centred around the listening task rather than stretching controls across the full viewport.
- Verify keyboard focus order and pointer hover separately from touch behaviour.

### PWA

- Standalone mode must fill the full viewport without uncovered strips.
- App icons and launch surfaces must use approved PlayGarba assets.
- Offline and update states should be understandable and should never suggest playback is available when the required media source is unavailable.

## Accessibility

Every UI change must preserve or improve:

- semantic buttons and links
- visible keyboard focus
- 44px minimum touch targets for primary interactive controls
- readable contrast over artwork
- reduced-motion behaviour
- screen-reader labels for icon-only controls
- no layout changes that move the currently focused element unexpectedly
- no hidden actions that are discoverable only by hover

## Performance

- Keep the initial player payload focused on what is visible immediately.
- Preload only the likely first-paint artwork.
- Load alternative high-resolution backgrounds on demand.
- Respect Save-Data and slow connection signals when selecting image tiers.
- Prefer WebP/AVIF where browser support and the existing pipeline allow it.
- Avoid runtime libraries for effects that CSS already handles well.
- Avoid re-render or layout work tied continuously to pointer/scroll input.

## UX writing

- Use short, direct labels: Play, Pause, Explore, Search, Back, Install.
- Avoid implementation language in user-facing copy.
- Do not explain features twice on the same screen.
- Error messages should say what happened and what the listener can do next.
- Empty states should provide a useful next action.

## Anti-pattern list

Do not ship:

- generic glass cards around every control
- nested card grids
- decorative circles around every icon
- multiple simultaneous selection treatments
- purple-blue gradient decoration without product meaning
- random serif emphasis inside sans headlines
- full-page motion for frequently used controls
- hover-only actions on touch-relevant surfaces
- static layouts that shift when long song titles load
- old/retired world artwork on visible public surfaces
- duplicated CTA intents
- unsupported visual claims, fake content or invented catalogue metadata

## UI pull request gate

A UI PR is not done until it includes or verifies all applicable items below:

1. Current remote `main` was fetched before implementation.
2. The change does not overwrite newer catalogue or playback work.
3. Desktop and mobile first paint were checked together.
4. At least one narrow mobile viewport and one short landscape viewport were checked.
5. Touch targets, focus-visible states and reduced-motion behaviour were checked.
6. Long and very long song titles do not move fixed player anchors.
7. No retired artwork is visible during first paint.
8. Loading, empty and error states remain understandable when the changed surface has them.
9. Motion has a clear purpose and is not perpetual decoration.
10. `npm run check` passes.
11. Browser/PWA smoke tests pass when the change touches runtime UI.
12. Visual QA is bounded: one combined inspection pass, one grouped fix pass, then one confirmation pass.

## Current coordination notes

Before starting another UI lane, inspect open pull requests. In particular, avoid independently recreating active work around:

- player control simplification
- single-domain/canonical-route consolidation
- adaptive 4K background delivery

If an existing PR already owns the lane, rebase or supersede it deliberately instead of creating a second competing implementation.

## Reference inputs

This contract adapts ideas from three external design-engineering resources to PlayGarba's existing product rather than copying their default visual styles:

- Emil Kowalski, AI Skills for Design Engineers: https://emilkowal.ski/skill
- Taste Skill, design-taste-frontend: https://github.com/leonxlnx/taste-skill
- Impeccable: https://github.com/pbakaus/impeccable

The repo's current product behaviour, approved assets and user decisions remain the source of truth when they conflict with a generic external rule.
