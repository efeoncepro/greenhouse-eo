#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

const TASK_ID_PATTERN = /TASK-\d{3,}(?:\.\d+)?(?!\d)/
const TASK_DIRS = ['to-do', 'in-progress', 'complete']

const options = parseArgs(process.argv.slice(2))
const repoRoot = resolve(process.cwd())

if (options.help) {
  printHelp()
  process.exit(0)
}

try {
  const task = resolveTask(repoRoot, options.taskRef)
  const prompt = buildPrompt(repoRoot, task, options)

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          hook: 'codex-task-execution',
          codexOnly: true,
          taskId: task.id,
          taskPath: task.relativePath,
          lifecycle: task.status.Lifecycle ?? null,
          type: task.status.Type ?? null,
          priority: task.status.Priority ?? null,
          effort: task.status.Effort ?? null,
          branch: task.status.Branch ?? null,
          developOverride: options.develop,
          currentBranch: getCurrentBranch(repoRoot),
          prompt,
        },
        null,
        2,
      ),
    )
    process.exit(0)
  }

  printHookOutput(repoRoot, task, prompt, options)
} catch (error) {
  console.error(`codex:task-hook failed: ${error.message}`)
  process.exit(1)
}

function parseArgs(rawArgs) {
  const parsed = {
    taskRef: null,
    develop: false,
    json: false,
    promptOnly: false,
    help: false,
  }

  for (const arg of rawArgs) {
    if (arg === '--develop' || arg === '--stay-on-develop') {
      parsed.develop = true
      continue
    }

    if (arg === '--json') {
      parsed.json = true
      continue
    }

    if (arg === '--prompt-only') {
      parsed.promptOnly = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    if (parsed.taskRef) {
      throw new Error(`Expected one TASK ref, got extra argument: ${arg}`)
    }

    parsed.taskRef = arg
  }

  if (!parsed.help && !parsed.taskRef) {
    throw new Error('Missing TASK ref. Example: pnpm codex:task-hook TASK-1033')
  }

  return parsed
}

function printHelp() {
  console.log(`Codex TASK-* execution hook

Usage:
  pnpm codex:task-hook TASK-1033
  pnpm codex:task-hook docs/tasks/to-do/TASK-1033-greenhouse-floating-surface-primitive.md
  pnpm codex:task-hook TASK-1033 --develop

Options:
  --develop, --stay-on-develop  Record an explicit operator branch override.
  --prompt-only                 Print only the substituted execution prompt.
  --json                        Print machine-readable output.
`)
}

function resolveTask(repoRoot, taskRef) {
  const directPath = resolve(repoRoot, taskRef)

  if (existsSync(directPath) && statSync(directPath).isFile()) {
    return readTask(repoRoot, directPath)
  }

  const idMatch = taskRef.match(TASK_ID_PATTERN)

  if (!idMatch) {
    throw new Error(`Invalid TASK ref "${taskRef}". Expected TASK-### or a task markdown path.`)
  }

  const taskId = idMatch[0]
  const matches = listTaskFiles(repoRoot).filter(filePath => basename(filePath).startsWith(`${taskId}-`))

  if (matches.length === 0) {
    throw new Error(`No task file found for ${taskId} under docs/tasks/{to-do,in-progress,complete}.`)
  }

  const activeMatches = matches.filter(filePath => /\/docs\/tasks\/(to-do|in-progress)\//.test(filePath))
  const selected = activeMatches[0] ?? matches[0]

  if (matches.length > 1 && activeMatches.length > 1) {
    throw new Error(
      `Multiple active task files found for ${taskId}: ${matches.map(filePath => relative(repoRoot, filePath)).join(', ')}`,
    )
  }

  return readTask(repoRoot, selected)
}

function listTaskFiles(repoRoot) {
  const tasksRoot = join(repoRoot, 'docs', 'tasks')
  const files = []

  for (const dir of TASK_DIRS) {
    files.push(...listMarkdownFiles(join(tasksRoot, dir)))
  }

  return files.sort()
}

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return []

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

function readTask(repoRoot, filePath) {
  const source = readFileSync(filePath, 'utf8')
  const id = source.match(TASK_ID_PATTERN)?.[0] ?? basename(filePath).match(TASK_ID_PATTERN)?.[0]

  if (!id) {
    throw new Error(`Could not detect TASK id in ${relative(repoRoot, filePath)}.`)
  }

  const status = parseStatus(source)

  if (status.Lifecycle === 'complete' || /\/docs\/tasks\/complete\//.test(filePath)) {
    throw new Error(`${id} is already complete at ${relative(repoRoot, filePath)}. Do not execute it as an active task.`)
  }

  const blockedBy = status['Blocked by']

  if (blockedBy && blockedBy !== 'none' && blockedBy !== '`none`') {
    throw new Error(`${id} declares blockers: ${blockedBy}. Resolve or document the blocker before execution.`)
  }

  return {
    id,
    path: filePath,
    relativePath: relative(repoRoot, filePath),
    source,
    status,
  }
}

function parseStatus(source) {
  const status = {}
  const statusMatch = source.match(/## Status\s+([\s\S]*?)(?:\n## |\n<!--|$)/)

  if (!statusMatch) return status

  for (const line of statusMatch[1].split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*([^:]+):\s*(.+?)\s*$/)

    if (!match) continue

    status[match[1].trim()] = stripTicks(match[2].trim())
  }

  return status
}

function stripTicks(value) {
  return value.replace(/^`|`$/g, '').trim()
}

function buildPrompt(repoRoot, task, hookOptions) {
  const promptPath = join(repoRoot, 'docs', 'operations', 'CODEX_EXECUTION_PROMPT_V1.md')
  const promptDoc = readFileSync(promptPath, 'utf8')
  const promptMatch = promptDoc.match(/## Prompt canónico\s+```md\n([\s\S]*?)\n```/)

  if (!promptMatch) {
    throw new Error('Could not extract canonical prompt block from CODEX_EXECUTION_PROMPT_V1.md.')
  }

  const branchOverride = hookOptions.develop
    ? '\n\nInstrucción explícita del operador para esta ejecución: **mantente en develop, no cambies de rama**. Documenta esta excepción en Audit/Plan/Handoff.\n'
    : ''

  return promptMatch[1]
    .replaceAll('[TASK-###]', task.id)
    .replace(
      `Vas a implementar la task **${task.id}** ubicada en \`docs/tasks/{to-do,in-progress}/TASK-###-*.md\` dentro del repo \`greenhouse-eo\`.`,
      `Vas a implementar la task **${task.id}** ubicada en \`${task.relativePath}\` dentro del repo \`greenhouse-eo\`.${branchOverride}`,
    )
}

function getCurrentBranch(repoRoot) {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function printHookOutput(repoRoot, task, prompt, hookOptions) {
  if (hookOptions.promptOnly) {
    console.log(prompt)

    return
  }

  const currentBranch = getCurrentBranch(repoRoot) || '(detached)'

  console.log(`=== CODEX TASK HOOK: ${task.id} ===`)
  console.log(`Codex-only: yes`)
  console.log(`Task file: ${task.relativePath}`)
  console.log(`Lifecycle: ${task.status.Lifecycle ?? '(missing)'}`)
  console.log(`Type: ${task.status.Type ?? '(missing)'}`)
  console.log(`Priority: ${task.status.Priority ?? '(missing)'}`)
  console.log(`Effort: ${task.status.Effort ?? '(missing)'}`)
  console.log(`Declared branch: ${task.status.Branch ?? '(missing)'}`)
  console.log(`Current branch: ${currentBranch}`)
  console.log(`Develop override: ${hookOptions.develop ? 'yes' : 'no'}`)
  console.log('')
  console.log('Apply the following prompt before implementation:')
  console.log('')
  console.log(prompt)
}
