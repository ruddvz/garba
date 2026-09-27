# Private Garba Circle

Private Garba Circle lets a group listen to the same YouTube recording at the same moment, each on their own phone and earbuds, with no PlayGarba backend. One person starts a circle and shares a link or QR code. Only people with the link can join, and nothing lists circles anywhere. Everyone who opens the link hears the same song at the same position, and the circle stays together from song to song.

It was called Garba Circle until 27 Sep 2026. The owner merged the Immersive prototype's hosted **Lives** into it, since both did the same job (issue #1760, from the feedback tracked in `docs/product/feedback-2026-09-27.md`).

## Two ways to start

- **Keep the music going:** starts with the song on screen, then the catalogue in one shared, shuffled order. The link format is unchanged, so older links still work.
- **Play your songs:** the song on screen, then the host's Up next, played in order and then from the top. It holds up to 30 songs. They can be catalogue songs, songs added on this device, or YouTube links pasted into **Play YouTube link**. While the circle is on, the host adds more with **Add to Up next** (or + in Immersive) or by pasting a link. New songs go on the end, so everything already playing keeps its place, and the dialog asks the host to share the new link. People still on the old link stay together until the old list would have started again. There is no server, so a changed list reaches others only through the new link.

Only the host adds songs. A guest who pastes a link or queues a song is told so, and stays in the circle.

## Finding it

- **Simple:** a chip above 24/7 LIVE reads **Private Garba Circle · Listen with friends**. Once you're in a circle it carries the circle's face and name. There is also a topbar button on desktop, and a row in More.
- **Immersive:** a **Circle** button at the top of the rail, and a tile in More. The dialog opens over the scene, so you stay in Immersive.

## Using it

- **Start:** tap the chip, the Circle button or the More row, then choose how the circle plays. The circle starts at your current position in the song on screen, so you keep listening without a jump. The dialog shows a QR code, the link, Copy link and, where the browser supports it, Share. The host can name the circle and give it a face; both travel in the link.
- **Join:** open the link. The player shows the circle's current song and a **Join circle** button. Browsers block autoplay without a tap, so that tap starts playback.
- **Pause:** allowed. Press Play again to jump back to where the circle is now.
- **Next/Previous:** the circle moves together, so these explain that instead of skipping. Choosing another song, genre, 24/7 Live Radio or Nonstop leaves the circle.
- **Leave:** use **Leave circle** in the dialog. Playback continues outside the circle.

## The link

Everything a phone needs is in the link's `circle` parameter (`assets/runtime/garba-circle.js`). The host's chosen name and face ride along as `n` and `f`.

- **Keep the music going:** `1.<seed>.<start>.<fingerprint>.<check>.<first song id>`.
- **Play your songs:** `2.<start>.<fingerprint>.<check>.<item>.<item>…`, where each item is one of:
  - `-` and a 7-character hash of a catalogue song's id, so thirty songs still make a QR code a phone can scan. Ids don't change, so the hash still finds the song after the catalogue grows. A song whose hash another catalogue song shares travels by its full id instead. Songs a listener added on their own device never answer to a hash.
  - `_`, the 11-character YouTube video id and the video's length in whole seconds (base 36), for anything not in the catalogue. The length travels with it because every phone has to agree on every song boundary, and no catalogue knows it. When YouTube hasn't reported a length yet, a hidden, muted player reads it before the song is added (`resolveYouTubeDuration` in `assets/runtime/my-songs.js`).

Links are checked exactly. A cut-off, edited or mistyped link is refused rather than half-read. A catalogue song the joining phone doesn't have, or a schedule that doesn't match the fingerprint, means the phones run different catalogue versions, and the guest is asked to reload.

## How sync works

Every phone builds the same song order from the link:

1. **Shared schedule.** For **Keep the music going**, each phone takes the songs that have a playable YouTube route (the same rule as 24/7 Live Radio) and a real catalogue duration over 10 seconds. It sorts them by id, shuffles them with the circle's seed and puts the host's song first. Songs without a verified duration are excluded rather than given a default, because a guessed length would move every later boundary.
   For **Play your songs**, the order is the host's list from the link, each catalogue song checked against the same rule.
