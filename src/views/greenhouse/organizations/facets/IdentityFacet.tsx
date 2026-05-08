'use client'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import OrganizationIntegrationsTab from '@/views/greenhouse/organizations/tabs/OrganizationIntegrationsTab'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

import FacetEmptyState from './FacetEmptyState'
import useOrganizationDetail from './use-organization-detail'

/**
 * TASK-612 — Identity facet (organization metadata + HubSpot integration status).
 *
 * Wrapper alrededor del legacy `OrganizationIntegrationsTab` que ya muestra
 * datos de identidad legal, fiscal y conexión HubSpot.
 *
 * fieldRedactions[`identity`] aplica para casos sensitive (TASK-784 pattern).
 * Hoy el wrapper no aplica redactions del identity facet en el legacy tab — eso
 * queda como follow-up cuando emerja la primera capability `*_sensitive` activa.
 */

const IdentityFacet = ({ organizationId }: FacetContentProps) => {
  const state = useOrganizationDetail(organizationId)

  if (state.status === 'loading') {
    return (
      <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 6, justifyContent: 'center' }}>
        <CircularProgress size={20} />
        <Typography variant='body2' color='text.secondary'>
          {GH_ORGANIZATION_WORKSPACE.facets.loading}
        </Typography>
      </Stack>
    )
  }

  if (state.status === 'error') {
    return (
      <FacetEmptyState
        icon='tabler-alert-circle'
        title={GH_ORGANIZATION_WORKSPACE.shell.degraded.title}
        description={GH_ORGANIZATION_WORKSPACE.shell.degraded.reasons.unknown}
      />
    )
  }

  return (
    <Box>
      <OrganizationIntegrationsTab detail={state.detail} />
    </Box>
  )
}

export default IdentityFacet
