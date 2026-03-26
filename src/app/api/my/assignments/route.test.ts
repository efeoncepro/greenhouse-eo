import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireMyTenantContext = vi.fn()
const mockGetPersonFinanceOverviewFromPostgres = vi.fn()
const mockReadMemberCapacityEconomicsSnapshot = vi.fn()
const mockReadLatestMemberCapacityEconomicsSnapshot = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireMyTenantContext: (...args: unknown[]) => mockRequireMyTenantContext(...args)
}))

vi.mock('@/lib/person-360/get-person-finance', () => ({
  getPersonFinanceOverviewFromPostgres: (...args: unknown[]) => mockGetPersonFinanceOverviewFromPostgres(...args)
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readMemberCapacityEconomicsSnapshot: (...args: unknown[]) => mockReadMemberCapacityEconomicsSnapshot(...args),
  readLatestMemberCapacityEconomicsSnapshot: (...args: unknown[]) => mockReadLatestMemberCapacityEconomicsSnapshot(...args)
}))

import { GET } from '@/app/api/my/assignments/route'

describe('GET /api/my/assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-26T15:00:00.000Z'))

    mockRequireMyTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['internal'] },
      memberId: 'member-1',
      errorResponse: null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current member capacity snapshot alongside assignment rows', async () => {
    mockGetPersonFinanceOverviewFromPostgres.mockResolvedValue({
      assignments: [
        {
          assignmentId: 'asg-1',
          clientId: 'client-sky',
          clientName: 'Sky Airline',
          fteAllocation: 1,
          hoursPerMonth: 160,
          roleTitleOverride: 'Designer',
          startDate: '2026-03-01',
          active: true
        }
      ],
      summary: {
        activeAssignmentsCount: 1,
        payrollEntriesCount: 2,
        expenseCount: 0,
        paidExpensesCount: 0,
        totalExpensesClp: 0,
        lastExpenseDate: null
      }
    })
    mockReadMemberCapacityEconomicsSnapshot.mockResolvedValue({
      periodYear: 2026,
      periodMonth: 3,
      contractedFte: 1,
      contractedHours: 160,
      assignedHours: 160,
      usageKind: 'percent',
      usedHours: null,
      usagePercent: 86,
      commercialAvailabilityHours: 0,
      operationalAvailabilityHours: null,
      targetCurrency: 'CLP',
      costPerHourTarget: 12937.5,
      suggestedBillRateTarget: 17465.63
    })
    mockReadLatestMemberCapacityEconomicsSnapshot.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.assignments).toHaveLength(1)
    expect(body.capacity).toMatchObject({
      periodYear: 2026,
      periodMonth: 3,
      assignedHours: 160,
      usageKind: 'percent',
      usagePercent: 86,
      commercialAvailabilityHours: 0,
      targetCurrency: 'CLP'
    })
  })
})
