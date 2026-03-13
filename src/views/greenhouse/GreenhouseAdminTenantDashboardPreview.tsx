'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import { buildTenantPublicId } from '@/lib/ids/greenhouse-ids'
import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import GreenhouseDashboard from '@views/greenhouse/GreenhouseDashboard'

type Props = {
  clientId: string
  clientName: string
  data: GreenhouseDashboardData
}

const GreenhouseAdminTenantDashboardPreview = ({ clientId, clientName, data }: Props) => {
  const publicTenantId = buildTenantPublicId({ clientId })

  const capabilityModules = resolveCapabilityModules({
    businessLines: data.scope.businessLines,
    serviceModules: data.scope.serviceModules
  })

  return (
    <Stack spacing={6}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent='space-between'
              gap={2}
            >
              <Box>
                <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_tenant_preview_title}</Typography>
                <Typography color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_preview_subtitle(clientName)}
                </Typography>
              </Box>
              <Stack direction='row' gap={1.5} flexWrap='wrap'>
                <Chip variant='outlined' label={clientName} />
                <Chip color='info' variant='tonal' label={publicTenantId} />
              </Stack>
            </Stack>
            <Stack direction='row' gap={2} flexWrap='wrap'>
              <Button component={Link} variant='outlined' href={`/admin/tenants/${clientId}`}>
                {GH_INTERNAL_MESSAGES.admin_tenant_preview_back}
              </Button>
              <Button component={Link} variant='contained' href='/admin/tenants'>
                {GH_INTERNAL_MESSAGES.admin_tenant_preview_spaces}
              </Button>
            </Stack>
            {capabilityModules.length > 0 ? (
              <Stack direction='row' gap={1.5} flexWrap='wrap'>
                {capabilityModules.map(module => (
                  <Button
                    key={module.id}
                    component={Link}
                    size='small'
                    variant='text'
                    href={`/admin/tenants/${clientId}/capability-preview/${module.id}`}
                    startIcon={<i className={module.icon} />}
                  >
                    {module.label}
                  </Button>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <GreenhouseDashboard clientName={clientName} data={data} />
    </Stack>
  )
}

export default GreenhouseAdminTenantDashboardPreview
