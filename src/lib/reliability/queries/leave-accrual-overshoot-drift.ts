import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-895 V1.1a Slice 3 — Reliability signal canonical.
 *
 * Detects the canonical regression of TASK-895: members whose Leave accrual
 * balance for the current year was anchored at `members.hire_date` (legacy
 * behavior) while their FIRST qualifying dependent CL compensation_version
 * actually starts materially later in the year — meaning the legacy formula
 * overstates feriado legal CL Art 67 CT eligibility for the period BEFORE
 * the dependent stint (when the worker was contractor/honorarios/external).
 *
 * **Pattern (V1.1a proxy)**: this signal is a SHAPE detector, not an exact
 * diff. It identifies the bug class without recomputing the
 * participation-aware formula at scale. An exact diff (TASK-895 V1.2) will
 * emit `legacy_minus_participation_aware_days` per member.
 *
 * **Query semantic**:
 *
 * - Member is active CL dependent (`pay_regime='chile'`, `payroll_via='internal'`).
 * - Has at least 1 `leave_balances` row for current year with
 *   `allowance_days > 0` AND policy is `monthly_accrual`.
 * - Has hire_date populated (legacy path requires it).
 * - The EARLIEST qualifying dependent CL `compensation_versions.effective_from`
 *   for the current year is more than 30 calendar days AFTER `hire_date`.
 *   That gap = the period when the member was contractor/honorarios/etc. but
 *   the legacy accrual counted those days as dependent.
 *
 * **Behavior under flag OFF (default)**: count > 0 is INFORMATIONAL — the
 * legacy semantic IS what the spec calls a bug class regulatorio. Operator
 * uses the count + audit script (S4) to scope flag-ON allowlist.
 *
 * **Behavior under flag ON (post pre-flag-ON gates)**: count > 0 should
 * decrease as `computeBalanceSeedForYear` re-materializes balances with the
 * canonical formula. Persistent count > 0 indicates either (a) members not
 * yet re-seeded (rerun the seed job), or (b) a regression in the resolver.
 *
 * **Kind**: `drift`. Steady state esperado = 0 (post-flag-ON-flip + re-seed).
 * **Severidad**: `warning` if count > 0 (canonical drift signal pattern).
 * **Subsystem rollup**: `'Payroll Data Quality'` (moduleKey `'payroll'`) —
 * unified with TASK-893 signals; if >3 Leave-native signals emerge in V1.2,
 * spawn dedicated subsystem `'HR Leave Quality'`.
 *
 * **Schema validation (canonical lesson hotfix Sentry 2026-05-16)**: query
 * verified live against PG real. `compensation_versions.payroll_via` does
 * NOT exist (Kysely codegen drift) — `payroll_via` lives on
 * `greenhouse_core.members`. `effective_from` + `hire_date` are both `date`
 * in real PG (date - date = integer, no EXTRACT needed).
 */
export const LEAVE_ACCRUAL_OVERSHOOT_DRIFT_SIGNAL_ID = 'hr.leave.accrual_overshoot_drift'

const QUERY_SQL = `
  WITH current_year AS (
    SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS y
  ),
  earliest_dependent AS (
    SELECT
      cv.member_id,
      MIN(cv.effective_from) AS first_dep_from
    FROM greenhouse_payroll.compensation_versions cv
    JOIN greenhouse_core.members m ON m.member_id = cv.member_id
    WHERE m.active = true
      AND m.pay_regime = 'chile'
      AND m.payroll_via = 'internal'
      AND cv.contract_type IN ('indefinido', 'plazo_fijo')
      AND cv.pay_regime = 'chile'
      AND cv.effective_from <= MAKE_DATE((SELECT y FROM current_year), 12, 31)
      AND (cv.effective_to IS NULL
           OR cv.effective_to >= MAKE_DATE((SELECT y FROM current_year), 1, 1))
    GROUP BY cv.member_id
  )
  SELECT
    COUNT(*)::int AS n,
    COALESCE(MIN(lb.year)::text, 'n/a') AS oldest_year,
    COALESCE(MAX(lb.year)::text, 'n/a') AS newest_year
  FROM greenhouse_hr.leave_balances lb
  JOIN greenhouse_hr.leave_policies lp ON lp.leave_type_code = lb.leave_type_code
  JOIN greenhouse_core.members m ON m.member_id = lb.member_id
  JOIN earliest_dependent ed ON ed.member_id = lb.member_id
  WHERE lb.year = (SELECT y FROM current_year)
    AND lb.allowance_days > 0
    AND lp.accrual_type = 'monthly_accrual'
    AND m.active = true
    AND m.hire_date IS NOT NULL
    AND ed.first_dep_from > (m.hire_date::date + INTERVAL '30 days')::date
`

export const getLeaveAccrualOvershootDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number; oldest_year: string; newest_year: string }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const oldestYear = rows[0]?.oldest_year ?? 'n/a'
    const newestYear = rows[0]?.newest_year ?? 'n/a'

    return {
      signalId: LEAVE_ACCRUAL_OVERSHOOT_DRIFT_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'getLeaveAccrualOvershootDriftSignal',
      label: 'Sobreacumulación feriado legal CL Art 67 CT (drift TASK-895)',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin miembros con hire_date materialmente anterior al primer vínculo dependent CL del year.'
          : `${count} miembro${count === 1 ? '' : 's'} con hire_date más de 30 días antes del primer vínculo dependent CL del year (años ${oldestYear}..${newestYear}). Bajo flag OFF default es informativo (legacy behavior). Bajo flag ON debería bajar a 0 tras re-seed de balances.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'oldest_year', value: oldestYear },
        { kind: 'metric', label: 'newest_year', value: newestYear }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'payroll', {
      extra: {
        source: 'reliability.leave_accrual_overshoot_drift.query_failed'
      }
    })

    return {
      signalId: LEAVE_ACCRUAL_OVERSHOOT_DRIFT_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'getLeaveAccrualOvershootDriftSignal',
      label: 'Sobreacumulación feriado legal CL Art 67 CT (drift TASK-895)',
      severity: 'unknown',
      summary: 'No se pudo consultar el drift de leave accrual overshoot (query falló).',
      observedAt,
      evidence: []
    }
  }
}
