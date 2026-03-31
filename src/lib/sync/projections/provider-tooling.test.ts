import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeProviderToolingSnapshotsForPeriod = vi.fn()
const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/providers/provider-tooling-snapshots', () => ({
  materializeProviderToolingSnapshotsForPeriod: (...args: unknown[]) =>
    mockMaterializeProviderToolingSnapshotsForPeriod(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  PROVIDER_TOOLING_TRIGGER_EVENTS,
  getProviderToolingPeriodFromPayload,
  getProviderToolingScopeFromPayload,
  providerToolingProjection
} from '@/lib/sync/projections/provider-tooling'

describe('providerToolingProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the period from explicit fields and date-like payloads', () => {
    expect(getProviderToolingPeriodFromPayload({ periodYear: 2026, periodMonth: 3 })).toEqual({
      year: 2026,
      month: 3
    })
    expect(getProviderToolingScopeFromPayload({ periodId: '2026-04' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-04'
    })
    expect(getProviderToolingScopeFromPayload({ activatedAt: '2026-05-14' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-05'
    })
  })

  it('listens to provider, supplier, tooling, finance, and payroll events', () => {
    expect(PROVIDER_TOOLING_TRIGGER_EVENTS).toContain('provider.upserted')
    expect(PROVIDER_TOOLING_TRIGGER_EVENTS).toContain('finance.supplier.updated')
    expect(PROVIDER_TOOLING_TRIGGER_EVENTS).toContain('ai_tool.updated')
    expect(PROVIDER_TOOLING_TRIGGER_EVENTS).toContain('finance.tooling_cost.updated')
    expect(PROVIDER_TOOLING_TRIGGER_EVENTS).toContain('payroll_period.exported')
    expect(providerToolingProjection.domain).toBe('finance')
  })

  it('materializes the period and emits provider snapshot events', async () => {
    mockMaterializeProviderToolingSnapshotsForPeriod.mockResolvedValue([
      {
        snapshotId: 'anthropic:2026-03',
        providerId: 'anthropic',
        providerName: 'Anthropic',
        supplierId: 'supplier-anthropic',
        periodYear: 2026,
        periodMonth: 3,
        periodId: '2026-03',
        activeLicenseCount: 2,
        activeMemberCount: 2,
        financeExpenseTotalClp: 120000,
        subscriptionCostTotalClp: 78400,
        usageCostTotalClp: 45000,
        payrollMemberCount: 2,
        licensedMemberPayrollCostClp: 3200000,
        totalProviderCostClp: 243400
      }
    ])

    const result = await providerToolingProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.supplier.updated' }
    )

    expect(mockMaterializeProviderToolingSnapshotsForPeriod).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:finance.supplier.updated:2026-03'
    )
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'provider_tooling_snapshot',
        eventType: 'provider.tooling_snapshot.materialized'
      })
    )
    expect(result).toContain('2026-03')
  })
})
