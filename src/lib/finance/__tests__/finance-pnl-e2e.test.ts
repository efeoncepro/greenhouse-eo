import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * E2E-style tests for computeClientEconomicsSnapshots covering scenarios
 * NOT present in the existing postgres-store-intelligence.test.ts:
 *
 *   1. zero-revenue client (cost-only)
 *   2. empty period (no clients at all)
 *   3. multiple clients in one period
 *   4. labor cost attribution is wired in
 *
 * Call sequence inside computeClientEconomicsSnapshots
 * (each is a mockResolvedValueOnce slot):
 *   [0] revenue aggregation query
 *   [1] cost allocations query
 *   [2] direct expense rows query
 *   [3] CAC rows query (acquisition cost, all-time)
 *   [4] LTV rows query (lifetime gross margin, all-time)
 *   [5+N] upsertClientEconomicsSnapshot UPSERT — one per client
 *
 * mockReadCommercialCostAttribution is called independently (not via
 * runGreenhousePostgresQuery) and is counted separately.
 */

// ─── Mock implementations declared BEFORE vi.mock() ─────────────────
const mockRunGreenhousePostgresQuery = vi.fn()
const mockAssertFinanceSlice2PostgresReady = vi.fn()
const mockReadCommercialCostAttribution = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn(),
}))

vi.mock('@/lib/finance/postgres-store-slice2', async () => {
  const actual = await vi.importActual('@/lib/finance/postgres-store-slice2')

  return {
    ...actual,
    assertFinanceSlice2PostgresReady: (...args: unknown[]) =>
      mockAssertFinanceSlice2PostgresReady(...args),
  }
})

vi.mock('@/lib/commercial-cost-attribution/member-period-attribution', () => ({
  readCommercialCostAttributionByClientForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttribution(...args),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn(),
}))

import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'

// ─── Shared snapshot builder ─────────────────────────────────────────

const buildSnapshotRow = (overrides: Record<string, unknown> = {}) => ({
  snapshot_id: 'snap-1',
  client_id: 'client-1',
  organization_id: 'org-1',
  client_name: 'Acme Corp',
  period_year: 2026,
  period_month: 3,
  total_revenue_clp: '1000000',
  labor_cost_clp: '0',
  direct_costs_clp: '0',
  indirect_costs_clp: '0',
  gross_margin_clp: '1000000',
  gross_margin_percent: '1.0',
  net_margin_clp: '1000000',
  net_margin_percent: '1.0',
  headcount_fte: null,
  revenue_per_fte: null,
  cost_per_fte: null,
  notes: null,
  computed_at: null,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
})

// ─── Tests ────────────────────────────────────────────────────────────

