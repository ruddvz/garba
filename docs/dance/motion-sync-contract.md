# Beat-indexed movement and synchronization contract

This contract is the hand-off between research and a future player/character runtime. Step records describe a source-specific movement phrase. A separately curated song beat map relates the playing media time to musical beat positions. The runtime joins the two; neither document guesses BPM from a genre name.

## Clock model

Use a musical beat grid, not fixed animation milliseconds:

```text
mediaTimeSeconds -> beatPosition -> step event / rig pose
```

- `beatPosition` is a zero-based decimal count from the phrase anchor. Fractions such as `2.5` represent an event halfway between two beats.
- `phraseLengthBeats` belongs to one specific step variant. A routine called “14 steps” does not automatically have a 14-beat phrase.
- `songBeatMap` belongs to a particular recording/performance, never to the generic style label. It stores one or more reviewed `(beatPosition, mediaTimeSeconds)` anchors and confidence/source metadata. Piecewise segments handle a real tempo change.
- A profile's events repeat modulo its phrase only when that source's choreography repeats. Transitions happen at authored phrase boundaries.

The future adapter should query the production playback owner’s current media time on each animation update and derive the current beat position from the beat map. Do not advance a private interval counter: pause, seek, delayed frames, playback-rate changes and tab suspension would let it drift. On resume or seek, recompute directly from the playhead.

## Step record shape

The first `data/dance/steps.json` records use this contract. Unscored candidates keep `animationScore: null`; later scored records may use:

```json
{
  "phraseLengthBeats": 8,
  "events": [
    {
      "beatPosition": 0,
      "channel": "foot",
      "side": "right",
      "action": "plant",
      "travel": "forward-left-diagonal",
      "facing": "counterclockwise-tangent",
      "sourceTimestamp": "00:00:42.3",
      "confidence": "reviewed"
    }
  ]
}
```

The example illustrates fields only; it is not Garba instruction. Allowed channels should remain small and composable: `foot`, `hand`, `clap`, `prop`, `torso`, `pelvis`, `facing`, `travel`, and `accent`. Use explicit `side`, `action`, `target/gesture`, support foot, orientation and source timestamp where they apply. Unknown sides or event times stay unknown until reviewed; do not fill them with a generic left-right alternation.

An optional `visualReview` note may record sparse inspection timestamps and visible evidence (`sourceTimesSeconds`, `observations`, and `limitations`). It is descriptive source review only: it does not imply an event sequence, beat position, phrase length, or score. Only fully reviewed movement events belong in `events`; sparse visual samples must never be converted into a synthetic score.

## Beat map and tempo changes

Keep the beat map independent from the routine:

```json
{
  "recordingId": "canonical-recording-id",
  "sourceId": "source-id",
  "anchors": [
    { "beatPosition": 0, "mediaTimeSeconds": 12.42 },
    { "beatPosition": 1, "mediaTimeSeconds": 13.18 },
    { "beatPosition": 2, "mediaTimeSeconds": 13.93 }
  ],
  "reviewStatus": "human-checked"
}
```

Those numbers are placeholders in a format example, not a measured Garba track. Production data must use exact source recording identity and human-checked timing. Interpolate between adjacent anchors; preserve additional anchors where tempo changes. Do not extrapolate across an intro, pause, singer-led free-time section, or an unsupported player seek as if the pulse were steady.

## Character/ensemble mapping

- Every dancer playing the same song reads one shared beat map and transport position.
- A dancer chooses a reviewed `stepRecordId`/`variantId` linked to that song by explicit curation. Song genre alone is insufficient.
- Rig adapters translate canonical events to each character's joints. The score expresses intended motion, not skeleton-specific bone names.
- Treat circle progression, spacing and facing as authored choreography channels. A hand flourish, turn or jump can decorate a step only if the dancer reaches the intended position/facing at the next phrase boundary. One Reddit discussion offers this as an example for a single 14-beat routine; that anecdote motivates the field, but must not become a universal 14-beat rule.
- A group may use different reviewed variants or roles, but all should share the musical clock. Add intentional phase offsets only when the choreography calls for them; do not randomize each dancer's count.
- Use phrase-boundary transitions and a recovery pose. On an unknown/missing map or an unscored routine, do not pretend the character is precisely beat-locked.

## Data boundaries and limitations

- Do not put a single BPM on `dodhiyu`, `hinch`, or a music genre. Tempo varies by track and within a performance.
- Do not infer per-song beats from audio or microphone input in this lane. The earlier Atmosphere feature is a separate concern; this contract needs an approved, source-bound map.
- Keep source evidence and movement profile version beside the data. A corrected variant should not overwrite the earlier source's choreography.
- The current YouTube-only playback path may expose a playhead but not a verified musical beat track. In that case the score can still be authored, but runtime synchronization remains unavailable until a track beat map is curated.

## Runtime work sequence

1. Have a practitioner annotate and review a small set of source-specific routines.
2. Build beat maps for a small, known set of exact recordings.
3. Add a pure `mediaTime -> beatPosition` resolver and rig adapter in a separate claimed runtime lane.
4. Try it on pause, seek, rate changes, tempo changes, hidden-tab resume, and reduced-motion conditions.
5. Expand the source catalog and track mappings only after the reviewed clips look right at event tempo.
