/**
 * TASK-850 — Preflight check #8: Postgres health.
 *
 * Wraps `pnpm pg:doctor` (existing health check). Exit code 0 = healthy;
 * non-zero = unhealthy with stderr/stdout indicating the issue.
 *
 * Per Decision 4: Postgres is STRICT (failure = error). Without a healthy
 * primary store we cannot promote. Defense-in-depth: even if pg:doctor is
 * missing or returns non-standard output, severity unknown surfaces as a
 * degraded source — operator must verify manually.
 */

import 'server-only'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const execFileAsync = promisify(execFile)
const PG_DOCTOR_TIMEOUT_MS = 30_000

interface ExecError {
  readonly code?: number | string
  readonly stdout?: string
  readonly stderr?: string
}

export const checkPostgresHealth = async (
  _input: PreflightInput
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  try {
    const { stdout } = await execFileAsync('pnpm', ['pg:doctor'], {
      timeout: PG_DOCTOR_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024
    })

    return {
      checkId: 'postgres_health',
      severity: 'ok',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'pg:doctor verde',
      error: null,
      evidence: { stdoutTail: stdout.slice(-500) },
      recommendation: ''
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'postgres_health' }
    })

    const execError = error as ExecError
    const exitCode = typeof execError.code === 'number' ? execError.code : null
    const stderrTail = (execError.stderr ?? '').slice(-500)

    return {
      checkId: 'postgres_health',
      severity: 'error',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `pg:doctor fallo (exit code ${exitCode ?? 'unknown'})`,
      error: redactErrorForResponse(error),
      evidence: { exitCode, stderrTail },
      recommendation:
        'Investigar pg:doctor stderr. Comunes: Cloud SQL Proxy down, GCP ADC expirado, secret rotation reciente.'
    }
  }
}
