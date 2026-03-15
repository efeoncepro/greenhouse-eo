import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
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
 * Auto-match algorithm (reference-first):
 *  1. Reference match -> 0.95 confidence (auto-match)
 *  2. Amount + date + reference partial -> 0.85 confidence (auto-match)
 *  3. Amount + date only -> 0.70 confidence (suggest, don't auto-match)
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: periodId } = await params
    const projectId = getFinanceProjectId()

    await assertReconciliationPeriodIsMutable(periodId)

    const unmatchedRows = await runFinanceQuery<UnmatchedRow>(`
      SELECT row_id, transaction_date, description, reference, amount
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE period_id = @periodId AND match_status = 'unmatched'
    `, { periodId })

    if (unmatchedRows.length === 0) {
      return NextResponse.json({ matched: 0, suggested: 0, message: 'No unmatched rows to process.' })
    }

    const { items: candidates } = await listReconciliationCandidates({
      periodId,
      type: 'all',
      limit: 400,
      windowDays: 45
    })

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
        if (matchedCandidateIds.has(candidate.id)) {
          continue
        }

        const amountMatch = amountMatches(rowAmount, candidate.amount)

        if (!amountMatch) {
          continue
        }

        const dateMatch = dateMatchesWithinWindow(rowDate, candidate.transactionDate)
        let confidence = 0

        if (rowText.includes(candidate.id.toLowerCase()) || hasPartialReferenceMatch(rowText, candidate.reference)) {
          confidence = 0.95
        } else if (dateMatch && hasPartialReferenceMatch(rowText, candidate.reference)) {
          confidence = 0.85
        } else if (dateMatch) {
          confidence = 0.70
        }

        if (confidence === 0) {
          continue
        }

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { candidate, confidence }
          bestMatchCount = 1
        } else if (bestMatch && confidence === bestMatch.confidence) {
          bestMatchCount += 1
        }
      }

      if (!bestMatch || bestMatchCount !== 1) {
        continue
      }

      const autoMatch = bestMatch.confidence >= 0.85
      const newStatus = autoMatch ? 'auto_matched' : 'suggested'
      const matchedRecordId = bestMatch.candidate.matchedRecordId || bestMatch.candidate.id
      const matchedPaymentId = bestMatch.candidate.matchedPaymentId || null

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
      `, {
        rowId: normalizeString(row.row_id),
        matchStatus: newStatus,
        matchedType: bestMatch.candidate.type,
        matchedId: matchedRecordId,
        matchedPaymentId,
        matchConfidence: bestMatch.confidence,
        matchedBy: autoMatch ? 'auto' : null
      })

      if (autoMatch) {
        await setReconciliationLink({
          matchedType: bestMatch.candidate.type,
          matchedId: matchedRecordId,
          matchedPaymentId,
          rowId: normalizeString(row.row_id),
          matchedBy: tenant.userId || 'auto'
        })

        matchedCandidateIds.add(bestMatch.candidate.id)
        matched++
      } else {
        suggested++
      }
    }

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
