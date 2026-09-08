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
- DOMContentLoaded, load, FCP and observed LCP timing where Chromium exposes them;
- Search presentation time from the `input` event to the next rendered song-list frame;
- Nonstop presentation time from Choose Nonstop activation to an open panel with at least one set;
- layout-shift score observed during the measured page lifetime;
- Long Task count, total duration and maximum duration;
- same-origin transfer, encoded and decoded bytes;
- catalogue (`/data/`) and artwork transfer bytes;
- the ten largest same-origin transfers;
- page/runtime/HTTP failures seen during each phase.

Search uses the fixed known query `Khalasi` so runs remain comparable. The raw result also records whether the rendered list actually contains that query and how many top-level result rows were rendered.

## Measurement boundary

Third-party requests are blocked and service workers are disabled during these runs. That is deliberate.

The harness is measuring local PlayGarba work: document/runtime/catalogue loading, rendering, search and Nonstop interaction. YouTube startup, ads, embed availability, browser autoplay policy and provider network latency are not included. Provider-confirmed playback startup must be measured separately after the owning playback lanes settle; it must not be reported as a guaranteed PlayGarba response time.

Cold samples clear Chromium's HTTP cache. The warm sample then reuses the same browser context and cache after the cold navigation. Local storage/session state may therefore be warm, matching a returning-tab scenario.

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

The local production-equivalent fixture should use the same packaging steps as `.github/workflows/browser-smoke.yml`: generated catalogue data, concatenated production CSS, packaged seek runtime, generated PWA icons and the extracted approved background pack. Do not compare an unpackaged repository root directly with a deployed build and call the difference a product regression.

## Provisional budgets

The issue currently proposes two local interaction targets. Treat them as budgets to validate, not measured facts:

- primary local control response: under 100 ms;
- loaded-index Search presentation: under 150 ms.

The harness directly measures Search and Nonstop presentation. A provider-confirmed Play transition is intentionally not reduced to the 100 ms local-control target because truthful Playing state depends on YouTube confirmation.

For Core Web Vitals, record Chromium lab observations but do not describe them as field CWV percentiles. Field claims require real-user data with a defined population and sample window.

## Baseline recording rule

Do not hand-enter estimated timings or transfer sizes into the repository. Keep the JSON output from a real run with:

- tested Git commit or deployed build identity;
- target URL;
- browser/Playwright version;
- profile configuration;
- sample count;
- cold and warm summaries;
- raw samples and failures.

Issue #450 is not complete merely because this harness exists. Completion requires an actual reproducible baseline, evidence for any measured bottleneck, a bounded optimization only if the evidence justifies one, and a final run on the same profiles. If the current execution environment cannot run Chromium, report that as a blocked measurement rather than fabricating numbers.
