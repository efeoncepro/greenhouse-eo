'use client'

import { Fragment, startTransition, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { toast } from 'sonner'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'

type PeriodClosureLifecycle = 'open' | 'ready' | 'closed' | 'reopened'
type PayrollClosureStatus = 'pending' | 'calculated' | 'approved' | 'exported'
type FinanceClosureStatus = 'pending' | 'partial' | 'complete'
type FxClosureStatus = 'pending' | 'locked'

type PeriodClosureReadiness = {
  periodId: string
  year: number
  month: number
  closureStatus: PeriodClosureLifecycle
  payrollStatus: PayrollClosureStatus
  incomeStatus: FinanceClosureStatus
  expenseStatus: FinanceClosureStatus
  fxStatus: FxClosureStatus
  payrollClosed: boolean
  incomeClosed: boolean
  expensesClosed: boolean
  fxLocked: boolean
  readinessPct: number
  isReady: boolean
  snapshotRevision: number
  operationalCalendar: {
    timezone: string
    currentOperationalMonthKey: string
    inCurrentCloseWindow: boolean
    lastBusinessDayOfTargetMonth: string
  }
  audit: {
    closedAt: string | null
    closedBy: string | null
    reopenedAt: string | null
    reopenedBy: string | null
    reopenedReason: string | null
    updatedAt: string | null
  }
}

type OperationalPlSnapshot = {
  snapshotId: string
  scopeType: 'client' | 'space' | 'organization'
  scopeId: string
  scopeName: string
  periodYear: number
  periodMonth: number
  periodClosed: boolean
  snapshotRevision: number
  revenueClp: number
  laborCostClp: number
  directExpenseClp: number
  overheadClp: number
  totalCostClp: number
  grossMarginClp: number
  grossMarginPct: number | null
  headcountFte: number | null
}

type Props = {
  canManageClosure: boolean
  canReopen: boolean
}

type PeriodFilter = 'all' | 'attention' | 'ready' | 'closed'

type SnapshotState = {
  loading: boolean
  error: string | null
  snapshots: OperationalPlSnapshot[]
}

const PERIOD_FILTER_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'attention', label: 'Con atención' },
  { value: 'ready', label: 'Listos' },
  { value: 'closed', label: 'Cerrados' }
]

const MONTH_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(value)

const formatMargin = (value: number | null) => {
  if (value == null) return '—'

  return `${value.toFixed(1)}%`
}

const formatMonthLabel = (year: number, month: number) => `${MONTH_LABELS[month - 1] || month} ${year}`

const parseDisplayDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`)
  }

  return new Date(value)
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parseDisplayDate(value))
}

const formatDate = (value: string | null) => {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium'
  }).format(parseDisplayDate(value))
}

const getLifecycleChip = (status: PeriodClosureLifecycle) => {
  switch (status) {
    case 'closed':
      return { label: 'Cerrado', color: 'primary' as const, variant: 'filled' as const }
    case 'ready':
      return { label: 'Listo para cerrar', color: 'success' as const, variant: 'filled' as const }
    case 'reopened':
      return { label: 'Reabierto', color: 'warning' as const, variant: 'tonal' as const }
    default:
      return { label: 'Abierto', color: 'secondary' as const, variant: 'tonal' as const }
  }
}

const getMarginChipColor = (value: number | null) => {
  if (value == null) return 'secondary' as const
  if (value > 20) return 'success' as const
  if (value >= 5) return 'warning' as const

  return 'error' as const
}

const getPayrollChip = (status: PayrollClosureStatus) => {
  switch (status) {
    case 'exported':
      return { label: 'Exportada', color: 'success' as const }
    case 'approved':
      return { label: 'Aprobada', color: 'info' as const }
    case 'calculated':
      return { label: 'Calculada', color: 'warning' as const }
    default:
      return { label: 'Pendiente', color: 'error' as const }
  }
}

const getFinanceChip = (status: FinanceClosureStatus, completeLabel: string) => {
  switch (status) {
    case 'complete':
      return { label: completeLabel, color: 'success' as const }
    case 'partial':
      return { label: 'Parcial', color: 'warning' as const }
    default:
      return { label: 'Pendiente', color: 'error' as const }
  }
}

const getFxChip = (status: FxClosureStatus) => {
  if (status === 'locked') {
    return { label: 'Bloqueado', color: 'success' as const }
  }

  return { label: 'Pendiente', color: 'error' as const }
}

const shouldShowPeriod = (period: PeriodClosureReadiness, filter: PeriodFilter) => {
  if (filter === 'closed') return period.closureStatus === 'closed'
  if (filter === 'ready') return period.closureStatus === 'ready'
  if (filter === 'attention') return period.readinessPct < 100 || period.closureStatus === 'reopened'

  return true
}

const fetchJson = async <T,>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'No fue posible completar la operación.'

    throw new Error(message)
  }

  return data as T
}

const FinancePeriodClosureDashboardView = ({ canManageClosure, canReopen }: Props) => {
  const theme = useTheme()
  const [periods, setPeriods] = useState<PeriodClosureReadiness[]>([])
  const [periodsLoading, setPeriodsLoading] = useState(true)
  const [periodsError, setPeriodsError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<PeriodFilter>('all')
  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null)
  const [snapshotByPeriod, setSnapshotByPeriod] = useState<Record<string, SnapshotState>>({})
  const [actionLoadingPeriodId, setActionLoadingPeriodId] = useState<string | null>(null)
  const [closeDialogPeriod, setCloseDialogPeriod] = useState<PeriodClosureReadiness | null>(null)
  const [reopenDialogPeriod, setReopenDialogPeriod] = useState<PeriodClosureReadiness | null>(null)
  const [reopenReason, setReopenReason] = useState('')

  const loadPeriods = async () => {
    setPeriodsLoading(true)
    setPeriodsError(null)

    try {
      const response = await fetchJson<{ items: PeriodClosureReadiness[] }>('/api/cost-intelligence/periods?limit=12')

      setPeriods(response.items)
    } catch (error) {
      setPeriodsError(error instanceof Error ? error.message : 'No fue posible cargar los períodos.')
    } finally {
      setPeriodsLoading(false)
    }
  }

  useEffect(() => {
    void loadPeriods()
  }, [])

  const ensureSnapshots = async (period: PeriodClosureReadiness, force = false) => {
    const existing = snapshotByPeriod[period.periodId]

    if (!force && existing && !existing.loading && !existing.error) {
      return existing.snapshots
    }

    setSnapshotByPeriod(current => ({
      ...current,
      [period.periodId]: {
        loading: true,
        error: null,
        snapshots: current[period.periodId]?.snapshots || []
      }
    }))

    try {
      const query = new URLSearchParams({
        year: String(period.year),
        month: String(period.month),
        scopeType: 'client',
        limit: '200'
      })

      const response = await fetchJson<{ snapshots: OperationalPlSnapshot[] }>(`/api/cost-intelligence/pl?${query.toString()}`)

      setSnapshotByPeriod(current => ({
        ...current,
        [period.periodId]: {
          loading: false,
          error: null,
          snapshots: response.snapshots
        }
      }))

      return response.snapshots
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar el P&L del período.'

      setSnapshotByPeriod(current => ({
        ...current,
        [period.periodId]: {
          loading: false,
          error: message,
          snapshots: current[period.periodId]?.snapshots || []
        }
      }))

      throw error
    }
  }

  const filteredPeriods = useMemo(() => periods.filter(period => shouldShowPeriod(period, activeFilter)), [activeFilter, periods])

  const summary = useMemo(() => {
    const ready = periods.filter(period => period.closureStatus === 'ready').length
    const closed = periods.filter(period => period.closureStatus === 'closed').length
    const attention = periods.filter(period => period.readinessPct < 100 || period.closureStatus === 'reopened').length
    const averageReadiness = periods.length > 0 ? Math.round(periods.reduce((acc, period) => acc + period.readinessPct, 0) / periods.length) : 0

    return { ready, closed, attention, averageReadiness }
  }, [periods])

  const dialogTotals = useMemo(() => {
    const dialogSnapshots = closeDialogPeriod ? snapshotByPeriod[closeDialogPeriod.periodId]?.snapshots || [] : []

    return dialogSnapshots.reduce(
      (acc, snapshot) => {
        acc.revenueClp += snapshot.revenueClp
        acc.totalCostClp += snapshot.totalCostClp
        acc.grossMarginClp += snapshot.grossMarginClp

        return acc
      },
      {
        revenueClp: 0,
        totalCostClp: 0,
        grossMarginClp: 0
      }
    )
  }, [closeDialogPeriod, snapshotByPeriod])

  const handleTogglePeriod = async (period: PeriodClosureReadiness) => {
    const nextExpanded = expandedPeriodId === period.periodId ? null : period.periodId

    setExpandedPeriodId(nextExpanded)

    if (nextExpanded) {
      try {
        await ensureSnapshots(period)
      } catch {
        toast.error('No pudimos cargar el P&L materializado de este período.')
      }
    }
  }

  const openCloseDialog = async (period: PeriodClosureReadiness) => {
    setCloseDialogPeriod(period)

    try {
      await ensureSnapshots(period)
    } catch {
      // UI degradada: el cierre igual se puede ejecutar usando solo readiness del período.
    }
  }

  const handleClosePeriod = async () => {
    if (!closeDialogPeriod) return

    setActionLoadingPeriodId(closeDialogPeriod.periodId)

    try {
      await fetchJson(`/api/cost-intelligence/periods/${closeDialogPeriod.year}/${closeDialogPeriod.month}/close`, {
        method: 'POST',
        body: JSON.stringify({})
      })

      toast.success(`Período ${formatMonthLabel(closeDialogPeriod.year, closeDialogPeriod.month)} cerrado.`)
      setCloseDialogPeriod(null)
      startTransition(() => {
        void loadPeriods()
        void ensureSnapshots(closeDialogPeriod, true).catch(() => undefined)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible cerrar el período.')
    } finally {
      setActionLoadingPeriodId(null)
    }
  }

  const handleReopenPeriod = async () => {
    if (!reopenDialogPeriod) return

    setActionLoadingPeriodId(reopenDialogPeriod.periodId)

    try {
      await fetchJson(`/api/cost-intelligence/periods/${reopenDialogPeriod.year}/${reopenDialogPeriod.month}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason: reopenReason })
      })

      toast.success(`Período ${formatMonthLabel(reopenDialogPeriod.year, reopenDialogPeriod.month)} reabierto.`)
      setReopenDialogPeriod(null)
      setReopenReason('')
      startTransition(() => {
        void loadPeriods()
        void ensureSnapshots(reopenDialogPeriod, true).catch(() => undefined)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible reabrir el período.')
    } finally {
      setActionLoadingPeriodId(null)
    }
  }

  return (
    <Stack spacing={3}>
      <ExecutiveCardShell
        title='Cierre de período'
        subtitle='Revisa readiness por pata, inspecciona el P&L materializado y ejecuta el cierre cuando el mes operativo esté sano.'
      >
        <Stack spacing={3}>
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.info.main, 0.08)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' gap={2}>
                <Box>
                  <Typography variant='overline' color='text.secondary'>
                    Economía operativa
                  </Typography>
                  <Typography variant='h4'>Cost Intelligence ya gobierna el cierre mensual</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Esta surface valida si el mes quedó listo por nómina, ingresos, gastos y FX antes de congelar la revisión del P&L.
                  </Typography>
                </Box>
                <Stack direction='row' spacing={1} flexWrap='wrap'>
                  <Chip size='small' variant='outlined' label='Últimos 12 meses' />
                  <Chip size='small' variant='outlined' label='Snapshot aware' />
                  {!canManageClosure ? <Chip size='small' color='warning' variant='tonal' label='Lectura sin acciones de cierre' /> : null}
                </Stack>
              </Stack>
              <Alert severity='info' variant='outlined'>
                El P&L inline refleja el snapshot materializado más reciente del período. Después de cerrar o reabrir, la revisión puede tardar unos segundos en refrescarse por la cadena reactiva.
              </Alert>
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }
            }}
          >
            {[
              {
                key: 'ready',
                label: 'Listos para cerrar',
                value: summary.ready,
                detail: 'Meses con readiness al 100%.',
                color: 'success' as const,
                icon: 'tabler-lock-check'
              },
              {
                key: 'closed',
                label: 'Cerrados',
                value: summary.closed,
                detail: 'Períodos ya congelados.',
                color: 'primary' as const,
                icon: 'tabler-checklist'
              },
              {
                key: 'attention',
                label: 'Con atención',
                value: summary.attention,
                detail: 'Faltan señales o el mes fue reabierto.',
                color: 'warning' as const,
                icon: 'tabler-alert-triangle'
              },
              {
                key: 'readiness',
                label: 'Readiness promedio',
                value: `${summary.averageReadiness}%`,
                detail: 'Salud agregada de la ventana operativa.',
                color: 'info' as const,
                icon: 'tabler-chart-donut-3'
              }
            ].map(item => (
              <Box
                key={item.key}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette[item.color].main, 0.16)}`,
                  backgroundColor: alpha(theme.palette[item.color].main, 0.06)
                }}
              >
                <Stack direction='row' spacing={1.5} alignItems='center'>
                  <CustomAvatar skin='light' color={item.color} size={40} variant='rounded'>
                    <i className={item.icon} />
                  </CustomAvatar>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>
                      {item.label}
                    </Typography>
                    <Typography variant='h4'>{item.value}</Typography>
                  </Box>
                </Stack>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
                  {item.detail}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Panel de períodos'
        subtitle='Expande un mes para revisar el P&L por cliente y decidir si ya conviene cerrarlo.'
        action={
          <CustomTextField
            select
            size='small'
            value={activeFilter}
            onChange={event => setActiveFilter(event.target.value as PeriodFilter)}
            sx={{ minWidth: 180 }}
          >
            {PERIOD_FILTER_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
        }
      >
        <Stack spacing={2.5}>
          {periodsLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} variant='rounded' height={74} />
              ))}
            </Stack>
          ) : periodsError ? (
            <Alert severity='error' action={<Button color='inherit' size='small' onClick={() => void loadPeriods()}>Reintentar</Button>}>
              {periodsError}
            </Alert>
          ) : filteredPeriods.length === 0 ? (
            <EmptyState
              icon='tabler-calendar-off'
              animatedIcon='/animations/empty-inbox.json'
              title='No hay períodos para este filtro'
              description='Cambia el enfoque para revisar meses listos, cerrados o con atención pendiente.'
              minHeight={260}
            />
          ) : (
            <TableContainer component={Paper} variant='outlined'>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 56 }} />
                    <TableCell>Período</TableCell>
                    <TableCell>Readiness</TableCell>
                    <TableCell>Nómina</TableCell>
                    <TableCell>Ingresos</TableCell>
                    <TableCell>Gastos</TableCell>
                    <TableCell>FX</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Revisión</TableCell>
                    <TableCell align='right'>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPeriods.map(period => {
                    const lifecycleChip = getLifecycleChip(period.closureStatus)
                    const payrollChip = getPayrollChip(period.payrollStatus)
                    const incomeChip = getFinanceChip(period.incomeStatus, 'Registrados')
                    const expenseChip = getFinanceChip(period.expenseStatus, 'Registrados')
                    const fxChip = getFxChip(period.fxStatus)
                    const snapshotState = snapshotByPeriod[period.periodId]
                    const expanded = expandedPeriodId === period.periodId
                    const canCloseThisPeriod = canManageClosure && period.isReady && period.closureStatus !== 'closed'
                    const canReopenThisPeriod = canReopen && period.closureStatus === 'closed'

                    const periodTotals = (snapshotState?.snapshots || []).reduce(
                      (acc, snapshot) => {
                        acc.revenueClp += snapshot.revenueClp
                        acc.laborCostClp += snapshot.laborCostClp
                        acc.directExpenseClp += snapshot.directExpenseClp
                        acc.overheadClp += snapshot.overheadClp
                        acc.totalCostClp += snapshot.totalCostClp
                        acc.grossMarginClp += snapshot.grossMarginClp

                        return acc
                      },
                      {
                        revenueClp: 0,
                        laborCostClp: 0,
                        directExpenseClp: 0,
                        overheadClp: 0,
                        totalCostClp: 0,
                        grossMarginClp: 0
                      }
                    )

                    return (
                      <Fragment key={period.periodId}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton size='small' onClick={() => void handleTogglePeriod(period)} aria-label={`Expandir ${period.periodId}`}>
                              <i className={expanded ? 'tabler-chevron-up' : 'tabler-chevron-down'} />
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='body2' fontWeight={600}>
                                {formatMonthLabel(period.year, period.month)}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                Último día hábil: {formatDate(period.operationalCalendar.lastBusinessDayOfTargetMonth)}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 190 }}>
                            <Stack spacing={1}>
                              <Stack direction='row' justifyContent='space-between' gap={1}>
                                <Typography variant='body2' color='text.secondary'>
                                  {period.readinessPct}%
                                </Typography>
                                {period.closureStatus === 'reopened' ? <Chip size='small' color='warning' variant='outlined' label='Reabierto' /> : null}
                              </Stack>
                              <LinearProgress
                                variant='determinate'
                                value={period.readinessPct}
                                color={period.readinessPct === 100 ? 'success' : period.readinessPct >= 50 ? 'warning' : 'error'}
                                sx={{ height: 8, borderRadius: 999 }}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <CustomChip round='true' size='small' color={payrollChip.color} variant='tonal' label={payrollChip.label} />
                          </TableCell>
                          <TableCell>
                            <CustomChip round='true' size='small' color={incomeChip.color} variant='tonal' label={incomeChip.label} />
                          </TableCell>
                          <TableCell>
                            <CustomChip round='true' size='small' color={expenseChip.color} variant='tonal' label={expenseChip.label} />
                          </TableCell>
                          <TableCell>
                            <CustomChip round='true' size='small' color={fxChip.color} variant='tonal' label={fxChip.label} />
                          </TableCell>
                          <TableCell>
                            <CustomChip round='true' size='small' color={lifecycleChip.color} variant={lifecycleChip.variant} label={lifecycleChip.label} />
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='body2'>r{period.snapshotRevision}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {period.audit.updatedAt ? formatDateTime(period.audit.updatedAt) : 'Sin cierre manual'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align='right'>
                            <Stack direction='row' spacing={1} justifyContent='flex-end'>
                              {canCloseThisPeriod ? (
                                <Button
                                  size='small'
                                  variant='contained'
                                  onClick={() => void openCloseDialog(period)}
                                  disabled={actionLoadingPeriodId === period.periodId}
                                >
                                  Cerrar
                                </Button>
                              ) : null}
                              {canReopenThisPeriod ? (
                                <Button
                                  size='small'
                                  variant='outlined'
                                  color='warning'
                                  onClick={() => setReopenDialogPeriod(period)}
                                  disabled={actionLoadingPeriodId === period.periodId}
                                >
                                  Reabrir
                                </Button>
                              ) : null}
                            </Stack>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={10} sx={{ py: expanded ? 0 : 0, borderBottom: expanded ? undefined : 0 }}>
                            <Collapse in={expanded} timeout='auto' unmountOnExit>
                              <Box sx={{ p: 3, backgroundColor: alpha(theme.palette.action.hover, 0.26) }}>
                              <Stack spacing={2.5}>
                                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' gap={2}>
                                  <Box>
                                    <Typography variant='h6'>P&L operativo por cliente</Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                      Snapshot {period.closureStatus === 'closed' ? 'cerrado' : 'provisional'} del período {formatMonthLabel(period.year, period.month)}.
                                    </Typography>
                                  </Box>
                                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                                    <Chip size='small' variant='outlined' label={`Timezone ${period.operationalCalendar.timezone}`} />
                                    {period.closureStatus !== 'closed' ? <Chip size='small' color='warning' variant='tonal' label='Provisional' /> : null}
                                  </Stack>
                                </Stack>

                                {snapshotState?.loading ? (
                                  <Stack spacing={1.5}>
                                    <Skeleton variant='rounded' height={72} />
                                    <Skeleton variant='rounded' height={180} />
                                  </Stack>
                                ) : snapshotState?.error ? (
                                  <Alert severity='error'>{snapshotState.error}</Alert>
                                ) : !snapshotState || snapshotState.snapshots.length === 0 ? (
                                  <EmptyState
                                    icon='tabler-chart-bar-off'
                                    animatedIcon='/animations/empty-chart.json'
                                    title='Todavía no hay snapshots materializados'
                                    description='El período existe en readiness, pero aún no encontramos P&L materializado por cliente para este mes.'
                                    minHeight={220}
                                  />
                                ) : (
                                  <Stack spacing={2}>
                                    <Box
                                      sx={{
                                        display: 'grid',
                                        gap: 2,
                                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }
                                      }}
                                    >
                                      {[
                                        {
                                          key: 'revenue',
                                          label: 'Ingresos netos',
                                          value: formatCurrency(periodTotals.revenueClp),
                                          color: 'success' as const
                                        },
                                        {
                                          key: 'cost',
                                          label: 'Costo total',
                                          value: formatCurrency(periodTotals.totalCostClp),
                                          color: 'warning' as const
                                        },
                                        {
                                          key: 'margin',
                                          label: 'Margen agregado',
                                          value: formatCurrency(periodTotals.grossMarginClp),
                                          color: 'primary' as const
                                        }
                                      ].map(item => (
                                        <Box
                                          key={item.key}
                                          sx={{
                                            p: 2.25,
                                            borderRadius: 3,
                                            border: `1px solid ${alpha(theme.palette[item.color].main, 0.18)}`,
                                            backgroundColor: alpha(theme.palette[item.color].main, 0.06)
                                          }}
                                        >
                                          <Typography variant='caption' color='text.secondary'>
                                            {item.label}
                                          </Typography>
                                          <Typography variant='h5'>{item.value}</Typography>
                                        </Box>
                                      ))}
                                    </Box>

                                    <TableContainer component={Paper} variant='outlined'>
                                      <Table size='small'>
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Cliente</TableCell>
                                            <TableCell align='right'>Ingresos</TableCell>
                                            <TableCell align='right'>Costo laboral</TableCell>
                                            <TableCell align='right'>Gastos directos</TableCell>
                                            <TableCell align='right'>Overhead</TableCell>
                                            <TableCell align='right'>Costo total</TableCell>
                                            <TableCell align='right'>Margen bruto</TableCell>
                                            <TableCell align='right'>Margen %</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {snapshotState.snapshots.map(snapshot => (
                                            <TableRow key={snapshot.snapshotId}>
                                              <TableCell>
                                                <Stack spacing={0.5}>
                                                  <Typography variant='body2' fontWeight={600}>
                                                    {snapshot.scopeName}
                                                  </Typography>
                                                  <Typography variant='caption' color='text.secondary'>
                                                    {snapshot.headcountFte != null ? `${snapshot.headcountFte.toFixed(2)} FTE` : 'Sin FTE informado'}
                                                  </Typography>
                                                </Stack>
                                              </TableCell>
                                              <TableCell align='right'>{formatCurrency(snapshot.revenueClp)}</TableCell>
                                              <TableCell align='right'>{formatCurrency(snapshot.laborCostClp)}</TableCell>
                                              <TableCell align='right'>{formatCurrency(snapshot.directExpenseClp)}</TableCell>
                                              <TableCell align='right'>{formatCurrency(snapshot.overheadClp)}</TableCell>
                                              <TableCell align='right'>{formatCurrency(snapshot.totalCostClp)}</TableCell>
                                              <TableCell align='right'>{formatCurrency(snapshot.grossMarginClp)}</TableCell>
                                              <TableCell align='right'>
                                                <CustomChip
                                                  round='true'
                                                  size='small'
                                                  color={getMarginChipColor(snapshot.grossMarginPct)}
                                                  variant='tonal'
                                                  label={formatMargin(snapshot.grossMarginPct)}
                                                />
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                          <TableRow
                                            sx={{
                                              '& td': {
                                                fontWeight: 700,
                                                backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                              }
                                            }}
                                          >
                                            <TableCell>Totales</TableCell>
                                            <TableCell align='right'>{formatCurrency(periodTotals.revenueClp)}</TableCell>
                                            <TableCell align='right'>{formatCurrency(periodTotals.laborCostClp)}</TableCell>
                                            <TableCell align='right'>{formatCurrency(periodTotals.directExpenseClp)}</TableCell>
                                            <TableCell align='right'>{formatCurrency(periodTotals.overheadClp)}</TableCell>
                                            <TableCell align='right'>{formatCurrency(periodTotals.totalCostClp)}</TableCell>
                                            <TableCell align='right'>{formatCurrency(periodTotals.grossMarginClp)}</TableCell>
                                            <TableCell align='right'>
                                              <CustomChip
                                                round='true'
                                                size='small'
                                                color={getMarginChipColor(periodTotals.revenueClp > 0 ? (periodTotals.grossMarginClp / periodTotals.revenueClp) * 100 : null)}
                                                variant='tonal'
                                                label={formatMargin(periodTotals.revenueClp > 0 ? (periodTotals.grossMarginClp / periodTotals.revenueClp) * 100 : null)}
                                              />
                                            </TableCell>
                                          </TableRow>
                                        </TableBody>
                                      </Table>
                                    </TableContainer>

                                    {period.audit.reopenedReason ? (
                                      <Alert severity='warning' variant='outlined'>
                                        Reapertura registrada por {period.audit.reopenedBy || 'usuario no identificado'}: {period.audit.reopenedReason}
                                      </Alert>
                                    ) : null}
                                  </Stack>
                                )}
                              </Stack>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </ExecutiveCardShell>

      <Dialog open={Boolean(closeDialogPeriod)} onClose={() => setCloseDialogPeriod(null)} fullWidth maxWidth='sm'>
        <DialogTitle>Cerrar período</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              Vas a congelar la revisión actual del período {closeDialogPeriod ? formatMonthLabel(closeDialogPeriod.year, closeDialogPeriod.month) : ''}. Esto emite `accounting.period_closed` y deja el P&L marcado como cerrado.
            </Typography>
            <Divider />
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }
              }}
            >
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  Ingresos
                </Typography>
                <Typography variant='h6'>{formatCurrency(dialogTotals.revenueClp)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  Costo total
                </Typography>
                <Typography variant='h6'>{formatCurrency(dialogTotals.totalCostClp)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  Margen bruto
                </Typography>
                <Typography variant='h6'>{formatCurrency(dialogTotals.grossMarginClp)}</Typography>
              </Box>
            </Box>
            <Alert severity='info' variant='outlined'>
              Si después detectas una corrección, el período se puede reabrir solo desde un perfil admin y eso incrementa la revisión del snapshot.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogPeriod(null)} disabled={Boolean(actionLoadingPeriodId)}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={() => void handleClosePeriod()}
            disabled={!closeDialogPeriod || actionLoadingPeriodId === closeDialogPeriod.periodId}
            startIcon={actionLoadingPeriodId === closeDialogPeriod?.periodId ? <CircularProgress size={16} color='inherit' /> : undefined}
          >
            Confirmar cierre
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(reopenDialogPeriod)} onClose={() => setReopenDialogPeriod(null)} fullWidth maxWidth='sm'>
        <DialogTitle>Reabrir período</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              Reabrir devuelve el período a estado operativo y crea una nueva revisión de snapshots. Esta acción requiere una razón explícita.
            </Typography>
            <CustomTextField
              multiline
              minRows={3}
              label='Razón de la reapertura'
              placeholder='Ejemplo: faltaba una factura del mes o hubo un ajuste de costo laboral.'
              value={reopenReason}
              onChange={event => setReopenReason(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setReopenDialogPeriod(null)
              setReopenReason('')
            }}
            disabled={Boolean(actionLoadingPeriodId)}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='warning'
            onClick={() => void handleReopenPeriod()}
            disabled={!reopenDialogPeriod || reopenReason.trim().length === 0 || actionLoadingPeriodId === reopenDialogPeriod.periodId}
            startIcon={actionLoadingPeriodId === reopenDialogPeriod?.periodId ? <CircularProgress size={16} color='inherit' /> : undefined}
          >
            Confirmar reapertura
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default FinancePeriodClosureDashboardView
