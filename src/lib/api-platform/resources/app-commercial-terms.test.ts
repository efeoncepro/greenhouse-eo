import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import type * as CommercialTermsModule from '@/lib/commercial/sample-sprints/commercial-terms'

const mocks = vi.hoisted(() => ({ declare: vi.fn(), active: vi.fn(), can: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({ buildTenantEntitlementSubject: (tenant: unknown) => tenant }))
vi.mock('@/lib/commercial/sample-sprints/commercial-terms', async importOriginal => ({
  ...(await importOriginal<typeof CommercialTermsModule>()),
  declareCommercialTerms: mocks.declare,
  getActiveCommercialTerms: mocks.active
}))

import { CommercialTermsConflictError, CommercialTermsValidationError } from '@/lib/commercial/sample-sprints/commercial-terms'
import { runAppCommercialTermsDeclare, runAppCommercialTermsRead } from './app-commercial-terms'

const human = { authSource: 'cookie_session', tenant: { userId: 'commercial-lead', tenantType: 'efeonce_internal', authMode: 'microsoft_sso' } } as unknown as AppPlatformRequestContext
const body = { kind: 'committed', effectiveFrom: '2026-09-09', bundledModules: ['seo_v2', 'ai_visibility_v1'], reason: 'Operator-confirmed SEO/AEO scope' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.can.mockReturnValue(true)
  mocks.declare.mockResolvedValue({ termsId: 'terms-1' })
  mocks.active.mockResolvedValue({ termsId: 'terms-1', bundledModules: ['ai_visibility_v1', 'seo_v2'] })
})

describe('app commercial terms adapter (TASK-1852)', () => {
  it('declares with the authenticated human as declaredBy and returns the active terms', async () => {
    const result = await runAppCommercialTermsDeclare({ context: human, serviceId: 'SVC-HS-1', body })

    expect(result.status).toBe(201)
    expect(mocks.declare).toHaveBeenCalledWith(expect.objectContaining({ serviceId: 'SVC-HS-1', declaredBy: 'commercial-lead', bundledModules: ['seo_v2', 'ai_visibility_v1'], monthlyAmountClp: null }))
    expect(mocks.can).toHaveBeenCalledWith(expect.anything(), 'commercial.engagement.declare', 'create', 'tenant')
  })

  it('never accepts the actor from the body and rejects unknown fields', async () => {
    await expect(runAppCommercialTermsDeclare({ context: human, serviceId: 'SVC-HS-1', body: { ...body, declaredBy: 'spoof' } })).rejects.toMatchObject({ statusCode: 400 })
    await expect(runAppCommercialTermsDeclare({ context: human, serviceId: 'SVC-HS-1', body: { ...body, bundledModules: 'seo_v2' } })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.declare).not.toHaveBeenCalled()
  })

  it('lets an agent session read but never declare, and denies delegated OAuth entirely', async () => {
    const agent = { ...human, tenant: { ...human.tenant, authMode: 'agent' } } as AppPlatformRequestContext

    await expect(runAppCommercialTermsRead({ context: agent, serviceId: 'SVC-HS-1' })).resolves.toMatchObject({ data: { serviceId: 'SVC-HS-1' } })
    await expect(runAppCommercialTermsDeclare({ context: agent, serviceId: 'SVC-HS-1', body })).rejects.toMatchObject({ statusCode: 403, errorCode: 'invalid_delegated_context' })
    await expect(runAppCommercialTermsRead({ context: { ...human, authSource: 'sister_platform_oauth' } as AppPlatformRequestContext, serviceId: 'SVC-HS-1' })).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.declare).not.toHaveBeenCalled()
  })

  it('requires the commercial capability and maps domain errors to canonical codes', async () => {
    mocks.can.mockImplementation((_subject: unknown, capability: string) => capability !== 'commercial.engagement.declare')
    await expect(runAppCommercialTermsDeclare({ context: human, serviceId: 'SVC-HS-1', body })).rejects.toMatchObject({ statusCode: 403, errorCode: 'forbidden' })

    mocks.can.mockReturnValue(true)
    mocks.declare.mockRejectedValueOnce(new CommercialTermsValidationError('bundledModules references modules that are not active'))
    await expect(runAppCommercialTermsDeclare({ context: human, serviceId: 'SVC-HS-1', body })).rejects.toMatchObject({ statusCode: 400, errorCode: 'bad_request' })

    mocks.declare.mockRejectedValueOnce(new CommercialTermsConflictError('active terms exist'))
    await expect(runAppCommercialTermsDeclare({ context: human, serviceId: 'SVC-HS-1', body })).rejects.toMatchObject({ statusCode: 409, errorCode: 'commercial_terms_conflict' })
  })
})
