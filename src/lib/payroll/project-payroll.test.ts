import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetApplicableCompensationVersionsForPeriod = vi.fn()
const mockFetchKpisForPeriod = vi.fn()
const mockFetchAttendanceForAllMembers = vi.fn()
const mockPgGetActiveBonusConfig = vi.fn()
const mockIsPayrollPostgresEnabled = vi.fn(() => true)
const mockGetHistoricalEconomicIndicatorForPeriod = vi.fn()

vi.mock('@/lib/payroll/get-compensation', () => ({
  getApplicableCompensationVersionsForPeriod: (...args: unknown[]) =>
    mockGetApplicableCompensationVersionsForPeriod(...args)
}))

vi.mock('@/lib/payroll/fetch-kpis-for-period', () => ({
  fetchKpisForPeriod: (...args: unknown[]) => mockFetchKpisForPeriod(...args)
}))

vi.mock('@/lib/payroll/fetch-attendance-for-period', () => ({
  fetchAttendanceForAllMembers: (...args: unknown[]) => mockFetchAttendanceForAllMembers(...args),
  getPayrollAttendanceDiagnostics: ({ leaveDataDegraded = false }: { leaveDataDegraded?: boolean } = {}) => ({
    source: 'legacy_attendance_daily_plus_hr_leave',
    integrationTarget: 'microsoft_teams',
    blocking: leaveDataDegraded,
    leaveDataDegraded,
    notes: []
  }),
  countWeekdays: () => 22
}))

vi.mock('@/lib/payroll/postgres-store', () => ({
  isPayrollPostgresEnabled: () => mockIsPayrollPostgresEnabled(),
  pgGetActiveBonusConfig: () => mockPgGetActiveBonusConfig()
}))

vi.mock('@/lib/finance/economic-indicators', () => ({
  getHistoricalEconomicIndicatorForPeriod: (...args: unknown[]) => mockGetHistoricalEconomicIndicatorForPeriod(...args)
}))

vi.mock('@/lib/payroll/chile-previsional-helpers', () => ({
  resolveChileAfpSplitRates: ({ totalRate }: { totalRate: number }) => ({
    cotizacionRate: totalRate * 0.8,
    comisionRate: totalRate * 0.2
  }),
  resolveChileHealthSplitAmounts: ({ healthAmount }: { healthAmount: number }) => ({
    mandatoryHealthAmount: healthAmount,
    excessHealthAmount: 0,
    totalHealthAmount: healthAmount
  }),
  resolveChileEmployerCostAmounts: vi.fn().mockResolvedValue({
    sisAmount: 0,
    employerUnemploymentAmount: 0,
    mutualAmount: 0,
    totalEmployerCost: 0
  }),
  getImmForPeriod: vi.fn().mockResolvedValue(539000),
  getSisRate: vi.fn().mockResolvedValue(0.0154),
  getTopeAfpForPeriod: vi.fn().mockResolvedValue(90.3),
  getTopeCesantiaForPeriod: vi.fn().mockResolvedValue(135.5),
  getChileAfpRatesForPeriod: vi
    .fn()
    .mockResolvedValue([
      { afpCode: 'habitat', afpName: 'Habitat', totalRate: 0.1127, cotizacionRate: 0.1027, comisionRate: 0.01 }
    ]),
  getAfpRateForCode: vi
    .fn()
    .mockResolvedValue({ totalRate: 0.1127, cotizacionRate: 0.1027, comisionRate: 0.01, afpName: 'Habitat' }),
  getUnemploymentRateForPeriod: vi.fn().mockResolvedValue(0.006),
  resolveChileAfpRateForCompensation: vi.fn().mockResolvedValue({ totalRate: 0.1127, afpName: 'Habitat' }),
  resolveChileAfpRateSplitForCompensation: vi.fn().mockResolvedValue({
    totalRate: 0.1127,
    cotizacionRate: 0.1027,
    comisionRate: 0.01,
    afpName: 'Habitat'
  })
}))

import { projectPayrollForPeriod } from './project-payroll'

