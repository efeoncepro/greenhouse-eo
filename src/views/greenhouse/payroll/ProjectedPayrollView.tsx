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
import Tab from '@mui/material/Tab'
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

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { formatCurrency } from './helpers'

import tableStyles from '@core/styles/table.module.css'

// ── Types ──

type ProjectionMode = 'actual_to_date' | 'projected_month_end'

interface ProjectedEntry {
  memberId: string
  memberName: string
  currency: string
  baseSalary: number
  remoteAllowance: number
  fixedBonusLabel: string | null
  fixedBonusAmount: number
  bonusOtdAmount: number
  bonusRpaAmount: number
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
  chileApvAmount: number
  chileUfValue: number | null
  workingDaysInPeriod: number | null
  daysPresent: number | null
  daysAbsent: number | null
  daysOnLeave: number | null
  daysOnUnpaidLeave: number | null
  projectionMode: ProjectionMode
  projectedWorkingDays: number
  projectedWorkingDaysTotal: number
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

const currencySummaryLabel = (byCurrency: Record<string, number>) => {
  const parts: string[] = []

  for (const [cur, amount] of Object.entries(byCurrency)) {
    if (amount > 0) parts.push(formatCurrency(amount, cur as 'CLP' | 'USD'))
  }

  return parts.join(' + ') || '—'
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


  const today = useMemo(() => {
    const d = new Date()

    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  }, [])

  const [year, setYear] = useState(today.year)
  const [month, setMonth] = useState(today.month)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/hr/payroll/projected?year=${year}&month=${month}&mode=${mode}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      })

      if (res.ok) {
        setData(await res.json())
        setExpandedRows(new Set())
      }
    } catch {
      setData(null)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ColumnDef<ProjectedEntry, any>[] = useMemo(() => [
    columnHelper.display({
      id: 'expander',
      header: '',
      cell: ({ row }) => (
        <IconButton size='small' onClick={() => toggleRow(row.original.memberId)} sx={{ p: 0.5 }}>
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
      cell: ({ row }) => <Typography variant='body2' color='error.main'>{formatCurrency(-row.original.chileTotalDeductions, row.original.currency as 'CLP' | 'USD')}</Typography>,
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
                >
                  {data?.official ? 'Recalcular oficial' : 'Crear borrador oficial'}
                </Button>
                <IconButton size='small' onClick={() => navMonth(-1)}><i className='tabler-chevron-left' style={{ fontSize: 18 }} /></IconButton>
                <Typography variant='body2' fontWeight={600}>{MONTHS[month - 1]} {year}</Typography>
                <IconButton size='small' onClick={() => navMonth(1)}><i className='tabler-chevron-right' style={{ fontSize: 18 }} /></IconButton>
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
              <Tab label='Hoy' value='actual_to_date' icon={<i className='tabler-clock' />} iconPosition='start' />
              <Tab label='Fin de mes' value='projected_month_end' icon={<i className='tabler-calendar-event' />} iconPosition='start' />
            </CustomTabList>
          </Card>
          <TabPanel value={mode} sx={{ p: 0 }} />
        </TabContext>
      </Grid>

      {/* KPI cards */}
      {data && (
        <>
          <Grid size={{ xs: 12, sm: 6, md: data.official ? 3 : 4 }}>
            <HorizontalWithSubtitle
              title='Bruto total'
              stats={currencySummaryLabel(data.totals.grossByCurrency)}
              avatarIcon='tabler-cash'
              avatarColor='info'
              subtitle={mode === 'actual_to_date' ? 'Devengado al corte' : 'Proyectado al cierre'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: data.official ? 3 : 4 }}>
            <HorizontalWithSubtitle
              title='Neto total'
              stats={currencySummaryLabel(data.totals.netByCurrency)}
              avatarIcon='tabler-wallet'
              avatarColor='success'
              subtitle='Líquido a pagar'
            />
          </Grid>
          {data.official && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Δ vs Oficial'
                stats={currencySummaryLabel(
                  Object.fromEntries(
                    Object.entries(data.totals.netByCurrency).map(([cur, projected]) => {
                      const official = data.official?.netByCurrency[cur] ?? 0

                      return [cur, Math.round((projected - official) * 100) / 100]
                    })
                  )
                )}
                avatarIcon='tabler-arrows-diff'
                avatarColor='warning'
                subtitle='Proyectado − oficial'
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6, md: data.official ? 3 : 4 }}>
            <HorizontalWithSubtitle
              title='Personas'
              stats={String(data.totals.memberCount)}
              avatarIcon='tabler-users'
              avatarColor='primary'
              subtitle={`Corte: ${data.asOfDate}`}
            />
          </Grid>
        </>
      )}

      {!data && (
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
                                <Box sx={{ px: 6, py: 3, bgcolor: 'action.hover' }}>
                                  <Grid container spacing={4}>
                                    {/* Composición */}
                                    <Grid size={{ xs: 12, md: 4 }}>
                                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Composición</Typography>
                                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Row label='Base' value={formatCurrency(e.baseSalary, cur)} />
                                        <Row label='Remote' value={formatCurrency(e.remoteAllowance, cur)} />
                                        {e.fixedBonusAmount > 0 && <Row label={e.fixedBonusLabel || 'Bono fijo'} value={formatCurrency(e.fixedBonusAmount, cur)} />}
                                        <Row label={`OTD ${e.kpiOtdPercent != null ? `(${e.kpiOtdPercent}%)` : ''}`} value={formatCurrency(e.bonusOtdAmount, cur)} chip={e.kpiOtdPercent != null ? otdColor(e.kpiOtdPercent) : undefined} />
                                        <Row label={`RpA ${e.kpiRpaAvg != null ? `(${e.kpiRpaAvg})` : ''}`} value={formatCurrency(e.bonusRpaAmount, cur)} chip={e.kpiRpaAvg != null ? rpaColor(e.kpiRpaAvg) : undefined} />
                                      </Box>
                                    </Grid>
                                    {/* Descuentos Chile */}
                                    <Grid size={{ xs: 12, md: 4 }}>
                                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Descuentos</Typography>
                                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Row label='AFP' value={formatCurrency(-e.chileAfpAmount, cur)} />
                                        <Row label='Salud' value={formatCurrency(-e.chileHealthAmount, cur)} />
                                        <Row label='Cesantía' value={formatCurrency(-e.chileUnemploymentAmount, cur)} />
                                        {e.chileApvAmount > 0 && <Row label='APV' value={formatCurrency(-e.chileApvAmount, cur)} />}
                                        <Row label='Impuesto' value={formatCurrency(-e.chileTaxAmount, cur)} />
                                      </Box>
                                    </Grid>
                                    {/* Indicadores */}
                                    <Grid size={{ xs: 12, md: 4 }}>
                                      <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Indicadores</Typography>
                                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {e.chileUfValue && <Row label='UF' value={formatCurrency(e.chileUfValue, 'CLP')} />}
                                        <Row label='Días hábiles' value={`${e.projectedWorkingDays} / ${e.projectedWorkingDaysTotal}`} />
                                        {e.daysAbsent != null && e.daysAbsent > 0 && <Row label='Ausencias' value={String(e.daysAbsent)} />}
                                        {e.daysOnLeave != null && e.daysOnLeave > 0 && <Row label='Permisos' value={`${e.daysOnLeave} (${e.daysOnUnpaidLeave ?? 0} sin goce)`} />}
                                      </Box>
                                      {e.inputVariance && (e.inputVariance.kpiOtdChanged || e.inputVariance.kpiRpaChanged || e.inputVariance.attendanceChanged || e.inputVariance.ufChanged || e.inputVariance.baseSalaryChanged) && (
                                        <Box sx={{ mt: 2 }}>
                                          <Typography variant='caption' color='warning.main' sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Cambios vs oficial</Typography>
                                          <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {e.inputVariance.kpiOtdChanged && (
                                              <Row label='OTD' value={`oficial: ${e.inputVariance.officialInputs.kpiOtdPercent ?? '—'}%`} chip='warning' />
                                            )}
                                            {e.inputVariance.kpiRpaChanged && (
                                              <Row label='RpA' value={`oficial: ${e.inputVariance.officialInputs.kpiRpaAvg ?? '—'}`} chip='warning' />
                                            )}
                                            {e.inputVariance.attendanceChanged && (
                                              <Row label='Asistencia' value={`oficial: ${e.inputVariance.officialInputs.daysPresent ?? '—'} días`} chip='warning' />
                                            )}
                                            {e.inputVariance.ufChanged && (
                                              <Row label='UF' value={`oficial: ${e.inputVariance.officialInputs.ufValue ?? '—'}`} chip='warning' />
                                            )}
                                            {e.inputVariance.baseSalaryChanged && (
                                              <Row label='Base' value='cambió' chip='warning' />
                                            )}
                                          </Box>
                                        </Box>
                                      )}
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

// ── Sub-component ──

const Row = ({ label, value, chip }: { label: string; value: string; chip?: 'success' | 'warning' | 'error' | 'secondary' }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant='caption' color='text.secondary'>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {chip && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${chip}.main` }} />}
      <Typography variant='body2'>{value}</Typography>
    </Box>
  </Box>
)

export default ProjectedPayrollView
