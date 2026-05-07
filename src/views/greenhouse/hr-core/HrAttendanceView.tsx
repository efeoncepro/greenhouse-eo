'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { HrAttendanceResponse, HrAttendanceStatus } from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'
import { attendanceStatusConfig, formatDate, formatTimestamp, mondayThisWeekISO, todayISO } from './helpers'

const TASK407_EMPTY_NO_HAY_REGISTROS_DE_ASISTENCIA_PARA_EL_RANGO_SELECCIONADO = "No hay registros de asistencia para el rango seleccionado."


const HrAttendanceView = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HrAttendanceResponse | null>(null)
  const [filterFrom, setFilterFrom] = useState(mondayThisWeekISO())
  const [filterTo, setFilterTo] = useState(todayISO())
  const [filterStatus, setFilterStatus] = useState<HrAttendanceStatus | ''>('')

  const fetchData = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams()

    if (filterFrom) params.set('dateFrom', filterFrom)
    if (filterTo) params.set('dateTo', filterTo)
    if (filterStatus) params.set('status', filterStatus)

    const res = await fetch(`/api/hr/core/attendance?${params}`)

    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [filterFrom, filterTo, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

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

  const summary = data?.summary ?? { total: 0, present: 0, late: 0, absent: 0, excused: 0 }
  const records = data?.records ?? []

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' spacing={2} alignItems='center'>
        <Button component={Link} href='/hr' variant='tonal' color='secondary' size='small'>
          <i className='tabler-arrow-left' />
        </Button>
        <Box>
          <Typography variant='h4'>Asistencia</Typography>
          <Typography variant='body2' color='text.secondary'>
            Registro de asistencia del equipo
          </Typography>
        </Box>
      </Stack>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total registros'
            stats={String(summary.total)}
            avatarIcon='tabler-list-check'
            avatarColor='primary'
            subtitle='En el rango seleccionado'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Presentes'
            stats={String(summary.present)}
            avatarIcon='tabler-clock-check'
            avatarColor='success'
            subtitle={summary.total > 0 ? `${Math.round((summary.present / summary.total) * 100)}% del total` : 'Sin registros'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Tardanzas'
            stats={String(summary.late)}
            avatarIcon='tabler-clock-exclamation'
            avatarColor='warning'
            subtitle={summary.total > 0 ? `${Math.round((summary.late / summary.total) * 100)}% del total` : 'Sin registros'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Ausencias'
            stats={String(summary.absent)}
            avatarIcon='tabler-clock-x'
            avatarColor='error'
            subtitle={summary.total > 0 ? `${Math.round((summary.absent / summary.total) * 100)}% del total` : 'Sin registros'}
          />
        </Grid>
      </Grid>

      {/* Records Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registros de asistencia'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
              <i className='tabler-clock-check' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          {/* Filters */}
          <Stack direction='row' spacing={2} sx={{ mb: 3 }} flexWrap='wrap'>
            <CustomTextField
              size='small'
              label='Desde'
              type='date'
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <CustomTextField
              size='small'
              label='Hasta'
              type='date'
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <CustomTextField
              select
              size='small'
              label='Estado'
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as HrAttendanceStatus | '')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value=''>Todos</MenuItem>
              {Object.entries(attendanceStatusConfig).map(([key, conf]) => (
                <MenuItem key={key} value={key}>{conf.label}</MenuItem>
              ))}
            </CustomTextField>
          </Stack>

          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align='center'>Estado</TableCell>
                  <TableCell>Fuente</TableCell>
                  <TableCell>Ingreso</TableCell>
                  <TableCell align='right'>Minutos</TableCell>
                  <TableCell>Notas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map(rec => {
                  const conf = attendanceStatusConfig[rec.attendanceStatus]

                  return (
                    <TableRow key={rec.attendanceId} hover>
                      <TableCell>
                        <Stack direction='row' spacing={1.5} alignItems='center'>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                            {getInitials(rec.memberName || '')}
                          </Avatar>
                          <Typography variant='body2' fontWeight={500}>{rec.memberName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(rec.attendanceDate)}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true'
                          size='small'
                          icon={<i className={conf.icon} />}
                          label={conf.label}
                          color={conf.color === 'default' ? 'secondary' : conf.color}
                        />
                      </TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' label={rec.sourceSystem} color='secondary' />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {rec.meetingJoinedAt ? formatTimestamp(rec.meetingJoinedAt) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {rec.minutesPresent != null ? `${rec.minutesPresent} min` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.notes ?? '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                      <Stack alignItems='center' spacing={1}>
                        <i className='tabler-clock-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography color='text.secondary'>{TASK407_EMPTY_NO_HAY_REGISTROS_DE_ASISTENCIA_PARA_EL_RANGO_SELECCIONADO}</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default HrAttendanceView
