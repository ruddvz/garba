import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const index = await readJson('data/catalogue/index.json');

const assignments = new Map(Object.entries({
  'ochhav-2023': { presentationRole: 'catalogue-alias', canonicalReleaseId: 'ochhav-aditya-gadhvi-2023', nonstopSetId: 'set-aditya-ochhav-2023' },
  'zankaar2-album-2023': { presentationRole: 'catalogue-alias', canonicalReleaseId: 'zankaar-2-geeta-rabari-2023' },
  'zankaar-continuous-2022': { presentationRole: 'source-only', canonicalReleaseId: 'zankaar-album-2022' },
  'zankaar2-continuous-2023': { presentationRole: 'source-only', canonicalReleaseId: 'zankaar-2-geeta-rabari-2023' },
  'pooja-garba-ni-ramzat-4-0-continuous-2025': { presentationRole: 'nonstop-only', canonicalReleaseId: 'pooja-garba-ni-ramzat-4-0-album-2025', nonstopSetId: 'set-pooja-garba-ni-ramzat-4-0-2025' },
  'ramzat5-continuous-2024': { presentationRole: 'nonstop-only', canonicalReleaseId: 'ramzat5-album-2024', nonstopSetId: 'set-ramzat5-2024' },
  'shakti-2-nonstop-garba-continuous-2022': { presentationRole: 'nonstop-only', canonicalReleaseId: 'shakti-2-rushabh-santvani-2022', nonstopSetId: 'set-shakti-2-santvani-rushabh-2022' },
  'taal4-continuous-2025': { presentationRole: 'source-only', canonicalReleaseId: 'taal4-album-2025' },
}));

const found = new Set();
let changedFiles = 0;
for (const file of index.releaseChunks || []) {
  const full = path.join(root, file);
  const releases = JSON.parse(await readFile(full, 'utf8'));
  let changed = false;
  for (const release of releases) {
    const assignment = assignments.get(release.id);
    if (!assignment) continue;
    found.add(release.id);
    for (const [key, value] of Object.entries(assignment)) {
      if (release[key] === value) continue;
      release[key] = value;
      changed = true;
    }
  }
  if (changed) {
    await writeFile(full, `${JSON.stringify(releases)}\n`);
    changedFiles += 1;
  }
}

const missing = [...assignments.keys()].filter((id) => !found.has(id));
if (missing.length) throw new Error(`Presentation assignments target missing releases: ${missing.join(', ')}`);

// The verified Ochhav discovery set previously pointed at the older duplicate album ID.
// Keep the set, but make its canonical release relationship match the richer YouTube-backed album.
const ochhavFile = 'data/discovery/sets/sets-01.json';
const ochhavPayload = await readJson(ochhavFile);
const ochhavSet = ochhavPayload.sets?.find((set) => set.id === 'set-aditya-ochhav-2023');
if (!ochhavSet) throw new Error('Expected Ochhav nonstop set is missing');
if (ochhavSet.linkedReleaseId !== 'ochhav-aditya-gadhvi-2023') {
  ochhavSet.linkedReleaseId = 'ochhav-aditya-gadhvi-2023';
  await writeFile(path.join(root, ochhavFile), `${JSON.stringify(ochhavPayload)}\n`);
  changedFiles += 1;
}

console.log(`Applied ${assignments.size} release presentation assignments across ${changedFiles} files.`);
