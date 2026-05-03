import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockLoadNagerDateHolidayDateSet = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/calendar/nager-date-holidays', () => ({
  loadNagerDateHolidayDateSet: (...args: unknown[]) => mockLoadNagerDateHolidayDateSet(...args)
}))

const { checkPeriodReadiness } = await import('./check-period-readiness')
const { closePeriod, reopenPeriod } = await import('./close-period')
const { EVENT_TYPES } = await import('@/lib/sync/event-catalog')

type Fixtures = {
  config?: Record<string, unknown> | null
  existing?: Record<string, unknown> | null
  payroll?: Record<string, unknown> | null
  incomeCount?: number
  expenseCount?: number
  fxCount?: number
}

const buildFixtures = (input: Fixtures = {}): Required<Fixtures> => ({
  config: {
    config_id: 'default',
    require_payroll_exported: true,
    require_income_recorded: true,
    require_expenses_recorded: true,
    require_bank_reconciled: false,
    require_fx_locked: true,
    margin_alert_threshold_pct: 15,
    ...input.config
  },
  existing: input.existing ?? null,
  payroll: {
    status: 'exported',
    ...input.payroll
  },
  incomeCount: input.incomeCount ?? 1,
  expenseCount: input.expenseCount ?? 1,
  fxCount: input.fxCount ?? 1
})

const resolveRowsFromSql = (sql: string, fixtures: Required<Fixtures>) => {
  if (sql.includes('FROM greenhouse_cost_intelligence.period_closure_config')) {
    return fixtures.config ? [fixtures.config] : []
  }

  if (sql.includes('FROM greenhouse_cost_intelligence.period_closures')) {
    return fixtures.existing ? [fixtures.existing] : []
  }

  if (sql.includes('FROM greenhouse_payroll.payroll_periods')) {
    return fixtures.payroll ? [fixtures.payroll] : []
  }

  if (sql.includes('FROM greenhouse_finance.income')) {
    return [{ total: fixtures.incomeCount }]
  }

  if (sql.includes('FROM greenhouse_finance.expenses')) {
    return [{ total: fixtures.expenseCount }]
  }

  if (sql.includes('FROM greenhouse_finance.exchange_rates')) {
    return [{ total: fixtures.fxCount }]
  }

  return []
}

const wireDefaultQueryMocks = (fixturesInput: Fixtures = {}) => {
  const fixtures = buildFixtures(fixturesInput)

  mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => resolveRowsFromSql(sql, fixtures))

  return fixtures
}

const wireTransaction = (fixturesInput: Fixtures = {}) => {
  const fixtures = buildFixtures(fixturesInput)
  const writes: Array<{ sql: string; values: unknown[] | undefined }> = []

  const client = {
    query: vi.fn(async (sql: string, values?: unknown[]) => {
      writes.push({ sql, values })

      return { rows: resolveRowsFromSql(sql, fixtures) }
    })
  }

  mockWithGreenhousePostgresTransaction.mockImplementation(async (callback: (tx: typeof client) => Promise<unknown>) => callback(client))

  return { fixtures, writes, client }
}

describe('checkPeriodReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPublishOutboxEvent.mockResolvedValue('outbox-event-1')
    mockLoadNagerDateHolidayDateSet.mockResolvedValue(new Set<string>())
  })

  it('returns ready when payroll, income, expenses and fx are present', async () => {
    wireDefaultQueryMocks()

    const result = await checkPeriodReadiness({ year: 2026, month: 3 })

    expect(result.periodId).toBe('2026-03')
    expect(result.closureStatus).toBe('ready')
    expect(result.readinessPct).toBe(100)
    expect(result.isReady).toBe(true)
    expect(result.operationalCalendar.timezone).toBe('America/Santiago')
    expect(result.operationalCalendar.countryCode).toBe('CL')
    expect(result.payrollStatus).toBe('exported')
    expect(result.incomeStatus).toBe('complete')
    expect(result.expenseStatus).toBe('complete')
    expect(result.fxStatus).toBe('locked')
  })

  it('marks the period as not ready when payroll is approved but not exported', async () => {
    wireDefaultQueryMocks({
      payroll: { status: 'approved' }
    })

    const result = await checkPeriodReadiness({ year: 2026, month: 3 })

    expect(result.closureStatus).toBe('open')
    expect(result.isReady).toBe(false)
    expect(result.readinessPct).toBe(75)
    expect(result.payrollStatus).toBe('approved')
    expect(result.payrollClosed).toBe(false)
  })

  it('marks missing finance inputs as pending when income and fx are absent', async () => {
    wireDefaultQueryMocks({
      incomeCount: 0,
      fxCount: 0
    })

    const result = await checkPeriodReadiness({ year: 2026, month: 3 })

    expect(result.incomeStatus).toBe('pending')
    expect(result.fxStatus).toBe('pending')
    expect(result.readinessPct).toBe(50)
    expect(result.isReady).toBe(false)
  })
})

describe('period closure mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPublishOutboxEvent.mockResolvedValue('outbox-event-1')
    mockLoadNagerDateHolidayDateSet.mockResolvedValue(new Set<string>())
  })

  it('closes a ready period and publishes accounting.period_closed', async () => {
    const { writes } = wireTransaction({
      existing: {
        closure_status: 'ready',
        snapshot_revision: 1
      }
    })

    const result = await closePeriod({
      year: 2026,
      month: 3,
      actor: 'user-1'
    })

    expect(result.closedNow).toBe(true)
    expect(result.period.closureStatus).toBe('closed')
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: EVENT_TYPES.accountingPeriodClosed
      }),
      expect.any(Object)
    )
    expect(writes.some(entry => entry.sql.includes('INSERT INTO greenhouse_cost_intelligence.period_closures'))).toBe(true)
    expect(writes.some(entry => entry.sql.includes('INSERT INTO greenhouse_serving.period_closure_status'))).toBe(true)
  })

  it('reopens a closed period, increments revision and publishes accounting.period_reopened', async () => {
    wireTransaction({
      existing: {
        closure_status: 'closed',
        snapshot_revision: 3,
        closed_at: '2026-03-31T23:00:00.000Z',
        closed_by: 'user-1'
      }
    })

    const result = await reopenPeriod({
      year: 2026,
      month: 3,
      actor: 'admin-1',
      reason: 'Need to adjust FX'
    })

    expect(result.reopenedNow).toBe(true)
    expect(result.period.closureStatus).toBe('reopened')
    expect(result.period.snapshotRevision).toBe(4)
    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: EVENT_TYPES.accountingPeriodReopened
      }),
      expect.any(Object)
    )
  })
})
