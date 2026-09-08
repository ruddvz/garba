# GARBA visual library

The production artwork is the approved 15-image courtyard set. The compact runtime pack remains the default for ordinary displays, while an optional 4K-class pack can be deployed for screens whose physical viewport width benefits from additional source pixels.

## Standard production pack

Canonical repository bundle:

`assets/backgrounds/garba15-2k.zip`

The ZIP contains exactly these 15 files at its root, each 2048px-wide WebP:

1. `01-bollywood-garba-courtyard.webp`
2. `02-rhythmic-drums-courtyard-a.webp`
3. `03-devotional-garba-courtyard.webp`
4. `04-colourful-garba-courtyard-a.webp`
5. `05-fusion-gujarati-neon.webp`
6. `06-fusion-abstract-neon.webp`
7. `07-dandiya-purple-courtyard.webp`
8. `08-colourful-garba-courtyard-b.webp`
9. `09-warm-stage-courtyard.webp`
10. `10-dandiya-silhouette-courtyard.webp`
11. `11-master-dark-courtyard.webp`
12. `12-rhythmic-drums-courtyard-b.webp`
13. `13-traditional-marigold-courtyard.webp`
14. `14-gujarati-folk-courtyard.webp`
15. `15-traditional-canopy-courtyard.webp`

## 4K-class pack

The approved high-resolution derivative pack is:

`garba15-4k-q95.zip`

- Source masters: the exact 15-file lossless WebP set at `2752 × 1536`.
- 4K-class output: `3840 × 2143` for every image.
- Resampling: Lanczos.
- Crop: none.
- Aspect-ratio distortion: none.
- Website encoding: WebP quality 95.
- SHA-256: `257ea78961334c9bf79f2a135313d49c63b3b2b0c0bae4021e41ad60f7f71e92`.

When committed for production, the 15 extracted WebPs belong at:

`assets/backgrounds/library-4k/`

The runtime uses the 4K library only when `viewport width × devicePixelRatio` exceeds 2200 physical pixels and the connection is not constrained by Save-Data/2G. Phones and ordinary displays continue using the smaller 2K library. 4K artwork is loaded on demand rather than preloaded as a complete 23 MB set. If a requested 4K image is unavailable, the runtime immediately falls back to the matching 2K WebP and then to the lightweight SVG world.

## Art-directed genre buckets

- Traditional: 11, 15, 13, 09
- Dandiya: 10, 07
- Devotional: 03
- Folk: 14, 02, 12
- Sanedo: 08, 04
- Fusion: 05, 06, 01

The first image in each bucket is the default. Production runtime code selects approved alternates deterministically for shareable song URLs.

An older visual-library prototype is retained at `src/optional/visual-library.js`; it is not part of the current production first-load path.

The Pages workflow extracts the canonical 2K ZIP into `assets/backgrounds/library/` in the deploy artifact. The PWA precaches only lightweight fallbacks and caches photographic artwork on demand, avoiding a 15-image download at install time. Source ZIPs are not intended to be delivered publicly.
