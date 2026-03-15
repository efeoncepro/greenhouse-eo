import 'server-only'

import type { PeopleMetaPayload } from '@/types/people'

import { peopleRoleCodes } from '@/lib/people/shared'
import { getPersonAccess } from '@/lib/people/permissions'

export const getPeopleMeta = (roleCodes: string[]): PeopleMetaPayload => {
  const access = getPersonAccess(roleCodes)

  return {
    canManageTeam: roleCodes.includes('efeonce_admin'),
    visibleTabs: access.visibleTabs,
    supportedTabs: ['assignments', 'activity', 'compensation', 'payroll', 'finance'],
    availableEnrichments: {
      activity: true,
      compensation: true,
      payroll: true,
      finance: true,
      capacity: true
    },
    allowedRoleCodes: [...peopleRoleCodes]
  }
}
