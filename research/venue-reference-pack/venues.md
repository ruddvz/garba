# Garba Venue Visual Reference Library

This pack is the working visual source for future Garba venue concepts and 3D reconstruction requests. Open [`index.html`](./index.html) to browse the complete image set, mark image favorites, and arrange venue concepts into a saved build order. [`library.json`](./library.json) is the image and concept manifest used by the page.

## What is in this pack

- **160 original JPEGs** from the user-approved `Oct 02 - 03_48.zip`, copied without resizing or re-encoding with ZIP filenames and pixel dimensions preserved in the manifest.
- **One directly user-supplied PNG** added to Obsidian Fern Basin as the ringed-world crystal gateway reference. Its original 1376 × 768 pixels and bytes are preserved.
- **Three new generated Kutch concept images**: a moonlit hero, one aerial/elevation/detail board, and one clothing/material/prop board. They are labelled `GENERATED`, unstarred, and not user-approved unless you choose them.
- **120 current favorites** from the latest user export: the 13 prior-review favorites plus 107 ZIP images. The new gateway reference is included but remains unstarred until you choose it.
- **13 distinct visual directions** with scene, plan, arrival, material, lighting, lounge and other supporting views grouped by concept. The 12 earlier directions retain their exported order; Kutch is appended as unranked.
- **A venue-level build queue and image-level favorites.** Image stars and concept ranks are separate choices.

The latest export ranks the original 12 directions, with **Obsidian Fern Basin first**. The new Kutch direction is unranked until you choose its position. The page starts from the original selection, remembers edits in the current browser, and can copy or download a portable JSON selection. Review remains open: starred images export as `KEEP`, and unstarred images as `UNREVIEWED`. After review is marked complete, unstarred images export as `REMOVE_FROM_ACTIVE_SELECTION`; source files remain in the research archive. Exports now include every image under `reference_images`; `approved_reference_images` remains as a compatibility list for user-approved sources. Share the JSON with Cloud Code or a later task to set the build order. Merge older exports into the current manifest rather than dropping later references. If browser storage is unavailable, download the JSON after making changes.

## Working concept index

Rows follow the latest user priority order; Kutch is unranked at the end. Counts include the ZIP archive, prior-review images, the user-supplied gateway and three generated concept images. The archive copy of ZIP-137 is pixel-identical to the supplied gateway and is marked as a duplicate. Favorite counts preserve the latest export; all three Kutch images and the gateway remain unstarred.

| Priority | Working direction | Setting / visual identity | References | Favorites |
| ---: | --- | --- | ---: | ---: |
| 1 | [Obsidian Fern Basin](./images/obsidian-fern-basin/) | Open-air alien-world arena; basalt, ultraviolet flora and ember gold | 23 | 14 |
| 2 | [Resham Pavilion · Full-span Ribbon Canopy](./images/resham-textile-pavilion/) | Large open canopy illusion made from radiating red textile strips | 20 | 12 |
| 3 | [Chitra Aangan](./images/chitra-aangan/) | Devotional art panels within a tree courtyard | 4 | 3 |
| 4 | [Voltage Yard](./images/voltage-yard/) | Indoor industrial warehouse with modern neon production | 24 | 22 |
| 5 | [Chandra Van](./images/chandra-van/) | Lush banyan garden, moonlight and bioluminescent accents | 12 | 7 |
| 6 | [Vrindavan Sandstone Courtyard](./images/vrindavan-sandstone-courtyard/) | Heritage-inspired carved stone court and warm lamps | 10 | 7 |
| 7 | [Violet Lantern Grove](./images/violet-lantern-garden/) | Private tree garden, woven lanterns and a quiet lounge pod | 13 | 6 |
| 8 | [Lotus Amphitheatre](./images/lotus-amphitheatre/) | Open-air stepped circle with a lotus dance-floor motif and private glass-pavilion variation | 14 | 10 |
| 9 | [Cyberpunk City Plaza](./images/cyberpunk-city-plaza/) | Neon urban plaza with skyline and elevated transit | 13 | 10 |
| 10 | [Deep-Jyot Chowk](./images/deep-jyot-chowk/) | Temple-inspired courtyard, mandala lanterns and diyas | 18 | 11 |
| 11 | [Tideglass Terrace](./images/tideglass-terrace/) | Moonlit sea-facing terrace with coastal planting | 13 | 11 |
| 12 | [Jyot Shikhar · Light Tower](./images/jyot-shikhar-light-tower/) | Freestanding perforated metal light sculpture | 10 | 7 |
| — | [Kutch White Rann · Saltlight Circle](./images/kutch-white-rann/) | Fictional, open salt-plain Garba concept; moonlight, indigo and terracotta | 3 | 0 |
| **Total** | **12 ranked + 1 unranked direction** |  | **177** | **120** |

