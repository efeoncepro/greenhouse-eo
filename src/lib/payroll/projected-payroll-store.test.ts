import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

describe('projected-payroll-store', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    // Reset the module-level `verified` flag between tests
    vi.resetModules()
  })

  describe('verifyInfrastructure (fail-fast)', () => {
    it('throws actionable error when table does not exist', async () => {
      mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('relation does not exist'))

      const { upsertProjectedPayrollSnapshot } = await import('./projected-payroll-store')

      await expect(
        upsertProjectedPayrollSnapshot(
          {
            memberId: 'member-1', memberName: 'M1', currency: 'CLP', payRegime: 'chile',
            baseSalary: 1000, remoteAllowance: 0, fixedBonusLabel: null, fixedBonusAmount: 0,
            bonusOtdAmount: 0, bonusRpaAmount: 0, bonusOtdMax: 0, bonusRpaMax: 0,
            kpiOtdPercent: 0, kpiRpaAvg: 0, kpiOtdQualifies: false, kpiRpaQualifies: false,
            grossTotal: 1000, netTotal: 800, chileTotalDeductions: 200,
            chileAfpAmount: 100, chileHealthAmount: 70, chileUnemploymentAmount: 10,
            chileTaxAmount: 20, chileApvAmount: 0, chileUfValue: 38000,
            workingDaysInPeriod: 22, daysPresent: 22, daysAbsent: 0, daysOnLeave: 0, daysOnUnpaidLeave: 0,
            projectionMode: 'projected_month_end', projectedWorkingDays: 22, projectedWorkingDaysTotal: 22,
            officialGrossTotal: null, officialNetTotal: null, deltaGross: null, deltaNet: null, inputVariance: null,
            asOfDate: '2026-04-01'
          } as any,
          { year: 2026, month: 4 }
        )
      ).rejects.toThrow('does not exist')

      expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
      expect(mockRunGreenhousePostgresQuery.mock.calls[0][0]).toContain('SELECT 1')
    })

    it('does not execute DDL — only verifies table existence', async () => {
      const { upsertProjectedPayrollSnapshot } = await import('./projected-payroll-store')

      await upsertProjectedPayrollSnapshot(
        {
          memberId: 'member-1', memberName: 'M1', currency: 'USD', payRegime: 'international',
          baseSalary: 675, remoteAllowance: 50, fixedBonusLabel: null, fixedBonusAmount: 0,
          bonusOtdAmount: 0, bonusRpaAmount: 75, bonusOtdMax: 10, bonusRpaMax: 75,
          kpiOtdPercent: 70.4, kpiRpaAvg: 1.6, kpiOtdQualifies: true, kpiRpaQualifies: true,
          grossTotal: 800, netTotal: 800, chileTotalDeductions: null,
          chileAfpAmount: 0, chileHealthAmount: 0, chileUnemploymentAmount: 0,
          chileTaxAmount: 0, chileApvAmount: 0, chileUfValue: null,
          workingDaysInPeriod: 22, daysPresent: 22, daysAbsent: 0, daysOnLeave: 0, daysOnUnpaidLeave: 0,
          projectionMode: 'projected_month_end', projectedWorkingDays: 22, projectedWorkingDaysTotal: 22,
          officialGrossTotal: null, officialNetTotal: null, deltaGross: null, deltaNet: null, inputVariance: null,
          asOfDate: '2026-04-01'
        } as any,
        { year: 2026, month: 4 }
      )

      const allQueries = mockRunGreenhousePostgresQuery.mock.calls.map(c => c[0] as string)

      expect(allQueries.some(q => q.includes('CREATE TABLE'))).toBe(false)
      expect(allQueries[0]).toContain('SELECT 1')
      expect(allQueries[1]).toContain('INSERT INTO greenhouse_serving.projected_payroll_snapshots')
    })
  })

  describe('upsertProjectedPayrollSnapshot', () => {
    it('normalizes null total deductions to zero before persisting snapshots', async () => {
      const { upsertProjectedPayrollSnapshot } = await import('./projected-payroll-store')

      await upsertProjectedPayrollSnapshot(
        {
          memberId: 'member-1', memberName: 'Member 1', currency: 'USD', payRegime: 'international',
          baseSalary: 675, remoteAllowance: 50, fixedBonusLabel: null, fixedBonusAmount: 0,
          bonusOtdAmount: 0.21, bonusRpaAmount: 75, bonusOtdMax: 10, bonusRpaMax: 75,
          kpiOtdPercent: 70.4, kpiRpaAvg: 1.6, kpiOtdQualifies: true, kpiRpaQualifies: true,
          grossTotal: 800.21, netTotal: 800.21, chileTotalDeductions: null,
          chileAfpAmount: 0, chileHealthAmount: 0, chileUnemploymentAmount: 0,
          chileTaxAmount: 0, chileApvAmount: 0, chileUfValue: null,
          workingDaysInPeriod: 22, daysPresent: 22, daysAbsent: 0, daysOnLeave: 0, daysOnUnpaidLeave: 0,
          projectionMode: 'projected_month_end', projectedWorkingDays: 22, projectedWorkingDaysTotal: 22,
          officialGrossTotal: null, officialNetTotal: null, deltaGross: null, deltaNet: null, inputVariance: null,
          asOfDate: '2026-04-01'
        } as any,
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

  describe('readProjectedPayrollSnapshots', () => {
    it('throws actionable error on read when table is missing', async () => {
      mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('relation does not exist'))

      const { readProjectedPayrollSnapshots } = await import('./projected-payroll-store')

      await expect(
        readProjectedPayrollSnapshots(2026, 4, 'projected_month_end')
      ).rejects.toThrow('Provision it via migration')
    })
  })
})
