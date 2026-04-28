import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import {
  ensureSettlementForExpensePayment,
  ensureSettlementForIncomePayment
} from '@/lib/finance/settlement-orchestration'
import {
  FinanceValidationError,
  assertDateString,
  normalizeString,
  resolveExchangeRateToClp,
  roundCurrency,
  toDateString,
  toNumber,
  type FinanceCurrency
} from '@/lib/finance/shared'
import { getBankFxPnlBreakdown } from '@/lib/finance/fx-pnl'
import { getActiveOpeningTrialBalance } from '@/lib/finance/account-opening-trial-balance'
import { getOpenDriftSummariesForAccounts } from '@/lib/finance/reconciliation/snapshots'
import { captureWithDomain } from '@/lib/observability/capture'

type QueryableClient = Pick<PoolClient, 'query'>

type AccountBalanceRow = {
  balance_id: string
  account_id: string
  balance_date: string | Date
  currency: string
  opening_balance: unknown
  period_inflows: unknown
  period_outflows: unknown
  closing_balance: unknown
  closing_balance_clp: unknown
  fx_rate_used: unknown
  fx_gain_loss_clp: unknown
  fx_gain_loss_realized_clp: unknown
  fx_gain_loss_translation_clp: unknown
  transaction_count: unknown
  last_transaction_at: string | Date | null
  computed_at: string | Date
  is_period_closed: boolean
  closed_by_user_id: string | null
  closed_at: string | Date | null
}

type AccountRow = {
  account_id: string
  account_name: string
  bank_name: string | null
  currency: string
  instrument_category: string | null
  provider_slug: string | null
  account_type: string
  credit_limit: unknown
  opening_balance: unknown
  opening_balance_date: string | Date | null
  is_active: boolean
  metadata_json: unknown
}

type DailyMovementRow = {
  inflows: unknown
  outflows: unknown
  transaction_count: unknown
  last_transaction_at: string | Date | null
}

type DailyFxRow = {
  fx_gain_loss_clp: unknown
}

type AccountOverviewRow = {
  account_id: string
  account_name: string
  bank_name: string | null
  currency: string
  instrument_category: string | null
  provider_slug: string | null
  account_type: string
  credit_limit: unknown
  metadata_json: unknown
  opening_balance: unknown
  period_inflows: unknown
  period_outflows: unknown
  closing_balance: unknown
  closing_balance_clp: unknown
  fx_rate_used: unknown
  fx_gain_loss_clp: unknown
  fx_gain_loss_realized_clp: unknown
  fx_gain_loss_translation_clp: unknown
  transaction_count: unknown
  last_transaction_at: string | Date | null
  is_period_closed: boolean
  discrepancy: unknown
  reconciliation_status: string | null
  reconciliation_period_id: string | null
}

type AccountDetailMovementRow = {
  movement_id: string
  movement_source: string
  movement_type: string
  direction: string
  instrument_id: string | null
  counterparty_instrument_id: string | null
  payment_type: string | null
  payment_id: string | null
  transaction_date: string | Date | null
  amount: unknown
  currency: string
  amount_clp: unknown
  fx_rate: unknown
  provider_reference: string | null
  provider_status: string | null
  is_reconciled: boolean | null
}

type MonthlyHistoryRow = {
  balance_month: string | Date
  closing_balance: unknown
  closing_balance_clp: unknown
  period_inflows: unknown
  period_outflows: unknown
  fx_gain_loss_clp: unknown
}

type UnassignedPaymentRow = {
  payment_type: 'income' | 'expense'
  payment_id: string
  payment_date: string | Date | null
  amount: unknown
  amount_clp: unknown
  currency: string | null
  reference: string | null
  payment_method: string | null
  counterparty_name: string | null
  document_id: string | null
  document_label: string | null
}

export type AccountBalanceRecord = {
  balanceId: string
  accountId: string
  balanceDate: string
  currency: string
  openingBalance: number
  periodInflows: number
  periodOutflows: number
  closingBalance: number
  closingBalanceClp: number | null
  fxRateUsed: number | null
  /** Total FX P&L = realized + translation. Backward-compat alias. */
  fxGainLossClp: number
  /** Realized FX from settlements (rate doc vs rate pago). */
  fxGainLossRealizedClp: number
  /** Translation FX from mark-to-market revaluation of non-CLP closing. */
  fxGainLossTranslationClp: number
  transactionCount: number
  lastTransactionAt: string | null
  computedAt: string | null
  isPeriodClosed: boolean
  closedByUserId: string | null
  closedAt: string | null
}

export type TreasuryCoverage = {
  assignedCount: number
  totalCount: number
  coveragePct: number
  unassignedCount: number
}

export type ReconciliationDriftSummaryView = {
  hasOpenDrift: boolean
  driftAmount: number
  driftStatus: 'open' | 'accepted' | 'reconciled' | null
  driftAgeMinutes: number | null
  bankClosingBalance: number | null
  bankAvailableBalance: number | null
  bankHoldsAmount: number | null
  bankCreditLimit: number | null
  pgClosingBalance: number | null
  snapshotId: string | null
  snapshotAt: string | null
  sourceKind: string | null
  sourceEvidenceRef: string | null
  driftExplanation: string | null
}

export type TreasuryBankAccountOverview = {
  accountId: string
  accountName: string
  bankName: string | null
  currency: string
  instrumentCategory: string | null
  providerSlug: string | null
  accountType: string
  openingBalance: number
  periodInflows: number
  periodOutflows: number
  closingBalance: number
  closingBalanceClp: number | null
  fxRateUsed: number | null
  /** Total FX P&L = realized + translation. Backward-compat alias. */
  fxGainLossClp: number
  fxGainLossRealizedClp: number
  fxGainLossTranslationClp: number
  transactionCount: number
  lastTransactionAt: string | null
  isPeriodClosed: boolean
  discrepancy: number
  reconciliationStatus: string | null
  reconciliationPeriodId: string | null
  creditLimit: number | null
  metadata: Record<string, unknown> | null
  /** TASK-704: drift bank vs PG. null si nunca se declaró un snapshot. */
  drift: ReconciliationDriftSummaryView | null
}

export type TreasuryFxBreakdown = {
  /** Total FX P&L in CLP for the period. Backward-compat alias of bank `fxGainLossClp`. */
  totalClp: number
  /** Realized FX from settlements (rate doc vs rate pago). */
  realizedClp: number
  /** Translation FX from mark-to-market revaluation of non-CLP closing balances. */
  translationClp: number
  /** Realized FX from cross-currency internal transfers. Placeholder = 0 until follow-up task. */
  internalTransferClp: number
  /** True when at least one active account is non-CLP. */
  hasExposure: boolean
  /** True when materialization could not resolve a rate for a non-CLP account in the period. */
  isDegraded: boolean
}

export type TreasuryBankOverview = {
  period: {
    year: number
    month: number
    startDate: string
    endDate: string
    isCurrentPeriod: boolean
  }
  kpis: {
    totalClp: number
    totalUsd: number
    consolidatedClp: number
    activeAccounts: number
    /** Backward-compat: equals fxGainLoss.totalClp. */
    fxGainLossClp: number
    /** Canonical FX breakdown — sourced from VIEW greenhouse_finance.fx_pnl_breakdown via src/lib/finance/fx-pnl.ts. */
    fxGainLoss: TreasuryFxBreakdown
    coverage: TreasuryCoverage
  }
  accounts: TreasuryBankAccountOverview[]
  creditCards: Array<{
    accountId: string
    accountName: string
    providerSlug: string | null
    currency: string
    creditLimit: number | null
    consumed: number
    available: number | null
  }>
  unassignedPayments: TreasuryUnassignedPayment[]
}

