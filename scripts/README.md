# GARBA scripts

`scripts/` contains repository tooling. Keep filenames action-oriented and keep one clear implementation for each check.

## Naming

Use lowercase kebab-case and prefer `verb-object.mjs`:

- `build-*` creates canonical derived data.
- `enrich-*` adds verified runtime fields to generated data without changing canonical source shards.
- `audit-*` checks external or runtime health and can report changing conditions.
- `validate-*` enforces deterministic repository/data contracts and exits non-zero on failure.
- `report-*` produces operational summaries without changing source data.
- `generate-*`, `match-*` and `plan-*` are explicit rights/ingestion operations.
- `test-*` is executable test coverage for a reusable module.

Shared implementation code belongs in `scripts/lib/`, not alongside entry-point scripts.

## Catalogue and runtime generation

- `build-catalogue.mjs` rebuilds runtime aggregate files from `data/catalogue/index.json` and its canonical shards. Multi-song releases prefer release-shaped provider sources over representative track links. Generated YouTube performance chapters must pass credited-artist identity compatibility before they can outrank a conservative release/provider fallback.
- `enrich-runtime-songs.mjs` adds verified playback-provider routes to the generated song catalogue after the base build. It prevents release-level track references and duplicated provider track URLs from masquerading as exact songs.

The `npm run catalogue` command intentionally runs both in that order.

## Performance chapter identity

Reusable performer-credit normalisation lives in `lib/artist-identity.mjs`. It keeps a deliberately small explicit alias map for verified naming/stage-name variants and fails closed when a discovery set does not identify a compatible performer.

- `lib/test-performance-artist-identity.mjs` covers same-artist matches, collaborations, aliases, segment-level credits, unknown performers and conflicting artists.
- `lib/validate-performance-chapter-identity.mjs` audits every generated `verified-performance-chapter` route after catalogue generation and proves the stored route metadata still matches the canonical song and discovery-set credits.
- `npm run performance:identity:test` runs the focused unit coverage.
- `npm run performance:identity:validate` runs the repository-wide generated-route audit.

These checks are part of `npm run check`. Do not restore title-only generated chapter matching merely to improve playback coverage. A coverage decrease caused by rejecting a different or unknown performer is a route-truth correction and should fall back conservatively.

## Playback quality reporting

- `report-playback-route-quality.mjs` ranks the remaining release/provider fallback batches after catalogue generation and separates exact selections from reference-only routes.
- `report-youtube-first-coverage.mjs` measures how much of the catalogue can use one-tap direct or exact YouTube playback and separates manual/reference/provider fallbacks.
- Run `npm run playback:report` when planning general route-upgrade work.
- Run `npm run youtube:coverage` when planning the next verified YouTube mapping wave.

These reports are prioritisation tools. They do not make a route exact and they do not replace source verification.

## Health audits

- `audit-youtube-health.mjs` checks YouTube source health.
- `audit-direct-host-health.mjs` checks authorised direct-host audio health.

Health audits can depend on the network. They are kept separate from deterministic repository validation.

## Rights and ingestion operations

- `generate-licensing-request.mjs`
- `match-vendor-catalogue.mjs`
- `plan-direct-ingest.mjs`
- `report-hosting-readiness.mjs`
- `report-label-acquisition.mjs`

Reusable matching logic lives in `lib/catalogue-matcher.mjs`; its executable coverage is `test-catalogue-matcher.mjs`.

## Maintained validators

The default `npm run check` path runs the runtime-critical and repository-level guards:

- `validate-player-continuity.mjs`
- `validate-runtime-packaging.mjs`
- `validate-runtime-song-routes.mjs`
- `validate-youtube-player-runtime.mjs`, which enforces the official visible YouTube IFrame API architecture and rejects raw-stream/ad-bypass mechanisms
- `validate-discovery.mjs`
- `validate-repository-structure.mjs` through `npm run repo:validate`
- `validate-documentation.mjs` through `npm run docs:validate`
- the internal performance-identity unit and generated-route audit described above

Additional deterministic rights/ingestion validators remain available for their dedicated workflows:

- `validate-contact-map.mjs`
- `validate-direct-audio.mjs`
- `validate-hosting-rights.mjs`
- `validate-master-intake.mjs`
- `validate-outreach-queue.mjs`
- `validate-publish-transaction.mjs`
- `validate-simple-runtime.mjs` is retained as a broader launch-hardening audit while the split runtime has more focused packaging/route guards.

Do not keep superseded validators around as historical snapshots. Git already preserves their history, while stale executable files create false maintenance obligations and can encode obsolete paths or product assumptions.

## Before merging tooling changes

Run:

```bash
npm run check
```

If a new script is intended to become a maintained contract, add an npm script or wire it into `npm run check` as appropriate. A script that is not called anywhere should have a documented operational purpose here; otherwise remove it rather than accumulating dead tooling.
