import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-774 Slice 4 — Reliability signal: account_balances con FX drift.
 *
 * Detecta `account_balances` cuyo `closing_balance` persistido diverge del
 * recompute esperado desde las VIEWs canónicas TASK-766
 * (`expense_payments_normalized`, `income_payments_normalized`) +
 * COALESCE(`settlement_legs.amount_clp`, ...). Cada divergencia indica que
 * el materializer corrió antes del fix TASK-774 (Slice 2) o que un nuevo
 * callsite re-introdujo el anti-patrón `SUM(payment.amount)` sin
 * distinguir currency vs amount_clp.
 *
 * **Cómo funciona el detect**:
 *
 *   Para cada (account_id, balance_date), recompute el delta esperado:
 *     expected_delta = SUM(income_payments_normalized.payment_amount_clp)
 *                    + SUM(settlement_legs CLP-resolved IN)
 *                    - SUM(expense_payments_normalized.payment_amount_clp)
 *                    - SUM(settlement_legs CLP-resolved OUT)
 *
 *   Y compara con el persistido:
 *     persisted_delta = period_inflows - period_outflows
 *
 *   Si abs(expected_delta - persisted_delta) > 1 CLP → fila en drift.
 *
 * **Tolerancia**: > 1 CLP (anti FP-rounding noise). Drift real Figma 2026-05-03
 * fue de $83.680.6 (un orden de magnitud por encima del threshold).
 *
 * **Steady state esperado** = 0 post-deploy + cron rematerialización + backfill.
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0.
 *
 * Pattern reference: TASK-766 Slice 2 (`expense-payments-clp-drift.ts`).
 */
export const ACCOUNT_BALANCES_FX_DRIFT_SIGNAL_ID =
  'finance.account_balances.fx_drift'

const DEFAULT_WINDOW_DAYS = 90
const DEFAULT_TOLERANCE_CLP = 1
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

export type AccountBalancesFxDriftRow = {
  accountId: string
  accountName: string
  currency: string
  balanceDate: string
  isPeriodClosed: boolean
  transactionCount: number
  persistedInflowsClp: string
  persistedOutflowsClp: string
  persistedClosingBalanceClp: string | null
  expectedInflowsClp: string
  expectedOutflowsClp: string
  expectedClosingBalanceClp: string | null
  driftClp: string
  absDriftClp: string
  evidenceRefs: {
    settlementLegs: number
    incomePayments: number
    expensePayments: number
  }
  detectedAt: string
}

export type AccountBalancesFxDriftQueryOptions = {
  windowDays?: number
  toleranceClp?: number
  limit?: number
  accountId?: string
  fromDate?: string
  toDate?: string
}

type AccountBalancesFxDriftSqlRow = {
  account_id: string
  account_name: string
  currency: string
  balance_date: string
  is_period_closed: boolean
  transaction_count: number | null
  persisted_inflows_clp: string
  persisted_outflows_clp: string
  persisted_closing_balance_clp: string | null
  expected_inflows_clp: string
  expected_outflows_clp: string
  expected_closing_balance_clp: string | null
  drift_clp: string
  abs_drift_clp: string
  settlement_leg_count: number | string | null
  income_payment_count: number | string | null
  expense_payment_count: number | string | null
  detected_at: string
}

const clampInteger = (value: number | undefined, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  return Math.min(Math.max(Math.trunc(value), min), max)
}

const normalizeDate = (value: string | undefined) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined

