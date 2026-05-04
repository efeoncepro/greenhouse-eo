#!/usr/bin/env node
/**
 * TASK-764 Slice 5 — design:diff wrapper.
 *
 * Compares the current `DESIGN.md` against a previous git revision using
 * the upstream `design.md diff` CLI. Replaces the old script that depended
 * on a `DESIGN.prev.md` paralleled file (drift latency: anyone could forget
 * to update it). Now the comparison is always against `git show <ref>:DESIGN.md`.
 *
 * Default ref: `HEAD~1` (last commit). Override via `--ref <git-ref>` or
 * positional argument. Examples:
 *
 *   pnpm design:diff                 # vs HEAD~1
 *   pnpm design:diff main            # vs main
 *   pnpm design:diff --ref origin/develop
 *   pnpm design:diff --format json   # passthrough to design.md diff
 *
 * Exits non-zero if `git show` fails (ref doesn't exist) or the upstream CLI
 * fails. Cleans up the temp file even on error.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exit } from 'node:process'

const args = process.argv.slice(2)
const TARGET_FILE = 'DESIGN.md'

let ref = 'HEAD~1'
const passthrough = []

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--') continue // pnpm forwarder, ignore
  if (arg === '--ref' && args[i + 1]) {
    ref = args[++i]
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: pnpm design:diff [git-ref] [--ref <git-ref>] [<design.md diff options>]

Compares ${TARGET_FILE} against a git revision.

Defaults:
  ref: HEAD~1

Examples:
  pnpm design:diff
  pnpm design:diff main
  pnpm design:diff -- --ref origin/develop
  pnpm design:diff -- --format json
`)
    exit(0)
  } else if (!arg.startsWith('-') && ref === 'HEAD~1') {
    // First positional non-flag arg is treated as the ref
    ref = arg
  } else {
    passthrough.push(arg)
  }
}

const tmpDir = mkdtempSync(join(tmpdir(), 'gh-design-diff-'))
const beforePath = join(tmpDir, 'DESIGN.before.md')

try {
  let beforeContent
  try {
    beforeContent = execFileSync('git', ['show', `${ref}:${TARGET_FILE}`], {
      encoding: 'utf8'
    })
  } catch (err) {
    console.error(`error: cannot read ${TARGET_FILE} at ref '${ref}'.`)
    console.error(`  Reason: ${err.message ?? err}`)
    console.error(`  Hints: verify the ref exists ('git rev-parse ${ref}'), or pass a different one with --ref <ref>.`)
    exit(2)
  }

  writeFileSync(beforePath, beforeContent, 'utf8')

  const cliArgs = ['design.md', 'diff', beforePath, TARGET_FILE, ...passthrough]
  const result = spawnSync('npx', cliArgs, { stdio: 'inherit' })

  if (result.error) {
    console.error(`error: failed to spawn design.md CLI — ${result.error.message}`)
    exit(3)
  }

  exit(result.status ?? 0)
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}
