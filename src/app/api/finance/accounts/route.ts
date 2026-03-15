import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toDateString,
  toTimestampString,
  FinanceValidationError,
  ACCOUNT_TYPES,
  type AccountType
} from '@/lib/finance/shared'
import {
  createFinanceAccountInPostgres,
  shouldFallbackFromFinancePostgres
} from '@/lib/finance/postgres-store'

export const dynamic = 'force-dynamic'

interface AccountRow {
  account_id: string
  account_name: string
  bank_name: string
  account_number: string | null
  currency: string
  account_type: string
  country: string
  is_active: boolean
  opening_balance: unknown
  opening_balance_date: unknown
  notes: string | null
  created_at: unknown
  updated_at: unknown
  current_balance: unknown
  balance_as_of: unknown
  balance_source: string
}

const normalizeAccount = (row: AccountRow) => ({
  accountId: normalizeString(row.account_id),
  accountName: normalizeString(row.account_name),
  bankName: normalizeString(row.bank_name),
  accountNumber: row.account_number ? normalizeString(row.account_number) : null,
  currency: normalizeString(row.currency),
  accountType: normalizeString(row.account_type),
  country: normalizeString(row.country),
  isActive: normalizeBoolean(row.is_active),
  openingBalance: toNumber(row.opening_balance),
  openingBalanceDate: toDateString(row.opening_balance_date as string | { value?: string } | null),
  currentBalance: toNumber(row.current_balance),
  balanceAsOf: toDateString(row.balance_as_of as string | { value?: string } | null),
  balanceSource: normalizeString(row.balance_source) || 'opening_balance',
  notes: row.notes ? normalizeString(row.notes) : null,
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

const getCurrentBalanceMap = async () => {
  try {
    const projectId = getFinanceProjectId()

    const [statementRows, periodRows] = await Promise.all([
      runFinanceQuery<{
        account_id: string
        current_balance: unknown
        balance_as_of: unknown
      }>(`
        WITH ranked_statement_balance AS (
          SELECT
            period.account_id,
            statement_row.balance AS current_balance,
            COALESCE(statement_row.value_date, statement_row.transaction_date) AS balance_as_of,
            ROW_NUMBER() OVER (
              PARTITION BY period.account_id
              ORDER BY COALESCE(statement_row.value_date, statement_row.transaction_date) DESC, statement_row.created_at DESC, statement_row.row_id DESC
            ) AS row_number
          FROM \`${projectId}.greenhouse.fin_bank_statement_rows\` AS statement_row
          INNER JOIN \`${projectId}.greenhouse.fin_reconciliation_periods\` AS period
            ON period.period_id = statement_row.period_id
          WHERE statement_row.balance IS NOT NULL
        )
        SELECT account_id, current_balance, balance_as_of
        FROM ranked_statement_balance
        WHERE row_number = 1
      `),
      runFinanceQuery<{
        account_id: string
        current_balance: unknown
        balance_as_of: unknown
      }>(`
        WITH ranked_period_close AS (
          SELECT
            account_id,
            closing_balance_bank AS current_balance,
            DATE_SUB(DATE_ADD(DATE(year, month, 1), INTERVAL 1 MONTH), INTERVAL 1 DAY) AS balance_as_of,
            ROW_NUMBER() OVER (
              PARTITION BY account_id
              ORDER BY year DESC, month DESC, updated_at DESC, period_id DESC
            ) AS row_number
          FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
          WHERE closing_balance_bank IS NOT NULL
        )
        SELECT account_id, current_balance, balance_as_of
        FROM ranked_period_close
        WHERE row_number = 1
      `)
    ])

    const statementMap = new Map(
      statementRows.map(row => [
        normalizeString(row.account_id),
        {
          currentBalance: toNumber(row.current_balance),
          balanceAsOf: toDateString(row.balance_as_of as string | { value?: string } | null),
          balanceSource: 'statement'
        }
      ])
    )

    const periodMap = new Map(
      periodRows.map(row => [
        normalizeString(row.account_id),
        {
          currentBalance: toNumber(row.current_balance),
          balanceAsOf: toDateString(row.balance_as_of as string | { value?: string } | null),
          balanceSource: 'period_close'
        }
      ])
    )

    return {
      statementMap,
      periodMap
    }
  } catch (error) {
    console.warn('[finance/accounts] current balance enrichment failed, falling back to opening balances:', error instanceof Error ? error.message : error)

    return {
      statementMap: new Map<string, { currentBalance: number; balanceAsOf: string | null; balanceSource: string }>(),
      periodMap: new Map<string, { currentBalance: number; balanceAsOf: string | null; balanceSource: string }>()
    }
  }
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── BigQuery read path (Postgres tables not yet backfilled) ──
  {
    await ensureFinanceInfrastructure()

    const projectId = getFinanceProjectId()

    const rows = await runFinanceQuery<AccountRow>(`
      WITH latest_statement_balance AS (
        SELECT
          period.account_id,
          statement_row.balance AS current_balance,
          COALESCE(statement_row.value_date, statement_row.transaction_date) AS balance_as_of,
          ROW_NUMBER() OVER (
            PARTITION BY period.account_id
            ORDER BY COALESCE(statement_row.value_date, statement_row.transaction_date) DESC, statement_row.created_at DESC, statement_row.row_id DESC
          ) AS row_number
        FROM \`${projectId}.greenhouse.fin_bank_statement_rows\` AS statement_row
        INNER JOIN \`${projectId}.greenhouse.fin_reconciliation_periods\` period
          ON period.period_id = statement_row.period_id
        WHERE statement_row.balance IS NOT NULL
      ),
      latest_period_close AS (
        SELECT
          account_id,
          closing_balance_bank AS current_balance,
          DATE_SUB(DATE_ADD(DATE(year, month, 1), INTERVAL 1 MONTH), INTERVAL 1 DAY) AS balance_as_of,
          ROW_NUMBER() OVER (
            PARTITION BY account_id
            ORDER BY year DESC, month DESC, updated_at DESC, period_id DESC
          ) AS row_number
        FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
        WHERE closing_balance_bank IS NOT NULL
      )
      SELECT
        account.account_id, account.account_name, account.bank_name, account.account_number,
        account.currency, account.account_type, account.country, account.is_active,
        account.opening_balance, account.opening_balance_date, account.notes,
        account.created_at, account.updated_at,
        COALESCE(statement_balance.current_balance, period_close.current_balance, account.opening_balance) AS current_balance,
        COALESCE(statement_balance.balance_as_of, period_close.balance_as_of, account.opening_balance_date) AS balance_as_of,
        CASE
          WHEN statement_balance.current_balance IS NOT NULL THEN 'statement'
          WHEN period_close.current_balance IS NOT NULL THEN 'period_close'
          ELSE 'opening_balance'
        END AS balance_source
      FROM \`${projectId}.greenhouse.fin_accounts\` AS account
      LEFT JOIN latest_statement_balance AS statement_balance
        ON statement_balance.account_id = account.account_id
        AND statement_balance.row_number = 1
      LEFT JOIN latest_period_close AS period_close
        ON period_close.account_id = account.account_id
        AND period_close.row_number = 1
      WHERE account.is_active = TRUE
      ORDER BY account.account_name ASC
    `)

    return NextResponse.json({
      items: rows.map(normalizeAccount),
      total: rows.length
    })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const accountId = assertNonEmptyString(body.accountId, 'accountId')
    const accountName = assertNonEmptyString(body.accountName, 'accountName')
    const bankName = assertNonEmptyString(body.bankName, 'bankName')
    const currency = assertValidCurrency(body.currency)

    const accountType = (body.accountType && ACCOUNT_TYPES.includes(body.accountType))
      ? body.accountType as AccountType
      : 'checking'

    const country = normalizeString(body.country) || 'CL'
    const openingBalance = toNumber(body.openingBalance)
    const openingBalanceDate = body.openingBalanceDate ? normalizeString(body.openingBalanceDate) : null
    const notes = body.notes ? normalizeString(body.notes) : null

    try {
      await createFinanceAccountInPostgres({
        accountId,
        accountName,
        bankName,
        accountNumber: body.accountNumber ? normalizeString(body.accountNumber) : null,
        accountNumberFull: body.accountNumberFull ? normalizeString(body.accountNumberFull) : null,
        currency,
        accountType,
        country,
        openingBalance,
        openingBalanceDate,
        notes,
        actorUserId: tenant.userId || null
      })
    } catch (error) {
      if (!shouldFallbackFromFinancePostgres(error)) {
        throw error
      }

      await ensureFinanceInfrastructure()
      const projectId = getFinanceProjectId()

      await runFinanceQuery(`
        INSERT INTO \`${projectId}.greenhouse.fin_accounts\` (
          account_id, account_name, bank_name,
          account_number, account_number_full,
          currency, account_type, country, is_active,
          opening_balance, opening_balance_date, notes,
          created_at, updated_at
        ) VALUES (
          @accountId, @accountName, @bankName,
          @accountNumber, @accountNumberFull,
          @currency, @accountType, @country, TRUE,
          CAST(@openingBalance AS NUMERIC), IF(@openingBalanceDate = '', NULL, CAST(@openingBalanceDate AS DATE)), @notes,
          CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
        )
      `, {
        accountId,
        accountName,
        bankName,
        accountNumber: body.accountNumber ? normalizeString(body.accountNumber) : null,
        accountNumberFull: body.accountNumberFull ? normalizeString(body.accountNumberFull) : null,
        currency,
        accountType,
        country,
        openingBalance,
        openingBalanceDate,
        notes
      })
    }

    return NextResponse.json({ accountId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
