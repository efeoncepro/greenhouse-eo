import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { PayrollDataQualityMetric } from './types'

/**
 * TASK-729 — Detector "projection_queue_failures".
 *
 * Cuenta entries `failed` o `dead` (no archived) en `projection_refresh_queue`
 * para projections que payroll consume reactivamente:
 *
 *   - `projected_payroll` — proyección de nómina (TASK-411)
 *   - `leave_payroll_recalculation` — recálculo cuando llega permiso aprobado (TASK-410)
 *   - `payroll_reliquidation_delta` — propagación de delta a Finance expenses (TASK-410)
 *   - `staff_augmentation` — snapshots de placement comerciales
 *
 * Si > 0, las proyecciones de nómina pueden estar stale o inconsistentes
 * con el cálculo oficial.
 *
 * Status enum confirmado: 'pending' | 'completed' | 'failed' | 'dead'.
 * `archived = TRUE` indica que el orphan auto-archive ya descartó la fila
 * como ruido (TASK-588) y no se cuenta.
 */
export const detectProjectionQueueFailures = async (): Promise<PayrollDataQualityMetric> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM greenhouse_sync.projection_refresh_queue
       WHERE projection_name IN (
           'projected_payroll',
           'leave_payroll_recalculation',
           'payroll_reliquidation_delta',
           'staff_augmentation'
         )
         AND status IN ('failed', 'dead')
         AND COALESCE(archived, FALSE) = FALSE`
    )

    const count = Number(rows[0]?.cnt ?? 0)

    return {
      key: 'projection_queue_failures',
      label: 'Proyecciones de payroll fallidas',
      value: count,
      status: count === 0 ? 'ok' : count > 5 ? 'error' : 'warning'
    }
  } catch {
    return {
      key: 'projection_queue_failures',
      label: 'Proyecciones de payroll fallidas',
      value: 0,
      status: 'info'
    }
  }
}
