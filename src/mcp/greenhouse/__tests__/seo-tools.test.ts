/**
 * TASK-1645 — tests de los MCP SEO handlers (keyword opportunities + visibility 360 +
 * entitlement). Los handlers son adapters delgados: el gate real (entitlement per-org +
 * anti-oracle) vive en el lane ecosystem; acá se verifica el passthrough, el summary
 * honesto en degradación y la propagación de errores del lane.
 */
import { describe, expect, it, vi } from 'vitest'

import { GreenhouseMcpApiError } from '../http-client'
import { createGreenhouseMcpHandlers } from '../tools'

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
    searchServices: vi.fn(),
    simulateQuote: vi.fn(),
    getSeoKeywordOpportunities: vi.fn(),
    getSeoVisibility360: vi.fn(),
    getSeoEntitlement: vi.fn(),
    ...overrides
  }) as never

const okEnvelope = <T>(data: T) => ({
  ok: true,
  requestId: 'req-seo-1',
  apiVersion: '2026-04-25',
  status: 200,
  data,
  meta: {}
})

describe('get_seo_keyword_opportunities handler', () => {
  it('passthrough del payload + summary con conteo', async () => {
    const payload = { ok: true, opportunities: [{ keyword: 'a' }, { keyword: 'b' }] }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoKeywordOpportunities: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoKeywordOpportunities({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.structuredContent).toMatchObject({ ok: true, data: payload })
    expect(result.content[0].text).toContain('2 SEO keyword opportunities')
  })

  it('degradación honesta: data.ok=false se reporta con su errorCode', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoKeywordOpportunities: vi
          .fn()
          .mockResolvedValue(okEnvelope({ ok: false, errorCode: 'target_not_configured', organizationId: 'org-1' }))
      })
    )

    const result = await handlers.getSeoKeywordOpportunities({ organizationId: 'org-1' })

    expect(result.content[0].text).toContain('unavailable (target_not_configured)')
  })
})

describe('get_seo_visibility_360 handler', () => {
  it('summary con domainQuadrant + score + conteo de keywords', async () => {
    const payload = {
      ok: true,
      domainQuadrant: 'riesgo',
      aeoLens: { overallScore: 44.5 },
      quadrants: [{ keyword: 'berel', quadrant: 'riesgo' }]
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoVisibility360: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoVisibility360({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('domainQuadrant=riesgo')
    expect(result.content[0].text).toContain('aeoScore=44.5')
    expect(result.content[0].text).toContain('1 keywords')
  })

  it('lente faltante (no_aeo_data) se reporta honesta, sin quadrant fabricado', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoVisibility360: vi
          .fn()
          .mockResolvedValue(okEnvelope({ ok: false, errorCode: 'no_aeo_data', status: null }))
      })
    )

    const result = await handlers.getSeoVisibility360({ organizationId: 'org-1' })

    expect(result.content[0].text).toContain('unavailable (no_aeo_data)')
    expect(result.structuredContent).toMatchObject({ data: { ok: false, errorCode: 'no_aeo_data' } })
  })

  it('error del lane (404 anti-oracle) llega como isError con el código', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoVisibility360: vi.fn().mockRejectedValue(
          new GreenhouseMcpApiError('SEO resource not found for the resolved scope.', {
            status: 404,
            code: 'not_found',
            requestId: 'req-404',
            apiVersion: '2026-04-25',
            details: null
          })
        )
      })
    )

    const result = await handlers.getSeoVisibility360({ organizationId: 'org-ajena' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('404')
    expect(result.content[0].text).toContain('not_found')
  })
})

describe('get_seo_entitlement handler', () => {
  it('summary con tier + allowance + budget restantes', async () => {
    const payload = {
      ok: true,
      organizationId: 'org-1',
      hasModule: true,
      tier: 'contracted',
      allowanceRemaining: 6,
      budgetRemainingUsd: 45
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoEntitlement: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoEntitlement({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('hasModule=true')
    expect(result.content[0].text).toContain('tier=contracted')
    expect(result.content[0].text).toContain('auditsRemaining=6')
    expect(result.content[0].text).toContain('budgetRemainingUsd=45')
  })

  it('org sin módulo → hasModule=false visible (sin anti-oracle, por diseño)', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoEntitlement: vi
          .fn()
          .mockResolvedValue(okEnvelope({ ok: true, hasModule: false, tier: null, allowanceRemaining: 0, budgetRemainingUsd: 0 }))
      })
    )

    const result = await handlers.getSeoEntitlement({ organizationId: 'org-p' })

    expect(result.content[0].text).toContain('hasModule=false')
    expect(result.content[0].text).toContain('tier=none')
  })
})
