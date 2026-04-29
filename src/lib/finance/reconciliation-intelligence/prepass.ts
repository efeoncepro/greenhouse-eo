import 'server-only'

import { scoreAutoMatches } from '@/lib/finance/auto-match'

import { generateReconciliationSuggestionId } from './ids'
import type {
  ReconciliationAiSuggestionPayload,
  ReconciliationIntelligencePeriodScope,
  ReconciliationIntelligenceStatementRow,
  ScopedReconciliationCandidate
} from './types'

const confidenceLabel = (confidence: number) => {
  if (confidence >= 0.9) return 'alta'
  if (confidence >= 0.75) return 'media'

  return 'baja'
}

export const buildRulesOnlySuggestions = ({
  scope,
  rows,
  candidates
}: {
  scope: ReconciliationIntelligencePeriodScope
  rows: ReconciliationIntelligenceStatementRow[]
  candidates: ScopedReconciliationCandidate[]
}): ReconciliationAiSuggestionPayload[] => {
  const result = scoreAutoMatches({
    unmatchedRows: rows.map(row => ({
      rowId: row.rowId,
      transactionDate: row.transactionDate,
      description: row.description,
      reference: row.reference,
      amount: row.amount
    })),
    candidates,
    autoApplyThreshold: 0.9
  })

  return result.decisions.map(decision => {
    const candidate = decision.candidate as ScopedReconciliationCandidate
    const row = rows.find(item => item.rowId === decision.rowId)

    const targetIds = [
      decision.rowId,
      candidate.matchedSettlementLegId ?? candidate.matchedPaymentId ?? candidate.id
    ].filter(Boolean) as string[]

    const isLegacyPaymentOnly = candidate.scopeStatus === 'legacy_payment_only'

    const confidence = isLegacyPaymentOnly
      ? Math.min(decision.confidence, 0.74)
      : decision.confidence

    const currentDifference = scope.difference

    const projectedDifference = currentDifference == null || !row
      ? null
      : Number((currentDifference - row.amount).toFixed(2))

    return {
      suggestionId: generateReconciliationSuggestionId(),
      suggestionType: 'match',
      confidence,
      proposedAction: {
        action: 'open_match_dialog',
        targetIds,
        payload: {
          rowId: decision.rowId,
          candidateId: candidate.id,
          matchedType: candidate.type,
          matchedRecordId: candidate.matchedRecordId,
          matchedPaymentId: candidate.matchedPaymentId,
          matchedSettlementLegId: candidate.matchedSettlementLegId ?? null,
          targetQuality: isLegacyPaymentOnly ? 'legacy_payment_only' : 'canonical_settlement_leg'
        }
      },
      evidenceFactors: [
        {
          factor: 'deterministic_match_score',
          weight: confidence,
          observed: `Coincidencia ${confidenceLabel(confidence)} por monto, fecha y referencia.`
        },
        {
          factor: 'target_quality',
          weight: isLegacyPaymentOnly ? 0.35 : 0.9,
          observed: isLegacyPaymentOnly
            ? 'Target legacy payment-only; requiere revisión y no se debe autoaplicar.'
            : 'Target canónico vía settlement leg.'
        }
      ],
      rationale: isLegacyPaymentOnly
        ? 'Greenhouse encontró un match posible contra un payment legacy. Revísalo en el dialog antes de confirmar.'
        : 'Greenhouse encontró un match determinístico contra una settlement leg canónica. La sugerencia requiere revisión humana antes de aplicar.',
      simulation: {
        currentDifference,
        projectedDifference,
        affectedRows: [decision.rowId]
      },
      requiresApproval: true
    }
  })
}
