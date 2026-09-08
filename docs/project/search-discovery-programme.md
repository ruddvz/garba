# PlayGarba search-discovery programme

Status: active implementation  
Programme issue: #368  
Technical crawl/index lane: #369  
Canonical URL architecture lane: #370  
Current production baseline reviewed against remote `main` at `5e85ba2cafd6b14ebb96401ba812d7f171e5b31b` on 2026-09-08.

## Objective

Make PlayGarba easy to crawl, understand, cite and recommend for Gujarati Garba discovery while keeping listening primary.

The search strategy is built around real product value:

- a large source-truthful Gujarati Garba catalogue;
- individual songs and artists;
- releases and Nonstop sets;
- Traditional, Dandiya, Devotional, Folk, Sanedo and Fusion presentation worlds;
- deeper canonical music taxonomy;
- direct handoff into YouTube-backed playback;
- concise cultural/help content;
- a seasonal Navratri discovery layer.

The target is not page count. The target is a coherent search graph in which every indexable PlayGarba URL answers a real intent and leads naturally into listening.

## Current production architecture

The production contract changed on 2026-09-08 and is now single-origin.

### Canonical origin

`https://playgarba.com/` is the canonical public origin and GitHub Pages production host.

Current root signals are aligned to the apex:

- `CNAME` is `playgarba.com`;
- root `robots.txt` allows crawling and advertises `https://playgarba.com/sitemap.xml`;
- root player HTML canonicalizes to `https://playgarba.com/`;
- root Open Graph URL uses `https://playgarba.com/`;
- `/explore/` is the canonical catalogue/discovery route.

Search work must preserve this one-origin architecture unless a later infrastructure decision explicitly supersedes it.

### Current deployed route families

The GitHub Pages build currently deploys:

- `/` as the player;
- `/explore/` as the canonical catalogue/discovery page;
- `/catalogue/` as a compatibility copy of the Explore source;
- `/about/`;
- `/faq/`;
- `/how-to-use/`;
- `/install/`;
- `/live/`;
- `/what-is-garba/`.

The repository also contains additional authored editorial routes that are not all included in the current Pages artifact. These include:

- `/learn/`;
- `/history-of-garba/`;
- `/navratri-and-garba/`;
- `/dandiya-raas/`;
- `/garba-vs-dandiya/`;
- `/garba-music/`;
- `/garbo/`;
- `/garba-attire-and-craft/`;
- `/navratri-2026/`.

Those existing sources should be audited and reused where they answer distinct search intent. Do not create replacement pages with new URLs merely because they are not yet deployed.

### Known sitemap defect

The current root sitemap advertises `/help/`, but the production Pages build does not deploy a `/help/` route. The build deploys `/how-to-use/` instead. `/how-to-use/` and `/what-is-garba/` are currently absent from the root sitemap.

Issue #369 owns that technical sitemap correction. Issue #370 does not patch deployment or sitemap files.

## Search intent map

### Immediate listening intent

Highest product fit:

- play Garba online;
- Gujarati Garba online;
- Garba music online;
- Garba player;
- listen to Garba;
- nonstop Garba;
- Gujarati nonstop Garba.

These searches should land close to a playable experience, not on a long article.

### Collection/style intent

- Garba songs;
- Gujarati Garba songs;
- Traditional Garba;
- Dandiya songs / Dandiya Raas songs;
- Devotional Garba;
- Folk Garba;
- Sanedo;
- Fusion Garba.

These should map to useful collection pages with real catalogue membership and crawlable entity links.

### Entity intent

- song title;
- artist name;
- release/album title;
- Nonstop set title;
- artist + song/release combinations.

These are best answered by catalogue-derived entity pages. Aliases and transliterations support discovery but do not create duplicate indexable URLs.

### Seasonal intent

- Navratri songs 2026;
- Navratri Garba 2026;
- Gujarati Garba for Navratri;
- nonstop Garba for Navratri;
- Dandiya songs for Navratri.

The existing `public-site/navratri-2026/index.html` should be the starting asset for #372. Refine and deploy it rather than creating a competing seasonal page.

### Informational / answer intent

- What is Garba?
- What is Dandiya Raas?
- What is Sanedo?
- What is nonstop Garba?
- What is the difference between Garba and Dandiya?
- What music is played during Navratri?
- Where can I listen to Gujarati Garba online?

These answers should remain concise, factual and linked to relevant listening surfaces.

### Local/event intent

- Garba events near me;
- Navratri events near me;
- city-specific Garba/Navratri events.

