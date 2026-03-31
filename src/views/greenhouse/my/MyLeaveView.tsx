'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import GreenhouseCalendar from '@/components/greenhouse/GreenhouseCalendar'
import LeaveRequestDialog from '@/components/greenhouse/LeaveRequestDialog'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import type {
  CreateLeaveRequestInput,
  HrLeaveCalendarResponse,
  HrLeaveRequest,
  HrLeaveRequestsResponse,
  HrLeaveType
} from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'
import { formatDate, getLeaveTypeConfig, leaveStatusConfig } from '../hr-core/helpers'

interface LeaveData {
  leave: {
    vacationAllowance: number
    vacationCarried: number
    vacationUsed: number
    vacationReserved: number
    vacationAvailable: number
    personalAllowance: number
    personalUsed: number
    pendingRequests: number
    approvedRequestsThisYear: number
    totalApprovedDaysThisYear: number
  } | null
  memberId: string
  requests: HrLeaveRequestsResponse
  calendar: HrLeaveCalendarResponse
}

const MyLeaveView = () => {
  const [data, setData] = useState<LeaveData | null>(null)
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [leaveRes, metaRes] = await Promise.all([
        fetch('/api/my/leave'),
        fetch('/api/hr/core/meta')
      ])

      if (!leaveRes.ok) {
        const payload = await leaveRes.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible cargar tus permisos.')
      }

      setData(await leaveRes.json())

      if (metaRes.ok) {
        const meta = await metaRes.json()

        setLeaveTypes(meta.leaveTypes ?? [])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (input: CreateLeaveRequestInput) => {
    setCreateSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/hr/core/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible crear la solicitud.')
      }

      setCreateOpen(false)
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No fue posible crear la solicitud.')
    } finally {
      setCreateSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const leave = data?.leave
  const requests = data?.requests.requests ?? []
  const calendar = data?.calendar

  return (
    <Stack spacing={6}>
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
        <Box>
          <Typography variant='h4'>Mis Permisos</Typography>
          <Typography variant='body2' color='text.secondary'>
            Vacaciones, personales y solicitudes conectadas al calendario operativo.
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<i className='tabler-calendar-plus' />}
          disabled={leaveTypes.filter(item => item.active).length === 0}
          onClick={() => setCreateOpen(true)}
        >
          Solicitar permiso
        </Button>
      </Stack>

      {error && (
        <Alert severity='error' onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!leave ? (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <i className='tabler-calendar-off' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography variant='h6' sx={{ mt: 2 }}>Sin datos de permisos disponibles</Typography>
            <Typography variant='body2' color='text.secondary'>
              Los saldos aparecerán cuando el módulo HR esté configurado.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Vacaciones disponibles'
                stats={String(leave.vacationAvailable)}
                avatarIcon='tabler-beach'
                avatarColor='success'
                subtitle={`${leave.vacationAllowance} base + ${leave.vacationCarried} arrastre`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Vacaciones usadas'
                stats={String(leave.vacationUsed)}
                avatarIcon='tabler-calendar-check'
                avatarColor='info'
                subtitle={`${leave.vacationReserved} reservadas`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Personales disponibles'
                stats={String(Math.max(leave.personalAllowance - leave.personalUsed, 0))}
                avatarIcon='tabler-user-heart'
                avatarColor='primary'
                subtitle={`${leave.personalUsed} usados este año`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Pendientes'
                stats={String(leave.pendingRequests)}
                avatarIcon='tabler-clock'
                avatarColor={leave.pendingRequests > 0 ? 'warning' : 'secondary'}
                subtitle='Solicitudes en revisión'
              />
            </Grid>
          </Grid>

          <Grid container spacing={6}>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
                <CardHeader title='Resumen del año' />
                <Divider />
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant='h4'>{leave.approvedRequestsThisYear}</Typography>
                      <Typography variant='caption' color='text.secondary'>Solicitudes aprobadas</Typography>
                    </Box>
                    <Box>
                      <Typography variant='h4'>{leave.totalApprovedDaysThisYear}</Typography>
                      <Typography variant='caption' color='text.secondary'>Días aprobados acumulados</Typography>
                    </Box>
                    <Box>
                      <Typography variant='h4'>{leave.vacationReserved}</Typography>
                      <Typography variant='caption' color='text.secondary'>Días reservados</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 8 }}>
              <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                <CardHeader
                  title='Calendario de ausencias'
                  subheader={
                    calendar?.holidaySource === 'empty-fallback'
                      ? 'Feriados sin sincronizar desde Nager.Date; usando fallback vacío.'
                      : 'Feriados y permisos derivados del calendario operativo.'
                  }
                />
                <Divider />
                <CardContent>
                  <GreenhouseCalendar
                    events={calendar?.events ?? []}
                    initialDate={calendar?.from ?? new Date().toISOString().slice(0, 10)}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader title='Historial de solicitudes' />
            <Divider />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Desde</TableCell>
                      <TableCell>Hasta</TableCell>
                      <TableCell align='center'>Días</TableCell>
                      <TableCell align='center'>Estado</TableCell>
                      <TableCell>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((request: HrLeaveRequest) => {
                      const typeConfig = getLeaveTypeConfig(request.leaveTypeCode)
                      const statusConfig = leaveStatusConfig[request.status]

                      return (
                        <TableRow key={request.requestId} hover>
                          <TableCell>
                            <Stack direction='row' spacing={1.5} alignItems='center'>
                              <Avatar src={request.memberAvatarUrl || undefined} sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                {getInitials(request.memberName || '')}
                              </Avatar>
                              <CustomChip
                                round='true'
                                size='small'
                                icon={<i className={typeConfig.icon} />}
                                label={typeConfig.label}
                                color={typeConfig.color}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>{formatDate(request.startDate)}</TableCell>
                          <TableCell>{formatDate(request.endDate)}</TableCell>
                          <TableCell align='center'>{request.requestedDays}</TableCell>
                          <TableCell align='center'>
                            <CustomChip
                              round='true'
                              size='small'
                              icon={<i className={statusConfig.icon} />}
                              label={statusConfig.label}
                              color={statusConfig.color === 'default' ? 'secondary' : statusConfig.color}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {request.reason || request.notes || 'Sin observaciones'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align='center' sx={{ py: 6 }}>
                          <Typography color='text.secondary'>Todavía no tienes solicitudes registradas.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      <LeaveRequestDialog
        open={createOpen}
        saving={createSaving}
        leaveTypes={leaveTypes}
        ownerMemberId={data?.memberId ?? null}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </Stack>
  )
}

export default MyLeaveView
