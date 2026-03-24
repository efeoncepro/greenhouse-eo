import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'

export const icoMemberProjection: ProjectionDefinition = {
  name: 'ico_member_metrics',
  description: 'Flag ICO member metrics for refresh when member assignments change',

  triggerEvents: [
    'member.created',
    'member.updated',
    'assignment.created',
    'assignment.updated',
    'assignment.removed'
  ],

  extractScope: (payload) => {
    const memberId = payload.memberId as string | undefined

    if (memberId) return { entityType: 'member', entityId: memberId }

    return null
  },

  refresh: async (scope) => {
    // ICO member metrics are materialized nightly from BigQuery.
    // Reactive refresh here just logs the intent — the actual compute
    // runs via /api/cron/ico-member-sync which pulls from BigQuery.
    // Future: direct Postgres refresh for real-time member metrics.
    return `flagged ico_member_metrics refresh for member ${scope.entityId}`
  },

  maxRetries: 0
}
