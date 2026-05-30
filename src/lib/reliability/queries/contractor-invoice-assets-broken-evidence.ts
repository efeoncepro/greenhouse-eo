import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-791 Slice 3 — Contractor invoice asset broken-evidence signal.
 *
 * Detecta filas en `greenhouse_hr.contractor_invoice_assets` cuyo `asset_id`
 * apunta a un asset inexistente o eliminado en `greenhouse_core.assets`. La
 * tabla es append-only y los assets adjuntos (status='attached') no se pueden
 * borrar por el path normal (`deletePendingAsset` exige status='pending'), por
 * lo que el steady state esperado es 0; cualquier valor > 0 indica integridad
 * de evidencia rota (data quality) que requiere atención.
 *
 * **Kind**: `data_quality`. **Subsystem rollup**: `Identity & Access`
 * (moduleKey=identity, donde viven los signals de lifecycle de contractor/HR).
 * **Severity**: count=0 → ok; count>0 → error; query falla → unknown.
 *
 * Pattern fuente: mirror de TASK-721 reconciliationSnapshotsWithBrokenEvidence
 * (src/lib/finance/ledger-health.ts).
 */
export const CONTRACTOR_INVOICE_ASSETS_BROKEN_EVIDENCE_SIGNAL_ID =
  'hr.contractor_invoice_assets.broken_evidence'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_invoice_assets cia
  WHERE NOT EXISTS (
    SELECT 1
    FROM greenhouse_core.assets a
    WHERE a.asset_id = cia.asset_id
      AND a.status <> 'deleted'
  )
`

type BrokenEvidenceRow = {
  n: number
}

export const getContractorInvoiceAssetsBrokenEvidenceSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<BrokenEvidenceRow>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'error' = count === 0 ? 'ok' : 'error'

      const summary =
        count === 0
          ? 'Sin contractor invoice assets con evidencia rota.'
          : `${count} contractor invoice asset${count === 1 ? '' : 's'} apunta${count === 1 ? '' : 'n'} a un asset inexistente o eliminado.`

      return {
        signalId: CONTRACTOR_INVOICE_ASSETS_BROKEN_EVIDENCE_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorInvoiceAssetsBrokenEvidenceSignal',
        label: 'Contractor invoice assets con evidencia rota',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              'greenhouse_hr.contractor_invoice_assets WHERE NOT EXISTS (asset no eliminado en greenhouse_core.assets)'
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value:
              'docs/tasks/in-progress/TASK-791-contractor-invoice-assets-uploader-contexts.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'reliability_signal_contractor_invoice_assets_broken_evidence' }
      })

      return {
        signalId: CONTRACTOR_INVOICE_ASSETS_BROKEN_EVIDENCE_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorInvoiceAssetsBrokenEvidenceSignal',
        label: 'Contractor invoice assets con evidencia rota',
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
