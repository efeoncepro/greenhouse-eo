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
    const matchedType = assertNonEmptyString(body.matchedType, 'matchedType')
    const matchedId = assertNonEmptyString(body.matchedId, 'matchedId')

    if (!['income', 'expense'].includes(matchedType)) {
      throw new FinanceValidationError('matchedType must be "income" or "expense".')
    }

    const projectId = getFinanceProjectId()

    // Verify the statement row exists and belongs to this period
    const rows = await runFinanceQuery<{ row_id: string; match_status: string }>(`
      SELECT row_id, match_status
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE row_id = @rowId AND period_id = @periodId
    `, { rowId, periodId })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    // Verify the target record exists
    const targetTable = matchedType === 'income' ? 'fin_income' : 'fin_expenses'
    const targetIdCol = matchedType === 'income' ? 'income_id' : 'expense_id'

    const targets = await runFinanceQuery<{ id: string }>(`
      SELECT ${targetIdCol} AS id
      FROM \`${projectId}.greenhouse.${targetTable}\`
      WHERE ${targetIdCol} = @matchedId
    `, { matchedId })

    if (targets.length === 0) {
      throw new FinanceValidationError(`${matchedType} record "${matchedId}" not found.`, 404)
    }

    // Update the statement row
    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
      SET
        match_status = 'manual_matched',
        matched_type = @matchedType,
        matched_id = @matchedId,
        match_confidence = 1.0,
        matched_by = @matchedBy,
        matched_at = CURRENT_TIMESTAMP(),
        notes = @notes
      WHERE row_id = @rowId AND period_id = @periodId
    `, {
      matchedType,
      matchedId,
      matchedBy: tenant.userId || null,
      notes: body.notes ? normalizeString(body.notes) : null,
      rowId,
      periodId
    })

    // Mark the income/expense as reconciled
    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.${targetTable}\`
      SET is_reconciled = TRUE, reconciliation_id = @rowId, updated_at = CURRENT_TIMESTAMP()
      WHERE ${targetIdCol} = @matchedId
    `, { matchedId, rowId })

    return NextResponse.json({
      matched: true,
      rowId,
      matchedType,
      matchedId,
      matchStatus: 'manual_matched'
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
