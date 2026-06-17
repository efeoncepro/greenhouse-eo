import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  composeKortexGithubControlPlanePacket: vi.fn(),
  captureWithDomain: vi.fn(),
  redactErrorForResponse: vi.fn((value?: unknown) => {
    void value

    return '[redacted]'
  })
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/kortex/github-control-plane', () => ({
  KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION: 'greenhouse-kortex-github-control-plane.v1',
  composeKortexGithubControlPlanePacket: (...args: unknown[]) =>
    mocks.composeKortexGithubControlPlanePacket(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (value: unknown) => mocks.redactErrorForResponse(value)
}))

const ADMIN_TENANT = {
  userId: 'user-admin-1',
  organizationId: null,
  clientId: null,
  spaceId: null,
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['admin']
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminTenantContext.mockResolvedValue({ tenant: ADMIN_TENANT, errorResponse: null })
  mocks.composeKortexGithubControlPlanePacket.mockResolvedValue({
    contractVersion: 'greenhouse-kortex-github-control-plane.v1',
    generatedAt: '2026-06-17T12:00:00.000Z',
    confidence: 'high',
    repository: { nameWithOwner: 'efeoncepro/kortex' },
    branches: [],
    workflows: [],
    runs: [],
    pullRequests: { openCount: 0, searchUrl: '' },
    issues: { openCount: 0, searchUrl: '' },
    releases: { latestTag: null, latestName: null, publishedAt: null, htmlUrl: null, status: 'no_release' },
    runtimeCorrelation: {
      status: 'matched',
      mainHeadSha: 'sha',
      latestCiHeadSha: 'sha',
      runtimeReportedSha: null,
      detail: 'ok'
    },
    sources: [],
    warnings: []
  })
})

describe('GET /api/admin/kortex/github-control-plane', () => {
  it('requires admin tenant context', async () => {
    mocks.requireAdminTenantContext.mockResolvedValueOnce({
      tenant: null,
      errorResponse: new Response('Unauthorized', { status: 401 })
    })

    const { GET } = await import('./route')
    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.composeKortexGithubControlPlanePacket).not.toHaveBeenCalled()
  })

  it('returns the GitHub control-plane packet', async () => {
    const { GET } = await import('./route')
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Greenhouse-Contract')).toBe('greenhouse-kortex-github-control-plane.v1')
    expect(json.repository.nameWithOwner).toBe('efeoncepro/kortex')
  })

  it('redacts unexpected composer failures', async () => {
    mocks.composeKortexGithubControlPlanePacket.mockRejectedValueOnce(new Error('secret upstream failure'))

    const { GET } = await import('./route')
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('[redacted]')
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })
})
