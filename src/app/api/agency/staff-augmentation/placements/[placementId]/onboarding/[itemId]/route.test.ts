import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockUpdateStaffAugOnboardingItem = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/staff-augmentation/store', () => ({
  updateStaffAugOnboardingItem: (...args: unknown[]) => mockUpdateStaffAugOnboardingItem(...args)
}))

import { PATCH } from '@/app/api/agency/staff-augmentation/placements/[placementId]/onboarding/[itemId]/route'

describe('Agency Staff Aug onboarding item route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })
  })

  it('updates onboarding item status with the tenant actor id', async () => {
    mockUpdateStaffAugOnboardingItem.mockResolvedValue([
      {
        onboardingItemId: 'item-1',
        status: 'done'
      }
    ])

    const response = await PATCH(
      new Request('http://localhost/api/agency/staff-augmentation/placements/placement-1/onboarding/item-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      }),
      { params: Promise.resolve({ placementId: 'placement-1', itemId: 'item-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockUpdateStaffAugOnboardingItem).toHaveBeenCalledWith(
      'placement-1',
      'item-1',
      { status: 'done' },
      'user-1'
    )
    await expect(response.json()).resolves.toMatchObject({
      placementId: 'placement-1',
      onboardingItems: [{ onboardingItemId: 'item-1', status: 'done' }]
    })
  })

  it('returns 400 when onboarding update fails', async () => {
    mockUpdateStaffAugOnboardingItem.mockRejectedValue(new Error('status is invalid.'))

    const response = await PATCH(
      new Request('http://localhost/api/agency/staff-augmentation/placements/placement-1/onboarding/item-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'invalid' })
      }),
      { params: Promise.resolve({ placementId: 'placement-1', itemId: 'item-1' }) }
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'status is invalid.'
    })
  })
})
