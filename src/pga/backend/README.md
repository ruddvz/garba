# PGA backend

This directory implements the server-side data plane for PlayGarba Admin (PGA).
The canonical metric, privacy and retention contract is `../ARCHITECTURE.md`.

## Surfaces

| Worker | Exposure | Job |
| --- | --- | --- |
| `ingest-worker.js` | Public at the future `events.playgarba.com` host | Validate and pseudonymise bounded first-party events, then write product events and presence into separate Analytics Engine datasets |
| `admin-worker.js` | Private behind Cloudflare Access at the future PGA host | Verify the Access JWT and return aggregate Home, Live, Audience, Listening and backend-health data only |
| `rollup-worker.js` | Scheduled only, no public route | Rebuild the seven most recent closed IST days and replace durable D1 daily aggregates idempotently |

PGA intentionally has no raw-event endpoint, listener/session explorer, arbitrary SQL endpoint or stored IP analytics.

## Storage

Recent detail uses two Workers Analytics Engine datasets:

- `playgarba_events_v1`, indexed by the server-HMAC browser key;
- `playgarba_presence_v1`, indexed by the server-HMAC session key.

Durable aggregate history uses D1. Apply `migrations/0001_pga_rollups.sql` to the PGA D1 database before deploying the rollup or admin Worker.

The rollup replaces one closed IST day's rows instead of incrementing counters, so re-running the seven-day repair window cannot double-count lifetime totals.

## Required external configuration

The repository deliberately does not contain real account IDs, D1 IDs, Access audience values, API tokens or HMAC secrets. Copy the relevant `wrangler-*.example.toml` file outside the example name, replace the explicit placeholders, then configure secrets through Wrangler or the Cloudflare dashboard.

### Ingestion Worker

Required bindings/secrets:

- `EVENTS`: Analytics Engine dataset `playgarba_events_v1`;
- `PRESENCE`: Analytics Engine dataset `playgarba_presence_v1`;
- `BROWSER_RATE_LIMITER`: Workers Rate Limiting binding;
- `PGA_HMAC_SECRET`: server-only HMAC secret;
- `PUBLIC_ORIGIN`: normally `https://playgarba.com`.

The rate-limit key is the random browser identifier supplied by the client. It is used only by Cloudflare's rate-limit counter and is not written to PGA storage. The ingestion Worker stores only its HMAC pseudonym.

### Protected PGA API Worker

Required bindings/secrets:

- `DB`: PGA D1 database;
- `CF_ACCOUNT_ID`;
- `ANALYTICS_API_TOKEN`: server-side token allowed to query Analytics Engine;
- `TEAM_DOMAIN`: Cloudflare Access team domain including `https://`;
- `POLICY_AUD`: Access application audience;
- dataset-name vars from the example config.

Cloudflare Access must protect the PGA application/hostname, and `admin-worker.js` verifies `CF-Access-Jwt-Assertion` again before any API route is served. Private API responses are `Cache-Control: no-store`.

### Rollup Worker

Required bindings/secrets:

- `DB`;
- `CF_ACCOUNT_ID`;
- `ANALYTICS_API_TOKEN`;
- dataset-name vars.

The example cron runs at 00:40 IST and repairs seven closed IST days. The Worker has no public route.

## API routes

All admin routes require a valid Access JWT:

- `GET /api/home`
- `GET /api/live`
- `GET /api/audience?range=24h|7d|30d|90d`
- `GET /api/listening?range=24h|7d|30d|90d`
- `GET /api/health`

Responses preserve `complete`, `partial` or `unavailable` state, freshness and sampled/precision metadata. Query failure is never converted to a numeric zero.

Audience region values are suppressed below three measured sessions. Recent free-text search demand is returned only after the query reaches at least three accepted searches; obvious email-, phone- and URL-like input is discarded at ingestion.

## Validation

The backend stays dependency-light and uses platform APIs directly. Run:

```sh
node --check src/pga/backend/ingest-worker.js
node --check src/pga/backend/admin-worker.js
node --check src/pga/backend/rollup-worker.js
node --test src/pga/backend/tests/backend.test.mjs
```

The dedicated GitHub Actions workflow runs the same backend checks. The repository-wide `npm run check` remains the final integration gate.

## Deployment evidence

Repository code alone does not prove Cloudflare resources exist. Issue #839 is production-complete only after the external D1 database, Analytics Engine bindings, rate limiter, Access application, custom domain and secrets are configured and the protected endpoints are exercised against deployed Workers.
