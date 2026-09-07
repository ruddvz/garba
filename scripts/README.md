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

- `build-catalogue.mjs` rebuilds runtime aggregate files from `data/catalogue/index.json` and its canonical shards.
- `enrich-runtime-songs.mjs` adds verified playback-provider routes to the generated song catalogue after the base build.

The `npm run catalogue` command intentionally runs both in that order.

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

## Active validators

- `validate-contact-map.mjs`
- `validate-direct-audio.mjs`
- `validate-discovery.mjs`
- `validate-documentation.mjs`
- `validate-hosting-rights.mjs`
- `validate-master-intake.mjs`
- `validate-outreach-queue.mjs`
- `validate-publish-transaction.mjs`
- `validate-repository-structure.mjs`
- `validate-runtime-song-routes.mjs`
- `validate-simple-runtime.mjs`

These form the maintained validation surface used by `npm run check`. Do not keep superseded validators around as historical snapshots. Git already preserves their history, while stale executable files create false maintenance obligations and can encode obsolete paths or product assumptions.

## Before merging tooling changes

Run:

```bash
npm run check
```

If a new script is intended to become a maintained contract, add an npm script or wire it into `npm run check` as appropriate. A script that is not called anywhere should have a documented operational purpose here; otherwise remove it rather than accumulating dead tooling.
