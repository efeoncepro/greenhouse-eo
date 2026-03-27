import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireFinanceTenantContext = vi.fn()
const mockGetClientEconomics = vi.fn()
const mockListClientEconomicsByPeriod = vi.fn()
const mockComputeClientEconomicsSnapshots = vi.fn()
const mockIsFinanceSlice2PostgresEnabled = vi.fn()
const mockAssertFinanceSlice2PostgresReady = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: (...args: unknown[]) => mockRequireFinanceTenantContext(...args)
}))

vi.mock('@/lib/finance/postgres-store-intelligence', () => ({
  getClientEconomics: (...args: unknown[]) => mockGetClientEconomics(...args),
  listClientEconomicsByPeriod: (...args: unknown[]) => mockListClientEconomicsByPeriod(...args),
  computeClientEconomicsSnapshots: (...args: unknown[]) => mockComputeClientEconomicsSnapshots(...args)
}))

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  isFinanceSlice2PostgresEnabled: (...args: unknown[]) => mockIsFinanceSlice2PostgresEnabled(...args),
  assertFinanceSlice2PostgresReady: (...args: unknown[]) => mockAssertFinanceSlice2PostgresReady(...args)
}))

import { GET } from '@/app/api/finance/intelligence/client-economics/route'

describe('GET /api/finance/intelligence/client-economics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireFinanceTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal', routeGroups: ['internal'] },
      errorResponse: null
    })
  })

  it('hides margins when a backfilled snapshot has placeholder costs', async () => {
    mockListClientEconomicsByPeriod.mockResolvedValue([
      {
        snapshotId: 'snap-1',
        clientId: 'client-1',
        clientName: 'Sky Airline',
        periodYear: 2026,
        periodMonth: 3,
        totalRevenueClp: 13804000,
        directCostsClp: 1225,
        indirectCostsClp: 0,
        grossMarginClp: 13802775,
        grossMarginPercent: 0.9999,
        netMarginClp: 13802775,
        netMarginPercent: 0.9999,
        headcountFte: 3,
        revenuePerFte: 4601333.33,
        costPerFte: 408.33,
        notes: 'Backfill from Codex for organization finance visibility',
        computedAt: '2026-03-20T19:42:48.185Z',
        createdAt: '2026-03-20T19:41:44.207Z',
        updatedAt: '2026-03-20T19:42:48.185Z'
      }
    ])

    const response = await GET(new Request('http://localhost/api/finance/intelligence/client-economics?year=2026&month=3'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.snapshots[0]).toMatchObject({
      hasCompleteCostCoverage: false,
      grossMarginPercent: null,
      netMarginPercent: null
    })
  })
})
