import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1082 — Knowledge documents en cuarentena.
 *
 * Cuenta `knowledge_documents` con `publication_status='quarantined'` — documentos
 * que el sanitizer de ingesta bloqueó (secretos/PII/prompt-injection) y que NO son
 * recuperables ni por humanos ni por agentes hasta remediar la fuente.
 *
 * Steady state = 0. Cualquier valor > 0 es esperado-pero-accionable: revisar la
 * fuente, limpiar el contenido y re-ingerir.
 */
export const KNOWLEDGE_QUARANTINE_COUNT_SIGNAL_ID = 'knowledge.publication.quarantine_count'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_knowledge.knowledge_documents
  WHERE publication_status = 'quarantined'
`

const resolveSummary = (count: number): string => {
  if (count === 0) {
    return 'Sin documentos de conocimiento en cuarentena.'
  }

  const noun = count === 1 ? 'documento de conocimiento' : 'documentos de conocimiento'

  return `${count} ${noun} en cuarentena (secretos/PII/prompt-injection detectados en la fuente).`
}

export const getKnowledgeQuarantineCountSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await query<{ n: number; [column: string]: unknown }>(QUERY_SQL)
    const count = rows[0]?.n ?? 0

    return {
      signalId: KNOWLEDGE_QUARANTINE_COUNT_SIGNAL_ID,
      moduleKey: 'knowledge',
      kind: 'data_quality',
      source: 'getKnowledgeQuarantineCountSignal',
      label: 'Documentos de conocimiento en cuarentena',
      severity: count === 0 ? 'ok' : 'warning',
      summary: resolveSummary(count),
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'sql', label: 'Query', value: `greenhouse_knowledge.knowledge_documents WHERE publication_status='quarantined'` },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1082-notion-knowledge-ingestion-mvp.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'knowledge', {
      tags: { source: 'reliability_knowledge_quarantine_count' }
    })

    return {
      signalId: KNOWLEDGE_QUARANTINE_COUNT_SIGNAL_ID,
      moduleKey: 'knowledge',
      kind: 'data_quality',
      source: 'getKnowledgeQuarantineCountSignal',
      label: 'Documentos de conocimiento en cuarentena',
      severity: 'unknown',
      summary: 'No se pudo evaluar la cuarentena de conocimiento (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }]
    }
  }
}
