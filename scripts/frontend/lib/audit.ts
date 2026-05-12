/**
 * Audit log JSONL append-only.
 *
 * Cada captura agrega 1 línea a `.captures/audit.jsonl` con:
 * {timestamp, route, env, scenario, outputs, actor, exitCode, durationMs}
 *
 * Patrón usado en el repo (release_state_transitions, webhook_inbox_events).
 * gitignored — solo para forensic local / dev.
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import type { CaptureEnv } from './env'

export interface AuditEntry {
  timestamp: string
  scenarioName: string
  route: string
  env: CaptureEnv
  outputDir: string
  exitCode: 0 | 1
  durationMs: number
  actor: string
  error?: string
}

const AUDIT_LOG_PATH = '.captures/audit.jsonl'

export const appendAudit = (entry: AuditEntry): void => {
  const dir = dirname(AUDIT_LOG_PATH)

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8')
}

export const resolveActor = (): string => {
  // Prefer GH actor (in CI), fall back to git user, then USER
  if (process.env.GITHUB_ACTOR) return `gh:${process.env.GITHUB_ACTOR}`
  if (process.env.USER) return `user:${process.env.USER}`

  return 'unknown'
}
