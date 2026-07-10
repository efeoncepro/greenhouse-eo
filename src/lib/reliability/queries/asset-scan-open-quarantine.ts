import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1362 — Assets bloqueados por el escaneo y aún sin triage humano.
 *
 * Cuenta `asset_scan_results` con `resolution_status='open'` y veredicto
 * bloqueante. Cada fila es un upload que NO quedó adjunto: suplantación de tipo
 * (`suspicious`), firma de malware (`infected`) o scanner caído (`error`).
 *
 * Steady state = 0. `error` sostenido significa que el scanner de firmas está
 * degradado y estamos rechazando documentos legítimos: es más urgente que un
 * `suspicious` aislado, que suele ser un bot probando el endpoint público.
 */
export const ASSET_SCAN_OPEN_QUARANTINE_SIGNAL_ID = 'storage.asset_scan.open_quarantine'

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE verdict = 'infected')::int AS infected,
    COUNT(*) FILTER (WHERE verdict = 'error')::int AS scanner_error
  FROM greenhouse_core.asset_scan_results
  WHERE resolution_status = 'open'
    AND verdict IN ('suspicious', 'infected', 'error')
`

const resolveSeverity = ({ total, infected, scannerError }: { total: number; infected: number; scannerError: number }) => {
  if (infected > 0 || scannerError > 0) return 'error' as const
  if (total > 0) return 'warning' as const

  return 'ok' as const
}

const resolveSummary = ({ total, infected, scannerError }: { total: number; infected: number; scannerError: number }) => {
  if (total === 0) return 'Sin assets en cuarentena pendientes de triage.'

  const parts: string[] = []

  if (infected > 0) parts.push(`${infected} con firma de malware`)
  if (scannerError > 0) parts.push(`${scannerError} bloqueados por fallas del scanner`)

  const noun = total === 1 ? 'asset en cuarentena' : 'assets en cuarentena'
  const detail = parts.length > 0 ? ` (${parts.join('; ')})` : ''

  return `${total} ${noun} sin resolver${detail}.`
}

export const getAssetScanOpenQuarantineSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Assets en cuarentena sin triage'

  try {
    const rows = await query<{ total: number; infected: number; scanner_error: number; [column: string]: unknown }>(QUERY_SQL)

    const total = rows[0]?.total ?? 0
    const infected = rows[0]?.infected ?? 0
    const scannerError = rows[0]?.scanner_error ?? 0

    return {
      signalId: ASSET_SCAN_OPEN_QUARANTINE_SIGNAL_ID,
      moduleKey: 'documents',
      kind: 'data_quality',
      source: 'getAssetScanOpenQuarantineSignal',
      label,
      severity: resolveSeverity({ total, infected, scannerError }),
      summary: resolveSummary({ total, infected, scannerError }),
      observedAt: new Date().toISOString(),
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `greenhouse_core.asset_scan_results WHERE resolution_status='open' AND verdict IN ('suspicious','infected','error')`,
        },
        { kind: 'metric', label: 'total', value: String(total) },
        { kind: 'metric', label: 'infected', value: String(infected) },
        { kind: 'metric', label: 'scanner_error', value: String(scannerError) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1362-candidate-document-capture.md' },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_asset_scan_open_quarantine' } })

    return {
      signalId: ASSET_SCAN_OPEN_QUARANTINE_SIGNAL_ID,
      moduleKey: 'documents',
      kind: 'data_quality',
      source: 'getAssetScanOpenQuarantineSignal',
      label,
      severity: 'unknown',
      summary: 'No se pudo evaluar la cuarentena de assets (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
