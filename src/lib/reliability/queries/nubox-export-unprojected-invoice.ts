import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1209 — Reliability signal para facturas de exportación Nubox
 * (DTE 110/111/112) que el sync recurrente intentó proyectar a
 * `greenhouse_finance.income` pero NO logró materializar.
 *
 * Fuente: `greenhouse_sync.source_sync_failures` con `error_code =
 * 'nubox_income_projection_failed'` (código estable que el projection sync
 * estampa para fallas de export DTE, con `nuboxDocumentId` en el payload),
 * cruzado contra `income` por `nubox_document_id`. El cruce hace el signal
 * **auto-clearing**: en cuanto el income row existe (p.ej. tras el fix de
 * exento de Slice 2 + el próximo sync), la factura sale del conteo.
 *
 * Ventana de 30 días para no arrastrar fallas históricas ya resueltas por otra
 * vía. Steady state esperado: 0. Un valor > 0 indica una factura de exportación
 * válida que el pipeline no convirtió en AR — accionable por Finance Ops.
 *
 * Distinto de `finance.nubox_export.orphan_rfc` (RFC sin organización, no se
 * intenta proyectar) y de `finance.nubox_export.foreign_amount_missing`
 * (income existe pero sin plano nativo). Este detecta el caso "sin income row".
 *
 * **Kind**: `data_quality`. **Severidad**: `warning` cuando count > 0.
 */
export const NUBOX_EXPORT_UNPROJECTED_INVOICE_SIGNAL_ID = 'finance.nubox_export.unprojected_invoice'

type UnprojectedRow = {
  nubox_document_id: string
  folio: string | null
  dte_type_code: string | null
  last_seen: string
}

export const getNuboxExportUnprojectedInvoiceSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<UnprojectedRow>(
      `SELECT
         (f.payload_json->>'nuboxDocumentId') AS nubox_document_id,
         MAX(f.payload_json->>'folio')        AS folio,
         MAX(f.payload_json->>'dteTypeCode')  AS dte_type_code,
         MAX(f.created_at)                    AS last_seen
       FROM greenhouse_sync.source_sync_failures f
       WHERE f.source_system = 'nubox'
         AND f.error_code = 'nubox_income_projection_failed'
         AND f.created_at > NOW() - INTERVAL '30 days'
         AND f.payload_json->>'nuboxDocumentId' ~ '^[0-9]+$'
         AND NOT EXISTS (
           SELECT 1 FROM greenhouse_finance.income i
           WHERE i.nubox_document_id = (f.payload_json->>'nuboxDocumentId')::bigint
         )
       GROUP BY 1
       ORDER BY last_seen DESC
       LIMIT 50`
    )

    const count = rows.length

    const sample = rows
      .slice(0, 5)
      .map(r => `DTE ${r.dte_type_code ?? '?'} folio ${r.folio ?? '?'} (doc ${r.nubox_document_id})`)
      .join(', ')

    return {
      signalId: NUBOX_EXPORT_UNPROJECTED_INVOICE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getNuboxExportUnprojectedInvoiceSignal',
      label: 'Factura exportación sin proyectar a income',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Toda factura de exportación Nubox intentada se proyectó a income (AR).'
          : `${count} factura${count === 1 ? '' : 's'} de exportación Nubox sin income row tras el sync${sample ? ` (${sample})` : ''}.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'sql',
          label: 'Query',
          value:
            "source_sync_failures error_code='nubox_income_projection_failed' (30d) NOT EXISTS income.nubox_document_id"
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1209-nubox-export-invoice-automatic-income-projection.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_nubox_export_unprojected_invoice' }
    })

    return {
      signalId: NUBOX_EXPORT_UNPROJECTED_INVOICE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getNuboxExportUnprojectedInvoiceSignal',
      label: 'Factura exportación sin proyectar a income',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}
