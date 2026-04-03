import 'server-only'

import { syncOperatingEntityMembershipForMember } from '@/lib/account-360/operating-entity-membership'
import type { ProjectionDefinition } from '../projection-registry'

export const operatingEntityMembershipProjection: ProjectionDefinition = {
  name: 'operating_entity_membership',
  description: 'Keeps active collaborators linked to the operating entity organization',
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
    const result = await syncOperatingEntityMembershipForMember(scope.entityId)

    return result.membershipId
      ? `${result.action} operating entity membership ${result.membershipId} for ${scope.entityId}`
      : `${result.action} operating entity membership for ${scope.entityId}`
  },

  maxRetries: 2
}
