'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import CustomAvatar from '@core/components/mui/Avatar'
import { BusinessLineBadge } from '@/components/greenhouse'
import { getInitials } from '@/utils/getInitials'
import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { GH_INTERNAL_MESSAGES, GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'

type Props = {
  data: AdminTenantsOverview
}

const formatDateTime = (value: string | null) => {
  if (!value) {
    return GH_INTERNAL_MESSAGES.admin_tenants_no_record
  }

  return new Date(value).toLocaleString('es-CL')
}

const authModeTone = (authMode: string) => {
  if (authMode === 'credentials') return 'success'
  if (authMode === 'password_reset_pending') return 'warning'
  if (authMode === 'internal_preview') return 'info'

  return 'default'
}

const GreenhouseAdminTenants = ({ data }: Props) => {
  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(14,165,233,0.16) 0%, rgba(16,185,129,0.1) 34%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2}>
            <Chip label={GH_INTERNAL_MESSAGES.admin_tenants_chip} color='info' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>{GH_INTERNAL_MESSAGES.admin_tenants_hero_title}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 920 }}>
              {GH_INTERNAL_MESSAGES.admin_tenants_hero_subtitle}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }
        }}
      >
        {[
          [GH_INTERNAL_MESSAGES.admin_tenants_total_spaces, data.totals.totalTenants],
          [GH_INTERNAL_MESSAGES.admin_tenants_active_spaces, data.totals.activeTenants],
          [GH_INTERNAL_MESSAGES.admin_tenants_with_credentials, data.totals.tenantsWithCredentials],
          [GH_INTERNAL_MESSAGES.admin_tenants_pending_reset, data.totals.tenantsPendingReset],
          [GH_INTERNAL_MESSAGES.admin_tenants_with_projects, data.totals.tenantsWithScopedProjects]
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant='body2' color='text.secondary'>
                  {label}
                </Typography>
                <Typography variant='h4'>{value}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant='h4'>{GH_INTERNAL_NAV.adminTenants.label}</Typography>
              <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenants_table_subtitle}</Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Space</TableCell>
                    <TableCell>Acceso</TableCell>
                    <TableCell>Usuarios</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell>Modulos</TableCell>
                    <TableCell>Actividad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.tenants.map(tenant => (
                    <TableRow key={tenant.clientId} hover>
                      <TableCell>
                        <Stack direction='row' spacing={2} alignItems='center'>
                          <CustomAvatar
                            alt={tenant.clientName}
                            src={tenant.logoUrl ? `/api/media/tenants/${tenant.clientId}/logo` : undefined}
                            variant='rounded'
                            size={42}
                            skin={tenant.logoUrl ? undefined : 'light'}
                            color='primary'
                          >
                            {!tenant.logoUrl ? getInitials(tenant.clientName) : null}
                          </CustomAvatar>
                          <Stack spacing={0.75}>
                            <Typography component={Link} href={`/admin/tenants/${tenant.clientId}`} color='text.primary' className='font-medium'>
                              {tenant.clientName}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {tenant.primaryContactEmail || GH_INTERNAL_MESSAGES.admin_tenants_no_contact}{' '}
                              {tenant.hubspotCompanyId ? `· HubSpot ${tenant.hubspotCompanyId}` : ''}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Stack direction='row' gap={1} flexWrap='wrap'>
                            <Chip size='small' variant='tonal' color={tenant.active ? 'success' : 'default'} label={tenant.status} />
                            <Chip size='small' variant='outlined' color={authModeTone(tenant.authMode)} label={tenant.authMode} />
                          </Stack>
                          <Typography variant='body2' color='text.secondary'>
                            {GH_INTERNAL_MESSAGES.admin_tenants_home_label}: {tenant.portalHomePath || '--'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {tenant.activeUsers} activos · {tenant.invitedUsers} invitados
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {tenant.scopedProjects} scoped · {tenant.notionProjectCount} base
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          {tenant.businessLines.map(moduleCode => (
                            <BusinessLineBadge key={moduleCode} brand={moduleCode} />
                          ))}
                          {tenant.serviceModules.map(moduleCode => (
                            <Chip key={moduleCode} size='small' variant='outlined' label={moduleCode} />
                          ))}
                          {tenant.businessLines.length === 0 && tenant.serviceModules.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>
                              {GH_INTERNAL_MESSAGES.admin_tenants_no_modules}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Typography variant='body2'>
                            {GH_INTERNAL_MESSAGES.admin_tenants_features_label}: {tenant.featureFlagCount}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {GH_INTERNAL_MESSAGES.admin_tenants_updated_label}: {formatDateTime(tenant.updatedAt)}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {GH_INTERNAL_MESSAGES.admin_tenants_last_login_label}: {formatDateTime(tenant.lastLoginAt)}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseAdminTenants
