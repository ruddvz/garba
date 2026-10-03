# Dayro / Dayra — Taxonomy and Ingestion Rules

**Taxonomy ID:** `dayro`

**Aliases:** Dayra, Dayaro, Lok Dayro, Lokdayro, ડાયરો, દાયરો

**Visual world:** `folk`

**Status:** Dedicated taxonomy and browse filter added; new canonical song rows have not been created in this change.

## Category boundary

Dayro/Dayra is a Gujarati folk performance and programme format. Source-labelled programmes may combine oral literature, lok sahitya, duhas/chhands, humour, songs, bhajan or Santvani. Those elements are not all interchangeable, and an event title alone does not establish a dance style.

Keep Dayro as its own catalogue category, distinct from Garba, Dandiya/Raas, Sanedo and the broader Folk / Lokgeet song category. `dayro` maps to the existing `folk` visual world so the player keeps its current six-world presentation model. A Dayro programme may carry an additional category such as `devotional` only when the source supports it.

### Include

- Complete long-form programmes explicitly labelled Dayro/Dayra/Lok Dayro by the uploader or a reliable programme source.
- Multipart recordings where each part is independently identifiable and can be checked against the programme sequence.
- Lok Sahitya or Santvani parts when the source identifies the multipart sequence as Dayro and the actual content fits.

### Exclude or hold for review

- Garba/Dakla recordings whose release metadata happens to contain “Lok Dayro” while the recording title, content and source category identify another form.
- Short jokes, one-song excerpts, Shorts and snippets from larger events, unless needed only to map a multipart sequence.
- A playlist membership by itself as proof that every playlist item is a Dayro or is long-form.
- Inferred chapters, parts, performers, dates or durations. Keep a full recording as one item unless the publisher supplies usable chapter starts or independently published parts.

## Metadata and browse behavior

- Songs use `category: "dayro"` when Dayro is the primary form; retain the existing `genre` presentation value appropriate to the song, normally `folk`.
- Use `taxonomyStyles: ["dayro"]` for a verified secondary Dayro classification; do not duplicate the primary category.
- Discovery Nonstop sets keep visual worlds in `genres[]`, taxonomy IDs in `categories[]` / `styles[]`, and source terms in `tags[]`. The Nonstop browser can recognize explicit Dayro title/tag metadata as a separate `Dayro` filter and as `folk` visual playback context.
- Search accepts Dayro, Dayra and Dayaro spelling variants. Artist names and chapter titles are not category evidence.
- Explore search already indexes primary and secondary taxonomy metadata, and Dayro records remain visible in the existing Folk visual-world collection. A separate Dayro Explore card needs a matching entry in Explore's explicit style-collection registry; that file is under another active repository claim, so this change does not edit it. No new visual world or separate player theme is needed.

## Ingestion gates

Before a research row becomes a discovery-set record, confirm all of the following against the current source:

1. The exact YouTube video ID and original title, uploader/channel and programme context.
2. A current playable watch page and embeddable player, exact runtime, and whether playback is blocked by region, age, privacy or other restrictions.
3. Whether the recording is complete, a numbered part, or only a segment. Preserve source-published chapter starts verbatim; otherwise play the full recording without inferred navigation.
4. The source-backed Dayro classification and any additional devotional/folk descriptors.
5. Duplicate video IDs against **all** files in `data/discovery/sets/`, not just the current index or a playlist. Store one canonical discovery identity per physical YouTube video.
6. Rights and source status separately from public availability. A public YouTube embed is not permission to download, redistribute or rehost the media.

The research backlog is [`../dayro-longform-catalogue-v2.md`](../dayro-longform-catalogue-v2.md). It separates current source-checked full programmes from playlist and multipart leads that still need runtime/availability review. It is not itself a production ingestion manifest.
