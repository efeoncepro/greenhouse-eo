#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const taskIndex = args.findIndex(arg => arg === '--task')
const taskId = taskIndex >= 0 ? args[taskIndex + 1] : args.find(arg => arg.startsWith('--task='))?.slice(7)
const findings = []

const requireFile = (relativePath, requirements = []) => {
  const absolute = resolve(repoRoot, relativePath)

  if (!existsSync(absolute)) {
    findings.push(`missing: ${relativePath}`)
    
return
  }

  const source = readFileSync(absolute, 'utf8')

  for (const requirement of requirements) {
    if (!source.includes(requirement)) findings.push(`${relativePath}: missing contract marker "${requirement}"`)
  }
}

const designMd = spawnSync('pnpm', ['exec', 'design.md', 'lint', 'DESIGN.md'], {
  cwd: repoRoot,
  encoding: 'utf8'
})

if (designMd.status !== 0) {
  findings.push('DESIGN.md structural lint failed')
  process.stderr.write(designMd.stderr || designMd.stdout)
}

requireFile('docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md', [
  '## The four gates',
  '## Visual Direction Contract',
  '## Visual Quality Scorecard',
  'average ≥4.5',
  'no dimension <4',
  'hierarchy, surface economy, visual impact, fidelity and generic-template resistance ≥4.5',
  '## Chrome budget and spatial composition'
])
requireFile('.codex/skills/greenhouse-ai-design-studio/SKILL.md', [
  'single canonical UI orchestrator',
  "qualityProfile: 'premium'",
  'average ≥4.5',
  'no dimension <4'
])
requireFile('.agents/skills/modern-ui/SKILL.md', ['Geist + Poppins', 'CompositionShell', 'First fold'])
requireFile('.codex/skills/greenhouse-ui-enterprise-review/SKILL.md', [
  'average >= 4.5',
  'Surface economy',
  'visual impact',
  'card wallpaper'
])
requireFile('docs/ui/wireframes/WIREFRAME_TEMPLATE.md')

const staleSkillSources = ['.codex/skills/greenhouse-ai-design-studio/SKILL.md', '.agents/skills/modern-ui/SKILL.md']

for (const relativePath of staleSkillSources) {
  const source = readFileSync(resolve(repoRoot, relativePath), 'utf8')

  for (const stale of [
    'product-design-architect-2026',
    'microinteraction-systems-architect',
    'frontend-product-implementation-reviewer',
    'visual-regression-product-critic'
  ]) {
    if (source.includes(stale)) findings.push(`${relativePath}: references unavailable skill ${stale}`)
  }
}

if (taskId) {
  const taskLint = spawnSync('node', ['scripts/ci/task-lint.mjs', '--task', taskId], {
    cwd: repoRoot,
    encoding: 'utf8'
  })

  if (taskLint.status !== 0) {
    findings.push(`${taskId}: task/readiness contract failed`)
    process.stderr.write(taskLint.stdout || taskLint.stderr)
  }
}

if (findings.length) {
  console.error('Design contract lint: BLOCK')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Design contract lint: PASS${taskId ? ` (${taskId})` : ''}`)
