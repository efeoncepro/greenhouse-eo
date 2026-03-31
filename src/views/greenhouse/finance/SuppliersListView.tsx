'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { toast } from 'react-toastify'

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
  createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'

import tableStyles from '@core/styles/table.module.css'
import CreateSupplierDrawer from '@views/greenhouse/finance/drawers/CreateSupplierDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier {
  supplierId: string
  providerId: string | null
  legalName: string
  tradeName: string | null
  category: string
  country: string
  isInternational: boolean
  paymentCurrency: string
  defaultPaymentTerms: number
  primaryContactName: string | null
  primaryContactEmail: string | null
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, { label: string; color: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary' }> = {
  software: { label: 'Software', color: 'info' },
  infrastructure: { label: 'Infraestructura', color: 'primary' },
  professional_services: { label: 'Servicios profesionales', color: 'success' },
  media: { label: 'Media', color: 'warning' },
  creative: { label: 'Creatividad', color: 'error' },
  hr_services: { label: 'RRHH', color: 'info' },
  office: { label: 'Oficina', color: 'secondary' },
  legal_accounting: { label: 'Legal / Contable', color: 'primary' },
  other: { label: 'Otro', color: 'secondary' }
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'software', label: 'Software' },
  { value: 'infrastructure', label: 'Infraestructura' },
  { value: 'professional_services', label: 'Servicios profesionales' },
  { value: 'media', label: 'Media' },
  { value: 'creative', label: 'Creatividad' },
  { value: 'hr_services', label: 'RRHH' },
  { value: 'office', label: 'Oficina' },
  { value: 'legal_accounting', label: 'Legal / Contable' },
  { value: 'other', label: 'Otro' }
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const supColumnHelper = createColumnHelper<Supplier>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supColumns: ColumnDef<Supplier, any>[] = [
  supColumnHelper.accessor('legalName', {
    header: 'Proveedor',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' fontWeight={600}>
          {row.original.tradeName || row.original.legalName}
        </Typography>
        {row.original.tradeName && (
          <Typography variant='caption' color='text.secondary'>
            {row.original.legalName}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={row.original.providerId ? 'success' : 'secondary'}
            icon={<i className={row.original.providerId ? 'tabler-link' : 'tabler-link-off'} />}
            label={row.original.providerId ? 'Provider 360' : 'Sin vínculo canónico'}
          />
        </Box>
      </Box>
    )
  }),
  supColumnHelper.accessor('category', {
    header: 'Categoría',
    cell: ({ getValue }) => {
      const c = CATEGORY_LABELS[getValue()] || CATEGORY_LABELS.other

      return <CustomChip round='true' size='small' color={c.color} label={c.label} />
    }
  }),
  supColumnHelper.accessor('country', { header: 'País' }),
  supColumnHelper.accessor('paymentCurrency', {
    header: 'Moneda',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={500}>{getValue()}</Typography>
  }),
  supColumnHelper.accessor('defaultPaymentTerms', {
    header: 'Plazo',
    cell: ({ getValue }) => `${getValue()} días`
  }),
  supColumnHelper.accessor('primaryContactName', {
    header: 'Contacto',
    cell: ({ row }) => row.original.primaryContactName ? (
      <Box>
        <Typography variant='body2' fontSize='0.8rem'>{row.original.primaryContactName}</Typography>
        {row.original.primaryContactEmail && <Typography variant='caption' color='text.secondary'>{row.original.primaryContactEmail}</Typography>}
      </Box>
    ) : <Typography variant='caption' color='text.secondary'>—</Typography>
  }),
  supColumnHelper.accessor('isActive', {
    header: 'Estado',
    cell: ({ getValue }) => <CustomChip round='true' size='small' color={getValue() ? 'success' : 'secondary'} label={getValue() ? 'Activo' : 'Inactivo'} />,
    meta: { align: 'center' }
  })
]

const SuppliersListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'legalName', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [internationalFilter, setInternationalFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [backfillingProviders, setBackfillingProviders] = useState(false)
  const [backfillError, setBackfillError] = useState<string | null>(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (categoryFilter) params.set('category', categoryFilter)
      if (internationalFilter) params.set('international', internationalFilter)

      const res = await fetch(`/api/finance/suppliers?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setSuppliers(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, internationalFilter])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const handleBackfillProviders = useCallback(async () => {
    setBackfillingProviders(true)
    setBackfillError(null)

    try {
      const response = await fetch('/api/finance/suppliers/backfill-provider-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 500 })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))

        throw new Error(data.error || 'No pudimos ejecutar el backfill de Provider 360.')
      }

      const result = await response.json()

      await fetchSuppliers()
      toast.success(`Backfill ejecutado: ${result.linked ?? 0} vínculos canónicos creados`)
    } catch (error) {
      setBackfillError(error instanceof Error ? error.message : 'No pudimos ejecutar el backfill de Provider 360.')
    } finally {
      setBackfillingProviders(false)
    }
  }, [fetchSuppliers])

  const supTable = useReactTable({
    data: suppliers,
    columns: supColumns,
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
  const activeCount = suppliers.filter(s => s.isActive).length
  const internationalCount = suppliers.filter(s => s.isInternational).length
  const linkedProviderCount = suppliers.filter(s => Boolean(s.providerId)).length
  const unresolvedProviderCount = total - linkedProviderCount

  const categoryCounts = suppliers.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1

    return acc
  }, {})

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && suppliers.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Proveedores
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Directorio y gestión de proveedores con lectura canónica de Provider 360
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
            Proveedores
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Directorio y gestión de proveedores con lectura canónica de Provider 360
          </Typography>
        </Box>
        <Button
          variant='contained'
          color='primary'
          startIcon={<i className='tabler-plus' />}
          onClick={() => setDrawerOpen(true)}
        >
          Nuevo proveedor
        </Button>
      </Box>

      {backfillError ? (
        <Alert severity='error' onClose={() => setBackfillError(null)}>
          {backfillError}
        </Alert>
      ) : null}

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total proveedores'
            stats={String(total)}
            subtitle='Registrados en el sistema'
            avatarIcon='tabler-building-store'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Activos'
            stats={String(activeCount)}
            subtitle={`De ${total} registrados`}
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Internacionales'
            stats={String(internationalCount)}
            subtitle='Pago en USD'
            avatarIcon='tabler-world'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Provider 360'
            stats={`${linkedProviderCount}/${total}`}
            subtitle={total > 0 ? `${Math.round((linkedProviderCount / total) * 100)}% con vínculo canónico` : 'Sin proveedores'}
            avatarIcon='tabler-link'
            avatarColor='success'
            trend={linkedProviderCount > 0 ? 'positive' : 'neutral'}
            trendNumber={topCategory ? `${topCategory[1]} en ${CATEGORY_LABELS[topCategory[0]]?.label || topCategory[0]}` : 'Sin datos'}
          />
        </Grid>
      </Grid>

      {/* Filters + Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Directorio de proveedores'
          subheader={
            unresolvedProviderCount > 0
              ? `${unresolvedProviderCount} proveedor${unresolvedProviderCount === 1 ? '' : 'es'} todavía sin vínculo canónico`
              : 'Todos los suppliers listados ya tienen vínculo canónico'
          }
          action={
            unresolvedProviderCount > 0 ? (
              <Button variant='outlined' size='small' onClick={handleBackfillProviders} disabled={backfillingProviders}>
                {backfillingProviders ? 'Backfill en curso...' : 'Backfill Provider 360'}
              </Button>
            ) : null
          }
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-building-store' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {CATEGORY_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={internationalFilter}
            onChange={e => setInternationalFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>Todos</MenuItem>
            <MenuItem value='true'>Internacional</MenuItem>
            <MenuItem value='false'>Nacional</MenuItem>
          </CustomTextField>
        </CardContent>
        <Divider />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {supTable.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {supTable.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={supColumns.length} style={{ textAlign: 'center', padding: '3rem' }}><Typography variant='body2' color='text.secondary'>No hay proveedores registrados aún</Typography></td></tr>
              ) : supTable.getRowModel().rows.map(row => (
                <tr key={row.id} className='cursor-pointer' onClick={() => router.push(`/finance/suppliers/${row.original.supplierId}`)}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePaginationComponent table={supTable as ReturnType<typeof useReactTable>} />
      </Card>

      <CreateSupplierDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchSuppliers() }} />
    </Box>
  )
}

export default SuppliersListView
