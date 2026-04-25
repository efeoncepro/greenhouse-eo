import 'server-only'

import { updateHubSpotGreenhouseCompanyLifecycle } from '@/lib/integrations/hubspot-greenhouse-service'

import { getHubSpotCandidateByCompanyId } from '../hubspot-candidate-reader'
import {
  getPartySyncConflictById,
  updatePartySyncConflictResolution,
  type PartySyncConflictRow
} from '../sync-conflicts-store'
import {
  materializePartyLifecycleSnapshot,
  resolvePartyLifecycleOrganizationId
} from '../party-lifecycle-snapshot-store'
import { PartyLifecycleError, type PartyActor, type PartyPromotionResult } from '../types'
import { resolveHubSpotStage } from '../hubspot-lifecycle-mapping'
import { promoteParty } from './promote-party'

export type ResolvePartySyncConflictAction = 'force_outbound' | 'force_inbound' | 'ignore'

export interface ResolvePartySyncConflictInput {
  conflictId: string
  action: ResolvePartySyncConflictAction
  actor: PartyActor
  reason?: string | null
}

export interface ResolvePartySyncConflictResult {
  conflict: PartySyncConflictRow
  action: ResolvePartySyncConflictAction
  outboundStatus?: 'updated'
  transition?: PartyPromotionResult | null
}

const resolveHubSpotLifecycleStage = (stage: string): string | null => {
  switch (stage) {
    case 'prospect':
      return 'lead'
    case 'opportunity':
      return 'opportunity'
    case 'active_client':
    case 'inactive':
    case 'churned':
      return 'customer'
    default:
      return null
  }
}

const requireConflict = async (conflictId: string) => {
  const conflict = await getPartySyncConflictById(conflictId)

  if (!conflict) {
    throw new PartyLifecycleError(
      'SYNC_CONFLICT_NOT_FOUND',
      `Party sync conflict ${conflictId} was not found.`,
      404,
      { conflictId }
    )
  }

  return conflict
}

const resolveConflictRecord = async ({
  conflict,
  resolutionStatus,
  actorUserId,
  action,
  reason
}: {
  conflict: PartySyncConflictRow
  resolutionStatus: 'resolved_greenhouse_wins' | 'resolved_hubspot_wins' | 'ignored'
  actorUserId: string | null
  action: ResolvePartySyncConflictAction
  reason: string | null
}) => {
  const updated = await updatePartySyncConflictResolution({
    conflictId: conflict.conflictId,
    resolutionStatus,
    resolvedBy: actorUserId,
    metadataPatch: {
      resolutionAction: action,
      ...(reason ? { resolutionReason: reason } : {})
    }
  })

  if (!updated) {
    throw new PartyLifecycleError(
      'SYNC_CONFLICT_RESOLUTION_FAILED',
      `Party sync conflict ${conflict.conflictId} could not be updated.`,
      500
    )
  }

  return updated
}

