# Contributing to GARBA

GARBA is trying to become the most useful open, community-built home for Garba music we can responsibly make. Contributions do not need to be code.

If you know an old release, a regional artist, a cassette track list, a live performance, a better Gujarati spelling, an official source, a missing nonstop set, a metadata correction, or a product bug, that is useful work.

## The most important rule

**Do not guess catalogue facts and do not upload music you do not have the right to redistribute.**

GARBA is source-first. A missing field can remain unknown. A plausible-looking invented date, duration, artist credit, track list, source, rating, or rights claim is worse than an explicit gap.

The repository can link to legitimate provider pages and embeds while keeping copyrighted audio with the service or rights holder that is authorised to host it.

Read [`docs/catalogue/RIGHTS.md`](docs/catalogue/RIGHTS.md) before adding audio or download sources.

## Ways to contribute

### Add missing music

Open a **Missing song / release** issue and include as much of the following as you can verify:

- song or release title;
- artist(s);
- approximate or exact year, if known;
- album/release name, if applicable;
- Garba style/category;
- official artist, label, distributor, streaming, archive, or other reliable source URL;
- whether the item is a single track, album, live set, nonstop set, or timestamped chapter;
- Gujarati title/spelling if you know it;
- notes about uncertain fields.

A source is more important than filling every field.

### Correct catalogue metadata

When correcting a title, spelling, artist credit, year, duration, category, or source:

1. identify the exact record;
2. include the evidence for the correction;
3. explain whether the previous value is demonstrably wrong or simply ambiguous;
4. preserve alternate spellings/aliases when they are useful for discovery.

### Add a live or nonstop set

Long-form Garba is first-class catalogue material here. For timestamped sets, include the source URL and timestamps. Do not pretend a chapter is a separately released commercial track unless the source establishes that.

### Improve the player

Product contributions are welcome across:

- accessibility;
- mobile and tablet layouts;
- keyboard navigation;
- PWA/offline behaviour;
- playback-provider integration;
- search and discovery;
- performance;
- visual polish;
- catalogue tooling and validation.

Keep the courtyard/artwork visually dominant. Avoid turning the player into a stack of opaque cards.

### Report a bug

Use the bug-report issue template. Include:

- device and browser;
- whether the app was opened in a browser or installed as a PWA;
- the exact song/genre URL when relevant;
- what you expected;
- what happened;
- screenshots or screen recordings when they materially help.

## Local setup

```bash
npm run check
npm run serve
```

Then open `http://localhost:4173`.

`npm run check` rebuilds/validates the catalogue and checks the player, discovery data, playback mappings and PWA shell.

## Catalogue layout

The source of truth is chunked so large catalogue work stays reviewable:

- `data/catalogue/songs/` — song records;
- `data/catalogue/releases/` — release records;
- `data/catalogue/free-sources/` — rights-audited free/access resources;
- `data/discovery/` — artist, recommendation, live and nonstop discovery records;
- `data/playback-sources*.json` — verified playback-provider mappings;
- `data/taxonomy.json` — detailed music taxonomy;
- `data/genres.json` — six visual player worlds.

Generated aggregate files should be rebuilt through the project scripts rather than edited as competing sources of truth.

## Pull-request expectations

A good PR is narrow enough to review and explicit about provenance.

Before opening one:

1. run `npm run check`;
2. keep unrelated refactors out of a catalogue correction;
3. avoid overwriting another active contribution lane;
4. explain the sources used for metadata changes;
5. call out anything that remains uncertain;
6. do not claim device/browser validation you did not actually perform.

## Rights and licensing

The repository is public and intended to become a fully licensed open-source/community-data project. A formal repository-wide software/data licence still needs to be chosen. Until that is added, do not assume that public visibility alone grants unrestricted reuse rights.

Underlying songs, recordings, artwork, embeds and third-party material retain their own copyrights and licence terms regardless of the eventual repository licence.

## Community standard

Be precise, respectful and useful. Garba spans regions, languages, generations, devotional traditions, commercial music, local communities and diaspora scenes. Different spellings, classifications and memories can all be sincere. When sources disagree, record the disagreement instead of turning it into a fight.
