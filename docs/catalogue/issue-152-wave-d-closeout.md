# Issue #152 Wave D final closeout

Date: 2026-09-08

Issue: #152, modern/popular Garba catalogue completeness for Falguni Pathak, Kirtidan Gadhvi, Geeta Rabari and Aditya Gadhvi.

## Closeout rule

This pass applies the current post-#238/#221 playback rule: **YouTube is the only executable playback source.** Amazon Music, Apple Music, Spotify, Qobuz and other commercial catalogues are research/provenance only. A song is playable only when its exact YouTube recording identity is verified. Long-form chapter starts are used only when the source publishes them directly. No timestamp is calculated from neighbouring durations.

The final branch is reconciled against all already-landed Wave D2-D8 work. It does not recreate Zankaar 3, Tahukar 10/11, Rangili Ramzat 7/8, Taal 2022, Nortani Raat 1/2 or Amber Gaje under parallel IDs.

## Final unique additions

| Area | New canonical songs | New releases | New exact YouTube selections |
| --- | ---: | ---: | ---: |
| Five legacy release completions | 76 | 0 | 0 |
| Falguni Pathak historical closeout | 8 | 4 | 4 |
| Kirtidan Gadhvi series closeout | 49 | 3 | 0 |
| Geeta Rabari Taal 3.0 | 23 | 1 | 23 |
| **Total** | **156** | **8** | **27** |

With the pre-closeout index at 1,663 songs / 238 releases, v0.29.0 is expected to build to **1,819 songs / 246 releases**.

## Completed legacy releases

Five already-canonical release records had provider-verified split inventories that were still marked incomplete. This pass imports the full tracklists, switches their release duration to the exact imported-track sum and marks the imports complete:

- `garba-rang-sajan-v2-1994`: 2 tracks, 3,496 s
- `non-stop-garba-2016`: 12 tracks, 7,143 s
- `tahukar9-2021`: 12 tracks, 1,784 s
- `mandavadi-2021`: 23 tracks, 6,858 s
- `taal-2-2022`: 27 tracks, 3,217 s

Their former Apple/provider album URLs are intentionally removed from executable release sources. They remain research provenance here and in the earlier Wave D audit.

## Falguni Pathak historical audit

### Added

1. **90 Non Stop - Falguni Pathak** (2012), two long-form parts, 3,981 s total. Exact YouTube recordings:
   - https://www.youtube.com/watch?v=C7igjYPSLvo
   - https://www.youtube.com/watch?v=jO9xguFuO6k
   Metadata cross-checks: Amazon Music `B0CYCTK7N7`; Qobuz 90 Non Stop catalogue page.
2. **Dhaa Gujarati 21 Non Stop Dandiya** (2013), two long-form parts, 3,350 s total. Exact Tips Gujarati YouTube recordings:
   - https://www.youtube.com/watch?v=jqDZPqmEkkE
   - https://www.youtube.com/watch?v=PBuvkFmaEXo
   Metadata cross-check: Apple Music album `1736580855`.
3. **Dandiya 1997** (2001 digital edition), two long-form parts, 3,392 s. Apple Music album `1735606836` and OTOTOY catalogue evidence verify the edition and track credits. No exact official YouTube recording was verified, so both entries are non-playable.
4. **Dholida Dholida** (1999), two long-form parts, 3,319 s. Amazon Music album `B0CYLYDDZB` and Spotify track evidence verify the programme; the one-second Part 1 provider variance is retained. No exact official YouTube recording was verified, so both entries are non-playable.

### Reviewed but not duplicated

- **Maadi Tara Mandiriye** is a 10-track Sony/Various Artists programme dated August 17, 2000 on Apple Music and Amazon Music. Falguni Pathak appears on a subset of the tracks, while later catalogue pages also expose long Falguni-named masters/reissues. It is therefore retained as a collaboration/reissue comparison candidate rather than promoted as a missing Falguni canonical album without recording-identity reconciliation. Evidence: https://music.apple.com/us/album/maadi-tara-mandiriye/302404701 and https://music.amazon.com/albums/B003UY4Z6I.
- **Rangeela Bambaiya** is a 26-track 2013 programme whose album-level provider credit is Deepak Walke while individual tracks mix Falguni Pathak, Kishore Manraja and other performers. Several titles also recur in later Falguni compilations. It is explicitly deferred as compilation/collaboration territory instead of being bulk-imported as 26 new Falguni recordings. Evidence: https://music.amazon.in/albums/B0CYM1QCGQ.
- Generic `Hits of Falguni Pathak`, best-of and later compilation packages are not separate canonical additions unless a distinct recording/edition is proved.

