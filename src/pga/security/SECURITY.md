# PGA security and deployment contract

This document defines the security boundary for PlayGarba Admin (PGA). It separates controls that the repository can prove from controls that depend on Cloudflare account configuration or a deployed production host.

PGA is a private founder-facing product. It must be private by architecture, not merely difficult to discover.

## Repository-verified controls

The `scripts/lib/validate-pga-security.mjs` gate verifies these properties against the current source tree:

- Admin API requests fail closed without a valid Cloudflare Access JWT assertion.
- Access assertions are checked for RS256 signature, issuer, audience, expiry and not-before time through the Worker-side verifier.
- Protected Admin API responses use `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and a restrictive Permissions Policy.
- Public telemetry ingestion accepts only the configured PlayGarba origin, JSON payloads within the body limit, known schema fields and a bounded batch shape.
- Foreign origins, malformed JSON, wrong content type, oversized payloads, unknown event fields and rate-limited browsers fail closed.
- The PGA shell declares `noindex,nofollow,noarchive` and contains no inline secret/config payload.
- PGA browser scripts do not use unreviewed HTML injection primitives such as `innerHTML`, `insertAdjacentHTML` or `document.write`.
- PGA browser assets do not contain server secret identifiers or source-map references.
- Public PlayGarba surfaces, root sitemap and robots policy do not advertise or link to PGA.

These checks are regression evidence for repository behaviour. They do not prove that a production Cloudflare account is configured correctly.

## Cloudflare Access boundary

PGA production access must be protected by Cloudflare Access before the request reaches the private admin surface. The Admin Worker still verifies the `Cf-Access-Jwt-Assertion` itself so application security does not depend on hostname obscurity or an unchecked upstream header.

Required production configuration:

1. Protect `pga.playgarba.com` with an Access application that denies by default.
2. Allow only the explicitly authorised founder identity or identities.
3. Set `TEAM_DOMAIN` to the exact Access team domain and `POLICY_AUD` to the exact Access application audience in Worker secrets/config, never in browser assets.
4. Keep the admin query Worker route behind Access. Do not expose an unprotected alternate hostname or route to the same API.
5. Treat failed, missing, expired, wrong-audience, wrong-issuer and forged assertions as unauthenticated.

Production Access application existence, identity allow-lists, hostname routing and policy enforcement are **external / blocked until live verification**. Repository tests must never label them verified.

## Secrets

Server-side values such as `PGA_HMAC_SECRET`, Cloudflare Access configuration and future service credentials belong in Worker secrets or equivalent protected environment configuration.

Rules:

- Never embed secrets in `src/pga/app`, public PlayGarba JavaScript, HTML, manifests, sitemap, robots files or generated public assets.
- Never commit real secret values to example Wrangler configuration.
- Rotate `PGA_HMAC_SECRET` if disclosure is suspected. Rotation changes future pseudonyms and should be treated as an analytics continuity event, not silently hidden.
- Rotate/revoke Access credentials or policies immediately if an authorised identity or device should lose access.

## Private response and browser security

Protected aggregate responses are private and must remain non-cacheable by shared/browser caches. Current Admin Worker responses use `Cache-Control: no-store` and defensive content/referrer/permissions headers.

Production hosting should also apply an appropriate Content Security Policy to the PGA shell. The intended baseline is restrictive: self-hosted app scripts/styles/assets, no arbitrary frame ancestors, and no third-party script execution unless a later reviewed feature explicitly requires it. The exact production CSP and HSTS state are **external / blocked until response-header verification**.

PGA v1 is read-mostly. If state-changing admin endpoints are introduced later, they require a separate CSRF/origin review in addition to Access authentication.

## Public telemetry ingestion

The public event endpoint is intentionally unauthenticated because listeners do not have PGA accounts. Its security comes from a narrow ingestion contract:

- fixed first-party origin policy;
- POST/OPTIONS only;
- JSON content type;
- bounded request and batch size;
- strict versioned event keys/enums;
- server-side HMAC pseudonymisation;
- per-browser rate limiting;
- no arbitrary SQL, query expression or admin operation in event payloads;
- fail-closed handling for malformed or unknown fields.

Rate limiting is an abuse-control layer, not proof that a browser identifier is a human identity. Operational limits must be tuned from real traffic without weakening the privacy contract.

## XSS and content rendering

PGA should render event/catalogue-derived labels through text-safe DOM APIs. Unreviewed raw HTML insertion is prohibited in PGA browser scripts. If a future feature has a genuine need for HTML rendering, it must use a narrowly reviewed sanitisation contract and update the security validator deliberately rather than bypassing it.

## Indexing and discovery

PGA must not be promoted from public PlayGarba navigation, sitemaps, robots content or public runtime code. The private shell declares `noindex,nofollow,noarchive` as defence in depth. Search directives do not replace Access authentication.

## Emergency lockout and revocation

If PGA exposure or credential compromise is suspected:

1. Deny/disable the Cloudflare Access application policy or remove the authorised identity.
2. Disable the PGA Worker/custom-host route if policy integrity is uncertain.
3. Rotate relevant Worker secrets and Access credentials/configuration.
4. Confirm unauthenticated browser and direct API requests fail closed.
5. Review recent deployment/configuration changes and restore only after negative tests and live access checks pass.

An emergency lockout should favour temporary admin unavailability over public exposure of private analytics.

## Deployment verification checklist

The following items require production evidence and remain **external / blocked** until checked against the deployed host:

- `pga.playgarba.com` resolves only to the intended protected deployment.
- An unauthenticated browser request receives Access denial/challenge before private content is returned.
- Direct Admin API requests without a valid Access assertion fail closed.
- Access policy contains only intended authorised identities and deny-by-default behaviour.
- Production Admin API responses retain `no-store` and private security headers.
- PGA shell responses have the approved CSP/HSTS and are not cached publicly.
- No alternate Worker hostname bypasses Access.
- Emergency revocation has been exercised or otherwise verified without exposing private data.

Record exact host, date, tested revision and observed response status/headers when these checks are performed.

## Dependency / supply-chain statement

The current PGA runtime is dependency-light. The browser shell uses web-platform APIs, and the Worker/backend modules import repository-local modules rather than adding a client-side framework or third-party runtime package. Security regression tests use Node's built-in test/assert/crypto/web APIs and do not require a new package dependency.

Deployment tooling such as Wrangler and GitHub Actions remains part of the build/deployment supply chain and must be kept pinned/reviewed through normal repository dependency and workflow review. This statement describes the current repository shape and must be revisited if PGA adds runtime packages, third-party scripts, authentication SDKs or new external data processors.

## Security gate

Run:

```sh
node scripts/lib/validate-pga-security.mjs
```

The dedicated `PGA security validate` workflow runs the same contract in CI. A failure should be repaired in the owning production lane. The validator must not be weakened merely to make an unsafe source change green.
