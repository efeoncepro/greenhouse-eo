#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..', '..')

const rawArgs = process.argv.slice(2).filter(arg => arg !== '--')
const passThroughArgs = rawArgs.filter(arg => !arg.startsWith('--kind') && !arg.startsWith('--item'))

const commands = [
  ['node', ['scripts/ci/task-lint.mjs', ...passThroughArgs]],
  ['node', ['scripts/ci/ops-artifact-lint.mjs', '--kind', 'epic', ...passThroughArgs]],
  ['node', ['scripts/ci/ops-artifact-lint.mjs', '--kind', 'mini', ...passThroughArgs]]
]

let failed = false

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env
  })

  if (result.status !== 0) failed = true
}

if (failed) process.exit(1)
