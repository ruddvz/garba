# Background asset manifest

The supplied source set contains 15 distinct 2752 x 1536 courtyard images. Every usable visual is represented in this repository as a web-optimised WebP under `assets/backgrounds/library/`.

The original 2K JPEG uploads remain the source masters. Repository derivatives are intentionally smaller for PWA performance and must not be treated as replacements for the source masters.

## Complete visual library

| File | Intended use |
|---|---|
| `01-bollywood-garba-courtyard.webp` | Bollywood / general Garba alternate |
| `02-rhythmic-drums-courtyard-a.webp` | Rhythm and percussion alternate |
| `03-devotional-garba-courtyard.webp` | Devotional primary |
| `04-colourful-garba-courtyard-a.webp` | Sanedo primary |
| `05-fusion-gujarati-neon.webp` | Fusion primary |
| `06-fusion-abstract-neon.webp` | Fusion alternate |
| `07-colourful-garba-courtyard-b.webp` | High-energy colourful alternate |
| `08-warm-stage-courtyard.webp` | Warm traditional / landing alternate |
| `09-dandiya-classic-courtyard.webp` | Dandiya alternate |
| `10-dandiya-purple-courtyard.webp` | Dandiya primary |
| `11-master-dark-courtyard.webp` | Master / landing primary |
| `12-rhythmic-drums-courtyard-b.webp` | Rhythm and percussion alternate |
| `13-traditional-marigold-courtyard.webp` | Traditional / devotional alternate |
| `14-gujarati-folk-courtyard.webp` | Folk primary |
| `15-traditional-canopy-courtyard.webp` | Traditional primary |

## Player mapping

| UI world | Library asset |
|---|---|
| Landing | `11-master-dark-courtyard.webp` |
| Traditional | `15-traditional-canopy-courtyard.webp` |
| Dandiya | `10-dandiya-purple-courtyard.webp` |
| Devotional | `03-devotional-garba-courtyard.webp` |
| Folk | `14-gujarati-folk-courtyard.webp` |
| Sanedo | `04-colourful-garba-courtyard-a.webp` |
| Fusion | `05-fusion-gujarati-neon.webp` |

Responsive crops or higher-quality derivatives should always be regenerated from the original 2K JPEGs rather than from these web derivatives.
