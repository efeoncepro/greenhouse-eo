import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-725 Slice 5 — Reliability signal `finance.vat.position_drift`.
 *
 * Guarda la causa de datos de ISSUE-101: el materializador del IVA excluía
 * documentos con IVA que no tenían `space_id` (el grueso del crédito fiscal de
 * overhead). El IVA / F29 se declara por entidad legal, así que TODO documento
 * con IVA del período debe tener su asiento en `vat_ledger_entries`.
 *
 * Cuenta **(documento, bucket fiscal) elegibles** para IVA de períodos YA
 * materializados que NO tienen su asiento correspondiente en el ledger. Es
 * bucket-aware (no document-level): un income `vat_output` con tax>0 espera un
 * asiento `debit_fiscal`; un expense con `recoverable>0` espera `credito_fiscal`
 * y con `non_recoverable>0` espera `iva_no_recuperable`. Así detecta tanto un
 * documento entero dropeado (lo que causaba el filtro `space_id IS NOT NULL`)
 * como el drop de un solo bucket de un documento con ambos (que un check
 * document-level dejaría pasar como falso-negativo).
 *
 * Steady state: `0` post re-materialización (Slice 4 rollout). Cualquier `> 0`
 * indica que el materializador dejó fuera un (documento, bucket) con IVA
 * (regresión de la bug-class) → la posición F29 quedaría incompleta.
 *
 * **Límite conocido:** los documentos con IVA y `period_year`/`period_month`
 * NULL no se materializan en ningún período (comportamiento del materializador,
 * pre-existente) y por construcción son invisibles a este signal — se cubren con
 * un signal de data-quality aparte (follow-up TASK-725).
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0.
 */
export const VAT_POSITION_DRIFT_SIGNAL_ID = 'finance.vat.position_drift'

export const getVatPositionDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `WITH materialized_periods AS (
         SELECT DISTINCT period_year, period_month
         FROM greenhouse_finance.vat_monthly_positions
       ),
       eligible AS (
         -- income vat_output con tax>0 ⇒ espera un asiento debit_fiscal
         SELECT i.income_id AS source_id, i.period_year, i.period_month, 'debit_fiscal' AS vat_bucket
         FROM greenhouse_finance.income i
         JOIN materialized_periods mp
           ON mp.period_year = i.period_year AND mp.period_month = i.period_month
         WHERE COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
           AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
         UNION ALL
         -- expense recoverable>0 ⇒ espera un asiento credito_fiscal
         SELECT e.expense_id AS source_id, e.period_year, e.period_month, 'credito_fiscal' AS vat_bucket
         FROM greenhouse_finance.expenses e
         JOIN materialized_periods mp
           ON mp.period_year = e.period_year AND mp.period_month = e.period_month
         WHERE COALESCE(e.recoverable_tax_amount, 0) > 0
         UNION ALL
         -- expense non_recoverable>0 ⇒ espera un asiento iva_no_recuperable
         SELECT e.expense_id AS source_id, e.period_year, e.period_month, 'iva_no_recuperable' AS vat_bucket
         FROM greenhouse_finance.expenses e
         JOIN materialized_periods mp
           ON mp.period_year = e.period_year AND mp.period_month = e.period_month
         WHERE COALESCE(e.non_recoverable_tax_amount, 0) > 0
       )
       SELECT COUNT(*)::int AS n
       FROM eligible el
       WHERE NOT EXISTS (
         SELECT 1 FROM greenhouse_finance.vat_ledger_entries le
         WHERE le.source_id = el.source_id
           AND le.period_year = el.period_year
           AND le.period_month = el.period_month
           AND le.vat_bucket = el.vat_bucket
       )`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: VAT_POSITION_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getVatPositionDriftSignal',
      label: 'VAT position drift',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todos los documentos con IVA de los períodos materializados tienen su asiento en el ledger.'
          : `${count} documento${count === 1 ? '' : 's'} con IVA quedaron fuera del ledger en períodos materializados. La posición F29 está incompleta — re-materializar (TASK-725).`,
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
          value: 'docs/tasks/in-progress/TASK-725-finance-fiscal-scope-legal-entity-foundation.md'
        },
        {
          kind: 'doc',
          label: 'Issue',
          value: 'docs/issues/open/ISSUE-101-vat-monthly-position-mis-scoped-by-space-excludes-credito-fiscal.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_vat_position_drift' }
    })

    return {
      signalId: VAT_POSITION_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getVatPositionDriftSignal',
      label: 'VAT position drift',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de drift de IVA. Revisa los logs.',
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
