# Issue #353: Khelaiya DJ Remix, Vol. 2 YouTube migration audit

## Scope

This audit covers only the canonical release `khelaiya-dj-remix-vol2-2016`, titled `Khelaiya DJ Remix, Vol. 2 (47 Non Stop DJ Dandiya)` by Rupal Doshi, Kishore Manraja and Kirti-Girish.

The broader #353 Ishtar/Venus cluster includes other releases. Those releases are deliberately excluded from this lane so other agents can claim them without overlapping `data/playback-sources-khelaiya.json`.

## Canonical release identity

The catalogue preserves a 12-track 2016 release with a later 2020 digital surface. Qobuz and Amazon expose the same 12-track programme, including the 1:37 `Khelaiya (Instrumental Version) (DJ Remix)` as canonical track 4.

Reference release surfaces:

- Qobuz: https://www.qobuz.com/us-en/album/khelaiya-dj-remix-vol-2-rupal-doshi-kishore-manraja-kirti-girish/yelsz9nkbwy6a
- Amazon Music: https://music.amazon.es/albums/B08L7NCD5M

These provider surfaces are release-identity evidence only. They are not executable playback routes.

## Verified YouTube source

Ishtar Regional's verified YouTube channel publishes `Khelaiya : DJ REMIX - Vol.2 | Dj Garba Songs | JUKEBOX`:

- https://www.youtube.com/watch?v=FHtzu_h1L1w

The video description names the Vol. 2 programme and publishes explicit chapter starts for 11 songs. Those starts are copied directly into the playback manifest. No chapter is calculated from catalogue durations or from the gap between neighbouring chapters.

## Chapter evidence

| Canonical track | Canonical title | Label-published chapter | Seconds | Route action |
| --- | --- | ---: | ---: | --- |
| 1 | Aavi Aavi Noratani (DJ Remix) | 24:31 | 1471 | migrate to verified Ishtar chapter |
| 2 | He Mari Mahisagarni (DJ Remix) | 1:03:31 | 3811 | migrate to verified Ishtar chapter |
| 3 | He Rude Garbe Rame Chhe (DJ Remix) | 31:15 | 1875 | migrate to verified Ishtar chapter |
| 4 | Khelaiya (Instrumental Version) (DJ Remix) | not published | n/a | leave unresolved |
| 5 | Kesariyo Rang Tane (DJ Remix) | 10:01 | 601 | migrate to verified Ishtar chapter |
| 6 | Madi Ni Murti Lavo Ke (DJ Remix) | 50:28 | 3028 | migrate to verified Ishtar chapter |
| 7 | Madi Tare Mandiriye Re Ghughra Ghmke Chhe (DJ Remix) | 56:44 | 3404 | migrate to verified Ishtar chapter |
| 8 | Pankhida Tu Udi Jaje (DJ Remix) | 37:49 | 2269 | keep stronger existing individual YouTube route |
| 9 | Rame Ambe Maa Chachar Na (DJ Remix) | 44:09 | 2649 | migrate to verified Ishtar chapter |
| 10 | Rangtali Rangtali (DJ Remix) | 1:08:33 | 4113 | migrate to verified Ishtar chapter |
| 11 | Sonal Garbo Shire (DJ Remix) | 17:08 | 1028 | migrate to verified Ishtar chapter |
| 12 | Chalo Pela-Bamboo Beats (Title Song) (DJ Remix) | 00:00 | 0 | migrate to verified Ishtar chapter |

The label presents the jukebox in a different order from the canonical 12-track digital edition. `trackNumber` therefore remains the canonical release track number, while `startSeconds` comes only from the label-published YouTube chapter list.

## Existing stronger route preserved

`khelaiya2-pankhida-tu-udi-jaje-dj` already resolves to the individual verified distributor YouTube track `5cAISqItql8`. The jukebox also publishes a Pankhida chapter, but replacing an exact individual route with a shared-set chapter would be a downgrade. The existing route remains unchanged.

## Fail-closed instrumental boundary

The canonical digital release contains `Khelaiya (Instrumental Version) (DJ Remix)` at track 4, but the verified Ishtar jukebox description does not publish a chapter for that instrumental. Searches found commercial-provider identity evidence but did not independently verify an exact YouTube upload for this recording.

The instrumental therefore remains non-playable rather than receiving:

- an inferred chapter based on album durations;
- a nearby jukebox position;
- a similarly titled instrumental from another Khelaiya release; or
- a commercial provider URL as executable playback.

## Accepted migration

`data/playback-sources-khelaiya.json` now adds ten verified source-published chapters from `FHtzu_h1L1w`, preserves the existing individual Pankhida route, preserves the three existing Khelaiya Disco Dandia '93 routes, and leaves only the Vol. 2 instrumental unresolved.

The manifest was already registered in `data/catalogue/index.json`, so this lane does not touch the shared minified catalogue index.

## Validation targets

Before merge, repository checks should confirm:

1. all ten new rows resolve to YouTube with valid video IDs and non-negative source-published chapter starts;
2. the existing Pankhida individual route is unchanged;
3. the Vol. 2 instrumental remains unresolved instead of receiving an inferred route;
4. the three pre-existing 1993 Khelaiya routes remain unchanged;
5. there are no duplicate exact-route downgrades or unresolved routes created by this manifest change;
6. the full repository check remains green.

## Remaining #353 work

This PR addresses only `Khelaiya DJ Remix, Vol. 2`. `Mataji Na Tran Taali` and the remaining Ishtar/Venus provider-backed batches remain separate, non-overlapping follow-up work under #353.
