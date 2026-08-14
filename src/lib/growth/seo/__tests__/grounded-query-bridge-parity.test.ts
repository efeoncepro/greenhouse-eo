import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1666 — Paridad Full API del puente grounded.
 *
 * Todos los lanes convergen en LOS MISMOS primitives (`createGroundedQueryDraft` /
 * `readGroundedQueryDraft`): app route (actor humano), lane ecosystem (actor máquina,
 * sólo bindings `internal`) y handlers MCP (vía el client del lane). También fija los
 * boundaries: binding org-scoped no puede preparar drafts (403) y el write máquina queda
 * fail-closed por capability humana hasta TASK-1631.
 */

vi.mock('server-only', () => ({}))

const createMock = vi.fn()
const readMock = vi.fn()

vi.mock('@/lib/growth/seo/grounded-query-bridge', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>

  return {
    ...actual,
    createGroundedQueryDraft: (...args: unknown[]) => createMock(...args)
  }
})

vi.mock('@/lib/growth/seo/grounded-query-reader', () => ({
  readGroundedQueryDraft: (...args: unknown[]) => readMock(...args)
}))

const tenantState = { tenant: { userId: 'user-1' } as { userId: string } | null }

vi.mock('@/lib/tenant/authorization', () => ({
  requireInternalTenantContext: async () => ({
    tenant: tenantState.tenant,
    errorResponse: tenantState.tenant ? null : new Response(null, { status: 401 })
  })
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

// Deps del lane ecosystem (sujeto máquina).
vi.mock('@/lib/growth/seo/flags', () => ({
  isSeoModuleEnabled: () => true,
  isSeoKeywordDiscoveryEnabled: () => true
}))

vi.mock('@/lib/growth/seo/entitlement', () => ({
  resolveSeoEntitlement: async (organizationId: string) => ({
    organizationId,
    hasModule: true,
    tier: 'contracted',
    blockedReason: null
  }),
  enforceSeoRunEntitlement: async () => ({ allowed: true, blockedReason: null })
}))

vi.mock('@/lib/growth/seo/resolve-target', () => ({
  resolveSeoTargetForMarket: async () => ({
    status: 'resolved',
    target: { seoTargetId: 'seot-1', rootDomain: 'x.com', locationCode: '2484', languageCode: 'es', market: 'MX' },
    activeMarkets: []
  })
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => [],
  withGreenhousePostgresTransaction: async () => {
    throw new Error('la transacción no debe alcanzarse: los primitives están mockeados')
  },
  onGreenhousePostgresReset: () => undefined
}))

import { GET as adminGet, POST as adminPost } from '@/app/api/admin/growth/seo/grounded-queries/route'
import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import {
  getEcosystemSeoGroundedQueryDraftPayload,
  prepareEcosystemSeoGroundedQueriesPayload
} from '@/lib/api-platform/resources/ecosystem-growth-seo'
import { createGreenhouseMcpHandlers } from '@/mcp/greenhouse/tools'

const internalContext = {
  binding: { organizationId: null, greenhouseScopeType: 'internal' },
  consumer: { publicId: 'gateway-1' }
} as unknown as ApiPlatformRequestContext

const clientScopedContext = {
  binding: { organizationId: 'org-cliente', greenhouseScopeType: 'organization' },
  consumer: { publicId: 'client-app' }
} as unknown as ApiPlatformRequestContext

const createOk = {
  ok: true,
  draft: { setId: 'set-1', version: 2, status: 'draft' },
  groundingMode: 'grounded_llm',
  sourceRefs: ['seo.discovery.run:seokdr-1'],
  candidateCount: 2,
  authoringStatus: 'ok',
  deduped: false,
  fallbackNotice: null
}

const readOk = {
  ok: true,
  setId: 'set-1',
  profileId: 'prof-1',
  version: 2,
  status: 'draft',
  generationStrategy: 'llm',
  systemPromptVersion: 'aeo-author.seo-grounded.v1',
  groundingMode: 'grounded_llm',
  prompts: [],
  sourceRefs: [],
  aeoSources: [],
  createdBy: 'user-1',
  createdAt: 'x',
  approvedBy: null,
  approvedAt: null,
  fallbackNotice: null
}

const postBody = {
  organizationId: 'org-1',
  profileId: 'prof-1',
  seoTargetId: 'seot-1',
  discoveryRunId: 'seokdr-1',
  candidateIds: ['seokdc-1', 'seokdc-2']
}

beforeEach(() => {
  createMock.mockReset().mockResolvedValue(createOk)
  readMock.mockReset().mockResolvedValue(readOk)
  tenantState.tenant = { userId: 'user-1' }
})

describe('app lane', () => {
  it('POST delega en createGroundedQueryDraft con actor HUMANO y responde 201', async () => {
    const response = await adminPost(
      new Request('http://localhost/api/admin/growth/seo/grounded-queries', {
        method: 'POST',
        body: JSON.stringify(postBody)
      })
    )

    expect(response.status).toBe(201)
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1', createdBy: 'user-1' })
  })

  it('GET delega en readGroundedQueryDraft; draft ajeno → 404 canónico', async () => {
    readMock.mockResolvedValue({ ok: false, errorCode: 'draft_not_found', status: 404 })

    const response = await adminGet(
      new Request('http://localhost/api/admin/growth/seo/grounded-queries?organizationId=org-1&profileId=prof-1&setId=set-ajeno')
    )

    expect(response.status).toBe(404)
    expect(readMock).toHaveBeenCalledTimes(1)
  })
})

describe('lane ecosystem', () => {
  it('POST: MISMO primitive, actor máquina y passthrough del resultado', async () => {
    const result = await prepareEcosystemSeoGroundedQueriesPayload({
      context: internalContext,
      request: new Request('http://localhost/x?organizationId=org-1', { method: 'POST' }),
      body: postBody
    })

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0]).toMatchObject({ createdBy: 'mcp:gateway-1', organizationId: 'org-1' })
    // El subject máquina NO lleva roles: la capability humana queda fail-closed (TASK-1631).
    expect(createMock.mock.calls[0][0].subject).toMatchObject({ userId: 'mcp:gateway-1', roleCodes: [] })
    expect(result.data).toBe(createOk)
  })

  it('🔴 un binding org-scoped NO puede preparar drafts: 403 scope_not_allowed', async () => {
    await expect(
      prepareEcosystemSeoGroundedQueriesPayload({
        context: clientScopedContext,
        request: new Request('http://localhost/x', { method: 'POST' }),
        body: postBody
      })
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(createMock).not.toHaveBeenCalled()
  })

  it('GET: passthrough del reader con el binding interno', async () => {
    const result = await getEcosystemSeoGroundedQueryDraftPayload({
      context: internalContext,
      request: new Request('http://localhost/x?organizationId=org-1&profileId=prof-1&setId=set-1')
    })

    expect(readMock).toHaveBeenCalledTimes(1)
    expect(result.data).toBe(readOk)
  })
})

describe('MCP', () => {
  it('los handlers consumen el lane y resumen honesto (draft, modo, jamás activo)', async () => {
    const handlers = createGreenhouseMcpHandlers({
      getSeoGroundedQueryDraft: async () => ({ data: readOk, meta: {}, requestId: 'req-1' }),
      prepareSeoGroundedQueries: async () => ({ data: createOk, meta: {}, requestId: 'req-2' })
    } as never)

    const read = await handlers.getSeoGroundedQueryDraft({ profileId: 'prof-1', setId: 'set-1' })

    expect(read.content[0].text).toContain('set-1')
    expect(read.content[0].text).toContain('AEO review')

    const write = await handlers.prepareSeoGroundedQueries({
      profileId: 'prof-1',
      seoTargetId: 'seot-1',
      discoveryRunId: 'seokdr-1',
      candidateIds: ['seokdc-1']
    })

    expect(write.content[0].text).toContain('DRAFT')
    expect(write.content[0].text).toContain('never activates')
  })

  it('el fallback viaja con su warning obligatorio en el summary', async () => {
    const handlers = createGreenhouseMcpHandlers({
      getSeoGroundedQueryDraft: async () => ({ data: readOk, meta: {}, requestId: 'req-1' }),
      prepareSeoGroundedQueries: async () => ({
        data: { ...createOk, groundingMode: 'baseline_fallback', fallbackNotice: 'No es candidate-specific.' },
        meta: {},
        requestId: 'req-3'
      })
    } as never)

    const write = await handlers.prepareSeoGroundedQueries({
      profileId: 'prof-1',
      seoTargetId: 'seot-1',
      discoveryRunId: 'seokdr-1',
      candidateIds: ['seokdc-1']
    })

    expect(write.content[0].text).toContain('WARNING')
    expect(write.content[0].text).toContain('No es candidate-specific.')
  })
})
