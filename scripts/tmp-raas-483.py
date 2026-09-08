from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, found {count}')
    p.write_text(text.replace(old, new, 1))


replace_once(
    'scripts/validate-repository-structure.mjs',
    "const allowedRootDirs = new Set(['.github', 'assets', 'data', 'docs', 'public-site', 'scripts', 'src', 'styles']);",
    "const allowedRootDirs = new Set(['.github', '.raas', 'assets', 'data', 'docs', 'public-site', 'scripts', 'src', 'styles']);",
)
replace_once(
    'scripts/validate-repository-structure.mjs',
    "  'plan-direct-ingest.mjs',\n  'report-hosting-readiness.mjs',",
    "  'plan-direct-ingest.mjs',\n  'raas-verify.mjs',\n  'report-hosting-readiness.mjs',",
)

verifier = r'''import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REQUIRED_RAAS_FILES = Object.freeze([
  '.raas/RAAS.md',
  '.raas/PROJECT-CONTEXT.md',
  '.raas/EXECUTION.md',
  '.raas/LANGUAGE.md',
]);

const REFERENCE_DOCS = Object.freeze([...REQUIRED_RAAS_FILES]);
const ROOT_REFERENCES = new Set(['AGENTS.md', 'README.md', 'package.json']);

const exists = async (root, target) => {
  try {
    await access(path.join(root, target));
    return true;
  } catch {
    return false;
  }
};

const repoReference = (value) => {
  const target = value.trim().replace(/[.,;:]$/, '');
  if (ROOT_REFERENCES.has(target)) return target;
  if (/^(?:\.raas|docs|data)\//.test(target)) return target;
  return null;
};

export function extractRepositoryReferences(markdown) {
  const refs = new Set();
  for (const match of markdown.matchAll(/`([^`\n]+)`/g)) {
    const target = repoReference(match[1]);
    if (target) refs.add(target);
  }
  return [...refs].sort();
}

export async function validateRaas({ root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') } = {}) {
  const errors = [];
  const read = (target) => readFile(path.join(root, target), 'utf8');

  for (const target of REQUIRED_RAAS_FILES) {
    if (!await exists(root, target)) errors.push(`Missing required RAAS file: ${target}`);
  }
  if (!await exists(root, 'AGENTS.md')) errors.push('Missing AGENTS.md RAAS entry point');
  if (errors.length) return errors;

  const agents = await read('AGENTS.md');
  if (!agents.includes('## Load the RAAS harness first')) {
    errors.push('AGENTS.md is missing the RAAS preflight heading');
  }
  for (const target of REQUIRED_RAAS_FILES) {
    if (!agents.includes(`\`${target}\``)) {
      errors.push(`AGENTS.md no longer routes agents through ${target}`);
    }
  }

  for (const source of REFERENCE_DOCS) {
    const markdown = await read(source);
    for (const target of extractRepositoryReferences(markdown)) {
      if (!await exists(root, target)) {
        errors.push(`${source} references missing repository path: ${target}`);
      }
    }
  }

  return errors;
}

async function main() {
  const errors = await validateRaas();
  if (errors.length) {
    for (const error of errors) console.error(`✗ ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ RAAS harness verified: ${REQUIRED_RAAS_FILES.length} required files, AGENTS preflight and repository-local references are intact`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) await main();
'''
Path('scripts/raas-verify.mjs').write_text(verifier)

test = r'''import assert from 'node:assert/strict';
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
'''
Path('scripts/lib/test-raas-verify.mjs').write_text(test)

package_path = Path('package.json')
pkg = json.loads(package_path.read_text())
scripts = pkg['scripts']
scripts['raas:verify'] = 'node scripts/raas-verify.mjs'
scripts['raas:test'] = 'node scripts/lib/test-raas-verify.mjs'
for command in ['node --check scripts/raas-verify.mjs', 'node --check scripts/lib/test-raas-verify.mjs']:
    if command not in scripts['check:modules']:
        scripts['check:modules'] += ' && ' + command
raas_checks = 'npm run raas:test && npm run raas:verify && '
if raas_checks not in scripts['check']:
    anchor = 'npm run repo:validate && '
    if anchor not in scripts['check']:
        raise SystemExit('package.json: repo validation anchor missing')
    scripts['check'] = scripts['check'].replace(anchor, raas_checks + anchor, 1)
package_path.write_text(json.dumps(pkg, indent=2) + '\n')
