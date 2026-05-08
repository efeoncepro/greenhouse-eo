'use client'

import { Suspense, type ComponentType } from 'react'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'
import { ORGANIZATION_FACETS } from '@/lib/organization-workspace/facet-capability-mapping'

import type { FacetContentProps, OrganizationFacet } from './types'

/**
 * TASK-612 Slice 2 — Facet Content Router with lazy-loaded registry.
 *
 * Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §4.5.
 *
 * Cada facet vive en `src/views/greenhouse/organizations/facets/<Name>Facet.tsx`
 * y se carga via `dynamic()` para que el bundle inicial NO incluya facets
 * no-activos (e.g. el bundle Finance no se carga hasta que el usuario clickea
 * la tab `finance`).
 *
 * Suspense boundary canónico Vuexy (CircularProgress + label es-CL tuteo).
 *
 * **NUNCA** renderiza chrome (header, tabs, KPIs) — ese es responsabilidad del
 * shell. Este componente sólo dispatcha al facet content.
 */

const FACET_REGISTRY: Record<OrganizationFacet, ComponentType<FacetContentProps>> = {
  identity: dynamic(() => import('@/views/greenhouse/organizations/facets/IdentityFacet'), { ssr: false }),
  spaces: dynamic(() => import('@/views/greenhouse/organizations/facets/SpacesFacet'), { ssr: false }),
  team: dynamic(() => import('@/views/greenhouse/organizations/facets/TeamFacet'), { ssr: false }),
  economics: dynamic(() => import('@/views/greenhouse/organizations/facets/EconomicsFacet'), { ssr: false }),
  delivery: dynamic(() => import('@/views/greenhouse/organizations/facets/DeliveryFacet'), { ssr: false }),
  finance: dynamic(() => import('@/views/greenhouse/organizations/facets/FinanceFacet'), { ssr: false }),
  crm: dynamic(() => import('@/views/greenhouse/organizations/facets/CrmFacet'), { ssr: false }),
  services: dynamic(() => import('@/views/greenhouse/organizations/facets/ServicesFacet'), { ssr: false }),
  staffAug: dynamic(() => import('@/views/greenhouse/organizations/facets/StaffAugFacet'), { ssr: false })
}

const isKnownFacet = (value: string): value is OrganizationFacet =>
  (ORGANIZATION_FACETS as readonly string[]).includes(value)

const FacetLoadingFallback = () => (
  <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 6, justifyContent: 'center' }}>
    <CircularProgress size={20} />
    <Typography variant='body2' color='text.secondary'>
      {GH_ORGANIZATION_WORKSPACE.facets.loading}
    </Typography>
  </Stack>
)

export type FacetContentRouterProps = {
  facet: OrganizationFacet
} & FacetContentProps

const FacetContentRouter = ({ facet, ...rest }: FacetContentRouterProps) => {
  if (!isKnownFacet(facet)) {
    // Defense-in-depth: si el shell envía un facet desconocido, NO crash —
    // render empty state honest. El projection helper SOLO emite facets canónicos
    // así que este path debería ser unreachable en condiciones normales.
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant='body2' color='text.secondary'>
          {GH_ORGANIZATION_WORKSPACE.facets.empty.spaces.description}
        </Typography>
      </Box>
    )
  }

  const FacetComponent = FACET_REGISTRY[facet]

  return (
    <Suspense fallback={<FacetLoadingFallback />}>
      <FacetComponent {...rest} />
    </Suspense>
  )
}

export default FacetContentRouter
