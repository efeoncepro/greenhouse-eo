import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toTimestampString,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface PeriodRow {
  period_id: string
  account_id: string
  year: unknown
  month: unknown
  opening_balance: unknown
  closing_balance_bank: unknown
  closing_balance_system: unknown
  difference: unknown
  status: string
  statement_imported: boolean
  statement_imported_at: unknown
  statement_row_count: unknown
  reconciled_by: string | null
  reconciled_at: unknown
  notes: string | null
  created_at: unknown
  updated_at: unknown
}

const normalizePeriod = (row: PeriodRow) => ({
  periodId: normalizeString(row.period_id),
  accountId: normalizeString(row.account_id),
  year: toNumber(row.year),
  month: toNumber(row.month),
  openingBalance: toNumber(row.opening_balance),
  closingBalanceBank: toNumber(row.closing_balance_bank),
  closingBalanceSystem: toNumber(row.closing_balance_system),
  difference: toNumber(row.difference),
  status: normalizeString(row.status),
  statementImported: normalizeBoolean(row.statement_imported),
  statementImportedAt: toTimestampString(row.statement_imported_at as string | { value?: string } | null),
  statementRowCount: toNumber(row.statement_row_count),
  reconciledBy: row.reconciled_by ? normalizeString(row.reconciled_by) : null,
  reconciledAt: toTimestampString(row.reconciled_at as string | { value?: string } | null),
  notes: row.notes ? normalizeString(row.notes) : null,
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  updatedAt: toTimestampString(row.updated_at as string | { value?: string } | null)
})

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const status = searchParams.get('status')
  const projectId = getFinanceProjectId()

  let filters = ''
  const params: Record<string, unknown> = {}

  if (accountId) {
    filters += ' AND account_id = @accountId'
    params.accountId = accountId
  }

  if (status) {
    filters += ' AND status = @status'
    params.status = status
  }

  const rows = await runFinanceQuery<PeriodRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
    WHERE TRUE ${filters}
    ORDER BY year DESC, month DESC
    LIMIT 100
  `, params)

  return NextResponse.json({
    items: rows.map(normalizePeriod),
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
    const year = toNumber(body.year)
    const month = toNumber(body.month)

    if (year < 2020 || year > 2100) {
      throw new FinanceValidationError('year must be between 2020 and 2100.')
    }

    if (month < 1 || month > 12) {
      throw new FinanceValidationError('month must be between 1 and 12.')
    }

    const openingBalance = toNumber(body.openingBalance)
    const periodId = `${accountId}_${year}_${String(month).padStart(2, '0')}`
    const projectId = getFinanceProjectId()

    // Check for duplicate
    const existing = await runFinanceQuery<{ period_id: string }>(`
      SELECT period_id
      FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
      WHERE period_id = @periodId
    `, { periodId })

    if (existing.length > 0) {
      throw new FinanceValidationError(`Reconciliation period already exists for ${year}-${String(month).padStart(2, '0')} on account ${accountId}.`, 409)
    }

    await runFinanceQuery(`
      INSERT INTO \`${projectId}.greenhouse.fin_reconciliation_periods\` (
        period_id, account_id, year, month, opening_balance,
        status, statement_imported, statement_row_count,
        notes, created_at, updated_at
      ) VALUES (
        @periodId, @accountId, @year, @month, @openingBalance,
        'open', FALSE, 0,
        @notes, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
      )
    `, {
      periodId,
      accountId,
      year,
      month,
      openingBalance,
      notes: body.notes ? normalizeString(body.notes) : null
    })

    return NextResponse.json({ periodId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
