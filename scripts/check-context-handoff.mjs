#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const strict = process.argv.includes('--strict')

const checks = []

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)

  if (!existsSync(absolutePath)) {
    checks.push({
      level: 'error',
      message: `Missing required file: ${relativePath}`,
    })

    return ''
  }

  return readFileSync(absolutePath, 'utf8')
}

function add(level, message) {
  checks.push({ level, message })
}

function requireIncludes(filePath, contents, needle, description = needle) {
  if (!contents.includes(needle)) {
    add('error', `${filePath} must reference ${description}`)
  }
}

const handoff = read('Handoff.md')
const projectContext = read('project_context.md')
const agents = read('AGENTS.md')
const claude = read('CLAUDE.md')
const codexPrompt = read('docs/operations/CODEX_EXECUTION_PROMPT_V1.md')
const documentationModel = read('docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md')
read('docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')

const handoffLines = handoff.split(/\r?\n/).length
const sessionCount = (handoff.match(/^## Ses/gim) ?? []).length
const staleMergeSteps = (handoff.match(/Lifecycle:\*\* `complete`[\s\S]{0,1200}Pr[oó]ximo step:\*\* merge/gi) ?? []).length

if (!projectContext.includes('## Estado vigente para agentes')) {
  add('error', 'project_context.md must start with a current "Estado vigente para agentes" section')
}

requireIncludes('AGENTS.md', agents, 'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')
requireIncludes('CLAUDE.md', claude, 'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')
requireIncludes('docs/operations/CODEX_EXECUTION_PROMPT_V1.md', codexPrompt, 'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')
requireIncludes('docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md', documentationModel, 'CONTEXT_HANDOFF_OPERATING_MODEL_V1.md')

if (handoffLines > 800) {
  add(
    'warn',
    `Handoff.md has ${handoffLines} lines. This is allowed, but future cleanup should preserve audit text and move/index older non-active sessions in Handoff.archive.md instead of deleting context.`,
  )
}

if (sessionCount > 30) {
  add(
    'warn',
    `Handoff.md has ${sessionCount} session headings. This is allowed, but agents should distinguish active continuity from historical audit before acting on old entries.`,
  )
}

if (staleMergeSteps > 0) {
  add(
    'warn',
    `Handoff.md appears to contain ${staleMergeSteps} complete task(s) that still mention "Próximo step: merge". Verify whether those are historical and move them to archive.`,
  )
}

const errors = checks.filter(check => check.level === 'error')
const warnings = checks.filter(check => check.level === 'warn')

console.log('Context/Handoff check')
console.log(`- Handoff lines: ${handoffLines}`)
console.log(`- Handoff session headings: ${sessionCount}`)
console.log(`- Errors: ${errors.length}`)
console.log(`- Warnings: ${warnings.length}`)

for (const check of checks) {
  const prefix = check.level === 'error' ? 'ERROR' : 'WARN'

  console.log(`${prefix}: ${check.message}`)
}

if (errors.length > 0 || (strict && warnings.length > 0)) {
  process.exitCode = 1
}
