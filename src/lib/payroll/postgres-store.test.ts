import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockClientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    callback({ query: mockClientQuery })
}))

const { pgUpdatePayrollPeriod } = await import('./postgres-store')

const PAYROLL_REQUIRED_TABLES = [
  'greenhouse_core.members',
  'greenhouse_core.client_users',
  'greenhouse_payroll.compensation_versions',
  'greenhouse_payroll.payroll_periods',
  'greenhouse_payroll.payroll_entries',
  'greenhouse_payroll.payroll_bonus_config'
]

describe('pgUpdatePayrollPeriod', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
    mockClientQuery.mockReset()
  })

  it('reads the corrected period inside the same transaction before commit', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce(PAYROLL_REQUIRED_TABLES.map(qualified_name => ({ qualified_name })))
      .mockResolvedValueOnce([
        {
          period_id: '2026-03',
          year: 2026,
          month: 3,
          status: 'approved',
          calculated_at: '2026-03-05T12:00:00.000Z',
          calculated_by_user_id: 'user-1',
          approved_at: '2026-03-06T12:00:00.000Z',
          approved_by_user_id: 'user-2',
          exported_at: null,
          uf_value: 39990,
          tax_table_version: 'SII-2026-03',
          notes: 'Periodo creado como marzo',
          created_at: '2026-03-01T12:00:00.000Z'
        }
      ])

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 3 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            period_id: '2026-02',
            year: 2026,
            month: 2,
            status: 'draft',
            calculated_at: null,
            calculated_by_user_id: null,
            approved_at: null,
            approved_by_user_id: null,
            exported_at: null,
            uf_value: 39990,
            tax_table_version: 'SII-2026-02',
            notes: 'Nomina imputable febrero 2026',
            created_at: '2026-03-01T12:00:00.000Z'
          }
        ]
      })

    const updated = await pgUpdatePayrollPeriod('2026-03', {
      year: 2026,
      month: 2,
      ufValue: 39990,
      taxTableVersion: 'SII-2026-02',
      notes: 'Nomina imputable febrero 2026'
    })

    expect(updated.periodId).toBe('2026-02')
    expect(updated.month).toBe(2)
    expect(updated.status).toBe('draft')
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
    expect(mockClientQuery).toHaveBeenCalledTimes(4)
    expect(mockClientQuery.mock.calls[3]?.[0]).toContain('FROM greenhouse_payroll.payroll_periods')
    expect(mockClientQuery.mock.calls[3]?.[1]).toEqual(['2026-02'])
  })
})
