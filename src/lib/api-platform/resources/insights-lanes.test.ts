import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1845 — paridad de los dos lanes: la MISMA policy de target por actor, con la derivación
 * del sujeto que corresponde a cada transporte. App: tenant cliente ⇒ su org; interno declara
 * org. Ecosystem: binding org-scoped ⇒ sólo lectura como cliente; binding internal ⇒ declara org
 * y escribe; ningún binding emite.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const domain = vi.hoisted(() => ({
  readInsightsCatalog: vi.fn(async (scope: unknown) => ({ scope })),
  readInsightEditions: vi.fn(async () => ({ items: [], total: 0 })),
  readInsightReports: vi.fn(async () => ({ items: [], total: 0 })),
  readInsightReport: vi.fn(),
  readInsightEdition: vi.fn(),
  createInsightEdition: vi.fn(async (input: unknown) => ({ report: {}, edition: { editionId: 'insed-1' }, idempotent: false, generation: { outcome: 'ready_for_review', failedPhase: null, failureCode: null }, input })),
  reviseInsightEdition: vi.fn(),
  issueInsightEdition: vi.fn(async () => ({ edition: {}, idempotent: false })),
  withdrawInsightEdition: vi.fn(),
  recoverInsightEdition: vi.fn()
}))

vi.mock('@/lib/efeonce-insights/readers', () => domain)
vi.mock('@/lib/efeonce-insights/commands', () => domain)

const req = (url: string) => new Request(url)

describe('app lane — derivación del sujeto', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cliente: la org es la del tenant; un organizationId ajeno en query no la sobreescribe (el dominio lo niega)', async () => {
    const { getAppInsightsCatalog } = await import('./app-insights')
    const context = { tenant: { userId: 'u', tenantType: 'client', roleCodes: ['client_manager'], primaryRoleCode: 'client_manager', routeGroups: ['client'], authorizedViews: [], projectScopes: [], campaignScopes: [], organizationId: 'org-a' } } as never

    await getAppInsightsCatalog({ context, request: req('https://x/api?organizationId=org-b') })
    expect(domain.readInsightsCatalog).toHaveBeenCalledWith(expect.objectContaining({ actorOrganizationId: 'org-a', organizationId: 'org-b' }))
    // Sin contexto de org en la sesión cliente → 403 (no se adivina).
    await expect(getAppInsightsCatalog({ context: { tenant: { ...(context as { tenant: object }).tenant, organizationId: undefined } } as never, request: req('https://x/api') })).rejects.toMatchObject({ errorCode: 'forbidden' })
  })

  it('interno: organizationId es obligatorio (400) y viaja como target con actorOrganizationId null', async () => {
    const { createAppInsightEdition, getAppInsightsCatalog } = await import('./app-insights')
    const context = { tenant: { userId: 'u', tenantType: 'efeonce_internal', roleCodes: ['efeonce_account'], primaryRoleCode: 'efeonce_account', routeGroups: ['internal'], authorizedViews: [], projectScopes: [], campaignScopes: [] } } as never

    await expect(getAppInsightsCatalog({ context, request: req('https://x/api') })).rejects.toMatchObject({ errorCode: 'bad_request' })

    const result = await createAppInsightEdition({ context, request: req('https://x/api'), body: { organizationId: 'org-a', request: { modules: ['seo'] } } })

    expect(result.status).toBe(202)
    expect(domain.createInsightEdition).toHaveBeenCalledWith(expect.objectContaining({ actorOrganizationId: null, organizationId: 'org-a', request: { modules: ['seo'] } }))
  })

  it('los errores del dominio se traducen al contrato del API Platform con la causa en details.code', async () => {
    const { toInsightsApiPlatformError } = await import('./insights-errors')
    const { InsightsIdempotencyConflictError, InsightsNotFoundError, InsightsGenerationDisabledError } = await import('@/lib/efeonce-insights/errors')

    expect(toInsightsApiPlatformError(new InsightsNotFoundError('edition', 'x'))).toMatchObject({ statusCode: 404, errorCode: 'not_found', details: { code: 'not_found' } })
    expect(toInsightsApiPlatformError(new InsightsIdempotencyConflictError('k', 'e'))).toMatchObject({ statusCode: 409, errorCode: 'idempotency_conflict' })
    expect(toInsightsApiPlatformError(new InsightsGenerationDisabledError())).toMatchObject({ statusCode: 503, errorCode: 'service_unavailable' })
    expect(toInsightsApiPlatformError(new Error('raw sql boom'))).toMatchObject({ statusCode: 500, errorCode: 'internal_error', message: 'Insights request failed.' })
  })
})

describe('ecosystem lane — derivación del sujeto máquina', () => {
  beforeEach(() => vi.clearAllMocks())

  const ctx = (binding: Record<string, unknown>) => ({ consumer: { publicId: 'cons-1' }, binding: { organizationId: null, greenhouseScopeType: 'internal', ...binding } }) as never

  it('binding org-scoped: lee como cliente de esa org, otra org es 404 y crear es scope_not_allowed', async () => {
    const { createEcosystemInsightEditionPayload, getEcosystemInsightsCatalogPayload } = await import('./ecosystem-insights')
    const context = ctx({ organizationId: 'org-a', greenhouseScopeType: 'organization' })

    await getEcosystemInsightsCatalogPayload({ context, request: req('https://x/api') })
    expect(domain.readInsightsCatalog).toHaveBeenCalledWith(expect.objectContaining({ actorOrganizationId: 'org-a', organizationId: 'org-a', subject: expect.objectContaining({ tenantType: 'client' }) }))
    await expect(getEcosystemInsightsCatalogPayload({ context, request: req('https://x/api?organizationId=org-b') })).rejects.toMatchObject({ errorCode: 'not_found' })
    await expect(createEcosystemInsightEditionPayload({ context, request: req('https://x/api'), body: { request: {} } })).rejects.toMatchObject({ errorCode: 'scope_not_allowed' })
    expect(domain.createInsightEdition).not.toHaveBeenCalled()
  })

  it('binding internal: organizationId requerido, escribe como actor de sistema interno; scope no interno sin org es scope_not_allowed', async () => {
    const { createEcosystemInsightEditionPayload, getEcosystemInsightsCatalogPayload } = await import('./ecosystem-insights')

    await expect(getEcosystemInsightsCatalogPayload({ context: ctx({}), request: req('https://x/api') })).rejects.toMatchObject({ errorCode: 'bad_request' })
    await expect(getEcosystemInsightsCatalogPayload({ context: ctx({ greenhouseScopeType: 'space' }), request: req('https://x/api') })).rejects.toMatchObject({ errorCode: 'scope_not_allowed' })

    const result = await createEcosystemInsightEditionPayload({ context: ctx({}), request: req('https://x/api'), body: { organizationId: 'org-a', request: { modules: ['seo'] } } })

    expect(result.status).toBe(202)
    expect(domain.createInsightEdition).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-a', actorOrganizationId: null, subject: expect.objectContaining({ tenantType: 'efeonce_internal', userId: 'consumer:cons-1' }) }))
  })
})
