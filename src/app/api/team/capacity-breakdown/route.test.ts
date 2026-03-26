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

  it('excludes internal efeonce assignments and caps the contractual envelope at 1.0 FTE', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: false }])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          display_name: 'Andres Carlosama',
          role_title: 'Operations Lead',
          fte_allocation: '1.000',
          contracted_hours_month: 160,
          client_id: 'client_internal',
          client_name: 'Efeonce Internal',
          active_assets: 0
        },
        {
          member_id: 'member-1',
          display_name: 'Andres Carlosama',
          role_title: 'Operations Lead',
          fte_allocation: '1.000',
          contracted_hours_month: 160,
          client_id: 'client-sky',
          client_name: 'Sky Airline',
          active_assets: 0
        },
        {
          member_id: 'member-2',
          display_name: 'Luis Reyes',
          role_title: 'Hubspot Specialist',
          fte_allocation: '1.000',
          contracted_hours_month: 160,
          client_id: 'client_internal',
          client_name: 'Efeonce Internal',
          active_assets: 0
        },
        {
          member_id: 'member-2',
          display_name: 'Luis Reyes',
          role_title: 'Hubspot Specialist',
          fte_allocation: '0.300',
          contracted_hours_month: 48,
          client_id: 'client-sky',
          client_name: 'Sky Airline',
          active_assets: 0
        }
      ])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.memberCount).toBe(2)
    expect(body.hasOperationalMetrics).toBe(false)
    expect(body.team).toMatchObject({
      contractedHoursMonth: 320,
      assignedHoursMonth: 208,
      usedHoursMonth: null,
      availableHoursMonth: 112
    })
    expect(body.members[0]).toMatchObject({
      displayName: 'Andres Carlosama',
      fteAllocation: 1,
      capacityHealth: 'high'
    })
    expect(body.members[0].capacity).toMatchObject({
      contractedHoursMonth: 160,
      assignedHoursMonth: 160,
      availableHoursMonth: 0
    })
    expect(body.members[1]).toMatchObject({
      displayName: 'Luis Reyes',
      fteAllocation: 0.3
    })
    expect(body.members[1].capacity).toMatchObject({
      contractedHoursMonth: 160,
      assignedHoursMonth: 48,
      availableHoursMonth: 112
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
          client_id: 'client-sky',
          client_name: 'Sky Airline',
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
