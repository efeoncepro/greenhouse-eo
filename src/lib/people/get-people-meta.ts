import 'server-only'

import { ROLE_CODES } from '@/config/role-codes'
import type { PeopleMetaPayload } from '@/types/people'

import { peopleRoleCodes } from '@/lib/people/shared'
import { getPersonAccess } from '@/lib/people/permissions'

export const getPeopleMeta = (roleCodes: string[]): PeopleMetaPayload => {
  const access = getPersonAccess(roleCodes)

  return {
    canManageTeam: roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN),
    visibleTabs: access.visibleTabs,
    supportedTabs: ['profile', 'activity', 'memberships', 'economy', 'ai-tools'],
    availableEnrichments: {
      activity: true,
      compensation: true,
      payroll: true,
      finance: true,
      capacity: true,
      identity: true,
      access: true,
      hrProfile: true,
      aiTools: true,
      deliveryContext: true
    },
    allowedRoleCodes: [...peopleRoleCodes]
  }
}
