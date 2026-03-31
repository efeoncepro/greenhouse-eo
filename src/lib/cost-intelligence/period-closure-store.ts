import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { FinanceValidationError } from '@/lib/finance/shared'

type QueryableClient = Pick<PoolClient, 'query'>

export type PeriodClosureConfig = {
  configId: string
  requirePayrollExported: boolean
  requireIncomeRecorded: boolean
  requireExpensesRecorded: boolean
  requireBankReconciled: boolean
  requireFxLocked: boolean
  marginAlertThresholdPct: number
}

export type PayrollClosureStatus = 'pending' | 'calculated' | 'approved' | 'exported'
export type DataClosureStatus = 'pending' | 'partial' | 'complete'
export type FxClosureStatus = 'pending' | 'locked'
export type ClosureStatus = 'open' | 'ready' | 'closed' | 'reopened'

export type PeriodReadinessResult = {
  periodYear: number
  periodMonth: number
  periodId: string
  config: PeriodClosureConfig
  payrollStatus: PayrollClosureStatus
  incomeStatus: DataClosureStatus
  expenseStatus: DataClosureStatus
  reconciliationStatus: 'not_required'
  fxStatus: FxClosureStatus
  payrollClosed: boolean
  incomeClosed: boolean
  expensesClosed: boolean
  reconciliationClosed: boolean
  fxLocked: boolean
  readinessPct: number
  isReady: boolean
  counts: {
    incomeRecords: number
    expenseRecords: number
    fxRates: number
  }
}

export type PeriodClosureSnapshot = PeriodReadinessResult & {
  closureStatus: ClosureStatus
  snapshotRevision: number
  closedAt: string | null
  closedBy: string | null
  reopenedAt: string | null
  reopenedBy: string | null
  reopenedReason: string | null
  materializedAt: string | null
}

type PeriodClosureRow = {
  period_year: number
  period_month: number
  closure_status: ClosureStatus
  payroll_status: PayrollClosureStatus
  income_status: DataClosureStatus
  expense_status: DataClosureStatus
  reconciliation_status: 'pending' | 'partial' | 'complete' | 'not_required'
  fx_status: FxClosureStatus
  readiness_pct: number
  closed_at: string | Date | null
  closed_by: string | null
  reopened_at: string | Date | null
  reopened_by: string | null
  reopened_reason: string | null
  snapshot_revision: number
  updated_at: string | Date | null
}

const DEFAULT_PERIOD_LIMIT = 12

const pad2 = (value: number) => String(value).padStart(2, '0')

const buildPeriodId = (year: number, month: number) => `${year}-${pad2(month)}`

