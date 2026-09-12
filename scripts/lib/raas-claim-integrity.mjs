import crypto from 'node:crypto';

export const HOLD_AGENT = 'raas-integrity-hold';
export const HOLD_BRANCH = 'main';

const claimRe = /<!--\s*agent-claim\s*\n([\s\S]*?)-->/i;
const releaseRe = /<!--\s*agent-release\s*\n([\s\S]*?)-->/i;
const overrideRe = /<!--\s*agent-claim-override\s*\n([\s\S]*?)-->/i;
const reconcileRe = /<!--\s*agent-claim-integrity-reconcile\s*\n([\s\S]*?)-->/i;
const holdRe = /<!--\s*agent-claim-integrity-hold\s*\n([\s\S]*?)-->/i;
const mutationGenerationRe = /<!--\s*agent-claim-integrity-mutation\s*\n([\s\S]*?)-->/i;
const generatedMarkerRe = /<!--\s*agent-claim-integrity-(?:mutation|hold|internal|release|reconciled)\b/i;

function field(block, name) {
  const match = String(block || '').match(new RegExp(`^${name}:\\s*(.+?)\\s*$`, 'mi'));
  return match ? match[1].trim() : '';
}

function authorOf(comment) {
  return comment?.user?.login || comment?.author || 'unknown';
}

export function parseCoordinationEvent(comment) {
  const body = comment?.body || '';
  const override = body.match(overrideRe);
  if (override) {
    return {
      type: 'override',
      reason: field(override[1], 'reason'),
      author: authorOf(comment),
      commentId: Number(comment.id),
    };
  }

  const release = body.match(releaseRe);
  if (release) {
    return {
      type: 'release',
      agent: field(release[1], 'agent'),
      branch: field(release[1], 'branch'),
      author: authorOf(comment),
      commentId: Number(comment.id),
    };
  }

  const claim = body.match(claimRe);
  if (claim) {
    return {
      type: 'claim',
      agent: field(claim[1], 'agent'),
      branch: field(claim[1], 'branch'),
      scope: field(claim[1], 'scope'),
      files: field(claim[1], 'files'),
      author: authorOf(comment),
      commentId: Number(comment.id),
    };
  }

  return null;
}

export function parseReconciliation(comment) {
  const match = String(comment?.body || '').match(reconcileRe);
  if (!match) return null;
  return {
    generation: field(match[1], 'generation'),
    reason: field(match[1], 'reason'),
    author: authorOf(comment),
    commentId: Number(comment.id),
  };
}

export function parseHoldMetadata(comment) {
  const match = String(comment?.body || '').match(holdRe);
  if (!match) return null;
  return {
    generation: field(match[1], 'generation'),
    sourceCommentId: Number(field(match[1], 'source-comment-id')),
    action: field(match[1], 'action'),
    commentId: Number(comment.id),
  };
}

export function parseMutationGeneration(comment) {
  const match = String(comment?.body || '').match(mutationGenerationRe);
  return match ? field(match[1], 'generation') : '';
}

export function isGeneratedIntegrityComment(comment) {
  return generatedMarkerRe.test(String(comment?.body || ''));
}

function validClaim(event) {
  return event?.type === 'claim' && event.agent && event.branch && event.scope && event.files;
}

function sameOwner(a, b) {
  return Boolean(a && b && a.agent === b.agent && a.branch === b.branch);
}

export function deriveCoordinationState(comments, repositoryOwner) {
  let active = null;
  let conflicts = [];

  for (const comment of [...comments].sort((a, b) => Number(a.id) - Number(b.id))) {
    const event = parseCoordinationEvent(comment);
    if (!event) continue;

    if (event.type === 'override') {
      if (event.author === repositoryOwner) {
        active = null;
        conflicts = [];
      }
      continue;
    }

    if (event.type === 'release') {
      if (active && sameOwner(active, event)) {
        active = null;
        conflicts = [];
      } else {
        conflicts = conflicts.filter(conflict => !sameOwner(conflict, event));
      }
      continue;
    }

    if (!validClaim(event)) continue;

    if (!active) {
      active = event;
      conflicts = [];
    } else if (sameOwner(active, event)) {
      active = event;
    } else {
      conflicts.push(event);
    }
  }

  return { active, conflicts };
}

