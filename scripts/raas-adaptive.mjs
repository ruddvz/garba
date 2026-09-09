#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compileTask } from './raas-task.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adaptiveConfigPath = path.resolve(__dirname, '../.raas/adaptive-cto.json')

export function loadAdaptiveConfig() {
  return JSON.parse(fs.readFileSync(adaptiveConfigPath, 'utf8'))
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term))
}

function routeIds(task) {
  return task.routes.map((route) => route.id)
}

function detectDeliveryStop(text) {
  if (includesAny(text, ['production', 'deploy it', 'deploy this', 'go live', 'live site', 'ship it live'])) return 'production-verification'
  if (includesAny(text, ['merge the pr', 'merge this', 'merge it', 'through merge'])) return 'merge'
  if (includesAny(text, ['open a pr', 'create a pr', 'pull request', 'through pr'])) return 'pull-request'

  const implementationSignals = ['implement', 'fix', 'change', 'update', 'edit', 'add', 'remove', 'build', 'code', 'create']
  const hasImplementationSignal = includesAny(text, implementationSignals)
  if (includesAny(text, ['plan only', 'just plan', 'make a plan', 'create a plan', 'plan this', 'strategy only']) && !hasImplementationSignal) return 'plan'
  if (includesAny(text, ['explain', 'what is', 'what are', 'why ', 'how does', 'how do ', 'tell me']) && !hasImplementationSignal) return 'answer'
  return 'local-change'
}

function detectMode(text, deliveryStop, task) {
  if (includesAny(text, ['outage', 'incident', 'production broken', 'site is down', 'emergency fix'])) return 'incident'
  if (deliveryStop === 'production-verification' || includesAny(text, ['deploy', 'release'])) return 'release'
  if (deliveryStop === 'plan') return 'plan'
  if (deliveryStop === 'answer') return 'answer'
  if (includesAny(text, ['audit', 'review', 'inspect', 'critique', 'check all'])) return 'audit'
  if (includesAny(text, ['research', 'find sources', 'search for', 'verify source', 'investigate']) && !includesAny(text, ['implement', 'fix', 'change', 'update'])) return 'research'

  const routes = routeIds(task)
  const metadataSignals = ['description', 'metadata', 'title', 'copy', 'wording', 'label']
  if (routes.length <= 1 && routes.every((route) => ['catalogue', 'content-seo'].includes(route)) && includesAny(text, metadataSignals)) return 'metadata-content-change'
  return 'implementation'
}

function detectTruthSensitivity(task) {
  const routes = new Set(routeIds(task))
  if (routes.has('rights')) return 'rights'
  if (routes.has('deployment')) return 'deployment'
  if (routes.has('playback')) return 'playback-source'
  if (routes.has('pwa')) return 'public-runtime'
  if (routes.has('catalogue')) return 'catalogue-identity'
  if (routes.has('content-seo')) return 'public-claims'
  return 'ordinary-code'
}

function detectUncertainty(text) {
  if (includesAny(text, ['owner decision required', 'owner approval required', 'blocked by owner', 'waiting on owner'])) return 'owner-blocked'
  if (includesAny(text, ['unknown', 'unclear', 'ambiguous', 'missing evidence', 'cannot verify', 'not verified'])) return 'evidence-missing'
  if (includesAny(text, ['verify', 'audit', 'research', 'investigate', 'find exact', 'find source'])) return 'resolvable'
  return 'known'
}

function detectBlastRadius(task, truthSensitivity) {
  const routes = new Set(routeIds(task))
  if (truthSensitivity === 'deployment') return 'production'
  if (routes.has('pwa')) return 'pwa-public-site'
  if (routes.has('catalogue')) return 'persistent-generated-catalogue'
  if (routes.has('playback')) return 'player-catalogue-subsystem'
  if (routes.has('content-seo')) return 'public-site'
  if (routes.has('explore') || routes.has('visual-ui')) return 'feature'
  return 'record-local'
}

function detectReversibility(truthSensitivity, blastRadius) {
  if (truthSensitivity === 'deployment' || truthSensitivity === 'rights') return 'hard-to-reverse'
  if (['persistent-generated-catalogue', 'player-catalogue-subsystem', 'pwa-public-site'].includes(blastRadius)) return 'compensable'
  return 'reversible'
}

