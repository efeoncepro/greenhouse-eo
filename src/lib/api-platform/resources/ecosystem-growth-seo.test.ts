import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1645 — Lane ecosystem SEO: derivación de sujeto máquina + gates.
 * Cubre: org del binding manda (mismatch → 404 anti-oracle), internal exige param,
 * scope no-interno sin org → 403, sin entitlement → 404 anti-oracle, entitled sin
 * target → target_not_configured honesto, passthrough del reader, flag OFF → disabled
 * sin tocar entitlement, y el payload de entitlement SIN anti-oracle (visibilidad
 * operativa deliberada).
 */

vi.mock('server-only', () => ({}))

const state = {
  flagOn: true,
  hasModule: true,
  tier: 'contracted' as string | null,
  targetId: 'seot-1' as string | null,
  opportunitiesResult: { ok: true, opportunities: [] } as unknown,
  gapResult: { ok: true, quadrants: [] } as unknown,
  entitlementCalls: [] as string[]
}

vi.mock('@/lib/growth/seo/flags', () => ({
  isSeoModuleEnabled: () => state.flagOn
}))

vi.mock('@/lib/growth/seo/entitlement', () => ({
  resolveSeoEntitlement: async (organizationId: string) => {
    state.entitlementCalls.push(organizationId)

    return {
      organizationId,
      hasModule: state.hasModule,
      tier: state.hasModule ? state.tier : null,
      assignmentId: state.hasModule ? 'cpma-1' : null,
      status: state.hasModule ? 'active' : null,
      allowanceCap: 8,
      allowanceUsed: 2,
      allowanceRemaining: 6,
      budgetCapUsd: 50,
      budgetUsedUsd: 5,
      budgetRemainingUsd: 45,
      periodResetAt: '2026-09-01T00:00:00.000Z',
      blockedReason: state.hasModule ? null : 'no_entitlement'
    }
  }
}))

vi.mock('@/lib/growth/seo/keyword-opportunities-reader', () => ({
  readKeywordOpportunities: async () => state.opportunitiesResult
}))

vi.mock('@/lib/growth/seo/gap/read-seo-aeo-gap', () => ({
  readSeoAeoGap: async () => state.gapResult
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => (state.targetId ? [{ seo_target_id: state.targetId }] : [])
}))

import {
  getEcosystemSeoEntitlementPayload,
  getEcosystemSeoKeywordOpportunitiesPayload,
  getEcosystemSeoVisibility360Payload
} from './ecosystem-growth-seo'

type AnyContext = Parameters<typeof getEcosystemSeoKeywordOpportunitiesPayload>[0]['context']

const contextWith = (binding: Record<string, unknown>): AnyContext =>
  ({ binding, consumer: { consumerId: 'cons-1', sisterPlatformKey: 'test' } }) as unknown as AnyContext

const internalCtx = contextWith({ greenhouseScopeType: 'internal', organizationId: null })
const orgCtx = contextWith({ greenhouseScopeType: 'organization', organizationId: 'org-binding' })

const req = (params = '') => new Request(`https://x.local/api?${params}`)

beforeEach(() => {
  state.flagOn = true
  state.hasModule = true
  state.tier = 'contracted'
  state.targetId = 'seot-1'
  state.entitlementCalls = []
})

describe('resolución de organización por binding', () => {
  it('binding org-scoped: usa la org del binding e ignora la ausencia de param', async () => {
    const r = await getEcosystemSeoKeywordOpportunitiesPayload({ context: orgCtx, request: req() })

    expect(state.entitlementCalls).toEqual(['org-binding'])
    expect(r.meta?.organizationId).toBe('org-binding')
  })

  it('binding org-scoped + param distinto → 404 anti-oracle', async () => {
    await expect(
      getEcosystemSeoKeywordOpportunitiesPayload({ context: orgCtx, request: req('organizationId=org-ajena') })
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(state.entitlementCalls).toEqual([])
  })

  it('binding internal sin param → 400', async () => {
    await expect(
      getEcosystemSeoKeywordOpportunitiesPayload({ context: internalCtx, request: req() })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('scope no-interno sin org en el binding → 403 default-DENY', async () => {
    const ctx = contextWith({ greenhouseScopeType: 'space', organizationId: null })

    await expect(
      getEcosystemSeoKeywordOpportunitiesPayload({ context: ctx, request: req('organizationId=org-x') })
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('gates del lane', () => {
  it('sin entitlement seo_v1 → 404 anti-oracle (no revela existencia)', async () => {
    state.hasModule = false

    await expect(
      getEcosystemSeoVisibility360Payload({ context: orgCtx, request: req() })
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'not_found' })
  })

  it('entitled sin target configurado → target_not_configured honesto', async () => {
    state.targetId = null

    const r = await getEcosystemSeoVisibility360Payload({ context: orgCtx, request: req() })

    expect(r.data).toEqual({ ok: false, errorCode: 'target_not_configured', organizationId: 'org-binding' })
  })

  it('flag OFF → disabled sin consultar entitlement', async () => {
    state.flagOn = false

    const r = await getEcosystemSeoKeywordOpportunitiesPayload({ context: orgCtx, request: req() })

    expect(r.data).toEqual({ ok: false, errorCode: 'disabled', status: null })
    expect(state.entitlementCalls).toEqual([])
  })

  it('passthrough: el payload ES el resultado del reader (cero re-mapeo)', async () => {
    state.gapResult = { ok: true, quadrants: [{ keyword: 'kw', quadrant: 'riesgo' }], domainQuadrant: 'riesgo' }

    const r = await getEcosystemSeoVisibility360Payload({ context: internalCtx, request: req('organizationId=org-i') })

    expect(r.data).toBe(state.gapResult)
    expect(state.entitlementCalls).toEqual(['org-i'])
  })
})

describe('payload de entitlement (chokepoint como lectura)', () => {
  it('org sin módulo → hasModule=false visible (SIN anti-oracle, por diseño)', async () => {
    state.hasModule = false

    const r = await getEcosystemSeoEntitlementPayload({ context: internalCtx, request: req('organizationId=org-p') })

    expect(r.data.ok).toBe(true)
    expect(r.data.hasModule).toBe(false)
    expect(r.data.blockedReason).toBe('no_entitlement')
  })

  it('org con módulo → tier + allowance + budget', async () => {
    const r = await getEcosystemSeoEntitlementPayload({ context: orgCtx, request: req() })

    expect(r.data.tier).toBe('contracted')
    expect(r.data.allowanceRemaining).toBe(6)
    expect(r.data.budgetRemainingUsd).toBe(45)
  })
})