export type TreasuryUnassignedPayment = {
  paymentType: 'income' | 'expense'
  paymentId: string
  paymentDate: string | null
  amount: number
  amountClp: number | null
  currency: string | null
  reference: string | null
  paymentMethod: string | null
  counterpartyName: string | null
  documentId: string | null
  documentLabel: string | null
}

export type TreasuryBankAccountDetail = {
  account: TreasuryBankAccountOverview
  currentBalance: AccountBalanceRecord
  history: Array<{
    month: string
    closingBalance: number
    closingBalanceClp: number | null
    periodInflows: number
    periodOutflows: number
    fxGainLossClp: number
  }>
  movements: Array<{
    movementId: string
    movementSource: string
    movementType: string
    direction: string
    instrumentId: string | null
    counterpartyInstrumentId: string | null
    paymentType: string | null
    paymentId: string | null
    transactionDate: string | null
    amount: number
    currency: string
    amountClp: number | null
    fxRate: number | null
    providerReference: string | null
    providerStatus: string | null
    isReconciled: boolean
  }>
}

export type TreasuryPaymentAssignment = {
  paymentType: 'income' | 'expense'
  paymentId: string
}

type MaterializeAccountBalanceInput = {
  accountId: string
  balanceDate: string
  actorUserId?: string | null
  client?: QueryableClient
  force?: boolean
}

const queryRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return query<T>(text, values)
}

const startOfMonth = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}-01`

const endOfMonth = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 0))

  return date.toISOString().slice(0, 10)
}

const subtractMonths = (date: string, months: number) => {
  const base = new Date(`${date}T00:00:00Z`)

  base.setUTCMonth(base.getUTCMonth() - months)
  base.setUTCDate(1)

  return base.toISOString().slice(0, 10)
}

const addDays = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00Z`)

  next.setUTCDate(next.getUTCDate() + days)

  return next.toISOString().slice(0, 10)
}

const minDate = (...values: Array<string | null | undefined>) => {
  const filtered = values.filter((value): value is string => Boolean(value)).sort()

  return filtered[0] || null
}

const maxDate = (...values: Array<string | null | undefined>) => {
  const filtered = values.filter((value): value is string => Boolean(value)).sort()

  return filtered.at(-1) || null
}

const buildBalanceId = (accountId: string, balanceDate: string) => `acctbal-${accountId}-${balanceDate}`

const parseMetadata = (value: unknown) => {
  if (!value) return null

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>

      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return null
}

const mapAccountBalanceRow = (row: AccountBalanceRow): AccountBalanceRecord => ({
  balanceId: normalizeString(row.balance_id),
  accountId: normalizeString(row.account_id),
  balanceDate: toDateString(row.balance_date) || '',
  currency: normalizeString(row.currency),
  openingBalance: roundCurrency(toNumber(row.opening_balance)),
  periodInflows: roundCurrency(toNumber(row.period_inflows)),
  periodOutflows: roundCurrency(toNumber(row.period_outflows)),
  closingBalance: roundCurrency(toNumber(row.closing_balance)),
  closingBalanceClp: row.closing_balance_clp != null ? roundCurrency(toNumber(row.closing_balance_clp)) : null,
  fxRateUsed: row.fx_rate_used != null ? toNumber(row.fx_rate_used) : null,
  fxGainLossClp: roundCurrency(toNumber(row.fx_gain_loss_clp)),
  fxGainLossRealizedClp: roundCurrency(toNumber(row.fx_gain_loss_realized_clp)),
  fxGainLossTranslationClp: roundCurrency(toNumber(row.fx_gain_loss_translation_clp)),
  transactionCount: Math.round(toNumber(row.transaction_count)),
  lastTransactionAt: row.last_transaction_at ? new Date(row.last_transaction_at).toISOString() : null,
  computedAt: row.computed_at ? new Date(row.computed_at).toISOString() : null,
  isPeriodClosed: Boolean(row.is_period_closed),
  closedByUserId: row.closed_by_user_id ? normalizeString(row.closed_by_user_id) : null,
  closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null
})

const getTodayInSantiago = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

