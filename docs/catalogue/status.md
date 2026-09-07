# Garba catalogue status

Updated: 6 September 2026

## Current verified database

- 6 visual worlds
- 19 music taxonomy categories
- 79 verified releases
- 585 verified song records
- 61 releases marked track-import complete
- 535 songs with exact source-backed durations
- 50 songs with duration deliberately left unknown
- 20 rights-audited free/access resources
- 40 discovery artists
- 93 community/editorial/blog recommendation signals
- 10 indexed live/nonstop sets
- 158 timestamped live/nonstop chapters
- 2 playback-source maps
- 0 commercial audio files bundled

## Song records by primary category

| Category | Songs |
| --- | ---: |
| Roots / Archive | 1 |
| Traditional Garba | 20 |
| Tran Taali / 3 Taali | 78 |
| Be Taali / 2 Taali | 5 |
| Raas / Dandiya | 36 |
| Dodhiyu / Dodiyo | 2 |
| Hinch | 5 |
| Dakla | 11 |
| Sanedo | 4 |
| Mataji / Devotional | 233 |
| Krishna Garba / Raas | 45 |
| Folk / Lokgeet | 3 |
| Live Garba | 11 |
| Modern Gujarati Garba | 83 |
| Hip-hop Garba | 21 |
| Electronic / Fusion | 19 |
| DJ / Remix | 1 |
| Bollywood / Filmi Garba | 2 |
| Instrumental / Cinematic | 5 |

`category` is the primary classification. `styles` and release-level `categories` provide secondary classification without duplicating a track.

## Current discovery layer

The discovery layer is intentionally separate from canonical release metadata. It can retain community and live-performance leads without presenting an unofficial upload as an official release.

Current discovery files include:

- Aditya Gadhvi / Gadhavi and the complete 25-track `Ochhav` import
- Rishikesh Gadhvi and the timestamped `Araj` 2025 nonstop set
- Dhara Shah `Rankar` and `Rankar 2.0` 3-taali material
- Geeta Rabari `Taal 4.0`, `GORI` and 2026 `Garbe Haal`
- Kinjal Dave `Navrangi 2.0`
- Rajesh Ahir and Sabhiben Ahir `Raas Utsav`
- Parth Oza `Garbe Ghoome`
- Hardik Dave, Jaysinh Gadhavi, Ishani Dave, Kairavi Buch, Santvani Trivedi, Umesh Barot, Jignesh Barot, Jigardan Gadhavi and other current/live candidates
- recommendation signals from Spotify/editorial and community playlists, Reddit, publicly indexed Instagram posts, current event listings and Gujarati/Navratri blogs

No stable public X/Twitter recommendation evidence was found in the current indexed pass, so none is fabricated.

## Playback model

Playback follows the source rather than pretending every catalogue row is a locally hosted MP3.

1. Licensed/local `audioUrl` uses the native audio player.
2. Verified YouTube sources use a visible YouTube embed.
3. Timestamped nonstop sets expose chapter buttons and start at the selected section.
4. Verified Spotify tracks use Spotify's embedded player.
5. Other verified providers open their original source.
6. A provider search is shown only when a direct verified source has not yet been attached.
7. Official artist and label sources rank above distributor sources, which rank above community uploads.

Community uploads may be retained for discovery, but they are not silently promoted to canonical releases or mirrored into the repository.

## Fully imported examples

Complete track-level imports currently include:

- Aditya Gadhvi's 25-track `Ochhav`
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
- current canonical singles from Aditya Gadhvi, Geeta Rabari, Parth Oza, Jaysinh Gadhavi and Dhara Shah

## Source-of-truth layout

The catalogue is deliberately chunked so it stays reviewable and collision-resistant.

- `data/catalogue/songs/` contains 19 song chunks totalling 585 records.
- `data/catalogue/releases/` contains 7 release chunks totalling 79 records.
- `data/catalogue/free-sources/` contains 2 rights-audited acquisition chunks totalling 20 records.
- `data/discovery/artists-2026*.json` contains the current artist discovery map.
- `data/discovery/recommendations-2026-*.json` stores recommendation signals with source provenance.
- `data/discovery/sets/` stores official/community live and nonstop set records plus timestamp chapters.
- `data/catalogue/index.json` records the expected counts, discovery paths and generated-file paths.
- `data/taxonomy.json` contains the 19-category music taxonomy.
- `data/genres.json` maps the catalogue into the six presentation worlds.

Run `npm run check` to rebuild the combined catalogue and validate the UI, catalogue, discovery data and playback references.

## What complete means

This repository does not claim to contain every Garba recording or every private/unindexed social recommendation on the internet. `trackImportComplete: true` means the named release has been imported at track level from the verified source used in the relevant pass.

Unknown dates, durations and tracklists remain unknown rather than being guessed.
