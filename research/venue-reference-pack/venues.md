# Garba Venue Visual Reference Library

This pack is the working visual source for future Garba venue concepts and 3D reconstruction requests. Open [`index.html`](./index.html) to browse the complete image set, mark image favorites, and arrange venue concepts into a saved build order. [`library.json`](./library.json) is the image and concept manifest used by the page.

## What is in this pack

- **160 original JPEGs** from the user-approved `Oct 02 - 03_48.zip`, copied without resizing or re-encoding with ZIP filenames and pixel dimensions preserved in the manifest.
- **One directly user-supplied PNG** added to Obsidian Fern Basin as the ringed-world crystal gateway reference. Its original 1376 × 768 pixels and bytes are preserved.
- **Three generated Kutch concept images**: a moonlit hero, one aerial/elevation/detail board, and one clothing/material/prop board. All remain labelled `GENERATED` and `user_approved: false`; the hero and clothing/material study are now favorites, while the multi-view board remains unreviewed.
- **Four generated Nabha Orbital concept images**: a shuttle-cabin hero, orbital exterior, six-view geometry board, and wardrobe/material/prop study. All remain `GENERATED`, unapproved, unstarred and unranked until review.
- **122 current favorites** in the latest export: the previous 120 selections plus two generated Kutch images. The user-supplied Obsidian gateway remains unstarred.
- **14 distinct visual directions**: the latest export ranks 13; Nabha Orbital was appended afterward and remains unranked. Supporting views stay grouped by concept.
- **A venue-level build queue and image-level favorites.** Image stars and concept ranks are separate choices.

The latest user export ranks the original 13 directions, with **Obsidian Fern Basin first** and **Kutch White Rann at rank 13**. Nabha Orbital was added after that export and starts unranked with four unstarred images; no previous selection changed. The page remembers browser edits and can copy or download a portable JSON selection. Review remains open: favorites export as `KEEP`, and unstarred images as `UNREVIEWED`. If review is marked complete, unstarred images export as `REMOVE_FROM_ACTIVE_SELECTION`; source files remain in the archive. Exports include every image under `reference_images`; `approved_reference_images` remains a compatibility list for user-approved sources. Share the JSON with Claude Code or a later task to set the build order. Merge older exports into the current manifest rather than dropping later references.

## Working concept index

Rows follow the latest user priority order; Kutch is ranked 13th and Nabha Orbital is unranked. Counts include the ZIP archive, prior-review images, the user-supplied gateway, three Kutch images and four new orbital concept images. ZIP-137 is pixel-identical to the supplied gateway and is marked as a duplicate. The Kutch hero and clothing/material study are favorites; its multi-view board and the Obsidian gateway remain unstarred. Kutch and orbital images retain generated, unapproved provenance.

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
| 13 | [Kutch White Rann · Saltlight Circle](./images/kutch-white-rann/) | Fictional, open salt-plain Garba concept; moonlight, indigo and terracotta | 3 | 2 |
| — | [Nabha Orbital · Glasswing Garba](./images/nabha-orbital-garba/) | Fictional shuttle cabin, panoramic nebula glazing and original gyroscopic Garbo lamp | 4 | 0 |
| **Total** | **13 ranked + 1 unranked direction** |  | **181** | **122** |

The unranked orbital concept is [Nabha Orbital · Glasswing Garba](./images/nabha-orbital-garba/); its four generated images remain unstarred until review. The user-supplied Obsidian reference is [the ringed-world crystal gateway](./images/obsidian-fern-basin/user-ref-001-ringed-world-crystal-gate.png). The separate ZIP-137 archival copy has the same pixels and is explicitly tagged `DUPLICATE`.

The 20–40 guest, mid-size, or large-event labels in the gallery indicate a **design fit to explore**, not certified capacity. A real site still needs verified dimensions, circulation, egress, fire and structural review.

## Build instructions for Claude Code

