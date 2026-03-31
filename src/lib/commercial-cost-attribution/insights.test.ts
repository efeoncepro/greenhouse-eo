import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadCommercialCostAttributionAllocationsForPeriod = vi.fn()

vi.mock('@/lib/commercial-cost-attribution/store', () => ({
  readCommercialCostAttributionAllocationsForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttributionAllocationsForPeriod(...args)
}))

import {
  getCommercialCostAttributionExplainForClient,
  getCommercialCostAttributionHealthSummary
} from '@/lib/commercial-cost-attribution/insights'

describe('commercial cost attribution insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a semantic health summary for a period', async () => {
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

    await expect(getCommercialCostAttributionHealthSummary(2026, 3)).resolves.toEqual(
      expect.objectContaining({
        allocationCount: 1,
        memberCount: 1,
        clientCount: 1,
        totalBaseLaborCostTarget: 1000,
        totalCommercialLaborCostTarget: 800,
        totalInternalOperationalCostTarget: 200,
        totalCommercialLoadedCostTarget: 950,
        healthy: true
      })
    )
  })

  it('builds an explain payload grouped by client', async () => {
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

    await expect(getCommercialCostAttributionExplainForClient(2026, 3, 'client-1')).resolves.toEqual(
      expect.objectContaining({
        clientId: 'client-1',
        clientName: 'Acme',
        memberCount: 1,
        commercialLoadedCostTarget: 950,
        members: [
          expect.objectContaining({
            memberId: 'member-1',
            commercialLaborCostTarget: 800
          })
        ]
      })
    )
  })

  it('returns null explain payload when the client has no attribution', async () => {
    mockReadCommercialCostAttributionAllocationsForPeriod.mockResolvedValue([])

    await expect(getCommercialCostAttributionExplainForClient(2026, 3, 'missing')).resolves.toBeNull()
  })
})
