import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockListStaffAugPlacements = vi.fn()
const mockCreateStaffAugPlacement = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/staff-augmentation/store', () => ({
  listStaffAugPlacements: (...args: unknown[]) => mockListStaffAugPlacements(...args),
  createStaffAugPlacement: (...args: unknown[]) => mockCreateStaffAugPlacement(...args)
}))

import { GET, POST } from '@/app/api/agency/staff-augmentation/placements/route'

describe('Agency Staff Aug placements route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })
  })

  it('lists placements with normalized pagination and filters', async () => {
    mockListStaffAugPlacements.mockResolvedValue({
      items: [],
      total: 0,
      summary: { activeCount: 0, onboardingCount: 0, noSnapshotCount: 0 },
      page: 1,
      pageSize: 25
    })

    const response = await GET(
      new Request('http://localhost/api/agency/staff-augmentation/placements?page=0&pageSize=999&search=sky&status=active&businessUnit=reach')
    )

    expect(response.status).toBe(200)
    expect(mockListStaffAugPlacements).toHaveBeenCalledWith({
      page: 1,
      pageSize: 200,
      search: 'sky',
      status: 'active',
      businessUnit: 'reach'
    })
  })

  it('creates a placement with the tenant actor id', async () => {
    mockCreateStaffAugPlacement.mockResolvedValue({
      placementId: 'placement-1',
      publicId: 'EO-PLC-001'
    })

    const response = await POST(
      new Request('http://localhost/api/agency/staff-augmentation/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: 'assignment-1',
          businessUnit: 'reach',
          status: 'pipeline'
        })
      })
    )

    expect(response.status).toBe(201)
    expect(mockCreateStaffAugPlacement).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 'assignment-1',
        businessUnit: 'reach',
        status: 'pipeline'
      }),
      'user-1'
    )
  })

  it('returns validation errors from creation as 400', async () => {
    mockCreateStaffAugPlacement.mockRejectedValue(new Error('Assignment already has a staff augmentation placement.'))

    const response = await POST(
      new Request('http://localhost/api/agency/staff-augmentation/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: 'assignment-1',
          businessUnit: 'reach'
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Assignment already has a staff augmentation placement.'
    })
  })
})
