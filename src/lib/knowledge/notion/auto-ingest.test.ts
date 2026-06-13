import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const getKnowledgeDocumentBySourcePageId = vi.fn()
const transitionKnowledgeDocumentStatus = vi.fn()
const findSourceId = vi.fn()
const ingestOne = vi.fn()

vi.mock('../store', () => ({ getKnowledgeDocumentBySourcePageId, transitionKnowledgeDocumentStatus }))
vi.mock('../ingestion/pipeline', () => ({ findSourceId, ingestOne }))

const { resolveCorpusEntryForNotionPage, ingestNotionPageById } = await import('./auto-ingest')
const { NotionKnowledgeConnector } = await import('./notion-connector')

import type { NotionCorpusEntry } from './notion-corpus'
import type { NotionPageProvenance } from './notion-knowledge-client'

const WIKI: NotionCorpusEntry = {
  kind: 'data_source',
  slugPrefix: 'wiki-sops',
  notionDataSourceId: 'ds-1',
  documentType: 'sop',
  ownerDomain: 'operations',
  approverRole: 'efeonce_admin',
  audience: 'internal',
  sensitivity: 'internal',
  agenticPolicy: 'agent_allowed',
  docLayer: 'functional'
}

const PAGE: NotionCorpusEntry = {
  kind: 'page',
  slug: 'onboarding',
  title: 'Onboarding',
  notionPageId: 'page-onb',
  humanUrl: '/knowledge/onboarding',
  documentType: 'onboarding_path',
  ownerDomain: 'people',
  approverRole: 'efeonce_admin',
  audience: 'internal',
  sensitivity: 'internal',
  agenticPolicy: 'agent_allowed',
  docLayer: 'functional'
}

const CORPUS = [WIKI, PAGE]

const provenance = (over: Partial<NotionPageProvenance>): NotionPageProvenance => ({
  pageId: 'p',
  title: 'T',
  url: null,
  createdTime: null,
  lastEditedTime: null,
  parentDataSourceId: null,
  inTrash: false,
  ...over
})

describe('resolveCorpusEntryForNotionPage (gate de gobernanza puro)', () => {
  it('resuelve una página suelta declarada por notionPageId', () => {
    const c = resolveCorpusEntryForNotionPage({ pageId: 'page-onb', parentDataSourceId: null, title: 'x' }, CORPUS)

    expect(c?.slug).toBe('onboarding')
  })

  it('resuelve un artículo de Wiki por parentDataSourceId (slug estable desde page id)', () => {
    const c = resolveCorpusEntryForNotionPage({ pageId: 'art-9', parentDataSourceId: 'ds-1', title: 'SOP X' }, CORPUS)

    expect(c?.slug).toBe('wiki-sops-art-9')
    expect(c?.title).toBe('SOP X')
    expect(c?.sourceLocator).toBe('art-9')
  })

  it('retorna null para una página fuera del corpus', () => {
    expect(resolveCorpusEntryForNotionPage({ pageId: 'x', parentDataSourceId: 'ds-otra', title: 't' }, CORPUS)).toBeNull()
  })
})

describe('ingestNotionPageById', () => {
  const connector = new NotionKnowledgeConnector()

  it('deprecación: página borrada con doc publicado → transiciona a deprecated', async () => {
    getKnowledgeDocumentBySourcePageId.mockResolvedValueOnce({ documentId: 'doc-1', slug: 'wiki-sops-art-9', publicationStatus: 'published' })

    const outcome = await ingestNotionPageById(
      { pageId: 'art-9', isDeletion: true },
      { connector, corpus: CORPUS, provenanceOverride: provenance({ pageId: 'art-9' }) }
    )

    expect(outcome).toEqual({ kind: 'deprecated', slug: 'wiki-sops-art-9' })
    expect(transitionKnowledgeDocumentStatus).toHaveBeenCalledWith('doc-1', 'deprecated', expect.any(Object))
  })

  it('deprecación defensiva: re-fetch muestra in_trash aunque el evento no era deletion', async () => {
    getKnowledgeDocumentBySourcePageId.mockResolvedValueOnce({ documentId: 'doc-2', slug: 's2', publicationStatus: 'published' })

    const outcome = await ingestNotionPageById(
      { pageId: 'art-x', isDeletion: false },
      { connector, corpus: CORPUS, provenanceOverride: provenance({ pageId: 'art-x', inTrash: true }) }
    )

    expect(outcome.kind).toBe('deprecated')
  })

  it('borrado sin doc → ignored_no_doc_for_deletion', async () => {
    getKnowledgeDocumentBySourcePageId.mockResolvedValueOnce(null)

    const outcome = await ingestNotionPageById(
      { pageId: 'art-z', isDeletion: true },
      { connector, corpus: CORPUS, provenanceOverride: provenance({ pageId: 'art-z' }) }
    )

    expect(outcome.kind).toBe('ignored_no_doc_for_deletion')
  })

  it('fuera del corpus → ignored_not_in_corpus (no re-ingiere)', async () => {
    const outcome = await ingestNotionPageById(
      { pageId: 'art-q', isDeletion: false },
      { connector, corpus: CORPUS, provenanceOverride: provenance({ pageId: 'art-q', parentDataSourceId: 'ds-otra' }) }
    )

    expect(outcome.kind).toBe('ignored_not_in_corpus')
    expect(ingestOne).not.toHaveBeenCalled()
  })

  it('en el corpus → re-ingiere vía pipeline canónico (idempotente)', async () => {
    findSourceId.mockResolvedValueOnce('src-1')
    ingestOne.mockResolvedValueOnce({ slug: 'wiki-sops-art-9', status: 'published', chunkCount: 5 })

    const outcome = await ingestNotionPageById(
      { pageId: 'art-9', isDeletion: false },
      { connector, corpus: CORPUS, provenanceOverride: provenance({ pageId: 'art-9', parentDataSourceId: 'ds-1', title: 'SOP X' }) }
    )

    expect(outcome).toEqual({ kind: 'ingested', slug: 'wiki-sops-art-9', chunkCount: 5 })
    expect(ingestOne).toHaveBeenCalledWith(connector, expect.objectContaining({ slug: 'wiki-sops-art-9' }), 'src-1', true, expect.any(String))
  })
})
