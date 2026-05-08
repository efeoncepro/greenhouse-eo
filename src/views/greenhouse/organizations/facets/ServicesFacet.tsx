'use client'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import FacetEmptyState from './FacetEmptyState'

/**
 * TASK-612 — Services facet (catalog `p_services` + active engagements).
 *
 * V1 honest empty state. Future: cuando TASK-836 / TASK-837 entreguen el
 * service pipeline view + sample sprint integration, wrappear esa vista acá.
 */

const ServicesFacet = () => (
  <FacetEmptyState
    icon='tabler-briefcase'
    title={GH_ORGANIZATION_WORKSPACE.facets.empty.services.title}
    description={GH_ORGANIZATION_WORKSPACE.facets.empty.services.description}
  />
)

export default ServicesFacet
