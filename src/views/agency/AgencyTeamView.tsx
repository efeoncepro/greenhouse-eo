'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

interface CapacityBreakdown {
  contractedHoursMonth: number
  assignedHoursMonth: number
  usedHoursMonth: number
  availableHoursMonth: number
  overcommitted: boolean
}

interface TeamMember {
  memberId: string
  displayName: string
  roleTitle: string | null
  fteAllocation: number
  capacityHealth: string
  capacity: CapacityBreakdown
}

interface TeamData {
  team: CapacityBreakdown
  members: TeamMember[]
  memberCount: number
  overcommittedCount: number
  overcommittedMembers: Array<{ displayName: string; deficit: number }>
}

const HEALTH_COLORS: Record<string, 'secondary' | 'success' | 'warning' | 'error'> = {
  idle: 'secondary', balanced: 'success', high: 'warning', overloaded: 'error'
}

const HEALTH_LABELS: Record<string, string> = {
  idle: 'Disponible', balanced: 'Balanceado', high: 'Alta carga', overloaded: 'Sobrecargado'
}

const AgencyTeamView = () => {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/team/capacity-breakdown')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  if (!data) return <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}><Box sx={{ textAlign: 'center', py: 6 }}><Typography variant='h6'>Sin datos de capacidad</Typography></Box></Card>

  const healthCounts = data.members.reduce((acc, m) => { acc[m.capacityHealth] = (acc[m.capacityHealth] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Equipo' subheader={`${data.memberCount} personas · Capacidad 4 tipos`} avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-users-group' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>} />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Contratadas' stats={`${data.team.contractedHoursMonth}h`} avatarIcon='tabler-file-certificate' avatarColor='primary' subtitle='Horas contrato/mes' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Asignadas' stats={`${data.team.assignedHoursMonth}h`} avatarIcon='tabler-clock' avatarColor='info' subtitle='FTE comprometido' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Usadas' stats={`${data.team.usedHoursMonth}h`} avatarIcon='tabler-bolt' avatarColor='warning' subtitle='Horas efectivas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Disponibles' stats={`${data.team.availableHoursMonth}h`} avatarIcon='tabler-calendar-stats' avatarColor={data.team.availableHoursMonth < 0 ? 'error' : 'success'} subtitle={data.team.overcommitted ? 'Sobrecomprometido' : 'Capacidad libre'} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {['idle', 'balanced', 'high', 'overloaded'].map(h => (
            <CustomChip key={h} round='true' variant='tonal' color={HEALTH_COLORS[h]} label={`${HEALTH_LABELS[h]}: ${healthCounts[h] || 0}`} />
          ))}
        </Box>
      </Grid>

      {data.overcommittedCount > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' variant='outlined'>
            <strong>{data.overcommittedCount} sobrecargado{data.overcommittedCount !== 1 ? 's' : ''}:</strong>{' '}
            {data.overcommittedMembers.map(m => `${m.displayName} (${m.deficit}h)`).join(', ')}
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Detalle por persona' />
          <Divider />
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell align='right'>FTE</TableCell>
                  <TableCell align='right'>Contratadas</TableCell>
                  <TableCell align='right'>Asignadas</TableCell>
                  <TableCell align='right'>Usadas</TableCell>
                  <TableCell align='right'>Disponibles</TableCell>
                  <TableCell align='center'>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.members.map(m => (
                  <TableRow key={m.memberId} hover>
                    <TableCell><Typography variant='body2' fontWeight={600}>{m.displayName}</Typography></TableCell>
                    <TableCell><Typography variant='caption' color='text.secondary'>{m.roleTitle || '—'}</Typography></TableCell>
                    <TableCell align='right'>{m.fteAllocation.toFixed(1)}</TableCell>
                    <TableCell align='right'>{m.capacity.contractedHoursMonth}h</TableCell>
                    <TableCell align='right'>{m.capacity.assignedHoursMonth}h</TableCell>
                    <TableCell align='right'>{m.capacity.usedHoursMonth}h</TableCell>
                    <TableCell align='right'><Typography color={m.capacity.availableHoursMonth < 0 ? 'error.main' : 'text.primary'}>{m.capacity.availableHoursMonth}h</Typography></TableCell>
                    <TableCell align='center'><CustomChip round='true' size='small' variant='tonal' color={HEALTH_COLORS[m.capacityHealth] || 'secondary'} label={HEALTH_LABELS[m.capacityHealth] || m.capacityHealth} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AgencyTeamView
