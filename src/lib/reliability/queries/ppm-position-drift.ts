import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1189 Slice 5 — Reliability signal `finance.ppm.position_drift`.
 *
 * La línea PPM del F29 se materializa como base imponible (ventas netas del
 * período = `income.subtotal` CLP-normalizado) × tasa PPM. A diferencia de
 * IVA/retenciones, PPM es un agregado sin ledger per-documento, así que el drift
 * se mide a nivel posición: una `ppm_monthly_positions` cuya `base_amount_clp`
 * almacenada difiere de las ventas netas recomputadas en vivo (p.ej. entró una
 * factura nueva a un período ya materializado sin re-materializar) → la cifra PPM
 * quedó stale.
 *
 * Steady state: `0` post re-materialización. Cualquier `> 0` = una posición PPM
 * con base desactualizada respecto al income real del período.
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0.
 */
export const PPM_POSITION_DRIFT_SIGNAL_ID = 'finance.ppm.position_drift'

export const getPpmPositionDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `WITH recomputed AS (
         SELECT i.period_year, i.period_month,
           ROUND(SUM(
             CASE
               WHEN i.currency = 'CLP' THEN i.subtotal
               ELSE i.subtotal * COALESCE(NULLIF(i.exchange_rate_to_clp, 0), 1)
             END
           ), 2) AS net_sales_clp
         FROM greenhouse_finance.income i
         WHERE i.period_year IS NOT NULL
           AND i.period_month IS NOT NULL
           AND COALESCE(i.is_annulled, false) = false
           AND (i.currency = 'CLP' OR COALESCE(NULLIF(i.exchange_rate_to_clp, 0), 0) <> 0)
         GROUP BY i.period_year, i.period_month
       )
       SELECT COUNT(*)::int AS n
       FROM greenhouse_finance.ppm_monthly_positions p
       LEFT JOIN recomputed r
         ON r.period_year = p.period_year AND r.period_month = p.period_month
       WHERE ABS(p.base_amount_clp - COALESCE(r.net_sales_clp, 0)) > 1`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: PPM_POSITION_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getPpmPositionDriftSignal',
      label: 'PPM position drift',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todas las posiciones PPM tienen su base alineada con las ventas netas del período.'
          : `${count} posición${count === 1 ? '' : 'es'} PPM con base desactualizada respecto al income real del período. Re-materializar (TASK-1189).`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'posiciones_con_base_stale',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1189-ppm-monthly-position.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_ppm_position_drift' }
    })

    return {
      signalId: PPM_POSITION_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getPpmPositionDriftSignal',
      label: 'PPM position drift',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de drift de PPM. Revisa los logs.',
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
