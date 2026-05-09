import type {
  EntrypointContext,
  OrganizationWorkspaceProjection
} from '@/lib/organization-workspace/projection-types'
import type { OrganizationFacet } from '@/lib/organization-workspace/facet-capability-mapping'
import type { SubjectOrganizationRelation } from '@/lib/organization-workspace/relationship-resolver'

/**
 * TASK-612 — Public types of the Organization Workspace UI shell + facet content router.
 *
 * Re-exports the canonical projection types (TASK-611) and declares the contract
 * each facet content component must accept.
 */

export type { EntrypointContext, OrganizationFacet, OrganizationWorkspaceProjection, SubjectOrganizationRelation }

/**
 * Minimal organization data the shell renders in the chrome (header + KPI strip).
 * Sourced from the existing `OrganizationDetailData` shape — kept narrow so the
 * shell does NOT depend on the full detail payload (single-source-of-truth: the
 * facet content components own their own queries).
 */
export type OrganizationWorkspaceHeader = {
  organizationId: string
  organizationName: string
  publicId: string | null
  industry: string | null
  country: string | null
  status: 'active' | 'inactive' | 'prospect' | 'churned' | string
  active: boolean
  hubspotCompanyId: string | null
  spaceCount: number
  membershipCount: number
}

export type OrganizationWorkspaceKpis = {
  revenueClp: number | null
  grossMarginPct: number | null
  headcountFte: number | null
}

/**
 * Props that every facet content component receives from the FacetContentRouter.
 * Facets are SELF-CONTAINED: they fetch their own data, manage their own drawers
 * and mutations, and respect the projection's fieldRedactions for their facet.
 */
export type FacetContentProps = {
  organizationId: string
  entrypointContext: EntrypointContext
  relationship: SubjectOrganizationRelation
  fieldRedactions: string[]
  /**
   * Read-only reference to the canonical projection. Used by facets that need
   * to know whether sister facets are visible (e.g. delivery linking to economics).
   */
  projection: OrganizationWorkspaceProjection
}
