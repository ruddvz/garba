# Garba Atmosphere

Garba Atmosphere is an optional ambient layer that sits beneath the selected song. It is off by default and never modifies the source music file. The goal is to add a restrained sense of venue, crowd and spatial presence without masking vocals, percussion or melody.

## Modes

- **Off**: original song only.
- **Courtyard**: subtle room texture with light locally generated clap and dandiya accents.
- **Live Ground**: adds a very quiet stereo crowd bed when allowed, plus local clap and dandiya accents.
- **Immersive 360°**: uses browser-native HRTF binaural positioning to place local ambience around the listener. Headphones are recommended.

Immersive 360° is a binaural Web Audio experience. It is not Dolby Atmos, head-tracked audio or a true Ambisonic recording. Future PlayGarba-owned Ambisonic stems can extend this system without changing that distinction.

## Audio architecture

The Atmosphere runtime builds a separate Web Audio graph. Procedural room voices, clap transients, dandiya transients and the optional crowd bed are filtered before they reach a dynamics compressor and the Atmosphere master gain. Mode gain ceilings are intentionally low so the layer remains environmental rather than becoming a second soundtrack.

Spatial voices use `PannerNode` with the `HRTF` panning model where applicable. Reduced-motion users receive a stationary spatial scene rather than continuously orbiting sources.

## Playback coordination

Atmosphere follows playback state instead of the settings panel. Direct audio and controllable PlayGarba playback can start, pause and resume the scene with the music. When the page is hidden, the Atmosphere master fades down and Web Audio processing is suspended after the idle window.

Opaque third-party provider embeds cannot expose reliable internal play and pause state to PlayGarba. In those cases Atmosphere fails conservatively instead of allowing crowd ambience to continue when music may have stopped.

Selecting a mode while music is paused can play a short preview from a trusted user gesture. The preview ends automatically and does not turn into an independent background soundtrack.

## Data and power behaviour

Data Saver and constrained connections disable remote crowd downloads. They also reduce the number of local ambient voices and event frequency. The feature still works through the procedural local scene.

The runtime keeps remote audio optional. Failure to fetch or decode a remote ambience source falls back to locally generated texture rather than failing playback.

## Source provenance

Remote ambience is governed by `data/atmosphere-sources.json`. An enabled source must:

- be explicitly marked `public-domain`;
- explicitly state that it contains no embedded music;
- use HTTPS;
- remain optional at runtime.

The current enabled crowd bed is public-domain environmental ambience. It is not a Garba performance and is never treated as a song master. Runtime applause and dandiya accents are generated locally so recognisable event recordings are not repeatedly looped beneath songs.

## UX and accessibility

The toolbar control exposes Off, Courtyard, Live Ground and Immersive 360°. The panel behaves as a modal surface with focus trapping, Escape-to-close, background inertness, focus restoration and mobile bottom-sheet sizing. Mode and intensity preferences persist locally.

Immersive mode is labelled as headphone-oriented. Reduced-motion preferences disable spatial orbiting. Data Saver status is surfaced inside the panel when remote ambience is disabled.

## Production packaging

GitHub Pages concatenates `assets/runtime/immersive-atmosphere.js` into the existing network-first deployed `app.js` payload. This avoids another production runtime request and keeps installed PWA updates on the same freshness path as the core player.

`data/atmosphere-sources.json` is deployed with the existing data directory and is already covered by the service worker's network-first JSON policy.

## QA checklist

Before changing Atmosphere audio or UI, verify:

1. Off produces no Atmosphere audio.
2. Courtyard, Live Ground and Immersive 360° remain quieter than the music at default intensity.
3. Play, pause and resume coordinate correctly with controllable playback.
4. Backgrounding the page mutes and later suspends Atmosphere processing.
5. Data Saver prevents the remote crowd request and leaves local ambience functional.
6. Reduced Motion keeps spatial sources stationary.
7. Offline or failed remote audio still leaves a usable local scene.
8. Mobile Safari and installed iOS PWA can unlock Web Audio from a trusted gesture.
9. Keyboard focus stays inside the open panel and returns to the Atmosphere button on close.
10. Opaque provider playback never causes Atmosphere to continue independently of an unknown playback state.
