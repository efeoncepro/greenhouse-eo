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
    getSeoRankEvolution: vi.fn(),
    getSeoOverviewKpis: vi.fn(),
    getSeoSiteAuditReport: vi.fn(),
    getSeoBacklinkProfile: vi.fn(),
    getSeoPerformance: vi.fn(),
    getSeoPerformanceCatalog: vi.fn(),
    trackSeoKeywords: vi.fn(),
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

describe('get_seo_rank_evolution handler (TASK-1303)', () => {
  it('passthrough del payload + summary con conteo de series y source', async () => {
    const payload = {
      ok: true,
      source: 'postgres',
      range: { from: '2026-05-09', to: '2026-08-06', days: 90 },
      series: [{ keyword: 'a', points: [] }, { keyword: 'b', points: [] }]
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoRankEvolution: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoRankEvolution({ organizationId: 'org-1', rangeDays: 90 })

    expect(result.isError).toBe(false)
    expect(result.structuredContent).toMatchObject({ ok: true, data: payload })
    expect(result.content[0].text).toContain('2 keywords')
    expect(result.content[0].text).toContain('source=postgres')
  })

  it('degradación honesta: data.ok=false se reporta con su errorCode', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoRankEvolution: vi.fn().mockResolvedValue(okEnvelope({ ok: false, errorCode: 'no_data', status: null }))
      })
    )

    const result = await handlers.getSeoRankEvolution({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('unavailable (no_data)')
  })

  it('propaga el error del lane (anti-oracle 404) sin inventar datos', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoRankEvolution: vi.fn().mockRejectedValue(
          new GreenhouseMcpApiError('SEO resource not found for the resolved scope.', {
            status: 404,
            code: 'not_found',
            requestId: 'req-x'
          })
        )
      })
    )

    const result = await handlers.getSeoRankEvolution({ organizationId: 'org-ajena' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('404')
  })
})

describe('get_seo_site_audit_report handler (TASK-1304)', () => {
  it('passthrough del payload + summary con health y totales por severidad', async () => {
    const payload = {
      ok: true,
      run: { auditRunId: 'seoar-1', status: 'succeeded', healthScore: 87.5 },
      findings: { critical: [], warning: [], notice: [] },
      totals: { critical: 1, warning: 3, notice: 5 }
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoSiteAuditReport: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoSiteAuditReport({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.structuredContent).toMatchObject({ ok: true, data: payload })
    expect(result.content[0].text).toContain('status=succeeded')
    expect(result.content[0].text).toContain('1 critical / 3 warning / 5 notice')
  })

  it('run en curso se reporta como tal, sin fabricar findings', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoSiteAuditReport: vi
          .fn()
          .mockResolvedValue(okEnvelope({ ok: true, run: { status: 'running', healthScore: null }, totals: { critical: 0, warning: 0, notice: 0 } }))
      })
    )

    const result = await handlers.getSeoSiteAuditReport({ organizationId: 'org-1' })

    expect(result.content[0].text).toContain('still running')
  })

  it('degradación honesta: data.ok=false se reporta con su errorCode', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoSiteAuditReport: vi.fn().mockResolvedValue(okEnvelope({ ok: false, errorCode: 'no_data', status: null }))
      })
    )

    const result = await handlers.getSeoSiteAuditReport({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('unavailable (no_data)')
  })

  it('propaga el error del lane (anti-oracle 404) sin inventar datos', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoSiteAuditReport: vi.fn().mockRejectedValue(
          new GreenhouseMcpApiError('SEO resource not found for the resolved scope.', {
            status: 404,
            code: 'not_found',
            requestId: 'req-x'
          })
        )
      })
    )

    const result = await handlers.getSeoSiteAuditReport({ organizationId: 'org-ajena' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('404')
  })
})

describe('get_seo_backlink_profile handler (TASK-1304)', () => {
  it('passthrough del payload + summary con conteo de snapshots', async () => {
    const payload = {
      ok: true,
      range: { from: '2025-08-07', to: '2026-08-06', days: 365 },
      points: [{ date: '2026-07-30' }, { date: '2026-08-06' }]
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoBacklinkProfile: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoBacklinkProfile({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.structuredContent).toMatchObject({ ok: true, data: payload })
    expect(result.content[0].text).toContain('2 weekly snapshots')
    expect(result.content[0].text).toContain('365 days')
  })

  it('degradación honesta: serie vacía = no_data reportado, nunca ceros', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoBacklinkProfile: vi.fn().mockResolvedValue(okEnvelope({ ok: false, errorCode: 'no_data', status: null }))
      })
    )

    const result = await handlers.getSeoBacklinkProfile({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('unavailable (no_data)')
  })
})

