'use client'

import { useCallback, useEffect, useState } from 'react'

import dynamic from 'next/dynamic'
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
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import CustomChip from '@core/components/mui/Chip'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type {
  HrDepartmentsResponse,
  HrLeaveRequestsResponse,
  HrAttendanceResponse
} from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'
import { leaveStatusConfig, getLeaveTypeConfig, attendanceStatusConfig, formatDate } from './helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const HrCoreDashboard = () => {
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaveData, setLeaveData] = useState<HrLeaveRequestsResponse | null>(null)
  const [deptData, setDeptData] = useState<HrDepartmentsResponse | null>(null)
  const [attendanceData, setAttendanceData] = useState<HrAttendanceResponse | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [leaveRes, deptRes, attRes] = await Promise.all([
        fetch('/api/hr/core/leave/requests?year=' + new Date().getFullYear()),
        fetch('/api/hr/core/departments'),
        fetch('/api/hr/core/attendance')
      ])

      if (leaveRes.ok) setLeaveData(await leaveRes.json())
      if (deptRes.ok) setDeptData(await deptRes.json())
      if (attRes.ok) setAttendanceData(await attRes.json())
    } catch (err: any) {
      setError(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={48} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 8 }}><Skeleton variant='rounded' height={350} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Skeleton variant='rounded' height={350} /></Grid>
        </Grid>
        <Skeleton variant='rounded' height={280} />
      </Stack>
    )
  }

  const pendingRequests = leaveData?.requests.filter(r => r.status === 'pending_supervisor' || r.status === 'pending_hr') ?? []
  const summary = leaveData?.summary ?? { total: 0, pendingSupervisor: 0, pendingHr: 0, approved: 0 }
  const attSummary = attendanceData?.summary ?? { total: 0, present: 0, late: 0, absent: 0, excused: 0 }
  const departments = deptData?.departments ?? []

  // Attendance chart data — group by status for donut
  const attChartSeries = [attSummary.present, attSummary.late, attSummary.absent, attSummary.excused]
  const attChartLabels = ['Presente', 'Tardanza', 'Ausente', 'Justificada']

  const attChartOptions: ApexOptions = {
    chart: { parentHeightOffset: 0 },
    labels: attChartLabels,
    colors: [
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.info.main
    ],
    legend: { position: 'bottom', labels: { colors: 'var(--mui-palette-text-secondary)' } },
    dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => String(attSummary.total)
            }
          }
        }
      }
    }
  }

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Box>
          <Typography variant='h4'>Equipo HR</Typography>
          <Typography variant='body2' color='text.secondary'>
            Gestión de personas, permisos y asistencia
          </Typography>
        </Box>
        <Stack direction='row' spacing={2}>
          <Button
            component={Link}
            href='/hr/hierarchy'
            variant='tonal'
            color='secondary'
            startIcon={<i className='tabler-hierarchy-2' />}
          >
            Abrir jerarquía
          </Button>
          <Button
            component={Link}
            href='/hr/leave'
            variant='contained'
            startIcon={<i className='tabler-calendar-plus' />}
          >
            Solicitar permiso
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* KPI Row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Solicitudes'
            stats={String(summary.total)}
            avatarIcon='tabler-file-text'
            avatarColor='primary'
            subtitle={`Año ${new Date().getFullYear()}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pendientes supervisor'
            stats={String(summary.pendingSupervisor)}
            avatarIcon='tabler-user-question'
            avatarColor='warning'
            subtitle='Requieren aprobación'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pendientes HR'
            stats={String(summary.pendingHr)}
            avatarIcon='tabler-clock-pause'
            avatarColor='error'
            subtitle='En cola HR'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Departamentos'
            stats={String(deptData?.summary.active ?? 0)}
            avatarIcon='tabler-sitemap'
            avatarColor='info'
            subtitle={`${deptData?.summary.total ?? 0} total`}
          />
        </Grid>
      </Grid>

      {/* Main content: Pending requests + Departments sidebar */}
      <Grid container spacing={6}>
        {/* Pending Leave Requests */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Solicitudes pendientes'
              subheader={`${pendingRequests.length} solicitud${pendingRequests.length !== 1 ? 'es' : ''} por revisar`}
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                  <i className='tabler-clock-pause' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                </Avatar>
              }
              action={
                <Button component={Link} href='/hr/leave' variant='tonal' size='small'>
                  Ver todas
                </Button>
              }
            />
            <Divider />
            <CardContent>
              {pendingRequests.length === 0 ? (
                <Stack alignItems='center' spacing={1} sx={{ py: 6 }}>
                  <i className='tabler-circle-check' style={{ fontSize: 40, color: 'var(--mui-palette-success-main)' }} />
                  <Typography color='text.secondary'>No hay solicitudes pendientes.</Typography>
                  <Typography variant='caption' color='text.disabled'>
                    Todas las solicitudes han sido procesadas.
                  </Typography>
                </Stack>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Colaborador</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Fechas</TableCell>
                        <TableCell align='center'>Días</TableCell>
                        <TableCell align='center'>Estado</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingRequests.slice(0, 8).map(req => {
                        const typeConf = getLeaveTypeConfig(req.leaveTypeCode)
                        const statusConf = leaveStatusConfig[req.status]

                        return (
                          <TableRow key={req.requestId} hover sx={{ cursor: 'pointer' }}>
                            <TableCell>
                              <Stack direction='row' spacing={2} alignItems='center'>
                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                  {getInitials(req.memberName || '')}
                                </Avatar>
                                <Typography variant='body2' fontWeight={500}>
                                  {req.memberName}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <CustomChip
                                round='true'
                                size='small'
                                icon={<i className={typeConf.icon} />}
                                label={typeConf.label}
                                color={typeConf.color}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' color='text.secondary'>
                                {formatDate(req.startDate)} — {formatDate(req.endDate)}
                              </Typography>
                            </TableCell>
                            <TableCell align='center'>
                              <Typography variant='body2' fontWeight={600}>{req.requestedDays}</Typography>
                            </TableCell>
                            <TableCell align='center'>
                              <CustomChip
                                round='true'
                                size='small'
                                icon={<i className={statusConf.icon} />}
                                label={statusConf.label}
                                color={statusConf.color === 'default' ? 'secondary' : statusConf.color}
                              />
                            </TableCell>
                            <TableCell align='right'>
                              <i className='tabler-chevron-right' style={{ color: 'var(--mui-palette-text-disabled)' }} />
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

        {/* Departments sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Departamentos'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-sitemap' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
              action={
                <Button component={Link} href='/hr/departments' variant='tonal' size='small'>
                  Gestionar
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {departments.length === 0 ? (
                <Stack alignItems='center' spacing={1} sx={{ py: 6 }}>
                  <i className='tabler-sitemap' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                  <Typography color='text.secondary'>Sin departamentos.</Typography>
                </Stack>
              ) : (
                <List disablePadding>
                  {departments.filter(d => d.active).slice(0, 8).map(dept => (
                    <ListItemButton
                      key={dept.departmentId}
                      component={Link}
                      href='/hr/departments'
                      sx={{ px: 4 }}
                    >
                      <ListItemText
                        primary={dept.name}
                        secondary={dept.businessUnit}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      {dept.headMemberName && (
                        <Typography variant='caption' color='text.disabled'>
                          {dept.headMemberName}
                        </Typography>
                      )}
                    </ListItemButton>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Attendance donut chart */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Asistencia'
          subheader={`${attSummary.total} registros recientes`}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
              <i className='tabler-clock-check' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
            </Avatar>
          }
          action={
            <Button component={Link} href='/hr/attendance' variant='tonal' size='small'>
              Ver detalle
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {attSummary.total === 0 ? (
            <Stack alignItems='center' spacing={1} sx={{ py: 6 }}>
              <i className='tabler-clock-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
              <Typography color='text.secondary'>No hay registros de asistencia recientes.</Typography>
            </Stack>
          ) : (
            <Grid container spacing={6} alignItems='center'>
              <Grid size={{ xs: 12, md: 5 }}>
                <AppReactApexCharts
                  type='donut'
                  height={280}
                  options={attChartOptions}
                  series={attChartSeries}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Grid container spacing={3}>
                  {Object.entries(attendanceStatusConfig).filter(([key]) => key !== 'holiday').map(([key, conf]) => {
                    const count = attSummary[key as keyof typeof attSummary] ?? 0

                    return (
                      <Grid size={{ xs: 6, sm: 3 }} key={key}>
                        <Stack alignItems='center' spacing={0.5}>
                          <Avatar
                            variant='rounded'
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: `${conf.color === 'default' ? 'secondary' : conf.color}.lightOpacity`
                            }}
                          >
                            <i className={conf.icon} style={{ fontSize: 20, color: `var(--mui-palette-${conf.color === 'default' ? 'secondary' : conf.color}-main)` }} />
                          </Avatar>
                          <Typography variant='h6'>{count}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {conf.label}
                          </Typography>
                        </Stack>
                      </Grid>
                    )
                  })}
                </Grid>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default HrCoreDashboard
