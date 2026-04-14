import { NextResponse } from 'next/server'

import {
  persistAutoMatchDecisions,
  scoreAutoMatches,
  type AutoMatchRow
} from '@/lib/finance/auto-match'
import {
  listReconciliationCandidatesByDateRangeFromPostgres,
  listUnmatchedStatementRowsByDateRangeFromPostgres,
  setReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const assertDateString = (value: unknown, field: string): string => {
  const s = normalizeString(value)

  if (!DATE_PATTERN.test(s)) {
    throw new FinanceValidationError(`${field} must be YYYY-MM-DD.`)
  }

  return s
}

/**
 * Standalone continuous auto-match endpoint (TASK-401).
 * Unlike [id]/auto-match, this is NOT bound to a reconciliation_period. It accepts an
 * arbitrary date range (and optional account filter) and matches unmatched bank statement
 * rows against income/expense candidates using the same scoring engine.
 *
 * Body: { fromDate: 'YYYY-MM-DD', toDate: 'YYYY-MM-DD', accountId?: string }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const fromDate = assertDateString(body.fromDate, 'fromDate')
    const toDate = assertDateString(body.toDate, 'toDate')
    const accountId = body.accountId ? normalizeString(body.accountId) : null

    if (fromDate > toDate) {
      throw new FinanceValidationError('fromDate must be on or before toDate.')
    }

    const unmatched = await listUnmatchedStatementRowsByDateRangeFromPostgres({
      fromDate,
      toDate,
      accountId
    })

    if (unmatched.length === 0) {
      return NextResponse.json({
        matched: 0,
        suggested: 0,
        unmatched: 0,
        total: 0,
        message: 'No unmatched rows in window.'
      })
    }

    const { items: candidates } = await listReconciliationCandidatesByDateRangeFromPostgres({
      startDate: fromDate,
      endDate: toDate,
      type: 'all',
      limit: 400
    })

    const rows: AutoMatchRow[] = unmatched.map(row => ({
      rowId: row.row_id,
      transactionDate: row.transaction_date,
      description: row.description,
      reference: row.reference,
      amount: row.amount
    }))

    const rowPeriodMap = new Map<string, string>(
      unmatched.map(row => [row.row_id, row.period_id])
    )

    const scoring = scoreAutoMatches({ unmatchedRows: rows, candidates })

    const { applied, suggested } = await persistAutoMatchDecisions({
      decisions: scoring.decisions,
      rowPeriodMap,
      actorUserId: tenant.userId || null,
      callbacks: {
        updateStatementRow: async ({
          rowId,
          periodId,
          matchStatus,
          matchedType,
          matchedId,
          matchedPaymentId,
          matchedSettlementLegId,
          matchConfidence,
          matchedByUserId
        }) => {
          await updateStatementRowMatchInPostgres(rowId, periodId, {
            matchStatus,
            matchedType,
            matchedId,
            matchedPaymentId,
            matchedSettlementLegId,
            matchConfidence,
            matchedByUserId
          })
        },
        setReconciliationLink: async ({
          matchedType,
          matchedId,
          matchedPaymentId,
          matchedSettlementLegId,
          rowId,
          matchedBy
        }) => {
          await setReconciliationLinkInPostgres({
            matchedType,
            matchedId,
            matchedPaymentId,
            matchedSettlementLegId,
            rowId,
            matchedBy
          })
        }
      }
    })

    return NextResponse.json({
      matched: applied,
      suggested,
      unmatched: rows.length - applied - suggested,
      total: rows.length,
      window: { fromDate, toDate, accountId }
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
