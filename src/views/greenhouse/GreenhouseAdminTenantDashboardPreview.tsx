'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import GreenhouseDashboard from '@views/greenhouse/GreenhouseDashboard'

type Props = {
  clientId: string
  clientName: string
  data: GreenhouseDashboardData
}

const GreenhouseAdminTenantDashboardPreview = ({ clientId, clientName, data }: Props) => {
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
                <Typography variant='h5'>Ver como cliente</Typography>
                <Typography color='text.secondary'>
                  Estas viendo el dashboard del space cliente {clientName} desde tu sesion de administrador.
                </Typography>
              </Box>
              <Stack direction='row' gap={1.5} flexWrap='wrap'>
                <Chip variant='outlined' label={clientName} />
                <Chip color='info' variant='tonal' label={clientId} />
              </Stack>
            </Stack>
            <Stack direction='row' gap={2} flexWrap='wrap'>
              <Button component={Link} variant='outlined' href={`/admin/tenants/${clientId}`}>
                Volver al space
              </Button>
              <Button component={Link} variant='contained' href='/admin/tenants'>
                Ir a spaces
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <GreenhouseDashboard data={data} />
    </Stack>
  )
}

export default GreenhouseAdminTenantDashboardPreview
