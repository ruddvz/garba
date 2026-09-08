# Player ↔ Explore continuity decision

Issue: #448  
Status: architecture decision + isolated prototype  
Prototype: [`prototypes/player-explore-continuity.html`](prototypes/player-explore-continuity.html)

## Decision

Keep the current standalone `https://playgarba.com/explore/` document as the canonical direct Explore route, but add a **player-owned transient Explore surface** for listeners who enter Explore from the active player.

The smallest safe production architecture is:

- the player document at `/` remains mounted;
- the visible YouTube/provider stage remains mounted in that player document;
- the player owns active playback state, queue, history and explicit release continuation;
- player-originated Explore opens as a same-origin embedded surface instead of unloading `/`;
- the existing `/explore/` page remains independently loadable for direct URLs, search indexing, reload and links from outside the player;
- closing the embedded surface or pressing browser Back returns to the same mounted player instance;
- selecting a verified song inside embedded Explore asks the parent player to select that canonical song, then closes Explore without destroying either the player session or the embedded Explore state.

Do **not** convert PlayGarba into a new client-side framework/router merely to solve this boundary.

## What is verified today

This decision is based on current repository state at the start of the spike (`51de4b527bbff0514c07949979bdc26c5b1ccf82`) and the current product/hosting contracts.

### The player → Explore boundary is currently a document navigation

`index.html` renders the player Explore control as a normal same-origin link:

```html
<a id="browseButton" href="./explore/">…</a>
```

That means opening Explore replaces the player document. The current provider/player instance cannot be guaranteed to survive that navigation.

This is an architectural fact, not a claim that every browser currently stops playback in exactly the same way. A live interaction result still needs a healthy browser runner and real-device verification.

### Explore → player already has a careful handoff

`src/catalogue/index.html` and `index.html` already use a short-lived `playgarba:route-handoff` session record to smooth the song identity transition back into the player. The handoff is visual/navigation state only; it does not keep the old player/provider instance alive.

### Explore return state is already regression-guarded

Do not rebuild this work.

`src/catalogue/listening-library.js` stores return context on the exact browser history entry and restores:

- the selected song target;
- prior scroll position;
- selected-link viewport offset;
- progressively loaded song-list depth;
- keyboard focus intent.

`scripts/lib/validate-explore-return-continuity.mjs` guards that behavior, including BFCache-aware return handling.

The persistent-shell implementation should reuse these semantics for standalone Explore. Embedded Explore can preserve its state even more cheaply by remaining mounted while hidden.

### Release-context handoff already exists

The completed #403 lane makes a Listen action from a selected release carry the canonical `release` query parameter only when the release/song pair is valid and has a usable canonical track number. Broad Explore listening does not manufacture release context.

The future embedded bridge must preserve this exact rule. It must not infer release context merely because a song has a `releaseId`.

### Production hosting is already single-origin

`docs/deployment/GITHUB-PAGES.md` defines one GitHub Pages artifact:

- player: `https://playgarba.com/`
- Explore: `https://playgarba.com/explore/`

That makes a narrow same-origin embedded bridge feasible without adding another service, domain or framework.

## Production observation boundary

A current live playing → Explore → release → return observation is not recorded as a pass or failure in this spike.

The repository browser-smoke runner is actively being repaired under #415. Its current failures include browser-host dependency and stale fixture/assertion problems, so it is not reliable evidence for this playback-continuity question yet.

Until #415 is repaired, the verified statement is narrower:

> Current source performs a full-document player → Explore navigation, so the existing player/provider object is not preserved by architecture.

Do not turn that into the stronger claim “production playback always stops” without a successful browser or real-device reproduction.

## Options considered

### A. Keep the full-document handoff only

**Advantages**

- already deployed;
- simple hosting and direct URLs;
- standalone Explore is independently indexable and reloadable;
- current return-state restoration is good.

**Limit**

The active player/provider document is replaced. Returning can restore catalogue/player identity, but not the exact in-memory provider instance as a durable guarantee.

**Decision:** keep as the direct-URL/fallback path, but not as the preferred route from an active player session.

### B. Persistent parent player + same-origin embedded Explore

**Advantages**

- player/provider object stays mounted;
- queue, history, active release continuation and exact playback state remain parent-owned;
- visible YouTube stage can remain visibly present and compliant;
- current Explore document and catalogue architecture can largely stay intact;
- direct `/explore/` remains a real canonical page;
- embedded Explore can keep search/filter/scroll state naturally by staying mounted;
- incremental implementation is possible after active runtime owners release their files.

**Cost**

- needs a small explicit parent/child bridge;
- needs history, focus and responsive treatment for the transient surface;
- requires care so an embedded surface never obscures the required visible provider stage.

