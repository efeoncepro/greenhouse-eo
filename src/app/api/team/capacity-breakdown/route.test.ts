import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAgencyTenantContext = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()
const mockReadMemberCapacityEconomicsBatch = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAgencyTenantContext: (...args: unknown[]) => mockRequireAgencyTenantContext(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readMemberCapacityEconomicsBatch: (...args: unknown[]) => mockReadMemberCapacityEconomicsBatch(...args)
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

  it('shows all active members including those without external assignments', async () => {
    // Query 1: all active members
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { member_id: 'member-1', display_name: 'Andres Carlosama', role_title: 'Operations Lead', role_category: 'operations' },
        { member_id: 'member-2', display_name: 'Luis Reyes', role_title: 'HubSpot Specialist', role_category: 'media' },
        { member_id: 'member-3', display_name: 'Valentina Hoyos', role_title: 'Designer', role_category: 'design' }
      ])

      // Query 2: active assignments
      .mockResolvedValueOnce([
        { assignment_id: 'a-internal', member_id: 'member-1', client_id: 'client_internal', client_name: 'Efeonce Internal', role_title_override: null, fte_allocation: '1.000', contracted_hours_month: 160, start_date: '2026-01-01', assignment_type: 'internal', placement_id: null, placement_status: null },
        { assignment_id: 'a-sky', member_id: 'member-1', client_id: 'client-sky', client_name: 'Sky Airline', role_title_override: null, fte_allocation: '1.000', contracted_hours_month: 160, start_date: '2026-01-01', assignment_type: 'staff_augmentation', placement_id: 'placement-1', placement_status: 'active' },
        { assignment_id: 'a-sky-2', member_id: 'member-2', client_id: 'client-sky', client_name: 'Sky Airline', role_title_override: null, fte_allocation: '0.300', contracted_hours_month: 48, start_date: '2026-02-01', assignment_type: 'internal', placement_id: null, placement_status: null }
      ])

    mockReadMemberCapacityEconomicsBatch.mockResolvedValue(
      new Map([
        ['member-1', {
          contractedFte: 1, contractedHours: 160, assignedHours: 160,
          usageKind: 'percent', usedHours: null, usagePercent: 78,
          commercialAvailabilityHours: 0, operationalAvailabilityHours: null,
          costPerHourTarget: null, suggestedBillRateTarget: null, targetCurrency: 'CLP'
        }],
        ['member-3', {
          contractedFte: 1, contractedHours: 160, assignedHours: 0,
          usageKind: 'percent', usedHours: null, usagePercent: 0,
          commercialAvailabilityHours: 160, operationalAvailabilityHours: null,
          costPerHourTarget: null, suggestedBillRateTarget: null, targetCurrency: 'CLP'
        }]
      ])
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)

    // All 3 members appear (not just those with external assignments)
    expect(body.memberCount).toBe(3)
    expect(body.members.map((m: { displayName: string }) => m.displayName)).toEqual([
      'Andres Carlosama', 'Luis Reyes', 'Valentina Hoyos'
    ])

    // Andres: has snapshot + external assignment
    expect(body.members[0]).toMatchObject({
      displayName: 'Andres Carlosama',
      fteAllocation: 1,
      capacityHealth: 'balanced',
      usageKind: 'percent'
    })
    expect(body.members[0].assignments).toHaveLength(1) // only Sky, not internal
    expect(body.members[0].assignments[0]).toMatchObject({
      assignmentType: 'staff_augmentation',
      placementId: 'placement-1',
      placementStatus: 'active'
    })

    // Luis: has external assignment but no snapshot — uses fallback
    expect(body.members[1]).toMatchObject({
      displayName: 'Luis Reyes',
      capacity: expect.objectContaining({ assignedHoursMonth: 48 })
    })
    expect(body.members[1].assignments).toHaveLength(1)

    // Valentina: no assignments at all — shows as idle/available
    expect(body.members[2]).toMatchObject({
      displayName: 'Valentina Hoyos',
      capacityHealth: 'idle'
    })
    expect(body.members[2].assignments).toHaveLength(0)
    expect(body.members[2].capacity.availableHoursMonth).toBe(160)
  })

  it('computes team totals across all members including unassigned ones', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { member_id: 'member-1', display_name: 'Daniela Ferreira', role_title: 'Designer', role_category: 'design' }
      ])
      .mockResolvedValueOnce([
        { assignment_id: 'a-1', member_id: 'member-1', client_id: 'client-sky', client_name: 'Sky Airline', role_title_override: null, fte_allocation: '1.000', contracted_hours_month: 160, start_date: null, assignment_type: 'internal', placement_id: null, placement_status: null }
      ])

    mockReadMemberCapacityEconomicsBatch.mockResolvedValue(
      new Map([
        ['member-1', {
          contractedFte: 1, contractedHours: 160, assignedHours: 160,
          usageKind: 'percent', usedHours: null, usagePercent: 100,
          commercialAvailabilityHours: 0, operationalAvailabilityHours: null,
          costPerHourTarget: null, suggestedBillRateTarget: null, targetCurrency: 'CLP'
        }]
      ])
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.hasOperationalMetrics).toBe(true)
    expect(body.team.usedHoursMonth).toBeNull()
    expect(body.team.usageKind).toBe('percent')
    expect(body.team.usagePercent).toBe(100)
    expect(body.members[0].capacityHealth).toBe('high') // 100% allocation = full dedication, not overloaded
  })
})
