import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'

import { KnowledgeNotFoundError } from '../errors'
import type {
  KnowledgeConnectorListItem,
  KnowledgeDocCandidate,
  KnowledgeLoadedDocument,
  KnowledgeSourceConnector,
  KnowledgeSourceDescriptor
} from '../ingestion/connector'

import { blocksToMarkdown } from './blocks-to-markdown'
import {
  NotionKnowledgeClient,
  type NotionBlock,
  type NotionDataSourceQueryResult,
  type NotionPageProvenance
} from './notion-knowledge-client'
import {
  NOTION_KNOWLEDGE_CORPUS,
  NOTION_KNOWLEDGE_SOURCE_NAME,
  type NotionCorpusEntry,
  type NotionDataSourceCorpusEntry,
  type NotionPageCorpusEntry
} from './notion-corpus'

/**
 * TASK-1088 — Connector `notion`. Ingiere el corpus de conocimiento Notion:
 *  - entradas `page`        → árbol de bloques de una página.
 *  - entradas `data_source` → una Wiki se expande a N artículos (filas), cada uno
 *    ingerido por su árbol de bloques, heredando la gobernanza de la Wiki.
 *
 * fetch block tree → blocks→markdown puro → pipeline (sanitize → quarantine |
 * publish + chunks, TASK-1082, sin cambios). Es ingesta operada por script/ops
 * (snapshot), NO runtime del portal ni Notion live para una respuesta.
 *
 * Si el token de knowledge no está provisionado, `list()` reporta cada candidato
 * `unavailable` (degradación honesta) en vez de fallar.
 */

/** Contrato mínimo del cliente Notion que el connector consume (testeable con mock). */
export interface NotionKnowledgeReader {
  isConfigured(): Promise<boolean>
  fetchBlockTree(pageId: string): Promise<NotionBlock[]>
  fetchPageProvenance(pageId: string): Promise<NotionPageProvenance>
  queryDataSourcePages(dataSourceId: string): Promise<NotionDataSourceQueryResult>
}

const isDataSourceEntry = (entry: NotionCorpusEntry): entry is NotionDataSourceCorpusEntry =>
  entry.kind === 'data_source'

const pageEntryToCandidate = (entry: NotionPageCorpusEntry): KnowledgeDocCandidate => ({
  slug: entry.slug,
  title: entry.title,
  documentType: entry.documentType,
  ownerDomain: entry.ownerDomain,
  approverRole: entry.approverRole,
  audience: entry.audience,
  sensitivity: entry.sensitivity,
  agenticPolicy: entry.agenticPolicy,
  docLayer: entry.docLayer,
  humanUrl: entry.humanUrl,
  sourceLocator: entry.notionPageId
})

/**
 * Candidato por artículo de una Wiki. El slug es estable desde el page id
 * (`<slugPrefix>-<pageId>`, NUNCA del título) y kebab-case ascii: el separador es
 * `-` (no `/`) porque el slug es la clave canónica del documento y el store exige
 * `^[a-z0-9]+(-[a-z0-9]+)*$` (`assertKnowledgeSlug`). El page id UUID es lowercase
 * hex + guiones → segmentos kebab válidos.
 */
const articleToCandidate = (
  entry: NotionDataSourceCorpusEntry,
  row: { pageId: string; title: string }
): KnowledgeDocCandidate => {
  const slug = `${entry.slugPrefix}-${row.pageId}`

  return {
    slug,
    title: row.title,
    documentType: entry.documentType,
    ownerDomain: entry.ownerDomain,
    approverRole: entry.approverRole,
    audience: entry.audience,
    sensitivity: entry.sensitivity,
    agenticPolicy: entry.agenticPolicy,
    docLayer: entry.docLayer,
    humanUrl: `/knowledge/${slug}`,
    sourceLocator: row.pageId
  }
}

/** Candidato placeholder de una Wiki cuando el token no está configurado. */
const dataSourceUnavailableCandidate = (entry: NotionDataSourceCorpusEntry): KnowledgeDocCandidate => ({
  slug: entry.slugPrefix,
  title: entry.slugPrefix,
  documentType: entry.documentType,
  ownerDomain: entry.ownerDomain,
  approverRole: entry.approverRole,
  audience: entry.audience,
  sensitivity: entry.sensitivity,
  agenticPolicy: entry.agenticPolicy,
  docLayer: entry.docLayer,
  humanUrl: null,
  sourceLocator: entry.notionDataSourceId
})

export interface NotionKnowledgeConnectorOptions {
  entries?: readonly NotionCorpusEntry[]
  client?: NotionKnowledgeReader
}

export class NotionKnowledgeConnector implements KnowledgeSourceConnector {
  readonly sourceSystem = 'notion' as const

  readonly sourceDescriptor: KnowledgeSourceDescriptor = {
    sourceSystem: 'notion',
    sourceKind: 'notion_page_tree',
    name: NOTION_KNOWLEDGE_SOURCE_NAME,
    ownerDomain: 'platform',
    audience: 'internal'
  }

  private readonly entries: readonly NotionCorpusEntry[]
  private readonly client: NotionKnowledgeReader
  /** Provenance de los artículos de Wiki, capturada en `list()` para evitar un fetch extra por artículo. */
  private readonly provenanceCache = new Map<string, NotionPageProvenance>()

  constructor(options: NotionKnowledgeConnectorOptions = {}) {
    this.entries = options.entries ?? NOTION_KNOWLEDGE_CORPUS
    this.client = options.client ?? new NotionKnowledgeClient()
  }

  async list(): Promise<KnowledgeConnectorListItem[]> {
    const configured = await this.client.isConfigured()
    const items: KnowledgeConnectorListItem[] = []

    for (const entry of this.entries) {
      if (isDataSourceEntry(entry)) {
        if (!configured) {
          items.push({
            kind: 'unavailable',
            candidate: dataSourceUnavailableCandidate(entry),
            reason: 'token Notion de knowledge no configurado'
          })
          continue
        }

        const result = await this.client.queryDataSourcePages(entry.notionDataSourceId)

        if (result.hitResultLimit) {
          captureWithDomain(new Error('notion_knowledge_query_result_limit'), 'knowledge', {
            tags: { source: 'notion_connector', stage: 'data_source_query' },
            extra: { dataSourceId: entry.notionDataSourceId, rows: result.rows.length }
          })
        }

        for (const row of result.rows) {
          this.provenanceCache.set(row.pageId, {
            pageId: row.pageId,
            url: row.url,
            createdTime: row.createdTime,
            lastEditedTime: row.lastEditedTime
          })
          items.push({ kind: 'available', candidate: articleToCandidate(entry, row) })
        }

        continue
      }

      const candidate = pageEntryToCandidate(entry)

      items.push(
        configured
          ? { kind: 'available', candidate }
          : { kind: 'unavailable', candidate, reason: 'token Notion de knowledge no configurado' }
      )
    }

    return items
  }

  async load(candidate: KnowledgeDocCandidate): Promise<KnowledgeLoadedDocument> {
    // El page id viaja en `sourceLocator` (página suelta o artículo de Wiki) — contrato unificado.
    const pageId = candidate.sourceLocator

    if (!pageId) {
      throw new KnowledgeNotFoundError('notion page id', candidate.slug)
    }

    const blocks = await this.client.fetchBlockTree(pageId)
    const rawMarkdown = blocksToMarkdown(blocks)
    const provenance = this.provenanceCache.get(pageId) ?? (await this.client.fetchPageProvenance(pageId))

    return {
      candidate,
      rawMarkdown,
      provenance: {
        sourceSystem: 'notion',
        sourceUrl: provenance.url,
        sourcePageId: pageId,
        sourceCreatedAt: provenance.createdTime,
        sourceEditedAt: provenance.lastEditedTime
      }
    }
  }
}