**Decision:** chosen.

### C. Convert player + Explore into one SPA/router/framework application

This could preserve state, but it would require moving or rewriting player, catalogue and navigation ownership at once. It creates a much larger migration surface than the problem requires and would collide with active playback, Explore, CSS and PWA lanes.

**Decision:** reject for this problem.

## Prototype result

`docs/product/prototypes/player-explore-continuity.html` demonstrates the chosen state model without embedding commercial media or depending on production runtime code.

The prototype keeps these parent-owned values alive while Explore opens and closes:

- visible provider-stage placeholder;
- active track;
- play/pause state;
- manual queue count;
- active release context.

The Explore surface preserves:

- selected release;
- search query;
- scroll position.

It also demonstrates:

- browser history entry for transient Explore;
- browser Back closing Explore;
- explicit Back to player;
- Escape dismissal;
- focus restoration;
- selecting an executable release track and returning to the player;
- a deliberately unavailable row that does not become executable;
- reduced-motion behavior.

The provider rectangle is intentionally a placeholder. The prototype does not claim to validate YouTube playback or API behavior.

## State ownership contract

The production implementation should have one owner for each state domain.

| State | Owner | Embedded Explore access |
| --- | --- | --- |
| Active canonical song/set | Parent player | Read summary; request canonical selection |
| Provider instance / YouTube iframe | Parent player | None |
| Provider playing/paused/buffering state | Parent player | Read-only summary if needed |
| Manual Up next queue | Parent player | None in first implementation |
| Actual listening history | Parent player | None in first implementation |
| Explicit release continuation | Parent player | Request only through validated `releaseId` + `songId` pair |
| Explore collection/release/search state | Explore document | Own |
| Explore scroll/focus state | Explore document | Own |
| Standalone Explore history-entry restoration | Existing Explore runtime | Preserve unchanged |

No Explore code should reach directly into provider runtime internals.

## Bridge contract

Use a narrow same-origin message/event bridge. Do not expose the whole `app.js` state object to the child document.

A minimal message envelope can be versioned like this:

```js
{
  source: 'playgarba-explore',
  version: 1,
  action: 'listen',
  songId: '<canonical-song-id>',
  releaseId: '<canonical-release-id-or-null>'
}
```

Other first-version actions should stay small:

- `ready`
- `close`
- `listen`

The parent should validate all of the following before acting:

1. `event.origin === location.origin`;
2. message source/version are known;
3. `songId` resolves to a canonical current song;
4. requested route is handled by the normal player readiness/selection contract;
5. `releaseId`, when present, is validated by the same release/song rule already used by #403;
6. an unavailable/discovery-only song remains unavailable instead of being silently replaced.

The child must never send provider IDs, YouTube timestamps, guessed route readiness or a copied queue.

## Provider visibility rule

This is non-negotiable.

If a verified YouTube video is actively playing, the required visible player remains visibly rendered in the parent shell. Explore must be laid out around it, not over it and not behind an opaque full-screen layer.

Do not implement:

- hidden YouTube playback;
- off-screen iframe playback;
- audio extraction;
- background-play promises;
- a second provider instance inside Explore.

If viewport geometry cannot keep the active stage visibly usable while Explore is open, opening Explore must first use the existing truthful pause/stop behavior rather than hiding an active provider.

