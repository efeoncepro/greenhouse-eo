'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { InternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'

type Props = {
  data: InternalDashboardOverview
}

const GreenhouseInternalDashboard = ({ data }: Props) => {
  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(2,132,199,0.18) 0%, rgba(14,116,144,0.12) 38%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2}>
            <Chip label='Internal control tower' color='info' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>Internal visibility for tenant onboarding, access health, and rollout control.</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 840 }}>
              This route is the minimum internal surface for Fase 1. It confirms tenant bootstrap, user status, and project
              scope readiness before the executive dashboard work starts.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        {[
          ['Clients', data.totals.clientCount],
          ['Active client users', data.totals.activeClientUsers],
          ['Invited client users', data.totals.invitedClientUsers],
          ['Internal admins', data.totals.internalAdmins]
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant='body2' color='text.secondary'>
                  {label}
                </Typography>
                <Typography variant='h3'>{value}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant='h5'>Tenant rollout status</Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {data.clients.map(client => (
                <Box
                  key={client.clientId}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr 1fr auto' },
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant='h6'>{client.clientName}</Typography>
                    <Typography color='text.secondary'>{client.primaryContactEmail}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Auth mode
                    </Typography>
                    <Typography>{client.authMode}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Project scopes
                    </Typography>
                    <Typography>{client.projectCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Users
                    </Typography>
                    <Typography>{client.userCount}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseInternalDashboard
