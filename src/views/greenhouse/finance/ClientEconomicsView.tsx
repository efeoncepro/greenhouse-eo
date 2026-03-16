'use client'

import { useCallback, useEffect, useState } from 'react'

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
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

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
  computedAt: string
  createdAt: string
  updatedAt: string
}

type SortField = 'revenue' | 'grossMargin' | 'netMargin'
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
// Component
// ---------------------------------------------------------------------------

const ClientEconomicsView = () => {
  const theme = useTheme()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [snapshots, setSnapshots] = useState<ClientEconomicsSnapshot[]>([])
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState<SortField>('netMargin')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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

  // Derived values
  const totalRevenue = snapshots.reduce((sum, s) => sum + s.totalRevenueClp, 0)

  const avgGrossMargin = snapshots.length > 0
    ? snapshots.reduce((sum, s) => sum + (s.grossMarginPercent ?? 0), 0) / snapshots.length
    : 0

  const avgNetMargin = snapshots.length > 0
    ? snapshots.reduce((sum, s) => sum + (s.netMarginPercent ?? 0), 0) / snapshots.length
    : 0

  const avgGrossPct = avgGrossMargin * 100
  const avgNetPct = avgNetMargin * 100
  const grossSemaphore = getSemaphore(avgGrossPct)
  const netSemaphore = getSemaphore(avgNetPct)

  // Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = [...snapshots].sort((a, b) => {
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
  })

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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <Box>
            <Typography variant='h5' sx={{ fontWeight: 600, mb: 0.5 }}>Inteligencia financiera</Typography>
            <Typography variant='body2' color='text.secondary'>Rentabilidad y economía por Space</Typography>
          </Box>
        </Box>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* ROW 0 — Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 600, mb: 0.5 }}>Inteligencia financiera</Typography>
          <Typography variant='body2' color='text.secondary'>Rentabilidad y economía por Space</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <CustomTextField
            select
            size='small'
            label='Año'
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            sx={{ minWidth: 100 }}
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
            sx={{ minWidth: 100 }}
          >
            {MONTH_SHORT.slice(1).map((label, i) => (
              <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
            ))}
          </CustomTextField>
          <Button
            variant='contained'
            color='primary'
            startIcon={computing ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-calculator' />}
            onClick={handleCompute}
            disabled={computing}
          >
            {computing ? 'Calculando…' : 'Calcular'}
          </Button>
        </Box>
      </Box>

      {/* Error alert */}
      {error && (
        <Alert severity='error' onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ROW 1 — KPI cards */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Spaces analizados'
            stats={String(snapshots.length)}
            subtitle='del período seleccionado'
            avatarIcon='tabler-building-store'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Ingreso total'
            stats={formatCLP(totalRevenue)}
            subtitle='facturación acumulada'
            avatarIcon='tabler-cash'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Margen bruto prom.'
            stats={snapshots.length > 0 ? `${avgGrossPct.toFixed(1)}%` : '—'}
            subtitle={snapshots.length > 0 ? '' : 'sin datos'}
            avatarIcon='tabler-chart-arrows-vertical'
            avatarColor={snapshots.length > 0 ? grossSemaphore.color : 'secondary'}
            statusLabel={snapshots.length > 0 ? grossSemaphore.label : undefined}
            statusColor={snapshots.length > 0 ? grossSemaphore.color : undefined}
            statusIcon={snapshots.length > 0 ? grossSemaphore.icon : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Margen neto prom.'
            stats={snapshots.length > 0 ? `${avgNetPct.toFixed(1)}%` : '—'}
            subtitle={snapshots.length > 0 ? '' : 'sin datos'}
            avatarIcon='tabler-trending-up'
            avatarColor={snapshots.length > 0 ? netSemaphore.color : 'secondary'}
            statusLabel={snapshots.length > 0 ? netSemaphore.label : undefined}
            statusColor={snapshots.length > 0 ? netSemaphore.color : undefined}
            statusIcon={snapshots.length > 0 ? netSemaphore.icon : undefined}
          />
        </Grid>
      </Grid>

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

      {/* ROW 3 — Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Economía por Space'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-report-analytics' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
          action={<OptionMenu options={['Exportar CSV']} />}
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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Space</TableCell>
                  <TableCell align='right' sortDirection={sortField === 'revenue' ? sortDir : false}>
                    <TableSortLabel
                      active={sortField === 'revenue'}
                      direction={sortField === 'revenue' ? sortDir : 'desc'}
                      onClick={() => handleSort('revenue')}
                    >
                      Ingreso
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align='right'>C. directos</TableCell>
                  <TableCell align='right'>C. indirectos</TableCell>
                  <TableCell align='right' sortDirection={sortField === 'grossMargin' ? sortDir : false}>
                    <TableSortLabel
                      active={sortField === 'grossMargin'}
                      direction={sortField === 'grossMargin' ? sortDir : 'desc'}
                      onClick={() => handleSort('grossMargin')}
                    >
                      Margen bruto
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align='right' sortDirection={sortField === 'netMargin' ? sortDir : false}>
                    <TableSortLabel
                      active={sortField === 'netMargin'}
                      direction={sortField === 'netMargin' ? sortDir : 'desc'}
                      onClick={() => handleSort('netMargin')}
                    >
                      Margen neto
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align='center'>FTE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map(snap => (
                  <TableRow key={snap.snapshotId} hover>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>{snap.clientName}</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(snap.totalRevenueClp)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(snap.directCostsClp)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCLP(snap.indirectCostsClp)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <CustomChip
                        round='true'
                        size='small'
                        color={getMarginChipColor(snap.grossMarginPercent)}
                        label={formatPercent(snap.grossMarginPercent)}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <CustomChip
                        round='true'
                        size='small'
                        color={getMarginChipColor(snap.netMarginPercent)}
                        label={formatPercent(snap.netMarginPercent)}
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Typography variant='body2'>
                        {snap.headcountFte != null ? snap.headcountFte.toFixed(1) : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  )
}

export default ClientEconomicsView
