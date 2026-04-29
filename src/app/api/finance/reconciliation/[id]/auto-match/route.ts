import { NextResponse } from 'next/server'

import {
  persistAutoMatchDecisions,
  scoreAutoMatches,
  type AutoMatchRow
} from '@/lib/finance/auto-match'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  listReconciliationCandidatesFromPostgres,
  listUnmatchedStatementRowsFromPostgres,
  setReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { can } from '@/lib/entitlements/runtime'
import { FinanceValidationError } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * Period-scoped auto-match (existing monthly close flow).
 * Delegates to the shared scoring engine in `src/lib/finance/auto-match.ts`.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-722 — granular guard.
  if (!can(tenant, 'finance.reconciliation.match', 'create', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para ejecutar auto-match.' }, { status: 403 })
  }

  try {
    const { id: periodId } = await params

    await assertReconciliationPeriodIsMutableFromPostgres(periodId)

    const pgUnmatched = await listUnmatchedStatementRowsFromPostgres(periodId)

    if (pgUnmatched.length === 0) {
      return NextResponse.json({ matched: 0, suggested: 0, message: 'No unmatched rows to process.' })
    }

    const { items: candidates } = await listReconciliationCandidatesFromPostgres({
      periodId,
      type: 'all',
      limit: 400,
      windowDays: 45
    })

    const rows: AutoMatchRow[] = pgUnmatched.map(row => ({
      rowId: row.row_id,
      transactionDate: row.transaction_date,
      description: row.description,
      reference: row.reference,
      amount: row.amount
    }))

    const rowPeriodMap = new Map<string, string>(pgUnmatched.map(row => [row.row_id, periodId]))

    const scoring = scoreAutoMatches({ unmatchedRows: rows, candidates })

    const { applied, suggested } = await persistAutoMatchDecisions({
      decisions: scoring.decisions,
      rowPeriodMap,
      actorUserId: tenant.userId || null,
      callbacks: {
        updateStatementRow: async input => {
          await updateStatementRowMatchInPostgres(input.rowId, input.periodId, {
            matchStatus: input.matchStatus,
            matchedType: input.matchedType,
            matchedId: input.matchedId,
            matchedPaymentId: input.matchedPaymentId,
            matchedSettlementLegId: input.matchedSettlementLegId,
            matchConfidence: input.matchConfidence,
            matchedByUserId: input.matchedByUserId
          })
        },
        setReconciliationLink: async input => {
          await setReconciliationLinkInPostgres({
            matchedType: input.matchedType,
            matchedId: input.matchedId,
            matchedPaymentId: input.matchedPaymentId,
            matchedSettlementLegId: input.matchedSettlementLegId,
            rowId: input.rowId,
            matchedBy: input.matchedBy
          })
        }
      }
    })

    return NextResponse.json({
      matched: applied,
      suggested,
      unmatched: rows.length - applied - suggested,
      total: rows.length
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
