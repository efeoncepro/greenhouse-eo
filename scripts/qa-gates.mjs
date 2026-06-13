#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const DOMAIN_DEFS = [
  {
    id: 'ui',
    label: 'UI / visual surface',
    flags: ['ui'],
    patterns: [
      /^src\/app\/.*\/(page|layout|loading|error|not-found)\.(tsx|ts)$/,
      /^src\/views\//,
      /^src\/components\//,
      /^src\/@core\//,
      /^src\/@menu\//,
      /^src\/components\/theme\//,
      /^DESIGN\.md$/,
    ],
    codexSkills: [
      'greenhouse-gvc-playwright',
      'greenhouse-ui-enterprise-review',
      'greenhouse-product-ui-architect',
      'greenhouse-portal-ui-implementer',
      'greenhouse-vuexy-ui-expert',
      'greenhouse-ux-content-accessibility',
      'greenhouse-typography-accessibility',
      'greenhouse-microinteractions-auditor',
    ],
    claudeSkills: [
      'greenhouse-gvc-playwright',
      'greenhouse-ui-enterprise-review',
      'greenhouse-product-ui-architect',
      'greenhouse-ui-orchestrator',
      'greenhouse-ui-review',
      'modern-ui',
      'state-design',
      'forms-ux',
      'a11y-architect',
      'typography-design',
      'greenhouse-microinteractions-auditor',
    ],
    commands: ['pnpm design:lint', 'pnpm fe:capture <scenario-or-route> --env=local'],
    blockers: ['GVC frame/review evidence missing for visible UI.'],
  },
  {
    id: 'design-system',
    label: 'Design system / primitive',
    patterns: [
      /^src\/components\/greenhouse\/primitives\//,
      /^src\/views\/greenhouse\/design-system\//,
      /^scripts\/frontend\/scenarios\/design-system-/,
      /^docs\/architecture\/ui-platform\//,
    ],
    codexSkills: ['greenhouse-ui-orchestrator', 'greenhouse-gvc-playwright', 'greenhouse-ui-enterprise-review'],
    claudeSkills: [
      'design-system-governance',
      'greenhouse-ui-orchestrator',
      'greenhouse-gvc-playwright',
      'greenhouse-ui-enterprise-review',
      'modern-ui',
    ],
    commands: ['pnpm route-reachability-gate', 'pnpm fe:capture <design-system-scenario> --env=local'],
    blockers: ['Primitive registry/lab/GVC/docs evidence missing for reusable UI.'],
  },
  {
    id: 'browser-diagnostics',
    label: 'Browser diagnostics / route review',
    flags: ['browser', 'diagnostics'],
    patterns: [/browser-diagnostics/i, /^scripts\/frontend\/scenarios\//, /^\.captures\//],
    codexSkills: ['greenhouse-browser-diagnostics', 'greenhouse-gvc-playwright'],
    claudeSkills: ['greenhouse-gvc-playwright'],
    commands: ['pnpm fe:capture <scenario-or-route> --env=local'],
    blockers: ['Route/browser diagnostics need authenticated GVC or an exact GVC blocker.'],
    notes: ['Claude currently routes browser diagnostics primarily through greenhouse-gvc-playwright.'],
  },
  {
    id: 'auth-access',
    label: 'Auth / access / entitlements',
    flags: ['auth', 'access'],
    patterns: [
      /^src\/(app|lib)\/.*auth/i,
      /^src\/config\/(entitlements|views|route|navigation)/,
      /entitlement/i,
      /capabilit/i,
      /view-access/i,
      /^migrations\/.*(access|role|permission|entitlement|capabilit|view)/i,
      /^docs\/architecture\/.*(IDENTITY|ACCESS|AUTHORIZATION)/,
    ],
    codexSkills: ['software-architect-2026', 'greenhouse-browser-diagnostics'],
    claudeSkills: ['arch-architect', 'greenhouse-gvc-playwright'],
    commands: ['pnpm route-reachability-gate', 'pnpm exec vitest run <auth-or-access-tests>'],
    blockers: ['Both views and entitlements/capabilities must be reasoned and tested.'],
  },
  {
    id: 'data-schema',
    label: 'Data / schema / migrations',
    flags: ['data', 'schema', 'migration'],
    patterns: [/^migrations\//, /^src\/lib\/db/, /^src\/lib\/postgres/, /^src\/types\/db/, /schema/i, /projection/i],
    codexSkills: ['software-architect-2026'],
    claudeSkills: ['arch-architect'],
    commands: ['pnpm migrate:status', 'pnpm exec tsc --noEmit'],
    blockers: ['Schema/runtime drift or unapplied migration/backfill must be closed or marked pending.'],
  },
  {
    id: 'api-runtime',
    label: 'API / server runtime',
    flags: ['runtime', 'api'],
    patterns: [/^src\/app\/api\//, /^src\/lib\/.*(command|reader|store|service|server|runtime)/i, /^services\//],
    codexSkills: ['software-architect-2026'],
    claudeSkills: ['arch-architect'],
    commands: ['pnpm exec vitest run <focal-runtime-tests>', 'pnpm build'],
    blockers: ['Runtime behavior must be smoked through the canonical API/command path.'],
  },
  {
    id: 'finance',
    label: 'Finance / accounting',
    flags: ['finance'],
    patterns: [/finance/i, /accounting/i, /payment/i, /settlement/i, /cashflow/i, /p&l/i],
    codexSkills: ['greenhouse-finance-accounting-operator'],
    claudeSkills: ['commercial-expert', 'arch-architect'],
    commands: ['pnpm finance:e2e-gate', 'pnpm exec vitest run <finance-tests>'],
    blockers: [
      'Finance/accounting changes require the finance auditor skill and representative data evidence.',
      'Claude currently has no same-name finance/accounting auditor; use commercial-expert plus architecture/runtime docs, or route the finance audit through Codex.',
    ],
    notes: ['Codex has greenhouse-finance-accounting-operator; Claude uses commercial-expert + arch-architect as fallback coverage.'],
  },
  {
    id: 'payroll',
    label: 'Payroll / HR legal',
    flags: ['payroll', 'hr'],
    patterns: [/payroll/i, /compensation/i, /final-settlement/i, /finiquito/i, /contractor/i, /^src\/lib\/hr\//],
    codexSkills: ['greenhouse-payroll-auditor'],
    claudeSkills: ['greenhouse-payroll-auditor'],
    commands: ['pnpm exec vitest run <payroll-or-hr-tests>'],
    blockers: ['Payroll/HR legal changes require the payroll auditor skill and legal/runtime invariants.'],
  },
  {
    id: 'integration',
    label: 'External integration',
    flags: ['integration'],
    patterns: [/hubspot/i, /notion/i, /teams/i, /webhook/i, /azure/i, /gcp/i, /google/i, /vercel/i, /sentry/i],
    codexSkills: ['hubspot-greenhouse-bridge', 'greenhouse-teams-message-operator', 'vercel-operations'],
    claudeSkills: ['hubspot-greenhouse-bridge', 'greenhouse-teams-message-operator', 'arch-architect'],
    commands: ['pnpm exec vitest run <integration-tests>', 'pnpm docs:closure-check'],
    blockers: ['External integration needs real provisioning/env/webhook/health evidence or explicit rollout pending.'],
    notes: ['Claude has no vercel-operations skill in this repo; Vercel-specific closure should route through Codex or explicit Vercel runbooks.'],
  },
  {
    id: 'worker-cron',
    label: 'Worker / cron / async pipeline',
    flags: ['worker', 'cron', 'async'],
    patterns: [
      /worker/i,
      /cron/i,
      /scheduler/i,
      /outbox/i,
      /dead[-_]?letter/i,
      /^services\//,
      /^\.github\/workflows\/.*(worker|cron|scheduler|deploy)/,
      /^scripts\/.*(worker|cron|scheduler|outbox|sync)/i,
    ],
    codexSkills: ['software-architect-2026', 'vercel-operations'],
    claudeSkills: ['arch-architect'],
    commands: ['pnpm worker:runtime-deps-gate', 'pnpm vercel-cron-gate', 'pnpm exec vitest run <worker-or-cron-tests>'],
    blockers: ['Async behavior needs scheduler/worker/env/dead-letter/health evidence or explicit rollout pending.'],
  },
  {
    id: 'secrets',
    label: 'Secrets / env',
    flags: ['secrets', 'env'],
    patterns: [/secret/i, /\.env/, /credential/i, /token/i, /api[_-]?key/i],
    codexSkills: ['greenhouse-secret-hygiene', 'vercel-operations'],
    claudeSkills: ['greenhouse-secret-hygiene'],
    commands: ['pnpm secrets:audit'],
    blockers: ['Secret/env changes require secret hygiene and target-environment verification.'],
  },
  {
    id: 'env-flag',
    label: 'Env / flag / rollout switch',
    flags: ['flag', 'env', 'rollout'],
    patterns: [
      /feature[-_]?flag/i,
      /kill[-_]?switch/i,
      /process\.env/,
      /^src\/config\/.*(flag|env|maintenance|release)/i,
      /^\.env/,
      /^vercel\.json$/,
    ],
    codexSkills: ['greenhouse-secret-hygiene', 'vercel-operations'],
    claudeSkills: ['greenhouse-secret-hygiene'],
    commands: ['pnpm secrets:audit', 'pnpm docs:closure-check'],
    blockers: ['Env/flag changes require target-environment verification and redeploy/restart status.'],
  },
  {
    id: 'release',
    label: 'Release / production',
    flags: ['release', 'production'],
    patterns: [/production-release/i, /release\//, /^\.github\/workflows\/.*(production|deploy|release)/, /Cloud Run/i],
    codexSkills: ['greenhouse-production-release'],
    claudeSkills: ['greenhouse-production-release'],
    commands: ['pnpm release:preflight --target-sha=<sha> --target-branch=main'],
    blockers: ['Production release/promotion/rollback requires explicit approval and release skill evidence.'],
  },
  {
    id: 'docs',
    label: 'Docs / task lifecycle / local skill',
    flags: ['docs'],
    patterns: [/^docs\//, /^AGENTS\.md$/, /^CLAUDE\.md$/, /^project_context\.md$/, /^Handoff\.md$/, /^changelog\.md$/, /^\.codex\/hooks/, /^\.codex\/skills\//, /^\.claude\/skills\//],
    codexSkills: ['greenhouse-documentation-governor'],
    claudeSkills: ['greenhouse-documentation-governor'],
    commands: ['pnpm docs:closure-check', 'pnpm ops:lint --changed'],
    blockers: ['Documentation governor must decide whether lifecycle/handoff/changelog/context are synced.'],
  },
  {
    id: 'tooling',
    label: 'Developer tooling / QA helper',
    flags: ['tooling', 'qa'],
    patterns: [/^scripts\//, /^\.codex\/hooks/, /^package\.json$/, /^pnpm-lock\.yaml$/, /^eslint-plugins\//],
    codexSkills: ['greenhouse-documentation-governor'],
    claudeSkills: ['greenhouse-documentation-governor'],
    commands: ['node --check <changed-node-script>', 'pnpm qa:gates --changed'],
    blockers: ['Tooling changes need self-test evidence and docs/agent contract sync when behavior changes.'],
  },
  {
    id: 'observability',
    label: 'Observability / Sentry / health',
    flags: ['observability', 'sentry', 'health'],
    patterns: [/sentry/i, /observability/i, /health/i, /logger/i, /captureException/i, /captureWithDomain/i, /signal/i],
    codexSkills: ['greenhouse-browser-diagnostics', 'software-architect-2026'],
    claudeSkills: ['greenhouse-gvc-playwright', 'arch-architect'],
    commands: ['pnpm test:observability', 'pnpm test:observability:summary'],
    blockers: ['Incident/observability closure requires Sentry/log/health evidence and issue-state follow-through.'],
  },
  {
    id: 'security',
    label: 'Security-sensitive',
    flags: ['security'],
    patterns: [/csrf/i, /xss/i, /sanitize/i, /permission/i, /authorization/i, /crypto/i, /webhook/i, /signature/i],
    codexSkills: ['greenhouse-secret-hygiene', 'software-architect-2026'],
    claudeSkills: ['greenhouse-secret-hygiene', 'arch-architect'],
    commands: ['pnpm lint', 'pnpm exec vitest run <security-or-auth-tests>'],
    blockers: ['Security-sensitive changes require authz/error/secret abuse-case review.'],
  },
]

function parseArgs(rawArgs) {
  const options = {
    base: 'HEAD',
    changed: false,
    staged: false,
    json: false,
    strict: false,
    task: null,
    agent: 'both',
    flags: new Set(),
    pathspec: [],
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === '--') {
      options.pathspec = rawArgs.slice(index + 1)
      break
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    if (arg === '--base') {
      options.base = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg === '--task') {
      options.task = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg === '--agent') {
      const agent = rawArgs[index + 1]

      if (!['codex', 'claude', 'both'].includes(agent)) {
        throw new Error(`Invalid --agent value: ${agent}. Expected codex, claude, or both.`)
      }

      options.agent = agent
      index += 1
      continue
    }

    if (arg === '--changed') {
      options.changed = true
      continue
    }

    if (arg === '--staged') {
      options.staged = true
      options.changed = true
      continue
    }

    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--strict') {
      options.strict = true
      continue
    }

    if (arg.startsWith('--')) {
      options.flags.add(arg.slice(2))
      continue
    }

    options.pathspec.push(arg)
  }

  return options
}

function printHelp() {
  console.log(`Greenhouse QA gates

Usage:
  pnpm qa:gates --changed
  pnpm qa:gates --changed --task TASK-1107 --ui --runtime
  pnpm qa:gates --staged --json
  pnpm qa:gates -- src/lib/foo.ts src/views/bar.tsx

Options:
  --changed       Inspect git diff against HEAD plus untracked files.
  --staged        Inspect staged changes only.
  --base <ref>    Compare tracked files against a git ref. Default: HEAD.
  --task <id>     Include the active TASK/MINI/EPIC id in the report.
  --agent <name>  Skill namespace to print: codex, claude, or both. Default: both.
  --json          Print machine-readable JSON.
  --strict        Exit non-zero when potential blockers are present.
  --<risk>        Add an explicit risk flag, e.g. --ui --runtime --auth.
  --              Remaining args are pathspecs or explicit files.
`)
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim()

    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }

  return result.stdout
}

function splitLines(output) {
  return output
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function parseNameStatus(output) {
  return splitLines(output).map(line => {
    const parts = line.split('\t')
    const status = parts[0]

    if (status.startsWith('R') || status.startsWith('C')) {
      return normalize(parts[2])
    }

    return normalize(parts[1] || parts[0])
  })
}

function getFiles(options) {
  if (!options.changed) {
    return [...new Set(options.pathspec.map(normalize))].sort()
  }

  const pathArgs = options.pathspec.length > 0 ? ['--', ...options.pathspec] : []

  const diffArgs = options.staged
    ? ['diff', '--cached', '--name-status', '--find-renames', ...pathArgs]
    : ['diff', '--name-status', '--find-renames', options.base, ...pathArgs]

  const tracked = parseNameStatus(runGit(diffArgs))

  if (options.staged) {
    return [...new Set(tracked)].sort()
  }

  const untracked = splitLines(runGit(['ls-files', '--others', '--exclude-standard', ...pathArgs])).map(normalize)

  return [...new Set([...tracked, ...untracked])].sort()
}

function patternMatches(pattern, filePath) {
  return typeof pattern === 'string' ? filePath.startsWith(pattern) : pattern.test(filePath)
}

function classify(files, flags) {
  return DOMAIN_DEFS.map(domain => {
    const matchedFiles = files.filter(filePath => domain.patterns.some(pattern => patternMatches(pattern, filePath)))
    const matchedFlags = (domain.flags || []).filter(flag => flags.has(flag))
    const codexSkills = domain.codexSkills || domain.skills || []
    const claudeSkills = domain.claudeSkills || domain.skills || []

    if (matchedFiles.length === 0 && matchedFlags.length === 0) {
      return null
    }

    return {
      id: domain.id,
      label: domain.label,
      matchedFiles,
      matchedFlags,
      codexSkills,
      claudeSkills,
      skills: unique([...codexSkills, ...claudeSkills]),
      commands: domain.commands,
      blockers: domain.blockers,
      notes: domain.notes || [],
    }
  }).filter(Boolean)
}

function unique(values) {
  return [...new Set(values)].sort()
}

function readSkillInventory(rootPath) {
  const absoluteRoot = path.resolve(process.cwd(), rootPath)

  if (!fs.existsSync(absoluteRoot)) {
    return []
  }

  return fs.readdirSync(absoluteRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(skillName => {
      const skillDir = path.join(absoluteRoot, skillName)

      return fs.existsSync(path.join(skillDir, 'SKILL.md')) || fs.existsSync(path.join(skillDir, 'skill.md'))
    })
    .sort()
}

function missingSkills(skills, availableSkills) {
  const available = new Set(availableSkills)

  return skills.filter(skill => !available.has(skill))
}

function buildReport(options, files, domains, skillInventory) {
  const codexSkills = unique(domains.flatMap(domain => domain.codexSkills))
  const claudeSkills = unique(domains.flatMap(domain => domain.claudeSkills))
  const skills = selectSkillsForAgent(options.agent, codexSkills, claudeSkills)
  const skillNotes = unique(domains.flatMap(domain => domain.notes || []))

  const commands = unique([
    'git status --short',
    'git diff --check',
    ...domains.flatMap(domain => domain.commands),
  ])

  const blockers = unique(domains.flatMap(domain => domain.blockers))

  if (files.length > 0 && domains.length === 0) {
    commands.push('pnpm lint')
    commands.push('pnpm exec tsc --noEmit')
  }

  return {
    task: options.task,
    files,
    agent: options.agent,
    explicitFlags: [...options.flags].sort(),
    domains,
    injectedSkills: skills,
    codexInjectedSkills: codexSkills,
    claudeInjectedSkills: claudeSkills,
    skillInventory,
    unavailableInjectedSkills: {
      codex: missingSkills(codexSkills, skillInventory.codex),
      claude: missingSkills(claudeSkills, skillInventory.claude),
    },
    skillRoutingNotes: skillNotes,
    suggestedCommands: unique(commands),
    potentialBlockers: blockers,
    closureReminder:
      'The CLI is advisory. Use greenhouse-qa-release-auditor for PASS / CONDITIONAL PASS / BLOCK.',
  }
}

function selectSkillsForAgent(agent, codexSkills, claudeSkills) {
  if (agent === 'codex') {
    return codexSkills
  }

  if (agent === 'claude') {
    return claudeSkills
  }

  return unique([...codexSkills, ...claudeSkills])
}

function printText(report) {
  console.log('Greenhouse QA gates')

  if (report.task) {
    console.log(`Task: ${report.task}`)
  }

  console.log(`Files reviewed: ${report.files.length}`)

  if (report.files.length > 0) {
    for (const file of report.files.slice(0, 30)) {
      console.log(`- ${file}`)
    }

    if (report.files.length > 30) {
      console.log(`- ... ${report.files.length - 30} more`)
    }
  }

  console.log('\nRisk domains:')

  if (report.domains.length === 0) {
    console.log('- none detected mechanically; still apply judgment from task intent')
  } else {
    for (const domain of report.domains) {
      const source = [
        domain.matchedFlags.length ? `flags=${domain.matchedFlags.join(',')}` : null,
        domain.matchedFiles.length ? `files=${domain.matchedFiles.length}` : null,
      ].filter(Boolean).join('; ')

      console.log(`- ${domain.label}${source ? ` (${source})` : ''}`)
    }
  }

  console.log('\nInjected skills to load:')

  if (report.agent === 'both') {
    printSkillList('Codex', report.codexInjectedSkills)
    printSkillList('Claude', report.claudeInjectedSkills)
  } else if (report.injectedSkills.length === 0) {
    console.log('- greenhouse-qa-release-auditor')
  } else {
    for (const skill of report.injectedSkills) {
      console.log(`- ${skill}`)
    }
  }

  if (report.skillRoutingNotes.length > 0) {
    console.log('\nSkill routing notes:')

    for (const note of report.skillRoutingNotes) {
      console.log(`- ${note}`)
    }
  }

  if (report.unavailableInjectedSkills.codex.length > 0 || report.unavailableInjectedSkills.claude.length > 0) {
    console.log('\nSkill availability warnings:')

    if (report.unavailableInjectedSkills.codex.length > 0) {
      console.log(`Codex missing: ${report.unavailableInjectedSkills.codex.join(', ')}`)
    }

    if (report.unavailableInjectedSkills.claude.length > 0) {
      console.log(`Claude missing: ${report.unavailableInjectedSkills.claude.join(', ')}`)
    }
  }

  console.log('\nSuggested gates:')

  for (const command of report.suggestedCommands) {
    console.log(`- ${command}`)
  }

  if (report.potentialBlockers.length > 0) {
    console.log('\nPotential blockers:')

    for (const blocker of report.potentialBlockers) {
      console.log(`- ${blocker}`)
    }
  }

  console.log(`\n${report.closureReminder}`)
}

function printSkillList(label, skills) {
  console.log(`${label}:`)

  if (skills.length === 0) {
    console.log('- greenhouse-qa-release-auditor')
    
return
  }

  for (const skill of skills) {
    console.log(`- ${skill}`)
  }
}

try {
  const options = parseArgs(process.argv.slice(2))
  const files = getFiles(options)
  const domains = classify(files, options.flags)

  const skillInventory = {
    codex: readSkillInventory('.codex/skills'),
    claude: readSkillInventory('.claude/skills'),
  }

  const report = buildReport(options, files, domains, skillInventory)

  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printText(report)
  }

  if (options.strict && report.potentialBlockers.length > 0) {
    process.exitCode = 1
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
