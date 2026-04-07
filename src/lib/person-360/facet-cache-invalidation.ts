import 'server-only'

import { invalidateFacetCache, invalidateAllFacetsForProfile } from '@/lib/person-360/facet-cache'
import type { PersonFacetName } from '@/types/person-complete-360'

/**
 * Event-to-facet mapping.
 * When an outbox event fires, these facets are invalidated for the affected profile.
 */
const EVENT_FACET_MAP: Record<string, PersonFacetName[]> = {
  'assignment.created': ['assignments'],
  'assignment.updated': ['assignments'],
  'assignment.deactivated': ['assignments'],
  'leave.request.created': ['leave'],
  'leave.request.approved': ['leave'],
  'leave.request.rejected': ['leave'],
  'payroll.entry.created': ['payroll'],
  'payroll.entry.closed': ['payroll'],
  'compensation.version.created': ['payroll', 'costs'],
  'membership.created': ['organization'],
  'membership.deactivated': ['organization'],
  'delivery.task.synced': ['delivery'],
  'identity.profile.updated': ['identity']
}

/**
 * Handle an outbox event and invalidate the appropriate facet cache entries.
 * Called from the reactive worker or outbox consumer.
 */
export const handleOutboxEventForCache = (
  eventType: string,
  profileId: string
): void => {
  const facets = EVENT_FACET_MAP[eventType]

  if (!facets) return

  for (const facet of facets) {
    invalidateFacetCache(profileId, facet)
  }
}

/**
 * Invalidate all cached facets for a profile.
 * Used when a broad change affects multiple facets (e.g., profile merge).
 */
export const invalidateAllCachedFacets = (profileId: string): void => {
  invalidateAllFacetsForProfile(profileId)
}