export function isIntegrityHoldEvent(event) {
  return event?.type === 'claim' && event.agent === HOLD_AGENT && event.branch === HOLD_BRANCH;
}

function commentById(comments, commentId) {
  return comments.find(comment => Number(comment.id) === Number(commentId)) || null;
}

export function isActiveIntegrityHold(state, comments) {
  if (!isIntegrityHoldEvent(state?.active)) return false;
  return Boolean(parseHoldMetadata(commentById(comments, state.active.commentId)));
}

export function latestHoldRecord(comments, repositoryOwner) {
  let record = null;
  for (const comment of [...comments].sort((a, b) => Number(a.id) - Number(b.id))) {
    const event = parseCoordinationEvent(comment);
    const metadata = parseHoldMetadata(comment);
    if (metadata && isIntegrityHoldEvent(event) && metadata.generation) {
      record = {
        ...metadata,
        files: event.files,
        scope: event.scope,
        claimCommentId: Number(comment.id),
        reconciled: false,
      };
      continue;
    }

    const reconciliation = parseReconciliation(comment);
    if (
      record &&
      reconciliation?.generation &&
      reconciliation.reason &&
      reconciliation.generation === record.generation &&
      reconciliation.author === repositoryOwner
    ) {
      record.reconciled = true;
      record.reconciliationCommentId = Number(comment.id);
    }
  }
  return record;
}

function canonicalSource(body, comment) {
  const normalized = { ...comment, body: body || '' };
  const coordination = parseCoordinationEvent(normalized);
  if (coordination) return coordination;

  const reconciliation = parseReconciliation(normalized);
  if (reconciliation) {
    return {
      type: 'integrity-reconcile',
      generation: reconciliation.generation,
      reason: reconciliation.reason,
      author: reconciliation.author,
      commentId: reconciliation.commentId,
    };
  }

  const hold = parseHoldMetadata(normalized);
  if (hold) {
    return {
      type: 'integrity-hold',
      generation: hold.generation,
      sourceCommentId: hold.sourceCommentId,
      action: hold.action,
      author: authorOf(normalized),
      commentId: Number(normalized.id),
    };
  }

  return null;
}

