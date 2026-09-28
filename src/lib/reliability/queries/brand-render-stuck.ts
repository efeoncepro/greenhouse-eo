import 'server-only'

import { query } from '@/lib/db'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1921 — jobs de render de piezas de marca que nadie está drenando.
 *
 * Dos poblaciones, una causa: el motor no está corriendo para esta cola (Job caído, `BRAND_RENDER_ENABLED` OFF en la
 * revisión activa del ops-worker o del Job, Scheduler detenido).
 *
 *  1. `queued` hace más de 60 min — el despachador lanza una ejecución cada 2 min; una hora en cola es que nadie la
 *     lanzó (o que la cuota por organización quedó tomada por jobs que no terminan).
 *  2. `running` con lease vencido hace más de 60 min — el reclamo por lease vencido existe, así que esto sólo se
 *     acumula si el worker no vuelve a pasar.
 *
 * **Steady state: 0.** Un valor > 0 es una pieza pedida que nunca va a llegar sin que nadie lo diga.
 *
 * **Kind**: `data_quality`. **Severidad**: 0 → ok; 1-2 → warning; >2 → error.
 *
 * **Remediación**: verificar el flag en la revisión ACTIVA de Cloud Run (ops-worker y Job), no en el ledger; revisar
 * las ejecuciones del Job; para un job concreto, replay dirigido con `RENDER_JOB_ID`. Nunca editar la fila a mano.
 */
export const BRAND_RENDER_STUCK_SIGNAL_ID = 'brand.render.stuck_job'

const STALE_MINUTES = 60

const QUERY_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE state = 'queued' AND created_at < now() - make_interval(mins => $1))::int AS en_cola,
    COUNT(*) FILTER (
      WHERE state = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < now() - make_interval(mins => $1)
    )::int AS lease_vencido
  FROM greenhouse_brand.brand_render_jobs
  WHERE state IN ('queued', 'running')
    AND (deadline IS NULL OR deadline > now())
`

const resolveSeverity = (count: number): ReliabilitySignal['severity'] => {
  if (count === 0) return 'ok'

  if (count <= 2) return 'warning'

  return 'error'
}

export const resolveBrandRenderStuckSummary = (enCola: number, leaseVencido: number): string => {
  const total = enCola + leaseVencido

  if (total === 0) return 'Ninguna pieza de marca está atascada: la cola de render drena.'

  const partes: string[] = []

  if (enCola > 0) partes.push(`${enCola} en cola hace más de ${STALE_MINUTES} min`)
  if (leaseVencido > 0) partes.push(`${leaseVencido} en proceso con el reclamo vencido hace más de ${STALE_MINUTES} min`)

  const noun = total === 1 ? 'pieza de marca' : 'piezas de marca'

  return `${total} ${noun} sin avanzar (${partes.join('; ')}): revisar el Job y el flag en la revisión activa.`
}

export const getBrandRenderStuckSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()
  const rows = await query<{ en_cola: number; lease_vencido: number }>(QUERY_SQL, [STALE_MINUTES])
  const enCola = Number(rows[0]?.en_cola ?? 0)
  const leaseVencido = Number(rows[0]?.lease_vencido ?? 0)

  return {
    signalId: BRAND_RENDER_STUCK_SIGNAL_ID,
    moduleKey: 'brand_render',
    kind: 'data_quality',
    source: 'getBrandRenderStuckSignal',
    label: 'Piezas de marca atascadas',
    severity: resolveSeverity(enCola + leaseVencido),
    summary: resolveBrandRenderStuckSummary(enCola, leaseVencido),
    observedAt,
    evidence: [
      { kind: 'metric', label: `en cola > ${STALE_MINUTES} min`, value: String(enCola) },
      { kind: 'metric', label: `reclamo vencido > ${STALE_MINUTES} min`, value: String(leaseVencido) }
    ]
  }
}