The final geometry decision belongs with the active provider-stage owner (#408/#491), not this spike.

## Navigation contract

### Player → Explore

From `/`, a plain Explore action should:

1. keep the player document mounted;
2. mount or reveal the same-origin Explore surface;
3. push a transient player history state (for example root `#explore` or an equivalent non-canonical state);
4. move focus into Explore;
5. keep the provider stage visible when playback is active.

Do not change the document canonical URL to pretend the parent shell itself is `/explore/`.

### Close / browser Back

Close, Escape and browser Back should dismiss only the transient Explore surface and return focus to the opener. Parent playback identity, queue and provider instance remain unchanged.

Closing Explore must not itself imply Pause, Stop, Previous or Next.

### Explore Listen

For a verified executable song:

1. child sends canonical `songId` and optional validated release context;
2. parent routes the request through the ordinary player selection/readiness path;
3. parent remains the only provider owner;
4. Explore closes after the parent accepts the selection intent;
5. Explore remains mounted so reopening restores its state.

An explicit unavailable row stays unavailable. Do not close Explore and substitute another recording.

### Direct `/explore/`

A direct navigation to `https://playgarba.com/explore/` remains the current standalone Explore page. It must not require the parent shell, an iframe or prior player state.

Listen from standalone Explore continues using the existing canonical deep-link/handoff path.

### Reload

Reloading standalone `/explore/` reloads standalone Explore.

Reloading the player while transient Explore is open may restore the transient surface from the parent history/hash state if that is simple and deterministic, but it must not promise preservation of an in-memory provider session across a real document reload.

### Legacy URLs

Existing `/catalogue/`, `/songs/` or other maintained legacy redirects continue resolving to the canonical `/explore/` route. Do not create a second canonical embedded URL family.

## Accessibility contract

The embedded surface is a real navigation region, not a visual overlay with ambiguous focus.

Production implementation must provide:

- one accessible name for Explore;
- deterministic focus entry on open;
- Escape and explicit Back to player;
- focus restoration to the Explore opener;
- browser Back parity with the close control;
- no keyboard focus in hidden Explore content;
- no focus trapped behind the visible provider stage;
- reduced-motion behavior;
- clear announcement when a selected recording is unavailable;
- no duplicate live-region announcement from both parent and child for the same track selection.

If an iframe is used, its `title` must describe Explore plainly and the child document must retain its own heading hierarchy.

## Failure handling

| Failure | Required behavior |
| --- | --- |
| Embedded Explore fails to load | Keep player usable; offer/open standalone `/explore/` |
| Message payload invalid | Ignore and keep current player state |
| Unknown canonical song | Keep Explore open; no player mutation |
| Song has no executable verified route | Keep identity truthful and unavailable; no substitute recording |
| Release/song pair invalid | Drop release context; do not attach unrelated release continuation |
| Storage/history unavailable | Embedded session still works in-memory; standalone navigation remains fallback |
| Provider becomes blocked/error while Explore open | Parent owns and presents the provider error; child does not invent a playback state |
| Parent reloads | Rebuild from normal persisted player contract; do not claim the old provider instance survived |

## Incremental implementation sequence

Do not start this production migration while the listed active owners still overlap the required runtime areas.

### 1. Wait for current owners to settle

Serialize with:

- #437 for selection/readiness continuation in `app.js`;
- #408/#491 for provider-stage ownership and visibility;
- #390 for Explore controls;
- #405 for Explore release/song rendering;
- #415 for browser-smoke infrastructure.

### 2. Add one parent continuity adapter

Create a small dedicated runtime such as:

- `assets/runtime/explore-continuity.js`

Responsibilities:

- open/close the transient Explore surface;
- own history state and focus handoff;
- validate same-origin messages;
- forward accepted song selection into one narrow player selection entry point;
- never own provider playback itself.

### 3. Add embedded-mode support to Explore

Prefer one small child-side adapter or mode flag rather than forking Explore markup/data logic.

Embedded mode should:

- send `ready`, `close`, and `listen` messages;
- preserve existing standalone links when no parent handshake exists;
- suppress only navigation chrome that is redundant inside the parent surface;
- keep the canonical standalone document unchanged for direct access.

### 4. Expose one narrow player selection entry point

After #437 settles, expose a single documented event/function for canonical selection requests instead of letting Explore manipulate `app.js` internals.

It must reuse the normal route-readiness, release-context and unavailable-state rules.

### 5. Integrate provider geometry with its owner

The #408/#491 owner should decide the exact compact/expanded stage geometry when Explore is open. The invariant is visibility, not a particular pixel layout.

### 6. Add outcome tests

Once #415 is repaired, add browser behavior coverage for:

- playing → Explore → Back keeps the same parent provider instance;
- active song, elapsed state and queue do not reset merely by opening Explore;
- release Listen changes to the intended canonical song and keeps valid release context;
- Explore search/release/scroll state survives close/reopen;
- Back/Escape/close restore focus;
- direct `/explore/` still works standalone;
- reload behavior is truthful;
- unavailable songs remain unavailable;
- provider stage stays visibly rendered while active.

## Follow-on implementation boundary

A production child issue should be created only after the active overlapping runtime owners release their files.

Proposed bounded scope:

- parent Explore continuity adapter;
- minimal player-shell mount point;
- minimal child embedded-mode bridge;
- one narrow player selection event;
- focused continuity validator/browser tests.

Explicit non-goals for that child:

- provider rewrite;
- catalogue data changes;
- search relevance changes;
- Explore redesign;
- new framework/router;
- domain or hosting changes;
- PWA update strategy beyond what the new runtime file requires.

## Release decision

Proceed with the persistent-parent / embedded-Explore approach as the next implementation design **after** #437, #408/#491 and #415 settle enough to provide stable selection, provider visibility and browser verification contracts.

Until then, keep the current standalone `/explore/` path and its existing full-document return continuity. It is a valid fallback and direct-entry path; it simply does not guarantee preservation of the active in-memory provider instance.
