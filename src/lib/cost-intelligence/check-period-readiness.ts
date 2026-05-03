import 'server-only'

import {
  DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE,
  DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
  getLastBusinessDayOfMonth,
  getOperationalPayrollMonth,
  resolveOperationalCalendarContext,
  type OperationalCalendarContextInput
} from '@/lib/calendar/operational-calendar'
import { loadNagerDateHolidayDateSet } from '@/lib/calendar/nager-date-holidays'
import { buildPeriodId, getPeriodRangeFromId } from '@/lib/payroll/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { assertValidPeriodParts, toBoolean, toInteger, toNullableString } from './shared'

type QueryableClient = {
  query: <T extends Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>
}

type PeriodClosureConfigRow = {
  config_id: string
  require_payroll_exported: boolean | string | number | null
  require_income_recorded: boolean | string | number | null
  require_expenses_recorded: boolean | string | number | null
  require_bank_reconciled: boolean | string | number | null
  require_fx_locked: boolean | string | number | null
  margin_alert_threshold_pct: number | string | null
}

type ExistingPeriodClosureRow = {
  closure_status: string | null
  payroll_status: string | null
  income_status: string | null
  expense_status: string | null
  reconciliation_status: string | null
  fx_status: string | null
  readiness_pct: number | string | null
  closed_at: string | null
  closed_by: string | null
  reopened_at: string | null
  reopened_by: string | null
  reopened_reason: string | null
  snapshot_revision: number | string | null
  updated_at: string | null
}

type ExpenseDistributionGateRow = {
  total_expenses: number | string | null
  active_resolutions: number | string | null
  unresolved_resolutions: number | string | null
  shared_pool_contamination: number | string | null
}

export type PeriodClosureLifecycle = 'open' | 'ready' | 'closed' | 'reopened'
export type PayrollClosureStatus = 'pending' | 'calculated' | 'approved' | 'exported'
export type FinanceClosureStatus = 'pending' | 'partial' | 'complete'
export type ReconciliationClosureStatus = 'pending' | 'partial' | 'complete' | 'not_required'
export type FxClosureStatus = 'pending' | 'locked'
export type ExpenseDistributionClosureStatus = 'pending' | 'complete' | 'blocked'

export type PeriodClosureConfig = {
  configId: string
  requirePayrollExported: boolean
  requireIncomeRecorded: boolean
  requireExpensesRecorded: boolean
  requireBankReconciled: boolean
  requireFxLocked: boolean
  marginAlertThresholdPct: number
}

export type PeriodClosureReadiness = {
  periodId: string
  year: number
  month: number
  operationalCalendar: {
    timezone: string
    countryCode: string
    closeWindowBusinessDays: number
    currentOperationalMonthKey: string
    inCurrentCloseWindow: boolean
    lastBusinessDayOfTargetMonth: string
  }
  closureStatus: PeriodClosureLifecycle
  payrollStatus: PayrollClosureStatus
  incomeStatus: FinanceClosureStatus
  expenseStatus: FinanceClosureStatus
  reconciliationStatus: ReconciliationClosureStatus
  fxStatus: FxClosureStatus
  expenseDistributionStatus: ExpenseDistributionClosureStatus
  payrollClosed: boolean
  incomeClosed: boolean
  expensesClosed: boolean
  reconciliationClosed: boolean
  fxLocked: boolean
  expenseDistributionReady: boolean
  readinessPct: number
  isReady: boolean
  snapshotRevision: number
  config: PeriodClosureConfig
  metrics: {
    incomeCount: number
    expenseCount: number
    fxCount: number
    expenseDistributionActiveResolutions: number
    expenseDistributionUnresolved: number
    expenseDistributionSharedPoolContamination: number
  }
  audit: {
    closedAt: string | null
    closedBy: string | null
    reopenedAt: string | null
    reopenedBy: string | null
    reopenedReason: string | null
    updatedAt: string | null
  }
}

