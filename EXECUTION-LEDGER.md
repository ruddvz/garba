# PlayGarba execution ledger

This file is a human-readable snapshot of repository execution state. It is **not** an ownership registry. Issue #364 remains the only authoritative source for active agent claims and file ownership.

## Snapshot

- Snapshot time: 2026-09-12 20:40 UTC / 16:40 America/Toronto
- Repository: `ruddvz/garba`
- Exact `main`: `2086be5816f0719d7ef82e3ac78ae0949c374427`
- Main head: `Activate 21 verified Ramzat 2 (2018) YouTube routes in catalogue (#1368) (#1373)`
- Open issues: **81**
- Active claims on #364: **24**
- Open pull requests: **16**
- Active cross-issue file conflicts reported by #364: **0**
- Ledger lane: #1374 / `chatgpt-sol-execution-ledger-1374`

Refresh this snapshot before using it to select work. A later #364 claim, merge, issue closure, catalogue import or new pull request can make any row stale.

## YouTube coverage control panel

### Current main

At exact main `2086be5816f0719d7ef82e3ac78ae0949c374427`:

- Canonical songs: **1,706**
- Playable YouTube routes: **1,030**
- Playable YouTube coverage: **60.4%**
- Current migration / no-executable-YouTube backlog: **676**
- Remaining share of catalogue without a playable YouTube route: **39.6%**

The 1,030 figure is current-main evidence from the merged #1373 commit. It must not be mixed with older PR-body coverage figures from smaller catalogue denominators.

### What “100%” means

The optimisation target is maximum truthful YouTube coverage. The repository must never manufacture 100% by accepting a wrong performance, title-only match, unofficial substitute, guessed video ID or inferred chapter timestamp.

Track two separate outcomes:

1. **Playable coverage:** canonical rows with a truthful executable exact YouTube route.
2. **Adjudication coverage:** canonical rows that have been checked and are either exact-YouTube playable or carry a release-specific fail-closed evidence boundary.

Playable coverage should be pushed as high as evidence permits. Adjudication coverage should reach 100%. A row can remain non-playable when the exact recording cannot be proven.

### Current high-value YouTube lanes

| Lane | State at snapshot | What it can change |
| --- | --- | --- |
| #946 Tara Vina Shyam track 4 | Open PR #1359 | Proposes one exact Soor Mandir route; do not count until reconciled and merged on current main. |
| #954 Tahukar 9 | Active research claim | Recover exact 12-track / long-form evidence boundary. No production mutation yet. |
| #1059 Garba No Rang Saajan Ne Sang Vol. 1 | Active research claim | Recover exact 1993 two-entry programme and same-release YouTube evidence. |
| #1351 Anand Vol. 8 | Active research claim | Audit 17 unresolved split tracks while preserving track 14. |
| #1376 Garbi 2 (2025) | Active research claim | Audit 60:10 master + 29 component tracks and source authority. |
| #350 Maro Garbo / Garbi cluster | Open tracker, currently unclaimed | Split remaining release-specific gaps into bounded children after current research/PR overlap checks. |
| #352 medium/long-tail cluster | Open tracker, currently unclaimed | Catch-all only after named clusters; create release-specific children, not a broad mutation lane. |
| #354 Atul / Hemant / Praful cluster | Open tracker, currently unclaimed | Preserve prior fail-closed boundaries; split exact remaining batches. |
| #355 final reconciliation | Open tracker | Run only after cluster work settles; reconcile every remaining provider-reference/no-route row. |
| #157 / #221 | Programme/master | Burn-down authority and playback policy. Coordination only, not broad implementation claims. |

### Recent migration movement

Recent merged work materially raised coverage while preserving exact-recording evidence:

- Killol 2.0: 19 exact routes migrated in PR #1363.
- Maro Garbo 2000: 14 verified chapter routes migrated in PR #1362.
- Ramzat 5: 10 exact routes migrated in PR #1367; that merge reported 1,006 / 1,675 playable.
- Studio Saraswati Non Stop Garba 2016: 12 canonical songs imported in PR #1371 with playback deliberately fail-closed, increasing the catalogue denominator without inventing routes.
- Ramzat 2 (2018): 21 verified routes merged in PR #1373, bringing current main to **1,030 / 1,706 (60.4%)**.

Coverage reports from old PR bodies are useful deltas, not current-main totals. Always rerun or consume exact-main evidence after catalogue imports and concurrent merges.

## YouTube burn-down method

Every remaining row should move through the same evidence funnel:

