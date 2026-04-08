'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'

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

const MONTH_NAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (date: string | null): string => {
  if (!date) {
    return '—'
  }

  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ── Pending movements columns (static — no closures needed) ──

const mvColumnHelper = createColumnHelper<PendingMovement>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mvColumns: ColumnDef<PendingMovement, any>[] = [
  mvColumnHelper.accessor('type', {
    header: 'Tipo',
    cell: ({ getValue }) => <CustomChip round='true' size='small' color={getValue() === 'cobro' ? 'success' : 'warning'} label={getValue() === 'cobro' ? 'Cobro' : 'Pago'} />
  }),
  mvColumnHelper.accessor('description', {
    header: 'Descripción',
    cell: ({ row }) => (
      <>
        <Typography variant='body2' fontWeight={500}>{row.original.description}</Typography>
        <Typography variant='caption' color='text.secondary'>{row.original.id}</Typography>
        {row.original.instrumentName && (
          <Typography variant='caption' color='text.secondary' display='block'>
            {row.original.instrumentName}
          </Typography>
        )}
      </>
    )
  }),
  mvColumnHelper.accessor('partyName', { header: 'Contraparte', cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography> }),
  mvColumnHelper.accessor('date', { header: 'Fecha', cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography> }),
  mvColumnHelper.accessor('amount', {
    header: 'Monto',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600} color={getValue() >= 0 ? 'success.main' : 'error.main'}>{formatCLP(getValue())}</Typography>,
    meta: { align: 'right' }
  })
]

const ReconciliationView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [periods, setPeriods] = useState<ReconciliationPeriod[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [pendingMovements, setPendingMovements] = useState<PendingMovement[]>([])
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fetchErrors, setFetchErrors] = useState<string[]>([])
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [periodSorting, setPeriodSorting] = useState<SortingState>([{ id: 'year', desc: true }])
  const [mvSorting, setMvSorting] = useState<SortingState>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const errors: string[] = []

    try {
      const params = new URLSearchParams()

      if (accountFilter) params.set('accountId', accountFilter)
      if (statusFilter) params.set('status', statusFilter)

      const [periodsRes, accountsRes, incomeRes, expenseRes] = await Promise.all([
        fetch(`/api/finance/reconciliation?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/finance/accounts', { cache: 'no-store' }),
        fetch('/api/finance/cash-in?page=1&pageSize=20&isReconciled=false', { cache: 'no-store' }),
        fetch('/api/finance/cash-out?page=1&pageSize=20&isReconciled=false', { cache: 'no-store' })
      ])

      if (periodsRes.ok) {
        const data = await periodsRes.json()

        setPeriods(data.items ?? [])
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
            instrumentName: item.paymentAccountName || item.paymentProviderSlug || item.paymentInstrumentCategory || null
          }))

        const expenses: PendingMovement[] = (expenseData.items ?? [])
          .map((item: CashOutMovement) => ({
            id: item.paymentId,
            type: 'pago',
            description: item.expenseDescription || item.expenseId,
            partyName: item.supplierName || item.memberName || null,
            date: item.paymentDate,
            amount: -item.amount,
            instrumentName: item.paymentAccountName || item.paymentProviderSlug || item.paymentInstrumentCategory || null
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
      setLoading(false)
    }
  }, [accountFilter, statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived KPIs
  const totalPeriods = periods.length
  const reconciledCount = periods.filter(p => p.status === 'reconciled').length
  const inProgressCount = periods.filter(p => p.status === 'in_progress').length
  const pendingMovementCount = pendingMovements.length

  // Period columns (need accounts for lookup)
  const periodColumnHelper = createColumnHelper<ReconciliationPeriod>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodColumns: ColumnDef<ReconciliationPeriod, any>[] = [
    periodColumnHelper.accessor('month', { header: 'Período', cell: ({ row }) => <Typography variant='body2' fontWeight={600}>{MONTH_NAMES[row.original.month]} {row.original.year}</Typography> }),
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
      cell: ({ getValue }) => { const c = STATUS_CONFIG[getValue()] || STATUS_CONFIG.open;

 

return <CustomChip round='true' size='small' color={c.color} label={c.label} /> }
    })
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

  const mvTable = useReactTable({
    data: pendingMovements,
    columns: mvColumns,
    state: { sorting: mvSorting },
    onSortingChange: setMvSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

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

      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Movimientos de caja por conciliar'
          subheader={pendingMovementCount > 0 ? `${pendingMovementCount} movimientos de caja sin match bancario` : 'Sin movimientos de caja pendientes'}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
              <i className='tabler-list-search' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {mvTable.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {mvTable.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={mvColumns.length} style={{ textAlign: 'center', padding: '3rem' }}><Typography variant='body2' color='text.secondary'>No hay movimientos de caja pendientes por conciliar.</Typography></td></tr>
              ) : mvTable.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </Box>
  )
}

export default ReconciliationView
