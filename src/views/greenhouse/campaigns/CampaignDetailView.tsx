'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
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
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// ── Types ──

interface Campaign360Data {
  campaign: {
    campaignId: string
    eoId: string
    displayName: string
    description: string | null
    campaignType: string
    status: string
    plannedStartDate: string | null
    plannedEndDate: string | null
    actualStartDate: string | null
    actualEndDate: string | null
    plannedLaunchDate: string | null
    actualLaunchDate: string | null
    tags: string[]
    channels: string[]
    budgetClp: number | null
    projectCount: number
  }
  metrics: {
    totalTasks: number
    completedTasks: number
    completionPct: number
    rpaAvg: number | null
    otdPct: number | null
    ftrPct: number | null
    stuckCount48h: number
    projectCount: number
  }
  financials: {
    budgetClp: number | null
    actualCostClp: number
    revenueClp: number
    laborCostClp: number
    directCostsClp: number
    marginClp: number
    marginPercent: number | null
    budgetUsedPercent: number | null
  }
  team: Array<{
    memberId: string
    memberName: string
    role: string | null
    email: string | null
    projectCount: number
  }>
  teamCount: number
}

// ── Helpers ──

const STATUS_COLORS: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'primary'> = {
  draft: 'secondary', planning: 'info', active: 'success', paused: 'warning', completed: 'primary', archived: 'secondary'
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', planning: 'Planificación', active: 'Activa', paused: 'Pausada', completed: 'Completada', archived: 'Archivada'
}

const TYPE_LABELS: Record<string, string> = {
  campaign: 'Campaña', launch: 'Lanzamiento', seasonal: 'Temporada', sprint_group: 'Grupo de ciclos', always_on: 'Always-on'
}

const TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'secondary'> = {
  campaign: 'primary', launch: 'success', seasonal: 'warning', sprint_group: 'info', always_on: 'secondary'
}

const formatClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const pctStr = (v: number | null) => v != null ? `${Math.round(v)}%` : '—'

// ── Component ──

