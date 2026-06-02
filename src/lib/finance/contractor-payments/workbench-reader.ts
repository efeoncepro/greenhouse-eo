import 'server-only'

import { getContractorEngagementById } from '@/lib/contractor-engagements/store'
import {
  listContractorPayables,
  type ListContractorPayablesFilters
} from '@/lib/contractor-engagements/payables/store'
import type { ContractorPayable } from '@/lib/contractor-engagements/payables/types'
import { resolveProfileDisplayNames } from '@/lib/identity/profile-display-names'

/**
 * TASK-974 — Read-side enrichment for the Finance Contractor Payments Workbench.
 *
 * The Finance operator's list needs the contractor's display name + the engagement
 * public id, which the raw payable does not carry (only beneficiaryId +
 * contractorEngagementId). Mirror of the hr-workbench-projection name resolution
 * (TASK-796): fetch the engagements for the listed payables, resolve display names
 * by profileId, and attach `contractorName` + `engagementPublicId`. Read-only; no
 * recompute of amounts (gross/withholding/net are verbatim from the payable).
 */
export interface ContractorPaymentRow extends ContractorPayable {
  contractorName: string
  engagementPublicId: string
}

export const listContractorPaymentsForWorkbench = async (
  filters: ListContractorPayablesFilters = {}
): Promise<ContractorPaymentRow[]> => {
  const payables = await listContractorPayables({ limit: 200, ...filters })

  const engagementIds = [...new Set(payables.map(p => p.contractorEngagementId))]

  const engagements = await Promise.all(
    engagementIds.map(id => getContractorEngagementById(id).catch(() => null))
  )

  const engagementById = new Map(
    engagements.filter((e): e is NonNullable<typeof e> => Boolean(e)).map(e => [e.contractorEngagementId, e])
  )

  const names = await resolveProfileDisplayNames(
    [...engagementById.values()].map(e => e.profileId)
  ).catch(() => new Map<string, string>())

  return payables.map(payable => {
    const engagement = engagementById.get(payable.contractorEngagementId)

    return {
      ...payable,
      contractorName: (engagement ? names.get(engagement.profileId) : null) ?? 'Contractor',
      engagementPublicId: engagement?.publicId ?? payable.contractorEngagementId
    }
  })
}
