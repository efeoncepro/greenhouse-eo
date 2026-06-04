import 'server-only'

import { countPendingNuboxExportRfcDispositions } from '@/lib/finance/nubox-export-rfc-disposition/store'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-990 Slice 4 — Reliability signal para facturas de exportación Nubox
 * (DTE 110/111/112) cuyo RFC no matcheó automáticamente a una organización y
 * quedaron en disposición pendiente (`greenhouse_finance.nubox_export_rfc_dispositions`
 * status `pending_review`).
 *
 * Steady state esperado: 0 (Berel matchea hoy por RFC exacto). Un valor > 0
 * indica un cliente de exportación cuyo RFC aún no está en
 * `organizations.tax_id` — el operador lo resuelve vía
 * POST /api/admin/finance/nubox-export-rfc-dispositions/[id]/resolve.
 *
 * **Kind**: `drift`. **Severidad**: `warning` cuando count > 0 (no rompe P&L —
 * el income simplemente no se proyecta hasta vincular la org).
 */
export const NUBOX_EXPORT_ORPHAN_RFC_SIGNAL_ID = 'finance.nubox_export.orphan_rfc'

export const getNuboxExportOrphanRfcSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countPendingNuboxExportRfcDispositions()

    return {
      signalId: NUBOX_EXPORT_ORPHAN_RFC_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getNuboxExportOrphanRfcSignal',
      label: 'Nubox export RFC sin organización',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin facturas de exportación Nubox con RFC sin resolver.'
          : `${count} factura${count === 1 ? '' : 's'} de exportación con RFC sin vincular a una organización. Resolver en la cola de disposiciones.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "SELECT COUNT(*) FROM greenhouse_finance.nubox_export_rfc_dispositions WHERE status = 'pending_review'"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-990-mxn-multi-currency-finance-core.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_nubox_export_orphan_rfc' }
    })

    return {
      signalId: NUBOX_EXPORT_ORPHAN_RFC_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getNuboxExportOrphanRfcSignal',
      label: 'Nubox export RFC sin organización',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
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