The user-supplied Obsidian reference is [the ringed-world crystal gateway](./images/obsidian-fern-basin/user-ref-001-ringed-world-crystal-gate.png). The separate ZIP-137 archival copy has the same pixels and is explicitly tagged `DUPLICATE`.

The 20–40 guest, mid-size, or large-event labels in the gallery indicate a **design fit to explore**, not certified capacity. A real site still needs verified dimensions, circulation, egress, fire and structural review.

## Build instructions for Cloud Code

When the user asks to build or reconstruct a venue:

1. Read the newest exported JSON if the user provides one. Match stable image IDs to current `library.json` paths. Exports can predate later additions, so apply their ranks and favorites without removing newer assets; retain user reference `user-ref-001` unless the user explicitly removes it. Use `reference_images` for all sources and `approved_reference_images` only for user-approved sources. Build in `priority_order`, starting at rank `1`. The latest export ranks the original 12 directions; Kutch remains unranked until the user places it. Do not infer its rank from stars.
2. Treat a concept as one coherent visual family. Use its grouped image set, especially multi-view boards, plan studies, angle studies, materials, lounge/arrival views and clothing references. Favorites mark `KEEP`; unstarred images are still unreviewed while review is open. Generated Kutch images are explicitly unapproved concept art until the user selects them. Do not merge families unless asked, and use the `DUPLICATE` badge to avoid treating ZIP-137 as a second distinct Obsidian design.
3. Begin with **Obsidian Fern Basin** at priority 1. The latest export marks 120 images as favorites and leaves review incomplete. Obsidian now has 23 image files, 14 favorites, including the later user-supplied gateway and its visibly tagged ZIP duplicate. Distinguish image-level favorites from venue-level priority. Favorites refine which visual references the user likes; the ranked concept list controls build order. When `review_complete` is true, unstarred images leave the active shortlist only; keep source files and the research record. When it is false, unstarred images remain unreviewed.
4. Keep the concept visually distinct. Vary the lighting language, props, textiles, architecture, color, and wardrobe between venues. Do not repeat the same elephant motif or the same red styling across every design. The Jyot Shikhar tower is its own signature object; it is not a default prop.
5. For **Resham Pavilion**, use the corrected full-span canopy reference: a very large, open framework of radiating hanging strips that creates a dome illusion. It is not a solid enclosed dome, and the upper treatment spans the dance floor rather than covering one small section.
6. Keep **Chandra Van** organic and garden-led. ZIP-038 remains in Chandra because ZIP-037's forest plan explicitly includes a temple shrine; ZIP-040's separate stone-courtyard storyboard is grouped with Vrindavan Sandstone. Keep **Obsidian Fern Basin** as its own open, extraterrestrial basalt arena with luminous flora and a visible ringed planet. Preserve the open sky; do not turn either into a generic indoor room.
7. Use the people and clothing in the references as wardrobe cues. Vary garments and color stories with the venue rather than dressing every crowd alike. Keep Gujarati/Navratri details culturally coherent and readable.
8. These are visual directions, not surveys. Some archive images are user-approved; the three new Kutch images are generated and unapproved until selected. Pixel dimensions are not venue measurements. Do not infer exact floor dimensions, truss ratings, guest counts, safety clearances, site addresses, or permanent architecture from generated boards.
9. Keep published real-event observations separate from generated concept directions. Aekal Raatri, DFL Garba Nights and Sanedo are documented below; Kutch is a generated direction supported by landscape and craft context, not a record of an existing venue. For the unnamed DFL garden, do not invent a venue name or map pin.