const assertValidPeriod = (year: number, month: number) => {
  if (!Number.isInteger(year) || year < 2024) {
    throw new FinanceValidationError('periodYear must be a valid year.', 400)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new FinanceValidationError('periodMonth must be between 1 and 12.', 400)
  }
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const getPeriodBounds = (year: number, month: number) => {
  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const periodEnd = new Date(Date.UTC(year, month, 0))

  return {
    periodStart: toIsoDate(periodStart),
    periodEnd: toIsoDate(periodEnd)
  }
}

const getTrailingPeriods = (limit = DEFAULT_PERIOD_LIMIT) => {
  const now = new Date()
  const periods: Array<{ year: number; month: number }> = []

  for (let index = 0; index < limit; index += 1) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - index, 1))

    periods.push({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1
    })
  }

  return periods
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toTimestamp = (value: string | Date | null) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  return value
}

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: QueryableClient) => {
  if (client) {
    const result = await client.query(text, values)

    return (result as { rows: T[] }).rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const getPeriodClosureConfig = async (year: number, month: number, client?: QueryableClient): Promise<PeriodClosureConfig> => {
  const rows = await queryRows<{
    config_id: string
    require_payroll_exported: boolean
    require_income_recorded: boolean
    require_expenses_recorded: boolean
    require_bank_reconciled: boolean
    require_fx_locked: boolean
    margin_alert_threshold_pct: string | number
  }>(
    `SELECT
       config_id,
       require_payroll_exported,
       require_income_recorded,
       require_expenses_recorded,
       require_bank_reconciled,
       require_fx_locked,
       margin_alert_threshold_pct
     FROM greenhouse_cost_intelligence.period_closure_config
     WHERE config_id IN ($1, 'default')
     ORDER BY CASE WHEN config_id = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [buildPeriodId(year, month)],
    client
  )

  const row = rows[0]

  return {
    configId: row?.config_id || 'default',
    requirePayrollExported: row?.require_payroll_exported ?? true,
    requireIncomeRecorded: row?.require_income_recorded ?? true,
    requireExpensesRecorded: row?.require_expenses_recorded ?? true,
    requireBankReconciled: row?.require_bank_reconciled ?? false,
    requireFxLocked: row?.require_fx_locked ?? true,
    marginAlertThresholdPct: toNumber(row?.margin_alert_threshold_pct ?? 15)
  }
}

const getExistingPeriodClosure = async (year: number, month: number, client?: QueryableClient) => {
  const rows = await queryRows<PeriodClosureRow>(
    `SELECT
       period_year,
       period_month,
       closure_status,
       payroll_status,
       income_status,
       expense_status,
       reconciliation_status,
       fx_status,
       readiness_pct,
       closed_at,
       closed_by,
       reopened_at,
       reopened_by,
       reopened_reason,
       snapshot_revision,
       updated_at
     FROM greenhouse_cost_intelligence.period_closures
     WHERE period_year = $1 AND period_month = $2
     LIMIT 1`,
    [year, month],
    client
  )

  return rows[0] ?? null
}

export const checkPeriodReadiness = async (
  year: number,
  month: number,
  client?: QueryableClient
): Promise<PeriodReadinessResult> => {
  assertValidPeriod(year, month)

  const config = await getPeriodClosureConfig(year, month, client)
  const { periodStart, periodEnd } = getPeriodBounds(year, month)

  const [payrollRows, incomeRows, expenseRows, fxRows] = await Promise.all([
    queryRows<{ status: string }>(
      `SELECT status
       FROM greenhouse_payroll.payroll_periods
       WHERE year = $1 AND month = $2
       ORDER BY
         CASE status
           WHEN 'exported' THEN 4
           WHEN 'approved' THEN 3
           WHEN 'calculated' THEN 2
           ELSE 1
         END DESC
       LIMIT 1`,
      [year, month],
      client
    ),
    queryRows<{ count: string | number }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income
       WHERE invoice_date >= $1::date AND invoice_date <= $2::date`,
      [periodStart, periodEnd],
      client
    ),
    queryRows<{ count: string | number }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.expenses
       WHERE COALESCE(document_date, payment_date) >= $1::date
         AND COALESCE(document_date, payment_date) <= $2::date`,
      [periodStart, periodEnd],
      client
    ),
    queryRows<{ count: string | number }>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.exchange_rates
       WHERE from_currency = 'USD'
         AND to_currency = 'CLP'
         AND rate_date >= $1::date
         AND rate_date <= $2::date`,
      [periodStart, periodEnd],
      client
    )
  ])

  const payrollStatus = (payrollRows[0]?.status ?? 'pending') as PayrollClosureStatus
  const incomeRecords = toNumber(incomeRows[0]?.count ?? 0)
  const expenseRecords = toNumber(expenseRows[0]?.count ?? 0)
  const fxRates = toNumber(fxRows[0]?.count ?? 0)

  const incomeStatus: DataClosureStatus = incomeRecords > 0 ? 'complete' : 'pending'
  const expenseStatus: DataClosureStatus = expenseRecords > 0 ? 'complete' : 'pending'
  const fxStatus: FxClosureStatus = fxRates > 0 ? 'locked' : 'pending'

  const payrollClosed = config.requirePayrollExported
    ? payrollStatus === 'exported'
    : payrollStatus === 'approved' || payrollStatus === 'exported'

  const incomeClosed = config.requireIncomeRecorded ? incomeStatus === 'complete' : true
  const expensesClosed = config.requireExpensesRecorded ? expenseStatus === 'complete' : true
  const reconciliationClosed = config.requireBankReconciled ? false : true
  const fxLocked = config.requireFxLocked ? fxStatus === 'locked' : true

  const checks = [
    payrollClosed,
    incomeClosed,
    expensesClosed,
    reconciliationClosed,
    fxLocked
  ]

  const readinessPct = Math.round((checks.filter(Boolean).length / checks.length) * 100)

  return {
    periodYear: year,
    periodMonth: month,
    periodId: buildPeriodId(year, month),
    config,
    payrollStatus,
    incomeStatus,
    expenseStatus,
    reconciliationStatus: 'not_required',
    fxStatus,
    payrollClosed,
    incomeClosed,
    expensesClosed,
    reconciliationClosed,
    fxLocked,
    readinessPct,
    isReady: checks.every(Boolean),
    counts: {
      incomeRecords,
      expenseRecords,
      fxRates
    }
  }
}

