'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import {
  INSTRUMENT_CATEGORY_LABELS,
  INSTRUMENT_CATEGORY_COLORS,
  type InstrumentCategory
} from '@/config/payment-instruments'

import CreatePaymentInstrumentDrawer from './CreatePaymentInstrumentDrawer'

// ── Types ──────────────────────────────────────────────────────────────

interface PaymentInstrumentItem {
  accountId: string
  instrumentName: string
  instrumentCategory: InstrumentCategory
  providerSlug: string | null
  providerName: string | null
  currency: string
  active: boolean
  defaultFor: string[]
  createdAt: string
}

interface ListResponse {
  items: PaymentInstrumentItem[]
  total: number
}

// ── Columns ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<PaymentInstrumentItem>()

 
const columns: ColumnDef<PaymentInstrumentItem, any>[] = [
  columnHelper.accessor('instrumentName', {
    header: 'Instrumento',
    cell: ({ row }) => {
      const item = row.original

      return (
        <PaymentInstrumentChip
          providerSlug={item.providerSlug}
          instrumentName={item.instrumentName}
          instrumentCategory={item.instrumentCategory}
          size='md'
        />
      )
    }
  }),
  columnHelper.accessor('instrumentCategory', {
    header: 'Categoria',
    cell: ({ getValue }) => {
      const cat = getValue() as InstrumentCategory

      return (
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={INSTRUMENT_CATEGORY_COLORS[cat] ?? 'secondary'}
          label={INSTRUMENT_CATEGORY_LABELS[cat] ?? cat}
        />
      )
    }
  }),
  columnHelper.accessor('providerName', {
    header: 'Proveedor',
    cell: ({ getValue }) => (
      <Typography variant='body2' color='text.secondary'>
        {getValue() ?? '\u2014'}
      </Typography>
    )
  }),
  columnHelper.accessor('currency', {
    header: 'Moneda',
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
        {getValue()}
      </Typography>
    ),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('active', {
    header: 'Estado',
    cell: ({ getValue }) => (
      <CustomChip
        round='true'
        size='small'
        variant='tonal'
        color={getValue() ? 'success' : 'secondary'}
        label={getValue() ? 'Activo' : 'Inactivo'}
      />
    ),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('defaultFor', {
    header: 'Default para',
    cell: ({ getValue }) => {
      const arr = getValue() as string[]

      return (
        <Typography variant='body2' color='text.secondary'>
          {arr && arr.length > 0 ? arr.join(', ') : '\u2014'}
        </Typography>
      )
    }
  })
]

// ── Component ──────────────────────────────────────────────────────────

const PaymentInstrumentsListView = () => {
  const router = useRouter()
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'instrumentName', desc: false }])
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/payment-instruments')

      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        setError(`Error al cargar instrumentos de pago (HTTP ${res.status}).`)
      }
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Client-side filter
  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    if (!searchDebounced) return data.items
    const q = searchDebounced.toLowerCase()

    return data.items.filter(
      item =>
        item.instrumentName.toLowerCase().includes(q) ||
        (item.providerName && item.providerName.toLowerCase().includes(q)) ||
        INSTRUMENT_CATEGORY_LABELS[item.instrumentCategory]?.toLowerCase().includes(q) ||
        item.currency.toLowerCase().includes(q)
    )
  }, [data, searchDebounced])

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  // Aggregated KPIs
  const totalInstruments = data?.items.length ?? 0

  const bankAccounts = useMemo(
    () => data?.items.filter(i => i.instrumentCategory === 'bank_account').length ?? 0,
    [data]
  )

  const cardsAndFintech = useMemo(
    () =>
      data?.items.filter(i => i.instrumentCategory === 'credit_card' || i.instrumentCategory === 'fintech').length ?? 0,
    [data]
  )

  const platforms = useMemo(
    () =>
      data?.items.filter(
        i => i.instrumentCategory === 'payment_platform' || i.instrumentCategory === 'payroll_processor'
      ).length ?? 0,
    [data]
  )

  return (
    <Grid container spacing={6}>
      {/* Page header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' sx={{ fontWeight: 600 }}>
          Instrumentos de pago
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Administra cuentas bancarias, tarjetas, fintech y plataformas de pago.
        </Typography>
      </Grid>

      {/* KPI row */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='primary' size={42} variant='rounded'>
                  <i className='tabler-credit-card' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{totalInstruments}</Typography>
                  <Typography variant='caption' color='text.secondary'>Total instrumentos</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='info' size={42} variant='rounded'>
                  <i className='tabler-building-bank' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{bankAccounts}</Typography>
                  <Typography variant='caption' color='text.secondary'>Cuentas bancarias</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='success' size={42} variant='rounded'>
                  <i className='tabler-wallet' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{cardsAndFintech}</Typography>
                  <Typography variant='caption' color='text.secondary'>Tarjetas + Fintech</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='warning' size={42} variant='rounded'>
                  <i className='tabler-cloud-dollar' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{platforms}</Typography>
                  <Typography variant='caption' color='text.secondary'>Plataformas</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Error banner */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => void loadData()}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        </Grid>
      )}

      {/* Table card */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Instrumentos registrados'
            subheader={data ? `${filteredItems.length} de ${data.items.length}` : undefined}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-credit-card' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomTextField
                  placeholder='Buscar instrumento...'
                  size='small'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ minWidth: 220 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, opacity: 0.5 }} />
                      )
                    }
                  }}
                />
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setDrawerOpen(true)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Agregar instrumento
                </Button>
              </Stack>
            }
          />
          <Divider />

          {loading && !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !data || filteredItems.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>
                  Sin instrumentos registrados
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {searchDebounced
                    ? `No hay resultados para \u201C${searchDebounced}\u201D. Revisa la ortografia o intenta con otras palabras.`
                    : 'Aun no hay instrumentos de pago registrados en el sistema.'}
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                          style={{
                            textAlign:
                              (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                ? 'center'
                                : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                  ? 'right'
                                  : 'left'
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' \u2191', desc: ' \u2193' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/admin/payment-instruments/${row.original.accountId}`)}
                      style={{ cursor: 'pointer' }}
                      className='hover:bg-actionHover'
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          style={{
                            textAlign:
                              (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                ? 'center'
                                : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                  ? 'right'
                                  : 'left'
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Grid>

      {/* Create drawer */}
      <CreatePaymentInstrumentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => void loadData()}
      />
    </Grid>
  )
}

export default PaymentInstrumentsListView
