/**
 * TASK-850 — Preflight check: pending production runs without jobs.
 *
 * Wrapper around `listPendingRuns()` (extracted from TASK-848 V1.0
 * reliability reader). Detects runs in queued/in_progress with empty jobs
 * array — symptom of the concurrency deadlock that the TASK-848 fix addressed.
 *
 * Steady state = 0. Any record present = severity error (concurrency fix
 * regression OR new infrastructure bug). Pre-deploy this is a hard gate.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { listPendingRuns } from '@/lib/reliability/queries/release-pending-without-jobs'

import { resolveGithubToken } from '../../github-helpers'
import type { PreflightCheckResult } from '../types'

// Pending runs are repo-global; the per-run input is not consumed.
// Signature kept compatible with PreflightCheckDefinition.run via no-op param.
export const checkPendingWithoutJobs = async (
  _input?: unknown
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const token = await resolveGithubToken()

  if (!token) {
    return {
      checkId: 'pending_without_jobs',
      severity: 'unknown',
      status: 'not_configured',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'Sin token GitHub configurado',
      error: null,
      evidence: null,
      recommendation: 'Configurar GH App o PAT antes de re-ejecutar preflight.'
    }
  }

  try {
    const records = await listPendingRuns(token)

    if (records.length === 0) {
      return {
        checkId: 'pending_without_jobs',
        severity: 'ok',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: 'Sin runs queued/in_progress con jobs vacios',
        error: null,
        evidence: { count: 0 },
        recommendation: ''
      }
    }

    return {
      checkId: 'pending_without_jobs',
      severity: 'error',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `${records.length} run(s) queued/in_progress con jobs vacios > 5min (sintoma deadlock)`,
      error: null,
      evidence: {
        count: records.length,
        topBlockers: records.slice(0, 5).map(r => ({
          workflowName: r.workflowName,
          runId: r.runId,
          status: r.status,
          ageMs: r.ageMs,
          branch: r.branch,
          htmlUrl: r.htmlUrl
        }))
      },
      recommendation:
        'Cancelar runs zombie via `gh run cancel <id>` ANTES de disparar release nuevo. Si persiste, verificar concurrency fix Opcion A en worker workflows.'
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'pending_without_jobs' }
    })

    return {
      checkId: 'pending_without_jobs',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo consultar pending runs',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Reintentar; si persiste, verificar GitHub API + token.'
    }
  }
}
