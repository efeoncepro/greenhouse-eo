import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeProviderToolingSnapshotsForPeriod = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/providers/provider-tooling-snapshots', () => ({
  materializeProviderToolingSnapshotsForPeriod: (...args: unknown[]) =>
    mockMaterializeProviderToolingSnapshotsForPeriod(...args)
}))

// Keep the real publishPeriodMaterializedEvent so we can assert that the outbox
// payload carries schemaVersion: 2 plus the period envelope. Only the underlying
// postgres call is stubbed.
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
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

  it('materializes the period and emits a single period-level event (TASK-379)', async () => {
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
      },
      {
        snapshotId: 'openai:2026-03',
        providerId: 'openai',
        providerName: 'OpenAI',
        supplierId: 'supplier-openai',
        periodYear: 2026,
        periodMonth: 3,
        periodId: '2026-03',
        activeLicenseCount: 1,
        activeMemberCount: 1,
        financeExpenseTotalClp: 60000,
        subscriptionCostTotalClp: 48000,
        usageCostTotalClp: 12000,
        payrollMemberCount: 1,
        licensedMemberPayrollCostClp: 1600000,
        totalProviderCostClp: 120000
      }
    ])
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await providerToolingProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.supplier.updated' }
    )

    expect(mockMaterializeProviderToolingSnapshotsForPeriod).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:finance.supplier.updated:2026-03'
    )

    // Fan-out reduction: exactly ONE outbox insert instead of N per provider.
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    const [sql, values] = mockRunGreenhousePostgresQuery.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('INSERT INTO greenhouse_sync.outbox_events')

    // Values: [eventId, aggregateType, aggregateId, eventType, payloadJson]
    expect(values[1]).toBe('provider_tooling_snapshot')
    expect(values[2]).toBe('2026-03')
    expect(values[3]).toBe('provider.tooling_snapshot.period_materialized')

    const payload = JSON.parse(String(values[4])) as Record<string, unknown>

    expect(payload.schemaVersion).toBe(2)
    expect(payload.periodId).toBe('2026-03')
    expect(payload.snapshotCount).toBe(2)
    expect(payload._materializedAt).toEqual(expect.any(String))
    expect(payload.periodYear).toBe(2026)
    expect(payload.periodMonth).toBe(3)
    expect(payload.providerIds).toEqual(['anthropic', 'openai'])

    expect(result).toContain('2026-03')
  })

  it('does not publish the legacy per-entity event type anymore (TASK-379)', async () => {
    mockMaterializeProviderToolingSnapshotsForPeriod.mockResolvedValue([
      {
        snapshotId: 'anthropic:2026-03',
        providerId: 'anthropic',
        providerName: 'Anthropic',
        supplierId: 'supplier-anthropic',
        periodYear: 2026,
        periodMonth: 3,
        periodId: '2026-03',
        activeLicenseCount: 1,
        activeMemberCount: 1,
        financeExpenseTotalClp: 0,
        subscriptionCostTotalClp: 0,
        usageCostTotalClp: 0,
        payrollMemberCount: 0,
        licensedMemberPayrollCostClp: 0,
        totalProviderCostClp: 0
      }
    ])
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    await providerToolingProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'provider.upserted' }
    )

    for (const call of mockRunGreenhousePostgresQuery.mock.calls) {
      const values = call[1] as unknown[]

      expect(values[3]).not.toBe('provider.tooling_snapshot.materialized')
    }
  })
})
