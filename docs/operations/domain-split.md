# PlayGarba domain split

Status: prepared, infrastructure-gated.

## Target architecture

| Host | Responsibility | Deployment |
| --- | --- | --- |
| `playgarba.com` | Public brand and discovery homepage | Porkbun Static Hosting, GitHub branch `website` |
| `www.playgarba.com` | Redirect to canonical apex | Porkbun permanent 301 forwarding |
| `live.playgarba.com` | Player, PWA and catalogue | GitHub Pages deployment from `main` |
| `ruddvz.github.io/garba/` | Legacy/default Pages URL | GitHub Pages behavior after custom-domain configuration |

The `website` branch is intentionally a small production-only public site. It does not contain the player runtime or catalogue data. Player, PWA and catalogue work remains on `main`.

## Current product URL contract

The listening application has two crawlable surfaces:

- `/` for the primary player;
- `/catalogue/` for catalogue discovery.

Song, album and collection browsing is handled as application/catalogue state. The current deployment deliberately does not publish standalone `/songs/...` or `/releases/...` trees.

The public `website` branch retains migration compatibility for legacy apex query links and older catalogue paths by handing them to `live.playgarba.com`.

## Why Pages rewrites only the deploy artifact

Repository validators and source metadata still use `https://playgarba.com` while the existing apex player remains production. Other agents continue to change catalogue and playback work on `main`.

During cutover, `.github/workflows/pages.yml` keeps those source validations intact and rewrites crawlable URLs only after the normal app validation, artwork extraction, catalogue packaging, icon generation and social metadata injection pass. The uploaded Pages artifact therefore uses `https://live.playgarba.com` for:

- player canonical metadata;
- catalogue canonical metadata;
- Open Graph and Twitter URLs;
- structured metadata present in HTML;
- `robots.txt`;
- sitemap URLs; and
- the deployed `CNAME` artifact.

This is a migration boundary, not a permanent requirement that source files keep the old hostname. Source-level URL ownership can be simplified after the split is stable.

## Required infrastructure gate

Do not merge the deploy remap until both conditions are true:

1. DNS contains `live.playgarba.com` as a CNAME to `ruddvz.github.io`.
2. GitHub repository Settings → Pages has `live.playgarba.com` configured as the custom domain, with GitHub DNS validation and HTTPS healthy.

This prevents a deploy from advertising `live.playgarba.com` canonicals before that hostname actually serves the player.

## Activation order

1. Fetch the latest remote `main`. Never reset or discard newer catalogue, playback, PWA, mobile, social or visual work.
2. In Porkbun DNS, add `live` as CNAME to `ruddvz.github.io`. Preserve unrelated MX, TXT, verification and mail records.
3. In GitHub `ruddvz/garba` → Settings → Pages, set the custom domain to `live.playgarba.com`.
4. Wait until GitHub's DNS check and HTTPS certificate for `live.playgarba.com` are healthy.
5. Rebase/rebuild the migration from the then-current `main` if `main` has advanced.
6. Require the normal GARBA validation workflow to pass.
7. Merge the domain-split PR and allow GitHub Pages to deploy.
8. Verify `https://live.playgarba.com/` and `https://live.playgarba.com/catalogue/`, query-string player states, refresh behavior, mobile controls, PWA install/start and offline shell.
9. Only after the player is healthy on `live`, enable Porkbun Static Hosting for the apex `playgarba.com`.
10. In Porkbun GitHub Connect, select repository `ruddvz/garba` and branch `website`.
11. Verify the public homepage over HTTPS and confirm all listening CTAs target `live.playgarba.com`.
12. Configure `www.playgarba.com` as a permanent 301 redirect to `https://playgarba.com`.
13. Verify legacy apex query links and legacy catalogue paths hand off safely to the live host.
14. Verify canonical tags, OG/Twitter metadata, robots and sitemaps on both hosts.
15. Verify the legacy `ruddvz.github.io/garba/` URL behavior and avoid an unintended duplicate indexed surface.

## PWA verification

The current manifest and service worker use origin-relative paths, which is compatible with the hostname move. After deployment, verify:

- manifest loads from the live host;
- `start_url` and scope remain inside the live origin;
- regular and maskable icons load;
- Apple and browser icons load;
- service worker registers on the live origin;
- installed launch opens the live player;
- offline shell works after a successful online visit;
- hard refresh and direct query links preserve state correctly.

## DNS end state

Expected provider-facing state:

| Type | Host | Target / behavior |
| --- | --- | --- |
| Porkbun Static Hosting managed | apex / `@` | `playgarba.com` public website |
| CNAME | `live` | `ruddvz.github.io` |
| Permanent URL forward | `www` | 301 → `https://playgarba.com` |

Do not hard-code Porkbun apex IP values into repository documentation. Record the provider-managed values after activation if an operational record is required.

## Rollback

If the public apex has a problem after cutover:

1. Keep `live.playgarba.com` serving the player so listening remains available.
2. Revert only the apex hosting/forwarding changes in Porkbun.
3. If necessary, temporarily restore the GitHub Pages custom domain to `playgarba.com`.
4. Revert the deploy-remap commit only if the player itself must return to the apex hostname.
5. Leave the `website` branch intact; it is isolated from the player and can be repaired independently.

## Closeout record

After successful production activation, append:

- final `main` SHA used for cutover;
- merged migration PR and merge SHA;
- `website` branch SHA;
- confirmed DNS records;
- GitHub Pages custom-domain and HTTPS state;
- deployed Pages workflow run;
- tested production URLs;
- validation results;
- any remaining follow-up work.
