#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const repoRoot = resolve(process.cwd())
const failures = []

const files = {
  packageJson: 'package.json',
  prompt: 'docs/operations/CODEX_EXECUTION_PROMPT_V1.md',
  hook: 'scripts/codex-task-hook.mjs',
  skill: '.codex/skills/greenhouse-task-execution-hook/SKILL.md',
  taskPlannerSkill: '.codex/skills/greenhouse-task-planner/SKILL.md',
  architectSkill: '.codex/skills/software-architect-2026/SKILL.md',
  modularOperatingModel: 'docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md',
  agents: 'AGENTS.md',
  claude: 'CLAUDE.md',
  claudeCommand: '.claude/commands/implement-task.md',
  projectContext: 'project_context.md'
}

for (const [key, relativePath] of Object.entries(files)) {
  if (!existsSync(join(repoRoot, relativePath))) {
    failures.push(`${key}: missing ${relativePath}`)
  }
}

const sources = Object.fromEntries(
  Object.entries(files)
    .filter(([, relativePath]) => existsSync(join(repoRoot, relativePath)))
    .map(([key, relativePath]) => [key, readFileSync(join(repoRoot, relativePath), 'utf8')])
)

requireIncludes('package.json', sources.packageJson, '"codex:task-hook"')
requireIncludes('package.json', sources.packageJson, '"codex:task-hook:check"')
requireIncludes('CODEX prompt', sources.prompt, '## Prompt canónico')
requireIncludes('CODEX prompt', sources.prompt, '## Protocolo de actualización continua')
requireIncludes('CODEX prompt', sources.prompt, '/implement-task ###')
requireIncludes('CODEX prompt', sources.prompt, 'MODO DE RAMA / WORKTREE')
requireIncludes('CODEX prompt', sources.prompt, 'pnpm qa:gates --changed')
requireIncludes('CODEX prompt', sources.prompt, 'pnpm docs:closure-check')
requireIncludes('CODEX prompt', sources.prompt, 'greenhouse-documentation-governor')
requireIncludes('CODEX prompt', sources.prompt, 'GOAL PREFLIGHT')
requireIncludes('CODEX prompt', sources.prompt, 'propone un `/goal` recomendado')
requireIncludes('CODEX prompt', sources.prompt, 'UI/UX GOAL GUARD')
requireIncludes('CODEX prompt', sources.prompt, '/goal [TASK-###] UI enterprise-ready')
requireIncludes('CODEX prompt', sources.prompt, 'SUBAGENT TOOLING')
requireIncludes('CODEX prompt', sources.prompt, 'multi_agent_v1')
requireIncludes('CODEX prompt', sources.prompt, 'fork recomendado, no autorizado/no disponible')
requireIncludes('CODEX prompt', sources.prompt, 'MODULAR PLACEMENT CONTRACT')
requireIncludes('CODEX prompt', sources.prompt, 'MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md')
requireIncludes('CODEX prompt', sources.prompt, 'Future candidate home')
requireIncludes('CODEX hook', sources.hook, '--subagents')
requireIncludes('CODEX skill', sources.skill, '/implement-task ###')
requireIncludes('CODEX skill', sources.skill, 'Goal Preflight')
requireIncludes('CODEX skill', sources.skill, '--subagents')
requireIncludes('CODEX skill', sources.skill, 'Modular Placement Contract')
requireIncludes('CODEX task planner', sources.taskPlannerSkill, 'EPIC-026 Modular Placement Contract')
requireIncludes('CODEX task planner', sources.taskPlannerSkill, 'MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md')
requireIncludes('CODEX architect', sources.architectSkill, 'Greenhouse EPIC-026 transitional rule')
requireIncludes('CODEX architect', sources.architectSkill, 'MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md')
requireIncludes('modular operating model', sources.modularOperatingModel, '## Mechanical enforcement')
requireIncludes('modular operating model', sources.modularOperatingModel, 'pnpm task:lint --task TASK-###')
requireIncludes('AGENTS.md', sources.agents, '/implement-task ###')
requireIncludes('AGENTS.md', sources.agents, 'Goal preflight TASK-\\* para Codex')
requireIncludes('AGENTS.md', sources.agents, '--subagents')
requireIncludes('CLAUDE.md', sources.claude, '/implement-task ###')
requireIncludes('CLAUDE.md', sources.claude, 'Delta Codex goal preflight')
requireIncludes('CLAUDE.md', sources.claude, '--subagents')
requireIncludes('Claude command', sources.claudeCommand, 'TASK-###|###')
requireIncludes('Claude command', sources.claudeCommand, '/goal TASK-### UI enterprise-ready')
requireIncludes('Claude command', sources.claudeCommand, 'MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md')
requireIncludes('Claude command', sources.claudeCommand, 'Modular Placement Contract')
requireIncludes('project_context.md', sources.projectContext, '/implement-task ###')

