import { ingestNotionPageById } from '@/lib/knowledge/notion/auto-ingest'
import { captureWithDomain } from '@/lib/observability/capture'

import { EVENT_TYPES } from '../event-catalog'
import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-1094 — Consumer reactivo del auto-ingest de knowledge.
 *
 * Trigger: `knowledge.notion.page_change_signal` (emitido por el webhook
 * `notion-knowledge`). Re-fetchea la página (source of truth, NUNCA confía el
 * payload), aplica el gate de gobernanza y re-ingiere ESE artículo (idempotente por
 * checksum) o lo deprecia (borrado). Corre en el ops-worker.
 *
 * Coalescing-safe: el `extractScope` agrupa por page id, así varias ediciones
 * rápidas de la misma página colapsan en un solo refresh; el re-fetch resuelve el
 * estado vigente (incl. in_trash → deprecación) regardless del payload.
 */
export const knowledgeNotionIngestProjection: ProjectionDefinition = {
  name: 'knowledge_notion_ingest',
  description: 'TASK-1094 — re-fetch + gate + re-ingest idempotente | deprecación de una página de knowledge Notion.',
  domain: 'knowledge',
  triggerEvents: [EVENT_TYPES.knowledgeNotionPageChangeSignal],
  extractScope: payload => {
    const pageId = typeof payload.pageId === 'string' ? payload.pageId.trim() : ''

    return pageId ? { entityType: 'knowledge_notion_page', entityId: pageId } : null
  },
  refresh: async (scope, payload) => {
    const isDeletion = payload.isDeletion === true

    try {
      const outcome = await ingestNotionPageById({ pageId: scope.entityId, isDeletion })
      const label = 'slug' in outcome ? outcome.slug : scope.entityId

      return `knowledge_notion_ingest:${outcome.kind}:${label}`
    } catch (err) {
      captureWithDomain(err, 'knowledge', {
        tags: { source: 'knowledge_notion_ingest', stage: 'refresh' },
        extra: { pageId: scope.entityId }
      })

      throw err
    }
  },
  maxRetries: 3
}
