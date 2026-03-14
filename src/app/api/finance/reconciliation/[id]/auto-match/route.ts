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
      const rowRef = row.reference ? normalizeString(row.reference).toLowerCase() : ''

      let bestMatch: { candidate: TransactionCandidate; confidence: number } | null = null

      for (const candidate of candidates) {
        if (matchedCandidateIds.has(candidate.id)) continue

        const amountMatch = Math.abs(rowAmount - candidate.amount) < 1 // within 1 unit tolerance

        if (!amountMatch) continue

        // Level 1: Reference exact match → 0.95
        if (rowRef && candidate.reference) {
          const candidateRef = candidate.reference.toLowerCase()

          if (rowRef.includes(candidateRef) || candidateRef.includes(rowRef)) {
            bestMatch = { candidate, confidence: 0.95 }
            break // Best possible match
          }
        }

        // Level 2: Amount + date + partial reference → 0.85
        const dateMatch = rowDate && candidate.date && rowDate === candidate.date

        if (dateMatch && rowRef && candidate.reference) {
          const candidateRef = candidate.reference.toLowerCase()
          const partialRefMatch = rowRef.includes(candidateRef.slice(0, 4)) || candidateRef.includes(rowRef.slice(0, 4))

          if (partialRefMatch) {
            if (!bestMatch || bestMatch.confidence < 0.85) {
              bestMatch = { candidate, confidence: 0.85 }
            }

            continue
          }
        }

        // Level 3: Amount + date only → 0.70 (suggest)
        if (dateMatch) {
          if (!bestMatch || bestMatch.confidence < 0.70) {
            bestMatch = { candidate, confidence: 0.70 }
          }
        }
      }

      if (bestMatch) {
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
