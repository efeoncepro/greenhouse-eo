'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import dynamic from 'next/dynamic'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import {
  AgencyMetricStatusChip,
  getAgencyMetricFooterLabel,
  getAgencyMetricStatusColor,
  getAgencyMetricStatusLabel,
  getAgencyMetricSupportLabel,
  getAgencyMetricTone
} from '@/components/agency/metric-trust'
import type { AgencyDeliveryTrendMonth, AgencyPulseKpis, AgencySpaceHealth } from '@/lib/agency/agency-queries'

import tableStyles from '@core/styles/table.module.css'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// ── Types ──

type SpaceHealth = AgencySpaceHealth
type PulseKpis = AgencyPulseKpis
type TrendMonth = AgencyDeliveryTrendMonth

// ── Helpers ──

type SemaphoreColor = 'success' | 'warning' | 'error'

const MONTH_ABBR = GREENHOUSE_COPY.months.short

const rpaColor = (v: number | null | undefined): { color: SemaphoreColor; label: string } => {
  if (v == null) return { color: 'secondary' as SemaphoreColor, label: '—' }
  if (v <= 1.5) return { color: 'success', label: 'Óptimo' }
  if (v <= 2.5) return { color: 'warning', label: 'Atención' }

  return { color: 'error', label: 'Crítico' }
}

const pctSemaphore = (v: number | null | undefined): { color: SemaphoreColor; label: string } => {
  if (v == null) return { color: 'secondary' as SemaphoreColor, label: '—' }
  if (v >= 80) return { color: 'success', label: 'Óptimo' }
  if (v >= 60) return { color: 'warning', label: 'Atención' }

  return { color: 'error', label: 'Crítico' }
}

const fmtRpa = (v: number | null | undefined) => v != null ? v.toFixed(1) : '—'
const fmtPct = (v: number | null | undefined) => v != null ? `${Math.round(v)}%` : '—'

const trendDelta = (trend: TrendMonth[], field: 'otdPct' | 'rpaAvg' | 'ftrPct'): {
  text: string
  number: string
  direction: 'positive' | 'negative' | 'neutral'
  prevLabel: string
} | null => {
  if (trend.length < 2) return null

  const current = trend[trend.length - 1][field]
  const previous = trend[trend.length - 2][field]

  if (current == null || previous == null) return null

  const delta = Math.round((current - previous) * 10) / 10
  const prevLabel = MONTH_ABBR[(trend[trend.length - 2].month - 1) % 12]

  // For RPA, lower is better — invert direction
  const isInverted = field === 'rpaAvg'
  const direction = delta === 0 ? 'neutral' as const : isInverted ? (delta < 0 ? 'positive' as const : 'negative' as const) : (delta > 0 ? 'positive' as const : 'negative' as const)

  return {
    text: `${delta >= 0 ? '+' : ''}${delta}pp vs ${prevLabel}`,
    number: `${Math.abs(delta)}pp`,
    direction,
    prevLabel
  }
}

// ── Table columns ──

const spaceColumnHelper = createColumnHelper<SpaceHealth>()

 
const spaceColumns: ColumnDef<SpaceHealth, any>[] = [
  spaceColumnHelper.accessor('clientName', {
    header: 'Space',
    cell: ({ getValue }) => (
      <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
    )
  }),
  spaceColumnHelper.accessor('otdPct', {
    header: 'OTD',
    cell: ({ getValue, row }) => (
      <Stack spacing={0.5} alignItems='flex-start'>
        <CustomChip round='true' size='small' variant='tonal' color={getAgencyMetricTone(row.original.otdMetric)} label={fmtPct(getValue())} />
        <AgencyMetricStatusChip metric={row.original.otdMetric} />
      </Stack>
    ),
    meta: { align: 'center' }
  }),
  spaceColumnHelper.accessor('rpaAvg', {
    header: 'RpA',
    cell: ({ getValue, row }) => (
      <Stack spacing={0.5} alignItems='flex-start'>
        <CustomChip round='true' size='small' variant='tonal' color={getAgencyMetricTone(row.original.rpaMetric)} label={fmtRpa(getValue())} />
        <AgencyMetricStatusChip metric={row.original.rpaMetric} />
      </Stack>
    ),
    meta: { align: 'center' }
  }),
  spaceColumnHelper.accessor('projectCount', {
    header: 'Proyectos',
    meta: { align: 'right' }
  }),
  spaceColumnHelper.accessor('assetsActivos', {
    header: 'Stuck',
    cell: ({ getValue }) => getValue() > 0
      ? <CustomChip round='true' size='small' variant='tonal' color='error' label={String(getValue())} />
      : <Typography variant='body2' color='text.secondary'>0</Typography>,
    meta: { align: 'right' }
  }),
  {
    id: 'health',
    header: 'Health',
    accessorFn: (row: SpaceHealth) => row.otdPct,
    cell: ({ row }: { row: { original: SpaceHealth } }) => {
      const h = row.original.otdPct != null ? pctSemaphore(row.original.otdPct) : rpaColor(row.original.rpaAvg)

      return <CustomChip round='true' size='small' variant='tonal' color={h.color} label={h.label} />
    },
    meta: { align: 'center' }
  }
]

