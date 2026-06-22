import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  captureWithDomain: vi.fn(),
  embedKnowledgeDocumentTexts: vi.fn(),
  buildChunkEmbedText: vi.fn((title: string, headingPath: string[], bodyText: string) =>
    [title, ...headingPath, bodyText].join('\n')
  ),
  embedTextChecksum: vi.fn((text: string) => `checksum:${text}`)
}))

vi.mock('@/lib/db', () => ({ query: mocks.query }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.captureWithDomain }))
vi.mock('./knowledge-embeddings', () => ({
  KNOWLEDGE_EMBED_MODEL: 'text-multilingual-embedding-002',
  buildChunkEmbedText: mocks.buildChunkEmbedText,
  embedKnowledgeDocumentTexts: mocks.embedKnowledgeDocumentTexts,
  embedTextChecksum: mocks.embedTextChecksum,
  toPgVectorLiteral: (values: number[]) => `[${values.join(',')}]`
}))

const { embedKnowledgeCorpus, embedKnowledgeDocumentVersion } = await import('./embed-corpus')

describe('embedKnowledgeCorpus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue([])
  })

  it('dry-run global mantiene el scope en versiones vigentes y no llama Vertex', async () => {
    mocks.query.mockResolvedValueOnce([
      {
        chunk_id: 'chunk-1',
        title: 'Playbook',
        heading_path: ['Nexa'],
        body_text: 'Body',
        embedding_checksum: null,
        has_embedding: false
      }
    ])

    const result = await embedKnowledgeCorpus({ apply: false })

    expect(result).toMatchObject({ scanned: 1, embedded: 1, skippedUpToDate: 0, batches: 0, apply: false })
    expect(String(mocks.query.mock.calls[0][0])).toContain('kc.document_version_id = kd.current_version_id')
    expect(mocks.query.mock.calls[0][1]).toEqual([])
    expect(mocks.embedKnowledgeDocumentTexts).not.toHaveBeenCalled()
    expect(mocks.query).toHaveBeenCalledTimes(1)
  })
})

describe('embedKnowledgeDocumentVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue([])
  })

  it('embebe solo chunks stale de una versión publicada e idempotente por checksum', async () => {
    const upToDateText = 'Guide\nCurrent'
    const staleText = 'Guide\nFresh'

    mocks.query.mockResolvedValueOnce([
      {
        chunk_id: 'chunk-current',
        title: 'Guide',
        heading_path: [],
        body_text: 'Current',
        embedding_checksum: `checksum:${upToDateText}`,
        has_embedding: true
      },
      {
        chunk_id: 'chunk-fresh',
        title: 'Guide',
        heading_path: [],
        body_text: 'Fresh',
        embedding_checksum: null,
        has_embedding: false
      }
    ])
    mocks.embedKnowledgeDocumentTexts.mockResolvedValueOnce([[0.1, 0.2]])

    const result = await embedKnowledgeDocumentVersion({ documentVersionId: 'ver-1', apply: true })

    expect(result).toMatchObject({ scanned: 2, embedded: 1, skippedUpToDate: 1, batches: 1, apply: true })
    expect(String(mocks.query.mock.calls[0][0])).toContain('kc.document_version_id = $1')
    expect(String(mocks.query.mock.calls[0][0])).not.toContain('kc.document_version_id = kd.current_version_id')
    expect(mocks.query.mock.calls[0][1]).toEqual(['ver-1'])
    expect(mocks.embedKnowledgeDocumentTexts).toHaveBeenCalledWith([staleText])
    expect(mocks.query.mock.calls[1][1]).toEqual([
      '[0.1,0.2]',
      'text-multilingual-embedding-002',
      `checksum:${staleText}`,
      'chunk-fresh'
    ])
  })

  it('captura y relanza errores del batch para que el caller decida si bloquear o no', async () => {
    const error = new Error('vertex quota')

    mocks.query.mockResolvedValueOnce([
      {
        chunk_id: 'chunk-1',
        title: 'Guide',
        heading_path: [],
        body_text: 'Fresh',
        embedding_checksum: null,
        has_embedding: false
      }
    ])
    mocks.embedKnowledgeDocumentTexts.mockRejectedValueOnce(error)

    await expect(embedKnowledgeDocumentVersion({ documentVersionId: 'ver-1', apply: true })).rejects.toThrow(
      'vertex quota'
    )

    expect(mocks.captureWithDomain).toHaveBeenCalledWith(error, 'knowledge', {
      tags: { source: 'embed_document_version', stage: 'embed_batch' },
      extra: { documentVersionId: 'ver-1', batchStart: 0, batchSize: 1 }
    })
  })
})