This is evidence-gated under #375. No city/event indexation should start until real event sources, freshness, expiry and deduplication rules exist.

# Canonical URL policy

This section is the implementation contract from #370.

## Global rules

1. The canonical origin is `https://playgarba.com`.
2. Canonical HTML page URLs use lowercase paths and a trailing slash.
3. One public entity or intent gets one indexable canonical URL.
4. Application state is not a second SEO URL system.
5. Stable repository IDs are the identity key for entity paths.
6. `displayTitle` and aliases may change presentation but must not change canonical identity.
7. Tracking parameters never create a new canonical URL.
8. A URL enters the sitemap only after its page exists in the production artifact and passes its indexability gate.
9. A route that is only a redirect/handoff is not a sitemap URL.
10. An alias or transliteration never creates a second indexable page for the same entity.

## URL class A: canonical indexable pages

These are allowed to appear in internal links and the sitemap after their content gates are met.

### Product/discovery

```text
/
/explore/
```

### Listening collections

Use one collection namespace so listening intent does not collide with cultural/editorial pages:

```text
/garba-songs/
/garba-songs/traditional/
/garba-songs/dandiya/
/garba-songs/devotional/
/garba-songs/folk/
/garba-songs/sanedo/
/garba-songs/fusion/
/non-stop-garba/
```

This is preferred over flat routes such as `/dandiya/` because PlayGarba already has a distinct informational Dandiya surface at `/dandiya-raas/`. The namespace makes the intent explicit:

- `/garba-songs/dandiya/` means listen/explore Dandiya music;
- `/dandiya-raas/` means understand the cultural form.

Likewise, collection pages should not replace or duplicate `/garba-music/`, `/what-is-garba/` or other editorial pages.

### Entity pages

Use stable IDs directly as path keys:

```text
/songs/{song-id}/
/artists/{artist-id}/
/releases/{release-id}/
/nonstop/{set-id}/
```

Do not derive the canonical path from the current display title alone.

Why:

- canonical song and release IDs are already stable repository identity;
- IDs are used by playback mappings, favourites and deep links;
- discovery artists have explicit stable IDs;
- Nonstop discovery records have canonical set IDs;
- display titles and aliases can be corrected later without breaking inbound links;
- duplicate human titles do not collide.

Human-readable titles belong in `<title>`, H1, breadcrumbs, visible copy and structured data. The path key remains the stable ID.

### Evergreen editorial and help pages

Preserve strong existing routes instead of creating keyword-swapped duplicates:

```text
/what-is-garba/
/learn/
/history-of-garba/
/navratri-and-garba/
/dandiya-raas/
/garba-vs-dandiya/
/garba-music/
/garbo/
/garba-attire-and-craft/
/how-to-use/
/install/
/faq/
/about/
```

Only deploy/index a source page after editorial accuracy, internal links, canonical metadata and production artifact inclusion are validated.

### Seasonal

```text
/navratri-2026/
```

Do not create both `/navratri/2026/` and `/navratri-2026/` for the same content. The existing source has already established `/navratri-2026/` as the preferred 2026 route.

A future evergreen `/navratri/` page may exist only if it has distinct year-independent value. It must not duplicate the 2026 page.

## URL class B: functional but non-indexable application state

These states may remain functional for listeners but are not standalone search pages.

### Player query state

Current root-player state includes:

```text
/?song={song-id}
/?genre={genre-id}
/?nonstop={set-id}
```

Policy:

- keep these URLs functional for playback/session handoff;
- do not add them to sitemaps;
- do not generate crawlable faceted links to every query combination;
- root HTML canonical remains `/` for these application-state responses;
- future entity pages link to playback state only as an action, not as their canonical URL;
- tracking parameters such as `utm_*`, `gclid`, `fbclid` and equivalent referral parameters do not alter canonical identity.

Once `/songs/{song-id}/` or `/nonstop/{set-id}/` exists, that entity page is the searchable information URL. The query-state player URL remains the listening action.

### Explore hash state

Current Explore uses hash state such as:

```text
/explore/#collection={id}
/explore/#collection={id}&release={release-id}
/explore/#search={query}
```

Policy:

- hashes remain UI state;
- they are never sitemap entries;
- search/filter state must not be multiplied into indexable pages;
- major durable collections move to class-A collection URLs instead of trying to index hash states;
- release/song/entity discovery should eventually point to class-A entity pages when those pages exist.

## URL class C: compatibility aliases and handoffs

Compatibility URLs must not compete with canonical pages.

Current or historical examples include:

```text
/catalogue/
/live/
/songs/
/releases/
```