function detectRisk(task, truthSensitivity, mode) {
  const routes = new Set(routeIds(task))
  if (mode === 'incident' || ['rights', 'deployment'].includes(truthSensitivity)) return 'critical'
  if (routes.has('pwa') || truthSensitivity === 'playback-source') return 'high'
  if (routes.has('catalogue') || routes.has('explore') || routes.has('visual-ui') || routes.has('content-seo')) return 'moderate'
  return 'low'
}

function isMetadataOnly(text, task) {
  const routes = routeIds(task)
  if (routes.length !== 1 || !['catalogue', 'content-seo'].includes(routes[0])) return false
  const metadataSignals = ['description', 'metadata', 'title', 'copy', 'wording', 'label']
  const identitySignals = ['youtube', 'playback', 'provider', 'rights', 'license', 'identity', 'duplicate', 'merge release', 'tracklist', 'taxonomy']
  return includesAny(text, metadataSignals) && !includesAny(text, identitySignals)
}

function selectTier({ task, text, risk, truthSensitivity, deliveryStop }) {
  const routes = new Set(routeIds(task))
  if (risk === 'critical' || deliveryStop === 'production-verification') return 'critical'
  if (task.needs_split || routes.size >= 3 || routes.has('pwa') || (routes.has('playback') && routes.has('catalogue'))) return 'deep'
  if (isMetadataOnly(text, task)) return 'fast'
  if (risk === 'high' || risk === 'moderate' || routes.size > 0) return 'standard'
  return 'fast'
}

function escalationReasons({ task, risk, truthSensitivity, deliveryStop, tier }) {
  const reasons = []
  if (task.needs_split) reasons.push('request spans multiple reviewable lanes')
  if (risk === 'critical') reasons.push('critical risk or protected truth surface')
  if (risk === 'high') reasons.push('high-risk runtime/source surface')
  if (truthSensitivity !== 'ordinary-code') reasons.push(`truth sensitivity: ${truthSensitivity}`)
  if (deliveryStop === 'production-verification') reasons.push('requested delivery stop includes production verification')
  if (tier === 'fast' && reasons.length === 0) reasons.push('bounded low-risk lane with focused proof')
  return reasons
}

function verificationFrontier(task, tier, deliveryStop) {
  const routes = new Set(routeIds(task))
  const frontier = ['focused']
  if (['standard', 'deep', 'critical'].includes(tier)) frontier.push('affected-subsystem')
  if (['deep', 'critical'].includes(tier)) frontier.push('repository-ci')
  if (tier === 'critical') frontier.push('current-head-proof')
  if ((routes.has('visual-ui') || routes.has('explore') || routes.has('pwa')) && !['answer', 'plan'].includes(deliveryStop)) frontier.push('browser-manual-when-acceptance-is-visual')
  if (routes.has('catalogue')) frontier.push('canonical-source-generated-output-check')
  if (routes.has('playback')) frontier.push('exact-source-runtime-route-check')
  if (routes.has('rights')) frontier.push('rights-provenance-check')
  if (deliveryStop === 'production-verification') frontier.push('live-production-verification')
  return [...new Set(frontier)]
}

function stopConditions(task, deliveryStop) {
  const conditions = [
    'Stop consuming context or tools when another operation has low expected decision value.',
    'Stop blind repair when the same failure repeats without new diagnosis or evidence.',
    'Stop and split before mutation when the request cannot remain one reviewable owned lane.',
    'Stop at the requested delivery point once required evidence is green.'
  ]
  if (task.needs_split) conditions.unshift('Do not implement the broad request directly; split/select child issues first.')
  if (deliveryStop === 'plan') conditions.push('Do not mutate repository state merely to complete a plan-only request.')
  if (deliveryStop === 'answer') conditions.push('Do not claim or mutate an implementation lane for an answer-only request.')
  return conditions
}

