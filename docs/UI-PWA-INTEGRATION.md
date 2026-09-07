# UI/PWA integration boundary

This branch owns the responsive player shell, PWA behaviour and courtyard visual assets. It intentionally does not overwrite the catalogue lane's `data/catalogue/**` or `data/taxonomy.json` paths.

## Catalogue handoff

The player first requests `data/songs.json`. When that aggregate is not present yet, it falls back to `data/ui-demo-songs.json` so the UI remains runnable during catalogue integration.

Once the catalogue lane publishes the aggregate at `data/songs.json`, no player-code change is required.

The demo file is UI test data only. It must not be treated as verified catalogue truth.
