import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  can: vi.fn(),
  inspectPublicSiteBridge: vi.fn(),
  captureWithDomain: vi.fn(),
  redactErrorForResponse: vi.fn((error: unknown) => (error instanceof Error ? error.message : 'redacted'))
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => mocks.can(...args)
}))

vi.mock('@/lib/public-site/bridge-inspection', () => ({
  inspectPublicSiteBridge: (...args: unknown[]) => mocks.inspectPublicSiteBridge(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (error: unknown) => mocks.redactErrorForResponse(error)
}))

const ADMIN_TENANT = {
  userId: 'user-admin-1',
  spaceId: 'space-1',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin']
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminTenantContext.mockResolvedValue({ tenant: ADMIN_TENANT, errorResponse: null })
  mocks.can.mockReturnValue(true)
  mocks.inspectPublicSiteBridge.mockResolvedValue({
    contractVersion: 'public-site-bridge-inspection.v1',
    pageId: 244079,
    mode: 'read_only',
    endpoints: {
      health: { status: 200, ok: true, summary: {} },
      elementorDocument: { status: 200, ok: true, summary: {} },
      ohioWidgetCatalog: null
    }
  })
})

describe('GET /api/admin/public-site/bridge-inspection', () => {
  it('returns a read-only bridge inspection report', async () => {
    const { GET } = await import('../bridge-inspection/route')

    const response = await GET(
      new Request('http://localhost/api/admin/public-site/bridge-inspection?pageId=244079&includeCatalog=false')
    )

    expect(response.status).toBe(200)
    expect(mocks.can).toHaveBeenCalledWith(
      ADMIN_TENANT,
      'platform.public_site.bridge.inspect',
      'read',
      'all'
    )
    expect(mocks.inspectPublicSiteBridge).toHaveBeenCalledWith({
      pageId: 244079,
      includeCatalog: false
    })

    const json = await response.json()

    expect(json.contractVersion).toBe('public-site-bridge-inspection.v1')
  })

  it('rejects invalid pageId before calling WordPress', async () => {
    const { GET } = await import('../bridge-inspection/route')

    const response = await GET(
      new Request('http://localhost/api/admin/public-site/bridge-inspection?pageId=abc')
    )

    expect(response.status).toBe(400)
    expect(mocks.inspectPublicSiteBridge).not.toHaveBeenCalled()
  })

  it('returns 403 when admin lacks the inspection capability', async () => {
    mocks.can.mockReturnValueOnce(false)
    const { GET } = await import('../bridge-inspection/route')

    const response = await GET(
      new Request('http://localhost/api/admin/public-site/bridge-inspection?pageId=244079')
    )

    expect(response.status).toBe(403)
    expect(mocks.inspectPublicSiteBridge).not.toHaveBeenCalled()
  })

  it('returns 503 when WordPress bridge auth is not configured', async () => {
    mocks.inspectPublicSiteBridge.mockRejectedValueOnce(
      new Error('wordpress_authentication_not_configured:secret_ref_not_configured')
    )
    const { GET } = await import('../bridge-inspection/route')

    const response = await GET(
      new Request('http://localhost/api/admin/public-site/bridge-inspection?pageId=244079')
    )

    expect(response.status).toBe(503)
    expect(mocks.captureWithDomain).not.toHaveBeenCalled()
  })
})
