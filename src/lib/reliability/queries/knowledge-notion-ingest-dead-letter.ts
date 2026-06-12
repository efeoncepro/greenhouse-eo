import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { buildReactiveHandlerKey } from '@/lib/sync/reactive-handler-key'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1094 — Reliability signal: re-ingests de knowledge Notion en dead-letter.
 *
 * Cuenta entries dead-letter en `outbox_reactive_log` para la projection
 * `knowledge_notion_ingest` (auto-ingest webhook-triggered). Si está en dead-letter,
 * la página que cambió en Notion NO se reflejó en el corpus → Nexa responde stale.
 * Causas típicas: token de knowledge no provisionado en el ops-worker, Notion API
 * caída, schema drift. PG-only (cheap) — la deriva por eventos PERDIDOS (at-most-once)
 * la cubre el reconcile on-demand, NO esta señal.
 *
 * Kind `dead_letter`. Steady state = 0. Severity `error` si count > 0.
 */
export const KNOWLEDGE_NOTION_INGEST_DEAD_LETTER_SIGNAL_ID = 'knowledge.notion.ingest_dead_letter'

const HANDLER = buildReactiveHandlerKey('knowledge_notion_ingest', 'knowledge.notion.page_change_signal')

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_reactive_log
  WHERE handler = $1
    AND result = 'dead-letter'
    AND acknowledged_at IS NULL
    AND recovered_at IS NULL
`

export const getKnowledgeNotionIngestDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL, [HANDLER])
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: KNOWLEDGE_NOTION_INGEST_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'knowledge',
      kind: 'dead_letter',
      source: 'getKnowledgeNotionIngestDeadLetterSignal',
      label: 'Auto-ingest de knowledge Notion en dead-letter',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin dead-letters en knowledge_notion_ingest. Auto-ingest webhook operativo.'
          : `${count} ${count === 1 ? 'página' : 'páginas'} de knowledge no convergieron (dead-letter). El corpus queda stale hasta resolver token/Notion/schema o correr el reconcile.`,
      observedAt,
      evidence: [
        { kind: 'sql', label: 'Query', value: `greenhouse_sync.outbox_reactive_log WHERE handler='${HANDLER}'` },
        { kind: 'metric', label: 'handler', value: HANDLER },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1094-notion-knowledge-webhook-auto-ingest.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'knowledge', {
      tags: { source: 'reliability_knowledge_notion_ingest_dead_letter' }
    })

    return {
      signalId: KNOWLEDGE_NOTION_INGEST_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'knowledge',
      kind: 'dead_letter',
      source: 'getKnowledgeNotionIngestDeadLetterSignal',
      label: 'Auto-ingest de knowledge Notion en dead-letter',
      severity: 'unknown',
      summary: 'No se pudo evaluar el dead-letter del auto-ingest de knowledge (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }]
    }
  }
}
