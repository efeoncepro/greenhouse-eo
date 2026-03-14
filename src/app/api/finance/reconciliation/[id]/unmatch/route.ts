import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import {
  FinanceValidationError,
  assertNonEmptyString,
  getFinanceProjectId,
  normalizeString,
  runFinanceQuery
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: periodId } = await params
    const body = await request.json()
    const rowId = assertNonEmptyString(body.rowId, 'rowId')

    const projectId = getFinanceProjectId()

    // Get current match info before clearing
    const rows = await runFinanceQuery<{
      row_id: string
      matched_type: string | null
      matched_id: string | null
      match_status: string
    }>(`
      SELECT row_id, matched_type, matched_id, match_status
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE row_id = @rowId AND period_id = @periodId
    `, { rowId, periodId })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    const row = rows[0]

    if (row.match_status === 'unmatched') {
      return NextResponse.json({ error: 'Row is already unmatched' }, { status: 400 })
    }

    const previousType = normalizeString(row.matched_type)
    const previousId = normalizeString(row.matched_id)

    // Clear the match on the statement row
    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
      SET
        match_status = 'unmatched',
        matched_type = NULL,
        matched_id = NULL,
        match_confidence = NULL,
        matched_by = NULL,
        matched_at = NULL
      WHERE row_id = @rowId AND period_id = @periodId
    `, { rowId, periodId })

    // Revert reconciliation on the income/expense if it was matched
    if (previousType && previousId) {
      const targetTable = previousType === 'income' ? 'fin_income' : 'fin_expenses'
      const targetIdCol = previousType === 'income' ? 'income_id' : 'expense_id'

      await runFinanceQuery(`
        UPDATE \`${projectId}.greenhouse.${targetTable}\`
        SET is_reconciled = FALSE, reconciliation_id = NULL, updated_at = CURRENT_TIMESTAMP()
        WHERE ${targetIdCol} = @previousId AND reconciliation_id = @rowId
      `, { previousId, rowId })
    }

    return NextResponse.json({
      unmatched: true,
      rowId,
      previousMatchedType: previousType || null,
      previousMatchedId: previousId || null
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
