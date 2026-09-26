# Playing straight away, Explore and your own songs

## Genre taps play straight away

Tapping Traditional, Dandiya, Devotional, Folk or Fusion in the player starts a song in that genre right away. It picks a song that is its own complete video and has not been heard recently. If the genre has no complete songs, it picks a chapter instead. Tapping the genre that is already playing opens its song list.

## Playable songs first

Every song list (a genre, My Garba, search) shows songs in three groups, keeping the list's own order inside each group (`assets/runtime/playable-order.js`):

1. **Complete songs:** the song is a whole YouTube video.
2. **Chapters:** the song is a timestamped part of a longer jukebox or Nonstop video.
3. **Not playable here yet:** there is no verified playable route. These songs stay listed, dimmed, under their own heading, so they can be mapped later.

A chapter is never swapped for another upload that happens to share its title. Most same-title uploads are different recordings, and a playable link has to match the recording it names.

There is no per-song popularity data yet. The catalogue only has artist tiers and Spotify monthly listener counts. Popularity ordering can be added inside each group once that data exists.

## Explore over the player

The Explore control opens the full Explore page (`/explore/`) over the player instead of the small song sheet. The music keeps playing underneath. Explore talks to the player through `src/catalogue/explore-continuity-bridge.js`: **Listen** plays the song in the player (keeping its release context when it has one), and **Close** returns to the player. The browser Back button also closes Explore. Opening the link in a new tab or window still opens Explore as its own page.

## Add a song

The first row of a genre list and of My Garba is **Add a song from YouTube** (`assets/runtime/my-songs.js`).

1. Paste a YouTube link. Any common form works: `watch?v=`, `youtu.be`, Shorts, embed, live or YouTube Music. Other sites and look-alike hosts are rejected.
2. PlayGarba reads the video's title and channel from YouTube's public oEmbed endpoint, without cookies, and cleans them up. For example, "Rang Taali | Aishwarya Majmudar | Official Video | Navratri 2023" becomes the title "Rang Taali" by "Aishwarya Majmudar". If YouTube does not answer, you type the name.
3. Check the name and artist, choose a category, then **Add and play**.

If the link is a song the catalogue already has as a complete video, PlayGarba plays the catalogue song instead of adding a copy.

Added songs:

- are saved on this device only (browser storage) and appear in their genre list and in My Garba, marked "Added by you";
- never enter 24/7 Live Radio or Garba Circle, because those must be identical on every device;
- can be removed from the Add a song dialog;
- can be sent for the shared catalogue with **Suggest for PlayGarba**. This opens a prefilled "Missing music" issue on GitHub. Nothing is added to the catalogue without review.

Playing audio files from the phone is not supported. The player plays YouTube only.
