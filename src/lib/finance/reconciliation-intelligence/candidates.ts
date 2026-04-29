import 'server-only'

import { listReconciliationCandidatesFromPostgres } from '@/lib/finance/postgres-reconciliation'

import type { ReconciliationIntelligencePeriodScope, ScopedReconciliationCandidate } from './types'

export const listScopedReconciliationCandidates = async (
  scope: ReconciliationIntelligencePeriodScope,
  limit = 160
): Promise<ScopedReconciliationCandidate[]> => {
  const result = await listReconciliationCandidatesFromPostgres({
    periodId: scope.periodId,
    type: 'all',
    limit,
    windowDays: 45
  })

  return result.items
    .filter(candidate => {
      if (candidate.matchedSettlementLegId) {
        return candidate.instrumentId === scope.accountId
      }

      /**
       * Legacy payment-only candidates no exponen `instrumentId`; se permiten
       * como fallback porque el resolver ya filtra por payment_account_id
       * despues del hardening TASK-723, pero se marcan con menor confianza.
       */
      return Boolean(candidate.matchedPaymentId)
    })
    .map(candidate => ({
      ...candidate,
      scopeStatus: candidate.matchedSettlementLegId ? 'canonical_settlement_leg' : 'legacy_payment_only'
    }))
}
