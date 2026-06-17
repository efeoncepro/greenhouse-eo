#!/usr/bin/env node
/**
 * TASK-1160 — `claude-md` CLI: single cohesive entry point for CLAUDE.md
 * governance tooling. Dispatches to the three underlying scripts (kept as the
 * tested logic modules) so there is one discoverable command instead of three
 * separate aliases.
 *
 *   pnpm claude-md inventory [--top=N] [--json]   # enumerate sections by size
 *   pnpm claude-md budget    [--strict]           # token-budget gate (35k ceiling)
 *   pnpm claude-md audit     [--strict] [--list]  # rule-loss safety net (0 orphans)
 *   pnpm claude-md check                          # budget --strict + audit --strict
 *   pnpm claude-md help
 *
 * `check` is the closing gate the documentation-governor references: it proves
 * the file is under budget AND no original NUNCA/SIEMPRE rule became unreachable.
 */

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SCRIPTS = {
  inventory: 'claude-md-inventory.mjs',
  budget: 'claude-md-token-budget.mjs',
  audit: 'claude-md-rule-audit.mjs'
}

const HELP = `claude-md — CLAUDE.md governance CLI (TASK-1160)

Usage:
  pnpm claude-md <command> [options]

Commands:
  inventory [--top=N] [--json]    Enumerate CLAUDE.md sections by token weight + NUNCA/SIEMPRE.
  budget    [--strict]            Token-budget gate (35k ceiling). --strict fails (exit 1) if over.
  audit     [--strict] [--list]   Rule-loss safety net: every original rule still reachable (0 orphans).
  check                           Closing gate = budget --strict + audit --strict.
  help                            Show this help.
`

/** Run one underlying script with the given args; return its exit code. */
const runScript = (name, args) => {
  const res = spawnSync('node', [join(__dirname, SCRIPTS[name]), ...args], { stdio: 'inherit' })

  
return res.status ?? 1
}

const main = () => {
  const [sub, ...rest] = process.argv.slice(2)

  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(HELP)
    process.exit(sub ? 0 : 1)
  }

  if (sub === 'check') {
    console.log('claude-md check — budget --strict + audit --strict\n')
    const budget = runScript('budget', ['--strict'])

    console.log('')
    const audit = runScript('audit', ['--strict'])

    process.exit(budget === 0 && audit === 0 ? 0 : 1)
  }

  if (!SCRIPTS[sub]) {
    console.error(`Unknown command: ${sub}\n`)
    console.log(HELP)
    process.exit(1)
  }

  process.exit(runScript(sub, rest))
}

main()
