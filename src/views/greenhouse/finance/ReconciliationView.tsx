'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { FINANCE_MOVEMENT_PROVIDER_CATALOG, FinanceMovementFeed, inferFinanceMovementProviderId } from '@/components/greenhouse/finance'
import type { FinanceMovementFeedItem, FinanceMovementFeedSummaryItem } from '@/components/greenhouse/finance'

import tableStyles from '@core/styles/table.module.css'
import CreateReconciliationPeriodDrawer from '@views/greenhouse/finance/drawers/CreateReconciliationPeriodDrawer'
import CreateAccountDrawer from '@views/greenhouse/finance/drawers/CreateAccountDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReconciliationPeriod {
  periodId: string
  accountId: string
  year: number
  month: number
  openingBalance: number
  closingBalanceBank: number
  closingBalanceSystem: number
  difference: number
  status: string
  statementImported: boolean
  statementRowCount: number
  reconciledBy: string | null
  reconciledAt: string | null
  notes: string | null
  archivedAt: string | null
  archivedBy: string | null
  archiveReason: string | null
  archiveKind: string | null
}

interface Account {
  accountId: string
  accountName: string
}

interface CashInMovement {
  paymentId: string
  clientName: string | null
  invoiceNumber: string | null
  invoiceDescription: string | null
  paymentDate: string | null
  amount: number
  isReconciled: boolean
  paymentAccountName: string | null
  paymentProviderSlug: string | null
  paymentInstrumentCategory: string | null
}

interface CashOutMovement {
  paymentId: string
  expenseId: string
  expenseDescription: string
  supplierName: string | null
  memberName: string | null
  paymentDate: string | null
  amount: number
  isReconciled: boolean
  paymentAccountName: string | null
  paymentProviderSlug: string | null
  paymentInstrumentCategory: string | null
}

interface PendingMovement {
  id: string
  type: 'cobro' | 'pago'
  description: string
  partyName: string | null
  date: string | null
  amount: number
  instrumentName: string | null
  instrumentCategory: string | null
  paymentProviderSlug: string | null
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'primary' }> = {
  open: { label: 'Abierto', color: 'info' },
  in_progress: { label: 'En proceso', color: 'warning' },
  reconciled: { label: 'Conciliado', color: 'success' },
  closed: { label: 'Cerrado', color: 'secondary' }
}

const ARCHIVE_REASON_MIN_LENGTH = 8

