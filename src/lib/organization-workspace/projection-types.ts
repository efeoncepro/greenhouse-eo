import type { OrganizationFacet } from './facet-capability-mapping'
import type { SubjectOrganizationRelation } from './relationship-resolver'

/**
 * TASK-611 — Public types of the Organization Workspace projection contract.
 *
 * Lifted into a sibling file so the cache module can depend on the projection
 * shape without circular import via projection.ts (which imports the cache).
 *
 * Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §4.4.
 */

export const ENTRYPOINT_CONTEXTS = ['agency', 'finance', 'admin', 'client_portal'] as const
export type EntrypointContext = (typeof ENTRYPOINT_CONTEXTS)[number]

export type WorkspaceTab = {
  facet: OrganizationFacet
  label: string
}

export type WorkspaceAction = {
  facet: OrganizationFacet
  actionKey: string
  label: string
}

export type DegradedReason =
  | 'relationship_lookup_failed'
  | 'entitlements_lookup_failed'
  | 'no_facets_authorized'
  | null

export type OrganizationWorkspaceProjection = {
  organizationId: string
  entrypointContext: EntrypointContext
  relationship: SubjectOrganizationRelation
  visibleFacets: OrganizationFacet[]
  visibleTabs: WorkspaceTab[]
  defaultFacet: OrganizationFacet | null
  allowedActions: WorkspaceAction[]
  fieldRedactions: Partial<Record<OrganizationFacet, string[]>>
  degradedMode: boolean
  degradedReason: DegradedReason
  cacheKey: string
  computedAt: Date
}
