import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-792 Slice 3 — Contractor work submission review overdue signal.
 *
 * Detecta work submissions estancadas en `submitted` o `disputed` con
 * `submitted_at` más antiguo que el umbral (14 días) — decisión operacional
 * (aprobar/disputar/rechazar) pendiente demasiado tiempo. Bloquea el flujo de
 * payable downstream (TASK-793) y representa deuda operativa.
 *
 * **Kind**: `drift`. Steady state esperado: 0 (las revisiones no deberían
 * sentarse 2 semanas). **Subsystem rollup**: `Identity & Access`
 * (moduleKey=identity). **Severity**: count=0 → ok; count>0 → warning; query
 * falla → unknown. La aritmética usa `NOW() - INTERVAL` sobre TIMESTAMPTZ
 * (sin EXTRACT(EPOCH FROM date), gate TASK-893).
 */
export const CONTRACTOR_WORK_SUBMISSION_REVIEW_OVERDUE_SIGNAL_ID =
  'hr.contractor_work_submission.review_overdue'

const OVERDUE_DAYS = 14

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_work_submissions
  WHERE status IN ('submitted', 'disputed')
    AND submitted_at IS NOT NULL
    AND submitted_at < NOW() - ($1 || ' days')::interval
`

type ReviewOverdueRow = {
  n: number
}

export const getContractorWorkSubmissionReviewOverdueSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<ReviewOverdueRow>(QUERY_SQL, [String(OVERDUE_DAYS)])
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Sin work submissions con revisión vencida.'
          : `${count} work submission${count === 1 ? '' : 's'} con revisión pendiente hace más de ${OVERDUE_DAYS} días.`

      return {
        signalId: CONTRACTOR_WORK_SUBMISSION_REVIEW_OVERDUE_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'drift',
        source: 'getContractorWorkSubmissionReviewOverdueSignal',
        label: 'Revisión de work submission vencida',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_work_submissions WHERE status IN ('submitted','disputed') AND submitted_at < NOW() - 14d"
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'metric',
            label: 'overdue_days_threshold',
            value: String(OVERDUE_DAYS)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value:
              'docs/tasks/in-progress/TASK-792-contractor-work-submissions-approval-dispute-flow.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'reliability_signal_contractor_work_submission_review_overdue' }
      })

      return {
        signalId: CONTRACTOR_WORK_SUBMISSION_REVIEW_OVERDUE_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'drift',
        source: 'getContractorWorkSubmissionReviewOverdueSignal',
        label: 'Revisión de work submission vencida',
        severity: 'unknown',
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'error',
            value: error instanceof Error ? error.message : String(error)
          }
        ]
      }
    }
  }
