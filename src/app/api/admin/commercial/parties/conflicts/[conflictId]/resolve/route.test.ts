import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockHasEntitlement = vi.fn()
const mockResolvePartySyncConflict = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  hasEntitlement: (...args: unknown[]) => mockHasEntitlement(...args)
}))

vi.mock('@/lib/commercial/party', async () => {
  const actual = await vi.importActual('@/lib/commercial/party')

  return {
    ...actual,
    buildTenantEntitlementSubject: (tenant: unknown) => tenant,
    resolvePartySyncConflict: (...args: unknown[]) => mockResolvePartySyncConflict(...args)
  }
})

import { POST } from './route'

describe('POST /api/admin/commercial/parties/conflicts/[conflictId]/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: {
        userId: 'usr-1',
        roleCodes: ['efeonce_admin']
      },
      errorResponse: null
    })
    mockHasEntitlement.mockReturnValue(true)
    mockResolvePartySyncConflict.mockResolvedValue({
      conflict: { conflictId: 'conf-1', resolutionStatus: 'ignored' },
      action: 'ignore'
    })
  })

  it('validates the action value', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/commercial/parties/conflicts/conf-1/resolve', {
        method: 'POST',
        body: JSON.stringify({ action: 'bad' })
      }),
      { params: Promise.resolve({ conflictId: 'conf-1' }) }
    )

    expect(response.status).toBe(400)
  })

  it('delegates the resolution command for valid actions', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/commercial/parties/conflicts/conf-1/resolve', {
        method: 'POST',
        body: JSON.stringify({ action: 'ignore', reason: 'Not actionable' })
      }),
      { params: Promise.resolve({ conflictId: 'conf-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockResolvePartySyncConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictId: 'conf-1',
        action: 'ignore'
      })
    )
  })
})
