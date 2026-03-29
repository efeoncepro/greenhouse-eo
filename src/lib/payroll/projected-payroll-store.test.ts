import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { upsertProjectedPayrollSnapshot } from './projected-payroll-store'

describe('upsertProjectedPayrollSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunGreenhousePostgresQuery.mockResolvedValue([])
  })

  it('normalizes null total deductions to zero before persisting snapshots', async () => {
    const entry = {
        memberId: 'member-1',
        memberName: 'Member 1',
        currency: 'USD',
        payRegime: 'international',
        baseSalary: 675,
        remoteAllowance: 50,
        fixedBonusLabel: null,
        fixedBonusAmount: 0,
        bonusOtdAmount: 0.21,
        bonusRpaAmount: 75,
        bonusOtdMax: 10,
        bonusRpaMax: 75,
        kpiOtdPercent: 70.4,
        kpiRpaAvg: 1.6,
        kpiOtdQualifies: true,
        kpiRpaQualifies: true,
        grossTotal: 800.21,
        netTotal: 800.21,
        chileTotalDeductions: null,
        chileAfpAmount: 0,
        chileHealthAmount: 0,
        chileUnemploymentAmount: 0,
        chileTaxAmount: 0,
        chileApvAmount: 0,
        chileUfValue: null,
        workingDaysInPeriod: 22,
        daysPresent: 22,
        daysAbsent: 0,
        daysOnLeave: 0,
        daysOnUnpaidLeave: 0,
        projectionMode: 'projected_month_end',
        projectedWorkingDays: 22,
        projectedWorkingDaysTotal: 22,
        officialGrossTotal: null,
        officialNetTotal: null,
        deltaGross: null,
        deltaNet: null,
        inputVariance: null
      } as any

    await upsertProjectedPayrollSnapshot(
      entry,
      { year: 2026, month: 3 }
    )

    const insertCall = mockRunGreenhousePostgresQuery.mock.calls.find(call =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_serving.projected_payroll_snapshots')
    )

    expect(insertCall).toBeTruthy()
    expect(insertCall?.[1]).toBeDefined()
    expect((insertCall?.[1] as unknown[])[12]).toBe(0)
  })
})
