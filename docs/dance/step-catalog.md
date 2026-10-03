# Garba step and movement inventory

This is a broad working inventory, not a claim that every community uses one fixed step list. Garba is participatory and locally variable; tutorial labels can name a foot pattern, a count, a complete choreography, or a styling idea. The record in [`data/dance/steps.json`](../../data/dance/steps.json) preserves those distinctions and links every statement to its source.

## Terms we keep separate

| Record type | What it means here | Example |
| --- | --- | --- |
| Dance form or repertoire | A form, song/lyric practice, devotional section, or prop-based dance tradition | Garba, Raas/Dandiya, Timli, Sanedo, Aarti |
| Step pattern | A recurring foot/travel/clap pattern | Be Taali, Tran Taali, Hinch, a source-specific Dodhiyu |
| Counted routine | A teacher's sequence labeled by a number of steps or movement units | Sathiya's 14-step routine; Dance FreaX's 12/14-count Garba routines |
| Movement motif | A detail that can be combined with a pattern | turn, clap-and-snap, arm swing, jump, forward bend |
| Song or performance label | A label that may describe lyrics, music, an event, or a choreographed piece | Sanedo, Dakla, Ram Leela |

Do not convert all of these to one `step` enum. `Aarti` is a devotional repertoire/moment, not a footwork pattern. `Sanedo` can name a song/folk form with associated dancing. `Dandiya Raas` uses sticks and partner/group relations; it is not an alias for clap-based Garba. `Timli` and `Garbi/Garbo` stay separate labels unless a source explicitly documents a combination.

## Candidate vocabulary

The names below have public source evidence, but some still need a Gujarati-script spelling check and practitioner review.

| Family | Names currently found | What can be said safely now | Still needed for character motion |
| --- | --- | --- | --- |
| Clap-count labels | Ek/1 Taali; Be/Bey/2 Taali; Tran/Teen/3 Taali; creator/Reel titles such as 5/7/9 Taali | Scholarship directly discusses two- and three-clap patterns; creator channels publish higher-numbered labels. A title alone doesn't establish whether a count is claps, movement units or a routine name. | Exact cycle length, which foot lands on each count, clap positions, and what the count represents. Keep 5/7/9 as source-specific discovery leads until a teacher explains them. |
| Dodhiyu/Dodhiya routines | 6, 6.5, 8, 10, 12, 14, 24 and 32 beats in one interview; Sathiya's 12-, 14- and 31/32-step tutorial labels | One practitioner's interview gives those beat lengths as personal Dodhiyu variants. Sathiya separately publishes 12-, 14- and 31/32-step Dodhiya-labelled tutorials. Keep “step count” separate from beat length; 9-step and 19/22 Rangat remain separate teacher labels unless the source explicitly links them to Dodhiyu. | Treat a teacher's “14 steps” as a named movement-unit count until the video itself proves its beat phrase length. Annotate each choreography separately. |
| Other numbered teacher routines | 4-, 5-, 6-, 8-, 9-, 10-, 14-, 21- and 31/32-step lesson titles | Separate teachers publish numbered lessons, beginner series, “actions,” and step compilations. The sources include a Sonali 10-step lesson, Akshay Bhosale 5- and 21-step videos, 6-/8-step Dodhiya lessons, nine-step teaching labels and multiple other count-labeled routines. These counts do not all mean beats and do not count unique traditional step families. | Keep each teacher/video ID and count label; don't attach a count to Dodhiyu, Taali or another family without evidence. Enumerate every move from the source before treating the title as a list. |
| Traveling, turning and clap patterns | Hinch/Heench; Ranjaniyu/Ramajaniyu; Popat; Popatiyu; Titodo; Tetudo; Chal; Chal with double-back jump; Matukadi | Sources give partial movement descriptions: walking for Chal; a high jump after every 3–4 steps in one Chal variant; three forward/two back for one Popat; pair bounce/clap for Heech; circular travel for Kutchi Thekda. Matukadi describes dancing around a ritual pot/formation in the cited guide, not a freestanding foot pattern. | Keep similar names separate until a teacher or Gujarati source confirms spelling and sequence. Capture lead foot, travel vector, clap count/positions, turn and phrase boundary. |
| Named teacher/organization styles | Simple Five; Simple Seven; Trikoniya; Lehree; Butterfly; Hudo; Kachuko; Rangat; Garba Lachak; Gulat/“round jump”; Ram Leela Garba; Surti Western | Practitioner organizations and tutorial channels publish these labels. Trikoniya is described by one source as a triangle-shaped hand movement; other imagery-based definitions in secondary guides are leads only. Do not convert style names into universal action rules. | Find full teaching videos and document each source's own sequence and region/context. Determine whether the label means count, step, routine, hand motif or full-form style. |
| Teacher-named or event routines | Kachuko; Rangat; Garba Lachak; Gulat/“round jump”; Ram Leela Garba; Surti Western; couple Garba | Sathiya's channel organizes separate playlists/videos under these labels, including counted and paired routines. These titles establish that the teacher uses the label, not that it is a universal traditional step. | Identify whether each is a step, full routine, song-linked choreography, regional teaching label or fusion routine; score a specific video and preserve its author. |
| Motifs in choreography writing/tutorials | Katariyu/scissor hands; Clap & Snap; Ek Taali + Turn; Forward Bend Clap; overhead arm pattern; jump; spin; torso sway | Dance scholarship describes these as choreographic actions or combinations. A separate Sathiya 14-step lesson (not the 4:51 Kachuko upload reviewed below) shows an instructor-led group and, at 8:02, a synchronized low bend with contrasting high/low arm levels. | Source-specific beat positions and exact left/right assignments are not yet transcribed. A sampled pose does not establish a complete sequence. |
| Related or ambiguous labels | Raas/Dandiya; Timli; Tarpa; Garbi/Garbo; Palli Jag Garbo; Maniaro/Kanbi Raas; Vinchhudo; Mer Ras; Kahlya; Tippani; Gop Ras; Sanedo; Dakla/Dakhla; Aarti | Sources include these as named dance/music forms or devotional repertoire; they are not all Garba steps. Daklu is also an instrument name, while one recent lifestyle article offers an author-specific Dakla routine. | Find form-specific primary sources and record when a song intentionally combines forms. Do not use the word alone to trigger choreography. |

