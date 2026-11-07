#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { basename, join, relative, resolve, sep } from 'node:path'

import { hasDeclaredTaskBlocker, parseTaskMarkdown, taskIdFromFilename } from './ci/task-lint/parser.mjs'

const TASK_REF_PATTERN = /^(?:TASK-)?(\d{3,}(?:\.\d+|[a-z])?)$/
const ACTIVE_TASK_DIRS = ['to-do', 'in-progress']
const TASK_DIRS = [...ACTIVE_TASK_DIRS, 'complete', 'cancelled']
const repoRoot = resolve(process.cwd())

try {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    process.exit(0)
  }

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
          subagentsAuthorized: options.subagents,
          currentBranch: getCurrentBranch(repoRoot),
          prompt
        },
        null,
        2
      )
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
    subagents: false,
    json: false,
    promptOnly: false,
    help: false
  }

  for (const arg of rawArgs) {
    if (arg === '--develop' || arg === '--stay-on-develop') {
      parsed.develop = true
      continue
    }

    if (arg === '--subagents' || arg === '--parallel-agents' || arg === '--fork-agents') {
      parsed.subagents = true
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
  pnpm codex:task-hook 1033
  pnpm codex:task-hook docs/tasks/to-do/TASK-1033-greenhouse-floating-surface-primitive.md
  pnpm codex:task-hook TASK-1033 --develop
  pnpm codex:task-hook TASK-1033 --subagents

Options:
  --develop, --stay-on-develop  Record an explicit operator branch override.
  --subagents                   Record explicit operator authorization to use sub-agents when the plan selects fork.
  --prompt-only                 Print only the substituted execution prompt.
  --json                        Print machine-readable output.
`)
}

function resolveTask(repoRoot, taskRef) {
  const ref = taskRef.replace(/^\[(TASK-[^\]]+)\]$/, '$1')
  const idMatch = ref.match(TASK_REF_PATTERN)
  const directPath = idMatch ? null : resolve(repoRoot, ref)
  const taskId = idMatch ? `TASK-${idMatch[1]}` : taskIdFromFilename(basename(directPath))

  if (!taskId || (directPath && !TASK_DIRS.includes(taskFolder(repoRoot, directPath)))) {
    throw new Error(`Invalid TASK ref "${taskRef}". Expected a TASK id or a task markdown path under docs/tasks.`)
  }

  const matches = listTaskFiles(repoRoot).filter(filePath => taskIdFromFilename(basename(filePath)) === taskId)

  if (directPath && !matches.includes(directPath)) {
    throw new Error(`No canonical task file found at ${relative(repoRoot, directPath)}.`)
  }

  if (matches.length === 0) {
    throw new Error(`No task file found for ${taskId} under docs/tasks/{to-do,in-progress,complete,cancelled}.`)
  }

  const activeMatches = matches.filter(filePath => ACTIVE_TASK_DIRS.includes(taskFolder(repoRoot, filePath)))

  if (activeMatches.length > 1) {
    throw new Error(
      `Multiple active task files found for ${taskId}: ${activeMatches.map(filePath => relative(repoRoot, filePath)).join(', ')}`
    )
  }

  return readTask(repoRoot, directPath ?? activeMatches[0] ?? matches[0], taskId)
}

function taskFolder(repoRoot, filePath) {
  const [docs, tasks, folder] = relative(repoRoot, filePath).split(sep)

  return docs === 'docs' && tasks === 'tasks' ? folder : null
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

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(absolute))
      continue
    }

    if (entry.isFile() && taskIdFromFilename(entry.name)) files.push(absolute)
  }

  return files
}

function readTask(repoRoot, filePath, id) {
  const relativePath = relative(repoRoot, filePath)
  const folder = taskFolder(repoRoot, filePath)

  if (!ACTIVE_TASK_DIRS.includes(folder)) {
    throw new Error(`${id} is ${folder} at ${relativePath}. Do not execute it as an active task.`)
  }

  if (realpathSync(filePath) !== join(realpathSync(repoRoot), relativePath)) {
    throw new Error(`${relativePath} resolves through a symbolic link. Use a canonical task file.`)
  }

  const source = readFileSync(filePath, 'utf8')
  const { lifecycle, status: { fields: status } } = parseTaskMarkdown({ filePath, repoRoot, source })
  const declaredLifecycle = lifecycle?.match(/^`?([a-z-]+)`?(?=\s|$)/i)?.[1].toLowerCase()

  if (lifecycle && declaredLifecycle !== folder) {
    throw new Error(`${id} lifecycle conflicts with ${folder} at ${relativePath}: ${lifecycle}.`)
  }

  const blockedBy = status['Blocked by'] ?? status['blocked by']

  if (hasDeclaredTaskBlocker(blockedBy)) {
    throw new Error(`${id} declares blockers: ${blockedBy}. Resolve or document the blocker before execution.`)
  }

  return {
    id,
    relativePath,
    status
  }
}

function buildPrompt(repoRoot, task, hookOptions) {
  const promptPath = join(repoRoot, 'docs', 'operations', 'CODEX_EXECUTION_PROMPT_V1.md')
  const promptDoc = readFileSync(promptPath, 'utf8')
  const promptMatch = promptDoc.match(/## Prompt canónico\s+(`{3,})md\n([\s\S]*?)\n\1/)

  if (!promptMatch) {
    throw new Error('Could not extract canonical prompt block from CODEX_EXECUTION_PROMPT_V1.md.')
  }

  const branchOverride = hookOptions.develop
    ? '\n\nInstrucción explícita del operador para esta ejecución: **mantente en develop, no cambies de rama**. Documenta esta excepción en Audit/Plan/Handoff.\n'
    : ''

  const subagentOverride = hookOptions.subagents
    ? '\n\nInstrucción explícita del operador para esta ejecución: **subagentes autorizados**. Si Discovery/Plan selecciona `fork`, carga el tooling multi-agent disponible y delega slices independientes con ownership exclusivo; si no conviene fork, documenta por qué.\n'
    : ''

  return promptMatch[2]
    .replaceAll('[TASK-###]', task.id)
    .replace(
      `Vas a implementar la task **${task.id}** ubicada en \`docs/tasks/{to-do,in-progress}/TASK-###-*.md\` dentro del repo \`greenhouse-eo\`.`,
      `Vas a implementar la task **${task.id}** ubicada en \`${task.relativePath}\` dentro del repo \`greenhouse-eo\`.${branchOverride}${subagentOverride}`
    )
}

function getCurrentBranch(repoRoot) {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
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
  console.log(`Subagents authorized: ${hookOptions.subagents ? 'yes' : 'no'}`)
  console.log('')
  console.log('Apply the following prompt before implementation:')
  console.log('')
  console.log(prompt)
}