describe('get_seo_overview_kpis handler (TASK-1306)', () => {
  it('resume los KPIs medidos del período y declara la comparación disponible', async () => {
    const payload = {
      ok: true,
      organizationId: 'org-1',
      current: { clicks: 2596, impressions: 136146, position: 5.783, ctr: 0.0191 },
      previous: { clicks: 2100, impressions: 120000, position: 6.4, ctr: 0.0175 },
      series: [],
      rangeDays: 28
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoOverviewKpis: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoOverviewKpis({ organizationId: 'org-1', rangeDays: 28 })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('2596 clicks')
    expect(result.content[0].text).toContain('avg position 5.8')
    expect(result.content[0].text).toContain('with previous-window comparison')
  })

  it('sin ventana previa comparable lo DICE, en vez de sugerir una caída del 100%', async () => {
    const payload = {
      ok: true,
      organizationId: 'org-1',
      current: { clicks: 10, impressions: 100, position: 4.2, ctr: 0.1 },
      // El caso real de un Space recién conectado: 5 días de serie, sin ventana anterior.
      previous: null,
      series: [],
      rangeDays: 28
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoOverviewKpis: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoOverviewKpis({ organizationId: 'org-1' })

    expect(result.content[0].text).toContain('no comparable previous window')
  })

  it('sin impresiones, position/ctr null se reportan como n/a y NUNCA como cero', async () => {
    const payload = {
      ok: true,
      organizationId: 'org-1',
      current: { clicks: 0, impressions: 0, position: null, ctr: null },
      previous: null,
      series: [],
      rangeDays: 28
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ getSeoOverviewKpis: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.getSeoOverviewKpis({ organizationId: 'org-1' })

    expect(result.content[0].text).toContain('avg position n/a')
    expect(result.content[0].text).not.toContain('avg position 0.0')
  })

  it('degradación honesta: data.ok=false se reporta con su errorCode', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        getSeoOverviewKpis: vi.fn().mockResolvedValue(okEnvelope({ ok: false, errorCode: 'disabled', status: null }))
      })
    )

    const result = await handlers.getSeoOverviewKpis({ organizationId: 'org-1' })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('unavailable (disabled)')
  })
})

describe('track_seo_keywords handler (TASK-1308) — el único tool SEO que escribe', () => {
  it('enumera el outcome POR keyword y nombra el techo, no sólo "ok"', async () => {
    const payload = {
      ok: true,
      seoTargetId: 'seot-1',
      keywordSetId: 'seoks-1',
      outcomes: [
        { keyword: 'a', status: 'tracked' },
        { keyword: 'b', status: 'already_tracked' },
        { keyword: 'c', status: 'capacity_exceeded' }
      ],
      activeKeywordCount: 200,
      capacity: 200
    }

    const handlers = createGreenhouseMcpHandlers(
      buildClient({ trackSeoKeywords: vi.fn().mockResolvedValue(okEnvelope(payload)) })
    )

    const result = await handlers.trackSeoKeywords({ organizationId: 'org-1', keywords: ['a', 'b', 'c'] })

    expect(result.isError).toBe(false)
    expect(result.content[0].text).toContain('1 newly tracked')
    expect(result.content[0].text).toContain('1 already tracked')
    expect(result.content[0].text).toContain('1 rejected (set at capacity)')
    expect(result.content[0].text).toContain('200/200')
    // Lo rebotado tiene que llegar al usuario, no quedarse en el structuredContent.
    expect(result.content[0].text).toContain('report the rejected keywords')
  })

  it('sin rechazos no agrega la advertencia de keywords rebotadas', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        trackSeoKeywords: vi.fn().mockResolvedValue(
          okEnvelope({
            ok: true,
            outcomes: [{ keyword: 'a', status: 'tracked' }],
            activeKeywordCount: 1,
            capacity: 200
          })
        )
      })
    )

    const result = await handlers.trackSeoKeywords({ organizationId: 'org-1', keywords: ['a'] })

    expect(result.content[0].text).not.toContain('report the rejected keywords')
  })

  it('degradación honesta: el rechazo del command se reporta con su errorCode', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        trackSeoKeywords: vi
          .fn()
          .mockResolvedValue(okEnvelope({ ok: false, errorCode: 'no_entitlement', status: null }))
      })
    )

    const result = await handlers.trackSeoKeywords({ organizationId: 'org-1', keywords: ['a'] })

    expect(result.content[0].text).toContain('rejected (no_entitlement)')
  })

  it('propaga el deny del lane (scope no interno) sin fabricar un éxito', async () => {
    const handlers = createGreenhouseMcpHandlers(
      buildClient({
        trackSeoKeywords: vi.fn().mockRejectedValue(
          new GreenhouseMcpApiError('scope not allowed', { status: 403, code: 'scope_not_allowed' })
        )
      })
    )

    const result = await handlers.trackSeoKeywords({ organizationId: 'org-1', keywords: ['a'] })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('403')
    expect(result.content[0].text).toContain('scope_not_allowed')
  })
})
