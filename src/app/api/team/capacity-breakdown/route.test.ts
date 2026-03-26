import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { GET } from '@/app/api/team/capacity-breakdown/route'

describe('GET /api/team/capacity-breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAgencyTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['internal'] },
      errorResponse: null
    })
  })

  it('aggregates active assignments by unique member and flags missing operational metrics', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: false }])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          display_name: 'Andres Carlosama',
          role_title: 'Operations Lead',
          fte_allocation: '2.000',
          contracted_hours_month: 320,
          active_assets: 0
        },
        {
          member_id: 'member-2',
          display_name: 'Luis Reyes',
          role_title: 'Hubspot Specialist',
          fte_allocation: '1.300',
          contracted_hours_month: 208,
          active_assets: 0
        }
      ])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.memberCount).toBe(2)
    expect(body.hasOperationalMetrics).toBe(false)
    expect(body.team).toMatchObject({
      contractedHoursMonth: 528,
      assignedHoursMonth: 528,
      usedHoursMonth: null,
      availableHoursMonth: 0
    })
    expect(body.members[0]).toMatchObject({
      displayName: 'Andres Carlosama',
      fteAllocation: 2,
      capacityHealth: 'high'
    })
  })

  it('uses operational metrics when the serving table is available', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          display_name: 'Daniela Ferreira',
          role_title: 'Designer',
          fte_allocation: '1.000',
          contracted_hours_month: 160,
          active_assets: 10
        }
      ])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasOperationalMetrics).toBe(true)
    expect(body.team.usedHoursMonth).toBeGreaterThan(0)
    expect(body.team.availableHoursMonth).toBe(0)
    expect(body.members[0].capacityHealth).toBe('balanced')
  })
})
