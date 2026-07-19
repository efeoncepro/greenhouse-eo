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
  archiveIndexTokens: 2_000,
  changelogTokens: 60_000,
  changelogLines: 2_000,
  changelogEntries: 60,
  changelogIndexTokens: 4_000
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
const changelog = read('changelog.md')
const changelogIndex = read('docs/changelog/internal/README.md')

read('docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')

const handoffLines = lines(handoff)
const sessionCount = (handoff.match(/^## Sesi[oó]n/gim) ?? []).length
const historicalDeltas = (projectContext.match(/^## Delta /gim) ?? []).length
const changelogHeadings = [...changelog.matchAll(/^## ([^\n]+)$/gm)]
const canonicalChangelogEntries = changelogHeadings.filter(match => /^\d{4}-\d{2}-\d{2} — \S/.test(match[1]))
const changelogDates = canonicalChangelogEntries.map(match => match[1].slice(0, 10))
const changelogLines = lines(changelog)
const changelogOutOfOrder = changelogDates.some((date, index) => index > 0 && date > changelogDates[index - 1])

const staleMergeSteps = (handoff.match(/Lifecycle:\*\* `complete`[\s\S]{0,1200}Pr[oó]ximo step:\*\* merge/gi) ?? [])
  .length

const measured = {
  agentsTokens: budget('AGENTS.md', agents, LIMITS.agentsTokens),
  projectContextTokens: budget('project_context.md', projectContext, LIMITS.projectContextTokens),
  handoffTokens: budget('Handoff.md', handoff, LIMITS.handoffTokens),
  archiveIndexTokens: budget('Handoff.archive.md', handoffArchive, LIMITS.archiveIndexTokens),
  changelogTokens: budget('changelog.md', changelog, LIMITS.changelogTokens),
  changelogIndexTokens: budget('docs/changelog/internal/README.md', changelogIndex, LIMITS.changelogIndexTokens)
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

if (!changelog.slice(0, 900).includes('docs/changelog/internal/README.md')) {
  add('error', 'changelog.md must point to its internal history index near the start')
}

if (changelogHeadings.length !== canonicalChangelogEntries.length) {
  add(
    'warn',
    `changelog.md has ${changelogHeadings.length - canonicalChangelogEntries.length} non-canonical H2 heading(s); use "## YYYY-MM-DD — title".`
  )
}

if (canonicalChangelogEntries.length > LIMITS.changelogEntries) {
  add(
    'warn',
    `changelog.md has ${canonicalChangelogEntries.length} entries; active limit is ${LIMITS.changelogEntries}. Run pnpm docs:context-rotate --apply.`
  )
}

if (changelogLines > LIMITS.changelogLines) {
  add(
    'warn',
    `changelog.md has ${changelogLines} lines; active limit is ${LIMITS.changelogLines}. Run pnpm docs:context-rotate --apply.`
  )
}

if (changelogOutOfOrder) add('warn', 'changelog.md entries must remain in reverse chronological order.')

requireIncludes('AGENTS.md', agents, '## Router de dominios')
requireIncludes('AGENTS.md', agents, '## Recuperación de contexto y regla de no pérdida')
requireIncludes('AGENTS.md', agents, 'agent-context-history/2026-07-19/AGENTS.legacy.md')
requireIncludes('AGENTS.md', agents, 'docs/operations/agent-context-router.json')
requireIncludes('project_context.md', projectContext, 'AGENTS.md#router-de-dominios')
requireIncludes('Handoff.md', handoff, 'Handoff.archive.md')
requireIncludes('Handoff.archive.md', handoffArchive, 'agent-context-history')
requireIncludes('changelog.md', changelog, 'docs/changelog/internal/README.md', 'the internal changelog history index')
requireIncludes(
  'docs/changelog/internal/README.md',
  changelogIndex,
  '(legacy/manifest.json)',
  'the immutable changelog snapshot manifest'
)
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

const incrementalChangelogDir = path.join(root, 'docs/changelog/internal')

if (existsSync(incrementalChangelogDir)) {
  for (const fileName of readdirSync(incrementalChangelogDir).filter(name => /^\d{4}-\d{2}\.md$/.test(name))) {
    const relativePath = `docs/changelog/internal/${fileName}`

    requireIncludes(
      'docs/changelog/internal/README.md',
      changelogIndex,
      `](${fileName})`,
      `incremental changelog shard ${fileName}`
    )

    const shard = read(relativePath)
    const markers = [...shard.matchAll(/<!-- changelog-entry-sha256:([a-f0-9]{64}) -->/g)]

    if (markers.length === 0) add('error', `${relativePath} has no integrity-marked changelog entries`)

    for (const [index, marker] of markers.entries()) {
      const blockStart = (marker.index ?? 0) + marker[0].length
      const blockEnd = markers[index + 1]?.index ?? shard.length
      const block = shard.slice(blockStart, blockEnd).trim()

      if (sha256(block) !== marker[1]) add('error', `Incremental changelog entry hash mismatch: ${relativePath}`)
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
requireIncludes('docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md', documentationModel, 'docs/changelog/internal/')

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

const changelogManifestPath = 'docs/changelog/internal/legacy/manifest.json'

if (existsSync(path.join(root, changelogManifestPath))) {
  let manifest

  try {
    manifest = JSON.parse(read(changelogManifestPath))
  } catch (error) {
    add(
      'error',
      `${changelogManifestPath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (manifest) {
    if (manifest.schemaVersion !== 'greenhouse-internal-changelog-snapshot.v1') {
      add('error', `${changelogManifestPath} has an unsupported schemaVersion`)
    }

    for (const entry of manifest.files ?? []) {
      const snapshot = read(entry.snapshot)

      if (!snapshot) continue
      if (sha256(snapshot) !== entry.sha256)
        add('error', `Immutable changelog snapshot hash mismatch: ${entry.snapshot}`)
      if (lines(snapshot) !== entry.lines)
        add('error', `Immutable changelog snapshot line count mismatch: ${entry.snapshot}`)
      if (snapshot.length !== entry.chars)
        add('error', `Immutable changelog snapshot character count mismatch: ${entry.snapshot}`)
    }
  }
} else {
  add('error', `Compacted changelog requires its integrity manifest: ${changelogManifestPath}`)
}

const errors = checks.filter(check => check.level === 'error')
const warnings = checks.filter(check => check.level === 'warn')

console.log('Context/Handoff/Changelog governance check')
console.log(`- AGENTS: ${lines(agents)} lines / ~${measured.agentsTokens} tokens (budget ${LIMITS.agentsTokens})`)
console.log(
  `- project_context: ${lines(projectContext)} lines / ~${measured.projectContextTokens} tokens (budget ${LIMITS.projectContextTokens})`
)
console.log(`- Handoff: ${handoffLines} lines / ${sessionCount} sessions / ~${measured.handoffTokens} tokens`)
console.log(`- Handoff archive index: ${lines(handoffArchive)} lines / ~${measured.archiveIndexTokens} tokens`)
console.log(
  `- changelog: ${changelogLines} lines / ${canonicalChangelogEntries.length} entries / ~${measured.changelogTokens} tokens`
)
console.log(`- changelog history index: ${lines(changelogIndex)} lines / ~${measured.changelogIndexTokens} tokens`)
console.log(`- Historical project_context deltas: ${historicalDeltas}`)
console.log(`- Errors: ${errors.length}`)
console.log(`- Warnings: ${warnings.length}`)

for (const check of checks) console.log(`${check.level === 'error' ? 'ERROR' : 'WARN'}: ${check.message}`)

if (errors.length > 0 || (strict && warnings.length > 0)) process.exitCode = 1
