import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const { getPayrollExportPackageByPeriodId } = await import('./payroll-export-packages-store')

describe('payroll export packages store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM greenhouse_payroll.payroll_export_packages')) {
        return []
      }

      return []
    })
  })

  it('bootstraps the export packages table before reading', async () => {
    await getPayrollExportPackageByPeriodId('2026-03')

    expect(
      mockRunGreenhousePostgresQuery.mock.calls.some(([sql]) =>
        typeof sql === 'string' && sql.includes('CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_export_packages')
      )
    ).toBe(true)

    expect(
      mockRunGreenhousePostgresQuery.mock.calls.some(([sql]) =>
        typeof sql === 'string' && /SELECT\s+\*\s+FROM\s+greenhouse_payroll\.payroll_export_packages/i.test(sql)
      )
    ).toBe(true)
  })
})
