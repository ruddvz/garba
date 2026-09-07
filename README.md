# GARBA

> A community-built home for Garba music, discovery, live sets, archives and listening.

[Open the live GARBA player](https://ruddvz.github.io/garba/) · [Catalogue status](docs/catalogue/STATUS.md) · [Rights policy](docs/catalogue/RIGHTS.md)

GARBA exists because Garba music is everywhere, but it is scattered.

Across decades of albums, cassettes, CDs, streaming releases, live Navratri performances, nonstop sets, community uploads, artist pages, labels, blogs, playlists and local archives, there is an enormous amount of music with no single place that seriously tries to bring it together.

This project is an attempt to change that.

The goal is ambitious: **keep finding, verifying and organising as much Garba music as possible in one public, searchable and reusable system.** Traditional Garba, Dandiya Raas, devotional music, Gujarati folk, Sanedo, modern Garba, fusion, old recordings, new releases, live performances and long-form nonstop sets all belong here.

I started this because I wanted one place where someone could go far beyond the same small set of songs that appears every Navratri. The long-term aim is to build the most complete Garba catalogue we can, together.

If something is missing, that is not something to hide. It is something to find.

---

## Open, public and built for everyone

GARBA is being built in public so anyone can inspect the work, improve it, contribute missing music, correct metadata, study the catalogue, improve the player or build new tools around the structured data.

This repository is intended to be an **open-source, community-driven project available to everyone**.

You can use it to:

- discover Garba songs across generations and styles;
- find artists, releases, singles, live sets and nonstop Garba;
- trace catalogue information back to its sources;
- explore community and editorial recommendations;
- contribute missing songs or corrections;
- preserve hard-to-find regional or historical metadata;
- improve genre and style classification;
- improve the website, PWA, accessibility and player experience;
- build new discovery, research or cultural-archive tools using the structured catalogue data, subject to the repository licence and the rights of the underlying music.

The project should become more useful as more people contribute to it.

> **Important:** the repository is public and intended for open-source use, but a formal software/data licence still needs to be added before reuse permissions are legally unambiguous. The underlying songs, recordings, artwork and third-party material retain their own copyrights and licences.

---

## The mission

Garba is much bigger than a playlist.

It includes traditional forms, regional styles, devotional music, Raas, 2-taali, 3-taali, Hinch, Dakla, Sanedo, folk songs, old orchestral and cassette-era recordings, modern Gujarati releases, Bollywood crossovers, electronic experiments, competition mixes, live community performances and decades of nonstop Garba albums.

GARBA is trying to document that breadth without pretending the work is finished.

The principle is simple:

> **Find it. Verify it. Preserve the metadata. Credit the source. Make it easier for everyone else to discover.**

The current catalogue already contains hundreds of verified song records, dozens of releases, live/nonstop sets, timestamped chapters, artist-discovery records and community/editorial recommendation signals.

For exact, continuously changing numbers, see [`docs/catalogue/STATUS.md`](docs/catalogue/STATUS.md).

---

## “All the Garba songs in the world”

That is the ambition.

The goal is to keep expanding until every Garba song, release, live performance and meaningful recording we can responsibly find has a place in the system.

But this repository will not fake completeness.

Some recordings are private. Some were released only on cassette. Some local performances were never digitised. Some uploads disappear. Some metadata is incomplete or contradictory. Some artists and regional traditions are poorly indexed by search engines and commercial streaming services.

So GARBA does **not** claim that every Garba recording in existence has already been found.

Instead, it keeps the gaps visible and keeps searching.

When a release has been fully imported from a verified source, the catalogue records that explicitly. When a date, duration, credit or track list is unknown, it stays unknown rather than being guessed.

If you know a song, artist, release or live set that is missing, please contribute it.

---

## What is inside

### A structured Garba catalogue

This is not one giant playlist or one giant JSON file.

The catalogue uses a detailed taxonomy so the music can be represented more accurately while still mapping cleanly into the six visual worlds used by the player.

| Player world | Music represented |
| --- | --- |
| **Traditional** | Traditional Garba, roots/archive material, Tran Taali, Be Taali and related forms |
| **Dandiya** | Raas, Dandiya and related dance traditions |
| **Devotional** | Mataji, Krishna Garba, devotional Raas and temple-oriented material |
| **Folk** | Gujarati folk, lokgeet, Hinch, Dakla and related traditions |
| **Sanedo** | Sanedo and high-energy community/festival material |
| **Fusion** | Modern Gujarati Garba, electronic, hip-hop, remix, cinematic and crossover material |

The detailed taxonomy currently spans 19 music categories. The visual worlds are presentation layers, not replacements for the actual musical classification.

### Nonstop and live Garba

A huge part of Garba culture exists as long-form performances rather than tidy individual singles.

GARBA therefore treats nonstop albums and live sets as first-class catalogue objects.

Timestamped chapters can point into a verified long-form performance without pretending every chapter was separately released as a commercial track. This makes it possible to index full live sets, festival recordings and nonstop performances properly.

Current discovery and catalogue work includes material associated with artists such as Aditya Gadhvi, Falguni Pathak, Atul Purohit, Praful Dave, Hemant Chauhan, Geeta Rabari, Parth Oza, Dhara Shah, Kinjal Dave and many more.

### Community discovery

Not every useful recommendation begins in a formal discography.

The discovery layer can retain leads from public playlists, Reddit discussions, blogs, event listings, social posts, artist announcements and live-performance uploads while keeping those leads separate from canonical release metadata until they are verified.

That distinction matters. The project should be comprehensive without becoming careless.

---

## Respecting artists and music rights

GARBA is an archive, discovery and listening project. **It is not a piracy repository.**

Commercial audio is not copied into GitHub simply because it can be streamed or downloaded somewhere else. Free access does not automatically mean permission to redistribute.

Playback follows the legitimate source:

1. properly licensed or authorised audio can use direct playback;
2. verified YouTube material can use a visible YouTube player;
3. timestamped nonstop sets can open at the relevant chapter;
4. verified Spotify material can use Spotify's embedded player;
5. other verified providers remain linked to their original source;
6. third-party raw audio is not silently mirrored into the repository.

The rights and acquisition rules are documented in [`docs/catalogue/RIGHTS.md`](docs/catalogue/RIGHTS.md).

If you are an artist, label, rights holder or archivist and something is attributed incorrectly, open an issue with the correct information and source.

---

## The player

GARBA is not meant to feel like a spreadsheet with a Play button attached.

The web player is an immersive, responsive and installable experience built around a transforming Gujarati courtyard. The visual architecture remains coherent while the atmosphere changes with the music world.

Current player work includes:

- desktop, compact desktop, tablet, iPad, phone and short-landscape layouts;
- Traditional, Dandiya, Devotional, Folk, Sanedo and Fusion visual worlds;
- immersive courtyard backgrounds and world transitions;
- responsive song browsing;
- a draggable mobile song/player sheet;
- search and favourites;
- automatic Up Next;
- persistent listening state;
- deep links with `?genre=` and `?song=`;
- Media Session support where available;
- keyboard controls;
- PWA installation;
- service-worker caching and an offline shell;
- reduced-motion and focus-visible accessibility support.

### [Launch the live GARBA player →](https://ruddvz.github.io/garba/)

---

## Repository map

```text
garba/
├── assets/                 # player artwork and visual assets
├── data/
│   ├── catalogue/          # canonical songs, releases and rights-audited sources
│   ├── discovery/          # artists, recommendations, live/nonstop sets
│   ├── genres.json         # six visual player worlds
│   └── taxonomy.json       # detailed Garba music taxonomy
├── docs/
│   ├── catalogue/          # schema, rights policy and catalogue status
│   ├── DESIGN-SYSTEM.md
│   ├── RESPONSIVE-PWA.md
│   └── ROADMAP.md
├── scripts/                # catalogue build and validation tooling
└── index.html              # web player entry point
```

The catalogue is deliberately chunked so multiple contributors can work on it without turning a single enormous JSON file into a permanent merge-conflict machine.

---

## Contributing

A useful contribution does not have to be code.

Contributions are welcome for:

- missing artists;
- missing songs and releases;
- regional Garba that is poorly represented online;
- old cassette, CD or vinyl track lists;
- verified release dates and durations;
- official artist or label sources;
- live and nonstop Garba sets;
- timestamp chapters;
- Gujarati spelling and transliteration corrections;
- duplicate detection;
- better genre/category classification;
- rights and licensing corrections;
- community recommendations worth investigating;
- player bugs;
- accessibility improvements;
- mobile and PWA improvements;
- visual design and performance work.

When adding catalogue information, include the strongest source you can find. Official artist, label and distributor sources are preferred for canonical metadata. Community uploads and discussions can still be valuable discovery evidence when they are clearly labelled as such.

Please do not invent missing dates, durations, credits or release information.

**A blank field is more useful than confident-looking fiction.**

---

## Help find the long tail

The most valuable future additions may not be the famous tracks that already appear everywhere.

They may be:

- an old family cassette;
- a local singer's release;
- a regional Garba style with little online documentation;
- a forgotten CD track list;
- a live performance with no proper metadata;
- a devotional recording known locally but absent from mainstream streaming;
- a community recommendation that leads to an artist nobody had indexed yet.

That long tail is part of the culture too.

If you know something that belongs here, open an issue or submit a pull request.

---

## Run locally

```bash
npm run check
npm run serve
```

Then open:

```text
http://localhost:4173
```

PWA installation requires HTTPS or a browser-recognised local development origin.

---

## Documentation

- [`docs/catalogue/STATUS.md`](docs/catalogue/STATUS.md) — current catalogue counts and coverage
- [`docs/catalogue/SCHEMA.md`](docs/catalogue/SCHEMA.md) — canonical catalogue schema
- [`docs/catalogue/RIGHTS.md`](docs/catalogue/RIGHTS.md) — source, licensing and redistribution rules
- [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) — visual and motion direction
- [`docs/RESPONSIVE-PWA.md`](docs/RESPONSIVE-PWA.md) — responsive, mobile-sheet and install behaviour
- [`docs/SONG-CATALOG-CONTRACT.md`](docs/SONG-CATALOG-CONTRACT.md) — UI/catalogue integration contract
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — remaining work

---

## Why this exists

Because somebody searching for Garba should be able to go much deeper than the same ten songs every Navratri.

Because a decades-old traditional recording and a new live performance can both deserve to be discoverable.

Because Gujarati music deserves careful metadata, provenance and preservation.

Because scattered knowledge becomes more useful when it is organised in public.

And because if thousands of disconnected sources can eventually be brought into one careful, searchable catalogue, it is worth trying.

**GARBA is that attempt.**

If you find something missing, help add it.
