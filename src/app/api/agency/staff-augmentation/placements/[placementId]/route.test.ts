import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockGetStaffAugPlacementDetail = vi.fn()
const mockUpdateStaffAugPlacement = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/staff-augmentation/store', () => ({
  getStaffAugPlacementDetail: (...args: unknown[]) => mockGetStaffAugPlacementDetail(...args),
  updateStaffAugPlacement: (...args: unknown[]) => mockUpdateStaffAugPlacement(...args)
}))

import { GET, PATCH } from '@/app/api/agency/staff-augmentation/placements/[placementId]/route'

describe('Agency Staff Aug placement detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })
  })

  it('returns 404 when the placement does not exist', async () => {
    mockGetStaffAugPlacementDetail.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/agency/staff-augmentation/placements/placement-404'), {
      params: Promise.resolve({ placementId: 'placement-404' })
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Placement not found.'
    })
  })

  it('returns placement detail when it exists', async () => {
    mockGetStaffAugPlacementDetail.mockResolvedValue({
      placementId: 'placement-1',
      publicId: 'EO-PLC-001'
    })

    const response = await GET(new Request('http://localhost/api/agency/staff-augmentation/placements/placement-1'), {
      params: Promise.resolve({ placementId: 'placement-1' })
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      placementId: 'placement-1',
      publicId: 'EO-PLC-001'
    })
  })

  it('updates a placement with the tenant actor id', async () => {
    mockUpdateStaffAugPlacement.mockResolvedValue({
      placementId: 'placement-1',
      status: 'active'
    })

    const response = await PATCH(
      new Request('http://localhost/api/agency/staff-augmentation/placements/placement-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      }),
      { params: Promise.resolve({ placementId: 'placement-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockUpdateStaffAugPlacement).toHaveBeenCalledWith('placement-1', { status: 'active' }, 'user-1')
  })
})
