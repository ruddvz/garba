import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { REQUIRED_RAAS_FILES, extractRepositoryReferences, validateRaas } from './raas-verify.mjs';

const roots = [];
const createFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'garba-raas-'));
  roots.push(root);
  await mkdir(path.join(root, '.raas/clients'), { recursive: true });
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await mkdir(path.join(root, 'scripts'), { recursive: true });
  await writeFile(path.join(root, 'docs/README.md'), '# Docs\n');
  await writeFile(path.join(root, 'scripts/raas-task.mjs'), '// task compiler\n');
  await writeFile(path.join(root, 'AGENTS.md'), [
    '# Agent rules',
    '## Load the RAAS harness first',
    '- `.raas/RAAS.md`',
    '- `.raas/PROJECT-CONTEXT.md`',
    '- `.raas/EXECUTION.md`',
    '- `.raas/LANGUAGE.md`',
  ].join('\n'));

  for (const target of REQUIRED_RAAS_FILES) {
    if (target === '.raas/config.json') continue;
    await mkdir(path.dirname(path.join(root, target)), { recursive: true });
    await writeFile(path.join(root, target), `# ${path.basename(target)}\n`);
  }
  await writeFile(path.join(root, '.raas/BOOTSTRAP.md'), '`AGENTS.md` `.raas/RAAS.md` `scripts/raas-task.mjs`\n');
  await writeFile(path.join(root, '.raas/RAAS.md'), '`AGENTS.md` `.raas/PROJECT-CONTEXT.md`\n');
  await writeFile(path.join(root, '.raas/PROJECT-CONTEXT.md'), '`docs/README.md`\n');
  await writeFile(path.join(root, '.raas/EXECUTION.md'), '`AGENTS.md`\n');
  await writeFile(path.join(root, '.raas/config.json'), JSON.stringify({
    version: 1,
    entrypoints: ['AGENTS.md', '.raas/RAAS.md', '.raas/PROJECT-CONTEXT.md', '.raas/EXECUTION.md'],
    languageContext: '.raas/LANGUAGE.md',
  }));
  return root;
};

try {
  assert.deepEqual(extractRepositoryReferences('`docs/README.md` `npm run check` `https://example.com`'), ['docs/README.md']);

  const valid = await createFixture();
  assert.deepEqual(await validateRaas({ root: valid }), [], 'valid harness fixture should pass');

  const missingFile = await createFixture();
  await rm(path.join(missingFile, '.raas/clients/chatgpt.md'));
  assert.match((await validateRaas({ root: missingFile })).join('\n'), /Missing required RAAS file: \.raas\/clients\/chatgpt\.md/);

  const brokenAgents = await createFixture();
  await writeFile(path.join(brokenAgents, 'AGENTS.md'), '# Agent rules\n');
  const agentErrors = (await validateRaas({ root: brokenAgents })).join('\n');
  assert.match(agentErrors, /missing the RAAS preflight heading/i);
  assert.match(agentErrors, /no longer routes agents through \.raas\/RAAS\.md/);

  const brokenReference = await createFixture();
  await writeFile(path.join(brokenReference, '.raas/PROJECT-CONTEXT.md'), '`docs/missing.md`\n');
  assert.match((await validateRaas({ root: brokenReference })).join('\n'), /references missing repository path: docs\/missing\.md/);

  const brokenConfig = await createFixture();
  await writeFile(path.join(brokenConfig, '.raas/config.json'), JSON.stringify({
    entrypoints: ['AGENTS.md', 'docs/missing.md'],
    languageContext: '.raas/LANGUAGE.md',
  }));
  assert.match((await validateRaas({ root: brokenConfig })).join('\n'), /config\.json references missing repository path: docs\/missing\.md/);

  console.log(`✓ RAAS verifier self-tests cover ${REQUIRED_RAAS_FILES.length} required files plus valid, missing-file, broken-preflight, broken-reference and broken-config states`);
} finally {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
}
