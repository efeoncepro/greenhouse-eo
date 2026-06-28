import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1282 — Search Console token health detector.
 *
 * Cuenta las conexiones Search Console en estado `revoked`/`expired`. El reader
 * (`readSearchConsoleAnalytics`) marca `revoked` cuando Google responde
 * `invalid_grant`/403 (honest degradation). Cualquier conexión no-sana significa que
 * una org dejó de alimentar señales SEO/AEO y necesita reconexión del cliente.
 *
 * Subsystem rollup: `Growth` (module=growth).
 *
 * **Severity matrix canonical** (steady = 0 conexiones no-sanas):
 *   - 0 no-sanas → `ok`
 *   - >= 1 no-sanas → `warning` (reconectar la propiedad del cliente)
 */
export const GROWTH_SEARCH_CONSOLE_TOKEN_UNHEALTHY_SIGNAL_ID =
  'growth.search_console.token_unhealthy'

const QUERY_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE status IN ('revoked', 'expired'))::int AS unhealthy,
    COUNT(*) FILTER (WHERE status = 'active')::int AS active,
    COUNT(*)::int AS total
  FROM greenhouse_growth.search_console_connections
`

type TokenHealthRow = {
  unhealthy: number
  active: number
  total: number
}

export const getGrowthSearchConsoleTokenHealthSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<TokenHealthRow>(QUERY_SQL)
    const row = rows[0]

    const unhealthy = Number(row?.unhealthy ?? 0)
    const active = Number(row?.active ?? 0)
    const total = Number(row?.total ?? 0)

    const severity: 'ok' | 'warning' | 'error' | 'unknown' = unhealthy > 0 ? 'warning' : 'ok'

    const summary =
      unhealthy > 0
        ? `${unhealthy} conexión(es) Search Console revocada(s)/expirada(s). El cliente debe reconectar su propiedad para reanudar las señales SEO/AEO.`
        : `Conexiones Search Console sanas (${active} activa(s), ${total} total).`

    return {
      signalId: GROWTH_SEARCH_CONSOLE_TOKEN_UNHEALTHY_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getGrowthSearchConsoleTokenHealthSignal',
      label: 'Salud del token Search Console',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'greenhouse_growth.search_console_connections — conteo por status'
        },
        { kind: 'metric', label: 'unhealthy', value: String(unhealthy) },
        { kind: 'metric', label: 'active', value: String(active) },
        { kind: 'metric', label: 'total', value: String(total) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_search_console_token_health' }
    })

    return {
      signalId: GROWTH_SEARCH_CONSOLE_TOKEN_UNHEALTHY_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getGrowthSearchConsoleTokenHealthSignal',
      label: 'Salud del token Search Console',
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
