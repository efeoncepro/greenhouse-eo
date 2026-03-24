import 'server-only'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DteRecord {
  dteSourceId: string
  dteSource: 'nubox_sale' | 'nubox_purchase'
  folio: string | null
  dteTypeCode: string | null
  totalAmount: number
  emissionDate: string | null // YYYY-MM-DD
  counterpartRut: string | null
  counterpartName: string | null
  organizationId: string | null
}

export interface FinanceCandidate {
  financeId: string
  financeType: 'income' | 'expense'
  totalAmount: number
  documentDate: string | null // invoice_date or document_date
  dueDate: string | null
  documentNumber: string | null // invoice_number or document_number (may equal folio)
  counterpartRut: string | null // client RUT via org tax_id, or supplier RUT
  counterpartName: string | null
  organizationId: string | null
  nuboxLinked: boolean // already has nubox_document_id / nubox_purchase_id
}

export interface DteMatchSignal {
  signal: string
  weight: number
  value: string
}

export interface DteMatchResult {
  financeId: string | null
  financeType: 'income' | 'expense'
  financeTotalAmount: number | null
  confidence: number
  signals: DteMatchSignal[]
  amountDiscrepancy: number | null
}

// ── Thresholds ───────────────────────────────────────────────────────────────

export const DTE_AUTO_MATCH_THRESHOLD = 0.85
export const DTE_REVIEW_THRESHOLD = 0.50

// ── Confidence calculation ───────────────────────────────────────────────────

/**
 * Combine multiple match signals into a single confidence score.
 * Uses the same diminishing-returns formula as identity reconciliation.
 */
const computeConfidence = (signals: DteMatchSignal[]): number => {
  if (signals.length === 0) return 0

  const sorted = [...signals].sort((a, b) => b.weight - a.weight)
  let confidence = sorted[0].weight

  for (let i = 1; i < sorted.length; i++) {
    confidence += sorted[i].weight * (1 - confidence) * 0.6
  }

  return Math.min(1.0, Math.round(confidence * 1000) / 1000)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const normalizeRut = (rut: string | null): string | null => {
  if (!rut) return null

  // Strip dots and dashes, lowercase for consistency
  return rut.replace(/[.\-\s]/g, '').toLowerCase()
}

const daysDiff = (a: string, b: string): number => {
  const dateA = new Date(a)
  const dateB = new Date(b)

  if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return Infinity

  return Math.abs((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))
}

const amountDiffPercent = (a: number, b: number): number => {
  if (a === 0 && b === 0) return 0

  const base = Math.max(Math.abs(a), Math.abs(b))

  if (base === 0) return Infinity

  return Math.abs(a - b) / base
}

// ── Core matcher ─────────────────────────────────────────────────────────────

/**
 * Match a DTE record against a list of finance candidates.
 *
 * Scoring signals (inspired by identity reconciliation pattern):
 *   - amount_exact      (0.60) — total amounts match exactly
 *   - amount_close      (0.35) — amounts within 5% tolerance
 *   - rut_exact         (0.50) — RUT matches exactly
 *   - folio_exact       (0.55) — DTE folio matches document number
 *   - date_exact        (0.25) — emission date matches document date exactly
 *   - date_close        (0.12) — dates within 7 days
 *   - org_match         (0.20) — organization_id matches
 *
 * Auto-match: confidence >= 0.85
 * Proposal:   confidence >= 0.50
 * No match:   confidence <  0.50
 */
export function matchDte(
  dte: DteRecord,
  candidates: FinanceCandidate[]
): DteMatchResult {
  const financeType = dte.dteSource === 'nubox_sale' ? 'income' : 'expense'

  // Filter to same finance type and not already linked
  const eligible = candidates.filter(
    c => c.financeType === financeType && !c.nuboxLinked
  )

  if (eligible.length === 0) {
    return {
      financeId: null,
      financeType,
      financeTotalAmount: null,
      confidence: 0,
      signals: [],
      amountDiscrepancy: null
    }
  }

  let bestResult: DteMatchResult = {
    financeId: null,
    financeType,
    financeTotalAmount: null,
    confidence: 0,
    signals: [],
    amountDiscrepancy: null
  }

  const dteRut = normalizeRut(dte.counterpartRut)
  const dteDate = dte.emissionDate?.slice(0, 10) || null

  for (const candidate of eligible) {
    const signals: DteMatchSignal[] = []

    // Signal: amount_exact / amount_close
    const diffPct = amountDiffPercent(dte.totalAmount, candidate.totalAmount)

    if (diffPct === 0) {
      signals.push({
        signal: 'amount_exact',
        weight: 0.60,
        value: `${dte.totalAmount}`
      })
    } else if (diffPct <= 0.05) {
      signals.push({
        signal: 'amount_close',
        weight: 0.35,
        value: `${dte.totalAmount} vs ${candidate.totalAmount} (${(diffPct * 100).toFixed(1)}%)`
      })
    }

    // Signal: rut_exact
    const candidateRut = normalizeRut(candidate.counterpartRut)

    if (dteRut && candidateRut && dteRut === candidateRut) {
      signals.push({
        signal: 'rut_exact',
        weight: 0.50,
        value: dte.counterpartRut || ''
      })
    }

    // Signal: folio_exact
    if (
      dte.folio &&
      candidate.documentNumber &&
      dte.folio.trim() === candidate.documentNumber.trim()
    ) {
      signals.push({
        signal: 'folio_exact',
        weight: 0.55,
        value: dte.folio
      })
    }

    // Signal: date_exact / date_close
    const candidateDate = candidate.documentDate?.slice(0, 10) || null

    if (dteDate && candidateDate) {
      const diff = daysDiff(dteDate, candidateDate)

      if (diff === 0) {
        signals.push({
          signal: 'date_exact',
          weight: 0.25,
          value: dteDate
        })
      } else if (diff <= 7) {
        signals.push({
          signal: 'date_close',
          weight: 0.12,
          value: `${dteDate} vs ${candidateDate} (${Math.round(diff)}d)`
        })
      }
    }

    // Signal: org_match
    if (
      dte.organizationId &&
      candidate.organizationId &&
      dte.organizationId === candidate.organizationId
    ) {
      signals.push({
        signal: 'org_match',
        weight: 0.20,
        value: dte.organizationId
      })
    }

    const confidence = computeConfidence(signals)

    if (confidence > bestResult.confidence) {
      const amountDiscrepancy =
        candidate.totalAmount !== 0
          ? Math.round((dte.totalAmount - candidate.totalAmount) * 100) / 100
          : null

      bestResult = {
        financeId: candidate.financeId,
        financeType,
        financeTotalAmount: candidate.totalAmount,
        confidence,
        signals,
        amountDiscrepancy
      }
    }
  }

  return bestResult
}
