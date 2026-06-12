import 'server-only'

import { findSourceId, runKnowledgeIngestion, type IngestionRunReport } from '../ingestion/pipeline'
import { listLiveSourceDocPageRefs, transitionKnowledgeDocumentStatus } from '../store'

import { NotionKnowledgeConnector } from './notion-connector'
import { NotionKnowledgeClient } from './notion-knowledge-client'
import { NOTION_KNOWLEDGE_CORPUS } from './notion-corpus'

/**
 * TASK-1094 — Reconcile on-demand del corpus Notion de knowledge.
 *
 * Red de seguridad del at-most-once de los webhooks (decisión operador: NO cron).
 * Hace dos cosas:
 *  1. Re-ingest idempotente del corpus declarado (recupera creaciones/ediciones
 *     cuyos webhooks se perdieron) — reusa el pipeline canónico.
 *  2. Deprecación de huérfanos: docs publicados cuya página ya no existe en Notion
 *     (borrados cuyo `page.deleted` se perdió) → `deprecated`.
 *
 * El operador lo corre cuando la señal `knowledge.notion.ingest_dead_letter` alerta
 * o periódicamente. dry-run por default; `apply` escribe.
 */

const RECONCILE_ACTOR = 'knowledge-notion-reconcile'

export interface OrphanDoc {
  documentId: string
  slug: string
  sourcePageId: string
}

/** PURO: docs vivos cuyo page id NO está entre las páginas vivas de Notion → huérfanos. */
export const findOrphanDocs = (
  liveDocs: ReadonlyArray<{ documentId: string; slug: string; sourcePageId: string }>,
  livePageIds: ReadonlySet<string>
): OrphanDoc[] => liveDocs.filter(doc => !livePageIds.has(doc.sourcePageId))

export interface ReconcileReport {
  mode: 'dry-run' | 'apply'
  ingest: IngestionRunReport
  livePageCount: number
  orphans: OrphanDoc[]
  deprecated: number
}

export const reconcileNotionKnowledge = async (
  options: { apply?: boolean } = {}
): Promise<ReconcileReport> => {
  const apply = options.apply === true
  const connector = new NotionKnowledgeConnector()
  const client = new NotionKnowledgeClient()

  // 1. Re-ingest idempotente del corpus declarado.
  const ingest = await runKnowledgeIngestion({ connector, apply })

  // 2. Set de page ids vivos en Notion (filas de Wiki + páginas declaradas).
  const livePageIds = new Set<string>()

  for (const entry of NOTION_KNOWLEDGE_CORPUS) {
    if (entry.kind === 'data_source') {
      const { rows } = await client.queryDataSourcePages(entry.notionDataSourceId)

      for (const row of rows) {
        livePageIds.add(row.pageId)
      }
    } else {
      livePageIds.add(entry.notionPageId)
    }
  }

  // 3. Detección + deprecación de huérfanos.
  const sourceId = await findSourceId(connector.sourceDescriptor)
  let orphans: OrphanDoc[] = []
  let deprecated = 0

  if (sourceId) {
    const liveDocs = await listLiveSourceDocPageRefs(sourceId)

    orphans = findOrphanDocs(liveDocs, livePageIds)

    if (apply) {
      for (const orphan of orphans) {
        await transitionKnowledgeDocumentStatus(orphan.documentId, 'deprecated', {
          actor: RECONCILE_ACTOR,
          reason: 'Notion page ya no presente (reconcile TASK-1094)'
        })
        deprecated += 1
      }
    }
  }

  return { mode: apply ? 'apply' : 'dry-run', ingest, livePageCount: livePageIds.size, orphans, deprecated }
}
