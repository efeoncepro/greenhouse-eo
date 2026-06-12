import 'server-only'

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
  type NotionPageProvenance
} from './notion-knowledge-client'
import { NOTION_KNOWLEDGE_CORPUS, NOTION_KNOWLEDGE_SOURCE_NAME, type NotionCorpusEntry } from './notion-corpus'

/**
 * TASK-1088 — Connector `notion`. Ingiere documentos del teamspace de conocimiento
 * Notion: fetch del árbol de bloques → blocks→markdown puro → pipeline (sanitize →
 * quarantine | publish + chunks, TASK-1082, sin cambios). Es ingesta operada por
 * script/ops (snapshot), NO runtime del portal ni Notion live para una respuesta.
 *
 * Si el token de knowledge no está provisionado, `list()` reporta cada candidato
 * `unavailable` (degradación honesta) en vez de fallar — el connector existe pero
 * no ingiere hasta que el operador comparta las páginas con la integración dedicada.
 */

/** Contrato mínimo del cliente Notion que el connector consume (testeable con mock). */
export interface NotionKnowledgeReader {
  isConfigured(): Promise<boolean>
  fetchBlockTree(pageId: string): Promise<NotionBlock[]>
  fetchPageProvenance(pageId: string): Promise<NotionPageProvenance>
}

const toCandidate = (entry: NotionCorpusEntry): KnowledgeDocCandidate => ({
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

  constructor(options: NotionKnowledgeConnectorOptions = {}) {
    this.entries = options.entries ?? NOTION_KNOWLEDGE_CORPUS
    this.client = options.client ?? new NotionKnowledgeClient()
  }

  async list(): Promise<KnowledgeConnectorListItem[]> {
    const configured = await this.client.isConfigured()

    return this.entries.map(entry => {
      const candidate = toCandidate(entry)

      if (!configured) {
        return {
          kind: 'unavailable',
          candidate,
          reason: 'token Notion de knowledge no configurado'
        }
      }

      return { kind: 'available', candidate }
    })
  }

  async load(candidate: KnowledgeDocCandidate): Promise<KnowledgeLoadedDocument> {
    const entry = this.entries.find(e => e.slug === candidate.slug)

    if (!entry) {
      throw new KnowledgeNotFoundError('notion corpus entry', candidate.slug)
    }

    const blocks = await this.client.fetchBlockTree(entry.notionPageId)
    const rawMarkdown = blocksToMarkdown(blocks)
    const provenance = await this.client.fetchPageProvenance(entry.notionPageId)

    return {
      candidate,
      rawMarkdown,
      provenance: {
        sourceSystem: 'notion',
        sourceUrl: provenance.url,
        sourcePageId: entry.notionPageId,
        sourceCreatedAt: provenance.createdTime,
        sourceEditedAt: provenance.lastEditedTime
      }
    }
  }
}
