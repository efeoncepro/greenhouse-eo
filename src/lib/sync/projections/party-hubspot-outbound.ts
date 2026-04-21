import 'server-only'

import { pushPartyLifecycleToHubSpot } from '@/lib/hubspot/push-party-lifecycle'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const PARTY_HUBSPOT_OUTBOUND_TRIGGER_EVENTS = [
  EVENT_TYPES.commercialPartyCreated,
  EVENT_TYPES.commercialPartyPromoted,
  EVENT_TYPES.commercialPartyDemoted,
  EVENT_TYPES.commercialClientInstantiated,
  EVENT_TYPES.contractCreated,
  EVENT_TYPES.contractTerminated,
  EVENT_TYPES.quotationIssued
] as const

const extractOrganizationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.organizationId, payload.organization_id]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  return null
}

export const partyHubSpotOutboundProjection: ProjectionDefinition = {
  name: 'party_hubspot_outbound',
  description:
    'TASK-540: mirror commercial party lifecycle milestones to HubSpot company properties when Greenhouse owns the field authority.',
  domain: 'cost_intelligence',
  triggerEvents: [...PARTY_HUBSPOT_OUTBOUND_TRIGGER_EVENTS],

  extractScope: payload => {
    const organizationId = extractOrganizationId(payload)

    if (!organizationId) return null

    return { entityType: 'organization', entityId: organizationId }
  },

  refresh: async scope => {
    const result = await pushPartyLifecycleToHubSpot({ organizationId: scope.entityId })
    const suffix = result.reason ? ` (${result.reason})` : ''

    return `party_hubspot_outbound ${scope.entityId}: ${result.status}:${result.action}${suffix}`
  },

  maxRetries: 2
}
