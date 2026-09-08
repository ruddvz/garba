# Issue #151 Hemant Chauhan catalogue audit

Updated: 2026-09-08

## Scope

This artist-split completes two legacy Hemant Chauhan releases that already existed in the canonical release catalogue but had no imported component song rows:

- `bansari-raas-1996` — **Bansari (Non Stop Raas)** — 19 tracks
- `dhholi-vol15-2011` — **Dhholi (Non Stop Garba, Vol. 15)** — 23 tracks — Pamela Jain & Hemant Chauhan

The existing completed Hemant releases `madhuvan-bansari2-1997`, `shyam-raas-v3-1998`, and `jagran-vol11-2004` are not duplicated or rewritten.

## Evidence discipline

### Bansari

Amazon Music exposes the 19-track Bansari album and provider-published track hrefs. Each exact track URL in `data/playback-sources-hemant-bansari-exact.json` was followed from that album tracklist. The component durations sum to 61:04; the older release row keeps its rounded platform-summary duration.

Album evidence: `https://music.amazon.com.br/albums/B002D5DKQG`

### Dhholi

Amazon Music exposes the 23-track Dhholi album through exact song pages such as `Amba Paheldino Vanko`, and those pages publish the complete album tracklist and track hrefs. Each exact route in `data/playback-sources-hemant-dhholi-exact.json` was followed from the provider's tracklist. The component durations sum to 61:58; the older release row keeps its rounded platform-summary duration.

Tracklist evidence: `https://music.amazon.com/tracks/B00MGFSF18`

## Safety rules

- No Amazon ASIN was derived from neighbouring IDs or track position.
- No title, duration, release identity, or provider URL was inferred.
- No later re-recording was substituted for the canonical legacy release.
- Existing completed Hemant releases are preserved.
- Exact provider routes are attached only to the newly imported canonical song IDs.

## Deliberately not included yet

`morli-raas-v6-2004` remains a separate evidence task. Public provider results confirm the 19-song release and several exact song pages, but this pass did not recover a trustworthy provider-published full component tracklist. It stays conservative rather than reconstructing missing rows from partial evidence.

Other Hemant Chauhan Garba releases surfaced during research, including `Maa Na Norta`, `Maa Na Norta-2`, `Aarti and Garba`, `Ghammar Vol: 3`, `Chandaravo`, and later nonstop material. They are candidates for the next catalogue-completeness pass, not justification for speculative additions in this one.
