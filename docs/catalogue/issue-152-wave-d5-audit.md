# Issue #152 Catalogue Wave D5 audit

Date: 2026-09-08

Issue: #152, follow-up catalogue completeness for Geeta Rabari.

## Outcome

Wave D5 adds Geeta Rabari's `Taal - Non Stop Garba` (2022) as one complete provider-backed release:

- 21 canonical album tracks
- 1 canonical release
- 21 exact Amazon Music track routes
- 3 official YouTube Nonstop listening entries for the album's long `Taal (1)`, `Taal (2)` and `Taal (3)` masters

No audio is downloaded or redistributed. No provider track ID, timestamp or chapter boundary is inferred.

## Release structure

Amazon Music and Qobuz publish a 21-track September 12, 2022 album. Tracks 1-3 are long master tracks named `Taal (1)`, `Taal (2)` and `Taal (3)`. They are part of the same album and are not separate `Taal 2` or `Taal 3` releases.

Tracks 4-21 are shorter Garba components. The canonical catalogue preserves the complete provider order instead of turning the three master-track names into invented release volumes.

Amazon's rounded track durations sum to 2:26:21. Qobuz reports a 2:26:09 album total. The 12-second aggregate variance is retained as provider display rounding rather than silently normalised.

## Playback integrity

Amazon's official album page exposes a distinct track href for every one of the 21 tracks. Wave D5 therefore uses 21 exact `amazon-music` routes with `official-amazon-album-track-link` evidence.

The three long masters are also independently present through Geeta Rabari's official YouTube distribution and are added to the Nonstop browser as full listening entries. Those YouTube videos are not used to manufacture chapter routes for tracks 4-21.

## Backlog corrections

This audit also closes two false or already-complete leads from earlier Wave D notes:

- `Taal 2` / `Taal 3` are not separate album volumes in the 2022 provider edition; they are long tracks inside `Taal - Non Stop Garba`.
- `Khamma 2` is already canonical with 21 exact Amazon Music routes.
- `Rangili Ramzat 6` is already canonical with 19 exact Amazon Music routes.

## Remaining issue #152 backlog

Issue #152 should remain open. The next pass should prioritise:

- Kirtidan Gadhvi: `Nortani Raat` and `Nortani Raat 2`, after duplicate and provider-route reconciliation
- Falguni Pathak: older non-stop/dandiya releases with recording-level duplicate reconciliation
- Aditya Gadhvi: `Amber Gaje` and final taxonomy-fit review of major modern/popular releases
- Geeta Rabari: remaining authoritative Garba releases not already represented by `Taal`, `Zankaar 3.0` or `Khamma 2`

The next wave should continue to prefer complete authoritative releases and provider-published exact routes over guessed chapters, transliteration duplicates or compilation reuse.
