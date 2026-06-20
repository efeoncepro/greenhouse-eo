#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

const ISSUE_ID_PATTERN = /ISSUE-\d{3,}(?!\d)/
const BARE_ISSUE_ID_PATTERN = /^\d{3,}$/
const ISSUE_DIRS = ['open', 'resolved']

const options = parseArgs(process.argv.slice(2))
const repoRoot = resolve(process.cwd())

if (options.help) {
  printHelp()
  process.exit(0)
}

try {
  const issue = resolveIssue(repoRoot, options.issueRef, options)
  const prompt = buildPrompt(repoRoot, issue, options)

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          hook: 'codex-issue-execution',
          codexOnly: true,
          issueId: issue.id,
          issuePath: issue.relativePath,
          issueState: issue.state,
          environment: issue.sections.Ambiente ?? null,
          declaredStatus: issue.sections.Estado ?? null,
          reviewResolved: options.reviewResolved,
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

  printHookOutput(repoRoot, issue, prompt, options)
} catch (error) {
  console.error(`codex:issue-hook failed: ${error.message}`)
  process.exit(1)
}

function parseArgs(rawArgs) {
  const parsed = {
    issueRef: null,
    develop: false,
    json: false,
    promptOnly: false,
    reviewResolved: false,
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

    if (arg === '--review-resolved') {
      parsed.reviewResolved = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    if (parsed.issueRef) {
      throw new Error(`Expected one ISSUE ref, got extra argument: ${arg}`)
    }

    parsed.issueRef = arg
  }

  if (!parsed.help && !parsed.issueRef) {
    throw new Error('Missing ISSUE ref. Example: pnpm codex:issue-hook ISSUE-045')
  }

  return parsed
}

function printHelp() {
  console.log(`Codex ISSUE-* execution hook

Usage:
  pnpm codex:issue-hook ISSUE-045
  pnpm codex:issue-hook 045
  pnpm codex:issue-hook docs/issues/open/ISSUE-045-purchase-order-create-ambiguous-client-id.md
  pnpm codex:issue-hook ISSUE-045 --develop

Options:
  --develop, --stay-on-develop  Record an explicit operator branch override.
  --prompt-only                 Print only the substituted issue prompt.
  --json                        Print machine-readable output.
  --review-resolved             Allow reading a resolved issue for review; never for active fixing.
`)
}

function resolveIssue(repoRoot, issueRef, hookOptions) {
  const directPath = resolve(repoRoot, issueRef)

  if (existsSync(directPath) && statSync(directPath).isFile()) {
    return readIssue(repoRoot, directPath, hookOptions)
  }

  const normalizedIssueRef = BARE_ISSUE_ID_PATTERN.test(issueRef) ? `ISSUE-${issueRef}` : issueRef
  const idMatch = normalizedIssueRef.match(ISSUE_ID_PATTERN)

  if (!idMatch) {
    throw new Error(`Invalid ISSUE ref "${issueRef}". Expected ISSUE-###, bare ###, or an issue markdown path.`)
  }

  const issueId = idMatch[0]
  const matches = listIssueFiles(repoRoot).filter(filePath => basename(filePath).startsWith(`${issueId}-`))

  if (matches.length === 0) {
    throw new Error(`No issue file found for ${issueId} under docs/issues/{open,resolved}.`)
  }

  const openMatches = matches.filter(filePath => /\/docs\/issues\/open\//.test(filePath))
  const selected = openMatches[0] ?? matches[0]

  if (openMatches.length > 1) {
    throw new Error(
      `Multiple open issue files found for ${issueId}: ${openMatches
        .map(filePath => relative(repoRoot, filePath))
        .join(', ')}`,
    )
  }

  return readIssue(repoRoot, selected, hookOptions)
}

function listIssueFiles(repoRoot) {
  const issuesRoot = join(repoRoot, 'docs', 'issues')
  const files = []

  for (const dir of ISSUE_DIRS) {
    files.push(...listMarkdownFiles(join(issuesRoot, dir)))
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

function readIssue(repoRoot, filePath, hookOptions) {
  const source = readFileSync(filePath, 'utf8')
  const id = source.match(ISSUE_ID_PATTERN)?.[0] ?? basename(filePath).match(ISSUE_ID_PATTERN)?.[0]

  if (!id) {
    throw new Error(`Could not detect ISSUE id in ${relative(repoRoot, filePath)}.`)
  }

  const state = /\/docs\/issues\/resolved\//.test(filePath) ? 'resolved' : 'open'
  const sections = parseSections(source)
  const declaredStatus = sections.Estado?.toLowerCase().trim()

  if (state === 'resolved' && !hookOptions.reviewResolved) {
    throw new Error(`${id} is already resolved at ${relative(repoRoot, filePath)}. Use --review-resolved only for read-only review.`)
  }

  if (declaredStatus === 'resolved' && state !== 'resolved' && !hookOptions.reviewResolved) {
    throw new Error(`${id} declares Estado=resolved but still lives at ${relative(repoRoot, filePath)}. Fix issue lifecycle before executing.`)
  }

  return {
    id,
    path: filePath,
    relativePath: relative(repoRoot, filePath),
    source,
    title: source.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? id,
    state,
    sections,
  }
}

function parseSections(source) {
  const sections = {}
  const headingPattern = /^##\s+(.+?)\s*$/gm
  const headings = []
  let match

  while ((match = headingPattern.exec(source))) {
    headings.push({ title: match[1].trim(), index: match.index, start: match.index + match[0].length })
  }

  for (let index = 0; index < headings.length; index += 1) {
    const current = headings[index]
    const next = headings[index + 1]

    sections[current.title] = source.slice(current.start, next?.index).trim()
  }

  return sections
}

function buildPrompt(repoRoot, issue, hookOptions) {
  const promptPath = join(repoRoot, 'docs', 'operations', 'CODEX_ISSUE_EXECUTION_PROMPT_V1.md')
  const promptDoc = readFileSync(promptPath, 'utf8')
  const promptMatch = promptDoc.match(/## Prompt canonico\s+```md\n([\s\S]*?)\n```/)

  if (!promptMatch) {
    throw new Error('Could not extract canonical prompt block from CODEX_ISSUE_EXECUTION_PROMPT_V1.md.')
  }

  const branchOverride = hookOptions.develop
    ? '\n\nInstruccion explicita del operador para esta ejecucion: **mantente en develop, no cambies de rama**. Documenta esta excepcion en Audit/Handoff si implementas cambios.\n'
    : ''

  return promptMatch[1]
    .replaceAll('[ISSUE-###]', issue.id)
    .replace(
      `Vas a resolver el issue **${issue.id}** ubicado en \`docs/issues/open/ISSUE-###-*.md\` dentro del repo \`greenhouse-eo\`.`,
      `Vas a resolver el issue **${issue.id}** ubicado en \`${issue.relativePath}\` dentro del repo \`greenhouse-eo\`.${branchOverride}`,
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

function printHookOutput(repoRoot, issue, prompt, hookOptions) {
  if (hookOptions.promptOnly) {
    console.log(prompt)

    return
  }

  const currentBranch = getCurrentBranch(repoRoot) || '(detached)'

  console.log(`=== CODEX ISSUE HOOK: ${issue.id} ===`)
  console.log(`Codex-only: yes`)
  console.log(`Issue file: ${issue.relativePath}`)
  console.log(`Issue state: ${issue.state}`)
  console.log(`Title: ${issue.title}`)
  console.log(`Environment: ${issue.sections.Ambiente ?? '(missing)'}`)
  console.log(`Declared status: ${issue.sections.Estado ?? '(missing)'}`)
  console.log(`Current branch: ${currentBranch}`)
  console.log(`Develop override: ${hookOptions.develop ? 'yes' : 'no'}`)
  console.log(`Review resolved mode: ${hookOptions.reviewResolved ? 'yes' : 'no'}`)
  console.log('')
  console.log('Apply the following prompt before implementation:')
  console.log('')
  console.log(prompt)
}
