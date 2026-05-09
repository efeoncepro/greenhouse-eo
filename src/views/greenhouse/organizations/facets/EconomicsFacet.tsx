'use client'

import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import OrganizationEconomicsTab from '@/views/greenhouse/organizations/tabs/OrganizationEconomicsTab'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

import FacetEmptyState from './FacetEmptyState'
import useOrganizationDetail from './use-organization-detail'

/**
 * TASK-612 — Economics facet (KPIs derived: ICO, contribution margin, P&L summary).
 * Wrapper de `OrganizationEconomicsTab`.
 */

const EconomicsFacet = ({ organizationId }: FacetContentProps) => {
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

  return <OrganizationEconomicsTab detail={state.detail} />
}

export default EconomicsFacet
