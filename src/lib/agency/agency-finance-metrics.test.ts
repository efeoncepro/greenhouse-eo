import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import { getSpaceFinanceMetrics } from './agency-finance-metrics'

describe('getSpaceFinanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads Agency finance metrics from space-scoped operational P&L snapshots', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([
      {
        client_id: 'client-1',
        organization_id: 'org-1',
        space_id: 'space-1',
        period_year: 2026,
        period_month: 3,
        period_closed: true,
        snapshot_revision: 4,
        cur_revenue: 1800000,
        prev_revenue: 1500000,
        cur_total_cost: 600000,
        cur_margin_pct: 66.67
      }
    ])

    const metrics = await getSpaceFinanceMetrics()

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE ops.scope_type = 'space'")
    )
    expect(metrics).toEqual([
      {
        clientId: 'client-1',
        organizationId: 'org-1',
        spaceId: 'space-1',
        revenueCurrentMonth: 1800000,
        revenuePreviousMonth: 1500000,
        revenueTrend: 20,
        expensesCurrentMonth: 600000,
        marginPct: 66.7,
        periodYear: 2026,
        periodMonth: 3,
        periodClosed: true,
        snapshotRevision: 4
      }
    ])
  })
})
