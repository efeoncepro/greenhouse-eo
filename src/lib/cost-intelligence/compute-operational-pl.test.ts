import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockReadCommercialCostAttributionByClientForPeriod = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/commercial-cost-attribution/member-period-attribution', () => ({
  readCommercialCostAttributionByClientForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttributionByClientForPeriod(...args)
}))

import { computeOperationalPl } from '@/lib/cost-intelligence/compute-operational-pl'

describe('computeOperationalPl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes client, space, and organization snapshots using net revenue semantics', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ closure_status: 'closed', snapshot_revision: 3 }])
      .mockResolvedValueOnce([
        { client_id: 'client-1', client_name: 'Acme', total_revenue_clp: 1000, partner_share_clp: 200 }
      ])
      .mockResolvedValueOnce([
        { client_id: 'client-1', client_name: 'Acme', total_direct_expense_clp: 50 }
      ])
      .mockResolvedValueOnce([
        { client_id: 'client-1', client_name: 'Acme', total_direct_expense_clp: 25 }
      ])
      .mockResolvedValueOnce([
        {
          client_id: 'client-1',
          client_name: 'Acme',
          space_id: 'space-1',
          space_name: 'Space One',
          organization_id: 'org-1',
          organization_name: 'Org One'
        }
      ])

    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([
      {
        clientId: 'client-1',
        clientName: 'Acme',
        laborCostClp: 300,
        overheadCostClp: 75,
        loadedCostClp: 375,
        headcountFte: 1,
        memberCount: 1
      }
    ])

    const result = await computeOperationalPl(2026, 3, 'test')

    expect(result.periodClosed).toBe(true)
    expect(result.snapshotRevision).toBe(3)
    expect(result.snapshots).toHaveLength(3)

    const client = result.snapshots.find(snapshot => snapshot.scopeType === 'client')
    const space = result.snapshots.find(snapshot => snapshot.scopeType === 'space')
    const organization = result.snapshots.find(snapshot => snapshot.scopeType === 'organization')

    expect(client).toMatchObject({
      scopeId: 'client-1',
      revenueClp: 800,
      laborCostClp: 300,
      directExpenseClp: 75,
      overheadClp: 75,
      totalCostClp: 450,
      grossMarginClp: 350,
      grossMarginPct: 43.75,
      periodClosed: true,
      snapshotRevision: 3
    })
    expect(space?.scopeId).toBe('space-1')
    expect(space?.grossMarginClp).toBe(350)
    expect(organization?.scopeId).toBe('org-1')
    expect(organization?.grossMarginClp).toBe(350)
  })

  it('keeps zero-revenue clients visible when they still carry cost', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { client_id: 'client-2', client_name: 'No Revenue Co', total_direct_expense_clp: 40 }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([
      {
        clientId: 'client-2',
        clientName: 'No Revenue Co',
        laborCostClp: 60,
        overheadCostClp: 0,
        loadedCostClp: 60,
        headcountFte: 0.5,
        memberCount: 1
      }
    ])

    const result = await computeOperationalPl(2026, 4, 'negative-case')
    const client = result.snapshots.find(snapshot => snapshot.scopeType === 'client')

    expect(client).toMatchObject({
      scopeId: 'client-2',
      revenueClp: 0,
      laborCostClp: 60,
      directExpenseClp: 40,
      totalCostClp: 100,
      grossMarginClp: -100,
      grossMarginPct: null
    })
  })

  it('anchors revenue aggregation to canonical client_id via client_profiles when needed', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { client_id: 'client-1', client_name: 'Acme', total_revenue_clp: 1000, partner_share_clp: 0 }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([])

    await computeOperationalPl(2026, 5, 'canonical-client-test')

    const revenueQuery = mockRunGreenhousePostgresQuery.mock.calls[1]?.[0] as string

    expect(revenueQuery).toContain('LEFT JOIN greenhouse_finance.client_profiles cp')
    expect(revenueQuery).toContain('COALESCE(i.client_id, cp.client_id) AS client_id')
    expect(revenueQuery).not.toContain('COALESCE(i.client_id, i.client_profile_id) AS client_id')
  })
})
