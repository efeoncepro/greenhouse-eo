import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaterializeOperationalPl = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/cost-intelligence/compute-operational-pl', () => ({
  materializeOperationalPl: (...args: unknown[]) => mockMaterializeOperationalPl(...args)
}))

// TASK-379: Do NOT mock publish-event. Let the real publisher reach the outbox
// so we can assert schemaVersion + period envelope. Only postgres is stubbed.
vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

import {
  getOperationalPlPeriodFromPayload,
  operationalPlProjection
} from '@/lib/sync/projections/operational-pl'

type QueryCall = { sql: string; values: unknown[] }

const collectOutboxInserts = (): QueryCall[] => {
  const calls: QueryCall[] = []

  for (const call of mockRunGreenhousePostgresQuery.mock.calls) {
    const sql = String(call[0])
    const values = (call[1] as unknown[]) ?? []

    if (sql.includes('INSERT INTO greenhouse_sync.outbox_events')) {
      calls.push({ sql, values })
    }
  }

  return calls
}

describe('operationalPlProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default stub: threshold lookup returns 15%. Outbox inserts return empty.
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('margin_alert_threshold_pct')) {
        return [{ margin_alert_threshold_pct: 15 }]
      }

      return []
    })
  })

  it('derives the affected period from finance dates and period ids', () => {
    expect(getOperationalPlPeriodFromPayload({ invoiceDate: '2026-03-14' })).toEqual({ year: 2026, month: 3 })
    expect(getOperationalPlPeriodFromPayload({ periodId: '2026-04' })).toEqual({ year: 2026, month: 4 })
  })

  it('publishes ONE period-level P&L event plus 1 margin alert for a breaching scope (TASK-379)', async () => {
    mockMaterializeOperationalPl.mockResolvedValue({
      periodClosed: true,
      snapshotRevision: 2,
      snapshots: [
        {
          snapshotId: 'client-client-1-2026-03-r2',
          scopeType: 'client',
          scopeId: 'client-1',
          scopeName: 'Acme',
          periodYear: 2026,
          periodMonth: 3,
          periodClosed: true,
          snapshotRevision: 2,
          currency: 'CLP',
          revenueClp: 1000,
          laborCostClp: 300,
          directExpenseClp: 200,
          overheadClp: 100,
          totalCostClp: 600,
          grossMarginClp: 400,
          grossMarginPct: 10,
          headcountFte: 1,
          revenuePerFteClp: 1000,
          costPerFteClp: 600,
          computationReason: 'reactive-refresh',
          materializedAt: null
        },
        {
          snapshotId: 'client-client-2-2026-03-r2',
          scopeType: 'client',
          scopeId: 'client-2',
          scopeName: 'Globex',
          periodYear: 2026,
          periodMonth: 3,
          periodClosed: true,
          snapshotRevision: 2,
          currency: 'CLP',
          revenueClp: 2000,
          laborCostClp: 500,
          directExpenseClp: 300,
          overheadClp: 100,
          totalCostClp: 900,
          grossMarginClp: 1100,
          grossMarginPct: 55,
          headcountFte: 2,
          revenuePerFteClp: 1000,
          costPerFteClp: 450,
          computationReason: 'reactive-refresh',
          materializedAt: null
        }
      ]
    })

    const result = await operationalPlProjection.refresh(
      { entityType: 'finance_period', entityId: '2026-03' },
      { _eventType: 'finance.expense.updated' }
    )

    expect(mockMaterializeOperationalPl).toHaveBeenCalledWith(
      2026,
      3,
      'reactive-refresh:finance.expense.updated:2026-03'
    )

    const outboxInserts = collectOutboxInserts()
    const eventTypes = outboxInserts.map(call => call.values[3])

    // 1 period-level P&L event + 1 margin alert (only client-1 is below the 15% threshold).
    expect(outboxInserts).toHaveLength(2)
    expect(eventTypes).toContain('accounting.pl_snapshot.period_materialized')
    expect(eventTypes).toContain('accounting.margin_alert.triggered')
    expect(eventTypes).not.toContain('accounting.pl_snapshot.materialized')

    const periodInsert = outboxInserts.find(call => call.values[3] === 'accounting.pl_snapshot.period_materialized')!

    expect(periodInsert.values[1]).toBe('operational_pl')
    expect(periodInsert.values[2]).toBe('2026-03')

    const payload = JSON.parse(String(periodInsert.values[4])) as Record<string, unknown>

    expect(payload.schemaVersion).toBe(2)
    expect(payload.periodId).toBe('2026-03')
    expect(payload.snapshotCount).toBe(2)
    expect(payload._materializedAt).toEqual(expect.any(String))
    expect(payload.periodYear).toBe(2026)
    expect(payload.periodMonth).toBe(3)
    expect(payload.periodClosed).toBe(true)
    expect(payload.snapshotRevision).toBe(2)
    expect(payload.scopeIds).toEqual([
      { scopeType: 'client', scopeId: 'client-1' },
      { scopeType: 'client', scopeId: 'client-2' }
    ])

    // Margin alerts stay 1-per-alert (not coalesced) — verify the surviving alert targets client-1.
    const alertInsert = outboxInserts.find(call => call.values[3] === 'accounting.margin_alert.triggered')!
    const alertPayload = JSON.parse(String(alertInsert.values[4])) as Record<string, unknown>

    expect(alertPayload.scopeId).toBe('client-1')

    expect(result).toContain('2026-03')
  })
})
