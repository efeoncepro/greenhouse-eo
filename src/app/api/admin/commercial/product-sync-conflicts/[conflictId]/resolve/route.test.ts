import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockHasEntitlement = vi.fn()
const mockResolveProductSyncConflict = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  hasEntitlement: (...args: unknown[]) => mockHasEntitlement(...args)
}))

vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))

vi.mock('@/lib/commercial/product-catalog/conflict-resolution-commands', () => ({
  resolveProductSyncConflict: (...args: unknown[]) => mockResolveProductSyncConflict(...args)
}))

import { POST } from './route'

describe('POST /api/admin/commercial/product-sync-conflicts/[conflictId]/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: { userId: 'usr-1', roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockHasEntitlement.mockReturnValue(true)
    mockResolveProductSyncConflict.mockResolvedValue({
      conflict: { conflictId: 'conf-1', resolutionStatus: 'resolved_greenhouse_wins' },
      action: 'replay_greenhouse',
      pushStatus: 'synced'
    })
  })

  it('rejects unsupported fields for accept_hubspot_field', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/commercial/product-sync-conflicts/conf-1/resolve', {
        method: 'POST',
        body: JSON.stringify({ action: 'accept_hubspot_field', field: 'bad_field', reason: 'test' })
      }),
      { params: Promise.resolve({ conflictId: 'conf-1' }) }
    )

    expect(response.status).toBe(400)
    expect(mockResolveProductSyncConflict).not.toHaveBeenCalled()
  })

  it('delegates valid actions to the resolution command', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/commercial/product-sync-conflicts/conf-1/resolve', {
        method: 'POST',
        body: JSON.stringify({ action: 'replay_greenhouse', reason: 'Replay authoritative state' })
      }),
      { params: Promise.resolve({ conflictId: 'conf-1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockResolveProductSyncConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictId: 'conf-1',
        action: 'replay_greenhouse',
        actor: expect.objectContaining({
          userId: 'usr-1',
          reason: 'Replay authoritative state'
        })
      })
    )
    expect(body.pushStatus).toBe('synced')
  })
})
