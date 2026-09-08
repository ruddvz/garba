# PlayGarba production domain

Status: consolidated on Vercel.

## Architecture

PlayGarba is one product on one canonical origin:

| URL | Responsibility |
| --- | --- |
| `https://playgarba.com/` | Full player and PWA homepage |
| `https://playgarba.com/explore/` | Catalogue and discovery experience |
| `https://playgarba.com/about/`, `/install/`, `/help/`, `/faq/` | Small supporting pages |
| `https://www.playgarba.com/*` | Permanent redirect to the equivalent apex URL |
| `https://live.playgarba.com/*` | Legacy compatibility redirect to the apex |

The production Vercel project is `playgarba-public`. The root player remains the source entry point; Explore is served from the existing catalogue implementation through the `/explore/` rewrite.

## Compatibility rules

- `www.playgarba.com/<path>` permanently redirects to `playgarba.com/<path>`.
- `live.playgarba.com/<path>` permanently redirects to `playgarba.com/<path>`.
- `live.playgarba.com/catalogue/<path>` and `playgarba.com/catalogue/<path>` permanently redirect to `playgarba.com/explore/<path>`.
- Query strings are preserved by Vercel redirects so player state such as `?genre=`, `?song=` and `?nonstop=` survives old links.
- Standalone song and release trees are not published; catalogue detail remains in-page Explore state.

## PWA contract

The manifest, service worker, canonical tags, sitemap, robots file and social metadata all use `playgarba.com`. The cache generation is incremented when the origin or Explore route changes. The service worker treats both `/explore/` and the retained internal `/catalogue/` asset paths as catalogue navigation, while `/catalogue/` is never a canonical public URL.

## Deployment

The Vercel project builds the current remote `main` with `npm run catalogue`, then serves the repository root. The checked-in workflow retains the validated static-artifact preparation and deploys `_site` to the same Vercel project using `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` secrets.

GitHub Pages is not a production dependency. `CNAME` is intentionally absent, and the hosting validator fails if Pages ownership assumptions return.

## Verification checklist

After a production deployment, verify:

1. `/` immediately renders the player and uses the 2K WebP background pack.
2. `/explore/` works on direct load and refresh.
3. `www` and `live` redirects are permanent and preserve query state.
4. `/manifest.webmanifest` and `/sw.js` load from the apex origin.
5. PWA install, offline shell, player deep links and Explore navigation work.
6. YouTube playback, Nonstop, queue, favourites and mobile controls remain intact.

DNS changes should be limited to the domain records required by Vercel. Do not remove unrelated mail, verification or registrar records.
