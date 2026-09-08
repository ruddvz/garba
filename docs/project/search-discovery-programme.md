# PlayGarba search-discovery programme

Status: active planning and baseline audit  
Programme issue: #368  
First implementation lane: #369  
Baseline reviewed against remote `main` at `6be0deb33c66529aab34dcf60b3d2dd8cb81ecee` on 2026-09-08.

## Objective

Make PlayGarba easy to crawl, understand, cite and recommend for Gujarati Garba discovery while keeping the listening product primary.

The search strategy is built around real product value:

- a large source-truthful Gujarati Garba catalogue;
- individual songs and artists;
- releases and Nonstop sets;
- Traditional, Dandiya, Devotional, Folk, Sanedo and Fusion taxonomy;
- direct handoff into YouTube-backed playback;
- concise cultural/help content;
- a seasonal Navratri discovery layer.

The target is not page count. The target is a coherent search graph in which useful PlayGarba pages answer a real intent and lead naturally into listening.

## Current repository baseline

PlayGarba currently contains two search surfaces that reflect the in-progress hosting architecture.

### Live player surface

The repository root currently represents the `live.playgarba.com` player/PWA contract.

- root `robots.txt` allows crawling and advertises `https://live.playgarba.com/sitemap.xml`;
- root `sitemap.xml` currently lists the player root and `/catalogue/`;
- root player HTML uses `https://live.playgarba.com/` as canonical and Open Graph URL;
- repository validation currently asserts the live-host sitemap and CNAME contract.

This is internally consistent with the current split-host architecture, but it must not be treated as the final canonical-domain decision while the active consolidation/hosting work remains unresolved.

### Public apex surface

`public-site/` currently represents the `playgarba.com` editorial/public-site contract.

- `public-site/robots.txt` allows crawling and advertises the apex sitemap;
- `public-site/sitemap.xml` currently lists the homepage, What is Garba, How to use, Install, Live, FAQ and About routes;
- the public homepage already has a unique title, description, canonical, Open Graph metadata and basic `WebSite` JSON-LD;
- the homepage exposes crawlable HTML links to its supporting pages and sends listening/discovery actions to the live player.

The public site therefore already has useful SEO foundations. The next work should extend and consolidate them rather than replace them with a generic SEO framework.

### Active overlap that must be respected

The following work is already in flight and overlaps the host/canonical layer:

- #214 production apex cutover;
- #261 deployment/hosting reconciliation;
- PR #313 canonical apex consolidation;
- PR #321 supporting-page/navigation cleanup;
- #276 catalogue metadata enrichment;
- #311 product design craft system.

Search work must not rewrite those lanes from the side. In particular, canonical-host and redirect changes should wait for the authoritative production architecture to settle.

## External search snapshot, 2026-09-08

A current search sample shows two useful facts.

First, event-intent results are already competitive. Dedicated Navratri/Garba event platforms, ticket/event aggregators and organiser sites are publishing 2026 city/event pages. PlayGarba should not enter that space with empty programmatic city pages. It needs a real event evidence/update model first.

Second, music-intent results still lean heavily on YouTube videos and broad music/event pages. PlayGarba can differentiate by exposing a well-structured Gujarati Garba catalogue with stable song, artist, release, set and taxonomy relationships rather than trying to out-publish generic articles.

This reinforces the product-led SEO direction: catalogue entities plus excellent listening/discovery pages are the durable moat.

## Current search-engine guidance that affects the programme

### Google Search

Google's May 2026 guidance for generative AI search features explicitly continues to rely on normal Search fundamentals and warns against treating AEO/GEO as a separate bag of tricks. The practical implications for PlayGarba are:

- publish useful non-commodity content;
- keep important content crawlable and indexable;
- use clear internal links;
- make canonical signals unambiguous;
- keep structured data aligned with visible content;
- avoid scaled low-value pages.

Google also deprecated FAQ rich results in May 2026. PlayGarba may still present useful visible Q&A, but FAQ markup should not be treated as a current rich-result growth tactic.

Reference: https://developers.google.com/search/updates

### ChatGPT search

