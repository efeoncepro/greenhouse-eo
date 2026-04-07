import 'server-only'

import { invalidateAccountFacetCache, invalidateAllAccountFacets } from '@/lib/account-360/facet-cache'
import type { AccountFacetName } from '@/types/account-complete-360'

/**
 * Event-to-facet mapping.
 * When an outbox event fires, these facets are invalidated for the affected organization.
 */
const EVENT_FACET_MAP: Record<string, AccountFacetName[]> = {
  'organization.updated': ['identity', 'spaces'],
  'membership.created': ['team', 'identity'],
  'membership.updated': ['team'],
  'membership.deactivated': ['team', 'identity'],
  'assignment.created': ['team', 'economics'],
  'assignment.updated': ['team', 'economics'],
  'assignment.removed': ['team', 'economics'],
  'service.created': ['services'],
  'service.updated': ['services'],
  'service.deactivated': ['services'],
  'staff_aug.placement.created': ['staffAug'],
  'staff_aug.placement.updated': ['staffAug'],
  'staff_aug.placement.status_changed': ['staffAug'],
  'finance.income.created': ['finance'],
  'finance.income.updated': ['finance'],
  'finance.expense.created': ['finance', 'economics'],
  'finance.expense.updated': ['finance', 'economics'],
  'accounting.pl_snapshot.materialized': ['economics'],
  'accounting.period_closed': ['economics', 'finance'],
  'accounting.period_reopened': ['economics', 'finance'],
  'accounting.commercial_cost_attribution.materialized': ['economics']
}

/**
 * Handle an outbox event and invalidate the appropriate account facet cache entries.
 * Called from the reactive worker or outbox consumer.
 */
export const handleAccountOutboxEvent = (
  eventType: string,
  organizationId: string
): void => {
  const facets = EVENT_FACET_MAP[eventType]

  if (!facets) return

  for (const facet of facets) {
    invalidateAccountFacetCache(organizationId, facet)
  }
}

/**
 * Invalidate all cached facets for an organization.
 * Used when a broad change affects multiple facets (e.g., organization merge or restructuring).
 */
export const invalidateAllCachedAccountFacets = (organizationId: string): void => {
  invalidateAllAccountFacets(organizationId)
}
