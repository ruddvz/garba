# Issue #342 Ramzat 5 exact YouTube audit

Date: 2026-09-08

Audited from `main` at `7de0b41a7dfa8c347e966e3a60b0700444011de8`.

Scope: `ramzat5-album-2024` / **Ramzat 5** (Sur Sagar, 2024), exact split-track YouTube evidence only.

This is an evidence-only pass. It deliberately does not edit `data/playback-sources-current.json` or `data/catalogue/index.json` because those shared integration surfaces are currently owned by other active lanes. The goal is to leave a deterministic handoff for the next safe integration pass under #342.

## Canonical release identity

The canonical album contains 27 split tracks, released by Sur Sagar on 2024-06-09, with catalogue credit to Bhoomi Trivedi, Geeta Rabari and Hariom Gadhavi. The verified Sur Sagar continuous master is:

- `https://www.youtube.com/watch?v=g2G7XwHerBU`
- YouTube ID: `g2G7XwHerBU`
- channel: Sur Sagar Music
- published: 2024-06-08
- published programme: all 27 Ramzat 5 titles with chapter timestamps

The full-set description is authoritative discovery evidence for release order and programme identity, but it is not blanket proof that each chapter is the same edit as the canonical split recording.

## Continuous-master safety boundary

The continuous master stays a Nonstop/discovery route. No split-track mapping in this audit is inferred from a chapter timestamp.

A split track is marked **verified** here only when an independent YouTube upload identifies the song as a Ramzat 5 track from the 2024 Sur Sagar release, using either:

- an Official Artist Channel auto-generated original-release upload whose description names `Ramzat 5`, `2024 Sur Sagar` and the 2024-06-09 release date; or
- a verified Sur Sagar Music full-song upload whose description explicitly says the track is from `Ramzat 5`.

A same-title performance, older recording, other label, continuous-set timestamp, or 2024 Sur Sagar standalone single without direct Ramzat 5 linkage is not promoted by this pass.

## Exact routes already merged before this audit

PR #363 previously recovered three exact Ramzat 5 split recordings:

| Track | Canonical song | YouTube ID | Evidence |
| ---: | --- | --- | --- |
| 3 | Avasarne Aangane Padharjo Re Lol | `FAznu0LijyA` | Geeta Rabari Official Artist Channel, auto-generated original Ramzat 5 album track |
| 12 | Leela Te Rangni Chundadi | `eCXMFBqBJQk` | verified Sur Sagar full-song Ramzat 5 upload |
| 24 | Dham Dhame Nagaara Re | `Pahi_oYc89o` | Bhoomi Trivedi Official Artist Channel, auto-generated original Ramzat 5 album track |

Those existing mappings were not changed by this audit.

## Newly verified exact Ramzat 5 split recordings

The following ten recordings independently prove Ramzat 5 release identity and are safe candidates for a later `startSeconds: 0` integration pass.

| Track | Canonical song | YouTube ID | Source evidence |
| ---: | --- | --- | --- |
| 2 | Ataku To Aavje Maadi Re | `9oH0WTrDgaU` | Bhoomi Trivedi Official Artist Channel; description names `Ramzat 5`, ℗ 2024 Sur Sagar, released 2024-06-09 |
| 4 | Amba Abhay Pad Dayani Re | `H_EDxkuDSaM` | verified Sur Sagar Music full-song upload; description explicitly says the track is from `Ramzat 5` |
| 5 | Chotilavadi Chandi Chamunda | `9skaFYGgCQ0` | verified Sur Sagar Music full-song upload; description explicitly says the track is from `Ramzat 5` |
| 7 | Uncha Uncha Re Maadi Tara Dungara Re Lol | `YFdVz3PGwfQ` | Geeta Rabari Official Artist Channel; description names `Ramzat 5`, ℗ 2024 Sur Sagar, released 2024-06-09 |
| 8 | Maa Amba Te Ramva Nisarya, Devi Annapurna | `1lPETGrPCjA` | verified Sur Sagar Music full-song upload; description explicitly says the track is from `Ramzat 5` |
| 13 | Ashapuri Darshan Devane Vehla Aavjo | `gkBKU9MHAtE` | verified Sur Sagar Music full-song upload; description explicitly says the track is from `Ramzat 5` |
| 19 | Medie Melyo Sonano Bajothiyo | `5tdW_otezQM` | Geeta Rabari Official Artist Channel; description names `Ramzat 5`, ℗ 2024 Sur Sagar, released 2024-06-09 |
| 20 | Ha Re Maa Mota Mogal Maa Mota | `auv96Ca6CYY` | Bhoomi Trivedi Official Artist Channel; description names `Ramzat 5`, ℗ 2024 Sur Sagar, released 2024-06-09 |
| 22 | Moje-Dariya Madi Moje-Dariya (Dakla) | `KK2WyCoTwZY` | Geeta Rabari Official Artist Channel; description names `Ramzat 5`, ℗ 2024 Sur Sagar, released 2024-06-09 |
| 25 | Ude Re Gulaal Ude Re Gulaal | `qHIe4jUP-94` | verified Sur Sagar Music full-song upload; description explicitly says the track is from `Ramzat 5` |

