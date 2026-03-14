import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  normalizeString,
  normalizeBoolean,
  toNumber,
  toDateString,
  toTimestampString,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface PeriodDetailRow {
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

interface StatementRow {
  row_id: string
  transaction_date: unknown
  value_date: unknown
  description: string
  reference: string | null
  amount: unknown
  balance: unknown
  match_status: string
  matched_type: string | null
  matched_id: string | null
  match_confidence: unknown
  notes: string | null
  matched_by: string | null
  matched_at: unknown
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const { id: periodId } = await params
  const projectId = getFinanceProjectId()

  const periods = await runFinanceQuery<PeriodDetailRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
    WHERE period_id = @periodId
  `, { periodId })

  if (periods.length === 0) {
    return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
  }

  const period = periods[0]

  const statements = await runFinanceQuery<StatementRow>(`
    SELECT *
    FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
    WHERE period_id = @periodId
    ORDER BY transaction_date ASC
  `, { periodId })

  return NextResponse.json({
    period: {
      periodId: normalizeString(period.period_id),
      accountId: normalizeString(period.account_id),
      year: toNumber(period.year),
      month: toNumber(period.month),
      openingBalance: toNumber(period.opening_balance),
      closingBalanceBank: toNumber(period.closing_balance_bank),
      closingBalanceSystem: toNumber(period.closing_balance_system),
      difference: toNumber(period.difference),
      status: normalizeString(period.status),
      statementImported: normalizeBoolean(period.statement_imported),
      statementImportedAt: toTimestampString(period.statement_imported_at as string | { value?: string } | null),
      statementRowCount: toNumber(period.statement_row_count),
      reconciledBy: period.reconciled_by ? normalizeString(period.reconciled_by) : null,
      reconciledAt: toTimestampString(period.reconciled_at as string | { value?: string } | null),
      notes: period.notes ? normalizeString(period.notes) : null,
      createdAt: toTimestampString(period.created_at as string | { value?: string } | null),
      updatedAt: toTimestampString(period.updated_at as string | { value?: string } | null)
    },
    statements: statements.map(s => ({
      rowId: normalizeString(s.row_id),
      transactionDate: toDateString(s.transaction_date as string | { value?: string } | null),
      valueDate: toDateString(s.value_date as string | { value?: string } | null),
      description: normalizeString(s.description),
      reference: s.reference ? normalizeString(s.reference) : null,
      amount: toNumber(s.amount),
      balance: toNumber(s.balance),
      matchStatus: normalizeString(s.match_status),
      matchedType: s.matched_type ? normalizeString(s.matched_type) : null,
      matchedId: s.matched_id ? normalizeString(s.matched_id) : null,
      matchConfidence: toNumber(s.match_confidence),
      notes: s.notes ? normalizeString(s.notes) : null,
      matchedBy: s.matched_by ? normalizeString(s.matched_by) : null,
      matchedAt: toTimestampString(s.matched_at as string | { value?: string } | null)
    }))
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: periodId } = await params
    const body = await request.json()
    const projectId = getFinanceProjectId()

    const existing = await runFinanceQuery<{ period_id: string }>(`
      SELECT period_id
      FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
      WHERE period_id = @periodId
    `, { periodId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
    }

    const updates: string[] = []
    const updateParams: Record<string, unknown> = { periodId }

    if (body.closingBalanceBank !== undefined) {
      updates.push('closing_balance_bank = @closingBalanceBank')
      updateParams.closingBalanceBank = toNumber(body.closingBalanceBank)
    }

    if (body.closingBalanceSystem !== undefined) {
      updates.push('closing_balance_system = @closingBalanceSystem')
      updateParams.closingBalanceSystem = toNumber(body.closingBalanceSystem)
    }

    if (body.difference !== undefined) {
      updates.push('difference = @difference')
      updateParams.difference = toNumber(body.difference)
    }

    if (body.status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'reconciled', 'closed']

      updates.push('status = @status')
      updateParams.status = validStatuses.includes(body.status) ? body.status : 'open'

      if (body.status === 'reconciled') {
        updates.push('reconciled_by = @reconciledBy')
        updates.push('reconciled_at = CURRENT_TIMESTAMP()')
        updateParams.reconciledBy = tenant.userId || null
      }
    }

    if (body.notes !== undefined) {
      updates.push('notes = @notes')
      updateParams.notes = body.notes ? normalizeString(body.notes) : null
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP()')

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_reconciliation_periods\`
      SET ${updates.join(', ')}
      WHERE period_id = @periodId
    `, updateParams)

    return NextResponse.json({ periodId, updated: true })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
