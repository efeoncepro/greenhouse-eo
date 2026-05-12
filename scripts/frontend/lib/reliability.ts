/**
 * Reliability signal reader para captures locales (V1.1 local-only).
 *
 * Lee `.captures/audit.jsonl` append-only y deriva:
 * - Failure rate de los últimos N runs (default 20)
 * - Last failure timestamp + scenario
 * - Mean duration
 *
 * **Contrato V1.1 (local-only)**: este reader opera sobre el audit.jsonl
 * local. NO está integrado al Reliability Control Plane PG-backed.
 *
 * **Contrato V1.2 (CI-backed, futuro)**: cuando CI corra `pnpm fe:capture`
 * como parte del pipeline, debe escribir su outcome a:
 *   `greenhouse_serving.frontend_capture_runs` (tabla por crear)
 * con shape compatible al AuditEntry. Entonces el reliability signal
 * `frontend.capture.failed_rate` lee de PG (canónico) y se integra a
 * `getReliabilityOverview` bajo subsystem `Frontend Tooling`.
 *
 * Spec V1.2 esperada:
 *   - kind: drift
 *   - severity: warning si failure_rate > 10%, error si > 25%, ventana 7d
 *   - steady state: failure_rate < 5%
 *
 * Por ahora, este helper es self-service para que un agente o dev
 * verifique salud de capturas locales: `pnpm fe:capture:health`.
 */

import { existsSync, readFileSync } from 'node:fs'

import type { AuditEntry } from './audit'

const AUDIT_LOG_PATH = '.captures/audit.jsonl'

export interface ReliabilitySignal {
  totalRuns: number
  failedRuns: number
  failureRate: number
  meanDurationMs: number
  lastFailure: { timestamp: string; scenarioName: string; error?: string } | null
  signal: 'ok' | 'warning' | 'error' | 'unknown'
  threshold: { warning: number; error: number }
}

const FAILURE_RATE_WARNING = 0.1
const FAILURE_RATE_ERROR = 0.25

const readAuditEntries = (limit: number): AuditEntry[] => {
  if (!existsSync(AUDIT_LOG_PATH)) return []

  const lines = readFileSync(AUDIT_LOG_PATH, 'utf8')
    .split('\n')
    .filter(l => l.trim().length > 0)

  // Tomar las últimas N
  const slice = lines.slice(-limit)
  const entries: AuditEntry[] = []

  for (const line of slice) {
    try {
      entries.push(JSON.parse(line) as AuditEntry)
    } catch {
      // skip malformed line
    }
  }

  return entries
}

export const computeReliabilitySignal = (lastN = 20): ReliabilitySignal => {
  const entries = readAuditEntries(lastN)

  if (entries.length === 0) {
    return {
      totalRuns: 0,
      failedRuns: 0,
      failureRate: 0,
      meanDurationMs: 0,
      lastFailure: null,
      signal: 'unknown',
      threshold: { warning: FAILURE_RATE_WARNING, error: FAILURE_RATE_ERROR }
    }
  }

  const failed = entries.filter(e => e.exitCode !== 0)
  const failureRate = failed.length / entries.length
  const meanDuration = entries.reduce((acc, e) => acc + e.durationMs, 0) / entries.length

  let signal: ReliabilitySignal['signal'] = 'ok'

  if (failureRate >= FAILURE_RATE_ERROR) signal = 'error'
  else if (failureRate >= FAILURE_RATE_WARNING) signal = 'warning'

  const lastFailureEntry = [...failed].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]

  return {
    totalRuns: entries.length,
    failedRuns: failed.length,
    failureRate,
    meanDurationMs: Math.round(meanDuration),
    lastFailure: lastFailureEntry
      ? {
          timestamp: lastFailureEntry.timestamp,
          scenarioName: lastFailureEntry.scenarioName,
          error: lastFailureEntry.error
        }
      : null,
    signal,
    threshold: { warning: FAILURE_RATE_WARNING, error: FAILURE_RATE_ERROR }
  }
}