const DEFAULT_CONFIG: PeriodClosureConfig = {
  configId: 'default',
  requirePayrollExported: true,
  requireIncomeRecorded: true,
  requireExpensesRecorded: true,
  requireBankReconciled: false,
  requireFxLocked: true,
  marginAlertThresholdPct: 15
}

const operationalCalendarCache = new Map<string, Promise<OperationalCalendarContextInput>>()

const runRows = async <T extends Record<string, unknown>>(query: string, values: unknown[] = [], client?: QueryableClient) => {
  if (client) {
    const result = await client.query<T>(query, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(query, values)
}

const loadOperationalCalendarOptions = async (year: number): Promise<OperationalCalendarContextInput> => {
  const cacheKey = `${year}`

  if (!operationalCalendarCache.has(cacheKey)) {
    operationalCalendarCache.set(
      cacheKey,
      (async () => {
        const baseContext = resolveOperationalCalendarContext()

        try {
          const holidayDates = await loadNagerDateHolidayDateSet(year, baseContext.countryCode)

          return {
            timezone: baseContext.timezone,
            countryCode: baseContext.countryCode,
            holidayCalendarCode: baseContext.holidayCalendarCode,
            holidayDates,
            closeWindowBusinessDays: baseContext.closeWindowBusinessDays
          }
        } catch {
          return {
            timezone: baseContext.timezone || DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
            countryCode: baseContext.countryCode || DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE,
            holidayCalendarCode: baseContext.holidayCalendarCode,
            holidayDates: baseContext.holidayDates,
            closeWindowBusinessDays: baseContext.closeWindowBusinessDays
          }
        }
      })()
    )
  }

  return operationalCalendarCache.get(cacheKey)!
}

const resolveFinanceStatus = ({ count, required }: { count: number; required: boolean }): FinanceClosureStatus => {
  if (!required) return 'complete'

  return count > 0 ? 'complete' : 'pending'
}

const resolvePayrollStatus = (value: unknown): PayrollClosureStatus => {
  const normalized = typeof value === 'string' ? value.trim() : ''

  if (normalized === 'calculated' || normalized === 'approved' || normalized === 'exported') {
    return normalized
  }

  return 'pending'
}

const resolveFxStatus = ({ count, required }: { count: number; required: boolean }): FxClosureStatus => {
  if (!required) return 'locked'

  return count > 0 ? 'locked' : 'pending'
}

const resolveExpenseDistributionStatus = ({
  expenseCount,
  activeResolutions,
  unresolved,
  sharedPoolContamination
}: {
  expenseCount: number
  activeResolutions: number
  unresolved: number
  sharedPoolContamination: number
}): ExpenseDistributionClosureStatus => {
  if (sharedPoolContamination > 0) return 'blocked'
  if (expenseCount === 0) return 'complete'
  if (activeResolutions < expenseCount || unresolved > 0) return 'pending'

  return 'complete'
}

const deriveClosureStatus = ({
  existingStatus,
  isReady
}: {
  existingStatus: string | null
  isReady: boolean
}): PeriodClosureLifecycle => {
  if (existingStatus === 'closed') return 'closed'
  if (existingStatus === 'reopened') return 'reopened'

  return isReady ? 'ready' : 'open'
}

export const getPeriodClosureConfig = async ({
  year,
  month,
  client
}: {
  year: number
  month: number
  client?: QueryableClient
}): Promise<PeriodClosureConfig> => {
  assertValidPeriodParts(year, month)

  const periodId = buildPeriodId(year, month)

  const [row] = await runRows<PeriodClosureConfigRow>(
    `
      SELECT
        config_id,
        require_payroll_exported,
        require_income_recorded,
        require_expenses_recorded,
        require_bank_reconciled,
        require_fx_locked,
        margin_alert_threshold_pct
      FROM greenhouse_cost_intelligence.period_closure_config
      WHERE config_id IN ('default', $1)
      ORDER BY CASE WHEN config_id = $1 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [periodId],
    client
  )

  if (!row) {
    return DEFAULT_CONFIG
  }

  return {
    configId: row.config_id || DEFAULT_CONFIG.configId,
    requirePayrollExported: toBoolean(row.require_payroll_exported, DEFAULT_CONFIG.requirePayrollExported),
    requireIncomeRecorded: toBoolean(row.require_income_recorded, DEFAULT_CONFIG.requireIncomeRecorded),
    requireExpensesRecorded: toBoolean(row.require_expenses_recorded, DEFAULT_CONFIG.requireExpensesRecorded),
    requireBankReconciled: toBoolean(row.require_bank_reconciled, DEFAULT_CONFIG.requireBankReconciled),
    requireFxLocked: toBoolean(row.require_fx_locked, DEFAULT_CONFIG.requireFxLocked),
    marginAlertThresholdPct: Number(row.margin_alert_threshold_pct ?? DEFAULT_CONFIG.marginAlertThresholdPct)
  }
}

export const checkPeriodReadiness = async ({
  year,
  month,
  client
}: {
  year: number
  month: number
  client?: QueryableClient
}): Promise<PeriodClosureReadiness> => {
  assertValidPeriodParts(year, month)

  const periodId = buildPeriodId(year, month)
  const range = getPeriodRangeFromId(periodId)
  const calendarOptions = await loadOperationalCalendarOptions(year)
  const operationalMonth = getOperationalPayrollMonth(new Date(), calendarOptions)
  const lastBusinessDayOfTargetMonth = getLastBusinessDayOfMonth(year, month, calendarOptions)

  const [config, existingRows, payrollRows, incomeRows, expenseRows, fxRows, distributionRows] = await Promise.all([
    getPeriodClosureConfig({ year, month, client }),
    runRows<ExistingPeriodClosureRow>(
      `
        SELECT
          closure_status,
          payroll_status,
          income_status,
          expense_status,
          reconciliation_status,
          fx_status,
          readiness_pct,
          closed_at::text,
          closed_by,
          reopened_at::text,
          reopened_by,
          reopened_reason,
          snapshot_revision,
          updated_at::text
        FROM greenhouse_cost_intelligence.period_closures
        WHERE period_year = $1 AND period_month = $2
        LIMIT 1
      `,
      [year, month],
      client
    ),
    runRows<{ status: string | null }>(
      `
        SELECT status
        FROM greenhouse_payroll.payroll_periods
        WHERE year = $1 AND month = $2
        LIMIT 1
      `,
      [year, month],
      client
    ),
    runRows<{ total: string | number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM greenhouse_finance.income
        WHERE invoice_date >= $1::date
          AND invoice_date <= $2::date
      `,
      [range.periodStart, range.periodEnd],
      client
    ),
    runRows<{ total: string | number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM greenhouse_finance.expenses
        WHERE COALESCE(document_date, payment_date) >= $1::date
          AND COALESCE(document_date, payment_date) <= $2::date
      `,
      [range.periodStart, range.periodEnd],
      client
    ),
    runRows<{ total: string | number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM greenhouse_finance.exchange_rates
        WHERE from_currency = 'USD'
          AND to_currency = 'CLP'
          AND rate_date >= $1::date
          AND rate_date <= $2::date
      `,
      [range.periodStart, range.periodEnd],
      client
    ),
    runRows<ExpenseDistributionGateRow>(
      `
        WITH period_expenses AS (
          SELECT expense_id
          FROM greenhouse_finance.expenses
          WHERE COALESCE(period_year, EXTRACT(YEAR FROM COALESCE(payment_date, document_date, receipt_date))::int) = $1
            AND COALESCE(period_month, EXTRACT(MONTH FROM COALESCE(payment_date, document_date, receipt_date))::int) = $2
            AND COALESCE(is_annulled, FALSE) = FALSE
        ),
        active_resolutions AS (
          SELECT
            expense_id,
            distribution_lane,
            resolution_status,
            economic_category
          FROM greenhouse_finance.expense_distribution_resolution
          WHERE period_year = $1
            AND period_month = $2
            AND superseded_at IS NULL
        )
        SELECT
          (SELECT COUNT(*)::int FROM period_expenses) AS total_expenses,
          (SELECT COUNT(*)::int FROM active_resolutions) AS active_resolutions,
          (
            (SELECT COUNT(*)::int FROM period_expenses pe
             WHERE NOT EXISTS (
               SELECT 1 FROM active_resolutions ar WHERE ar.expense_id = pe.expense_id
             ))
            +
            (SELECT COUNT(*)::int FROM active_resolutions
             WHERE resolution_status IN ('manual_required', 'blocked')
                OR distribution_lane = 'unallocated')
          ) AS unresolved_resolutions,
          (
            SELECT COUNT(*)::int
            FROM active_resolutions
            WHERE distribution_lane = 'shared_operational_overhead'
              AND resolution_status = 'resolved'
              AND COALESCE(economic_category, '') IN (
                'labor_cost_internal',
                'labor_cost_external',
                'regulatory_payment',
                'tax',
                'financial_cost',
                'bank_fee_real',
                'financial_settlement'
              )
          ) AS shared_pool_contamination
      `,
      [year, month],
      client
    )
  ])

  const existing = existingRows[0]
  const payrollStatus = resolvePayrollStatus(payrollRows[0]?.status)
  const incomeCount = Number(incomeRows[0]?.total ?? 0)
  const expenseCount = Number(expenseRows[0]?.total ?? 0)
  const fxCount = Number(fxRows[0]?.total ?? 0)
  const distributionGate = distributionRows[0]
  const expenseDistributionActiveResolutions = Number(distributionGate?.active_resolutions ?? 0)
  const expenseDistributionUnresolved = Number(distributionGate?.unresolved_resolutions ?? 0)
  const expenseDistributionSharedPoolContamination = Number(distributionGate?.shared_pool_contamination ?? 0)

  const incomeStatus = resolveFinanceStatus({ count: incomeCount, required: config.requireIncomeRecorded })
  const expenseStatus = resolveFinanceStatus({ count: expenseCount, required: config.requireExpensesRecorded })
  const reconciliationStatus: ReconciliationClosureStatus = config.requireBankReconciled ? 'pending' : 'not_required'
  const fxStatus = resolveFxStatus({ count: fxCount, required: config.requireFxLocked })

  const expenseDistributionStatus = resolveExpenseDistributionStatus({
    expenseCount,
    activeResolutions: expenseDistributionActiveResolutions,
    unresolved: expenseDistributionUnresolved,
    sharedPoolContamination: expenseDistributionSharedPoolContamination
  })

  const payrollClosed = config.requirePayrollExported
    ? payrollStatus === 'exported'
    : payrollStatus === 'calculated' || payrollStatus === 'approved' || payrollStatus === 'exported'

  const incomeClosed = incomeStatus === 'complete'
  const expensesClosed = expenseStatus === 'complete'
  const reconciliationClosed = reconciliationStatus === 'not_required'
  const fxLocked = fxStatus === 'locked'
  const expenseDistributionReady = expenseDistributionStatus === 'complete'

  const checks = [
    config.requirePayrollExported ? payrollClosed : null,
    config.requireIncomeRecorded ? incomeClosed : null,
    config.requireExpensesRecorded ? expensesClosed : null,
    config.requireExpensesRecorded ? expenseDistributionReady : null,
    config.requireBankReconciled ? reconciliationClosed : null,
    config.requireFxLocked ? fxLocked : null
  ].filter((value): value is boolean => value !== null)

  const readinessPct = checks.length === 0 ? 100 : Math.round((checks.filter(Boolean).length / checks.length) * 100)
  const isReady = checks.every(Boolean)

  const closureStatus = deriveClosureStatus({
    existingStatus: toNullableString(existing?.closure_status),
    isReady
  })

  return {
    periodId,
    year,
    month,
    operationalCalendar: {
      timezone: calendarOptions.timezone ?? DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
      countryCode: calendarOptions.countryCode ?? DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE,
      closeWindowBusinessDays: calendarOptions.closeWindowBusinessDays ?? 5,
      currentOperationalMonthKey: operationalMonth.operationalMonthKey,
      inCurrentCloseWindow: operationalMonth.inCloseWindow,
      lastBusinessDayOfTargetMonth
    },
    closureStatus,
    payrollStatus,
    incomeStatus,
    expenseStatus,
    reconciliationStatus,
    fxStatus,
    expenseDistributionStatus,
    payrollClosed,
    incomeClosed,
    expensesClosed,
    reconciliationClosed,
    fxLocked,
    expenseDistributionReady,
    readinessPct,
    isReady,
    snapshotRevision: toInteger(existing?.snapshot_revision) ?? 1,
    config,
    metrics: {
      incomeCount,
      expenseCount,
      fxCount,
      expenseDistributionActiveResolutions,
      expenseDistributionUnresolved,
      expenseDistributionSharedPoolContamination
    },
    audit: {
      closedAt: toNullableString(existing?.closed_at),
      closedBy: toNullableString(existing?.closed_by),
      reopenedAt: toNullableString(existing?.reopened_at),
      reopenedBy: toNullableString(existing?.reopened_by),
      reopenedReason: toNullableString(existing?.reopened_reason),
      updatedAt: toNullableString(existing?.updated_at)
    }
  }
}

