#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const failures = []

const files = {
  packageJson: 'package.json',
  prompt: 'docs/operations/CODEX_ISSUE_EXECUTION_PROMPT_V1.md',
  hook: 'scripts/codex-issue-hook.mjs',
  skill: '.codex/skills/greenhouse-issue-execution-hook/SKILL.md',
  issueModel: 'docs/operations/ISSUE_OPERATING_MODEL_V1.md',
  solutionQuality: 'docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md',
  agents: 'AGENTS.md',
  projectContext: 'project_context.md',
}

for (const [key, relativePath] of Object.entries(files)) {
  if (!existsSync(join(repoRoot, relativePath))) {
    failures.push(`${key}: missing ${relativePath}`)
  }
}

const sources = Object.fromEntries(
  Object.entries(files)
    .filter(([, relativePath]) => existsSync(join(repoRoot, relativePath)))
    .map(([key, relativePath]) => [key, readFileSync(join(repoRoot, relativePath), 'utf8')]),
)

requireIncludes('package.json', sources.packageJson, '"codex:issue-hook"')
requireIncludes('package.json', sources.packageJson, '"codex:issue-hook:check"')
requireIncludes('CODEX issue prompt', sources.prompt, '## Prompt canonico')
requireIncludes('CODEX issue prompt', sources.prompt, 'TRIAGE OBLIGATORIO')
requireIncludes('CODEX issue prompt', sources.prompt, 'issue-only fix')
requireIncludes('CODEX issue prompt', sources.prompt, 'issue + TASK')
requireIncludes('CODEX issue prompt', sources.prompt, 'blocked')
requireIncludes('CODEX issue prompt', sources.prompt, 'REGRESSION / BLAST RADIUS GUARD')
requireIncludes('CODEX issue prompt', sources.prompt, 'NO-REGRESSION EVIDENCE')
requireIncludes('CODEX issue prompt', sources.prompt, 'consumidores directos e indirectos')
requireIncludes('CODEX issue prompt', sources.prompt, 'flujo vecino sensible')
requireIncludes('CODEX issue prompt', sources.prompt, '/fix-issue ###')
requireIncludes('CODEX issue prompt', sources.prompt, 'pnpm docs:closure-check')
requireIncludes('CODEX issue skill', sources.skill, '/fix-issue ###')
requireIncludes('CODEX issue skill', sources.skill, 'Issue vs Task Rule')
requireIncludes('CODEX issue skill', sources.skill, 'Regression Guard')
requireIncludes('AGENTS.md', sources.agents, '/fix-issue ###')
requireIncludes('project_context.md', sources.projectContext, '/fix-issue ###')
requireIncludes('Issue operating model', sources.issueModel, 'An issue may be solved directly without a task')
requireIncludes('Solution quality model', sources.solutionQuality, 'causa raiz')

rejectIncludes('CODEX issue prompt stale task-only wording', sources.prompt, 'Vas a implementar la task')
rejectIncludes('CODEX issue skill stale task hook', sources.skill, 'codex:task-hook')

const promptBlock = sources.prompt?.match(/## Prompt canonico\s+```md\n([\s\S]*?)\n```/)

if (!promptBlock) {
  failures.push('CODEX issue prompt: could not extract canonical prompt block')
}

const openIssue = findOpenIssue()

if (!openIssue) {
  failures.push('No open issue found under docs/issues/open for hook smoke')
} else {
  try {
    const output = execFileSync('node', ['scripts/codex-issue-hook.mjs', openIssue, '--develop', '--prompt-only'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (!output.includes(`issue **${openIssue}**`)) {
      failures.push(`hook smoke: prompt did not include resolved issue ${openIssue}`)
    }

    if (!output.includes('mantente en develop')) {
      failures.push('hook smoke: --develop prompt did not include develop override')
    }

    if (!output.includes('issue-only')) {
      failures.push('hook smoke: prompt did not include issue-only triage')
    }

    if (!output.includes('NO-REGRESSION EVIDENCE')) {
      failures.push('hook smoke: prompt did not include no-regression evidence gate')
    }
  } catch (error) {
    failures.push(`hook smoke failed for ${openIssue}: ${error.message}`)
  }
}

if (failures.length > 0) {
  console.error('Codex issue harness check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Codex issue harness check passed')
if (openIssue) console.log(`- Hook smoke issue: ${openIssue}`)

function requireIncludes(label, source, needle) {
  if (!source?.includes(needle)) failures.push(`${label}: missing "${needle}"`)
}

function rejectIncludes(label, source, needle) {
  if (source?.includes(needle)) failures.push(`${label}: stale text still present "${needle}"`)
}

function findOpenIssue() {
  const absoluteDir = join(repoRoot, 'docs', 'issues', 'open')

  if (!existsSync(absoluteDir)) return null

  for (const filePath of listMarkdownFiles(absoluteDir).sort()) {
    const fileName = basename(filePath)
    const id = fileName.match(/ISSUE-\d{3,}/)?.[0]

    if (!id) continue

    const source = readFileSync(filePath, 'utf8')
    const state = source.match(/^## Estado\s+([\s\S]*?)(?:\n## |\n# |$)/m)?.[1]?.trim().toLowerCase()

    if (state === 'resolved') continue

    return id
  }

  return null
}

function listMarkdownFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry)
    const stats = statSync(absolute)

    if (stats.isDirectory()) {
      files.push(...listMarkdownFiles(absolute))
      continue
    }

    if (entry.endsWith('.md')) files.push(absolute)
  }

  return files
}
