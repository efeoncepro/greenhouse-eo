import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  composeKortexControlPlanePacket: vi.fn(),
  captureWithDomain: vi.fn(),
  redactErrorForResponse: vi.fn(() => '[redacted]')
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/kortex/control-plane', () => ({
  KORTEX_CONTROL_PLANE_CONTRACT_VERSION: 'greenhouse-kortex-control-plane-reader.v1',
  composeKortexControlPlanePacket: (...args: unknown[]) => mocks.composeKortexControlPlanePacket(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: () => mocks.redactErrorForResponse()
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
  mocks.composeKortexControlPlanePacket.mockResolvedValue({
    contractVersion: 'greenhouse-kortex-control-plane-reader.v1',
    generatedAt: '2026-06-17T12:00:00.000Z',
    confidence: 'high',
    scope: {
      requestedPortalId: null,
      requestedHubspotPortalId: '51183921',
      resolvedPortalId: 'portal-1',
      resolvedHubspotPortalId: '51183921'
    },
    repository: null,
    runtime: null,
    binding: null,
    observedCapabilities: [],
    sources: [],
    warnings: []
  })
})

describe('GET /api/admin/kortex/control-plane', () => {
  it('requires admin tenant context', async () => {
    mocks.requireAdminTenantContext.mockResolvedValueOnce({
      tenant: null,
      errorResponse: new Response('Unauthorized', { status: 401 })
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('http://localhost/api/admin/kortex/control-plane'))

    expect(response.status).toBe(401)
    expect(mocks.composeKortexControlPlanePacket).not.toHaveBeenCalled()
  })

  it('returns control-plane packet and passes scoped identifiers to the composer', async () => {
    const { GET } = await import('./route')
    const response = await GET(new Request('http://localhost/api/admin/kortex/control-plane?hubspot_portal_id=51183921&portal_id=portal-1'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Greenhouse-Contract')).toBe('greenhouse-kortex-control-plane-reader.v1')
    expect(json.confidence).toBe('high')
    expect(mocks.composeKortexControlPlanePacket).toHaveBeenCalledWith({
      portalId: 'portal-1',
      hubspotPortalId: '51183921',
      tenant: ADMIN_TENANT
    })
  })

  it('redacts unexpected composer failures', async () => {
    mocks.composeKortexControlPlanePacket.mockRejectedValueOnce(new Error('upstream composer failed'))

    const { GET } = await import('./route')
    const response = await GET(new Request('http://localhost/api/admin/kortex/control-plane'))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('[redacted]')
    expect(mocks.redactErrorForResponse).toHaveBeenCalled()
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })
})