For a 3D venue build, read `library.json` and this guide first, then load the newest exported selection if the user provided one. Use the manifest as the authority for concept IDs, image IDs, provenance, favorite state and paths. Resolve each image `path` from the `research/venue-reference-pack/` directory and open the source image at full resolution; the gallery is a review interface, not a substitute for the image assets. Start only the concept selected by the user's request and current `priority_order`.

When the user asks to build or reconstruct a venue:

1. Match stable image IDs to the current manifest. Exports can predate later additions, so apply their ranks and favorites without removing newer assets; retain `user-ref-001` unless the user explicitly removes it. Use `reference_images` for all sources and `approved_reference_images` only for user-approved sources. Build in `priority_order`, starting at rank 1. The latest export ranks 13 directions, with Kutch at rank 13. Nabha Orbital was added afterward and remains unranked; do not build it unless a later user selection ranks it. Build order comes from `priority_order`, never from image favorites.
2. Treat a concept as one coherent visual family. Inspect its full-resolution images, including multi-view boards, plans, materials, lounge/arrival views and clothing references. Favorites mark `KEEP`; unstarred images remain unreviewed while review is open. Kutch remains generated concept art with `user_approved: false`; its selected hero and clothing/material study are not real-venue documentation. Nabha Orbital has four generated, unapproved, unstarred images. Do not merge families, and use the `DUPLICATE` badge to avoid treating ZIP-137 as a second Obsidian design.
3. Begin with **Obsidian Fern Basin** at priority 1. The latest export marks 122 images as favorites and leaves review incomplete. Obsidian now has 23 image files, 14 favorites, including the later user-supplied gateway and its visibly tagged ZIP duplicate. Distinguish image-level favorites from venue-level priority. Favorites refine which visual references the user likes; the ranked concept list controls build order. When `review_complete` is true, unstarred images leave the active shortlist only; keep source files and the research record. When it is false, unstarred images remain unreviewed.
4. Keep the concept visually distinct. Vary the lighting language, props, textiles, architecture, color, and wardrobe between venues. Do not repeat the same elephant motif or the same red styling across every design. The Jyot Shikhar tower is its own signature object; it is not a default prop.
5. For **Resham Pavilion**, use the corrected full-span canopy reference: a very large, open framework of radiating hanging strips that creates a dome illusion. It is not a solid enclosed dome, and the upper treatment spans the dance floor rather than covering one small section.
6. Keep **Chandra Van** organic and garden-led. ZIP-038 remains in Chandra because ZIP-037's forest plan explicitly includes a temple shrine; ZIP-040's separate stone-courtyard storyboard is grouped with Vrindavan Sandstone. Keep **Obsidian Fern Basin** as its own open, extraterrestrial basalt arena with luminous flora and a visible ringed planet. Preserve the open sky; do not turn either into a generic indoor room.
7. Use the people and clothing in the references as wardrobe cues. Vary garments and color stories with the venue rather than dressing every crowd alike. Keep Gujarati/Navratri details culturally coherent and readable.
8. These are visual directions, not surveys. Some archive images are user-approved; all three Kutch images remain generated and `user_approved: false`, including its two favorites. All four Nabha Orbital images are generated, unapproved, unstarred and unranked. Pixel dimensions are not venue measurements. Do not infer floor dimensions, truss ratings, guest counts, safety clearances, passenger limits, window ratings, site addresses or permanent architecture from generated boards.
9. Keep published real-event observations separate from generated directions. Aekal Raatri, DFL Garba Nights and Sanedo are documented below; Kutch is a generated direction informed by landscape and craft context, not an existing venue. Nabha Orbital is a separate fictional spacecraft concept, not an existing venue or engineered shuttle. For the unnamed DFL garden, do not invent a venue name or map pin.

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

This is a fictional Garba design direction ranked 13th in the latest user export. It takes the White Rann's open, moonlit salt landscape and the wider Rann Utsav context of music and regional craft as inspiration. It does **not** recreate the actual Rann Utsav Tent City or claim a location, organizer, event history or measured site. The imagery treats the ground as a flat, salt-encrusted plain rather than a dune field.

