'use client'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import FacetEmptyState from './FacetEmptyState'

/**
 * TASK-612 — CRM facet (HubSpot pipeline + deals + contacts).
 *
 * V1 honest empty state. Future: cuando emerja una vista CRM dedicada
 * (HubSpot pipeline mirror), wrappear esa vista acá. Hoy el HubSpot indicator
 * vive en `IdentityFacet` via OrganizationIntegrationsTab.
 */

const CrmFacet = () => (
  <FacetEmptyState
    icon='tabler-address-book'
    title={GH_ORGANIZATION_WORKSPACE.facets.empty.crm.title}
    description={GH_ORGANIZATION_WORKSPACE.facets.empty.crm.description}
  />
)

export default CrmFacet
