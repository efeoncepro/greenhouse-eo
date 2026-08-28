import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1664 — Paridad Full API de keyword discovery.
 *
 * La garantía que este archivo protege: app lane, lane ecosystem (que sirve a MCP y al
 * gateway) y los handlers MCP convergen en LOS MISMOS primitives
 * (`queueKeywordDiscovery` / `readKeywordDiscovery` / `recordKeywordDiscoveryAction`) —
 * cero lógica de dominio duplicada por lane. Se mockean los primitives y se verifica que
 * cada lane los invoque y haga passthrough del resultado; la lógica de dominio tiene su
 * propia suite en `keyword-discovery/__tests__/`.
 *
 * También cubre los boundaries que distinguen los lanes: actor humano vs actor máquina,
 * write sólo para bindings `internal` y anti-oracle de run ajeno.
 */

vi.mock('server-only', () => ({}))

const queueMock = vi.fn()
const previewMock = vi.fn()
const readMock = vi.fn()
const actionMock = vi.fn()

vi.mock('@/lib/growth/seo/keyword-discovery/queue', () => ({
  queueKeywordDiscovery: (...args: unknown[]) => queueMock(...args),
  previewKeywordDiscovery: (...args: unknown[]) => previewMock(...args),
  recordKeywordDiscoveryAction: (...args: unknown[]) => actionMock(...args)
}))

vi.mock('@/lib/growth/seo/keyword-discovery/reader', () => ({
  readKeywordDiscovery: (...args: unknown[]) => readMock(...args)
}))

// ─── Deps del app lane ──────────────────────────────────────────────────────────────

const tenantState = { tenant: { userId: 'user-1' } as { userId: string } | null, canResult: true }

