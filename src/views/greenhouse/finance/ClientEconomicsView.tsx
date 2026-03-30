'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import dynamic from 'next/dynamic'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import {
  createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'


import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import TablePaginationComponent from '@components/TablePaginationComponent'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientEconomicsSnapshot {
  snapshotId: string
  clientId: string
  clientName: string
  periodYear: number
  periodMonth: number
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginClp: number
  grossMarginPercent: number | null
  netMarginClp: number
  netMarginPercent: number | null
  headcountFte: number | null
  revenuePerFte: number | null
  costPerFte: number | null
  notes: string | null
  hasCompleteCostCoverage?: boolean
  computedAt: string
  createdAt: string
  updatedAt: string
}

type SortField = 'revenue' | 'grossMargin' | 'netMargin'

// ── TanStack columns ──

const ceColumnHelper = createColumnHelper<ClientEconomicsSnapshot>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ceColumns: ColumnDef<ClientEconomicsSnapshot, any>[] = [
  ceColumnHelper.accessor('clientName', { header: 'Space', cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography> }),
  ceColumnHelper.accessor('totalRevenueClp', { header: 'Ingreso', cell: ({ getValue }) => <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(getValue())}</Typography>, meta: { align: 'right' } }),
  ceColumnHelper.accessor('directCostsClp', { header: 'C. directos', cell: ({ getValue }) => <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(getValue())}</Typography>, meta: { align: 'right' } }),
  ceColumnHelper.accessor('indirectCostsClp', { header: 'C. indirectos', cell: ({ getValue }) => <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(getValue())}</Typography>, meta: { align: 'right' } }),
  ceColumnHelper.accessor('grossMarginPercent', { header: 'Margen bruto', cell: ({ getValue }) => <CustomChip round='true' size='small' color={getMarginChipColor(getValue())} label={formatPercent(getValue())} />, meta: { align: 'right' } }),
  ceColumnHelper.accessor('netMarginPercent', { header: 'Margen neto', cell: ({ getValue }) => <CustomChip round='true' size='small' color={getMarginChipColor(getValue())} label={formatPercent(getValue())} />, meta: { align: 'right' } }),
  ceColumnHelper.accessor('headcountFte', { header: 'FTE', cell: ({ getValue }) => getValue() != null ? getValue().toFixed(1) : '—', meta: { align: 'center' } }),
  ceColumnHelper.accessor('revenuePerFte', { header: 'Ingreso/FTE', cell: ({ getValue }) => getValue() != null ? <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(getValue())}</Typography> : '—', meta: { align: 'right' } }),
  ceColumnHelper.accessor('costPerFte', { header: 'Costo/FTE', cell: ({ getValue }) => getValue() != null ? <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(getValue())}</Typography> : '—', meta: { align: 'right' } })
]

type SortDir = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

const formatPercent = (value: number | null): string => {
  if (value == null) return '—'

  return `${(value * 100).toFixed(1)}%`
}

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const YEARS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i)

type SemaphoreResult = { label: string; color: 'success' | 'warning' | 'error'; icon: string }

const getSemaphore = (pct: number): SemaphoreResult => {
  if (pct >= 30) return { label: 'Óptimo', color: 'success', icon: 'tabler-circle-check' }
  if (pct >= 15) return { label: 'Atención', color: 'warning', icon: 'tabler-alert-triangle' }

  return { label: 'Crítico', color: 'error', icon: 'tabler-alert-circle' }
}

const getMarginChipColor = (pct: number | null): 'success' | 'warning' | 'error' => {
  if (pct == null) return 'error'

  const p = pct * 100

  if (p >= 30) return 'success'
  if (p >= 15) return 'warning'

  return 'error'
}

// ---------------------------------------------------------------------------
// Chart config builders
// ---------------------------------------------------------------------------

