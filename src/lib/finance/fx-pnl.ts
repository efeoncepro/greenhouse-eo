import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

/**
 * # FX P&L breakdown — canonical read API (TASK-699)
 *
 * Treasury "Resultado cambiario" must reconcile **three** legitimate FX P&L
 * mechanisms — and the Banco view's KPI is the *total* of all three:
 *
 *   1. **Realized FX from settlements** — when an invoice or expense is
 *      issued in a non-CLP currency and paid at a different exchange rate
 *      than the one booked at issuance. Source:
 *      `income_payments.fx_gain_loss_clp` + `expense_payments.fx_gain_loss_clp`
 *      (computed in `payment-ledger.ts` and `expense-payment-ledger.ts`),
 *      aggregated daily into `account_balances.fx_gain_loss_realized_clp`.
 *
 *   2. **Translation FX from balance revaluation** — when a held non-CLP
 *      balance is marked-to-market each day. Computed in
 *      `materializeAccountBalance` as
 *        `(closing_balance × rate_today) − previous_closing_balance_clp
 *         − (period_inflows − period_outflows) × rate_today`.
 *      Persisted in `account_balances.fx_gain_loss_translation_clp`.
 *
 *   3. **Realized FX from internal transfers** — placeholder. Today the
 *      Banco "Transferencia interna" button creates movements but does
 *      not persist rate-spread vs market. Returns 0 until a follow-up
 *      task introduces `internal_transfers` with rate tracking.
 *
 * The canonical equation (per period):
 *
 *   total_clp = realized_clp + translation_clp + internal_transfer_clp
 *
 * ⚠️ FOR AGENTS / FUTURE DEVS:
 *
 * - **Never** sum FX P&L from raw `income_payments`/`expense_payments` in a
 *   new query. Every consumer (UI, API, Reliability signal, P&L engine)
 *   reads through this helper or directly from VIEW
 *   `greenhouse_finance.fx_pnl_breakdown`.
 * - **Never** branch the equation in a consumer. When a NEW mechanism
 *   appears (credit notes denominated in foreign currency, forward
 *   contracts, etc.) extend BOTH the VIEW (migration with
 *   `CREATE OR REPLACE VIEW`) AND this helper. Otherwise dashboards drift.
 * - The card "Resultado cambiario" must distinguish three states: no FX
 *   exposure, healthy total + breakdown tooltip, degraded (rate fetch
 *   failed). Use `hasExposure` and `isDegraded` to drive the UI — do not
 *   render `$0` as a silent zero when `hasExposure === false`.
 *
 * Pattern reference: `income_settlement_reconciliation` (TASK-571) →
 * `src/lib/finance/income-settlement.ts`. Same shape, different domain.
 */

import { FinanceValidationError } from '@/lib/finance/shared'

export interface FxPnlSourceBreakdown {
  realizedClp: number
  translationClp: number
  internalTransferClp: number
  totalClp: number
}

export interface FxPnlAccountBreakdown extends FxPnlSourceBreakdown {
  accountId: string
  currency: string
  /** True when this account is non-CLP (i.e. carries FX exposure). */
  hasExposure: boolean
  /** True when the latest day in the window for this account has no closing_balance_clp despite being non-CLP. */
  isDegraded: boolean
}

export interface BankFxPnlBreakdown extends FxPnlSourceBreakdown {
  /** True when at least one active account during the window is non-CLP. */
  hasExposure: boolean
  /** True when at least one non-CLP account could not resolve a rate during the window. */
  isDegraded: boolean
  byAccount: FxPnlAccountBreakdown[]
}

interface BreakdownRow {
  account_id: string
  currency: string
  realized_clp: string | number
  translation_clp: string | number
  internal_transfer_clp: string | number
  total_clp: string | number
  is_active: boolean
  rate_missing_days: string | number
  has_balance_in_window: boolean
}

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0

  const n = typeof value === 'string' ? Number(value) : value

  return Number.isFinite(n) ? n : 0
}

const round = (value: number) => Math.round(value * 100) / 100

