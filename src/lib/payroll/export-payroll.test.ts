import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetPayrollPeriod = vi.fn()
const mockGetPayrollEntries = vi.fn()
const mockPgSetPeriodExported = vi.fn()
const mockRunPayrollQuery = vi.fn()

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: (...args: unknown[]) => mockGetPayrollPeriod(...args)
}))

vi.mock('@/lib/payroll/get-payroll-entries', () => ({
  getPayrollEntries: (...args: unknown[]) => mockGetPayrollEntries(...args)
}))

vi.mock('@/lib/payroll/postgres-store', () => ({
  isPayrollPostgresEnabled: () => true,
  pgSetPeriodExported: (...args: unknown[]) => mockPgSetPeriodExported(...args)
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project'
}))

vi.mock('@/lib/payroll/shared', async () => {
  const actual = await vi.importActual('@/lib/payroll/shared')

  return {
    ...actual,
    runPayrollQuery: (...args: unknown[]) => mockRunPayrollQuery(...args)
  }
})

const { exportPayrollCsv } = await import('./export-payroll')

describe('exportPayrollCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks approved Postgres periods as exported through pgSetPeriodExported', async () => {
    mockGetPayrollPeriod.mockResolvedValue({
      periodId: '2026-03',
      status: 'approved'
    })

    mockGetPayrollEntries.mockResolvedValue([
      {
        memberName: 'Jane Doe',
        memberEmail: 'jane@example.com',
        payRegime: 'international',
        currency: 'USD',
        baseSalary: 2000,
        adjustedBaseSalary: 2000,
        remoteAllowance: 100,
        adjustedRemoteAllowance: 100,
        fixedBonusLabel: 'Responsabilidad',
        fixedBonusAmount: 150,
        adjustedFixedBonusAmount: 150,
        workingDaysInPeriod: 20,
        daysPresent: 20,
        daysAbsent: 0,
        daysOnLeave: 0,
        kpiOtdPercent: 95,
        bonusOtdProrationFactor: 1,
        bonusOtdAmount: 200,
        kpiRpaAvg: 2.4,
        bonusRpaProrationFactor: 1,
        bonusRpaAmount: 150,
        bonusOtherAmount: 0,
        grossTotal: 2450,
        chileAfpAmount: 0,
        chileAfpCotizacionAmount: 0,
        chileAfpComisionAmount: 0,
        chileHealthAmount: 0,
        chileUnemploymentAmount: 0,
        chileTaxAmount: 0,
        chileApvAmount: 0,
        chileTotalDeductions: 0,
        netTotal: 2450
      }
    ])

    const csv = await exportPayrollCsv('2026-03')

    expect(csv).toContain('Jane Doe')
    expect(csv.split('\n')[0]).toContain('AFP cotización')
    expect(csv.split('\n')[0]).toContain('AFP comisión')
    expect(mockPgSetPeriodExported).toHaveBeenCalledWith('2026-03')
    expect(mockRunPayrollQuery).not.toHaveBeenCalled()
  })
})
