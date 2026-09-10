# Direct-media rights contract

PlayGarba may execute a direct audio source only when the repository contains explicit evidence that PlayGarba is authorised to stream or redistribute that exact recording. Availability on a consumer music service is not permission to redistribute the recording.

This contract is the safety prerequisite for the authorised-direct-first background playback programme in #976. It does not itself enable direct playback.

## Current production truth

`data/direct-audio.json` is the production manifest. An empty `tracks` object is valid and means there are currently no rights-cleared direct recordings available through this contract.

`src/optional/direct-audio-bridge.js` already expresses the original minimum permission boundary. The CI validator in `scripts/lib/validate-direct-audio-rights.mjs` makes that boundary fail closed and ties every executable candidate to a canonical catalogue song ID.

## Required entry

A direct-media entry is eligible for later playback integration only when all of these are true:

- the manifest key is an existing canonical PlayGarba song ID;
- `audioUrl` is an absolute HTTPS URL;
- `audioUrl` is not a YouTube, Spotify, Apple Music, Amazon Music, SoundCloud, Gaana, JioSaavn or similar consumer-provider stream;
- `mimeType` is an allowed audio MIME type;
- `rights.redistributionAuthorized` is exactly `true`;
- `rights.rightsHolder` identifies the rights holder or authorised licensor;
- `rights.licenseName` identifies the explicit licence or permission under which PlayGarba may use the recording;
- `rights.proofUrl` is a separate absolute HTTPS evidence URL;
- the row contains no unreviewed fields that could silently broaden execution rights.

The validator intentionally rejects unknown manifest, track and rights fields. Expanding the schema therefore requires an explicit code review instead of silently changing the permission boundary.

## What does not establish permission

None of the following is sufficient on its own:

- a YouTube video or YouTube Music URL;
- a Spotify, Apple Music, Amazon Music, SoundCloud, Gaana or JioSaavn stream;
- a file that a user purchased or downloaded for personal listening;
- a recording that can be listened to for free;
- an embeddable provider player;
- ownership or public-domain status of the underlying composition when the recording itself is separately protected;
- a guessed label, uploader, performer or distributor relationship.

PlayGarba must not rip, extract, cache, proxy or transform a consumer-provider stream into an executable direct source.

## Proof and identity

The proof URL is evidence of permission, not the media asset itself. One proof document may cover multiple recordings when its rights-holder and permission identity are consistent. The validator rejects reuse of one proof URL with conflicting rights-holder or licence claims.

One direct media URL may not silently represent multiple canonical recordings. If a legitimate master covers a continuous release rather than split tracks, the catalogue and playback model must represent that truth explicitly rather than assigning the same asset to unrelated song IDs.

## Revocation and future schema changes

The current schema is deliberately minimal. If expiry, revocation, territory, asset checksum, contract identifier or other rights fields become necessary, add them through an explicit schema change with tests before using them in production data.

A future revocation mechanism must fail closed. Removing execution permission must not change the canonical song or recording identity and must not silently replace it with a different recording.

## YouTube boundary

YouTube remains a visible foreground playback source where PlayGarba has a verified route. Current YouTube Developer Policies prohibit API clients from creating background-player behaviour for YouTube audiovisual content and prohibit separating or promoting its audio component. Background-capable PlayGarba playback therefore requires separately authorised direct media and must not be implemented through a hidden iframe, extractor, proxy or visibility workaround.

## Validation

Run:

```sh
node scripts/lib/validate-direct-audio-rights.test.mjs
node scripts/lib/validate-direct-audio-rights.mjs
```

The dedicated GitHub Actions workflow runs both commands when the rights manifest, canonical song chunks, validator, tests or workflow change.

Passing this gate means only that the repository record satisfies the declared direct-media schema. It is not independent legal advice and does not create rights that are absent from the underlying permission evidence.