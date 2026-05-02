'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { computeCurrencyDelta, formatDeltaLabel, payrollTrendDirection } from '@/lib/finance/currency-comparison'
import { formatCurrency } from './helpers'

import tableStyles from '@core/styles/table.module.css'

// ── Types ──

type ProjectionMode = 'actual_to_date' | 'projected_month_end'

interface ProjectedEntry {
  memberId: string
  memberName: string
  currency: string
  payRegime: string
  baseSalary: number
  remoteAllowance: number
  fixedBonusLabel: string | null
  fixedBonusAmount: number
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtdMax: number
  bonusRpaMax: number
  kpiOtdPercent: number | null
  kpiRpaAvg: number | null
  kpiOtdQualifies: boolean
  kpiRpaQualifies: boolean
  grossTotal: number
  netTotal: number
  chileTotalDeductions: number
  chileAfpAmount: number
  chileHealthAmount: number
  chileUnemploymentAmount: number
  chileTaxAmount: number
  siiRetentionRate: number | null
  siiRetentionAmount: number | null
  chileApvAmount: number
  chileUfValue: number | null
  chileColacionAmount?: number | null
  chileMovilizacionAmount?: number | null
  chileColacion?: number | null
  chileMovilizacion?: number | null
  colacionAmount?: number | null
  movilizacionAmount?: number | null
  totalHaberesNoImponibles?: number | null
  workingDaysInPeriod: number | null
  daysPresent: number | null
  daysAbsent: number | null
  daysOnLeave: number | null
  daysOnUnpaidLeave: number | null
  projectionMode: ProjectionMode
  projectedWorkingDays: number
  projectedWorkingDaysTotal: number
  prorationFactor: number
  officialGrossTotal: number | null
  officialNetTotal: number | null
  deltaGross: number | null
  deltaNet: number | null
  inputVariance: {
    kpiOtdChanged: boolean
    kpiRpaChanged: boolean
    attendanceChanged: boolean
    ufChanged: boolean
    baseSalaryChanged: boolean
    officialInputs: {
      kpiOtdPercent: number | null
      kpiRpaAvg: number | null
      workingDays: number | null
      daysPresent: number | null
      daysAbsent: number | null
      ufValue: number | null
    }
  } | null
}

interface ProjectedData {
  period: { year: number; month: number }
  mode: ProjectionMode
  asOfDate: string
  entries: ProjectedEntry[]
  totals: {
    grossByCurrency: Record<string, number>
    netByCurrency: Record<string, number>
    memberCount: number
  }
  official: {
    grossByCurrency: Record<string, number>
    netByCurrency: Record<string, number>
    entryCount: number
  } | null
  latestPromotion: {
    promotionId: string
    periodId: string
    asOfDate: string
    projectionMode: ProjectionMode
    promotedEntryCount: number
    createdAt: string | null
  } | null
  clpEquivalent: {
    grossClp: number
    netClp: number
    fxRate: number
  } | null
  usdEquivalent: {
    grossUsd: number
    netUsd: number
    fxRate: number
  } | null
  prorationFactor: number
  previousOfficial: {
    periodId: string
    grossByCurrency: Record<string, number>
    netByCurrency: Record<string, number>
    entryCount: number
  } | null
}

// ── Helpers ──

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const otdColor = (pct: number | null) => {
  if (pct == null) return 'secondary'
  if (pct >= 90) return 'success'
  if (pct >= 70) return 'warning'

  return 'error'
}

const rpaColor = (avg: number | null) => {
  if (avg == null) return 'secondary'
  if (avg <= 1.5) return 'success'
  if (avg <= 2.5) return 'warning'

  return 'error'
}

const payoutPct = (amount: number, max: number) => max > 0 ? Math.round((amount / max) * 100) : 0

const chipTooltip = (color: 'success' | 'warning' | 'error' | 'secondary') => {
  if (color === 'success') return 'En meta o por encima'
  if (color === 'warning') return 'Bajo meta, payout parcial'
  if (color === 'error') return 'Bajo umbral, sin payout'

  return ''
}

const isInternationalRegime = (e: ProjectedEntry) =>
  e.payRegime === 'international' || (e.currency === 'USD' && e.chileTotalDeductions === 0)

const isHonorariosProjectedEntry = (e: ProjectedEntry) => (e.siiRetentionAmount ?? 0) > 0

