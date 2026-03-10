'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'

type Props = {
  data: AdminTenantDetail
}

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Sin registro'
  }

  return new Date(value).toLocaleString('es-CL')
}

const flagTone = (status: string) => {
  if (status === 'enabled') return 'success'
  if (status === 'staged') return 'warning'

  return 'default'
}

const GreenhouseAdminTenantDetail = ({ data }: Props) => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant='h5'>{data.clientName}</Typography>
                    <Typography color='text.secondary'>{data.primaryContactEmail || 'Sin contacto principal'}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {data.hubspotCompanyId ? `HubSpot ${data.hubspotCompanyId}` : 'Tenant sin compania HubSpot asociada'}
                    </Typography>
                  </Box>
                  <Stack direction='row' gap={1} flexWrap='wrap'>
                    <Chip size='small' variant='tonal' color={data.active ? 'success' : 'default'} label={data.status} />
                    <Chip size='small' variant='outlined' label={data.authMode} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant='h6'>Tenant profile</Typography>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Client ID
                    </Typography>
                    <Typography>{data.clientId}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Portal home
                    </Typography>
                    <Typography>{data.portalHomePath || '--'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Timezone
                    </Typography>
                    <Typography>{data.timezone || '--'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Creado
                    </Typography>
                    <Typography>{formatDateTime(data.createdAt)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Ultima actualizacion
                    </Typography>
                    <Typography>{formatDateTime(data.updatedAt)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Ultimo login del tenant
                    </Typography>
                    <Typography>{formatDateTime(data.lastLoginAt)}</Typography>
                  </Box>
                  {data.notes ? (
                    <Box>
                      <Typography variant='body2' color='text.secondary'>
                        Notes
                      </Typography>
                      <Typography>{data.notes}</Typography>
                    </Box>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Access posture</Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 3,
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
                    }}
                  >
                    {[
                      ['Usuarios activos', data.activeUsers],
                      ['Usuarios invitados', data.invitedUsers],
                      ['Proyectos scoped', data.scopedProjects],
                      ['Proyectos base', data.notionProjectCount]
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          {label}
                        </Typography>
                        <Typography variant='h4'>{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Commercial and rollout context</Typography>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Business lines
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.businessLines.map(moduleCode => (
                        <Chip key={moduleCode} size='small' color='info' variant='outlined' label={moduleCode} />
                      ))}
                      {data.businessLines.length === 0 ? <Typography color='text.secondary'>Sin business lines.</Typography> : null}
                    </Stack>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Service modules
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.serviceModules.map(moduleCode => (
                        <Chip key={moduleCode} size='small' variant='outlined' label={moduleCode} />
                      ))}
                      {data.serviceModules.length === 0 ? <Typography color='text.secondary'>Sin service modules.</Typography> : null}
                    </Stack>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Feature flags
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.featureFlags.map(flag => (
                        <Chip key={flag.featureCode} size='small' color={flagTone(flag.status)} variant='tonal' label={flag.featureCode} />
                      ))}
                      {data.featureFlags.length === 0 ? <Typography color='text.secondary'>Sin feature flags activos.</Typography> : null}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Users in tenant</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Usuario</TableCell>
                          <TableCell>Roles</TableCell>
                          <TableCell>Acceso</TableCell>
                          <TableCell>Scopes</TableCell>
                          <TableCell>Ultimo login</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.users.map(user => (
                          <TableRow key={user.userId} hover>
                            <TableCell>
                              <Stack spacing={0.75}>
                                <Typography component={Link} href={`/admin/users/${user.userId}`} color='text.primary' className='font-medium'>
                                  {user.fullName}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  {user.email}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction='row' gap={1} flexWrap='wrap'>
                                {user.roleCodes.map(roleCode => (
                                  <Chip key={roleCode} size='small' variant='outlined' label={roleCode} />
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction='row' gap={1} flexWrap='wrap'>
                                <Chip size='small' variant='tonal' color={user.active ? 'success' : 'default'} label={user.status} />
                                <Chip size='small' variant='outlined' label={user.authMode} />
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {user.projectScopeCount} proyectos · {user.routeGroups.join(', ') || 'sin route groups'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{formatDateTime(user.lastLoginAt)}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Project visibility</Typography>
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {data.projects.map(project => (
                      <Box
                        key={project.projectId}
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          border: theme => `1px solid ${theme.palette.divider}`,
                          display: 'grid',
                          gap: 1.5
                        }}
                      >
                        <Stack direction='row' justifyContent='space-between' gap={2} flexWrap='wrap'>
                          <Typography color='text.primary' className='font-medium'>
                            {project.projectName}
                          </Typography>
                          <Chip size='small' variant='outlined' label={`${project.assignedUsers} usuarios`} />
                        </Stack>
                        <Typography variant='body2' color='text.secondary'>
                          {project.projectId}
                        </Typography>
                        {project.pageUrl ? (
                          <Typography component={Link} href={project.pageUrl} target='_blank' color='primary'>
                            Abrir origen en Notion
                          </Typography>
                        ) : null}
                      </Box>
                    ))}
                    {data.projects.length === 0 ? (
                      <Typography color='text.secondary'>Este tenant aun no tiene proyectos visibles en scope.</Typography>
                    ) : null}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default GreenhouseAdminTenantDetail
