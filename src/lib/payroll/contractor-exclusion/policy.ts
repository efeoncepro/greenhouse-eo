import 'server-only'

import type { ContractorExclusionFacts, ContractorPayrollExclusion } from './types'

/**
 * TASK-957 Slice A — pure policy. Deriva el verdict de exclusión desde los facts
 * (sin IO, 100% testeable). Un member queda excluido del roster legacy si tiene
 * un engagement en estado "engaged" (active/paused/ending). El query ya filtró
 * por esos estados, así que la presencia de `engagementStatus` = excluido.
 *
 * Se mantiene como función pura separada (espejo de `exit-eligibility/policy.ts`)
 * para preservar el patrón y permitir tests unitarios sin DB.
 */
export const deriveContractorExclusion = (facts: ContractorExclusionFacts): ContractorPayrollExclusion => {
  const engaged = facts.engagementStatus !== null

  return {
    memberId: facts.memberId,
    excluded: engaged,
    engagementPublicId: engaged ? facts.engagementPublicId : null,
    engagementStatus: engaged ? facts.engagementStatus : null,
    reason: engaged ? 'active_contractor_engagement' : null
  }
}
