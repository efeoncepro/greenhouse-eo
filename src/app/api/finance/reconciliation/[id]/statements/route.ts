import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  runFinanceQuery,
  getFinanceProjectId,
  assertNonEmptyString,
  assertDateString,
  normalizeString,
  toNumber,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface StatementInput {
  transactionDate: string
  valueDate?: string
  description: string
  reference?: string
  amount: number
  balance?: number
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: periodId } = await params
    const body = await request.json()
    const projectId = getFinanceProjectId()

    // Verify period exists
    const existing = await runFinanceQuery<{ period_id: string; status: string }>(`
      SELECT period_id, status
      FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
      WHERE period_id = @periodId
    `, { periodId })

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
    }

    if (existing[0].status === 'reconciled' || existing[0].status === 'closed') {
      throw new FinanceValidationError('Cannot import statements into a reconciled or closed period.', 409)
    }

    const rows: StatementInput[] = Array.isArray(body.rows) ? body.rows : []

    if (rows.length === 0) {
      throw new FinanceValidationError('At least one statement row is required.')
    }

    if (rows.length > 500) {
      throw new FinanceValidationError('Maximum 500 rows per import.')
    }

    // Insert rows one by one (BigQuery doesn't support multi-row INSERT with params easily)
    let imported = 0

    for (const row of rows) {
      const transactionDate = assertDateString(row.transactionDate, 'transactionDate')
      const description = assertNonEmptyString(row.description, 'description')
      const amount = toNumber(row.amount)
      const rowId = `${periodId}_${String(imported + 1).padStart(4, '0')}`

      await runFinanceQuery(`
        INSERT INTO \`${projectId}.greenhouse.fin_bank_statement_rows\` (
          row_id, period_id, transaction_date, value_date,
          description, reference, amount, balance,
          match_status, created_at
        ) VALUES (
          @rowId, @periodId, @transactionDate, @valueDate,
          @description, @reference, @amount, @balance,
          'unmatched', CURRENT_TIMESTAMP()
        )
      `, {
        rowId,
        periodId,
        transactionDate,
        valueDate: row.valueDate ? normalizeString(row.valueDate) : null,
        description,
        reference: row.reference ? normalizeString(row.reference) : null,
        amount,
        balance: row.balance !== undefined ? toNumber(row.balance) : null
      })

      imported++
    }

    // Update period metadata
    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_reconciliation_periods\`
      SET
        statement_imported = TRUE,
        statement_imported_at = CURRENT_TIMESTAMP(),
        statement_row_count = @rowCount,
        status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
        updated_at = CURRENT_TIMESTAMP()
      WHERE period_id = @periodId
    `, { periodId, rowCount: imported })

    return NextResponse.json({ periodId, imported }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
