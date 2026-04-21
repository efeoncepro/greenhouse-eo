import 'server-only'

import { withTransaction } from '@/lib/db'

import { isTransitionAllowed } from '../lifecycle-state-machine'
import { publishPartyDemoted, publishPartyPromoted } from '../party-events'
import { selectOrganizationForLifecycleUpdate } from '../party-store'
import {
  InvalidTransitionError,
  OrganizationNotFoundError,
  type LifecycleStage,
  type LifecycleTransitionSource,
  type LifecycleTriggerEntity,
  type PartyActor,
  type PartyPromotionResult
} from '../types'

import { instantiateClientForParty } from './instantiate-client-for-party'

interface QueryResultLike<T> {
  rows: T[]
}

interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

export interface PromotePartyInput {
  organizationId: string
  toStage: LifecycleStage
  source: LifecycleTransitionSource
  actor: PartyActor
  triggerEntity?: LifecycleTriggerEntity
  metadata?: Record<string, unknown>
}

const DEMOTION_RANK: Record<LifecycleStage, number> = {
  prospect: 0,
  opportunity: 1,
  active_client: 2,
  inactive: 1,
  provider_only: 0,
  churned: -1,
  disqualified: -2
}

const isDemotion = (from: LifecycleStage | null, to: LifecycleStage): boolean => {
  if (from === null) return false
  
return DEMOTION_RANK[to] < DEMOTION_RANK[from]
}

export const promoteParty = async (
  input: PromotePartyInput,
  existingClient?: QueryableClient
): Promise<PartyPromotionResult> => {
  const run = async (txClient: QueryableClient): Promise<PartyPromotionResult> => {
    const organization = await selectOrganizationForLifecycleUpdate(txClient, input.organizationId)

    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId)
    }

    const fromStage = organization.lifecycle_stage

    if (fromStage === input.toStage) {
      // No-op: spec treats same-stage writes as idempotent success. We do not
      // emit an event nor write history.
      return {
        organizationId: organization.organization_id,
        commercialPartyId: organization.commercial_party_id,
        fromStage,
        toStage: input.toStage,
        transitionedAt: new Date().toISOString(),
        historyId: ''
      }
    }

    if (!isTransitionAllowed(fromStage, input.toStage)) {
      throw new InvalidTransitionError(fromStage, input.toStage)
    }

    const actorId = input.actor.userId ?? (input.actor.system ? 'system' : null)

    const historyInsert = await txClient.query<{
      history_id: string
      transitioned_at: string
    }>(
      `INSERT INTO greenhouse_core.organization_lifecycle_history (
         organization_id,
         commercial_party_id,
         from_stage,
         to_stage,
         transition_source,
         transitioned_by,
         trigger_entity_type,
         trigger_entity_id,
         metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING history_id::text AS history_id, transitioned_at::text AS transitioned_at`,
      [
        organization.organization_id,
        organization.commercial_party_id,
        fromStage,
        input.toStage,
        input.source,
        actorId,
        input.triggerEntity?.type ?? null,
        input.triggerEntity?.id ?? null,
        JSON.stringify({
          ...(input.metadata ?? {}),
          ...(input.actor.reason ? { reason: input.actor.reason } : {})
        })
      ]
    )

    const historyRow = historyInsert.rows[0]

    await txClient.query(
      `UPDATE greenhouse_core.organizations
         SET lifecycle_stage = $2,
             lifecycle_stage_since = NOW(),
             lifecycle_stage_source = $3,
             lifecycle_stage_by = $4,
             updated_at = NOW()
       WHERE organization_id = $1`,
      [organization.organization_id, input.toStage, input.source, actorId]
    )

    if (input.toStage === 'active_client') {
      // Side-effect: every active_client must have a clients row + profile. If
      // a client already exists (e.g. manual bootstrap), skip; the command
      // throws OrganizationAlreadyHasClientError, which we swallow here because
      // the promotion is still valid.
      try {
        await instantiateClientForParty(
          {
            organizationId: organization.organization_id,
            triggerEntity: input.triggerEntity ?? { type: 'manual', id: historyRow.history_id },
            actor: input.actor
          },
          txClient
        )
      } catch (error) {
        const alreadyHas =
          typeof error === 'object'
            && error !== null
            && 'code' in error
            && (error as { code?: string }).code === 'ORGANIZATION_ALREADY_HAS_CLIENT'

        if (!alreadyHas) {
          throw error
        }
      }
    }

    const basePayload = {
      commercialPartyId: organization.commercial_party_id,
      organizationId: organization.organization_id,
      fromStage,
      toStage: input.toStage,
      source: input.source,
      triggerEntity: input.triggerEntity,
      actorUserId: actorId,
      reason: input.actor.reason ?? null
    }

    if (isDemotion(fromStage, input.toStage)) {
      await publishPartyDemoted({ ...basePayload, direction: 'demote' }, txClient)
    } else {
      await publishPartyPromoted(basePayload, txClient)
    }

    return {
      organizationId: organization.organization_id,
      commercialPartyId: organization.commercial_party_id,
      fromStage,
      toStage: input.toStage,
      transitionedAt: historyRow.transitioned_at,
      historyId: historyRow.history_id
    }
  }

  if (existingClient) {
    return run(existingClient)
  }

  return withTransaction(run)
}
