# Garba Venue Visual Reference Library

This pack is the working visual source for future Garba venue concepts and 3D reconstruction requests. Open [`index.html`](./index.html) to browse the complete image set, mark image favorites, and arrange venue concepts into a saved build order. [`library.json`](./library.json) is the image and concept manifest used by the page.

## What is in this pack

- **160 original JPEGs** from the user-approved `Oct 02 - 03_48.zip`. They are copied without resizing or re-encoding, and their ZIP filenames and pixel dimensions remain in the manifest.
- **13 previously selected favorites** carried forward from the earlier Garba image review. The earlier set of rejected images is not imported here.
- **12 distinct working visual directions**, with reference overviews, scene views, plan studies, arrival details, materials, lighting, lounge details, and other supporting views grouped under one concept.
- **A venue-level build queue and image-level favorites.** Every archive image is marked approved because the user approved the ZIP. The star marks a favorite; the rank orders a concept for future work. These are separate choices.

All twelve directions start **unranked**. The page remembers edits in the current browser and can copy or download a portable JSON selection. Use **Review complete** only after you have gone through the image set. Until then, starred images export as `KEEP` and unstarred images export as `UNREVIEWED`. After the review is marked complete, unstarred images export as `REMOVE_FROM_ACTIVE_SELECTION`. Source files remain in the research archive either way. Share the exported JSON with Cloud Code or a later task to set the build order. If the browser blocks local storage, download the JSON after making changes.

## Working concept index

Counts include ZIP assets and, where applicable, the previously selected favorite image. A concept title describes a generated visual direction; it does not name a built venue.

| Working direction | Setting / visual identity | References | Previous favorites |
| --- | --- | ---: | ---: |
| [Obsidian Fern Basin](./images/obsidian-fern-basin/) | Open-air alien-world arena; basalt, ultraviolet flora and ember gold | 20 | 1 |
| [Jyot Shikhar · Light Tower](./images/jyot-shikhar-light-tower/) | Freestanding perforated metal light sculpture | 9 | 1 |
| [Resham Pavilion · Full-span Ribbon Canopy](./images/resham-textile-pavilion/) | Large open canopy illusion made from radiating red textile strips | 20 | 2 |
| [Voltage Yard](./images/voltage-yard/) | Indoor industrial warehouse with modern neon production | 26 | 2 |
| [Deep-Jyot Chowk](./images/deep-jyot-chowk/) | Temple-inspired courtyard, mandala lanterns and diyas | 19 | 1 |
| [Chandra Van](./images/chandra-van/) | Lush banyan garden, moonlight and bioluminescent accents | 12 | 1 |
| [Lotus Amphitheatre](./images/lotus-amphitheatre/) | Open-air stepped circle with a lotus dance-floor motif | 14 | 0 |
| [Violet Lantern Grove](./images/violet-lantern-garden/) | Private tree garden, woven lanterns and a quiet lounge pod | 13 | 1 |
| [Cyberpunk City Plaza](./images/cyberpunk-city-plaza/) | Neon urban plaza with skyline and elevated transit | 14 | 2 |
| [Tideglass Terrace](./images/tideglass-terrace/) | Moonlit sea-facing terrace with coastal planting | 12 | 1 |
| [Chitra Aangan](./images/chitra-aangan/) | Devotional art panels within a tree courtyard | 5 | 1 |
| [Vrindavan Sandstone Courtyard](./images/vrindavan-sandstone-courtyard/) | Heritage-inspired carved stone court and warm lamps | 9 | 0 |
| **Total** | 12 visual directions | **173** | **13** |

The 20–40 guest, mid-size, or large-event labels in the gallery indicate a **design fit to explore**, not certified capacity. A real site still needs verified dimensions, circulation, egress, fire and structural review.

## Build instructions for Cloud Code

When the user asks to build or reconstruct a venue:

1. Read the latest exported JSON if the user provides one. Start with the concept at priority rank `1`, then follow the remaining `priority_order` in sequence. If there is no export or no ranked concept, do not infer a build order from stars; ask the user which concept to start, or proceed only when the prompt clearly selects one.
2. Treat a concept as one coherent visual family. Use its **entire grouped image set**, especially its multi-view concept board, plan studies, angle studies, material details, lounge/arrival views, and clothing references. Do not merge different concept families unless asked.
3. Distinguish image-level favorites from venue-level priority. Favorites refine which visual references the user likes; the ranked concept list controls what to build first. When `review_complete` is true, remove unstarred images from the active shortlist only; keep the original files and research record. When it is false, unstarred images are still unreviewed.
4. Keep the concept visually distinct. Vary the lighting language, props, textiles, architecture, color, and wardrobe between venues. Do not repeat the same elephant motif or the same red styling across every design. The Jyot Shikhar tower is its own signature object; it is not a default prop.
5. For **Resham Pavilion**, use the corrected full-span canopy reference: a very large, open framework of radiating hanging strips that creates a dome illusion. It is not a solid enclosed dome, and the upper treatment spans the dance floor rather than covering one small section.
6. Keep **Chandra Van** organic and garden-led. Keep **Obsidian Fern Basin** as its own open, extraterrestrial basalt arena with luminous flora and a visible ringed planet. Preserve the open sky; do not turn either into a generic indoor room.
7. Use the people and clothing in the references as wardrobe cues. Vary garments and color stories with the venue rather than dressing every crowd alike. Keep Gujarati/Navratri details culturally coherent and readable.
8. These are visual concepts and user-approved image references, not surveys. Image pixel dimensions are not physical venue measurements. Do not infer exact floor dimensions, truss ratings, guest counts, safety clearances, site addresses, or permanent architecture from generated boards.
9. Keep published real-event observations separate from generated concept directions. Aekal Raatri, DFL Garba Nights and Sanedo are documented below. For the unnamed DFL garden, do not invent a venue name or map pin.

## Published event references

These references are factual production context, separate from the twelve generated visual directions.

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

## Source and interpretation notes

- The ZIP JPEGs were created in earlier concept iterations and supplied by the user as approved references. The gallery places each image in one primary visual family so the archive is navigable; if an individual image is an adjacent variant, preserve its original filename and use judgment rather than treating the grouping as a factual venue claim.
- The earlier favorites were imported from the previous review's explicit `favorite=true` selection. Only those thirteen are starred on first open. All ZIP images start approved but unstarred.
- The image captions are derived from source filenames; image IDs (`ZIP-001` through `ZIP-160`) are stable for exports. Previous favorites use `prior-*` IDs.
- The first three research-list entries previously marked skipped remain skipped for now: GMDC Ground, Norta Nagari AC Dome, and Raas Ratri Farms.
- This pack covers visual references and a review queue. It does not make a final venue choice or carry out a 3D build.
