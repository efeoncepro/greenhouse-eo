import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1188 Slice 5 — Reliability signal `finance.retention.position_drift`.
 *
 * La línea de retenciones del F29 se materializa desde las boletas de honorarios
 * (BHE) recibidas (`greenhouse_finance.expenses.withholding_amount > 0`) por
 * entidad legal/período. TODO documento con retención de un período YA
 * materializado debe tener su asiento `counted` en `retention_ledger_entries`.
 *
 * Cuenta documentos con retención de períodos materializados que NO tienen su
 * asiento contado en el ledger. Mirror de `finance.vat.position_drift` (TASK-725).
 *
 * Steady state: `0` post re-materialización. Cualquier `> 0` = el materializador
 * dejó fuera una retención → la línea de retenciones del F29 está incompleta.
 *
 * **Límite conocido (mismo que IVA):** los documentos con retención y
 * `period_year`/`period_month` NULL no se materializan en ningún período y son
 * invisibles a este signal — se cubren con un signal de data-quality aparte
 * (follow-up, mirror de `finance.vat.eligible_without_period`).
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0.
 */
export const RETENTION_POSITION_DRIFT_SIGNAL_ID = 'finance.retention.position_drift'

export const getRetentionPositionDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `WITH materialized_periods AS (
         SELECT DISTINCT period_year, period_month
         FROM greenhouse_finance.retention_monthly_positions
       ),
       eligible AS (
         SELECT e.expense_id AS source_id, e.period_year, e.period_month
         FROM greenhouse_finance.expenses e
         JOIN materialized_periods mp
           ON mp.period_year = e.period_year AND mp.period_month = e.period_month
         WHERE COALESCE(e.withholding_amount, 0) > 0
           AND (e.currency = 'CLP' OR COALESCE(NULLIF(e.exchange_rate_to_clp, 0), 0) <> 0)
       )
       SELECT COUNT(*)::int AS n
       FROM eligible el
       WHERE NOT EXISTS (
         SELECT 1 FROM greenhouse_finance.retention_ledger_entries le
         WHERE le.source_kind = 'expense_bhe'
           AND le.source_id = el.source_id
           AND le.period_year = el.period_year
           AND le.period_month = el.period_month
           AND le.dedup_status = 'counted'
       )`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: RETENTION_POSITION_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getRetentionPositionDriftSignal',
      label: 'Retention position drift',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todas las retenciones (BHE) de los períodos materializados tienen su asiento en el ledger.'
          : `${count} documento${count === 1 ? '' : 's'} con retención quedaron fuera del ledger en períodos materializados. La línea de retenciones del F29 está incompleta — re-materializar (TASK-1188).`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'documentos_sin_asiento',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1188-retenciones-monthly-position.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_retention_position_drift' }
    })

    return {
      signalId: RETENTION_POSITION_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getRetentionPositionDriftSignal',
      label: 'Retention position drift',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de drift de retenciones. Revisa los logs.',
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
