import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockReadMemberCapacityEconomicsSnapshot = vi.fn()
const mockUpsertPersonIntelligence = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readMemberCapacityEconomicsSnapshot: (...args: unknown[]) => mockReadMemberCapacityEconomicsSnapshot(...args)
}))

vi.mock('@/lib/person-intelligence/store', () => ({
  upsertPersonIntelligence: (...args: unknown[]) => mockUpsertPersonIntelligence(...args)
}))

vi.mock('@/lib/sync/projections/member-capacity-economics', () => ({
  refreshMemberCapacityEconomicsForMember: vi.fn()
}))

import {
  getPersonIntelligencePeriodFromPayload,
  personIntelligenceProjection
} from '@/lib/sync/projections/person-intelligence'

describe('personIntelligenceProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-26T15:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reuses member_capacity_economics for capacity and cost fields', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rpa_avg: 1.7,
          rpa_median: 1.5,
          otd_pct: 72,
          ftr_pct: 88,
          cycle_time_avg_days: 3.2,
          throughput_count: 14,
          pipeline_velocity: 0.8,
          stuck_asset_count: 1,
          stuck_asset_pct: 4,
          total_tasks: 18,
          completed_tasks: 14,
          active_tasks: 4
        }
      ])
      .mockResolvedValueOnce([
        {
          version_id: 'cv-1',
          base_salary: 2200,
          remote_allowance: 100,
          currency: 'USD'
        }
      ])
      .mockResolvedValueOnce([
        {
          role_category: 'design'
        }
      ])

    mockReadMemberCapacityEconomicsSnapshot.mockResolvedValue({
      memberId: 'member-1',
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
      sourceCurrency: 'USD',
      targetCurrency: 'CLP',
      totalCompSource: 2300,
      totalLaborCostTarget: 2070000,
      directOverheadTarget: 0,
      sharedOverheadTarget: 0,
      loadedCostTarget: 2070000,
      costPerHourTarget: 12937.5,
      suggestedBillRateTarget: 17465.63,
      fxRate: 900,
      fxRateDate: '2026-03-31',
      fxProvider: 'mindicador',
      fxStrategy: 'period_last_business_day',
      snapshotStatus: 'complete',
      sourceCompensationVersionId: 'cv-1',
      sourcePayrollPeriodId: '2026-03',
      assignmentCount: 1,
      materializedAt: '2026-03-26T15:00:00.000Z'
    })

    const result = await personIntelligenceProjection.refresh(
      { entityType: 'member', entityId: 'member-1' },
      { memberId: 'member-1' }
    )

    expect(result).toContain('refreshed person_intelligence for member-1 (2026-03)')
    expect(mockUpsertPersonIntelligence).toHaveBeenCalledTimes(1)
    expect(mockUpsertPersonIntelligence.mock.calls[0]?.[0]).toMatchObject({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 3,
      utilizationPct: 86,
      costPerHour: 12937.5,
      contractedHoursMonth: 160,
      assignedHoursMonth: 160,
      usedHoursMonth: null,
      availableHoursMonth: 0,
      activeAssignmentCount: 1,
      compensationCurrency: 'USD'
    })
  })

  it('extracts the target period from payroll payloads and refreshes all members for period-scoped events', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ member_id: 'member-1' }, { member_id: 'member-2' }])
      .mockResolvedValue([])

    const scope = personIntelligenceProjection.extractScope({
      periodId: '2026-02',
      status: 'calculated'
    })

    expect(scope).toEqual({ entityType: 'finance_period', entityId: '2026-02' })

    const result = await personIntelligenceProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-02' },
      { periodId: '2026-02', status: 'calculated' }
    )

    expect(result).toBe('refreshed person_intelligence for 2 members in 2026-02')
    expect(mockUpsertPersonIntelligence).toHaveBeenCalledTimes(2)
    expect(mockUpsertPersonIntelligence.mock.calls[0]?.[0]).toMatchObject({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 2
    })
    expect(mockUpsertPersonIntelligence.mock.calls[1]?.[0]).toMatchObject({
      memberId: 'member-2',
      periodYear: 2026,
      periodMonth: 2
    })
  })

  it('parses period hints from payroll and FX payloads', () => {
    expect(getPersonIntelligencePeriodFromPayload({ periodId: '2026-04' })).toEqual({ year: 2026, month: 4 })
    expect(getPersonIntelligencePeriodFromPayload({ payrollPeriodId: '2026-05' })).toEqual({ year: 2026, month: 5 })
    expect(getPersonIntelligencePeriodFromPayload({ rateDate: '2026-03-31' })).toEqual({ year: 2026, month: 3 })
  })
})
