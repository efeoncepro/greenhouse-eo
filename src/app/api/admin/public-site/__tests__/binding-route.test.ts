import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  can: vi.fn(),
  readPublicSiteAstroBinding: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => mocks.can(...args)
}))

vi.mock('@/lib/public-site/astro', () => ({
  readPublicSiteAstroBinding: () => mocks.readPublicSiteAstroBinding()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

const ADMIN_TENANT = {
  userId: 'user-admin-1',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['admin', 'internal']
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminTenantContext.mockResolvedValue({ tenant: ADMIN_TENANT, errorResponse: null })
  mocks.can.mockReturnValue(true)
  mocks.readPublicSiteAstroBinding.mockResolvedValue({
    contractVersion: 'public-site-astro-binding.v1',
    status: 'ok',
    confidence: 'high'
  })
})

describe('GET /api/admin/public-site/binding', () => {
  it('returns the Astro binding packet for authorized admins', async () => {
    const { GET } = await import('../binding/route')

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.contractVersion).toBe('public-site-astro-binding.v1')
    expect(mocks.can).toHaveBeenCalledWith(
      ADMIN_TENANT,
      'public_site.runtime_binding.read',
      'read',
      'tenant'
    )
    expect(mocks.can).toHaveBeenCalledWith(
      ADMIN_TENANT,
      'public_site.route_ownership.read',
      'read',
      'tenant'
    )
  })

  it('returns 403 when runtime binding capability is missing', async () => {
    mocks.can.mockReturnValueOnce(false)
    const { GET } = await import('../binding/route')

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.requiredCapability).toBe('public_site.runtime_binding.read')
    expect(mocks.readPublicSiteAstroBinding).not.toHaveBeenCalled()
  })

  it('returns 403 when route ownership capability is missing', async () => {
    mocks.can.mockReturnValueOnce(true).mockReturnValueOnce(false)
    const { GET } = await import('../binding/route')

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.requiredCapability).toBe('public_site.route_ownership.read')
    expect(mocks.readPublicSiteAstroBinding).not.toHaveBeenCalled()
  })

  it('sanitizes unexpected reader failures', async () => {
    mocks.readPublicSiteAstroBinding.mockRejectedValueOnce(new Error('provider exploded'))
    const { GET } = await import('../binding/route')

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.code).toBe('internal_error')
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })
})
