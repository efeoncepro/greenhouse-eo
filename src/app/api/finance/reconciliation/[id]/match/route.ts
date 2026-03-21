import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  getStatementRowFromPostgres,
  resolveReconciliationTargetFromPostgres,
  clearReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres,
  setReconciliationLinkInPostgres
} from '@/lib/finance/postgres-reconciliation'
import {
  FinanceValidationError,
  assertNonEmptyString,
  getFinanceProjectId,
  normalizeString,
  runFinanceQuery
} from '@/lib/finance/shared'
import {
  assertReconciliationPeriodIsMutable,
  clearReconciliationLink,
  resolveReconciliationTarget,
  setReconciliationLink
} from '@/lib/finance/reconciliation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json()
    const rowId = assertNonEmptyString(body.rowId, 'rowId')
    const matchedType = assertNonEmptyString(body.matchedType, 'matchedType')
    const matchedId = assertNonEmptyString(body.matchedId, 'matchedId')
    const matchedPaymentId = body.matchedPaymentId ? assertNonEmptyString(body.matchedPaymentId, 'matchedPaymentId') : null

    if (!['income', 'expense'].includes(matchedType)) {
      throw new FinanceValidationError('matchedType must be "income" or "expense".')
    }

    // ── Postgres-first path ──
    try {
      await assertReconciliationPeriodIsMutableFromPostgres(periodId)

      const currentRow = await getStatementRowFromPostgres(rowId, periodId)

      if (!currentRow) {
        return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
      }

      const target = await resolveReconciliationTargetFromPostgres({
        matchedType: matchedType as 'income' | 'expense',
        matchedId,
        matchedPaymentId
      })

      if (target.isReconciled && normalizeString(target.reconciliationId) !== rowId) {
        throw new FinanceValidationError(
          `${matchedType} target "${target.candidateId}" is already reconciled to another statement row.`,
          409
        )
      }

      const previousMatchedType = normalizeString(currentRow.matched_type)
      const previousMatchedId = normalizeString(currentRow.matched_id)
      const previousMatchedPaymentId = normalizeString(currentRow.matched_payment_id)

      const targetChanged = (
        previousMatchedType !== matchedType
        || previousMatchedId !== target.matchedRecordId
        || previousMatchedPaymentId !== (target.matchedPaymentId || '')
      )

      if (previousMatchedType && previousMatchedId && targetChanged) {
        await clearReconciliationLinkInPostgres({
          matchedType: previousMatchedType,
          matchedId: previousMatchedId,
          matchedPaymentId: previousMatchedPaymentId || null,
          rowId
        })
      }

      await updateStatementRowMatchInPostgres(rowId, periodId, {
        matchStatus: 'manual_matched',
        matchedType,
        matchedId: target.matchedRecordId,
        matchedPaymentId: target.matchedPaymentId,
        matchConfidence: 1.0,
        matchedByUserId: tenant.userId || null,
        notes: body.notes ? normalizeString(body.notes) : null
      })

      await setReconciliationLinkInPostgres({
        matchedType: matchedType as 'income' | 'expense',
        matchedId: target.matchedRecordId,
        matchedPaymentId: target.matchedPaymentId,
        rowId,
        matchedBy: tenant.userId || null
      })

      return NextResponse.json({
        matched: true,
        rowId,
        matchedType,
        matchedId: target.candidateId,
        matchedRecordId: target.matchedRecordId,
        matchedPaymentId: target.matchedPaymentId,
        matchStatus: 'manual_matched'
      })
    } catch (error) {
      if (!shouldFallbackFromFinancePostgres(error)) {
        throw error
      }
    }

    // ── BigQuery fallback ──
    await ensureFinanceInfrastructure()

    await assertReconciliationPeriodIsMutable(periodId)

    const projectId = getFinanceProjectId()

    const rows = await runFinanceQuery<{
      row_id: string
      match_status: string
      matched_type: string | null
      matched_id: string | null
      matched_payment_id: string | null
    }>(`
      SELECT row_id, match_status, matched_type, matched_id, matched_payment_id
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE row_id = @rowId AND period_id = @periodId
    `, { rowId, periodId })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Statement row not found in this period' }, { status: 404 })
    }

    const target = await resolveReconciliationTarget({
      matchedType: matchedType as 'income' | 'expense',
      matchedId,
      matchedPaymentId
    })

    if (target.isReconciled && normalizeString(target.reconciliationId) !== rowId) {
      throw new FinanceValidationError(
        `${matchedType} target "${target.candidateId}" is already reconciled to another statement row.`,
        409
      )
    }

    const currentRow = rows[0]
    const previousMatchedType = normalizeString(currentRow.matched_type)
    const previousMatchedId = normalizeString(currentRow.matched_id)
    const previousMatchedPaymentId = normalizeString(currentRow.matched_payment_id)

    const targetChanged = (
      previousMatchedType !== matchedType
      || previousMatchedId !== target.matchedRecordId
      || previousMatchedPaymentId !== (target.matchedPaymentId || '')
    )

    if (previousMatchedType && previousMatchedId && targetChanged) {
      await clearReconciliationLink({
        matchedType: previousMatchedType,
        matchedId: previousMatchedId,
        matchedPaymentId: previousMatchedPaymentId || null,
        rowId
      })
    }

    await runFinanceQuery(`
      UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
      SET
        match_status = 'manual_matched',
        matched_type = @matchedType,
        matched_id = @matchedId,
        matched_payment_id = @matchedPaymentId,
        match_confidence = 1.0,
        matched_by = @matchedBy,
        matched_at = CURRENT_TIMESTAMP(),
        notes = @notes
      WHERE row_id = @rowId AND period_id = @periodId
    `, {
      matchedType,
      matchedId: target.matchedRecordId,
      matchedPaymentId: target.matchedPaymentId,
      matchedBy: tenant.userId || null,
      notes: body.notes ? normalizeString(body.notes) : null,
      rowId,
      periodId
    })

    await setReconciliationLink({
      matchedType: matchedType as 'income' | 'expense',
      matchedId: target.matchedRecordId,
      matchedPaymentId: target.matchedPaymentId,
      rowId,
      matchedBy: tenant.userId || null
    })

    return NextResponse.json({
      matched: true,
      rowId,
      matchedType,
      matchedId: target.candidateId,
      matchedRecordId: target.matchedRecordId,
      matchedPaymentId: target.matchedPaymentId,
      matchStatus: 'manual_matched'
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
