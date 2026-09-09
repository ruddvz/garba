# PGA telemetry load testing

Issue #900 defines the scale/release gate for PlayGarba telemetry ingestion. This harness exists to answer one narrow question with evidence: can the PGA data plane stay bounded and useful when the listening product reaches thousands of simultaneously active sessions?

It is not a production traffic generator and it must not be used to manufacture a capacity claim from repository code alone.

## Current evidence boundary

The public telemetry client sends presence every 45 seconds. That contract implies the following steady heartbeat request model before ordinary interaction traffic:

| Active listeners | Heartbeat requests/second |
| ---: | ---: |
| 1,000 | 22.2 |
| 5,000 | 111.1 |
| 10,000 | 222.2 |

These values are deterministic request models, not achieved Cloudflare throughput. The repository still does not prove that the external Analytics Engine datasets, D1 database, rate limiter, Access application and deployment targets needed for production-equivalent load evidence are provisioned.

The load harness therefore has two modes:

1. **Model-only**, which is the default and never opens a network connection.
2. **Non-production execution**, which requires an explicit target/environment and hard-blocks the known PlayGarba production hosts.

## Files

- `scripts/load/pga-telemetry-load.mjs` — scenario model, synthetic request generator, bounded HTTP executor and optional protected PGA probes.
- `scripts/lib/test-pga-telemetry-load.mjs` — deterministic schema, safety and request-model regression tests.
- `.github/workflows/pga-telemetry-load-validate.yml` — non-network CI validation for the harness and the 1k/5k/10k request models.

The harness deliberately does not change the telemetry schema, ingestion Worker, public player, PGA UI, rate limiter, Analytics Engine writes, D1 rollups or deployment configuration.

## Safety invariants

The harness is intentionally harder to misuse than a generic benchmark script.

- Model-only mode is the default.
- `playgarba.com`, `www.playgarba.com`, `events.playgarba.com` and `pga.playgarba.com` are hard-blocked as execution targets.
- `--environment production` and `--environment prod` are rejected.
- The global execution ceiling is 500 requests/second and 100 concurrent requests. Defaults are 100 requests/second and 20 concurrent requests.
- Synthetic browser/session/tab/playback/search IDs are generated locally. No real listener identifiers or production events are replayed.
- The public ingestion schema remains authoritative. Valid fixtures are tested against `src/pga/backend/lib/validation.js`.
- Retry-storm attempts reuse the same synthetic `event_id` per logical event so transport-level duplicate acceptance can be measured without inventing a storage-level deduplication claim.
- Protected PGA credentials are read only from a named environment variable. Tokens are never accepted as a command-line value and are never written to the report.
- A run against a real non-production Worker should still use an explicit approved test window and a target whose Cloudflare resources are isolated from production data.

If production capacity needs to be proven later, create a controlled release/test window with the project owner and Cloudflare environment owner. Do not remove the production-host block as an incidental change to this harness.

## Model-only commands

Model the three steady-state listener levels:

```sh
node scripts/load/pga-telemetry-load.mjs --scenario matrix --duration-seconds 90
```

Inspect one level directly:

```sh
node scripts/load/pga-telemetry-load.mjs \
  --scenario steady \
  --listeners 10000 \
  --duration-seconds 90
```

Model the burst/retry/invalid scenarios without network traffic:

```sh
node scripts/load/pga-telemetry-load.mjs --scenario navratri-burst --listeners 5000 --duration-seconds 90
node scripts/load/pga-telemetry-load.mjs --scenario retry-storm --listeners 5000 --retry-attempts 3
node scripts/load/pga-telemetry-load.mjs --scenario invalid-mix --listeners 5000 --invalid-ratio 0.1
```

The JSON output explicitly says `capacityClaim: "not measured"` and lists the external evidence still required.

## Non-production execution

Use one concrete scenario per real run. `matrix` mode cannot execute network load.

```sh
node scripts/load/pga-telemetry-load.mjs \
  --execute \
  --scenario steady \
  --listeners 1000 \
  --duration-seconds 90 \
  --target https://example-staging.workers.dev/v1/events \
  --environment staging \
  --rps-cap 100 \
  --concurrency 20 \
  --revision "$(git rev-parse HEAD)" \
  --output /tmp/pga-load-1k.json
```

The target must be the ingestion Worker `/v1/events` route. A root Worker URL is also accepted and is normalised to that path.

