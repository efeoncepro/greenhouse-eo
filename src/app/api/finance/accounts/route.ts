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
  notes: row.notes ? normalizeString(row.notes) : null,
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<AccountRow>(`
    SELECT
      account_id, account_name, bank_name, account_number,
      currency, account_type, country, is_active,
      opening_balance, opening_balance_date, notes,
      created_at, updated_at
    FROM \`${projectId}.greenhouse.fin_accounts\`
    WHERE is_active = TRUE
    ORDER BY account_name ASC
  `)

  return NextResponse.json({
    items: rows.map(normalizeAccount),
    total: rows.length
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

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

    return NextResponse.json({ accountId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