export const refreshPeriodClosureStatus = async ({
  year,
  month,
  client
}: {
  year: number
  month: number
  client?: QueryableClient
}): Promise<PeriodClosureSnapshot> => {
  const readiness = await checkPeriodReadiness(year, month, client)
  const existing = await getExistingPeriodClosure(year, month, client)
  const snapshotRevision = existing?.snapshot_revision ?? 1

  const closureStatus: ClosureStatus =
    existing?.closure_status === 'closed'
      ? 'closed'
      : existing?.closure_status === 'reopened'
        ? 'reopened'
        : readiness.isReady
          ? 'ready'
          : 'open'

  await queryRows(
    `INSERT INTO greenhouse_cost_intelligence.period_closures (
       period_year,
       period_month,
       closure_status,
       payroll_status,
       income_status,
       expense_status,
       reconciliation_status,
       fx_status,
       readiness_pct,
       closed_at,
       closed_by,
       reopened_at,
       reopened_by,
       reopened_reason,
       snapshot_revision,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
     )
     ON CONFLICT (period_year, period_month) DO UPDATE SET
       closure_status = EXCLUDED.closure_status,
       payroll_status = EXCLUDED.payroll_status,
       income_status = EXCLUDED.income_status,
       expense_status = EXCLUDED.expense_status,
       reconciliation_status = EXCLUDED.reconciliation_status,
       fx_status = EXCLUDED.fx_status,
       readiness_pct = EXCLUDED.readiness_pct,
       closed_at = EXCLUDED.closed_at,
       closed_by = EXCLUDED.closed_by,
       reopened_at = EXCLUDED.reopened_at,
       reopened_by = EXCLUDED.reopened_by,
       reopened_reason = EXCLUDED.reopened_reason,
       snapshot_revision = EXCLUDED.snapshot_revision,
       updated_at = CURRENT_TIMESTAMP`,
    [
      year,
      month,
      closureStatus,
      readiness.payrollStatus,
      readiness.incomeStatus,
      readiness.expenseStatus,
      readiness.reconciliationStatus,
      readiness.fxStatus,
      readiness.readinessPct,
      existing?.closed_at ?? null,
      existing?.closed_by ?? null,
      existing?.reopened_at ?? null,
      existing?.reopened_by ?? null,
      existing?.reopened_reason ?? null,
      snapshotRevision
    ],
    client
  )

  await queryRows(
    `INSERT INTO greenhouse_serving.period_closure_status (
       period_year,
       period_month,
       closure_status,
       payroll_closed,
       income_closed,
       expenses_closed,
       reconciliation_closed,
       fx_locked,
       readiness_pct,
       snapshot_revision,
       materialized_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
     ON CONFLICT (period_year, period_month) DO UPDATE SET
       closure_status = EXCLUDED.closure_status,
       payroll_closed = EXCLUDED.payroll_closed,
       income_closed = EXCLUDED.income_closed,
       expenses_closed = EXCLUDED.expenses_closed,
       reconciliation_closed = EXCLUDED.reconciliation_closed,
       fx_locked = EXCLUDED.fx_locked,
       readiness_pct = EXCLUDED.readiness_pct,
       snapshot_revision = EXCLUDED.snapshot_revision,
       materialized_at = CURRENT_TIMESTAMP`,
    [
      year,
      month,
      closureStatus,
      readiness.payrollClosed,
      readiness.incomeClosed,
      readiness.expensesClosed,
      readiness.reconciliationClosed,
      readiness.fxLocked,
      readiness.readinessPct,
      snapshotRevision
    ],
    client
  )

  return {
    ...readiness,
    closureStatus,
    snapshotRevision,
    closedAt: toTimestamp(existing?.closed_at ?? null),
    closedBy: existing?.closed_by ?? null,
    reopenedAt: toTimestamp(existing?.reopened_at ?? null),
    reopenedBy: existing?.reopened_by ?? null,
    reopenedReason: existing?.reopened_reason ?? null,
    materializedAt: new Date().toISOString()
  }
}

export const getPeriodClosureStatus = async (year: number, month: number) =>
  refreshPeriodClosureStatus({ year, month })

export const listPeriodClosureStatuses = async (limit = DEFAULT_PERIOD_LIMIT) => {
  const periods = getTrailingPeriods(limit)

  const snapshots = await Promise.all(
    periods.map(period => refreshPeriodClosureStatus(period))
  )

  return snapshots.sort((left, right) =>
    right.periodYear === left.periodYear
      ? right.periodMonth - left.periodMonth
      : right.periodYear - left.periodYear
  )
}