const startOfMonth = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}-01`

const endOfMonth = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 0))

  return date.toISOString().slice(0, 10)
}

const validatePeriod = (year: number, month: number) => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new FinanceValidationError(
      'year/month must describe a valid accounting period.'
    )
  }
}

/**
 * Read the canonical FX P&L breakdown for the Banco view of a given period.
 *
 * - Aggregates from VIEW `greenhouse_finance.fx_pnl_breakdown` joined with
 *   `accounts` so we know currency + active flag.
 * - Computes `hasExposure` (any active non-CLP account in the window) and
 *   `isDegraded` (any non-CLP account-day with `fx_rate_used IS NULL` or
 *   `closing_balance_clp IS NULL`, which means the rate fetch failed at
 *   materialization time and we degraded honestly).
 * - When `accountId` is provided, scopes the breakdown to a single account
 *   while still computing the period-wide flags from the same window.
 */
export const getBankFxPnlBreakdown = async (options: {
  year: number
  month: number
  accountId?: string
}): Promise<BankFxPnlBreakdown> => {
  const { year, month, accountId } = options

  validatePeriod(year, month)

  const periodStart = startOfMonth(year, month)
  const periodEnd = endOfMonth(year, month)
  const db = await getDb()

  const rows = (
    await sql<BreakdownRow>`
      WITH window_rows AS (
        SELECT
          fx.account_id,
          fx.balance_date,
          fx.currency,
          fx.realized_clp,
          fx.translation_clp,
          fx.internal_transfer_clp,
          fx.total_clp,
          ab.fx_rate_used,
          ab.closing_balance_clp
        FROM greenhouse_finance.fx_pnl_breakdown fx
        JOIN greenhouse_finance.account_balances ab
          ON ab.account_id = fx.account_id
         AND ab.balance_date = fx.balance_date
        WHERE fx.balance_date BETWEEN ${periodStart}::date AND ${periodEnd}::date
      ),
      account_summary AS (
        SELECT
          account_id,
          SUM(realized_clp)::text          AS realized_clp,
          SUM(translation_clp)::text       AS translation_clp,
          SUM(internal_transfer_clp)::text AS internal_transfer_clp,
          SUM(total_clp)::text             AS total_clp,
          COUNT(*) FILTER (
            WHERE currency <> 'CLP'
              AND (fx_rate_used IS NULL OR closing_balance_clp IS NULL)
          )::text AS rate_missing_days,
          BOOL_OR(TRUE) AS has_balance_in_window
        FROM window_rows
        GROUP BY account_id
      )
      SELECT
        a.account_id,
        a.currency,
        COALESCE(s.realized_clp, '0')          AS realized_clp,
        COALESCE(s.translation_clp, '0')       AS translation_clp,
        COALESCE(s.internal_transfer_clp, '0') AS internal_transfer_clp,
        COALESCE(s.total_clp, '0')             AS total_clp,
        a.is_active,
        COALESCE(s.rate_missing_days, '0')     AS rate_missing_days,
        COALESCE(s.has_balance_in_window, FALSE) AS has_balance_in_window
      FROM greenhouse_finance.accounts a
      LEFT JOIN account_summary s ON s.account_id = a.account_id
      WHERE a.is_active = TRUE
        ${accountId ? sql`AND a.account_id = ${accountId}` : sql``}
    `.execute(db)
  ).rows

  const byAccount: FxPnlAccountBreakdown[] = rows.map(row => {
    const currency = row.currency || 'CLP'
    const isNonClp = currency !== 'CLP'
    const rateMissingDays = toNumber(row.rate_missing_days)

    return {
      accountId: row.account_id,
      currency,
      realizedClp: round(toNumber(row.realized_clp)),
      translationClp: round(toNumber(row.translation_clp)),
      internalTransferClp: round(toNumber(row.internal_transfer_clp)),
      totalClp: round(toNumber(row.total_clp)),
      hasExposure: Boolean(row.is_active) && isNonClp,
      isDegraded: isNonClp && Boolean(row.has_balance_in_window) && rateMissingDays > 0
    }
  })

  const totals = byAccount.reduce(
    (acc, account) => {
      acc.realizedClp += account.realizedClp
      acc.translationClp += account.translationClp
      acc.internalTransferClp += account.internalTransferClp
      acc.totalClp += account.totalClp

      return acc
    },
    { realizedClp: 0, translationClp: 0, internalTransferClp: 0, totalClp: 0 }
  )

  return {
    realizedClp: round(totals.realizedClp),
    translationClp: round(totals.translationClp),
    internalTransferClp: round(totals.internalTransferClp),
    totalClp: round(totals.totalClp),
    hasExposure: byAccount.some(account => account.hasExposure),
    isDegraded: byAccount.some(account => account.isDegraded),
    byAccount
  }
}
