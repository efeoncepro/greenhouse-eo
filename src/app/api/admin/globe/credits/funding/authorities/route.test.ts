import { beforeEach, describe, expect, it, vi } from 'vitest'

const authority = vi.hoisted(() => ({ issue: vi.fn(), revoke: vi.fn() }))

vi.mock('@/lib/auth', () => ({ getServerAuthSession: vi.fn() }))
vi.mock('@/lib/tenant/get-tenant-context', () => ({ getTenantContext: vi.fn() }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))
vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn(() => true) }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/sister-platforms/oauth-workspace-bindings', () => ({
  resolveGlobeOAuthWorkspaceBindings: vi.fn(),
  hasGlobeOAuthWorkspaceBinding: vi.fn()
}))
vi.mock('@/lib/globe/credit-funding-one-shot-authority', () => ({
  GlobeCreditFundingAuthorityError: class GlobeCreditFundingAuthorityError extends Error {},
  GlobeCreditFundingOneShotAuthorityStore: class GlobeCreditFundingOneShotAuthorityStore {
    issue = authority.issue
    revoke = authority.revoke
  }
}))

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import {
  hasGlobeOAuthWorkspaceBinding,
  resolveGlobeOAuthWorkspaceBindings
} from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import { POST as issuePost } from './route'
import { POST as revokePost } from './[authorityId]/revoke/route'

const tenant = {
  userId: 'user-efeonce-admin-julio-reyes',
  authMode: 'microsoft_sso',
  clientId: 'efeonce',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  role: 'efeonce_admin',
  projectIds: [],
  featureFlags: [],
  timezone: 'America/Santiago',
  portalHomePath: '/admin',
  preferredLocale: 'es-CL' as const,
  tenantDefaultLocale: 'es-CL' as const,
  legacyLocale: 'es-CL' as const,
  effectiveLocale: 'es-CL' as const
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerAuthSession).mockResolvedValue({
    user: { ...tenant, id: tenant.userId, provider: 'microsoft-entra-id' }
  } as never)
  vi.mocked(getTenantContext).mockResolvedValue(tenant)
  vi.mocked(resolveGlobeOAuthWorkspaceBindings).mockResolvedValue([
    { workspaceId: 'greenhouse-org:efeonce', displayName: 'Efeonce', kind: 'internal', isPrimary: true }
  ])
  vi.mocked(hasGlobeOAuthWorkspaceBinding).mockReturnValue(true)
  authority.issue.mockResolvedValue({ authorityId: 'authority-1' })
  authority.revoke.mockResolvedValue({ authorityId: 'authority-1', revoked: true })
})

