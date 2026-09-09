import assert from 'node:assert/strict'
import { compileAdaptiveTask } from './raas-adaptive.mjs'

function routeIds(result) {
  return result.routes.map((route) => route.id)
}

{
  const result = compileAdaptiveTask('Add a concise description to the Ochhav release.')
  assert.equal(result.tier, 'fast')
  assert.equal(result.mode, 'metadata-content-change')
  assert.equal(result.delivery_stop, 'local-change')
  assert.equal(result.mutation_allowed, true)
  assert.deepEqual(routeIds(result), ['catalogue'])
  assert.equal(result.budget.maxSources, 4)
  assert.equal(result.verification_frontier.includes('browser-manual-when-acceptance-is-visual'), false)
}

{
  const result = compileAdaptiveTask('Migrate the exact YouTube playback route to the verified recording.')
  assert.equal(result.tier, 'standard')
  assert.equal(result.risk, 'high')
  assert.equal(result.truth_sensitivity, 'playback-source')
  assert.equal(result.verification_frontier.includes('exact-source-runtime-route-check'), true)
}

{
  const result = compileAdaptiveTask('Fix the player transport controls on mobile.')
  assert.equal(result.tier, 'standard')
  assert.equal(result.risk, 'high')
  assert.equal(result.verification_frontier.includes('browser-manual-when-acceptance-is-visual'), true)
  assert.equal(result.parallelism_policy.mutation_lanes_max, 1)
}

{
  const result = compileAdaptiveTask('Fix the PWA service worker offline caching behaviour.')
  assert.equal(result.tier, 'deep')
  assert.equal(result.blast_radius, 'pwa-public-site')
  assert.equal(result.verification_frontier.includes('repository-ci'), true)
}

{
  const result = compileAdaptiveTask('Deploy the current site to production and verify it live.')
  assert.equal(result.tier, 'critical')
  assert.equal(result.delivery_stop, 'production-verification')
  assert.equal(result.truth_sensitivity, 'deployment')
  assert.equal(result.verification_frontier.includes('live-production-verification'), true)
  assert.equal(result.budget.requiresExpansionReason, true)
}

{
  const result = compileAdaptiveTask('Fix everything across the player, Explore, PWA and catalogue.')
  assert.equal(result.needs_split, true)
  assert.equal(result.tier, 'deep')
  assert.equal(result.stop_conditions[0].includes('split'), true)
}

{
  const result = compileAdaptiveTask('Create a plan to improve player and PWA behaviour.')
  assert.equal(result.mode, 'plan')
  assert.equal(result.delivery_stop, 'plan')
  assert.equal(result.mutation_allowed, false)
  assert.equal(result.tier, 'deep')
}

{
  const result = compileAdaptiveTask('Explain how the player queue works.')
  assert.equal(result.mode, 'answer')
  assert.equal(result.delivery_stop, 'answer')
  assert.equal(result.mutation_allowed, false)
}

{
  const result = compileAdaptiveTask('Audit redistribution rights before changing the licensed source.')
  assert.equal(result.tier, 'critical')
  assert.equal(result.truth_sensitivity, 'rights')
  assert.equal(result.verification_frontier.includes('rights-provenance-check'), true)
}

{
  const result = compileAdaptiveTask('Fix the mobile button layout.')
  assert.equal(result.verification_frontier.includes('browser-manual-when-acceptance-is-visual'), true)
}

{
  const result = compileAdaptiveTask('Add a concise description to the Garbi release.')
  assert.equal(result.budget_is_ceiling_not_target, true)
  assert.equal(result.value_of_information.skipWhenNo, true)
  assert.equal(result.context_policy.max_sources, 4)
}

console.log('RAAS adaptive CTO tests: PASS')
