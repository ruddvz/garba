# Garba movement and character motion

This folder is PlayGarba's source-backed movement notebook. It separates a dance form, a named step pattern, a teacher's counted routine, and an individual movement motif. Those labels often overlap in public tutorials, but they are not interchangeable.

## Start here

- [Step and form inventory](step-catalog.md) records names, known movement facts, source scope, and open questions.
- [Beat and motion contract](motion-sync-contract.md) defines how a future character rig can play an authored sequence against a song beat map.
- [Sources and instructor review](sources.md) records the research trail, tutorial shortlist, community discussion, creator contact route, and use-rights questions.
- [`data/dance/steps.json`](../../data/dance/steps.json) is the linked machine-readable index. Each record has source IDs; those IDs resolve in `sources.md`.

## Current status

The current JSON holds 65 attributed records across named patterns, source-specific video routines, teaching-count variants and related folk forms. That is not a claim of 65 unique traditional steps. The inventory is **not** a complete Garba encyclopedia and is not animation-ready choreography. We do not yet have a complete, frame-by-frame, practitioner-reviewed foot/hand/body score for every named variation. The JSON therefore keeps its `animationScore` empty until a specific routine has been observed and checked.

The broadest single-channel Garba-specific teaching archive found so far is [Sathiya Garba International](https://www.youtube.com/@sathiyagarba), choreographer Hiren Patel's verified channel. Its playlists cover many named step families, hand movements, Timli, Dandiya, couple Garba and counted routines; it is a research source pool, not a universal authority. For high-reach beginner videos, [Pebbles Gujarati](https://www.youtube.com/watch?v=pbdv917Enns), [Akshay Bhosale](https://www.youtube.com/watch?v=NJWvOmWRnCo) and [LiveToDance with Sonali](https://www.youtube.com/watch?v=M2GO52YmBek) are also indexed. See [the comparison and evidence notes](sources.md#creator-shortlist).

## How we will grow this

1. Keep adding source-labeled names and variants to the inventory without forcing a single spelling or definition.
2. Select a small set of public tutorials and annotate them at normal speed, frame by frame: foot contact, travel direction, turn/facing, hands/claps/props, torso level, and exact beat position.
3. Ask Gujarati Garba practitioners to review each score and its attribution before marking it playable.
4. Add manually sourced beat maps for chosen tracks and associate each track with reviewed step profiles.
5. Build the character-animation consumer in its own claimed runtime lane. It should sample the production playback clock and the beat map; it should not infer a dance style from a vague genre label.

The file-level boundary and acceptance for this first docs/data tranche are tracked in [issue #2125](https://github.com/ruddvz/garba/issues/2125). Production player, avatar, audio-analysis, and catalogue changes are intentionally separate work.
