import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1762 Slice 3 — salud del cierre de vacantes por capacidad.
 *
 * Dos señales, y la distinción entre ellas es la que hace útil el par:
 *
 * - **`closure_stuck`** — un run quedó `pending`/`running` sin avanzar. El reconciler no está
 *   corriendo, o se cae siempre en el mismo item. Es un problema de PROCESO: nadie recibió una
 *   decisión que ya fue aprobada, y el operador cree que el cierre ocurrió.
 * - **`closure_partial_failed`** — el run terminó, pero dejó items en cuarentena. Es un problema
 *   de DATOS: personas concretas que quedaron sin desenlace después de un cierre confirmado, y
 *   nadie va a volver a mirarlas si esto no alarma.
 *
 * Un run parcial **no puede quedar invisible**: es el riesgo que la matriz de la task nombra
 * explícitamente. Alguien aprobó cerrar a N personas y sólo se cerraron N−k; las k restantes
 * siguen apareciendo en proceso activo para el resto del sistema.
 *
 * PII-free: sólo conteos e ids de run. Steady = 0 en ambas.
 */

export const HIRING_CAPACITY_CLOSURE_STUCK_SIGNAL_ID = 'hiring.opening.capacity_closure_stuck'
export const HIRING_CAPACITY_CLOSURE_PARTIAL_FAILED_SIGNAL_ID =
  'hiring.opening.capacity_closure_partial_failed'

/** Un run que lleva más de esto sin cerrar no está lento: está atascado. */
const STUCK_THRESHOLD_MINUTES = 30

const DOC_EVIDENCE = {
  kind: 'doc' as const,
  label: 'ADR',
  value: 'docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md'
}

const failedSignal = (signalId: string, label: string, source: string): ReliabilitySignal => ({
  signalId,
  moduleKey: 'hiring',
  kind: 'data_quality',
  source,
  label,
  severity: 'unknown',
  observedAt: null,
  summary: 'No se pudo evaluar el estado de los cierres por capacidad.',
  evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }]
})

const STUCK_LABEL = 'Cierre por capacidad atascado'

export const getHiringCapacityClosureStuckSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ stuck: string; oldest_minutes: string | null }>(
      `SELECT count(*) AS stuck,
              max(EXTRACT(EPOCH FROM (now() - created_at)) / 60)::int AS oldest_minutes
         FROM greenhouse_hiring.hiring_opening_closure_run
        WHERE state IN ('pending', 'running')
          AND created_at < now() - ($1 || ' minutes')::interval`,
      [String(STUCK_THRESHOLD_MINUTES)]
    )

    const stuck = Number(rows[0]?.stuck ?? 0)
    const oldest = Number(rows[0]?.oldest_minutes ?? 0)

    return {
      signalId: HIRING_CAPACITY_CLOSURE_STUCK_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringCapacityClosureStuckSignal',
      label: STUCK_LABEL,
      severity: stuck > 0 ? 'error' : 'ok',
      observedAt: new Date().toISOString(),
      summary:
        stuck > 0
          ? `${stuck} cierre(s) por capacidad llevan más de ${STUCK_THRESHOLD_MINUTES} min sin terminar (el más antiguo, ${oldest} min). Hay personas cuyo desenlace fue aprobado y todavía no se registró, mientras el operador cree que el cierre ya ocurrió.`
          : 'Sin cierres por capacidad atascados.',
      evidence: [
        { kind: 'metric', label: 'stuck_runs', value: String(stuck) },
        { kind: 'metric', label: 'oldest_minutes', value: String(oldest) },
        { kind: 'metric', label: 'threshold_minutes', value: String(STUCK_THRESHOLD_MINUTES) },
        DOC_EVIDENCE
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_capacity_closure_stuck' } })

    return failedSignal(HIRING_CAPACITY_CLOSURE_STUCK_SIGNAL_ID, STUCK_LABEL, 'getHiringCapacityClosureStuckSignal')
  }
}

const PARTIAL_LABEL = 'Cierre por capacidad con items en cuarentena'

export const getHiringCapacityClosurePartialFailedSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ runs: string; items: string }>(
      `SELECT count(DISTINCT i.run_id) AS runs, count(*) AS items
         FROM greenhouse_hiring.hiring_opening_closure_run_item i
        WHERE i.state = 'quarantined'`
    )

    const runs = Number(rows[0]?.runs ?? 0)
    const items = Number(rows[0]?.items ?? 0)

    return {
      signalId: HIRING_CAPACITY_CLOSURE_PARTIAL_FAILED_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringCapacityClosurePartialFailedSignal',
      label: PARTIAL_LABEL,
      severity: items > 0 ? 'error' : 'ok',
      observedAt: new Date().toISOString(),
      summary:
        items > 0
          ? `${items} candidatura(s) en ${runs} cierre(s) agotaron sus reintentos y quedaron sin desenlace. Alguien aprobó cerrarlas y no se cerraron: siguen contando como proceso activo para el resto del sistema.`
          : 'Sin candidaturas en cuarentena por cierres de capacidad.',
      evidence: [
        { kind: 'metric', label: 'quarantined_items', value: String(items) },
        { kind: 'metric', label: 'affected_runs', value: String(runs) },
        DOC_EVIDENCE
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_capacity_closure_partial' } })

    return failedSignal(
      HIRING_CAPACITY_CLOSURE_PARTIAL_FAILED_SIGNAL_ID,
      PARTIAL_LABEL,
      'getHiringCapacityClosurePartialFailedSignal'
    )
  }
}
