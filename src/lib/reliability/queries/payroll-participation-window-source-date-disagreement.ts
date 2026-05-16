import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-893 Slice 5 — Reliability signal reader.
 *
 * Detects source-date drift between `compensation_versions.effective_from`
 * and `work_relationship_onboarding_cases.start_date` for active members.
 * The TASK-893 V1 canonical entry source is `compensation.effective_from`;
 * onboarding is observed-without-consumed (LEFT JOIN in the resolver bulk
 * query) — this signal counts how many members would benefit from a V1.1
 * decision to incorporate onboarding as a second source.
 *
 * **Threshold**: 7 days difference. Captures the common case "firma viernes,
 * empieza lunes" (1-3 days) as noise, but detects structural drift (firma
 * day 1, empieza day 15) as signal. Threshold rationale documented in
 * `policy.ts` JSDoc — match.
 *
 * **Behavior under flag OFF (default productivo)**: this signal returns
 * whatever drift exists in the data right now. If count = 0, no current
 * drift; if count > 0, V1.1 onboarding-source candidates exist.
 *
 * **Behavior under flag ON**: same query, same interpretation. The flag
 * does NOT change drift count — only whether the resolver emits
 * `source_date_disagreement` warnings per member.
 *
 * **Kind**: `drift`. Steady state esperado = 0 (post-cleanup).
 * **Severidad**: `warning` if count > 0 (informational drift signal).
 *
 * Query: members with both compensation_versions active (effective_to NULL
 * or future) AND work_relationship_onboarding_cases non-cancelled, where
 * the two dates differ by > 7 days. Uses the most recent applicable
 * compensation + onboarding case per member (DISTINCT ON pattern).
 */
export const PAYROLL_PARTICIPATION_WINDOW_SOURCE_DATE_DISAGREEMENT_SIGNAL_ID =
  'payroll.participation_window.source_date_disagreement'

const QUERY_SQL = `
  WITH latest_comp AS (
    SELECT DISTINCT ON (cv.member_id)
      cv.member_id,
      cv.effective_from
    FROM greenhouse_payroll.compensation_versions cv
    JOIN greenhouse_core.members m ON m.member_id = cv.member_id
    WHERE m.active = true
      AND (cv.effective_to IS NULL OR cv.effective_to >= CURRENT_DATE)
    ORDER BY cv.member_id, cv.effective_from DESC
  ),
  latest_onboarding AS (
    SELECT DISTINCT ON (o.member_id)
      o.member_id,
      o.start_date
    FROM greenhouse_hr.work_relationship_onboarding_cases o
    WHERE COALESCE(o.status, '') NOT IN ('cancelled')
      AND o.start_date IS NOT NULL
    ORDER BY o.member_id, o.start_date DESC, o.created_at DESC
  )
  SELECT COUNT(*)::int AS n
  FROM latest_comp lc
  JOIN latest_onboarding lo ON lo.member_id = lc.member_id
  WHERE ABS(EXTRACT(EPOCH FROM (lc.effective_from - lo.start_date)) / 86400) > 7
`

export const getPayrollParticipationWindowSourceDateDisagreementSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: PAYROLL_PARTICIPATION_WINDOW_SOURCE_DATE_DISAGREEMENT_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getPayrollParticipationWindowSourceDateDisagreementSignal',
        label: 'Drift compensation.effective_from vs onboarding.start_date',
        severity: count === 0 ? 'ok' : 'warning',
        summary:
          count === 0
            ? 'Sin drift compensation vs onboarding (todas las fechas alineadas dentro de 7 días).'
            : `${count} member${count === 1 ? '' : 's'} con drift > 7 días entre comp.effective_from y onboarding.start_date. Data-driven trigger para V1.1 onboarding-source consideration.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'drift_count', value: String(count) },
          { kind: 'metric', label: 'threshold_days', value: '7' }
        ]
      }
    } catch (err) {
      captureWithDomain(err, 'payroll', {
        extra: {
          source: 'reliability.payroll_participation_window_source_date_disagreement.query_failed'
        }
      })

      return {
        signalId: PAYROLL_PARTICIPATION_WINDOW_SOURCE_DATE_DISAGREEMENT_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getPayrollParticipationWindowSourceDateDisagreementSignal',
        label: 'Drift compensation.effective_from vs onboarding.start_date',
        severity: 'unknown',
        summary: 'No se pudo consultar el source date disagreement (query falló).',
        observedAt,
        evidence: []
      }
    }
  }
