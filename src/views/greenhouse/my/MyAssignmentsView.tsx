'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { fteToHours, hoursToFte } from '@/lib/team-capacity/units'

interface Assignment {
  assignmentId: string
  clientId: string
  clientName: string
  fteAllocation: number
  hoursPerMonth: number
  roleTitleOverride: string | null
  startDate: string | null
  active: boolean
}

interface AssignmentsData {
  assignments: Assignment[]
  capacity?: {
    periodYear: number
    periodMonth: number
    contractedFte: number
    contractedHours: number
    assignedHours: number
    usageKind: string
    usedHours: number | null
    usagePercent: number | null
    commercialAvailabilityHours: number
    operationalAvailabilityHours: number | null
    targetCurrency: string | null
    costPerHourTarget: number | null
    suggestedBillRateTarget: number | null
  } | null
}

const formatHours = (value: number | null | undefined) => (value == null ? '—' : `${value}h`)
const formatUsage = (usageKind: string | undefined, usedHours: number | null | undefined, usagePercent: number | null | undefined) => {
  if (usageKind === 'hours') return formatHours(usedHours ?? null)
  if (usageKind === 'percent' && usagePercent != null) return `${usagePercent}%`

  return '—'
}

const MyAssignmentsView = () => {
  const [data, setData] = useState<AssignmentsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/my/assignments')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const assignments = data?.assignments ?? []
  const activeAssignments = assignments.filter(assignment => assignment.active)
  const capacity = data?.capacity ?? null
  const totalFte = capacity ? hoursToFte(capacity.assignedHours) : activeAssignments.reduce((sum, assignment) => sum + (assignment.fteAllocation || 0), 0)
  const totalHours = capacity?.assignedHours ?? fteToHours(totalFte)
  const contractedHours = capacity?.contractedHours ?? fteToHours(Math.min(1, totalFte))
  const commercialAvailability = capacity?.commercialAvailabilityHours ?? Math.max(0, contractedHours - totalHours)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mis Asignaciones'
            subheader='Clientes, dedicación y capacidad'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-users' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 3 }}>
        <HorizontalWithSubtitle title='FTE asignado' stats={totalFte.toFixed(1)} avatarIcon='tabler-clock' avatarColor='primary' subtitle={`${activeAssignments.length} asignaciones activas`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <HorizontalWithSubtitle title='Horas asignadas' stats={`${totalHours}h`} avatarIcon='tabler-hourglass' avatarColor='info' subtitle='Por mes' />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <HorizontalWithSubtitle title='Disponible comercial' stats={`${commercialAvailability}h`} avatarIcon='tabler-calendar-stats' avatarColor={commercialAvailability <= 0 ? 'warning' : 'success'} subtitle='Capacidad restante' />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <HorizontalWithSubtitle title='Uso operativo' stats={formatUsage(capacity?.usageKind, capacity?.usedHours, capacity?.usagePercent)} avatarIcon='tabler-bolt' avatarColor='warning' subtitle={capacity?.usageKind === 'hours' ? 'Horas efectivas' : capacity?.usageKind === 'percent' ? 'Índice operativo' : 'Sin métricas operativas'} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          {assignments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant='h6'>Sin asignaciones activas</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>Dedicación</TableCell>
                    <TableCell align='right'>Horas/mes</TableCell>
                    <TableCell>Desde</TableCell>
                    <TableCell align='center'>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map(a => (
                    <TableRow key={a.assignmentId} hover>
                      <TableCell><Typography variant='body2' fontWeight={600}>{a.clientName}</Typography></TableCell>
                      <TableCell><Typography variant='caption' color='text.secondary'>{a.roleTitleOverride || '—'}</Typography></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 100 }}>
                          <LinearProgress variant='determinate' value={Math.min(100, (a.fteAllocation || 0) * 100)} sx={{ width: 60, height: 6, borderRadius: 3 }} />
                          <Typography variant='body2'>{Math.round((a.fteAllocation || 0) * 100)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align='right'>{a.hoursPerMonth || fteToHours(a.fteAllocation || 0)}</TableCell>
                      <TableCell><Typography variant='caption'>{a.startDate || '—'}</Typography></TableCell>
                      <TableCell align='center'>
                        <CustomChip round='true' size='small' variant='tonal' color={a.active ? 'success' : 'secondary'} label={a.active ? 'Activo' : 'Inactivo'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default MyAssignmentsView
