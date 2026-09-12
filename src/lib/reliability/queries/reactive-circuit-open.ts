import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * ISSUE-172 — Señal de circuito abierto en el consumer reactivo.
 *
 * El breaker por projection (`greenhouse_sync.projection_circuit_state`) es la capa que protege al
 * ops-worker de martillar una projection rota — y mientras está `open`, esa projection NO procesa
 * nada: los eventos quedan sin fila en `outbox_reactive_log` a propósito, para re-tomarlos tras el
 * enfriamiento. Eso los vuelve invisibles para todas las señales de dead-letter. El 2026-09-12 el
 * intake público de postulaciones (`growth_hiring_application_from_submission`) estuvo con el
 * circuito abierto por una colisión de `public_id`, con 25 personas reales sin proyectar, y ninguna
 * señal lo mostró: se vio en los logs de Cloud Run. Esta señal lo hace visible desde el dominio.
 *
 * **Kind**: `incident`. **moduleKey**: `sync`. Steady state = 0 circuitos fuera de `closed`.
 * `error` con al menos un breaker `open`/`half_open`; `warning` si sólo hay handlers `degraded`
 * o `quarantined` en `handler_health` (todavía procesan, pero con fallos consecutivos).
 */
export const REACTIVE_CIRCUIT_OPEN_SIGNAL_ID = 'sync.reactive.circuit_open'

const CIRCUITS_SQL = `
  SELECT projection_name, state, consecutive_failures, opened_at::text AS opened_at, last_error
  FROM greenhouse_sync.projection_circuit_state
  WHERE state <> 'closed'
  ORDER BY opened_at ASC NULLS LAST
`

const HANDLERS_SQL = `
  SELECT handler, current_state, consecutive_failures
  FROM greenhouse_sync.handler_health
  WHERE current_state IN ('degraded', 'quarantined')
  ORDER BY consecutive_failures DESC
`

type CircuitRow = {
  projection_name: string
  state: string
  consecutive_failures: number
  opened_at: string | null
  last_error: string | null
}

type HandlerRow = {
  handler: string
  current_state: string
  consecutive_failures: number
}

const LABEL = 'Consumer reactivo — circuitos abiertos'

export const getReactiveCircuitOpenSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const [circuits, handlers] = await Promise.all([
      query<CircuitRow>(CIRCUITS_SQL),
      query<HandlerRow>(HANDLERS_SQL)
    ])

    const severity: ReliabilitySeverity = circuits.length > 0 ? 'error' : handlers.length > 0 ? 'warning' : 'ok'

    const summary =
      circuits.length > 0
        ? `${circuits.length} projection${circuits.length === 1 ? '' : 's'} con el circuito fuera de closed: ${circuits
            .map(row => `${row.projection_name} (${row.state})`)
            .join(', ')}. Mientras siga abierto, esa projection no procesa eventos.`
        : handlers.length > 0
          ? `${handlers.length} handler${handlers.length === 1 ? '' : 's'} degradado${handlers.length === 1 ? '' : 's'} con fallos consecutivos; todavía procesan.`
          : 'Todos los circuitos del consumer reactivo están cerrados.'

    return {
      signalId: REACTIVE_CIRCUIT_OPEN_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'incident',
      source: 'getReactiveCircuitOpenSignal',
      label: LABEL,
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "greenhouse_sync.projection_circuit_state WHERE state <> 'closed'"
        },
        {
          kind: 'metric',
          label: 'circuits_open',
          value: String(circuits.length)
        },
        {
          kind: 'metric',
          label: 'handlers_degraded',
          value: String(handlers.length)
        },
        ...circuits.map(row => ({
          kind: 'metric' as const,
          label: row.projection_name,
          value: `${row.state} · ${row.consecutive_failures} fallos consecutivos · abierto ${row.opened_at ?? '—'} · ${(row.last_error ?? '').slice(0, 160)}`
        }))
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'sync', {
      tags: { source: 'reliability_signal_reactive_circuit_open' }
    })

    return {
      signalId: REACTIVE_CIRCUIT_OPEN_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'incident',
      source: 'getReactiveCircuitOpenSignal',
      label: LABEL,
      severity: 'unknown',
      summary: 'No fue posible leer el estado de los circuitos. Revisa los logs.',
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
