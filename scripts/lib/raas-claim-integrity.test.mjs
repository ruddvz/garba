import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOLD_AGENT,
  HOLD_BRANCH,
  buildIntegrityReleaseBody,
  buildInternalReleaseBody,
  combineFileScopes,
  deriveCoordinationState,
  integrityGeneration,
  latestHoldRecord,
  parseCoordinationEvent,
  planCreatedCoordinationGuard,
  planMutation,
  planReconciliation,
  runClaimIntegrity,
} from './raas-claim-integrity.mjs';

const owner = 'ruddvz';

function comment(id, body, login = 'ruddvz', extra = {}) {
  return {
    id,
    body,
    user: { login, type: login.endsWith('[bot]') ? 'Bot' : 'User' },
    created_at: `2026-09-12T20:${String(id).padStart(2, '0')}:00Z`,
    updated_at: extra.updated_at || `2026-09-12T20:${String(id).padStart(2, '0')}:00Z`,
    ...extra,
  };
}

function claimBody(agent, branch, files = 'file-a', scope = 'bounded scope') {
  return [
    '<!-- agent-claim',
    `agent: ${agent}`,
    `branch: ${branch}`,
    `scope: ${scope}`,
    `files: ${files}`,
    '-->',
    `CLAIM: ${agent}`,
  ].join('\n');
}

function releaseBody(agent, branch) {
  return [
    '<!-- agent-release',
    `agent: ${agent}`,
    `branch: ${branch}`,
    '-->',
    `RELEASE: ${agent}`,
  ].join('\n');
}

function overrideBody(reason = 'operator reset') {
  return [
    '<!-- agent-claim-override',
    `reason: ${reason}`,
    '-->',
    'OVERRIDE',
  ].join('\n');
}

function reconcileBody(generation, reason = 'reviewed source mutation') {
  return [
    '<!-- agent-claim-integrity-reconcile',
    `generation: ${generation}`,
    `reason: ${reason}`,
    '-->',
    'RECONCILE',
  ].join('\n');
}

function mutationMarker(generation) {
  return [
    '<!-- agent-claim-integrity-mutation',
    `generation: ${generation}`,
    'source-comment-id: 1',
    'action: edited',
    '-->',
  ].join('\n');
}

function applyMutationPlan(comments, plan, nextId = 100) {
  const applied = [...comments, comment(nextId, plan.auditBody, 'github-actions[bot]')];
  let id = nextId + 1;
  if (plan.releaseActive) {
    applied.push(comment(id++, buildInternalReleaseBody(plan.releaseActive, plan.generation), 'github-actions[bot]'));
  }
  applied.push(comment(id, plan.holdBody, 'github-actions[bot]'));
  return applied;
}

test('ordinary lifecycle stays backward-compatible and first owner wins', () => {
  const claimA = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const claimB = comment(2, claimBody('agent/b', 'feature/b', 'file-b'));
  let state = deriveCoordinationState([claimA, claimB], owner);
  assert.equal(state.active.agent, 'agent/a');
  assert.equal(state.conflicts.length, 1);
  assert.equal(state.conflicts[0].agent, 'agent/b');

  state = deriveCoordinationState([claimA, claimB, comment(3, releaseBody('agent/a', 'feature/a'))], owner);
  assert.equal(state.active, null);
  assert.equal(state.conflicts.length, 0);
});

test('edited accepted claim fail-closes instead of transferring ownership', () => {
  const before = claimBody('agent/a', 'feature/a', 'file-a');
  const after = claimBody('agent/b', 'feature/b', 'file-b');
  const edited = comment(1, after, 'ruddvz', { updated_at: '2026-09-12T21:01:00Z' });
  const plan = planMutation({
    comments: [edited],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'edited',
    sourceComment: edited,
    beforeBody: before,
  });

  assert.equal(plan.kind, 'mutation');
  assert.equal(plan.beforeState.active.agent, 'agent/a');
  assert.equal(plan.afterState.active.agent, 'agent/b');
  assert.equal(plan.releaseActive.agent, 'agent/b');
  assert.equal(plan.files, 'file-a; file-b');

  const recovered = deriveCoordinationState(applyMutationPlan([edited], plan), owner);
  assert.equal(recovered.active.agent, HOLD_AGENT);
  assert.equal(recovered.active.branch, HOLD_BRANCH);
  assert.equal(recovered.active.files, 'file-a; file-b');
});

