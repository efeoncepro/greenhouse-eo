/**
 * TASK-1086 Slice 3 — tests de los MCP knowledge handlers (search + document).
 */
import { describe, expect, it, vi } from 'vitest'

import { GreenhouseMcpApiError } from '../http-client'
import { createGreenhouseMcpHandlers } from '../tools'

// Mock completo del client; cada test sobreescribe solo lo que ejercita.
const buildClient = (overrides: Record<string, unknown> = {}) =>
  ({
    getContext: vi.fn(),
    listOrganizations: vi.fn(),
    getOrganization: vi.fn(),
    listCapabilities: vi.fn(),
    getIntegrationReadiness: vi.fn(),
    getPlatformHealth: vi.fn(),
    listEventTypes: vi.fn(),
    listWebhookSubscriptions: vi.fn(),
    getWebhookSubscription: vi.fn(),
    listWebhookDeliveries: vi.fn(),
    getWebhookDelivery: vi.fn(),
    searchKnowledge: vi.fn(),
    getKnowledgeDocument: vi.fn(),
    ...overrides
  }) as never

describe('search_knowledge handler', () => {
  it('preserva el packet en structuredContent + summary con confidence', async () => {
    const packet = { contractVersion: 'knowledge-search.v1', confidence: 'high', chunks: [{ a: 1 }, { a: 2 }] }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        searchKnowledge: vi.fn().mockResolvedValue({
          ok: true,
          requestId: 'req-k1',
          apiVersion: '2026-04-25',
          status: 200,
          data: packet,
          meta: {}
        })
      })
    )

    const result = await handlers.searchKnowledge({ query: 'motor ico' })

    expect(result.isError).toBe(false)
    expect(result.structuredContent).toMatchObject({ ok: true, data: packet })
    expect(result.content[0].text).toContain('confidence=high')
    expect(result.content[0].text).toContain('2 chunks')
  })

  it('no-answer (confidence=none) se reporta honesto, sin inventar', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        searchKnowledge: vi.fn().mockResolvedValue({
          ok: true,
          requestId: 'req-k2',
          apiVersion: '2026-04-25',
          status: 200,
          data: { confidence: 'none', chunks: [] },
          meta: {}
        })
      })
    )

    const result = await handlers.searchKnowledge({ query: 'algo no documentado' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('0 chunks')
    expect(result.content[0].text).toContain('confidence=none')
  })
})

describe('get_knowledge_document handler', () => {
  it('summary con título + secciones', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getKnowledgeDocument: vi.fn().mockResolvedValue({
          ok: true,
          requestId: 'req-k3',
          apiVersion: '2026-04-25',
          status: 200,
          data: { document: { title: 'Motor ICO', publicationStatus: 'published' }, sections: [{}, {}, {}] },
          meta: {}
        })
      })
    )

    const result = await handlers.getKnowledgeDocument({ id: 'doc-1' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('Motor ICO')
    expect(result.content[0].text).toContain('3 sections')
  })

  it('404 anti-oracle se propaga como error machine-readable', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getKnowledgeDocument: vi.fn().mockRejectedValue(
          new GreenhouseMcpApiError('Knowledge document not found.', {
            status: 404,
            code: 'not_found',
            requestId: 'req-k4',
            apiVersion: '2026-04-25',
            details: null
          })
        )
      })
    )

    const result = await handlers.getKnowledgeDocument({ id: 'missing' })

    expect(result.isError).toBe(true)
    expect(result.structuredContent).toMatchObject({
      ok: false,
      status: 404,
      error: { code: 'not_found' }
    })
  })
})
