import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  ensureCommercialCostAttributionSchema,
  purgeCommercialCostAttributionPeriod,
  readCommercialCostAttributionAllocationsForPeriod,
  upsertCommercialCostAttributionAllocations
} from '@/lib/commercial-cost-attribution/store'

describe('commercial cost attribution store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the serving table schema', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    await ensureCommercialCostAttributionSchema()

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS greenhouse_serving.commercial_cost_attribution')
    )
  })

  it('upserts allocation rows', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    await upsertCommercialCostAttributionAllocations([
      {
        memberId: 'member-1',
        clientId: 'client-1',
        organizationId: 'org-1',
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

    expect(mockRunGreenhousePostgresQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_serving.commercial_cost_attribution'),
      expect.arrayContaining(['member-1', 'client-1', 'org-1', 'Acme', 2026, 3])
    )
  })

  it('reads materialized allocations for a period', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          member_id: 'member-1',
          client_id: 'client-1',
          organization_id: 'org-1',
          client_name: 'Acme',
          period_year: 2026,
          period_month: 3,
          base_labor_cost_target: '1000',
          internal_operational_cost_target: '200',
          direct_overhead_target: '100',
          shared_overhead_target: '50',
          fte_contribution: '1',
          allocation_ratio: '1',
          commercial_labor_cost_target: '800',
          commercial_direct_overhead_target: '100',
          commercial_shared_overhead_target: '50',
          commercial_loaded_cost_target: '950',
          source_of_truth: 'member_capacity_economics',
          rule_version: '2026-03-30.v1',
          materialization_reason: 'test',
          materialized_at: '2026-03-30T22:00:00.000Z'
        }
      ])

    const rows = await readCommercialCostAttributionAllocationsForPeriod(2026, 3)

    expect(rows).toEqual([
      expect.objectContaining({
        memberId: 'member-1',
        clientId: 'client-1',
        organizationId: 'org-1',
        commercialLoadedCostTarget: 950
      })
    ])
  })

  it('purges a period before rematerialization', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    await purgeCommercialCostAttributionPeriod(2026, 3)

    expect(mockRunGreenhousePostgresQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('DELETE FROM greenhouse_serving.commercial_cost_attribution'),
      [2026, 3]
    )
  })
})
