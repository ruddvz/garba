# Public site polish v2

This branch refines the dedicated PlayGarba public website without changing the player/catalogue runtime on `main`.

## Added or improved

- FAQ is part of the public information architecture and sitemap.
- Public navigation keeps FAQ and current-page state consistent across pages.
- Mobile guide pages receive a safe-area-aware quick action dock with a direct route back to the live player.
- Keyboard focus states and minimum touch targets are strengthened.
- The install guide detects iOS, Android, desktop Chrome and Edge more precisely.
- Chrome on iOS receives a Safari recommendation for the clearest Apple web-app installation route.
- FAQ can route bug reports and missing-song reports to the repository's existing issue forms.
- The 404 page now recovers both legacy listening routes and ordinary public-site navigation failures more clearly.
- CI validates the FAQ, polish stylesheet and expanded sitemap.

## Production boundary

The public website still assumes `live.playgarba.com` is the canonical listening/PWA origin. The apex cutover must remain gated on the separate domain-split production verification.
