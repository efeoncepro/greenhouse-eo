import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRequireTenantContext = vi.fn()
const mockBuildOrganizationWorkspaceSubjectFromTenant = vi.fn()
const mockReadOrganizationWorkspaceCompactSignalsSafely = vi.fn()

class MockOrganizationWorkspaceCompactSignalsNotFoundError extends Error {}

vi.mock('@/lib/tenant/authorization', () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args)
}))

vi.mock('@/lib/organization-workspace/build-projection-subject', () => ({
  buildOrganizationWorkspaceSubjectFromTenant: (...args: unknown[]) => mockBuildOrganizationWorkspaceSubjectFromTenant(...args)
}))

vi.mock('@/lib/organization-workspace/compact-signals', () => {
  return {
    OrganizationWorkspaceCompactSignalsNotFoundError: MockOrganizationWorkspaceCompactSignalsNotFoundError,
    readOrganizationWorkspaceCompactSignalsSafely: (...args: unknown[]) => mockReadOrganizationWorkspaceCompactSignalsSafely(...args)
  }
})

const { GET } = await import('./route')

describe('GET /api/organizations/[id]/workspace/compact-signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      unauthorizedResponse: null
    })
    mockBuildOrganizationWorkspaceSubjectFromTenant.mockReturnValue({ userId: 'user-1' })
    mockReadOrganizationWorkspaceCompactSignalsSafely.mockResolvedValue({
      organizationId: 'org-1',
      status: 'ready',
      computedAt: '2026-06-09T12:00:00.000Z'
    })
  })

  it('reads compact signals for the tenant subject', async () => {
    const response = await GET(
      new Request('https://example.com/api/organizations/org-1/workspace/compact-signals?year=2026&month=6&asOf=2026-06-09'),
      { params: Promise.resolve({ id: 'org-1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Compact-Signals-Status')).toBe('ready')
    expect(body.organizationId).toBe('org-1')
    expect(mockReadOrganizationWorkspaceCompactSignalsSafely).toHaveBeenCalledWith(expect.objectContaining({
      subject: { userId: 'user-1' },
      organizationId: 'org-1',
      entrypointContext: 'agency',
      asOf: '2026-06-09',
      periodYear: 2026,
      periodMonth: 6
    }))
  })

  it('returns the tenant unauthorized response when there is no session', async () => {
    mockRequireTenantContext.mockResolvedValue({
      tenant: null,
      unauthorizedResponse: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    })

    const response = await GET(
      new Request('https://example.com/api/organizations/org-1/workspace/compact-signals'),
      { params: Promise.resolve({ id: 'org-1' }) }
    )

    expect(response.status).toBe(401)
    expect(mockReadOrganizationWorkspaceCompactSignalsSafely).not.toHaveBeenCalled()
  })

  it('returns 404 for a missing organization', async () => {
    mockReadOrganizationWorkspaceCompactSignalsSafely.mockRejectedValue(new MockOrganizationWorkspaceCompactSignalsNotFoundError('missing'))

    const response = await GET(
      new Request('https://example.com/api/organizations/org-missing/workspace/compact-signals'),
      { params: Promise.resolve({ id: 'org-missing' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('Organization not found')
  })
})
