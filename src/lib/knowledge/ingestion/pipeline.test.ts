import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  captureWithDomain: vi.fn(),
  createKnowledgeDocument: vi.fn(),
  getKnowledgeDocumentBySlug: vi.fn(),
  getKnowledgeDocumentVersion: vi.fn(),
  publishKnowledgeDocumentVersion: vi.fn(),
  registerKnowledgeSource: vi.fn(),
  transitionKnowledgeDocumentStatus: vi.fn(),
  sanitizeKnowledgeContent: vi.fn(),
  embedKnowledgeDocumentVersion: vi.fn(),
  isKnowledgeReactiveEmbeddingEnabled: vi.fn(),
  checksumMarkdown: vi.fn(),
  chunkMarkdown: vi.fn(),
  beginKnowledgeRun: vi.fn(),
  completeKnowledgeRun: vi.fn()
}))

vi.mock('@/lib/db', () => ({ query: mocks.query }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.captureWithDomain }))
vi.mock('@/lib/observability/redact', () => ({ redactErrorForResponse: (err: unknown) => String(err) }))
vi.mock('../store', () => ({
  createKnowledgeDocument: mocks.createKnowledgeDocument,
  getKnowledgeDocumentBySlug: mocks.getKnowledgeDocumentBySlug,
  getKnowledgeDocumentVersion: mocks.getKnowledgeDocumentVersion,
  publishKnowledgeDocumentVersion: mocks.publishKnowledgeDocumentVersion,
  registerKnowledgeSource: mocks.registerKnowledgeSource,
  transitionKnowledgeDocumentStatus: mocks.transitionKnowledgeDocumentStatus
}))
vi.mock('../sanitization/detect', () => ({ sanitizeKnowledgeContent: mocks.sanitizeKnowledgeContent }))
vi.mock('../search/embed-corpus', () => ({ embedKnowledgeDocumentVersion: mocks.embedKnowledgeDocumentVersion }))
vi.mock('./flags', () => ({ isKnowledgeReactiveEmbeddingEnabled: mocks.isKnowledgeReactiveEmbeddingEnabled }))
vi.mock('./markdown', () => ({ checksumMarkdown: mocks.checksumMarkdown, chunkMarkdown: mocks.chunkMarkdown }))
vi.mock('./run-tracking', () => ({
  beginKnowledgeRun: mocks.beginKnowledgeRun,
  completeKnowledgeRun: mocks.completeKnowledgeRun
}))

const { ingestOne } = await import('./pipeline')

const connector = {
  sourceSystem: 'repo_docs' as const,
  sourceDescriptor: {
    sourceSystem: 'repo_docs' as const,
    sourceKind: 'markdown_collection' as const,
    name: 'Repo Docs',
    ownerDomain: 'operations',
    audience: 'internal' as const
  },
  list: vi.fn(),
  load: vi.fn()
}

const candidate = {
  slug: 'nexa-routing',
  title: 'Nexa Routing',
  documentType: 'runbook' as const,
  ownerDomain: 'product',
  approverRole: 'efeonce_admin',
  audience: 'internal' as const,
  sensitivity: 'internal' as const,
  agenticPolicy: 'agent_allowed' as const,
  humanUrl: '/docs/nexa-routing',
  docLayer: 'technical' as const,
  sourceLocator: 'docs/nexa-routing.md'
}

describe('ingestOne reactive embeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connector.load.mockResolvedValue({
      rawMarkdown: '# Nexa\n\nRouting',
      provenance: {
        sourceSystem: 'repo_docs' as const,
        sourceUrl: '/docs/nexa-routing',
        sourcePageId: null,
        sourceCreatedAt: null,
        sourceEditedAt: null
      }
    })
    mocks.checksumMarkdown.mockReturnValue('checksum-v1')
    mocks.chunkMarkdown.mockReturnValue([
      {
        headingPath: ['Nexa'],
        bodyText: 'Routing',
        citationAnchor: 'nexa',
        tokenEstimate: 5
      }
    ])
    mocks.sanitizeKnowledgeContent.mockReturnValue({ flagged: false, findings: [] })
    mocks.getKnowledgeDocumentBySlug.mockResolvedValue(null)
    mocks.createKnowledgeDocument.mockResolvedValue({ documentId: 'doc-1', publicationStatus: 'draft' })
    mocks.publishKnowledgeDocumentVersion.mockResolvedValue({ versionId: 'ver-1', versionNumber: 1 })
    mocks.embedKnowledgeDocumentVersion.mockResolvedValue({
      scanned: 1,
      embedded: 1,
      skippedUpToDate: 0,
      batches: 1,
      tokensEstimated: 3,
      model: 'text-multilingual-embedding-002',
      apply: true
    })
    mocks.isKnowledgeReactiveEmbeddingEnabled.mockReturnValue(true)
  })

  it('embebe la versión recién publicada después de persistirla', async () => {
    const result = await ingestOne(connector, candidate, 'source-1', true, 'actor-1')

    expect(result).toMatchObject({ slug: 'nexa-routing', status: 'published', versionNumber: 1, chunkCount: 1 })
    expect(mocks.publishKnowledgeDocumentVersion).toHaveBeenCalledTimes(1)
    expect(mocks.embedKnowledgeDocumentVersion).toHaveBeenCalledWith({ documentVersionId: 'ver-1', apply: true })
    expect(
      mocks.publishKnowledgeDocumentVersion.mock.invocationCallOrder[0]
    ).toBeLessThan(mocks.embedKnowledgeDocumentVersion.mock.invocationCallOrder[0])
  })

  it('no convierte un fallo de embeddings en fallo de publicación', async () => {
    const error = new Error('vertex unavailable')

    mocks.embedKnowledgeDocumentVersion.mockRejectedValueOnce(error)

    const result = await ingestOne(connector, candidate, 'source-1', true, 'actor-1')

    expect(result).toMatchObject({ slug: 'nexa-routing', status: 'published', versionNumber: 1, chunkCount: 1 })
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(error, 'knowledge', {
      tags: { source: 'ingestion_pipeline', stage: 'reactive_embedding' },
      extra: {
        slug: 'nexa-routing',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        versionNumber: 1
      }
    })
  })

  it('respeta el kill-switch operativo', async () => {
    mocks.isKnowledgeReactiveEmbeddingEnabled.mockReturnValueOnce(false)

    await ingestOne(connector, candidate, 'source-1', true, 'actor-1')

    expect(mocks.embedKnowledgeDocumentVersion).not.toHaveBeenCalled()
  })
})
