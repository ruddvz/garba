# Playback runtime coverage

The generated catalogue carries a verified runtime route for every song before GitHub Pages is assembled.

## Build path

1. `scripts/build-catalogue.mjs` builds `data/songs.json`, the generated release routes, and `data/playback-coverage.json`.
2. `scripts/enrich-runtime-songs.mjs` merges all playback manifests declared by `data/catalogue/index.json` into the generated song records.
3. `scripts/validate-runtime-song-routes.mjs` fails CI if a generated song has neither direct audio nor a verified provider route, or if a mapped YouTube performance chapter loses its start time.

Curated exact-track mappings override generated release-level mappings because manifests are merged in the declared order.

## Runtime meaning

- `audioUrl`: directly playable only when an authorised hosted master is available.
- `playbackSourceType: verified-performance-chapter`: a verified live/nonstop rendition. It may differ from the studio recording and must start at the mapped chapter.
- `playbackSourceType: verified-release-source`: a verified release-level provider page. The listener may need to choose the named song inside the provider embed or page.
- Other curated provider source types represent the source provenance recorded by the relevant playback manifest.

Provider routing does not imply that GARBA owns or redistributes the audio. Commercial recordings remain on their approved external providers unless direct-hosting rights have been recorded through the rights-gated master workflow.
