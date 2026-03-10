'use client'

import { useState } from 'react'

import Link from 'next/link'

import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTabList from '@core/components/mui/TabList'

import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'
import { getInitials } from '@/utils/getInitials'

type Props = {
  data: AdminUserDetail
}

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Sin registro'
  }

  return new Date(value).toLocaleString('es-CL')
}

const GreenhouseAdminUserDetail = ({ data }: Props) => {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3} alignItems='center' textAlign='center'>
                  <CustomAvatar skin='light' color={data.tenantType === 'efeonce_internal' ? 'info' : 'success'} size={92}>
                    {getInitials(data.fullName)}
                  </CustomAvatar>
                  <Box>
                    <Typography variant='h5'>{data.fullName}</Typography>
                    <Typography color='text.secondary'>{data.email}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {data.jobTitle || 'Sin cargo registrado'}
                    </Typography>
                  </Box>
                  <Stack direction='row' gap={1} flexWrap='wrap' justifyContent='center'>
                    <Chip size='small' variant='tonal' color={data.tenantType === 'efeonce_internal' ? 'info' : 'success'} label={data.tenantType} />
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
                  <Typography variant='h6'>Tenant overview</Typography>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Cliente
                    </Typography>
                    <Typography>{data.client.clientName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Portal home
                    </Typography>
                    <Typography>{data.defaultPortalHomePath || '--'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Route groups
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.routeGroups.map(routeGroup => (
                        <Chip key={routeGroup} size='small' label={routeGroup} variant='outlined' />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <TabContext value={activeTab}>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
              <CustomTabList onChange={(_, value) => setActiveTab(value)} variant='scrollable' pill='true'>
                <Tab icon={<i className='tabler-user-circle' />} value='overview' label='Overview' iconPosition='start' />
                <Tab icon={<i className='tabler-lock' />} value='security' label='Security' iconPosition='start' />
                <Tab icon={<i className='tabler-file-invoice' />} value='billing' label='Billing' iconPosition='start' />
              </CustomTabList>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TabPanel value={activeTab} className='p-0'>
                {activeTab === 'overview' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>Roles and scope</Typography>
                            <Stack direction='row' gap={1} flexWrap='wrap'>
                              {data.roleCodes.map(roleCode => (
                                <Chip key={roleCode} size='small' variant='tonal' label={roleCode} />
                              ))}
                            </Stack>
                            <Divider />
                            <Typography variant='body2' color='text.secondary'>
                              Proyectos visibles: {data.projectScopes.length}
                            </Typography>
                            <Stack spacing={2}>
                              {data.projectScopes.map(project => (
                                <Box
                                  key={project.projectId}
                                  sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    border: theme => `1px solid ${theme.palette.divider}`,
                                    display: 'grid',
                                    gap: 1
                                  }}
                                >
                                  <Stack direction='row' justifyContent='space-between' gap={2} flexWrap='wrap'>
                                    <Typography color='text.primary' className='font-medium'>
                                      {project.projectName}
                                    </Typography>
                                    <Chip size='small' variant='outlined' label={project.accessLevel} />
                                  </Stack>
                                  {project.pageUrl ? (
                                    <Typography component={Link} href={project.pageUrl} target='_blank' color='primary'>
                                      Abrir origen en Notion
                                    </Typography>
                                  ) : null}
                                </Box>
                              ))}
                              {data.projectScopes.length === 0 ? (
                                <Typography color='text.secondary'>Este usuario no tiene scopes de proyecto activos.</Typography>
                              ) : null}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>Campaign and feature context</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              Campañas visibles: {data.campaignScopes.length}
                            </Typography>
                            <Stack direction='row' gap={1} flexWrap='wrap'>
                              {data.campaignScopes.map(scope => (
                                <Chip key={scope.campaignId} size='small' variant='outlined' label={`${scope.campaignId} · ${scope.accessLevel}`} />
                              ))}
                              {data.campaignScopes.length === 0 ? (
                                <Typography color='text.secondary'>Sin scopes de campaña activos.</Typography>
                              ) : null}
                            </Stack>
                            <Divider />
                            <Typography variant='body2' color='text.secondary'>
                              Feature flags del tenant
                            </Typography>
                            <Stack direction='row' gap={1} flexWrap='wrap'>
                              {data.client.featureFlags.map(flag => (
                                <Chip key={flag} size='small' variant='tonal' color='info' label={flag} />
                              ))}
                              {data.client.featureFlags.length === 0 ? (
                                <Typography color='text.secondary'>Sin feature flags activos.</Typography>
                              ) : null}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}

                {activeTab === 'security' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2.5}>
                            <Typography variant='h6'>Access profile</Typography>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Auth mode
                              </Typography>
                              <Typography>{data.authMode}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Password algorithm
                              </Typography>
                              <Typography>{data.passwordAlgorithm || 'N/A'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Last login
                              </Typography>
                              <Typography>{formatDateTime(data.lastLoginAt)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Invited at
                              </Typography>
                              <Typography>{formatDateTime(data.invitedAt)}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2.5}>
                            <Typography variant='h6'>Audit readiness</Typography>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Created
                              </Typography>
                              <Typography>{formatDateTime(data.createdAt)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Updated
                              </Typography>
                              <Typography>{formatDateTime(data.updatedAt)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Observacion
                              </Typography>
                              <Typography color='text.secondary'>
                                Este tab reemplaza la demo de security de Vuexy por controles reales de acceso, auditoria y autenticacion del usuario.
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}

                {activeTab === 'billing' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>Commercial context</Typography>
                            <Typography color='text.secondary'>
                              Este tab reutiliza la idea de `billing-plans` de Vuexy, pero en Greenhouse se usará para invoices, fee, plan contratado y contexto comercial del cliente.
                            </Typography>
                            <Divider />
                            <Grid container spacing={4}>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Cliente
                                </Typography>
                                <Typography>{data.client.clientName}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Primary contact
                                </Typography>
                                <Typography>{data.client.primaryContactEmail || 'Sin contacto registrado'}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  HubSpot company
                                </Typography>
                                <Typography>{data.client.hubspotCompanyId || 'Sin company mapping'}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Estado actual
                                </Typography>
                                <Typography>Sin invoices integradas todavia</Typography>
                              </Grid>
                            </Grid>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}
              </TabPanel>
            </Grid>
          </Grid>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default GreenhouseAdminUserDetail