const currencySummaryLabel = (byCurrency: Record<string, number>) => {
  const parts: string[] = []

  for (const [cur, amount] of Object.entries(byCurrency)) {
    if (amount > 0) parts.push(formatCurrency(amount, cur as 'CLP' | 'USD'))
  }

  return parts.join(' + ') || '—'
}



const readNonTaxableAllowances = (entry: ProjectedEntry) => {
  const colacion =
    entry.chileColacionAmount ??
    entry.chileColacion ??
    entry.colacionAmount ??
    0

  const movilizacion =
    entry.chileMovilizacionAmount ??
    entry.chileMovilizacion ??
    entry.movilizacionAmount ??
    0

  return { colacion, movilizacion }
}

// ── Component ──

const ProjectedPayrollView = () => {
  const [mode, setMode] = useState<ProjectionMode>('projected_month_end')
  const [data, setData] = useState<ProjectedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'memberName', desc: false }])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [promoting, setPromoting] = useState(false)
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null)
  const [promotionError, setPromotionError] = useState<string | null>(null)
  const [driftWarnings, setDriftWarnings] = useState<Array<{ field: string; message: string }>>([])
  const [loadError, setLoadError] = useState<string | null>(null)


  const today = useMemo(() => {
    const d = new Date()

    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  }, [])

  const [year, setYear] = useState(today.year)
  const [month, setMonth] = useState(today.month)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const res = await fetch(`/api/hr/payroll/projected?year=${year}&month=${month}&mode=${mode}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      })

      if (res.ok) {
        setData(await res.json())
        setExpandedRows(new Set())
      } else {
        const payload = await res.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible cargar la nómina proyectada.')
      }
    } catch (error) {
      setData(null)
      setLoadError(error instanceof Error ? error.message : 'No fue posible cargar la nómina proyectada.')
    } finally {
      setLoading(false)
    }
  }, [year, month, mode])

  useEffect(() => { void load() }, [load])

  const promoteProjection = useCallback(async () => {
    setPromoting(true)
    setPromotionMessage(null)
    setPromotionError(null)
    setDriftWarnings([])

    try {
      const res = await fetch('/api/hr/payroll/projected/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, mode })
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.error || 'No fue posible promover la nómina proyectada.')
      }

      setPromotionMessage(
        payload?.createdPeriod
          ? 'Se creó el período oficial y se recalculó con el corte proyectado.'
          : 'La nómina oficial se recalculó usando el corte proyectado.'
      )

      if (Array.isArray(payload?.driftWarnings) && payload.driftWarnings.length > 0) {
        setDriftWarnings(payload.driftWarnings)
      }

      await load()
    } catch (error) {
      setPromotionError(error instanceof Error ? error.message : 'No fue posible promover la nómina proyectada.')
    } finally {
      setPromoting(false)
    }
  }, [load, mode, month, year])

  const entries = useMemo(() => data?.entries ?? [], [data])

  const toggleRow = (memberId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)

      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)

      return next
    })
  }

  const navMonth = (delta: number) => {
    let m = month + delta
    let y = year

    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }

    setMonth(m)
    setYear(y)
  }

  // ── Table ──

  const columnHelper = createColumnHelper<ProjectedEntry>()

   
  const columns: ColumnDef<ProjectedEntry, any>[] = useMemo(() => [
    columnHelper.display({
      id: 'expander',
      header: '',
      cell: ({ row }) => (
        <IconButton
          size='small'
          onClick={() => toggleRow(row.original.memberId)}
          sx={{ p: 0.5 }}
          aria-label={expandedRows.has(row.original.memberId) ? `Contraer ${row.original.memberName}` : `Expandir ${row.original.memberName}`}
        >
          <i className={expandedRows.has(row.original.memberId) ? 'tabler-chevron-down' : 'tabler-chevron-right'} style={{ fontSize: 16 }} />
        </IconButton>
      ),
      size: 36
    }),
    columnHelper.accessor('memberName', {
      header: 'Nombre',
      cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
    }),
    columnHelper.accessor('currency', {
      header: 'Moneda',
      cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color='secondary' label={getValue()} />
    }),
    columnHelper.accessor('grossTotal', {
      header: 'Bruto',
      cell: ({ row }) => <Typography variant='body2' fontWeight={600}>{formatCurrency(row.original.grossTotal, row.original.currency as 'CLP' | 'USD')}</Typography>,
      meta: { align: 'right' }
    }),
    columnHelper.accessor(row => row.bonusOtdAmount + row.bonusRpaAmount, {
      id: 'variable',
      header: 'Variable',
      cell: ({ row }) => {
        const total = row.original.bonusOtdAmount + row.original.bonusRpaAmount

        return <Typography variant='body2' color={total > 0 ? 'success.main' : 'text.secondary'}>{formatCurrency(total, row.original.currency as 'CLP' | 'USD')}</Typography>
      },
      meta: { align: 'right' }
    }),
    columnHelper.accessor('chileTotalDeductions', {
      header: 'Descuentos',
      cell: ({ row }) => {
        const e = row.original

        if (isInternationalRegime(e)) {
          return <Tooltip title='Régimen USD internacional — sin retenciones previsionales chilenas'><CustomChip round='true' size='small' variant='tonal' color='secondary' label='Sin descuentos' /></Tooltip>
        }

        if (isHonorariosProjectedEntry(e)) {
          return (
            <Tooltip title='Honorarios Chile — retención SII'>
              <Stack alignItems='flex-end' spacing={0.25}>
                <Typography variant='body2' color='error.main'>
                  {formatCurrency(-(e.siiRetentionAmount ?? e.chileTotalDeductions), e.currency as 'CLP' | 'USD')}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Retención SII
                </Typography>
              </Stack>
            </Tooltip>
          )
        }

        return <Typography variant='body2' color='error.main'>{formatCurrency(-e.chileTotalDeductions, e.currency as 'CLP' | 'USD')}</Typography>
      },
      meta: { align: 'right' }
    }),
    columnHelper.accessor('netTotal', {
      header: 'Neto',
      cell: ({ row }) => <Typography variant='body2' fontWeight={600} color='primary.main'>{formatCurrency(row.original.netTotal, row.original.currency as 'CLP' | 'USD')}</Typography>,
      meta: { align: 'right' }
    })
  ], [columnHelper, expandedRows])

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  })

  // ── Render ──

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Nómina Proyectada'
            subheader={`${MONTHS[month - 1]} ${year} · ${data?.totals.memberCount ?? 0} personas`}
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}><i className='tabler-calculator' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} /></Avatar>}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant='contained'
                  size='small'
                  color='primary'
                  onClick={() => void promoteProjection()}
                  disabled={promoting || loading}
                  startIcon={promoting ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-arrow-forward-up' />}
                  aria-label={data?.official ? `Recalcular nómina oficial para ${MONTHS[month - 1]} ${year}` : `Crear borrador oficial para ${MONTHS[month - 1]} ${year}`}
                >
                  {data?.official ? 'Recalcular oficial' : 'Crear borrador oficial'}
                </Button>
                <IconButton size='small' onClick={() => navMonth(-1)} aria-label='Mes anterior'>
                  <i className='tabler-chevron-left' style={{ fontSize: 18 }} />
                </IconButton>
                <Typography variant='body2' fontWeight={600}>{MONTHS[month - 1]} {year}</Typography>
                <IconButton size='small' onClick={() => navMonth(1)} aria-label='Mes siguiente'>
                  <i className='tabler-chevron-right' style={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            }
          />
        </Card>
      </Grid>

      {/* Mode tabs */}
      <Grid size={{ xs: 12 }}>
        <TabContext value={mode}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CustomTabList onChange={(_, v: string) => setMode(v as ProjectionMode)}>
              <Tab
                label='Corte actual'
                value='actual_to_date'
                icon={<i className='tabler-clock' />}
                iconPosition='start'
              />
              <Tab
                label={`Cierre proyectado — ${MONTHS[month - 1]} ${year}`}
                value='projected_month_end'
                icon={<i className='tabler-calendar-event' />}
                iconPosition='start'
              />
            </CustomTabList>
          </Card>
          <TabPanel value={mode} sx={{ p: 0 }} />
        </TabContext>
      </Grid>

      {/* KPI cards */}
      {data && (
        <>
          {(() => {
            // Compute % change vs official for trend indicators
            // Use current-period official, or fallback to previous period for comparison
            const compareSource = data.official ?? data.previousOfficial
            const compareLabel = data.official ? 'vs oficial' : data.previousOfficial ? `vs ${data.previousOfficial.periodId}` : ''

            const delta = compareSource && data.clpEquivalent
              ? computeCurrencyDelta(
                  { grossClp: data.clpEquivalent.grossClp, netClp: data.clpEquivalent.netClp },
                  compareSource,
                  data.clpEquivalent.fxRate,
                  compareLabel
                )
              : null

            const prorateLabel = data.prorationFactor < 1
              ? ` · ${Math.round(data.prorationFactor * 100)}% del mes`
              : ''

            return (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title='Bruto total'
                    stats={
                      data.clpEquivalent
                        ? formatCurrency(data.clpEquivalent.grossClp, 'CLP')
                        : currencySummaryLabel(data.totals.grossByCurrency)
                    }
                    avatarIcon='tabler-cash'
                    avatarColor='info'
                    trend={payrollTrendDirection(delta?.grossDeltaPct)}
                    trendNumber={formatDeltaLabel(delta?.grossDeltaPct, delta?.compareLabel ?? '')}
                    subtitle={
                      data.usdEquivalent
                        ? `USD ${formatCurrency(data.usdEquivalent.grossUsd, 'USD')}${prorateLabel}`
                        : mode === 'actual_to_date'
                          ? `Devengado al corte${prorateLabel}`
                          : 'Proyectado al cierre'
                    }
                    statusLabel={mode === 'actual_to_date' ? 'Corte actual' : 'Cierre proyectado'}
                    statusColor={mode === 'actual_to_date' ? 'info' : 'primary'}
                    footer={delta?.grossReference ? `${data.official ? 'Oficial' : data.previousOfficial?.periodId ?? 'Anterior'}: ${formatCurrency(delta.grossReference, 'CLP')}` : undefined}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title='Neto total'
                    stats={
                      data.clpEquivalent
                        ? formatCurrency(data.clpEquivalent.netClp, 'CLP')
                        : currencySummaryLabel(data.totals.netByCurrency)
                    }
                    avatarIcon='tabler-wallet'
                    avatarColor='success'
                    trend={payrollTrendDirection(delta?.netDeltaPct)}
                    trendNumber={formatDeltaLabel(delta?.netDeltaPct, delta?.compareLabel ?? '')}
                    subtitle={
                      data.usdEquivalent
                        ? `USD ${formatCurrency(data.usdEquivalent.netUsd, 'USD')}${prorateLabel}`
                        : data.prorationFactor < 1
                          ? `Líquido al corte${prorateLabel}`
                          : 'Líquido a pagar'
                    }
                    statusLabel={mode === 'actual_to_date' ? 'Corte actual' : 'Cierre proyectado'}
                    statusColor={mode === 'actual_to_date' ? 'info' : 'primary'}
                    footer={delta?.netReference ? `${data.official ? 'Oficial' : data.previousOfficial?.periodId ?? 'Anterior'}: ${formatCurrency(delta.netReference, 'CLP')}` : undefined}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title='Personas'
                    stats={String(data.totals.memberCount)}
                    avatarIcon='tabler-users'
                    avatarColor='primary'
                    subtitle={`Corte: ${data.asOfDate}`}
                    statusLabel={compareSource ? `${data.official ? 'Oficial' : data.previousOfficial?.periodId ?? 'Anterior'}: ${compareSource.entryCount}` : undefined}
                    statusColor='default'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <HorizontalWithSubtitle
                    title={mode === 'actual_to_date' ? 'Días transcurridos' : 'Días hábiles'}
                    stats={mode === 'actual_to_date' && data.entries[0]
                      ? `${data.entries[0].projectedWorkingDays} / ${data.entries[0].projectedWorkingDaysTotal}`
                      : data.entries[0]
                        ? String(data.entries[0].projectedWorkingDaysTotal)
                        : '—'
                    }
                    avatarIcon='tabler-calendar'
                    avatarColor={mode === 'actual_to_date' ? 'warning' : 'secondary'}
                    subtitle={mode === 'actual_to_date' ? `${Math.round(data.prorationFactor * 100)}% del mes` : 'Mes completo'}
                  />
                </Grid>
              </>
            )
          })()}
        </>
      )}

      {loadError && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='error'
            variant='outlined'
            action={(
              <Button color='inherit' size='small' onClick={() => void load()}>
                Reintentar
              </Button>
            )}
          >
            {loadError}
          </Alert>
        </Grid>
      )}

      {!data && !loadError && !loading && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' variant='outlined'>Sin datos de proyección para este período.</Alert>
        </Grid>
      )}

      {promotionMessage && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' variant='outlined'>{promotionMessage}</Alert>
        </Grid>
      )}

      {promotionError && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' variant='outlined'>{promotionError}</Alert>
        </Grid>
      )}

      {driftWarnings.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning' variant='outlined'>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Inputs cambiaron entre la proyección y el cálculo oficial:</Typography>
            {driftWarnings.map((w, i) => (
              <Typography key={i} variant='caption' display='block'>• {w.message}</Typography>
            ))}
          </Alert>
        </Grid>
      )}

      {data?.latestPromotion && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' variant='outlined'>
            Última promoción oficial: corte {data.latestPromotion.asOfDate} · {data.latestPromotion.promotedEntryCount} entries recalculadas.
          </Alert>
        </Grid>
      )}

      {/* Detail table */}
      {data && data.entries.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='Detalle por persona' />
            <Divider />
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <CustomTextField
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder='Buscar por nombre…'
                sx={{ minWidth: 250 }}
              />
              <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>
                {table.getFilteredRowModel().rows.length} de {data.totals.memberCount} personas
              </Typography>
            </CardContent>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                          style={{
                            textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left',
                            width: header.column.getSize() !== 150 ? header.column.getSize() : undefined
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                        <Typography variant='body2' color='text.secondary'>Sin resultados</Typography>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map(row => {
                      const e = row.original
                      const cur = e.currency as 'CLP' | 'USD'
                      const isExpanded = expandedRows.has(e.memberId)
                      const { colacion, movilizacion } = readNonTaxableAllowances(e)

                      return (
                        <Fragment key={row.id}>
                          <tr className={classnames({ 'hover:bg-actionHover': true })}>
                            {row.getVisibleCells().map(cell => (
                              <td
                                key={cell.id}
                                style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td colSpan={columns.length} style={{ padding: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                              <Collapse in={isExpanded} timeout='auto' unmountOnExit>
                                <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
                                  <Grid container spacing={3}>
                                    {/* ── Composición card ── */}
                                    <Grid size={{ xs: 12, sm: 6, md: isInternationalRegime(e) ? 6 : 5 }}>
                                      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'primary.main', height: { md: '100%' } }}>
                                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                          <Stack spacing={2}>
                                            <Stack direction='row' spacing={1.5} alignItems='center'>
                                              <CustomAvatar skin='light' color='primary' variant='rounded' size={28}>
                                                <i className='tabler-coins' style={{ fontSize: 16 }} />
                                              </CustomAvatar>
                                              <Typography variant='subtitle2'>Composición</Typography>
                                            </Stack>
                                            <Stack spacing={0.5}>
                                              <LineItem label='Base' value={formatCurrency(e.baseSalary, cur)} />
                                              {e.remoteAllowance > 0 && <LineItem label='Remote' value={formatCurrency(e.remoteAllowance, cur)} />}
                                              {e.fixedBonusAmount > 0 && <LineItem label={e.fixedBonusLabel || 'Bono fijo'} value={formatCurrency(e.fixedBonusAmount, cur)} />}
                                              {colacion > 0 && <LineItem label='Colación' value={formatCurrency(colacion, cur)} />}
                                              {movilizacion > 0 && <LineItem label='Movilización' value={formatCurrency(movilizacion, cur)} />}
                                            </Stack>
                                            <Divider />
                                            <BonusPayoutBlock label='OTD' kpiLabel={`${e.kpiOtdPercent ?? '—'}%`} amount={e.bonusOtdAmount} max={e.bonusOtdMax} color={otdColor(e.kpiOtdPercent)} tooltip={chipTooltip(otdColor(e.kpiOtdPercent))} cur={cur} />
                                            <BonusPayoutBlock label='RpA' kpiLabel={String(e.kpiRpaAvg ?? '—')} amount={e.bonusRpaAmount} max={e.bonusRpaMax} color={rpaColor(e.kpiRpaAvg)} tooltip={chipTooltip(rpaColor(e.kpiRpaAvg))} cur={cur} />
                                            <Divider />
                                            <LineItem label='Bruto total' value={formatCurrency(e.grossTotal, cur)} bold />
                                          </Stack>
                                        </CardContent>
                                      </Card>
                                    </Grid>

                                    {/* ── Descuentos card (Chile) or omitted (International) ── */}
                                    {!isInternationalRegime(e) && (
                                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'error.main', height: { md: '100%' } }}>
                                          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                            <Stack spacing={2}>
                                              <Stack direction='row' spacing={1.5} alignItems='center'>
                                                <CustomAvatar skin='light' color='error' variant='rounded' size={28}>
                                                  <i className='tabler-receipt-tax' style={{ fontSize: 16 }} />
                                                </CustomAvatar>
                                                <Typography variant='subtitle2'>
                                                  {isHonorariosProjectedEntry(e) ? 'Retención honorarios' : 'Descuentos'}
                                                </Typography>
                                              </Stack>
                                              {isHonorariosProjectedEntry(e) ? (
                                                <Stack spacing={0.5}>
                                                  <LineItem
                                                    label='Retención SII'
                                                    value={formatCurrency(-(e.siiRetentionAmount ?? e.chileTotalDeductions), cur)}
                                                    color='error.main'
                                                  />
                                                  <LineItem
                                                    label='Tasa'
                                                    value={e.siiRetentionRate != null ? `${(e.siiRetentionRate * 100).toFixed(2)}%` : '—'}
                                                  />
                                                  <Typography variant='caption' color='text.secondary' sx={{ pt: 0.5 }}>
                                                    Boleta de honorarios Chile
                                                  </Typography>
                                                </Stack>
                                              ) : (
                                                <Stack spacing={0.5}>
                                                  <LineItem label='AFP' value={formatCurrency(-e.chileAfpAmount, cur)} color='error.main' />
                                                  <LineItem label='Salud' value={formatCurrency(-e.chileHealthAmount, cur)} color='error.main' />
                                                  <LineItem label='Cesantía' value={formatCurrency(-e.chileUnemploymentAmount, cur)} color='error.main' />
                                                  {e.chileApvAmount > 0 && <LineItem label='APV' value={formatCurrency(-e.chileApvAmount, cur)} color='error.main' />}
                                                  <LineItem label='Impuesto' value={formatCurrency(-e.chileTaxAmount, cur)} color='error.main' />
                                                </Stack>
                                              )}
                                              <Divider />
                                              <LineItem
                                                label={isHonorariosProjectedEntry(e) ? 'Total retención' : 'Total descuentos'}
                                                value={formatCurrency(-e.chileTotalDeductions, cur)}
                                                color='error.main'
                                                bold
                                              />
                                            </Stack>
                                          </CardContent>
                                        </Card>
                                      </Grid>
                                    )}

                                    {/* ── Indicadores card ── */}
                                    <Grid size={{ xs: 12, sm: isInternationalRegime(e) ? 6 : 12, md: isInternationalRegime(e) ? 6 : 4 }}>
                                      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'info.main', height: { md: '100%' } }}>
                                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                          <Stack spacing={2}>
                                            <Stack direction='row' spacing={1.5} alignItems='center'>
                                              <CustomAvatar skin='light' color='info' variant='rounded' size={28}>
                                                <i className='tabler-chart-dots-3' style={{ fontSize: 16 }} />
                                              </CustomAvatar>
                                              <Typography variant='subtitle2'>Indicadores</Typography>
                                            </Stack>

                                            {/* Attendance ring */}
                                            <AttendanceRing present={e.projectedWorkingDays} total={e.projectedWorkingDaysTotal} absent={e.daysAbsent ?? 0} />

                                            <Stack spacing={0.5}>
                                              <LineItem label='Permisos' value={e.daysOnLeave != null && e.daysOnLeave > 0 ? `${e.daysOnLeave} (${e.daysOnUnpaidLeave ?? 0} sin goce)` : '0'} />
                                              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                                <Typography variant='body2' color='text.secondary'>Ausencias</Typography>
                                                {(e.daysAbsent ?? 0) > 0
                                                  ? <CustomChip round='true' size='small' variant='tonal' color='warning' label={String(e.daysAbsent)} />
                                                  : <Typography variant='body2'>0</Typography>
                                                }
                                              </Stack>
                                              {e.chileUfValue != null && e.chileUfValue > 0 && <LineItem label='UF' value={formatCurrency(e.chileUfValue, 'CLP')} />}
                                            </Stack>

                                            {/* International regime chip */}
                                            {isInternationalRegime(e) && (
                                              <>
                                                <Divider />
                                                <Box>
                                                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label='Sin descuentos previsionales' />
                                                  <Typography variant='caption' display='block' color='text.disabled' sx={{ mt: 0.5 }}>Régimen USD internacional</Typography>
                                                </Box>
                                              </>
                                            )}

                                            {/* Drift warnings */}
                                            {e.inputVariance && (e.inputVariance.kpiOtdChanged || e.inputVariance.kpiRpaChanged || e.inputVariance.attendanceChanged || e.inputVariance.ufChanged || e.inputVariance.baseSalaryChanged) && (
                                              <>
                                                <Divider />
                                                <Stack spacing={0.5}>
                                                  <Stack direction='row' spacing={1} alignItems='center'>
                                                    <i className='tabler-alert-triangle' style={{ fontSize: 16, color: 'var(--mui-palette-warning-main)' }} />
                                                    <Typography variant='caption' fontWeight={600} color='warning.main'>Cambios vs oficial</Typography>
                                                  </Stack>
                                                  {e.inputVariance.kpiOtdChanged && <LineItem label='OTD' value={`oficial: ${e.inputVariance.officialInputs.kpiOtdPercent ?? '—'}%`} color='warning.main' />}
                                                  {e.inputVariance.kpiRpaChanged && <LineItem label='RpA' value={`oficial: ${e.inputVariance.officialInputs.kpiRpaAvg ?? '—'}`} color='warning.main' />}
                                                  {e.inputVariance.attendanceChanged && <LineItem label='Asistencia' value={`oficial: ${e.inputVariance.officialInputs.daysPresent ?? '—'} días`} color='warning.main' />}
                                                  {e.inputVariance.ufChanged && <LineItem label='UF' value={`oficial: ${e.inputVariance.officialInputs.ufValue ?? '—'}`} color='warning.main' />}
                                                  {e.inputVariance.baseSalaryChanged && <LineItem label='Base' value='cambió' color='warning.main' />}
                                                </Stack>
                                              </>
                                            )}
                                          </Stack>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  </Grid>
                                </Box>
                              </Collapse>
                            </td>
                          </tr>
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

// ── Sub-components ──

const LineItem = ({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) => (
  <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ py: 0.25 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' sx={{ fontWeight: bold ? 600 : 400 }} color={color || 'text.primary'}>{value}</Typography>
  </Stack>
)

const BonusPayoutBlock = ({ label, kpiLabel, amount, max, color, tooltip, cur }: {
  label: string; kpiLabel: string; amount: number; max: number
  color: 'success' | 'warning' | 'error' | 'secondary'; tooltip: string; cur: 'CLP' | 'USD'
}) => {
  const pct = payoutPct(amount, max)

  return (
    <Stack spacing={0.75}>
      <Stack direction='row' spacing={1} alignItems='center'>
        <Tooltip title={tooltip}>
          <span><CustomChip round='true' size='small' variant='tonal' color={color} label={`${kpiLabel} ${label}`} /></span>
        </Tooltip>
        <Typography variant='caption' color='text.secondary'>{pct}% payout</Typography>
      </Stack>
      <LinearProgress variant='determinate' value={pct} color={color === 'secondary' ? 'inherit' : color} sx={{ height: 6, borderRadius: 999 }} />
      <Stack direction='row' justifyContent='space-between'>
        <Typography variant='caption' color='text.primary' fontWeight={500}>{formatCurrency(amount, cur)}</Typography>
        <Typography variant='caption' color='text.disabled'>max {formatCurrency(max, cur)}</Typography>
      </Stack>
    </Stack>
  )
}

const AttendanceRing = ({ present, total, absent }: { present: number; total: number; absent: number }) => {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0
  const ringColor = absent === 0 ? 'success' : absent <= 2 ? 'warning' : 'error'

  return (
    <Stack direction='row' spacing={2} alignItems='center'>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant='determinate' value={pct} size={48} thickness={4} color={ringColor} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant='caption' fontWeight={600}>{present}</Typography>
        </Box>
      </Box>
      <Stack spacing={0.25}>
        <Typography variant='body2' fontWeight={500}>{present} / {total} días hábiles</Typography>
        <Typography variant='caption' color='text.secondary'>
          {absent === 0 ? 'Asistencia completa' : `${absent} ausencia${absent > 1 ? 's' : ''}`}
        </Typography>
      </Stack>
    </Stack>
  )
}

export default ProjectedPayrollView