test('deleted accepted claim becomes an explicit integrity hold', () => {
  const deleted = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const plan = planMutation({
    comments: [],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: deleted,
    beforeBody: deleted.body,
  });

  assert.equal(plan.kind, 'mutation');
  assert.equal(plan.beforeState.active.agent, 'agent/a');
  assert.equal(plan.afterState.active, null);
  assert.equal(plan.releaseActive, null);

  const recovered = deriveCoordinationState(applyMutationPlan([], plan), owner);
  assert.equal(recovered.active.agent, HOLD_AGENT);
  assert.equal(recovered.active.files, 'file-a');
});

test('deleted accepted release does not silently resurrect its old owner', () => {
  const claimA = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const deletedRelease = comment(2, releaseBody('agent/a', 'feature/a'));
  const plan = planMutation({
    comments: [claimA],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: deletedRelease,
    beforeBody: deletedRelease.body,
  });

  assert.equal(plan.beforeState.active, null);
  assert.equal(plan.afterState.active.agent, 'agent/a');
  assert.equal(plan.releaseActive.agent, 'agent/a');

  const recovered = deriveCoordinationState(applyMutationPlan([claimA], plan), owner);
  assert.equal(recovered.active.agent, HOLD_AGENT);
});

test('deleted owner override does not silently resurrect a prior claim', () => {
  const claimA = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const deletedOverride = comment(2, overrideBody(), owner);
  const plan = planMutation({
    comments: [claimA],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: deletedOverride,
    beforeBody: deletedOverride.body,
  });

  assert.equal(plan.beforeState.active, null);
  assert.equal(plan.afterState.active.agent, 'agent/a');
  assert.equal(plan.releaseActive.agent, 'agent/a');

  const recovered = deriveCoordinationState(applyMutationPlan([claimA], plan), owner);
  assert.equal(recovered.active.agent, HOLD_AGENT);
});

test('edited release and override comments also force a hold even when the marker still parses', () => {
  const claimA = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));

  const originalRelease = comment(2, releaseBody('agent/a', 'feature/a'), owner);
  const editedRelease = comment(2, releaseBody('agent/b', 'feature/b'), owner, {
    updated_at: '2026-09-12T21:06:00Z',
  });
  const releasePlan = planMutation({
    comments: [claimA, editedRelease],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'edited',
    sourceComment: editedRelease,
    beforeBody: originalRelease.body,
  });
  assert.equal(releasePlan.kind, 'mutation');
  assert.equal(releasePlan.releaseActive.agent, 'agent/a');

  const originalOverride = comment(3, overrideBody('accepted reset'), owner);
  const editedOverride = comment(3, overrideBody('changed reset reason'), owner, {
    updated_at: '2026-09-12T21:07:00Z',
  });
  const overridePlan = planMutation({
    comments: [claimA, editedOverride],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'edited',
    sourceComment: editedOverride,
    beforeBody: originalOverride.body,
  });
  assert.equal(overridePlan.kind, 'mutation');
  assert.equal(overridePlan.beforeState.active, null);
  assert.equal(overridePlan.afterState.active, null);
});

test('repeated edits create distinct deterministic generations', () => {
  const one = integrityGeneration({
    issueNumber: 1405,
    action: 'edited',
    sourceCommentId: 10,
    beforeBody: claimBody('a', 'x'),
    afterBody: claimBody('b', 'y'),
    updatedAt: '2026-09-12T21:00:00Z',
  });
  const oneAgain = integrityGeneration({
    issueNumber: 1405,
    action: 'edited',
    sourceCommentId: 10,
    beforeBody: claimBody('a', 'x'),
    afterBody: claimBody('b', 'y'),
    updatedAt: '2026-09-12T21:00:00Z',
  });
  const two = integrityGeneration({
    issueNumber: 1405,
    action: 'edited',
    sourceCommentId: 10,
    beforeBody: claimBody('b', 'y'),
    afterBody: claimBody('c', 'z'),
    updatedAt: '2026-09-12T21:01:00Z',
  });

  assert.equal(one, oneAgain);
  assert.notEqual(one, two);
});

test('exact webhook redelivery is idempotent after mutation marker exists', () => {
  const before = claimBody('agent/a', 'feature/a', 'file-a');
  const after = claimBody('agent/b', 'feature/b', 'file-b');
  const edited = comment(1, after, owner, { updated_at: '2026-09-12T21:01:00Z' });
  const generation = integrityGeneration({
    issueNumber: 1405,
    action: 'edited',
    sourceCommentId: 1,
    beforeBody: before,
    afterBody: after,
    updatedAt: edited.updated_at,
  });
  const plan = planMutation({
    comments: [edited, comment(5, mutationMarker(generation), 'github-actions[bot]')],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'edited',
    sourceComment: edited,
    beforeBody: before,
  });
  assert.equal(plan.kind, 'duplicate');
  assert.equal(plan.generation, generation);
});

