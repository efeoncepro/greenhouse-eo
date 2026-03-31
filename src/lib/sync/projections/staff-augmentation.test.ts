import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeStaffAugPlacementSnapshotsForPeriod = vi.fn()
const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/staff-augmentation/snapshots', () => ({
  materializeStaffAugPlacementSnapshotsForPeriod: (...args: unknown[]) =>
    mockMaterializeStaffAugPlacementSnapshotsForPeriod(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  STAFF_AUG_PLACEMENT_TRIGGER_EVENTS,
  getStaffAugPlacementPeriodFromPayload,
  getStaffAugPlacementScopeFromPayload,
  staffAugPlacementProjection
} from '@/lib/sync/projections/staff-augmentation'

describe('staffAugPlacementProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives finance period scope from explicit fields and date-like payloads', () => {
    expect(getStaffAugPlacementPeriodFromPayload({ periodYear: 2026, periodMonth: 3 })).toEqual({
      year: 2026,
      month: 3
    })
    expect(getStaffAugPlacementScopeFromPayload({ payrollPeriodId: '2026-04' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-04'
    })
    expect(getStaffAugPlacementScopeFromPayload({ contractStartDate: '2026-05-14' })).toEqual({
      entityType: 'finance_period',
      entityId: '2026-05'
    })
  })

  it('listens to assignment, finance, provider and payroll events', () => {
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('staff_aug.placement.created')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('assignment.updated')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('finance.expense.updated')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('accounting.commercial_cost_attribution.materialized')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('provider.tooling_snapshot.materialized')
    expect(STAFF_AUG_PLACEMENT_TRIGGER_EVENTS).toContain('payroll_period.exported')
    expect(staffAugPlacementProjection.domain).toBe('finance')
  })

  it('materializes snapshots and emits staff augmentation snapshot events', async () => {
    mockMaterializeStaffAugPlacementSnapshotsForPeriod.mockResolvedValue([
      {
        snapshotId: 'placement-1:2026-03',
        placementId: 'placement-1',
        assignmentId: 'assignment-1',
        clientId: 'client-1',
        memberId: 'member-1',
        providerId: 'anthropic',
        periodYear: 2026,
        periodMonth: 3,
        periodId: '2026-03',
        projectedRevenueClp: 2400000,
        payrollEmployerCostClp: 1200000,
        commercialLoadedCostClp: 1450000,
        toolingCostClp: 95000,
        grossMarginProxyClp: 855000,
        grossMarginProxyPct: 35.63,
        snapshotStatus: 'complete'
      }
    ])

    const result = await staffAugPlacementProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'payroll_period.exported' }
    )

    expect(mockMaterializeStaffAugPlacementSnapshotsForPeriod).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:payroll_period.exported:2026-03'
    )
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'staff_aug_placement_snapshot',
        eventType: 'staff_aug.placement_snapshot.materialized'
      })
    )
    expect(result).toContain('2026-03')
  })
})