rejectIncludes('CODEX prompt stale branch rule', sources.prompt, 'crea branch `task/TASK-###-short-slug`')
rejectIncludes('CODEX prompt stale skill', sources.prompt, 'vercel:nextjs')
rejectIncludes('CODEX prompt stale skill', sources.prompt, 'modern-ui-architect')
rejectIncludes('CODEX prompt stale slice rule', sources.prompt, 'llevas más de 3 slices sin commit')

const promptBlock = sources.prompt?.match(/## Prompt canónico\s+(`{3,})md\n([\s\S]*?)\n\1/)

if (!promptBlock) {
  failures.push('CODEX prompt: could not extract canonical prompt block')
}

const activeTask = findActiveTask()

if (!activeTask) {
  failures.push('No active unblocked task found under docs/tasks/{in-progress,to-do} for hook smoke')
} else {
  try {
    const output = execFileSync('node', ['scripts/codex-task-hook.mjs', activeTask, '--develop', '--prompt-only'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    if (!output.includes(`task **${activeTask}**`)) {
      failures.push(`hook smoke: prompt did not include resolved task ${activeTask}`)
    }

    if (!output.includes('mantente en develop')) {
      failures.push('hook smoke: --develop prompt did not include develop override')
    }

    const subagentOutput = execFileSync(
      'node',
      ['scripts/codex-task-hook.mjs', activeTask, '--develop', '--subagents', '--prompt-only'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )

    if (!subagentOutput.includes('subagentes autorizados')) {
      failures.push('hook smoke: --subagents prompt did not include explicit authorization')
    }
  } catch (error) {
    failures.push(`hook smoke failed for ${activeTask}: ${error.message}`)
  }
}

if (failures.length > 0) {
  console.error('Codex task harness check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Codex task harness check passed')
if (activeTask) console.log(`- Hook smoke task: ${activeTask}`)

function requireIncludes(label, source, needle) {
  if (!source?.includes(needle)) failures.push(`${label}: missing "${needle}"`)
}

function rejectIncludes(label, source, needle) {
  if (source?.includes(needle)) failures.push(`${label}: stale text still present "${needle}"`)
}

function findActiveTask() {
  const dirs = ['in-progress', 'to-do']

  for (const dir of dirs) {
    const absoluteDir = join(repoRoot, 'docs', 'tasks', dir)

    if (!existsSync(absoluteDir)) continue

    for (const filePath of listMarkdownFiles(absoluteDir).sort()) {
      const fileName = basename(filePath)
      const id = fileName.match(/TASK-\d{3,}(?:\.\d+)?/)?.[0]

      if (!id) continue

      const source = readFileSync(filePath, 'utf8')

      const blockedBy = source
        .match(/^\s*-\s*Blocked by:\s*(.+?)\s*$/m)?.[1]
        ?.replace(/`/g, '')
        .trim()

      if (blockedBy && blockedBy !== 'none') continue

      return id
    }
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
