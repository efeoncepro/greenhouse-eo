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
import LinearProgress from '@mui/material/LinearProgress'
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

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'
import tableStyles from '@core/styles/table.module.css'
import CreatePurchaseOrderDrawer from '@views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer'

// ── Types ──

interface PurchaseOrder {
  poId: string
  poNumber: string
  clientId: string
  authorizedAmountClp: number
  invoicedAmountClp: number
  remainingAmountClp: number
  invoiceCount: number
  status: string
  issueDate: string
  expiryDate: string | null
  description: string | null
  serviceScope: string | null
}

// ── Config ──

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'secondary' }> = {
  active: { label: 'Activa', color: 'success' },
  consumed: { label: 'Consumida', color: 'info' },
  expired: { label: 'Vencida', color: 'error' },
  cancelled: { label: 'Cancelada', color: 'secondary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activas' },
  { value: 'consumed', label: 'Consumidas' },
  { value: 'expired', label: 'Vencidas' }
]

// ── Helpers ──

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

// ── Component ──

const poColumnHelper = createColumnHelper<PurchaseOrder>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const poColumns: ColumnDef<PurchaseOrder, any>[] = [
  poColumnHelper.accessor('poNumber', {
    header: 'OC #',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {row.original.poNumber}
        </Typography>
        {row.original.description && (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.original.description}
          </Typography>
        )}
      </Box>
    )
  }),
  poColumnHelper.accessor('issueDate', {
    header: 'Emitida',
    cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>
  }),
  poColumnHelper.accessor('expiryDate', {
    header: 'Vence',
    cell: ({ getValue }) => <Typography variant='body2'>{formatDate(getValue())}</Typography>
  }),
  poColumnHelper.accessor('authorizedAmountClp', {
    header: 'Autorizado',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{formatCLP(getValue())}</Typography>,
    meta: { align: 'right' }
  }),
  {
    id: 'consumption',
    header: 'Consumo',
    cell: ({ row }: { row: { original: PurchaseOrder } }) => {
      const pct = row.original.authorizedAmountClp > 0
        ? Math.min(100, (row.original.invoicedAmountClp / row.original.authorizedAmountClp) * 100)
        : 0

      return (
        <Box sx={{ minWidth: 100 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant='caption'>{formatCLP(row.original.invoicedAmountClp)}</Typography>
            <Typography variant='caption' color='text.secondary'>{Math.round(pct)}%</Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={pct}
            color={pct >= 100 ? 'info' : pct >= 80 ? 'warning' : 'success'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )
    },
    enableSorting: false
  },
  poColumnHelper.accessor('remainingAmountClp', {
    header: 'Saldo',
    cell: ({ getValue }) => (
      <Typography variant='body2' fontWeight={500} color={getValue() <= 0 ? 'text.disabled' : 'success.main'}>
        {formatCLP(getValue())}
      </Typography>
    ),
    meta: { align: 'right' }
  }),
  poColumnHelper.accessor('invoiceCount', {
    header: 'Facturas',
    cell: ({ getValue }) => <Typography variant='body2'>{getValue()}</Typography>
  }),
  poColumnHelper.accessor('status', {
    header: 'Estado',
    cell: ({ getValue }) => {
      const conf = STATUS_CONFIG[getValue()] || STATUS_CONFIG.active

      return <CustomChip round='true' size='small' variant='tonal' color={conf.color} label={conf.label} />
    }
  })
]

const PurchaseOrdersListView = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PurchaseOrder[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'issueDate', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/finance/purchase-orders?${params.toString()}`)

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
    columns: poColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  // KPIs
  const activeCount = items.filter(i => i.status === 'active').length
  const totalAuthorized = items.filter(i => i.status === 'active').reduce((s, i) => s + i.authorizedAmountClp, 0)
  const totalRemaining = items.filter(i => i.status === 'active').reduce((s, i) => s + i.remainingAmountClp, 0)
  const consumedCount = items.filter(i => i.status === 'consumed').length

  if (loading && items.length === 0) {
    return (
      <Stack spacing={6}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>Órdenes de compra</Typography>
          <Typography variant='body2' color='text.secondary'>OC de clientes, saldos y consumo</Typography>
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
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>Órdenes de compra</Typography>
          <Typography variant='body2' color='text.secondary'>OC de clientes, saldos y consumo</Typography>
        </Box>
        <Button variant='contained' color='primary' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Registrar OC
        </Button>
      </Box>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Activas' stats={String(activeCount)} subtitle='OC vigentes' avatarIcon='tabler-file-check' avatarColor='success' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Total autorizado' stats={formatCLP(totalAuthorized)} subtitle='En OC activas' avatarIcon='tabler-cash' avatarColor='primary' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Saldo disponible' stats={formatCLP(totalRemaining)} subtitle='Facturable' avatarIcon='tabler-wallet' avatarColor='info' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Consumidas' stats={String(consumedCount)} subtitle='Saldo agotado' avatarIcon='tabler-check' avatarColor='secondary' />
        </Grid>
      </Grid>

      <Card variant='outlined'>
        <CardHeader
          title='Registro de órdenes de compra'
          avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-file-check' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
          action={<CustomChip round='true' size='small' variant='tonal' color='secondary' label={`${items.length} OC`} />}
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
            <Typography variant='h6' sx={{ mb: 1 }}>Sin órdenes de compra</Typography>
            <Typography variant='body2' color='text.secondary'>Las OC aparecen aquí cuando se registran desde el portal.</Typography>
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

      <CreatePurchaseOrderDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchData() }} />
    </Stack>
  )
}

export default PurchaseOrdersListView
