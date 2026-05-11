#!/usr/bin/env tsx
/**
 * TASK-850 — Production Preflight CLI.
 *
 * Fail-fast gate ANTES de promover a production. Ejecuta los 12 checks
 * canonicos en paralelo via runner + composer (TASK-672 mirror pattern) y
 * emite output JSON machine-readable + humano.
 *
 * Usage:
 *   pnpm release:preflight                    # human output, exit 0 always
 *   pnpm release:preflight --json             # JSON only, exit 0 always
 *   pnpm release:preflight --fail-on-error    # exit 1 si readyToDeploy=false
 *   pnpm release:preflight --override-batch-policy  # downgrade batch policy errors a warnings (requires audit)
 *   pnpm release:preflight --target-sha=<sha> # default HEAD del local checkout
 *   pnpm release:preflight --target-branch=main
 *
 * Output JSON shape: ProductionPreflightV1 (versionado contractVersion='production-preflight.v1').
 *
 * Spec: docs/tasks/in-progress/TASK-850-production-preflight-cli-complete.md.
 */

import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { argv, exit, stderr, stdout } from 'node:process'
import { promisify } from 'node:util'

import { githubRepoCoords } from '@/lib/release/github-helpers'
import { shouldFailPreflightCommand } from '@/lib/release/preflight/exit-policy'
import { formatPreflightAsHuman, formatPreflightAsJson } from '@/lib/release/preflight/output-formatters'
import { PREFLIGHT_CHECK_REGISTRY } from '@/lib/release/preflight/registry'
import { runPreflight } from '@/lib/release/preflight/runner'

const execFileAsync = promisify(execFile)

interface CliOptions {
  json: boolean
  failOnError: boolean
  overrideBatchPolicy: boolean
  targetSha: string | null
  targetBranch: string
  outputFile: string | null
}

const parseArgs = (args: readonly string[]): CliOptions => {
  const options: CliOptions = {
    json: false,
    failOnError: false,
    overrideBatchPolicy: false,
    targetSha: null,
    targetBranch: 'main',
    outputFile: null
  }

  for (const arg of args) {
    if (arg === '--json') options.json = true
    else if (arg === '--fail-on-error') options.failOnError = true
    else if (arg === '--override-batch-policy') options.overrideBatchPolicy = true
    else if (arg.startsWith('--target-sha=')) options.targetSha = arg.slice('--target-sha='.length)
    else if (arg.startsWith('--target-branch=')) options.targetBranch = arg.slice('--target-branch='.length)
    else if (arg.startsWith('--output-file=')) options.outputFile = arg.slice('--output-file='.length)
    else if (arg === '--help' || arg === '-h') {
      stdout.write(
        [
          'Production Preflight CLI (TASK-850)',
          '',
          'Usage: pnpm release:preflight [flags]',
          '',
          'Flags:',
          '  --json                       Output JSON only to stdout (machine-readable)',
          '  --output-file=<path>         Write JSON payload to <path> atomically.',
          '                               Solo escribe ahi; stdout queda libre para banners',
          '                               de pnpm/tsx + human summary opcional. Recomendado',
          '                               para CI workflows que NO pueden usar `pnpm --silent`',
          '                               ni redirection `>` (banner pollution rompe `jq`).',
          '  --fail-on-error              Exit 1 if readyToDeploy=false',
          '  --override-batch-policy      Downgrade release_batch_policy errors to warnings',
          '                               (requires platform.release.preflight.override_batch_policy + audit)',
          '  --target-sha=<sha>           SHA to validate (default: git HEAD)',
          '  --target-branch=<branch>     Branch to promote to (default: main)',
          '  --help, -h                   This message',
          ''
        ].join('\n')
      )
      exit(0)
    }
  }

  return options
}

const resolveTargetSha = async (override: string | null): Promise<string> => {
  if (override) return override

  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA

  const { stdout: shaStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
    timeout: 5_000
  })

  return shaStdout.trim()
}

const resolveTriggeredBy = (): string | null => {
  return (
    process.env.GITHUB_ACTOR ??
    process.env.USER ??
    process.env.LOGNAME ??
    null
  )
}

const main = async (): Promise<void> => {
  const options = parseArgs(argv.slice(2))

  let targetSha: string

  try {
    targetSha = await resolveTargetSha(options.targetSha)
  } catch (error) {
    stderr.write(
      `production-preflight: no se pudo resolver target SHA. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n`
    )
    exit(2)
  }

  const triggeredBy = resolveTriggeredBy()
  const repo = githubRepoCoords()

  const payload = await runPreflight({
    audience: 'admin',
    input: {
      targetSha,
      targetBranch: options.targetBranch,
      githubRepo: repo,
      triggeredBy,
      overrideBatchPolicy: options.overrideBatchPolicy
    },
    checks: PREFLIGHT_CHECK_REGISTRY
  })

  // Output routing canonical:
  //   --output-file=<path>: escribe JSON al path (controlado por el CLI,
  //     inmune al banner de pnpm/tsx que contamina stdout). Stdout queda
  //     libre para human summary opcional.
  //   --json: escribe JSON al stdout (caller debe usar `pnpm --silent`
  //     si redirige con `>`).
  //   default: human summary al stdout.
  //
  // Cuando --output-file + --json estan ambos: archivo recibe JSON,
  // stdout NO recibe nada extra (queda solo el banner pnpm si aplica).
  // Sin --output-file ni --json: human summary al stdout.

  const jsonPayload = formatPreflightAsJson(payload) + '\n'

  if (options.outputFile) {
    try {
      await writeFile(options.outputFile, jsonPayload, 'utf8')
    } catch (error) {
      stderr.write(
        `production-preflight: no se pudo escribir --output-file=${options.outputFile}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}\n`
      )
      exit(2)
    }
  }

  if (options.json && !options.outputFile) {
    stdout.write(jsonPayload)
  } else if (!options.outputFile) {
    stdout.write(formatPreflightAsHuman(payload) + '\n')
  }

  if (shouldFailPreflightCommand(payload, options.failOnError)) {
    exit(1)
  }

  exit(0)
}

main().catch(error => {
  stderr.write(
    `production-preflight: fallo composer-level. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}\n`
  )
  exit(2)
})