const CampaignDetailView = ({ campaignId }: { campaignId: string }) => {
  const [data, setData] = useState<Campaign360Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/360`)

      if (res.ok) setData(await res.json())
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { void fetchData() }, [fetchData])

  if (loading || !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const { campaign: c, metrics: m, financials: f, team } = data

  const marginColor = (f.marginPercent ?? 0) >= 30 ? 'success' : (f.marginPercent ?? 0) >= 15 ? 'warning' : 'error'

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant='h5'>{c.displayName}</Typography>
                <CustomChip round='true' size='small' variant='tonal' color={STATUS_COLORS[c.status] || 'secondary'} label={STATUS_LABELS[c.status] || c.status} />
                <CustomChip round='true' size='small' variant='tonal' color={TYPE_COLORS[c.campaignType] || 'secondary'} label={TYPE_LABELS[c.campaignType] || c.campaignType} />
              </Box>
            }
            subheader={
              <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mt: 0.5 }} color='text.disabled'>
                {c.eoId}
              </Typography>
            }
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', width: 48, height: 48 }}>
                <i className='tabler-flag' style={{ fontSize: 26, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
          />
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <HorizontalWithSubtitle title='Proyectos' stats={String(m.projectCount)} avatarIcon='tabler-folders' avatarColor='primary' subtitle={`${m.totalTasks} tasks`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <HorizontalWithSubtitle title='Completadas' stats={String(m.completedTasks)} avatarIcon='tabler-check' avatarColor='success' subtitle={`${m.completionPct}% del total`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <HorizontalWithSubtitle title='RPA' stats={pctStr(m.rpaAvg)} avatarIcon='tabler-chart-line' avatarColor={(m.rpaAvg ?? 0) >= 70 ? 'success' : (m.rpaAvg ?? 0) >= 40 ? 'warning' : 'error'} subtitle='Rendimiento' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <HorizontalWithSubtitle title='OTD' stats={pctStr(m.otdPct)} avatarIcon='tabler-clock-check' avatarColor={(m.otdPct ?? 0) >= 80 ? 'success' : 'warning'} subtitle='A tiempo' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <HorizontalWithSubtitle title='Equipo' stats={String(data.teamCount)} avatarIcon='tabler-users' avatarColor='info' subtitle='Personas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <HorizontalWithSubtitle title='Margen' stats={pctStr(f.marginPercent)} avatarIcon='tabler-trending-up' avatarColor={marginColor} subtitle={f.marginClp > 0 ? formatClp(f.marginClp) : '—'} />
      </Grid>

      {/* Tabs */}
      <Grid size={{ xs: 12 }}>
        <TabContext value={tab}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CustomTabList onChange={(_: SyntheticEvent, v: string) => setTab(v)} variant='scrollable' pill='true'>
              <Tab label='Resumen' value='overview' icon={<i className='tabler-layout-dashboard' />} iconPosition='start' />
              <Tab label='Proyectos' value='projects' icon={<i className='tabler-folders' />} iconPosition='start' />
              <Tab label='Equipo' value='team' icon={<i className='tabler-users' />} iconPosition='start' />
              <Tab label='Finanzas' value='financials' icon={<i className='tabler-report-money' />} iconPosition='start' />
            </CustomTabList>
          </Card>

          {/* Overview Tab */}
          <TabPanel value='overview' className='p-0' sx={{ mt: 4 }}>
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <CardHeader title='Detalles' />
                  <Divider />
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {c.description && (
                      <Typography variant='body2' color='text.secondary'>{c.description}</Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant='caption' color='text.secondary'>Inicio planificado</Typography>
                        <Typography variant='body2'>{formatDate(c.plannedStartDate)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant='caption' color='text.secondary'>Fin planificado</Typography>
                        <Typography variant='body2'>{formatDate(c.plannedEndDate)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant='caption' color='text.secondary'>Lanzamiento planificado</Typography>
                        <Typography variant='body2'>{formatDate(c.plannedLaunchDate)}</Typography>
                      </Box>
                    </Box>
                    {c.channels.length > 0 && (
                      <Box>
                        <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>Canales</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {c.channels.map(ch => <CustomChip key={ch} round='true' size='small' variant='tonal' color='info' label={ch} />)}
                        </Box>
                      </Box>
                    )}
                    {c.tags.length > 0 && (
                      <Box>
                        <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>Tags</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {c.tags.map(tag => <CustomChip key={tag} round='true' size='small' variant='tonal' color='secondary' label={tag} />)}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <CardHeader title='Presupuesto' />
                  <Divider />
                  <CardContent>
                    {f.budgetClp ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2'>Presupuesto</Typography>
                          <Typography variant='body2' fontWeight={600}>{formatClp(f.budgetClp)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2'>Costo real</Typography>
                          <Typography variant='body2' fontWeight={600}>{formatClp(f.actualCostClp)}</Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={Math.min(100, f.budgetUsedPercent ?? 0)}
                          color={(f.budgetUsedPercent ?? 0) > 90 ? 'error' : (f.budgetUsedPercent ?? 0) > 70 ? 'warning' : 'success'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant='caption' color='text.secondary' textAlign='center'>
                          {pctStr(f.budgetUsedPercent)} del presupuesto utilizado
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>Sin presupuesto asignado</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Projects Tab */}
          <TabPanel value='projects' className='p-0' sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title={`Proyectos vinculados (${m.projectCount})`} />
              <Divider />
              {m.projectCount === 0 ? (
                <CardContent>
                  <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                    Sin proyectos vinculados. Agrega proyectos desde la API.
                  </Typography>
                </CardContent>
              ) : (
                <CardContent>
                  <Typography variant='body2' color='text.secondary'>
                    {m.totalTasks} tasks totales · {m.completedTasks} completadas · {m.stuckCount48h} bloqueadas (&gt;48h)
                  </Typography>
                </CardContent>
              )}
            </Card>
          </TabPanel>

          {/* Team Tab */}
          <TabPanel value='team' className='p-0' sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title={`Equipo derivado (${data.teamCount})`} subheader='Personas asignadas a tasks de los proyectos vinculados' />
              <Divider />
              {team.length === 0 ? (
                <CardContent>
                  <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                    Sin miembros asignados aún.
                  </Typography>
                </CardContent>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Rol</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell align='right'>Proyectos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {team.map(m => (
                        <TableRow key={m.memberId} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{m.memberName}</Typography></TableCell>
                          <TableCell>{m.role ? <CustomChip round='true' size='small' variant='tonal' color='info' label={m.role} /> : '—'}</TableCell>
                          <TableCell><Typography variant='caption' color='text.secondary'>{m.email || '—'}</Typography></TableCell>
                          <TableCell align='right'>{m.projectCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </TabPanel>

          {/* Financials Tab */}
          <TabPanel value='financials' className='p-0' sx={{ mt: 4 }}>
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle title='Revenue' stats={formatClp(f.revenueClp)} avatarIcon='tabler-cash' avatarColor='success' subtitle='Ingresos del cliente' />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle title='Costo laboral' stats={formatClp(f.laborCostClp)} avatarIcon='tabler-users' avatarColor='info' subtitle='FTE asignado' />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle title='Costos directos' stats={formatClp(f.directCostsClp)} avatarIcon='tabler-receipt' avatarColor='warning' subtitle='Gastos allocados' />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle title='Margen' stats={pctStr(f.marginPercent)} avatarIcon='tabler-trending-up' avatarColor={marginColor} subtitle={formatClp(f.marginClp)} />
              </Grid>
            </Grid>
          </TabPanel>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default CampaignDetailView
