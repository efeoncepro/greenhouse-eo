import 'server-only'

import { query } from '@/lib/db'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1846 Slice 3 — outputs de render huérfanos de Efeonce Insights.
 *
 * Detecta la clase de fallo que el motor NO podía ver antes de esta task: un output que quedó en
 * `running` y que nadie va a retomar.
 *
 * Dos poblaciones, con causas distintas:
 *
 *  1. `lease_expires_at IS NULL` — fila reclamada por un worker ANTERIOR al Slice 2, que no dejó
 *     lease. El reclamo por lease vencido las excluye a propósito: ese worker no presenta fence al
 *     finalizar, así que reclamarlas podría producir DOS finalizaciones. Quedan acá, visibles, para
 *     que una persona decida — no se auto-resuelven.
 *
 *  2. Lease vencido hace mucho — el reclamo existe, así que esto sólo se acumula si el worker no
 *     está corriendo (Job caído, flag OFF, Scheduler detenido). Es una señal de infraestructura,
 *     no de datos.
 *
 * **Steady state: 0.** Cualquier valor > 0 significa que alguien pidió un informe que nunca va a
 * llegar y que el sistema no se lo está diciendo.
 *
 * **Kind**: `data_quality`. **Severidad**: 0 → ok; 1-2 → warning; >2 → error (el motor no drena).
 *
 * **Remediación**: (1) verificar que el Job del artifact-worker corra y que
 * `INSIGHTS_RENDER_ENABLED` esté ON en la revisión ACTIVA de Cloud Run — no en el ledger, que es
 * memoria humana; (2) para la población sin lease, decidir explícitamente reintento o
 * `dead_letter`; nunca reclamar a ciegas.
 */
export const INSIGHTS_RENDER_ORPHANED_SIGNAL_ID = 'insights.render.orphaned_output'

/** Umbral: más de una hora sobre un lease vencido significa que nadie está drenando la cola. */
const STALE_LEASE_MINUTES = 60

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE lease_expires_at IS NULL)::int AS sin_lease,
    COUNT(*) FILTER (WHERE lease_expires_at IS NOT NULL)::int AS lease_vencido
  FROM greenhouse_insights.insight_outputs
  WHERE state = 'running'
    AND (
      lease_expires_at IS NULL
      OR lease_expires_at < now() - make_interval(mins => $1)
    )
`

const resolveSeverity = (count: number): ReliabilitySignal['severity'] => {
  if (count === 0) return 'ok'

  if (count <= 2) return 'warning'

  return 'error'
}

const resolveSummary = (total: number, sinLease: number, leaseVencido: number): string => {
  if (total === 0) {
    return 'Ningún output de Insights quedó huérfano: la cola de render drena.'
  }

  const partes: string[] = []

  if (leaseVencido > 0) {
    partes.push(
      `${leaseVencido} con lease vencido hace más de ${STALE_LEASE_MINUTES} min (nadie está drenando: revisar el Job y el flag en la revisión activa)`
    )
  }

  if (sinLease > 0) {
    partes.push(
      `${sinLease} sin lease, reclamadas por un worker previo al fencing (no se auto-reclaman: requieren decisión humana)`
    )
  }

  const noun = total === 1 ? 'output de render' : 'outputs de render'

  return `${total} ${noun} en running que nadie va a retomar — ${partes.join('; ')}.`
}

export const getInsightsRenderOrphanedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  const rows = await query<{ total: number; sin_lease: number; lease_vencido: number }>(QUERY_SQL, [
    STALE_LEASE_MINUTES
  ])

  const total = Number(rows[0]?.total ?? 0)
  const sinLease = Number(rows[0]?.sin_lease ?? 0)
  const leaseVencido = Number(rows[0]?.lease_vencido ?? 0)

  return {
    signalId: INSIGHTS_RENDER_ORPHANED_SIGNAL_ID,
    moduleKey: 'insights',
    kind: 'data_quality',
    source: 'getInsightsRenderOrphanedSignal',
    label: 'Outputs de render huérfanos',
    severity: resolveSeverity(total),
    summary: resolveSummary(total, sinLease, leaseVencido),
    observedAt,
    evidence: [
      {
        kind: 'metric',
        label: 'total',
        value: String(total)
      },
      {
        kind: 'metric',
        label: 'sin lease (pre-fencing)',
        value: String(sinLease)
      },
      {
        kind: 'metric',
        label: `lease vencido > ${STALE_LEASE_MINUTES} min`,
        value: String(leaseVencido)
      }
    ]
  }
}
