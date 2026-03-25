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
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'

// ── Types ──

interface TrendPoint {
  year: number
  month: number
  rpaAvg: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvgDays: number | null
  throughputCount: number | null
}

interface ProjectMetric {
  projectId: string
  projectName: string
  rpaAvg: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvgDays: number | null
  throughputCount: number | null
  stuckAssetCount: number | null
  totalTasks: number | null
  completedTasks: number | null
}

interface AnalyticsData {
  trend: TrendPoint[]
  projects: ProjectMetric[]
}

// ── Helpers ──

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const metricColor = (value: number | null, greenMin: number): 'success' | 'warning' | 'error' => {
  if (value === null) return 'secondary' as unknown as 'error'
  if (value >= greenMin) return 'success'
  if (value >= greenMin * 0.7) return 'warning'

  return 'error'
}

const pct = (v: number | null) => v != null ? `${Math.round(v)}%` : '—'
const num = (v: number | null) => v != null ? String(Math.round(v)) : '—'

// ── Component ──

const GreenhouseDeliveryAnalytics = () => {
  const theme = useTheme()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState(6)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/analytics/delivery?months=${months}`)

      if (res.ok) setData(await res.json())
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => { void fetchData() }, [fetchData])

  const chartData = data?.trend.map(t => ({
    label: `${MONTHS[t.month]} ${String(t.year).slice(2)}`,
    rpa: t.rpaAvg,
    otd: t.otdPct,
    ftr: t.ftrPct,
    cycleTime: t.cycleTimeAvgDays,
    throughput: t.throughputCount
  })) ?? []

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Analytics de delivery'
            subheader='Tendencias y comparativas de rendimiento'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-chart-line' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <CustomTextField
                select
                size='small'
                label='Período'
                value={months}
                onChange={e => setMonths(Number(e.target.value))}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value={3}>3 meses</MenuItem>
                <MenuItem value={6}>6 meses</MenuItem>
                <MenuItem value={12}>12 meses</MenuItem>
              </CustomTextField>
            }
          />
        </Card>
      </Grid>

      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        </Grid>
      ) : !data || data.trend.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant='h6'>Sin datos de tendencia</Typography>
              <Typography variant='body2' color='text.secondary'>Los analytics estarán disponibles después del primer mes de operación.</Typography>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        <>
          {/* RPA + OTD Trend */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title='RPA y OTD%' subheader='Calidad y puntualidad' />
              <Divider />
              <CardContent>
                <AppRecharts>
                  <ResponsiveContainer width='100%' height={280}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='label' />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type='monotone' dataKey='rpa' stroke={theme.palette.primary.main} name='RPA' strokeWidth={2} />
                      <Line type='monotone' dataKey='otd' stroke={theme.palette.success.main} name='OTD%' strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </AppRecharts>
              </CardContent>
            </Card>
          </Grid>

          {/* Throughput */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title='Throughput y Cycle Time' subheader='Volumen y velocidad' />
              <Divider />
              <CardContent>
                <AppRecharts>
                  <ResponsiveContainer width='100%' height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='label' />
                      <YAxis yAxisId='left' />
                      <YAxis yAxisId='right' orientation='right' />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId='left' dataKey='throughput' fill={theme.palette.info.main} name='Completados' />
                      <Line yAxisId='right' type='monotone' dataKey='cycleTime' stroke={theme.palette.warning.main} name='Cycle Time (días)' strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </AppRecharts>
              </CardContent>
            </Card>
          </Grid>

          {/* Project Comparison */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader title='Comparativa por proyecto' subheader='Métricas del último período' />
              <Divider />
              {data.projects.length === 0 ? (
                <CardContent>
                  <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                    Sin datos de proyectos para este período.
                  </Typography>
                </CardContent>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Proyecto</TableCell>
                        <TableCell align='center'>Tasks</TableCell>
                        <TableCell align='center'>RPA</TableCell>
                        <TableCell align='center'>OTD%</TableCell>
                        <TableCell align='center'>FTR%</TableCell>
                        <TableCell align='center'>Cycle Time</TableCell>
                        <TableCell align='center'>Stuck</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.projects.map(p => (
                        <TableRow key={p.projectId} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{p.projectName}</Typography></TableCell>
                          <TableCell align='center'>{num(p.totalTasks)}</TableCell>
                          <TableCell align='center'>
                            <CustomChip round='true' size='small' variant='tonal' color={metricColor(p.rpaAvg, 70)} label={pct(p.rpaAvg)} />
                          </TableCell>
                          <TableCell align='center'>
                            <CustomChip round='true' size='small' variant='tonal' color={metricColor(p.otdPct, 80)} label={pct(p.otdPct)} />
                          </TableCell>
                          <TableCell align='center'>
                            <CustomChip round='true' size='small' variant='tonal' color={metricColor(p.ftrPct, 80)} label={pct(p.ftrPct)} />
                          </TableCell>
                          <TableCell align='center'>{p.cycleTimeAvgDays != null ? `${Math.round(p.cycleTimeAvgDays)}d` : '—'}</TableCell>
                          <TableCell align='center'>
                            {(p.stuckAssetCount ?? 0) > 0 ? (
                              <CustomChip round='true' size='small' variant='tonal' color='error' label={String(p.stuckAssetCount)} />
                            ) : (
                              <Typography variant='caption' color='text.disabled'>0</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default GreenhouseDeliveryAnalytics