Policy:

- `/catalogue/` should resolve toward canonical `/explore/`;
- `/live/` should resolve toward canonical `/`;
- legacy generic `/songs/` and `/releases/` handoffs must not compete with future entity namespaces;
- compatibility routes should be `noindex, follow` while they exist as HTML handoffs;
- use an HTTP 301/308 when the hosting layer supports a true permanent redirect;
- if GitHub Pages cannot provide a real server redirect for a specific compatibility path, use an explicit noindex handoff plus canonical target and document that limitation;
- never describe a meta-refresh/client redirect as equivalent to a server-side 301/308.

Do not include compatibility aliases in the sitemap.

## Reserved route names

Entity and collection generation must not occupy product/editorial route names.

At minimum reserve:

```text
about
assets
catalogue
dandiya-raas
explore
faq
garba-attire-and-craft
garba-music
garba-songs
garba-vs-dandiya
garbo
history-of-garba
how-to-use
install
learn
live
navratri
navratri-2026
navratri-and-garba
non-stop-garba
nonstop
offline
releases
songs
artists
what-is-garba
```

Because entities live below typed namespaces, a song ID cannot collide with a top-level editorial route. Validators should still reject duplicate IDs within each entity namespace.

# Indexability gates

An entity existing in repository data does not automatically deserve an indexed page.

## Song page gate

Index `/songs/{song-id}/` only when all of these are true:

- canonical song ID exists;
- canonical/display title exists;
- artist credit exists;
- primary genre/category relationship exists;
- at least one useful additional verified relationship exists, such as a canonical release, a verified exact YouTube route, or meaningful authored metadata;
- page exposes real links to related entities/collections and a listening action;
- the page is not a presentation alias/source-only duplicate.

If the song fails the gate, it may remain usable inside Explore/player but stays out of the sitemap and should not be indexable as a standalone page.

## Artist page gate

Index `/artists/{artist-id}/` only when:

- the discovery artist registry contains a stable ID and canonical name;
- the identity can be connected deterministically to canonical catalogue credits;
- the page has at least two canonical catalogue appearances, or one canonical release/set with meaningful track relationships;
- aliases resolve to the same artist identity rather than creating pages;
- the page does not require an invented biography to be useful.

## Release page gate

Index `/releases/{release-id}/` only when:

- the release is a canonical catalogue presentation, not `catalogue-alias`, `source-only` or `nonstop-only`;
- canonical title and artist credit exist;
- at least one canonical track relationship exists;
- the visible track listing is source-truthful;
- related song/artist/collection links are available.

Alias/source-only release records remain provenance, not independent search pages.

## Nonstop page gate

Index `/nonstop/{set-id}/` only when:

- the canonical discovery set exists;
- title and performer/source context are verified;
- the set has a truthful playable or discovery source;
- chapter data, when shown, follows the repository evidence state and is not inferred;
- duplicate physical YouTube recordings do not create multiple canonical set pages.

## Collection page gate

Index a listening collection only when:

- membership is derived from canonical genre/taxonomy rules;
- the collection contains enough real catalogue items to be independently useful;
- the page has unique visible context, not only a copied heading;
- it links to canonical entity pages or to truthful player actions;
- empty or nearly empty taxonomies are not expanded solely for keyword capture.

# Slug and identity policy

## Canonical entity keys

Use repository IDs unchanged as the primary URL key where they already satisfy URL-safe lowercase conventions.

If a legacy ID contains characters that cannot safely form a path segment, create a deterministic URL-key map that is versioned and tested. Do not silently recompute keys from display titles on every build.

## Aliases and transliterations

`aliases[]` are discovery data, not alternate canonical URLs.

They may be used for:

- internal search matching;
- visible alternate-name context where useful;
- metadata/structured data when semantically correct.

They must not automatically generate:

- duplicate pages;
- duplicate sitemap entries;
- keyword-swapped doorway routes.

## Title changes

`displayTitle` changes do not change entity URLs.

Canonical source-title corrections also should not change an existing public URL unless the underlying entity identity was actually wrong. If identity migration is required, use an explicit old-ID to new-ID redirect map and preserve deep-link/favourite migration.

# Canonical and parameter policy

For every indexable HTML page:

- exactly one absolute canonical link;
- canonical uses HTTPS apex `playgarba.com`;
- canonical path follows the trailing-slash rule;
- Open Graph URL matches the canonical URL;
- title/H1/meta description describe the visible page rather than query state;
- sitemap contains the canonical URL only.

For tracking/referral parameters:

