import 'server-only'

import { persistAutoMatchDecisions, scoreAutoMatches, type AutoMatchRow } from '@/lib/finance/auto-match'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  listReconciliationCandidatesFromPostgres,
  listUnmatchedStatementRowsFromPostgres,
  setReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres
} from '@/lib/finance/postgres-reconciliation'

export interface RunPeriodAutoMatchResult {
  matched: number
  suggested: number
  unmatched: number
  total: number
}

/**
 * Auto-match de un período de conciliación (command canónico, Full API
 * Parity). Lo consumen `POST /api/finance/reconciliation/[id]/auto-match` y
 * la CLI `pnpm finance:import-statement --auto-match`; ninguno reimplementa
 * el pipeline (unmatched → candidatos ±45d → scoring → persistencia).
 */
export const runPeriodAutoMatch = async ({
  periodId,
  actorUserId
}: {
  periodId: string
  actorUserId: string | null
}): Promise<RunPeriodAutoMatchResult> => {
  await assertReconciliationPeriodIsMutableFromPostgres(periodId)

  const pgUnmatched = await listUnmatchedStatementRowsFromPostgres(periodId)

  if (pgUnmatched.length === 0) {
    return { matched: 0, suggested: 0, unmatched: 0, total: 0 }
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
    actorUserId,
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

  return {
    matched: applied,
    suggested,
    unmatched: rows.length - applied - suggested,
    total: rows.length
  }
}
