# PlayGarba icon & brand assets

This directory contains the canonical icon and brand mark assets for the PlayGarba web application, PWA, and public surfaces.

## Source master

- `app-icon-master-2k.jpeg`: The canonical 2048×2048 high-resolution master artwork for the PlayGarba mark.

## Runtime & PWA icons

- `icon.svg`: Universal 512×512 SVG icon for modern browser tabs and vector presentation.
- `maskable.svg`: Adaptive 512×512 SVG icon with Android adaptive icon safe-zone margins.
- `icon-192.png`: 192×192 PNG launcher icon referenced by `manifest.webmanifest`.
- `apple-touch-icon.png`: 180×180 PNG icon for iOS home-screen bookmarks.
- `browserconfig.xml`: Windows Start tile configuration metadata.

## Deployment pipeline

During GitHub Pages deployment (`.github/workflows/pages.yml`), the deployment pipeline uses `rsvg-convert` and `icotool` to deterministically generate the complete cross-platform icon matrix:

- Favicons: `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon.ico`
- Apple Touch icons: `apple-touch-icon.png` (180px), `apple-touch-icon-152.png`, `apple-touch-icon-167.png`
- PWA icons: `icon-192.png`, `icon-512.png`, `maskable-192.png`, `maskable-512.png`
- Windows tiles: `mstile-150x150.png`, `mstile-310x310.png`

Brand metadata is automatically injected into all deployed HTML surfaces by `scripts/lib/inject-brand-metadata.mjs`.
