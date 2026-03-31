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
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
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
import { useTheme } from '@mui/material/styles'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import type { ApexOptions } from 'apexcharts'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import GreenhouseCalendar from '@/components/greenhouse/GreenhouseCalendar'
import LeaveRequestDialog from '@/components/greenhouse/LeaveRequestDialog'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type {
  CreateLeaveRequestInput,
  HrApprovalAction,
  HrLeaveCalendarResponse,
  HrCoreMetadata,
  HrLeaveRequest,
  HrLeaveRequestsResponse,
  HrLeaveBalancesResponse,
  HrLeaveType,
  HrLeaveRequestStatus
} from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'
import { leaveStatusConfig, getLeaveTypeConfig, formatDate } from './helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const getHrLeaveErrorMessage = (payload: { error?: string | null; code?: string | null } | null | undefined, fallback: string) => {
  switch (payload?.code) {
    case 'HR_CORE_SCHEMA_NOT_READY':
      return 'HR Core no está inicializado todavía en este ambiente. Ejecuta el bootstrap de BigQuery antes de usar Permisos.'
    case 'HR_CORE_POSTGRES_SCHEMA_NOT_READY':
      return 'El store PostgreSQL de permisos no está inicializado todavía en este ambiente.'
    case 'HR_CORE_POSTGRES_NOT_CONFIGURED':
      return 'El store PostgreSQL de permisos no está configurado en este ambiente.'
    default:
      return payload?.error || fallback
  }
}

const getCalendarRangeForYear = (year: number) => ({
  from: `${year}-01-01`,
  to: `${year}-12-31`
})

