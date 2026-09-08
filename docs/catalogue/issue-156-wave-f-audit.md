# Issue #156 Catalogue Wave F audit

## Outcome

Catalogue Wave F meets the quantitative and quality gates in issue #156.

- Candidates researched: **205**
- New canonical songs accepted: **112**
- Already covered and deliberately not duplicated: **50**
- Excluded from Wave F because the named-artist #152 lane already owns and covers them: **43**
- New canonical releases landed by Wave F: **4**
- Exact provider routes added by Wave F: **112**
  - exact controllable YouTube chapters: **54**
  - exact Amazon Music tracks: **58**
- Fallback-only routes added by Wave F: **0**
- Unresolved routes introduced: **0**
- Confirmed new lead artist introduced: **Dhara Shah**
- Representation expanded for Kinjal Dave, Aishwarya Majmudar, Jigardan Gadhavi, Rajbha Gadhvi GIR and Maulik Mehta.

Accepted material is Rankar (23), Garbe Ramvane (27), Rangtaali 4 (27), and the 35 split tracks of Rangtaali 2. Rangtaali 2's existing 69:20 continuous master remains a Nonstop set and is not duplicated as another canonical song.

## Discovery and evidence

Wave F reviewed the repository's existing 94 recommendation signals, sourced across Spotify editorial/community playlists, Reddit, official artist and label channels, blogs, Instagram/Telegram discovery and current-release monitoring. Community sources were used to discover and rank candidates, never as sole metadata truth.

Evidence codes used in the candidate matrix:

- **E1**: Rankar official Dhara Shah release evidence plus provider-published Amazon split-track hrefs. Landed in PR #196.
- **E2**: KD Digital official YouTube chapter programme `co516DbAAyw`, independently matched to Amazon and Apple Music's 27-track Garbe Ramvane. Landed in PR #210.
- **E3**: Sur Sagar Music official YouTube `0lE9Lh_vI0Q` with 27 published chapter starts, Amazon album `B0DF7GTNKW`, Apple album `1764888307`.
- **E4**: Amazon album `B07XYGDZ3P` with 35 provider-published split-track hrefs, Apple album `1480259196`, plus the existing official continuous Nonstop master.
- **E5**: existing canonical/provider-backed Ramzat 5 split release.
- **E6**: existing canonical/provider-backed Garba Ni Ramzat 4.0 split release.
- **E7**: existing canonical Taal 4.0 release under Geeta Rabari's #152 scope.
- **E8**: existing Rangili Ramzat 8 split release with exact Amazon routes under Kirtidan Gadhvi's #152 scope.

Signal codes:

- **S1**: new-artist priority, official 2025 release, strong Nonstop/Navratri fit.
- **S2**: major Garba artist, complete official Navratri album.
- **S3**: established Rangtaali series, official 2024 Navratri release.
- **S4**: established Rangtaali series, official 2019 Nonstop release.
- **S5**: current 2024 multi-artist Ramzat release and high-impact catalogue cluster.
- **S6**: current 2025 split Garba release already catalogued.
- **S7**: current major 2025 Geeta Rabari release, audited only to avoid #152 duplication.
- **S8**: current 2025 2-taali release, audited only to avoid #152 duplication.

## Duplicate and ambiguity decisions

- **Rangtaali 2 continuous master** is already in `data/nonstop.json`; only its 35 missing split tracks are added.
- **Rangtaali 4 one-song continuous provider edition** is not imported as a 28th split song.
- **Taal 4.0**, 26 tracks, is already present and owned by #152.
- **Rangili Ramzat 8**, 17 tracks, is already present and owned by #152.
- Repeated traditional titles are accepted only when recording, artist credit and release identity are distinct. Transliteration alone never creates a new canonical recording.

## Candidate matrix

The 205-row matrix is split only for reviewability. Every row includes artist, title, type, evidence, popularity signal, current presence, duplicate/transliteration status, playback availability and decision.

- [Matrix part 1, rows 1-55](issue-156-wave-f-matrix-1.md)
- [Matrix part 2, rows 56-110](issue-156-wave-f-matrix-2.md)
- [Matrix part 3, rows 111-165](issue-156-wave-f-matrix-3.md)
- [Matrix part 4, rows 166-205](issue-156-wave-f-matrix-4.md)

## Top candidates not added by Wave F

| Candidate | Rows | Decision | Reason |
|---|---:|---|---|
| Ramzat 5 | 113-139 | Already covered | Existing canonical release already resolves these recordings. |
| Garba Ni Ramzat 4.0 | 140-162 | Already covered | Existing canonical release already resolves these recordings. |
| Taal 4.0 | 163-188 | Exclude from Wave F | Existing Geeta Rabari material belongs to #152. |
| Rangili Ramzat 8 | 189-205 | Exclude from Wave F | Existing Kirtidan Gadhvi material belongs to #152. |
| Rangtaali 2 continuous master | outside split matrix | Do not duplicate | Already represented as a Nonstop set. |
| Rangtaali 4 continuous provider single | outside split matrix | Do not duplicate | Same listening programme, not a 28th split track. |

## Closing quality gate

Close #156 only after the final branch is reconciled with current `main` and the actual merge-result head passes `npm run check`, canonical/dedupe checks, discovery validation, runtime route validation, playback route-quality reporting, YouTube-first reporting, repository-structure validation, documentation validation and Source Health.
