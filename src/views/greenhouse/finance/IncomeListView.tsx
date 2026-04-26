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
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
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
import { toast } from 'sonner'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'

import tableStyles from '@core/styles/table.module.css'
import CreateIncomeDrawer from '@views/greenhouse/finance/drawers/CreateIncomeDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Income {
  incomeId: string
  clientName: string
  organizationId: string | null
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  currency: string
  totalAmount: number
  totalAmountClp: number
  paymentStatus: string
  collectionMethod: string | null
  amountPaid: number
  amountPending: number
  serviceLine: string | null
  incomeType: string | null
  isAnnulled: boolean
  description: string | null

  // Nubox DTE fields
  nuboxDocumentId: string | null
  nuboxEmissionStatus: string | null
  nuboxEmittedAt: string | null
  dteTypeCode: string | null
  dteFolio: string | null
  nuboxPdfUrl: string | null
  nuboxXmlUrl: string | null
  referencedIncomeId: string | null
  paymentForm: string | null
  balanceNubox: number | null
}

const DOC_TYPE_CHIP: Record<string, { label: string; color: 'primary' | 'error' | 'warning' | 'secondary' }> = {
  credit_note: { label: 'N. crédito', color: 'error' },
  debit_note: { label: 'N. débito', color: 'warning' },
  annulled: { label: 'Anulada', color: 'secondary' }
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' }> = {
  paid: { label: 'Pagado', color: 'success' },
  partial: { label: 'Parcial', color: 'warning' },
  pending: { label: 'Pendiente', color: 'info' },
  overdue: { label: 'Vencido', color: 'error' },
  written_off: { label: 'Castigado', color: 'secondary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'partial', label: 'Parcial' },
  { value: 'paid', label: 'Pagado' },
  { value: 'overdue', label: 'Vencido' }
]

const DTE_STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary'; icon: string }> = {
  emitted: { label: 'Emitido', color: 'success', icon: 'tabler-check' },
  pending: { label: 'Pendiente', color: 'warning', icon: 'tabler-clock' },
  rejected: { label: 'Rechazado', color: 'error', icon: 'tabler-x' },
  annulled: { label: 'Anulado', color: 'secondary', icon: 'tabler-ban' }
}

const hasDte = (item: Income): boolean =>
  Boolean(item.nuboxDocumentId || item.dteFolio || item.nuboxEmittedAt)