OpenAI's current publisher guidance says public sites can appear in ChatGPT search and recommends allowing `OAI-SearchBot` when publishers want content discoverable, summarized, cited and linked. ChatGPT search referral links can include `utm_source=chatgpt.com`, which gives PlayGarba a measurable answer-engine referral signal.

Crawler access and training controls are separate concerns. `OAI-SearchBot` is the search-discovery crawler; `GPTBot` controls potential training collection. The repository should document the intended policy instead of copying a generic robots block.

Reference: https://help.openai.com/en/articles/12627856

### IndexNow

IndexNow can notify participating search engines when URLs are added, changed or deleted. It does not guarantee crawling or indexing. If PlayGarba adopts it, the key must be handled deliberately and only changed URLs should be submitted.

Reference: https://www.bing.com/indexnow/getstarted

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
- Dandiya songs / Dandiya Raas;
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

These are best answered by catalogue-derived entity pages. Aliases and transliterations support discovery but should not automatically create duplicate indexable URLs.

### Seasonal intent

- Navratri songs 2026;
- Navratri Garba 2026;
- Gujarati Garba for Navratri;
- nonstop Garba for Navratri;
- Dandiya songs for Navratri.

A focused `/navratri-2026/` hub should connect these searches to the actual catalogue.

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

## Proposed information architecture

The final route names are owned by #370 after collision and deep-link analysis. The target shape is:

```text
/
/garba-songs/
/non-stop-garba/
/traditional-garba/
/dandiya/
/devotional-garba/
/folk-garba/
/sanedo/
/fusion-garba/

/artists/
/artists/{slug}/
/songs/{slug}/
/releases/{slug}/
/nonstop/{slug}/

/what-is-garba/
/navratri/
/navratri-2026/
/how-to-use/
/install/
/about/
```

Possible future event routes remain gated:

```text
/events/
/events/{city}/
/events/{event-slug}/
```

## Crawl graph

The internal-link model should form a useful graph rather than a flat sitemap.

```text
homepage/player
  -> major collection pages
    -> song / artist / release / Nonstop entities
      -> related entities
        -> player

what-is-garba / Navratri / help
  -> relevant collections
    -> verified entities
      -> player
```

Every important indexable route should be reachable through real HTML anchors. JavaScript can enhance state, but it should not be the only way a crawler discovers core content.

## Entity-page content contract

### Song

Only show fields that are supported by canonical data:

- canonical/display title;
- artist/performer;
- release when known;
- genre/taxonomy;
- duration when verified;
- authored description when available;
- sourced story/background only when available;
- exact YouTube playback route where playable;
- related artist/release/collection/Nonstop links.

### Artist

- canonical artist identity;
- verified songs in the catalogue;
- verified releases/sets represented in PlayGarba;
- sourced editorial context only when it exists.

Do not infer birthplace, awards, popularity, genre history or biography from names/titles.

### Release

- verified title;
- verified performer/artist relationships;
- canonical track listing;
- factual authored description when available;
- related entities and collections.

### Nonstop

- preserve the one-recording model;
- show source-verified chapters only;
- never infer chapter starts from track durations;
- make the distinction between one continuous recording and ordinary split songs clear.

## Indexability threshold

An entity existing in the app does not automatically mean it deserves an indexed page.

An indexable entity page should have enough verified standalone value to answer the query without being a near-empty wrapper. Until a deterministic threshold is finalized, use these principles:

- title alone is not enough;
- title + artist + meaningful catalogue relationships may be enough for important entities if the page genuinely supports navigation/listening;
- duplicate aliases should canonicalize to one entity;
- unresolved or provenance-thin entities may remain application routes but should stay out of the sitemap/index;
- pages created only to capture a keyword are not acceptable.

## Structured-data matrix

Use JSON-LD only when the visible page supports the fields.