vi.mock('@/lib/tenant/authorization', () => ({
  requireInternalTenantContext: async () => ({
    tenant: tenantState.tenant,
    errorResponse: tenantState.tenant ? null : new Response(null, { status: 401 })
  })
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: () => tenantState.canResult
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

// ─── Deps del lane ecosystem (sujeto máquina) ───────────────────────────────────────

const laneState = { flagOn: true, hasModule: true }

vi.mock('@/lib/growth/seo/flags', () => ({
  isSeoModuleEnabled: () => laneState.flagOn,
  isSeoKeywordDiscoveryEnabled: () => true,
  isSeoKeywordMarketDataEnabled: () => true
}))

vi.mock('@/lib/growth/seo/entitlement', () => ({
  resolveSeoEntitlement: async (organizationId: string) => ({
    organizationId,
    hasModule: laneState.hasModule,
    tier: laneState.hasModule ? 'contracted' : null,
    blockedReason: laneState.hasModule ? null : 'no_entitlement'
  }),
  enforceSeoRunEntitlement: async () => ({ allowed: true, blockedReason: null, budgetRemainingUsd: 40 })
}))

vi.mock('@/lib/growth/seo/resolve-target', () => ({
  resolveSeoTargetForMarket: async () => ({
    status: 'resolved',
    target: { seoTargetId: 'seot-1', rootDomain: 'x.com', locationCode: '2152', languageCode: 'es', market: 'CL' },
    activeMarkets: []
  })
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => [],
  withGreenhousePostgresTransaction: async () => {
    throw new Error('la transacción no debe alcanzarse: los primitives están mockeados')
  },
  // `@/lib/db` registra un reset hook al cargarse (lo arrastra track-keywords vía el lane).
  onGreenhousePostgresReset: () => undefined
}))

import { GET as adminGet, POST as adminPost } from '@/app/api/admin/growth/seo/keyword-discovery/route'
import {
  discoverEcosystemSeoKeywordsPayload,
  getEcosystemSeoKeywordDiscoveryPayload
} from '@/lib/api-platform/resources/ecosystem-growth-seo'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { createGreenhouseMcpHandlers } from '@/mcp/greenhouse/tools'

const internalContext = {
  binding: { organizationId: null, greenhouseScopeType: 'internal' },
  consumer: { publicId: 'gateway-1' }
} as unknown as ApiPlatformRequestContext

const clientScopedContext = {
  binding: { organizationId: 'org-cliente', greenhouseScopeType: 'organization' },
  consumer: { publicId: 'client-app' }
} as unknown as ApiPlatformRequestContext

const queueOk = {
  ok: true,
  runId: 'seokdr-1',
  deduped: false,
  estimatedCostUsd: 0.03,
  providerCalls: 3,
  formula: '3 llamada(s) × ...',
  seedCount: 2,
  budgetRemainingUsd: 40
}

const readOk = {
  ok: true,
  runs: [],
  run: { runId: 'seokdr-1', status: 'succeeded' },
  candidates: [],
  totalCandidates: 0,
  nextCursor: null,
  marketAvailability: 'available',
  marketFreshness: '2026-08-13',
  trackingCostDisclosure: 'x'
}

beforeEach(() => {
  queueMock.mockReset().mockResolvedValue(queueOk)
  previewMock.mockReset().mockResolvedValue({ ok: true, seeds: [], estimate: { estimatedCostUsd: 0, providerCalls: 0, formula: '' }, wouldBeAllowed: true, blockedReason: null })
  readMock.mockReset().mockResolvedValue(readOk)
  actionMock.mockReset().mockResolvedValue({ ok: true, actionId: 'seokda-1', deduped: false })
  tenantState.tenant = { userId: 'user-1' }
  tenantState.canResult = true
  laneState.flagOn = true
  laneState.hasModule = true
})

describe('app lane — el route delega en el primitive', () => {
  it('POST queue → queueKeywordDiscovery con actor HUMANO y 202 passthrough', async () => {
    const response = await adminPost(
      new Request('http://localhost/api/admin/growth/seo/keyword-discovery', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-1',
          seedSource: 'manual',
          manualSeeds: ['pintura'],
          methods: ['keyword_suggestions']
        })
      })
    )

    expect(response.status).toBe(202)
    expect(queueMock).toHaveBeenCalledTimes(1)
    expect(queueMock.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1', actor: 'user-1' })

    const body = await response.json()

    expect(body.runId).toBe('seokdr-1')
  })

  it('GET → readKeywordDiscovery con los filtros del query string', async () => {
    const response = await adminGet(
      new Request(
        'http://localhost/api/admin/growth/seo/keyword-discovery?organizationId=org-1&runId=seokdr-1&minSearchVolume=100'
      )
    )

    expect(response.status).toBe(200)
    expect(readMock).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', runId: 'seokdr-1', minSearchVolume: 100 })
    )
  })

  it('TASK-1694: los DOS lanes parsean maxLinkBarrier/includeUnknownBarrier con el mismo vocabulario', async () => {
    await adminGet(
      new Request(
        'http://localhost/api/admin/growth/seo/keyword-discovery?organizationId=org-1&runId=seokdr-1&maxLinkBarrier=medium&includeUnknownBarrier=true'
      )
    )

    expect(readMock).toHaveBeenCalledWith(
      expect.objectContaining({ maxLinkBarrier: 'medium', includeUnknownBarrier: true })
    )

    readMock.mockClear()

    await getEcosystemSeoKeywordDiscoveryPayload({
      context: internalContext,
      request: new Request('http://localhost/x?organizationId=org-1&runId=seokdr-1&maxLinkBarrier=medium&includeUnknownBarrier=true')
    })

    expect(readMock).toHaveBeenCalledWith(
      expect.objectContaining({ maxLinkBarrier: 'medium', includeUnknownBarrier: true })
    )
  })

  it('TASK-1694: una barrera fuera del vocabulario se ignora en los dos lanes, jamás se pasa cruda', async () => {
    await adminGet(
      new Request(
        'http://localhost/api/admin/growth/seo/keyword-discovery?organizationId=org-1&runId=seokdr-1&maxLinkBarrier=imposible'
      )
    )

    expect(readMock).toHaveBeenCalledWith(expect.objectContaining({ maxLinkBarrier: undefined }))

    readMock.mockClear()

    await getEcosystemSeoKeywordDiscoveryPayload({
      context: internalContext,
      request: new Request('http://localhost/x?organizationId=org-1&runId=seokdr-1&maxLinkBarrier=imposible')
    })

    expect(readMock).toHaveBeenCalledWith(expect.objectContaining({ maxLinkBarrier: undefined }))
  })

  it('🔴 TASK-1694: maxDifficulty se sigue ACEPTANDO en los dos lanes — deprecado nunca es 4xx', async () => {
    const appResponse = await adminGet(
      new Request(
        'http://localhost/api/admin/growth/seo/keyword-discovery?organizationId=org-1&runId=seokdr-1&maxDifficulty=20'
      )
    )

    // Eliminarlo convertiría un parámetro aprendido en un error duro para un agente que ya lo
    // usa; el reader lo ignora y lo declara, que es la forma fail-safe de equivocarse.
    expect(appResponse.status).toBe(200)
    expect(readMock).toHaveBeenCalledWith(expect.objectContaining({ maxDifficulty: 20 }))

    readMock.mockClear()

    const laneResult = await getEcosystemSeoKeywordDiscoveryPayload({
      context: internalContext,
      request: new Request('http://localhost/x?organizationId=org-1&runId=seokdr-1&maxDifficulty=20')
    })

    expect(laneResult.data).toBe(readOk)
    expect(readMock).toHaveBeenCalledWith(expect.objectContaining({ maxDifficulty: 20 }))
  })

  it('run ajeno → 404 anti-oracle canónico', async () => {
    readMock.mockResolvedValue({ ok: false, errorCode: 'run_not_found' })

    const response = await adminGet(
      new Request('http://localhost/api/admin/growth/seo/keyword-discovery?organizationId=org-1&runId=seokdr-ajeno')
    )

    expect(response.status).toBe(404)
  })
})

