# Player performance measurement

This directory owns the reproducible lab-measurement lane for issue #450. It measures PlayGarba's local player shell and discovery interactions without changing playback, catalogue, artwork or browser-smoke behavior.

## What the harness measures

`measure-player.mjs` records paired cold and warm Chromium samples for two profiles:

| Profile | Viewport | CPU | Network |
| --- | --- | --- | --- |
| `desktop` | 1440×900, DPR 1 | no CPU throttling | browser/network default |
| `mobile-low-end` | 390×844, DPR 2, touch/mobile | 4× CPU slowdown | 150 ms latency, 200,000 B/s download, 93,750 B/s upload |

The mobile network profile is an explicit repository lab profile, not a claim about a standard carrier or a field percentile.

For every cold/warm phase the report includes:

- player-shell readiness from navigation start until a real song title and Play control are present;
- full-catalogue readiness, `/data/songs.json` response completion, and post-response catalogue hydration time;
- DOMContentLoaded, load, FCP and observed LCP timing where Chromium exposes them;
- Search presentation time from the `input` event to the next rendered song-list frame after the full catalogue is ready;
- Nonstop presentation time from Choose Nonstop activation to an open panel with at least one set;
- layout-shift score observed during the measured page lifetime;
- Long Task count, total duration and maximum duration;
- same-origin transfer, encoded and decoded bytes;
- catalogue, `songs.json`, artwork and background-library transfer bytes;
- background-library request and unique-asset counts;
- the ten largest same-origin transfers;
- page/runtime/HTTP failures seen during each phase.

Search uses the fixed known query `Khalasi` so runs remain comparable. The raw result also records whether the rendered list actually contains that query and how many top-level result rows were rendered.

## Measurement boundary

Service workers are disabled so an installed-app cache does not hide the network and parsing behavior under test. The harness does not initiate provider playback, so YouTube startup, ads, embed availability, autoplay policy and provider network latency are excluded. Resource-transfer totals are calculated for same-origin resources only.

Cold samples clear Chromium's HTTP cache. Each paired warm sample reuses the same browser context and HTTP cache after the cold navigation. The harness intentionally does not use Playwright request routing because interception disables Chromium HTTP caching and would make a supposed warm sample network-cold.

A provider-confirmed Play transition must be measured separately by the owning playback lane. It must not be reported as a guaranteed PlayGarba response time from these measurements.

## Run it

Use the same temporary Playwright version as the repository browser-smoke workflow. Do not add it to `package.json` for a one-off measurement run.

```bash
npm install --no-save --no-package-lock @playwright/test@1.55.0
npx playwright install chromium
```

Against a local production-equivalent fixture already serving on port 4173:

```bash
node scripts/performance/measure-player.mjs \
  --origin=http://127.0.0.1:4173 \
  --runs=7 \
  --output=/tmp/playgarba-player-performance.json
```

Against a deployed host when its exact revision is known:

```bash
node scripts/performance/measure-player.mjs \
  --origin=https://playgarba.com/ \
  --runs=7 \
  --output=/tmp/playgarba-player-performance.json
```

Run a single profile while iterating:

```bash
node scripts/performance/measure-player.mjs --profile=mobile-low-end --runs=3
```

The local production-equivalent fixture should use the same packaging steps as `.github/workflows/browser-smoke.yml`: generated catalogue data, concatenated production CSS, packaged player runtimes, generated PWA icons and the extracted approved background pack. Do not compare an unpackaged repository root directly with a deployed build and call the difference a product regression.

## Recorded baseline: 2026-09-08

The persistent summary is in `baselines/2026-09-08-production-equivalent-ci.json`.

Measurement identity:

- tested revision: `057d2da13c4ee155c2cc82d973d7701fd1fb0d0a`;
- Chromium: `140.0.7339.16`;
- Playwright: `1.55.0`;
- 7 cold/warm pairs per profile;
- fixture: production-equivalent repository artifact served by `python3 -m http.server`;
- workflow run: `34270410215`;
- raw artifact: `issue-450-player-performance-baseline`, artifact ID `10073702986`;
- artifact SHA-256: `9d06ed8ed833464cf6fc4903c62e5362a6c7504e58768dea213d9642d45ae301`.

Selected p75 results:

