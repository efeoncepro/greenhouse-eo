import 'server-only'

import type { KnowledgeDocCandidate } from '../ingestion/connector'
import { findSourceId, ingestOne } from '../ingestion/pipeline'
import { getKnowledgeDocumentBySourcePageId, transitionKnowledgeDocumentStatus } from '../store'

import { articleToCandidate, NotionKnowledgeConnector, pageEntryToCandidate } from './notion-connector'
import { NotionKnowledgeClient, type NotionPageProvenance } from './notion-knowledge-client'
import { NOTION_KNOWLEDGE_CORPUS, type NotionCorpusEntry } from './notion-corpus'

/**
 * TASK-1094 — Auto-ingest de una página Notion (webhook-triggered).
 *
 * Resuelve el gate de gobernanza (¿la página pertenece a una entrada declarada del
 * corpus?) y re-ingiere ESE artículo (idempotente por checksum, reusando el pipeline
 * canónico) o lo deprecia (si la página se borró). NUNCA confía el payload del
 * webhook: re-fetchea la página (source of truth).
 */

const AUTO_INGEST_ACTOR = 'knowledge-notion-webhook'

export type AutoIngestOutcome =
  | { kind: 'ingested'; slug: string; chunkCount: number }
  | { kind: 'unchanged'; slug: string }
  | { kind: 'quarantined'; slug: string }
  | { kind: 'deprecated'; slug: string }
  | { kind: 'ignored_not_in_corpus'; pageId: string }
  | { kind: 'ignored_no_doc_for_deletion'; pageId: string }
  | { kind: 'failed'; pageId: string; reason: string }

/**
 * Gate de gobernanza PURO: ¿qué candidato del corpus "posee" esta página?
 *  - página suelta declarada por `notionPageId`, o
 *  - fila cuyo `parentDataSourceId` ∈ una Wiki declarada.
 * Retorna el candidato (slug/governance heredados) o null (ignorar — fuera del corpus).
 */
export const resolveCorpusEntryForNotionPage = (
  input: { pageId: string; parentDataSourceId: string | null; title: string },
  corpus: readonly NotionCorpusEntry[] = NOTION_KNOWLEDGE_CORPUS
): KnowledgeDocCandidate | null => {
  for (const entry of corpus) {
    if (entry.kind === 'data_source') {
      if (input.parentDataSourceId && entry.notionDataSourceId === input.parentDataSourceId) {
        return articleToCandidate(entry, { pageId: input.pageId, title: input.title })
      }
    } else if ((entry.kind ?? 'page') === 'page' && entry.notionPageId === input.pageId) {
      return pageEntryToCandidate(entry)
    }
  }

  return null
}

/** Solo los estados vivos transicionan a `deprecated` (state machine TASK-1081). */
const isDeprecatable = (status: string): boolean => status === 'published' || status === 'stale'

export interface AutoIngestDeps {
  client?: Pick<NotionKnowledgeClient, 'fetchPageProvenance'>
  connector?: NotionKnowledgeConnector
  corpus?: readonly NotionCorpusEntry[]
  /** Override de provenance (tests) en vez de re-fetch. */
  provenanceOverride?: NotionPageProvenance
}

/**
 * Procesa un trigger de cambio de página: re-fetch → (deprecación si borrada |
 * re-ingest idempotente si está en el corpus | ignorar). Server-only.
 */
export const ingestNotionPageById = async (
  input: { pageId: string; isDeletion: boolean },
  deps: AutoIngestDeps = {}
): Promise<AutoIngestOutcome> => {
  const client = deps.client ?? new NotionKnowledgeClient()
  const connector = deps.connector ?? new NotionKnowledgeConnector()
  const corpus = deps.corpus ?? NOTION_KNOWLEDGE_CORPUS

  const provenance = deps.provenanceOverride ?? (await client.fetchPageProvenance(input.pageId))

  // 1. Borrado: evento page.deleted O re-fetch muestra in_trash.
  if (input.isDeletion || provenance.inTrash) {
    const doc = await getKnowledgeDocumentBySourcePageId(input.pageId)

    if (!doc) {
      return { kind: 'ignored_no_doc_for_deletion', pageId: input.pageId }
    }

    if (isDeprecatable(doc.publicationStatus)) {
      await transitionKnowledgeDocumentStatus(doc.documentId, 'deprecated', {
        actor: AUTO_INGEST_ACTOR,
        reason: 'Notion page deleted/trashed (TASK-1094 auto-ingest)'
      })
    }

    return { kind: 'deprecated', slug: doc.slug }
  }

  // 2. Gate de gobernanza.
  const candidate = resolveCorpusEntryForNotionPage(
    { pageId: input.pageId, parentDataSourceId: provenance.parentDataSourceId, title: provenance.title },
    corpus
  )

  if (!candidate) {
    return { kind: 'ignored_not_in_corpus', pageId: input.pageId }
  }

  // 3. Re-ingest idempotente reusando el pipeline canónico per-doc.
  const sourceId = await findSourceId(connector.sourceDescriptor)

  if (!sourceId) {
    throw new Error('Notion knowledge source no registrado; corré una ingesta completa primero')
  }

  const report = await ingestOne(connector, candidate, sourceId, true, AUTO_INGEST_ACTOR)

  switch (report.status) {
    case 'published':
      return { kind: 'ingested', slug: candidate.slug, chunkCount: report.chunkCount }
    case 'skipped_unchanged':
      return { kind: 'unchanged', slug: candidate.slug }
    case 'quarantined':
      return { kind: 'quarantined', slug: candidate.slug }
    default:
      return { kind: 'failed', pageId: input.pageId, reason: report.reason ?? report.status }
  }
}
