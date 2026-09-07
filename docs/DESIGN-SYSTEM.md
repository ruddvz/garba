# Design system

## Core visual idea

One Gujarati courtyard, six music worlds. Architecture, camera and player placement stay stable. Genre changes alter lighting accents, small perimeter decoration, selected textiles and restrained props rather than rebuilding the scene.

## Worlds

| Genre | Direction |
| --- | --- |
| Traditional | warm amber, maroon, antique brass |
| Dandiya | restrained violet/magenta rhythm accents |
| Devotional | crimson, marigold, candle/brass warmth |
| Folk | earthy plaster, indigo textiles, peripheral percussion |
| Sanedo | playful but restrained Gujarati craft colour |
| Fusion | lavender architectural accents and contemporary geometry |

## UI principles

- Background remains the dominant visual.
- Warm ivory typography, not harsh white.
- Song title uses an editorial system serif. Controls and metadata use the system sans stack so the PWA has no font-network dependency.
- No large opaque player card.
- Playback controls stay stable during genre changes.
- Genre selector is text-led and horizontally scrollable when space is constrained.
- Active genre uses one tiny accent dot plus a thin underline.
- Song browser is a dark translucent sheet with editorial rows, no album-card grid.
- Current song uses a tiny dot + 2px side rule, never a broad gold block.
- Avoid fake ratings, play counts, reviews or catalogue facts.
- Do not recolour the whole UI by genre. Accent only small states.
- Mobile is art-directed, not a compressed desktop layout.
- Touch targets stay roughly 40–44px even when the visual icon is smaller.

## Motion

- Background crossfade target: ~900 ms.
- Track information swaps sequentially: outgoing text fades/moves out before incoming text appears.
- Controls do not duplicate or crossfade during track/genre changes.
- Prefer environmental transformation over moving UI.
- Respect `prefers-reduced-motion`.

## Responsive reference

See `RESPONSIVE-PWA.md` for phone, tablet, desktop, landscape and bottom-sheet behaviour.
