import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { REQUIRED_RAAS_FILES, extractRepositoryReferences, validateRaas } from '../raas-verify.mjs';

const roots = [];
const createFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'garba-raas-'));
  roots.push(root);
  await mkdir(path.join(root, '.raas'), { recursive: true });
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await writeFile(path.join(root, 'docs/README.md'), '# Docs\n');
  await writeFile(path.join(root, 'AGENTS.md'), [
    '# Agent rules',
    '## Load the RAAS harness first',
    ...REQUIRED_RAAS_FILES.map((file) => `- \`${file}\``),
  ].join('\n'));
  await writeFile(path.join(root, '.raas/RAAS.md'), '`AGENTS.md` `.raas/PROJECT-CONTEXT.md`\n');
  await writeFile(path.join(root, '.raas/PROJECT-CONTEXT.md'), '`docs/README.md`\n');
  await writeFile(path.join(root, '.raas/EXECUTION.md'), '`AGENTS.md`\n');
  await writeFile(path.join(root, '.raas/LANGUAGE.md'), '# Language\n');
  return root;
};

try {
  assert.deepEqual(extractRepositoryReferences('`docs/README.md` `npm run check` `https://example.com`'), ['docs/README.md']);

  const valid = await createFixture();
  assert.deepEqual(await validateRaas({ root: valid }), [], 'valid harness fixture should pass');

  const missingFile = await createFixture();
  await rm(path.join(missingFile, '.raas/LANGUAGE.md'));
  assert.match((await validateRaas({ root: missingFile })).join('\n'), /Missing required RAAS file: \.raas\/LANGUAGE\.md/);

  const brokenAgents = await createFixture();
  await writeFile(path.join(brokenAgents, 'AGENTS.md'), '# Agent rules\n');
  const agentErrors = (await validateRaas({ root: brokenAgents })).join('\n');
  assert.match(agentErrors, /missing the RAAS preflight heading/i);
  assert.match(agentErrors, /no longer routes agents through \.raas\/RAAS\.md/);

  const brokenReference = await createFixture();
  await writeFile(path.join(brokenReference, '.raas/PROJECT-CONTEXT.md'), '`docs/missing.md`\n');
  assert.match((await validateRaas({ root: brokenReference })).join('\n'), /references missing repository path: docs\/missing\.md/);

  console.log('✓ RAAS verifier self-tests cover valid, missing-file, broken-preflight and broken-reference states');
} finally {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
}