function base64Json(value) {
  if (!value) return '';
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

export function digestText(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

export function integrityGeneration({
  issueNumber,
  action,
  sourceCommentId,
  beforeBody = '',
  afterBody = '',
  updatedAt = '',
}) {
  const payload = JSON.stringify({
    issueNumber: Number(issueNumber),
    action: String(action || ''),
    sourceCommentId: Number(sourceCommentId),
    beforeBody: String(beforeBody || ''),
    afterBody: String(afterBody || ''),
    updatedAt: String(updatedAt || ''),
  });
  return digestText(payload);
}

function splitFileScope(value) {
  return String(value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);
}

export function combineFileScopes(...values) {
  const ordered = [];
  const seen = new Set();
  for (const value of values) {
    for (const item of splitFileScope(value)) {
      if (!seen.has(item)) {
        seen.add(item);
        ordered.push(item);
      }
    }
  }
  const concrete = ordered.filter(item => item !== 'research-only');
  return (concrete.length ? concrete : ordered).join('; ') || 'research-only';
}

function reconstructBeforeComments(comments, sourceComment, action, beforeBody) {
  const sourceId = Number(sourceComment?.id);
  const copy = comments
    .filter(comment => Number(comment.id) !== sourceId)
    .map(comment => ({ ...comment, user: comment.user ? { ...comment.user } : comment.user }));

  if (beforeBody) {
    copy.push({
      ...sourceComment,
      id: sourceId,
      body: beforeBody,
      user: sourceComment?.user ? { ...sourceComment.user } : sourceComment?.user,
    });
  } else if (action === 'deleted' && sourceComment?.body) {
    copy.push({
      ...sourceComment,
      id: sourceId,
      body: sourceComment.body,
      user: sourceComment?.user ? { ...sourceComment.user } : sourceComment?.user,
    });
  }

  return copy.sort((a, b) => Number(a.id) - Number(b.id));
}

function currentSourceBody(action, sourceComment) {
  return action === 'deleted' ? '' : String(sourceComment?.body || '');
}

export function buildMutationAuditBody({
  issueNumber,
  sourceCommentId,
  action,
  generation,
  beforeBody,
  afterBody,
  beforeSource,
  afterSource,
  beforeState,
  afterState,
}) {
  const beforeActive = beforeState?.active
    ? `${beforeState.active.agent}@${beforeState.active.branch}`
    : 'available';
  const afterActive = afterState?.active
    ? `${afterState.active.agent}@${afterState.active.branch}`
    : 'available';

  return [
    '<!-- agent-claim-integrity-mutation',
    `generation: ${generation}`,
    `source-comment-id: ${sourceCommentId}`,
    `action: ${action}`,
    `before-digest: ${digestText(beforeBody)}`,
    `after-digest: ${digestText(afterBody)}`,
    `before-event-b64: ${base64Json(beforeSource) || 'none'}`,
    `after-event-b64: ${base64Json(afterSource) || 'none'}`,
    '-->',
    '### Agent claim integrity mutation',
    '',
    `Issue #${issueNumber} coordination source comment ${sourceCommentId} was ${action}.`,
    `Generation: \`${generation}\`.`,
    `State before mutation: \`${beforeActive}\`.`,
    `State after mutation before fail-closed hold: \`${afterActive}\`.`,
    '',
    'RAAS is holding this lane fail-closed until an explicit repository-owner reconciliation event is accepted.',
  ].join('\n');
}

export function buildInternalReleaseBody(active, generation, reason = 'integrity-mutation') {
  return [
    '<!-- agent-release',
    `agent: ${active.agent}`,
    `branch: ${active.branch}`,
    '-->',
    '<!-- agent-claim-integrity-internal',
    `generation: ${generation}`,
    `reason: ${reason}`,
    '-->',
    `RELEASE: internal RAAS integrity transition for generation ${generation}; ownership is immediately replaced by a fail-closed integrity hold.`,
  ].join('\n');
}

export function buildHoldClaimBody({
  issueNumber,
  sourceCommentId,
  action,
  generation,
  files,
}) {
  return [
    '<!-- agent-claim',
    `agent: ${HOLD_AGENT}`,
    `branch: ${HOLD_BRANCH}`,
    `scope: Fail-closed RAAS integrity hold for issue #${issueNumber} after ${action} mutation of coordination comment ${sourceCommentId}; explicit owner reconciliation is required before the lane can become available or reassigned.`,
    `files: ${files}`,
    '-->',
    '<!-- agent-claim-integrity-hold',
    `generation: ${generation}`,
    `source-comment-id: ${sourceCommentId}`,
    `action: ${action}`,
    '-->',
    `CLAIM: RAAS integrity hold owns #${issueNumber} for mutation generation \`${generation}\`. Do not reassign this lane until an explicit \`agent-claim-integrity-reconcile\` event for this generation is accepted.`,
  ].join('\n');
}

export function buildReconciledBody({ generation, reconciliationCommentId, reason }) {
  return [
    '<!-- agent-claim-integrity-reconciled',
    `generation: ${generation}`,
    `reconciliation-comment-id: ${reconciliationCommentId}`,
    '-->',
    '### Agent claim integrity reconciled',
    '',
    `Repository-owner reconciliation accepted for generation \`${generation}\`.`,
    reason ? `Reason: ${reason}` : 'Reason: reviewed and accepted.',
    'The synthetic integrity hold will now be released. Any implementation owner must claim the lane normally afterwards.',
  ].join('\n');
}

export function buildIntegrityReleaseBody(generation) {
  return [
    '<!-- agent-release',
    `agent: ${HOLD_AGENT}`,
    `branch: ${HOLD_BRANCH}`,
    '-->',
    '<!-- agent-claim-integrity-release',
    `generation: ${generation}`,
    '-->',
    `RELEASE: repository-owner reconciliation accepted for RAAS integrity generation ${generation}.`,
  ].join('\n');
}

export function planMutation({
  comments,
  repositoryOwner,
  issueNumber,
  action,
  sourceComment,
  beforeBody = '',
}) {
  const sourceCommentId = Number(sourceComment?.id);
  const afterBody = currentSourceBody(action, sourceComment);
  const effectiveBeforeBody = beforeBody || (action === 'deleted' ? String(sourceComment?.body || '') : '');
  const beforeSource = canonicalSource(effectiveBeforeBody, sourceComment);
  const afterSource = canonicalSource(afterBody, sourceComment);

  if (!beforeSource && !afterSource) return { kind: 'irrelevant' };

  const generation = integrityGeneration({
    issueNumber,
    action,
    sourceCommentId,
    beforeBody: effectiveBeforeBody,
    afterBody,
    updatedAt: sourceComment?.updated_at || '',
  });

  if (comments.some(comment => parseMutationGeneration(comment) === generation)) {
    return { kind: 'duplicate', generation };
  }

  const beforeComments = reconstructBeforeComments(comments, sourceComment, action, effectiveBeforeBody);
  const beforeState = deriveCoordinationState(beforeComments, repositoryOwner);
  const afterState = deriveCoordinationState(comments, repositoryOwner);
  const previousHold = latestHoldRecord(beforeComments, repositoryOwner) || latestHoldRecord(comments, repositoryOwner);

  const files = combineFileScopes(
    previousHold?.files,
    beforeState.active?.files,
    afterState.active?.files,
    beforeSource?.files,
    afterSource?.files,
  );

  return {
    kind: 'mutation',
    generation,
    sourceCommentId,
    beforeSource,
    afterSource,
    beforeState,
    afterState,
    files,
    releaseActive: afterState.active && !isActiveIntegrityHold(afterState, comments)
      ? afterState.active
      : null,
    auditBody: buildMutationAuditBody({
      issueNumber,
      sourceCommentId,
      action,
      generation,
      beforeBody: effectiveBeforeBody,
      afterBody,
      beforeSource,
      afterSource,
      beforeState,
      afterState,
    }),
    holdBody: buildHoldClaimBody({
      issueNumber,
      sourceCommentId,
      action,
      generation,
      files,
    }),
  };
}

export function planReconciliation({
  comments,
  repositoryOwner,
  reconciliationComment,
}) {
  const reconciliation = parseReconciliation(reconciliationComment);
  if (!reconciliation?.generation || !/^[a-f0-9]{64}$/i.test(reconciliation.generation) || !reconciliation.reason) {
    return { kind: 'invalid' };
  }
  if (reconciliation.author !== repositoryOwner) return { kind: 'unauthorized' };

  const state = deriveCoordinationState(comments, repositoryOwner);
  const activeComment = state.active ? commentById(comments, state.active.commentId) : null;
  const hold = activeComment ? parseHoldMetadata(activeComment) : null;

  if (!hold || !isIntegrityHoldEvent(state.active)) return { kind: 'no-active-hold' };
  if (hold.generation !== reconciliation.generation) {
    return { kind: 'generation-mismatch', activeGeneration: hold.generation };
  }

  return {
    kind: 'reconcile',
    generation: hold.generation,
    reason: reconciliation.reason,
    releaseBody: buildIntegrityReleaseBody(hold.generation),
    reconciledBody: buildReconciledBody({
      generation: hold.generation,
      reconciliationCommentId: reconciliation.commentId,
      reason: reconciliation.reason,
    }),
  };
}

export function planCreatedCoordinationGuard({
  comments,
  repositoryOwner,
  issueNumber,
  createdComment,
}) {
  if (!parseCoordinationEvent(createdComment)) return { kind: 'irrelevant' };
  if (isGeneratedIntegrityComment(createdComment)) return { kind: 'generated' };

  const latestHold = latestHoldRecord(comments, repositoryOwner);
  if (!latestHold || latestHold.reconciled) return { kind: 'no-hold' };

  const state = deriveCoordinationState(comments, repositoryOwner);
  if (isActiveIntegrityHold(state, comments)) return { kind: 'still-held' };

  const files = combineFileScopes(latestHold.files, state.active?.files);
  return {
    kind: 'reassert',
    generation: latestHold.generation,
    files,
    releaseActive: state.active || null,
    holdBody: buildHoldClaimBody({
      issueNumber,
      sourceCommentId: latestHold.sourceCommentId,
      action: 'reasserted',
      generation: latestHold.generation,
      files,
    }),
  };
}

async function listIssueComments(github, owner, repo, issueNumber) {
  return github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
}

async function createIssueComment(github, owner, repo, issueNumber, body) {
  return github.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function runClaimIntegrity({ github, context, core = console, boardIssue = 364 }) {
  if (context.eventName !== 'issue_comment') return { kind: 'ignored-event' };

  const action = String(context.payload.action || '');
  const issue = context.payload.issue;
  const sourceComment = context.payload.comment;

  if (!issue || !sourceComment || issue.pull_request) return { kind: 'ignored-target' };

  const issueNumber = Number(issue.number);
  if (!issueNumber || issueNumber === Number(boardIssue)) return { kind: 'ignored-board' };

  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const comments = await listIssueComments(github, owner, repo, issueNumber);

  if (action === 'created') {
    if (isGeneratedIntegrityComment(sourceComment)) return { kind: 'generated' };

    const reconciliation = parseReconciliation(sourceComment);
    if (reconciliation) {
      const plan = planReconciliation({
        comments,
        repositoryOwner: owner,
        reconciliationComment: sourceComment,
      });
      if (plan.kind !== 'reconcile') {
        core.info?.(`RAAS claim-integrity reconciliation ignored: ${plan.kind}.`);
        return plan;
      }
      await createIssueComment(github, owner, repo, issueNumber, plan.reconciledBody);
      await createIssueComment(github, owner, repo, issueNumber, plan.releaseBody);
      return plan;
    }

    const guard = planCreatedCoordinationGuard({
      comments,
      repositoryOwner: owner,
      issueNumber,
      createdComment: sourceComment,
    });
    if (guard.kind !== 'reassert') return guard;

    if (guard.releaseActive) {
      await createIssueComment(
        github,
        owner,
        repo,
        issueNumber,
        buildInternalReleaseBody(guard.releaseActive, guard.generation, 'integrity-hold-reassertion'),
      );
    }
    await createIssueComment(github, owner, repo, issueNumber, guard.holdBody);
    return guard;
  }

  if (!['edited', 'deleted'].includes(action)) return { kind: 'ignored-action' };

  const beforeBody = action === 'edited'
    ? String(context.payload.changes?.body?.from || '')
    : String(sourceComment.body || '');

  const plan = planMutation({
    comments,
    repositoryOwner: owner,
    issueNumber,
    action,
    sourceComment,
    beforeBody,
  });

  if (plan.kind !== 'mutation') {
    core.info?.(`RAAS claim-integrity mutation ignored: ${plan.kind}.`);
    return plan;
  }

  await createIssueComment(github, owner, repo, issueNumber, plan.auditBody);

  if (plan.releaseActive) {
    await createIssueComment(
      github,
      owner,
      repo,
      issueNumber,
      buildInternalReleaseBody(plan.releaseActive, plan.generation),
    );
  }

  await createIssueComment(github, owner, repo, issueNumber, plan.holdBody);
  return plan;
}
