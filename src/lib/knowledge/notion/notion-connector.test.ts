import { describe, expect, it, vi } from 'vitest'

import { KnowledgeNotFoundError } from '../errors'

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
    url: 'https://notion.so/page-123',
    createdTime: '2026-01-01T00:00:00.000Z',
    lastEditedTime: '2026-02-01T00:00:00.000Z'
  }),
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

  it('throws KnowledgeNotFoundError for an unknown slug', async () => {
    const connector = new NotionKnowledgeConnector({ entries: [ENTRY], client: reader() })

    await expect(
      connector.load({ ...ENTRY, slug: 'does-not-exist', sourceLocator: 'x' })
    ).rejects.toBeInstanceOf(KnowledgeNotFoundError)
  })
})
