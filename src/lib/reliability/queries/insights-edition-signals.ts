import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1845 — señales de Efeonce Insights (steady = 0 en ambas).
 *
 * - `insights.editions.failed_recent` (data_quality): ediciones en `failed` con transición en
 *   los últimos 7 días. Cada una tiene fase y código en su historial; un valor > 0 es una
 *   decisión humana pendiente (recuperar o encargar de nuevo), no ruido.
 * - `insights.editions.stuck_generation` (lag): ediciones en collecting/composing/validating
 *   sin transición hace más de 30 minutos — la generación corre por fases síncronas hoy y no
 *   debería vivir ahí; cuando TASK-1846 la mueva al worker, el umbral pasa a ser del job.
 */

export const INSIGHTS_EDITIONS_FAILED_SIGNAL_ID = 'insights.editions.failed_recent'
export const INSIGHTS_EDITIONS_STUCK_SIGNAL_ID = 'insights.editions.stuck_generation'

const FAILED_SQL = `
  SELECT count(*)::int AS n
    FROM greenhouse_insights.insight_editions
   WHERE state = 'failed'
     AND updated_at >= now() - INTERVAL '7 days'
`

const STUCK_SQL = `
  SELECT count(*)::int AS n
    FROM greenhouse_insights.insight_editions
   WHERE state IN ('collecting', 'composing', 'validating')
     AND updated_at < now() - INTERVAL '30 minutes'
`

const severityFor = (count: number, errorAt: number): ReliabilitySignal['severity'] => (count === 0 ? 'ok' : count >= errorAt ? 'error' : 'warning')

export const getInsightsEditionSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const [failedRows, stuckRows] = await Promise.all([query<{ n: number }>(FAILED_SQL), query<{ n: number }>(STUCK_SQL)])
    const failed = Number(failedRows[0]?.n ?? 0)
    const stuck = Number(stuckRows[0]?.n ?? 0)

    return [
      {
        signalId: INSIGHTS_EDITIONS_FAILED_SIGNAL_ID,
        moduleKey: 'insights',
        kind: 'data_quality',
        source: 'getInsightsEditionSignals',
        label: 'Ediciones Insights fallidas (7 días)',
        severity: severityFor(failed, 5),
        summary: failed === 0 ? 'Ninguna edición falló en los últimos 7 días.' : `${failed} edición(es) en failed en los últimos 7 días: revisar fase/código en el historial y recuperar o encargar de nuevo.`,
        observedAt,
        evidence: [{ kind: 'sql', label: 'Query', value: FAILED_SQL.trim() }, { kind: 'metric', label: 'failed_recent', value: String(failed) }]
      },
      {
        signalId: INSIGHTS_EDITIONS_STUCK_SIGNAL_ID,
        moduleKey: 'insights',
        kind: 'lag',
        source: 'getInsightsEditionSignals',
        label: 'Ediciones Insights atascadas en generación',
        severity: severityFor(stuck, 3),
        summary: stuck === 0 ? 'Ninguna edición lleva más de 30 minutos en una fase de generación.' : `${stuck} edición(es) llevan más de 30 minutos en collecting/composing/validating: la fase no cerró (proceso caído o timeout); recuperar desde la fase.`,
        observedAt,
        evidence: [{ kind: 'sql', label: 'Query', value: STUCK_SQL.trim() }, { kind: 'metric', label: 'stuck_generation', value: String(stuck) }]
      }
    ]
  } catch (error) {
    captureWithDomain(error, 'insights', { extra: { operation: 'getInsightsEditionSignals' } })

    return [
      {
        signalId: INSIGHTS_EDITIONS_FAILED_SIGNAL_ID,
        moduleKey: 'insights',
        kind: 'data_quality',
        source: 'getInsightsEditionSignals',
        label: 'Ediciones Insights fallidas (7 días)',
        severity: 'unknown',
        summary: 'No se pudo consultar greenhouse_insights.insight_editions.',
        observedAt,
        evidence: []
      }
    ]
  }
}
