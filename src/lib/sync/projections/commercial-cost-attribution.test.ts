import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeCommercialCostAttributionForPeriod = vi.fn()
const mockReadCommercialCostAttributionByClientForPeriod = vi.fn()
const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/commercial-cost-attribution/member-period-attribution', () => ({
  materializeCommercialCostAttributionForPeriod: (...args: unknown[]) =>
    mockMaterializeCommercialCostAttributionForPeriod(...args),
  readCommercialCostAttributionByClientForPeriod: (...args: unknown[]) =>
    mockReadCommercialCostAttributionByClientForPeriod(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  commercialCostAttributionProjection,
  getCommercialCostAttributionPeriodFromPayload,
  getCommercialCostAttributionScopeFromPayload
} from '@/lib/sync/projections/commercial-cost-attribution'

describe('commercialCostAttributionProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the period from explicit fields, period ids, and finance dates', () => {
    expect(getCommercialCostAttributionPeriodFromPayload({ periodYear: 2026, periodMonth: 3 })).toEqual({
      year: 2026,
      month: 3
    })
    expect(getCommercialCostAttributionScopeFromPayload({ periodId: '2026-04' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-04'
    })
    expect(getCommercialCostAttributionScopeFromPayload({ invoiceDate: '2026-05-14' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-05'
    })
  })

  it('listens to finance, payroll, and assignment events that affect attribution', () => {
    expect(commercialCostAttributionProjection.triggerEvents).toContain('finance.expense.updated')
    expect(commercialCostAttributionProjection.triggerEvents).toContain('assignment.updated')
    expect(commercialCostAttributionProjection.triggerEvents).toContain('payroll_period.exported')
    expect(commercialCostAttributionProjection.triggerEvents).toContain('compensation_version.updated')
  })

  it('materializes the period and emits an attribution materialized event', async () => {
    mockMaterializeCommercialCostAttributionForPeriod.mockResolvedValue([
      {
        memberId: 'member-1',
        allocations: [{ clientId: 'client-1' }]
      }
    ])
    mockReadCommercialCostAttributionByClientForPeriod.mockResolvedValue([
      { clientId: 'client-1' }
    ])

    const result = await commercialCostAttributionProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.expense.updated' }
    )

    expect(mockMaterializeCommercialCostAttributionForPeriod).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:finance.expense.updated:2026-03'
    )
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'commercial_cost_attribution',
        eventType: 'accounting.commercial_cost_attribution.materialized'
      })
    )
    expect(result).toContain('2026-03')
  })
})
