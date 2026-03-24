import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'

export const clientEconomicsProjection: ProjectionDefinition = {
  name: 'client_economics',
  description: 'Flag client economics for recompute when financial data changes',

  triggerEvents: [
    'membership.created',
    'membership.deactivated',
    'assignment.created',
    'assignment.updated',
    'assignment.removed'
  ],

  extractScope: (payload) => {
    const clientId = payload.clientId as string | undefined

    if (clientId) return { entityType: 'client', entityId: clientId }

    return null
  },

  refresh: async (scope) => {
    // Client economics snapshots are materialized nightly via
    // /api/cron/economics-materialize. Reactive refresh here logs
    // the intent. Future: targeted recompute for the specific client.
    return `flagged client_economics refresh for client ${scope.entityId}`
  },

  maxRetries: 0
}
