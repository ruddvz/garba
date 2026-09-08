# Playback runtime coverage

The generated catalogue carries a verified source route for every song before GitHub Pages is assembled. A verified source route is not automatically the same thing as exact-song playback.

## Build path

1. `scripts/build-catalogue.mjs` builds `data/songs.json`, generated release routes and `data/playback-coverage.json`.
2. `scripts/enrich-runtime-songs.mjs` merges all playback manifests declared by `data/catalogue/index.json` into the generated song records.
3. `scripts/validate-runtime-song-routes.mjs` fails CI if a generated song has neither direct audio nor a verified provider route, if an exact provider route is misclassified, if multiple different songs share one supposedly exact provider track URL, or if a mapped YouTube performance chapter loses its start time.
4. The validator reports exact-selection routes separately from release/provider browsing fallbacks. Do not describe total source coverage as total exact-song playability.

Curated song mappings override generated release-level mappings because manifests are merged in the declared order. The runtime still validates the result after merging, so a curated manifest cannot make one provider track count as several different songs merely by labelling it exact.

The ranked fallback manifest uses release-specific song IDs. A YouTube chapter is promoted only when the provider publishes the timestamp, and a standalone track video is promoted only when the official label, official artist, or provider-generated track record identifies the named release. If a timestamp is missing or malformed, that song remains a release/provider fallback.

## Runtime meaning

- `audioUrl`: first-party native audio playback. This is valid only when an authorised hosted master is available.
- `playbackSourceType: verified-track-source`: a provider track URL that remains uniquely mapped to the intended song after duplicate-route validation.
- `playbackSourceType: verified-single-release-source`: a provider release containing one song, so selecting the release selects the song.
- `playbackSourceType: verified-performance-chapter`: a verified live/nonstop rendition with a mapped YouTube timestamp. It may differ from the catalogue studio recording.
- a YouTube route with a verified `youtubeId` and `youtubeStartSeconds`: an exact selection inside that verified video, even when the source-provenance label is more specific than `verified-performance-chapter`.
- `playbackSourceType: verified-release-source`: a verified release-level provider page. The listener may still need to choose the named song.
- `playbackSourceType: verified-release-track-reference`: a track-shaped provider URL recorded as evidence for a release, but not verified as the selected song. This commonly occurs when a multi-song release record contains one representative provider track. GARBA must not autoplay that recording as every song on the release. The browser instead offers a provider search for the selected title.
- `playbackSourceType: verified-unchaptered-youtube-release`: a verified multi-song YouTube release without a verified selected-song timestamp. GARBA must not pretend this starts at the chosen song.
- Other curated provider source types represent the source provenance recorded by the relevant playback manifest and must be evaluated by their actual URL/timestamp capability.

## Exact-track integrity rule

A track-shaped URL is not proof that a release-level route identifies every song on the release.

The catalogue builder prefers album/release-shaped sources for multi-song releases. If only a track-shaped source is available, it is retained as `verified-release-track-reference`, not promoted to exact playback. During enrichment, any exact provider URL that is assigned to multiple different song title/artist identities is downgraded to the same reference-only state. The browser repeats that duplicate check as a safety net before playback and converts reference-only routes into provider searches.

This means the reported exact-selection count can decrease when false precision is discovered. That is a correctness improvement, not a playback regression.

## Product rule

“Playable” means that pressing Play can select the intended song or a deliberately labelled performance version. A release page that merely contains the song, or one representative track from a multi-song release, is useful discovery coverage but is not exact-song playback and must be reported separately.

Provider routing does not imply that GARBA owns or redistributes the audio. Commercial recordings remain on approved external providers unless direct-hosting rights have been recorded through the rights-gated master workflow.
