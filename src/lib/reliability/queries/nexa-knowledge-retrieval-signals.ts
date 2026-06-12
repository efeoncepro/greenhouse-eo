import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1085 — Observabilidad del retrieval de Nexa sobre Knowledge.
 *
 * Lee las invocaciones del tool `search_knowledge` persistidas en
 * `greenhouse_ai.nexa_messages.tool_invocations` (jsonb) — el packet ya viaja ahí
 * en `result.raw.packet`, así que NO hay writes nuevos. Dos señales:
 *
 *  - `knowledge.nexa.no_source_answer_rate` (data_quality): cuántas búsquedas
 *    devolvieron `confidence='none'` (Nexa tuvo que responder gap honesto). Tasa alta
 *    sostenida = huecos de cobertura en el corpus. Coverage metric, no steady=0.
 *  - `knowledge.nexa.stale_source_retrievals` (drift): cuántas búsquedas se apoyaron
 *    en fuentes `stale`/`deprecated`. Responder desde docs vencidos es un problema real.
 *    Steady = 0.
 *
 * Con el flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=false` no hay invocaciones → total=0 →
 * ambas señales en `ok` (steady). Se vuelven medibles al activar el flag.
 */

export const NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID = 'knowledge.nexa.no_source_answer_rate'
export const NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID = 'knowledge.nexa.stale_source_retrievals'

// Un solo scan del jsonb: total + no-source + stale en una pasada.
const STATS_SQL = `
  WITH inv AS (
    SELECT
      (e->'result'->'raw'->'packet'->>'confidence') AS confidence,
      (e->'result'->'raw'->'packet'->>'freshness') AS freshness
    FROM greenhouse_ai.nexa_messages m
    CROSS JOIN LATERAL jsonb_array_elements(m.tool_invocations) AS e
    WHERE jsonb_typeof(m.tool_invocations) = 'array'
      AND m.created_at >= NOW() - INTERVAL '30 days'
      AND e->>'toolName' = 'search_knowledge'
  )
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE confidence = 'none')::int AS no_source,
    COUNT(*) FILTER (WHERE freshness IN ('stale', 'deprecated'))::int AS stale_source
  FROM inv
`

interface RetrievalStats {
  total: number
  noSource: number
  staleSource: number
}

const NO_SOURCE_RATE_WARN_THRESHOLD = 0.3
const MIN_VOLUME_FOR_RATE = 10

const buildNoSourceSignal = (stats: RetrievalStats): ReliabilitySignal => {
  const rate = stats.total > 0 ? stats.noSource / stats.total : 0
  const ratePct = Math.round(rate * 100)

  const severity =
    stats.total >= MIN_VOLUME_FOR_RATE && rate >= NO_SOURCE_RATE_WARN_THRESHOLD ? 'warning' : 'ok'

  return {
    signalId: NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID,
    moduleKey: 'knowledge',
    kind: 'data_quality',
    source: 'getNexaKnowledgeRetrievalSignals',
    label: 'Nexa: búsquedas sin fuente (cobertura de conocimiento)',
    severity,
    summary:
      stats.total === 0
        ? 'Sin búsquedas de conocimiento de Nexa en los últimos 30 días.'
        : `${stats.noSource}/${stats.total} búsquedas de Nexa (${ratePct}%) no encontraron documentación (gap honesto). Tasa alta sostenida = huecos de cobertura en el corpus.`,
    observedAt: new Date().toISOString(),
    evidence: [
      { kind: 'metric', label: 'total_30d', value: String(stats.total) },
      { kind: 'metric', label: 'no_source', value: String(stats.noSource) },
      { kind: 'metric', label: 'rate_pct', value: String(ratePct) },
      { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1085-nexa-knowledge-retrieval-citations.md' }
    ]
  }
}

const buildStaleSourceSignal = (stats: RetrievalStats): ReliabilitySignal => ({
  signalId: NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID,
  moduleKey: 'knowledge',
  kind: 'drift',
  source: 'getNexaKnowledgeRetrievalSignals',
  label: 'Nexa: respuestas apoyadas en fuentes desactualizadas',
  severity: stats.staleSource === 0 ? 'ok' : 'warning',
  summary:
    stats.staleSource === 0
      ? 'Ninguna búsqueda de Nexa se apoyó en fuentes stale/deprecated (30 días).'
      : `${stats.staleSource}/${stats.total} búsquedas de Nexa se apoyaron en fuentes stale/deprecated (30 días). Revisar/actualizar esos documentos.`,
  observedAt: new Date().toISOString(),
  evidence: [
    { kind: 'metric', label: 'total_30d', value: String(stats.total) },
    { kind: 'metric', label: 'stale_source', value: String(stats.staleSource) },
    { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1085-nexa-knowledge-retrieval-citations.md' }
  ]
})

const buildUnknownSignal = (signalId: string, label: string, kind: ReliabilitySignal['kind']): ReliabilitySignal => ({
  signalId,
  moduleKey: 'knowledge',
  kind,
  source: 'getNexaKnowledgeRetrievalSignals',
  label,
  severity: 'unknown',
  summary: 'No se pudo evaluar el retrieval de Nexa (query falló).',
  observedAt: null,
  evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }]
})

export const getNexaKnowledgeRetrievalSignals = async (): Promise<ReliabilitySignal[]> => {
  try {
    const rows = await query<{ total: number; no_source: number; stale_source: number; [column: string]: unknown }>(
      STATS_SQL
    )

    const stats: RetrievalStats = {
      total: rows[0]?.total ?? 0,
      noSource: rows[0]?.no_source ?? 0,
      staleSource: rows[0]?.stale_source ?? 0
    }

    return [buildNoSourceSignal(stats), buildStaleSourceSignal(stats)]
  } catch (error) {
    captureWithDomain(error, 'knowledge', {
      tags: { source: 'reliability_nexa_knowledge_retrieval' }
    })

    return [
      buildUnknownSignal(NEXA_KNOWLEDGE_NO_SOURCE_SIGNAL_ID, 'Nexa: búsquedas sin fuente (cobertura de conocimiento)', 'data_quality'),
      buildUnknownSignal(NEXA_KNOWLEDGE_STALE_SOURCE_SIGNAL_ID, 'Nexa: respuestas apoyadas en fuentes desactualizadas', 'drift')
    ]
  }
}
