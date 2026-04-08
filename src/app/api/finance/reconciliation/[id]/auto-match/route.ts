import { NextResponse } from 'next/server'

import {
  assertReconciliationPeriodIsMutableFromPostgres,
  listReconciliationCandidatesFromPostgres,
  listUnmatchedStatementRowsFromPostgres,
  setReconciliationLinkInPostgres,
  updateStatementRowMatchInPostgres
} from '@/lib/finance/postgres-reconciliation'
import { FinanceValidationError, normalizeString, toDateString, toNumber } from '@/lib/finance/shared'
import type { ReconciliationCandidate } from '@/lib/finance/reconciliation'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface UnmatchedRow {
  row_id: string
  transaction_date: unknown
  description: string
  reference: string | null
  amount: unknown
}

const amountMatches = (statementAmount: number, candidateAmount: number) => Math.abs(statementAmount - candidateAmount) <= 1

const dateMatchesWithinWindow = (statementDate: string | null, candidateDate: string | null, windowDays = 3) => {
  if (!statementDate || !candidateDate) return false

  const statementTime = new Date(`${statementDate}T00:00:00Z`).getTime()
  const candidateTime = new Date(`${candidateDate}T00:00:00Z`).getTime()

  if (!Number.isFinite(statementTime) || !Number.isFinite(candidateTime)) {
    return false
  }

  return Math.abs(statementTime - candidateTime) <= windowDays * 24 * 60 * 60 * 1000
}

const hasPartialReferenceMatch = (statementText: string, candidateReference: string | null) => {
  if (!statementText || !candidateReference) return false

  const normalizedReference = candidateReference.toLowerCase()

  if (statementText.includes(normalizedReference) || normalizedReference.includes(statementText)) {
    return true
  }

  const shortReference = normalizedReference.slice(0, Math.min(4, normalizedReference.length))

  return shortReference.length >= 4 && statementText.includes(shortReference)
}

const runAutoMatchAlgorithm = async ({
  unmatchedRows,
  candidates,
  periodId,
  actorUserId
}: {
  unmatchedRows: UnmatchedRow[]
  candidates: ReconciliationCandidate[]
  periodId: string
  actorUserId: string | null
}) => {
  let matched = 0
  let suggested = 0
  const matchedCandidateIds = new Set<string>()

  for (const row of unmatchedRows) {
    const rowAmount = toNumber(row.amount)
    const rowDate = toDateString(row.transaction_date as string | { value?: string } | null)
    const rowText = `${normalizeString(row.description)} ${row.reference ? normalizeString(row.reference) : ''}`.trim().toLowerCase()
    let bestMatch: { candidate: ReconciliationCandidate; confidence: number } | null = null
    let bestMatchCount = 0

    for (const candidate of candidates) {
      if (matchedCandidateIds.has(candidate.id)) continue
      if (!amountMatches(rowAmount, candidate.amount)) continue

      const dateMatch = dateMatchesWithinWindow(rowDate, candidate.transactionDate)
      let confidence = 0

      if (rowText.includes(candidate.id.toLowerCase()) || hasPartialReferenceMatch(rowText, candidate.reference)) {
        confidence = 0.95
      } else if (dateMatch && hasPartialReferenceMatch(rowText, candidate.reference)) {
        confidence = 0.85
      } else if (dateMatch) {
        confidence = 0.7
      }

      if (confidence === 0) continue

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { candidate, confidence }
        bestMatchCount = 1
      } else if (bestMatch && confidence === bestMatch.confidence) {
        bestMatchCount += 1
      }
    }

    if (!bestMatch || bestMatchCount !== 1) continue

    const autoMatched = bestMatch.confidence >= 0.85
    const matchStatus = autoMatched ? 'auto_matched' : 'suggested'
    const matchedRecordId = bestMatch.candidate.matchedRecordId || bestMatch.candidate.id
    const matchedPaymentId = bestMatch.candidate.matchedPaymentId || null
    const matchedSettlementLegId = bestMatch.candidate.matchedSettlementLegId || null
    const rowId = normalizeString(row.row_id)

    await updateStatementRowMatchInPostgres(rowId, periodId, {
      matchStatus,
      matchedType: bestMatch.candidate.type,
      matchedId: matchedRecordId,
      matchedPaymentId,
      matchedSettlementLegId,
      matchConfidence: bestMatch.confidence,
      matchedByUserId: autoMatched ? actorUserId || 'auto' : null
    })

    if (!autoMatched) {
      suggested++

      continue
    }

    await setReconciliationLinkInPostgres({
      matchedType: bestMatch.candidate.type,
      matchedId: matchedRecordId,
      matchedPaymentId,
      matchedSettlementLegId,
      rowId,
      matchedBy: actorUserId || 'auto'
    })

    matchedCandidateIds.add(bestMatch.candidate.id)
    matched++
  }

  return { matched, suggested }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const unmatchedRows: UnmatchedRow[] = pgUnmatched.map(row => ({
      row_id: row.row_id,
      transaction_date: row.transaction_date,
      description: row.description,
      reference: row.reference,
      amount: row.amount
    }))

    const { matched, suggested } = await runAutoMatchAlgorithm({
      unmatchedRows,
      candidates,
      periodId,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json({
      matched,
      suggested,
      unmatched: unmatchedRows.length - matched - suggested,
      total: unmatchedRows.length
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
