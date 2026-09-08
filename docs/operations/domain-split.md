# PlayGarba domain split

Status: prepared, not activated.

## Target architecture

| Host | Responsibility | Deployment |
| --- | --- | --- |
| `playgarba.com` | Public brand and discovery homepage | Porkbun Static Hosting, GitHub branch `website` |
| `www.playgarba.com` | Redirect to canonical apex | Porkbun 301 URL forwarding |
| `live.playgarba.com` | Player, PWA and generated catalogue pages | Existing GitHub Pages deployment from `main` |
| `ruddvz.github.io/garba/` | Legacy/default Pages URL | GitHub Pages redirect to the configured custom domain where supported |

The `website` branch is intentionally a small, production-only static site. It does not contain the music catalogue, player runtime or source archives. This keeps marketing changes isolated from catalogue and playback work on `main`.

## Why the Pages workflow rewrites only the artifact

The current repository validation suite intentionally asserts `playgarba.com` throughout source files and generated SEO fixtures. Other agents are actively changing catalogue and playback data on `main`.

During this migration, `.github/workflows/pages.yml` keeps those source validations intact and rewrites crawlable URLs only after validation and static-page generation. The uploaded Pages artifact therefore uses `https://live.playgarba.com` for:

- the player canonical URL;
- Open Graph URLs;
- structured-data URLs;
- generated song and release canonicals;
- generated player links;
- `robots.txt`; and
- the generated sitemap.

This is deliberately a migration boundary. Once the split has been stable in production, source-level URL ownership can be refactored separately without mixing that work into the domain cutover.

## Activation order

Do not move the apex domain first. Bring the player up on the new hostname before replacing the current apex site.

1. In Porkbun DNS, add a CNAME for `live` pointing to `ruddvz.github.io`.
2. In GitHub, open `ruddvz/garba` → **Settings → Pages**. Change **Custom domain** from `playgarba.com` to `live.playgarba.com` and save. The repository uses a custom GitHub Actions Pages workflow, so the source `CNAME` file is not the control plane for this setting.
3. Wait for GitHub's DNS check and HTTPS certificate for `live.playgarba.com` to become healthy.
4. Merge the domain-split workflow change into the latest `main` and allow the Pages workflow to deploy. Confirm the player, direct refreshes and query-string deep links work on `https://live.playgarba.com/`.
5. In Porkbun, enable **Static Hosting** for `playgarba.com`. In **GitHub Connect**, select repository `ruddvz/garba` and branch `website`.
6. Confirm `https://playgarba.com/` serves the public homepage from the `website` branch over HTTPS.
7. Configure `www.playgarba.com` as a **301 Permanent Redirect** to `https://playgarba.com`. Do not enable a wildcard redirect. Preserve the requested URI path only if future public-site routes should map one-to-one to the apex.
8. Remove only DNS records that conflict with the final Porkbun/GitHub targets. Do not delete email, verification or unrelated TXT/MX records.
9. Re-test `playgarba.com`, `www.playgarba.com`, `live.playgarba.com`, a song deep link, browser refresh, PWA install/start, offline shell and the old GitHub Pages URL.

## DNS end state

The expected provider-facing records are:

| Type | Host | Target / behaviour |
| --- | --- | --- |
| Porkbun Static Hosting managed | apex / `@` | `playgarba.com` public homepage |
| CNAME | `live` | `ruddvz.github.io` |
| Porkbun URL forward | `www` | 301 → `https://playgarba.com` |

Porkbun Static Hosting manages the apex hosting records when the hosting plan is attached. Record the actual apex values shown by Porkbun after activation rather than hard-coding provider IPs into this document.

## Rollback

If the apex homepage has a problem after cutover:

1. Keep `live.playgarba.com` untouched so listening remains available.
2. Revert the apex hosting/DNS change in Porkbun to the previous GitHub Pages configuration.
3. If required, temporarily restore the GitHub Pages custom domain to `playgarba.com`.
4. Revert the domain-split workflow commit only if the player itself must return to the apex hostname.

The `website` branch can remain in place during rollback because it is not used by GitHub Pages.
