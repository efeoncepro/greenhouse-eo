import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'

export const organizationExecutiveProjection: ProjectionDefinition = {
  name: 'organization_executive',
  description: 'Flag organization executive snapshot for refresh when economics or delivery data changes',
  domain: 'organization',

  triggerEvents: [
    'assignment.created',
    'assignment.updated',
    'assignment.removed',
    'membership.created',
    'membership.deactivated',
    'service.created',
    'service.updated'
  ],

  extractScope: (payload) => {
    const orgId = payload.organizationId as string | undefined

    if (orgId) return { entityType: 'organization', entityId: orgId }

    const clientId = payload.clientId as string | undefined

    if (clientId) return { entityType: 'client', entityId: clientId }

    return null
  },

  refresh: async (scope) => {
    // The executive snapshot is computed on-read (no materialized table).
    // Reactive refresh invalidates the org cache so next read recomputes.
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    if (scope.entityType === 'organization') {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.organizations SET updated_at = CURRENT_TIMESTAMP WHERE organization_id = $1`,
        [scope.entityId]
      )

      return `invalidated org executive ${scope.entityId}`
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

      return `invalidated org executive for client ${scope.entityId}`
    }

    return null
  },

  maxRetries: 1
}
