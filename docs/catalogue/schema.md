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

## Music taxonomy

`data/taxonomy.json` contains the 19 catalogue categories, including Roots / Archive, Traditional Garba, Tran Taali, Be Taali, Raas / Dandiya, Dodhiyu, Hinch, Dakla, Sanedo, Mataji / Devotional, Krishna Garba, Folk / Lokgeet, Live Garba, Modern Gujarati Garba, Hip-hop Garba, Electronic / Fusion, DJ / Remix, Bollywood / Filmi and Instrumental / Cinematic.

Aliases preserve spelling variants such as Tran Taali, Teen Taali, Dodhiya and Dodiyo.

## Song record

Important fields:

- `id`: stable internal ID
- `title`
- `artist`
- `artistPrecision`: optional qualifier when only album-level or release-level attribution is verified
- `genre`: one of the six visual worlds
- `category`: primary taxonomy ID
- `styles`: secondary searchable tags
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

Source conflicts are preserved rather than silently normalised.

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
