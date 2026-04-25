import 'server-only'

import { PartyLifecycleError, type LifecycleStage, type PartyActor, type PartyPromotionResult } from '../types'
import { resolvePartyLifecycleOrganizationId } from '../party-lifecycle-snapshot-store'
import { promoteParty } from './promote-party'

export interface OverridePartyLifecycleInput {
  partyId: string
  toStage: LifecycleStage
  reason: string
  actor: PartyActor
}

export const overridePartyLifecycle = async (
  input: OverridePartyLifecycleInput
): Promise<PartyPromotionResult> => {
  const reason = input.reason.trim()

  if (!reason) {
    throw new PartyLifecycleError(
      'OVERRIDE_REASON_REQUIRED',
      'Manual lifecycle override requires a non-empty reason.',
      400
    )
  }

  const organizationId = await resolvePartyLifecycleOrganizationId(input.partyId)

  if (!organizationId) {
    throw new PartyLifecycleError(
      'PARTY_NOT_FOUND',
      `Commercial party ${input.partyId} could not be resolved to an organization.`,
      404,
      { partyId: input.partyId }
    )
  }

  const result = await promoteParty({
    organizationId,
    toStage: input.toStage,
    source: 'operator_override',
    actor: {
      ...input.actor,
      reason
    },
    triggerEntity: {
      type: 'manual',
      id: `party-override:${organizationId}:${Date.now()}`
    },
    metadata: {
      overrideReason: reason
    }
  })

  if (!result.historyId) {
    throw new PartyLifecycleError(
      'OVERRIDE_NOOP',
      'Manual lifecycle override must move the party to a different stage.',
      409,
      { organizationId, toStage: input.toStage }
    )
  }

  return result
}