describe('Globe credit funding one-shot authority admin routes', () => {
  it('issues an exact authority from authenticated CEO context without accepting issuer identity', async () => {
    const response = await issuePost(
      new Request('https://greenhouse.test/api/admin/globe/credits/funding/authorities', {
        method: 'POST',
        headers: { 'idempotency-key': 'fund-august' },
        body: JSON.stringify({
          globeWorkspaceId: 'greenhouse-org:efeonce',
          periodKey: '2026-08',
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-09-01T00:00:00.000Z',
          targetAvailableCredits: 800,
          maxGrantCredits: 500,
          maxResultingCapCredits: 1500,
          executorChannel: 'oauth',
          executorClientId: 'greenhouse-admin-cli',
          evidenceRef: 'instruction:TASK-1629',
          issuerUserId: 'forged'
        })
      })
    )

    expect(response.status).toBe(201)
    expect(authority.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        issuerUserId: tenant.userId,
        operationKey: 'fund-august',
        executorUserId: tenant.userId,
        executorChannel: 'oauth',
        executorAuthMode: 'microsoft_sso',
        globeWorkspaceId: 'greenhouse-org:efeonce'
      })
    )
  })

  it('issues an MCP authority only for the exact gateway client and explicit agent actor', async () => {
    const response = await issuePost(
      new Request('https://greenhouse.test/api/admin/globe/credits/funding/authorities', {
        method: 'POST',
        headers: { 'idempotency-key': 'fund-august-mcp' },
        body: JSON.stringify({
          globeWorkspaceId: 'greenhouse-org:efeonce',
          periodKey: '2026-08',
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-09-01T00:00:00.000Z',
          targetAvailableCredits: 800,
          maxGrantCredits: 500,
          maxResultingCapCredits: 1500,
          executorUserId: tenant.userId,
          executorChannel: 'mcp',
          executorAuthMode: 'agent',
          executorClientId: 'efeonce-mcp-gateway',
          evidenceRef: 'instruction:TASK-1630:mcp'
        })
      })
    )

    expect(response.status).toBe(201)
    expect(authority.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        executorUserId: tenant.userId,
        executorChannel: 'mcp',
        executorAuthMode: 'agent',
        executorClientId: 'efeonce-mcp-gateway'
      })
    )
  })

  it.each([
    [{ executorChannel: 'mcp', executorClientId: 'greenhouse-admin-cli', executorAuthMode: 'agent' }],
    [{ executorChannel: 'mcp', executorClientId: 'efeonce-mcp-gateway', executorAuthMode: 'microsoft_sso' }],
    [{ executorChannel: 'oauth', executorClientId: 'efeonce-mcp-gateway', executorAuthMode: 'agent' }],
    [{ executorChannel: 'mcp-alias', executorClientId: 'efeonce-mcp-gateway', executorAuthMode: 'agent' }]
  ])('rejects an invalid channel/client/auth combination before persistence', async override => {
    const response = await issuePost(
      new Request('https://greenhouse.test/api/admin/globe/credits/funding/authorities', {
        method: 'POST',
        headers: { 'idempotency-key': 'fund-invalid-mcp' },
        body: JSON.stringify({
          globeWorkspaceId: 'greenhouse-org:efeonce',
          periodKey: '2026-08',
          periodStart: '2026-08-01T00:00:00.000Z',
          periodEnd: '2026-09-01T00:00:00.000Z',
          targetAvailableCredits: 800,
          maxGrantCredits: 500,
          maxResultingCapCredits: 1500,
          executorUserId: tenant.userId,
          evidenceRef: 'instruction:TASK-1630:mcp-invalid',
          ...override
        })
      })
    )

    expect(response.status).toBe(400)
    expect(authority.issue).not.toHaveBeenCalled()
  })

  it('fails before persistence when the workspace is not bound', async () => {
    vi.mocked(hasGlobeOAuthWorkspaceBinding).mockReturnValue(false)

    const response = await issuePost(
      new Request('https://greenhouse.test/api/admin/globe/credits/funding/authorities', {
        method: 'POST',
        headers: { 'idempotency-key': 'fund-august' },
        body: JSON.stringify({
          globeWorkspaceId: 'other-workspace',
          periodKey: '2026-08',
          periodStart: '2026-08-01',
          periodEnd: '2026-09-01',
          targetAvailableCredits: 800,
          maxGrantCredits: 500,
          maxResultingCapCredits: 1500,
          executorUserId: 'user-agent-e2e-001',
          executorChannel: 'oauth',
          executorAuthMode: 'agent',
          executorClientId: 'greenhouse-admin-cli',
          evidenceRef: 'instruction:1'
        })
      })
    )

    expect(response.status).toBe(403)
    expect(authority.issue).not.toHaveBeenCalled()
  })

  it('revokes only with the dedicated entitlement and a bounded reason', async () => {
    const response = await revokePost(
      new Request('https://greenhouse.test/revoke', {
        method: 'POST',
        body: JSON.stringify({ reasonCode: 'operator_revoked' })
      }),
      { params: Promise.resolve({ authorityId: 'authority-1' }) }
    )

    expect(response.status).toBe(200)
    expect(can).toHaveBeenCalledWith(
      expect.anything(),
      'platform.globe_credit_funding.authority.revoke',
      'execute',
      'all'
    )
    expect(authority.revoke).toHaveBeenCalledWith(
      expect.objectContaining({
        authorityId: 'authority-1',
        revokedByUserId: tenant.userId,
        reasonCode: 'operator_revoked'
      })
    )
  })
})