All ten are individual full-song YouTube selections. No timestamp is required.

### Direct URLs

- track 2: `https://www.youtube.com/watch?v=9oH0WTrDgaU`
- track 4: `https://www.youtube.com/watch?v=H_EDxkuDSaM`
- track 5: `https://www.youtube.com/watch?v=9skaFYGgCQ0`
- track 7: `https://www.youtube.com/watch?v=YFdVz3PGwfQ`
- track 8: `https://www.youtube.com/watch?v=1lPETGrPCjA`
- track 13: `https://www.youtube.com/watch?v=gkBKU9MHAtE`
- track 19: `https://www.youtube.com/watch?v=5tdW_otezQM`
- track 20: `https://www.youtube.com/watch?v=auv96Ca6CYY`
- track 22: `https://www.youtube.com/watch?v=KK2WyCoTwZY`
- track 25: `https://www.youtube.com/watch?v=qHIe4jUP-94`

## Deliberately unresolved after this pass

These fourteen canonical split tracks did not produce independent YouTube evidence strong enough for promotion under the rule above:

| Track | Canonical song | Status |
| ---: | --- | --- |
| 1 | Maher Karo Mangal Karnaari | unresolved; a 2024 Sur Sagar standalone single is discoverable, but no independently verified YouTube result tied directly to the Ramzat 5 album was recovered |
| 6 | Gaddharethi Maaji Nisarya | unresolved |
| 9 | Maae Garbo Koravyo Gagan Gokhma Re | unresolved |
| 10 | Chapati Bhari Chokhane Gheeno Chhe Divado | unresolved; a 2024 Sur Sagar standalone single is discoverable, but direct Ramzat 5 YouTube identity was not recovered |
| 11 | Tara Dungare Thi Utaryo Vaagh Re | unresolved; same-title older recordings from other labels/artists were explicitly rejected |
| 14 | Jhule Jhule Chhe Gabbarni Maay | unresolved |
| 15 | Maadi Garba Gaava Aavo Maanaraj | unresolved; a 2024 Sur Sagar standalone single is discoverable, but direct Ramzat 5 YouTube identity was not recovered |
| 16 | Garabo Hete Bharyo Saheladi | unresolved; a 2024 Sur Sagar standalone single is discoverable, but direct Ramzat 5 YouTube identity was not recovered |
| 17 | Tari Ankhothi Utare Chhe Tejna Kirano Jogmaya | unresolved; a 2024 Sur Sagar standalone single is discoverable, but direct Ramzat 5 YouTube identity was not recovered |
| 18 | Arji Sunje Amari | unresolved |
| 21 | Momai Kuldevi (Dakla) | unresolved; a 2024 Sur Sagar standalone single is discoverable, but direct Ramzat 5 YouTube identity was not recovered |
| 23 | Navarat Naveli, Bani Albeli | unresolved |
| 26 | Me To Hathidaant Chudla Ghadavya | unresolved; a 2024 Sur Sagar standalone single is discoverable, but direct Ramzat 5 YouTube identity was not recovered |
| 27 | Namu Aadi Anaadi Navdurgaa (Dhun) | unresolved; a 2024 Sur Sagar standalone single is discoverable, but direct Ramzat 5 YouTube identity was not recovered |

### Explicit rejected examples

For track 11, search also surfaces recordings that are definitely not the canonical Ramzat 5 split recording, including:

- `ob_WqOHuoac`: Asha Thakor, Studio Sangeeta, `Mahakali Maa Garba`, 2023
- `iv5UQtayyCM`: Hemant Chauhan, Soor Mandir / `Chundadi (Tahuko-2)`, 2023 upload of an older recording

These are title matches only and must not be used as substitutes.

## Integration handoff

When the currently active shared-manifest/index lanes release ownership, the next #342 integration pass can add the ten newly verified mappings above to the authoritative indexed playback source, preserving the three already merged mappings and the continuous master.

Expected safe route shape for each newly verified row:

- `provider: "youtube"`
- `videoId`: exact ID from the verified table
- `startSeconds: 0`
- `sourceUrl`: corresponding direct YouTube URL
- `releaseId: "ramzat5-album-2024"`
- `trackNumber`: canonical track number above
- `sourceType`: `official-artist-channel` for OAC auto-generated album tracks, or the repository's existing verified-label full-song source type for Sur Sagar Music uploads
- evidence should state exact original-album or verified-label Ramzat 5 identity, not continuous chapter inference

Do not derive routes for the fourteen unresolved tracks from `g2G7XwHerBU` chapter timestamps.

## Result

- canonical split tracks: 27
- exact split-track YouTube routes already merged before this audit: 3
- newly verified exact split-track YouTube recordings: 10
- total exact split-track evidence now available: 13 / 27
- deliberately unresolved split tracks: 14
- guessed timestamps: 0
- continuous-set chapter routes promoted to split recordings: 0
- same-title alternate performances accepted: 0
- shared playback manifest/index files changed by this audit: 0
