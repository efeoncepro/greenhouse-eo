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

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'

import tableStyles from '@core/styles/table.module.css'
import CreateExpenseDrawer from '@views/greenhouse/finance/drawers/CreateExpenseDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Expense {
  expenseId: string
  expenseType: string
  description: string
  currency: string
  totalAmount: number
  totalAmountClp: number
  paymentDate: string | null
  paymentStatus: string
  paymentMethod: string | null
  documentNumber: string | null
  dueDate: string | null
  supplierId: string | null
  supplierName: string | null
  serviceLine: string | null
  isRecurring: boolean
  isAnnulled: boolean
  siiDocumentStatus: string | null
  nuboxPdfUrl: string | null

  // Nubox fields
  nuboxPurchaseId: string | null
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' }> = {
  paid: { label: 'Pagado', color: 'success' },
  scheduled: { label: 'Programado', color: 'info' },
  pending: { label: 'Pendiente', color: 'warning' },
  overdue: { label: 'Vencido', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'secondary' }
}

const TYPE_CONFIG: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'error' | 'secondary' }> = {
  supplier: { label: 'Proveedor', color: 'primary' },
  payroll: { label: 'Nómina', color: 'info' },
  social_security: { label: 'Previsión', color: 'warning' },
  tax: { label: 'Impuesto', color: 'error' },
  bank_fee: { label: 'Fee bancario', color: 'secondary' },
  gateway_fee: { label: 'Fee gateway', color: 'secondary' },
  financial_cost: { label: 'Costo financiero', color: 'secondary' },
  miscellaneous: { label: 'Varios', color: 'secondary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'scheduled', label: 'Programado' },
  { value: 'paid', label: 'Pagado' },
  { value: 'overdue', label: 'Vencido' }
]

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'payroll', label: 'Nómina' },
  { value: 'social_security', label: 'Previsión' },
  { value: 'tax', label: 'Impuesto' },
  { value: 'bank_fee', label: 'Fee bancario' },
  { value: 'gateway_fee', label: 'Fee gateway' },
  { value: 'financial_cost', label: 'Costo financiero' },
  { value: 'miscellaneous', label: 'Varios' }
]

const SII_STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'secondary' }> = {
  Aceptado: { label: 'Aceptado', color: 'success' },
  Reclamado: { label: 'Reclamado', color: 'error' },
  Pendiente: { label: 'Pendiente', color: 'warning' }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatAmount = (amount: number, currency: string): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  return formatCLP(amount)
}

const formatDate = (date: string | null): string => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const expColumnHelper = createColumnHelper<Expense>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expColumns: ColumnDef<Expense, any>[] = [
  expColumnHelper.accessor('expenseType', {
    header: 'Tipo',
    cell: ({ getValue }) => {
      const conf = TYPE_CONFIG[getValue()] || TYPE_CONFIG.miscellaneous

      return <CustomChip round='true' size='small' color={conf.color} label={conf.label} />
    }
  }),
  expColumnHelper.accessor('description', {
    header: 'Descripción',
    cell: ({ row }) => (
      <Box>
        <Typography
          variant='body2'
          fontWeight={600}
          sx={{
            maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            ...(row.original.isAnnulled ? { textDecoration: 'line-through', color: 'text.disabled' } : {})
          }}
        >
          {row.original.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.25 }}>
          {row.original.documentNumber && (
            <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              Doc: {row.original.documentNumber}
            </Typography>
          )}
          {row.original.isAnnulled && <CustomChip round='true' size='small' variant='tonal' color='secondary' label='Anulada' sx={{ height: 20, fontSize: '0.65rem' }} />}
          {row.original.nuboxPurchaseId && <CustomChip round='true' size='small' color='info' variant='outlined' label='Nubox' sx={{ height: 20, fontSize: '0.65rem' }} />}
          {row.original.nuboxPdfUrl && (
            <Box
              component='a'
              href={row.original.nuboxPdfUrl}
              target='_blank'
              rel='noopener noreferrer'
              onClick={e => e.stopPropagation()}
              sx={{ display: 'inline-flex', color: 'error.main', '&:hover': { color: 'error.dark' } }}
              aria-label='Ver DTE en PDF'
            >
              <i className='tabler-file-type-pdf' style={{ fontSize: 16 }} />
            </Box>
          )}
        </Box>
      </Box>
    )
  }),
  expColumnHelper.accessor('supplierName', {
    header: 'Proveedor',
    cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography>
  }),
  expColumnHelper.accessor('paymentDate', {
    header: 'Fecha',
    cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>
  }),
  expColumnHelper.accessor('dueDate', {
    header: 'Vencimiento',
    cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>
  }),
  expColumnHelper.accessor('totalAmount', {
    header: 'Monto',
    cell: ({ row }) => <Typography variant='body2' fontWeight={600} color='error.main'>{formatAmount(row.original.totalAmount, row.original.currency)}</Typography>,
    meta: { align: 'right' }
  }),
  expColumnHelper.accessor('paymentStatus', {
    header: 'Estado',
    cell: ({ getValue }) => {
      const conf = STATUS_CONFIG[getValue()] || STATUS_CONFIG.pending

      return <CustomChip round='true' size='small' color={conf.color} label={conf.label} />
    }
  }),
  {
    id: 'sii',
    header: 'SII',
    cell: ({ row }: { row: { original: Expense } }) => {
      if (!row.original.siiDocumentStatus) return null

      const conf = SII_STATUS_CONFIG[row.original.siiDocumentStatus] ?? { label: row.original.siiDocumentStatus, color: 'secondary' as const }

      return <CustomChip round='true' size='small' variant='tonal' color={conf.color} label={conf.label} />
    },
    enableSorting: false
  }
]

const ExpensesListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'paymentDate', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('expenseType', typeFilter)

      const res = await fetch(`/api/finance/expenses?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
        setFetchError(null)
      } else {
        const data = await res.json().catch(() => ({}))

        setFetchError(data.error || `Error ${res.status}`)
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const expTable = useReactTable({
    data: items,
    columns: expColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  // Derived KPIs
  const totalExpenses = items.reduce((sum, e) => sum + e.totalAmountClp, 0)

  const pendingTotal = items.filter(e => e.paymentStatus === 'pending' || e.paymentStatus === 'scheduled')
    .reduce((sum, e) => sum + e.totalAmountClp, 0)

  const paidCount = items.filter(e => e.paymentStatus === 'paid').length
  const recurringCount = items.filter(e => e.isRecurring).length

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Compras
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Documentos de compra, gastos y cuentas por pagar
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
            Compras
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Documentos de compra, gastos y cuentas por pagar
          </Typography>
        </Box>
        <Button variant='contained' color='error' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Registrar obligación
        </Button>
      </Box>

      <Alert severity='info' variant='tonal'>
        Las compras traídas desde Nubox respaldan obligaciones y devengo. El pago real se reconoce recién en
        {' '}
        <strong>payment_date</strong>
        {' '}
        y conciliación bancaria.
      </Alert>

      {fetchError && <Alert severity='error'>{fetchError}</Alert>}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total comprometido'
            stats={formatCLP(totalExpenses)}
            subtitle={`${total} documentos y gastos`}
            avatarIcon='tabler-credit-card'
            avatarColor='error'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Por pagar'
            stats={formatCLP(pendingTotal)}
            subtitle='Pendiente + programado'
            avatarIcon='tabler-clock'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pagados'
            stats={String(paidCount)}
            subtitle='Pagos ejecutados'
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Recurrentes'
            stats={String(recurringCount)}
            subtitle='Pagos automáticos'
            avatarIcon='tabler-repeat'
            avatarColor='info'
          />
        </Grid>
      </Grid>

      {/* Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de compras y obligaciones'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'error.lightOpacity' }}>
              <i className='tabler-credit-card' style={{ fontSize: 22, color: 'var(--mui-palette-error-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {TYPE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {STATUS_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
        </CardContent>
        <Divider />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {expTable.getHeaderGroups().map(hg => (
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
              {expTable.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={expColumns.length} style={{ textAlign: 'center', padding: '3rem' }}><Typography variant='body2' color='text.secondary'>No hay compras u obligaciones registradas aún</Typography></td></tr>
              ) : expTable.getRowModel().rows.map(row => (
                <tr key={row.id} className='cursor-pointer' onClick={() => router.push(`/finance/expenses/${row.original.expenseId}`)}>
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
        <TablePaginationComponent table={expTable as ReturnType<typeof useReactTable>} />
      </Card>

      <CreateExpenseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchExpenses() }} />
    </Box>
  )
}

export default ExpensesListView