describe('lane ecosystem — passthrough del MISMO primitive', () => {
  it('GET: el payload ES el resultado del reader (cero re-mapeo)', async () => {
    const result = await getEcosystemSeoKeywordDiscoveryPayload({
      context: internalContext,
      request: new Request('http://localhost/x?organizationId=org-1&runId=seokdr-1')
    })

    expect(readMock).toHaveBeenCalledTimes(1)
    expect(result.data).toBe(readOk)
    expect(result.meta).toMatchObject({ module: 'growth.seo', organizationId: 'org-1' })
  })

  it('POST: queueKeywordDiscovery con actor MÁQUINA (mcp:<publicId>)', async () => {
    const result = await discoverEcosystemSeoKeywordsPayload({
      context: internalContext,
      request: new Request('http://localhost/x?organizationId=org-1', { method: 'POST' }),
      body: { organizationId: 'org-1', seedSource: 'manual', manualSeeds: ['pintura'], methods: ['keyword_suggestions'] }
    })

    expect(queueMock).toHaveBeenCalledTimes(1)
    expect(queueMock.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1', actor: 'mcp:gateway-1' })
    expect(result.data).toBe(queueOk)
  })

  it('🔴 un binding org-scoped NO puede encolar gasto: 403 scope_not_allowed', async () => {
    await expect(
      discoverEcosystemSeoKeywordsPayload({
        context: clientScopedContext,
        request: new Request('http://localhost/x', { method: 'POST' }),
        body: { seedSource: 'manual', manualSeeds: ['pintura'] }
      })
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(queueMock).not.toHaveBeenCalled()
  })
})

describe('MCP — los handlers consumen el lane, no un camino paralelo', () => {
  it('get_seo_keyword_discovery pasa por el client del lane y resume honesto', async () => {
    const clientCalls: unknown[] = []

    const handlers = createGreenhouseMcpHandlers({
      getSeoKeywordDiscovery: async (input: unknown) => {
        clientCalls.push(input)

        return { data: readOk, meta: {}, requestId: 'req-1' }
      },
      discoverSeoKeywords: async () => ({ data: queueOk, meta: {}, requestId: 'req-2' })
    } as never)

    const result = await handlers.getSeoKeywordDiscovery({ organizationId: 'org-1', runId: 'seokdr-1' })

    expect(clientCalls).toHaveLength(1)
    expect((result.structuredContent as { data?: unknown }).data).toBe(readOk)
    expect(result.content[0].text).toContain('seokdr-1')
    // El summary declara la lente estimada y la separación con GSC.
    expect(result.content[0].text).toContain('ESTIMATED')
  })

  it('discover_seo_keywords advierte que la corrida es ASYNC (no inventa resultados)', async () => {
    const handlers = createGreenhouseMcpHandlers({
      getSeoKeywordDiscovery: async () => ({ data: readOk, meta: {}, requestId: 'req-1' }),
      discoverSeoKeywords: async () => ({ data: queueOk, meta: {}, requestId: 'req-2' })
    } as never)

    const result = await handlers.discoverSeoKeywords({ seedSource: 'manual', manualSeeds: ['pintura'] })

    expect(result.content[0].text).toContain('ASYNC')
    expect(result.content[0].text).toContain('seokdr-1')
  })
})