| Metric | Desktop cold | Desktop warm | Mobile low-end cold | Mobile low-end warm |
| --- | ---: | ---: | ---: | ---: |
| Shell ready | 214.9 ms | 93.5 ms | 2644.9 ms | 758.8 ms |
| Full catalogue ready | 364.9 ms | 259.6 ms | 18737.9 ms | 2628.9 ms |
| `songs.json` response end | 254.1 ms | 136.4 ms | 18424.1 ms | 2324.2 ms |
| Post-response catalogue hydration | 110.8 ms | 132.7 ms | 327.2 ms | 308.4 ms |
| Loaded-index Search presentation | 90.8 ms | 87.3 ms | 95.2 ms | 91.0 ms |
| Nonstop presentation | 23.6 ms | 20.9 ms | 104.0 ms | 89.4 ms |
| Observed CLS | 0.0159 | 0.0054 | 0.0426 | 0.0098 |
| Long-task total | 59 ms | 60 ms | 732 ms | 579 ms |
| Largest long task | 59 ms | 60 ms | 221 ms | 195 ms |
| Same-origin transfer | 5.60 MB | 159 KB | 3.80 MB | 399 KB |
| `songs.json` transfer | 1.37 MB | 300 B | 1.37 MB | 300 B |
| Background-library transfer | 3.65 MB | 0 B | 1.85 MB | 241 KB |
| Unique background assets observed | 15 | 15 cached | 8 | 9 |

All 28 measured phases completed with no same-origin HTTP, request or runtime failures. Search returned the expected loaded-index result and Nonstop rendered 73 sets in every phase.

### What the baseline says

Loaded-index Search is below the issue's proposed 150 ms local presentation budget in every p75 profile/phase above. The 100 ms primary-local-control target remains a target rather than a blanket Play-start guarantee: this harness does not initiate provider playback, and truthful Playing state depends on YouTube confirmation.

The throttled cold-mobile full-catalogue delay is overwhelmingly transfer-bound. `songs.json` finishes at 18.424 s p75 while post-response catalogue hydration is 327 ms p75. On the paired warm run the body is cache-validating rather than retransferring: `songs.json` transfers 300 B p75. Do not describe the cold 18.4 s value as 18.4 s of JavaScript parsing or rendering.

The production-equivalent fixture uses Python's simple HTTP server and does not model the deployed host's gzip/Brotli configuration. Cold `encodedBodySize` and `decodedBodySize` values in this baseline therefore describe the lab fixture, not production compressed transfer cost. Use a deployed-host run before making compression claims.

The clearest measured product bottleneck is artwork warming. Desktop cold samples observe all 15 unique 2K background assets and 3.65 MB of background-library transfer in the measured page lifetime. The throttled mobile cold profile has already fetched 8 unique background assets and 1.85 MB by the same measurement boundary. This conflicts with #450's desired current-artwork-only loading behavior.

That runtime is already owned by legacy PR #299. This lane intentionally does not modify `assets/runtime/visual-world-state.js` or duplicate #299. The measurement evidence has been posted to #299 for the owning lane to remove full-library 2K warming while preserving Save-Data and fallback behavior.

## Budgets and Web Vitals targets

Repository-local budgets from #450:

- loaded-index Search presentation: less than 150 ms;
- primary local control response: less than 100 ms where the response is fully local;
- provider-confirmed playback start: outside the local-control budget and never guaranteed by this harness.

For external Core Web Vitals targets, use the current web.dev thresholds when evaluating real-user field data: LCP at or below 2.5 s, INP at or below 200 ms, and CLS at or below 0.1, assessed at the 75th percentile and segmented by mobile and desktop. Lab observations here are diagnostics, not field-CWV pass claims.

This harness currently observes LCP and CLS but does not implement a full INP field measurement. Long Tasks and direct interaction timings are diagnostic signals, not substitutes for real-user INP.

## Baseline recording rule

Do not hand-enter estimated timings or transfer sizes. A baseline must retain:

- tested Git commit or deployed build identity;
- target URL and fixture identity;
- browser/Playwright version;
- profile configuration;
- sample count and percentile limitation;
- cold and warm summaries;
- raw samples, failures and representative large transfers in the retained artifact.

Issue #450 should remain open until the measured artwork bottleneck is resolved by the non-conflicting owner and equivalent final measurements demonstrate the intended loading behavior. The measurement infrastructure itself is repository-internal, so it does not require a production deployment verification step.