| Surface | Candidate schema |
| --- | --- |
| Site root | `WebSite`, `Organization` where organization details are deliberately defined |
| Collection | `ItemList`, `BreadcrumbList` |
| Song | `MusicRecording`, `BreadcrumbList` |
| Release | `MusicAlbum` where semantically correct, `BreadcrumbList` |
| Nonstop set | `MusicPlaylist` when the data model truly represents a playlist/set, otherwise use the closest truthful visible semantics |
| Artist | `MusicGroup` or `Person` only when identity type is known |
| Real event | `Event` only after #375 evidence contract |

Do not add made-up ratings, popularity, prices, dates, credits or images to satisfy schema fields.

## Navratri 2026 launch surface

Issue #372 owns the seasonal page. It should ship early rather than waiting for Navratri week.

Recommended structure:

1. direct listening/discovery action;
2. Traditional Garba;
3. Dandiya;
4. Devotional;
5. Nonstop;
6. Sanedo/Folk/Fusion where relevant;
7. verified featured releases/artists;
8. concise Garba/Navratri answers;
9. deeper catalogue links.

Avoid unsupported 'top', 'best', 'most popular' and similar ranking language unless a real editorial method is defined.

## AEO/GEO content rules

Issue #373 owns the answer layer.

Use a simple pattern:

1. answer the question directly in the first paragraph;
2. add only context that improves understanding;
3. link the concept to real PlayGarba catalogue examples or collections;
4. source non-obvious cultural/history claims during authoring;
5. avoid hidden crawler-only text;
6. do not create one thin page per wording variation.

The goal is extractable clarity, not AI-styled verbosity.

## Technical SEO baseline checklist

Issue #369 owns this foundation.

For every intended indexable route, validate:

- 200 status on canonical URL;
- intended redirect behaviour for aliases/alternate hosts;
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

- robots exists and points to the correct sitemap;
- sitemap contains absolute canonical URLs only;
- robots policy intentionally handles search/AI crawlers;
- sitemap entries resolve as expected;
- sitemap output is deterministic and not stale hand-maintained data.

## Measurement plan

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

## Delivery sequence

The recommended order is deliberately dependency-aware.

### Wave 1: technical baseline

Issue #369.

Start immediately with audit, validators and documentation that do not conflict with active hosting PRs. Apply final canonical-host changes only after the infrastructure contract is authoritative.

### Wave 2: URL architecture

Issue #370.

Lock route/indexability/slug policy before generating large numbers of pages.

### Wave 3: entity-page pilot

Issue #371.

Generate a representative high-quality subset first. Validate crawlability, page usefulness, schema and player handoff before scaling across the catalogue.

### Wave 4: Navratri 2026 hub

Issue #372.

This is time-sensitive. Ship as soon as route/canonical ownership is sufficiently stable. Do not wait for 100% entity-page coverage.

### Wave 5: answer layer

Issue #373.

Improve What is Garba and related pages with concise factual answers and strong internal links.

### Wave 6: measurement

Issue #374.

Configure operational checks early enough to see whether the first indexable waves are being crawled.

### Wave 7: local/events research

Issue #375.

Design the evidence model first. Public local pages come later only if data quality supports them.

## What not to do

- no thousands of AI-generated articles;
- no keyword-swapped city pages;
- no fake event pages;
- no invented song histories or artist biographies;
- no duplicate pages for transliteration variations;
- no hidden keyword blocks;
- no schema fields that are absent from visible content;
- no `FAQPage` implementation justified only by an expectation of Google FAQ rich results;
- no indexable search/filter/query permutations by default;
- no canonical-host changes that race the active infrastructure lane;
- no replacing the distinctive player with a generic SEO homepage.

## Near-term success definition

Before the Navratri 2026 demand peak, PlayGarba should have:

- one authoritative canonical-host contract;
- robots and sitemap behaviour validated for that contract;
- a documented URL/indexability policy;
- major Garba collection pages or an implementation-ready route plan;
- an indexable Navratri 2026 hub;
- a first set of useful catalogue entity pages if #370/#371 are ready;
- concise factual Garba answer content;
- measurement in place to distinguish indexing problems from ranking/content problems.

The longer-term goal is for search systems to understand PlayGarba as an interconnected Gujarati Garba catalogue and listening product, not merely a single-page player or a collection of generic festival articles.