export function compileAdaptiveTask(text, config = loadAdaptiveConfig()) {
  const input = String(text || '').trim()
  const normalized = normalize(input)
  const task = compileTask(input)
  const deliveryStop = detectDeliveryStop(normalized)
  const mode = detectMode(normalized, deliveryStop, task)
  const truthSensitivity = detectTruthSensitivity(task)
  const uncertainty = detectUncertainty(normalized)
  const blastRadius = detectBlastRadius(task, truthSensitivity)
  const reversibility = detectReversibility(truthSensitivity, blastRadius)
  const risk = detectRisk(task, truthSensitivity, mode)
  const tier = selectTier({ task, text: normalized, risk, truthSensitivity, deliveryStop })
  const budget = config.tiers[tier]

  return {
    version: config.version,
    input,
    mode,
    risk,
    blast_radius: blastRadius,
    reversibility,
    uncertainty,
    delivery_stop: deliveryStop,
    truth_sensitivity: truthSensitivity,
    tier,
    budget,
    budget_is_ceiling_not_target: true,
    mutation_allowed: !['answer', 'plan'].includes(deliveryStop),
    needs_split: task.needs_split,
    routes: task.routes,
    scope: task.scope,
    truth_sources: task.truth_sources,
    likely_files: task.likely_files,
    risks: task.risks,
    escalation_reasons: escalationReasons({ task, risk, truthSensitivity, deliveryStop, tier }),
    verification_frontier: verificationFrontier(task, tier, deliveryStop),
    parallelism_policy: {
      read_only_agents_max: budget.parallelReadOnlyAgents,
      mutation_lanes_max: budget.parallelMutationLanes,
      rule: 'Parallelise only independently verifiable work. Converge shared evidence before mutation and cancel redundant lanes once decisive evidence exists.'
    },
    context_policy: {
      order: config.contextOrder,
      max_sources: budget.maxSources ?? null,
      context_chars: budget.contextChars ?? budget.softContextChars ?? null,
      rule: 'Prefer exact current authority and fingerprinted reuse. Deduplicate repeated doctrine and expand only when additional context can change the result.'
    },
    value_of_information: config.valueOfInformation,
    stop_conditions: stopConditions(task, deliveryStop),
    base_task: task
  }
}

export function formatAdaptiveMarkdown(result) {
  const lines = [
    '# RAAS adaptive CTO brief',
    '',
    `**Mode:** ${result.mode}`,
    `**Tier:** ${result.tier}`,
    `**Risk:** ${result.risk}`,
    `**Blast radius:** ${result.blast_radius}`,
    `**Reversibility:** ${result.reversibility}`,
    `**Uncertainty:** ${result.uncertainty}`,
    `**Delivery stop:** ${result.delivery_stop}`,
    `**Truth sensitivity:** ${result.truth_sensitivity}`,
    `**Mutation allowed:** ${result.mutation_allowed ? 'yes' : 'no'}`,
    `**Needs split:** ${result.needs_split ? 'yes' : 'no'}`,
    '',
    '## Budget ceiling',
    '```json',
    JSON.stringify(result.budget, null, 2),
    '```',
    '',
    '## Escalation reasons',
    ...result.escalation_reasons.map((item) => `- ${item}`),
    '',
    '## Verification frontier',
    ...result.verification_frontier.map((item) => `- ${item}`),
    '',
    '## Stop conditions',
    ...result.stop_conditions.map((item) => `- ${item}`),
    '',
    `Value-of-information gate: ${result.value_of_information.question}`
  ]
  return `${lines.join('\n')}\n`
}

function parseArgs(argv) {
  const args = { json: false, text: null, file: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') args.json = true
    else if (arg === '--text') args.text = argv[++i] ?? ''
    else if (arg === '--file') args.file = argv[++i] ?? ''
    else if (arg === '--help' || arg === '-h') args.help = true
    else if (!args.text && !args.file) args.text = arg
  }
  return args
}

function usage() {
  return `RAAS adaptive CTO compiler\n\nUsage:\n  node scripts/raas-adaptive.mjs --text "<request or issue text>"\n  node scripts/raas-adaptive.mjs --file path/to/issue.txt\n  printf '%s' "<request>" | node scripts/raas-adaptive.mjs\n  node scripts/raas-adaptive.mjs --json --text "<request>"\n`
}

async function readInput(args) {
  if (args.text != null) return args.text
  if (args.file) return fs.readFileSync(path.resolve(process.cwd(), args.file), 'utf8')
  if (!process.stdin.isTTY) {
    let data = ''
    for await (const chunk of process.stdin) data += chunk
    return data
  }
  return ''
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage())
    return
  }
  const input = await readInput(args)
  if (!input.trim()) {
    process.stderr.write(`${usage()}\nError: provide request/issue text with --text, --file or stdin.\n`)
    process.exitCode = 2
    return
  }
  const result = compileAdaptiveTask(input)
  process.stdout.write(args.json ? `${JSON.stringify(result, null, 2)}\n` : formatAdaptiveMarkdown(result))
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`)
    process.exitCode = 1
  })
}
