import assert from 'node:assert/strict'
import { compileTask } from './raas-task.mjs'

function routeIds(task) {
  return task.routes.map((route) => route.id)
}

{
  const task = compileTask('Fix the mobile player so verified YouTube playback opens correctly and next song continuity still works.')
  assert.equal(task.needs_split, false)
  assert.ok(routeIds(task).includes('playback'))
  assert.ok(routeIds(task).includes('visual-ui'))
  assert.ok(task.risks.includes('wrong recording identity'))
  assert.equal(task.client_contract, '.raas/BOOTSTRAP.md')
}

{
  const task = compileTask('Correct duplicate release metadata and the track list for one Ramzat album without guessing missing facts.')
  assert.equal(task.needs_split, false)
  assert.ok(routeIds(task).includes('catalogue'))
  assert.ok(task.truth_sources.includes('data/catalogue/index.json'))
  assert.ok(task.non_goals.some((item) => item.includes('Do not invent catalogue')))
}

{
  const task = compileTask('Make the Explore mobile layout cleaner and improve the search controls without changing playback.')
  assert.equal(task.needs_split, false)
  assert.ok(routeIds(task).includes('explore'))
  assert.ok(routeIds(task).includes('visual-ui'))
  assert.ok(task.validation.some((item) => item.includes('browser/manual verification')))
}

{
  const task = compileTask('Improve the SEO title, meta description and public copy for the Explore page.')
  assert.equal(task.needs_split, false)
  assert.ok(routeIds(task).includes('content-seo'))
  assert.equal(task.language_context, '.raas/LANGUAGE.md')
  assert.ok(task.truth_sources.includes('.raas/LANGUAGE.md'))
}

{
  const task = compileTask('Fix all issues across the player, catalogue, PWA, SEO and deployment and make everything perfect.')
  assert.equal(task.needs_split, true)
  assert.ok(task.split_reasons.length > 0)
  assert.ok(routeIds(task).length >= 3)
  assert.match(task.scope, /child implementation issues/i)
}

{
  const task = compileTask('Document the repository contribution workflow for one bounded internal issue.')
  assert.equal(task.needs_split, false)
  assert.equal(task.client_contract, '.raas/BOOTSTRAP.md')
  assert.ok(task.truth_sources.includes('AGENTS.md'))
  assert.ok(task.completion.some((item) => item.includes('claim is released')))
}

console.log('RAAS task compiler tests passed')