export const materializePeriodClosureStatus = async ({
  year,
  month,
  client,
  override
}: {
  year: number
  month: number
  client?: QueryableClient
  override?: Partial<{
    closureStatus: PeriodClosureLifecycle
    snapshotRevision: number
    closedAt: string | null
    closedBy: string | null
    reopenedAt: string | null
    reopenedBy: string | null
    reopenedReason: string | null
  }>
}) => {
  const readiness = await checkPeriodReadiness({ year, month, client })
  const materializedAt = new Date().toISOString()

  const nextSnapshot = {
    ...readiness,
    closureStatus: override?.closureStatus ?? readiness.closureStatus,
    snapshotRevision: override?.snapshotRevision ?? readiness.snapshotRevision,
    audit: {
      closedAt: override?.closedAt ?? readiness.audit.closedAt,
      closedBy: override?.closedBy ?? readiness.audit.closedBy,
      reopenedAt: override?.reopenedAt ?? readiness.audit.reopenedAt,
      reopenedBy: override?.reopenedBy ?? readiness.audit.reopenedBy,
      reopenedReason: override?.reopenedReason ?? readiness.audit.reopenedReason,
      updatedAt: materializedAt
    }
  }

  await runRows(
    `
      INSERT INTO greenhouse_cost_intelligence.period_closures (
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
        $10::timestamptz, $11, $12::timestamptz, $13, $14, $15, $16::timestamptz
      )
      ON CONFLICT (period_year, period_month)
      DO UPDATE SET
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
        updated_at = EXCLUDED.updated_at
    `,
    [
      year,
      month,
      nextSnapshot.closureStatus,
      nextSnapshot.payrollStatus,
      nextSnapshot.incomeStatus,
      nextSnapshot.expenseStatus,
      nextSnapshot.reconciliationStatus,
      nextSnapshot.fxStatus,
      nextSnapshot.readinessPct,
      nextSnapshot.audit.closedAt,
      nextSnapshot.audit.closedBy,
      nextSnapshot.audit.reopenedAt,
      nextSnapshot.audit.reopenedBy,
      nextSnapshot.audit.reopenedReason,
      nextSnapshot.snapshotRevision,
      nextSnapshot.audit.updatedAt
    ],
    client
  )

  await runRows(
    `
      INSERT INTO greenhouse_serving.period_closure_status (
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz)
      ON CONFLICT (period_year, period_month)
      DO UPDATE SET
        closure_status = EXCLUDED.closure_status,
        payroll_closed = EXCLUDED.payroll_closed,
        income_closed = EXCLUDED.income_closed,
        expenses_closed = EXCLUDED.expenses_closed,
        reconciliation_closed = EXCLUDED.reconciliation_closed,
        fx_locked = EXCLUDED.fx_locked,
        readiness_pct = EXCLUDED.readiness_pct,
        snapshot_revision = EXCLUDED.snapshot_revision,
        materialized_at = EXCLUDED.materialized_at
    `,
    [
      year,
      month,
      nextSnapshot.closureStatus,
      nextSnapshot.payrollClosed,
      nextSnapshot.incomeClosed,
      nextSnapshot.expensesClosed,
      nextSnapshot.reconciliationClosed,
      nextSnapshot.fxLocked,
      nextSnapshot.readinessPct,
      nextSnapshot.snapshotRevision,
      materializedAt
    ],
    client
  )

  return nextSnapshot
}

