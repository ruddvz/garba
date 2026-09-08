# Garba Atmosphere

Garba Atmosphere is an optional ambient layer that sits underneath whichever song or provider route the listener is using. It is deliberately separate from the music master so the feature can be turned off instantly and does not modify catalogue audio.

## Product modes

- **Off** — original song only.
- **Courtyard** — a quiet locally generated room/crowd texture with sparse spatial dandiya and clap accents.
- **Live Ground** — the local event layer plus a low-level public-domain stereo crowd bed when it can be fetched. If the bed is unavailable, the local procedural scene continues by itself.
- **Immersive 360°** — an HRTF spatial scene intended for headphones. Several locally generated ambience voices and short event accents are positioned around the listener and move slowly through the sound field.

The listener can also set the atmosphere level. The default product gain is intentionally low so the song remains dominant.

## What “Immersive 360°” means in v1

The browser runtime uses the Web Audio API `PannerNode` with the `HRTF` panning model. The output is binaural/stereo and positions independent ambience sources around the Web Audio listener.

This is **not** head-tracked audio and it is **not** a claim that the source recording itself is an Ambisonic 360-degree capture. The user-facing name describes the spatial listening mode. Internally the product should continue to call the implementation an HRTF spatial scene.

A future true-360 source path may accept first-order Ambisonic B-format assets and decode them to binaural output, ideally in an `AudioWorklet`. That should be a separate source contract rather than silently treating conventional stereo as Ambisonics.

## Source policy

`data/atmosphere-sources.json` is the provenance manifest for any real-world atmosphere recordings used by the feature.

The first enabled crowd bed is a public-domain stereo field recording from Wikimedia Commons/PDSounds. It contains ordinary crowd/mall murmur rather than a Garba song. PlayGarba uses it only as a low-volume environmental bed.

The manifest also records a public-domain applause source as a reference, but it is disabled in v1. Sparse applause and dandiya accents are generated locally instead so the experience does not repeatedly expose a recognisable event recording.

Do not add a festival or Garba-ground field recording merely because its file licence looks permissive. If copyrighted music or a performance is audible inside the recording, the sound-recording licence alone may not clear the captured music. Prefer atmosphere assets with no embedded music, project-owned recordings, or clearly documented rights for every audible layer.

## Runtime architecture

`assets/runtime/immersive-atmosphere.js` owns the feature.

The runtime:

1. injects a small atmosphere button into the existing player utility row;
2. opens an accessible mode/level panel without changing the central player state;
3. creates its own `AudioContext` only after a trusted user gesture;
4. builds low-gain procedural ambience voices;
5. places spatial voices and event accents with HRTF `PannerNode`s;
6. optionally loads the enabled public-domain stereo crowd bed;
7. falls back to the local procedural scene when the remote bed fails or the listener is offline;
8. mutes the atmosphere while the page is hidden;
9. persists mode and level locally;
10. exposes `window.GARBA_ATMOSPHERE` for QA and future coordination.

The runtime does not route provider audio through the atmosphere graph and does not alter provider volume. This is important because YouTube, Apple Music, Spotify, Amazon Music and other provider playback surfaces are independently controlled.

## Interaction with AutoMix

Garba Atmosphere is intentionally independent from the AutoMix engine. AutoMix may use a separate Web Audio graph for authorised direct masters. Atmosphere is a low-level environmental bus and must not become part of song-transition gain calculations.

If both features are active, the song transition should happen above a stable atmosphere bed. This helps the transition feel like one continuous physical venue rather than two unrelated recordings fading through silence.

## Mobile and PWA behaviour

Mobile Safari and installed PWAs can suspend Web Audio until the user performs a trusted interaction. The runtime therefore unlocks its context from the atmosphere controls and normal player gestures.

The executable atmosphere runtime is part of the PWA shell and remains available offline. The optional real-world crowd bed is not required for offline operation; the local HRTF/procedural layers are the fallback.

## QA priorities

Test with:

- iPhone speaker;
- AirPods/headphones;
- Android Chrome with wired/Bluetooth headphones;
- desktop Safari/Chrome/Firefox;
- Data Saver/offline mode;
- direct audio and provider-backed playback;
- AutoMix enabled and disabled once direct masters exist.

Listen specifically for masking of vocals, excessive high-frequency dandiya clicks, fatigue from constant crowd energy, abrupt atmosphere changes when switching modes, and Web Audio suspension/resume failures.

## Next audio-content phase

The best production version should eventually replace generic crowd ambience with project-owned or explicitly cleared Indian/Navratri venue recordings captured specifically for PlayGarba. A useful recording session would capture separate stems or perspectives:

- diffuse crowd murmur without music;
- sparse cheers;
- hand claps;
- dandiya stick impacts;
- footsteps/ground movement;
- small courtyard room tone;
- large open-ground ambience;
- true Ambisonic room/ground capture if suitable equipment is available.

Keeping those layers separate gives the runtime much better control than one baked “live Garba” recording.
