import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockHasEntitlement = vi.fn()
const mockOverridePartyLifecycle = vi.fn()
const mockMaterializePartyLifecycleSnapshot = vi.fn()

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
    overridePartyLifecycle: (...args: unknown[]) => mockOverridePartyLifecycle(...args),
    materializePartyLifecycleSnapshot: (...args: unknown[]) =>
      mockMaterializePartyLifecycleSnapshot(...args)
  }
})

import { POST } from './route'

describe('POST /api/admin/commercial/parties/[partyId]/transition', () => {
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
    mockOverridePartyLifecycle.mockResolvedValue({
      organizationId: 'org-1',
      commercialPartyId: 'party-1',
      fromStage: 'prospect',
      toStage: 'opportunity',
      transitionedAt: '2026-04-21T10:00:00.000Z',
      historyId: 'hist-1'
    })
    mockMaterializePartyLifecycleSnapshot.mockResolvedValue({
      organizationId: 'org-1',
      lifecycleStage: 'opportunity'
    })
  })

  it('requires override capability', async () => {
    mockHasEntitlement.mockReturnValue(false)

    const response = await POST(
      new Request('http://localhost/api/admin/commercial/parties/party-1/transition', {
        method: 'POST',
        body: JSON.stringify({ toStage: 'opportunity', reason: 'Sales qualified lead' })
      }),
      { params: Promise.resolve({ partyId: 'party-1' }) }
    )

    expect(response.status).toBe(403)
  })

  it('executes the override and returns the refreshed snapshot', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/commercial/parties/party-1/transition', {
        method: 'POST',
        body: JSON.stringify({ toStage: 'opportunity', reason: 'Sales qualified lead' })
      }),
      { params: Promise.resolve({ partyId: 'party-1' }) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockOverridePartyLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        partyId: 'party-1',
        toStage: 'opportunity'
      })
    )
    expect(body.snapshot).toEqual(expect.objectContaining({ lifecycleStage: 'opportunity' }))
  })
})
