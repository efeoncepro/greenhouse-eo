import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1696 — Rendimiento de la matriz de observaciones del grader
 * (`growth.ai_visibility.observation_yield`).
 *
 * Más de un tercio de la matriz no produce evidencia y hasta hoy no se veía en ningún tablero.
 * Medido el 2026-08-15 excluyendo el tráfico de prueba: **239 de 665 observaciones terminan
 * `skipped` o `failed` (35,9%)**, y `google_ai_overview` está en **78,5%**.
 *
 * 🔴 EL CORTE POR PROVEEDOR NO ES UN LUJO: el número global esconde el problema. Un 68% de
 * rendimiento agregado se lee como "aceptable" mientras un proveedor concreto está en 29% — que es
 * justamente el que esta task acaba de instrumentar económicamente. Una señal que sólo publicara
 * el promedio serviría para tranquilizar, no para operar.
 *
 * ⚠️ LÍMITE DECLARADO: mide sobre las observaciones que EXISTEN, así que no ve los pares
 * (prompt, proveedor) que nunca se intentaron. Detectarlos exigiría comparar contra la matriz
 * esperada del run — más caro y con su propia fuente de verdad. Un rendimiento de 100% acá
 * significa "todo lo que se intentó salió bien", nunca "se intentó todo".
 *
 * El baseline de 2026-08-15 es el punto de partida honesto, NO la meta: los umbrales existen para
 * detectar que algo empeoró, no para bendecir el estado actual.
 */
export const GROWTH_AI_VISIBILITY_OBSERVATION_YIELD_SIGNAL_ID =
  'growth.ai_visibility.observation_yield'

/** Ventana móvil: suficiente para tener volumen sin arrastrar el histórico entero. */
const WINDOW_DAYS = 30

/** Bajo este rendimiento, un proveedor se reporta como degradado. */
const WARNING_YIELD = 0.6

/** Bajo esto, el proveedor prácticamente no está produciendo evidencia. */
const ERROR_YIELD = 0.35

const QUERY_SQL = `
  SELECT provider,
         COUNT(*)::int                                        AS total,
         COUNT(*) FILTER (WHERE status = 'succeeded')::int     AS succeeded
    FROM greenhouse_growth.provider_observations
   WHERE created_at >= NOW() - INTERVAL '${WINDOW_DAYS} days'
     -- El tráfico de prueba (adapters fake, costo cero) diluía el número real: la medición
     -- original reportaba 32% de fallo cuando el valor sin fakes era 35,9%.
     AND model NOT LIKE 'fake-%'
   GROUP BY provider
   ORDER BY provider
`

type YieldRow = { provider: string; total: number; succeeded: number }

export const getGrowthAiVisibilityObservationYieldSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<YieldRow>(QUERY_SQL)

    const withYield = rows.map(row => ({
      ...row,
      yield: row.total > 0 ? row.succeeded / row.total : null
    }))

    // Un proveedor sin observaciones en la ventana NO se cuenta como 0%: no produjo evidencia
    // porque no corrió, y confundir "no se intentó" con "salió mal" es el tipo de falso positivo
    // que hace que la gente deje de mirar el tablero.
    const measured = withYield.filter(row => row.yield !== null)
    const degraded = measured.filter(row => (row.yield ?? 1) < WARNING_YIELD)
    const critical = measured.filter(row => (row.yield ?? 1) < ERROR_YIELD)

    const totals = measured.reduce(
      (acc, row) => ({ total: acc.total + row.total, succeeded: acc.succeeded + row.succeeded }),
      { total: 0, succeeded: 0 }
    )

    const globalYield = totals.total > 0 ? totals.succeeded / totals.total : null

    const severity: 'ok' | 'warning' | 'error' | 'unknown' =
      measured.length === 0 ? 'unknown' : critical.length > 0 ? 'error' : degraded.length > 0 ? 'warning' : 'ok'

    const pct = (value: number | null): string =>
      value === null ? 'sin datos' : `${Math.round(value * 100)}%`

    const summary =
      measured.length === 0
        ? `Sin observaciones productivas en ${WINDOW_DAYS} días: no hay rendimiento que medir (no es 0%).`
        : critical.length > 0
          ? `${critical.map(row => `${row.provider} ${pct(row.yield)}`).join(', ')} — prácticamente sin producir evidencia en ${WINDOW_DAYS} días. El agregado (${pct(globalYield)}) lo esconde.`
          : degraded.length > 0
            ? `${degraded.map(row => `${row.provider} ${pct(row.yield)}`).join(', ')} por debajo del ${Math.round(WARNING_YIELD * 100)}% en ${WINDOW_DAYS} días; agregado ${pct(globalYield)}.`
            : `Todos los proveedores sobre el ${Math.round(WARNING_YIELD * 100)}% de rendimiento en ${WINDOW_DAYS} días (agregado ${pct(globalYield)}).`

    return {
      signalId: GROWTH_AI_VISIBILITY_OBSERVATION_YIELD_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getGrowthAiVisibilityObservationYieldSignal',
      label: 'Rendimiento de observaciones del grader por proveedor',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'rendimiento_agregado', value: pct(globalYield) },
        ...withYield.map(row => ({
          kind: 'metric' as const,
          label: row.provider,
          value: `${pct(row.yield)} (${row.succeeded}/${row.total})`
        }))
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_growth_ai_visibility_observation_yield' }
    })

    return {
      signalId: GROWTH_AI_VISIBILITY_OBSERVATION_YIELD_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'data_quality',
      source: 'getGrowthAiVisibilityObservationYieldSignal',
      severity: 'unknown',
      label: 'Rendimiento de observaciones del grader por proveedor',
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