## Evidence-backed examples, with limits

### Be Taali and Tran Taali

Dance scholarship names betaali and trantaali as two- and three-clap Garba patterns. The Gujarati *Indian Express* beginner guide offers one Be Taali description: clap while alternating right and left, while moving both feet forward/back. It gives no count-by-count side assignment, so preserve it as that guide's variant rather than treating it as the universal form. The name supports storing clap count; it does **not** by itself tell us which beats receive each clap. The records therefore have no beat score.

### Dodhiyu count variants

One interviewee quoted in [Pedro Roxo's dissertation](https://run.unl.pt/bitstream/10362/19538/4/PhD.PedroRoxo.FinalVersion.2016.pdf) describes personal Dodhiyu practice in 6, 6.5, 8, 10, 12, 14, 24 and 32 beats. Keep each beat length as a sourced variant. A “14-step” YouTube title and a “14-beat” practitioner account are different fields until directly matched. An [Indian Express Gujarati guide](https://gujarati.indianexpress.com/lifestyle/navratri-2025-trending-garba-dance-steps-video-for-beginners-as/422738/) describes a different broad Dodhiyu routine as fast forward/back travel with turns, incorporating Garbo, Halaji and Popatiyu steps; its text does not assign events to individual beats. A separate [Dance FreaX tutorial by Nishant Nair](https://www.youtube.com/watch?v=mGzRifZwSMA) explicitly teaches 12- and 14-count Garba routines with technique and footwork; these belong to that video creator's counted routines, not automatically to the Dodhiyu family.

Ann R. David describes one observed Dodhiyu version without claps in which the arms swing opposite the lead leg while the feet make a fast floor pattern. This is one observed version in a UK diaspora context, not a rule for every Dodhiyu.

### One community-described beginner pattern

A Vadodara [Reddit reply](https://www.reddit.com/r/vadodara/comments/1dfw309/) describes a six-movement shuffle phrase: right-front, left-front, right-front with a turn, left-front, then right-back and left-back; it adds optional half turns around the back section. It is useful as a tutorial lead and demonstrates directional/turn phases, but it is one anonymous community account. It is stored as an unverified teaching variant, not canonical Garba choreography.

### Guide-described travel and formations

An older [Hindustan Times guide](https://www.hindustantimes.com/art-and-culture/hit-the-garba-floor/story-oZQcZP59sEfxGd5OkzP0PK.html) attributed to a Mumbai Garba instructor gives compact clues: Basic Garba has bends, claps and twirls; Chal is walking; one Chal version adds a high back-jump after every three to four steps; Popat is three steps forward and two back; Heech is performed in pairs with bouncing and clapping; Hudo involves rotations; Kutchi Thekda travels circularly. It calls Matukadi dancing around a ritual pot, which is a formation/ritual context as much as movement. These are short written descriptions, not enough to assign left/right timing or generate a full animation.

### Longer practitioner-name inventory

Shree Patel Raas Mandali's [own list](https://patelraasmandali.com/index.html) adds Simple Five, Simple Seven, Trikoniya, Lehree, Butterfly and other names; a [Gujarat government-hosted folk-dance PDF](https://cdnbbs.s3waas.gov.in/s3kv01beaf162aa111f4d4f4f006d5949f/uploads/2024/02/2024020282.pdf) names additional repertoire such as Palli Jag Garbo, Maniaro/Kanabi Raas, Vinchhudo, Mer Ras, Kahlya and Gop Ras. The names broaden the collection queue, but the latter are separate forms and not interchangeable footwork. For the mandali list, exact sequence verification is still needed; its site was intermittently unavailable during this pass.

### Kachuko: Sathiya's source-specific 14-step upload

The [Sathiya Garba International Kachuko tutorial](https://www.youtube.com/watch?v=0ABJPVSFRVE) is titled “કચુકો ગરબા સ્ટેપ | ગુજરાતી Tutorial Video | New 14 Step Garba Dance | Kachuko Song.” Its title card and page establish a Kachuko-labelled, 14-step lesson; a 2024 [tutorial roundup](https://whatshelikes.in/five-garba-tutorials-to-enhance-your-navratri-dance-moves/21343/) attributes the lesson to Hiren Patel and his team. The channel's wording and count stay attached to this upload; they do not establish one universal Kachuko sequence or a fourteen-beat phrase.

In visual samples from about 1:35–4:00, the group moves through bent-knee side/travel shapes and pivots, with open palms near shoulder level, hands gathered at chest height, low forward bends, crossed or offset foot placements, and contrasting high/low arm lines. One section switches to a lower-body close-up around 2:50–3:00, then returns to the group. These are visible movement motifs, not fourteen individually transcribed steps. Captions/count cues were unavailable; hands gathered at the chest do not by themselves prove a clap. The review cannot assign reliable lead-foot sides, landings, turn paths, phrase boundaries or beat positions, so its animation score stays null. See the timestamped observations and unresolved fields in [`steps.json`](../../data/dance/steps.json).

### Sonali Bhadauria: “10 Basic Garba Steps”

The [LiveToDance with Sonali video](https://www.youtube.com/watch?v=M2GO52YmBek) describes ten popular Garba steps. Its YouTube “In this video” panel supplies ten chapter labels and explicitly marks those chapters as autogenerated. They are useful navigation points, not verified names from the teacher and not proof that the video contains ten distinct step families or a ten-beat phrase.

| YouTube autogenerated chapter | Start | Review note |
| --- | ---: | --- |
| Basic Garba step | [0:35](https://www.youtube.com/watch?v=M2GO52YmBek&t=35s) | Teaching setup sampled; no full foot sequence transcribed. |
| Clapping step variations | [5:08](https://www.youtube.com/watch?v=M2GO52YmBek&t=308s) | Sampled hand positions change, including gathered and open/raised shapes; clap contact and timing are unverified. |
| Tricky turning step | [6:33](https://www.youtube.com/watch?v=M2GO52YmBek&t=393s) | Sampled frames show repositioning and a change of orientation; turn direction and lead foot are unknown. |
| Two plus two step | [9:06](https://www.youtube.com/watch?v=M2GO52YmBek&t=546s) | Hands move around waist height and stance changes; no complete phrase or meaning of “two plus two” established. |
| Four forward step | [10:24](https://www.youtube.com/watch?v=M2GO52YmBek&t=624s) | A sampled narrow/forward-offset pose is visible; the label does not verify four beats or four footfalls. |
| Four plus two step | [12:12](https://www.youtube.com/watch?v=M2GO52YmBek&t=732s) | Narrow/crossed-looking placement and slight torso rotation appear in one frame; exact steps and count remain unknown. |
| Advanced turning step | [14:10](https://www.youtube.com/watch?v=M2GO52YmBek&t=850s) | Only sparse teaching/demo poses were sampled; no complete turn pathway established. |
| Filmy shoulder step | [16:08](https://www.youtube.com/watch?v=M2GO52YmBek&t=968s) | At 16:46, one frame shows the woman opening her arms while stepping and the man bending his elbows with hands near shoulder level; this is not a full movement transcription. |
| Filler steps | [18:20](https://www.youtube.com/watch?v=M2GO52YmBek&t=1100s) | The sampled poses are near-standing teaching/demo frames; “filler” remains a chapter label, not an identified step family. |
| Partner step and conclusion | [21:18](https://www.youtube.com/watch?v=M2GO52YmBek&t=1278s) | Later samples show a pair facing and repositioning toward one another, including a raised palm; contact and sequence are unclear. |

The inspection also sampled positions inside the chapters, recorded in [`steps.json`](../../data/dance/steps.json). YouTube captions were unavailable and the transcript panel did not provide text. These frames do not establish complete foot/hand sequences, sides, clap contacts, turn paths, partner contact, phrase length or beat placement. A beat map for a particular song and a practitioner review are still needed; the animation score therefore remains null.

### Dakla illustrates why source attribution matters

The [Kachchh district government page](https://kachchh.nic.in/folk-music-instruments/) lists Daklu as a musical instrument. A recent [HerZindagi beginner article](https://www.herzindagi.com/lite/society-culture/herzindagi-navratri-dance-guide-stepbystep-dance-routine-to-learn-dakla-for-that-perfect-garba-night-article-1069661) separately proposes its own eight-count Dakla practice routine (right diagonal step/clap, left tap/arm sweep, quick taps, pivot). Because the article does not identify a tradition bearer or choreographer, store that only as a candidate routine attributed to that guide. Do not map the bare label `Dakla` to that choreography.

### A short-form learner problem

In an [Ahmedabad discussion](https://www.reddit.com/r/ahmedabad/comments/1nlf95j/), a learner reports finding many “3 Taali” tutorials with different movements and not knowing which to learn. The practical implication for PlayGarba is to label the teacher and routine, then let people choose among reviewed variants; do not silently present one clip as the definitive version.

Another [community thread](https://www.reddit.com/r/gujarat/comments/1fr768s/) describes one 14-beat cycle with six relatively stationary beats for flourishes, while turns or jumps can replace an action if dancers still finish at the expected circle position. That is one user's explanation, not a universal choreography rule, but it highlights why an animation score must track circle travel and phrase boundaries alongside hands and feet.

### Numbered video titles are not one shared count system

The research now has several creators' five-, six-, eight-, nine-, ten-, fourteen-, twenty-one- and thirty-one/thirty-two-step video labels, plus higher Taali labels and variants. Those numbers are not directly comparable: a title may count taught examples, foot movement units, claps, a named routine, or a full sequence. Even two videos called “10 Basic Steps” can teach different material. The exact source and video must stay attached to every future movement score.

For beginner review, the first broad-reach candidates are [Pebbles Gujarati's beginner lesson](https://www.youtube.com/watch?v=pbdv917Enns) (10M views/103K likes at the 2026-10-02 snapshot), [Akshay Bhosale's five-step lesson](https://www.youtube.com/watch?v=NJWvOmWRnCo) (5.2M/71,916), and [Sonali Bhadauria's ten-step lesson](https://www.youtube.com/watch?v=M2GO52YmBek) (1.6M/26,771). Reach helps prioritize what to inspect; it does not settle quality, regional fit or the movement score. The single-channel breadth candidate remains [Hiren Patel / Sathiya](https://www.youtube.com/@sathiyagarba), with the richest named-style playlist shelf found in this search. For a potential expert curriculum partner, [Rasleela Garba Academy](https://ras-leela.com/) self-reports 60+ variations and multiple instructors; request its syllabus before treating that as an enumerated step inventory.

Short-form discovery has surfaced a [Dev Garba Classes six-step basic Reel](https://www.instagram.com/devgarbaclasses/) and a [Rangsariya “7 Taali” lesson Reel](https://www.instagram.com/rangsariyagarbaclasses/). Their indexed play counts are third-party snapshots and their movement/count details are unreviewed. Each is a source-specific research lead, not a universal pattern label.

## What an animation score must capture

For each source-specific routine, record:

- phrase length in **beats**, separately from title/count labels;
- exact lead/support foot and contact action on each event;
- travel direction and circle progression;
- facing, turn direction, and turn completion;
- hand/arm pose, clap contacts, and prop contacts;
- torso/pelvis lean, bounce, jump, level change and recovery;
- source timestamp and frame/video reference for every annotated sequence;
- confidence, source scope, variant ID, and practitioner review state.

Until those fields are supported, `animationScore: null` means **do not synthesize a full routine from this record**. The exact synchronization rules are in [motion-sync-contract.md](motion-sync-contract.md).

## Coverage boundary

This is a source-indexed working list, not “every Garba step.” Names vary by village, community, teacher, song, event, and transliteration; public sites also use “step” for a motif, class sequence, or entire folk form. New items should be added as attributed candidates first, then promoted only after their movement, count, source scope, and practitioner review are documented. Current coverage emphasizes identifiable public names and beginner teaching leads; regional oral repertoires and unindexed in-person instruction remain a substantial gap.
