import { describe, expect, it, vi } from 'vitest'

import { KnowledgeNotFoundError } from '../errors'
import { assertKnowledgeSlug } from '../validators'

import { NotionKnowledgeConnector, type NotionKnowledgeReader } from './notion-connector'
import type { NotionBlock } from './notion-knowledge-client'
import type { NotionCorpusEntry } from './notion-corpus'

const ENTRY: NotionCorpusEntry = {
  slug: 'manual-onboarding',
  title: 'Manual de onboarding',
  documentType: 'how_to',
  ownerDomain: 'platform',
  approverRole: 'efeonce_admin',
  audience: 'internal',
  sensitivity: 'internal',
  agenticPolicy: 'agent_allowed',
  docLayer: 'functional',
  humanUrl: '/knowledge/manual-onboarding',
  notionPageId: 'page-123'
}

const block = (type: string, payload: Record<string, unknown>): NotionBlock => ({
  id: `b-${type}`,
  type,
  has_children: false,
  [type]: payload
})

const reader = (overrides: Partial<NotionKnowledgeReader> = {}): NotionKnowledgeReader => ({
  isConfigured: vi.fn().mockResolvedValue(true),
  fetchBlockTree: vi.fn().mockResolvedValue([]),
  fetchPageProvenance: vi.fn().mockResolvedValue({
    pageId: 'page-123',
    title: 'Page 123',
    url: 'https://notion.so/page-123',
    createdTime: '2026-01-01T00:00:00.000Z',
    lastEditedTime: '2026-02-01T00:00:00.000Z',
    parentDataSourceId: null,
    inTrash: false
  }),
  queryDataSourcePages: vi.fn().mockResolvedValue({ rows: [], hitResultLimit: false }),
  ...overrides
})

