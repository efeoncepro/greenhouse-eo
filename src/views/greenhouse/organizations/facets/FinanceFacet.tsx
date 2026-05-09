'use client'

import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'

import OrganizationFinanceTab from '@/views/greenhouse/organizations/tabs/OrganizationFinanceTab'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

import FacetEmptyState from './FacetEmptyState'
import FinanceClientsContent from './FinanceClientsContent'
import useOrganizationDetail from './use-organization-detail'

/**
 * TASK-612 + TASK-613 — Finance facet (income, payment status, finance summary).
 *
 * Dual-entrypoint dispatch (per spec V1 §4.4 + §4.5):
 *
 *  - `entrypointContext === 'finance'` → renderiza el contenido rico legacy de
 *    Finance Clients (3 KPIs + 4 sub-tabs Facturación/Contactos/Facturas/Deals
 *    + AddMembershipDrawer). Preserva 1:1 la riqueza del legacy `ClientDetailView`.
 *
 *  - `entrypointContext === 'agency' | 'admin' | 'client_portal'` → renderiza
 *    el wrapping Agency-flavored del legacy `OrganizationFinanceTab` (KPIs
 *    económicos del 360 + summary mensual). Preserva el comportamiento V1
 *    de TASK-612.
 *
 * El facet sigue siendo self-contained: queries propias, drawers propios.
 * NO renderiza chrome — el shell ya lo hace.
 *
 * fieldRedactions[`finance`] aplica para sensitive details cuando emerja la
 * primera capability `organization.finance_sensitive` activa via Admin Center
 * (TASK-839 wire-up).
 */

const FinanceFacet = ({ organizationId, entrypointContext }: FacetContentProps) => {
  if (entrypointContext === 'finance') {
    return <FinanceClientsContent lookupId={organizationId} />
  }

  return <FinanceFacetAgencyContent organizationId={organizationId} />
}

const FinanceFacetAgencyContent = ({ organizationId }: { organizationId: string }) => {
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
