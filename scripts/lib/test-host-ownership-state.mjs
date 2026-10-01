import assert from 'node:assert/strict';
import { classifyHostOwnership } from './validate-host-ownership.mjs';

const cases = [
  {
    name: 'GitHub Pages is the only valid production host',
    input: { cnameContent: 'playgarba.com\n' },
    expected: { ok: true, state: 'pages-only', canonicalSource: 'github-pages' },
  },
  {
    name: 'missing Pages custom domain fails closed',
    input: { cnameContent: '' },
    expected: { ok: false, state: 'invalid', canonicalSource: null },
  },
  {
    name: 'unexpected Pages CNAME fails closed',
    input: { cnameContent: 'www.playgarba.com' },
    expected: { ok: false, state: 'invalid', canonicalSource: null },
  },
];

for (const testCase of cases) {
  const result = classifyHostOwnership(testCase.input);
  assert.equal(result.ok, testCase.expected.ok, `${testCase.name}: ok`);
  assert.equal(result.state, testCase.expected.state, `${testCase.name}: state`);
  assert.equal(result.canonicalSource, testCase.expected.canonicalSource, `${testCase.name}: canonicalSource`);
  if (!result.ok) assert.ok(result.errors.length > 0, `${testCase.name}: invalid states must explain why`);
  console.log(`✓ ${testCase.name}`);
}

console.log(`✓ Pages-only hosting policy regression tests passed (${cases.length} cases)`);
