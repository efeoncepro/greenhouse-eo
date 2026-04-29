import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { PayrollDataQualityMetric } from './types'

/**
 * TASK-729 — Detector "stuck_draft_periods".
 *
 * Cuenta períodos en status `draft` cuyo mes operativo ya transcurrió y
 * cuyo último update es > 48h. Si emite > 0, hay un período que debió
 * haber avanzado a `calculated`/`approved` y no lo hizo — gap operacional.
 *
 * Read-only. No muta estado. Falla soft (`0` + status `info`) si la tabla
 * no existe en este backend (BigQuery legacy).
 */
export const detectStuckDraftPeriods = async (): Promise<PayrollDataQualityMetric> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM greenhouse_payroll.payroll_periods
       WHERE status = 'draft'
         AND updated_at < NOW() - INTERVAL '48 hours'
         AND (year * 100 + month) <=
             (EXTRACT(YEAR FROM CURRENT_DATE)::int * 100 + EXTRACT(MONTH FROM CURRENT_DATE)::int)`
    )

    const count = Number(rows[0]?.cnt ?? 0)

    return {
      key: 'stuck_draft_periods',
      label: 'Períodos stuck en borrador (>48h)',
      value: count,
      status: count === 0 ? 'ok' : count > 1 ? 'error' : 'warning'
    }
  } catch {
    return {
      key: 'stuck_draft_periods',
      label: 'Períodos stuck en borrador (>48h)',
      value: 0,
      status: 'info'
    }
  }
}
