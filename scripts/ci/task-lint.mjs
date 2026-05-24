#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  deriveNextTaskId,
  parseReadmeNextId,
  parseTaskIdRegistry,
  parseTaskMarkdown
} from './task-lint/parser.mjs'
import { runRules } from './task-lint/rules.mjs'

const TASK_DIRS = ['to-do', 'in-progress', 'complete']
const DEFAULT_BASE_BRANCH = 'develop'
const VALID_FORMATS = new Set(['human', 'json'])

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const parseArgs = argv => {
  const options = {
    format: 'human',
    strict: false,
    changed: false,
    task: null
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--strict') {
      options.strict = true
      continue
    }

    if (arg === '--changed') {
      options.changed = true
      continue
    }

    if (arg === '--format') {
      options.format = argv[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length)
      continue
    }

    if (arg === '--task') {
      options.task = argv[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--task=')) {
      options.task = arg.slice('--task='.length)
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!VALID_FORMATS.has(options.format)) {
    throw new Error(`Invalid --format "${options.format}". Expected human or json.`)
  }

  if (options.task && !/^TASK-\d{3}(?:\.\d+)?$/.test(options.task)) {
    throw new Error(`Invalid --task "${options.task}". Expected TASK-###.`)
  }

  return options
}

const git = (repoRoot, args) => {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim()
}

const listMarkdownFiles = dir => {
  if (!existsSync(dir)) return []

  const entries = readdirSync(dir)
  const files = []

  for (const entry of entries) {
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

const listAllTaskFiles = repoRoot => {
  const tasksRoot = join(repoRoot, 'docs', 'tasks')

  return TASK_DIRS.flatMap(dir => listMarkdownFiles(join(tasksRoot, dir))).sort()
}

const listChangedTaskFiles = repoRoot => {
  const changed = new Set()

  const baseRef = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : `origin/${DEFAULT_BASE_BRANCH}`

  const addDiffOutput = output => {
    for (const line of output.split('\n')) {
      const trimmed = line.trim()

      if (!trimmed) continue
      if (!/^docs\/tasks\/(to-do|in-progress|complete)\/.+\.md$/.test(trimmed)) continue

      const absolute = join(repoRoot, trimmed)

      if (existsSync(absolute)) changed.add(absolute)
    }
  }

  try {
    addDiffOutput(git(repoRoot, ['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`, '--', 'docs/tasks']))
  } catch {
    try {
      addDiffOutput(git(repoRoot, ['diff', '--name-only', '--diff-filter=ACMR', '--', 'docs/tasks']))
    } catch {
      // Best-effort local mode: if git diff is unavailable, return no changed tasks.
    }
  }

  for (const args of [
    ['diff', '--name-only', '--diff-filter=ACMR', '--', 'docs/tasks'],
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', 'docs/tasks'],
    ['ls-files', '--others', '--exclude-standard', '--', 'docs/tasks']
  ]) {
    try {
      addDiffOutput(git(repoRoot, args))
    } catch {
      // Ignore local git states that cannot report unstaged/staged files.
    }
  }

  return Array.from(changed).sort()
}

const loadContext = repoRoot => {
  const registryPath = join(repoRoot, 'docs', 'tasks', 'TASK_ID_REGISTRY.md')
  const readmePath = join(repoRoot, 'docs', 'tasks', 'README.md')
  const registryRows = parseTaskIdRegistry(readFileSync(registryPath, 'utf8'))
  const readmeNextId = parseReadmeNextId(readFileSync(readmePath, 'utf8'))

  return {
    registryRows,
    readmeNextId,
    expectedNextId: deriveNextTaskId(registryRows)
  }
}

export const lintTasks = ({ repoRoot, options }) => {
  const context = loadContext(repoRoot)
  const enforceErrors = options.changed || Boolean(options.task)
  const files = options.changed ? listChangedTaskFiles(repoRoot) : listAllTaskFiles(repoRoot)

  const selectedFiles = options.task
    ? files.filter(file => file.includes(`${options.task}-`) || file.endsWith(`${options.task}.md`))
    : files

  const tasks = selectedFiles.map(filePath =>
    parseTaskMarkdown({
      filePath,
      repoRoot,
      source: readFileSync(filePath, 'utf8')
    })
  )

  const findings = []

  for (let index = 0; index < tasks.length; index += 1) {
    findings.push(
      ...runRules(tasks[index], {
        ...context,
        enforceErrors,
        isLastTask: index === tasks.length - 1
      })
    )
  }

  const errors = findings.filter(item => item.severity === 'error')
  const warnings = findings.filter(item => item.severity === 'warning')

  return {
    errors,
    warnings,
    summary: {
      tasksScanned: tasks.length,
      templateTasks: tasks.filter(task => task.kind === 'template').length,
      legacyTasks: tasks.filter(task => task.kind === 'legacy').length,
      errors: errors.length,
      warnings: warnings.length,
      strict: options.strict,
      changed: options.changed,
      enforceErrors,
      task: options.task
    }
  }
}

const formatFinding = finding => {
  const location = finding.line ? `${finding.file}:${finding.line}` : finding.file

  return `${finding.severity.toUpperCase()} ${location} ${finding.rule} — ${finding.message}`
}

const printHuman = result => {
  const { summary, errors, warnings } = result

  console.log('Task lint summary')
  console.log(
    `- scanned=${summary.tasksScanned} template=${summary.templateTasks} legacy=${summary.legacyTasks} ` +
      `errors=${summary.errors} warnings=${summary.warnings}`
  )

  if (errors.length > 0) {
    console.log('\nErrors')
    for (const item of errors) console.log(`- ${formatFinding(item)}`)
  }

  if (warnings.length > 0) {
    console.log('\nWarnings')
    for (const item of warnings) console.log(`- ${formatFinding(item)}`)
  }
}

const main = () => {
  const repoRoot = resolve(__dirname, '..', '..')
  const options = parseArgs(process.argv.slice(2))
  const result = lintTasks({ repoRoot, options })

  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result)
  }

  if (result.errors.length > 0 || (options.strict && result.warnings.length > 0)) {
    process.exit(1)
  }
}

if (process.argv[1] === __filename) {
  try {
    main()
  } catch (error) {
    console.error(`[task-lint] ${error.message}`)
    process.exit(1)
  }
}