1. Prefer an exact full-song upload from the official label, official artist/OAC or authoritative distributor.
2. For long-form same-release uploads, accept a split route only when the source directly publishes the chapter start or the boundary is independently proven. Never calculate a timestamp by adding durations.
3. If the authoritative source proves only a continuous recording, model it as a continuous/Nonstop listening source. Do not pretend it is 20–30 exact split tracks.
4. Reject same-title performances, later re-recordings, covers, fan uploads and edition substitutions unless exact recording identity is independently proven.
5. Preserve a stronger existing route. Preserve separately authorised direct media under #976/#984/#985/#986.
6. For every unresolved row, record the rejected candidates and the precise evidence gap. Fail closed.
7. After a research lane proves routes, create the smallest implementation child with an unowned manifest/file scope, then validate on fresh main.
8. Recalculate coverage after every denominator-changing catalogue import and every route merge.

### Priority order from this snapshot

1. Reconcile and finish already-open exact-route PRs such as #1359 before starting duplicate research.
2. Let active research lanes #954, #1059, #1351 and #1376 finish, then convert proven mappings into non-overlapping implementation children.
3. Split #350, #352 and #354 into release-specific evidence children for the largest remaining clusters.
4. Keep catalogue-completeness work such as #1113 separate from YouTube migration so newly imported songs are visible as new backlog rather than hidden in an old percentage.
5. Run #355 only after named clusters and open route PRs have settled.
6. Close #157/#221 only when every consumer-provider gap is either exact-YouTube migrated or has a documented release-specific evidence boundary and repository validation is green.

## Active ownership snapshot

The following claims were active on #364 at the snapshot. Do not take these lanes or their files unless the owner releases them or #364 changes.

| Issue | Agent / branch | State |
| --- | --- | --- |
| #440 | `chatgpt/now-playing-full-title-440` / `ux/issue-440-full-title-disclosure` | Active, PR #1116 open |
| #441 | `chatgpt/mobile-utility-hitareas-441-v2` / `ux/issue-441-mobile-utility-hitareas-v2` | Active, no open PR in snapshot |
| #443 | `chatgpt/courtyard-contrast-443` / `a11y/issue-443-courtyard-contrast` | Active, no open PR in snapshot |
| #451 | `chatgpt/offline-truth-451` / `pwa/issue-451-offline-truth` | Active, no open PR in snapshot |
| #602 | `chatgpt/mobile-cold-start-602` / `perf/mobile-cold-start-602` | Active, PR #605 open |
| #670 | `chatgpt/sol-releases05-670-20260912` / `metadata/issue-670-releases05-sol` | Active, no open PR in snapshot |
| #684 | `chatgpt/sol-releases01-metadata-684` / `metadata/issue-684-releases01-sol` | Active, PR #833 open |
| #761 | `chatgpt/raas-doctor-cli-761` / `raas/issue-761-doctor-cli` | Active; #364 flags for owner review due inactivity |
| #776 | `chatgpt/raas-run-metrics-776` / `raas/issue-776-run-metrics` | Active; #364 flags for owner review due inactivity |
| #847 | `chatgpt/repository-cutover-raas-847` / `chore/repository-cutover-raas` | Active, PR #872 open |
| #894 | `chatgpt/seek-observer-perf-894` / `perf/seek-observer-894` | Active, PR #896 open |
| #924 | `chatgpt/immersive-pwa-924` / `pwa/issue-924-immersive-display` | Active, PR #1005 open |
| #954 | `chatgpt/tahukar9-research-954` / `research/issue-954-tahukar9-2021` | Active research-only |
| #969 | `chatgpt-sol-webkit-viewport-969-v2` / `fix/issue-969-webkit-viewport-page-side` | Active, PR #1260 open |
| #1054 | `chatgpt/taal2-link-replay-1054` / `discovery/issue-1054-taal2-link-replay` | Active, PR #1078 open |
| #1059 | `chatgpt/garba-rang-sajan-v1-1059` / `research/issue-1059-garba-rang-sajan-v1` | Active research-only |
| #1193 | `chatgpt-sol-explore-telemetry-pages-1193` / `fix/issue-1193-explore-telemetry-pages` | Active, PR #1202 open |
| #1302 | `chatgpt-sol-mobile-quality-1302` / `qa/issue-1302-mobile-quality-gate` | Active, PR #1310 open |
| #1325 | `chatgpt-sol-short-landscape-1325` / `fix/issue-1325-short-landscape-player` | Active, PR #1340 open |
| #1336 | `chatgpt-sol-pga-release-browser-evidence-1336` / `qa/issue-1336-pga-release-browser-evidence` | Active; #364 flags for owner review due inactivity |
| #1342 | `antigravity-explore-primitives-1342` / `fix/issue-1342-mobile-explore-primitives` | Active, PR #1364 open |
| #1351 | `chatgpt-sol-anand-vol8-research-1351` / `research/issue-1351-anand-vol8` | Active research-only |
| #1374 | `chatgpt-sol-execution-ledger-1374` / `coordination/issue-1374-execution-ledger` | Active, this ledger lane |
| #1376 | `chatgpt-sol-garbi2-research-1376` / `research/issue-1376-garbi2-youtube` | Active research-only |