export const listRecentClosurePeriods = async (limit = 12) => {
  const currentCalendarOptions = await loadOperationalCalendarOptions(new Date().getFullYear())
  const currentOperationalMonth = getOperationalPayrollMonth(new Date(), currentCalendarOptions)

  const rows = await runGreenhousePostgresQuery<{ period_year: number | string; period_month: number | string }>(
    `
      SELECT DISTINCT period_year, period_month
      FROM (
        SELECT period_year, period_month
        FROM greenhouse_cost_intelligence.period_closures
        UNION ALL
        SELECT year AS period_year, month AS period_month
        FROM greenhouse_payroll.payroll_periods
        UNION ALL
        SELECT EXTRACT(YEAR FROM invoice_date)::int AS period_year,
               EXTRACT(MONTH FROM invoice_date)::int AS period_month
        FROM greenhouse_finance.income
        WHERE invoice_date IS NOT NULL
        UNION ALL
        SELECT EXTRACT(YEAR FROM COALESCE(document_date, payment_date))::int AS period_year,
               EXTRACT(MONTH FROM COALESCE(document_date, payment_date))::int AS period_month
        FROM greenhouse_finance.expenses
        WHERE COALESCE(document_date, payment_date) IS NOT NULL
        UNION ALL
        SELECT EXTRACT(YEAR FROM rate_date)::int AS period_year,
               EXTRACT(MONTH FROM rate_date)::int AS period_month
        FROM greenhouse_finance.exchange_rates
        WHERE from_currency = 'USD' AND to_currency = 'CLP'
      ) periods
      WHERE period_year IS NOT NULL
        AND period_month BETWEEN 1 AND 12
      ORDER BY period_year DESC, period_month DESC
      LIMIT $1
    `,
    [limit]
  )

  const periods = rows.map(row => ({
    year: Number(row.period_year),
    month: Number(row.period_month)
  }))

  const operationalExists = periods.some(
    period => period.year === currentOperationalMonth.operationalYear && period.month === currentOperationalMonth.operationalMonth
  )

  if (!operationalExists) {
    periods.unshift({
      year: currentOperationalMonth.operationalYear,
      month: currentOperationalMonth.operationalMonth
    })
  }

  return periods.slice(0, limit)
}

export const getPeriodClosureStatus = async ({ year, month }: { year: number; month: number }) =>
  checkPeriodReadiness({ year, month })

export const listPeriodClosureStatuses = async (limit = 12) => {
  const periods = await listRecentClosurePeriods(limit)

  const details = await Promise.all(periods.map(period => checkPeriodReadiness(period)))

  return details
}