test('file scope cannot be narrowed by mutation', () => {
  const before = claimBody('agent/a', 'feature/a', 'file-a; file-b');
  const after = claimBody('agent/a', 'feature/a', 'file-a');
  const edited = comment(1, after, owner, { updated_at: '2026-09-12T21:02:00Z' });
  const plan = planMutation({
    comments: [edited],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'edited',
    sourceComment: edited,
    beforeBody: before,
  });
  assert.equal(plan.files, 'file-a; file-b');
  assert.equal(combineFileScopes('file-a; file-b', 'file-a'), 'file-a; file-b');
});

test('valid owner reconciliation releases only the matching active hold generation', () => {
  const source = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const mutation = planMutation({
    comments: [],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: source,
    beforeBody: source.body,
  });
  const held = applyMutationPlan([], mutation);
  const reconcile = comment(200, reconcileBody(mutation.generation), owner);
  const withReconcile = [...held, reconcile];
  const plan = planReconciliation({
    comments: withReconcile,
    repositoryOwner: owner,
    reconciliationComment: reconcile,
  });

  assert.equal(plan.kind, 'reconcile');
  const released = deriveCoordinationState(
    [...withReconcile, comment(201, plan.releaseBody, 'github-actions[bot]')],
    owner,
  );
  assert.equal(released.active, null);
});

test('wrong actor or wrong generation cannot reconcile a hold', () => {
  const source = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const mutation = planMutation({
    comments: [],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: source,
    beforeBody: source.body,
  });
  const held = applyMutationPlan([], mutation);

  const outsider = comment(200, reconcileBody(mutation.generation), 'someone-else');
  assert.equal(planReconciliation({
    comments: [...held, outsider],
    repositoryOwner: owner,
    reconciliationComment: outsider,
  }).kind, 'unauthorized');

  const wrong = comment(201, reconcileBody('0'.repeat(64)), owner);
  assert.equal(planReconciliation({
    comments: [...held, wrong],
    repositoryOwner: owner,
    reconciliationComment: wrong,
  }).kind, 'generation-mismatch');
});

test('ordinary release or override cannot bypass an unreconciled hold', () => {
  const source = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const mutation = planMutation({
    comments: [],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: source,
    beforeBody: source.body,
  });
  const held = applyMutationPlan([], mutation);

  const bypass = comment(300, releaseBody(HOLD_AGENT, HOLD_BRANCH), owner);
  const commentsAfterBypass = [...held, bypass];
  assert.equal(deriveCoordinationState(commentsAfterBypass, owner).active, null);

  const guard = planCreatedCoordinationGuard({
    comments: commentsAfterBypass,
    repositoryOwner: owner,
    issueNumber: 1405,
    createdComment: bypass,
  });
  assert.equal(guard.kind, 'reassert');

  const reheld = deriveCoordinationState(
    [...commentsAfterBypass, comment(301, guard.holdBody, 'github-actions[bot]')],
    owner,
  );
  assert.equal(reheld.active.agent, HOLD_AGENT);

  const override = comment(400, overrideBody('attempted bypass'), owner);
  const commentsAfterOverride = [...held, override];
  const overrideGuard = planCreatedCoordinationGuard({
    comments: commentsAfterOverride,
    repositoryOwner: owner,
    issueNumber: 1405,
    createdComment: override,
  });
  assert.equal(overrideGuard.kind, 'reassert');
});

test('registry recovery from append-only history matches the live hold outcome', () => {
  const before = claimBody('agent/a', 'feature/a', 'file-a');
  const after = claimBody('agent/b', 'feature/b', 'file-b');
  const edited = comment(1, after, owner, { updated_at: '2026-09-12T21:03:00Z' });
  const plan = planMutation({
    comments: [edited],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'edited',
    sourceComment: edited,
    beforeBody: before,
  });
  const history = applyMutationPlan([edited], plan);
  const live = deriveCoordinationState(history, owner);
  const recovered = deriveCoordinationState(JSON.parse(JSON.stringify(history)), owner);

  assert.deepEqual(recovered, live);
  assert.equal(latestHoldRecord(history, owner).generation, plan.generation);
});