const baseCompensation = {
  versionId: 'cv-1',
  memberId: 'member-1',
  memberName: 'Andres Carlosama',
  memberEmail: 'acarlosama@efeoncepro.com',
  memberAvatarUrl: null,
  payRegime: 'chile',
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
  contractType: 'indefinido',
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
    mockFetchKpisForPeriod.mockResolvedValue({
      snapshots: new Map([
        [
          'member-1',
          {
            memberId: 'member-1',
            otdPercent: 96,
            rpaAvg: 1.8,
            rpaDataStatus: 'valid',
            rpaConfidenceLevel: 'high',
            rpaSuppressionReason: null,
            rpaEvidence: { completedTasks: 15, eligibleTasks: 15, missingTasks: 0, nonPositiveTasks: 0 },
            tasksCompleted: 15,
            dataSource: 'ico',
            sourceMode: 'materialized'
          }
        ]
      ])
    })
    mockFetchAttendanceForAllMembers.mockResolvedValue({
      snapshots: new Map([
        ['member-1', { workingDaysInPeriod: 18, daysPresent: 16, daysAbsent: 1, daysOnLeave: 1, daysOnUnpaidLeave: 0 }]
      ]),
      leaveDataDegraded: false
    })

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'actual_to_date' })

    expect(result.entries).toHaveLength(1)
    expect(result.mode).toBe('actual_to_date')
    expect(result.totals.memberCount).toBe(1)
    expect(result.attendanceDiagnostics.leaveDataDegraded).toBe(false)
    expect(result.attendanceDiagnostics.blocking).toBe(false)

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
    expect(result.attendanceDiagnostics.leaveDataDegraded).toBe(false)
  })

  it('handles mixed currency (CLP + USD) members', async () => {
    const usdComp = {
      ...baseCompensation,
      versionId: 'cv-2',
      memberId: 'member-2',
      memberName: 'Daniela Ferreira',
      currency: 'USD',
      baseSalary: 2000,
      remoteAllowance: 100,
      fixedBonusAmount: 0,
      bonusOtdMax: 0,
      bonusRpaMax: 0,
      payRegime: 'international',
      payrollVia: 'deel',
      contractType: 'contractor',
      gratificacionLegalMode: 'ninguna'
    }

    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([baseCompensation, usdComp])
    mockFetchKpisForPeriod.mockResolvedValue({ snapshots: new Map() })
    mockFetchAttendanceForAllMembers.mockResolvedValue({ snapshots: new Map(), leaveDataDegraded: false })

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'projected_month_end' })

    expect(result.entries).toHaveLength(2)
    expect(result.totals.grossByCurrency.CLP).toBeGreaterThan(0)
    expect(result.totals.grossByCurrency.USD).toBeGreaterThan(0)
  })

  it('calculates KPI bonuses and connectivity for Deel contractors without Chile deductions', async () => {
    const deelComp = {
      ...baseCompensation,
      versionId: 'cv-2',
      memberId: 'member-2',
      memberName: 'Melkin Contractor',
      currency: 'USD',
      baseSalary: 2000,
      remoteAllowance: 100,
      fixedBonusAmount: 120,
      bonusOtdMax: 500,
      bonusRpaMax: 300,
      payRegime: 'international',
      payrollVia: 'deel',
      contractType: 'contractor',
      gratificacionLegalMode: 'ninguna'
    }

    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([deelComp])
    mockFetchKpisForPeriod.mockResolvedValue({
      snapshots: new Map([
        [
          'member-2',
          {
            memberId: 'member-2',
            otdPercent: 96,
            rpaAvg: 1.6,
            rpaDataStatus: 'valid',
            rpaConfidenceLevel: 'high',
            rpaSuppressionReason: null,
            rpaEvidence: { completedTasks: 22, eligibleTasks: 22, missingTasks: 0, nonPositiveTasks: 0 },
            tasksCompleted: 22,
            dataSource: 'ico',
            sourceMode: 'materialized'
          }
        ]
      ])
    })
    mockFetchAttendanceForAllMembers.mockResolvedValue({
      snapshots: new Map([
        ['member-2', { workingDaysInPeriod: 20, daysPresent: 18, daysAbsent: 2, daysOnLeave: 0, daysOnUnpaidLeave: 0 }]
      ]),
      leaveDataDegraded: false
    })

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'projected_month_end' })
    const entry = result.entries[0]

    expect(entry.payrollVia).toBe('deel')
    expect(entry.kpiDataSource).toBe('ico')
    expect(entry.kpiOtdQualifies).toBe(true)
    expect(entry.kpiRpaQualifies).toBe(true)
    expect(entry.bonusOtdAmount).toBe(500)
    expect(entry.bonusRpaAmount).toBe(300)
    expect(entry.remoteAllowance).toBe(100)
    expect(entry.grossTotal).toBe(3020)
    expect(entry.netTotal).toBe(3020)
    expect(entry.chileTotalDeductions).toBe(0)
    expect(entry.workingDaysInPeriod).toBeNull()
  })

  it('degrades gracefully when KPIs or attendance fail', async () => {
    mockGetApplicableCompensationVersionsForPeriod.mockResolvedValue([baseCompensation])
    mockFetchKpisForPeriod.mockRejectedValue(new Error('ICO unavailable'))
    mockFetchAttendanceForAllMembers.mockRejectedValue(new Error('BQ timeout'))

    const result = await projectPayrollForPeriod({ year: 2026, month: 3, mode: 'actual_to_date' })

    expect(result.entries).toHaveLength(1)
    expect(result.attendanceDiagnostics.leaveDataDegraded).toBe(true)
    expect(result.attendanceDiagnostics.blocking).toBe(true)

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
    mockFetchAttendanceForAllMembers.mockResolvedValue({ snapshots: new Map(), leaveDataDegraded: false })

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
