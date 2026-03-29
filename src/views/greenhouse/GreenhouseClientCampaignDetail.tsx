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

interface Campaign360 {
  campaign: {
    campaignId: string
    eoId: string
    displayName: string
    description: string | null
    campaignType: string
    status: string
    plannedStartDate: string | null
    plannedEndDate: string | null
    plannedLaunchDate: string | null
    tags: string[]
    channels: string[]
    projectCount: number
  }
  metrics: {
    totalTasks: number
    completedTasks: number
    completionPct: number
    rpaAvg: number | null
    otdPct: number | null
    projectCount: number
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

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const pctStr = (v: number | null) => v != null ? `${Math.round(v)}%` : '—'

// ── Component ──

const GreenhouseClientCampaignDetail = ({ campaignId }: { campaignId: string }) => {
  const [data, setData] = useState<Campaign360 | null>(null)
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

  const { campaign: c, metrics: m, team } = data

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
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Proyectos' stats={String(m.projectCount)} avatarIcon='tabler-folders' avatarColor='primary' subtitle={`${m.totalTasks} tasks`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Completadas' stats={String(m.completedTasks)} avatarIcon='tabler-check' avatarColor='success' subtitle={`${m.completionPct}% del total`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='RPA' stats={pctStr(m.rpaAvg)} avatarIcon='tabler-chart-line' avatarColor={(m.rpaAvg ?? 0) <= 1.5 ? 'success' : 'warning'} subtitle='Rendimiento' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='OTD' stats={pctStr(m.otdPct)} avatarIcon='tabler-clock-check' avatarColor={(m.otdPct ?? 0) >= 80 ? 'success' : 'warning'} subtitle='A tiempo' />
      </Grid>

      {/* Tabs */}
      <Grid size={{ xs: 12 }}>
        <TabContext value={tab}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CustomTabList onChange={(_: SyntheticEvent, v: string) => setTab(v)} variant='scrollable' pill='true'>
              <Tab label='Resumen' value='overview' icon={<i className='tabler-layout-dashboard' />} iconPosition='start' />
              <Tab label='Proyectos' value='projects' icon={<i className='tabler-folders' />} iconPosition='start' />
              <Tab label='Equipo' value='team' icon={<i className='tabler-users' />} iconPosition='start' />
            </CustomTabList>
          </Card>

          {/* Overview */}
          <TabPanel value='overview' className='p-0' sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title='Detalles' />
              <Divider />
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {c.description && <Typography variant='body2' color='text.secondary'>{c.description}</Typography>}
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Inicio</Typography>
                    <Typography variant='body2'>{formatDate(c.plannedStartDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Fin</Typography>
                    <Typography variant='body2'>{formatDate(c.plannedEndDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Lanzamiento</Typography>
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
          </TabPanel>

          {/* Projects */}
          <TabPanel value='projects' className='p-0' sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title={`Proyectos (${m.projectCount})`} />
              <Divider />
              {m.projectCount === 0 ? (
                <CardContent>
                  <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                    Sin proyectos vinculados a esta campaña.
                  </Typography>
                </CardContent>
              ) : (
                <CardContent>
                  <Typography variant='body2' color='text.secondary'>
                    {m.totalTasks} tasks totales · {m.completedTasks} completadas
                  </Typography>
                </CardContent>
              )}
            </Card>
          </TabPanel>

          {/* Team */}
          <TabPanel value='team' className='p-0' sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title={`Equipo (${data.teamCount})`} subheader='Personas asignadas a los proyectos de esta campaña' />
              <Divider />
              {team.length === 0 ? (
                <CardContent>
                  <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                    Sin miembros asignados.
                  </Typography>
                </CardContent>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Rol</TableCell>
                        <TableCell>Contacto</TableCell>
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
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default GreenhouseClientCampaignDetail
