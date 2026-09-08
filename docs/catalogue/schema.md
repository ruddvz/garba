# Catalogue schema

## Visual worlds

`data/genres.json` contains the six presentation worlds:

- `traditional`
- `dandiya`
- `devotional`
- `folk`
- `sanedo`
- `fusion`

They control high-level player presentation. They are not the music taxonomy.

A song has one primary visual world for player presentation. Explore may also surface the song in another visual-world collection when a verified secondary taxonomy classification maps there. This keeps the player theme stable while making catalogue browsing multi-dimensional.

## Music taxonomy

`data/taxonomy.json` contains the 19 catalogue categories, including Roots / Archive, Traditional Garba, Tran Taali, Be Taali, Raas / Dandiya, Dodhiyu, Hinch, Dakla, Sanedo, Mataji / Devotional, Krishna Garba, Folk / Lokgeet, Live Garba, Modern Gujarati Garba, Hip-hop Garba, Electronic / Fusion, DJ / Remix, Bollywood / Filmi and Instrumental / Cinematic.

Aliases preserve spelling variants such as Tran Taali, Teen Taali, Dodhiya and Dodiyo.

Explore category membership should use `category` and `taxonomyStyles[]` first. Free-text title, artist or release matching is only a fallback for a concept that does not yet have a canonical taxonomy ID.

## Canonical names and editorial metadata

Entity IDs and canonical `title` values are stable catalogue identity. Do not rename an `id` simply to improve presentation because IDs are used by playback mappings, favourites, deep links and generated data.

Use the optional editorial fields below when a cleaner user-facing name or richer context is verified:

- `displayTitle`: preferred user-facing title. The canonical `title` remains unchanged.
- `aliases[]`: verified alternate spellings, transliterations or previously used names. Do not repeat the canonical title.
- `description`: concise factual description suitable for Explore.
- `story`: optional longer editorial context for a song when a story, tradition, performance context or origin is actually sourced. Never invent a story to fill the field.
- `descriptionSource`: optional source/provenance label for editorial copy when useful.

If `description` and `story` are absent, Explore generates a factual fallback from existing catalogue metadata such as artist credit, taxonomy, release, year and label. A generated fallback is not presented as historical or biographical fact beyond those fields.

The same `displayTitle`, `aliases[]` and `description` fields may be used on release and featured nonstop records. Featured nonstop records may additionally use `series` and `volume` to separate a series name from its numbered edition without changing stable IDs.

## Song record

Important fields:

- `id`: stable internal ID
- `title`: canonical source title
- `displayTitle`: optional user-facing title
- `aliases[]`: optional verified alternate names
- `description`: optional factual editorial description
- `story`: optional sourced story/context
- `artist`
- `artistPrecision`: optional qualifier when only album-level or release-level attribution is verified
- `genre`: one of the six visual worlds
- `category`: primary taxonomy ID
- `taxonomyStyles[]`: secondary taxonomy IDs
- `styles`: secondary searchable free-form tags
- `durationSeconds`: exact seconds or `null`
- `releaseId`
- `trackNumber`
- `audioUrl`: authorised local/remote playable audio or `null`
- `youtubeId`: verified YouTube ID or `null`
- `placeholder`: always false for the verified catalogue
- `sourceStatus`
- `audioAvailability`

A verified catalogue entry can exist without playable audio. Commercial recordings normally use:

```json
{
  "audioUrl": null,
  "youtubeId": null,
  "sourceStatus": "verified-metadata",
  "audioAvailability": "not-bundled"
}
```

## Release record

Important fields:

- `id`, `title`, `artist`
- `displayTitle`, `aliases[]`, `description`: optional editorial presentation metadata
- `releaseDate`: exact date only when verified
- `originalReleaseYear`
- `digitalReleaseYear`: when a later digital reissue is separately verified
- `label`
- `categories`
- `visualGenre`
- `entryType`
- `songCount`
- `durationSeconds`
- `durationPrecision`
- `series` and `volume`
- `live.isLive` and `live.venue`
- `sources[]`
- `trackImportComplete`
- `rightsStatus`
- `audioBundled`
- `metadataStatus`
- `audioAvailability`
- `notes`

Source conflicts are preserved rather than silently normalised. Internal conflict notes are not automatically exposed as user-facing editorial descriptions.

## Free/access resource record

The free-source manifest is separate from the canonical song catalogue because a free download, stream, sample or archive document is not automatically a redistributable song master.

Important fields:

- `resourceType`
- `source` and `sourceUrl`
- `access`
- `priceModel`
- `format` and `masterQuality`
- `licenseName` and `licenseUrl`
- `commercialUse`
- `standaloneRedistribution`
- `repositoryAction`
- `verificationStatus`
- `verifiedAt`

## Metadata audit

Run:

```sh
npm run catalogue:metadata:audit
```

The audit checks canonical title hygiene, optional editorial field shapes, aliases, release references, taxonomy IDs, featured nonstop metadata and the difference between primary visual-world counts and Explore's primary-plus-secondary taxonomy membership.

## Chunking and generation

`data/catalogue/index.json` is the manifest for the chunked source-of-truth records.

Run:

```sh
node scripts/build-catalogue.mjs
```

It verifies the expected counts and generates:

- `data/songs.json`
- `data/releases.json`
- `data/free-audio-sources.json`
