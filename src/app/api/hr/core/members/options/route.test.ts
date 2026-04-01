import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireHrCoreReadTenantContext = vi.fn()
const mockGetPeopleList = vi.fn()

vi.mock('@/lib/hr-core/shared', () => ({
  requireHrCoreReadTenantContext: (...args: unknown[]) => mockRequireHrCoreReadTenantContext(...args),
  toHrCoreErrorResponse: vi.fn((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage

    return Response.json({ error: message }, { status: 500 })
  })
}))

vi.mock('@/lib/people/get-people-list', () => ({
  getPeopleList: (...args: unknown[]) => mockGetPeopleList(...args)
}))

import { GET } from '@/app/api/hr/core/members/options/route'

describe('GET /api/hr/core/members/options', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRequireHrCoreReadTenantContext.mockResolvedValue({
      tenant: { userId: 'user-1', routeGroups: ['hr'] },
      errorResponse: null
    })
  })

  it('returns active members from the canonical people reader', async () => {
    mockGetPeopleList.mockResolvedValue({
      items: [
        {
          memberId: 'member-1',
          displayName: 'Daniela Ferreira',
          roleTitle: 'Operations Lead',
          active: true
        },
        {
          memberId: 'member-2',
          displayName: 'Inactive Person',
          roleTitle: 'Former Role',
          active: false
        }
      ]
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.members).toEqual([
      {
        memberId: 'member-1',
        displayName: 'Daniela Ferreira',
        roleTitle: 'Operations Lead'
      }
    ])
  })
})