const MONTH_NAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReconciliationView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [periods, setPeriods] = useState<ReconciliationPeriod[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [pendingMovements, setPendingMovements] = useState<PendingMovement[]>([])

  // TASK-722 — orphan snapshots: declarados en Banco sin period linked.
  const [orphanSnapshots, setOrphanSnapshots] = useState<Array<{
    snapshotId: string
    accountId: string
    accountName: string
    currency: string
    snapshotAt: string
    driftStatus: 'open' | 'accepted' | 'reconciled'
    driftAmount: number
    bankClosingBalance: number
    evidenceAssetId: string | null
  }>>([])

  const [openingFromSnapshot, setOpeningFromSnapshot] = useState<string | null>(null)
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fetchErrors, setFetchErrors] = useState<string[]>([])
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [periodSorting, setPeriodSorting] = useState<SortingState>([{ id: 'period', desc: true }])

  // TASK-715 — archive period as test
  const [includeArchived, setIncludeArchived] = useState(false)
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; period: ReconciliationPeriod | null }>({ open: false, period: null })
  const [archiveReason, setArchiveReason] = useState('')
  const [archiveSubmitting, setArchiveSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const errors: string[] = []

    try {
      const params = new URLSearchParams()

      if (accountFilter) params.set('accountId', accountFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (includeArchived) params.set('includeArchived', 'true')

      // TASK-722 — request orphan snapshots for current month (siempre).
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      params.set('year', String(currentYear))
      params.set('month', String(currentMonth))

      const [periodsRes, accountsRes, incomeRes, expenseRes] = await Promise.all([
        fetch(`/api/finance/reconciliation?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/finance/accounts', { cache: 'no-store' }),
        fetch('/api/finance/cash-in?page=1&pageSize=20&isReconciled=false', { cache: 'no-store' }),
        fetch('/api/finance/cash-out?page=1&pageSize=20&isReconciled=false', { cache: 'no-store' })
      ])

      if (periodsRes.ok) {
        const data = await periodsRes.json()

        setPeriods(data.items ?? [])
        setOrphanSnapshots(Array.isArray(data.orphanSnapshots) ? data.orphanSnapshots : [])
      } else {
        errors.push(`Períodos: ${periodsRes.status}`)
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json()

        setAccounts(data.items?.map((a: { accountId: string; accountName: string }) => ({
          accountId: a.accountId,
          accountName: a.accountName
        })) ?? [])
      } else {
        errors.push(`Cuentas: ${accountsRes.status}`)
      }

      if (incomeRes.ok && expenseRes.ok) {
        const incomeData = await incomeRes.json()
        const expenseData = await expenseRes.json()

        const incomes: PendingMovement[] = (incomeData.items ?? [])
          .map((item: CashInMovement) => ({
            id: item.paymentId,
            type: 'cobro',
            description: item.invoiceDescription || item.invoiceNumber || item.clientName || item.paymentId,
            partyName: item.clientName || null,
            date: item.paymentDate,
            amount: item.amount,
            instrumentName: item.paymentAccountName || item.paymentProviderSlug || item.paymentInstrumentCategory || null,
            instrumentCategory: item.paymentInstrumentCategory,
            paymentProviderSlug: item.paymentProviderSlug
          }))

        const expenses: PendingMovement[] = (expenseData.items ?? [])
          .map((item: CashOutMovement) => ({
            id: item.paymentId,
            type: 'pago',
            description: item.expenseDescription || item.expenseId,
            partyName: item.supplierName || item.memberName || null,
            date: item.paymentDate,
            amount: -item.amount,
            instrumentName: item.paymentAccountName || item.paymentProviderSlug || item.paymentInstrumentCategory || null,
            instrumentCategory: item.paymentInstrumentCategory,
            paymentProviderSlug: item.paymentProviderSlug
          }))

        setPendingMovements(
          [...incomes, ...expenses]
            .sort((left, right) => (right.date || '').localeCompare(left.date || ''))
            .slice(0, 10)
        )
      } else {
        if (!incomeRes.ok) {
          errors.push(`Cobros: ${incomeRes.status}`)
        }

        if (!expenseRes.ok) {
          errors.push(`Pagos: ${expenseRes.status}`)
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'No pudimos cargar la conciliación.')
    } finally {
      setFetchErrors(errors)
      setLastRefreshedAt(new Date())
      setLoading(false)
    }
  }, [accountFilter, statusFilter, includeArchived])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived KPIs
  const totalPeriods = periods.length
  const reconciledCount = periods.filter(p => p.status === 'reconciled').length
  const inProgressCount = periods.filter(p => p.status === 'in_progress').length
  const pendingMovementCount = pendingMovements.length

  // TASK-715 — archive handlers
  const handleOpenArchiveDialog = useCallback((period: ReconciliationPeriod) => {
    setArchiveReason('')
    setArchiveDialog({ open: true, period })
  }, [])

  const handleCloseArchiveDialog = useCallback(() => {
    if (archiveSubmitting) return
    setArchiveDialog({ open: false, period: null })
    setArchiveReason('')
  }, [archiveSubmitting])

  const handleConfirmArchive = useCallback(async () => {
    const period = archiveDialog.period

    if (!period) return

    const trimmed = archiveReason.trim()

    if (trimmed.length < ARCHIVE_REASON_MIN_LENGTH) {
      toast.error(`El motivo debe tener al menos ${ARCHIVE_REASON_MIN_LENGTH} caracteres.`)

      return
    }

    setArchiveSubmitting(true)

    try {
      const response = await fetch(`/api/finance/reconciliation/${period.periodId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmed })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage: string = typeof data?.error === 'string' ? data.error : `No se pudo archivar el período (HTTP ${response.status}).`

        toast.error(errorMessage)

        return
      }

      toast.success('Período archivado como prueba.')
      setArchiveDialog({ open: false, period: null })
      setArchiveReason('')
      await fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de red al archivar el período.')
    } finally {
      setArchiveSubmitting(false)
    }
  }, [archiveDialog, archiveReason, fetchData])

  // TASK-722 — abrir/crear periodo desde snapshot declarado en Banco
  const handleOpenFromSnapshot = useCallback(async (snapshotId: string) => {
    setOpeningFromSnapshot(snapshotId)

    try {
      const response = await fetch('/api/finance/reconciliation/from-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))

        const errorMessage: string = typeof data?.error === 'string'
          ? data.error
          : `No se pudo abrir el período desde el snapshot (HTTP ${response.status}).`

        toast.error(errorMessage)

        return
      }

      const result = await response.json()

      toast.success(result.created ? 'Período creado desde snapshot.' : 'Período abierto en el workbench.')

      // Navigate to the period workbench.
      window.location.href = result.periodUrl
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de red al abrir el período.')
    } finally {
      setOpeningFromSnapshot(null)
    }
  }, [])

  const handleUnarchive = useCallback(async (period: ReconciliationPeriod) => {
    try {
      const response = await fetch(`/api/finance/reconciliation/${period.periodId}/archive`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage: string = typeof data?.error === 'string' ? data.error : `No se pudo reactivar el período (HTTP ${response.status}).`

        toast.error(errorMessage)

        return
      }

      toast.success('Período reactivado.')
      await fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de red al reactivar el período.')
    }
  }, [fetchData])

  // Period columns (need accounts for lookup)
  const periodColumnHelper = createColumnHelper<ReconciliationPeriod>()

   
  const periodColumns: ColumnDef<ReconciliationPeriod, any>[] = [
    periodColumnHelper.accessor(row => row.year * 100 + row.month, {
      id: 'period',
      header: 'Período',
      cell: ({ row }) => (
        <Typography variant='body2' fontWeight={600}>
          {MONTH_NAMES[row.original.month]} {row.original.year}
        </Typography>
      )
    }),
    periodColumnHelper.accessor('accountId', { header: 'Cuenta', cell: ({ getValue }) => <Typography variant='body2'>{accounts.find(a => a.accountId === getValue())?.accountName || getValue()}</Typography> }),
    periodColumnHelper.accessor('openingBalance', { header: 'Saldo apertura', cell: ({ getValue }) => <Typography variant='body2'>{formatCLP(getValue())}</Typography>, meta: { align: 'right' } }),
    periodColumnHelper.accessor('closingBalanceBank', { header: 'Saldo banco', cell: ({ getValue }) => <Typography variant='body2'>{getValue() ? formatCLP(getValue()) : '—'}</Typography>, meta: { align: 'right' } }),
    periodColumnHelper.accessor('closingBalanceSystem', { header: 'Saldo sistema', cell: ({ getValue }) => <Typography variant='body2'>{getValue() ? formatCLP(getValue()) : '—'}</Typography>, meta: { align: 'right' } }),
    periodColumnHelper.accessor('difference', {
      header: 'Diferencia',
      cell: ({ row }) => {
        const hasDiff = row.original.difference !== 0 && row.original.status !== 'reconciled'

        return <Typography variant='body2' fontWeight={600} color={hasDiff ? 'error.main' : 'success.main'}>{row.original.difference !== 0 ? formatCLP(row.original.difference) : '$0'}</Typography>
      },
      meta: { align: 'right' }
    }),
    periodColumnHelper.accessor('statementRowCount', { header: 'Filas', cell: ({ getValue }) => getValue() || 0, meta: { align: 'center' } }),
    periodColumnHelper.accessor('status', {
      header: 'Estado',
      cell: ({ row }) => {
        // TASK-715: archived as test takes visual precedence over status
        // because the period is no longer part of the operational queue.
        if (row.original.archivedAt) {
          return (
            <Tooltip
              title={row.original.archiveReason || 'Periodo archivado como prueba'}
              placement='top'
              arrow
            >
              <span>
                <CustomChip
                  round='true'
                  size='small'
                  color='secondary'
                  variant='tonal'
                  label='Prueba archivada'
                  icon={<i className='tabler-archive' style={{ fontSize: 14 }} />}
                />
              </span>
            </Tooltip>
          )
        }

        const c = STATUS_CONFIG[row.original.status] || STATUS_CONFIG.open

        return <CustomChip round='true' size='small' color={c.color} label={c.label} />
      }
    }),
    {
      id: 'actions',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => {
        // Stop event propagation so clicking the menu doesn't navigate to detail.
        const period = row.original
        const isClosed = period.status === 'closed'
        const isArchived = Boolean(period.archivedAt)

        return (
          <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <OptionMenu
              iconButtonProps={{ size: 'small' }}
              options={
                isArchived
                  ? [{
                      text: 'Reactivar período',
                      icon: 'tabler-archive-off',
                      menuItemProps: {
                        onClick: () => handleUnarchive(period)
                      }
                    }]
                  : [{
                      text: 'Archivar como prueba',
                      icon: 'tabler-archive',
                      menuItemProps: {
                        disabled: isClosed,
                        onClick: () => handleOpenArchiveDialog(period)
                      }
                    }]
              }
            />
          </Box>
        )
      },
      meta: { align: 'center' }
    } as ColumnDef<ReconciliationPeriod, unknown>
  ]

  const periodTable = useReactTable({
    data: periods,
    columns: periodColumns,
    state: { sorting: periodSorting },
    onSortingChange: setPeriodSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const pendingMovementFeedItems = useMemo<FinanceMovementFeedItem[]>(
    () =>
      pendingMovements.map(item => ({
        id: item.id,
        date: item.date,
        title: item.description,
        counterparty: item.partyName,
        instrumentName: item.instrumentName,
        instrumentCategory: item.instrumentCategory,
        amount: item.amount,
        currency: 'CLP',
        direction: item.type === 'cobro' ? 'in' : 'out',
        status: 'pending',
        sourceType: item.type === 'cobro' ? 'cash_in' : 'cash_out',
        sourceId: item.id,
        paymentProviderSlug: item.paymentProviderSlug,
        providerId: inferFinanceMovementProviderId({
          title: item.description,
          counterparty: item.partyName,
          instrumentName: item.instrumentName
        }),
        details: [
          { label: 'Tipo', value: item.type === 'cobro' ? 'Cobro' : 'Pago' },
          { label: 'ID origen', value: item.id },
          { label: 'Instrumento', value: item.instrumentName || '—' }
        ]
      })),
    [pendingMovements]
  )

  const pendingMovementSummaryItems = useMemo<FinanceMovementFeedSummaryItem[]>(() => {
    const cashOutAmount = pendingMovements
      .filter(item => item.type === 'pago')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0)

    const cashInAmount = pendingMovements
      .filter(item => item.type === 'cobro')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0)

    const instrumentCount = new Set(pendingMovements.map(item => item.instrumentName).filter(Boolean)).size
    const missingInstrumentCount = pendingMovements.filter(item => !item.instrumentName).length

    return [
      {
        id: 'pending-count',
        label: 'Cola visible',
        value: pendingMovementCount === 1 ? '1 movimiento' : `${pendingMovementCount} movimientos`,
        helper: 'Cobros y pagos sin match',
        icon: 'tabler-list-search',
        tone: pendingMovementCount > 0 ? 'warning' : 'success'
      },
      {
        id: 'cash-out',
        label: 'Pagos en lista',
        value: formatCLP(cashOutAmount),
        helper: 'Solo lista visible',
        icon: 'tabler-arrow-up-right',
        tone: cashOutAmount > 0 ? 'warning' : 'secondary'
      },
      {
        id: 'cash-in',
        label: 'Cobros en lista',
        value: formatCLP(cashInAmount),
        helper: 'Solo lista visible',
        icon: 'tabler-arrow-down-left',
        tone: cashInAmount > 0 ? 'success' : 'secondary'
      },
      {
        id: 'instruments',
        label: 'Instrumentos',
        value: `${instrumentCount} reconocidos`,
        helper: missingInstrumentCount > 0 ? `${missingInstrumentCount} sin instrumento` : 'Catálogo canónico',
        icon: 'tabler-credit-card',
        tone: missingInstrumentCount > 0 ? 'info' : 'primary'
      }
    ]
  }, [pendingMovementCount, pendingMovements])

  const lastRefreshedLabel = lastRefreshedAt
    ? `Actualizado ${lastRefreshedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
    : null

  const totalDifference = periods
    .filter(p => p.status !== 'reconciled')
    .reduce((sum, p) => sum + Math.abs(p.difference), 0)

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && periods.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Conciliación
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Conciliación bancaria y movimientos de caja
          </Typography>
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Conciliación
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Conciliación bancaria y movimientos de caja
          </Typography>
        </Box>
        <Button variant='contained' color='primary' startIcon={<i className='tabler-plus' />} onClick={() => setCreateDrawerOpen(true)}>
          Nuevo periodo
        </Button>
      </Box>

      {fetchErrors.length > 0 && (
        <Alert severity='warning' sx={{ whiteSpace: 'pre-line' }}>
          {`Error cargando conciliación:\n${fetchErrors.join('\n')}`}
        </Alert>
      )}

      {accounts.length === 0 && !loading && (
        <Alert
          severity='info'
          action={
            <Button color='inherit' size='small' onClick={() => setAccountDrawerOpen(true)}>
              Crear cuenta
            </Button>
          }
        >
          No existen cuentas bancarias registradas. Crea una cuenta para empezar a conciliar.
        </Alert>
      )}

      {accounts.length > 0 && periods.length === 0 && pendingMovementCount > 0 && (
        <Alert severity='info'>
          Ya existen movimientos de caja por conciliar, pero aún no hay períodos abiertos. Crea un período para el mes y cuenta correspondiente para empezar el matching bancario.
        </Alert>
      )}

      {orphanSnapshots.length > 0 && (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
          <CardHeader
            avatar={<CustomAvatar variant='rounded' skin='light' color='warning'><i className='tabler-file-import' /></CustomAvatar>}
            title='Snapshots bancarios sin período abierto'
            subheader={`${orphanSnapshots.length} cuenta${orphanSnapshots.length === 1 ? '' : 's'} con snapshot declarado en Banco esperando workbench. Abre el período para importar la cartola y resolver el matching.`}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              {orphanSnapshots.map(snap => (
                <Box
                  key={snap.snapshotId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    p: 2,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    borderRadius: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 240 }}>
                    <CustomAvatar variant='rounded' skin='light' color='info' sx={{ width: 36, height: 36 }}>
                      <i className='tabler-building-bank' />
                    </CustomAvatar>
                    <Box>
                      <Typography variant='body2' fontWeight={600}>
                        {snap.accountName}{' '}
                        <Typography component='span' variant='caption' color='text.secondary'>
                          ({snap.currency})
                        </Typography>
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        Snapshot: {new Date(snap.snapshotAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                        {' · '}
                        Banco: {formatCLP(snap.bankClosingBalance)}
                        {' · '}
                        <CustomChip
                          size='small'
                          round='true'
                          color={snap.driftStatus === 'reconciled' ? 'success' : snap.driftStatus === 'accepted' ? 'info' : 'warning'}
                          label={snap.driftStatus === 'reconciled' ? 'Cuadrado' : snap.driftStatus === 'accepted' ? `Drift aceptado ${formatCLP(Math.abs(snap.driftAmount))}` : `Drift abierto ${formatCLP(Math.abs(snap.driftAmount))}`}
                          sx={{ height: 18 }}
                        />
                        {snap.evidenceAssetId && (
                          <>
                            {' · '}
                            <i className='tabler-paperclip' style={{ fontSize: 14, verticalAlign: 'middle' }} />
                            {' Con evidencia'}
                          </>
                        )}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant='contained'
                    size='small'
                    color='warning'
                    startIcon={<i className='tabler-arrow-right' />}
                    onClick={() => handleOpenFromSnapshot(snap.snapshotId)}
                    disabled={openingFromSnapshot === snap.snapshotId}
                  >
                    {openingFromSnapshot === snap.snapshotId ? 'Abriendo…' : 'Abrir workbench'}
                  </Button>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Períodos'
            stats={String(totalPeriods)}
            subtitle='Períodos registrados'
            avatarIcon='tabler-calendar'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Conciliados'
            stats={String(reconciledCount)}
            subtitle='Períodos cerrados'
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='En proceso'
            stats={String(inProgressCount)}
            subtitle='Pendientes de cierre'
            avatarIcon='tabler-clock'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Por conciliar'
            stats={String(pendingMovementCount)}
            subtitle={pendingMovementCount === 1 ? 'Movimiento de caja pendiente' : 'Movimientos de caja pendientes'}
            avatarIcon='tabler-alert-triangle'
            avatarColor={pendingMovementCount > 0 ? 'error' : 'success'}
          />
        </Grid>
      </Grid>

      {periods.length > 0 && (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <HorizontalWithSubtitle
              title='Diferencia total abierta'
              stats={formatCLP(totalDifference)}
              subtitle='Descuadre acumulado de períodos no conciliados'
              avatarIcon='tabler-scale'
              avatarColor={totalDifference > 0 ? 'warning' : 'success'}
            />
          </Grid>
        </Grid>
      )}

      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, overflow: 'hidden' }}>
        <Box
          sx={{
            px: 4,
            py: 3,
            display: 'grid',
            gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', md: 'auto minmax(0, 1fr) auto' },
            gap: 2,
            alignItems: 'center'
          }}
        >
          <Box sx={{ gridRow: { xs: '1 / 2', md: 'auto' } }}>
            <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
              <i className='tabler-list-search' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
            </Avatar>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, color: theme => theme.palette.customColors?.midnight ?? 'text.primary' }}>
              Movimientos de caja por conciliar
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.25, maxWidth: 820 }}>
              {pendingMovementCount > 0
                ? 'Cola operativa de cobros y pagos esperando match bancario. Los totales son solo de esta lista visible.'
                : 'Sin cobros ni pagos esperando match bancario.'}
            </Typography>
          </Box>
          {lastRefreshedLabel && (
            <Typography
              variant='caption'
              sx={{
                color: 'text.disabled',
                gridColumn: { xs: '2 / 3', md: 'auto' },
                justifySelf: { xs: 'start', md: 'end' },
                whiteSpace: 'nowrap'
              }}
            >
              {lastRefreshedLabel}
            </Typography>
          )}
        </Box>
        <Divider />
        <FinanceMovementFeed
          embedded
          items={pendingMovementFeedItems}
          density='comfortable'
          showRunningBalance={false}
          summaryItems={pendingMovementSummaryItems}
          showDayTotals
          virtualizeThreshold={80}
          providerCatalog={FINANCE_MOVEMENT_PROVIDER_CATALOG}
          emptyTitle='Sin movimientos de caja pendientes'
          emptyDescription='No hay cobros ni pagos esperando match bancario en este momento.'
        />
      </Card>

      {/* Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Períodos de conciliación'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-arrows-exchange' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value=''>Todas las cuentas</MenuItem>
            {accounts.map(acc => (
              <MenuItem key={acc.accountId} value={acc.accountId}>{acc.accountName}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>Todos los estados</MenuItem>
            <MenuItem value='open'>Abierto</MenuItem>
            <MenuItem value='in_progress'>En proceso</MenuItem>
            <MenuItem value='reconciled'>Conciliado</MenuItem>
            <MenuItem value='closed'>Cerrado</MenuItem>
          </CustomTextField>
          <FormControlLabel
            control={
              <Switch
                size='small'
                checked={includeArchived}
                onChange={e => setIncludeArchived(e.target.checked)}
              />
            }
            label={
              <Typography variant='body2' color='text.secondary'>
                Mostrar archivados
              </Typography>
            }
            sx={{ ml: 'auto', mr: 0 }}
          />
        </CardContent>
        <Divider />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {periodTable.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {periodTable.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={periodColumns.length} style={{ textAlign: 'center', padding: '3rem' }}><Typography variant='body2' color='text.secondary'>{accounts.length === 0 ? 'No hay períodos de conciliación porque aún no existen cuentas activas registradas.' : 'No hay períodos de conciliación registrados aún'}</Typography></td></tr>
              ) : periodTable.getRowModel().rows.map(row => (
                <tr key={row.id} className='cursor-pointer' onClick={() => router.push(`/finance/reconciliation/${row.original.periodId}`)}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePaginationComponent table={periodTable as ReturnType<typeof useReactTable>} />
      </Card>

      <CreateReconciliationPeriodDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => {
          setCreateDrawerOpen(false)
          fetchData()
        }}
      />

      <CreateAccountDrawer
        open={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        onSuccess={() => {
          setAccountDrawerOpen(false)
          fetchData()
        }}
      />

      {/* TASK-715 — Archive as test dialog */}
      <Dialog
        open={archiveDialog.open}
        onClose={handleCloseArchiveDialog}
        fullWidth
        maxWidth='sm'
        closeAfterTransition={false}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
          <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity', width: 40, height: 40 }}>
            <i className='tabler-archive' style={{ fontSize: 20, color: 'var(--mui-palette-secondary-main)' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant='h6' component='div'>
              Archivar este período como prueba?
            </Typography>
            {archiveDialog.period && (
              <Typography variant='caption' color='text.secondary'>
                {MONTH_NAMES[archiveDialog.period.month]} {archiveDialog.period.year} · {accounts.find(a => a.accountId === archiveDialog.period?.accountId)?.accountName || archiveDialog.period.accountId}
              </Typography>
            )}
          </Box>
          <IconButton size='small' onClick={handleCloseArchiveDialog} disabled={archiveSubmitting} aria-label='Cerrar'>
            <i className='tabler-x' style={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
            Esta acción no concilia el período. Lo oculta de la cola operativa pero queda en el historial para auditoría. Puedes activar “Mostrar archivados” para verlo de nuevo o reactivarlo.
          </Typography>
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label='Motivo'
            placeholder='Ej: Periodo de prueba E2E creado por error.'
            value={archiveReason}
            onChange={e => setArchiveReason(e.target.value)}
            disabled={archiveSubmitting}
            helperText={`Mínimo ${ARCHIVE_REASON_MIN_LENGTH} caracteres. Queda registrado en el audit del período.`}
            error={archiveReason.length > 0 && archiveReason.trim().length < ARCHIVE_REASON_MIN_LENGTH}
            inputProps={{ 'aria-label': 'Motivo del archivo' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 5 }}>
          <Button
            variant='tonal'
            color='secondary'
            onClick={handleCloseArchiveDialog}
            disabled={archiveSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='primary'
            onClick={handleConfirmArchive}
            disabled={archiveSubmitting || archiveReason.trim().length < ARCHIVE_REASON_MIN_LENGTH}
            startIcon={archiveSubmitting ? null : <i className='tabler-archive' style={{ fontSize: 16 }} />}
          >
            {archiveSubmitting ? 'Archivando...' : 'Archivar período'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ReconciliationView
