'use client'

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

import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { getInitials } from '@/utils/getInitials'

type Props = {
  data: AdminAccessOverview
}

const formatLoginAt = (value: string | null) => {
  if (!value) {
    return 'Sin login aun'
  }

  return new Date(value).toLocaleString('es-CL')
}

const tenantTone = (tenantType: string) => (tenantType === 'efeonce_internal' ? 'info' : 'success')

const statusTone = (status: string) => {
  if (status === 'active') return 'success'
  if (status === 'invited') return 'warning'

  return 'default'
}

const GreenhouseAdminUsers = ({ data }: Props) => {
  return (
    <Stack spacing={6}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }
        }}
      >
        {[
          ['Usuarios totales', data.totals.totalUsers],
          ['Usuarios activos', data.totals.activeUsers],
          ['Invitados', data.totals.invitedUsers],
          ['Internos', data.totals.internalUsers],
          ['Clientes', data.totals.clientUsers]
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
              <Typography variant='h4'>Admin Users</Typography>
              <Typography color='text.secondary'>
                Adaptado del patrón de Vuexy User Management, pero conectado a `client_users`, roles y scopes reales de Greenhouse.
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Tenant</TableCell>
                    <TableCell>Roles</TableCell>
                    <TableCell>Acceso</TableCell>
                    <TableCell>Home</TableCell>
                    <TableCell>Ultimo login</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.users.map(user => (
                    <TableRow key={user.userId} hover>
                      <TableCell>
                        <Stack direction='row' spacing={2} alignItems='center'>
                          <CustomAvatar skin='light' color={tenantTone(user.tenantType)} size={38}>
                            {getInitials(user.fullName)}
                          </CustomAvatar>
                          <Box>
                            <Typography color='text.primary' className='font-medium'>
                              {user.fullName}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {user.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Chip size='small' variant='tonal' color={tenantTone(user.tenantType)} label={user.tenantType} sx={{ width: 'fit-content' }} />
                          <Typography variant='body2' color='text.secondary'>
                            {user.clientName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          {user.roleCodes.map(roleCode => (
                            <Chip key={roleCode} size='small' label={roleCode} variant='outlined' />
                          ))}
                          {user.roleCodes.length === 0 ? <Typography variant='body2'>Sin rol</Typography> : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.75}>
                          <Stack direction='row' gap={1} flexWrap='wrap'>
                            <Chip size='small' color={statusTone(user.status)} label={user.status} variant='tonal' />
                            <Chip size='small' variant='outlined' label={user.authMode} />
                          </Stack>
                          <Typography variant='body2' color='text.secondary'>
                            {user.projectScopeCount} scopes de proyecto · {user.routeGroups.join(', ') || 'sin route groups'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{user.portalHomePath || '--'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatLoginAt(user.lastLoginAt)}</Typography>
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

export default GreenhouseAdminUsers