export const resolvePartySyncConflict = async (
  input: ResolvePartySyncConflictInput
): Promise<ResolvePartySyncConflictResult> => {
  const conflict = await requireConflict(input.conflictId)
  const actorUserId = input.actor.userId ?? null
  const reason = input.reason?.trim() || null

  if (input.action === 'ignore') {
    const updated = await resolveConflictRecord({
      conflict,
      resolutionStatus: 'ignored',
      actorUserId,
      action: input.action,
      reason
    })

    if (updated.organizationId) {
      await materializePartyLifecycleSnapshot(updated.organizationId)
    }

    return {
      conflict: updated,
      action: input.action,
      transition: null
    }
  }

  const organizationId =
    conflict.organizationId ??
    (conflict.commercialPartyId
      ? await resolvePartyLifecycleOrganizationId(conflict.commercialPartyId)
      : null)

  if (!organizationId) {
    throw new PartyLifecycleError(
      'SYNC_CONFLICT_MISSING_ORGANIZATION',
      `Party sync conflict ${conflict.conflictId} is not anchored to an organization.`,
      422,
      { conflictId: conflict.conflictId }
    )
  }

  if (input.action === 'force_outbound') {
    const snapshot = await materializePartyLifecycleSnapshot(organizationId)

    if (!snapshot?.hubspotCompanyId) {
      throw new PartyLifecycleError(
        'SYNC_CONFLICT_MISSING_HUBSPOT_COMPANY',
        `Party ${organizationId} cannot force outbound without a hubspot_company_id.`,
        422,
        { organizationId }
      )
    }

    const response = await updateHubSpotGreenhouseCompanyLifecycle(snapshot.hubspotCompanyId, {
      organizationId: snapshot.organizationId,
      commercialPartyId: snapshot.commercialPartyId,
      lifecycleStage: resolveHubSpotLifecycleStage(snapshot.lifecycleStage),
      lastQuoteAt: snapshot.lastQuoteAt,
      lastContractAt: snapshot.lastContractAt,
      activeContractsCount: snapshot.activeContractsCount,
      ghLastWriteAt: new Date().toISOString(),
      mrrTier: snapshot.lifecycleStage === 'active_client' ? 'active_client' : null
    })

    if (response.status === 'endpoint_not_deployed') {
      throw new PartyLifecycleError(
        'HUBSPOT_ENDPOINT_NOT_DEPLOYED',
        response.message ?? 'HubSpot lifecycle endpoint is not deployed.',
        409,
        { organizationId, hubspotCompanyId: snapshot.hubspotCompanyId }
      )
    }

    const updated = await resolveConflictRecord({
      conflict,
      resolutionStatus: 'resolved_greenhouse_wins',
      actorUserId,
      action: input.action,
      reason
    })

    await materializePartyLifecycleSnapshot(organizationId)

    return {
      conflict: updated,
      action: input.action,
      outboundStatus: 'updated',
      transition: null
    }
  }

  if (!conflict.hubspotCompanyId) {
    throw new PartyLifecycleError(
      'SYNC_CONFLICT_MISSING_HUBSPOT_COMPANY',
      `Party sync conflict ${conflict.conflictId} has no HubSpot company anchor.`,
      422,
      { conflictId: conflict.conflictId }
    )
  }

  const candidate = await getHubSpotCandidateByCompanyId(conflict.hubspotCompanyId)

  if (!candidate) {
    throw new PartyLifecycleError(
      'HUBSPOT_CANDIDATE_NOT_FOUND',
      `HubSpot company ${conflict.hubspotCompanyId} was not found in the local mirror.`,
      404,
      { hubspotCompanyId: conflict.hubspotCompanyId }
    )
  }

  const snapshot = await materializePartyLifecycleSnapshot(organizationId)

  if (!snapshot) {
    throw new PartyLifecycleError(
      'PARTY_SNAPSHOT_NOT_FOUND',
      `Party snapshot for organization ${organizationId} is not available.`,
      404,
      { organizationId }
    )
  }

  const targetStage = resolveHubSpotStage(candidate.hubspotLifecycleStage, {
    unknownFallback: 'prospect'
  })

  const transition =
    snapshot.lifecycleStage === targetStage
      ? null
      : await promoteParty({
          organizationId,
          toStage: targetStage,
          source: 'hubspot_sync',
          actor: {
            ...input.actor,
            reason: reason ?? 'party_sync_conflict_force_inbound'
          },
          triggerEntity: {
            type: 'manual',
            id: `party-sync-conflict:${conflict.conflictId}:inbound`
          },
          metadata: {
            conflictId: conflict.conflictId,
            hubspotCompanyId: conflict.hubspotCompanyId
          }
        })

  const updated = await resolveConflictRecord({
    conflict,
    resolutionStatus: 'resolved_hubspot_wins',
    actorUserId,
    action: input.action,
    reason
  })

  await materializePartyLifecycleSnapshot(organizationId)

  return {
    conflict: updated,
    action: input.action,
    transition
  }
}
