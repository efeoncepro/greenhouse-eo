import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ getServerAuthSession: vi.fn() }))
vi.mock('@/lib/tenant/get-tenant-context', () => ({ getTenantContext: vi.fn() }))
vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({ buildTenantEntitlementSubject: (v: unknown) => v }))
vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn(() => true) }))
vi.mock('@/lib/globe/credit-capacity-status', () => ({
  GlobeCreditCapacityStatusError: class GlobeCreditCapacityStatusError extends Error {},
  readGlobeCreditCapacityStatus: vi.fn(async () => ({ schemaVersion: '1', state: 'ready' }))
}))
vi.mock('@/lib/globe/client', () => ({
  GlobeSdkError: class GlobeSdkError extends Error { retryable = false },
  GreenhouseGlobeConfigurationError: class GreenhouseGlobeConfigurationError extends Error {}
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/sister-platforms/oauth-workspace-bindings', () => ({
  resolveGlobeOAuthWorkspaceBindings: vi.fn(), hasGlobeOAuthWorkspaceBinding: vi.fn()
}))

import { getServerAuthSession } from '@/lib/auth'
import { readGlobeCreditCapacityStatus } from '@/lib/globe/credit-capacity-status'
import { hasGlobeOAuthWorkspaceBinding, resolveGlobeOAuthWorkspaceBindings } from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { GET } from './route'

const tenant = { userId: 'operator-a', roleCodes: ['efeonce_admin'] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getServerAuthSession).mockResolvedValue({ user: { id: 'operator-a' } } as never)
  vi.mocked(getTenantContext).mockResolvedValue(tenant as never)
  vi.mocked(resolveGlobeOAuthWorkspaceBindings).mockResolvedValue([
    { workspaceId: 'greenhouse-org:efeonce', displayName: 'Efeonce', kind: 'internal', isPrimary: true }
  ])
  vi.mocked(hasGlobeOAuthWorkspaceBinding).mockImplementation(
    (bindings, workspaceId) => bindings.some(binding => binding.workspaceId === workspaceId)
  )
})

const request = (workspaceId = 'greenhouse-org:efeonce') => new Request(
  `https://greenhouse.test/api/admin/globe/credits/status?workspaceId=${encodeURIComponent(workspaceId)}&requestedCredits=12`
)

describe('GET /api/admin/globe/credits/status', () => {
  it('reads an exact bound workspace through the server broker', async () => {
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(readGlobeCreditCapacityStatus).toHaveBeenCalledWith({
      globeWorkspaceId: 'greenhouse-org:efeonce', requestedCredits: 12
    })
  })

  it('denies a syntactically valid workspace outside the OAuth binding', async () => {
    const response = await GET(request('workspace-other'))

    expect(response.status).toBe(403)
    expect(readGlobeCreditCapacityStatus).not.toHaveBeenCalled()
  })
})