Stale-review warnings do **not** release ownership. Only #364 / target-issue claim history can do that.

## Open pull-request snapshot

These PRs were open when the ledger was written. Their existence makes the associated scope unsafe to duplicate even if a stale board snapshot appears otherwise.

| PR | Related lane | Snapshot note |
| --- | --- | --- |
| #1364 | #1342 | Explore mobile primitive runtime fix |
| #1361 | Experimental broad visual engine | Broad/unbounded experimental direction; review separately, do not treat as approved programme work |
| #1310 | #1302 | Mobile quality acceptance gate |
| #1359 | #946 | One exact Tara Vina Shyam YouTube route |
| #1260 | #969 | WebKit viewport geometry read stabilisation |
| #1357 | Experimental React/Vite/TypeScript architecture | Backup/experimental rewrite, not current-main architecture approval |
| #1340 | #1325 | Short-landscape overlap fix |
| #1116 | #440 | Full Now Playing title/details disclosure |
| #1329 | #996 | Browser-smoke Actions runtime update |
| #1202 | #1193 | Publish Explore telemetry graph in Pages |
| #1078 | #1054 | Taal 2.0 metadata-only discovery link |
| #1005 | #924 | Installed PWA display modes |
| #896 | #894 | Bound seek-state DOM observation |
| #872 | #847 | Stage repository rename cutover links |
| #833 | #684 | Explore release descriptions |
| #605 | #602 | Cold mobile artwork load-on-demand |

## Complete open-issue inventory

Status labels below are planning labels for this snapshot only. They do not grant ownership.

