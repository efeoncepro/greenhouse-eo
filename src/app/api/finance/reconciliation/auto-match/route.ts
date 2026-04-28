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
    const accountIdFilter = body.accountId ? normalizeString(body.accountId) : null

    if (fromDate > toDate) {
      throw new FinanceValidationError('fromDate must be on or before toDate.')
    }

    const unmatched = await listUnmatchedStatementRowsByDateRangeFromPostgres({
      fromDate,
      toDate,
      accountId: accountIdFilter
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

    // TASK-708 Slice 3 — auto-match SIEMPRE corre con scoping por cuenta. Si el
    // caller no provee accountId, agrupamos las unmatched rows por su account_id
    // (heredado del period_id FK) y corremos el resolver una vez por cuenta.
    // Cero leakage cross-account: cada bank statement row solo se matchea contra
    // candidates de SU cuenta.
    const rowsByAccount = new Map<string, typeof unmatched>()

    for (const row of unmatched) {
      const list = rowsByAccount.get(row.account_id) ?? []

      list.push(row)
      rowsByAccount.set(row.account_id, list)
    }

    let totalApplied = 0
    let totalSuggested = 0
    let totalRows = 0

    for (const [accountId, accountRows] of rowsByAccount) {
      const { items: candidates } = await listReconciliationCandidatesByDateRangeFromPostgres({
        accountId,
        startDate: fromDate,
        endDate: toDate,
        type: 'all',
        limit: 400
      })

      const rows: AutoMatchRow[] = accountRows.map(row => ({
        rowId: row.row_id,
        transactionDate: row.transaction_date,
        description: row.description,
        reference: row.reference,
        amount: row.amount
      }))

      totalRows += rows.length

      const rowPeriodMap = new Map<string, string>(
        accountRows.map(row => [row.row_id, row.period_id])
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

      totalApplied += applied
      totalSuggested += suggested
    }

    return NextResponse.json({
      matched: totalApplied,
      suggested: totalSuggested,
      unmatched: totalRows - totalApplied - totalSuggested,
      total: totalRows,
      accounts: Array.from(rowsByAccount.keys()),
      window: { fromDate, toDate, accountId: accountIdFilter }
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
