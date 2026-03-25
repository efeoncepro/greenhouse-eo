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
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'

interface IcoData {
  hasData: boolean
  health: 'green' | 'yellow' | 'red' | null
  current: {
    rpaAvg: number | null
    otdPct: number | null
    ftrPct: number | null
    cycleTimeAvgDays: number | null
    throughputCount: number | null
    periodYear: number
    periodMonth: number
  } | null
  trend: Array<{
    periodYear: number
    periodMonth: number
    rpaAvg: number | null
    otdPct: number | null
  }>
}

interface OperationalData {
  hasData: boolean
  current: {
    tasksCompleted: number
    tasksActive: number
    stuckAssetCount: number
  } | null
}

interface PerfData {
  ico: IcoData | null
  operational: OperationalData | null
}

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const pct = (v: number | null) => v != null ? `${Math.round(v)}%` : '—'
const num = (v: number | null) => v != null ? String(Math.round(v)) : '—'

const healthColor = (h: string | null): 'success' | 'warning' | 'error' => {
  if (h === 'green') return 'success'
  if (h === 'yellow') return 'warning'

  return 'error'
}

const healthLabel = (h: string | null): string => {
  if (h === 'green') return 'Óptimo'
  if (h === 'yellow') return 'Atención'

  return 'Crítico'
}

const MyPerformanceView = () => {
  const theme = useTheme()
  const [data, setData] = useState<PerfData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/my/performance')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const ico = data?.ico
  const ops = data?.operational
  const current = ico?.current
  const trend = ico?.trend ?? []

  const chartData = trend.map(t => ({
    label: `${MONTHS[t.periodMonth]} ${String(t.periodYear).slice(2)}`,
    rpa: t.rpaAvg,
    otd: t.otdPct
  }))

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mi Desempeño'
            subheader='Métricas ICO y operativas'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-chart-bar' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
            action={ico?.health ? <CustomChip round='true' variant='tonal' color={healthColor(ico.health)} label={healthLabel(ico.health)} /> : null}
          />
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='RPA' stats={current?.rpaAvg != null ? current.rpaAvg.toFixed(1) : '—'} avatarIcon='tabler-chart-line' avatarColor={(current?.rpaAvg ?? 99) <= 1.5 ? 'success' : 'warning'} subtitle='Rendimiento' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='OTD' stats={pct(current?.otdPct ?? null)} avatarIcon='tabler-clock-check' avatarColor={(current?.otdPct ?? 0) >= 80 ? 'success' : 'warning'} subtitle='A tiempo' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='FTR' stats={pct(current?.ftrPct ?? null)} avatarIcon='tabler-target' avatarColor={(current?.ftrPct ?? 0) >= 80 ? 'success' : 'warning'} subtitle='Primera entrega' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='Throughput' stats={num(current?.throughputCount ?? null)} avatarIcon='tabler-bolt' avatarColor='info' subtitle='Completados/mes' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='Cycle Time' stats={current?.cycleTimeAvgDays != null ? `${Math.round(current.cycleTimeAvgDays)}d` : '—'} avatarIcon='tabler-rotate-clockwise' avatarColor='secondary' subtitle='Días promedio' />
      </Grid>

      {/* Trend */}
      {chartData.length > 1 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='Tendencia 6 meses' />
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
      )}

      {/* Operational */}
      {ops?.hasData && ops.current && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='Resumen operativo' />
            <Divider />
            <CardContent sx={{ display: 'flex', gap: 4 }}>
              <Box><Typography variant='h4'>{ops.current.tasksCompleted}</Typography><Typography variant='caption' color='text.secondary'>Completadas</Typography></Box>
              <Box><Typography variant='h4'>{ops.current.tasksActive}</Typography><Typography variant='caption' color='text.secondary'>Activas</Typography></Box>
              <Box><Typography variant='h4' color={ops.current.stuckAssetCount > 0 ? 'error.main' : 'text.primary'}>{ops.current.stuckAssetCount}</Typography><Typography variant='caption' color='text.secondary'>Bloqueadas</Typography></Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default MyPerformanceView