const buildMarginBarOptions = (theme: Theme, categories: string[], colors: string[]): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: '60%',
      distributed: true
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => `${val.toFixed(1)}%`,
    style: { fontSize: '12px', fontFamily: theme.typography.fontFamily }
  },
  legend: { show: false },
  colors,
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 4,
    padding: { left: 0, right: 16, top: -12, bottom: -8 }
  },
  xaxis: {
    categories,
    labels: {
      formatter: (val: string) => `${Number(val).toFixed(0)}%`,
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  yaxis: {
    labels: {
      style: {
        colors: 'var(--mui-palette-text-secondary)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    y: { formatter: (val: number) => `${val.toFixed(1)}%` }
  }
})

const buildDonutOptions = (theme: Theme): ApexOptions => ({
  chart: {
    parentHeightOffset: 0
  },
  labels: ['Costos directos', 'Costos indirectos'],
  colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
  legend: {
    position: 'bottom',
    labels: { colors: 'var(--mui-palette-text-secondary)' },
    fontFamily: theme.typography.fontFamily
  },
  dataLabels: {
    enabled: true,
    formatter: (_: number, opts: { seriesIndex: number; w: { globals: { series: number[] } } }) => {
      const total = opts.w.globals.series.reduce((a: number, b: number) => a + b, 0)

      return total > 0 ? `${((opts.w.globals.series[opts.seriesIndex] / total) * 100).toFixed(0)}%` : '0%'
    }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '60%',
        labels: {
          show: true,
          name: { show: true },
          value: {
            show: true,
            formatter: (val: string) => formatCLP(Number(val))
          },
          total: {
            show: true,
            label: 'Total',
            formatter: (w: { globals: { seriesTotals: number[] } }) => formatCLP(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0))
          }
        }
      }
    }
  },
  stroke: { width: 0 }
})

// ---------------------------------------------------------------------------
// Trend chart config
// ---------------------------------------------------------------------------

interface TrendPoint {
  label: string
  grossMarginAvg: number
  netMarginAvg: number
}

