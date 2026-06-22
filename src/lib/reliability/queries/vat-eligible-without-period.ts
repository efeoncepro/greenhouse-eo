import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1185 Slice 4 — Reliability signal `finance.vat.eligible_without_period`.
 *
 * El materializador del IVA (y `materializeAllAvailableVatPeriods`) solo procesa
 * documentos con `period_year`/`period_month` poblados. Un income/expense con
 * IVA pero período fiscal NULL **nunca** entra a ninguna posición F29 y es
 * invisible a `finance.vat.position_drift` (que se une a períodos materializados).
 * Este signal cierra ese punto ciego de data-quality.
 *
 * Steady state: `0`. Cualquier `> 0` indica documentos con IVA sin `tax_period`
 * que no se están declarando — remediación: stampear el período fiscal del doc.
 *
 * **Kind**: `data_quality`. **Severidad**: `warning` cuando count > 0.
 */
export const VAT_ELIGIBLE_WITHOUT_PERIOD_SIGNAL_ID = 'finance.vat.eligible_without_period'

export const getVatEligibleWithoutPeriodSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `WITH eligible_without_period AS (
         SELECT i.income_id AS source_id
         FROM greenhouse_finance.income i
         WHERE COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
           AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
           AND (i.period_year IS NULL OR i.period_month IS NULL)
         UNION ALL
         SELECT e.expense_id AS source_id
         FROM greenhouse_finance.expenses e
         WHERE (COALESCE(e.recoverable_tax_amount, 0) > 0 OR COALESCE(e.non_recoverable_tax_amount, 0) > 0)
           AND (e.period_year IS NULL OR e.period_month IS NULL)
       )
       SELECT COUNT(*)::int AS n FROM eligible_without_period`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: VAT_ELIGIBLE_WITHOUT_PERIOD_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getVatEligibleWithoutPeriodSignal',
      label: 'VAT eligible without period',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Todos los documentos con IVA tienen período fiscal asignado.'
          : `${count} documento${count === 1 ? '' : 's'} con IVA sin período fiscal (period_year/month NULL): no entran a ninguna posición F29. Stampear el período.`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'documentos_sin_periodo',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1185-vat-materializer-fiscal-robustness-hardening.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_vat_eligible_without_period' }
    })

    return {
      signalId: VAT_ELIGIBLE_WITHOUT_PERIOD_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getVatEligibleWithoutPeriodSignal',
      label: 'VAT eligible without period',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de docs sin período. Revisa los logs.',
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
