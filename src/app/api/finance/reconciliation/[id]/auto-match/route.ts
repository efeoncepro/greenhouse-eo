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

export const dynamic = 'force-dynamic'

interface UnmatchedRow {
  row_id: string
  transaction_date: unknown
  description: string
  reference: string | null
  amount: unknown
}

interface TransactionCandidate {
  id: string
  type: 'income' | 'expense'
  amount: number
  date: string | null
  reference: string | null
  description: string
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
 *  1. Reference match → 0.95 confidence (auto-match)
 *  2. Amount + date + reference partial → 0.85 confidence (auto-match)
 *  3. Amount + date only → 0.70 confidence (suggest, don't auto-match)
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

    // Verify period exists and is in progress
    const periods = await runFinanceQuery<{ period_id: string; status: string; account_id: string }>(`
      SELECT period_id, status, account_id
      FROM \`${projectId}.greenhouse.fin_reconciliation_periods\`
      WHERE period_id = @periodId
    `, { periodId })

    if (periods.length === 0) {
      return NextResponse.json({ error: 'Reconciliation period not found' }, { status: 404 })
    }

    const period = periods[0]

    if (period.status === 'reconciled' || period.status === 'closed') {
      throw new FinanceValidationError('Cannot auto-match a reconciled or closed period.', 409)
    }

    // Get unmatched statement rows
    const unmatchedRows = await runFinanceQuery<UnmatchedRow>(`
      SELECT row_id, transaction_date, description, reference, amount
      FROM \`${projectId}.greenhouse.fin_bank_statement_rows\`
      WHERE period_id = @periodId AND match_status = 'unmatched'
    `, { periodId })

    if (unmatchedRows.length === 0) {
      return NextResponse.json({ matched: 0, suggested: 0, message: 'No unmatched rows to process.' })
    }

    // Load candidate transactions (income + expenses for matching)
    const incomeRows = await runFinanceQuery<{
      income_id: string; total_amount: unknown; invoice_date: unknown;
      payment_reference: string | null; invoice_number: string | null; description: string | null
    }>(`
      SELECT income_id, total_amount, invoice_date, NULL as payment_reference, invoice_number, description
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE is_reconciled = FALSE
    `)

    const expenseRows = await runFinanceQuery<{
      expense_id: string; total_amount: unknown; payment_date: unknown;
      payment_reference: string | null; document_number: string | null; description: string
    }>(`
      SELECT expense_id, total_amount, payment_date, payment_reference, document_number, description
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE is_reconciled = FALSE
    `)

    const candidates: TransactionCandidate[] = [
      ...incomeRows.map(r => ({
        id: normalizeString(r.income_id),
        type: 'income' as const,
        amount: toNumber(r.total_amount),
        date: toDateString(r.invoice_date as string | { value?: string } | null),
        reference: r.invoice_number ? normalizeString(r.invoice_number) : null,
        description: r.description ? normalizeString(r.description) : ''
      })),
      ...expenseRows.map(r => ({
        id: normalizeString(r.expense_id),
        type: 'expense' as const,
        amount: -toNumber(r.total_amount), // Expenses are negative in bank statement
        date: toDateString(r.payment_date as string | { value?: string } | null),
        reference: r.payment_reference || r.document_number ? normalizeString(r.payment_reference || r.document_number || '') : null,
        description: normalizeString(r.description)
      }))
    ]

    let matched = 0
    let suggested = 0
    const matchedCandidateIds = new Set<string>()

    for (const row of unmatchedRows) {
      const rowAmount = toNumber(row.amount)
      const rowDate = toDateString(row.transaction_date as string | { value?: string } | null)
      const rowText = `${normalizeString(row.description)} ${row.reference ? normalizeString(row.reference) : ''}`.trim().toLowerCase()
      let bestMatch: { candidate: TransactionCandidate; confidence: number } | null = null
      let bestMatchCount = 0

      for (const candidate of candidates) {
        if (matchedCandidateIds.has(candidate.id)) continue

        const amountMatch = amountMatches(rowAmount, candidate.amount)

        if (!amountMatch) continue

        const dateMatch = dateMatchesWithinWindow(rowDate, candidate.date)
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

      if (bestMatch && bestMatchCount === 1) {
        const autoMatch = bestMatch.confidence >= 0.85
        const newStatus = autoMatch ? 'matched' : 'suggested'

        await runFinanceQuery(`
          UPDATE \`${projectId}.greenhouse.fin_bank_statement_rows\`
          SET
            match_status = @matchStatus,
            matched_type = @matchedType,
            matched_id = @matchedId,
            match_confidence = @matchConfidence,
            matched_by = @matchedBy,
            matched_at = CURRENT_TIMESTAMP()
          WHERE row_id = @rowId
        `, {
          rowId: normalizeString(row.row_id),
          matchStatus: newStatus,
          matchedType: bestMatch.candidate.type,
          matchedId: bestMatch.candidate.id,
          matchConfidence: bestMatch.confidence,
          matchedBy: autoMatch ? 'auto' : null
        })

        matchedCandidateIds.add(bestMatch.candidate.id)

        if (autoMatch) {
          matched++
        } else {
          suggested++
        }
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
