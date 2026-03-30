import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { shouldFallbackFromFinancePostgres } from '@/lib/finance/postgres-store'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'
import {
  assertReconciliationPeriodIsMutableFromPostgres,
  listUnmatchedStatementRowsFromPostgres,
  listReconciliationCandidatesFromPostgres,
  updateStatementRowMatchInPostgres,
  setReconciliationLinkInPostgres
} from '@/lib/finance/postgres-reconciliation'
import {
  runFinanceQuery,
  getFinanceProjectId,
  normalizeString,
  toNumber,
  toDateString,
  FinanceValidationError
} from '@/lib/finance/shared'
import {
  assertReconciliationPeriodIsMutable,
  listReconciliationCandidates,
  setReconciliationLink,
  type ReconciliationCandidate
} from '@/lib/finance/reconciliation'

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
  if (!statementDate || !candidateDate) {
    return false
  }

  const statementTime = new Date(`${statementDate}T00:00:00Z`).getTime()
  const candidateTime = new Date(`${candidateDate}T00:00:00Z`).getTime()

  if (!Number.isFinite(statementTime) || !Number.isFinite(candidateTime)) {
    return false
  }

  return Math.abs(statementTime - candidateTime) <= windowDays * 24 * 60 * 60 * 1000
}

const hasPartialReferenceMatch = (statementText: string, candidateReference: string | null) => {
  if (!statementText || !candidateReference) {
    return false
  }

  const normalizedReference = candidateReference.toLowerCase()

  if (statementText.includes(normalizedReference) || normalizedReference.includes(statementText)) {
    return true
  }

  const shortReference = normalizedReference.slice(0, Math.min(4, normalizedReference.length))

  return shortReference.length >= 4 && statementText.includes(shortReference)
}

/**
 * Run the auto-match algorithm against a list of unmatched rows and candidates.
 * Returns { matched, suggested } counts.
 */
const runAutoMatchAlgorithm = async ({
  unmatchedRows,
  candidates,
  updateRow,
  linkMatch
}: {
  unmatchedRows: UnmatchedRow[]
  candidates: ReconciliationCandidate[]
  updateRow: (rowId: string, match: {
    matchStatus: string
    matchedType: string
    matchedId: string
    matchedPaymentId: string | null
    matchConfidence: number
    matchedBy: string | null
  }) => Promise<void>
  linkMatch: (match: {
    matchedType: 'income' | 'expense'
    matchedId: string
    matchedPaymentId: string | null
    rowId: string
    matchedBy: string | null
  }) => Promise<void>
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
        confidence = 0.70
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

    const autoMatch = bestMatch.confidence >= 0.85
    const newStatus = autoMatch ? 'auto_matched' : 'suggested'
    const matchedRecordId = bestMatch.candidate.matchedRecordId || bestMatch.candidate.id
    const matchedPaymentId = bestMatch.candidate.matchedPaymentId || null
    const rowId = normalizeString(row.row_id)

    await updateRow(rowId, {
      matchStatus: newStatus,
      matchedType: bestMatch.candidate.type,
      matchedId: matchedRecordId,
      matchedPaymentId,
      matchConfidence: bestMatch.confidence,
      matchedBy: autoMatch ? 'auto' : null
    })

    if (autoMatch) {
      await linkMatch({
        matchedType: bestMatch.candidate.type,
        matchedId: matchedRecordId,
        matchedPaymentId,
        rowId,
        matchedBy: 'auto'
      })

      matchedCandidateIds.add(bestMatch.candidate.id)
      matched++
    } else {
      suggested++
    }
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

    // ── Postgres-first path ──
    try {
      await assertReconciliationPeriodIsMutableFromPostgres(periodId)

      const pgUnmatched = await listUnmatchedStatementRowsFromPostgres(periodId)

      if (pgUnmatched.length === 0) {
        return NextResponse.json({ matched: 0, suggested: 0, message: 'No unmatched rows to process.' })
      }

      const { items: pgCandidates } = await listReconciliationCandidatesFromPostgres({
        periodId, type: 'all', limit: 400, windowDays: 45
      })

      const unmatchedRows: UnmatchedRow[] = pgUnmatched.map(r => ({
        row_id: r.row_id,
        transaction_date: r.transaction_date,
        description: r.description,
        reference: r.reference,
        amount: r.amount
      }))

      const { matched, suggested } = await runAutoMatchAlgorithm({
        unmatchedRows,
        candidates: pgCandidates,
        updateRow: (rowId, match) => updateStatementRowMatchInPostgres(rowId, periodId, {
          ...match,
          matchedByUserId: match.matchedBy,
        }),
        linkMatch: (match) => setReconciliationLinkInPostgres(match)
      })

      return NextResponse.json({
        matched,
        suggested,
        unmatched: unmatchedRows.length - matched - suggested,
        total: unmatchedRows.length
      })
    } catch (error) {
      if (!shouldFallbackFromFinancePostgres(error)) {
        throw error
      }

      if (!isFinanceBigQueryWriteEnabled()) {
        return NextResponse.json(
          {
            error: 'Finance BigQuery fallback write is disabled. Postgres write path failed.',
            code: 'FINANCE_BQ_WRITE_DISABLED'
          },
          { status: 503 }
        )
      }
    }

    // ── BigQuery fallback ──
    await ensureFinanceInfrastructure()

    await assertReconciliationPeriodIsMutable(periodId)

    const projectId = getFinanceProjectId()

    const bqUnmatched = await runFinanceQuery<UnmatchedRow>(`
      SELECT row_id, transaction_date, description, reference, amount
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE period_id = @periodId AND match_status = 'unmatched'
    `, { periodId })

    if (bqUnmatched.length === 0) {
      return NextResponse.json({ matched: 0, suggested: 0, message: 'No unmatched rows to process.' })
    }

    const { items: bqCandidates } = await listReconciliationCandidates({
      periodId, type: 'all', limit: 400, windowDays: 45
    })

    const { matched, suggested } = await runAutoMatchAlgorithm({
      unmatchedRows: bqUnmatched,
      candidates: bqCandidates,
      updateRow: async (rowId, match) => {
        await runFinanceQuery(`
          UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
          SET
            match_status = @matchStatus,
            matched_type = @matchedType,
            matched_id = @matchedId,
            matched_payment_id = @matchedPaymentId,
            match_confidence = @matchConfidence,
            matched_by = @matchedBy,
            matched_at = CURRENT_TIMESTAMP()
          WHERE row_id = @rowId
        `, { rowId, ...match })
      },
      linkMatch: (match) => setReconciliationLink({
        matchedType: match.matchedType,
        matchedId: match.matchedId,
        matchedPaymentId: match.matchedPaymentId,
        rowId: match.rowId,
        matchedBy: tenant.userId || 'auto'
      })
    })

    return NextResponse.json({
      matched,
      suggested,
      unmatched: bqUnmatched.length - matched - suggested,
      total: bqUnmatched.length
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
