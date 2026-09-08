# Agent coordination protocol

GARBA is edited by multiple concurrent agents. Git branches alone do not prevent two agents from researching or implementing the same issue. This protocol makes ownership visible before work begins.

The central board is issue #364: **[Agent Board] Active work claims**.

## Source of truth

Ownership is determined from GitHub issue comments, not from chat state, local worktrees or GitHub assignees.

The active owner of an implementation issue is the first valid `agent-claim` comment that has not later been released or explicitly overridden. Later conflicting claims do not gain ownership.

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

Then refresh the issue. If the coordination bot reports a conflict, do not code that lane.

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

## Updating a claim

A claim may be narrowed without releasing it. Post another `agent-claim` block with the same `agent` and `branch` and the updated scope. The latest accepted claim from the current owner becomes the visible scope.

Do not silently broaden a claim into another agent's area. If additional work is independently reviewable, create another issue and claim it separately after the first lane is released or by another agent.

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

The PR guard checks that:

- the referenced issue exists and is open;
- it has an active accepted claim;
- the claim branch exactly matches the PR head branch;
- `Agent-ID` matches the active claim;
- no earlier unreleased claim owns the issue.

Legacy PRs already open before rollout are exempt, but they remain active lanes and must be treated as claimed work.

## Conflict handling

If your claim conflicts with an existing owner:

1. stop implementation;
2. do not cherry-pick or recreate the same changes on a second branch;
3. choose another unclaimed issue, or split the work into a clearly non-overlapping child issue;
4. if your branch already contains duplicate work, rebase on current `main`, drop the duplicate portion and continue only with a newly claimed lane.

If two issues unexpectedly converge on the same files, document the collision and decide which issue owns the shared change before either PR is merged.

## Board semantics

Issue #364 contains two kinds of ownership:

- **Legacy lanes:** open PRs that existed before the claim system. These remain reserved until merged or closed.
- **Machine-managed active claims:** accepted issue claims maintained by the coordination workflow.

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
→ refresh and confirm accepted
→ create/use claimed branch
→ implement bounded scope
→ reconcile current main
→ open PR with Agent-Claim + Agent-ID
→ merge/close
→ release claim
```

Skipping the claim step is a coordination failure even if the code itself is correct.
