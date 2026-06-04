#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import path from 'node:path'

const args = process.argv.slice(2)

function parseArgs(rawArgs) {
  const options = {
    base: 'HEAD',
    json: false,
    staged: false,
    strict: false,
    pathspec: [],
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === '--') {
      const remaining = rawArgs.slice(index + 1)

      if (index === 0 && remaining[0]?.startsWith('--') && remaining[0] !== '--') {
        continue
      }

      options.pathspec = remaining[0] === '--' ? remaining.slice(1) : remaining
      break
    }

    if (arg === '--base') {
      options.base = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--staged') {
      options.staged = true
      continue
    }

    if (arg === '--strict') {
      options.strict = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function printHelp() {
  console.log(`Documentation closure check

Usage:
  pnpm docs:closure-check
  pnpm docs:closure-check -- src/lib/foo.ts changelog.md
  pnpm docs:closure-check --staged
  pnpm docs:closure-check --base origin/develop --strict

Options:
  --base <ref>  Compare tracked files against a git ref. Default: HEAD.
  --staged      Check staged tracked changes only.
  --strict      Exit non-zero when warnings are present.
  --json        Print machine-readable JSON.
  --            Remaining args are git pathspecs to scope the check.
`)
}

function runGit(gitArgs) {
  const result = spawnSync('git', gitArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim()

    throw new Error(`git ${gitArgs.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }

  return result.stdout
}

function splitLines(output) {
  return output
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)
}

function parseNameStatus(output) {
  return splitLines(output).map(line => {
    const parts = line.split('\t')
    const status = parts[0]

    if (status.startsWith('R') || status.startsWith('C')) {
      return {
        status: status[0],
        oldPath: normalizePath(parts[1]),
        path: normalizePath(parts[2]),
      }
    }

    return {
      status: status[0],
      path: normalizePath(parts[1]),
    }
  })
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/')
}

function getChanges(options) {
  const pathArgs = options.pathspec.length > 0 ? ['--', ...options.pathspec] : []

  const diffArgs = options.staged
    ? ['diff', '--cached', '--name-status', '--find-renames', ...pathArgs]
    : ['diff', '--name-status', '--find-renames', options.base, ...pathArgs]

  const tracked = parseNameStatus(runGit(diffArgs))

  if (options.staged) {
    return tracked
  }

  const untrackedArgs = ['ls-files', '--others', '--exclude-standard', ...pathArgs]

  const untracked = splitLines(runGit(untrackedArgs)).map(filePath => ({
    status: 'A',
    path: normalizePath(filePath),
    untracked: true,
  }))

  const byPath = new Map()

  for (const change of [...tracked, ...untracked]) {
    byPath.set(change.path, change)
  }

  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))
}

function matchesAny(filePath, patterns) {
  return patterns.some(pattern =>
    typeof pattern === 'string' ? filePath.startsWith(pattern) : pattern.test(filePath),
  )
}

function anyChanged(files, patterns) {
  return files.some(filePath => matchesAny(filePath, patterns))
}

function addFinding(findings, level, code, message, docs = []) {
  findings.push({
    level,
    code,
    message,
    docs,
  })
}

function analyze(changes) {
  const files = changes.map(change => change.path)
  const findings = []

  const docsChanged = {
    agents: files.includes('AGENTS.md'),
    architecture: anyChanged(files, ['docs/architecture/']),
    audits: anyChanged(files, ['docs/audits/']),
    changelog: files.includes('changelog.md'),
    claude: files.includes('CLAUDE.md'),
    clientChangelog: files.includes('docs/changelog/CLIENT_CHANGELOG.md'),
    documentation: anyChanged(files, ['docs/documentation/']),
    handoff: files.includes('Handoff.md'),
    manual: anyChanged(files, ['docs/manual-de-uso/']),
    operations: anyChanged(files, ['docs/operations/']),
    projectContext: files.includes('project_context.md'),
    taskDocs: anyChanged(files, ['docs/tasks/', 'docs/mini-tasks/', 'docs/epics/']),
    taskIndexes:
      files.includes('docs/tasks/README.md') ||
      files.includes('docs/tasks/TASK_ID_REGISTRY.md') ||
      files.includes('docs/mini-tasks/README.md') ||
      files.includes('docs/epics/README.md'),
  }

  const codeChanged = anyChanged(files, [
    /^src\/(?!.*\.(test|spec)\.)/,
    /^scripts\/(?!check-documentation-closure\.mjs$)/,
    'migrations/',
    'services/',
  ])

  const behaviorChanged = codeChanged || files.includes('package.json') || files.includes('vercel.json')

  const uiChanged = anyChanged(files, [
    /^src\/app\/.*(page|layout|loading|error|not-found)\.(tsx|ts)$/,
    'src/views/',
    'src/components/',
    'src/@core/',
    'src/@menu/',
    'src/theme/',
    'DESIGN.md',
  ])

  const accessChanged = anyChanged(files, [
    'src/config/entitlements',
    'src/config/role',
    'src/lib/tenant/',
    'src/lib/auth',
    'src/lib/authorization',
    'src/lib/access',
    'src/middleware',
    /^migrations\/.*(role|capabilit|entitlement|view|access|session|auth)/i,
  ])

  const apiChanged = anyChanged(files, ['src/app/api/', 'src/mcp/', 'docs/api/'])

  const integrationChanged = anyChanged(files, [
    'src/lib/integrations/',
    'src/lib/webhooks/',
    'services/',
    /^scripts\/(hubspot|notion|auth|release|secrets|cloud)\//,
  ])

  const dataChanged = anyChanged(files, [
    'migrations/',
    'src/lib/db',
    'src/lib/postgres',
    'src/types/db',
    /^scripts\/(setup-postgres|backfill|migrate|finance|payroll|notion)\//,
  ])

  const financePayrollChanged = anyChanged(files, [
    'src/lib/finance/',
    'src/lib/payroll/',
    'src/lib/hr/',
    'src/app/api/finance/',
    'src/app/api/payroll/',
    'src/app/api/hr/',
    /^migrations\/.*(finance|payroll|hr|payment|contractor|workforce)/i,
  ])

  const releaseCloudChanged = anyChanged(files, [
    '.github/workflows/',
    'vercel.json',
    '.vercel/project.json',
    'src/lib/release/',
    'scripts/release/',
    'scripts/secrets/',
    'scripts/cloud/',
    'scripts/gcloud',
    'scripts/gcp',
  ])

  const localSkillChanged = anyChanged(files, ['.codex/skills/', '.claude/skills/'])
  const codexSkillChanged = anyChanged(files, ['.codex/skills/'])
  const claudeSkillChanged = anyChanged(files, ['.claude/skills/'])

  const taskLifecycleChanged = files.some(filePath =>
    /^docs\/(tasks|mini-tasks|epics)\/(to-do|in-progress|complete)\//.test(filePath),
  )

  const auditChanged = docsChanged.audits
  const packageWorkflowChanged = files.includes('package.json')

  if (files.length === 0) {
    addFinding(findings, 'info', 'no_changes', 'No changed files detected for the selected scope.')

    return { docsChanged, signals: {}, findings }
  }

  if (behaviorChanged && !docsChanged.changelog) {
    addFinding(findings, 'warn', 'missing_changelog', 'Behavior/code/workflow changes usually need a short changelog.md delta.', [
      'changelog.md',
    ])
  }

  if ((behaviorChanged || taskLifecycleChanged || localSkillChanged || releaseCloudChanged) && !docsChanged.handoff) {
    addFinding(findings, 'warn', 'missing_handoff', 'Active work or closure changes should leave concise continuity in Handoff.md.', [
      'Handoff.md',
    ])
  }

  if (
    (accessChanged ||
      apiChanged ||
      dataChanged ||
      financePayrollChanged ||
      releaseCloudChanged ||
      integrationChanged) &&
    !docsChanged.architecture
  ) {
    addFinding(
      findings,
      'warn',
      'architecture_or_adr_check',
      'Shared contract changes detected; identify an existing architecture/ADR owner or update/propose one.',
      ['docs/architecture/', 'docs/architecture/DECISIONS_INDEX.md'],
    )
  }

  if ((accessChanged || releaseCloudChanged || localSkillChanged || packageWorkflowChanged) && !docsChanged.projectContext) {
    addFinding(
      findings,
      'warn',
      'missing_project_context_check',
      'Standing agent/runtime contract may have changed; project_context.md should be checked or updated.',
      ['project_context.md'],
    )
  }

  if (uiChanged && !docsChanged.documentation && !docsChanged.manual) {
    addFinding(
      findings,
      'warn',
      'ui_docs_check',
      'Visible UI/workflow changes detected; check functional docs/manuals and capture GVC evidence when applicable.',
      ['docs/documentation/', 'docs/manual-de-uso/', 'DESIGN.md'],
    )
  }

  if (uiChanged && !docsChanged.clientChangelog) {
    addFinding(
      findings,
      'info',
      'client_changelog_check',
      'If the UI change is user/client-visible or changes availability, consider CLIENT_CHANGELOG.',
      ['docs/changelog/CLIENT_CHANGELOG.md'],
    )
  }

  if (localSkillChanged) {
    if (codexSkillChanged && !claudeSkillChanged) {
      addFinding(findings, 'warn', 'missing_claude_skill_pair', 'Codex skill changed without a Claude skill counterpart in this diff.', [
        '.claude/skills/',
      ])
    }

    if (claudeSkillChanged && !codexSkillChanged) {
      addFinding(findings, 'warn', 'missing_codex_skill_pair', 'Claude skill changed without a Codex skill counterpart in this diff.', [
        '.codex/skills/',
      ])
    }

    if (!docsChanged.projectContext || !docsChanged.changelog || !docsChanged.handoff) {
      addFinding(
        findings,
        'warn',
        'skill_registration_check',
        'Local skill changes should usually be registered in project_context.md, changelog.md, and Handoff.md.',
        ['project_context.md', 'changelog.md', 'Handoff.md'],
      )
    }
  }

  if ((docsChanged.agents && !docsChanged.claude) || (docsChanged.claude && !docsChanged.agents)) {
    addFinding(
      findings,
      'warn',
      'agent_entrypoint_alignment',
      'AGENTS.md and CLAUDE.md are cross-agent entrypoints; verify whether both need the same standing rule.',
      ['AGENTS.md', 'CLAUDE.md'],
    )
  }

  if (taskLifecycleChanged && !docsChanged.taskIndexes) {
    addFinding(findings, 'warn', 'task_lifecycle_check', 'Task lifecycle changed; verify task README/registry/status evidence are synced.', [
      'docs/tasks/README.md',
      'docs/tasks/TASK_ID_REGISTRY.md',
    ])
  }

  if (auditChanged && !docsChanged.handoff && !docsChanged.taskDocs && !docsChanged.architecture) {
    addFinding(
      findings,
      'info',
      'audit_link_check',
      'Audit changed; link it from the active task, handoff, or architecture only if it remains operationally relevant.',
      ['Handoff.md', 'docs/tasks/', 'docs/architecture/'],
    )
  }

  if (releaseCloudChanged) {
    addFinding(
      findings,
      'info',
      'release_skill_required',
      'Release/cloud control-plane changes must also go through greenhouse-production-release when production flow is affected.',
      ['.codex/skills/greenhouse-production-release/SKILL.md', '.claude/skills/greenhouse-production-release/SKILL.md'],
    )
  }

  if (findings.every(finding => finding.level === 'info')) {
    addFinding(findings, 'info', 'closure_docs_look_present', 'No obvious missing documentation owner detected for this selected diff.')
  }

  return {
    docsChanged,
    signals: {
      accessChanged,
      apiChanged,
      auditChanged,
      behaviorChanged,
      dataChanged,
      financePayrollChanged,
      integrationChanged,
      localSkillChanged,
      packageWorkflowChanged,
      releaseCloudChanged,
      taskLifecycleChanged,
      uiChanged,
    },
    findings,
  }
}

function printTextReport(changes, analysis, options) {
  const warnings = analysis.findings.filter(finding => finding.level === 'warn')
  const infos = analysis.findings.filter(finding => finding.level === 'info')

  console.log('Documentation closure check')
  console.log(`- Scope: ${options.staged ? 'staged changes' : `diff against ${options.base} + untracked`}`)
  console.log(`- Pathspecs: ${options.pathspec.length > 0 ? options.pathspec.join(', ') : '(all)'}`)
  console.log(`- Changed files: ${changes.length}`)
  console.log(`- Warnings: ${warnings.length}`)
  console.log(`- Info: ${infos.length}`)

  if (changes.length > 0) {
    console.log('\nChanged files:')

    for (const change of changes) {
      const suffix = change.untracked ? ' (untracked)' : ''

      console.log(`- ${change.status} ${change.path}${suffix}`)
    }
  }

  if (analysis.findings.length > 0) {
    console.log('\nFindings:')

    for (const finding of analysis.findings) {
      const prefix = finding.level === 'warn' ? 'WARN' : 'INFO'
      const docs = finding.docs.length > 0 ? ` [docs: ${finding.docs.join(', ')}]` : ''

      console.log(`${prefix} ${finding.code}: ${finding.message}${docs}`)
    }
  }
}

const options = parseArgs(args)
const changes = getChanges(options)
const analysis = analyze(changes)
const warnings = analysis.findings.filter(finding => finding.level === 'warn')

if (options.json) {
  console.log(
    JSON.stringify(
      {
        options,
        changes,
        ...analysis,
      },
      null,
      2,
    ),
  )
} else {
  printTextReport(changes, analysis, options)
}

if (options.strict && warnings.length > 0) {
  process.exitCode = 1
}
