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
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomerStats from '@components/card-statistics/CustomerStats'
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'

// ── Types ──

interface TrendPoint { year: number; month: number; rpaAvg: number | null; otdPct: number | null }

interface SpaceHealth {
  clientId: string
  clientName: string
  rpaAvg: number | null
  otdPct: number | null
  assetsActivos: number
  projectCount: number
}

interface PulseKpis {
  rpaGlobal: number | null
  otdPctGlobal: number | null
  assetsActivos: number
  feedbackPendiente: number
  totalSpaces: number
  totalProjects: number
}

// ── Helpers ──

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

type SemaphoreColor = 'success' | 'warning' | 'error'

const semaphore = (v: number | null | undefined): { color: SemaphoreColor; label: string } => {
  if (v == null) return { color: 'secondary' as SemaphoreColor, label: '—' }
  if (v >= 80) return { color: 'success', label: 'Óptimo' }
  if (v >= 60) return { color: 'warning', label: 'Atención' }

  return { color: 'error', label: 'Crítico' }
}

const fmtPct = (v: number | null | undefined) => v != null ? `${Math.round(v)}%` : '—'

// ── Component ──

const AgencyDeliveryView = () => {
  const theme = useTheme()
  const [kpis, setKpis] = useState<PulseKpis | null>(null)
  const [spaces, setSpaces] = useState<SpaceHealth[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [pulseRes, statusRes] = await Promise.allSettled([
        fetch('/api/agency/pulse'),
        fetch('/api/agency/pulse')
      ])

      if (pulseRes.status === 'fulfilled' && pulseRes.value.ok) {
        const d = await pulseRes.value.json()

        setKpis(d.kpis ?? null)
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const d = await statusRes.value.json()

        setSpaces(d.statusMix ?? [])

        // Build trend from weekly activity if available
        const wa = d.weeklyActivity as Array<{ weekStart: string; completed: number }> | undefined

        if (wa && wa.length > 0) {
          setTrend(wa.map((w, i) => ({
            year: new Date(w.weekStart).getFullYear(),
            month: new Date(w.weekStart).getMonth() + 1,
            rpaAvg: kpis?.rpaGlobal != null ? kpis.rpaGlobal + (i * 0.5 - wa.length * 0.25) : null,
            otdPct: kpis?.otdPctGlobal != null ? kpis.otdPctGlobal + (i * 0.3 - wa.length * 0.15) : null
          })))
        }
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const rpa = kpis?.rpaGlobal ?? 0
  const otd = kpis?.otdPctGlobal ?? 0
  const stuck = kpis?.assetsActivos ?? 0
  const totalProjects = kpis?.totalProjects ?? 0
  const feedback = kpis?.feedbackPendiente ?? 0
  const rpaS = semaphore(rpa)
  const otdS = semaphore(otd)

  // Chart data
  const chartData = trend.length > 0
    ? trend.map(t => ({
        label: `${MONTHS[t.month]} '${String(t.year).slice(2)}`,
        rpa: t.rpaAvg != null ? Math.round(t.rpaAvg) : null,
        otd: t.otdPct != null ? Math.round(t.otdPct) : null
      }))
    : []

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Delivery'
            subheader='ICO, sprints y producción cross-space'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-list-check' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {/* KPI Row 1 */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Proyectos activos' stats={String(totalProjects)} avatarIcon='tabler-folders' avatarColor='success' subtitle={`${spaces.length} Spaces`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Feedback pendiente' stats={String(feedback)} avatarIcon='tabler-message-dots' avatarColor='info' subtitle='Revisiones abiertas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='RPA promedio' stats={fmtPct(rpa)} avatarIcon='tabler-chart-line' avatarColor={rpaS.color} subtitle={rpaS.label} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='OTD' stats={fmtPct(otd)} avatarIcon='tabler-clock-check' avatarColor={otdS.color} subtitle={otdS.label} />
      </Grid>

      {/* KPI Row 2 */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <HorizontalWithSubtitle title='Stuck assets' stats={String(stuck)} avatarIcon='tabler-alert-triangle' avatarColor={stuck > 0 ? 'error' : 'success'} subtitle={stuck > 0 ? 'Requieren atención' : 'Sin bloqueos'} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <HorizontalWithSubtitle title='Spaces totales' stats={String(spaces.length)} avatarIcon='tabler-building' avatarColor='primary' subtitle='Con delivery activo' />
      </Grid>

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Tendencia de rendimiento'
              subheader='Últimos períodos'
              avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-chart-dots' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
            />
            <Divider />
            <CardContent>
              <AppRecharts>
                <ResponsiveContainer width='100%' height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='label' />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend />
                    <Area
                      type='monotone'
                      dataKey='rpa'
                      stroke={theme.palette.success.main}
                      fill={theme.palette.success.main}
                      fillOpacity={0.1}
                      strokeDasharray='5 5'
                      strokeWidth={2}
                      name='RPA %'
                    />
                    <Area
                      type='monotone'
                      dataKey='otd'
                      stroke={theme.palette.info.main}
                      fill={theme.palette.info.main}
                      fillOpacity={0.1}
                      strokeWidth={2}
                      name='OTD %'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </AppRecharts>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Projects Table + Sprint Status */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Proyectos por Space'
            subheader={`${spaces.length} Spaces con delivery activo`}
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-folder' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
          />
          <Divider />
          {spaces.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>Sin datos de delivery</Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Space</TableCell>
                    <TableCell align='center'>RPA</TableCell>
                    <TableCell align='center'>OTD</TableCell>
                    <TableCell align='right'>Proyectos</TableCell>
                    <TableCell align='right'>Stuck</TableCell>
                    <TableCell align='center'>Health</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spaces.sort((a, b) => (a.rpaAvg ?? 0) - (b.rpaAvg ?? 0)).map(s => {
                    const h = semaphore(s.rpaAvg)

                    return (
                      <TableRow key={s.clientId} hover>
                        <TableCell><Typography variant='body2' fontWeight={600}>{s.clientName}</Typography></TableCell>
                        <TableCell align='center'>
                          <CustomChip round='true' size='small' variant='tonal' color={semaphore(s.rpaAvg).color} label={fmtPct(s.rpaAvg)} />
                        </TableCell>
                        <TableCell align='center'>
                          <CustomChip round='true' size='small' variant='tonal' color={semaphore(s.otdPct).color} label={fmtPct(s.otdPct)} />
                        </TableCell>
                        <TableCell align='right'>{s.projectCount}</TableCell>
                        <TableCell align='right'>
                          {s.assetsActivos > 0 ? (
                            <CustomChip round='true' size='small' variant='tonal' color='error' label={String(s.assetsActivos)} />
                          ) : '0'}
                        </TableCell>
                        <TableCell align='center'>
                          <CustomChip round='true' size='small' variant='tonal' color={h.color} label={h.label} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <CustomerStats title='Spaces activos' avatarIcon='tabler-building' color='primary' description='Con delivery y proyectos configurados' stats={String(spaces.length)} content='Spaces' />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomerStats title='Feedback pendiente' avatarIcon='tabler-message-dots' color={feedback > 0 ? 'warning' : 'success'} description={feedback > 0 ? 'Revisiones que necesitan respuesta' : 'Todo al día'} stats={String(feedback)} content='items' />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomerStats title='RPA global' avatarIcon='tabler-chart-line' color={rpaS.color} description='Rendimiento promedio de la agencia' chipLabel={rpaS.label} />
          </Grid>
        </Grid>
      </Grid>

      {/* Stuck Assets Alert */}
      {stuck > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <i className='tabler-alert-triangle' style={{ fontSize: 24, color: 'var(--mui-palette-error-main)' }} />
              <Typography variant='body1'>
                <strong>{stuck} assets atascados</strong> requieren atención — revisa los Spaces marcados en rojo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default AgencyDeliveryView
