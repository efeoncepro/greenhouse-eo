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
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'
import AppRecharts from '@/libs/styles/AppRecharts'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from '@/libs/Recharts'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()
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

const MONTHS = ['', ...GREENHOUSE_COPY.months.short]

const metricColor = (value: number | null, greenMin: number): 'success' | 'warning' | 'error' => {
  if (value === null) return 'secondary' as unknown as 'error'
  if (value >= greenMin) return 'success'
  if (value >= greenMin * 0.7) return 'warning'

  return 'error'
}

const pct = (v: number | null) => v != null ? `${Math.round(v)}%` : '—'
const num = (v: number | null) => v != null ? String(Math.round(v)) : '—'

// ── Component ──

// ── TanStack columns ──

const projColHelper = createColumnHelper<ProjectMetric>()

 
const projMetricColumns: ColumnDef<ProjectMetric, any>[] = [
  projColHelper.accessor('projectName', { header: 'Proyecto', cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography> }),
  projColHelper.accessor('totalTasks', { header: 'Tasks', cell: ({ getValue }) => num(getValue()), meta: { align: 'center' } }),
  projColHelper.accessor('rpaAvg', { header: 'RPA', cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color={metricColor(getValue(), 70)} label={pct(getValue())} />, meta: { align: 'center' } }),
  projColHelper.accessor('otdPct', { header: 'OTD%', cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color={metricColor(getValue(), 80)} label={pct(getValue())} />, meta: { align: 'center' } }),
  projColHelper.accessor('ftrPct', { header: 'FTR%', cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color={metricColor(getValue(), 80)} label={pct(getValue())} />, meta: { align: 'center' } }),
  projColHelper.accessor('cycleTimeAvgDays', { header: 'Cycle Time', cell: ({ getValue }) => getValue() != null ? `${Math.round(getValue())}d` : '—', meta: { align: 'center' } }),
  projColHelper.accessor('stuckAssetCount', {
    header: 'Stuck',
    cell: ({ getValue }) => (getValue() ?? 0) > 0 ? <CustomChip round='true' size='small' variant='tonal' color='error' label={String(getValue())} /> : <Typography variant='caption' color='text.disabled'>0</Typography>,
    meta: { align: 'center' }
  })
]

const GreenhouseDeliveryAnalytics = () => {
  const theme = useTheme()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [projSorting, setProjSorting] = useState<SortingState>([{ id: 'rpaAvg', desc: false }])
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

  const projTable = useReactTable({
    data: data?.projects ?? [],
    columns: projMetricColumns,
    state: { sorting: projSorting },
    onSortingChange: setProjSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

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
                <div className='overflow-x-auto'>
                  <table className={tableStyles.table}>
                    <thead>
                      {projTable.getHeaderGroups().map(hg => (
                        <tr key={hg.id}>
                          {hg.headers.map(header => (
                            <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {projTable.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default GreenhouseDeliveryAnalytics
