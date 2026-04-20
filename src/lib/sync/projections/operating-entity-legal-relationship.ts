import 'server-only'

import { syncOperatingEntityEmployeeLegalRelationshipForMember } from '@/lib/account-360/person-legal-entity-relationships'
import type { ProjectionDefinition } from '../projection-registry'

export const operatingEntityLegalRelationshipProjection: ProjectionDefinition = {
  name: 'operating_entity_legal_relationship',
  description: 'Keeps active collaborators linked to the operating legal entity as employee relationships',
  domain: 'people',

  triggerEvents: [
    'member.created',
    'member.updated',
    'member.deactivated'
  ],

  extractScope: (payload) => {
    const memberId = (payload.memberId ?? payload.member_id) as string | undefined

    return memberId ? { entityType: 'member', entityId: memberId } : null
  },

  refresh: async (scope) => {
    const result = await syncOperatingEntityEmployeeLegalRelationshipForMember(scope.entityId)

    return result.relationshipId
      ? `${result.action} operating entity legal relationship ${result.relationshipId} for ${scope.entityId}`
      : `${result.action} operating entity legal relationship for ${scope.entityId}`
  },

  maxRetries: 2
}