The scene uses a low removable dance platform, a single perforated terracotta garbo lamp, two modest clay-colored entry panels with small geometric mirror details, a low musician dais, and three restrained round hospitality pods. The palette is salt white, indigo, madder/rust, cream and amber. It deliberately avoids elephants, alien elements, neon, forests, giant towers and a large enclosed tent. One image supplies the hero scene; the other boards cover aerial/elevation views and costume/material/prop cues.

The textile references draw on official Kutch Ajrakh descriptions of indigo, madder and geometric symmetry. Costume details are suggestions, not an asserted uniform Kachchhi dress: district sources describe multiple communities whose garment and embroidery styles differ. Likewise, mirror-work and Lippan Kaam are living, community-specific crafts; the generated panels are broad visual cues, not replicas of an artisan's work. Ask local makers to review any production design that uses these motifs.

Physical site, event permissions, dimensions, weather, footing and capacity have not been researched. The removable deck shown is a visual concept only; confirm the actual site and operating requirements before designing a build.

- [Official Rann Utsav · White Rann context](https://rannutsav.net/official-rann-utsav-website/)
- [Gujarat Tourism · Great Rann landscape and regional culture guide](https://gujarattourism.com/content/dam/gujrattourism/images/articles/festivals_6.pdf)
- [Ministry of Textiles · Kutch Ajrakh](https://handicrafts.gov.in/crafts/All_Crafts/Craft_Categories/Textile/Hand_Block_Printing/Kutch_Ajrakh/KutchAjrakhwebpage.html)
- [District Kachchh · handicrafts and Lippan Kaam](https://kachchh.nic.in/handicraft/)
- [District Kachchh · people and dress](https://kachchh.nic.in/people-of-kachchh/)

## Nabha Orbital · Glasswing Garba

This is a fictional venue direction added after the latest 13-concept user export. It is **unranked**, and all four generated images are **unapproved and unstarred**. It does not change the saved 122 favorites or the existing build order. The gallery places it after ranked venues so it can be reviewed independently.

The Garba gathering sits inside an original orbital shuttle cabin designed to feel operational: visible bulkheads, pressure-window frames and seals, handrails, an airlock threshold, bridge consoles and perimeter seating. A broad sealed panoramic window wall frames a nebula, a distant ringed world and small escort craft. The center remains a clear Garba circle around an original gyroscopic Garbo lamp with a safe amber LED glow. Gujarati Navratri dress and textile cues warm the spacecraft without repeating another venue’s props or color story.

Keep it visually separate from Obsidian Fern Basin: no basalt arena, alien ferns, crystal gateway or elephant motif. The shuttle has a newly imagined utility profile; no franchise logos, signature markings or copied craft silhouette. “Quinjet” is only the user’s broad space-adventure mood reference, not an instruction to reproduce a protected vehicle. The six-view board gives plan, interior, exterior and airlock cues; the second study separates clothing, textiles, centerpiece, materials and cabin details. These are concept-art references, not engineering plans; they establish no real craft, window rating, passenger limit, event capacity, dimensions or safe flight configuration.

The four assets are `orbital-garba-cabin-hero`, `orbital-garba-exterior-orbit`, `orbital-garba-multiview` and `orbital-garba-material-study`, all under [`images/nabha-orbital-garba/`](./images/nabha-orbital-garba/).

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
- The latest user export is dated `2026-10-02T21:11:18.021Z`: it ranks 13 concepts, with Obsidian first and Kutch 13th, selects 122 images and leaves `review_complete` false. Kutch’s hero and clothing/material study are favorites; its multi-view board remains unreviewed. The four orbital assets were added after this snapshot and remain unstarred and unranked. The current gallery has 181 images, 122 favorites and 59 unstarred references.
- ZIP image IDs (`ZIP-001` through `ZIP-160`), `user-ref-001`, `kutch-rann-*` and `orbital-garba-*` IDs are stable for exports. Previous favorites use `prior-*` IDs.
- The first three research-list entries previously marked skipped remain skipped for now: GMDC Ground, Norta Nagari AC Dome, and Raas Ratri Farms.
- This pack covers visual references and a review queue. It does not make a final venue choice or carry out a 3D build.
