# Local custom background

PlayGarba listeners can replace the built-in player artwork with one image selected from their own device.

## Product contract

- The control lives inside **Garba Atmosphere** and stays deliberately small: **Add image**, **Change image**, and **Reset**.
- The selected image becomes the background for the active player world and remains in place when the listener changes Garba genres or worlds.
- The image uses centred `cover` presentation. PlayGarba's existing vignette and player controls remain above it for readability and interaction.
- **Reset** immediately restores the normal PlayGarba artwork.
- There is no crop editor, gallery, account sync, public sharing or custom-background catalogue in this feature.

## Privacy and storage

The image stays on the listener's device. The local-background runtime does not call `fetch`, `XMLHttpRequest`, `sendBeacon`, or any upload API.

The browser stores the selected image Blob in IndexedDB when that storage is available. If IndexedDB is unavailable, blocked, private, or out of quota, the image still works for the current page session through a local object URL. Replacing or resetting the image revokes the old object URL.

A stored image is restored only on the same browser profile and device. PlayGarba does not receive or sync that image.

## Accessibility

- The file picker accepts images only.
- The visible actions are keyboard-focusable buttons inside the existing Atmosphere dialog focus trap.
- Success and failure messages reuse the dialog's `aria-live` status region.
- The custom image is decorative and never receives pointer events or replaces an interactive control.

## Validation

Run:

```bash
node --check assets/runtime/local-background.js
node --check provider-runtime.js
node scripts/lib/validate-local-background.mjs
```

The focused validator also rejects common network/upload primitives in the local-background runtime.