| Issue | Title | Snapshot status |
| --- | --- | --- |
| #23 | Rights acquisition wave 1: first 100 direct masters | Rights/external work; unclaimed |
| #157 | Playback Wave G: final consumer-provider to YouTube migration burn-down | YouTube programme / coordination |
| #158 | MASTER: PlayGarba catalogue expansion + consumer-provider migration programme | Programme / coordination |
| #221 | MASTER: migrate PlayGarba catalogue to YouTube-only playback | YouTube master / coordination |
| #276 | Enrich canonical song, release and Nonstop display metadata | Metadata programme / unclaimed umbrella |
| #311 | Design craft system: PlayGarba UI/UX quality programme | Programme / coordination |
| #350 | YouTube migration cluster: Maro Garbo / Garbi provider backlog | YouTube tracker; split before mutation |
| #352 | YouTube migration cluster: remaining medium/long-tail provider batches | YouTube tracker; split before mutation |
| #354 | YouTube migration cluster: remaining Atul / Hemant / Praful evidence-boundary batches | YouTube tracker; split before mutation |
| #355 | YouTube migration cluster: final post-cluster coverage reconciliation | Final YouTube reconciliation tracker |
| #364 | [Agent Board] Active work claims | **Authoritative ownership board** |
| #368 | MASTER: PlayGarba SEO, GEO and AEO search-discovery programme | Programme / coordination |
| #374 | SEO Wave 6: search measurement, indexing operations and discovery monitoring | Measurement/external integration |
| #436 | [Player plan] September 2026 audit: reliable listening, coherent UX and creative roadmap | Coordination-only player plan |
| #438 | [P0] Player: Make playback status and progress atomic across song and Nonstop transitions | Unclaimed; dependency-sensitive runtime lane |
| #439 | [P0] Player: Provide persistent listener-facing playback errors and actionable recovery | Unclaimed; dependency-sensitive runtime lane |
| #440 | [P1] Player: Fix long-title collisions and define stable Now Playing metadata layout | Active claim; PR #1116 |
| #441 | [P1] Player: Make mobile player utilities and genre navigation reachable and understandable | Active claim |
| #442 | [P1] Player: Verify and repair keyboard, focus and screen-reader behavior across player overlays | Unclaimed; sequenced after mobile/overlay work |
| #443 | [P1] Player: Establish verified text, control and focus contrast across all courtyard worlds | Active claim |
| #444 | [P1] Player: Unify player and Explore search with Gujarati aliases and relevance ranking | Unclaimed; overlaps discovery/search architecture |
| #446 | [P1] Player: Remember per-set listening positions and offer explicit Nonstop resume | Unclaimed; dependency-sensitive |
| #447 | [P1] Player: Make song, set and timestamp sharing preserve exact listening context | Unclaimed; dependency-sensitive |
| #449 | [P1] Player: Define a single playback-controller contract and remove one redundant runtime adapter | Unclaimed; shared-runtime sequencing required |
| #450 | [P1] Player: Measure player startup and set enforceable interaction and artwork budgets | Measurement lane; check performance owners first |
| #451 | [P1] Player: Make PWA updates, offline states and install guidance safe for active sessions | Active claim |
| #454 | [P2] Player: Add a small local listening-preferences and saved-data control surface | Future/sequenced |
| #455 | [P2] Player: Design a small set of human-curated Garba listening sessions | Future product experiment |
| #456 | [P2] Player: Prototype optional song stories and verified Gujarati display in recording details | Future product experiment |
| #457 | [P2] Player: Prototype a focused Garba practice mode using verified chapter boundaries | Future product experiment |
| #477 | [RAAS] PlayGarba harness system programme | Programme / coordination |
| #544 | [P1] Player: keep active playback mounted while Explore is open | Sequenced behind shared player/Explore owners |
| #602 | Make PlayGarba cold mobile startup immediate | Active claim; PR #605 |
| #606 | Move canonical PlayGarba production to Vercel with explicit caching | Blocked by #602 and cutover verification |
| #609 | Enable protected main ruleset for coordination and validation checks | Admin/settings lane; connector lacks admin permission |
| #662 | [RAAS] Evaluate LEAPH coordination engine for federation convergence | Evaluation lane; unclaimed |
| #670 | Enrich remaining releases-05 Explore metadata | Active claim |
| #684 | Enrich releases-01 Explore descriptions | Active claim; PR #833 |
| #752 | MASTER: Mobile + PWA application-grade hardening for iOS, Android, Safari and Chrome | Programme / coordination |
| #755 | [P1] Mobile: harden viewport, virtual keyboard, safe areas and standalone PWA geometry | Unclaimed; ownership-sensitive |
| #756 | [P1] Mobile: make playback lifecycle, interruptions and Media Session state truthful | Sequenced behind playback owners |
| #757 | [P2] Mobile: consolidate responsive CSS and remove late PWA override patches | Deliberately late/sequenced |
| #761 | [RAAS UX] Add one-command PlayGarba agent doctor/status | Active claim; owner-review warning |
| #771 | [P0/P1] Catalogue ordering: playable-first now, Popular/Newest/Oldest sorting next | Sequenced behind route/Explore ownership |
| #776 | [RAAS Adaptive CTO] Add task tiers, context/tool budgets and marginal-value stop rules | Active claim; owner-review warning |
| #830 | Rebuild adaptive high-resolution backgrounds from current main | Blocked until exact high-resolution binaries can be restored/hash-verified |
| #836 | [PGA] PlayGarba Admin programme: private founder analytics PWA | Programme / coordination |
| #838 | [PGA-02] Add first-party privacy-minimised telemetry client to PlayGarba | Parent integration lane; blocked by playback ownership for remaining hooks |
| #845 | [PGA-09] Harden PGA authentication, authorisation, privacy and admin-data security | Production/external security completion lane |
| #846 | [PGA-10] Run PGA adaptive/PWA/accessibility/performance release acceptance and production verification | Release acceptance; dependency/external evidence |
| #847 | Repository rename migration: garba → raas | Active claim; PR #872; requires GitHub Settings cutover |
| #869 | Upgrade Live Ground crowd bed to verified local venue ambience | Sequenced source/audio-review lane |
| #894 | [P0 Performance] Bound seek-state DOM observation to playback state | Active claim; PR #896 |
| #900 | [P0 Scale] Load-test PGA telemetry ingestion for thousands of active listeners | Environment-dependent load/release lane |
| #905 | [P1 Performance] Make full catalogue hydration cacheable on warm sessions | Blocked/sequenced behind startup/runtime owners |
| #924 | [P1] Installed PWA: prefer immersive display modes with safe platform fallbacks | Active claim; PR #1005 |
| #925 | [P1] Installed PWA: add capability-gated true fullscreen control for tablet and desktop | Future/sequenced interaction lane |
| #946 | Implement Tara Vina Shyam track 4 exact Soor Mandir YouTube route | Open PR #1359; do not duplicate |
| #947 | [RAAS cutover] Clean old repository URLs from PGA health test fixtures | Post-rename follow-up; blocked until cutover context is ready |
| #954 | Recover the canonical 2021 Tahukar 9 12-track sequence and exact Kirtidan Gadhvi evidence | Active research-only YouTube evidence lane |
| #969 | [CI] Stabilise WebKit viewport containment geometry reads | Active claim; PR #1260 |
| #976 | [P0] Background-capable playback: authorised direct audio + lock-screen controls | Direct-media programme; preserve separate rights gate |
| #985 | [P0 Background audio] Promote authorised direct-first playback routing | Blocked/sequenced behind rights/runtime ownership |
| #986 | [P0 Background audio] Make direct-media playback one persistent Media Session authority | Blocked/sequenced behind #985/shared runtime |
| #987 | [P0 Background audio] Verify iOS, Android, PWA and desktop lifecycle behaviour on real devices | Blocked until rights-cleared pilot + production integration |
| #988 | [P0 Background audio] Roll out rights-cleared direct-media catalogue in verified batches | Blocked by rights acquisition + #985/#986 |
| #996 | [CI] Move browser-smoke actions off deprecated Node 20 runtimes | Open PR #1329; do not duplicate |
| #1054 | Link Taal 2.0 official set without treating chapters as exact album tracks | Active claim; PR #1078 |
| #1059 | Recover Garba No Rang Saajan Ne Sang Vol. 1 exact 1993 track boundary | Active research-only YouTube evidence lane |
| #1113 | Import the verified De Taali 1999 26-track catalogue programme | Queued/shared-file-sensitive catalogue import; playback stays fail-closed |
| #1123 | Correct Sonbai Ni Chundadi soundtrack identity and migrate the legacy 1962 anchor safely | Queued/shared-file-sensitive identity migration |
| #1132 | [Performance] Make session-stability baseline exclude hidden startup sheet DOM | Follow-up after closed-sheet startup behaviour settles |
| #1189 | [Coordination] Reconcile stale ready PRs blocked only by shared WebKit Search gate | Coordination only |
| #1193 | [P1 Analytics] Publish Explore telemetry module graph in production Pages artifact | Active claim; PR #1202 |
| #1302 | [P1 Mobile QA] Add a bounded PlayGarba phone visual and interaction acceptance gate | Active claim; PR #1310 |
| #1325 | [P1 Mobile] Prevent short-landscape Now Playing and transport overlap | Active claim; PR #1340 |
| #1336 | [PGA-10D] Add browser evidence for partial/stale analytics and actionable Health | Active claim; owner-review warning |
| #1342 | [P2 Explore] Stop generic runtime shelf rules overriding distinct mobile primitives | Active claim; PR #1364 |
| #1351 | Research exact YouTube routes for Anand (Non Stop Garba, Vol. 8) | Active research-only YouTube evidence lane |
| #1374 | [Coordination] Add live issue and YouTube coverage execution ledger | Active ledger lane |
| #1376 | Audit Garbi 2 (2025) exact Sur Sagar YouTube evidence | Active research-only YouTube evidence lane |

## Safe work-selection rules

Before taking anything from the inventory:

1. Fetch current `main` again.
2. Read #364 and the target issue's latest comments.
3. Search open PRs for the target issue, branch, release and files.
4. Treat every active claim as owned even when #364 marks it stale/review-needed.
5. Do not use master/programme/tracker issues as broad mutation lanes. Create a bounded child first when required.
6. Prefer a research-only child when source identity is uncertain. Research completion does not reserve production files.
7. Claim one mutation lane at a time and declare exact files.
8. Reconcile again before PR and before merge because this repository changes quickly.

## Definition of progress for this ledger

When refreshing this file, update all of the following together:

- exact main SHA and timestamp;
- open issue, claim and PR counts;
- current canonical song count, playable YouTube count, coverage percentage and backlog;
- merged route/catalogue deltas since the previous snapshot;
- active YouTube research and implementation lanes;
- full issue inventory statuses;
- open PR list;
- blockers that moved or cleared.

Do not mark an item complete because code exists on a branch. Completion follows the repository lifecycle: validated change, reviewable PR, required checks, merge, production verification when applicable, issue closure/release, and then a refreshed ledger snapshot.