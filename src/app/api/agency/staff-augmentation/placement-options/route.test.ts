import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockListStaffAugPlacementOptions = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/staff-augmentation/store', () => ({
  listStaffAugPlacementOptions: (...args: unknown[]) => mockListStaffAugPlacementOptions(...args)
}))

import { GET } from '@/app/api/agency/staff-augmentation/placement-options/route'

describe('Agency Staff Aug placement options route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1' },
      errorResponse: null
    })
  })

  it('returns lightweight placement options for the create dialog', async () => {
    mockListStaffAugPlacementOptions.mockResolvedValue([
      {
        assignmentId: 'assignment-1',
        clientId: 'client-1',
        clientName: 'Sky Airline',
        memberId: 'member-1',
        memberName: 'Daniela Ferreira',
        spaceId: 'space-1',
        spaceName: 'Sky',
        organizationId: 'org-1',
        organizationName: 'Sky Org',
        assignmentType: 'internal',
        placementId: null,
        placementStatus: null,
        compensationVersionId: 'comp-1',
        payRegime: 'international',
        contractType: 'contractor',
        label: 'Daniela Ferreira · Sky Airline',
        compensation: {
          payRegime: 'international',
          contractType: 'contractor',
          costRateAmount: 2800,
          costRateCurrency: 'USD'
        }
      }
    ])

    const response = await GET(new Request('http://localhost/api/agency/staff-augmentation/placement-options?search=sky'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListStaffAugPlacementOptions).toHaveBeenCalledTimes(1)
    expect(mockListStaffAugPlacementOptions).toHaveBeenCalledWith({
      search: 'sky',
      assignmentId: null,
      limit: 20
    })
    expect(body).toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          assignmentId: 'assignment-1',
          clientName: 'Sky Airline',
          memberName: 'Daniela Ferreira',
          compensation: expect.objectContaining({
            contractType: 'contractor',
            costRateAmount: 2800
          })
        })
      ]
    })
  })

  it('supports fetching a single assignment by id for People deep-links', async () => {
    mockListStaffAugPlacementOptions.mockResolvedValue([])

    const response = await GET(new Request('http://localhost/api/agency/staff-augmentation/placement-options?assignmentId=assignment-2&limit=1'))

    expect(response.status).toBe(200)
    expect(mockListStaffAugPlacementOptions).toHaveBeenCalledWith({
      search: '',
      assignmentId: 'assignment-2',
      limit: 1
    })
  })
})
