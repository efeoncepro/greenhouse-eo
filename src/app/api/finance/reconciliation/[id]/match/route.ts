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
import { clearReconciliationLink, setReconciliationLink } from '@/lib/finance/reconciliation'

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
    const rows = await runFinanceQuery<{
      row_id: string
      match_status: string
      matched_type: string | null
      matched_id: string | null
    }>(`
      SELECT row_id, match_status, matched_type, matched_id
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE row_id = @rowId AND period_id = @periodId
    `, { rowId, periodId })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    // Verify the target record exists
    const targetTable = matchedType === 'income' ? 'fin_income' : 'fin_expenses'
    const targetIdCol = matchedType === 'income' ? 'income_id' : 'expense_id'

    const targets = await runFinanceQuery<{
      id: string
      is_reconciled: boolean
      reconciliation_id: string | null
    }>(`
      SELECT ${targetIdCol} AS id, is_reconciled, reconciliation_id
      FROM \`${projectId}.greenhouse.${targetTable}\`
      WHERE ${targetIdCol} = @matchedId
    `, { matchedId })

    if (targets.length === 0) {
      throw new FinanceValidationError(`${matchedType} record "${matchedId}" not found.`, 404)
    }

    const target = targets[0]

    if (target.is_reconciled && normalizeString(target.reconciliation_id) !== rowId) {
      throw new FinanceValidationError(`${matchedType} record "${matchedId}" is already reconciled to another statement row.`, 409)
    }

    const currentRow = rows[0]
    const previousMatchedType = normalizeString(currentRow.matched_type)
    const previousMatchedId = normalizeString(currentRow.matched_id)

    if (previousMatchedType && previousMatchedId && (previousMatchedType !== matchedType || previousMatchedId !== matchedId)) {
      await clearReconciliationLink({
        matchedType: previousMatchedType,
        matchedId: previousMatchedId,
        rowId
      })
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

    await setReconciliationLink({
      matchedType: matchedType as 'income' | 'expense',
      matchedId,
      rowId
    })

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
