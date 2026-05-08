'use client'

import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import OrganizationFinanceTab from '@/views/greenhouse/organizations/tabs/OrganizationFinanceTab'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

import FacetEmptyState from './FacetEmptyState'
import useOrganizationDetail from './use-organization-detail'

/**
 * TASK-612 — Finance facet (income, payment status, finance summary).
 * Wrapper de `OrganizationFinanceTab`.
 *
 * fieldRedactions[`finance`] aplica para sensitive details cuando emerja la
 * primera capability `organization.finance_sensitive` activa via Admin Center
 * (TASK-839 wire-up).
 */

const FinanceFacet = ({ organizationId }: FacetContentProps) => {
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

  return <OrganizationFinanceTab detail={state.detail} />
}

export default FinanceFacet
