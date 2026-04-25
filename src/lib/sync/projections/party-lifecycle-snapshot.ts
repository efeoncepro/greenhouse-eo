import 'server-only'

import { materializePartyLifecycleSnapshot } from '@/lib/commercial/party'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const PARTY_LIFECYCLE_SNAPSHOT_TRIGGER_EVENTS = [
  EVENT_TYPES.commercialPartyCreated,
  EVENT_TYPES.commercialPartyPromoted,
  EVENT_TYPES.commercialPartyDemoted,
  EVENT_TYPES.commercialPartyLifecycleBackfilled,
  EVENT_TYPES.commercialClientInstantiated,
  EVENT_TYPES.commercialPartySyncConflict,
  EVENT_TYPES.contractCreated,
  EVENT_TYPES.contractTerminated,
  EVENT_TYPES.quotationIssued
] as const

const extractOrganizationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.organizationId, payload.organization_id]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

export const partyLifecycleSnapshotProjection: ProjectionDefinition = {
  name: 'party_lifecycle_snapshot',
  description:
    'TASK-542: materialize greenhouse_serving.party_lifecycle_snapshots from lifecycle history + sync conflicts.',
  domain: 'cost_intelligence',
  triggerEvents: [...PARTY_LIFECYCLE_SNAPSHOT_TRIGGER_EVENTS],
  extractScope: payload => {
    const organizationId = extractOrganizationId(payload)

    if (!organizationId) return null

    return {
      entityType: 'organization',
      entityId: organizationId
    }
  },
  refresh: async scope => {
    const snapshot = await materializePartyLifecycleSnapshot(scope.entityId)

    return snapshot
      ? `party_lifecycle_snapshot ${scope.entityId}: ${snapshot.lifecycleStage}`
      : `party_lifecycle_snapshot ${scope.entityId}: missing`
  },
  maxRetries: 1
}
