# GARBA documentation

Documentation is grouped by responsibility so product work, catalogue policy, rights work and operating procedures do not compete in one flat directory.

## Catalogue

- [`catalogue/status.md`](catalogue/status.md): current catalogue coverage and known gaps
- [`catalogue/schema.md`](catalogue/schema.md): canonical song/release schema
- [`catalogue/rights.md`](catalogue/rights.md): source, licensing and redistribution policy
- [`catalogue/content-sources.md`](catalogue/content-sources.md): source guidance
- [`catalogue/song-catalog-contract.md`](catalogue/song-catalog-contract.md): player/catalogue integration contract

## Product

- [`product/design-system.md`](product/design-system.md): visual system and interaction direction
- [`product/playback-runtime-coverage.md`](product/playback-runtime-coverage.md): generated song-route and playback coverage contract
- [`product/youtube-first-playback.md`](product/youtube-first-playback.md): one-tap YouTube IFrame playback architecture, route safety and provider fallback hierarchy
- [`product/responsive-pwa.md`](product/responsive-pwa.md): responsive and installed-app behaviour
- [`product/ux-polish-pass.md`](product/ux-polish-pass.md): product polish notes and remaining UX work

## Rights and partnerships

- [`rights/catalogue-partnership-strategy.md`](rights/catalogue-partnership-strategy.md)
- [`rights/licensing-negotiation-queue.md`](rights/licensing-negotiation-queue.md)
- [`rights/licensing-outreach-operations.md`](rights/licensing-outreach-operations.md)
- [`rights/rights-acquisition-wave-01.md`](rights/rights-acquisition-wave-01.md)
- [`rights/rights-request-template.md`](rights/rights-request-template.md)

## Operations

- [`operations/direct-audio-hosting.md`](operations/direct-audio-hosting.md)
- [`operations/hosting-phase-01.md`](operations/hosting-phase-01.md)
- [`operations/master-ingestion-and-publishing.md`](operations/master-ingestion-and-publishing.md)
- [`operations/vendor-catalogue-intake.md`](operations/vendor-catalogue-intake.md)

## Project

- [`project/roadmap.md`](project/roadmap.md): project-level roadmap

## Naming convention

Documentation files use lowercase kebab-case. `README.md` remains uppercase because it is the conventional directory entry point. New documents should be placed in the narrowest existing responsibility folder instead of being added directly under `docs/`.

`docs/README.md` is the canonical documentation index. `npm run docs:validate` fails when a nested Markdown document is not indexed here, which prevents new documentation from becoming orphaned.
