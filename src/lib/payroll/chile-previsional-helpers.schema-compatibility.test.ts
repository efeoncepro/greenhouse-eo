import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockIsPayrollPostgresEnabled = vi.fn(() => true)

const mockGetHistoricalEconomicIndicatorForPeriod = vi.fn(async (_input?: unknown) => {
  void _input

  return null
})

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) =>
    mockRunGreenhousePostgresQuery(sql, params)
}))

vi.mock('@/lib/payroll/postgres-store', () => ({
  isPayrollPostgresEnabled: () => mockIsPayrollPostgresEnabled()
}))

vi.mock('@/lib/finance/economic-indicators', () => ({
  getHistoricalEconomicIndicatorForPeriod: (input: unknown) =>
    mockGetHistoricalEconomicIndicatorForPeriod(input)
}))

describe('chile provisional helpers legacy schema compatibility', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRunGreenhousePostgresQuery.mockReset()
    mockIsPayrollPostgresEnabled.mockReset()
    mockIsPayrollPostgresEnabled.mockReturnValue(true)
    mockGetHistoricalEconomicIndicatorForPeriod.mockReset()
    mockGetHistoricalEconomicIndicatorForPeriod.mockResolvedValue(null)
  })

  it('falls back to previred_afp_rates using indicator_date and preserves worker_rate', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          afp_name: 'Habitat',
          worker_rate: '0.1027',
          total_rate: '0.1127',
          source: 'gael_api',
          period_year: 2026,
          period_month: 4
        }
      ])

    const { getChileAfpRatesForPeriod } = await import('./chile-previsional-helpers')

    const rates = await getChileAfpRatesForPeriod({ year: 2026, month: 4 })

    expect(rates).toEqual([
      {
        afpName: 'Habitat',
        workerRate: 0.1027,
        totalRate: 0.1127,
        source: 'gael_api',
        periodYear: 2026,
        periodMonth: 4
      }
    ])

    const legacyCall = mockRunGreenhousePostgresQuery.mock.calls[1]

    expect(String(legacyCall?.[0])).toContain('FROM greenhouse_payroll.previred_afp_rates')
    expect(String(legacyCall?.[0])).toContain('indicator_date >= make_date($1, $2, 1)')
    expect(String(legacyCall?.[0])).toContain('worker_rate')
  })

  it('falls back to previred_period_indicators using indicator_date when the canonical table is empty', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          period_year: 2026,
          period_month: 4,
          imm_clp: '539000',
          sis_rate: '0.0154',
          tope_afp_uf: '90',
          tope_cesantia_uf: '135.2',
          source: 'gael_api'
        }
      ])

    const { getSisRate } = await import('./chile-previsional-helpers')

    await expect(getSisRate('2026-04-30')).resolves.toBeCloseTo(0.0154, 4)

    const legacyCall = mockRunGreenhousePostgresQuery.mock.calls[1]

    expect(String(legacyCall?.[0])).toContain('FROM greenhouse_payroll.previred_period_indicators')
    expect(String(legacyCall?.[0])).toContain('indicator_date >= make_date($1, $2, 1)')
    expect(String(legacyCall?.[0])).toContain('imm_value AS imm_clp')
  })
})
