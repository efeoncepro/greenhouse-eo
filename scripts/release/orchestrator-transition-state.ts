#!/usr/bin/env tsx
/**
 * TASK-851 — Production Release Orchestrator: transition-state CLI.
 *
 * Invoca `transitionReleaseState` (TASK-848 V1.0 helper canonico) desde el
 * workflow `production-release.yml` para mover el release entre estados.
 *
 * State machine canonica enforce TS↔SQL via assertValidReleaseStateTransition
 * — fail-loud ANTES de tocar DB.
 *
 * Usage:
 *   pnpm release:orchestrator-transition-state \
 *     --release-id=<id> \
 *     --from-state=<state> \
 *     --to-state=<state> \
 *     --actor-label=<actor> \
 *     [--actor-kind=member|system|cli] \
 *     [--reason=<text>] \
 *     [--metadata-json=<json-string>]
 *
 * Exit codes:
 *   0 — transition aplicada atomicamente (UPDATE + audit + outbox)
 *   1 — error (invalid transition, race con otro actor, DB unreachable)
 *   2 — invalid args
 */

import { argv, exit, stderr } from 'node:process'

import { transitionReleaseState } from '@/lib/release/manifest-store'
import { isReleaseState, type ReleaseState } from '@/lib/release/state-machine'

interface CliOptions {
  releaseId: string
  fromState: ReleaseState
  toState: ReleaseState
  actorLabel: string
  actorKind: 'member' | 'system' | 'cli'
  reason: string
  metadata: Record<string, unknown>
}

const parseArgs = (args: readonly string[]): CliOptions => {
  const partial: Record<string, unknown> = {
    actorKind: 'cli',
    reason: 'Orchestrator workflow transition',
    metadata: {}
  }

  for (const arg of args) {
    if (arg.startsWith('--release-id=')) partial.releaseId = arg.slice('--release-id='.length)
    else if (arg.startsWith('--from-state=')) partial.fromState = arg.slice('--from-state='.length)
    else if (arg.startsWith('--to-state=')) partial.toState = arg.slice('--to-state='.length)
    else if (arg.startsWith('--actor-label=')) partial.actorLabel = arg.slice('--actor-label='.length)
    else if (arg.startsWith('--actor-kind=')) partial.actorKind = arg.slice('--actor-kind='.length)
    else if (arg.startsWith('--reason=')) partial.reason = arg.slice('--reason='.length)
    else if (arg.startsWith('--metadata-json=')) {
      const raw = arg.slice('--metadata-json='.length)

      try {
        partial.metadata = JSON.parse(raw) as Record<string, unknown>
      } catch {
        stderr.write('orchestrator-transition-state: --metadata-json must be valid JSON\n')
        exit(2)
      }
    }
  }

  if (!partial.releaseId) {
    stderr.write('orchestrator-transition-state: --release-id is required\n')
    exit(2)
  }

  if (!isReleaseState(partial.fromState)) {
    stderr.write(`orchestrator-transition-state: invalid --from-state '${partial.fromState}'\n`)
    exit(2)
  }

  if (!isReleaseState(partial.toState)) {
    stderr.write(`orchestrator-transition-state: invalid --to-state '${partial.toState}'\n`)
    exit(2)
  }

  if (!partial.actorLabel) {
    stderr.write('orchestrator-transition-state: --actor-label is required\n')
    exit(2)
  }

  if (
    partial.actorKind !== 'member' &&
    partial.actorKind !== 'system' &&
    partial.actorKind !== 'cli'
  ) {
    stderr.write(`orchestrator-transition-state: invalid --actor-kind '${partial.actorKind}'\n`)
    exit(2)
  }

  if (typeof partial.reason !== 'string' || partial.reason.trim().length < 5) {
    stderr.write('orchestrator-transition-state: --reason must be >= 5 chars (CHECK enforced)\n')
    exit(2)
  }

  return partial as unknown as CliOptions
}

const main = async (): Promise<void> => {
  const options = parseArgs(argv.slice(2))

  try {
    await transitionReleaseState({
      releaseId: options.releaseId,
      fromState: options.fromState,
      toState: options.toState,
      actorKind: options.actorKind,
      actorLabel: options.actorLabel,
      reason: options.reason,
      metadata: options.metadata
    })

    exit(0)
  } catch (error) {
    stderr.write(
      `orchestrator-transition-state: failed: ${error instanceof Error ? error.message : String(error)}\n`
    )
    exit(1)
  }
}

main().catch(error => {
  stderr.write(
    `orchestrator-transition-state: composer-level failure: ${error instanceof Error ? error.message : String(error)}\n`
  )
  exit(1)
})
