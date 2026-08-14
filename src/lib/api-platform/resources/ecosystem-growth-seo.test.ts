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
  targets: [] as Array<Record<string, unknown>>,
  flagOn: true,
  hasModule: true,
  tier: 'contracted' as string | null,
  targetId: 'seot-1' as string | null,
  opportunitiesResult: { ok: true, opportunities: [] } as unknown,
  gapResult: { ok: true, quadrants: [] } as unknown,
  trackResult: { ok: true, outcomes: [], activeKeywordCount: 0, capacity: 200 } as unknown,
  trackCalls: [] as unknown[][],
  untrackCalls: [] as unknown[][],
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
  // ISSUE-153 — el resolver canónico lee la lista completa de targets activos; `targets`
  // permite simular una org multi-mercado. `targetId` se mantiene como atajo mono-mercado.
  runGreenhousePostgresQuery: async () =>
    state.targets.length > 0
      ? state.targets
      : state.targetId
        ? [{ seo_target_id: state.targetId, root_domain: 'x.com', location_code: '2152', language_code: 'es', market: 'CL' }]
        : [],
  // TASK-1308 — el lane ahora importa el command, que arrastra `withTransaction` vía
  // `@/lib/db`. Sin este export el mock rompe la carga del módulo entero.
  withGreenhousePostgresTransaction: async () => {
    throw new Error('la transacción no debe alcanzarse en estos tests')
  },
  // TASK-1666 — el bridge arrastra `@/lib/db`, que registra un reset hook al cargarse.
  onGreenhousePostgresReset: () => undefined
}))

// El command se mockea entero: acá se prueba el LANE (scope, resolución de org, validación),
// no la lógica del command — que tiene su propia suite y su sanity contra PG real.
vi.mock('@/lib/growth/seo/track-keywords', () => ({
  trackKeywords: async (...args: unknown[]) => {
    state.trackCalls.push(args)

    return state.trackResult
  },
  untrackKeywords: async (...args: unknown[]) => {
    state.untrackCalls.push(args)

    return state.trackResult
  }
}))

import {
  getEcosystemSeoEntitlementPayload,
  getEcosystemSeoKeywordOpportunitiesPayload,
  getEcosystemSeoVisibility360Payload,
  trackEcosystemSeoKeywordsPayload,
  untrackEcosystemSeoKeywordsPayload
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
  state.targets = []
  state.entitlementCalls = []
  state.trackCalls = []
  state.untrackCalls = []
  state.trackResult = { ok: true, outcomes: [], activeKeywordCount: 0, capacity: 200 }
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

  it('ISSUE-153 — dos mercados activos sin selector → 409 multiple_markets con la lista', async () => {
    state.targets = [
      { seo_target_id: 'seot-cl', root_domain: 'x.com', location_code: '2152', language_code: 'es', market: 'CL' },
      { seo_target_id: 'seot-mx', root_domain: 'x.com', location_code: '2484', language_code: 'es', market: 'MX' }
    ]

    await expect(
      getEcosystemSeoVisibility360Payload({ context: orgCtx, request: req() })
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'multiple_markets',
      details: { markets: [{ market: 'CL' }, { market: 'MX' }] }
    })
  })

  it('ISSUE-153 — con ?market=MX elige ese mercado y el meta lo declara', async () => {
    state.targets = [
      { seo_target_id: 'seot-cl', root_domain: 'x.com', location_code: '2152', language_code: 'es', market: 'CL' },
      { seo_target_id: 'seot-mx', root_domain: 'x.com', location_code: '2484', language_code: 'es', market: 'MX' }
    ]
    state.gapResult = { ok: true, quadrants: [] }

    const r = await getEcosystemSeoVisibility360Payload({ context: orgCtx, request: req('market=MX') })

    expect(r.data).toBe(state.gapResult)
    expect(r.meta).toMatchObject({ servedMarket: { market: 'MX', locationCode: '2484', languageCode: 'es' } })
  })

  it('ISSUE-153 — selector que no matchea → 409 market_not_found', async () => {
    state.targetId = 'seot-cl'

    await expect(
      getEcosystemSeoVisibility360Payload({ context: orgCtx, request: req('market=PE') })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'market_not_found' })
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

describe('trackEcosystemSeoKeywordsPayload (TASK-1308) — el primer write del lane', () => {
  const body = (extra: Record<string, unknown> = {}) => ({ keywords: ['berel'], ...extra })

  it('🔴 un binding org-scoped NO puede hacer crecer su propia factura', async () => {
    await expect(
      trackEcosystemSeoKeywordsPayload({
        context: orgCtx,
        request: req(),
        body: body({ organizationId: 'org-binding' })
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'scope_not_allowed' })

    // Ni siquiera se resolvió el entitlement: la puerta de scope cierra ANTES.
    expect(state.entitlementCalls).toEqual([])
    expect(state.trackCalls).toEqual([])
  })

  it('lote vacío → 400 sin tocar el dominio', async () => {
    await expect(
      trackEcosystemSeoKeywordsPayload({ context: internalCtx, request: req(), body: { keywords: [] } })
    ).rejects.toMatchObject({ statusCode: 400 })

    expect(state.trackCalls).toEqual([])
  })

  it('el organizationId del BODY se resuelve con las mismas reglas de binding que el query param', async () => {
    await trackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: body({ organizationId: 'org-desde-body' })
    })

    expect(state.entitlementCalls).toEqual(['org-desde-body'])
  })

  it('org entitled sin target configurado degrada honesto, no escribe', async () => {
    state.targetId = null

    const r = await trackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: body({ organizationId: 'org-1' })
    })

    expect(r.data).toMatchObject({ ok: false, errorCode: 'target_not_configured' })
    expect(state.trackCalls).toEqual([])
  })

  it('la procedencia dice que fue un consumer máquina, no una persona', async () => {
    await trackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: body({ organizationId: 'org-1' })
    })

    const [, , actor, options] = state.trackCalls[0] as [string, string[], string, { source: string }]

    expect(actor).toMatch(/^mcp:/)
    expect(options.source).toBe('mcp')
  })

  it('con el módulo apagado no resuelve sujeto ni escribe', async () => {
    state.flagOn = false

    const r = await trackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: body({ organizationId: 'org-1' })
    })

    expect(r.data).toMatchObject({ ok: false, errorCode: 'disabled' })
    expect(state.trackCalls).toEqual([])
  })

  // ── TASK-1659 — la intención declarada cruza el lane sin degradarse ──────────────────────

  it('una intención fuera del vocabulario es 400 explícito, no un `undefined` silencioso', async () => {
    await expect(
      trackEcosystemSeoKeywordsPayload({
        context: internalCtx,
        request: req(),
        body: body({ organizationId: 'org-1', intent: 'objetivo' })
      })
    ).rejects.toMatchObject({ statusCode: 400 })

    // Silenciarlo dejaría al consumer creyendo que declaró algo que no se guardó.
    expect(state.trackCalls).toEqual([])
  })

  it('sin intención en el body, el command NO recibe ninguna (no se inventa `opportunity`)', async () => {
    await trackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: body({ organizationId: 'org-1' })
    })

    const [, , , options] = state.trackCalls[0] as [string, string[], string, Record<string, unknown>]

    expect(options.intent).toBeUndefined()
  })

  it('la autoría humana viaja aparte del actor máquina', async () => {
    await trackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: body({ organizationId: 'org-1', intent: 'target', intentDeclaredBy: 'user-42' })
    })

    const [, , actor, options] = state.trackCalls[0] as [string, string[], string, Record<string, unknown>]

    // El actor sigue siendo la máquina: la procedencia del write no se falsea para que parezca
    // que lo hizo una persona. La persona queda en la autoría del compromiso.
    expect(actor).toMatch(/^mcp:/)
    expect(options.intent).toBe('target')
    expect(options.intentDeclaredBy).toBe('user-42')
  })

  it('la autoría sin intención se descarta: un autor sin compromiso es ruido', async () => {
    await trackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: body({ organizationId: 'org-1', intentDeclaredBy: 'user-42' })
    })

    const [, , , options] = state.trackCalls[0] as [string, string[], string, Record<string, unknown>]

    expect(options.intentDeclaredBy).toBeUndefined()
  })
})

describe('untrackEcosystemSeoKeywordsPayload (TASK-1308) — el reverso en el lane', () => {
  it('🔴 un binding org-scoped tampoco puede cortar la serie de su propio Space', async () => {
    await expect(
      untrackEcosystemSeoKeywordsPayload({
        context: orgCtx,
        request: req(),
        body: { keywords: ['berel'], organizationId: 'org-binding' }
      })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'scope_not_allowed' })

    expect(state.untrackCalls).toEqual([])
  })

  it('la procedencia dice que fue un consumer máquina', async () => {
    await untrackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: { keywords: ['berel'], organizationId: 'org-1' }
    })

    const [, , actor] = state.untrackCalls[0] as [string, string[], string]

    expect(actor).toMatch(/^mcp:/)
  })

  it('con el módulo apagado no resuelve sujeto ni escribe', async () => {
    state.flagOn = false

    const r = await untrackEcosystemSeoKeywordsPayload({
      context: internalCtx,
      request: req(),
      body: { keywords: ['berel'], organizationId: 'org-1' }
    })

    expect(r.data).toMatchObject({ ok: false, errorCode: 'disabled' })
    expect(state.untrackCalls).toEqual([])
  })
})
