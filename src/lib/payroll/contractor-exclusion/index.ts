import 'server-only'

import { deriveContractorExclusion } from './policy'
import { fetchContractorExclusionFactsForMembers } from './query'
import { isPayrollContractorEngagementExclusionEnabled } from './flag'
import type { ContractorExclusionFacts, ContractorPayrollExclusion } from './types'

export type {
  ContractorExclusionEngagedStatus,
  ContractorExclusionReason,
  ContractorExclusionFacts,
  ContractorPayrollExclusion
} from './types'

export { CONTRACTOR_EXCLUSION_ENGAGED_STATUSES } from './types'
export { deriveContractorExclusion } from './policy'
export { isPayrollContractorEngagementExclusionEnabled } from './flag'

/**
 * Canonical resolver — TASK-957 Slice A.
 *
 * Devuelve el verdict de exclusión payroll por member para los `memberIds` dados.
 * Un member queda `excluded` si tiene un `ContractorEngagement` en estado "engaged"
 * (active/paused/ending) → su pago vive en el rail contractor-payable, NO en el
 * roster legacy.
 *
 * **Flag-gated**: cuando `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` está OFF,
 * retorna un Map donde TODOS son `excluded: false` (sin tocar la DB) → parity
 * bit-for-bit con el roster pre-TASK-957.
 *
 * SSOT = engagement, NUNCA `contract_type`. Los contractors internacionales legacy
 * (member.contract_type='contractor' + payroll_via='deel' SIN engagement) NUNCA
 * aparecen excluidos por este resolver.
 */
export const resolveContractorEngagementPayrollExclusion = async (
  memberIds: ReadonlyArray<string>
): Promise<Map<string, ContractorPayrollExclusion>> => {
  const out = new Map<string, ContractorPayrollExclusion>()

  if (!isPayrollContractorEngagementExclusionEnabled()) {
    for (const memberId of memberIds) {
      out.set(memberId, {
        memberId,
        excluded: false,
        engagementPublicId: null,
        engagementStatus: null,
        reason: null
      })
    }

    return out
  }

  const facts = await fetchContractorExclusionFactsForMembers(memberIds)

  for (const memberId of memberIds) {
    const memberFacts: ContractorExclusionFacts = facts.get(memberId) ?? {
      memberId,
      engagementPublicId: null,
      engagementStatus: null
    }

    out.set(memberId, deriveContractorExclusion(memberFacts))
  }

  return out
}

/**
 * Thin helper para el roster: devuelve el Set de memberIds excluidos por engagement
 * activo. Vacío cuando el flag está OFF (sin query) → el caller hace `.filter`
 * que es no-op → parity garantizado.
 */
export const resolveContractorExcludedMemberIds = async (
  memberIds: ReadonlyArray<string>
): Promise<Set<string>> => {
  if (!isPayrollContractorEngagementExclusionEnabled()) return new Set()

  const windows = await resolveContractorEngagementPayrollExclusion(memberIds)
  const excluded = new Set<string>()

  for (const [memberId, verdict] of windows) {
    if (verdict.excluded) excluded.add(memberId)
  }

  return excluded
}

/**
 * Thin predicate para checks single-member (capability gates, drawer state).
 * Para roster bulk, preferir `resolveContractorExcludedMemberIds`.
 */
export const isMemberExcludedByContractorEngagement = async (memberId: string): Promise<boolean> => {
  const excluded = await resolveContractorExcludedMemberIds([memberId])

  return excluded.has(memberId)
}
