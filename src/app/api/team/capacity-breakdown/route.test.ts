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

    mockReadMemberCapacityEconomicsBatch.mockResolvedValue(
      new Map([
        ['member-1', {
          memberId: 'member-1',
          periodYear: 2026,
          periodMonth: 3,
          contractedFte: 1,
          contractedHours: 160,
          assignedHours: 160,
          usageKind: 'percent',
          usedHours: null,
          usagePercent: 78,
          commercialAvailabilityHours: 0,
          operationalAvailabilityHours: null,
          sourceCurrency: 'CLP',
          targetCurrency: 'CLP',
          totalCompSource: null,
          totalLaborCostTarget: null,
          directOverheadTarget: 0,
          sharedOverheadTarget: 0,
          loadedCostTarget: null,
          costPerHourTarget: null,
          suggestedBillRateTarget: null,
          fxRate: null,
          fxRateDate: null,
          fxProvider: null,
          fxStrategy: null,
          snapshotStatus: 'partial',
          sourceCompensationVersionId: null,
          sourcePayrollPeriodId: null,
          assignmentCount: 1,
          materializedAt: null
        }]
      ])
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.memberCount).toBe(1)
    expect(body.hasOperationalMetrics).toBe(true)
    expect(body.team).toMatchObject({
      contractedHoursMonth: 160,
      assignedHoursMonth: 160,
      usedHoursMonth: null,
      availableHoursMonth: 0,
      usageKind: 'percent',
      usagePercent: 78
    })
    expect(body.members[0]).toMatchObject({
      displayName: 'Andres Carlosama',
      fteAllocation: 1,
      capacityHealth: 'balanced',
      usageKind: 'percent',
      usagePercent: 78
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

    mockReadMemberCapacityEconomicsBatch.mockResolvedValue(
      new Map([
        ['member-1', {
          memberId: 'member-1',
          periodYear: 2026,
          periodMonth: 3,
          contractedFte: 1,
          contractedHours: 160,
          assignedHours: 160,
          usageKind: 'percent',
          usedHours: null,
          usagePercent: 100,
          commercialAvailabilityHours: 0,
          operationalAvailabilityHours: null,
          sourceCurrency: 'CLP',
          targetCurrency: 'CLP',
          totalCompSource: null,
          totalLaborCostTarget: null,
          directOverheadTarget: 0,
          sharedOverheadTarget: 0,
          loadedCostTarget: null,
          costPerHourTarget: null,
          suggestedBillRateTarget: null,
          fxRate: null,
          fxRateDate: null,
          fxProvider: null,
          fxStrategy: null,
          snapshotStatus: 'partial',
          sourceCompensationVersionId: null,
          sourcePayrollPeriodId: null,
          assignmentCount: 1,
          materializedAt: null
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
    expect(body.team.availableHoursMonth).toBe(0)
    expect(body.members[0].capacityHealth).toBe('overloaded')
  })
})