- serve the same content;
- canonicalize to the clean URL;
- do not put parameterized URLs in the sitemap.

For real application-state parameters:

- preserve functionality;
- do not expose infinite crawl graphs;
- do not treat combinations as landing pages unless a future issue deliberately promotes one state into a class-A route.

# Internal-link graph

The search graph should be deliberate and shallow enough for discovery.

```text
/
  -> /explore/
  -> /garba-songs/
  -> /non-stop-garba/
  -> /navratri-2026/
  -> /what-is-garba/

/garba-songs/
  -> six listening collection pages
  -> representative canonical songs
  -> artists/releases

/garba-songs/{world}/
  -> songs
  -> artists
  -> releases
  -> player actions

/songs/{id}/
  -> artist
  -> release
  -> relevant collection(s)
  -> Nonstop context when verified
  -> player action

/artists/{id}/
  -> canonical songs
  -> canonical releases
  -> verified Nonstop sets

/releases/{id}/
  -> canonical tracks
  -> artist
  -> relevant collection(s)

/nonstop/{id}/
  -> verified chapters/segments when available
  -> artists/releases when relationships are proven
  -> Nonstop collection
  -> player action

editorial / Navratri pages
  -> relevant listening collections
  -> selected verified entities
  -> player
```

Important routes must be reachable through real HTML anchors. JavaScript may enhance navigation but cannot be the only discovery mechanism for core search pages.

# Pagination and faceting

Do not introduce indexable faceted navigation by default.

If a collection or artist list eventually requires pagination:

- use deterministic path pagination rather than arbitrary filter parameters;
- each paginated page must have useful crawlable links forward/back;
- do not canonicalize every pagination page to page 1 if the later pages contain unique items users need to discover;
- pagination is introduced only when a real page-size/performance need exists.

Search queries, sort order, temporary filters, favourites and queue state stay non-indexable.

# Sitemap lifecycle

A route moves through these states:

1. **source-only**: file/data exists but is not deployed;
2. **deployed-noindex**: compatibility route or page not ready for search;
3. **indexable-not-yet-submitted**: page passes content/technical gates;
4. **sitemap-listed**: canonical production URL is advertised;
5. **retired**: URL redirects or hands off to a replacement and is removed from sitemap.

The sitemap must be generated or validated from the same route contract as the production artifact. It must never advertise source-only files or routes the build does not deploy.

# Structured-data matrix

Use JSON-LD only when visible page content supports the fields.

| Surface | Candidate schema |
| --- | --- |
| Site root | `WebSite`, `Organization` where organization details are deliberately defined |
| Collection | `ItemList`, `BreadcrumbList` |
| Song | `MusicRecording`, `BreadcrumbList` |
| Release | `MusicAlbum` where semantically correct, `BreadcrumbList` |
| Nonstop set | `MusicPlaylist` when the visible model truthfully represents a playlist/set; otherwise use only schema that matches the page |
| Artist | `MusicGroup` or `Person` only when identity type is known |
| Real event | `Event` only after #375 evidence contract |

Do not add made-up ratings, popularity, prices, dates, credits or images to satisfy schema fields.

# Navratri 2026 launch surface

Issue #372 owns the seasonal implementation.

The repository already contains `public-site/navratri-2026/index.html`. #372 should audit and improve that source rather than creating a second page.

Recommended page responsibilities:

1. direct listening/discovery action;
2. Traditional Garba;
3. Dandiya;
4. Devotional;
5. Nonstop;
6. Sanedo/Folk/Fusion where relevant;
7. verified featured releases/artists;
8. concise Garba/Navratri answers;
9. deeper catalogue/entity links as #371 lands.

Avoid unsupported `top`, `best`, `most popular` and similar ranking language unless a real editorial method is defined.

# AEO/GEO content rules

Issue #373 owns the answer layer.

Use a simple pattern:

1. answer the question directly in the first paragraph;
2. add only context that improves understanding;
3. link the concept to real PlayGarba catalogue examples or collections;
4. source non-obvious cultural/history claims during authoring;
5. avoid hidden crawler-only text;
6. do not create one thin page per wording variation.

The goal is extractable clarity, not AI-styled verbosity.

# Technical SEO baseline checklist

Issue #369 owns the technical implementation.

For every intended indexable route, validate:

- 200 status on canonical URL;
- intended redirect behaviour for aliases/alternate paths;
- one canonical link;
- index/follow policy;
- unique title;
- useful meta description;
- one clear primary heading;
- crawlable internal links;
- consistent Open Graph URL/title/image;
- sitemap inclusion only when production-ready;
- no accidental query-state duplication;
- no broken internal links;
- schema parse/semantic validation where present.

