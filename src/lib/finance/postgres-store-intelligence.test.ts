import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockAssertFinanceSlice2PostgresReady = vi.fn()
const mockReadCommercialCostAttributionByClientForPeriod = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

vi.mock('@/lib/finance/postgres-store-slice2', async () => {
  const actual = await vi.importActual('@/lib/finance/postgres-store-slice2')

  return {
    ...actual,
    assertFinanceSlice2PostgresReady: (...args: unknown[]) => mockAssertFinanceSlice2PostgresReady(...args)
  }
})

vi.mock('@/lib/commercial-cost-attribution/member-period-attribution', () => ({
  readCommercialCostAttributionByClientForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttributionByClientForPeriod(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'

describe('computeClientEconomicsSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([])
  })

  it('resolves revenue aggregation through canonical client_id when income only has client_profile_id', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { client_id: 'client-1', client_name: 'Acme', total_revenue_clp: '1000' }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          snapshot_id: 'snap-1',
          client_id: 'client-1',
          client_name: 'Acme',
          period_year: 2026,
          period_month: 3,
          total_revenue_clp: 1000,
          direct_costs_clp: 0,
          indirect_costs_clp: 0,
          gross_margin_clp: 1000,
          gross_margin_percent: 100,
          net_margin_clp: 1000,
          net_margin_percent: 100,
          headcount_fte: null,
          revenue_per_fte: null,
          cost_per_fte: null,
          notes: null,
          computed_at: null,
          created_at: null,
          updated_at: null
        }
      ])

    const result = await computeClientEconomicsSnapshots(2026, 3)

    expect(result).toHaveLength(1)
    const revenueQuery = mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] as string

    expect(revenueQuery).toContain('LEFT JOIN greenhouse_finance.client_profiles cp')
    expect(revenueQuery).toContain('COALESCE(i.client_id, cp.client_id) AS client_id')
    expect(revenueQuery).not.toContain('COALESCE(client_id, client_profile_id) AS client_id')
  })
})
