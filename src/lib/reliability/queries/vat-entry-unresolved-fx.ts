import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1185 Slice 1 — Reliability signal `finance.vat.entry_unresolved_fx`.
 *
 * El materializador del IVA convierte a CLP con `tax_amount * COALESCE(NULLIF(
 * exchange_rate_to_clp,0),1)`. Para evitar el silent-wrong de ~900x en un
 * documento no-CLP con FX nulo/0, el guard FX (Slice 1) **omite** esos
 * documentos de la materialización en vez de sub-declararlos. Este signal los
 * hace observables: cuenta income (`vat_output`, tax>0) y expenses
 * (recoverable/non_recoverable>0) con período fiscal, moneda ≠ CLP y FX nulo/0.
 *
 * Steady state: `0` (el IVA chileno se declara en CLP; los documentos son CLP).
 * Cualquier `> 0` indica un documento con IVA que NO entra al F29 hasta resolver
 * su tipo de cambio — acción del operador (cargar el FX del documento).
 *
 * **Kind**: `data_quality`. **Severidad**: `warning` cuando count > 0 (es un
 * documento omitido, no una cifra incorrecta materializada).
 */
export const VAT_ENTRY_UNRESOLVED_FX_SIGNAL_ID = 'finance.vat.entry_unresolved_fx'

export const getVatEntryUnresolvedFxSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(
      `WITH eligible_unresolved AS (
         SELECT i.income_id AS source_id
         FROM greenhouse_finance.income i
         WHERE i.period_year IS NOT NULL AND i.period_month IS NOT NULL
           AND COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
           AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
           AND i.currency <> 'CLP'
           AND COALESCE(NULLIF(i.exchange_rate_to_clp, 0), 0) = 0
         UNION ALL
         SELECT e.expense_id AS source_id
         FROM greenhouse_finance.expenses e
         WHERE e.period_year IS NOT NULL AND e.period_month IS NOT NULL
           AND (COALESCE(e.recoverable_tax_amount, 0) > 0 OR COALESCE(e.non_recoverable_tax_amount, 0) > 0)
           AND e.currency <> 'CLP'
           AND COALESCE(NULLIF(e.exchange_rate_to_clp, 0), 0) = 0
       )
       SELECT COUNT(*)::int AS n FROM eligible_unresolved`
    )

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: VAT_ENTRY_UNRESOLVED_FX_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getVatEntryUnresolvedFxSignal',
      label: 'VAT entry unresolved FX',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin documentos con IVA no-CLP de FX no resuelto.'
          : `${count} documento${count === 1 ? '' : 's'} con IVA en moneda ≠ CLP sin tipo de cambio resuelto: omitidos del F29 hasta cargar su FX.`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'documentos_no_clp_sin_fx',
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
      tags: { source: 'reliability_signal_vat_entry_unresolved_fx' }
    })

    return {
      signalId: VAT_ENTRY_UNRESOLVED_FX_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getVatEntryUnresolvedFxSignal',
      label: 'VAT entry unresolved FX',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de FX no resuelto. Revisa los logs.',
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