2. **Fingerprint.** A hash of song ids, durations, video ids and chapter starts. A phone on a different catalogue version gets a different fingerprint and is told to reload, instead of joining a circle that plays something else. The check field separates a truncated or mistyped link from a real catalogue difference.
3. **Server-aligned clock.** Phone clocks are often seconds apart, so the circle does not trust them. Each phone sends a few uncached `HEAD` requests for `robots.txt` and reads the HTTP `Date` header. The header has one-second resolution, but it is exact. If the server stamped second `S` between local send time `s` and receive time `r`, the clock offset lies in `(S − r, S + 1000 − s)`. The phone intersects these intervals, times later probes so a server second boundary falls inside the remaining window, and stops after about 10 probes (under about 4 seconds). The midpoint is the offset and the half-width is the reported accuracy (for example "Clock matched to ±12 ms"). If the answers contradict each other, the phone retries once and then says the clock could not be checked.
4. **Position.** With the start instant from the link and the aligned clock, every phone computes the same song and offset. The schedule loops.
5. **Staying aligned.** The YouTube IFrame player stays the playback engine. About every 2 seconds, the phone reads the player's position over about 450 ms and compares the freshest reading with where everyone should be. Readings taken while the player is stalled are skipped. Corrections come from `assets/runtime/sync-correction.js`, which Live Radio shares:
   - **Seeks and loads take time to land.** A seek or a load resumes a few hundred milliseconds to a few seconds after it is requested, so it lands behind the target. Each phone learns its own load and seek delays from the first clean reading after each one, and aims ahead by that much. Readings more than 1.5 s off right after a seek are treated as stalls and not learned from.
   - **Small gaps are closed without a skip.** When the player offers playback rates, a gap under 0.6 s is closed by playing at 1.25× (behind) or 0.75× (ahead) for as long as it takes, at most 3 seconds. Larger gaps are seeks.
   - **Precision.** After a load, a resume or a catch-up seek, the phone keeps refining until it is within 30 ms. In steady state it corrects gaps over 60 ms when rate control is available, and over 0.35 s otherwise. If seeks keep repeating, that threshold widens so a struggling connection is not seeked constantly.
   - **Re-checks.** The phone re-checks the clock and realigns when the page becomes visible again or the network comes back.
6. **Song boundaries.** The YouTube runtime advances just before a song ends. In a circle, the advance waits for the circle's own boundary, then loads the next scheduled song at the circle's position.
7. **Recordings YouTube refuses.** Some videos cannot be embedded or have been removed. Every phone gets the same refusal, so each fills that song's slot the same way: it plays the following songs from the slot's start, then returns to the normal order when the slot ends. Phones stay together without talking to each other, including phones that join during that slot.

## Measured accuracy

Measured on one Mac (Chromium via Playwright, real YouTube, local server), with three pages in separate browser contexts, sampled once a second for 60 seconds across a song boundary, over three runs:

- Within a song, the worst gap between any two of the three phones had a median of 30–42 ms (maximum 53 ms).
- At a song boundary, one sample shows a spike of 0.2–1 s while each phone loads the next video. The gap is back under about 100 ms within a second, and at 20–40 ms within about 5 seconds.
- A phone pushed 2 seconds behind (as after an ad or a stall) was back within 30 ms of the others in 1–2 seconds.
- Against `https://playgarba.com/robots.txt`, the measured clock offset agreed with NTP (`sntp time.apple.com`) within the reported uncertainty (±23–37 ms) in all 11 runs.

These are best-case numbers. Real phones on mobile networks will be less precise.

## Limits

- **Ads and buffering.** YouTube can show ads or pause to buffer. That phone falls behind and catches up with a seek once playback resumes. Ads are left untouched.
- **Background throttling.** Phones may throttle or pause a background tab. The circle realigns when the page is visible again, but it cannot keep a throttled phone in sync while it is hidden.
- **Output latency.** The circle aligns what the YouTube player reports. Bluetooth earbuds add their own delay (often 100–300 ms), which differs between devices and cannot be measured from the page.
- **Clock accuracy.** Sync depends on each phone's round trip to the site. A slow or jittery connection gives a wider clock window, and the dialog shows the accuracy it reached.
- **Catalogue versions.** Everyone must be on the same catalogue version. A mismatch is detected and explained, not silently joined.
- **Songs.** Only YouTube recordings with a verified duration can be played in a circle. A song without one cannot start a circle. While a refused recording's slot is being filled, the following songs play a second time when their own slots come up.

## 24/7 Live Radio uses the same sync

Live Radio is a broadcast computed from the time, so it only matches across devices if the devices agree on the time. It now uses the same pieces as a circle (`assets/runtime/live-sync.js`):

- When Live Radio is turned on, playback starts at once on the phone's own clock, and the server-aligned clock is measured in the background. The next alignment moves the phone onto the broadcast. A measured clock is reused for ten minutes.
- The broadcast position keeps milliseconds (`createLiveTimeline` in `assets/runtime/live-station.js`). Which song plays, and its whole-second position, are unchanged.
- Each song opens at its exact broadcast position, aimed ahead by this phone's learned load delay. The same correction as a circle then keeps it on the broadcast: learned seek delays for large gaps, and brief 1.25×/0.75× playback for small ones.
- At a song boundary the phone goes to wherever the broadcast is now, instead of starting the next song from 0. If a recording ends before its broadcast slot, the phone waits for the slot to end.
- Next and Previous do not skip the broadcast. They explain that Live Radio plays the same moment for everyone.

## Privacy

There is no backend and no telemetry. Nobody is counted or listed. The link carries only what the circle plays: the seed or the list of songs, the start time and the fingerprint, plus the name and face the host chose. The clock probes are ordinary `HEAD` requests to the same site that served the page.
