# GARBA documentation

Documentation is grouped by responsibility so product work, catalogue policy, rights work and operating procedures do not compete in one flat directory.

## Catalogue

- [`catalogue/status.md`](catalogue/status.md): current catalogue coverage and known gaps
- [`catalogue/schema.md`](catalogue/schema.md): canonical song/release schema
- [`catalogue/rights.md`](catalogue/rights.md): source, licensing and redistribution policy
- [`catalogue/content-sources.md`](catalogue/content-sources.md): source guidance
- [`catalogue/song-catalog-contract.md`](catalogue/song-catalog-contract.md): player/catalogue integration contract
- [`catalogue/issue-151-foundational-artists-audit.md`](catalogue/issue-151-foundational-artists-audit.md): Atul Purohit, Hemant Chauhan and Praful Dave catalogue-completeness and playback-routing audit
- [`catalogue/issue-152-wave-d-audit.md`](catalogue/issue-152-wave-d-audit.md): Falguni Pathak, Kirtidan Gadhvi, Geeta Rabari and Aditya Gadhvi Wave D catalogue and playback audit
- [`catalogue/issue-152-wave-d2-audit.md`](catalogue/issue-152-wave-d2-audit.md): Geeta Rabari Zankaar 3.0 and Kirtidan Gadhvi Tahukar 10 follow-up audit
- [`catalogue/issue-152-wave-d3-audit.md`](catalogue/issue-152-wave-d3-audit.md): Kirtidan Gadhvi Tahukar 11 complete split-track and exact chapter-routing audit
- [`catalogue/issue-152-wave-d4-audit.md`](catalogue/issue-152-wave-d4-audit.md): Rangili Ramzat 8 complete multi-artist split-track and exact Amazon routing audit
- [`catalogue/issue-152-wave-d5-audit.md`](catalogue/issue-152-wave-d5-audit.md): Geeta Rabari Taal 2022 complete album, exact Amazon routing and Nonstop master audit
- [`catalogue/issue-152-wave-d6-audit.md`](catalogue/issue-152-wave-d6-audit.md): Kirtidan Gadhvi and Anita Pandit Nortani Raat split-album, exact Amazon routing and continuous-master audit
- [`catalogue/issue-156-wave-f-audit.md`](catalogue/issue-156-wave-f-audit.md): Wave F 222-candidate discovery, dedupe, ownership and playback-evidence audit
- [`catalogue/issue-156-wave-f-closeout.md`](catalogue/issue-156-wave-f-closeout.md): current-main Wave F closeout metrics, accepted additions, deferred candidates and validation gate

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
- [`operations/domain-split.md`](operations/domain-split.md): public-site and live-player domain cutover runbook
- [`operations/hosting-phase-01.md`](operations/hosting-phase-01.md)
- [`operations/master-ingestion-and-publishing.md`](operations/master-ingestion-and-publishing.md)
- [`operations/vendor-catalogue-intake.md`](operations/vendor-catalogue-intake.md)

## Project

- [`project/roadmap.md`](project/roadmap.md): project-level roadmap

## Naming convention

Documentation files use lowercase kebab-case. `README.md` remains uppercase because it is the conventional directory entry point. New documents should be placed in the narrowest existing responsibility folder instead of being added directly under `docs/`.

`docs/README.md` is the canonical documentation index. `npm run docs:validate` fails when a nested Markdown document is not indexed here, which prevents new documentation from becoming orphaned.
