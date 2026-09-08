# Issue #152 Catalogue Wave D4 audit

Date: 2026-09-08

Issue: #152, follow-up catalogue completeness for Kirtidan Gadhvi and collaborators.

## Outcome

Wave D4 adds the complete split-track `Rangili Ramzat 8 (Garba)` release credited to Umesh Barot, Osman Mir, Kirtidan Gadhvi and Rashmita Rabari:

- 17 canonical songs
- 1 canonical release
- 17 exact Amazon Music song routes
- 1 separate official continuous YouTube listening entry

No audio is downloaded or redistributed. No provider track ID, chapter timestamp or title is inferred.

## Split-track album

Amazon Music publishes the 17-track album on 2025-09-24 under Kirtidan Gadhvi. Its displayed track durations total 51:14. The Amazon album page exposes a distinct provider-published song href for every track, so all 17 canonical songs can use exact Amazon Music routes rather than an album-page fallback.

Qobuz independently confirms the same 17-track release, the four main-artist credits and Kirtidan Gadhvi as composer/producer. Small one-second display differences exist on some tracks, including `Pratham Ganpati Nu Name Tame Lejo` and `Aavi Norta Ni Raat`; canonical durations follow Amazon's displayed values and the variance is documented rather than normalised silently.

The four credited main artists are preserved on every canonical song. This avoids treating the release as a Kirtidan-only recording and keeps the catalogue compatible with the repository's multi-artist routing safeguards.

## Exact playback

Each canonical track uses the song href directly exposed by Amazon's official album page. The exact-route manifest therefore contains 17 `amazon-music` routes with `official-amazon-album-track-link` evidence.

This follows the same fail-closed pattern already used for Dhara Shah's `Rankar`: provider-published track links are exact; neighbouring IDs or release-level pages are not promoted to exact-track status.

## Continuous 2 Taali edition

A separate continuous `Rangili Ramzat 8 (2 Taali Garba)` edition is published through the official YouTube distribution for the same four artists. Provider metadata identifies it as a single 60:49 track released in September 2025.

The YouTube recording is added to the Nonstop browser as a listening master. It is deliberately not split into 17 YouTube chapter routes because no official 17-chapter map has been verified. The continuous edition and the 17-track album therefore remain distinct catalogue/listening representations.

## Remaining issue #152 backlog

Issue #152 remains open. Highest-value follow-ups are:

- Kirtidan Gadhvi: Rangili Ramzat 6, Nortani Raat and Nortani Raat 2, with exact provider-track routing where available
- Geeta Rabari: Taal 2, Taal 3, Khamma 2 and other complete provider-backed Garba releases
- Falguni Pathak: older non-stop/dandiya releases with recording-level duplicate reconciliation
- Aditya Gadhvi: Amber Gaje and the final taxonomy-fit review of major modern/popular releases

The next wave should continue to prefer complete authoritative releases and exact provider-published track links over compilation reuse, guessed chapter boundaries or title-only matching.
