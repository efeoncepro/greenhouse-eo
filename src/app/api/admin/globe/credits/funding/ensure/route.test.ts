import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  issue: vi.fn(),
  execute: vi.fn(),
  can: vi.fn(),
  capture: vi.fn()
}))

vi.mock('@/lib/auth', () => ({ getServerAuthSession: vi.fn() }))
vi.mock('@/lib/tenant/get-tenant-context', () => ({ getTenantContext: vi.fn() }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))
vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.capture }))
vi.mock('@/lib/sister-platforms/oauth-workspace-bindings', () => ({
  resolveGlobeOAuthWorkspaceBindings: vi.fn(),
  hasGlobeOAuthWorkspaceBinding: vi.fn()
}))
vi.mock('@/lib/globe/credit-funding-one-shot-authority', () => ({
  GlobeCreditFundingAuthorityError: class GlobeCreditFundingAuthorityError extends Error {
    constructor(readonly code: string) {
      super(code)
    }
  },
  GlobeCreditFundingOneShotAuthorityStore: class GlobeCreditFundingOneShotAuthorityStore {
    issue = mocks.issue
  }
}))
vi.mock('@/lib/globe/credit-funding-one-shot-executor', () => ({
  executeOneShotGlobeCreditFunding: mocks.execute
}))

import { getServerAuthSession } from '@/lib/auth'
import {
  hasGlobeOAuthWorkspaceBinding,
  resolveGlobeOAuthWorkspaceBindings
} from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import { POST } from './route'

const tenant = {
  userId: 'user-efeonce-admin-julio-reyes',
  authMode: 'microsoft_sso',
  clientId: 'efeonce',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['EFEONCE_ADMIN'],
  primaryRoleCode: 'EFEONCE_ADMIN',
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  role: 'EFEONCE_ADMIN',
  projectIds: [],
  featureFlags: [],
  timezone: 'America/Santiago',
  portalHomePath: '/admin',
  preferredLocale: 'es-CL' as const,
  tenantDefaultLocale: 'es-CL' as const,
  legacyLocale: 'es-CL' as const,
  effectiveLocale: 'es-CL' as const
}

const body = {
  globeWorkspaceId: 'greenhouse-org:efeonce',
  periodKey: '2026-08',
  periodStart: '2026-08-01T00:00:00.000Z',
  periodEnd: '2026-09-01T00:00:00.000Z',
  targetAvailableCredits: 800,
  maxGrantCredits: 500,
  maxResultingCapCredits: 1500,
  evidenceRef: 'instruction:TASK-1629'
}

const request = (value: unknown = body, headers: Record<string, string> = { 'idempotency-key': 'fund-august' }) =>
  new Request('https://greenhouse.test/api/admin/globe/credits/funding/ensure', {
    method: 'POST',
    headers,
    body: JSON.stringify(value)
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerAuthSession).mockResolvedValue({
    user: { ...tenant, id: tenant.userId, provider: 'microsoft-entra-id' }
  } as never)
  vi.mocked(getTenantContext).mockResolvedValue(tenant)
  mocks.can.mockReturnValue(true)
  vi.mocked(resolveGlobeOAuthWorkspaceBindings).mockResolvedValue([
    { workspaceId: body.globeWorkspaceId, displayName: 'Efeonce', kind: 'internal', isPrimary: true }
  ])
  vi.mocked(hasGlobeOAuthWorkspaceBinding).mockReturnValue(true)
  mocks.issue.mockResolvedValue({
    authorityId: 'authority-1',
    issuerAuthEvidenceRef: 'gh-credit-auth:fingerprint'
  })
  mocks.execute.mockResolvedValue({ authorityId: 'authority-1', outcome: 'completed' })
})

describe('POST /api/admin/globe/credits/funding/ensure', () => {
  it('issues and immediately executes one browser authority with the authenticated human identity', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mocks.can).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'platform.globe_credit_funding.authority.issue',
      'execute',
      'all'
    )
    expect(mocks.can).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'platform.globe_credit_funding.ensure',
      'execute',
      'all'
    )
    expect(mocks.issue).toHaveBeenCalledWith({
      ...body,
      operationKey: 'fund-august',
      issuerUserId: tenant.userId,
      issuerEntitlement: 'platform.globe_credit_funding.authority.issue',
      issuerAuthMode: 'microsoft_sso',
      issuerAuthProvider: 'microsoft-entra-id',
      issuerAuthCorrelationId: expect.any(String),
      executorUserId: tenant.userId,
      executorChannel: 'browser',
      executorClientId: 'greenhouse-portal',
      executorAuthMode: 'microsoft_sso'
    })
    expect(mocks.execute).toHaveBeenCalledWith(
      {
        authorityId: 'authority-1',
        executorUserId: tenant.userId,
        executorChannel: 'browser',
        executorClientId: 'greenhouse-portal',
        authEvidenceRef: 'gh-credit-auth:fingerprint',
        actorAuthMode: 'microsoft_sso',
        correlationId: expect.any(String),
        allowedGlobeWorkspaceIds: [body.globeWorkspaceId]
      },
      { store: expect.objectContaining({ issue: mocks.issue }) }
    )
    const payload = await response.json()

    expect(payload).toMatchObject({
      authority: { authorityId: 'authority-1' },
      funding: { outcome: 'completed' }
    })
    expect(payload.authority).not.toHaveProperty('issuerAuthEvidenceRef')
  })

  it('rejects an agent session instead of relabeling it as human', async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { ...tenant, id: tenant.userId, provider: 'agent', authMode: 'agent' }
    } as never)

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(mocks.issue).not.toHaveBeenCalled()
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  it('requires both issue and ensure entitlements', async () => {
    mocks.can.mockReturnValueOnce(true).mockReturnValueOnce(false)

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(mocks.issue).not.toHaveBeenCalled()
  })

  it('rejects missing idempotency and caller-controlled executor fields', async () => {
    const missingKey = await POST(request(body, {}))
    const injectedExecutor = await POST(request({ ...body, executorUserId: 'forged-agent' }))

    expect(missingKey.status).toBe(400)
    expect(injectedExecutor.status).toBe(400)
    expect(mocks.issue).not.toHaveBeenCalled()
  })

  it('fails closed before issuance when the workspace is not bound', async () => {
    vi.mocked(hasGlobeOAuthWorkspaceBinding).mockReturnValue(false)

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(mocks.issue).not.toHaveBeenCalled()
  })
})
