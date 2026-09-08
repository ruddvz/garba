# GARBA agent rules

These rules apply to every automated or human implementation agent working in this repository.

## Load the RAAS harness first

RAAS is the compact PlayGarba context and execution harness. Before implementation, read:

1. `.raas/RAAS.md`
2. `.raas/PROJECT-CONTEXT.md`
3. `.raas/EXECUTION.md`
4. `.raas/LANGUAGE.md` whenever user-facing copy, labels, metadata presentation, docs, SEO or public text may change

RAAS does not replace the ownership protocol below. It explains the product, source authority, language system and end-to-end completion loop so an agent does not stop at a locally correct patch or an open PR.

When the user asks an agent to keep working through the backlog, finishing one lane means returning to preflight and selecting the next safe open, unowned, non-overlapping implementation issue. Every new lane requires a fresh claim and branch.

## Before touching code

Do not start implementation until the work is claimed.

1. Fetch current remote `main`. Never reset or overwrite newer work.
2. Read issue #364, **[Agent Board] Active work claims**.
3. Read the target issue and all recent comments.
4. Check open pull requests for the same issue, feature, release, artist, files or runtime area.
5. If the target is a broad `MASTER`, programme or multi-phase issue, do not use it as a shared implementation lane. Create or select a non-overlapping child issue first.
6. Post a machine-readable claim on that child/implementation issue before coding:

```text
<!-- agent-claim
agent: <agent-id>
branch: <branch-name>
scope: <short exact scope>
files: <paths/globs or "research-only">
-->
CLAIM: <agent-id> owns this lane on <branch-name>.
```

7. Re-read the issue comments after posting. The first valid claim that has not been released owns the lane. If another active claim is earlier than yours, stop and choose another issue or ask for the scope to be split.
8. Re-read #364 after the coordination workflows reconcile. If your issue is listed under **Cross-issue file ownership** or has the `agent:file-conflict` label, do not edit the overlapping files. Narrow the claim or wait for the earlier owner to release them.
9. Work only on the scope and files in your accepted claim. Expand scope only after updating coordination and confirming there is no overlap.

A GitHub assignee is not enough. Multiple agents can operate through the same GitHub account, so the issue comment claim and branch are the ownership identity.

## One lane, one owner

- One implementation issue has one active agent claim at a time.
- One active claim has one branch.
- Declared file ownership is serialized across issues. An earlier active claim owns an overlapping path before a later claim, even when the issue numbers differ.
- Legacy PRs that predate the claim system own the files already changed by those PRs until they merge or close.
- `research-only` does not reserve repository files.
- Parent/master issues coordinate children. They are not permission for several agents to edit the same area.
- Existing open PRs that predate this system count as active ownership even if they do not have a claim comment yet.
- Do not create a second PR for an already-owned issue or sub-scope.
- Do not take over an abandoned-looking lane by assumption. Claims do not expire automatically. The owner must release it, the PR/issue must close, or the project owner must explicitly override it.

## While working

- Rebase/reconcile from current `main` before opening or updating a reviewable PR.
- If newer `main` contains work that overlaps your claim, preserve the newer work and reduce your scope rather than restoring your old diff.
- If another PR starts touching your claimed files for a different issue, document the collision on both issues before continuing.
- If the file-conflict guard marks your claim as later ownership, stop editing those paths instead of racing the earlier branch.
- Keep catalogue/data research separate from UI, deployment and product lanes unless the issue explicitly requires both.

## Pull requests

Every new PR governed by this system must include:

```text
Agent-Claim: #<issue-number>
Agent-ID: <agent-id>
```

The PR head branch must match the branch in the active issue claim. The coordination checks reject a PR with no claim, a released claim, a conflicting claim, a branch mismatch, or a later claim that overlaps files already reserved by an earlier active claim or legacy PR.

## Release the lane

When the work is merged, abandoned or handed off, post:

```text
<!-- agent-release
agent: <agent-id>
branch: <branch-name>
-->
RELEASE: lane is available.
```

Do not leave a claim active after you stop working.

Full protocol and conflict examples: [`docs/operations/agent-coordination.md`](docs/operations/agent-coordination.md).