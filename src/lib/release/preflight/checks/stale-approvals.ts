/**
 * TASK-850 — Preflight check: stale approvals on production deploy workflows.
 *
 * Wrapper around `listWaitingProductionRuns()` (extracted from TASK-848 V1.0
 * reliability reader). Reuses the same threshold ladder for consistency
 * across watchdog, dashboard reader, and preflight CLI.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { listWaitingProductionRuns } from '@/lib/reliability/queries/release-stale-approval'

import { resolveGithubToken } from '../../github-helpers'
import type { PreflightCheckResult } from '../types'

const STALE_APPROVAL_ERROR_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7d

const ageHoursLabel = (ms: number): string => {
  const hours = Math.round(ms / (60 * 60 * 1000))

  if (hours >= 48) {
    const days = Math.round(hours / 24)

    return `${days}d`
  }

  return `${hours}h`
}

// Stale approvals are repo-global; the per-run input is not consumed.
// Signature kept compatible with PreflightCheckDefinition.run via no-op param.
export const checkStaleApprovals = async (
  _input?: unknown
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const token = await resolveGithubToken()

  if (!token) {
    return {
      checkId: 'stale_approvals',
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
    const records = await listWaitingProductionRuns(token)

    if (records.length === 0) {
      return {
        checkId: 'stale_approvals',
        severity: 'ok',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: 'Sin runs production esperando approval > 24h',
        error: null,
        evidence: { count: 0 },
        recommendation: ''
      }
    }

    const maxAgeMs = Math.max(...records.map(r => r.ageMs))
    const severity = maxAgeMs >= STALE_APPROVAL_ERROR_THRESHOLD_MS ? 'error' : 'warning'

    return {
      checkId: 'stale_approvals',
      severity,
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `${records.length} run(s) production esperando approval > 24h (max ${ageHoursLabel(maxAgeMs)})`,
      error: null,
      evidence: {
        count: records.length,
        maxAgeMs,
        topBlockers: records.slice(0, 5).map(r => ({
          workflowName: r.workflowName,
          runId: r.runId,
          ageMs: r.ageMs,
          branch: r.branch,
          htmlUrl: r.htmlUrl
        }))
      },
      recommendation:
        'Cancelar runs viejos via `gh run cancel <id>` antes de promover release.'
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'stale_approvals' }
    })

    return {
      checkId: 'stale_approvals',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo consultar runs waiting',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Reintentar; si persiste, verificar GitHub API + token.'
    }
  }
}
