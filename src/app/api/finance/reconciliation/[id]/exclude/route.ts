import { NextResponse } from 'next/server'

import { clearReconciliationLink, getReconciliationPeriodContext } from '@/lib/finance/reconciliation'
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
    const notes = body.notes ? normalizeString(body.notes) : null

    const period = await getReconciliationPeriodContext(periodId)

    if (period.status === 'reconciled' || period.status === 'closed') {
      throw new FinanceValidationError('Cannot exclude rows from a reconciled or closed period.', 409)
    }

    const projectId = getFinanceProjectId()

    const rows = await runFinanceQuery<{
      row_id: string
      matched_type: string | null
      matched_id: string | null
    }>(`
      SELECT row_id, matched_type, matched_id
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE row_id = @rowId AND period_id = @periodId
      LIMIT 1
    `, { rowId, periodId })

    const row = rows[0]

    if (!row) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    const previousMatchedType = normalizeString(row.matched_type)
    const previousMatchedId = normalizeString(row.matched_id)

    if (previousMatchedType && previousMatchedId) {
      await clearReconciliationLink({
        matchedType: previousMatchedType,
        matchedId: previousMatchedId,
        rowId
      })
    }

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
      SET
        match_status = 'excluded',
        matched_type = NULL,
        matched_id = NULL,
        match_confidence = NULL,
        matched_by = @matchedBy,
        matched_at = CURRENT_TIMESTAMP(),
        notes = @notes
      WHERE row_id = @rowId AND period_id = @periodId
    `, {
      rowId,
      periodId,
      matchedBy: tenant.userId || null,
      notes
    })

    return NextResponse.json({
      excluded: true,
      rowId,
      previousMatchedType: previousMatchedType || null,
      previousMatchedId: previousMatchedId || null
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
