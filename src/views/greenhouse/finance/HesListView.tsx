'use client'

import { useCallback, useEffect, useState } from 'react'

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
import Stack from '@mui/material/Stack'
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

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'
import tableStyles from '@core/styles/table.module.css'
import CreateHesDrawer from '@views/greenhouse/finance/drawers/CreateHesDrawer'

const GREENHOUSE_COPY = getMicrocopy()
// ── Types ──

interface Hes {
  hesId: string
  hesNumber: string
  purchaseOrderId: string | null
  clientId: string
  serviceDescription: string
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  amount: number
  amountClp: number
  currency: string
  status: string
  submittedAt: string | null
  approvedAt: string | null
  approvedBy: string | null
  invoiced: boolean
}

// ── Config ──

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'warning' | 'secondary' }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, color: 'secondary' },
  submitted: { label: 'Recibida', color: 'info' },
  approved: { label: 'Validada', color: 'success' },
  rejected: { label: 'Observada', color: 'warning' },
  cancelled: { label: 'Cancelada', color: 'secondary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: GREENHOUSE_COPY.states.draft },
  { value: 'submitted', label: 'Recibidas' },
  { value: 'approved', label: 'Validadas' },
  { value: 'rejected', label: 'Observadas' }
]

// ── Helpers ──

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return '—'
  if (date.includes('T')) return date.slice(0, 10).split('-').reverse().join('/')

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

// ── Component ──

const hesColumnHelper = createColumnHelper<Hes>()

 
const hesColumns: ColumnDef<Hes, any>[] = [
  hesColumnHelper.accessor('hesNumber', {
    header: 'HES #',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600} sx={{ fontSize: '0.8rem' }}>{getValue()}</Typography>
  }),
  hesColumnHelper.accessor('serviceDescription', {
    header: 'Servicio',
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {getValue()}
      </Typography>
    )
  }),
  hesColumnHelper.accessor('servicePeriodStart', {
    header: 'Período',
    cell: ({ row }) => (
      <Typography variant='body2' color='text.secondary'>
        {formatDate(row.original.servicePeriodStart)} — {formatDate(row.original.servicePeriodEnd)}
      </Typography>
    )
  }),
  hesColumnHelper.accessor('amountClp', {
    header: 'Monto',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{formatCLP(getValue())}</Typography>,
    meta: { align: 'right' }
  }),
  hesColumnHelper.accessor('status', {
    header: 'Estado',
    cell: ({ getValue }) => {
      const conf = STATUS_CONFIG[getValue()] || STATUS_CONFIG.draft

      return <CustomChip round='true' size='small' variant='tonal' color={conf.color} label={conf.label} />
    }
  }),
  hesColumnHelper.accessor('approvedBy', {
    header: 'Validada por',
    cell: ({ getValue }) => <Typography variant='body2' color='text.secondary'>{getValue() || '—'}</Typography>
  }),
  {
    id: 'invoiced',
    header: 'Facturada',
    cell: ({ row }: { row: { original: Hes } }) =>
      row.original.invoiced
        ? <CustomChip round='true' size='small' variant='tonal' color='success' label='Sí' />
        : <Typography variant='body2' color='text.disabled'>No</Typography>,
    enableSorting: false
  }
]

const HesListView = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Hes[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'hesNumber', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/finance/hes?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const table = useReactTable({
    data: items,
    columns: hesColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const approvedCount = items.filter(i => i.status === 'approved').length
  const pendingCount = items.filter(i => i.status === 'submitted').length
  const totalAmount = items.reduce((s, i) => s + i.amountClp, 0)
  const invoicedCount = items.filter(i => i.invoiced).length

  if (loading && items.length === 0) {
    return (
      <Stack spacing={6}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>Hojas de entrada de servicio</Typography>
          <Typography variant='body2' color='text.secondary'>HES — certificación de recepción de servicio</Typography>
        </Box>
        <Grid container spacing={6}>{[0, 1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}><Skeleton variant='rounded' height={120} /></Grid>)}</Grid>
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  return (
    <Stack spacing={6}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>Hojas de entrada de servicio</Typography>
          <Typography variant='body2' color='text.secondary'>HES — certificación de recepción de servicio</Typography>
        </Box>
        <Button variant='contained' color='warning' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Registrar HES recibida
        </Button>
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Validadas' stats={String(approvedCount)} subtitle='Listas para facturar' avatarIcon='tabler-check' avatarColor='success' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Recibidas' stats={String(pendingCount)} subtitle='Pendientes de validación' avatarIcon='tabler-clock' avatarColor='warning' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Monto total' stats={formatCLP(totalAmount)} subtitle='En todas las HES' avatarIcon='tabler-cash' avatarColor='primary' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Facturadas' stats={String(invoicedCount)} subtitle='Vinculadas a factura' avatarIcon='tabler-file-invoice' avatarColor='info' />
        </Grid>
      </Grid>

      <Card variant='outlined'>
        <CardHeader
          title='Registro de HES'
          avatar={<Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}><i className='tabler-file-certificate' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} /></Avatar>}
          action={<CustomChip round='true' size='small' variant='tonal' color='secondary' label={`${items.length} HES`} />}
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField select size='small' label='Estado' value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
            {STATUS_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </CustomTextField>
        </CardContent>
        <Divider />
        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }} role='status'>
            <Typography variant='h6' sx={{ mb: 1 }}>Sin hojas de entrada</Typography>
            <Typography variant='body2' color='text.secondary'>Las HES aparecen aquí cuando registras una hoja recibida desde el cliente.</Typography>
          </Box>
        ) : (
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                {table.getHeaderGroups().map(hg => (
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
                {table.getRowModel().rows.map(row => (
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
        )}
        <TablePaginationComponent table={table as ReturnType<typeof useReactTable>} />
      </Card>

      <CreateHesDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchData() }} />
    </Stack>
  )
}

export default HesListView
