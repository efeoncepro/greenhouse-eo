import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
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

  it('reads export packages without attempting runtime DDL', async () => {
    await getPayrollExportPackageByPeriodId('2026-03')

    expect(
      mockRunGreenhousePostgresQuery.mock.calls.some(([sql]) =>
        typeof sql === 'string' && /CREATE\s+(SCHEMA|TABLE|INDEX)/i.test(sql)
      )
    ).toBe(false)

    expect(
      mockRunGreenhousePostgresQuery.mock.calls.some(([sql]) =>
        typeof sql === 'string' && /SELECT\s+\*\s+FROM\s+greenhouse_payroll\.payroll_export_packages/i.test(sql)
      )
    ).toBe(true)
  })
})