const getDteStatusKey = (item: Income): string => {
  if (!hasDte(item)) return 'pending'
  if (item.nuboxEmissionStatus === 'Anulado') return 'annulled'
  if (item.nuboxEmissionStatus === 'Rechazado') return 'rejected'

  return 'emitted'
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

const IncomeListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Income[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchEmitting, setBatchEmitting] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'invoiceDate', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')

  const fetchIncome = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)
      if (docTypeFilter) params.set('incomeType', docTypeFilter)

      const res = await fetch(`/api/finance/income?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, docTypeFilter])

  useEffect(() => {
    fetchIncome()
  }, [fetchIncome])

  // Derived KPIs
  const totalIncome = items.reduce((sum, i) => sum + i.totalAmountClp, 0)

  const totalPending = items.filter(i => i.paymentStatus === 'pending' || i.paymentStatus === 'partial')
    .reduce((sum, i) => sum + i.amountPending, 0)

  const paidCount = items.filter(i => i.paymentStatus === 'paid').length
  const overdueCount = items.filter(i => i.paymentStatus === 'overdue').length

  // Batch DTE — only items without an existing DTE are eligible
  const eligibleForDte = items.filter(i => !hasDte(i))
  const selectedEligible = eligibleForDte.filter(i => selected.has(i.incomeId))

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)

      if (next.has(id)) next.delete(id)
      else next.add(id)

      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedEligible.length === eligibleForDte.length) {
      // Deselect all eligible
      setSelected(prev => {
        const next = new Set(prev)

        eligibleForDte.forEach(i => next.delete(i.incomeId))

        return next
      })
    } else {
      // Select all eligible
      setSelected(prev => {
        const next = new Set(prev)

        eligibleForDte.forEach(i => next.add(i.incomeId))

        return next
      })
    }
  }

  const handleBatchEmit = async () => {
    if (selectedEligible.length === 0) return

    setBatchEmitting(true)

    try {
      const res = await fetch('/api/finance/income/batch-emit-dte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incomeIds: selectedEligible.map(i => i.incomeId), dteTypeCode: '33' })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`${data.succeeded} DTE emitidos${data.failed > 0 ? `, ${data.failed} con errores` : ''}`)
        setSelected(new Set())
        fetchIncome()
      } else {
        toast.error(data.error || 'Error al emitir DTEs')
      }
    } catch {
      toast.error('Error de conexión al emitir DTEs')
    } finally {
      setBatchEmitting(false)
      setBatchDialogOpen(false)
    }
  }

  // ---------------------------------------------------------------------------
  // TanStack table
  // ---------------------------------------------------------------------------

  const incomeColumnHelper = createColumnHelper<Income>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incomeColumns: ColumnDef<Income, any>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          size='small'
          checked={eligibleForDte.length > 0 && selectedEligible.length === eligibleForDte.length}
          indeterminate={selectedEligible.length > 0 && selectedEligible.length < eligibleForDte.length}
          onChange={toggleSelectAll}
          inputProps={{ 'aria-label': 'Seleccionar todos los documentos sin DTE' }}
        />
      ),
      cell: ({ row }) => (
        <span onClick={e => e.stopPropagation()}>
          <Checkbox
            size='small'
            checked={selected.has(row.original.incomeId)}
            disabled={hasDte(row.original)}
            onChange={() => toggleSelect(row.original.incomeId)}
            inputProps={{ 'aria-label': `Seleccionar ${row.original.invoiceNumber || row.original.incomeId}` }}
          />
        </span>
      ),
      enableSorting: false,
      meta: { width: 42 }
    },
    incomeColumnHelper.accessor('invoiceNumber', {
      header: 'Factura',
      cell: ({ row }) => (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant='body2' fontWeight={600}>{row.original.invoiceNumber || row.original.incomeId}</Typography>
            {row.original.nuboxDocumentId && (
              <Box
                component='a'
                href={`/api/finance/income/${row.original.incomeId}/dte-pdf`}
                target='_blank'
                rel='noopener noreferrer'
                onClick={e => e.stopPropagation()}
                sx={{ display: 'inline-flex', color: 'error.main', '&:hover': { color: 'error.dark' } }}
                aria-label='Ver DTE en PDF'
              >
                <i className='tabler-file-type-pdf' style={{ fontSize: 16 }} />
              </Box>
            )}
            {row.original.nuboxDocumentId && (
              <Box
                component='a'
                href={`/api/finance/income/${row.original.incomeId}/dte-xml`}
                target='_blank'
                rel='noopener noreferrer'
                onClick={e => e.stopPropagation()}
                sx={{ display: 'inline-flex', color: 'info.main', '&:hover': { color: 'info.dark' } }}
                aria-label='Ver XML del DTE'
              >
                <i className='tabler-code' style={{ fontSize: 14 }} />
              </Box>
            )}
          </Box>
          {row.original.description && (
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.original.description}
            </Typography>
          )}
        </Box>
      )
    }),
    incomeColumnHelper.accessor('clientName', {
      header: 'Cliente',
      cell: ({ row }) => {
        const chipKey = row.original.isAnnulled ? 'annulled' : (row.original.incomeType ?? '')
        const chip = DOC_TYPE_CHIP[chipKey]

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2' sx={row.original.isAnnulled ? { textDecoration: 'line-through', color: 'text.disabled' } : undefined}>{row.original.clientName}</Typography>
            {chip && <CustomChip round='true' size='small' variant='tonal' color={chip.color} label={chip.label} sx={{ height: 20, fontSize: '0.65rem' }} />}
          </Box>
        )
      }
    }),
    incomeColumnHelper.accessor('invoiceDate', {
      header: 'Fecha',
      cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>
    }),
    incomeColumnHelper.accessor('dueDate', {
      header: 'Vencimiento',
      cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>
    }),
    incomeColumnHelper.accessor('totalAmount', {
      header: 'Monto',
      cell: ({ row }) => (
        <Typography variant='body2' fontWeight={600} color={row.original.totalAmount < 0 ? 'error.main' : undefined}>
          {formatAmount(row.original.totalAmount, row.original.currency)}
        </Typography>
      ),
      meta: { align: 'right' }
    }),
    incomeColumnHelper.accessor('paymentStatus', {
      header: 'Estado',
      cell: ({ row }) => {
        const conf = STATUS_CONFIG[row.original.paymentStatus] || STATUS_CONFIG.pending

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CustomChip round='true' size='small' color={conf.color} label={conf.label} />
            {row.original.collectionMethod === 'factored' && (
              <CustomChip round='true' size='small' color='warning' variant='tonal' label='Factorada' sx={{ height: 20, fontSize: '0.65rem' }} />
            )}
          </Box>
        )
      }
    }),
    {
      id: 'dte',
      header: 'DTE',
      cell: ({ row }: { row: { original: Income } }) => {
        const dteKey = getDteStatusKey(row.original)
        const dteConf = DTE_STATUS_CONFIG[dteKey]

        return <CustomChip round='true' size='small' color={dteConf.color} label={dteConf.label} icon={<i className={dteConf.icon} />} />
      },
      enableSorting: false
    },
    incomeColumnHelper.accessor('amountPending', {
      header: 'Pendiente',
      cell: ({ row }) => (
        <Typography variant='body2' fontWeight={500} color={row.original.amountPending > 0 ? 'error.main' : 'success.main'}>
          {row.original.amountPending > 0 ? formatAmount(row.original.amountPending, row.original.currency) : '—'}
        </Typography>
      ),
      meta: { align: 'right' }
    })
  ]

  const incomeTable = useReactTable({
    data: items,
    columns: incomeColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Ventas
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Documentos de venta, notas y cuentas por cobrar
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
            Ventas
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Documentos de venta, notas y cuentas por cobrar
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {selectedEligible.length > 0 && (
            <Button
              variant='contained'
              color='primary'
              startIcon={<i className='tabler-file-invoice' />}
              onClick={() => setBatchDialogOpen(true)}
            >
              Emitir {selectedEligible.length} DTE{selectedEligible.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button variant='contained' color='success' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
            Registrar documento
          </Button>
        </Box>
      </Box>

      <Alert severity='info' variant='outlined'>
        Nubox sincroniza aquí documentos de venta y ajustes tributarios. No equivalen por sí solos a caja: los cobros reales viven en
        {' '}
        <strong>cobros</strong>
        {' '}
        e
        {' '}
        <strong>ingresos conciliados</strong>.
      </Alert>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total documentado'
            stats={formatCLP(totalIncome)}
            subtitle={`${total} documentos`}
            avatarIcon='tabler-file-invoice'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Por cobrar'
            stats={formatCLP(totalPending)}
            subtitle='Pendiente + parcial'
            avatarIcon='tabler-clock'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Con cobro'
            stats={String(paidCount)}
            subtitle='Cobros registrados'
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Vencidos'
            stats={String(overdueCount)}
            subtitle='Requieren atención'
            avatarIcon='tabler-alert-triangle'
            avatarColor='error'
          />
        </Grid>
      </Grid>

      {/* Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de documentos de venta'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
              <i className='tabler-cash' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
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
          <CustomTextField
            select
            size='small'
            label='Tipo'
            value={docTypeFilter}
            onChange={e => setDocTypeFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>Todos los tipos</MenuItem>
            <MenuItem value='service_fee'>Facturas</MenuItem>
            <MenuItem value='credit_note'>Notas de crédito</MenuItem>
            <MenuItem value='debit_note'>Notas de débito</MenuItem>
          </CustomTextField>
        </CardContent>
        <Divider />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {incomeTable.getHeaderGroups().map(hg => (
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
              {incomeTable.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={incomeColumns.length} style={{ textAlign: 'center', padding: '3rem' }}><Typography variant='body2' color='text.secondary'>No hay ingresos registrados aún</Typography></td></tr>
              ) : incomeTable.getRowModel().rows.map(row => (
                <tr key={row.id} className='cursor-pointer' onClick={() => router.push(`/finance/income/${row.original.incomeId}`)}>
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
        <TablePaginationComponent table={incomeTable as ReturnType<typeof useReactTable>} />
      </Card>

      {/* Batch DTE confirmation dialog */}
      <Dialog open={batchDialogOpen} onClose={() => !batchEmitting && setBatchDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Emitir DTEs en lote</DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 2 }}>
            Se emitirán {selectedEligible.length} factura{selectedEligible.length > 1 ? 's' : ''} electrónica{selectedEligible.length > 1 ? 's' : ''} (código 33) ante el SII vía Nubox.
          </Typography>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Factura</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell align='right'>Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedEligible.map(item => (
                <TableRow key={item.incomeId}>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>{item.invoiceNumber || item.incomeId}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{item.clientName}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2'>{formatAmount(item.totalAmount, item.currency)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
            Esta acción no se puede deshacer. Cada DTE será enviado al SII para timbrado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)} disabled={batchEmitting}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='primary'
            onClick={handleBatchEmit}
            disabled={batchEmitting}
            startIcon={batchEmitting ? <i className='tabler-loader-2' /> : <i className='tabler-file-invoice' />}
          >
            {batchEmitting ? 'Emitiendo...' : `Emitir ${selectedEligible.length} DTE${selectedEligible.length > 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      <CreateIncomeDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchIncome() }} />
    </Box>
  )
}

export default IncomeListView