const buildAccountBalancesFxDriftSql = (
  options: AccountBalancesFxDriftQueryOptions = {},
  mode: 'count' | 'rows'
) => {
  const params: Array<string | number> = []
  const filters: string[] = []
  const windowDays = clampInteger(options.windowDays, DEFAULT_WINDOW_DAYS, 1, 365)

  const toleranceClp = Number.isFinite(options.toleranceClp)
    ? Math.max(Number(options.toleranceClp), 0)
    : DEFAULT_TOLERANCE_CLP

  const fromDate = normalizeDate(options.fromDate)
  const toDate = normalizeDate(options.toDate)
  const accountId = options.accountId?.trim()

  if (fromDate) {
    params.push(fromDate)
    filters.push(`ab.balance_date >= $${params.length}::date`)
  } else {
    params.push(windowDays)
    filters.push(`ab.balance_date >= CURRENT_DATE - ($${params.length}::int * INTERVAL '1 day')`)
  }

  if (toDate) {
    params.push(toDate)
    filters.push(`ab.balance_date <= $${params.length}::date`)
  }

  if (accountId) {
    params.push(accountId)
    filters.push(`ab.account_id = $${params.length}`)
  }

  params.push(toleranceClp)
  const toleranceParam = `$${params.length}::numeric`

  const limit = clampInteger(options.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const limitClause = mode === 'rows' ? `LIMIT ${limit}` : ''

  const selectClause =
    mode === 'count'
      ? 'SELECT COUNT(*)::int AS n FROM drift_rows'
      : `SELECT
          account_id,
          account_name,
          currency,
          balance_date::text AS balance_date,
          is_period_closed,
          transaction_count,
          persisted_inflows_clp::text,
          persisted_outflows_clp::text,
          persisted_closing_balance_clp::text,
          expected_inflows_clp::text,
          expected_outflows_clp::text,
          expected_closing_balance_clp::text,
          drift_clp::text,
          abs_drift_clp::text,
          settlement_leg_count,
          income_payment_count,
          expense_payment_count,
          detected_at::text
        FROM drift_rows
        ORDER BY abs_drift_clp DESC, balance_date DESC, account_id ASC
        ${limitClause}`

  const sql = `
  WITH expected_per_day AS (
    SELECT
      ab.account_id,
      a.account_name,
      a.currency,
      ab.balance_date,
      ab.period_inflows,
      ab.period_outflows,
      ab.closing_balance_clp,
      ab.is_period_closed,
      ab.transaction_count,
      COALESCE(SUM(CASE WHEN sl.direction = 'incoming'
        THEN COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)
        ELSE 0 END), 0) AS expected_settlement_in,
      COALESCE(SUM(CASE WHEN sl.direction = 'outgoing'
        THEN COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)
        ELSE 0 END), 0) AS expected_settlement_out,
      COUNT(sl.settlement_leg_id)::int AS settlement_leg_count
    FROM greenhouse_finance.account_balances ab
    INNER JOIN greenhouse_finance.accounts a ON a.account_id = ab.account_id
    LEFT JOIN greenhouse_finance.settlement_legs sl
      ON sl.instrument_id = ab.account_id
      AND sl.transaction_date = ab.balance_date
      AND sl.superseded_at IS NULL
      AND sl.superseded_by_otb_id IS NULL
    WHERE ${filters.join('\n      AND ')}
      -- TASK-774 Slice 7b: solo comparar cuentas CLP nativas. Cuentas USD/EUR
      -- nativas tienen period_inflows/outflows en moneda nativa (NO en CLP)
      -- y compararlas contra payment_amount_clp generaria falsos positivos.
      AND a.currency = 'CLP'
    GROUP BY
      ab.account_id,
      a.account_name,
      a.currency,
      ab.balance_date,
      ab.period_inflows,
      ab.period_outflows,
      ab.closing_balance_clp,
      ab.is_period_closed,
      ab.transaction_count
  ),
  expected_payments AS (
    SELECT
      epd.account_id,
      epd.account_name,
      epd.currency,
      epd.balance_date,
      epd.period_inflows,
      epd.period_outflows,
      epd.closing_balance_clp,
      epd.is_period_closed,
      epd.transaction_count,
      epd.expected_settlement_in,
      epd.expected_settlement_out,
      epd.settlement_leg_count,
      COALESCE((
        SELECT SUM(ipn.payment_amount_clp)
        FROM greenhouse_finance.income_payments_normalized ipn
        WHERE ipn.payment_account_id = epd.account_id
          AND ipn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl2
            WHERE sl2.linked_payment_type = 'income_payment'
              AND sl2.linked_payment_id = ipn.payment_id
              AND sl2.instrument_id = epd.account_id
              AND sl2.superseded_at IS NULL
              AND sl2.superseded_by_otb_id IS NULL
          )
      ), 0) AS expected_payment_in,
      COALESCE((
        SELECT COUNT(*)::int
        FROM greenhouse_finance.income_payments_normalized ipn
        WHERE ipn.payment_account_id = epd.account_id
          AND ipn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl2
            WHERE sl2.linked_payment_type = 'income_payment'
              AND sl2.linked_payment_id = ipn.payment_id
              AND sl2.instrument_id = epd.account_id
              AND sl2.superseded_at IS NULL
              AND sl2.superseded_by_otb_id IS NULL
          )
      ), 0)::int AS income_payment_count,
      COALESCE((
        SELECT SUM(epn.payment_amount_clp)
        FROM greenhouse_finance.expense_payments_normalized epn
        WHERE epn.payment_account_id = epd.account_id
          AND epn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl3
            WHERE sl3.linked_payment_type = 'expense_payment'
              AND sl3.linked_payment_id = epn.payment_id
              AND sl3.instrument_id = epd.account_id
              AND sl3.superseded_at IS NULL
              AND sl3.superseded_by_otb_id IS NULL
          )
      ), 0) AS expected_payment_out,
      COALESCE((
        SELECT COUNT(*)::int
        FROM greenhouse_finance.expense_payments_normalized epn
        WHERE epn.payment_account_id = epd.account_id
          AND epn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl3
            WHERE sl3.linked_payment_type = 'expense_payment'
              AND sl3.linked_payment_id = epn.payment_id
              AND sl3.instrument_id = epd.account_id
              AND sl3.superseded_at IS NULL
              AND sl3.superseded_by_otb_id IS NULL
          )
      ), 0)::int AS expense_payment_count
    FROM expected_per_day epd
  ),
  drift_rows AS (
    SELECT
      ep.account_id,
      ep.account_name,
      ep.currency,
      ep.balance_date,
      ep.is_period_closed,
      ep.transaction_count,
      ep.period_inflows AS persisted_inflows_clp,
      ep.period_outflows AS persisted_outflows_clp,
      ep.closing_balance_clp AS persisted_closing_balance_clp,
      (ep.expected_settlement_in + ep.expected_payment_in) AS expected_inflows_clp,
      (ep.expected_settlement_out + ep.expected_payment_out) AS expected_outflows_clp,
      CASE
        WHEN ep.closing_balance_clp IS NULL THEN NULL
        ELSE ep.closing_balance_clp + (
          (ep.expected_settlement_in + ep.expected_payment_in)
          - (ep.expected_settlement_out + ep.expected_payment_out)
          - (ep.period_inflows - ep.period_outflows)
        )
      END AS expected_closing_balance_clp,
      (
        (ep.expected_settlement_in + ep.expected_payment_in)
        - (ep.expected_settlement_out + ep.expected_payment_out)
        - (ep.period_inflows - ep.period_outflows)
      ) AS drift_clp,
      ABS(
        (ep.expected_settlement_in + ep.expected_payment_in)
        - (ep.expected_settlement_out + ep.expected_payment_out)
        - (ep.period_inflows - ep.period_outflows)
      ) AS abs_drift_clp,
      ep.settlement_leg_count,
      ep.income_payment_count,
      ep.expense_payment_count,
      NOW() AS detected_at
    FROM expected_payments ep
    WHERE ABS(
      (ep.expected_settlement_in + ep.expected_payment_in)
      - (ep.expected_settlement_out + ep.expected_payment_out)
      - (ep.period_inflows - ep.period_outflows)
    ) > ${toleranceParam}
  )
  ${selectClause}
  `

  return { sql, params, windowDays, toleranceClp }
}

const mapFxDriftRow = (row: AccountBalancesFxDriftSqlRow): AccountBalancesFxDriftRow => ({
  accountId: row.account_id,
  accountName: row.account_name,
  currency: row.currency,
  balanceDate: row.balance_date,
  isPeriodClosed: row.is_period_closed,
  transactionCount: Number(row.transaction_count ?? 0),
  persistedInflowsClp: row.persisted_inflows_clp,
  persistedOutflowsClp: row.persisted_outflows_clp,
  persistedClosingBalanceClp: row.persisted_closing_balance_clp,
  expectedInflowsClp: row.expected_inflows_clp,
  expectedOutflowsClp: row.expected_outflows_clp,
  expectedClosingBalanceClp: row.expected_closing_balance_clp,
  driftClp: row.drift_clp,
  absDriftClp: row.abs_drift_clp,
  evidenceRefs: {
    settlementLegs: Number(row.settlement_leg_count ?? 0),
    incomePayments: Number(row.income_payment_count ?? 0),
    expensePayments: Number(row.expense_payment_count ?? 0)
  },
  detectedAt: row.detected_at
})

export const listAccountBalancesFxDriftRows = async (
  options: AccountBalancesFxDriftQueryOptions = {}
): Promise<AccountBalancesFxDriftRow[]> => {
  const { sql, params } = buildAccountBalancesFxDriftSql(options, 'rows')
  const rows = await query<AccountBalancesFxDriftSqlRow>(sql, params)

  return rows.map(mapFxDriftRow)
}

export const countAccountBalancesFxDriftRows = async (
  options: Omit<AccountBalancesFxDriftQueryOptions, 'limit'> = {}
): Promise<number> => {
  const { sql, params } = buildAccountBalancesFxDriftSql(options, 'count')
  const rows = await query<{ n: number }>(sql, params)

  return Number(rows[0]?.n ?? 0)
}

export const getAccountBalancesFxDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countAccountBalancesFxDriftRows()

    return {
      signalId: ACCOUNT_BALANCES_FX_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getAccountBalancesFxDriftSignal',
      label: 'Account balances con FX drift',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin drift FX en account_balances de los ultimos 90 dias.'
          : `${count} account_balance${count === 1 ? '' : 's'} con FX drift detectado en los ultimos 90 dias. Rematerializar con scripts/finance/backfill-account-balances-fx-fix.ts.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'VIEWs canonicas',
          value: 'expense_payments_normalized, income_payments_normalized + COALESCE(sl.amount_clp,...)'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'window_days',
          value: String(DEFAULT_WINDOW_DAYS)
        },
        {
          kind: 'metric',
          label: 'tolerance_clp',
          value: String(DEFAULT_TOLERANCE_CLP)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md + docs/tasks/in-progress/TASK-842-finance-fx-drift-auto-remediation-control-plane.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_account_balances_fx_drift' }
    })

    return {
      signalId: ACCOUNT_BALANCES_FX_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getAccountBalancesFxDriftSignal',
      label: 'Account balances con FX drift',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
