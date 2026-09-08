# Playback runtime coverage

The generated catalogue carries a verified source route for every song before GitHub Pages is assembled. A verified source route is not automatically the same thing as exact-song playback.

## Build path

1. `scripts/build-catalogue.mjs` builds `data/songs.json`, generated release routes and `data/playback-coverage.json`.
2. `scripts/enrich-runtime-songs.mjs` merges all playback manifests declared by `data/catalogue/index.json` into the generated song records.
3. `scripts/validate-runtime-song-routes.mjs` fails CI if a generated song has neither direct audio nor a verified provider route, if an exact provider route is misclassified, or if a mapped YouTube performance chapter loses its start time.
4. The validator reports exact-selection routes separately from release/provider browsing fallbacks. Do not describe total source coverage as total exact-song playability.

Curated exact-track mappings override generated release-level mappings because manifests are merged in the declared order.

## Runtime meaning

- `audioUrl`: first-party native audio playback. This is valid only when an authorised hosted master is available.
- `playbackSourceType: verified-track-source`: an exact provider track URL.
- `playbackSourceType: verified-single-release-source`: a provider release containing one song, so selecting the release selects the song.
- `playbackSourceType: verified-performance-chapter`: a verified live/nonstop rendition with a mapped YouTube timestamp. It may differ from the catalogue studio recording.
- a YouTube route with a verified `youtubeId` and `youtubeStartSeconds`: an exact selection inside that verified video, even when the source-provenance label is more specific than `verified-performance-chapter`.
- `playbackSourceType: verified-release-source`: a verified release-level provider page. The listener may still need to choose the named song.
- `playbackSourceType: verified-unchaptered-youtube-release`: a verified multi-song YouTube release without a verified selected-song timestamp. GARBA must not pretend this starts at the chosen song.
- Other curated provider source types represent the source provenance recorded by the relevant playback manifest and must be evaluated by their actual URL/timestamp capability.

## Product rule

“Playable” means that pressing Play can select the intended song or a deliberately labelled performance version. A release page that merely contains the song is useful discovery coverage, but it is not exact-song playback and must be reported separately.

Provider routing does not imply that GARBA owns or redistributes the audio. Commercial recordings remain on approved external providers unless direct-hosting rights have been recorded through the rights-gated master workflow.
