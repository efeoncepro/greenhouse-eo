import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'

export const clientEconomicsProjection: ProjectionDefinition = {
  name: 'client_economics',
  description: 'Recompute client economics when financial data changes',
  domain: 'finance',

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

  refresh: async () => {
    // Targeted refresh: recompute current month's economics
    // This is scoped to the current period, not a full historical recompute
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      const results = await computeClientEconomicsSnapshots(year, month, 'reactive-refresh')

      return `recomputed client_economics: ${results.length} snapshots for ${year}-${String(month).padStart(2, '0')}`
    } catch {
      return 'client_economics recompute skipped (dependency not ready)'
    }
  },

  maxRetries: 1
}
