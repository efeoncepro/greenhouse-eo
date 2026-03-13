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

import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { GH_NAV } from '@/config/greenhouse-nomenclature'

type Props = {
  data: AdminTenantsOverview
}

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Sin registro'
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
            <Chip label='Gobernanza de spaces' color='info' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>Administra spaces como empresas, con su postura de acceso, modulos y usuarios asociados.</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 920 }}>
              Cada space representa una empresa cliente del portal. Esta vista consolida el estado comercial y operativo del
              space sin colapsar metadata del cliente con identidad de usuario.
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
          ['Spaces', data.totals.totalTenants],
          ['Activos', data.totals.activeTenants],
          ['Con credenciales', data.totals.tenantsWithCredentials],
          ['Pendientes reset', data.totals.tenantsPendingReset],
          ['Con proyectos en scope', data.totals.tenantsWithScopedProjects]
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
              <Typography variant='h4'>{GH_NAV.adminSpaces.label}</Typography>
              <Typography color='text.secondary'>
                Cada fila representa un cliente visible como space. El detalle agrupa usuarios, proyectos visibles, modulos contratados y
                feature flags activos.
              </Typography>
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
                        <Stack spacing={0.75}>
                          <Typography component={Link} href={`/admin/tenants/${tenant.clientId}`} color='text.primary' className='font-medium'>
                            {tenant.clientName}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {tenant.primaryContactEmail || 'Sin contacto principal'} {tenant.hubspotCompanyId ? `· HubSpot ${tenant.hubspotCompanyId}` : ''}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Stack direction='row' gap={1} flexWrap='wrap'>
                            <Chip size='small' variant='tonal' color={tenant.active ? 'success' : 'default'} label={tenant.status} />
                            <Chip size='small' variant='outlined' color={authModeTone(tenant.authMode)} label={tenant.authMode} />
                          </Stack>
                          <Typography variant='body2' color='text.secondary'>
                            Home: {tenant.portalHomePath || '--'}
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
                            <Chip key={moduleCode} size='small' color='info' variant='outlined' label={moduleCode} />
                          ))}
                          {tenant.serviceModules.map(moduleCode => (
                            <Chip key={moduleCode} size='small' variant='outlined' label={moduleCode} />
                          ))}
                          {tenant.businessLines.length === 0 && tenant.serviceModules.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>
                              Sin modulos activos
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Typography variant='body2'>Feature flags: {tenant.featureFlagCount}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Actualizacion: {formatDateTime(tenant.updatedAt)}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Ultimo login: {formatDateTime(tenant.lastLoginAt)}
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
