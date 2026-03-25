'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import CustomerStats from '@components/card-statistics/CustomerStats'

// ── Types ──

interface OpsKpis {
  outboxEvents24h: number
  pendingProjections: number
  notificationsSent24h: number
  activeSyncs: number
}

interface Subsystem {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  processed: number
  failed: number
  lastRun: string | null
}

interface RecentEvent {
  eventType: string
  aggregateType: string
  aggregateId: string
  occurredAt: string
  status: string
}

interface FailedProjection {
  projectionName: string
  entityType: string
  entityId: string
  failedAt: string
  errorMessage: string
}

interface OpsData {
  kpis: OpsKpis
  subsystems: Subsystem[]
  recentEvents: RecentEvent[]
  failedProjections: FailedProjection[]
}

// ── Helpers ──

const statusColor = (s: string): 'success' | 'warning' | 'error' => {
  if (s === 'healthy' || s === 'processed') return 'success'
  if (s === 'degraded' || s === 'pending') return 'warning'

  return 'error'
}

const statusLabel = (s: string): string => {
  if (s === 'healthy') return 'Saludable'
  if (s === 'degraded') return 'Degradado'
  if (s === 'down') return 'Caído'
  if (s === 'processed') return 'Procesado'
  if (s === 'pending') return 'Pendiente'
  if (s === 'failed') return 'Fallido'

  return s
}

const timeAgo = (iso: string | null): string => {
  if (!iso) return 'Nunca'

  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)

  if (mins < 1) return 'Ahora'
  if (mins < 60) return `hace ${mins}m`

  const hrs = Math.floor(mins / 60)

  if (hrs < 24) return `hace ${hrs}h`

  const days = Math.floor(hrs / 24)

  return `hace ${days}d`
}

const subsystemIcon = (name: string): string => {
  const map: Record<string, string> = {
    Outbox: 'tabler-send',
    Proyecciones: 'tabler-refresh',
    Notificaciones: 'tabler-bell',
    'Notion Sync': 'tabler-brand-notion',
    'Services Sync': 'tabler-cloud-download',
    'ICO Sync': 'tabler-cpu'
  }

  return map[name] || 'tabler-server'
}

// ── Component ──

const AgencyOperationsView = () => {
  const [data, setData] = useState<OpsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/agency/operations')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const kpis = data?.kpis ?? { outboxEvents24h: 0, pendingProjections: 0, notificationsSent24h: 0, activeSyncs: 0 }
  const subsystems = data?.subsystems ?? []
  const events = data?.recentEvents ?? []
  const failed = data?.failedProjections ?? []

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Operaciones'
            subheader='Salud del platform y subsistemas'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-server' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Eventos outbox' stats={String(kpis.outboxEvents24h)} avatarIcon='tabler-send' avatarColor='primary' subtitle='Últimas 24 horas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Proyecciones pendientes' stats={String(kpis.pendingProjections)} avatarIcon='tabler-refresh' avatarColor={kpis.pendingProjections > 0 ? 'warning' : 'success'} subtitle={kpis.pendingProjections > 0 ? 'En cola' : 'Todo procesado'} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Notificaciones' stats={String(kpis.notificationsSent24h)} avatarIcon='tabler-bell-ringing' avatarColor='info' subtitle='Enviadas últimas 24h' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Syncs activos' stats={String(kpis.activeSyncs)} avatarIcon='tabler-plug-connected' avatarColor='success' subtitle='Fuentes configuradas' />
      </Grid>

      {/* Subsystem Health Grid */}
      {subsystems.map(s => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.name}>
          <CustomerStats
            title={s.name}
            avatarIcon={subsystemIcon(s.name)}
            color={statusColor(s.status)}
            description={s.lastRun ? `Última ejecución: ${timeAgo(s.lastRun)}` : `${s.processed} procesados, ${s.failed} fallidos`}
            chipLabel={statusLabel(s.status)}
          />
        </Grid>
      ))}

      {/* Recent Events Table */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Últimos eventos'
            subheader={`${events.length} eventos recientes del outbox`}
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-list' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
          />
          <Divider />
          {events.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>Sin eventos recientes</Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Agregado</TableCell>
                    <TableCell>Hora</TableCell>
                    <TableCell align='center'>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((e, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.eventType}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{e.aggregateType}:{e.aggregateId.slice(0, 12)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>{timeAgo(e.occurredAt)}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip round='true' size='small' variant='tonal' color={statusColor(e.status)} label={statusLabel(e.status)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>

      {/* Failed Projections Alert */}
      {failed.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
            <CardHeader
              title='Proyecciones fallidas'
              subheader={`${failed.length} proyecciones con errores`}
              avatar={<Avatar variant='rounded' sx={{ bgcolor: 'error.lightOpacity' }}><i className='tabler-alert-triangle' style={{ fontSize: 22, color: 'var(--mui-palette-error-main)' }} /></Avatar>}
            />
            <Divider />
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Proyección</TableCell>
                    <TableCell>Entidad</TableCell>
                    <TableCell>Hora</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {failed.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell><Typography variant='body2' fontWeight={600}>{f.projectionName}</Typography></TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{f.entityType}:{f.entityId.slice(0, 12)}</Typography>
                      </TableCell>
                      <TableCell><Typography variant='caption' color='text.secondary'>{timeAgo(f.failedAt)}</Typography></TableCell>
                      <TableCell>
                        <Typography variant='body2' color='error.main' sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.errorMessage.length > 80 ? `${f.errorMessage.slice(0, 80)}…` : f.errorMessage}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default AgencyOperationsView
