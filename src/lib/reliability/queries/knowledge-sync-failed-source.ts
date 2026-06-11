import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1082 — Knowledge sources cuya última sincronización falló.
 *
 * Cuenta sources cuyo run `run_kind='sync'` más reciente quedó en `status='failed'`
 * (rate-limit/latencia de la fuente, error de normalización, etc.). El corpus de
 * esa fuente queda stale hasta una sync exitosa.
 *
 * Steady state = 0. Cualquier valor > 0 requiere re-correr la ingesta del source.
 */
export const KNOWLEDGE_SYNC_FAILED_SOURCE_SIGNAL_ID = 'knowledge.sync.failed_source'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM (
    SELECT DISTINCT ON (source_id) source_id, status
    FROM greenhouse_knowledge.knowledge_publication_runs
    WHERE run_kind = 'sync' AND source_id IS NOT NULL
    ORDER BY source_id, started_at DESC
  ) latest
  WHERE latest.status = 'failed'
`

const resolveSummary = (count: number): string => {
  if (count === 0) {
    return 'Todas las fuentes de conocimiento sincronizaron correctamente.'
  }

  const noun = count === 1 ? 'fuente de conocimiento' : 'fuentes de conocimiento'

  return `${count} ${noun} con su última sincronización en estado fallido.`
}

export const getKnowledgeSyncFailedSourceSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await query<{ n: number; [column: string]: unknown }>(QUERY_SQL)
    const count = rows[0]?.n ?? 0

    return {
      signalId: KNOWLEDGE_SYNC_FAILED_SOURCE_SIGNAL_ID,
      moduleKey: 'knowledge',
      kind: 'freshness',
      source: 'getKnowledgeSyncFailedSourceSignal',
      label: 'Fuentes de conocimiento con sync fallido',
      severity: count === 0 ? 'ok' : 'error',
      summary: resolveSummary(count),
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'sql', label: 'Query', value: `latest sync run per source WHERE status='failed'` },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1082-notion-knowledge-ingestion-mvp.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'knowledge', {
      tags: { source: 'reliability_knowledge_sync_failed_source' }
    })

    return {
      signalId: KNOWLEDGE_SYNC_FAILED_SOURCE_SIGNAL_ID,
      moduleKey: 'knowledge',
      kind: 'freshness',
      source: 'getKnowledgeSyncFailedSourceSignal',
      label: 'Fuentes de conocimiento con sync fallido',
      severity: 'unknown',
      summary: 'No se pudo evaluar el estado de sync de conocimiento (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }]
    }
  }
}
