import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockPurgeCommercialCostAttributionPeriod = vi.fn()
const mockReadCommercialCostAttributionAllocationsForPeriod = vi.fn()
const mockUpsertCommercialCostAttributionAllocations = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/commercial-cost-attribution/store', () => ({
  purgeCommercialCostAttributionPeriod: (...args: unknown[]) => mockPurgeCommercialCostAttributionPeriod(...args),
  readCommercialCostAttributionAllocationsForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttributionAllocationsForPeriod(...args),
  upsertCommercialCostAttributionAllocations: (...args: unknown[]) =>
    mockUpsertCommercialCostAttributionAllocations(...args)
}))

import {
  materializeCommercialCostAttributionForPeriod,
  readCommercialCostAttributionByClientForPeriod,
  readCommercialCostAttributionForPeriod,
  summarizeCommercialCostAttributionByClient
} from '@/lib/commercial-cost-attribution/member-period-attribution'

describe('readCommercialCostAttributionForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadCommercialCostAttributionAllocationsForPeriod.mockResolvedValue([])
    mockPurgeCommercialCostAttributionPeriod.mockResolvedValue(undefined)
    mockUpsertCommercialCostAttributionAllocations.mockResolvedValue(undefined)
  })

  it('combines member capacity economics with labor allocation into a canonical member-period row', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 3,
          total_labor_cost_target: '1000',
          direct_overhead_target: '100',
          shared_overhead_target: '50'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          client_id: 'client-1',
          client_name: 'Acme',
          period_year: 2026,
          period_month: 3,
          total_fte: '1',
          fte_contribution: '1',
          allocated_labor_clp: '800'
        }
      ])

    const rows = await readCommercialCostAttributionForPeriod(2026, 3)

    expect(rows).toEqual([
      expect.objectContaining({
        memberId: 'member-1',
        baseLaborCostTarget: 1000,
        totalCommercialLaborCostTarget: 800,
        internalOperationalCostTarget: 200,
        directOverheadTarget: 100,
        sharedOverheadTarget: 50,
        totalCommercialLoadedCostTarget: 950,
        sourceOfTruth: 'member_capacity_economics',
        allocations: [
          expect.objectContaining({
            clientId: 'client-1',
            commercialLaborCostTarget: 800,
            commercialDirectOverheadTarget: 100,
            commercialSharedOverheadTarget: 50,
            commercialLoadedCostTarget: 950
          })
        ]
      })
    ])
  })

  it('falls back to labor allocation when member capacity economics is missing', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          member_id: 'member-2',
          client_id: 'client-2',
          client_name: 'Sky',
          period_year: 2026,
          period_month: 3,
          total_fte: '0.5',
          fte_contribution: '0.5',
          allocated_labor_clp: '300'
        }
      ])

    const rows = await readCommercialCostAttributionForPeriod(2026, 3)

    expect(rows[0]).toEqual(
      expect.objectContaining({
        memberId: 'member-2',
        baseLaborCostTarget: 300,
        internalOperationalCostTarget: 0,
        sourceOfTruth: 'client_labor_cost_allocation'
      })
    )
  })

  it('prefers materialized rows when the store already has the period', async () => {
    mockReadCommercialCostAttributionAllocationsForPeriod.mockResolvedValue([
      {
        memberId: 'member-1',
        clientId: 'client-1',
        clientName: 'Acme',
        periodYear: 2026,
        periodMonth: 3,
        baseLaborCostTarget: 1000,
        internalOperationalCostTarget: 200,
        directOverheadTarget: 100,
        sharedOverheadTarget: 50,
        fteContribution: 1,
        allocationRatio: 1,
        commercialLaborCostTarget: 800,
        commercialDirectOverheadTarget: 100,
        commercialSharedOverheadTarget: 50,
        commercialLoadedCostTarget: 950,
        sourceOfTruth: 'member_capacity_economics',
        ruleVersion: '2026-03-30.v1',
        materializationReason: 'test',
        materializedAt: '2026-03-30T22:00:00.000Z'
      }
    ])

    const rows = await readCommercialCostAttributionForPeriod(2026, 3)

    expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
    expect(rows[0]).toEqual(
      expect.objectContaining({
        memberId: 'member-1',
        totalCommercialLoadedCostTarget: 950
      })
    )
  })

  it('aggregates client-level summaries from canonical rows', async () => {
    const summary = summarizeCommercialCostAttributionByClient([
      {
        memberId: 'member-1',
        periodYear: 2026,
        periodMonth: 3,
        baseLaborCostTarget: 1000,
        totalCommercialLaborCostTarget: 800,
        internalOperationalCostTarget: 200,
        directOverheadTarget: 100,
        sharedOverheadTarget: 50,
        totalCommercialLoadedCostTarget: 950,
        sourceOfTruth: 'member_capacity_economics',
        ruleVersion: '2026-03-30.v1',
        allocations: [
          {
            memberId: 'member-1',
            clientId: 'client-1',
            clientName: 'Acme',
            periodYear: 2026,
            periodMonth: 3,
            fteContribution: 1,
            allocationRatio: 1,
            commercialLaborCostTarget: 800,
            commercialDirectOverheadTarget: 100,
            commercialSharedOverheadTarget: 50,
            commercialLoadedCostTarget: 950,
            sourceOfTruth: 'member_capacity_economics',
            ruleVersion: '2026-03-30.v1'
          }
        ]
      }
    ])

    expect(summary).toEqual([
      {
        clientId: 'client-1',
        clientName: 'Acme',
        laborCostClp: 800,
        overheadCostClp: 150,
        loadedCostClp: 950,
        headcountFte: 1,
        memberCount: 1
      }
    ])
  })

  it('reads client summaries directly for a period', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 3,
          total_labor_cost_target: '1000',
          direct_overhead_target: '100',
          shared_overhead_target: '50'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          client_id: 'client-1',
          client_name: 'Acme',
          period_year: 2026,
          period_month: 3,
          total_fte: '1',
          fte_contribution: '1',
          allocated_labor_clp: '800'
        }
      ])

    await expect(readCommercialCostAttributionByClientForPeriod(2026, 3)).resolves.toEqual([
      {
        clientId: 'client-1',
        clientName: 'Acme',
        laborCostClp: 800,
        overheadCostClp: 150,
        loadedCostClp: 950,
        headcountFte: 1,
        memberCount: 1
      }
    ])
  })

  it('materializes the computed period into the serving store', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          period_year: 2026,
          period_month: 3,
          total_labor_cost_target: '1000',
          direct_overhead_target: '100',
          shared_overhead_target: '50'
        }
      ])
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          client_id: 'client-1',
          client_name: 'Acme',
          period_year: 2026,
          period_month: 3,
          total_fte: '1',
          fte_contribution: '1',
          allocated_labor_clp: '800'
        }
      ])

    await materializeCommercialCostAttributionForPeriod(2026, 3, 'test-materialization')

    expect(mockPurgeCommercialCostAttributionPeriod).toHaveBeenCalledWith(2026, 3)
    expect(mockUpsertCommercialCostAttributionAllocations).toHaveBeenCalledWith([
      expect.objectContaining({
        memberId: 'member-1',
        clientId: 'client-1',
        materializationReason: 'test-materialization'
      })
    ])
  })
})
