# Issue #350: Maro Garbo YouTube migration audit

## Scope

This audit covers only the canonical 2000 release `Maro Garbo Non Stop Garba Tran Taali` by Atul Purohit, Himali and Smita Shah (`atul-maro-garbo-2000`). The separate `Garbi` backlog remains outside this lane.

The goal is to replace provider-only migration evidence with exact YouTube playback only where the recording identity and chapter boundary are independently verifiable.

## Release identity

Canonical release evidence agrees on a 15-song Soor Mandir album released on 24 July 2000. The existing provider manifest matched Apple Music and Amazon Music rows to that release, but those providers are evidence only under the current YouTube-only playback policy.

Reference release surfaces:

- Amazon Music: https://music.amazon.ca/albums/B0855G1792
- Qobuz: https://www.qobuz.com/gb-en/album/maro-garbo-non-stop-garba-tran-taali-atul-purohit-himali-smita-shah/edz6rdsf6bsta

## Verified YouTube source

Soor Mandir's verified YouTube channel publishes the exact `Maro Garbo` programme as an audio jukebox:

- https://www.youtube.com/watch?v=lZlOqYwagfA

The description identifies:

- album: `Maro Garbo`
- singers: Atul Purohit, Himali, Smita Shah
- music: Iqbal Mir
- label: Soor Mandir

Most importantly, the label publishes chapter starts for all 15 songs. The runtime routes below copy those chapter starts verbatim. No timestamp is calculated from catalogue duration, track order or neighbouring entries.

## Chapter evidence

| Canonical track | Published chapter | Seconds | Route action |
| --- | ---: | ---: | --- |
| 1. Maro Garbo | 30:23 | 1823 | migrate to verified label chapter |
| 2. Baje Taal Manjira | 34:04 | 2044 | migrate to verified label chapter |
| 3. Tame Re Sundarvanna | 38:45 | 2325 | migrate to verified label chapter |
| 4. Aavi Chhe Nortani Raat | 42:50 | 2570 | migrate to verified label chapter |
| 5. Chelaji Re | 48:19 | 2899 | migrate to verified label chapter |
| 6. Maro Devariyo | 51:41 | 3101 | migrate to verified label chapter |
| 7. Fagan Aayo | 56:06 | 3366 | migrate to verified label chapter |
| 8. Saybo Maro | 00:00 | 0 | migrate to verified label chapter |
| 9. Vhalmni Vat | 04:30 | 270 | migrate to verified label chapter |
| 10. Haiye Rakhi Hom | 08:34 | 514 | do not override existing stronger verified YouTube route |
| 11. Lumbe Zumbe | 11:39 | 699 | migrate to verified label chapter |
| 12. Fagan Foramto Aayo | 13:44 | 824 | migrate to verified label chapter |
| 13. Vayro Nathi Toye | 17:32 | 1052 | migrate to verified label chapter |
| 14. Andhari Raat | 20:29 | 1229 | migrate to verified label chapter |
| 15. Duha Chand | 23:23 | 1403 | migrate to verified label chapter |

The YouTube programme lists tracks 8 through 15 before tracks 1 through 7. That presentation order is not used to infer canonical album order. `trackNumber` remains the canonical release track number while `startSeconds` comes only from the label-published chapter list.

## Accepted migration

`data/playback-sources-maro-garbo-exact.json` now contains 14 executable YouTube chapter routes on video `lZlOqYwagfA` and is declared in `data/catalogue/index.json`.

Track 10 is intentionally absent from this manifest. The catalogue already resolves `atul-maro-garbo-2000-10-haiye-rakhi-hom` through a stronger verified YouTube performance chapter, so this migration does not replace it merely to make the release uniform.

## Rejected shortcuts

- No Apple Music, Amazon Music, Qobuz or other commercial provider is executable playback.
- No chapter start is derived from the 15 catalogue durations.
- No same-title performance is substituted for the 2000 master.
- Later Soor Mandir re-uploads are not required when the exact label-published programme already supplies source-authored chapter boundaries.
- No `Garbi` or `Garbi 2` rows are touched in this lane.

## Validation targets

Before merge, repository checks should confirm:

1. the new manifest is part of `data/catalogue/index.json`;
2. all 14 migrated rows resolve to YouTube with valid video IDs and non-negative source-published chapter starts;
3. canonical release and track numbers still match `atul-maro-garbo-2000`;
4. track 10 keeps its stronger existing route;
5. there are no unsafe duplicate exact-route conflicts;
6. the full repository check remains green.

## Remaining #350 work

This PR resolves the `Maro Garbo` provider backlog only. The separate `Garbi` provider backlog remains available for a non-overlapping follow-up claim under #350.
