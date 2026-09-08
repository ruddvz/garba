# Issue #156 Catalogue Wave F closeout

Date: 2026-09-08

## Current-main reconciliation

This closeout was rebuilt from current `main` after PR #196 had already landed the Dhara Shah `Rankar` batch and after the subsequent Vercel/runtime changes. It does not re-add or overwrite that work.

The historical research matrix in `docs/catalogue/issue-156-wave-f-audit.md` records 222 candidate songs/releases/sets. Its baseline SHA is historical by design. This closeout records the final issue-level outcome on the current catalogue.

## Quantitative quality gate

- Candidates researched: **222**
- Canonical songs accepted across Wave F: **87**
  - 23 `Rankar` songs already merged by PR #196
  - 36 `Rangtaali 2 - Non Stop Garba` entries in this closeout
  - 1 Parth Oza `Garbe Ghoome Tu` single in this closeout
  - 27 `Rangtaali 4 - Non Stop Garba` entries in this closeout
- Canonical releases introduced by Wave F: **4**
  - `Rankar` (Dhara Shah, 2025)
  - `Rangtaali 2 - Non Stop Garba` (Aishwarya Majmudar & Jigardan Gadhavi, 2019)
  - `Garbe Ghoome Tu` (Parth Oza, 2025)
  - `Rangtaali 4 - Non Stop Garba` (Aishwarya Majmudar, Jigardan Gadhavi, Rajbha Gadhvi GIR & Maulik Mehta, 2024)
- Exact official/provider routes across accepted Wave F songs: **86**
  - 23 exact Amazon Music tracks from PR #196
  - 34 provider-published Sur Sagar YouTube chapters for Rangtaali 2
  - 1 separate official full-track YouTube route for Rangtaali 2
  - 1 exact Amazon Music track for Parth Oza
  - 27 provider-published Sur Sagar YouTube chapters for Rangtaali 4
- Conservative fallbacks: **1**
  - `Nav Nav Naganiyo No Rafdo` stays on the verified 36-track Amazon album because Sur Sagar publishes no chapter start for that entry
- Consumer-stream audio downloaded or bundled: **0**
- Inferred YouTube timestamps/provider IDs: **0**
- Duplicate canonical IDs introduced: **0**

## New and expanded artist coverage

Wave F introduces or newly canonically surfaces Dhara Shah, Parth Oza and Rajbha Gadhvi GIR, while filling major missing Rangtaali material for Aishwarya Majmudar and Jigardan Gadhavi.

## Top deferred/rejected classes

The research matrix deliberately leaves out:
- named-artist work owned by issues #151 and #152 rather than racing those waves
- duplicate/transliteration variants already represented by the same recording
- compilation appearances without evidence of a distinct recording
- title-only traditional recommendations where a canonical recording could not be verified safely
- `DJ Rock Dandiya` track-level expansion while regional provider editions disagree on track count/edition identity
- lower-priority candidates that remain useful discovery backlog but are not stronger than the accepted Wave F set

## Playback truth

Playback priority follows the repository policy. Published YouTube chapter starts are used verbatim. Amazon song URLs are exact only where the provider exposes an individual track URL. Album pages are explicitly marked as release-level fallbacks, never exact tracks.

## Validation gate

The final PR must pass the repository `Validate GARBA` workflow, whose `npm run check` coverage includes catalogue build, canonical/dedupe validation, discovery validation, runtime route validation, playback route-quality reporting, YouTube-first reporting, repository-structure validation, PWA icon rendering and social-preview rendering.

Issue #156 should close only after that workflow is green on the final reconciled head.