export const closePeriod = async ({
  year,
  month,
  actorUserId,
  actorEmail
}: {
  year: number
  month: number
  actorUserId: string | null
  actorEmail?: string | null
}) =>
  withGreenhousePostgresTransaction(async (client) => {
    const refreshed = await refreshPeriodClosureStatus({ year, month, client })

    if (!refreshed.isReady) {
      throw new FinanceValidationError('El período todavía no cumple las condiciones de cierre.', 409, {
        periodYear: year,
        periodMonth: month,
        readinessPct: refreshed.readinessPct
      })
    }

    if (refreshed.closureStatus === 'closed') {
      return refreshed
    }

    await queryRows(
      `UPDATE greenhouse_cost_intelligence.period_closures
       SET
         closure_status = 'closed',
         closed_at = CURRENT_TIMESTAMP,
         closed_by = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE period_year = $1 AND period_month = $2`,
      [year, month, actorUserId],
      client
    )

    await queryRows(
      `UPDATE greenhouse_serving.period_closure_status
       SET
         closure_status = 'closed',
         materialized_at = CURRENT_TIMESTAMP
       WHERE period_year = $1 AND period_month = $2`,
      [year, month],
      client
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.periodClosure,
        aggregateId: buildPeriodId(year, month),
        eventType: EVENT_TYPES.accountingPeriodClosed,
        payload: {
          periodYear: year,
          periodMonth: month,
          closureStatus: 'closed',
          snapshotRevision: refreshed.snapshotRevision,
          payrollClosed: refreshed.payrollClosed,
          incomeClosed: refreshed.incomeClosed,
          expensesClosed: refreshed.expensesClosed,
          reconciliationClosed: refreshed.reconciliationClosed,
          fxLocked: refreshed.fxLocked,
          closedBy: actorUserId ?? actorEmail ?? 'system'
        }
      },
      client
    )

    return {
      ...refreshed,
      closureStatus: 'closed' as const,
      closedAt: new Date().toISOString(),
      closedBy: actorUserId,
      materializedAt: new Date().toISOString()
    }
  })

export const reopenPeriod = async ({
  year,
  month,
  actorUserId,
  actorEmail,
  reason
}: {
  year: number
  month: number
  actorUserId: string | null
  actorEmail?: string | null
  reason: string
}) =>
  withGreenhousePostgresTransaction(async (client) => {
    const existing = await refreshPeriodClosureStatus({ year, month, client })
    const nextRevision = existing.snapshotRevision + 1

    await queryRows(
      `UPDATE greenhouse_cost_intelligence.period_closures
       SET
         closure_status = 'reopened',
         reopened_at = CURRENT_TIMESTAMP,
         reopened_by = $3,
         reopened_reason = $4,
         snapshot_revision = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE period_year = $1 AND period_month = $2`,
      [year, month, actorUserId, reason, nextRevision],
      client
    )

    await queryRows(
      `UPDATE greenhouse_serving.period_closure_status
       SET
         closure_status = 'reopened',
         snapshot_revision = $3,
         materialized_at = CURRENT_TIMESTAMP
       WHERE period_year = $1 AND period_month = $2`,
      [year, month, nextRevision],
      client
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.periodClosure,
        aggregateId: buildPeriodId(year, month),
        eventType: EVENT_TYPES.accountingPeriodReopened,
        payload: {
          periodYear: year,
          periodMonth: month,
          reopenedBy: actorUserId ?? actorEmail ?? 'system',
          reason,
          newRevision: nextRevision
        }
      },
      client
    )

    return {
      ...existing,
      closureStatus: 'reopened' as const,
      snapshotRevision: nextRevision,
      reopenedAt: new Date().toISOString(),
      reopenedBy: actorUserId,
      reopenedReason: reason,
      materializedAt: new Date().toISOString()
    }
  })

export const getPeriodClosurePeriodFromPayload = (payload: Record<string, unknown>) => {
  const year = typeof payload.periodYear === 'number' ? payload.periodYear : Number(payload.periodYear)
  const month = typeof payload.periodMonth === 'number' ? payload.periodMonth : Number(payload.periodMonth)

  if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
    return { year, month }
  }

  const periodId = typeof payload.periodId === 'string' ? payload.periodId : typeof payload.payrollPeriodId === 'string' ? payload.payrollPeriodId : null

  if (periodId) {
    const match = periodId.match(/^(\d{4})-(\d{2})$/)

    if (match) {
      return { year: Number(match[1]), month: Number(match[2]) }
    }
  }

  const dateValue =
    typeof payload.invoiceDate === 'string'
      ? payload.invoiceDate
      : typeof payload.documentDate === 'string'
        ? payload.documentDate
        : typeof payload.paymentDate === 'string'
          ? payload.paymentDate
          : typeof payload.rateDate === 'string'
            ? payload.rateDate
            : null

  if (dateValue) {
    const match = dateValue.match(/^(\d{4})-(\d{2})-\d{2}/)

    if (match) {
      return { year: Number(match[1]), month: Number(match[2]) }
    }
  }

  return null
}

export const getPeriodClosureScopeFromPayload = (payload: Record<string, unknown>) => {
  const period = getPeriodClosurePeriodFromPayload(payload)

  if (!period) {
    return null
  }

  return {
    entityType: 'finance_period',
    entityId: buildPeriodId(period.year, period.month)
  }
}