For host-level files, validate:

- robots exists and points to the apex sitemap;
- sitemap contains absolute `https://playgarba.com/` canonical URLs only;
- sitemap paths are actually present in the Pages artifact;
- deployed indexable pages that meet policy are not accidentally omitted;
- compatibility/noindex pages are excluded;
- robots policy intentionally handles search/AI crawlers;
- sitemap output is deterministic and does not drift from the build.

## Current Wave 1 correction list

At the time of this policy review:

- remove or correctly implement the sitemap entry for `/help/`;
- add `/how-to-use/` when confirmed indexable/deployed;
- add `/what-is-garba/` when confirmed indexable/deployed;
- reconcile `/live/` with the compatibility/noindex policy;
- reconcile `/catalogue/` with canonical `/explore/`;
- only add additional existing editorial sources after they are actually copied into the production artifact and pass content review.

# Measurement plan

Issue #374 owns operations.

Track only real data from approved tools:

- indexed canonical URLs;
- excluded/duplicate/error URLs;
- impressions;
- clicks;
- CTR;
- average position;
- branded vs non-branded queries;
- top landing pages;
- Navratri query group visibility;
- search-to-play conversion;
- search-to-Explore engagement;
- crawl errors;
- schema/rich-result errors where applicable;
- Core Web Vitals;
- ChatGPT referrals when identifiable through `utm_source=chatgpt.com`.

Do not commit analytics credentials or private report exports to the public repository.

# Implementation handoff

## #369 technical crawl/index

Use this URL contract to fix sitemap/robots/canonical validators. Do not invent a competing route list inside validation code.

## #371 entity-page pilot

The current GitHub Pages workflow explicitly rejects deployed `_site/songs` and `_site/releases` directories. That was a deliberate pre-entity-page product contract.

#371 must change that deployment assertion deliberately when the entity-page pilot is ready. Do not work around it with query-string pseudo-pages.

Pilot the typed stable-ID routes:

```text
/songs/{song-id}/
/artists/{artist-id}/
/releases/{release-id}/
/nonstop/{set-id}/
```

Scale only after representative pages pass indexability, schema, internal-link and player-handoff tests.

## #372 Navratri 2026

Reuse `public-site/navratri-2026/index.html`, audit its factual claims and sources, connect it to the canonical collection graph, then add it to the production artifact and sitemap only after it passes review.

## #373 editorial/AEO

Prefer the already-authored cultural route set where the intent matches. Do not create duplicate `what-is-*` pages when an existing strong route can be improved.

# Delivery sequence

1. #369 fixes crawl/index correctness against the apex contract.
2. #370 locks this route/indexability policy.
3. #372 can ship the existing Navratri 2026 page as soon as its factual/content review and deployment work are complete.
4. #371 pilots entity pages and collection routes, then scales carefully.
5. #373 strengthens factual answer surfaces and editorial internal linking.
6. #374 measures real indexing, search demand and search-to-play behaviour.
7. #375 remains evidence-gated until a trustworthy event data model exists.

# What not to do

- no thousands of AI-generated articles;
- no keyword-swapped city pages;
- no fake event pages;
- no invented song histories or artist biographies;
- no duplicate pages for transliteration variations;
- no hidden keyword blocks;
- no schema fields absent from visible content;
- no `FAQPage` implementation justified only by an expectation of rich results;
- no indexable search/filter/query/hash permutations by default;
- no title-derived entity URLs that change when presentation metadata changes;
- no separate `/dandiya/` listening page that cannibalizes the existing `/dandiya-raas/` informational intent;
- no sitemap URL that is absent from the actual production artifact;
- no replacing the distinctive player with a generic SEO homepage.

# Near-term success definition

Before the Navratri 2026 demand peak, PlayGarba should have:

- one authoritative apex canonical-host contract;
- robots and sitemap behaviour validated against the real Pages artifact;
- this documented URL/indexability policy;
- major Garba collection pages or an implementation-ready collection generator;
- the existing `/navratri-2026/` source reviewed, deployed and linked;
- a first representative set of useful song/artist/release/Nonstop entity pages if #371 is ready;
- concise factual Garba answer content using existing editorial routes where possible;
- measurement in place to distinguish indexing problems from ranking/content problems.

The longer-term goal is for search systems to understand PlayGarba as an interconnected Gujarati Garba catalogue and listening product, not merely a single-page player or a collection of generic festival articles.
