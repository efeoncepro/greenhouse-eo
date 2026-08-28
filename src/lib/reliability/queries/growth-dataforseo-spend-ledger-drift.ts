import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1696 — Observaciones de AI Mode que compraron y no dejaron llamada contabilizada
 * (`growth.dataforseo.spend_ledger_drift`). Steady = 0.
 *
 * Es la señal que hace imposible que "no está en el ledger" signifique "no ocurrió". El grader
 * compró AI Mode fuera del ledger durante meses sin que nada lo dijera; esta señal cierra esa
 * puerta comparando, por período, las observaciones que SÍ le pagaron al proveedor contra las
 * llamadas registradas con `consumer='aeo'`.
 *
 * 🔴 DOS CAUSAS QUE NO SE TRATAN IGUAL, y ésa es toda la gracia:
 *   - **No atribuible** (`warning`): el perfil del grader NO tiene organización (prospecto público,
 *     caso legítimo). El ledger tiene FK a `organizations`, así que no hay fila posible — y
 *     forzar una organización sintética sería peor que el hueco. Es gasto real y visible, no un
 *     error.
 *   - **Atribuible** (`error`): el perfil SÍ tiene organización y aun así no hay llamada
 *     contabilizada. Eso ya no es una ausencia legítima: es un bug del camino de atribución, y
 *     significa que se le está gastando plata a un cliente sin cargarla a su presupuesto.
 *
 * ⚠️ LA COMPARACIÓN ES DE CONTEO DE LLAMADAS, NO DE DÓLARES, y no es una simplificación: el `cost`
 * que devuelve DataForSEO es del BATCH completo, no de la tarea (límite conocido del transporte).
 * El adapter de AI Mode manda UNA tarea por llamada, así que una observación equivale a una
 * llamada — pero contra dólares la comparación sería falsa apenas alguien mandara un batch.
 * NO "corrijas" esto a una comparación de montos sin resolver antes el reparto per-task.
 *
 * `skipped` queda fuera a propósito: una observación saltada no llegó a comprar, así que contarla
 * como drift acusaría un hueco donde no hubo gasto.
 */
export const GROWTH_DATAFORSEO_SPEND_LEDGER_DRIFT_SIGNAL_ID = 'growth.dataforseo.spend_ledger_drift'

const QUERY_SQL = `
  WITH month_observations AS (
    SELECT (p.organization_id IS NOT NULL) AS attributable
      FROM greenhouse_growth.provider_observations o
      JOIN greenhouse_growth.grader_runs r ON r.run_id = o.run_id
      LEFT JOIN greenhouse_growth.grader_profiles p ON p.profile_id = r.profile_id
     WHERE o.provider = 'google_ai_overview'
       AND o.status IN ('succeeded', 'failed', 'rate_limited')
       AND o.model NOT LIKE 'fake-%'
       AND o.created_at >= date_trunc('month', CURRENT_DATE)
  )
  SELECT
    COUNT(*) FILTER (WHERE attributable)::int     AS attributable_observations,
    COUNT(*) FILTER (WHERE NOT attributable)::int AS unattributable_observations,
    COALESCE((SELECT SUM(call_count)
                FROM greenhouse_growth.seo_provider_spend_daily
               WHERE consumer = 'aeo'
                 AND family = 'serp'
                 AND spend_date >= date_trunc('month', CURRENT_DATE)::date), 0)::int AS ledger_calls
  FROM month_observations
`

type DriftRow = {
  attributable_observations: number
  unattributable_observations: number
  ledger_calls: number
}

export const getGrowthDataForSeoSpendLedgerDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<DriftRow>(QUERY_SQL)

    const row = rows[0] ?? {
      attributable_observations: 0,
      unattributable_observations: 0,
      ledger_calls: 0
    }

    // El ledger puede tener MÁS llamadas que observaciones atribuibles (un reintento del
    // transporte, o una llamada que no llegó a producir observación). Eso no es drift de
    // atribución: `GREATEST(0, …)` evita reportar un déficit negativo como si fuera salud.
    const attributableDrift = Math.max(0, row.attributable_observations - row.ledger_calls)
    const unattributableDrift = row.unattributable_observations

    const severity: 'ok' | 'warning' | 'error' =
      attributableDrift > 0 ? 'error' : unattributableDrift > 0 ? 'warning' : 'ok'

    const summary =
      severity === 'error'
        ? `${attributableDrift} observación(es) de AI Mode sobre perfiles CON organización no dejaron llamada contabilizada este mes — es un bug del camino de atribución: se está gastando sin cargarlo al presupuesto del cliente.`
        : severity === 'warning'
          ? `${unattributableDrift} observación(es) de AI Mode del mes son de perfiles públicos sin organización: gasto real que el ledger no puede registrar (FK a organizations). Visible, no perdido.`
          : 'Todo el gasto de AI Mode del mes quedó contabilizado o declarado como no atribuible.'

    return {
      signalId: GROWTH_DATAFORSEO_SPEND_LEDGER_DRIFT_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getGrowthDataForSeoSpendLedgerDriftSignal',
      label: 'Gasto AI Mode sin contabilizar en el ledger',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'drift_atribuible', value: String(attributableDrift) },
        { kind: 'metric', label: 'drift_no_atribuible', value: String(unattributableDrift) },
        {
          kind: 'metric',
          label: 'observaciones_que_compraron',
          value: String(row.attributable_observations + row.unattributable_observations)
        },
        { kind: 'metric', label: 'llamadas_en_ledger', value: String(row.ledger_calls) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_growth_dataforseo_spend_ledger_drift' }
    })

    return {
      signalId: GROWTH_DATAFORSEO_SPEND_LEDGER_DRIFT_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getGrowthDataForSeoSpendLedgerDriftSignal',
      severity: 'unknown',
      label: 'Gasto AI Mode sin contabilizar en el ledger',
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
