/**
 * TASK-1086 — tests del lane ecosystem de Knowledge (resource builders + predicado).
 *
 * Mockea SOLO `searchKnowledge` + el store (tocan PG / módulo server-only). El predicado
 * `isDocumentAgenticallyVisible` es local y se ejercita REAL. Cubre:
 *   - gate de governance: binding no-internal → 403 scope_not_allowed
 *   - query vacío → 400 bad_request
 *   - search happy path: subject agéntico interno + data=packet
 *   - read-detail anti-oracle: inexistente / no agénticamente visible → 404
 *   - read-detail happy path: doc visible → document (DTO seguro) + sections
 *   - predicado agéntico (statuses, policy, sensitivity, audience)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const searchKnowledgeMock = vi.fn()
const getKnowledgeDocumentByIdMock = vi.fn()
const getKnowledgeDocumentVersionMock = vi.fn()
const listKnowledgeChunksForVersionMock = vi.fn()

vi.mock('@/lib/knowledge/search/search-knowledge', () => ({
  searchKnowledge: (...args: unknown[]) => searchKnowledgeMock(...args)
}))

vi.mock('@/lib/knowledge/store', () => ({
  getKnowledgeDocumentById: (...args: unknown[]) => getKnowledgeDocumentByIdMock(...args),
  getKnowledgeDocumentVersion: (...args: unknown[]) => getKnowledgeDocumentVersionMock(...args),
  listKnowledgeChunksForVersion: (...args: unknown[]) => listKnowledgeChunksForVersionMock(...args)
}))

import {
  getEcosystemKnowledgeDocumentPayload,
  getEcosystemKnowledgeSearchPayload,
  isDocumentAgenticallyVisible
} from './ecosystem-knowledge'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { KnowledgeDocument } from '@/lib/knowledge/types'

const ctx = (scopeType: string) =>
  ({
    requestId: 'req-1',
    routeKey: 'platform.ecosystem.knowledge.search',
    version: '2026-01-01',
    binding: { greenhouseScopeType: scopeType },
    consumer: { sisterPlatformKey: 'kortex', consumerId: 'consumer-1' },
    rateLimit: {}
  }) as never

const internalCtx = ctx('internal')
const clientCtx = ctx('client')

const doc = (overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument =>
  ({
    documentId: 'doc-1',
    publicId: 'KB-0001',
    sourceId: 'src-1',
    slug: 'motor-ico',
    title: 'Motor ICO',
    documentType: 'manual',
    ownerDomain: 'platform',
    approverRole: null,
    audience: 'internal',
    sensitivity: 'internal',
    publicationStatus: 'published',
    agenticPolicy: 'agent_allowed',
    currentVersionId: 'ver-1',
    humanUrl: 'https://x/y',
    reviewCadenceDays: null,
    lastReviewedAt: null,
    docLayer: null,
    createdByUserId: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides
  }) as KnowledgeDocument

beforeEach(() => {
  searchKnowledgeMock.mockReset()
  getKnowledgeDocumentByIdMock.mockReset()
  getKnowledgeDocumentVersionMock.mockReset()
  listKnowledgeChunksForVersionMock.mockReset()
})

describe('isDocumentAgenticallyVisible', () => {
  it('published + agent_allowed + internal + internal-audience → visible', () => {
    expect(isDocumentAgenticallyVisible(doc())).toBe(true)
  })

  it('stale visible; deprecated/draft no', () => {
    expect(isDocumentAgenticallyVisible(doc({ publicationStatus: 'stale' }))).toBe(true)
    expect(isDocumentAgenticallyVisible(doc({ publicationStatus: 'deprecated' }))).toBe(false)
    expect(isDocumentAgenticallyVisible(doc({ publicationStatus: 'draft' }))).toBe(false)
  })

  it('agent_excluded / restricted / audience-client → no visible', () => {
    expect(isDocumentAgenticallyVisible(doc({ agenticPolicy: 'agent_excluded' }))).toBe(false)
    expect(isDocumentAgenticallyVisible(doc({ sensitivity: 'restricted' }))).toBe(false)
    expect(isDocumentAgenticallyVisible(doc({ audience: 'client' }))).toBe(false)
  })

  it('audience mixed sí (dentro del envelope interno)', () => {
    expect(isDocumentAgenticallyVisible(doc({ audience: 'mixed' }))).toBe(true)
  })
})

describe('getEcosystemKnowledgeSearchPayload', () => {
  it('rechaza binding no-internal con 403 scope_not_allowed', async () => {
    const request = new Request('https://x/api/platform/ecosystem/knowledge/search?query=ico')

    await expect(getEcosystemKnowledgeSearchPayload({ context: clientCtx, request })).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
    expect(searchKnowledgeMock).not.toHaveBeenCalled()
  })

  it('rechaza query vacío con 400 bad_request', async () => {
    const request = new Request('https://x/api/platform/ecosystem/knowledge/search?query=%20%20')

    await expect(getEcosystemKnowledgeSearchPayload({ context: internalCtx, request })).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'bad_request'
    })
  })

  it('happy path: subject agéntico interno + data=packet', async () => {
    const packet = { contractVersion: 'knowledge-search.v1', confidence: 'high', freshness: 'current', chunks: [] }

    searchKnowledgeMock.mockResolvedValueOnce(packet)

    const request = new Request('https://x/api/platform/ecosystem/knowledge/search?query=motor%20ico&limit=5')
    const result = await getEcosystemKnowledgeSearchPayload({ context: internalCtx, request })

    expect(result.data).toBe(packet)
    expect(searchKnowledgeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'motor ico',
        mode: 'agentic',
        limit: 5,
        subject: expect.objectContaining({
          tenantType: 'efeonce_internal',
          tenantId: null,
          capabilities: ['knowledge.agentic.retrieve']
        })
      })
    )
  })
})

describe('getEcosystemKnowledgeDocumentPayload', () => {
  it('rechaza binding no-internal con 403', async () => {
    await expect(
      getEcosystemKnowledgeDocumentPayload({ context: clientCtx, documentId: 'doc-1' })
    ).rejects.toBeInstanceOf(ApiPlatformError)
    expect(getKnowledgeDocumentByIdMock).not.toHaveBeenCalled()
  })

  it('anti-oracle: doc inexistente → 404 not_found', async () => {
    getKnowledgeDocumentByIdMock.mockResolvedValueOnce(null)

    await expect(
      getEcosystemKnowledgeDocumentPayload({ context: internalCtx, documentId: 'nope' })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'not_found' })
  })

  it('anti-oracle: doc agent_excluded → 404 + nunca pide secciones', async () => {
    getKnowledgeDocumentByIdMock.mockResolvedValueOnce(doc({ agenticPolicy: 'agent_excluded' }))

    await expect(
      getEcosystemKnowledgeDocumentPayload({ context: internalCtx, documentId: 'doc-1' })
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(getKnowledgeDocumentVersionMock).not.toHaveBeenCalled()
  })

  it('happy path: doc visible → document (DTO seguro) + sections', async () => {
    getKnowledgeDocumentByIdMock.mockResolvedValueOnce(doc())
    getKnowledgeDocumentVersionMock.mockResolvedValueOnce({ versionId: 'ver-1' })
    listKnowledgeChunksForVersionMock.mockResolvedValueOnce([
      { chunkId: 'c1', chunkIndex: 0, headingPath: ['Motor ICO'], citationAnchor: 'intro', bodyText: 'def' }
    ])

    const result = await getEcosystemKnowledgeDocumentPayload({ context: internalCtx, documentId: 'doc-1' })

    expect(result.data.document.documentId).toBe('doc-1')
    expect(result.data.document).not.toHaveProperty('sourceId') // DTO seguro, sin internals de ingesta
    expect(result.data.sections).toHaveLength(1)
    expect(result.data.sections[0].citationAnchor).toBe('intro')
  })
})
