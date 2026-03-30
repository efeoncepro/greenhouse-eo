import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockComputeClientLaborCosts = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/finance/payroll-cost-allocation', () => ({
  computeClientLaborCosts: (...args: unknown[]) => mockComputeClientLaborCosts(...args)
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
        { client_id: 'client-1', client_name: 'Acme', total_overhead_clp: 75, allocated_fte: 1 }
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

    mockComputeClientLaborCosts.mockResolvedValue([
      {
        clientId: 'client-1',
        clientName: 'Acme',
        allocatedLaborClp: 300,
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
      .mockResolvedValueOnce([])

    mockComputeClientLaborCosts.mockResolvedValue([
      {
        clientId: 'client-2',
        clientName: 'No Revenue Co',
        allocatedLaborClp: 60,
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
})
