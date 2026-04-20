import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockUpsertMemberCapacityEconomicsSnapshot = vi.fn()

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn(),
  getGreenhousePostgresPool: vi.fn(),
  closeGreenhousePostgres: vi.fn()
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  ensureMemberCapacityEconomicsSchema: vi.fn(),
  readLatestMemberCapacityEconomicsSnapshot: vi.fn(),
  readMemberCapacityEconomicsSnapshot: vi.fn(),
  upsertMemberCapacityEconomicsSnapshot: (...args: unknown[]) => mockUpsertMemberCapacityEconomicsSnapshot(...args)
}))

import {
  buildMemberCapacityEconomicsSnapshot,
  getMemberCapacityEconomicsPeriodFromPayload,
  getMemberCapacityEconomicsScopeFromPayload,
  memberCapacityEconomicsProjection
} from '@/lib/sync/projections/member-capacity-economics'
import { ensureProjectionsRegistered } from '@/lib/sync/projections'
import { getRegisteredProjections } from '@/lib/sync/projection-registry'

describe('memberCapacityEconomicsProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the affected period from period, payroll and FX payloads', () => {
    expect(getMemberCapacityEconomicsPeriodFromPayload({ periodYear: 2026, periodMonth: 3 })).toEqual({
      year: 2026,
      month: 3
    })

    expect(getMemberCapacityEconomicsPeriodFromPayload({ payrollPeriodId: '2026-04' })).toEqual({
      year: 2026,
      month: 4
    })

    expect(getMemberCapacityEconomicsPeriodFromPayload({ rateDate: '2026-03-28' })).toEqual({
      year: 2026,
      month: 3
    })
  })

  it('derives member and period scopes from the payload', () => {
    expect(getMemberCapacityEconomicsScopeFromPayload({ memberId: 'member-1' })).toEqual({
      entityType: 'member',
      entityId: 'member-1'
    })

    expect(getMemberCapacityEconomicsScopeFromPayload({ rateDate: '2026-03-28' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-03'
    })
  })

  it('builds a complete economics snapshot and excludes internal assignments', () => {
    const snapshot = buildMemberCapacityEconomicsSnapshot({
      member: {
        member_id: 'member-1',
        display_name: 'Ada Lovelace',
        role_category: 'development',
        role_title: 'Lead Developer',
        active: true
      },
      period: { year: 2026, month: 3 },
      assignments: [
        {
          assignment_id: 'a-1',
          client_id: 'client-1',
          client_name: 'Acme',
          fte_allocation: 0.5,
          hours_per_month: 80,
          start_date: '2026-01-01',
          end_date: null,
          active: true
        },
        {
          assignment_id: 'a-2',
          client_id: 'client_internal',
          client_name: 'Efeonce Internal',
          fte_allocation: 0.25,
          hours_per_month: 40,
          start_date: '2026-01-01',
          end_date: null,
          active: true
        }
      ],
      compensation: {
        version_id: 'cv-1',
        currency: 'USD',
        base_salary: 2000,
        remote_allowance: 100,
        bonus_otd_min: 0,
        bonus_otd_max: 0,
        bonus_rpa_min: 0,
        bonus_rpa_max: 0,
        effective_from: '2026-01-01',
        effective_to: null
      },
      payrollEntry: null,
      icoMetrics: {
        active_tasks: 7,
        completed_tasks: 8,
        throughput_count: 10,
        total_tasks: 12
      },
      exchangeRate: {
        rate_id: 'USD_CLP_2026-03-27',
        rate: 900,
        rate_date: '2026-03-27',
        source: 'mindicador'
      },
      sharedOverheadPool: {
        periodYear: 2026,
        periodMonth: 3,
        targetCurrency: 'CLP',
        totalSharedOverheadTarget: 320000,
        allocationMethod: 'contracted_hours'
      },
      sharedOverheadTotalWeight: 640,
      directOverheadTarget: 30500,
      directOverheadStatus: 'complete'
    })

    expect(snapshot).toMatchObject({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 3,
      contractedFte: 1,
      contractedHours: 160,
      assignedHours: 80,
      commercialAvailabilityHours: 80,
      usageKind: 'percent',
      usedHours: null,
      usagePercent: 86,
      operationalAvailabilityHours: null,
      sourceCurrency: 'USD',
      targetCurrency: 'CLP',
      totalCompSource: 2100,
      totalLaborCostTarget: 1890000,
      directOverheadTarget: 30500,
      sharedOverheadTarget: 80000,
      loadedCostTarget: 2000500,
      costPerHourTarget: 11812.5,
      suggestedBillRateTarget: 19235.58,
      snapshotStatus: 'complete',
      sourceCompensationVersionId: 'cv-1',
      sourcePayrollPeriodId: null,
      assignmentCount: 1
    })
  })

  it('refreshes the member snapshot from source tables and upserts it', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ member_id: 'member-1', display_name: 'Ada', role_category: 'development', role_title: 'Lead Developer', active: true }])
      .mockResolvedValueOnce([
        {
          assignment_id: 'a-1',
          client_id: 'client-1',
          client_name: 'Acme',
          fte_allocation: 0.5,
          hours_per_month: 80,
          start_date: '2026-01-01',
          end_date: null,
          active: true
        },
        {
          assignment_id: 'a-2',
          client_id: 'client_internal',
          client_name: 'Efeonce Internal',
          fte_allocation: 0.25,
          hours_per_month: 40,
          start_date: '2026-01-01',
          end_date: null,
          active: true
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          version_id: 'cv-1',
          currency: 'USD',
          base_salary: 2000,
          remote_allowance: 100,
          bonus_otd_min: 0,
          bonus_otd_max: 0,
          bonus_rpa_min: 0,
          bonus_rpa_max: 0,
          effective_from: '2026-01-01',
          effective_to: null
        }
      ])
      .mockResolvedValueOnce([
        {
          active_tasks: 7,
          completed_tasks: 8,
          throughput_count: 10,
          total_tasks: 12
        }
      ])
      .mockResolvedValueOnce([
        {
          rate_id: 'USD_CLP_2026-03-27',
          rate: 900,
          rate_date: '2026-03-27',
          source: 'mindicador'
        }
      ])
      .mockResolvedValueOnce([
        {
          tool_id: 'claude-team',
          cost_model: 'subscription',
          subscription_amount: 60,
          subscription_currency: 'USD',
          subscription_billing_cycle: 'monthly',
          subscription_seats: 3
        }
      ])
      .mockResolvedValueOnce([{ total_tooling_cost_target: 12500 }])
      .mockResolvedValueOnce([{ total_direct_expense_clp: 0 }])
      .mockResolvedValueOnce([{ from_currency: 'USD', rate: 900 }])
      .mockResolvedValueOnce([
        {
          expense_count: 2,
          total_shared_overhead_target: 320000,
          billable_member_count: 4
        }
      ])

    const result = await memberCapacityEconomicsProjection.refresh(
      { entityType: 'member', entityId: 'member-1' },
      { memberId: 'member-1', periodId: '2026-03' }
    )

    expect(result).toContain('member_capacity_economics for member-1 (2026-03)')
    expect(mockUpsertMemberCapacityEconomicsSnapshot).toHaveBeenCalledTimes(1)
    expect(mockUpsertMemberCapacityEconomicsSnapshot.mock.calls[0]?.[0]).toMatchObject({
      memberId: 'member-1',
      assignedHours: 80,
      assignmentCount: 1,
      sourceCurrency: 'USD',
      fxProvider: 'mindicador',
      directOverheadTarget: 30500,
      sharedOverheadTarget: 80000,
      suggestedBillRateTarget: 19235.58
    })
  })

  it('registers the expected trigger events', () => {
    expect(memberCapacityEconomicsProjection.triggerEvents).toContain('assignment.created')
    expect(memberCapacityEconomicsProjection.triggerEvents).toContain('compensation_version.updated')
    expect(memberCapacityEconomicsProjection.triggerEvents).toContain('payroll_period.exported')
    expect(memberCapacityEconomicsProjection.triggerEvents).toContain('finance.expense.updated')
    expect(memberCapacityEconomicsProjection.triggerEvents).toContain('finance.exchange_rate.upserted')
  })

  it('is registered in the projection registry', () => {
    ensureProjectionsRegistered()

    expect(getRegisteredProjections().some(projection => projection.name === 'member_capacity_economics')).toBe(true)
  })
})