const getAccountRow = async (accountId: string, client?: QueryableClient) => {
  const rows = await queryRows<AccountRow & { account_kind?: string }>(
    `
      SELECT
        account_id,
        account_name,
        bank_name,
        currency,
        instrument_category,
        provider_slug,
        account_type,
        credit_limit,
        opening_balance,
        opening_balance_date,
        is_active,
        metadata_json,
        account_kind
      FROM greenhouse_finance.accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId],
    client
  )

  const account = rows[0]

  if (!account) {
    throw new FinanceValidationError(`Account "${accountId}" not found.`, 404)
  }

  return account
}

const getExistingBalanceRow = async (
  accountId: string,
  balanceDate: string,
  client?: QueryableClient
) => {
  const rows = await queryRows<AccountBalanceRow>(
    `
      SELECT
        balance_id,
        account_id,
        balance_date,
        currency,
        opening_balance,
        period_inflows,
        period_outflows,
        closing_balance,
        closing_balance_clp,
        fx_rate_used,
        fx_gain_loss_clp,
        fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp,
        transaction_count,
        last_transaction_at,
        computed_at,
        is_period_closed,
        closed_by_user_id,
        closed_at
      FROM greenhouse_finance.account_balances
      WHERE account_id = $1
        AND balance_date = $2::date
      LIMIT 1
    `,
    [accountId, balanceDate],
    client
  )

  return rows[0] || null
}

const getPreviousBalanceRow = async (
  accountId: string,
  balanceDate: string,
  client?: QueryableClient
) => {
  const rows = await queryRows<AccountBalanceRow>(
    `
      SELECT
        balance_id,
        account_id,
        balance_date,
        currency,
        opening_balance,
        period_inflows,
        period_outflows,
        closing_balance,
        closing_balance_clp,
        fx_rate_used,
        fx_gain_loss_clp,
        fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp,
        transaction_count,
        last_transaction_at,
        computed_at,
        is_period_closed,
        closed_by_user_id,
        closed_at
      FROM greenhouse_finance.account_balances
      WHERE account_id = $1
        AND balance_date < $2::date
      ORDER BY balance_date DESC
      LIMIT 1
    `,
    [accountId, balanceDate],
    client
  )

  return rows[0] || null
}

const getDailyMovementSummary = async (
  accountId: string,
  balanceDate: string,
  client?: QueryableClient
) => {
  const rows = await queryRows<DailyMovementRow>(
    `
      WITH settlement_movements AS (
        SELECT
          sl.direction,
          sl.amount,
          sl.transaction_date::timestamptz AS occurred_at
        FROM greenhouse_finance.settlement_legs sl
        WHERE sl.instrument_id = $1
          AND sl.transaction_date = $2::date
          AND sl.superseded_by_otb_id IS NULL
      ),
      fallback_income_payments AS (
        SELECT
          'incoming'::text AS direction,
          ip.amount,
          ip.payment_date::timestamptz AS occurred_at
        FROM greenhouse_finance.income_payments ip
        WHERE ip.payment_account_id = $1
          AND ip.payment_date = $2::date
          AND ip.superseded_by_payment_id IS NULL
          AND ip.superseded_by_otb_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_finance.settlement_legs sl
            WHERE sl.linked_payment_type = 'income_payment'
              AND sl.linked_payment_id = ip.payment_id
              AND sl.instrument_id = $1
              AND sl.superseded_by_otb_id IS NULL
          )
      ),
      fallback_expense_payments AS (
        SELECT
          'outgoing'::text AS direction,
          ep.amount,
          ep.payment_date::timestamptz AS occurred_at
        FROM greenhouse_finance.expense_payments ep
        WHERE ep.payment_account_id = $1
          AND ep.payment_date = $2::date
          AND ep.superseded_by_payment_id IS NULL
          AND ep.superseded_by_otb_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_finance.settlement_legs sl
            WHERE sl.linked_payment_type = 'expense_payment'
              AND sl.linked_payment_id = ep.payment_id
              AND sl.instrument_id = $1
              AND sl.superseded_by_otb_id IS NULL
          )
      ),
      movements AS (
        SELECT * FROM settlement_movements
        UNION ALL
        SELECT * FROM fallback_income_payments
        UNION ALL
        SELECT * FROM fallback_expense_payments
      )
      SELECT
        COALESCE(SUM(CASE WHEN direction = 'incoming' THEN amount ELSE 0 END), 0)::text AS inflows,
        COALESCE(SUM(CASE WHEN direction = 'outgoing' THEN amount ELSE 0 END), 0)::text AS outflows,
        COUNT(*)::text AS transaction_count,
        MAX(occurred_at) AS last_transaction_at
      FROM movements
    `,
    [accountId, balanceDate],
    client
  )

  return rows[0] || {
    inflows: 0,
    outflows: 0,
    transaction_count: 0,
    last_transaction_at: null
  }
}

const getDailyFxGainLoss = async (
  accountId: string,
  balanceDate: string,
  client?: QueryableClient
) => {
  const rows = await queryRows<DailyFxRow>(
    `
      SELECT
        COALESCE(SUM(fx_gain_loss_clp), 0)::text AS fx_gain_loss_clp
      FROM (
        SELECT ip.fx_gain_loss_clp
        FROM greenhouse_finance.income_payments ip
        WHERE ip.payment_account_id = $1
          AND ip.payment_date = $2::date
          AND ip.fx_gain_loss_clp IS NOT NULL
          AND ip.superseded_by_payment_id IS NULL
          AND ip.superseded_by_otb_id IS NULL
        UNION ALL
        SELECT ep.fx_gain_loss_clp
        FROM greenhouse_finance.expense_payments ep
        WHERE ep.payment_account_id = $1
          AND ep.payment_date = $2::date
          AND ep.fx_gain_loss_clp IS NOT NULL
          AND ep.superseded_by_payment_id IS NULL
          AND ep.superseded_by_otb_id IS NULL
      ) fx
    `,
    [accountId, balanceDate],
    client
  )

  return rows[0] || { fx_gain_loss_clp: 0 }
}

const getEarliestMovementDate = async (
  accountId: string,
  client?: QueryableClient
) => {
  const rows = await queryRows<{ earliest_date: string | Date | null }>(
    `
      SELECT MIN(movement_date) AS earliest_date
      FROM (
        SELECT sl.transaction_date AS movement_date
        FROM greenhouse_finance.settlement_legs sl
        WHERE sl.instrument_id = $1
          AND sl.transaction_date IS NOT NULL
          AND sl.superseded_by_otb_id IS NULL
        UNION ALL
        SELECT ip.payment_date AS movement_date
        FROM greenhouse_finance.income_payments ip
        WHERE ip.payment_account_id = $1
          AND ip.payment_date IS NOT NULL
          AND ip.superseded_by_payment_id IS NULL
          AND ip.superseded_by_otb_id IS NULL
        UNION ALL
        SELECT ep.payment_date AS movement_date
        FROM greenhouse_finance.expense_payments ep
        WHERE ep.payment_account_id = $1
          AND ep.payment_date IS NOT NULL
          AND ep.superseded_by_payment_id IS NULL
          AND ep.superseded_by_otb_id IS NULL
      ) movement_dates
    `,
    [accountId],
    client
  )

  return toDateString(rows[0]?.earliest_date || null)
}

const getAccountIds = async (client?: QueryableClient) => {
  const rows = await queryRows<{ account_id: string }>(
    `
      SELECT account_id
      FROM greenhouse_finance.accounts
      WHERE is_active = TRUE
      ORDER BY display_order ASC NULLS LAST, account_name ASC
    `,
    [],
    client
  )

  return rows.map(row => normalizeString(row.account_id)).filter(Boolean)
}

const resolveMaterializationStartDate = async (
  accountId: string,
  targetStartDate: string,
  client?: QueryableClient
) => {
  // TASK-703b: an active OTB declares the canonical anchor. The materializer
  // must NEVER walk earlier than the OTB's genesis_date. Pre-anchor data is
  // either superseded (cascade-supersede) or out of scope by definition.
  const otb = await getActiveOpeningTrialBalance(accountId)
  const otbGenesisDate = otb?.genesisDate ?? null

  const clampToOtb = (date: string): string => {
    if (!otbGenesisDate) return date

    return date < otbGenesisDate ? otbGenesisDate : date
  }

  const previous = await getPreviousBalanceRow(accountId, targetStartDate, client)

  if (previous) {
    return clampToOtb(targetStartDate)
  }

  const account = await getAccountRow(accountId, client)
  const openingBalanceDate = toDateString(account.opening_balance_date)
  const earliestMovementDate = await getEarliestMovementDate(accountId, client)
  const candidate = minDate(openingBalanceDate, earliestMovementDate, targetStartDate) || targetStartDate

  return clampToOtb(candidate)
}

const getCoverage = async (
  startDate: string,
  endDate: string,
  client?: QueryableClient
): Promise<TreasuryCoverage> => {
  const rows = await queryRows<{ total_count: unknown; assigned_count: unknown }>(
    `
      SELECT
        COUNT(*)::text AS total_count,
        COUNT(*) FILTER (WHERE payment_account_id IS NOT NULL)::text AS assigned_count
      FROM (
        SELECT payment_account_id
        FROM greenhouse_finance.income_payments
        WHERE payment_date BETWEEN $1::date AND $2::date
        UNION ALL
        SELECT payment_account_id
        FROM greenhouse_finance.expense_payments
        WHERE payment_date BETWEEN $1::date AND $2::date
      ) payments
    `,
    [startDate, endDate],
    client
  )

  const totalCount = Math.round(toNumber(rows[0]?.total_count))
  const assignedCount = Math.round(toNumber(rows[0]?.assigned_count))
  const coveragePct = totalCount > 0 ? roundCurrency((assignedCount / totalCount) * 100) : 100

  return {
    totalCount,
    assignedCount,
    coveragePct,
    unassignedCount: Math.max(0, totalCount - assignedCount)
  }
}

export const materializeAccountBalance = async (
  input: MaterializeAccountBalanceInput
): Promise<AccountBalanceRecord> => {
  const balanceDate = assertDateString(input.balanceDate, 'balanceDate')
  const account = await getAccountRow(input.accountId, input.client)
  const existing = await getExistingBalanceRow(input.accountId, balanceDate, input.client)

  if (existing?.is_period_closed && !input.force) {
    return mapAccountBalanceRow(existing)
  }

  const previous = await getPreviousBalanceRow(input.accountId, balanceDate, input.client)

  const openingBalance = previous
    ? roundCurrency(toNumber(previous.closing_balance))
    : roundCurrency(toNumber(account.opening_balance))

  const movementSummary = await getDailyMovementSummary(input.accountId, balanceDate, input.client)
  const fxSummary = await getDailyFxGainLoss(input.accountId, balanceDate, input.client)
  const currency = normalizeString(account.currency || 'CLP') || 'CLP'
  const periodInflows = roundCurrency(toNumber(movementSummary.inflows))
  const periodOutflows = roundCurrency(toNumber(movementSummary.outflows))

  // TASK-703: liability accounts (credit_card, shareholder_account, future loans/wallets)
  // invert the sign convention. From the bank's POV:
  //   - cargos a TC ("outflows" del POV TC instrument) AUMENTAN deuda
  //   - pagos a TC ("inflows" desde otra cuenta) REDUCEN deuda
  // Same for CCA:
  //   - gastos pagados con tarjeta personal del accionista (outflows del CCA) AUMENTAN deuda
  //   - reembolsos transferidos al accionista (inflows al CCA) REDUCEN deuda
  // Asset accounts (banks, fintechs, cash, payroll_processor) keep the canonical
  // bank convention: closing = opening + inflows - outflows.
  const accountKind = (account as AccountRow & { account_kind?: string }).account_kind || 'asset'

  const closingBalance = accountKind === 'liability'
    ? roundCurrency(openingBalance - periodInflows + periodOutflows)
    : roundCurrency(openingBalance + periodInflows - periodOutflows)

  // ── FX resolution ──────────────────────────────────────────────────────
  // CLP accounts: rate=1, no translation FX possible.
  // Non-CLP accounts: best-effort fetch of today's rate. If the registry has
  // no rate (network down, provider failure, day-zero for a new currency) we
  // degrade honestly — translation = 0 + structured warning. We never block
  // the materialization or the response, so the daily snapshot still lands.
  let fxRateUsed: number = 1
  let fxRateAvailable = currency === 'CLP'

  if (currency !== 'CLP') {
    try {
      fxRateUsed = await resolveExchangeRateToClp({
        currency: currency as FinanceCurrency
      })
      fxRateAvailable = fxRateUsed > 0
    } catch (err) {
      captureWithDomain(err, 'finance', {
        level: 'warning',
        tags: { source: 'fx_pnl_translation' },
        extra: {
          accountId: input.accountId,
          balanceDate,
          currency
        }
      })
      fxRateAvailable = false
      fxRateUsed = toNumber(previous?.fx_rate_used) || 1
    }
  }

  const closingBalanceClp = currency === 'CLP'
    ? closingBalance
    : roundCurrency(closingBalance * fxRateUsed)

  // ── Translation FX ─────────────────────────────────────────────────────
  // Mark-to-market revaluation of the held non-CLP balance from yesterday's
  // CLP-equivalent to today's CLP-equivalent, isolated from the day's
  // movements (those carry their own realized FX through payments).
  //
  //   translation = today_closing_clp − previous_closing_clp − net_movement_clp
  //
  // Where net_movement_clp = (period_inflows − period_outflows) × rate_today.
  // Subtracting the movement leg keeps the metric pure: only the revaluation
  // of the *retained* foreign balance shows up here.
  let fxGainLossTranslationClp = 0

  if (currency !== 'CLP' && fxRateAvailable && previous?.closing_balance_clp != null) {
    const previousClosingClp = roundCurrency(toNumber(previous.closing_balance_clp))
    const netMovementClp = roundCurrency((periodInflows - periodOutflows) * fxRateUsed)

    fxGainLossTranslationClp = roundCurrency(
      closingBalanceClp - previousClosingClp - netMovementClp
    )
  }

  const fxGainLossRealizedClp = roundCurrency(toNumber(fxSummary.fx_gain_loss_clp))
  const fxGainLossTotalClp = roundCurrency(fxGainLossRealizedClp + fxGainLossTranslationClp)

  const upsertedRows = await queryRows<AccountBalanceRow>(
    `
      INSERT INTO greenhouse_finance.account_balances (
        balance_id,
        account_id,
        balance_date,
        currency,
        opening_balance,
        period_inflows,
        period_outflows,
        closing_balance,
        closing_balance_clp,
        fx_rate_used,
        fx_gain_loss_clp,
        fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp,
        transaction_count,
        last_transaction_at,
        computed_at,
        is_period_closed,
        closed_by_user_id,
        closed_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3::date,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        CURRENT_TIMESTAMP,
        FALSE,
        NULL,
        NULL,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (account_id, balance_date)
      DO UPDATE SET
        currency = EXCLUDED.currency,
        opening_balance = EXCLUDED.opening_balance,
        period_inflows = EXCLUDED.period_inflows,
        period_outflows = EXCLUDED.period_outflows,
        closing_balance = EXCLUDED.closing_balance,
        closing_balance_clp = EXCLUDED.closing_balance_clp,
        fx_rate_used = EXCLUDED.fx_rate_used,
        fx_gain_loss_clp = EXCLUDED.fx_gain_loss_clp,
        fx_gain_loss_realized_clp = EXCLUDED.fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp = EXCLUDED.fx_gain_loss_translation_clp,
        transaction_count = EXCLUDED.transaction_count,
        last_transaction_at = EXCLUDED.last_transaction_at,
        computed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        balance_id,
        account_id,
        balance_date,
        currency,
        opening_balance,
        period_inflows,
        period_outflows,
        closing_balance,
        closing_balance_clp,
        fx_rate_used,
        fx_gain_loss_clp,
        fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp,
        transaction_count,
        last_transaction_at,
        computed_at,
        is_period_closed,
        closed_by_user_id,
        closed_at
    `,
    [
      buildBalanceId(input.accountId, balanceDate),
      input.accountId,
      balanceDate,
      currency,
      openingBalance,
      periodInflows,
      periodOutflows,
      closingBalance,
      closingBalanceClp,
      fxRateUsed,
      fxGainLossTotalClp,
      fxGainLossRealizedClp,
      fxGainLossTranslationClp,
      Math.round(toNumber(movementSummary.transaction_count)),
      movementSummary.last_transaction_at
    ],
    input.client
  )

  return mapAccountBalanceRow(upsertedRows[0])
}

export const rematerializeAccountBalancesFromDate = async ({
  accountId,
  fromDate,
  toDate,
  actorUserId,
  client,
  force
}: {
  accountId: string
  fromDate: string
  toDate?: string | null
  actorUserId?: string | null
  client?: QueryableClient
  force?: boolean
}) => {
  const startDate = assertDateString(fromDate, 'fromDate')
  const finalDate = assertDateString(toDate || getTodayInSantiago(), 'toDate')
  const balances: AccountBalanceRecord[] = []

  if (startDate > finalDate) {
    return balances
  }

  let cursor = startDate

  while (cursor <= finalDate) {
    balances.push(
      await materializeAccountBalance({
        accountId,
        balanceDate: cursor,
        actorUserId,
        client,
        force
      })
    )
    cursor = addDays(cursor, 1)
  }

  return balances
}

export const materializeAccountBalancesForPeriod = async ({
  accountIds,
  startDate,
  endDate,
  actorUserId,
  client,
  force
}: {
  accountIds?: string[]
  startDate: string
  endDate: string
  actorUserId?: string | null
  client?: QueryableClient
  force?: boolean
}) => {
  const normalizedStartDate = assertDateString(startDate, 'startDate')
  const normalizedEndDate = assertDateString(endDate, 'endDate')
  const ids = accountIds?.length ? accountIds : await getAccountIds(client)

  for (const accountId of ids) {
    const effectiveStartDate = await resolveMaterializationStartDate(accountId, normalizedStartDate, client)

    await rematerializeAccountBalancesFromDate({
      accountId,
      fromDate: effectiveStartDate,
      toDate: normalizedEndDate,
      actorUserId,
      client,
      force
    })
  }
}

export const listTreasuryUnassignedPayments = async ({
  startDate,
  endDate,
  limit = 100,
  client
}: {
  startDate: string
  endDate: string
  limit?: number
  client?: QueryableClient
}): Promise<TreasuryUnassignedPayment[]> => {
  const rows = await queryRows<UnassignedPaymentRow>(
    `
      WITH unassigned_income AS (
        SELECT
          'income'::text AS payment_type,
          ip.payment_id,
          ip.payment_date,
          ip.amount,
          ip.amount_clp,
          ip.currency,
          ip.reference,
          ip.payment_method,
          i.client_name AS counterparty_name,
          i.income_id AS document_id,
          COALESCE(i.invoice_number, i.dte_folio, i.income_id) AS document_label
        FROM greenhouse_finance.income_payments ip
        JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
        WHERE ip.payment_account_id IS NULL
          AND ip.payment_date BETWEEN $1::date AND $2::date
      ),
      unassigned_expense AS (
        SELECT
          'expense'::text AS payment_type,
          ep.payment_id,
          ep.payment_date,
          ep.amount,
          ep.amount_clp,
          ep.currency,
          ep.reference,
          ep.payment_method,
          COALESCE(e.supplier_name, e.nubox_supplier_name, e.description) AS counterparty_name,
          e.expense_id AS document_id,
          COALESCE(e.document_number, e.dte_folio, e.expense_id) AS document_label
        FROM greenhouse_finance.expense_payments ep
        JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
        WHERE ep.payment_account_id IS NULL
          AND ep.payment_date BETWEEN $1::date AND $2::date
      )
      SELECT *
      FROM (
        SELECT * FROM unassigned_income
        UNION ALL
        SELECT * FROM unassigned_expense
      ) payments
      ORDER BY payment_date DESC NULLS LAST, payment_id DESC
      LIMIT $3
    `,
    [startDate, endDate, limit],
    client
  )

  return rows.map(row => ({
    paymentType: row.payment_type,
    paymentId: normalizeString(row.payment_id),
    paymentDate: toDateString(row.payment_date),
    amount: roundCurrency(toNumber(row.amount)),
    amountClp: row.amount_clp != null ? roundCurrency(toNumber(row.amount_clp)) : null,
    currency: row.currency ? normalizeString(row.currency) : null,
    reference: row.reference ? normalizeString(row.reference) : null,
    paymentMethod: row.payment_method ? normalizeString(row.payment_method) : null,
    counterpartyName: row.counterparty_name ? normalizeString(row.counterparty_name) : null,
    documentId: row.document_id ? normalizeString(row.document_id) : null,
    documentLabel: row.document_label ? normalizeString(row.document_label) : null
  }))
}

export const getBankOverview = async ({
  year,
  month,
  actorUserId,
  client
}: {
  year?: number | null
  month?: number | null
  actorUserId?: string | null
  client?: QueryableClient
}): Promise<TreasuryBankOverview> => {
  const now = new Date()
  const resolvedYear = year ?? now.getUTCFullYear()
  const resolvedMonth = month ?? (now.getUTCMonth() + 1)

  if (!Number.isInteger(resolvedYear) || !Number.isInteger(resolvedMonth) || resolvedMonth < 1 || resolvedMonth > 12) {
    throw new FinanceValidationError('year/month must describe a valid accounting period.')
  }

  const periodStart = startOfMonth(resolvedYear, resolvedMonth)

  const periodEnd = maxDate(
    resolvedYear === Number(getTodayInSantiago().slice(0, 4)) && resolvedMonth === Number(getTodayInSantiago().slice(5, 7))
      ? getTodayInSantiago()
      : endOfMonth(resolvedYear, resolvedMonth),
    periodStart
  ) || periodStart

  await materializeAccountBalancesForPeriod({
    startDate: periodStart,
    endDate: periodEnd,
    actorUserId,
    client
  })

  const rows = await queryRows<AccountOverviewRow>(
    `
      WITH period_rows AS (
        SELECT *
        FROM greenhouse_finance.account_balances
        WHERE balance_date BETWEEN $1::date AND $2::date
      ),
      period_summary AS (
        SELECT
          account_id,
          SUM(period_inflows)::text AS period_inflows,
          SUM(period_outflows)::text AS period_outflows,
          SUM(fx_gain_loss_clp)::text AS fx_gain_loss_clp,
          SUM(fx_gain_loss_realized_clp)::text AS fx_gain_loss_realized_clp,
          SUM(fx_gain_loss_translation_clp)::text AS fx_gain_loss_translation_clp,
          SUM(transaction_count)::text AS transaction_count,
          MAX(last_transaction_at) AS last_transaction_at
        FROM period_rows
        GROUP BY account_id
      ),
      opening_rows AS (
        SELECT DISTINCT ON (account_id)
          account_id,
          opening_balance
        FROM period_rows
        ORDER BY account_id, balance_date ASC
      ),
      closing_rows AS (
        SELECT DISTINCT ON (account_id)
          account_id,
          closing_balance,
          closing_balance_clp,
          fx_rate_used,
          is_period_closed
        FROM period_rows
        ORDER BY account_id, balance_date DESC
      ),
      reconciliation_rows AS (
        SELECT
          account_id,
          status AS reconciliation_status,
          period_id AS reconciliation_period_id,
          COALESCE(difference, closing_balance_system - closing_balance_bank, 0) AS discrepancy
        FROM greenhouse_finance.reconciliation_periods
        WHERE year = $3
          AND month = $4
      )
      SELECT
        a.account_id,
        a.account_name,
        a.bank_name,
        a.currency,
        a.instrument_category,
        a.provider_slug,
        a.account_type,
        a.credit_limit,
        a.metadata_json,
        COALESCE(o.opening_balance, a.opening_balance)::text AS opening_balance,
        COALESCE(s.period_inflows, '0') AS period_inflows,
        COALESCE(s.period_outflows, '0') AS period_outflows,
        COALESCE(c.closing_balance, a.opening_balance)::text AS closing_balance,
        c.closing_balance_clp,
        c.fx_rate_used,
        COALESCE(s.fx_gain_loss_clp, '0') AS fx_gain_loss_clp,
        COALESCE(s.fx_gain_loss_realized_clp, '0') AS fx_gain_loss_realized_clp,
        COALESCE(s.fx_gain_loss_translation_clp, '0') AS fx_gain_loss_translation_clp,
        COALESCE(s.transaction_count, '0') AS transaction_count,
        s.last_transaction_at,
        COALESCE(c.is_period_closed, FALSE) AS is_period_closed,
        COALESCE(r.discrepancy, 0)::text AS discrepancy,
        r.reconciliation_status,
        r.reconciliation_period_id
      FROM greenhouse_finance.accounts a
      LEFT JOIN opening_rows o ON o.account_id = a.account_id
      LEFT JOIN period_summary s ON s.account_id = a.account_id
      LEFT JOIN closing_rows c ON c.account_id = a.account_id
      LEFT JOIN reconciliation_rows r ON r.account_id = a.account_id
      WHERE a.is_active = TRUE
      ORDER BY a.currency ASC, a.display_order ASC NULLS LAST, a.account_name ASC
    `,
    [periodStart, periodEnd, resolvedYear, resolvedMonth],
    client
  )

  const accountsRaw: TreasuryBankAccountOverview[] = rows.map(row => ({
    accountId: normalizeString(row.account_id),
    accountName: normalizeString(row.account_name),
    bankName: row.bank_name ? normalizeString(row.bank_name) : null,
    currency: normalizeString(row.currency),
    instrumentCategory: row.instrument_category ? normalizeString(row.instrument_category) : null,
    providerSlug: row.provider_slug ? normalizeString(row.provider_slug) : null,
    accountType: normalizeString(row.account_type),
    openingBalance: roundCurrency(toNumber(row.opening_balance)),
    periodInflows: roundCurrency(toNumber(row.period_inflows)),
    periodOutflows: roundCurrency(toNumber(row.period_outflows)),
    closingBalance: roundCurrency(toNumber(row.closing_balance)),
    closingBalanceClp: row.closing_balance_clp != null ? roundCurrency(toNumber(row.closing_balance_clp)) : null,
    fxRateUsed: row.fx_rate_used != null ? toNumber(row.fx_rate_used) : null,
    fxGainLossClp: roundCurrency(toNumber(row.fx_gain_loss_clp)),
    fxGainLossRealizedClp: roundCurrency(toNumber(row.fx_gain_loss_realized_clp)),
    fxGainLossTranslationClp: roundCurrency(toNumber(row.fx_gain_loss_translation_clp)),
    transactionCount: Math.round(toNumber(row.transaction_count)),
    lastTransactionAt: row.last_transaction_at ? new Date(row.last_transaction_at).toISOString() : null,
    isPeriodClosed: Boolean(row.is_period_closed),
    discrepancy: roundCurrency(toNumber(row.discrepancy)),
    reconciliationStatus: row.reconciliation_status ? normalizeString(row.reconciliation_status) : null,
    reconciliationPeriodId: row.reconciliation_period_id ? normalizeString(row.reconciliation_period_id) : null,
    creditLimit: row.credit_limit != null ? roundCurrency(toNumber(row.credit_limit)) : null,
    metadata: parseMetadata(row.metadata_json),
    drift: null
  }))

  // TASK-704: enrich accounts con drift summary (latest snapshot per account).
  const driftSummaries = await getOpenDriftSummariesForAccounts(accountsRaw.map(a => a.accountId))

  const accounts: TreasuryBankAccountOverview[] = accountsRaw.map(account => {
    const summary = driftSummaries[account.accountId]

    if (!summary || !summary.latestSnapshot) {
      return account
    }

    return {
      ...account,
      drift: {
        hasOpenDrift: summary.hasOpenDrift,
        driftAmount: summary.driftAmount,
        driftStatus: summary.driftStatus,
        driftAgeMinutes: summary.driftAgeMinutes,
        bankClosingBalance: summary.latestSnapshot.bankClosingBalance,
        bankAvailableBalance: summary.latestSnapshot.bankAvailableBalance,
        bankHoldsAmount: summary.latestSnapshot.bankHoldsAmount,
        bankCreditLimit: summary.latestSnapshot.bankCreditLimit,
        pgClosingBalance: summary.latestSnapshot.pgClosingBalance,
        snapshotId: summary.latestSnapshot.snapshotId,
        snapshotAt: summary.latestSnapshot.snapshotAt,
        sourceKind: summary.latestSnapshot.sourceKind,
        sourceEvidenceRef: summary.latestSnapshot.sourceEvidenceRef,
        driftExplanation: summary.latestSnapshot.driftExplanation
      }
    }
  })

  const coverage = await getCoverage(periodStart, periodEnd, client)

  const unassignedPayments = await listTreasuryUnassignedPayments({
    startDate: periodStart,
    endDate: periodEnd,
    limit: 100,
    client
  })

  const totalClp = roundCurrency(
    accounts
      .filter(account => account.currency === 'CLP')
      .reduce((sum, account) => sum + account.closingBalance, 0)
  )

  const totalUsd = roundCurrency(
    accounts
      .filter(account => account.currency === 'USD')
      .reduce((sum, account) => sum + account.closingBalance, 0)
  )

  const consolidatedClp = roundCurrency(
    accounts.reduce((sum, account) => sum + (account.closingBalanceClp ?? 0), 0)
  )

  // Canonical FX P&L breakdown — single source of truth (TASK-699).
  // Reads from VIEW greenhouse_finance.fx_pnl_breakdown via the helper, so
  // any new FX source automatically lands here without touching consumers.
  const fxBreakdown = await getBankFxPnlBreakdown({
    year: resolvedYear,
    month: resolvedMonth
  })

  const fxGainLoss = {
    totalClp: fxBreakdown.totalClp,
    realizedClp: fxBreakdown.realizedClp,
    translationClp: fxBreakdown.translationClp,
    internalTransferClp: fxBreakdown.internalTransferClp,
    hasExposure: fxBreakdown.hasExposure,
    isDegraded: fxBreakdown.isDegraded
  }

  const fxGainLossClp = fxBreakdown.totalClp

  const creditCards = accounts
    .filter(account => account.instrumentCategory === 'credit_card')
    .map(account => {
      const metadataCreditLimit = toNumber(account.metadata?.creditLimit ?? account.metadata?.credit_limit ?? null)
      const creditLimit = account.creditLimit ?? (metadataCreditLimit > 0 ? metadataCreditLimit : null)

      // TASK-703b: "consumed" is the BANK's "cupo utilizado" / "deuda activa".
      // For a liability account (credit_card), closingBalance is the running
      // cumulative debt (cargos minus pagos minus credit applied).
      // periodOutflows would only show charges of the SELECTED month, missing
      // unpaid balance from prior cycles — that's a UI bug for revolving credit.
      // Negative closingBalance means client has credit/sobrepago with the bank;
      // we clamp at 0 because "consumed > 0 ⟹ deuda" semantically (bank UI does
      // the same — never shows "deuda negativa", instead shows credit elsewhere).
      const runningBalance = roundCurrency(account.closingBalance)
      const consumed = Math.max(0, runningBalance)

      return {
        accountId: account.accountId,
        accountName: account.accountName,
        providerSlug: account.providerSlug,
        currency: account.currency,
        creditLimit: creditLimit != null ? roundCurrency(creditLimit) : null,
        consumed,
        available: creditLimit != null ? roundCurrency(creditLimit - consumed) : null
      }
    })

  return {
    period: {
      year: resolvedYear,
      month: resolvedMonth,
      startDate: periodStart,
      endDate: periodEnd,
      isCurrentPeriod: periodEnd === getTodayInSantiago()
    },
    kpis: {
      totalClp,
      totalUsd,
      consolidatedClp,
      activeAccounts: accounts.length,
      fxGainLossClp,
      fxGainLoss,
      coverage
    },
    accounts,
    creditCards,
    unassignedPayments
  }
}

export const getBankAccountDetail = async ({
  accountId,
  year,
  month,
  actorUserId,
  client
}: {
  accountId: string
  year?: number | null
  month?: number | null
  actorUserId?: string | null
  client?: QueryableClient
}): Promise<TreasuryBankAccountDetail> => {
  const overview = await getBankOverview({ year, month, actorUserId, client })
  const account = overview.accounts.find(item => item.accountId === accountId)

  if (!account) {
    throw new FinanceValidationError(`Account "${accountId}" not found in treasury view.`, 404)
  }

  const currentBalanceRows = await queryRows<AccountBalanceRow>(
    `
      SELECT
        balance_id,
        account_id,
        balance_date,
        currency,
        opening_balance,
        period_inflows,
        period_outflows,
        closing_balance,
        closing_balance_clp,
        fx_rate_used,
        fx_gain_loss_clp,
        fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp,
        transaction_count,
        last_transaction_at,
        computed_at,
        is_period_closed,
        closed_by_user_id,
        closed_at
      FROM greenhouse_finance.account_balances
      WHERE account_id = $1
        AND balance_date = $2::date
      LIMIT 1
    `,
    [accountId, overview.period.endDate],
    client
  )

  const currentBalance = currentBalanceRows[0]

  if (!currentBalance) {
    throw new FinanceValidationError(`Treasury balance for "${accountId}" is not available.`, 404)
  }

  const historyStart = subtractMonths(overview.period.startDate, 11)

  await materializeAccountBalancesForPeriod({
    accountIds: [accountId],
    startDate: historyStart,
    endDate: overview.period.endDate,
    actorUserId,
    client
  })

  const historyRows = await queryRows<MonthlyHistoryRow>(
    `
      WITH monthly_last_rows AS (
        SELECT DISTINCT ON (date_trunc('month', balance_date))
          date_trunc('month', balance_date)::date AS balance_month,
          closing_balance,
          closing_balance_clp,
          period_inflows,
          period_outflows,
          fx_gain_loss_clp
        FROM greenhouse_finance.account_balances
        WHERE account_id = $1
          AND balance_date BETWEEN $2::date AND $3::date
        ORDER BY date_trunc('month', balance_date), balance_date DESC
      )
      SELECT
        balance_month,
        closing_balance,
        closing_balance_clp,
        period_inflows,
        period_outflows,
        fx_gain_loss_clp
      FROM monthly_last_rows
      ORDER BY balance_month ASC
    `,
    [accountId, historyStart, overview.period.endDate],
    client
  )

  const movementRows = await queryRows<AccountDetailMovementRow>(
    `
      WITH settlement_movements AS (
        SELECT
          sl.settlement_leg_id AS movement_id,
          'settlement_leg'::text AS movement_source,
          sl.leg_type AS movement_type,
          sl.direction,
          sl.instrument_id,
          sl.counterparty_instrument_id,
          sl.linked_payment_type AS payment_type,
          sl.linked_payment_id AS payment_id,
          sl.transaction_date,
          sl.amount,
          sl.currency,
          sl.amount_clp,
          sl.fx_rate,
          sl.provider_reference,
          sl.provider_status,
          sl.is_reconciled
        FROM greenhouse_finance.settlement_legs sl
        WHERE sl.instrument_id = $1
          AND sl.transaction_date BETWEEN $2::date AND $3::date
          AND sl.superseded_by_otb_id IS NULL
      ),
      fallback_income AS (
        SELECT
          ip.payment_id AS movement_id,
          'income_payment'::text AS movement_source,
          'receipt'::text AS movement_type,
          'incoming'::text AS direction,
          ip.payment_account_id AS instrument_id,
          NULL::text AS counterparty_instrument_id,
          'income_payment'::text AS payment_type,
          ip.payment_id,
          ip.payment_date AS transaction_date,
          ip.amount,
          COALESCE(ip.currency, 'CLP') AS currency,
          ip.amount_clp,
          ip.exchange_rate_at_payment AS fx_rate,
          ip.reference AS provider_reference,
          ip.payment_source AS provider_status,
          ip.is_reconciled
        FROM greenhouse_finance.income_payments ip
        WHERE ip.payment_account_id = $1
          AND ip.payment_date BETWEEN $2::date AND $3::date
          AND ip.superseded_by_payment_id IS NULL
          AND ip.superseded_by_otb_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_finance.settlement_legs sl
            WHERE sl.linked_payment_type = 'income_payment'
              AND sl.linked_payment_id = ip.payment_id
              AND sl.instrument_id = $1
              AND sl.superseded_by_otb_id IS NULL
          )
      ),
      fallback_expense AS (
        SELECT
          ep.payment_id AS movement_id,
          'expense_payment'::text AS movement_source,
          'payout'::text AS movement_type,
          'outgoing'::text AS direction,
          ep.payment_account_id AS instrument_id,
          NULL::text AS counterparty_instrument_id,
          'expense_payment'::text AS payment_type,
          ep.payment_id,
          ep.payment_date AS transaction_date,
          ep.amount,
          COALESCE(ep.currency, 'CLP') AS currency,
          ep.amount_clp,
          ep.exchange_rate_at_payment AS fx_rate,
          ep.reference AS provider_reference,
          ep.payment_source AS provider_status,
          ep.is_reconciled
        FROM greenhouse_finance.expense_payments ep
        WHERE ep.payment_account_id = $1
          AND ep.payment_date BETWEEN $2::date AND $3::date
          AND ep.superseded_by_payment_id IS NULL
          AND ep.superseded_by_otb_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM greenhouse_finance.settlement_legs sl
            WHERE sl.linked_payment_type = 'expense_payment'
              AND sl.linked_payment_id = ep.payment_id
              AND sl.instrument_id = $1
              AND sl.superseded_by_otb_id IS NULL
          )
      )
      SELECT *
      FROM (
        SELECT * FROM settlement_movements
        UNION ALL
        SELECT * FROM fallback_income
        UNION ALL
        SELECT * FROM fallback_expense
      ) movements
      ORDER BY transaction_date DESC NULLS LAST, movement_id DESC
      LIMIT 50
    `,
    [accountId, overview.period.startDate, overview.period.endDate],
    client
  )

  return {
    account,
    currentBalance: mapAccountBalanceRow(currentBalance),
    history: historyRows.map(row => ({
      month: toDateString(row.balance_month) || '',
      closingBalance: roundCurrency(toNumber(row.closing_balance)),
      closingBalanceClp: row.closing_balance_clp != null ? roundCurrency(toNumber(row.closing_balance_clp)) : null,
      periodInflows: roundCurrency(toNumber(row.period_inflows)),
      periodOutflows: roundCurrency(toNumber(row.period_outflows)),
      fxGainLossClp: roundCurrency(toNumber(row.fx_gain_loss_clp))
    })),
    movements: movementRows.map(row => ({
      movementId: normalizeString(row.movement_id),
      movementSource: normalizeString(row.movement_source),
      movementType: normalizeString(row.movement_type),
      direction: normalizeString(row.direction),
      instrumentId: row.instrument_id ? normalizeString(row.instrument_id) : null,
      counterpartyInstrumentId: row.counterparty_instrument_id ? normalizeString(row.counterparty_instrument_id) : null,
      paymentType: row.payment_type ? normalizeString(row.payment_type) : null,
      paymentId: row.payment_id ? normalizeString(row.payment_id) : null,
      transactionDate: toDateString(row.transaction_date),
      amount: roundCurrency(toNumber(row.amount)),
      currency: normalizeString(row.currency),
      amountClp: row.amount_clp != null ? roundCurrency(toNumber(row.amount_clp)) : null,
      fxRate: row.fx_rate != null ? toNumber(row.fx_rate) : null,
      providerReference: row.provider_reference ? normalizeString(row.provider_reference) : null,
      providerStatus: row.provider_status ? normalizeString(row.provider_status) : null,
      isReconciled: Boolean(row.is_reconciled)
    }))
  }
}

export const closeAccountBalancePeriod = async ({
  accountId,
  year,
  month,
  actorUserId
}: {
  accountId: string
  year: number
  month: number
  actorUserId?: string | null
}) => {
  const closeDate = endOfMonth(year, month)
  const today = getTodayInSantiago()

  if (closeDate >= today) {
    throw new FinanceValidationError('Solo puedes cerrar períodos completamente terminados.', 409)
  }

  await materializeAccountBalancesForPeriod({
    accountIds: [accountId],
    startDate: startOfMonth(year, month),
    endDate: closeDate,
    actorUserId
  })

  const rows = await query<AccountBalanceRow>(
    `
      UPDATE greenhouse_finance.account_balances
      SET
        is_period_closed = TRUE,
        closed_by_user_id = $3,
        closed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = $1
        AND balance_date = $2::date
      RETURNING
        balance_id,
        account_id,
        balance_date,
        currency,
        opening_balance,
        period_inflows,
        period_outflows,
        closing_balance,
        closing_balance_clp,
        fx_rate_used,
        fx_gain_loss_clp,
        fx_gain_loss_realized_clp,
        fx_gain_loss_translation_clp,
        transaction_count,
        last_transaction_at,
        computed_at,
        is_period_closed,
        closed_by_user_id,
        closed_at
    `,
    [accountId, closeDate, actorUserId || null]
  )

  if (!rows[0]) {
    throw new FinanceValidationError(`No snapshot exists to close for "${accountId}" (${year}-${month}).`, 404)
  }

  return mapAccountBalanceRow(rows[0])
}

export const assignAccountToPayments = async ({
  accountId,
  assignments,
  actorUserId
}: {
  accountId: string
  assignments: TreasuryPaymentAssignment[]
  actorUserId?: string | null
}) => {
  if (!assignments.length) {
    throw new FinanceValidationError('At least one payment must be selected for assignment.')
  }

  return withTransaction(async client => {
    const account = await getAccountRow(accountId, client)

    if (!account.is_active) {
      throw new FinanceValidationError(`Account "${accountId}" is inactive.`, 409)
    }

    let earliestAffectedDate: string | null = null

    for (const assignment of assignments) {
      if (assignment.paymentType === 'income') {
        const paymentRows = await queryRows<{
          payment_id: string
          payment_date: string | Date | null
          amount: unknown
          currency: string | null
          amount_clp: unknown
          exchange_rate_at_payment: unknown
          payment_source: string | null
          reference: string | null
          notes: string | null
        }>(
          `
            UPDATE greenhouse_finance.income_payments
            SET payment_account_id = $2
            WHERE payment_id = $1
            RETURNING
              payment_id,
              payment_date,
              amount,
              currency,
              amount_clp,
              exchange_rate_at_payment,
              payment_source,
              reference,
              notes
          `,
          [assignment.paymentId, accountId],
          client
        )

        const payment = paymentRows[0]

        if (!payment) {
          throw new FinanceValidationError(`Income payment "${assignment.paymentId}" not found.`, 404)
        }

        const paymentDate = toDateString(payment.payment_date)

        if (paymentDate) {
          earliestAffectedDate = minDate(earliestAffectedDate, paymentDate)
        }

        await ensureSettlementForIncomePayment({
          client,
          paymentId: normalizeString(payment.payment_id),
          paymentAccountId: accountId,
          paymentDate,
          amount: roundCurrency(toNumber(payment.amount)),
          currency: payment.currency ? normalizeString(payment.currency) : account.currency,
          amountClp: payment.amount_clp != null ? roundCurrency(toNumber(payment.amount_clp)) : null,
          exchangeRate: payment.exchange_rate_at_payment != null ? toNumber(payment.exchange_rate_at_payment) : null,
          paymentSource: payment.payment_source ? normalizeString(payment.payment_source) : null,
          providerReference: payment.reference ? normalizeString(payment.reference) : null,
          actorUserId,
          notes: payment.notes ? normalizeString(payment.notes) : null
        })
      } else {
        const paymentRows = await queryRows<{
          payment_id: string
          payment_date: string | Date | null
          amount: unknown
          currency: string | null
          amount_clp: unknown
          exchange_rate_at_payment: unknown
          payment_source: string | null
          reference: string | null
          notes: string | null
        }>(
          `
            UPDATE greenhouse_finance.expense_payments
            SET payment_account_id = $2
            WHERE payment_id = $1
            RETURNING
              payment_id,
              payment_date,
              amount,
              currency,
              amount_clp,
              exchange_rate_at_payment,
              payment_source,
              reference,
              notes
          `,
          [assignment.paymentId, accountId],
          client
        )

        const payment = paymentRows[0]

        if (!payment) {
          throw new FinanceValidationError(`Expense payment "${assignment.paymentId}" not found.`, 404)
        }

        const paymentDate = toDateString(payment.payment_date)

        if (paymentDate) {
          earliestAffectedDate = minDate(earliestAffectedDate, paymentDate)
        }

        await ensureSettlementForExpensePayment({
          client,
          paymentId: normalizeString(payment.payment_id),
          paymentAccountId: accountId,
          paymentDate,
          amount: roundCurrency(toNumber(payment.amount)),
          currency: payment.currency ? normalizeString(payment.currency) : account.currency,
          amountClp: payment.amount_clp != null ? roundCurrency(toNumber(payment.amount_clp)) : null,
          exchangeRate: payment.exchange_rate_at_payment != null ? toNumber(payment.exchange_rate_at_payment) : null,
          paymentSource: payment.payment_source ? normalizeString(payment.payment_source) : null,
          providerReference: payment.reference ? normalizeString(payment.reference) : null,
          actorUserId,
          notes: payment.notes ? normalizeString(payment.notes) : null
        })
      }
    }

    if (earliestAffectedDate) {
      await rematerializeAccountBalancesFromDate({
        accountId,
        fromDate: earliestAffectedDate,
        toDate: getTodayInSantiago(),
        actorUserId,
        client
      })
    }

    return {
      accountId,
      assignedCount: assignments.length,
      earliestAffectedDate
    }
  })
}
