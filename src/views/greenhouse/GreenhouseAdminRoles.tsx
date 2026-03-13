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

import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { GH_NAV } from '@/config/greenhouse-nomenclature'

type Props = {
  data: AdminAccessOverview
}

const GreenhouseAdminRoles = ({ data }: Props) => {
  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4' sx={{ mb: 1 }}>
          {GH_NAV.adminRoles.label}
        </Typography>
        <Typography color='text.secondary'>
          Adaptado del patrón visual de Vuexy Roles, pero usando los roles reales de Greenhouse y sus scopes operativos.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        {data.roles.map(role => (
          <Card key={role.roleCode}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                  <Box>
                    <Typography variant='h6'>{role.roleName}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {role.roleCode}
                    </Typography>
                  </Box>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={role.tenantType === 'efeonce_internal' ? 'info' : 'success'}
                    label={role.tenantType}
                  />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  {role.assignedUsers} usuarios asignados en {role.assignedClients} tenants.
                </Typography>
                <Stack direction='row' gap={1} flexWrap='wrap'>
                  {role.routeGroups.map(routeGroup => (
                    <Chip key={routeGroup} size='small' label={routeGroup} variant='outlined' />
                  ))}
                  {role.isAdmin ? <Chip size='small' color='error' variant='tonal' label='admin' /> : null}
                  {role.isInternal ? <Chip size='small' color='info' variant='tonal' label='internal' /> : null}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant='h5'>Matriz de roles actual</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rol</TableCell>
                    <TableCell>Tipo de tenant</TableCell>
                    <TableCell>Grupos de ruta</TableCell>
                    <TableCell>Usuarios</TableCell>
                    <TableCell>Spaces</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.roles.map(role => (
                    <TableRow key={role.roleCode} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography color='text.primary' className='font-medium'>
                            {role.roleName}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {role.roleCode}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{role.tenantType}</TableCell>
                      <TableCell>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          {role.routeGroups.map(routeGroup => (
                            <Chip key={routeGroup} size='small' label={routeGroup} variant='outlined' />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>{role.assignedUsers}</TableCell>
                      <TableCell>{role.assignedClients}</TableCell>
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

export default GreenhouseAdminRoles
