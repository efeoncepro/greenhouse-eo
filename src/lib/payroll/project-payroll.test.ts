import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetApplicableCompensationVersionsForPeriod = vi.fn()
const mockFetchKpisForPeriod = vi.fn()
const mockFetchAttendanceForAllMembers = vi.fn()
const mockPgGetActiveBonusConfig = vi.fn()
const mockIsPayrollPostgresEnabled = vi.fn(() => true)
const mockGetHistoricalEconomicIndicatorForPeriod = vi.fn()

vi.mock('@/lib/payroll/get-compensation', () => ({
  getApplicableCompensationVersionsForPeriod: (...args: unknown[]) => mockGetApplicableCompensationVersionsForPeriod(...args)
}))

vi.mock('@/lib/payroll/fetch-kpis-for-period', () => ({
  fetchKpisForPeriod: (...args: unknown[]) => mockFetchKpisForPeriod(...args)
}))

vi.mock('@/lib/payroll/fetch-attendance-for-period', () => ({
  fetchAttendanceForAllMembers: (...args: unknown[]) => mockFetchAttendanceForAllMembers(...args),
  countWeekdays: () => 22
}))

vi.mock('@/lib/payroll/postgres-store', () => ({
  isPayrollPostgresEnabled: () => mockIsPayrollPostgresEnabled(),
  pgGetActiveBonusConfig: () => mockPgGetActiveBonusConfig()
}))

vi.mock('@/lib/finance/economic-indicators', () => ({
  getHistoricalEconomicIndicatorForPeriod: (...args: unknown[]) => mockGetHistoricalEconomicIndicatorForPeriod(...args)
}))

import { projectPayrollForPeriod } from './project-payroll'

const baseCompensation = {
  versionId: 'cv-1',
  memberId: 'member-1',
  memberName: 'Andres Carlosama',
  memberEmail: 'acarlosama@efeoncepro.com',
  memberAvatarUrl: null,
  payRegime: 'chile_dependent',
  currency: 'CLP',
  baseSalary: 800000,
  remoteAllowance: 100000,
  fixedBonusLabel: 'Bono productividad',
  fixedBonusAmount: 50000,
  bonusOtdMin: 0,
  bonusOtdMax: 60000,
  bonusRpaMin: 0,
  bonusRpaMax: 40000,
  gratificacionLegalMode: 'ninguna',
  afpName: 'habitat',
  afpRate: 0.1127,
  healthSystem: 'fonasa',
  healthPlanUf: 0,
  unemploymentRate: 0.006,
  contractType: 'indefinite',
  hasApv: false,
  apvAmount: 0,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  hasCompensationVersion: true
}

describe('projectPayrollForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPgGetActiveBonusConfig.mockResolvedValue({
      otdThreshold: 89,
      otdFloor: 70,
      rpaThreshold: 3,
      rpaFullPayoutThreshold: 1.7,
      rpaSoftBandEnd: 2,
      rpaSoftBandFloorFactor: 0.8
    })
    mockGetHistoricalEconomicIndicatorForPeriod.mockResolvedValue({ value: 38150 })
  })

  it('projects payroll for actual_to_date mode with real KPIs and attendance', async () => {
    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([baseCompensation])
    mockFetchKpisForPeriod.mockResolvedValue({ snapshots:
      new Map([['member-1', { memberId: 'member-1', otdPercent: 96, rpaAvg: 1.8, tasksCompleted: 15, dataSource: 'ico', sourceMode: 'materialized' }]])
    })
    mockFetchAttendanceForAllMembers.mockResolvedValue(
      new Map([['member-1', { workingDaysInPeriod: 18, daysPresent: 16, daysAbsent: 1, daysOnLeave: 1, daysOnUnpaidLeave: 0 }]])
    )

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'actual_to_date' })

    expect(result.entries).toHaveLength(1)
    expect(result.mode).toBe('actual_to_date')
    expect(result.totals.memberCount).toBe(1)

    const entry = result.entries[0]

    expect(entry.memberId).toBe('member-1')
    expect(entry.projectionMode).toBe('actual_to_date')
    expect(entry.baseSalary).toBe(800000)
    expect(entry.kpiOtdPercent).toBe(96)
    expect(entry.kpiRpaAvg).toBe(1.8)
    expect(entry.kpiOtdQualifies).toBe(true)
    expect(entry.bonusOtdAmount).toBe(60000)
    expect(entry.bonusRpaAmount).toBe(37332)
    expect(entry.grossTotal).toBeGreaterThan(0)
    expect(entry.netTotal).toBeGreaterThan(0)
    expect(entry.netTotal).toBeLessThan(entry.grossTotal)
    expect(result.totals.grossByCurrency.CLP).toBe(entry.grossTotal)
  })

  it('returns empty result when no compensations exist', async () => {
    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([])

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'projected_month_end' })

    expect(result.entries).toHaveLength(0)
    expect(result.totals.memberCount).toBe(0)
  })

  it('handles mixed currency (CLP + USD) members', async () => {
    const usdComp = { ...baseCompensation, versionId: 'cv-2', memberId: 'member-2', memberName: 'Daniela Ferreira', currency: 'USD', baseSalary: 2000, remoteAllowance: 100, fixedBonusAmount: 0, bonusOtdMax: 0, bonusRpaMax: 0, payRegime: 'contractor_usd', gratificacionLegalMode: 'ninguna' }

    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([baseCompensation, usdComp])
    mockFetchKpisForPeriod.mockResolvedValue({ snapshots: new Map() })
    mockFetchAttendanceForAllMembers.mockResolvedValue(new Map())

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'projected_month_end' })

    expect(result.entries).toHaveLength(2)
    expect(result.totals.grossByCurrency.CLP).toBeGreaterThan(0)
    expect(result.totals.grossByCurrency.USD).toBeGreaterThan(0)
  })

  it('degrades gracefully when KPIs or attendance fail', async () => {
    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([baseCompensation])
    mockFetchKpisForPeriod.mockRejectedValue(new Error('ICO unavailable'))
    mockFetchAttendanceForAllMembers.mockRejectedValue(new Error('BQ timeout'))

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'actual_to_date' })

    expect(result.entries).toHaveLength(1)

    // Without KPIs: no variable bonus
    expect(result.entries[0].bonusOtdAmount).toBe(0)
    expect(result.entries[0].bonusRpaAmount).toBe(0)

    // Without attendance: no deductions for absence
    expect(result.entries[0].grossTotal).toBeGreaterThan(0)
  })

  it('ignores active members without compensation versions when building the projection batch', async () => {
    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([
      { ...baseCompensation, hasCompensationVersion: true },
      {
        ...baseCompensation,
        versionId: '',
        memberId: '',
        memberName: 'Sin compensacion',
        hasCompensationVersion: false
      }
    ])
    mockFetchKpisForPeriod.mockResolvedValue({ snapshots: new Map() })
    mockFetchAttendanceForAllMembers.mockResolvedValue(new Map())

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'actual_to_date' })

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].memberId).toBe('member-1')
    expect(mockFetchKpisForPeriod).toHaveBeenCalledWith({
      memberIds: ['member-1'],
      periodYear: 2026,
      periodMonth: 3
    })
  })
})
