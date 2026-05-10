#!/usr/bin/env tsx
/**
 * TASK-851 — Production Release Orchestrator: record-started CLI.
 *
 * Invoca `recordReleaseStarted` (TASK-848 V1.0 helper canonico) desde el
 * workflow `production-release.yml`. Usado en Job 2 del orquestador despues
 * del preflight CLI verde.
 *
 * Output: stdout JSON `{ releaseId, attemptN, targetSha }` consumible via
 * `jq -r .releaseId` en pasos siguientes del workflow.
 *
 * Usage:
 *   pnpm release:orchestrator-record-started \
 *     --target-sha=<sha> \
 *     --triggered-by=<gh_login_or_actor> \
 *     [--target-branch=main] \
 *     [--source-branch=develop] \
 *     [--preflight-result-file=<path-to-preflight.json>]
 *
 * Exit codes:
 *   0 — release manifest INSERTed atomically con outbox event + audit row
 *   1 — error (DB unreachable, partial UNIQUE INDEX violation, etc.)
 *   2 — invalid args
 */

import { argv, exit, stderr, stdout } from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'

import { recordReleaseStarted } from '@/lib/release/manifest-store'

interface CliOptions {
  targetSha: string
  triggeredBy: string
  targetBranch: string
  sourceBranch: string
  preflightResultFile: string | null
  outputFile: string | null
}

const parseArgs = (args: readonly string[]): CliOptions => {
  const options: Partial<CliOptions> = {
    targetBranch: 'main',
    sourceBranch: 'develop',
    preflightResultFile: null,
    outputFile: null
  }

  for (const arg of args) {
    if (arg.startsWith('--target-sha=')) options.targetSha = arg.slice('--target-sha='.length)
    else if (arg.startsWith('--triggered-by=')) options.triggeredBy = arg.slice('--triggered-by='.length)
    else if (arg.startsWith('--target-branch=')) options.targetBranch = arg.slice('--target-branch='.length)
    else if (arg.startsWith('--source-branch=')) options.sourceBranch = arg.slice('--source-branch='.length)
    else if (arg.startsWith('--preflight-result-file=')) {
      options.preflightResultFile = arg.slice('--preflight-result-file='.length)
    } else if (arg.startsWith('--output-file=')) {
      options.outputFile = arg.slice('--output-file='.length)
    } else if (arg === '--help' || arg === '-h') {
      stdout.write(
        [
          'Usage: pnpm release:orchestrator-record-started --target-sha=<sha> --triggered-by=<actor>',
          '',
          'Required:',
          '  --target-sha=<sha>             40-char hex git SHA',
          '  --triggered-by=<label>         Actor identifier (gh_login | system:<name> | cli:<name>)',
          '',
          'Optional:',
          '  --target-branch=<branch>       Default main',
          '  --source-branch=<branch>       Default develop',
          '  --preflight-result-file=<path> Path to preflight JSON output for audit',
          '  --output-file=<path>           Write JSON payload to <path> atomically.',
          '                                 Stdout queda libre para banners pnpm/tsx — sin',
          '                                 banner pollution rompiendo `jq` downstream.',
          '                                 Patron canonico (mirror TASK-850 preflight CLI).',
          ''
        ].join('\n')
      )
      exit(0)
    }
  }

  if (!options.targetSha) {
    stderr.write('orchestrator-record-started: --target-sha is required\n')
    exit(2)
  }

  if (!options.triggeredBy) {
    stderr.write('orchestrator-record-started: --triggered-by is required\n')
    exit(2)
  }

  return options as CliOptions
}

const main = async (): Promise<void> => {
  const options = parseArgs(argv.slice(2))

  let preflightResult: Record<string, unknown> = {}

  if (options.preflightResultFile) {
    try {
      const raw = await readFile(options.preflightResultFile, 'utf8')

      preflightResult = JSON.parse(raw) as Record<string, unknown>
    } catch (error) {
      stderr.write(
        `orchestrator-record-started: failed to read --preflight-result-file: ${error instanceof Error ? error.message : String(error)}\n`
      )
      exit(2)
    }
  }

  try {
    const manifest = await recordReleaseStarted({
      targetSha: options.targetSha,
      sourceBranch: options.sourceBranch,
      targetBranch: options.targetBranch,
      triggeredBy: options.triggeredBy,
      preflightResult
    })

    const jsonPayload = JSON.stringify({
      releaseId: manifest.releaseId,
      attemptN: manifest.attemptN,
      targetSha: manifest.targetSha,
      targetBranch: manifest.targetBranch,
      state: manifest.state,
      startedAt: manifest.startedAt
    }) + '\n'

    // Output routing canonico (mirror TASK-850 preflight CLI):
    //   --output-file=<path>: escribe JSON al path (controlado por el CLI,
    //     inmune al banner de pnpm/tsx que contamina stdout). Stdout queda
    //     libre para banners. Recomendado para CI workflows que NO pueden
    //     usar `pnpm --silent` ni redirection `>` (banner pollution rompe `jq`).
    //   default: JSON al stdout.
    if (options.outputFile) {
      try {
        await writeFile(options.outputFile, jsonPayload, 'utf8')
      } catch (error) {
        stderr.write(
          `orchestrator-record-started: failed to write --output-file=${options.outputFile}: ${error instanceof Error ? error.message : String(error)}\n`
        )
        exit(2)
      }
    } else {
      stdout.write(jsonPayload)
    }

    exit(0)
  } catch (error) {
    stderr.write(
      `orchestrator-record-started: failed: ${error instanceof Error ? error.message : String(error)}\n`
    )
    exit(1)
  }
}

main().catch(error => {
  stderr.write(
    `orchestrator-record-started: composer-level failure: ${error instanceof Error ? error.message : String(error)}\n`
  )
  exit(1)
})
