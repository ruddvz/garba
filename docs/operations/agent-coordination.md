# Agent coordination protocol

GARBA is edited by multiple concurrent agents. Git branches alone do not prevent two agents from researching or implementing the same issue. This protocol makes ownership visible before work begins.

The central board is issue #364: **[Agent Board] Active work claims**.

## Source of truth

Ownership is determined from GitHub issue comments, not from chat state, local worktrees or GitHub assignees.

The active owner of an implementation issue is the first valid `agent-claim` comment that has not later been released or explicitly overridden. Later conflicting claims do not gain ownership.

Declared repository files are also serialized across active issues. If two different active claims overlap on a declared file/path, the earlier active claim owns that path. The later claim must narrow its scope or wait for release before editing or merging the overlapping path.

Legacy PRs that predate coordination enforcement own the files already changed by those PRs until they merge or close.

Claims do not expire automatically. This avoids a long-running agent losing ownership just because it has not posted recently.

## Claim an issue

Use a stable, descriptive agent ID for the life of the lane. Examples:

- `codex/ramzat5-batch-b`
- `chatgpt/player-mobile-controls`
- `luna/catalogue-metadata-276-a`

The branch is part of the identity and must be unique to the lane.

Post this exact structure on the issue:

```text
<!-- agent-claim
agent: codex/ramzat5-batch-b
branch: youtube/ramzat5-batch-b
scope: Ramzat 5 tracks 13-20 exact YouTube verification only
files: data/catalogue/**; data/playback/**
-->
CLAIM: codex/ramzat5-batch-b owns this lane on youtube/ramzat5-batch-b.
```

Then refresh the issue and #364. If the coordination bot reports a claim conflict, or the file-ownership workflow marks the issue with `agent:file-conflict`, do not code the blocked path.

`research-only` means the lane reserves no repository files. Once research turns into implementation, update the claim with the exact expected paths before editing.

## Split broad work before parallelising

A master issue can describe a programme, but it cannot safely be the active implementation unit for several agents.

Bad pattern:

- Agent A claims `MASTER: YouTube migration`.
- Agent B also starts a release inside that master.
- Both edit route manifests and generated data.

Correct pattern:

- Master issue remains unclaimed or coordination-only.
- Child issue A owns one release/artist batch.
- Child issue B owns a different release/artist batch.
- Each child has a distinct branch and bounded files/scope.

The same rule applies to UI programmes. Split player transport, Explore, public pages, artwork, PWA and deployment into separate implementation issues when they can proceed independently.

## Check overlap beyond issue numbers

Before claiming, inspect:

1. issue #364 active board;
2. target issue comments;
3. open PR titles and bodies;
4. the files likely to change;
5. related parent and child issues.

Two different issue numbers can still overlap. For example, one issue may say “improve player UX” while another says “refine player controls”. If both touch the same control layer, split or sequence them instead of treating the issue numbers as proof of independence.

The cross-issue file workflow checks semicolon-delimited claim paths. It detects exact-path collisions and conservative exact-path/glob collisions. It does not replace human scope review: two claims can conflict conceptually even when their declared files differ.

## Cross-issue file ownership

First claim wins per overlapping path.

Example:

- #408 claims `provider-runtime.js` first.
- #491 later claims `provider-runtime.js` as part of a broader feature.
- #408 keeps ownership of that file.
- #491 may continue only after narrowing away from that file, or after #408 releases it.

The later claim receives `agent:file-conflict` and appears in the **Cross-issue file ownership** section of #364 with the earlier owner and overlapping path(s).

The earlier owner is not blocked merely because a later claim collided with it. This prevents a late duplicate claim from deadlocking valid existing work.

Shared index or documentation files are still files. If two lanes both need the same shared file, serialize that edit: let the earlier lane land, then rebase/reconcile the later lane and update its claim if the file is still needed.

Legacy PRs through the configured coordination cutoff are treated as earlier ownership for their actual changed files.

## Updating a claim

A claim may be narrowed without releasing it. Post another `agent-claim` block with the same `agent` and `branch` and the updated scope. The latest accepted claim from the current owner becomes the visible scope.

Do not silently broaden a claim into another agent's area. If additional work is independently reviewable, create another issue and claim it separately after the first lane is released or by another agent.

If a later claim gets `agent:file-conflict`, the normal repair is to post a narrower claim update that removes the overlapping paths. The file-conflict label clears automatically after reconciliation when the overlap no longer exists.

## Releasing a claim

When merged, abandoned or intentionally handed off, post:

```text
<!-- agent-release
agent: codex/ramzat5-batch-b
branch: youtube/ramzat5-batch-b
-->
RELEASE: lane is available.
```

A release only clears the matching active agent and branch.

Closing the implementation issue also releases the lane through automation.

When an earlier file owner releases, later non-overlapping/narrowed claims are re-evaluated automatically.

## Owner override

If a claim is genuinely abandoned and cannot be released by its agent, the project owner may explicitly override it. Agents must not self-declare another active claim abandoned.

Use:

```text
<!-- agent-claim-override
reason: abandoned agent; owner reassignment
-->
OVERRIDE: release the current claim.
```

After the override is accepted, a new agent may claim the issue normally.

## Pull request contract

Every new PR created after the coordination rollout must include:

```text
Agent-Claim: #342
Agent-ID: codex/ramzat5-batch-b
```

The coordination checks verify that:

- the referenced issue exists and is open;
- it has an active accepted claim;
- the claim branch exactly matches the PR head branch;
- `Agent-ID` matches the active claim;
- no earlier unreleased claim owns the issue;
- the PR's active claim does not lose any declared file to an earlier active claim or legacy PR.

A later cross-issue file collision fails the file-ownership PR check until the claim is narrowed or the earlier owner releases.

Legacy PRs already open before rollout are exempt from claim metadata, but they remain active file owners until merged or closed.

## Conflict handling

If your claim conflicts with an existing owner:

1. stop implementation on the overlapping scope/files;
2. do not cherry-pick or recreate the same changes on a second branch;
3. choose another unclaimed issue, narrow the claim, or split the work into a clearly non-overlapping child issue;
4. if your branch already contains duplicate work, reconcile current `main`, drop the duplicate portion and continue only with a valid owned lane.

If two issues unexpectedly converge on the same files, the earlier active file owner keeps that path. Document any conceptual collision that remains outside the machine-detectable file list.

## Board semantics

Issue #364 contains three kinds of coordination visibility:

- **Legacy lanes:** open PRs that existed before the claim system. These remain reserved until merged or closed.
- **Machine-managed active claims:** accepted issue claims maintained by the coordination workflow.
- **Cross-issue file ownership:** later active claims currently blocked by earlier active claims or legacy PR changed files.

The board is for visibility. The issue comment history remains the authoritative event log for claim order.

## Practical agent preflight

Use this sequence every time:

```text
fetch current main
→ read AGENTS.md
→ read #364
→ inspect target issue + comments
→ inspect open PR overlap
→ split broad issue if needed
→ post claim
→ refresh target issue and #364
→ confirm no agent:file-conflict on required files
→ create/use claimed branch
→ implement bounded scope
→ reconcile current main
→ open PR with Agent-Claim + Agent-ID
→ pass issue-claim and file-ownership guards
→ merge/close
→ release claim
```

Skipping claim or file-ownership reconciliation is a coordination failure even if the code itself is correct.