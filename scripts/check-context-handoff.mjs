#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const strict = process.argv.includes('--strict')
const checks = []

const LIMITS = {
  agentsTokens: 20_000,
  projectContextTokens: 12_000,
  handoffTokens: 12_000,
  handoffLines: 600,
  handoffSessions: 20,
  archiveIndexTokens: 2_000
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)

  if (!existsSync(absolutePath)) {
    checks.push({ level: 'error', message: `Missing required file: ${relativePath}` })

    return ''
  }

  return readFileSync(absolutePath, 'utf8')
}

const add = (level, message) => checks.push({ level, message })
const tokens = contents => Math.ceil(contents.length / 4)
const lines = contents => contents.split(/\r?\n/).length
const sha256 = contents => createHash('sha256').update(contents).digest('hex')

function requireIncludes(filePath, contents, needle, description = needle) {
  if (!contents.includes(needle)) add('error', `${filePath} must reference ${description}`)
}

function budget(filePath, contents, maxTokens) {
  const estimated = tokens(contents)

  if (estimated > maxTokens) {
    add(
      'warn',
      `${filePath} is ~${estimated} tokens; budget is ${maxTokens}. Move detail to canonical docs and keep a pointer.`
    )
  }

  return estimated
}

const handoff = read('Handoff.md')
const handoffArchive = read('Handoff.archive.md')
const projectContext = read('project_context.md')
const agents = read('AGENTS.md')
const claude = read('CLAUDE.md')
const claudeTaskCommand = read('.claude/commands/implement-task.md')
const claudeDocumentationGovernor = read('.claude/skills/greenhouse-documentation-governor/SKILL.md')
const codexPrompt = read('docs/operations/CODEX_EXECUTION_PROMPT_V1.md')
const documentationModel = read('docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md')

read('docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')

