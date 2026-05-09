'use client'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import FacetEmptyState from './FacetEmptyState'

/**
 * TASK-612 — Staff Augmentation facet.
 *
 * V1 honest empty state. Future: cuando emerja una vista dedicada de
 * staff_aug arrangements (alineada con `staff-augmentation` projection),
 * wrappear esa vista acá.
 */

const StaffAugFacet = () => (
  <FacetEmptyState
    icon='tabler-users-group'
    title={GH_ORGANIZATION_WORKSPACE.facets.empty.staffAug.title}
    description={GH_ORGANIZATION_WORKSPACE.facets.empty.staffAug.description}
  />
)

export default StaffAugFacet