## Published event references

These references are factual production context, separate from the generated visual directions.

### Aekal Raatri · Sargam Farm, Ahmedabad

DFL's account of the 2025 edition describes string lights in orange, teal and gold fanning over the dance floor, a dome-shaped light rig raised on truss with open sky beneath it, illuminated orange drape pillars near palms and a fountain, and a geometric floral entry installation. The rig description supports the open-sky light-canopy illusion; it does not establish site dimensions.

- [DFL event page](https://dflevents.com/portfolio/aekal-raatri)
- [Google Maps search for Sargam Farm, Ahmedabad](https://www.google.com/maps/search/?api=1&query=Sargam+Farm+Ahmedabad)

### DFL Garba Nights · private garden, Ahmedabad

DFL describes its 2025 event as an unnamed private Ahmedabad garden styled in deep red and orange, with lattice installations, marigold and mogra, glass diya pyramids, a raised red stage, torans, decorated trees, brass, terracotta and fresh flowers. Keep this as its own event-production reference; the garden's identity is not published in the cited story.

- [DFL event page](https://dflevents.com/portfolio/garba-nights)
- No venue map pin is asserted because the garden is unnamed.

### Sanedo Mandali Garba · Pleasant Party Plot, Ognaj

The organizer identifies Pleasant Party Plot, Ognaj, Ahmedabad as the venue. The user also supplied four Google Maps photo links; all four resolve to the Sanedo Mandali Garba place/photo listing. The images show temporary event production and should not be treated as permanent architecture at the party plot.

- [Sanedo organizer site](https://sanedomandaligarba.com/)
- [Google Maps search for the venue](https://www.google.com/maps/search/?api=1&query=Sanedo+Mandali+Garba+Pleasant+Party+Plot+Ognaj+Ahmedabad)
- [User map photo 1](https://maps.app.goo.gl/3seLGhC8tUbbigYi9)
- [User map photo 2](https://maps.app.goo.gl/y67srdzM5uKiWPYKA)
- [User map photo 3](https://maps.app.goo.gl/Y1F84647FfdGrnea7)
- [User map photo 4](https://maps.app.goo.gl/NmJBnpBBQupJdshD6)

The imagery referenced by this library is contained in the local folders under [`images/`](./images/). It is not hosted by the third-party event pages above.

## Kutch White Rann · Saltlight Circle

This is a fictional, unranked Garba design direction. It takes the White Rann's open, moonlit salt landscape and the wider Rann Utsav context of music and regional craft as inspiration. It does **not** recreate the actual Rann Utsav Tent City or claim a location, organizer, event history or measured site. The imagery treats the ground as a flat, salt-encrusted plain rather than a dune field.

The scene uses a low removable dance platform, a single perforated terracotta garbo lamp, two modest clay-colored entry panels with small geometric mirror details, a low musician dais, and three restrained round hospitality pods. The palette is salt white, indigo, madder/rust, cream and amber. It deliberately avoids elephants, alien elements, neon, forests, giant towers and a large enclosed tent. One image supplies the hero scene; the other boards cover aerial/elevation views and costume/material/prop cues.

The textile references draw on official Kutch Ajrakh descriptions of indigo, madder and geometric symmetry. Costume details are suggestions, not an asserted uniform Kachchhi dress: district sources describe multiple communities whose garment and embroidery styles differ. Likewise, mirror-work and Lippan Kaam are living, community-specific crafts; the generated panels are broad visual cues, not replicas of an artisan's work. Ask local makers to review any production design that uses these motifs.

Physical site, event permissions, dimensions, weather, footing and capacity have not been researched. The removable deck shown is a visual concept only; confirm the actual site and operating requirements before designing a build.

- [Official Rann Utsav · White Rann context](https://rannutsav.net/official-rann-utsav-website/)
- [Gujarat Tourism · Great Rann landscape and regional culture guide](https://gujarattourism.com/content/dam/gujrattourism/images/articles/festivals_6.pdf)
- [Ministry of Textiles · Kutch Ajrakh](https://handicrafts.gov.in/crafts/All_Crafts/Craft_Categories/Textile/Hand_Block_Printing/Kutch_Ajrakh/KutchAjrakhwebpage.html)
- [District Kachchh · handicrafts and Lippan Kaam](https://kachchh.nic.in/handicraft/)
- [District Kachchh · people and dress](https://kachchh.nic.in/people-of-kachchh/)

## Image-grouping audit

The 174 existing gallery images were rechecked in concept-specific contact sheets; confirmed outliers were opened full size. Seven clear cross-family placements are now corrected. All source-image bytes and original ZIP filenames remain preserved; only their research folders and descriptive metadata changed.

| Image | Previous group | Corrected group | Visual match |
| --- | --- | --- | --- |
| `ZIP-033` | Voltage Yard | Chandra Van | Banyan lounge pods and lanterns. |
| `ZIP-114` | Lotus Amphitheatre | Obsidian Fern Basin | Annotated basalt arena plan with violet flora and crystal lights. |
| `ZIP-135` | Deep-Jyot Chowk | Tideglass Terrace | Moonlit sea-facing dance court. |
| `ZIP-138` | Chitra Aangan | Lotus Amphitheatre | Modern glass pavilion with a lotus-lit floor; retained as a private-scale sibling variation. |
| `ZIP-040` | Chandra Van | Vrindavan Sandstone Courtyard | Nine-view stone-courtyard storyboard with no forest setting. |
| `ZIP-095` | Voltage Yard | Jyot Shikhar · Light Tower | Twin perforated amber metal towers; fits the light-tower family. |
| `ZIP-137` | Cyberpunk City Plaza | Obsidian Fern Basin | Pixel-identical to `user-ref-001`; re-homed and labelled `DUPLICATE`, not treated as a separate design. |

Obsidian Fern Basin remains a coherent open-air alien-world family. ZIP-037 and ZIP-038 remain in Chandra Van because the forest plan explicitly includes a temple shrine; ZIP-040 depicts a separate stone courtyard and was moved. The one duplicate gateway is still preserved and visible for archive provenance, but clearly marked so it is not mistaken for a second design.

## Source and interpretation notes

- The 174 existing references (160 ZIP JPEGs, 13 previous-review favorites and one supplied PNG) were visually rechecked in 16 concept-specific contact sheets. Confirmed outliers were opened full size and three new family leaks were corrected. The user-supplied 1376 × 768 gateway remains the Obsidian reference; ZIP-137 is pixel-identical and retained as a labelled source duplicate. The three new generated Kutch PNGs are additional unapproved design references. Grouping is an editorial choice, not a factual venue claim.
- The latest user export is dated `2026-10-02T13:59:17.910Z`: the original 12 concepts are ranked, Obsidian Fern Basin is first, 120 images are starred, and `review_complete` is false. The 13th Kutch concept is unranked, with three generated images and no favorites. The synchronized gallery contains 177 image files, 120 favorites and 57 unstarred images.
- ZIP image IDs (`ZIP-001` through `ZIP-160`), `user-ref-001` and the new `kutch-rann-*` IDs are stable for exports. Previous favorites use `prior-*` IDs.
- The first three research-list entries previously marked skipped remain skipped for now: GMDC Ground, Norta Nagari AC Dome, and Raas Ratri Farms.
- This pack covers visual references and a review queue. It does not make a final venue choice or carry out a 3D build.
