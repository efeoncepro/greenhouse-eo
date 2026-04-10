'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

import TeamAvatar from '@/components/greenhouse/TeamAvatar'
import GreenhouseCalendar from '@/components/greenhouse/GreenhouseCalendar'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { HrSupervisorWorkspaceResponse } from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'
import { formatDateRange, getLeaveTypeConfig, leaveStatusConfig } from './helpers'
import PeopleListTable from '../people/PeopleListTable'
import { safeRoleCategory } from '../people/helpers'

type SupervisorWorkspaceTab = 'overview' | 'team' | 'approvals'

type Props = {
  initialTab?: SupervisorWorkspaceTab
}

const SupervisorWorkspaceView = ({ initialTab = 'overview' }: Props) => {
  const [tab, setTab] = useState<SupervisorWorkspaceTab>(initialTab)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HrSupervisorWorkspaceResponse | null>(null)

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/hr/core/supervisor-workspace')

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible cargar el workspace del supervisor.')
      }

      setData(await response.json())
    } catch (loadError: any) {
      setError(loadError?.message || 'No fue posible cargar el workspace del supervisor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const directReports = useMemo(
    () => data?.team.filter(member => member.directReport) ?? [],
    [data]
  )

  const upcomingAbsences = useMemo(
    () => (data?.calendar.events ?? []).filter(event => event.extendedProps?.source === 'leave_request').slice(0, 8),
    [data]
  )

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={56} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(item => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Skeleton variant='rounded' height={360} />
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Skeleton variant='rounded' height={360} />
          </Grid>
        </Grid>
      </Stack>
    )
  }

  if (!data) {
    return (
      <Alert severity='error'>
        No fue posible cargar el workspace del supervisor.
      </Alert>
    )
  }

  return (
    <Stack spacing={6}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={3}>
        <Box>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Typography variant='h4'>Mi equipo</Typography>
            <CustomChip
              round='true'
              size='small'
              color={data.hasBroadAccess ? 'info' : 'success'}
              label={data.hasBroadAccess ? 'Cobertura HR' : 'Scope supervisor'}
              icon={<i className={data.hasBroadAccess ? 'tabler-shield-check' : 'tabler-users-group'} />}
            />
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            Prioriza aprobaciones, ausencias y seguimiento del equipo sin salir del subárbol visible.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component={Link} href='/people' variant='tonal' color='secondary' startIcon={<i className='tabler-users-group' />}>
            Abrir People
          </Button>
          <Button component={Link} href='/hr/leave' variant='contained' startIcon={<i className='tabler-calendar-event' />}>
            Abrir permisos
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity='warning' onClose={() => setError(null)}>{error}</Alert> : null}

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Reportes directos'
            stats={String(data.summary.directReports)}
            avatarIcon='tabler-user-share'
            avatarColor='primary'
            subtitle='Supervisión formal activa'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Subárbol visible'
            stats={String(data.summary.totalVisibleReports)}
            avatarIcon='tabler-users-group'
            avatarColor='success'
            subtitle='Equipo bajo tu alcance'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Aprobaciones pendientes'
            stats={String(data.summary.pendingApprovals)}
            avatarIcon='tabler-checklist'
            avatarColor='warning'
            subtitle='Casos listos para revisar'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Ausencias próximas'
            stats={String(data.summary.upcomingAbsences)}
            avatarIcon='tabler-calendar-stats'
            avatarColor='info'
            subtitle='Próximos 30 días'
          />
        </Grid>
      </Grid>

      <TabContext value={tab}>
        <Card>
          <CardContent sx={{ pb: 0 }}>
            <CustomTabList
              onChange={(_, value) => setTab(value as SupervisorWorkspaceTab)}
              variant='scrollable'
              pill='true'
            >
              <Tab value='overview' label='Resumen' />
              <Tab value='team' label='Mi equipo' />
              <Tab value='approvals' label='Aprobaciones' />
            </CustomTabList>
          </CardContent>
        </Card>

        <TabPanel value='overview' sx={{ px: 0 }}>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card>
                <CardHeader
                  title='Aprobaciones por atender'
                  subheader={data.summary.pendingApprovals === 0 ? 'No hay casos pendientes ahora mismo.' : `${data.summary.pendingApprovals} caso${data.summary.pendingApprovals !== 1 ? 's' : ''} en cola`}
                  action={
                    <Button component={Link} href='/hr/approvals' variant='tonal' size='small'>
                      Ver cola
                    </Button>
                  }
                />
                <Divider />
                <CardContent>
                  {data.approvals.length === 0 ? (
                    <Stack alignItems='center' spacing={1} sx={{ py: 6 }}>
                      <i className='tabler-circle-check' style={{ fontSize: 40, color: 'var(--mui-palette-success-main)' }} />
                      <Typography color='text.secondary'>No hay aprobaciones pendientes.</Typography>
                      <Typography variant='caption' color='text.disabled'>
                        La cola se actualizará cuando entre una nueva solicitud a tu scope.
                      </Typography>
                    </Stack>
                  ) : (
                    <TableContainer>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Colaborador</TableCell>
                            <TableCell>Solicitud</TableCell>
                            <TableCell>Fechas</TableCell>
                            <TableCell align='center'>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.approvals.slice(0, 5).map(request => {
                            const leaveType = getLeaveTypeConfig(request.leaveTypeCode)
                            const status = leaveStatusConfig[request.status]

                            return (
                              <TableRow key={request.requestId} hover>
                                <TableCell>
                                  <Stack direction='row' spacing={2} alignItems='center'>
                                    <Avatar src={request.memberAvatarUrl || undefined} sx={{ width: 32, height: 32 }}>
                                      {getInitials(request.memberName || '')}
                                    </Avatar>
                                    <Box>
                                      <Typography
                                        component={Link}
                                        href={`/people/${request.memberId}`}
                                        color='text.primary'
                                        sx={{ fontWeight: 500, '&:hover': { color: 'primary.main' } }}
                                      >
                                        {request.memberName || 'Sin nombre'}
                                      </Typography>
                                      <Typography variant='caption' color='text.secondary'>
                                        {request.requestedDays} día{request.requestedDays !== 1 ? 's' : ''}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    icon={<i className={leaveType.icon} />}
                                    color={leaveType.color}
                                    label={leaveType.label}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant='body2'>{formatDateRange(request.startDate, request.endDate)}</Typography>
                                </TableCell>
                                <TableCell align='center'>
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    icon={<i className={status.icon} />}
                                    color={status.color}
                                    label={status.label}
                                  />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader
                  title='Reportes directos'
                  subheader={directReports.length === 0 ? 'No hay reportes directos asignados.' : `${directReports.length} persona${directReports.length !== 1 ? 's' : ''} con supervisoría formal`}
                  action={
                    <Button component={Link} href='/hr/team' variant='tonal' size='small'>
                      Ver equipo
                    </Button>
                  }
                />
                <Divider />
                <CardContent sx={{ pt: 0 }}>
                  {directReports.length === 0 ? (
                    <Stack alignItems='center' spacing={1} sx={{ py: 6 }}>
                      <i className='tabler-user-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                      <Typography color='text.secondary'>Todavía no tienes reportes directos visibles.</Typography>
                    </Stack>
                  ) : (
                    <List disablePadding>
                      {directReports.slice(0, 6).map(member => (
                        <ListItem key={member.memberId} disablePadding divider>
                          <ListItemButton component={Link} href={`/people/${member.memberId}`} sx={{ px: 0, py: 1.5 }}>
                            <Stack direction='row' spacing={2} alignItems='center' sx={{ width: '100%' }}>
                              <TeamAvatar
                                name={member.displayName}
                                avatarUrl={member.avatarUrl}
                                roleCategory={safeRoleCategory(member.roleCategory)}
                                size={40}
                              />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap sx={{ fontWeight: 500 }}>
                                  {member.displayName}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' noWrap>
                                  {member.roleTitle}
                                </Typography>
                              </Box>
                              <CustomChip
                                round='true'
                                size='small'
                                color='primary'
                                label='Directo'
                              />
                            </Stack>
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader
                  title='Ausencias y calendario del equipo'
                  subheader='Ventana operativa de los próximos 30 días.'
                />
                <Divider />
                <CardContent>
                  {upcomingAbsences.length === 0 ? (
                    <Stack alignItems='center' spacing={1} sx={{ py: 6 }}>
                      <i className='tabler-calendar-check' style={{ fontSize: 40, color: 'var(--mui-palette-success-main)' }} />
                      <Typography color='text.secondary'>No hay ausencias próximas en tu equipo.</Typography>
                    </Stack>
                  ) : (
                    <GreenhouseCalendar
                      events={data.calendar.events}
                      initialDate={data.calendar.from}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value='team' sx={{ px: 0 }}>
          <Stack spacing={6}>
            <Card>
              <CardHeader
                title='Cobertura del equipo'
                subheader='Tu subárbol visible se mantiene acotado a la jerarquía y delegaciones activas.'
              />
              <Divider />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={1}>
                      <Typography variant='body2' color='text.secondary'>Reportes directos</Typography>
                      <Typography variant='h5'>{data.summary.directReports}</Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={1}>
                      <Typography variant='body2' color='text.secondary'>Equipo visible</Typography>
                      <Typography variant='h5'>{data.summary.totalVisibleReports}</Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={1}>
                      <Typography variant='body2' color='text.secondary'>Delegación activa</Typography>
                      <Typography variant='h5'>{data.hasDelegatedAuthority ? 'Sí' : 'No'}</Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {data.team.length === 0 ? (
              <Card>
                <CardContent sx={{ py: 8 }}>
                  <Stack alignItems='center' spacing={1.5}>
                    <i className='tabler-users-group' style={{ fontSize: 44, color: 'var(--mui-palette-text-disabled)' }} />
                    <Typography variant='h6'>No hay equipo visible para mostrar.</Typography>
                    <Typography color='text.secondary' textAlign='center'>
                      Cuando exista un subárbol activo o una delegación vigente, esta vista se poblará automáticamente.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <PeopleListTable data={data.team} />
            )}
          </Stack>
        </TabPanel>

        <TabPanel value='approvals' sx={{ px: 0 }}>
          <Card>
            <CardHeader
              title='Cola de aprobaciones'
              subheader='Casos pendientes dentro de tu alcance actual.'
              action={
                <Button component={Link} href='/hr/leave' variant='tonal' size='small'>
                  Abrir permisos
                </Button>
              }
            />
            <Divider />
            <CardContent>
              {data.approvals.length === 0 ? (
                <Stack alignItems='center' spacing={1.5} sx={{ py: 8 }}>
                  <i className='tabler-inbox' style={{ fontSize: 44, color: 'var(--mui-palette-text-disabled)' }} />
                  <Typography variant='h6'>No hay aprobaciones pendientes.</Typography>
                  <Typography color='text.secondary' textAlign='center'>
                    Este espacio mostrará primero permisos y luego otros dominios que consuman snapshots de autoridad.
                  </Typography>
                </Stack>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Colaborador</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Fechas</TableCell>
                        <TableCell align='center'>Estado</TableCell>
                        <TableCell align='center'>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.approvals.map(request => {
                        const leaveType = getLeaveTypeConfig(request.leaveTypeCode)
                        const status = leaveStatusConfig[request.status]

                        return (
                          <TableRow key={request.requestId} hover>
                            <TableCell>
                              <Stack direction='row' spacing={2} alignItems='center'>
                                <Avatar src={request.memberAvatarUrl || undefined} sx={{ width: 36, height: 36 }}>
                                  {getInitials(request.memberName || '')}
                                </Avatar>
                                <Box>
                                  <Typography
                                    component={Link}
                                    href={`/people/${request.memberId}`}
                                    color='text.primary'
                                    sx={{ fontWeight: 500, '&:hover': { color: 'primary.main' } }}
                                  >
                                    {request.memberName || 'Sin nombre'}
                                  </Typography>
                                  <Typography variant='body2' color='text.secondary'>
                                    {request.requestedDays} día{request.requestedDays !== 1 ? 's' : ''}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <CustomChip
                                round='true'
                                size='small'
                                icon={<i className={leaveType.icon} />}
                                color={leaveType.color}
                                label={leaveType.label}
                              />
                            </TableCell>
                            <TableCell>{formatDateRange(request.startDate, request.endDate)}</TableCell>
                            <TableCell align='center'>
                              <CustomChip
                                round='true'
                                size='small'
                                icon={<i className={status.icon} />}
                                color={status.color}
                                label={status.label}
                              />
                            </TableCell>
                            <TableCell align='center'>
                              <Button component={Link} href='/hr/leave' variant='tonal' size='small'>
                                Revisar
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      </TabContext>
    </Stack>
  )
}

export default SupervisorWorkspaceView