// ── Component ──

const AgencyDeliveryView = () => {
  const theme = useTheme()
  const [kpis, setKpis] = useState<PulseKpis | null>(null)
  const [spaces, setSpaces] = useState<SpaceHealth[]>([])
  const [trend, setTrend] = useState<TrendMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [spaceSorting, setSpaceSorting] = useState<SortingState>([{ id: 'otdPct', desc: false }])

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [pulseRes, spacesRes] = await Promise.allSettled([
        fetch('/api/agency/pulse'),
        fetch('/api/agency/spaces')
      ])

      if (pulseRes.status === 'fulfilled' && pulseRes.value.ok) {
        const d = await pulseRes.value.json()

        setKpis(d.kpis ?? null)
        setTrend(d.deliveryTrend ?? [])
      }

      if (spacesRes.status === 'fulfilled' && spacesRes.value.ok) {
        const d = await spacesRes.value.json()

        const deliverySpaces = (d.spaces ?? []).filter((s: SpaceHealth & { isInternal?: boolean }) => !s.isInternal)

        setSpaces(deliverySpaces)
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const spaceTable = useReactTable({
    data: spaces,
    columns: spaceColumns,
    state: { sorting: spaceSorting },
    onSortingChange: setSpaceSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  // Health distribution for donut chart
  const healthDistribution = useMemo(() => {
    let optimo = 0, atencion = 0, critico = 0, sinDatos = 0

    for (const s of spaces) {
      const h = s.otdPct != null ? pctSemaphore(s.otdPct) : rpaColor(s.rpaAvg)

      if (h.color === 'success') optimo++
      else if (h.color === 'warning') atencion++
      else if (h.color === 'error') critico++
      else sinDatos++
    }

    return { optimo, atencion, critico, sinDatos }
  }, [spaces])

  // OTD sparkline data
  const otdSparkline = useMemo(() => trend.map(t => t.otdPct ?? 0), [trend])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const rpa = kpis?.rpaGlobal ?? null
  const otd = kpis?.otdPctGlobal ?? null
  const rpaMetric = kpis?.rpaMetric ?? null
  const otdMetric = kpis?.otdMetric ?? null
  const activeAssets = kpis?.assetsActivos ?? 0
  const feedback = kpis?.feedbackPendiente ?? 0
  const totalProjects = kpis?.totalProjects ?? 0
  const otdS = pctSemaphore(otd)
  const spacesWithActiveAssets = spaces.filter(s => s.assetsActivos > 0).length
  const latestCompleted = trend.length > 0 ? trend[trend.length - 1].completedTasks : 0

  // Donut chart config
  const donutSeries = [healthDistribution.optimo, healthDistribution.atencion, healthDistribution.critico, healthDistribution.sinDatos]
  const donutColors = [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main, theme.palette.secondary.main]
  const donutLabels = ['Óptimo', 'Atención', 'Crítico', 'Sin datos']

  const donutOptions = {
    chart: { sparkline: { enabled: true } },
    labels: donutLabels,
    colors: donutColors,
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { fontSize: '0.875rem' },
            value: { fontSize: '1.25rem', fontWeight: 600 },
            total: {
              show: true,
              label: 'Spaces',
              fontSize: '0.8rem',
              formatter: () => String(spaces.length)
            }
          }
        }
      }
    }
  }

  return (
    <Grid container spacing={6}>

      {/* ─── SECTION 1: Pulso Operativo ─── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' fontWeight={600}>Pulso Operativo</Typography>
        <Typography variant='body2' color='text.secondary'>Salud global de la operación Delivery</Typography>
      </Grid>

      {/* OTD Hero — bar chart + KPI + trend chip (BarChartRevenueGrowth pattern) */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent className='flex justify-between gap-4'>
            <div className='flex flex-col justify-between'>
              <div className='flex flex-col gap-y-1'>
                <Typography variant='body2' color='text.secondary'>Entrega a tiempo</Typography>
                <Typography variant='h5'>OTD</Typography>
              </div>
              <div className='flex flex-col gap-y-2 items-start'>
                <Typography variant='h3'>{fmtPct(otd)}</Typography>
                {(() => {
                  const d = trendDelta(trend, 'otdPct')

                  return d ? (
                    <CustomChip round='true' variant='tonal' size='small' color={d.direction === 'positive' ? 'success' : d.direction === 'negative' ? 'error' : 'secondary'} label={d.text} />
                  ) : (
                    <CustomChip round='true' variant='tonal' size='small' color={getAgencyMetricStatusColor(otdMetric)} label={getAgencyMetricStatusLabel(otdMetric)} />
                  )
                })()}
              </div>
            </div>
            {otdSparkline.length > 0 && (
              <AppReactApexCharts
                type='bar'
                width={200}
                height={172}
                series={[{ data: otdSparkline }]}
                options={{
                  chart: { parentHeightOffset: 0, toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 4, distributed: true, columnWidth: '48%' } },
                  legend: { show: false },
                  tooltip: { enabled: false },
                  dataLabels: { enabled: false },
                  colors: otdSparkline.map((v, i) =>
                    i === otdSparkline.length - 1
                      ? `var(--mui-palette-${otdS.color}-main)`
                      : `var(--mui-palette-${otdS.color}-lightOpacity)`
                  ),
                  states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
                  grid: { show: false, padding: { top: -15, left: 0, right: 0, bottom: -5 } },
                  xaxis: {
                    categories: trend.map(t => MONTH_ABBR[(t.month - 1) % 12]),
                    axisTicks: { show: false },
                    axisBorder: { show: false },
                    labels: { style: { colors: 'var(--mui-palette-text-disabled)', fontFamily: theme.typography.fontFamily, fontSize: theme.typography.body2.fontSize as string } }
                  },
                  yaxis: { show: false }
                }}
              />
            )}
          </CardContent>
          <Divider />
          <Box sx={{ px: 6, py: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <AgencyMetricStatusChip metric={otdMetric} />
            <Typography variant='caption' color='text.secondary'>
              {getAgencyMetricFooterLabel(otdMetric)}
            </Typography>
          </Box>
        </Card>
      </Grid>

      {/* RpA + FTR — rich HorizontalWithSubtitle with trend/status/footer */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        {(() => {
          const d = trendDelta(trend, 'rpaAvg')

          return (
            <HorizontalWithSubtitle
              title='RpA promedio'
              stats={fmtRpa(rpa)}
              avatarIcon='tabler-chart-line'
              avatarColor={getAgencyMetricTone(rpaMetric)}
              trend={d?.direction}
              trendNumber={d?.number}
              subtitle={d ? `${d.text}` : getAgencyMetricSupportLabel(rpaMetric)}
              statusLabel={getAgencyMetricStatusLabel(rpaMetric)}
              statusColor={getAgencyMetricStatusColor(rpaMetric)}
              statusIcon={getAgencyMetricStatusColor(rpaMetric) === 'success' ? 'tabler-circle-check' : getAgencyMetricStatusColor(rpaMetric) === 'warning' ? 'tabler-alert-triangle' : 'tabler-info-circle'}
              footer={getAgencyMetricFooterLabel(rpaMetric)}
            />
          )
        })()}
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        {(() => {
          const latestTrend = trend.length > 0 ? trend[trend.length - 1] : null
          const ftrVal = latestTrend?.ftrPct ?? null
          const ftrMetric = latestTrend?.ftrMetric ?? null
          const d = trendDelta(trend, 'ftrPct')

          return (
            <HorizontalWithSubtitle
              title='FTR'
              stats={fmtPct(ftrVal)}
              avatarIcon='tabler-target-arrow'
              avatarColor={getAgencyMetricTone(ftrMetric)}
              trend={d?.direction}
              trendNumber={d?.number}
              subtitle={d ? `${d.text}` : getAgencyMetricSupportLabel(ftrMetric)}
              statusLabel={getAgencyMetricStatusLabel(ftrMetric)}
              statusColor={getAgencyMetricStatusColor(ftrMetric)}
              statusIcon={getAgencyMetricStatusColor(ftrMetric) === 'success' ? 'tabler-circle-check' : getAgencyMetricStatusColor(ftrMetric) === 'warning' ? 'tabler-alert-triangle' : 'tabler-info-circle'}
              footer={getAgencyMetricFooterLabel(ftrMetric)}
            />
          )
        })()}
      </Grid>

      {/* ─── SECTION 2: Atención Requerida ─── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' fontWeight={600} sx={{ mt: 2 }}>Atención Requerida</Typography>
        <Typography variant='body2' color='text.secondary'>Items que necesitan acción inmediata</Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Card
          elevation={0}
          sx={{
            borderLeft: '4px solid',
            borderLeftColor: activeAssets > 0 ? 'warning.main' : 'success.main',
            border: t => `1px solid ${t.palette.divider}`,
            borderLeftWidth: '4px'
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 3 }}>
            <Avatar variant='rounded' sx={{ bgcolor: activeAssets > 0 ? 'warning.lightOpacity' : 'success.lightOpacity' }}>
              <i className='tabler-list-check' style={{ fontSize: 22, color: activeAssets > 0 ? theme.palette.warning.main : theme.palette.success.main }} />
            </Avatar>
            <Box>
              <Typography variant='h5' fontWeight={600}>{activeAssets}</Typography>
              <Typography variant='body2' color='text.secondary'>Assets activos</Typography>
              <Typography variant='caption' color='text.secondary'>
                {`${spacesWithActiveAssets} spaces con tareas activas`}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Card
          elevation={0}
          sx={{
            borderLeft: '4px solid',
            borderLeftColor: feedback > 0 ? 'warning.main' : 'success.main',
            border: t => `1px solid ${t.palette.divider}`,
            borderLeftWidth: '4px'
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 3 }}>
            <Avatar variant='rounded' sx={{ bgcolor: feedback > 0 ? 'warning.lightOpacity' : 'success.lightOpacity' }}>
              <i className='tabler-message-dots' style={{ fontSize: 22, color: feedback > 0 ? theme.palette.warning.main : theme.palette.success.main }} />
            </Avatar>
            <Box>
              <Typography variant='h5' fontWeight={600}>{feedback}</Typography>
              <Typography variant='body2' color='text.secondary'>Feedback pendiente</Typography>
              <Typography variant='caption' color='text.secondary'>Revisiones abiertas</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Card
          elevation={0}
          sx={{
            borderLeft: '4px solid',
            borderLeftColor: 'info.main',
            border: t => `1px solid ${t.palette.divider}`,
            borderLeftWidth: '4px'
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 3 }}>
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
              <i className='tabler-folders' style={{ fontSize: 22, color: theme.palette.info.main }} />
            </Avatar>
            <Box>
              <Typography variant='h5' fontWeight={600}>{totalProjects}</Typography>
              <Typography variant='body2' color='text.secondary'>Proyectos activos</Typography>
              <Typography variant='caption' color='text.secondary'>
                {`${spaces.length} spaces · ${latestCompleted} completados este mes`}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ─── SECTION 3: Salud por Space ─── */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h5' fontWeight={600} sx={{ mt: 2 }}>Salud por Space</Typography>
        <Typography variant='body2' color='text.secondary'>Ordenados por OTD para identificar dónde intervenir</Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Spaces'
            subheader={`${spaces.length} con delivery activo`}
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-building' style={{ fontSize: 22, color: theme.palette.primary.main }} /></Avatar>}
          />
          <Divider />
          {spaces.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>Sin datos de delivery</Typography>
            </CardContent>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {spaceTable.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                          style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {spaceTable.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}
                        >
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

      <Grid size={{ xs: 12, md: 4 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Distribución Health' />
          <Divider />
          <CardContent sx={{ display: 'flex', justifyContent: 'center' }}>
            {spaces.length > 0 ? (
              <AppReactApexCharts type='donut' height={230} width={230} options={donutOptions} series={donutSeries} />
            ) : (
              <Typography variant='body2' color='text.secondary'>{GREENHOUSE_COPY.empty.noData}</Typography>
            )}
          </CardContent>
          <CardContent sx={{ pt: 0 }}>
            {[
              { label: 'Óptimo', count: healthDistribution.optimo, color: 'success' as const },
              { label: 'Atención', count: healthDistribution.atencion, color: 'warning' as const },
              { label: 'Crítico', count: healthDistribution.critico, color: 'error' as const },
              { label: GREENHOUSE_COPY.empty.noData, count: healthDistribution.sinDatos, color: 'secondary' as const }
            ].filter(d => d.count > 0).map(d => (
              <Box key={d.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: `${d.color}.main` }} />
                  <Typography variant='body2'>{d.label}</Typography>
                </Box>
                <Typography variant='body2' fontWeight={600}>{d.count}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AgencyDeliveryView
