import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
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

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const RECENT_WINDOW_DAYS = 7

/**
 * Continuous auto-match daily fallback (TASK-401).
 * Runs 08:00 CLT (~15 min after the Nubox sync) and attempts to auto-match any bank
 * statement rows from the last N days that are still in 'unmatched' status. This
 * covers syncs that arrive late or out-of-order without requiring a user to open
 * a monthly period.
 *
 * Idempotent: already-matched rows are excluded by the SQL filter (`match_status = 'unmatched'`).
 */
export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  const today = new Date()
  const toDate = today.toISOString().slice(0, 10)

  const fromDate = new Date(today.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  try {
    const unmatched = await listUnmatchedStatementRowsByDateRangeFromPostgres({ fromDate, toDate })

    if (unmatched.length === 0) {
      return NextResponse.json({ matched: 0, suggested: 0, total: 0, window: { fromDate, toDate } })
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

    const rowPeriodMap = new Map<string, string>(unmatched.map(row => [row.row_id, row.period_id]))

    const scoring = scoreAutoMatches({ unmatchedRows: rows, candidates })

    const { applied, suggested } = await persistAutoMatchDecisions({
      decisions: scoring.decisions,
      rowPeriodMap,
      actorUserId: null,
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

    console.log(
      `[reconciliation-auto-match] ${fromDate}..${toDate}: applied=${applied} suggested=${suggested} total=${rows.length}`
    )

    return NextResponse.json({
      matched: applied,
      suggested,
      unmatched: rows.length - applied - suggested,
      total: rows.length,
      window: { fromDate, toDate }
    })
  } catch (error) {
    console.error('[reconciliation-auto-match] run failed:', error)
    await alertCronFailure('reconciliation-auto-match', error)

    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
