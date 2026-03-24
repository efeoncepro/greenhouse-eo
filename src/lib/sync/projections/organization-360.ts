import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const organization360Projection: ProjectionDefinition = {
  name: 'organization_360',
  description: 'Invalidate organization_360 cache when assignments or memberships change',
  domain: 'organization',

  triggerEvents: [
    'assignment.created',
    'assignment.updated',
    'assignment.removed',
    'membership.created',
    'membership.updated',
    'membership.deactivated'
  ],

  extractScope: (payload) => {
    const orgId = payload.organizationId as string | undefined
    const clientId = payload.clientId as string | undefined

    if (orgId) return { entityType: 'organization', entityId: orgId }
    if (clientId) return { entityType: 'client', entityId: clientId }

    return null
  },

  refresh: async (scope) => {
    if (scope.entityType === 'organization') {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.organizations SET updated_at = CURRENT_TIMESTAMP WHERE organization_id = $1`,
        [scope.entityId]
      )

      return `invalidated org ${scope.entityId}`
    }

    if (scope.entityType === 'client') {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.organizations SET updated_at = CURRENT_TIMESTAMP
         WHERE organization_id IN (
           SELECT DISTINCT organization_id FROM greenhouse_core.spaces
           WHERE client_id = $1 AND active = TRUE
         )`,
        [scope.entityId]
      )

      return `invalidated orgs for client ${scope.entityId}`
    }

    return null
  },

  maxRetries: 2
}
