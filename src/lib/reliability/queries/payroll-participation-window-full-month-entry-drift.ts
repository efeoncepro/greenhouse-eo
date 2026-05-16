import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-893 Slice 5 — Reliability signal reader.
 *
 * Detects the canonical regression of TASK-893 BL-1: members with
 * `compensation_versions.effective_from` mid-period whose `payroll_entries`
 * for that period show full-month gross (NOT prorated by participation
 * factor). When `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` and BL-1+BL-2
 * shipped correctly, this count must be 0 — every mid-period entry must
 * have its gross prorated.
 *
 * **Behavior under flag OFF (default productivo)**: this signal will
 * routinely return count > 0 for any historical period that had members
 * with mid-month entry. That is the legacy behavior the participation
 * window fix targets. Under flag OFF, treat as INFORMATIONAL — operator
 * sees that mid-period entries exist but the fix isn't enabled yet.
 *
 * **Behavior under flag ON**: count > 0 is a real regression (the BL-1
 * pattern in `prorateCompensationForParticipationWindow` failed to prorate
 * the entry). Severity should escalate when count > 0.
 *
 * V1 V0.1 design: signal returns severity based on count alone (warning if
 * count > 0). The flag-ON/flag-OFF distinction in the summary lets the
 * operator interpret correctly without conditional severity. When Slice 5
 * V1.1 adds the flag-state context, severity can become flag-aware.
 *
 * **Kind**: `drift`. Steady state esperado = 0 (post-flag-ON-flip).
 * **Severidad**: `warning` if count > 0 (canonical drift signal pattern).
 *
 * Query semantic: `payroll_entries` joined to `compensation_versions` where:
 * - `cv.effective_from` is strictly inside the period (mid-month entry)
 * - AND `pe.gross_total >= cv.base_salary - 1` (within rounding tolerance,
 *   indicating full-month gross was applied instead of prorated)
 * - AND period is in `('calculated', 'approved', 'exported', 'reopened')`
 *   (skipped 'draft' since those are not yet computed)
 * - AND `pe.is_active = TRUE` + `pe.superseded_by IS NULL` (only active entries; v1 rows
 *   from reopened periods are intentionally skipped — they are audit trail)
 */
export const PAYROLL_PARTICIPATION_WINDOW_FULL_MONTH_ENTRY_DRIFT_SIGNAL_ID =
  'payroll.participation_window.full_month_entry_drift'

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS n,
    COALESCE(MIN(pp.year || '-' || LPAD(pp.month::text, 2, '0')), 'n/a') AS oldest_period,
    COALESCE(MAX(pp.year || '-' || LPAD(pp.month::text, 2, '0')), 'n/a') AS newest_period
  FROM greenhouse_payroll.payroll_entries pe
  JOIN greenhouse_payroll.compensation_versions cv
    ON cv.version_id = pe.compensation_version_id
  JOIN greenhouse_payroll.payroll_periods pp
    ON pp.period_id = pe.period_id
  WHERE pp.status IN ('calculated', 'approved', 'exported', 'reopened')
    AND COALESCE(pe.is_active, TRUE) = TRUE
    AND pe.superseded_by IS NULL
    AND cv.effective_from > MAKE_DATE(pp.year, pp.month, 1)
    AND cv.effective_from <= (MAKE_DATE(pp.year, pp.month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date
    AND pe.gross_total >= cv.base_salary - 1
`

export const getPayrollParticipationWindowFullMonthEntryDriftSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number; oldest_period: string; newest_period: string }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)
      const oldestPeriod = rows[0]?.oldest_period ?? 'n/a'
      const newestPeriod = rows[0]?.newest_period ?? 'n/a'

      return {
        signalId: PAYROLL_PARTICIPATION_WINDOW_FULL_MONTH_ENTRY_DRIFT_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getPayrollParticipationWindowFullMonthEntryDriftSignal',
        label: 'Mid-period entry pagado full-month (drift TASK-893)',
        severity: count === 0 ? 'ok' : 'warning',
        summary:
          count === 0
            ? 'Sin members con effective_from mid-period que pagaron full-month gross.'
            : `${count} entry${count === 1 ? '' : 'ies'} con effective_from mid-period pagaron full-month gross (períodos ${oldestPeriod}..${newestPeriod}). Bajo flag OFF default es informativo (legacy behavior). Bajo flag ON es regresión del BL-1 pattern.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'count', value: String(count) },
          { kind: 'metric', label: 'oldest_period', value: oldestPeriod },
          { kind: 'metric', label: 'newest_period', value: newestPeriod }
        ]
      }
    } catch (err) {
      captureWithDomain(err, 'payroll', {
        extra: {
          source: 'reliability.payroll_participation_window_full_month_entry_drift.query_failed'
        }
      })

      return {
        signalId: PAYROLL_PARTICIPATION_WINDOW_FULL_MONTH_ENTRY_DRIFT_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getPayrollParticipationWindowFullMonthEntryDriftSignal',
        label: 'Mid-period entry pagado full-month (drift TASK-893)',
        severity: 'unknown',
        summary: 'No se pudo consultar el drift de payroll participation window (query falló).',
        observedAt,
        evidence: []
      }
    }
  }
