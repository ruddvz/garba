# Garba catalogue status

Updated: 6 September 2026

## Current verified database

- 6 visual worlds
- 19 music taxonomy categories
- 68 verified releases
- 550 verified song records
- 50 releases marked track-import complete
- 501 songs with exact source-backed durations
- 49 songs with duration deliberately left unknown
- 20 rights-audited free/access resources
- 0 commercial audio files bundled

## Song records by primary category

| Category | Songs |
| --- | ---: |
| Roots / Archive | 1 |
| Traditional Garba | 20 |
| Tran Taali / 3 Taali | 77 |
| Be Taali / 2 Taali | 5 |
| Raas / Dandiya | 36 |
| Dodhiyu / Dodiyo | 2 |
| Hinch | 5 |
| Dakla | 10 |
| Sanedo | 4 |
| Mataji / Devotional | 229 |
| Krishna Garba / Raas | 38 |
| Folk / Lokgeet | 1 |
| Live Garba | 11 |
| Modern Gujarati Garba | 64 |
| Hip-hop Garba | 21 |
| Electronic / Fusion | 18 |
| DJ / Remix | 1 |
| Bollywood / Filmi Garba | 2 |
| Instrumental / Cinematic | 5 |

`category` is the primary classification. `styles` and release-level `categories` provide secondary classification without duplicating a track.

## Fully imported examples

Complete track-level imports currently include:

- Falguni Pathak's 30-track `Non Stop Garba by Falguni Pathak`
- Atul Purohit's `Maro Garbo Non Stop Garba Tran Taali`
- Praful Dave's `Navdurgani Navratri`
- Aishwarya Majmudar's `Rangtaali`
- `Ramzat - Non Stop Garba`
- `Ramzat 2 - Non Stop Trantaali Garba`
- `Khamma 2`
- the 1993 `Khelaiya Non-Stop Disco Dandia 93`
- Soor Mandir `Re Lol`, `Anand`, `Jay Ho`, `Jagran`, `Ude Re Gulal`, `Taali`, `Rangoli`, `Chandaliyo` and `Thanganat` releases
- Hemant Chauhan's `Shyam (Non Stop Raas, Vol. 3)` and `Madhuvan (Bansari-2) Non-Stop Raas`
- verified Be Taali, Hinch and live United Way material

## Source-of-truth layout

The large catalogue is deliberately chunked so it is easy to review and update without one giant conflict-prone JSON file.

- `data/catalogue/songs/` contains 17 song chunks totalling 550 records.
- `data/catalogue/releases/` contains 5 release chunks totalling 68 records.
- `data/catalogue/free-sources/` contains 2 rights-audited acquisition chunks totalling 20 records.
- `data/catalogue/index.json` records the expected counts and generated-file paths.
- `data/taxonomy.json` contains the 19-category music taxonomy.
- `data/genres.json` maps the catalogue into the six presentation worlds.

Run `node scripts/build-catalogue.mjs` to generate the combined `data/songs.json`, `data/releases.json` and `data/free-audio-sources.json` files used by the application.

## What complete means

This repository does not claim to contain every Garba recording ever published. `trackImportComplete: true` means the named release has been imported at track level from the verified source used in this pass.

Unknown dates, durations and tracklists remain unknown rather than being guessed.
