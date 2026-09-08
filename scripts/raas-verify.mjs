import { access, readFile } from 'node:fs/promises';
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