describe('NotionKnowledgeConnector', () => {
  it('declares the canonical source descriptor', () => {
    const connector = new NotionKnowledgeConnector({ entries: [], client: reader() })

    expect(connector.sourceDescriptor.sourceSystem).toBe('notion')
    expect(connector.sourceDescriptor.sourceKind).toBe('notion_page_tree')
    expect(connector.sourceDescriptor.audience).toBe('internal')
  })

  it('reports candidates unavailable when the token is not configured', async () => {
    const connector = new NotionKnowledgeConnector({
      entries: [ENTRY],
      client: reader({ isConfigured: vi.fn().mockResolvedValue(false) })
    })

    const items = await connector.list()

    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('unavailable')
  })

  it('reports candidates available when configured', async () => {
    const connector = new NotionKnowledgeConnector({ entries: [ENTRY], client: reader() })

    const items = await connector.list()

    expect(items[0].kind).toBe('available')
    expect(items[0].candidate.slug).toBe('manual-onboarding')
    expect(items[0].candidate.sourceLocator).toBe('page-123')
  })

  it('returns an empty list for an empty corpus', async () => {
    const connector = new NotionKnowledgeConnector({ entries: [], client: reader() })

    expect(await connector.list()).toEqual([])
  })

  it('loads a document: blocks → markdown + provenance', async () => {
    const client = reader({
      fetchBlockTree: vi
        .fn()
        .mockResolvedValue([
          block('heading_1', { rich_text: [{ plain_text: 'Onboarding', annotations: {}, href: null }] }),
          block('paragraph', { rich_text: [{ plain_text: 'Primer día.', annotations: {}, href: null }] })
        ])
    })

    const connector = new NotionKnowledgeConnector({ entries: [ENTRY], client })

    const result = await connector.load({ ...ENTRY, sourceLocator: 'page-123' })

    expect(result.rawMarkdown).toBe('# Onboarding\n\nPrimer día.')
    expect(result.provenance.sourceSystem).toBe('notion')
    expect(result.provenance.sourcePageId).toBe('page-123')
    expect(result.provenance.sourceUrl).toBe('https://notion.so/page-123')
    expect(result.provenance.sourceEditedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(client.fetchBlockTree).toHaveBeenCalledWith('page-123')
  })

  it('throws KnowledgeNotFoundError when sourceLocator (page id) is empty', async () => {
    const connector = new NotionKnowledgeConnector({ entries: [ENTRY], client: reader() })

    await expect(connector.load({ ...ENTRY, sourceLocator: '' })).rejects.toBeInstanceOf(KnowledgeNotFoundError)
  })
})

const WIKI_ENTRY: NotionCorpusEntry = {
  kind: 'data_source',
  slugPrefix: 'wiki-sops',
  notionDataSourceId: 'ds-99',
  documentType: 'sop',
  ownerDomain: 'platform',
  approverRole: 'efeonce_admin',
  audience: 'internal',
  sensitivity: 'internal',
  agenticPolicy: 'agent_allowed',
  docLayer: 'functional'
}

describe('NotionKnowledgeConnector — data_source (Wiki) expansion', () => {
  it('expands a Wiki into one candidate per article, inheriting governance + stable slugs', async () => {
    const client = reader({
      queryDataSourcePages: vi.fn().mockResolvedValue({
        rows: [
          { pageId: 'art-1', title: 'SOP de cierre', url: 'https://notion.so/art-1', createdTime: 'c1', lastEditedTime: 'e1' },
          { pageId: 'art-2', title: 'SOP de onboarding', url: 'https://notion.so/art-2', createdTime: 'c2', lastEditedTime: 'e2' }
        ],
        hitResultLimit: false
      })
    })

    const connector = new NotionKnowledgeConnector({ entries: [WIKI_ENTRY], client })
    const items = await connector.list()

    expect(items).toHaveLength(2)
    expect(items.every(i => i.kind === 'available')).toBe(true)
    // slug estable desde el page id (NUNCA del título), kebab-case ascii (separador '-', no '/')
    expect(items[0].candidate.slug).toBe('wiki-sops-art-1')
    expect(items[1].candidate.slug).toBe('wiki-sops-art-2')
    expect(items[0].candidate.title).toBe('SOP de cierre')
    expect(items[0].candidate.sourceLocator).toBe('art-1')
    // gobernanza heredada de la Wiki
    expect(items[0].candidate.documentType).toBe('sop')
    expect(items[0].candidate.agenticPolicy).toBe('agent_allowed')
    expect(client.queryDataSourcePages).toHaveBeenCalledWith('ds-99')
  })

  it('generates slugs that pass the store kebab-case validation (real UUID page ids)', async () => {
    const client = reader({
      queryDataSourcePages: vi.fn().mockResolvedValue({
        rows: [{ pageId: '1c386bde-8c5b-40fb-9378-d26b6df3219a', title: 'Artículo' }],
        hitResultLimit: false
      })
    })

    const connector = new NotionKnowledgeConnector({ entries: [WIKI_ENTRY], client })
    const items = await connector.list()

    // No debe lanzar — el slug es la clave canónica del documento en el store.
    expect(() => assertKnowledgeSlug(items[0].candidate.slug)).not.toThrow()
    expect(items[0].candidate.slug).toBe('wiki-sops-1c386bde-8c5b-40fb-9378-d26b6df3219a')
  })

  it('loads a Wiki article using cached provenance (no extra page fetch)', async () => {
    const client = reader({
      queryDataSourcePages: vi.fn().mockResolvedValue({
        rows: [{ pageId: 'art-1', title: 'SOP de cierre', url: 'https://notion.so/art-1', createdTime: 'c1', lastEditedTime: 'e1' }],
        hitResultLimit: false
      }),
      fetchBlockTree: vi
        .fn()
        .mockResolvedValue([block('paragraph', { rich_text: [{ plain_text: 'Contenido', annotations: {}, href: null }] })])
    })

    const connector = new NotionKnowledgeConnector({ entries: [WIKI_ENTRY], client })
    const items = await connector.list()
    const result = await connector.load(items[0].candidate)

    expect(result.rawMarkdown).toBe('Contenido')
    expect(result.provenance.sourcePageId).toBe('art-1')
    expect(result.provenance.sourceEditedAt).toBe('e1')
    // provenance vino del cache poblado en list(), no de un fetch extra
    expect(client.fetchPageProvenance).not.toHaveBeenCalled()
  })

  it('reports the Wiki unavailable when the token is not configured', async () => {
    const connector = new NotionKnowledgeConnector({
      entries: [WIKI_ENTRY],
      client: reader({ isConfigured: vi.fn().mockResolvedValue(false) })
    })

    const items = await connector.list()

    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('unavailable')
  })
})
