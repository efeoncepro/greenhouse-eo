import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockListPartyLifecycleSnapshots = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/commercial/party', async () => {
  const actual = await vi.importActual('@/lib/commercial/party')

  return {
    ...actual,
    listPartyLifecycleSnapshots: (...args: unknown[]) => mockListPartyLifecycleSnapshots(...args)
  }
})

import { GET } from './route'

describe('GET /api/admin/commercial/parties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: { userId: 'usr-1', roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockListPartyLifecycleSnapshots.mockResolvedValue({
      items: [{ organizationId: 'org-1', lifecycleStage: 'prospect' }],
      total: 1
    })
  })

  it('returns filtered snapshots for admin callers', async () => {
    const response = await GET(
      new Request('http://localhost/api/admin/commercial/parties?q=acme&stages=prospect')
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListPartyLifecycleSnapshots).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'acme',
        stages: ['prospect']
      })
    )
    expect(body.total).toBe(1)
  })

  it('rejects invalid stage filters', async () => {
    const response = await GET(
      new Request('http://localhost/api/admin/commercial/parties?stages=unknown')
    )

    expect(response.status).toBe(400)
  })
})
