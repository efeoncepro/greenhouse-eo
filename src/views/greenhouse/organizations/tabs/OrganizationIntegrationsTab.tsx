'use client'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import TenantNotionPanel from '@views/greenhouse/admin/tenants/TenantNotionPanel'

import type { OrganizationDetailData } from '../types'

type Props = {
  detail: OrganizationDetailData
}

const OrganizationIntegrationsTab = ({ detail }: Props) => {
  // Resolve the primary active Space for this Organization
  const primarySpace = detail.spaces?.find(s => s.status === 'active' && s.clientId) ?? null

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        {primarySpace ? (
          <TenantNotionPanel
            clientId={primarySpace.clientId!}
            clientName={detail.organizationName}
          />
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Sin Space activo</Typography>
            <Typography variant='body2' color='text.secondary'>
              Esta organización no tiene un Space operativo activo. Las integraciones se configuran a nivel de Space.
            </Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  )
}

export default OrganizationIntegrationsTab
