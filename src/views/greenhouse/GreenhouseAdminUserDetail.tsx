'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTabList from '@core/components/mui/TabList'

import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'
import { getInitials } from '@/utils/getInitials'

import UserActivityTimeline from './admin/users/UserActivityTimeline'
import UserProjectListTable from './admin/users/UserProjectListTable'
import { formatDateTime, roleColorFor, roleIconFor, statusTone, tenantTone, toTitleCase } from './admin/users/helpers'

type Props = {
  data: AdminUserDetail
}

const GreenhouseAdminUserDetail = ({ data }: Props) => {
  const [activeTab, setActiveTab] = useState('overview')
  const avatarSrc = resolveAvatarPath({ name: data.fullName, email: data.email })
  const projectProgress = data.projectScopes.length === 0 ? 0 : Math.min(100, 28 + data.projectScopes.length * 18)
  const primaryRole = data.roleCodes[0]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent className='flex flex-col pbs-12 gap-6'>
                <div className='flex flex-col gap-6'>
                  <div className='flex items-center justify-center flex-col gap-4'>
                    <div className='flex flex-col items-center gap-4'>
                      <CustomAvatar
                        alt={data.fullName}
                        src={avatarSrc || undefined}
                        variant='rounded'
                        size={120}
                        skin={avatarSrc ? undefined : 'light'}
                        color={tenantTone(data.tenantType)}
                      >
                        {!avatarSrc ? getInitials(data.fullName) : null}
                      </CustomAvatar>
                      <Box textAlign='center'>
                        <Typography variant='h5'>{data.fullName}</Typography>
                        <Typography color='text.secondary'>{data.email}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {data.jobTitle || 'Sin cargo registrado'}
                        </Typography>
                      </Box>
                    </div>
                    <div className='flex items-center gap-2 flex-wrap justify-center'>
                      <Chip size='small' variant='outlined' label={data.publicUserId} />
                      <Chip size='small' variant='tonal' color={tenantTone(data.tenantType)} label={toTitleCase(data.tenantType)} />
                      <Chip size='small' variant='tonal' color={statusTone(data.status)} label={toTitleCase(data.status)} />
                      <Chip size='small' variant='outlined' label={toTitleCase(data.authMode)} />
                    </div>
                  </div>
                  <div className='flex items-center justify-around flex-wrap gap-4'>
                    <div className='flex items-center gap-4'>
                      <CustomAvatar variant='rounded' color='primary' skin='light'>
                        <i className='tabler-folders' />
                      </CustomAvatar>
                      <div>
                        <Typography variant='h5'>{data.projectScopes.length}</Typography>
                        <Typography>Project Scope</Typography>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <CustomAvatar variant='rounded' color='warning' skin='light'>
                        <i className='tabler-speakerphone' />
                      </CustomAvatar>
                      <div>
                        <Typography variant='h5'>{data.campaignScopes.length}</Typography>
                        <Typography>Campaign Scope</Typography>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent className='flex flex-col gap-6'>
                <div>
                  <Typography variant='h5'>Details</Typography>
                  <Divider className='mlb-4' />
                  <div className='flex flex-col gap-2'>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Collaborator ID:
                      </Typography>
                      <Typography>{data.publicUserId}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Username:
                      </Typography>
                      <Typography>{data.email.split('@')[0]}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Cliente:
                      </Typography>
                      <Typography>{data.client.clientName}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Portal home:
                      </Typography>
                      <Typography>{data.defaultPortalHomePath || '--'}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Status:
                      </Typography>
                      <Typography color='text.primary'>{toTitleCase(data.status)}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Role:
                      </Typography>
                      <Typography color='text.primary'>{primaryRole ? toTitleCase(primaryRole) : 'Sin rol asignado'}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Timezone:
                      </Typography>
                      <Typography color='text.primary'>{data.timezone || 'Sin timezone'}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        Locale:
                      </Typography>
                      <Typography color='text.primary'>{data.locale || 'Sin locale'}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        HubSpot company:
                      </Typography>
                      <Typography color='text.primary'>{data.client.hubspotCompanyId || 'Sin company mapping'}</Typography>
                    </div>
                  </div>
                </div>
                <div className='flex gap-4 justify-center'>
                  <Button variant='contained' startIcon={<i className='tabler-mail-forward' />}>
                    Reenviar onboarding
                  </Button>
                  <Button variant='tonal' color='warning' startIcon={<i className='tabler-user-cancel' />}>
                    Revisar acceso
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Tenant operating context</Typography>
                  <Box>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                      <Typography color='text.primary'>Cobertura de proyectos</Typography>
                      <Typography color='text.secondary'>{`${data.projectScopes.length} activos`}</Typography>
                    </Stack>
                    <LinearProgress value={projectProgress} variant='determinate' color='primary' />
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Route groups
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.routeGroups.map(routeGroup => (
                        <Chip key={routeGroup} size='small' label={toTitleCase(routeGroup)} variant='outlined' />
                      ))}
                      {data.routeGroups.length === 0 ? <Typography color='text.secondary'>Sin route groups.</Typography> : null}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Feature flags
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.client.featureFlags.map(flag => (
                        <Chip key={flag} size='small' color='info' variant='tonal' label={toTitleCase(flag)} />
                      ))}
                      {data.client.featureFlags.length === 0 ? <Typography color='text.secondary'>Sin feature flags.</Typography> : null}
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
                <Tab icon={<i className='tabler-building-bank' />} value='tenant' label='Tenant' iconPosition='start' />
                <Tab icon={<i className='tabler-file-invoice' />} value='billing' label='Commercial' iconPosition='start' />
              </CustomTabList>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TabPanel value={activeTab} className='p-0'>
                {activeTab === 'overview' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, xl: 7 }}>
                      <UserProjectListTable data={data} />
                    </Grid>
                    <Grid size={{ xs: 12, xl: 5 }}>
                      <UserActivityTimeline data={data} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>Campaign and feature context</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              Campanas visibles: {data.campaignScopes.length}
                            </Typography>
                            <Stack direction='row' gap={1} flexWrap='wrap'>
                              {data.campaignScopes.map(scope => (
                                <Chip
                                  key={scope.campaignId}
                                  size='small'
                                  variant='outlined'
                                  color={statusTone(scope.accessLevel)}
                                  label={`${scope.campaignId} · ${toTitleCase(scope.accessLevel)}`}
                                />
                              ))}
                              {data.campaignScopes.length === 0 ? <Typography color='text.secondary'>Sin scopes de campana activos.</Typography> : null}
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
                              <Typography>{toTitleCase(data.authMode)}</Typography>
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
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Roles
                              </Typography>
                              <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                                {data.roleCodes.map(roleCode => (
                                  <Chip
                                    key={roleCode}
                                    size='small'
                                    variant='tonal'
                                    color={roleColorFor(roleCode)}
                                    icon={<i className={roleIconFor(roleCode)} />}
                                    label={toTitleCase(roleCode)}
                                  />
                                ))}
                                {data.roleCodes.length === 0 ? <Typography color='text.secondary'>Sin roles asignados.</Typography> : null}
                              </Stack>
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
                                Route groups
                              </Typography>
                              <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                                {data.routeGroups.map(routeGroup => (
                                  <Chip key={routeGroup} size='small' variant='outlined' label={toTitleCase(routeGroup)} />
                                ))}
                                {data.routeGroups.length === 0 ? <Typography color='text.secondary'>Sin route groups visibles.</Typography> : null}
                              </Stack>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}

                {activeTab === 'tenant' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>Tenant relationship</Typography>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Cliente
                              </Typography>
                              <Typography>{data.client.clientName}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Contacto principal
                              </Typography>
                              <Typography>{data.client.primaryContactEmail || 'Sin contacto registrado'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                HubSpot company
                              </Typography>
                              <Typography>{data.client.hubspotCompanyId || 'Sin company mapping'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Space ID
                              </Typography>
                              <Typography>{data.client.publicId || data.client.clientId}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                Internal key
                              </Typography>
                              <Typography>{data.client.clientId}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>Platform features</Typography>
                            <Typography color='text.secondary'>
                              Estos flags y rutas controlan la experiencia real del usuario dentro del portal Greenhouse.
                            </Typography>
                            <Stack direction='row' gap={1} flexWrap='wrap'>
                              {data.client.featureFlags.map(flag => (
                                <Chip key={flag} size='small' variant='tonal' color='info' label={toTitleCase(flag)} />
                              ))}
                              {data.client.featureFlags.length === 0 ? <Typography color='text.secondary'>Sin feature flags activos.</Typography> : null}
                            </Stack>
                            <Divider />
                            <Typography variant='body2' color='text.secondary'>
                              Portal home actual
                            </Typography>
                            <Typography>{data.defaultPortalHomePath || '--'}</Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}

                {activeTab === 'billing' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Chip size='small' variant='tonal' color='primary' label='Commercial context' sx={{ width: 'fit-content' }} />
                            <Typography variant='h2' color='primary.main'>
                              {data.client.hubspotCompanyId ? '$HubSpot' : '$Pending'}
                            </Typography>
                            <Typography color='text.secondary'>
                              Esta tarjeta reserva el espacio del patron Vuexy para fee, invoices y plan contratado cuando exista la integracion comercial.
                            </Typography>
                            <Box>
                              <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                                <Typography color='text.primary'>Preparacion comercial</Typography>
                                <Typography color='text.secondary'>{data.client.primaryContactEmail ? '65%' : '35%'}</Typography>
                              </Stack>
                              <LinearProgress variant='determinate' value={data.client.primaryContactEmail ? 65 : 35} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>Commercial context</Typography>
                            <Typography color='text.secondary'>
                              Este tab reutiliza la idea de billing-plans de Vuexy, pero en Greenhouse se usara para invoices, fee, plan contratado y contexto comercial del cliente.
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
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Auth mode
                                </Typography>
                                <Typography>{toTitleCase(data.authMode)}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Tenant type
                                </Typography>
                                <Typography>{toTitleCase(data.tenantType)}</Typography>
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