const handoffLines = lines(handoff)
const sessionCount = (handoff.match(/^## Sesi[oó]n/gim) ?? []).length
const historicalDeltas = (projectContext.match(/^## Delta /gim) ?? []).length

const staleMergeSteps = (handoff.match(/Lifecycle:\*\* `complete`[\s\S]{0,1200}Pr[oó]ximo step:\*\* merge/gi) ?? [])
  .length

const measured = {
  agentsTokens: budget('AGENTS.md', agents, LIMITS.agentsTokens),
  projectContextTokens: budget('project_context.md', projectContext, LIMITS.projectContextTokens),
  handoffTokens: budget('Handoff.md', handoff, LIMITS.handoffTokens),
  archiveIndexTokens: budget('Handoff.archive.md', handoffArchive, LIMITS.archiveIndexTokens)
}

if (!projectContext.slice(0, 800).includes('## Estado vigente para agentes')) {
  add('error', 'project_context.md must expose "Estado vigente para agentes" near the start')
}

if (historicalDeltas > 0) {
  add(
    'warn',
    `project_context.md contains ${historicalDeltas} historical Delta heading(s). It must be a current-state router, not a changelog.`
  )
}

if (handoffLines > LIMITS.handoffLines) {
  add(
    'warn',
    `Handoff.md has ${handoffLines} lines; active budget is ${LIMITS.handoffLines}. Run pnpm docs:context-rotate --apply.`
  )
}

if (sessionCount > LIMITS.handoffSessions) {
  add(
    'warn',
    `Handoff.md has ${sessionCount} sessions; active limit is ${LIMITS.handoffSessions}. Run pnpm docs:context-rotate --apply.`
  )
}

if (staleMergeSteps > 0) {
  add('warn', `Handoff.md appears to contain ${staleMergeSteps} complete task(s) with a stale merge next-step.`)
}

requireIncludes('AGENTS.md', agents, '## Router de dominios')
requireIncludes('AGENTS.md', agents, '## Recuperación de contexto y regla de no pérdida')
requireIncludes('AGENTS.md', agents, 'agent-context-history/2026-07-19/AGENTS.legacy.md')
requireIncludes('AGENTS.md', agents, 'docs/operations/agent-context-router.json')
requireIncludes('project_context.md', projectContext, 'AGENTS.md#router-de-dominios')
requireIncludes('Handoff.md', handoff, 'Handoff.archive.md')
requireIncludes('Handoff.archive.md', handoffArchive, 'agent-context-history')
requireIncludes('AGENTS.md', agents, 'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')
requireIncludes('CLAUDE.md', claude, 'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')
requireIncludes(
  '.claude/commands/implement-task.md',
  claudeTaskCommand,
  'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md',
  'the active context operating model'
)

const incrementalHistoryDir = path.join(root, 'docs/operations/agent-context-history/handoff')

if (existsSync(incrementalHistoryDir)) {
  for (const fileName of readdirSync(incrementalHistoryDir).filter(name => name.endsWith('.md'))) {
    const relativePath = `docs/operations/agent-context-history/handoff/${fileName}`

    requireIncludes('Handoff.archive.md', handoffArchive, relativePath, `incremental history shard ${fileName}`)

    const shard = read(relativePath)
    const markers = [...shard.matchAll(/<!-- session-sha256:([a-f0-9]{64}) -->/g)]

    if (markers.length === 0) add('error', `${relativePath} has no integrity-marked sessions`)

    for (const [index, marker] of markers.entries()) {
      const blockStart = (marker.index ?? 0) + marker[0].length
      const blockEnd = markers[index + 1]?.index ?? shard.length
      const block = shard.slice(blockStart, blockEnd).trim()

      if (sha256(block) !== marker[1]) add('error', `Incremental session hash mismatch: ${relativePath}`)
    }
  }
}

requireIncludes(
  '.claude/commands/implement-task.md',
  claudeTaskCommand,
  'docs/operations/agent-context-history/',
  'the historical context fallback'
)
requireIncludes('.claude/commands/implement-task.md', claudeTaskCommand, 'docs:context-check:strict')
requireIncludes(
  '.claude/skills/greenhouse-documentation-governor/SKILL.md',
  claudeDocumentationGovernor,
  'Never reintroduce `## Delta YYYY-MM-DD`',
  'the no-reaccretion rule'
)
requireIncludes('docs/operations/CODEX_EXECUTION_PROMPT_V1.md', codexPrompt, 'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')
requireIncludes('docs/operations/CODEX_EXECUTION_PROMPT_V1.md', codexPrompt, 'docs:context-check:strict')
requireIncludes(
  'docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md',
  documentationModel,
  'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md'
)

const requiredRouterTargets = [
  'docs/context/00_INDEX.md',
  'docs/tasks/TASK_PROCESS.md',
  'docs/architecture/DECISIONS_INDEX.md',
  'docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md',
  'docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md',
  'docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md',
  'docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md'
]

for (const target of requiredRouterTargets) {
  if (!existsSync(path.join(root, target))) add('error', `Router target does not exist: ${target}`)
}

const routerManifestPath = 'docs/operations/agent-context-router.json'
let routerManifest

try {
  routerManifest = JSON.parse(read(routerManifestPath))
} catch (error) {
  add('error', `${routerManifestPath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
}

if (routerManifest) {
  if (routerManifest.schemaVersion !== 'greenhouse-agent-context-router.v1') {
    add('error', `${routerManifestPath} has an unsupported schemaVersion`)
  }

  const domainIds = new Set()

  for (const domain of routerManifest.domains ?? []) {
    if (!domain.id || domainIds.has(domain.id))
      add('error', `${routerManifestPath} has a missing/duplicate domain id: ${domain.id ?? '<empty>'}`)
    domainIds.add(domain.id)
    if (!Array.isArray(domain.triggers) || domain.triggers.length === 0)
      add('error', `Router domain ${domain.id} has no triggers`)
    if (!Array.isArray(domain.sources) || domain.sources.length === 0)
      add('error', `Router domain ${domain.id} has no sources`)

    for (const source of domain.sources ?? []) {
      if (!existsSync(path.join(root, source)))
        add('error', `Router domain ${domain.id} points to missing source: ${source}`)
    }
  }

  if (domainIds.size < 15)
    add('error', `${routerManifestPath} must cover at least 15 operational domains; found ${domainIds.size}`)
  if (!existsSync(path.join(root, routerManifest.fallbackSnapshot ?? '')))
    add('error', `${routerManifestPath} fallbackSnapshot does not exist`)
  if (!existsSync(path.join(root, routerManifest.canonicalDecision ?? '')))
    add('error', `${routerManifestPath} canonicalDecision does not exist`)
}

const manifestPath = 'docs/operations/agent-context-history/2026-07-19/manifest.json'

if (existsSync(path.join(root, manifestPath))) {
  let manifest

  try {
    manifest = JSON.parse(read(manifestPath))
  } catch (error) {
    add('error', `${manifestPath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (manifest) {
    if (manifest.schemaVersion !== 'greenhouse-agent-context-snapshot.v1') {
      add('error', `${manifestPath} has an unsupported schemaVersion`)
    }

    for (const entry of manifest.files ?? []) {
      const snapshot = read(entry.snapshot)

      if (!snapshot) continue
      if (sha256(snapshot) !== entry.sha256) add('error', `Immutable snapshot hash mismatch: ${entry.snapshot}`)
      if (lines(snapshot) !== entry.lines) add('error', `Immutable snapshot line count mismatch: ${entry.snapshot}`)
      if (snapshot.length !== entry.chars) add('error', `Immutable snapshot char count mismatch: ${entry.snapshot}`)
    }
  }
} else if (handoffLines <= LIMITS.handoffLines || measured.agentsTokens <= LIMITS.agentsTokens) {
  add('error', `Compacted context requires its integrity manifest: ${manifestPath}`)
}

const errors = checks.filter(check => check.level === 'error')
const warnings = checks.filter(check => check.level === 'warn')

console.log('Context/Handoff governance check')
console.log(`- AGENTS: ${lines(agents)} lines / ~${measured.agentsTokens} tokens (budget ${LIMITS.agentsTokens})`)
console.log(
  `- project_context: ${lines(projectContext)} lines / ~${measured.projectContextTokens} tokens (budget ${LIMITS.projectContextTokens})`
)
console.log(`- Handoff: ${handoffLines} lines / ${sessionCount} sessions / ~${measured.handoffTokens} tokens`)
console.log(`- Handoff archive index: ${lines(handoffArchive)} lines / ~${measured.archiveIndexTokens} tokens`)
console.log(`- Historical project_context deltas: ${historicalDeltas}`)
console.log(`- Errors: ${errors.length}`)
console.log(`- Warnings: ${warnings.length}`)

for (const check of checks) console.log(`${check.level === 'error' ? 'ERROR' : 'WARN'}: ${check.message}`)

if (errors.length > 0 || (strict && warnings.length > 0)) process.exitCode = 1
