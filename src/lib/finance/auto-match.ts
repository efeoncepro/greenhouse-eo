import 'server-only'

import { normalizeString, toDateString, toNumber } from '@/lib/finance/shared'

import type { ReconciliationCandidate } from '@/lib/finance/reconciliation'

// ─── Types ──────────────────────────────────────────────────────────

export interface AutoMatchRow {
  rowId: string
  transactionDate: unknown
  description: string
  reference: string | null
  amount: unknown
}

export interface AutoMatchDecision {
  rowId: string
  candidate: ReconciliationCandidate
  confidence: number
  autoApplied: boolean
}

export interface AutoMatchResult {
  decisions: AutoMatchDecision[]
  matched: number
  suggested: number
  skipped: number
}

// ─── Pure scoring helpers (no side effects) ─────────────────────────

export const amountMatches = (statementAmount: number, candidateAmount: number) =>
  Math.abs(statementAmount - candidateAmount) <= 1

export const dateMatchesWithinWindow = (
  statementDate: string | null,
  candidateDate: string | null,
  windowDays = 3
) => {
  if (!statementDate || !candidateDate) return false

  const statementTime = new Date(`${statementDate}T00:00:00Z`).getTime()
  const candidateTime = new Date(`${candidateDate}T00:00:00Z`).getTime()

  if (!Number.isFinite(statementTime) || !Number.isFinite(candidateTime)) {
    return false
  }

  return Math.abs(statementTime - candidateTime) <= windowDays * 24 * 60 * 60 * 1000
}

export const hasPartialReferenceMatch = (statementText: string, candidateReference: string | null) => {
  if (!statementText || !candidateReference) return false

  const normalizedReference = candidateReference.toLowerCase()

  if (statementText.includes(normalizedReference) || normalizedReference.includes(statementText)) {
    return true
  }

  const shortReference = normalizedReference.slice(0, Math.min(4, normalizedReference.length))

  return shortReference.length >= 4 && statementText.includes(shortReference)
}

// ─── Scoring engine (pure, no DB) ───────────────────────────────────

/**
 * Confidence ladder (period-agnostic):
 *   0.95 — amount match + (candidate.id appears in text OR partial reference match)
 *   0.85 — amount match + date within window + partial reference match
 *   0.70 — amount match + date within window only
 *   0    — no match
 *
 * Auto-apply threshold: confidence >= 0.85
 * Suggested (needs review): 0.70 <= confidence < 0.85
 * Ties are discarded (ambiguous matches are never auto-applied).
 */
export function scoreAutoMatches({
  unmatchedRows,
  candidates,
  dateWindowDays = 3,
  autoApplyThreshold = 0.85
}: {
  unmatchedRows: AutoMatchRow[]
  candidates: ReconciliationCandidate[]
  dateWindowDays?: number
  autoApplyThreshold?: number
}): AutoMatchResult {
  const decisions: AutoMatchDecision[] = []
  const matchedCandidateIds = new Set<string>()
  let matched = 0
  let suggested = 0
  let skipped = 0

  for (const row of unmatchedRows) {
    const rowAmount = toNumber(row.amount)
    const rowDate = toDateString(row.transactionDate as string | { value?: string } | null)

    const rowText = `${normalizeString(row.description)} ${row.reference ? normalizeString(row.reference) : ''}`
      .trim()
      .toLowerCase()

    let bestMatch: { candidate: ReconciliationCandidate; confidence: number } | null = null
    let bestMatchCount = 0

    for (const candidate of candidates) {
      if (matchedCandidateIds.has(candidate.id)) continue
      if (!amountMatches(rowAmount, candidate.amount)) continue

      const dateMatch = dateMatchesWithinWindow(rowDate, candidate.transactionDate, dateWindowDays)
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

    if (!bestMatch || bestMatchCount !== 1) {
      skipped++
      continue
    }

    const autoApplied = bestMatch.confidence >= autoApplyThreshold

    decisions.push({
      rowId: normalizeString(row.rowId),
      candidate: bestMatch.candidate,
      confidence: bestMatch.confidence,
      autoApplied
    })

    if (autoApplied) {
      matched++
      matchedCandidateIds.add(bestMatch.candidate.id)
    } else {
      suggested++
    }
  }

  return { decisions, matched, suggested, skipped }
}

// ─── Persistence orchestrator (side-effect callbacks injected) ──────

export interface PersistAutoMatchCallbacks {
  updateStatementRow: (input: {
    rowId: string
    periodId: string
    matchStatus: 'auto_matched' | 'suggested'
    matchedType: ReconciliationCandidate['type']
    matchedId: string
    matchedPaymentId: string | null
    matchedSettlementLegId: string | null
    matchConfidence: number
    matchedByUserId: string | null
  }) => Promise<void>
  setReconciliationLink: (input: {
    matchedType: ReconciliationCandidate['type']
    matchedId: string
    matchedPaymentId: string | null
    matchedSettlementLegId: string | null
    rowId: string
    matchedBy: string
  }) => Promise<void>
}

/**
 * Apply the scoring decisions to persistence. Receives a map of rowId → periodId so the
 * caller can support both period-bound and date-range modes (bank_statement_rows always
 * carry a period_id FK; the continuous path looks it up from the row itself).
 */
export async function persistAutoMatchDecisions({
  decisions,
  rowPeriodMap,
  actorUserId,
  callbacks
}: {
  decisions: AutoMatchDecision[]
  rowPeriodMap: Map<string, string>
  actorUserId: string | null
  callbacks: PersistAutoMatchCallbacks
}): Promise<{ applied: number; suggested: number }> {
  let applied = 0
  let suggested = 0

  for (const decision of decisions) {
    const periodId = rowPeriodMap.get(decision.rowId)

    if (!periodId) continue

    const matchedRecordId = decision.candidate.matchedRecordId || decision.candidate.id
    const matchedPaymentId = decision.candidate.matchedPaymentId || null
    const matchedSettlementLegId = decision.candidate.matchedSettlementLegId || null
    const matchStatus = decision.autoApplied ? 'auto_matched' : 'suggested'

    await callbacks.updateStatementRow({
      rowId: decision.rowId,
      periodId,
      matchStatus,
      matchedType: decision.candidate.type,
      matchedId: matchedRecordId,
      matchedPaymentId,
      matchedSettlementLegId,
      matchConfidence: decision.confidence,
      matchedByUserId: decision.autoApplied ? actorUserId || 'auto' : null
    })

    if (!decision.autoApplied) {
      suggested++
      continue
    }

    await callbacks.setReconciliationLink({
      matchedType: decision.candidate.type,
      matchedId: matchedRecordId,
      matchedPaymentId,
      matchedSettlementLegId,
      rowId: decision.rowId,
      matchedBy: actorUserId || 'auto'
    })

    applied++
  }

  return { applied, suggested }
}
