# PlayGarba search-discovery programme

Status: active implementation  
Programme issue: #368  
Technical crawl/index lane: #369  
Simplified architecture direction recorded 2026-09-08.

## Objective

Make PlayGarba easy to discover in search without turning the product into a large SEO website.

The product should stay centred on listening:

- `/` is the canonical player/home experience;
- `/explore/` is the canonical catalogue and discovery experience;
- a compact set of useful general, cultural and help pages support the product;
- `/navratri-2026/` is the focused 2026 seasonal page once deployed;
- catalogue richness belongs inside Explore rather than in hundreds of public URLs.

Success is not page count. A small set of strong, maintained pages is preferred over clusters of thin pages.

## Canonical production architecture

`https://playgarba.com/` is the canonical public origin and GitHub Pages production host.

Current production principles:

- `CNAME` is `playgarba.com`;
- root `robots.txt` advertises `https://playgarba.com/sitemap.xml`;
- the player canonical is `https://playgarba.com/`;
- `/explore/` is the canonical catalogue/discovery route;
- public HTML page URLs use lowercase paths with trailing slashes;
- query strings and hash states remain application state rather than separate search pages.

Do not introduce another canonical host or another parallel catalogue website without an explicit product decision.

## The simple public surface

### Player

```text
/
```

This is the primary product. Search visitors should be able to listen immediately.

### Explore

```text
/explore/
```

Explore is the single music-discovery surface.

It should absorb the value that would otherwise be fragmented across many SEO pages:

- strong catalogue search;
- Traditional, Dandiya, Devotional, Folk, Sanedo and Fusion browsing;
- one clear Nonstop area;
- artist browsing and artist detail inside Explore;
- release context and tracklists inside Explore;
- factual song descriptions and available story/context fields;
- one-tap playback;
- stable search/filter/detail/back/scroll state;
- good mobile and PWA behaviour;
- useful empty, loading and error states.

Artist, release, song and Nonstop detail may be rich in-product views. They do not need standalone public pages.

### General pages

Keep only pages with genuine standalone value. Current useful production routes include:

```text
/what-is-garba/
/how-to-use/
/install/
/faq/
/about/
```

The repository also contains additional cultural/editorial source pages. Audit them individually before deployment. Consolidate overlap rather than publishing a large keyword cluster.

A new general page should exist only when someone would reasonably choose to read or share that page on its own, not simply because a keyword exists.

### Seasonal page

```text
/navratri-2026/
```

Use the existing authored source. Keep it focused on current Navratri 2026 dates, sourced festival context and direct listening/discovery actions.

Do not create a tree of supporting entity pages around it.

## Explicitly cancelled route strategy

Issue #371 is closed as not planned.

Do not generate SEO pages for:

```text
/songs/{id}/
/artists/{id}/
/releases/{id}/
/nonstop/{id}/
```

Do not create one public page for every:

- song;
- artist;
- release/album;
- Nonstop set;
- genre;
- taxonomy value;
- alias;
- transliteration;
- search/filter combination.

Do not create `/garba-songs/` plus six separate style landing pages solely for SEO. The existing Explore catalogue already provides that browsing model.

If a future page is proposed, it must have a clear user purpose independent of keyword capture and must be approved as a product page, not generated automatically from catalogue data.

## Application-state URL policy

The player may use functional query state such as:

```text
/?song={song-id}
/?genre={genre-id}
/?nonstop={set-id}
```

Explore may use hash/search/filter state such as:

```text
/explore/#collection={id}
/explore/#collection={id}&release={release-id}
/explore/#search={query}
```

These states are allowed for product behaviour but are not separate canonical landing pages.

Rules:

- do not add them to the sitemap;
- do not expose infinite crawl graphs;
- canonicalize the player to `/` and Explore to `/explore/` as appropriate;
- tracking parameters do not create new canonical URLs;
- aliases and transliterations improve in-product search but do not generate URLs.

## Compatibility routes

Compatibility or handoff routes such as `/catalogue/` or `/live/` must not compete with canonical pages.

Prefer a true permanent redirect where the hosting layer supports it. Otherwise keep compatibility HTML explicitly non-indexable and point its canonical target to the real page.

Do not include compatibility URLs in the sitemap.

## Search intent map

### Listening intent

Primary targets:

- play Garba online;
- Gujarati Garba online;
- Gujarati Garba songs;
- Garba music online;
- Nonstop Garba;
- Traditional Garba;
- Dandiya / Dandiya Raas;
- Devotional Garba;
- Folk Garba;
- Sanedo;
- Fusion Garba.

These should be handled primarily by the player and Explore rather than by one URL per phrase.

### Seasonal intent

Primary 2026 targets:

- Navratri songs 2026;
- Navratri Garba 2026;
- Gujarati Garba for Navratri;
- Nonstop Garba for Navratri;
- Dandiya songs for Navratri.

Handle these with `/navratri-2026/` plus direct handoff to Explore/player.

### Informational intent

Examples:

- What is Garba?
- What is Dandiya Raas?
- What is Sanedo?
- What is Nonstop Garba?
- What is the difference between Garba and Dandiya?
- Where can I listen to Gujarati Garba online?

Prefer concise answers on a small number of substantial pages. Do not create one page for every wording variation.

