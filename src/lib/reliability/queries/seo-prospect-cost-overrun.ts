import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1709 — Sobrecosto en diagnósticos de prospecto (`growth.seo.prospect_diagnostic.cost_overrun`).
 *
 * Steady = 0. Un diagnóstico cuyo costo REAL (`provider_cost_usd`, ventana 7 días)
 * superó su tope declarado (`cost_ceiling_usd`) significa que el forecast del conjunto
 * subestimó — el tope se valida ANTES de la primera llamada, así que un overrun es un
 * defecto del estimador o del proveedor, nunca un estado normal. Cualquier > 0 pide
 * revisar el preview vs el `cost` real del ledger antes de la próxima corrida.
 */
export const SEO_PROSPECT_COST_OVERRUN_SIGNAL_ID = 'growth.seo.prospect_diagnostic.cost_overrun'

const QUERY_SQL = `
  SELECT
    diagnostic_id,
    root_domain,
    cost_ceiling_usd::float8 AS ceiling_usd,
    provider_cost_usd::float8 AS actual_usd
  FROM greenhouse_growth.seo_prospect_diagnostics
  WHERE status = 'completed'
    AND provider_cost_usd IS NOT NULL
    AND provider_cost_usd > cost_ceiling_usd
    AND created_at >= NOW() - INTERVAL '7 days'
`

type OverrunRow = {
  diagnostic_id: string
  root_domain: string
  ceiling_usd: number
  actual_usd: number
}

export const getSeoProspectCostOverrunSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<OverrunRow>(QUERY_SQL)

    const severity: 'ok' | 'warning' | 'error' = rows.length === 0 ? 'ok' : rows.length > 3 ? 'error' : 'warning'

    const summary =
      rows.length === 0
        ? 'Ningún diagnóstico de prospecto superó su tope de costo (7 días).'
        : `${rows.length} diagnóstico(s) de prospecto superaron su tope de costo en 7 días — revisar el forecast vs el cost real del proveedor antes de la próxima corrida.`

    return {
      signalId: SEO_PROSPECT_COST_OVERRUN_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoProspectCostOverrunSignal',
      label: 'Sobrecosto en diagnósticos de prospecto',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'overruns_7d', value: String(rows.length) },
        ...rows.slice(0, 5).map(row => ({
          kind: 'metric' as const,
          label: row.root_domain,
          value: `USD ${row.actual_usd} > tope ${row.ceiling_usd} (${row.diagnostic_id})`
        }))
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_prospect_cost_overrun' }
    })

    return {
      signalId: SEO_PROSPECT_COST_OVERRUN_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getSeoProspectCostOverrunSignal',
      severity: 'unknown',
      label: 'Sobrecosto en diagnósticos de prospecto',
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