test('editing or deleting a reconciliation source forces a new fail-closed generation', () => {
  const source = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const first = planMutation({
    comments: [],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: source,
    beforeBody: source.body,
  });
  const held = applyMutationPlan([], first);
  const reconciliation = comment(200, reconcileBody(first.generation), owner, {
    updated_at: '2026-09-12T21:04:00Z',
  });
  const release = comment(201, buildIntegrityReleaseBody(first.generation), 'github-actions[bot]');
  const historyAfterRelease = [...held, reconciliation, release];
  assert.equal(deriveCoordinationState(historyAfterRelease, owner).active, null);

  const editedReconciliation = comment(200, 'edited away', owner, {
    updated_at: '2026-09-12T21:05:00Z',
  });
  const current = [...held, editedReconciliation, release];
  const second = planMutation({
    comments: current,
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'edited',
    sourceComment: editedReconciliation,
    beforeBody: reconciliation.body,
  });

  assert.equal(second.kind, 'mutation');
  assert.notEqual(second.generation, first.generation);
  assert.equal(second.files, 'file-a');
  const reheld = deriveCoordinationState(applyMutationPlan(current, second, 300), owner);
  assert.equal(reheld.active.agent, HOLD_AGENT);
});

function fakeGithub(initialComments = []) {
  const comments = initialComments.map(item => JSON.parse(JSON.stringify(item)));
  let nextId = Math.max(0, ...comments.map(item => Number(item.id) || 0)) + 1;
  return {
    comments,
    paginate: async () => comments.map(item => JSON.parse(JSON.stringify(item))),
    rest: {
      issues: {
        listComments: async () => ({ data: comments }),
        createComment: async ({ body }) => {
          const created = comment(nextId++, body, 'github-actions[bot]');
          comments.push(created);
          return { data: created };
        },
      },
    },
  };
}

function issueCommentContext({ action, sourceComment, changes = undefined }) {
  return {
    eventName: 'issue_comment',
    repo: { owner, repo: 'garba' },
    payload: {
      action,
      issue: { number: 1405, state: 'open' },
      comment: sourceComment,
      ...(changes ? { changes } : {}),
    },
  };
}

test('live edited-comment path appends audit, release and fail-closed hold', async () => {
  const before = claimBody('agent/a', 'feature/a', 'file-a');
  const after = claimBody('agent/b', 'feature/b', 'file-b');
  const edited = comment(1, after, owner, { updated_at: '2026-09-12T21:08:00Z' });
  const github = fakeGithub([edited]);

  const result = await runClaimIntegrity({
    github,
    context: issueCommentContext({
      action: 'edited',
      sourceComment: edited,
      changes: { body: { from: before } },
    }),
    core: { info() {} },
  });

  assert.equal(result.kind, 'mutation');
  assert.equal(github.comments.length, 4);
  assert.match(github.comments[1].body, /agent-claim-integrity-mutation/);
  assert.match(github.comments[2].body, /agent-claim-integrity-internal/);
  assert.match(github.comments[3].body, /agent-claim-integrity-hold/);

  const state = deriveCoordinationState(github.comments, owner);
  assert.equal(state.active.agent, HOLD_AGENT);
  assert.equal(state.active.files, 'file-a; file-b');
});

test('live owner reconciliation path appends audit acknowledgement and releases the hold', async () => {
  const source = comment(1, claimBody('agent/a', 'feature/a', 'file-a'));
  const mutation = planMutation({
    comments: [],
    repositoryOwner: owner,
    issueNumber: 1405,
    action: 'deleted',
    sourceComment: source,
    beforeBody: source.body,
  });
  const held = applyMutationPlan([], mutation);
  const reconciliation = comment(500, reconcileBody(mutation.generation), owner);
  const github = fakeGithub([...held, reconciliation]);

  const result = await runClaimIntegrity({
    github,
    context: issueCommentContext({ action: 'created', sourceComment: reconciliation }),
    core: { info() {} },
  });

  assert.equal(result.kind, 'reconcile');
  assert.match(github.comments.at(-2).body, /agent-claim-integrity-reconciled/);
  assert.match(github.comments.at(-1).body, /agent-claim-integrity-release/);
  assert.equal(deriveCoordinationState(github.comments, owner).active, null);
});

test('parser keeps actor evidence but does not use it as per-agent authentication', () => {
  const a = comment(1, claimBody('agent/a', 'feature/a'), owner);
  const parsed = parseCoordinationEvent(a);
  assert.equal(parsed.author, owner);
  assert.equal(parsed.agent, 'agent/a');
});
