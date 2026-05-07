import 'server-only'

import { promoteParty } from '@/lib/commercial/party/commands/promote-party'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ProjectionDefinition } from '../projection-registry'

interface EngagementServiceRow extends Record<string, unknown> {
  service_id: string
  organization_id: string | null
  engagement_kind: string | null
  hubspot_deal_id: string | null
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed || null
}

const loadService = async (serviceId: string): Promise<EngagementServiceRow | null> => {
  const rows = await runGreenhousePostgresQuery<EngagementServiceRow>(
    `SELECT service_id, organization_id, engagement_kind, hubspot_deal_id
     FROM greenhouse_core.services
     WHERE service_id = $1
     LIMIT 1`,
    [serviceId]
  )

  return rows[0] ?? null
}

export const engagementConvertedProjection: ProjectionDefinition = {
  name: 'engagement_converted_lifecycle',
  description:
    'TASK-808: handles service.engagement.converted by promoting the owning commercial party to active_client via promoteParty().',
  domain: 'cost_intelligence',
  triggerEvents: [EVENT_TYPES.serviceEngagementConverted],
  extractScope: payload => {
    const serviceId = asString(payload.serviceId) ?? asString(payload.service_id)

    if (!serviceId) return null

    return {
      entityType: 'service',
      entityId: serviceId
    }
  },
  refresh: async (scope, payload) => {
    const service = await loadService(scope.entityId)

    if (!service) {
      throw new Error(`Converted engagement service ${scope.entityId} was not found.`)
    }

    if (!service.organization_id) {
      throw new Error(`Converted engagement service ${scope.entityId} has no organization_id.`)
    }

    const nextQuotationId = asString(payload.nextQuotationId) ?? asString(payload.next_quotation_id)
    const actorUserId = asString(payload.actorUserId) ?? asString(payload.actor_user_id)

    const result = await promoteParty({
      organizationId: service.organization_id,
      toStage: 'active_client',
      source: 'quote_converted',
      actor: {
        userId: actorUserId ?? undefined,
        system: !actorUserId,
        reason: 'Engagement converted into a post-sprint commercial relationship.'
      },
      triggerEntity: nextQuotationId
        ? { type: 'quote', id: nextQuotationId }
        : { type: 'manual', id: scope.entityId },
      metadata: {
        sourceEvent: EVENT_TYPES.serviceEngagementConverted,
        serviceId: scope.entityId,
        nextServiceId: asString(payload.nextServiceId) ?? asString(payload.next_service_id),
        hubspotDealCreation: service.engagement_kind === 'regular' && !service.hubspot_deal_id
          ? 'deferred_no_canonical_service_to_deal_command'
          : 'not_applicable'
      }
    })

    return result.historyId
      ? `engagement ${scope.entityId}: promoted ${result.fromStage ?? 'null'} -> ${result.toStage}`
      : `engagement ${scope.entityId}: lifecycle already ${result.toStage}`
  },
  maxRetries: 5
}