const buildTrendAreaOptions = (theme: Theme, categories: string[]): ApexOptions => ({
  chart: {
    parentHeightOffset: 0,
    toolbar: { show: false },
    sparkline: { enabled: false }
  },
  stroke: {
    curve: 'smooth',
    width: 2.5,
    dashArray: [0, 6]
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05,
      stops: [0, 95, 100]
    }
  },
  markers: { strokeWidth: 2 },
  colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-primary-main)'],
  legend: {
    position: 'bottom',
    labels: { colors: 'var(--mui-palette-text-secondary)' },
    fontFamily: theme.typography.fontFamily,
    markers: { offsetX: -2 }
  },
  grid: {
    borderColor: 'var(--mui-palette-divider)',
    strokeDashArray: 4,
    padding: { left: 8, right: 8, top: -8, bottom: 0 }
  },
  xaxis: {
    categories,
    labels: {
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      formatter: (val: number) => `${val.toFixed(0)}%`,
      style: {
        colors: 'var(--mui-palette-text-disabled)',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.body2.fontSize as string
      }
    }
  },
  tooltip: {
    shared: true,
    y: { formatter: (val: number) => `${val.toFixed(1)}%` }
  },
  dataLabels: { enabled: false }
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClientEconomicsView = ({ embedded = false }: { embedded?: boolean }) => {
  const theme = useTheme()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [snapshots, setSnapshots] = useState<ClientEconomicsSnapshot[]>([])
  const [error, setError] = useState('')
  const [sortField] = useState<SortField>('netMargin')
  const [sortDir] = useState<SortDir>('desc')
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(false)

  const fetchData = useCallback(async (y: number, m: number) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/finance/intelligence/client-economics?year=${y}&month=${m}`, { cache: 'no-store' })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))

        setError(d.error || `Error ${res.status}`)
        setSnapshots([])

        return
      }

      const data = await res.json()

      setSnapshots(data.snapshots ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
      setSnapshots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(year, month)
  }, [fetchData, year, month])

  const handleCompute = async () => {
    setComputing(true)
    setError('')

    try {
      const res = await fetch('/api/finance/intelligence/client-economics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month })
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))

        setError(d.error || 'No se pudo calcular la rentabilidad. Verifica que existan ingresos y gastos para este período.')

        return
      }

      const data = await res.json()

      toast.success(`Rentabilidad calculada para ${data.clientCount} Spaces.`)
      void fetchData(year, month)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setComputing(false)
    }
  }

  // Fetch trend data when snapshots change
  useEffect(() => {
    if (snapshots.length === 0) {
      setTrendData([])

      return
    }

    let cancelled = false

    const fetchTrend = async () => {
      setTrendLoading(true)

      try {
        const res = await fetch('/api/finance/intelligence/client-economics/trend?months=6', { cache: 'no-store' })

        if (!res.ok || cancelled) return

        const data = await res.json()
        const clients: Array<{ periods: ClientEconomicsSnapshot[] }> = data.clients ?? []

        // Build a map: "YYYY-MM" → { sumWeightedGross, sumWeightedNet, sumRevenue }
        const periodMap = new Map<string, { wGross: number; wNet: number; rev: number }>()

        for (const c of clients) {
          for (const p of c.periods) {
            if (p.grossMarginPercent == null && p.netMarginPercent == null) continue

            const key = `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`
            const entry = periodMap.get(key) ?? { wGross: 0, wNet: 0, rev: 0 }

            entry.wGross += (p.grossMarginPercent ?? 0) * p.totalRevenueClp
            entry.wNet += (p.netMarginPercent ?? 0) * p.totalRevenueClp
            entry.rev += p.totalRevenueClp
            periodMap.set(key, entry)
          }
        }

        // Convert to sorted TrendPoint array
        const points: TrendPoint[] = [...periodMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, v]) => {
            const [yr, mo] = key.split('-')

            return {
              label: `${MONTH_SHORT[Number(mo)]} ${yr}`,
              grossMarginAvg: v.rev > 0 ? (v.wGross / v.rev) * 100 : 0,
              netMarginAvg: v.rev > 0 ? (v.wNet / v.rev) * 100 : 0
            }
          })

        if (!cancelled) setTrendData(points)
      } catch {
        // Non-blocking — trend is supplementary
      } finally {
        if (!cancelled) setTrendLoading(false)
      }
    }

    void fetchTrend()

    return () => { cancelled = true }
  }, [snapshots])

  // Derived values
  const totalFte = snapshots.reduce((sum, s) => sum + (s.headcountFte ?? 0), 0)
  const totalRevenue = snapshots.reduce((sum, s) => sum + s.totalRevenueClp, 0)

  const avgGrossMargin = snapshots.length > 0
    ? (() => {
        const valid = snapshots.filter(s => s.hasCompleteCostCoverage !== false && s.grossMarginPercent != null)

        return valid.length > 0
          ? valid.reduce((sum, s) => sum + (s.grossMarginPercent ?? 0), 0) / valid.length
          : 0
      })()
    : 0

  const avgNetMargin = snapshots.length > 0
    ? (() => {
        const valid = snapshots.filter(s => s.hasCompleteCostCoverage !== false && s.netMarginPercent != null)

        return valid.length > 0
          ? valid.reduce((sum, s) => sum + (s.netMarginPercent ?? 0), 0) / valid.length
          : 0
      })()
    : 0

  const hasAnyCompleteCostCoverage = snapshots.some(s => s.hasCompleteCostCoverage !== false)

  const avgGrossPct = avgGrossMargin * 100
  const avgNetPct = avgNetMargin * 100
  const grossSemaphore = getSemaphore(avgGrossPct)
  const netSemaphore = getSemaphore(avgNetPct)

  const sorted = useMemo(() => [...snapshots].sort((a, b) => {
    let av = 0
    let bv = 0

    if (sortField === 'revenue') {
      av = a.totalRevenueClp; bv = b.totalRevenueClp
    } else if (sortField === 'grossMargin') {
      av = a.grossMarginPercent ?? -999; bv = b.grossMarginPercent ?? -999
    } else {
      av = a.netMarginPercent ?? -999; bv = b.netMarginPercent ?? -999
    }

    return sortDir === 'asc' ? av - bv : bv - av
  }), [snapshots, sortField, sortDir])

  const ceTable = useReactTable({
    data: sorted,
    columns: ceColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  // CSV export handler
  const handleExportCsv = useCallback(() => {
    if (sorted.length === 0) return

    const headers = ['Space', 'Ingreso', 'C. Directos', 'C. Indirectos', 'Margen Bruto %', 'Margen Neto %', 'FTE', 'Ingreso/FTE', 'Costo/FTE']

    const rows = sorted.map(s => [
      `"${s.clientName}"`,
      s.totalRevenueClp,
      s.directCostsClp,
      s.indirectCostsClp,
      s.grossMarginPercent != null ? (s.grossMarginPercent * 100).toFixed(1) : '',
      s.netMarginPercent != null ? (s.netMarginPercent * 100).toFixed(1) : '',
      s.headcountFte != null ? s.headcountFte.toFixed(1) : '',
      s.revenuePerFte != null ? Math.round(s.revenuePerFte) : '',
      s.costPerFte != null ? Math.round(s.costPerFte) : ''
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `economia_spaces_${MONTH_SHORT[month]}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Reporte exportado. Revisa tu carpeta de descargas.')
  }, [sorted, month, year])

  // Chart data
  const barCategories = sorted.map(s => s.clientName.length > 20 ? s.clientName.slice(0, 20) + '…' : s.clientName)
  const barData = sorted.map(s => Number(((s.grossMarginPercent ?? 0) * 100).toFixed(1)))

  const barColors = sorted.map(s => {
    const p = (s.grossMarginPercent ?? 0) * 100

    if (p >= 30) return 'var(--mui-palette-success-main)'
    if (p >= 15) return 'var(--mui-palette-warning-main)'

    return 'var(--mui-palette-error-main)'
  })

  const totalDirect = snapshots.reduce((sum, s) => sum + s.directCostsClp, 0)
  const totalIndirect = snapshots.reduce((sum, s) => sum + s.indirectCostsClp, 0)

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Skeleton variant='rounded' height={56} />
        <Grid container spacing={4}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={350} />
      </Box>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header — only when standalone, hidden when embedded in tabs */}
      {!embedded && (
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 600, mb: 0.5 }}>Rentabilidad por cliente</Typography>
          <Typography variant='body2' color='text.secondary'>Economía y márgenes por Space</Typography>
        </Box>
      )}

      {/* Toolbar — period selector + compute action */}
      <Card variant='outlined'>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <CustomTextField
                select
                size='small'
                label='Año'
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                sx={{ minWidth: 90 }}
              >
                {YEARS.map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                size='small'
                label='Mes'
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                sx={{ minWidth: 90 }}
              >
                {MONTH_SHORT.slice(1).map((label, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
                ))}
              </CustomTextField>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={snapshots.length > 0 ? 'success' : 'secondary'}
                label={snapshots.length > 0 ? `${snapshots.length} Spaces` : 'Sin datos'}
              />
            </Box>
            <Button
              variant='contained'
              color='primary'
              startIcon={computing ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-calculator' />}
              onClick={handleCompute}
              disabled={computing}
            >
              {computing ? 'Calculando…' : 'Calcular rentabilidad'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Error alert */}
      {error && (
        <Alert severity='error' onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* KPI cards */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Spaces'
            stats={String(snapshots.length)}
            subtitle={totalFte > 0 ? `${totalFte.toFixed(1)} FTE` : `${MONTH_SHORT[month]} ${year}`}
            avatarIcon='tabler-building-store'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Ingreso total'
            stats={formatCLP(totalRevenue)}
            subtitle={`${MONTH_SHORT[month]} ${year}`}
            avatarIcon='tabler-cash'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Margen bruto'
            stats={snapshots.length > 0 && hasAnyCompleteCostCoverage ? `${avgGrossPct.toFixed(1)}%` : '—'}
            subtitle={hasAnyCompleteCostCoverage ? grossSemaphore.label : 'sin cobertura'}
            avatarIcon='tabler-chart-arrows-vertical'
            avatarColor={hasAnyCompleteCostCoverage ? grossSemaphore.color : 'secondary'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Margen neto'
            stats={snapshots.length > 0 && hasAnyCompleteCostCoverage ? `${avgNetPct.toFixed(1)}%` : '—'}
            subtitle={hasAnyCompleteCostCoverage ? netSemaphore.label : 'sin cobertura'}
            avatarIcon='tabler-trending-up'
            avatarColor={hasAnyCompleteCostCoverage ? netSemaphore.color : 'secondary'}
          />
        </Grid>
      </Grid>

      {snapshots.length > 0 && !hasAnyCompleteCostCoverage && (
        <Alert severity='warning'>
          La rentabilidad del período todavía no tiene cobertura de costos suficiente. Los ingresos sí están cargados, pero los márgenes quedan ocultos hasta que existan costos directos y/o laborales canonizados.
        </Alert>
      )}

      {/* ROW 2 — Charts (only when >= 2 clients) */}
      {snapshots.length >= 2 && (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Margen bruto por Space'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                    <i className='tabler-chart-bar' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <CardContent>
                <AppReactApexCharts
                  type='bar'
                  height={Math.max(280, snapshots.length * 50)}
                  options={buildMarginBarOptions(theme, barCategories, barColors)}
                  series={[{ name: 'Margen bruto', data: barData }]}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }}>
              <CardHeader
                title='Composición de costos'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                    <i className='tabler-chart-donut-3' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <CardContent>
                {totalDirect + totalIndirect > 0 ? (
                  <AppReactApexCharts
                    type='donut'
                    height={280}
                    options={buildDonutOptions(theme)}
                    series={[totalDirect, totalIndirect]}
                  />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                    <Typography variant='body2' color='text.secondary'>Sin costos registrados</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ROW 2.5 — Trend chart (6-month margin evolution) */}
      {trendLoading && (
        <Skeleton variant='rounded' height={360} />
      )}
      {!trendLoading && trendData.length >= 2 && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Evolución de márgenes'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-trending-up' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
            action={
              <CustomChip
                round='true'
                size='small'
                color='secondary'
                variant='tonal'
                label='Últimos 6 meses'
              />
            }
          />
          <Divider />
          <CardContent>
            <figure
              role='img'
              aria-label='Gráfico de evolución: margen bruto promedio y margen neto promedio de los últimos 6 meses'
              style={{ margin: 0 }}
            >
              <AppReactApexCharts
                type='area'
                height={300}
                options={buildTrendAreaOptions(theme, trendData.map(p => p.label))}
                series={[
                  { name: 'Margen bruto promedio', data: trendData.map(p => Number(p.grossMarginAvg.toFixed(1))) },
                  { name: 'Margen neto promedio', data: trendData.map(p => Number(p.netMarginAvg.toFixed(1))) }
                ]}
              />
            </figure>
          </CardContent>
        </Card>
      )}
      {!trendLoading && trendData.length > 0 && trendData.length < 2 && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
              <Typography variant='h6' sx={{ mb: 1 }}>Aún no hay suficiente historial</Typography>
              <Typography variant='body2' color='text.secondary'>
                Calcula la rentabilidad en al menos 2 períodos para ver cómo evolucionan tus márgenes.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ROW 3 — Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Economía por Space'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-report-analytics' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
          action={<OptionMenu options={[{ text: 'Exportar CSV', menuItemProps: { onClick: handleExportCsv } }]} />}
        />
        <Divider />
        {snapshots.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }} role='status'>
            <Typography variant='h6' sx={{ mb: 1 }}>Sin datos para este período</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              Calcula la rentabilidad a partir de los ingresos y gastos registrados.
            </Typography>
            <Button
              variant='contained'
              color='primary'
              startIcon={computing ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-calculator' />}
              onClick={handleCompute}
              disabled={computing}
            >
              {computing ? 'Calculando…' : 'Calcular ahora'}
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  {ceTable.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id}>
                      {hg.headers.map(header => (
                        <TableCell
                          key={header.id}
                          align={(header.column.columnDef.meta as { align?: 'left' | 'right' | 'center' } | undefined)?.align ?? 'left'}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {ceTable.getRowModel().rows.map(row => (
                    <TableRow key={row.id} hover>
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          align={(cell.column.columnDef.meta as { align?: 'left' | 'right' | 'center' } | undefined)?.align ?? 'left'}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <TablePaginationComponent table={ceTable as ReturnType<typeof useReactTable>} />
          </>
        )}
      </Card>
    </Box>
  )
}

export default ClientEconomicsView