For a production-equivalent non-production environment, run the steady profiles separately at 1k, 5k and 10k active-listener models. The `--rps-cap` is an intentional safety throttle. A large logical burst can therefore take longer than the nominal listener action window; record the configured cap with the result instead of describing it as an unconstrained burst.

## Scenario contract

### `steady`

Creates one valid `presence_heartbeat` request per listener per 45-second heartbeat round. This isolates the recurring background cost that exists even when the listener does not search, skip or change songs.

### `navratri-burst`

Creates one four-event batch per listener containing:

- `session_started`;
- `search_submitted`;
- `play_intent`;
- `playback_started`.

It then adds the normal heartbeat rounds. This models the clustered session/search/play behaviour expected around a high-attention Navratri launch without adding fake event types.

### `retry-storm`

Creates the configured number of attempts for the same logical synthetic heartbeat event, bounded by the real client queue maximum. The executor still obeys the global RPS ceiling.

The report records per-event attempt/accepted-attempt counts. That is transport evidence only. It does not prove Analytics Engine storage deduplication or duplication without separate protected/query evidence.

### `invalid-mix`

Mixes valid heartbeat traffic with bounded invalid request classes:

- invalid JSON;
- request body larger than the ingestion limit;
- unknown event name;
- wrong Origin.

`--invalid-ratio` is capped at 0.5. The goal is to prove that abuse/rejection handling remains bounded while valid traffic continues, not to flood the endpoint with garbage.

## Protected PGA probes during ingestion

When a protected non-production PGA API exists, the harness can sample Home, Live, Audience, Listening and Health while ingestion load is running.

Store the Access JWT in an environment variable:

```sh
export PGA_LOAD_ACCESS_JWT='...'
```

Then run:

```sh
node scripts/load/pga-telemetry-load.mjs \
  --execute \
  --scenario steady \
  --listeners 5000 \
  --duration-seconds 180 \
  --target https://example-events-staging.workers.dev/v1/events \
  --admin-url https://example-pga-staging.workers.dev \
  --access-jwt-env PGA_LOAD_ACCESS_JWT \
  --admin-probe-seconds 10 \
  --environment staging \
  --rps-cap 150 \
  --concurrency 30 \
  --revision "$(git rev-parse HEAD)" \
  --output /tmp/pga-load-5k-with-admin.json
```

The report records route status, latency and any returned top-level truth state/freshness marker. It never prints the JWT.

## Evidence to record per real run

Attach or summarise the JSON report on issue #900 with:

- exact repository revision;
- exact non-production environment/Worker identity;
- scenario, listener count, duration, RPS cap and concurrency;
- request count and observed request rate;
- HTTP status distribution;
- rejection reasons such as `rate_limited`, `body_too_large` or `ingestion_unavailable`;
- p50/p95/p99/max request latency;
- accepted event count;
- network failures;
- expected-valid versus expected-rejected class mismatches;
- retry attempt/accepted-attempt evidence;
- protected PGA query samples when configured;
- external Cloudflare observations for Analytics Engine write failures, Worker CPU/runtime limits and D1 rollup/query freshness.

Do not infer an Analytics Engine write success count from HTTP 202 alone if the platform exposes contradictory logs/health evidence. Do not infer D1 freshness from ingestion responses. Keep each evidence source separate.

## Capacity decision

A listener level is not certified merely because the harness can generate its request model.

For each 1k/5k/10k level, record one of:

- **PASS** — the production-equivalent non-production environment stayed inside the agreed latency/error/freshness bounds and recovered after the scenario;
- **FAIL** — a measured bottleneck occurred, with the exact failing load level and evidence attached;
- **BLOCKED** — the required Cloudflare environment, protected aggregate credentials or platform observability did not exist for a safe test.

At the time this harness was introduced, repository evidence supports only **BLOCKED** for a real Cloudflare capacity claim. CI can verify the model, schema and safety contract, but it cannot turn that into production capacity evidence.

## Focused validation

```sh
node --check scripts/load/pga-telemetry-load.mjs
node scripts/lib/test-pga-telemetry-load.mjs
node scripts/load/pga-telemetry-load.mjs --scenario matrix --duration-seconds 45
```

Repository-wide validation remains required before merge. The dedicated workflow intentionally runs only model-mode commands so CI never creates load against an external service.