This satisfies the older-master gate without turning compilation reuse into duplicate canonical recordings.

## Kirtidan Gadhvi historical audit

The current catalogue now covers the high-value series gap identified by the original Wave D audit:

- original Wave D already landed **Rangili Ramzat 7** (19 split tracks) and its separate continuous listening-set identity;
- subsequent reconciled Wave D work landed **Rangili Ramzat 6 and 8**, **Tahukar 10 and 11**, and **Nortani Raat 1 and 2**;
- this closeout adds **Tahukar 7** (19 tracks), **Tahukar 8** (19 tracks), **Rangili Ramzat 5** (11 tracks), and completes the existing **Tahukar 9** split inventory (12 tracks).

Tahukar 7/8 and Rangili Ramzat 5 remain deliberately non-playable. Provider catalogues establish the split metadata, but no exact per-track official YouTube identities or source-published chapter maps were independently verified.

### Older Tahukar editions reviewed

- **Tahukar 4** has conflicting provider representations. Amazon exposes a 30/31-song split edition around 1h17m, while Qobuz exposes `Kirtidan Gadhvi No Tahukar, Pt. 4` as nine long tracks over essentially the same programme length. Kirtidan's official site also presents Tahukar Part 4 material. Without a recording-level split-to-long-form identity map, importing both shapes would risk duplicate masters. Evidence: https://music.amazon.in/albums/B0775JZT7V and https://www.qobuz.com/ca-en/album/kirtidan-gadhvi-no-tahukar-pt-4-kirtidan-gadhvi/3614971183111.
- **Tahukar 5** has a 33-track 2022 provider edition, but its relationship to the older Tahukar programme/reissue chain and exact official YouTube recordings is not sufficiently resolved for a duplicate-safe closeout. It is explicitly deferred, not treated as executable fallback. Evidence: https://music.amazon.com/albums/B09R4QN8LQ.

These older representation conflicts are recorded for future recording-identity research rather than silently duplicated.

## Geeta Rabari historical audit

Current `main` already contains the previously identified **Zankaar 3**, **Taal - Non Stop Garba (2022)** and **Khamma 2** work. This pass completes the separate canonical **Taal 2.0** 27-track edition and adds **Taal 3.0** with 23 split tracks.

For **Taal 3.0**, Geeta Rabari's official artist-channel upload publishes an explicit 23-track chapter map:

https://www.youtube.com/watch?v=xM_Db_XkZeQ

All 23 `startSeconds` values in `data/playback-sources-wave-d9-closeout-youtube.json` are copied from that published chapter map. None are derived from the provider durations. Amazon Music `B0CKQW1QPR` and Apple Music album `1711005111` are metadata provenance only.

## Aditya Gadhvi historical audit

No duplicate Aditya shard is added here because the remaining gate has already landed on current `main`:

- **Amber Gaje** is canonical in Wave D8 with conservative YouTube-only route treatment;
- the original Wave D audit already separated Garba-relevant work such as Ochhav from popular Gujarati songs whose popularity alone does not make them Garba;
- `Khalasi`, `Meetha Khaara` and adjacent popular releases remain outside this Garba catalogue unless their recording itself has a Garba/raas/dandiya taxonomy fit.

This is a taxonomy rejection, not a discovery omission.

## Playback-policy reconciliation

The closeout adds exactly **27 new executable routes**, all YouTube:

- 4 exact Falguni Pathak/Tips selections
- 23 exact Geeta Rabari official chapters

The closeout intentionally adds **zero** Amazon Music, Apple Music, Spotify or Qobuz executable routes. Releases without exact YouTube evidence have no commercial-provider `sources` capable of becoming generated release playback. Provider evidence remains in this audit and release notes as provenance only.

Existing older exact-Amazon Wave D migrations remain owned by the dedicated #221 migration backlog and its child issues; this closeout does not mislabel them as new #152 YouTube work.

## Validation gate

Before #152 is closed, the final reconciled PR must pass the repository's full `npm run check` workflow, including catalogue count/ID validation, repository structure, dedupe and artist identity checks, taxonomy checks, runtime route truth, YouTube coverage and Source Health. The PR should be merged only on a green final head.
