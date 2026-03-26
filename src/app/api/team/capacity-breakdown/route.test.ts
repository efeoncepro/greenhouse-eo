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
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          display_name: 'Andres Carlosama',
          role_title: 'Operations Lead',
          role_category: 'operations',
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
          role_category: 'operations',
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
          role_category: 'media',
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
          role_category: 'media',
          fte_allocation: '0.300',
          contracted_hours_month: 48,
          client_id: 'client-sky',
          client_name: 'Sky Airline',
          active_assets: 0
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 3,
          active_tasks: 0,
          completed_tasks: 28,
          throughput_count: 28
        }
      ])
      // Intelligence query (person_operational_360 enrichment)
      .mockResolvedValueOnce([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.memberCount).toBe(1)
    expect(body.hasOperationalMetrics).toBe(true)
    expect(body.team).toMatchObject({
      contractedHoursMonth: 160,
      assignedHoursMonth: 160,
      usedHoursMonth: 149,
      availableHoursMonth: 0
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
  })

  it('uses latest operational metrics to compute used hours from throughput activity', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          display_name: 'Daniela Ferreira',
          role_title: 'Designer',
          role_category: 'design',
          fte_allocation: '1.000',
          contracted_hours_month: 160,
          client_id: 'client-sky',
          client_name: 'Sky Airline'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 3,
          active_tasks: 3,
          completed_tasks: 65,
          throughput_count: 65
        }
      ])
      // Intelligence query (person_operational_360 enrichment)
      .mockResolvedValueOnce([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasOperationalMetrics).toBe(true)
    expect(body.team.usedHoursMonth).toBe(160)
    expect(body.team.availableHoursMonth).toBe(0)
    expect(body.members[0].capacityHealth).toBe('overloaded')
  })
})
