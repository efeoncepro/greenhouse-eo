/**
 * TASK-850 — Preflight check #9: Postgres migrations status.
 *
 * Wraps `pnpm pg:connect:status` to verify there are no pending migrations.
 * Pending migrations + production deploy = race condition (deploy may
 * apply migrations OR may not, depending on which workflow gets there first).
 *
 * Strict severity: pending migrations → error.
 */

import 'server-only'

import * as childProcess from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const PG_STATUS_TIMEOUT_MS = 30_000

const runExecFile = (
  command: string,
  args: readonly string[],
  options: childProcess.ExecFileOptions
): Promise<{ stdout: string; stderr: string }> => {
  return promisify(childProcess.execFile)(command, args as string[], options) as Promise<{
    stdout: string
    stderr: string
  }>
}

const PENDING_REGEX = /(\d+)\s+migration[s]?\s+pending/i

const NO_PENDING_REGEX =
  /(no\s+pending|no\s+migrations\s+to\s+run|migrations\s+complete|todas\s+aplicadas|all\s+applied|0\s+pending)/i

export interface ParsedPgConnectStatus {
  readonly verdict: 'ok' | 'pending' | 'unparsed'
  readonly pendingCount: number
}

/**
 * Pure parser for `pnpm pg:connect:status` stdout. Exposed so unit tests
 * can verify regex behavior without invoking subprocess.
 */
export const parsePgConnectStatusOutput = (stdout: string): ParsedPgConnectStatus => {
  const pendingMatch = stdout.match(PENDING_REGEX)
  const pendingCount = pendingMatch ? Number(pendingMatch[1]) : 0
  const explicitlyClean = NO_PENDING_REGEX.test(stdout)

  if (pendingCount > 0) return { verdict: 'pending', pendingCount }

  if (explicitlyClean || /aplicadas|applied/i.test(stdout)) {
    return { verdict: 'ok', pendingCount: 0 }
  }

  return { verdict: 'unparsed', pendingCount: 0 }
}

export const checkPostgresMigrations = async (
  _input: PreflightInput
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  try {
    const { stdout } = await runExecFile('pnpm', ['pg:connect:status'], {
      timeout: PG_STATUS_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024
    })

    const parsed = parsePgConnectStatusOutput(stdout)

    if (parsed.verdict === 'pending') {
      return {
        checkId: 'postgres_migrations',
        severity: 'error',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `${parsed.pendingCount} migracion(es) pendientes`,
        error: null,
        evidence: { pendingCount: parsed.pendingCount, stdoutTail: stdout.slice(-500) },
        recommendation: 'Aplicar migrations via `pnpm pg:connect:migrate` antes de promover release.'
      }
    }

    if (parsed.verdict === 'ok') {
      return {
        checkId: 'postgres_migrations',
        severity: 'ok',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: 'Migrations al dia',
        error: null,
        evidence: { pendingCount: 0 },
        recommendation: ''
      }
    }

    return {
      checkId: 'postgres_migrations',
      severity: 'warning',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'pg:connect:status output no parsea',
      error: null,
      evidence: { stdoutTail: stdout.slice(-500) },
      recommendation: 'Ejecutar `pnpm pg:connect:status` manual para verificar migrations al dia.'
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'postgres_migrations' }
    })

    return {
      checkId: 'postgres_migrations',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'pg:connect:status fallo',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Verificar Cloud SQL Proxy + GCP ADC + reintentar.'
    }
  }
}