const HrLeaveView = () => {
  const theme = useTheme()
  const [tab, setTab] = useState('requests')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reqData, setReqData] = useState<HrLeaveRequestsResponse | null>(null)
  const [balData, setBalData] = useState<HrLeaveBalancesResponse | null>(null)
  const [calData, setCalData] = useState<HrLeaveCalendarResponse | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([])
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState<HrLeaveRequestStatus | ''>('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)

  // Review dialog
  const [reviewReq, setReviewReq] = useState<HrLeaveRequest | null>(null)
  const [reviewAction, setReviewAction] = useState<HrApprovalAction>('approve')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const activeLeaveTypes = leaveTypes.filter(leaveType => leaveType.active)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ year: String(filterYear) })
      const calendarRange = getCalendarRangeForYear(filterYear)

      if (filterStatus) params.set('status', filterStatus)

      const [reqRes, balRes, calRes, metaRes] = await Promise.all([
        fetch(`/api/hr/core/leave/requests?${params}`),
        fetch(`/api/hr/core/leave/balances?year=${filterYear}`),
        fetch(`/api/hr/core/leave/calendar?from=${calendarRange.from}&to=${calendarRange.to}`),
        fetch('/api/hr/core/meta')
      ])

      if (reqRes.ok) {
        setReqData(await reqRes.json())
      } else {
        const payload = await reqRes.json().catch(() => null)

        setError(getHrLeaveErrorMessage(payload, 'No fue posible cargar las solicitudes de permiso.'))
      }

      if (balRes.ok) {
        setBalData(await balRes.json())
      } else {
        const payload = await balRes.json().catch(() => null)

        setError(current => current || getHrLeaveErrorMessage(payload, 'No fue posible cargar los saldos de permisos.'))
      }

      if (calRes.ok) {
        setCalData(await calRes.json())
      } else {
        const payload = await calRes.json().catch(() => null)

        setError(current => current || getHrLeaveErrorMessage(payload, 'No fue posible cargar el calendario de permisos.'))
      }

      if (metaRes.ok) {
        const meta = (await metaRes.json()) as HrCoreMetadata

        setLeaveTypes(meta.leaveTypes ?? [])
        setCurrentMemberId(meta.currentMemberId ?? null)
      } else {
        const payload = await metaRes.json().catch(() => null)

        setError(current => current || getHrLeaveErrorMessage(payload, 'No fue posible cargar los tipos de permiso.'))
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterYear])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (input: CreateLeaveRequestInput) => {
    setCreateSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/hr/core/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!res.ok) {
        const d = await res.json()

        setError(d.error || 'Error al crear solicitud')

        return
      }

      setCreateOpen(false)
      await fetchData()
    } finally {
      setCreateSaving(false)
    }
  }

  const handleReview = async () => {
    if (!reviewReq) return

    setReviewSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/core/leave/requests/${reviewReq.requestId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: reviewAction, notes: reviewNotes || null })
      })

      if (!res.ok) {
        const d = await res.json()

        setError(d.error || 'Error al procesar')

        return
      }

      setReviewReq(null)
      setReviewNotes('')
      fetchData()
    } finally {
      setReviewSaving(false)
    }
  }

  const handleReviewAction = (action: HrApprovalAction) => {
    setReviewAction(action)

    void handleReview()
  }

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
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  const summary = reqData?.summary ?? { total: 0, pendingSupervisor: 0, pendingHr: 0, approved: 0 }
  const requests = reqData?.requests ?? []
  const balances = balData?.balances ?? []

  // Group balances by leave type for radial gauges
  const balancesByType = leaveTypes.map(lt => {
    const memberBalances = balances.filter(b => b.leaveTypeCode === lt.leaveTypeCode)
    const totalAllowance = memberBalances.reduce((s, b) => s + b.allowanceDays, 0)
    const totalUsed = memberBalances.reduce((s, b) => s + b.usedDays, 0)
    const totalAvailable = memberBalances.reduce((s, b) => s + b.availableDays, 0)
    const pctUsed = totalAllowance > 0 ? Math.round((totalUsed / totalAllowance) * 100) : 0

    return { ...lt, totalAllowance, totalUsed, totalAvailable, pctUsed, memberCount: memberBalances.length }
  })

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Button component={Link} href='/hr' variant='tonal' color='secondary' size='small'>
            <i className='tabler-arrow-left' />
          </Button>
          <Box>
            <Typography variant='h4'>Permisos y ausencias</Typography>
            <Typography variant='body2' color='text.secondary'>
              Gestión de solicitudes de permiso
            </Typography>
          </Box>
        </Stack>
        <Button
          variant='contained'
          startIcon={<i className='tabler-calendar-plus' />}
          disabled={loading || activeLeaveTypes.length === 0}
          onClick={() => setCreateOpen(true)}
        >
          Solicitar permiso
        </Button>
      </Stack>

      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

      {/* KPI Row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total solicitudes'
            stats={String(summary.total)}
            avatarIcon='tabler-file-text'
            avatarColor='primary'
            subtitle={`Año ${filterYear}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pendiente supervisor'
            stats={String(summary.pendingSupervisor)}
            avatarIcon='tabler-user-question'
            avatarColor='warning'
            subtitle='Esperando aprobación'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pendiente HR'
            stats={String(summary.pendingHr)}
            avatarIcon='tabler-clock-pause'
            avatarColor='error'
            subtitle='En cola HR'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Aprobadas'
            stats={String(summary.approved)}
            avatarIcon='tabler-circle-check'
            avatarColor='success'
            subtitle='Procesadas exitosamente'
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <TabContext value={tab}>
        <CustomTabList onChange={(_, v) => setTab(v)} variant='scrollable'>
          <Tab value='requests' label='Solicitudes' icon={<i className='tabler-file-text' />} iconPosition='start' />
          <Tab value='calendar' label='Calendario' icon={<i className='tabler-calendar-month' />} iconPosition='start' />
          <Tab value='balances' label='Saldos' icon={<i className='tabler-scale' />} iconPosition='start' />
        </CustomTabList>

        {/* Requests Tab */}
        <TabPanel value='requests' sx={{ p: 0 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Solicitudes'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <i className='tabler-calendar-pause' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              {/* Filters */}
              <Stack direction='row' spacing={2} sx={{ mb: 3 }} flexWrap='wrap'>
                <CustomTextField
                  select
                  size='small'
                  label='Estado'
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as HrLeaveRequestStatus | '')}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {Object.entries(leaveStatusConfig).map(([key, conf]) => (
                    <MenuItem key={key} value={key}>{conf.label}</MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  size='small'
                  label='Año'
                  type='number'
                  value={filterYear}
                  onChange={e => setFilterYear(Number(e.target.value))}
                  sx={{ width: 100 }}
                />
              </Stack>

              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Colaborador</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Desde</TableCell>
                      <TableCell>Hasta</TableCell>
                      <TableCell align='center'>Días</TableCell>
                      <TableCell align='center'>Estado</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map(req => {
                      const typeConf = getLeaveTypeConfig(req.leaveTypeCode)
                      const statusConf = leaveStatusConfig[req.status]
                      const isPending = req.status === 'pending_supervisor' || req.status === 'pending_hr'

                      return (
                        <TableRow key={req.requestId} hover>
                          <TableCell>
                            <Stack direction='row' spacing={1.5} alignItems='center'>
                              <Avatar
                                src={req.memberAvatarUrl || undefined}
                                sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
                              >
                                {getInitials(req.memberName || '')}
                              </Avatar>
                              <Typography variant='body2' fontWeight={500}>{req.memberName}</Typography>
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
                            <Typography variant='body2'>{formatDate(req.startDate)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{formatDate(req.endDate)}</Typography>
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
                          <TableCell>
                            <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {req.reason ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align='right'>
                            {isPending && (
                              <Button
                                variant='tonal'
                                size='small'
                                color='primary'
                                onClick={() => { setReviewReq(req); setReviewAction('approve'); setReviewNotes('') }}
                              >
                                Revisar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                          <Stack alignItems='center' spacing={1}>
                            <i className='tabler-calendar-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                            <Typography color='text.secondary'>No hay solicitudes para los filtros seleccionados.</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value='calendar' sx={{ p: 0 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Calendario operativo de ausencias'
              subheader={
                calData?.holidaySource === 'empty-fallback'
                  ? 'Feriados sin sincronizar desde Nager.Date; usando fallback vacío.'
                  : 'Permisos y feriados derivados desde el calendario operativo canónico.'
              }
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-calendar-month' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <GreenhouseCalendar
                events={calData?.events ?? []}
                initialDate={calData?.from ?? `${filterYear}-01-01`}
              />
            </CardContent>
          </Card>
        </TabPanel>

        {/* Balances Tab */}
        <TabPanel value='balances' sx={{ p: 0 }}>
          <Grid container spacing={6}>
            {balancesByType.map(bt => {
              const conf = getLeaveTypeConfig(bt.leaveTypeCode)

              const gaugeOptions: ApexOptions = {
                chart: { parentHeightOffset: 0, sparkline: { enabled: true } },
                plotOptions: {
                  radialBar: {
                    hollow: { size: '60%' },
                    track: { background: 'var(--mui-palette-action-hover)' },
                    dataLabels: {
                      name: { show: false },
                      value: {
                        show: true,
                        fontSize: '18px',
                        fontWeight: 600,
                        offsetY: 6,
                        formatter: () => `${bt.totalAvailable}`
                      }
                    }
                  }
                },
                colors: [theme.palette[conf.color]?.main ?? theme.palette.primary.main]
              }

              return (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={bt.leaveTypeCode}>
                  <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                    <CardContent>
                      <Stack alignItems='center' spacing={1}>
                        <CustomChip
                          round='true'
                          size='small'
                          icon={<i className={conf.icon} />}
                          label={conf.label}
                          color={conf.color}
                        />
                        <AppReactApexCharts
                          type='radialBar'
                          height={150}
                          options={gaugeOptions}
                          series={[bt.totalAllowance > 0 ? Math.min(100, Math.round(((bt.totalAllowance - bt.totalUsed) / bt.totalAllowance) * 100)) : 0]}
                        />
                        <Typography variant='body2' color='text.secondary'>
                          {bt.totalUsed} usados de {bt.totalAllowance}
                        </Typography>
                        <Typography variant='caption' color='text.disabled'>
                          {bt.totalAvailable} días disponibles
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
            {balancesByType.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <CardContent sx={{ py: 6, textAlign: 'center' }}>
                    <Stack alignItems='center' spacing={1}>
                      <i className='tabler-scale' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                      <Typography color='text.secondary'>No hay saldos de permisos para mostrar.</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </TabContext>

      <LeaveRequestDialog
        open={createOpen}
        saving={createSaving}
        leaveTypes={leaveTypes}
        ownerMemberId={currentMemberId}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Review Dialog */}
      <Dialog
        open={!!reviewReq}
        onClose={() => !reviewSaving && setReviewReq(null)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Revisar solicitud</DialogTitle>
        <Divider />
        {reviewReq && (
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar src={reviewReq.memberAvatarUrl || undefined} sx={{ width: 40, height: 40 }}>
                  {getInitials(reviewReq.memberName || '')}
                </Avatar>
                <Box>
                  <Typography variant='subtitle1' fontWeight={600}>{reviewReq.memberName}</Typography>
                  <CustomChip
                    round='true'
                    size='small'
                    icon={<i className={getLeaveTypeConfig(reviewReq.leaveTypeCode).icon} />}
                    label={getLeaveTypeConfig(reviewReq.leaveTypeCode).label}
                    color={getLeaveTypeConfig(reviewReq.leaveTypeCode).color}
                  />
                </Box>
              </Stack>

              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Desde</Typography>
                      <Typography variant='body2' fontWeight={500}>{formatDate(reviewReq.startDate)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Hasta</Typography>
                      <Typography variant='body2' fontWeight={500}>{formatDate(reviewReq.endDate)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Días</Typography>
                      <Typography variant='body2' fontWeight={600}>{reviewReq.requestedDays}</Typography>
                    </Grid>
                  </Grid>
                  {reviewReq.reason && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Motivo</Typography>
                      <Typography variant='body2'>{reviewReq.reason}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <CustomTextField
                fullWidth
                size='small'
                label='Notas (opcional)'
                multiline
                rows={2}
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setReviewReq(null)} disabled={reviewSaving}>
            Cerrar
          </Button>
          <Button
            variant='tonal'
            color='warning'
            onClick={() => handleReviewAction('cancel')}
            disabled={reviewSaving}
            startIcon={<i className='tabler-ban' />}
          >
            Cancelar solicitud
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={() => handleReviewAction('reject')}
            disabled={reviewSaving}
            startIcon={<i className='tabler-circle-x' />}
          >
            Rechazar
          </Button>
          <Button
            variant='contained'
            color='success'
            onClick={() => handleReviewAction('approve')}
            disabled={reviewSaving}
            startIcon={<i className='tabler-circle-check' />}
          >
            Aprobar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default HrLeaveView