describe('computeClientEconomicsSnapshots — additional scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertFinanceSlice2PostgresReady.mockResolvedValue(undefined)
    mockReadCommercialCostAttribution.mockResolvedValue([])
  })

  // ─── Scenario 1: zero-revenue client (cost-only) ──────────────────

  it('handles a client with direct costs but no revenue without throwing', async () => {
    // Revenue query returns no rows for this client
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([]) // [0] revenue → empty (client appears via cost allocation)
      .mockResolvedValueOnce([   // [1] cost allocations → client-2 has 50,000 CLP allocated
        {
          client_id: 'client-2',
          organization_id: 'org-2',
          client_name: 'Beta Ltd',
          total_allocated_clp: '50000',
        },
      ])
      .mockResolvedValueOnce([]) // [2] direct expenses → empty
      .mockResolvedValueOnce([]) // [3] CAC rows
      .mockResolvedValueOnce([]) // [4] LTV rows
      // [5] upsert for client-2
      .mockResolvedValueOnce([
        buildSnapshotRow({
          snapshot_id: 'snap-cost-only',
          client_id: 'client-2',
          organization_id: 'org-2',
          client_name: 'Beta Ltd',
          total_revenue_clp: '0',
          direct_costs_clp: '50000',
          gross_margin_clp: '-50000',
          gross_margin_percent: null,
          net_margin_clp: '-50000',
          net_margin_percent: null,
        }),
      ])

    const result = await computeClientEconomicsSnapshots(2026, 3)

    // Function must complete without throwing
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0]?.clientId).toBe('client-2')

    // Revenue should be zero for this cost-only client
    expect(result[0]?.totalRevenueClp).toBe(0)
  })

  // ─── Scenario 2: empty period (no clients with activity) ──────────

  it('returns an empty array when no clients have revenue or costs in the period', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([]) // [0] revenue → empty
      .mockResolvedValueOnce([]) // [1] cost allocations → empty
      .mockResolvedValueOnce([]) // [2] direct expenses → empty
      .mockResolvedValueOnce([]) // [3] CAC
      .mockResolvedValueOnce([]) // [4] LTV
    // No upsert calls because clientMap is empty

    const result = await computeClientEconomicsSnapshots(2026, 2)

    expect(result).toHaveLength(0)

    // UPSERT should NOT have been called
    // Total calls = 5 (revenue + allocations + direct expenses + cac + ltv)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(5)
  })

  // ─── Scenario 3: multiple clients in one period ───────────────────

  it('processes and returns snapshots for multiple clients in the same period', async () => {
    const client1Revenue = {
      client_id: 'client-1',
      organization_id: 'org-1',
      client_name: 'Acme Corp',
      total_revenue_clp: '1000000',
    }

    const client2Revenue = {
      client_id: 'client-2',
      organization_id: 'org-2',
      client_name: 'Beta Ltd',
      total_revenue_clp: '500000',
    }

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([client1Revenue, client2Revenue]) // [0] revenue
      .mockResolvedValueOnce([])                               // [1] cost allocations
      .mockResolvedValueOnce([])                               // [2] direct expenses
      .mockResolvedValueOnce([])                               // [3] CAC
      .mockResolvedValueOnce([])                               // [4] LTV
      // [5] upsert for first client
      .mockResolvedValueOnce([buildSnapshotRow({ client_id: 'client-1' })])

      // [6] upsert for second client
      .mockResolvedValueOnce([
        buildSnapshotRow({
          snapshot_id: 'snap-2',
          client_id: 'client-2',
          organization_id: 'org-2',
          client_name: 'Beta Ltd',
          total_revenue_clp: '500000',
          gross_margin_clp: '500000',
          net_margin_clp: '500000',
        }),
      ])

    const result = await computeClientEconomicsSnapshots(2026, 3)

    expect(result).toHaveLength(2)
    const clientIds = result.map(r => r.clientId).sort()

    expect(clientIds).toContain('client-1')
    expect(clientIds).toContain('client-2')
  })

  // ─── Scenario 4: labor cost attribution is wired in ───────────────

  it('calls readCommercialCostAttributionByClientForPeriod with the correct year and month', async () => {
    mockReadCommercialCostAttribution.mockResolvedValue([
      {
        clientId: 'client-1',
        organizationId: 'org-1',
        clientName: 'Acme Corp',
        laborCostClp: 200000,
        headcountFte: 1.5,
        loadedCostClp: 240000,
      },
    ])

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          organization_id: 'org-1',
          client_name: 'Acme Corp',
          total_revenue_clp: '1000000',
        },
      ])
      .mockResolvedValueOnce([]) // cost allocations
      .mockResolvedValueOnce([]) // direct expenses
      .mockResolvedValueOnce([]) // CAC
      .mockResolvedValueOnce([]) // LTV
      .mockResolvedValueOnce([
        buildSnapshotRow({
          labor_cost_clp: '200000',
          gross_margin_clp: '800000',
          net_margin_clp: '800000',
          headcount_fte: '1.5',
          revenue_per_fte: '666666.67',
        }),
      ])

    await computeClientEconomicsSnapshots(2026, 3)

    expect(mockReadCommercialCostAttribution).toHaveBeenCalledTimes(1)
    expect(mockReadCommercialCostAttribution).toHaveBeenCalledWith(2026, 3)
  })

  // ─── Scenario 5: commercial cost attribution failure is swallowed ──

  it('continues computation even when readCommercialCostAttributionByClientForPeriod throws', async () => {
    mockReadCommercialCostAttribution.mockRejectedValue(
      new Error('commercial cost attribution read failed')
    )

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          organization_id: 'org-1',
          client_name: 'Acme Corp',
          total_revenue_clp: '1000000',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildSnapshotRow()])

    // Should not throw — error is caught internally and logged
    const result = await computeClientEconomicsSnapshots(2026, 3)

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })
})