### Artist/song/release searches

PlayGarba may still surface for these through:

- strong visible catalogue content in Explore;
- meaningful page titles and descriptions;
- factual artist/release/song labels visible in the application;
- external search understanding of the overall catalogue.

Do not respond by creating an individual page for every catalogue entity.

### Local/event intent

City and event pages remain evidence-gated under #375. Do not publish thin local pages without a reliable sourced event model, freshness policy, expiry logic and maintenance capacity.

## Explore-first content contract

The catalogue remains the source of truth.

Use verified repository data inside Explore for:

- canonical/display song title;
- artist/performer;
- release when known;
- genre and taxonomy;
- duration when verified;
- authored description when available;
- sourced story/background only when available;
- verified YouTube playback;
- Nonstop chapter/timestamp information only when source-backed.

Do not invent biographies, rankings, popularity, histories, dates, credits or stories to make Explore appear richer.

The right response to incomplete metadata is better verified metadata, not generated filler or new thin URLs.

## Nonstop policy

Nonstop is a listening/discovery mode, not a public page tree.

Use one strong Nonstop area inside Explore/player that can list verified sets and expose source-backed chapter detail when available.

Do not create one indexable page per Nonstop recording.

## Artist policy

Artist discovery belongs inside Explore for now.

Explore may provide artist collections, artist detail panels and verified catalogue appearances without creating `/artists/{id}/` pages.

If a standalone artist-page programme is ever reconsidered, it requires a new explicit product decision. It is not part of the current search plan.

## General-page policy

Before adding a public page, ask:

1. Does the page solve a distinct user need?
2. Is there enough factual content to make it useful without filler?
3. Is it meaningfully different from Explore, the player and existing general pages?
4. Can it be maintained?
5. Would we still want the page if search engines did not exist?

If the answer is no, do not create the page.

Prefer consolidation. One excellent page is better than several near-duplicates.

## Structured data

Use structured data only where it accurately describes visible content.

Appropriate examples can include:

- `WebSite` on the main site;
- `BreadcrumbList` on general/editorial pages;
- `Article` where a page is genuinely editorial;
- `ItemList` where a visible list warrants it.

Do not create song, release or artist pages merely to emit `MusicRecording`, `MusicAlbum`, `MusicGroup` or similar schema.

Never add fabricated fields to satisfy schema.

## Technical SEO foundation

Issue #369 owns technical crawl/index quality.

Validate:

- canonical origin and syntax;
- robots behaviour;
- sitemap only contains real deployed canonical pages;
- one canonical per indexable page;
- title, description and H1 quality;
- no accidental `noindex` on intended pages;
- no accidental indexation of application/query state;
- Open Graph URL consistency;
- real HTML links between important public pages;
- compatibility routes do not compete with canonical pages;
- crawl/index regressions fail repository validation where practical.

The sitemap should stay intentionally small.

## Navratri 2026

Issue #372 owns the seasonal page.

The page should:

1. answer the 2026 date question immediately;
2. keep separate official date ranges separate when sources differ;
3. provide concise sourced context;
4. send users directly to the player and Explore;
5. explain listening choices using existing Explore categories;
6. avoid generic festival filler;
7. avoid links to undeployed pages;
8. enter the sitemap only after it is actually deployed.

## AEO/GEO approach

Do not build a separate answer-engine page factory.

Make the pages we already have easier to understand and quote:

- answer obvious questions early;
- use clear headings;
- keep facts source-truthful;
- avoid padded introductions;
- connect relevant general pages to Explore/player;
- do not duplicate the same answer across multiple pages.

## Measurement

Track only real data from approved tools when available:

- indexed canonical URLs;
- excluded/duplicate/error URLs;
- impressions;
- clicks;
- CTR;
- top landing pages;
- branded vs non-branded queries;
- Navratri query visibility;
- search to play conversion;
- search to Explore engagement;
- crawl errors;
- Core Web Vitals;
- identifiable answer-engine referrals.

Do not invent baselines or commit credentials/private exports.

## Delivery priority

1. Keep crawl/index signals correct.
2. Make Explore materially better.
3. Keep general pages compact and useful.
4. Deploy the Navratri 2026 page and connect it to Explore/player.
5. Improve concise factual answers inside existing pages.
6. Measure what actually works before adding more public pages.

## What not to do

- no individual song pages;
- no individual artist pages;
- no individual release pages;
- no individual Nonstop pages;
- no one-page-per-genre SEO tree;
- no alias/transliteration doorway pages;
- no thousands of AI-generated articles;
- no keyword-swapped city pages;
- no fake event pages;
- no invented song histories or artist biographies;
- no hidden keyword blocks;
- no schema fields absent from visible content;
- no indexable search/filter/query permutations;
- no second marketing homepage competing with the player.

## Definition of done

PlayGarba has:

- one canonical player/home experience;
- one excellent Explore catalogue;
- a small, coherent set of useful general pages;
- a strong and deployed Navratri 2026 page;
- correct sitemap/robots/canonical behaviour;
- useful factual metadata inside Explore;
- measurement that shows whether existing pages are being crawled and used.

The long-term search advantage should come from the quality of PlayGarba's catalogue and listening experience, not from manufacturing more URLs.